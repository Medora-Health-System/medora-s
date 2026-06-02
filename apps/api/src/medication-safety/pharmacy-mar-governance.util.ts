import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationOverrideType,
  type PharmacyVerificationStatus,
  type Prisma,
} from "@prisma/client";
import type { AuditService } from "../common/services/audit.service";
import {
  effectivePharmacyVerificationStatus,
  parsePharmacyGovernanceFromProfile,
  pharmacyMarGovernanceApplies,
  validatePharmacyMarCreate,
  type MedicationAdministrationCreateDto,
  type PharmacyMarCreateInput,
  type PharmacyMarGovernanceContext,
  type PharmacyVerificationStatusRead,
} from "@medora/shared";
import { mergeMedicationSafetyGovernanceRead } from "./medication-safety-governance-read.util";

export type PharmacyMarPersistInput = {
  tx: Prisma.TransactionClient;
  audit: AuditService;
  facilityId: string;
  encounterId: string;
  patientId: string;
  orderId?: string;
  medicationAdministrationId: string;
  orderItemId: string | null;
  catalogMedicationId: string | null;
  administeredByUserId: string;
  data: MedicationAdministrationCreateDto;
  governance: PharmacyMarGovernanceContext;
};

function toStatusRead(status: PharmacyVerificationStatus | null | undefined): PharmacyVerificationStatusRead {
  if (!status) return "PENDING";
  return status as PharmacyVerificationStatusRead;
}

export async function resolvePharmacyMarGovernance(
  prisma: Pick<Prisma.TransactionClient, "medicationProduct" | "pharmacyVerification">,
  orderItemId: string | null,
  catalogMedicationId: string | null,
  catalogRow: {
    id: string;
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  } | null
): Promise<PharmacyMarGovernanceContext | null> {
  if (!catalogMedicationId || !catalogRow || !orderItemId) return null;

  const product = await prisma.medicationProduct.findFirst({
    where: { legacyCatalogMedicationId: catalogMedicationId, isActive: true },
    select: {
      legacyCatalogMedicationId: true,
      concept: {
        select: {
          safetyProfile: {
            select: {
              isHighAlert: true,
              highAlertCategories: true,
              lasaGroupId: true,
              isControlled: true,
              controlledSchedule: true,
              requiresWitness: true,
              requiresDoubleSign: true,
            },
          },
        },
      },
      administrationProfile: { select: { allowsWasteDocumentation: true } },
    },
  });

  const profileRow = product
    ? {
        legacyCatalogMedicationId: product.legacyCatalogMedicationId,
        concept: { safetyProfile: product.concept.safetyProfile },
        administrationProfile: product.administrationProfile,
      }
    : null;

  const merged = mergeMedicationSafetyGovernanceRead(catalogRow, profileRow, null);
  const safety = profileRow?.concept.safetyProfile ?? null;
  const parsed = parsePharmacyGovernanceFromProfile({
    controlledSchedule: merged?.controlledSchedule ?? catalogRow.controlledSchedule,
    highAlertCategories: safety?.highAlertCategories,
  });

  if (!parsed.requiresPharmacyVerification) return null;

  const latest = await prisma.pharmacyVerification.findFirst({
    where: { orderItemId },
    orderBy: { createdAt: "desc" },
    select: { verificationStatus: true },
  });

  const verificationStatus = effectivePharmacyVerificationStatus({
    requiresPharmacyVerification: true,
    rowStatus: toStatusRead(latest?.verificationStatus),
  });

  return {
    requiresPharmacyVerification: true,
    verificationStatus,
    catalogMedicationId,
    controlledSchedule: merged?.controlledSchedule ?? catalogRow.controlledSchedule,
    highAlertClass: parsed.highAlertClass,
  };
}

export function assertPharmacyMarCreate(
  input: PharmacyMarCreateInput
): ReturnType<typeof validatePharmacyMarCreate> & { ok: true } {
  const result = validatePharmacyMarCreate(input);
  if (!result.ok) {
    throw new BadRequestException(result.message);
  }
  return result;
}

export async function persistPharmacyMarGovernance(input: PharmacyMarPersistInput): Promise<void> {
  const marAction = input.data.marAction ?? "administered";
  if (!pharmacyMarGovernanceApplies(input.governance, marAction)) {
    return;
  }

  const validation = assertPharmacyMarCreate({
    marAction,
    governance: input.governance,
    pharmacyVerificationOverrideReason: input.data.pharmacyVerificationOverrideReason,
    pharmacyVerificationOverrideAcknowledged: input.data.pharmacyVerificationOverrideAcknowledged,
  });

  if (!validation.overrideUsed) {
    return;
  }

  const govMeta = {
    requiresPharmacyVerification: input.governance.requiresPharmacyVerification,
    verificationStatus: input.governance.verificationStatus,
    catalogMedicationId: input.governance.catalogMedicationId ?? null,
    controlledSchedule: input.governance.controlledSchedule ?? null,
    highAlertClass: input.governance.highAlertClass ?? null,
  };

  const overrideReason = input.data.pharmacyVerificationOverrideReason?.trim() || null;

  await input.tx.medicationAdministrationOverride.create({
    data: {
      facilityId: input.facilityId,
      medicationAdministrationId: input.medicationAdministrationId,
      encounterId: input.encounterId,
      orderItemId: input.orderItemId,
      overrideType: MedicationOverrideType.PHARMACY_PENDING_OVERRIDE,
      overrideReason,
      actorUserId: input.administeredByUserId,
      metadata: {
        ...govMeta,
        overrideKind: "PHARMACY_VERIFICATION_OVERRIDE",
        sourcePhase: "M1.3F.7",
      } as Prisma.InputJsonValue,
    },
  });

  await input.audit.log(AuditAction.PHARMACY_VERIFICATION_OVERRIDE, "MEDICATION_ADMINISTRATION", {
    userId: input.administeredByUserId,
    facilityId: input.facilityId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    entityId: input.medicationAdministrationId,
    ...(input.orderId ? { orderId: input.orderId } : {}),
    critical: true,
    tx: input.tx,
    metadata: {
      ...govMeta,
      overrideReasonLength: overrideReason?.length ?? 0,
    },
  });
}
