import { BadRequestException } from "@nestjs/common";
import {
  OrderEventOrderType,
  OrderEventType,
  OrderStatus,
  type Prisma,
} from "@prisma/client";

export function mapOrderTypeStringToOrderEventOrderType(orderType: string): OrderEventOrderType {
  if (orderType === "LAB") return OrderEventOrderType.LAB;
  if (orderType === "IMAGING") return OrderEventOrderType.IMAGING;
  if (orderType === "MEDICATION") return OrderEventOrderType.MEDICATION;
  if (orderType === "CARE") return OrderEventOrderType.PROCEDURE;
  throw new BadRequestException("Type de commande invalide pour audit.");
}

export async function buildRoleSnapshotForOrderEvent(
  tx: Prisma.TransactionClient,
  facilityId: string,
  userId: string
): Promise<string> {
  const roles = await tx.userRole.findMany({
    where: { facilityId, userId, isActive: true },
    include: { role: { select: { code: true } } },
  });
  const unique = [...new Set(roles.map((r) => r.role.code))];
  if (unique.length === 0) return "UNKNOWN";
  return unique.join("|");
}

/**
 * Lab / imaging result verification: persist one `OrderEvent` when the line reaches RESULTED or VERIFIED.
 * `OrderEventType` has no RESULTED value — we use `COMPLETED` with `metadata.lifecycleOutcome` for dashboard / audit.
 * Idempotent per `(orderItemId, lineStatus)` via `metadata.dedupeKey`.
 */
export async function writeOrderEventForResultLineOutcome(
  tx: Prisma.TransactionClient,
  input: {
    facilityId: string;
    encounterId: string;
    orderId: string;
    orderType: string;
    orderItemId: string;
    resultId: string;
    lineStatus: OrderStatus;
    performedByUserId: string;
  }
): Promise<void> {
  if (input.lineStatus !== OrderStatus.RESULTED && input.lineStatus !== OrderStatus.VERIFIED) {
    return;
  }
  const lifecycleOutcome =
    input.lineStatus === OrderStatus.VERIFIED ? "VERIFIED" : "RESULTED";
  const dedupeKey = `result-lifecycle:${input.orderItemId}:${lifecycleOutcome}`;
  const existing = await tx.orderEvent.findFirst({
    where: {
      orderId: input.orderId,
      eventType: OrderEventType.COMPLETED,
      metadata: {
        path: ["dedupeKey"],
        equals: dedupeKey,
      } as Prisma.JsonFilter,
    },
  });
  if (existing) {
    return;
  }
  const roleSnapshot = await buildRoleSnapshotForOrderEvent(
    tx,
    input.facilityId,
    input.performedByUserId
  );
  await tx.orderEvent.create({
    data: {
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      orderId: input.orderId,
      orderType: mapOrderTypeStringToOrderEventOrderType(input.orderType),
      eventType: OrderEventType.COMPLETED,
      performedByUserId: input.performedByUserId,
      performedAt: new Date(),
      roleSnapshot,
      metadata: {
        dedupeKey,
        orderItemId: input.orderItemId,
        resultId: input.resultId,
        lifecycleOutcome,
        source: "RESULT_SERVICE",
      } as Prisma.InputJsonValue,
    },
  });
}
