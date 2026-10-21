/**
 * The drawer-plus-chat sample, verbatim. Both sit under one
 * `provideCopilotChatConfiguration`, which is what makes selection and
 * new-thread actions in the drawer update the chat.
 * https://docs.copilotkit.ai/angular/strands/guides/threads-memory-attachments-headless
 */
import { Component } from '@angular/core';
import {
  CopilotChat,
  CopilotThreadsDrawer,
  provideCopilotChatConfiguration,
} from '@copilotkit/angular';

@Component({
  selector: 'app-conversations',
  imports: [CopilotChat, CopilotThreadsDrawer],
  providers: [provideCopilotChatConfiguration({ agentId: 'support' })],
  // Layout lives on the host and in scoped styles, never in the template: the
  // two element tags below are the guide's sample and stay byte-identical to it.
  // Without this the host is `display: inline`, so the drawer and chat ignore
  // the flex row they sit in and the chat shrink-wraps to a narrow column.
  host: { class: 'flex min-h-0 flex-1 gap-4' },
  styles: `
    copilot-threads-drawer {
      display: block;
      flex: 0 0 16rem;
      min-height: 0;
      overflow-y: auto;
    }
    copilot-chat {
      display: block;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
    }
  `,
  template: `
    <copilot-threads-drawer agentId="support" [limit]="20" />
    <copilot-chat />
  `,
})
export class ConversationsComponent {}
