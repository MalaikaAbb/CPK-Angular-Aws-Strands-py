import { Component } from '@angular/core';

import { RouteHeader } from '../components/route-header';
import { Callout, Panel, SourceCode, TryIt } from '../components/ui';

@Component({
  selector: 'app-ag-ui-page',
  imports: [RouteHeader, Panel, Callout, TryIt, SourceCode],
  template: `
    <app-route-header path="/ag-ui" />

    <div class="space-y-6">
      <ui-try-it>
        <p class="mt-1 text-slate-700">
          Open the demo with the browser console open, and send
          <em>Research the history of solar panels.</em>
        </p>
        <p class="mt-2 text-slate-700">
          <strong>Pass:</strong> the panel on the left shows
          <em>Agent is running…</em> during the run, and the message count
          rises. The console logs <code>Tool called: research_agent</code> and
          a stream of <code>Streaming text:</code> lines.
          <strong>Fail:</strong> the count stays at 0 — the store is not bound
          to the agent the chat is driving.
        </p>
      </ui-try-it>

      <ui-panel heading="Accessing your agent with injectAgentStore">
        <ui-source path="src/app/features/ag-ui/agent-status.component.ts" />
      </ui-panel>

      <ui-panel heading="Subscribing to AG-UI events">
        <p class="mb-3 text-sm text-slate-700">
          The guide gives only the class members. They are mounted unchanged
          inside the smallest component that can hold them.
        </p>
        <ui-source path="src/app/features/ag-ui/agent-events.component.ts" />
      </ui-panel>

      <ui-panel heading="Both, beside a chat on the same agent">
        <ui-source path="src/app/features/ag-ui/ag-ui-chat.component.ts" />
      </ui-panel>

      <ui-callout title="research-agent is a runtime key">
        The guide's snippets ask for <code>research-agent</code>. That key is
        registered in <code>server.ts</code> and points at the same AWS Strands
        process as <code>default</code>. Without it, the store cannot resolve
        an agent and discovery fails.
      </ui-callout>
    </div>
  `,
})
export default class AgUiPage {}
