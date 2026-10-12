/**
 * NOT FROM THE GUIDE — harness-only fixture.
 *
 * https://docs.copilotkit.ai/angular/strands/webmcp calls
 * `searchOrders(status)` from its handler but never defines it. This stands in
 * for the app's own order API with a fixed list filtered by status, so the
 * handler has something real to return.
 */
export type OrderStatus = 'open' | 'shipped' | 'delivered';

export interface Order {
  id: string;
  status: OrderStatus;
}

const ORDERS: readonly Order[] = [
  { id: 'ORD-1001', status: 'open' },
  { id: 'ORD-1002', status: 'shipped' },
  { id: 'ORD-1003', status: 'delivered' },
  { id: 'ORD-1004', status: 'open' },
];

export async function searchOrders(status: OrderStatus): Promise<Order[]> {
  return ORDERS.filter((order) => order.status === status);
}
