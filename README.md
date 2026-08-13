# CopilotKit + AWS Strands (Python) — Angular Test Harness

A navigable, working test harness for the Angular section of the CopilotKit AWS Strands documentation — each guide is a route that actually runs the thing it describes.

Tracks: **<https://docs.copilotkit.ai/angular/strands>**

| | |
|---|---|
| **Frontend** | Angular 22.1 · TypeScript 6.0 · Tailwind 4 · zoneless · port **4200** |
| **Runtime** | Copilot Runtime v2 Node listener · port **8200** |
| **Backend** | AWS Strands Python agent · FastAPI + uvicorn over AG-UI · port **8000** |
| **CopilotKit packages** | `@copilotkit/angular` 0.3.1 · `@copilotkit/runtime` 1.67.1 |
| **AG-UI packages** | `@ag-ui/client` 0.0.57 (runtime) · `ag-ui-strands` 0.2.5 (agent) |
| **Strands packages** | `strands-agents` 1.51.0 · `openai` 2.54.0 |
| **Model** | `gpt-5.4` via `OpenAIModel` |

---

## Architecture

Three processes, not two.

```
Browser (Angular 22, zoneless)
  │  @copilotkit/angular — provideCopilotKit, <copilot-chat>, signal APIs
  │  POST http://localhost:8200/api/copilotkit
  ▼
Copilot Runtime  ·  localhost:8200        ← Node, frontend/server.ts
  │  agents: { default, support } → new HttpAgent({ url })
  │  a2ui: {}  → A2UIMiddleware
  │  POST http://localhost:8000/          ← AG-UI over SSE
  ▼
AWS Strands agent  ·  localhost:8000      ← Python / FastAPI, backend/main.py
  │  create_strands_app(StrandsAgent(agent=agent), "/")
  ▼
Model  (gpt-5.4)
```

- **Why the runtime is its own process.** Unlike the React/Next quickstart — where the runtime lives inside the Next app as an API route — Angular has no server route to host it, so the Copilot Runtime runs as a standalone Node process.
- **Why two agent ids.** `default` and `support` both resolve to the same AWS Strands process. `default` is what CopilotKit's prebuilt components use with no configuration; `support` exists so the Chat UI and Threads guides' snippets — written as `agentId="support"` — run exactly as published.
- **The model key never reaches the browser**, and never reaches the runtime either. Only the AWS Strands process holds it.
- **The binding is the generic `HttpAgent`.** `create_strands_app` exposes a plain AG-UI endpoint, so there is no Strands-specific server-side wrapper to import into the runtime.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.13+ | Pinned by `backend/.python-version`; `pyproject.toml` requires `>=3.13`. |
| uv | 0.11+ (built on 0.11.20) | Manages the backend venv and lockfile. |
| Node.js | 22+ | The Angular quickstart specifies Node 22. |
| npm | 10+ (built on 12.0.1) | Or pnpm/yarn. |
| Angular CLI | 20, 21, or 22 (built on 22.1.3) | `@copilotkit/angular` supports these three majors only. |
| OpenAI API key | — | **Required.** The agent starts without one but every message errors. |
| CopilotKit license key | — | **Optional.** Only affects the Threads and Memory routes. |

`@angular/cdk` must share your Angular major version. If you hit a peer-dependency error, pin it explicitly (`@angular/cdk@^22` on Angular 22).

---

## Setup

**1. Install the agent's dependencies**

```bash
cd backend && uv sync && cd ..
```

`uv sync` creates `backend/.venv` from `uv.lock`. The OpenAI model support is an extra — `strands-agents[openai]` — so `strands.models.openai` will not import from a bare `strands-agents` install.

**2. Install the frontend's dependencies**

```bash
cd frontend && npm install && cd ..
```

**3. Export the model key**

`backend/main.py` reads `os.getenv("OPENAI_API_KEY", "")` directly — there is no `dotenv` loader and no `.env` file, so the key must be in the shell that starts the agent:

```bash
export OPENAI_API_KEY=sk-...
```

Because the fallback is an empty string rather than an error, a missing key is silent at startup and only surfaces when you send the first message.

### Environment variables

| Variable | Read by | What it does |
|---|---|---|
| `OPENAI_API_KEY` | agent (`backend/`) | **Required.** The model key. |
| `AWS_STRANDS_AGENT_URL` | runtime (`frontend/`) | Where the runtime finds the agent. Defaults to `http://localhost:8000/`. |
| `PORT` | runtime (`frontend/`) | Runtime port. Defaults to `8200`. |
| `COPILOTKIT_TELEMETRY_DISABLED` | runtime (`frontend/`) | Opt out of anonymous runtime telemetry. |

> The Angular app's `runtimeUrl` is hardcoded to `http://localhost:8200/api/copilotkit` in `frontend/src/app/app.config.ts`, following the quickstart. If you change `PORT`, change that too.

---

## Running the project

Two terminals. The agent gets its own; the runtime and the Angular dev server share one.

**Terminal 1 — the AWS Strands agent:**

```bash
cd backend
uv run main.py
```

`main.py` starts uvicorn itself with `reload=True`, so edits to the agent restart it automatically. Success looks like:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [37266] using StatReload
INFO:     Started server process [37339]
INFO:     Application startup complete.
```

A `tool=<<function getWeather ...>> | unrecognized tool specification` line above that is **not** harmless — see [Known issues](#known-issues).

**Terminal 2 — the runtime and the app together:**

```bash
cd frontend
npm run dev
```

`dev` runs the Copilot Runtime and `ng serve` side by side under `concurrently`, each line prefixed with the process that wrote it. Success looks like:

```
[runtime] Copilot Runtime listening at http://localhost:8200/api/copilotkit
[runtime] AWS Strands agent: http://localhost:8000/
[angular]   ➜  Local:   http://localhost:4200/
```

Ctrl-C stops both. `--kill-others` means a crash in either takes the other down rather than leaving half a stack running — better than a chat that silently can't reach anything.

To run them separately, with independent restarts, the underlying scripts are still there:

```bash
npm run runtime   # Copilot Runtime only, :8200
npm start         # Angular dev server only, :4200
```

Open **<http://localhost:4200>**.

### Verifying the stack

The Introduction route (`/`) probes both backends and shows a live connection panel — check it first if anything misbehaves. Two green dots means both processes are up.

The one-command check the quickstart prescribes:

```bash
curl -s http://localhost:8200/api/copilotkit/info
```

It should list `default` and `support` under `agents`, with `"a2uiEnabled": true`:

```json
{"version":"1.67.1","agents":{"default":{"name":"default",...},"support":{...}},"a2uiEnabled":true,...}
```

The agent itself answers only `POST /`, so a probing `GET http://localhost:8000/` returns **405 Method Not Allowed**. That is still proof the process is listening, and the connection panel counts it as reachable.

### Building for production

```bash
cd frontend
npm run build                 # → dist/frontend
npm run serve:ssr:frontend    # serve the SSR build
```

`gen:sources` runs automatically as a `prestart` / `prebuild` step. It reads the harness's real implementation files off disk into `src/app/lib/generated-sources.ts`, so the code shown on a route page is byte-identical to the code that runs. Run it by hand with `npm run gen:sources` if a source panel goes stale.

---

## What to expect

Every route shows a status badge and a link to the doc page it tests. Routes with a live feature are split in two:

| | |
|---|---|
| **`<route>`** | Notes, pass/fail criteria, and the exact source of the implementation. No live chat. |
| **`<route>/demo`** | Just the running feature, no sidebar or page chrome — built for screen recording. Reached via **Open demo ↗** in the route header. |

Demo routes share the app-root provider, so a conversation started in one demo continues in another — Quickstart, Frontend tools, A2UI, and Headless all drive the `default` agent and show the *same* conversation through four different interfaces.

| Route | Doc page | Quick check |
|---|---|---|
| `/` | Introduction | Two green dots in the connection panel. |
| `/quickstart` | Quickstart | Ask *Can you tell me a joke?* — tokens stream in and render as markdown. |
| `/chat-ui` | Chat UI and customization | Four surfaces in tabs; popup and sidebar trap focus and close on Escape. |
| `/frontend-tools-generative-ui` | Frontend tools and generative UI | The browser-executed tool works; the agent-side `getWeather` does not — see Known issues. |
| `/a2ui` | A2UI schemas, styling, recovery | Inert until an `a2ui.catalog` is supplied — the route page explains why. |
| `/voice-multimodal` | Voice and multimodal input | Attachments work; transcription fails by design (no service configured). |
| `/human-in-the-loop` | Human-in-the-loop and interrupts | Ask it to delete your account with approval — nothing streams until you click. |
| `/shared-state` | Shared state and agent context | The panel round-trips in the browser; the agent half needs backend state — see Known issues. |
| `/threads` · `/memory` | Threads, memory, attachments, headless | Premium. Unlicensed, the locked state / fallback message *is* the pass. |
| `/attachments` · `/headless` | Threads, memory, attachments, headless | Picker, drag-and-drop, paste; and a chat with no CopilotKit chrome. |
| `/status` | — | Every route and its status in one table. |

---

## Known issues

These are backend gaps, not frontend bugs. The frontend is wired as the guides publish it; `backend/main.py` is the minimal Strands sample and does not yet meet it halfway.

**1. The agent's `getWeather` tool is never registered.**

`backend/main.py` passes a plain function to `Agent(tools=[getWeather])`. Strands only accepts decorated tools, so it logs `unrecognized tool specification` at startup and the tool registry comes up empty:

```python
>>> agent.tool_registry.registry.keys()
dict_keys([])          # expected: dict_keys(['getWeather'])
```

The agent therefore answers weather questions from the model alone and never emits a tool call, so the `/frontend-tools-generative-ui` route's server-side half — `registerRenderToolCall` and the weather card — has nothing to render. Fix it in `backend/main.py` with the `@tool` decorator, naming the argument `city` to match what the frontend renderer reads:

```python
from strands import Agent, tool

@tool
def getWeather(city: str):
    """Get current weather for a location.
    Args:
        city: The city to get weather for
    Returns:
        Weather information
    """
    return f"The weather for {city} is 70 degrees."
```

The name must match exactly — `registerRenderToolCall({ name })` matches by string — and the argument must be `city`, because `weather-card.component.ts` reads `call.args.city`. With `location`, the card renders with a blank city.

**2. The agent carries no shared state.**

The `/shared-state` route's component expects agent state shaped `{ notes, priority }`. `backend/main.py` constructs `Agent(...)` with only a system prompt, so nothing on the agent side reads or writes that shape — the panel keeps its `EMPTY_STATE` defaults no matter what the agent says. The route page says as much in its callout.

**3. A2UI is enabled but inert.** `a2ui: {}` in `frontend/server.ts` turns the middleware on and `/info` reports `a2uiEnabled: true`, but supplying `a2ui.catalog` in `app.config.ts` is what actually registers the `render_a2ui` renderer. The guide's catalog snippet is not self-contained, so none is set.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: strands` | Venv not created, or command run outside it | `uv sync` in `backend/`, and start with `uv run main.py`. |
| `ModuleNotFoundError` on `strands.models.openai` | The `openai` extra is missing | `uv sync` — `pyproject.toml` declares `strands-agents[openai]`. |
| Agent starts, first message errors | `OPENAI_API_KEY` unset — `main.py` falls back to `""` | `export OPENAI_API_KEY=sk-...` in the terminal that runs the agent. There is no `.env` support. |
| `[Errno 98] Address already in use` | An earlier agent is still bound to 8000 | `ss -lptn 'sport = :8000'`, then kill that pid. |
| `unrecognized tool specification` at startup | Tool passed undecorated | Known issue 1 — add `@tool`. |
| Chat sends, nothing streams back | Runtime or agent process down | Check the Introduction route's connection panel; `curl http://localhost:8200/api/copilotkit/info`. |
| `/info` returns nothing | Runtime not started | `npm run runtime` from `frontend/`. |
| Tool runs but the weather card doesn't render | Renderer name ≠ agent tool name, or arg name mismatch | Known issue 1. The frontend registers **`getWeather`** and reads **`city`**. |
| A run starts, then hangs forever | The agent called a browser tool with no registered handler, so no result ever returns | Every tool the agent can call needs a matching `registerFrontendTool` / `registerHumanInTheLoop` mounted. |
| Chat renders unstyled | Missing stylesheet | `@import "@copilotkit/angular/styles.css";` must be in `frontend/src/styles.css`. |
| CORS errors from the browser | Runtime CORS off | Keep `cors: true` in `createCopilotNodeListener`. |
| Connection errors mentioning `localhost` | DNS resolving to IPv6 while the server binds IPv4 | Use `127.0.0.1` in `AWS_STRANDS_AGENT_URL`. |
| Production build fails on size | CopilotKit pulls in markdown and syntax-highlighting deps | Budgets are already raised to 5 MB warning / 7 MB error in `angular.json`. |
| Peer-dependency error on install | `@angular/cdk` major mismatch | Install the matching major, e.g. `@angular/cdk@^22` on Angular 22. |
| Thread list empty, drawer shows a lock | No license key | Expected — not a bug. |
| Source panels say "Source not generated" | Generated map is stale | `npm run gen:sources` from `frontend/`. |

---

## Project structure

```
aws-strands-py/
├── README.md
│
├── frontend/                  # Angular 22 app + the Copilot Runtime process
│   ├── AGENTS.md              # Angular style rules this repo's own code follows
│   ├── server.ts              # ★ CopilotRuntime + HttpAgent binding  → :8200
│   ├── scripts/
│   │   └── generate-sources.ts  # ★ reads real files → generated-sources.ts
│   └── src/
│       ├── styles.css         # CopilotKit stylesheet + the guides' CSS verbatim
│       └── app/
│           ├── app.config.ts        # ★ provideCopilotKit, a2ui, openGenerativeUI
│           ├── app.routes.ts        # doc routes in chrome, demo routes outside it
│           ├── lib/
│           │   ├── nav-config.ts    # ★ single source of truth: routes, docs, status
│           │   └── generated-sources.ts   # GENERATED — do not edit
│           ├── components/          # harness chrome (nav, header, source, health)
│           ├── features/            # ★ the doc code that actually runs
│           │   ├── quickstart/  chat-ui/  tools/  a2ui/
│           │   └── media/  hitl/  shared-state/  threads/  memory/
│           │       attachments/  headless/
│           └── pages/               # one page per doc route + demos.ts + status
│
└── backend/                   # AWS Strands Python agent over AG-UI  → :8000
    ├── pyproject.toml         # strands-agents[openai], ag-ui-strands, fastapi
    ├── uv.lock
    └── main.py                # ★ Agent, weather tool, StrandsAgent + create_strands_app
```

The nav, every route header, the demo links, and the status table all derive from `frontend/src/app/lib/nav-config.ts`, so a route's status is stated once.

**`features/` vs everything else.** Files under `features/` are doc code, kept as published. Every deviation from a published snippet is called out in the file's header comment. Everything outside `features/` is this harness's own code and follows `frontend/AGENTS.md`.

---

## References

**Getting Started** — [Angular + AWS Strands quickstart](https://docs.copilotkit.ai/angular/strands/quickstart)

**Guides** — [Chat UI and customization](https://docs.copilotkit.ai/angular/strands/guides/chat-ui) · [Frontend tools and generative UI](https://docs.copilotkit.ai/angular/strands/guides/frontend-tools-generative-ui) · [A2UI](https://docs.copilotkit.ai/angular/strands/guides/a2ui) · [Voice and multimodal](https://docs.copilotkit.ai/angular/strands/guides/voice-multimodal) · [Human-in-the-loop and interrupts](https://docs.copilotkit.ai/angular/strands/guides/human-in-the-loop) · [Shared state and agent context](https://docs.copilotkit.ai/angular/strands/guides/shared-state) · [Threads, memory, attachments, and headless UI](https://docs.copilotkit.ai/angular/strands/guides/threads-memory-attachments-headless)

**External** — [AWS Strands Agents](https://strandsagents.com) · [AG-UI protocol](https://ag-ui.com) · [Angular API reference](https://docs.copilotkit.ai/reference/angular)
