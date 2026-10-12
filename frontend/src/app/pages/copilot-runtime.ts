import { Component } from '@angular/core';

import { RouteHeader } from '../components/route-header';
import { Callout, Panel, SourceCode, TryIt } from '../components/ui';

@Component({
  selector: 'app-copilot-runtime-page',
  imports: [RouteHeader, Panel, Callout, TryIt, SourceCode],
  template: `
    <app-route-header path="/copilot-runtime" />

    <div class="space-y-6">
      <ui-try-it>
        <p class="mt-1 text-slate-700">
          Run
          <code>curl http://localhost:8200/api/copilotkit/info</code> and find
          <code>my_agent</code> among the returned agents. Then open the demo
          and send <em>Can you tell me a joke?</em>
        </p>
        <p class="mt-2 text-slate-700">
          <strong>Pass:</strong> <code>/info</code> lists
          <code>my_agent</code>, and the demo chat streams a reply.
          <strong>Fail:</strong> the chat raises
          <code>CopilotKitAgentDiscoveryError</code> — the key in the runtime
          and the <code>agentId</code> in the template do not match.
        </p>
      </ui-try-it>

      <ui-panel heading="Register the agent under a key">
        <p class="mb-3 text-sm text-slate-700">
          <code>my_agent</code> sits beside <code>default</code> in the runtime's
          <code>agents</code> map, exactly as the guide writes it. Both point at
          the same AWS Strands process; only the key differs.
        </p>
        <ui-source path="server.ts" />
      </ui-panel>

      <ui-panel heading="Address it by that key">
        <ui-source
          path="src/app/features/copilot-runtime/my-agent-chat.component.ts"
        />
      </ui-panel>

      <ui-callout title="An agent's declared name is not its routing key">
        The AWS Strands agent declares itself as <code>strands_agent</code> in
        <code>backend/main.py</code>. That name is never used for routing: the
        frontend can ask only for <code>default</code>, <code>support</code>,
        <code>my_agent</code>, or <code>research-agent</code>, the keys of the
        runtime's <code>agents</code> map.
      </ui-callout>
    </div>
  `,
})
export default class CopilotRuntimePage {}
