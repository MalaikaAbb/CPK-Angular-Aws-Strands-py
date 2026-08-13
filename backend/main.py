import os

from ag_ui_strands import StrandsAgent, create_strands_app
from strands import Agent
from strands.models.openai import OpenAIModel

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


agent = Agent(
    model=model,
    system_prompt="You are a helpful AI assistant.",
    tools=[getWeather]
)

# Wrap with AG-UI integration
agui_agent = StrandsAgent(
    agent=agent,
    name="strands_agent",
)

# Create the FastAPI app
app = create_strands_app(agui_agent, "/")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
