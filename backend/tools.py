"""
Sub-agent setup and delegation tools, verbatim from
https://docs.copilotkit.ai/angular/strands/multi-agent/subagents

The page's snippets repeat the whole of the showcase's agent.py import block;
only the imports these tools use are kept. The rest (shared ``tools`` module,
gen-ui-agent, A2UI generation, AG-UI event types) serve other showcase demos.
"""

import logging
import threading

from strands import tool

logger = logging.getLogger(__name__)


# ---- Sub-Agents demo ----------------------------------------------------
#
# A supervisor LLM (this top-level Strands Agent) delegates to three
# specialised sub-agents — research / writing / critique — exposed as
# ordinary @tool functions. Each sub-agent is a single-shot OpenAI call
# with its own system prompt; this mirrors the ``google-adk`` reference
# implementation (``subagents_agent.py``) rather than spinning up a full
# secondary Strands ``Agent`` per delegation, which is heavier than the
# demo needs.
#
# Every delegation appends a ``Delegation`` record to the per-thread
# scratchpad below, then ``subagent_state_from_result`` emits a
# ``StateSnapshotEvent`` so the UI's <DelegationLog/> reflects the new
# entry the moment the tool returns.


# Each sub-agent is a single-shot OpenAI completion driven by its own
# system prompt. They don't share memory or tools with the supervisor —
# the supervisor only sees the returned text. We keep the prompts in a
# dict (rather than spinning up a full secondary Strands ``Agent`` per
# delegation) because the demo only needs one round-trip per call.
_SUBAGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "research_agent": (
        "You are a research sub-agent. Given a topic, produce a concise "
        "bulleted list of 3-5 key facts. No preamble, no closing."
    ),
    "writing_agent": (
        "You are a writing sub-agent. Given a brief and optional source "
        "facts, produce a polished 1-paragraph draft. Be clear and "
        "concrete. No preamble."
    ),
    "critique_agent": (
        "You are an editorial critique sub-agent. Given a draft, give "
        "2-3 crisp, actionable critiques. No preamble."
    ),
}


# Per-thread scratchpad of delegations. Keyed by ``thread_id``; the entry
# is the FULL ordered list of Delegation dicts the supervisor has produced
# so far in this run. ``state_from_result`` reads/writes this so it can
# return the full updated list to the UI on every delegation.
#
# Concurrency: ag_ui_strands runs one request per thread_id at a time, so
# no within-thread races. We still hold a lock so cross-thread access
# (which Python's GIL makes safe but PyPy / future GIL-removed CPython
# would not) is explicit.
_delegations_by_thread: dict[str, list[dict]] = {}
_delegations_lock = threading.Lock()


def _seed_delegations_from_state(thread_id: str, state) -> list[dict]:
    """Initialise the per-thread scratchpad from the inbound state.

    Called lazily from each delegation tool. The frontend persists
    ``state["delegations"]`` across runs through its agent store, so a
    multi-turn conversation should APPEND to the prior list rather than
    overwriting it.
    """
    with _delegations_lock:
        if thread_id in _delegations_by_thread:
            return _delegations_by_thread[thread_id]
        seeded: list[dict] = []
        if isinstance(state, dict):
            existing = state.get("delegations")
            if isinstance(existing, list):
                seeded = [dict(d) for d in existing if isinstance(d, dict)]
        _delegations_by_thread[thread_id] = seeded
        return seeded


# Internal marker prepended to a sub-agent tool result when the underlying
# call failed. ``_make_subagent_state_from_result`` detects this prefix and
# records the Delegation entry with ``status: "failed"`` instead of
# "completed".
#
# Why a sentinel rather than `result_text.startswith("Error:")`?
#  - Strands wraps tool exceptions into a result whose first content item
#    text *does* start with "Error: " (see strands/tools/decorator.py and
#    strands/tools/executors/_executor.py), but ag_ui_strands' result
#    extraction (agent.py around line 654) only forwards the inner text /
#    parsed-JSON to ``state_from_result`` — the canonical
#    ``tool_result["status"] == "error"`` signal is dropped before our hook
#    sees it. That makes a string-prefix check fragile (e.g. cancellation
#    text "Tool cancelled by user", "Unknown tool: ..." don't start with
#    "Error:") and couples our success/failure classification to Strands'
#    error-text formatting, which is internal API.
#  - Catching the failure inside ``_run_subagent`` lets us classify before
#    Strands' wrapper ever runs, so the surface is fully under our control.
#  - Class-name-only message avoids leaking ``repr(exc)`` (which can
#    contain provider-specific error bodies, request IDs, etc.) into the UI.
_SUBAGENT_FAILURE_MARKER = "__SUBAGENT_FAILED__:"
# Sentinel for the legitimately-empty completion case. The sub-agent
# returned successfully but produced no content; we still want a
# "completed" Delegation entry rather than a confusing failure row, so we
# substitute a human-readable placeholder instead of raising.
_SUBAGENT_EMPTY_RESULT_TEXT = "(sub-agent returned no content)"


def _invoke_subagent_llm(system_prompt: str, task: str) -> str:
    """Run a single-shot OpenAI completion as a sub-agent.

    Raises ``RuntimeError`` only on transport / API failures. A successful
    call that legitimately returns empty content is logged at INFO and
    surfaced as a placeholder string rather than an exception, so the
    Delegation entry shows as "completed" with a clear message instead of
    the misleading "failed" status the previous "empty text" raise produced.
    """
    import openai as _openai_mod
    import httpx as _httpx_mod

    try:
        client = _openai_mod.OpenAI()
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": task},
            ],
        )
    except (_openai_mod.OpenAIError, _httpx_mod.HTTPError) as exc:
        logger.exception("sub-agent: OpenAI call failed")
        raise RuntimeError(f"sub-agent call failed: {exc.__class__.__name__}") from exc

    if not response.choices:
        raise RuntimeError("sub-agent returned no choices")
    content = response.choices[0].message.content or ""
    text = content.strip()
    if not text:
        logger.info(
            "sub-agent: OpenAI completion returned empty content; "
            "surfacing placeholder rather than failure"
        )
        return _SUBAGENT_EMPTY_RESULT_TEXT
    return text


def _run_subagent(name: str, task: str) -> str:
    """Tool body shared by all three subagent tools.

    Catches ``RuntimeError`` from ``_invoke_subagent_llm`` and converts the
    failure into a sentinel-prefixed string carrying only the exception
    class name. ``_make_subagent_state_from_result`` recognizes the
    sentinel and records ``status: "failed"`` on the Delegation entry.

    This intercepts the exception *before* Strands' tool-decorator wraps
    it into a generic ``status: "error"`` ToolResult — that wrapper format
    is internal API and is flattened by ag_ui_strands before reaching our
    state hook, so we cannot reliably read it from ``result_data`` alone.
    Doing the classification here keeps the failure signal end-to-end
    explicit.
    """
    system_prompt = _SUBAGENT_SYSTEM_PROMPTS[name]
    try:
        return _invoke_subagent_llm(system_prompt, task)
    except RuntimeError as exc:
        # Class-name only — never the message — to avoid leaking provider
        # error bodies, request IDs, or stack traces into the UI.
        return f"{_SUBAGENT_FAILURE_MARKER}{exc.__class__.__name__}"


# Each @tool wraps a sub-agent invocation. The supervisor LLM "calls"
# these tools to delegate work; ``_run_subagent`` synchronously runs the
# matching sub-agent (a single-shot OpenAI completion), and the result
# string is returned to the supervisor as the tool result. The matching
# ``ToolBehavior(state_from_result=...)`` hook on each tool (registered
# in ``build_showcase_agent``) appends a Delegation entry to shared
# state so the UI's <DelegationLog/> reflects the call in real time.
@tool
def research_agent(task: str) -> str:
    """Delegate a research task to the research sub-agent.

    Use for: gathering facts, background, definitions, statistics.
    Returns a bulleted list of key facts as plain text.

    Args:
        task: The research brief to hand off.
    """
    return _run_subagent("research_agent", task)


@tool
def writing_agent(task: str) -> str:
    """Delegate a drafting task to the writing sub-agent.

    Use for: producing a polished paragraph, draft, or summary. Pass
    relevant facts from prior research inside ``task``.

    Args:
        task: The writing brief to hand off.
    """
    return _run_subagent("writing_agent", task)


@tool
def critique_agent(task: str) -> str:
    """Delegate a critique task to the critique sub-agent.

    Use for: reviewing a draft and suggesting concrete improvements.

    Args:
        task: The draft to critique.
    """
    return _run_subagent("critique_agent", task)
