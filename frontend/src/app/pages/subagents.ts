import { Component } from '@angular/core';

import { RouteHeader } from '../components/route-header';
import { Callout, Panel, SourceCode, TryIt } from '../components/ui';

@Component({
  selector: 'app-subagents-page',
  imports: [RouteHeader, Panel, Callout, TryIt, SourceCode],
  template: `
    <app-route-header path="/subagents" />

    <div class="space-y-6">
      <ui-try-it>
        <p class="mt-1 text-slate-700">
          Open the demo and send
          <em>Research, write, and critique a short paragraph on solar
          panels.</em>
        </p>
        <p class="mt-2 text-slate-700">
          <strong>Pass:</strong> a Researcher, Writer, and Critic card appears
          in the transcript as each sub-agent runs, and the delegation log on
          the left grows to 3 calls, each carrying that sub-agent's output.
          <strong>Fail:</strong> the cards render but the log stays empty — the
          backend's <code>state_from_result</code> hooks are not emitting the
          <code>delegations</code> state slot.
        </p>
      </ui-try-it>

      <ui-panel heading="Backend — sub-agents as tools">
        <p class="text-sm text-slate-700">
          <code>backend/tools.py</code> holds the guide's sub-agent setup and
          its three delegation tools. Each one is a single-shot OpenAI call with
          its own system prompt. <code>backend/state.py</code> holds
          <code>_make_subagent_state_from_result</code>, which the guide names
          but does not show.
          <code>backend/main.py</code> adds the tools to the existing agent and
          binds one hook per tool through <code>tool_behaviors</code>, following
          the showcase this guide is cut from. Each delegation therefore emits a
          <code>StateSnapshotEvent</code> carrying the full
          <code>delegations</code> list.
        </p>
      </ui-panel>

      <ui-panel heading="Rendering a live delegation log">
        <ui-source
          path="src/app/features/subagents/subagents-chat.component.ts"
        />
      </ui-panel>

      <ui-panel heading="Reading the delegations slot">
        <ui-source path="src/app/features/subagents/subagent-model.ts" />
      </ui-panel>

      <ui-panel heading="One renderer per sub-agent tool">
        <ui-source
          path="src/app/features/subagents/subagent-renderer-config.ts"
        />
      </ui-panel>

      <ui-panel heading="Transcript card and delegation log">
        <ui-source path="src/app/features/subagents/subagent-cards.ts" />
      </ui-panel>

      <ui-callout title="Not in the guide — taken from the showcase source">
        The guide does not show its imports, the supervisor's
        <code>tool_behaviors</code> wiring,
        <code>_make_subagent_state_from_result</code>, the sub-agent line in
        the system prompt, <code>readDelegations</code>,
        <code>subAgentRendererConfig</code>, or either card component. All of
        them are copied from the CopilotKit showcase the guide's snippets come
        from. The snippets' import block is cut down to what the sub-agent
        tools use; the rest — the showcase's shared <code>tools</code> module,
        gen-ui-agent, and A2UI generation — serves other showcase demos. The
        snippets' <code>_MessagesSnapshotWrapper</code> is also dropped: it was
        written for <code>ag_ui_strands</code> 0.1.7, which did not emit
        <code>MessagesSnapshotEvent</code>. The installed 1.0.1 does
        (<code>emit_messages_snapshot</code> defaults to true), and the current
        showcase source no longer carries the wrapper.
      </ui-callout>
    </div>
  `,
})
export default class SubagentsPage {}
