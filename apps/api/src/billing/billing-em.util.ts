import { EncounterType, BillingSourceModule } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { appendBillingEventIfNotExists } from "./billing-auto-append.util";

const EM_PROC_DESCRIPTION = "Emergency visit E/M";

export function inferEmergencyEMCode(encounter: {
  type: EncounterType;
  triage: { esi: number | null } | null;
  triageAcuity: number | null;
}): string | null {
  if (encounter.type !== EncounterType.EMERGENCY) return null;

  const t = encounter.triage?.esi;
  const a = encounter.triageAcuity;
  const esi =
    typeof t === "number" && t >= 1 && t <= 5
      ? t
      : typeof a === "number" && a >= 1 && a <= 5
        ? a
        : null;

  if (esi == null) return "99281";
  if (esi <= 2) return "99285";
  if (esi === 3) return "99284";
  if (esi === 4) return "99283";
  if (esi === 5) return "99282";
  return "99281";
}

/**
 * One E/M line per closed ER encounter, idempotent on (ENCOUNTER_EM, encounterId). Never throws.
 */
export async function appendEmergencyEMBilling(prisma: PrismaService, facilityId: string, encounterId: string): Promise<void> {
  try {
    const enc = await prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { triage: true },
    });
    if (!enc) return;

    const cpt = inferEmergencyEMCode(enc);
    if (!cpt) return;

    await appendBillingEventIfNotExists(prisma, {
      facilityId,
      encounterId: enc.id,
      patientId: enc.patientId,
      sourceModule: BillingSourceModule.ENCOUNTER_EM,
      sourceRecordId: enc.id,
      captureSourceType: "ENCOUNTER_EM",
      billingCode: cpt,
      system: "CPT",
      billClass: "professional",
      description: EM_PROC_DESCRIPTION,
    });
  } catch (e) {
    console.warn("[billing-em] appendEmergencyEMBilling:", e instanceof Error ? e.message : e);
  }
}
