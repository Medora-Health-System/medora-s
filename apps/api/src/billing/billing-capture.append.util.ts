import type { PrismaService } from "../prisma/prisma.service";
import type { BillingCaptureItem } from "@medora/shared";
import { upsertBillingCaptureItem } from "@medora/shared";
import { throwEncounterConcurrentModification } from "../encounters/encounter-concurrency.util";

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
    select: { id: true, billingCaptureJson: true, version: true },
  });
  if (!enc) return;

  const merged = upsertBillingCaptureItem(enc.billingCaptureJson, item);
  const u = await prisma.encounter.updateMany({
    where: { id: encounterId, facilityId, version: enc.version },
    data: {
      billingCaptureJson: merged as object,
      version: { increment: 1 },
    },
  });
  if (u.count === 0) throwEncounterConcurrentModification();
}
