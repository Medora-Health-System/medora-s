import type { PrismaService } from "../prisma/prisma.service";
import type { BillingCaptureItem } from "@medora/shared";
import { upsertBillingCaptureItem } from "@medora/shared";

/**
 * Persists one billing capture candidate on the encounter (idempotent when sourceType+sourceId match).
 */
export async function appendBillingCaptureCandidate(
  prisma: PrismaService,
  encounterId: string,
  facilityId: string,
  item: BillingCaptureItem
): Promise<void> {
  const enc = await prisma.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: { id: true, billingCaptureJson: true },
  });
  if (!enc) return;

  const merged = upsertBillingCaptureItem(enc.billingCaptureJson, item);
  await prisma.encounter.update({
    where: { id: encounterId },
    data: { billingCaptureJson: merged as object },
  });
}
