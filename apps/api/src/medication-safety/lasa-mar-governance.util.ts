import {
  AuditAction,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
  type Prisma,
} from "@prisma/client";
import type { AuditService } from "../common/services/audit.service";
import {
  lasaMarGovernanceApplies,
  lasaMarHasGovernanceSignal,
  lasaMarRequiresAcknowledgement,
  parseMedicationHighAlertCategoriesJson,
  validateLasaMarCreate,
  type LasaMarCreateInput,
  type LasaMarGovernanceContext,
  type MedicationAdministrationCreateDto,
} from "@medora/shared";
import { marValidationBadRequest } from "../medication-administration/mar-create-validation-log.util";
import { mergeMedicationSafetyGovernanceRead } from "./medication-safety-governance-read.util";

export type LasaMarPersistInput = {
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
  governance: LasaMarGovernanceContext;
};

export async function resolveLasaMarGovernance(
  prisma: Pick<Prisma.TransactionClient, "medicationProduct">,
  catalogMedicationId: string | null,
  catalogRow: {
    id: string;
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  } | null
): Promise<LasaMarGovernanceContext | null> {
  if (!catalogMedicationId || !catalogRow) return null;

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
  const parsed = parseMedicationHighAlertCategoriesJson(safety?.highAlertCategories);

  const lasaGroupId = safety?.lasaGroupId?.trim() || parsed.lasaGroupCode || merged?.lasaGroupId?.trim() || null;
  const lasaGroupLabel = parsed.lasaGroupLabel || merged?.lasaGroupLabel?.trim() || null;
  const lasaSeverity = parsed.lasaSeverity || merged?.lasaSeverity?.trim() || null;

  if (!lasaMarHasGovernanceSignal({ lasaGroupId, lasaSeverity })) {
    return null;
  }

  const requiresAcknowledgement = lasaMarRequiresAcknowledgement({ lasaGroupId, lasaSeverity });
  if (!requiresAcknowledgement) {
    return null;
  }

  return {
    lasaGroupId,
    lasaGroupLabel,
    lasaSeverity,
    requiresAcknowledgement: true,
    catalogMedicationId,
  };
}

export function assertLasaMarCreate(
  input: LasaMarCreateInput
): ReturnType<typeof validateLasaMarCreate> & { ok: true } {
  const result = validateLasaMarCreate(input);
  if (!result.ok) {
    throw marValidationBadRequest(result.code, result.message);
  }
  return result;
}

function phiSafeLasaMetadata(governance: LasaMarGovernanceContext): Record<string, unknown> {
  return {
    lasaGroupId: governance.lasaGroupId,
    lasaSeverity: governance.lasaSeverity,
    lasaGroupLabel: governance.lasaGroupLabel,
    catalogMedicationId: governance.catalogMedicationId ?? null,
  };
}

export async function persistLasaMarGovernance(input: LasaMarPersistInput): Promise<void> {
  const marAction = input.data.marAction ?? "administered";
  if (!lasaMarGovernanceApplies(input.governance, marAction)) {
    return;
  }

  const validation = assertLasaMarCreate({
    marAction,
    governance: input.governance,
    lasaAcknowledged: input.data.lasaAcknowledged,
    lasaMedicationSelectionConfirmed: input.data.lasaMedicationSelectionConfirmed,
    lasaSecondReadUserId: input.data.lasaSecondReadUserId,
    lasaSecondReadDisplayName: input.data.lasaSecondReadDisplayName,
    lasaOverrideReason: input.data.lasaOverrideReason,
    lasaOverrideAcknowledged: input.data.lasaOverrideAcknowledged,
    administeredByUserId: input.administeredByUserId,
  });

  const govMeta = phiSafeLasaMetadata(input.governance);
  const secondReadUserId = input.data.lasaSecondReadUserId?.trim() || null;
  const secondReadDisplayName = input.data.lasaSecondReadDisplayName?.trim() || null;

  if (validation.acknowledged) {
    await input.tx.medicationAdministrationVerification.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        catalogMedicationId: input.catalogMedicationId,
        verificationType: MedicationVerificationType.LASA_ACKNOWLEDGMENT,
        verificationStatus: MedicationVerificationStatus.COMPLETED,
        verifierUserId: input.administeredByUserId,
        witnessedByUserId: secondReadUserId,
        metadata: {
          ...govMeta,
          lasaAcknowledged: true,
          medicationSelectionConfirmed: input.data.lasaMedicationSelectionConfirmed === true,
          secondReadDisplayName: secondReadDisplayName || null,
          sourcePhase: "M1.3F.6",
        } as Prisma.InputJsonValue,
      },
    });

    await input.audit.log(AuditAction.LASA_WARNING_ACKNOWLEDGED, "MEDICATION_ADMINISTRATION", {
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
        secondReadUserId,
        secondReadDisplayNameProvided: Boolean(secondReadDisplayName),
        medicationSelectionConfirmed: input.data.lasaMedicationSelectionConfirmed === true,
      },
    });
  }

  if (validation.overrideUsed) {
    await input.tx.medicationAdministrationOverride.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        overrideType: MedicationOverrideType.LASA_OVERRIDE,
        overrideReason: input.data.lasaOverrideReason?.trim() || null,
        actorUserId: input.administeredByUserId,
        metadata: {
          ...govMeta,
          sourcePhase: "M1.3F.6",
        } as Prisma.InputJsonValue,
      },
    });

    await input.audit.log(AuditAction.LASA_OVERRIDE, "MEDICATION_ADMINISTRATION", {
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
        overrideReasonLength: input.data.lasaOverrideReason?.trim().length ?? 0,
      },
    });
  }
}
