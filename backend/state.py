"""
Sub-agent delegation log state for
https://docs.copilotkit.ai/angular/strands/multi-agent/subagents

The page names ``_make_subagent_state_from_result`` without showing it. This is
that hook and its ``_flatten_tool_result`` helper, unchanged from the showcase
source the page is cut from
(showcase/integrations/strands/src/agents/agent.py).
"""

import json
import uuid

from tools import (
    _SUBAGENT_FAILURE_MARKER,
    _delegations_by_thread,
    _delegations_lock,
    _seed_delegations_from_state,
)


def _make_subagent_state_from_result(sub_agent_name: str):
    """Factory for a ``state_from_result`` hook bound to a sub-agent name.

    Returns a coroutine function suitable for ``ToolBehavior.state_from_result``.
    On every successful delegation it appends a completed ``Delegation``
    entry to the per-thread scratchpad and returns the full updated list
    so ag_ui_strands emits a ``StateSnapshotEvent`` to the UI.
    """

    async def _hook(context):
        thread_id = (
            getattr(getattr(context, "input_data", None), "thread_id", None)
            or "default"
        )
        existing = _seed_delegations_from_state(
            thread_id, getattr(context.input_data, "state", None)
        )

        # Pull the task argument out of tool_input.
        raw_input = getattr(context, "tool_input", None)
        tool_input = raw_input
        if isinstance(tool_input, str):
            try:
                tool_input = json.loads(tool_input)
            except json.JSONDecodeError:
                tool_input = {}
        task = ""
        if isinstance(tool_input, dict):
            task = str(tool_input.get("task") or "")

        # Result body — strands wraps the @tool return value as the result.
        # ``result_data`` is whatever Strands gave us; flatten common shapes.
        result_data = getattr(context, "result_data", None)
        result_text = _flatten_tool_result(result_data)

        # Failure detection: ``_run_subagent`` catches ``RuntimeError`` and
        # returns ``_SUBAGENT_FAILURE_MARKER`` + class name as the tool
        # result string. Any other path (success, empty-content placeholder)
        # is "completed". We deliberately do NOT fall back to a string-
        # prefix check on Strands' own error wrapping ("Error: ...") because
        # ag_ui_strands strips the canonical ``status`` field before our
        # hook sees the result, making any prefix check brittle. See the
        # ``_SUBAGENT_FAILURE_MARKER`` block above for the full rationale.
        if result_text.startswith(_SUBAGENT_FAILURE_MARKER):
            status = "failed"
            failure_class = (
                result_text[len(_SUBAGENT_FAILURE_MARKER) :].strip() or "RuntimeError"
            )
            display_result = f"Sub-agent call failed ({failure_class})."
        else:
            status = "completed"
            display_result = result_text

        entry = {
            "id": str(uuid.uuid4()),
            "sub_agent": sub_agent_name,
            "task": task,
            "status": status,
            "result": display_result,
        }

        with _delegations_lock:
            updated = list(existing) + [entry]
            _delegations_by_thread[thread_id] = updated
            # Return a defensive copy so downstream merges can't mutate scratch.
            return {"delegations": [dict(d) for d in updated]}

    return _hook


def _flatten_tool_result(result_data) -> str:
    """Best-effort coercion of a Strands tool result to plain text."""
    if result_data is None:
        return ""
    if isinstance(result_data, str):
        return result_data
    if isinstance(result_data, list):
        # Strands often wraps results as ``[{"text": "..."}]``.
        parts: list[str] = []
        for item in result_data:
            if isinstance(item, dict):
                if "text" in item and isinstance(item["text"], str):
                    parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        if parts:
            return "\n".join(parts)
    if isinstance(result_data, dict):
        if "text" in result_data and isinstance(result_data["text"], str):
            return result_data["text"]
        return json.dumps(result_data)
    return str(result_data)
