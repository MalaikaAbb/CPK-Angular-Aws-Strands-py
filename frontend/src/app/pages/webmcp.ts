import { Component } from '@angular/core';

import { RouteHeader } from '../components/route-header';
import { Callout, DocSample, Panel, SourceCode, TryIt } from '../components/ui';

@Component({
  selector: 'app-webmcp-page',
  imports: [RouteHeader, Panel, Callout, TryIt, SourceCode, DocSample],
  template: `
    <app-route-header path="/webmcp" />

    <div class="space-y-6">
      <ui-try-it>
        <p class="mt-1 text-slate-700">
          Open the demo and send <em>Which of my orders are still open?</em>
          Then, in Chrome 149 or newer with
          <code>chrome://flags/#enable-webmcp-testing</code> enabled, open the
          demo again and run <code>document.modelContext</code> in the console.
          Use Chrome's Model Context Tool Inspector to find
          <code>searchOrders</code> and call it with
          <code>{{ '{' }} "status": "open" {{ '}' }}</code>.
        </p>
        <p class="mt-2 text-slate-700">
          <strong>Pass:</strong> the chat answers with
          <code>ORD-1001</code> and <code>ORD-1004</code>, and the inspector
          lists <code>searchOrders</code> with its <code>status</code> enum and
          <code>readOnlyHint</code>, returning the same two orders.
          <strong>Fail:</strong> the inspector shows no tool — check the browser
          setup first, then that the tool has a description and
          <code>webmcp</code> is set.
        </p>
      </ui-try-it>

      <ui-panel heading="Angular frontend tool">
        <ui-source path="src/app/features/webmcp/order-search.component.ts" />
      </ui-panel>

      <ui-panel heading="searchOrders — harness fixture">
        <p class="mb-3 text-sm text-slate-700">
          The guide's handler calls <code>searchOrders</code> without defining
          it. This fixed list stands in for the app's own order API.
        </p>
        <ui-source path="src/app/features/webmcp/search-orders.ts" />
      </ui-panel>

      <ui-panel heading="Beside a chat on the default agent">
        <ui-source path="src/app/features/webmcp/webmcp-chat.component.ts" />
      </ui-panel>

      <ui-panel heading="WebMCP only, with no agent">
        <p class="mb-3 text-sm text-slate-700">
          Shown, not run. It registers a second tool named
          <code>searchOrders</code>, and the guide notes that when opted-in
          tools share a name, CopilotKit exposes only the first one. It also
          needs <code>&#64;copilotkit/core</code> as a direct dependency.
        </p>
        <ui-doc-sample
          caption="WebMCP guide — webmcp.ts"
          [code]="coreOnlySample"
        />
      </ui-panel>

      <ui-callout tone="warn" title="WebMCP is experimental">
        WebMCP is a draft Community Group report, not a W3C Standard.
        CopilotKit does nothing when <code>document.modelContext</code> is
        missing, so in a browser without WebMCP only the chat half of this
        route runs. The WebMCP call stays in the browser: it never passes
        through the Copilot Runtime or the AWS Strands agent.
      </ui-callout>
    </div>
  `,
})
export default class WebmcpPage {
  protected readonly coreOnlySample = `import { CopilotKitCore } from "@copilotkit/core";
import { z } from "zod";

export const copilotkit = new CopilotKitCore({
  tools: [
    {
      name: "searchOrders",
      description: "Search the signed-in user's orders by status",
      parameters: z.object({
        status: z.enum(["open", "shipped", "delivered"]),
      }),
      handler: async ({ status }) => {
        const orders = await searchOrders(status);
        return JSON.stringify(orders);
      },
      webmcp: {
        annotations: {
          readOnlyHint: true,
        },
      },
    },
  ],
});`;
}
