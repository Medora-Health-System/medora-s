import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

/** Message unique pour toute mutation refusée lorsque la commande parente est annulée. */
export const CANCELLED_PARENT_ORDER_MESSAGE_FR = "Commande annulée — aucune action possible.";

/** Message unique pour toute mutation refusée lorsque la ligne d'ordre est annulée. */
export const CANCELLED_ORDER_ITEM_MESSAGE_FR =
  "Ligne d'ordre annulée — aucune action possible.";

export function assertParentOrderNotCancelled(orderStatus: OrderStatus): void {
  if (orderStatus === OrderStatus.CANCELLED) {
    throw new BadRequestException(CANCELLED_PARENT_ORDER_MESSAGE_FR);
  }
}

export function assertOrderItemNotCancelled(input: {
  lifecycleState?: string | null;
  status?: OrderStatus | string | null;
}): void {
  const lifecycle = input.lifecycleState?.trim().toUpperCase() ?? "";
  const status = String(input.status ?? "").trim().toUpperCase();
  if (lifecycle === "CANCELLED" || status === "CANCELLED") {
    throw new BadRequestException(CANCELLED_ORDER_ITEM_MESSAGE_FR);
  }
}
