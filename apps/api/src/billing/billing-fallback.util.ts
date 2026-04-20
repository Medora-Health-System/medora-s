import type { BillingSourceModule } from "@prisma/client";
import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * When no BillingCatalog match exists, append a non-revenue placeholder so the queue never misses a line silently.
 * Never throws; uses dynamic import to avoid a static cycle with `billing-auto-append.util`.
 */
export async function createFallbackBillingLine(
  prisma: PrismaService,
  params: {
    facilityId: string;
    encounterId: string;
    patientId: string;
    sourceModule: BillingSourceModule;
    sourceRecordId: string;
    captureSourceType: BillingCaptureItem["sourceType"];
    description: string;
    billClass?: "professional" | "facility" | "both";
  }
): Promise<void> {
  try {
    console.warn(
      `[billing-auto] missing catalog mapping; appending UNMAPPED line (${String(params.sourceModule)}/${params.sourceRecordId})`
    );
    const { appendBillingEventIfNotExists } = await import("./billing-auto-append.util");
    const base = params.description.trim() || "Item";
    await appendBillingEventIfNotExists(prisma, {
      facilityId: params.facilityId,
      encounterId: params.encounterId,
      patientId: params.patientId,
      sourceModule: params.sourceModule,
      sourceRecordId: params.sourceRecordId,
      captureSourceType: params.captureSourceType,
      system: "INTERNAL",
      billingCode: "UNMAPPED",
      billClass: params.billClass ?? "both",
      description: `UNMAPPED: ${base}`.slice(0, 4000),
    });
  } catch {
    // non-blocking: never throw in clinical paths
  }
}
