/**
 * Addresses an agent by its runtime agents-map key, verbatim from
 * https://docs.copilotkit.ai/angular/strands/copilot-runtime
 *
 * `my_agent` is registered in server.ts beside `default`. Both resolve to the
 * same AWS Strands process; only the key differs, which is the point — the key
 * is the one name the frontend may ask for.
 */
import { Component } from '@angular/core';
import { CopilotChat } from '@copilotkit/angular';

@Component({
  selector: 'app-my-agent-chat',
  imports: [CopilotChat],
  template: `<copilot-chat agentId="my_agent" />`,
})
export class MyAgentChatComponent {}
