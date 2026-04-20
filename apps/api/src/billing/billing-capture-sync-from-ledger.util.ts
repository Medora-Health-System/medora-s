import type { Prisma } from "@prisma/client";
import { BillingReviewStatus, BillingSide, type BillingEvent } from "@prisma/client";
import type { BillingCaptureItem, BillingEventStatus } from "@medora/shared";
import { readBillingCaptureV1 } from "@medora/shared";

function applyBillClass(item: BillingCaptureItem, side: BillingSide): void {
  if (side === BillingSide.PROFESSIONAL) item.billClass = "professional";
  else if (side === BillingSide.FACILITY) item.billClass = "facility";
  else if (side === BillingSide.BOTH) item.billClass = "both";
  else delete item.billClass;
}

function mapReviewToCaptureStatus(rs: BillingReviewStatus): BillingEventStatus {
  if (rs === BillingReviewStatus.REVIEWED) return "ready";
  if (rs === BillingReviewStatus.VOIDED) return "draft";
  return "needs_review";
}

/**
 * Best-effort: keep Encounter.billingCaptureJson item aligned with a BillingEvent row after structured edits.
 * Skips when captureItemId is missing or item not found.
 */
export async function syncBillingCaptureItemFromLedgerRow(
  tx: Prisma.TransactionClient,
  row: BillingEvent
): Promise<void> {
  const captureItemId = row.captureItemId?.trim();
  if (!captureItemId) return;

  const enc = await tx.encounter.findFirst({
    where: { id: row.encounterId, facilityId: row.facilityId },
    select: { id: true, billingCaptureJson: true, version: true },
  });
  if (!enc) return;

  const stored = readBillingCaptureV1(enc.billingCaptureJson);
  const idx = stored.items.findIndex((it) => it.id === captureItemId);
  if (idx < 0) return;

  const item = { ...stored.items[idx] };
  item.procedureCode = row.procedureCode?.trim() || null;
  item.hcpcsCode = row.hcpcsCode?.trim() || null;
  if (row.diagnosisCodes?.trim()) {
    item.diagnosisCodes = row.diagnosisCodes
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
  } else {
    item.diagnosisCodes = undefined;
  }
  applyBillClass(item, row.billingSide);
  item.status = mapReviewToCaptureStatus(row.reviewStatus);
  item.serviceDate = row.serviceDate ? row.serviceDate.toISOString() : undefined;
  item.revenueCode = row.revenueCode?.trim() || null;
  const mods: string[] = [];
  if (row.modifier1?.trim()) mods.push(row.modifier1.trim().slice(0, 8));
  if (row.modifier2?.trim()) mods.push(row.modifier2.trim().slice(0, 8));
  item.modifiers = mods.length ? mods : undefined;
  if (row.units != null) item.units = row.units;
  if (row.descriptionSnapshot?.trim()) {
    item.note = row.descriptionSnapshot.trim().slice(0, 4000);
  }

  const next = { ...stored, items: [...stored.items] };
  next.items[idx] = item;

  await tx.encounter.updateMany({
    where: { id: enc.id, facilityId: row.facilityId, version: enc.version },
    data: {
      billingCaptureJson: next as unknown as Prisma.InputJsonValue,
      version: { increment: 1 },
    },
  });
}
