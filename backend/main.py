import os

from ag_ui_strands import (
    StrandsAgent,
    StrandsAgentConfig,
    ToolBehavior,
    create_strands_app,
)
from strands import Agent
from strands.models.openai import OpenAIModel

from state import _make_subagent_state_from_result
from tools import critique_agent, research_agent, writing_agent

# Setup your Strands agent
api_key = os.getenv("OPENAI_API_KEY", "")
model = OpenAIModel(
    client_args={"api_key": api_key},
    model_id="gpt-5.4",
)

def getWeather(location: str):
    """Get current weather for a location.
    Args:
        location: The location to get weather for
    Returns:
        Weather information
    """
    return f"The weather for {location} is 70 degrees."


# The sub-agents line is the delegation instruction from the showcase's
# SYSTEM_PROMPT (showcase/integrations/strands/src/agents/agent.py).
agent = Agent(
    model=model,
    system_prompt=(
        "You are a helpful AI assistant.\n"
        "- Delegate work to specialised sub-agents when the user asks for "
        "research, drafting, or critique. Tools: `research_agent`, "
        "`writing_agent`, `critique_agent`. For non-trivial deliverables "
        "delegate in sequence research -> write -> critique. Pass relevant "
        "facts/draft through the `task` argument. The UI renders a live log "
        "of every delegation.\n"
    ),
    tools=[getWeather, research_agent, writing_agent, critique_agent]
)

# Wrap with AG-UI integration
# `tool_behaviors` wiring for the sub-agent tools is from the showcase's
# build_showcase_agent (showcase/integrations/strands/src/agents/agent.py):
# each delegation appends an entry to the `delegations` state slot.
agui_agent = StrandsAgent(
    agent=agent,
    name="strands_agent",
    config=StrandsAgentConfig(
        tool_behaviors={
            # Sub-Agents — every delegation appends to
            # `state["delegations"]`. Use `state_from_result` rather than
            # `state_from_args` so the entry carries the sub-agent's
            # actual output (final, "completed") rather than a stub
            # "running" row that needs a follow-up update.
            "research_agent": ToolBehavior(
                state_from_result=_make_subagent_state_from_result("research_agent"),
            ),
            "writing_agent": ToolBehavior(
                state_from_result=_make_subagent_state_from_result("writing_agent"),
            ),
            "critique_agent": ToolBehavior(
                state_from_result=_make_subagent_state_from_result("critique_agent"),
            ),
        },
    ),
)

# Create the FastAPI app
app = create_strands_app(agui_agent, "/")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
