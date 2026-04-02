import { BadRequestException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

/** Message unique pour toute mutation refusée lorsque la commande parente est annulée. */
export const CANCELLED_PARENT_ORDER_MESSAGE_FR = "Commande annulée — aucune action possible.";

export function assertParentOrderNotCancelled(orderStatus: OrderStatus): void {
  if (orderStatus === OrderStatus.CANCELLED) {
    throw new BadRequestException(CANCELLED_PARENT_ORDER_MESSAGE_FR);
  }
}
