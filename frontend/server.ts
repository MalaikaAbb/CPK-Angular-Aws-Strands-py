/**
 * Copilot Runtime for this harness.
 *
 * Shape comes from the Angular quickstart's Node runtime server
 * (https://docs.copilotkit.ai/angular/strands/quickstart), with the agent
 * bound to the AWS Strands backend in `../backend` — the Angular/AWS Strands
 * quickstart defers the backend step to "register this backend as the
 * `default` agent".
 *
 * That backend exposes a plain AG-UI endpoint — `create_strands_app(agui_agent,
 * "/")` in backend/main.py mounts a single `POST /` that streams AG-UI events
 * over SSE. The quickstart's runtime snippet binds it with the generic
 * `HttpAgent` from `@ag-ui/client`, so that is the binding here too; there is
 * no AWS Strands-specific server-side wrapper to import.
 *
 * `default` and `support` resolve to the same AWS Strands process. `support`
 * exists so the doc snippets that use `agentId="support"` (Chat UI, Threads)
 * run verbatim. `my_agent` and `research-agent` exist for the same reason, for
 * the Copilot Runtime and AG-UI pages respectively.
 *
 * `a2ui: {}` enables A2UIMiddleware for every registered agent, per
 * https://docs.copilotkit.ai/angular/strands/guides/a2ui
 *
 * `intelligence` puts the runtime in Intelligence mode, which is what serves
 * the thread and memory endpoints the Threads guide's surfaces read.
 */
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotNodeListener } from "@copilotkit/runtime/v2/node";
import { HttpAgent } from "@ag-ui/client";

/**
 * Nothing in this project loads a `.env`: `ng serve` does not, and
 * backend/main.py reads `OPENAI_API_KEY` straight from the shell.
 * `CPK_INTELLIGENCE_API_KEY` lives in `frontend/.env`, so the runtime loads
 * that file itself before constructing the Intelligence client.
 *
 * `process.loadEnvFile` is Node's own loader (>= 20.12) and never overrides a
 * variable the shell already exported. The path is resolved from
 * `import.meta.url` so it does not depend on the cwd, and the call is guarded
 * so a missing `.env` leaves dev running instead of crashing.
 */
try {
  process.loadEnvFile(fileURLToPath(new URL(".env", import.meta.url)));
} catch {
  // No .env next to this file — fall back to whatever the shell exported.
}

// backend/main.py mounts the AWS Strands AG-UI endpoint on POST / and binds
// port 8000.
const agentUrl =
  process.env["AWS_STRANDS_AGENT_URL"] ?? "http://localhost:8000/";

/**
 * CopilotKit Intelligence client.
 * https://docs.copilotkit.ai/intelligence/connect-your-runtime
 *
 * `apiKey` is the only required field — the key scopes the project. `apiUrl`
 * and `wsUrl` are deliberately left unset so both planes point at the managed
 * platform; that page is explicit that they are overridden together or not at
 * all, because the REST and realtime planes live on different hosts.
 */
const intelligence = new CopilotKitIntelligence({
  apiKey: process.env["CPK_INTELLIGENCE_API_KEY"]!,
});

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: agentUrl }),
    support: new HttpAgent({ url: agentUrl }),
    // `my_agent` is the key — the one string the frontend may ask for.
    // Verbatim from https://docs.copilotkit.ai/angular/strands/copilot-runtime
    my_agent: new HttpAgent({ url: "http://localhost:8000/" }),
    // The id the AG-UI guide's injectAgentStore snippets ask for.
    // https://docs.copilotkit.ai/angular/strands/ag-ui
    "research-agent": new HttpAgent({ url: agentUrl }),
  },
  a2ui: {},
  // Passing `intelligence` (never `runner` — the two cannot be combined) is
  // what puts this runtime in Intelligence mode. An SSE runtime replies in the
  // browser exactly the same way with the credential never read.
  intelligence,
  /**
   * LOCAL PLACEHOLDER — NOT AN AUTHENTICATION CHECK.
   *
   * Threads are per-user, and the runtime options type requires
   * `identifyUser` for any runtime serving a web surface. This harness has no
   * login, and the browser sends no `x-user-id` / `x-user-name` header, so in
   * practice every local visitor falls through to the same constant id and
   * shares one thread history. That is acceptable for a local doc harness and
   * for nothing else.
   *
   * In production, resolve the user from a server-verified session or bearer
   * token on `request` and THROW on an unauthenticated request. Never trust a
   * caller-supplied id header: anyone can set one and read another user's
   * threads.
   */
  identifyUser: (request) => ({
    id: request.headers.get("x-user-id") ?? "local-harness-user",
    name: request.headers.get("x-user-name") ?? "Local harness user",
  }),
  /**
   * Memory is opt-in even in Intelligence mode: without this every
   * `/memories/*` request 404s and `injectMemories().isAvailable()` stays
   * false. `access` runs per request, for the agent and for the browser
   * (`consumer`), and grants each scope separately.
   *
   * LOCAL PLACEHOLDER, like `identifyUser` above: a constant grant for every
   * caller. In production, derive it from the verified `user`.
   */
  memory: {
    access: () => ({ user: "read-write", project: "read" }),
  },
});

const port = Number(process.env["PORT"] ?? 8200);

createServer(
  createCopilotNodeListener({
    runtime,
    basePath: "/api/copilotkit",
    cors: true,
  }),
).listen(port, () => {
  console.log(
    `Copilot Runtime listening at http://localhost:${port}/api/copilotkit`,
  );
  console.log(`AWS Strands agent: ${agentUrl}`);
});
