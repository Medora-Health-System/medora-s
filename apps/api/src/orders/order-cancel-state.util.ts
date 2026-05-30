import { ConflictException } from "@nestjs/common";
import {
  OrderItemLifecycleState,
  OrderStatus,
} from "@prisma/client";

const TERMINAL_ITEM_STATUSES = new Set<OrderStatus>([
  OrderStatus.COMPLETED,
  OrderStatus.RESULTED,
  OrderStatus.VERIFIED,
]);

type OrderItemCancelStateRow = {
  lifecycleState: OrderItemLifecycleState;
  status: OrderStatus;
  catalogItemType: string;
  documentedCollectedAt?: Date | null;
  effectiveCollectedAt?: Date | null;
  documentedCompletedAt?: Date | null;
  effectiveClinicalAt?: Date | null;
};

type OrderItemCancelWorkContext = {
  orderType: string;
  medicationAdministrationCount?: number;
};

/** Blocks cancel when lifecycle/status no longer allows it (409). */
export function assertOrderItemCancelAllowedByState(item: OrderItemCancelStateRow): void {
  if (item.lifecycleState === OrderItemLifecycleState.REVIEWED) {
    throw new ConflictException("Cette ligne est closée ; l'annulation n'est pas possible.");
  }
  if (item.lifecycleState === OrderItemLifecycleState.CANCELLED) {
    return;
  }
  if (TERMINAL_ITEM_STATUSES.has(item.status)) {
    throw new ConflictException(
      "Cette commande ne peut plus être annulée car elle est déjà réalisée ou validée."
    );
  }
  if (item.lifecycleState === OrderItemLifecycleState.COMPLETED) {
    throw new ConflictException(
      "Cette commande ne peut plus être annulée car elle est déjà réalisée ou validée."
    );
  }
}

/** Blocks cancel when downstream clinical work would be silently undone (409). */
export function assertOrderItemCancelAllowedByPerformedWork(
  item: OrderItemCancelStateRow,
  ctx: OrderItemCancelWorkContext
): void {
  if (ctx.orderType === "LAB" || item.catalogItemType === "LAB_TEST") {
    if (item.documentedCollectedAt || item.effectiveCollectedAt) {
      throw new ConflictException(
        "Cette analyse ne peut plus être annulée : prélèvement déjà documenté."
      );
    }
    if (item.status === OrderStatus.RESULTED || item.status === OrderStatus.VERIFIED) {
      throw new ConflictException(
        "Cette commande ne peut plus être annulée car elle est déjà réalisée ou validée."
      );
    }
  }

  if (ctx.orderType === "IMAGING" || item.catalogItemType === "IMAGING_STUDY") {
    if (
      item.lifecycleState === OrderItemLifecycleState.IN_PROGRESS ||
      item.lifecycleState === OrderItemLifecycleState.COMPLETED ||
      item.lifecycleState === OrderItemLifecycleState.REVIEWED
    ) {
      throw new ConflictException(
        "Cet examen ne peut plus être annulé : étude déjà démarrée ou terminée."
      );
    }
  }

  if (ctx.orderType === "MEDICATION" || item.catalogItemType === "MEDICATION") {
    if ((ctx.medicationAdministrationCount ?? 0) > 0) {
      throw new ConflictException(
        "Ce médicament ne peut plus être annulé : administration déjà documentée."
      );
    }
  }

  if (ctx.orderType === "CARE" || item.catalogItemType === "CARE") {
    if (item.documentedCompletedAt || item.effectiveClinicalAt) {
      throw new ConflictException(
        "Ce soin / cette procédure ne peut plus être annulé(e) : réalisation déjà documentée."
      );
    }
  }
}