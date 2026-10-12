/**
 * "Angular frontend tool", verbatim from
 * https://docs.copilotkit.ai/angular/strands/webmcp
 *
 * One line is added: the import of `searchOrders`, which the guide calls but
 * does not define. It comes from ./search-orders, a harness-only fixture.
 */
import { Component } from "@angular/core";
import { registerFrontendTool } from "@copilotkit/angular";
import { z } from "zod";

import { searchOrders } from "./search-orders";

@Component({
  selector: "app-order-search",
  standalone: true,
  template: "",
})
export class OrderSearchComponent {
  constructor() {
    registerFrontendTool({
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
    });
  }
}
