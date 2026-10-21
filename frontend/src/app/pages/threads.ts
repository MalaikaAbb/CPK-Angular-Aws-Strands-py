import { Component } from '@angular/core';

import { RouteHeader } from '../components/route-header';
import { Callout, DocSample, Panel, SourceCode, TryIt } from '../components/ui';

@Component({
  selector: 'app-threads-page',
  imports: [RouteHeader, Panel, Callout, TryIt, SourceCode, DocSample],
  template: `
    <app-route-header path="/threads" />

    <div class="space-y-6">
      <ui-try-it>
        <p class="mt-1 text-slate-700">
          Open the demo and look at both surfaces.
        </p>
        <p class="mt-2 text-slate-700">
          <strong>Pass (the case here):</strong> the runtime is now built with
          an Intelligence client, so
          <code>/api/copilotkit/info</code> reports
          <code>mode: "intelligence"</code> and
          <code>threadEndpoints.mutations: true</code>. Threads list, selecting
          a row replays that conversation into the chat beside it, and rename /
          archive / delete take effect.
          <strong>Fail:</strong> the drawer renders its <em>locked</em> state,
          or a blank area with no drawer at all. The locked state used to be
          the expected result on this harness, when the runtime had no
          Intelligence client and the thread endpoints were switched off; it is
          no longer.
        </p>
      </ui-try-it>

      <ui-callout tone="info" title="Thread endpoints are a platform capability">
        Threads are served by CopilotKit Intelligence through the runtime, not
        by AWS Strands. They exist only because
        <code>frontend/server.ts</code> passes a
        <code>CopilotKitIntelligence</code> client to
        <code>CopilotRuntime</code> as <code>intelligence</code>; a runtime
        built without it runs in SSE mode, answers in the browser exactly the
        same way, and serves no threads at all.
      </ui-callout>

      <ui-panel heading="Resume a specific thread">
        <p class="mb-3 text-sm text-slate-700">
          The simplest form is one input. Bind a selected id and the chat
          connects to that existing conversation.
        </p>
        <ui-doc-sample
          caption="Threads guide — the threadId input"
          [code]="threadIdSample"
        />
      </ui-panel>

      <ui-panel heading="A custom thread list on injectThreads">
        <p class="mb-3 text-sm text-slate-700">
          Inputs accept plain values or signals. The list is
          server-authoritative and uses realtime updates when the platform
          supplies a WebSocket URL.
        </p>
        <ui-source path="src/app/features/threads/thread-list.component.ts" />
      </ui-panel>

      <ui-callout tone="warn" title="Deletion is permanent">
        Rename, archive, unarchive, and delete all return promises. The guide is
        explicit: ask the user before calling <code>deleteThread</code>.
      </ui-callout>

      <ui-panel heading="The drop-in drawer">
        <p class="mb-3 text-sm text-slate-700">
          <code>CopilotThreadsDrawer</code> supplies the list, selection,
          filtering, pagination, and mutation controls. The drawer and the chat
          must share one
          <code>provideCopilotChatConfiguration</code> provider — that is what
          makes selection and new-thread actions update the chat.
        </p>
        <ui-source path="src/app/features/threads/conversations.component.ts" />
      </ui-panel>
    </div>
  `,
})
export default class ThreadsPage {
  protected readonly threadIdSample = `<copilot-chat agentId="support" [threadId]="selectedThreadId()" />`;
}
