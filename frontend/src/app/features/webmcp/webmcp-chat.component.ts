/**
 * Mounts the WebMCP guide's `searchOrders` tool beside a chat on the default
 * agent. The same handler then answers both callers the guide describes: the
 * CopilotKit agent through the chat, and a WebMCP-aware browser agent through
 * `document.modelContext`.
 * https://docs.copilotkit.ai/angular/strands/webmcp
 */
import { Component } from '@angular/core';
import { CopilotChat } from '@copilotkit/angular';

import { OrderSearchComponent } from './order-search.component';

@Component({
  selector: 'app-webmcp-chat',
  imports: [CopilotChat, OrderSearchComponent],
  template: `
    <app-order-search />
    <div style="height: 100%">
      <copilot-chat />
    </div>
  `,
})
export class WebmcpChatComponent {}
