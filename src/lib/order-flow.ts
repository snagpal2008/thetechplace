import type { OrderStatus, Role } from "@/db/schema";

export type OrderAction = "accept" | "decline" | "start" | "deliver" | "cancel";

type Rule = { from: OrderStatus[]; to: OrderStatus; roles: Role[]; label: string };

export const ORDER_ACTIONS: Record<OrderAction, Rule> = {
  accept: { from: ["requested"], to: "accepted", roles: ["vendor"], label: "Accept order" },
  decline: { from: ["requested"], to: "declined", roles: ["vendor"], label: "Decline" },
  start: { from: ["accepted"], to: "in_progress", roles: ["vendor"], label: "Mark in progress" },
  deliver: { from: ["accepted", "in_progress"], to: "delivered", roles: ["vendor"], label: "Mark delivered & invoice" },
  cancel: { from: ["requested", "accepted"], to: "cancelled", roles: ["director", "admin"], label: "Cancel order" },
};

export function nextStatus(current: OrderStatus, action: OrderAction, role: Role): OrderStatus {
  const rule = ORDER_ACTIONS[action];
  if (!rule) throw new Error(`Unknown action ${action}`);
  if (!rule.roles.includes(role)) throw new Error(`A ${role} cannot ${action} an order`);
  if (!rule.from.includes(current)) throw new Error(`Cannot ${action} an order that is ${current}`);
  return rule.to;
}

export function availableActions(current: OrderStatus, role: Role): OrderAction[] {
  return (Object.keys(ORDER_ACTIONS) as OrderAction[]).filter((a) => {
    const r = ORDER_ACTIONS[a];
    return r.roles.includes(role) && r.from.includes(current);
  });
}
