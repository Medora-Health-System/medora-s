import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
  type Prisma,
} from "@prisma/client";
import type { AuditService } from "../common/services/audit.service";
import {
  highAlertMarGovernanceApplies,
  marAdministrationRequiresDoubleCheck,
  parseMedicationHighAlertCategoriesJson,
  parseMedicationSafetyRequirementsFromCategoriesJson,
  resolveMarHighAlertClassification,
  validateHighAlertMarCreate,
  type HighAlertMarCreateInput,
  type HighAlertMarGovernanceContext,
  type HighAlertMarVerificationTypeHint,
  type MedicationAdministrationCreateDto,
} from "@medora/shared";
import { mergeMedicationSafetyGovernanceRead } from "./medication-safety-governance-read.util";

export type HighAlertMarPersistInput = {
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
  governance: HighAlertMarGovernanceContext;
};

function toPrismaVerificationType(
  hint: HighAlertMarVerificationTypeHint
): MedicationVerificationType {
  switch (hint) {
    case "DUAL_VERIFICATION":
      return MedicationVerificationType.DUAL_VERIFICATION;
    case "COSIGN":
      return MedicationVerificationType.COSIGN;
    default:
      return MedicationVerificationType.INDEPENDENT_DOUBLE_CHECK;
  }
}

export async function resolveHighAlertMarGovernance(
  prisma: Pick<Prisma.TransactionClient, "medicationProduct">,
  catalogMedicationId: string | null,
  catalogRow: {
    id: string;
    code?: string | null;
    genericName?: string | null;
    displayNameEn?: string | null;
    strength?: string | null;
    dosageForm?: string | null;
    therapeuticClass?: string | null;
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  } | null,
  marContext?: {
    route?: string | null;
    orderRoute?: string | null;
    marRoute?: string | null;
    catalogRoute?: string | null;
    administrationType?: string | null;
    isContinuousInfusion?: boolean;
    infusionPhase?: string | null;
  }
): Promise<HighAlertMarGovernanceContext | null> {
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
  const profileSafetyRequirementCodes = parseMedicationSafetyRequirementsFromCategoriesJson(
    safety?.highAlertCategories
  );
  const resolvedClassification = resolveMarHighAlertClassification({
    profileHighAlertClass: parsed.highAlertClass,
    profileSafetyRequirementCodes,
    catalog: {
      code: catalogRow.code ?? null,
      genericName: catalogRow.genericName ?? null,
      displayNameEn: catalogRow.displayNameEn ?? null,
      strength: catalogRow.strength ?? null,
      dosageForm: catalogRow.dosageForm ?? null,
    },
  });
  const effectiveHighAlertClass = resolvedClassification?.highAlertClass ?? parsed.highAlertClass;
  const safetyRequirementCodes =
    resolvedClassification?.safetyRequirementCodes.length
      ? resolvedClassification.safetyRequirementCodes
      : profileSafetyRequirementCodes;

  const isHighAlert =
    merged?.isHighAlert === true ||
    Boolean(effectiveHighAlertClass && effectiveHighAlertClass !== "HIGH_ALERT_NONE");

  const requiresDoubleCheck = marAdministrationRequiresDoubleCheck({
    isHighAlert,
    requiresDoubleSign: merged?.requiresDoubleSign ?? catalogRow.requiresDoubleSign,
    safetyRequirementCodes,
    highAlertClass: effectiveHighAlertClass,
    catalogCode: catalogRow.code ?? null,
    genericName: catalogRow.genericName ?? null,
    therapeuticClass: catalogRow.therapeuticClass ?? null,
    route: marContext?.route ?? null,
    orderRoute: marContext?.orderRoute ?? null,
    marRoute: marContext?.marRoute ?? null,
    catalogRoute: marContext?.catalogRoute ?? null,
    administrationType: marContext?.administrationType ?? null,
    isContinuousInfusion: marContext?.isContinuousInfusion === true,
    infusionPhase: marContext?.infusionPhase ?? null,
  });

  if (!requiresDoubleCheck) return null;

  return {
    isHighAlert,
    requiresDoubleCheck: true,
    safetyRequirementCodes,
    catalogMedicationId,
    highAlertClass: effectiveHighAlertClass ?? null,
  };
}

export function assertHighAlertMarCreate(
  input: HighAlertMarCreateInput
): ReturnType<typeof validateHighAlertMarCreate> & { ok: true } {
  const result = validateHighAlertMarCreate(input);
  if (!result.ok) {
    throw new BadRequestException(result.message);
  }
  return result;
}

function phiSafeHighAlertMetadata(governance: HighAlertMarGovernanceContext): Record<string, unknown> {
  return {
    isHighAlert: governance.isHighAlert,
    requiresDoubleCheck: governance.requiresDoubleCheck,
    safetyRequirementCodes: governance.safetyRequirementCodes,
    catalogMedicationId: governance.catalogMedicationId ?? null,
  };
}

export async function persistHighAlertMarGovernance(
  input: HighAlertMarPersistInput
): Promise<void> {
  const marAction = input.data.marAction ?? "administered";
  if (!highAlertMarGovernanceApplies(input.governance, marAction)) {
    return;
  }

  const witnessUserId = input.data.witnessUserId?.trim() || null;

  const validation = assertHighAlertMarCreate({
    marAction,
    governance: input.governance,
    highAlertVerifierUserId: input.data.highAlertVerifierUserId,
    highAlertVerifierDisplayName: input.data.highAlertVerifierDisplayName,
    administeredByUserId: input.administeredByUserId,
    controlledWitnessUserId: witnessUserId,
    highAlertOverrideReason: input.data.highAlertOverrideReason,
    highAlertOverrideAcknowledged: input.data.highAlertOverrideAcknowledged,
    sharedOverrideReason: input.data.overrideReason,
    sharedControlledOverrideAcknowledged: input.data.controlledOverrideAcknowledged,
    highAlertVerificationType: input.data.highAlertVerificationType ?? null,
  });

  const govMeta = phiSafeHighAlertMetadata(input.governance);
  const verifierUserId = input.data.highAlertVerifierUserId?.trim() || null;
  const verifierDisplayName = input.data.highAlertVerifierDisplayName?.trim() || null;
  const prismaVerificationType = toPrismaVerificationType(validation.verificationType);

  if (validation.verifierProvided) {
    await input.tx.medicationAdministrationVerification.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        catalogMedicationId: input.catalogMedicationId,
        verificationType: prismaVerificationType,
        verificationStatus: MedicationVerificationStatus.COMPLETED,
        verifierUserId: input.administeredByUserId,
        witnessedByUserId: verifierUserId,
        metadata: verifierDisplayName
          ? ({
              verifierDisplayName,
              verificationTypeHint: validation.verificationType,
              sourcePhase: "M1.3F.5",
            } as Prisma.InputJsonValue)
          : ({
              verificationTypeHint: validation.verificationType,
              sourcePhase: "M1.3F.5",
            } as Prisma.InputJsonValue),
      },
    });

    await input.audit.log(AuditAction.HIGH_ALERT_DOUBLE_CHECK_COMPLETED, "MEDICATION_ADMINISTRATION", {
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
        verificationType: validation.verificationType,
        verifierUserId,
        verifierDisplayNameProvided: Boolean(verifierDisplayName),
      },
    });
  }

  if (validation.overrideUsed) {
    const overrideReason =
      input.data.highAlertOverrideReason?.trim() ||
      input.data.overrideReason?.trim() ||
      null;

    await input.tx.medicationAdministrationOverride.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        overrideType: MedicationOverrideType.HIGH_ALERT_OVERRIDE,
        overrideReason,
        actorUserId: input.administeredByUserId,
        metadata: {
          ...govMeta,
          verificationType: validation.verificationType,
          sourcePhase: "M1.3F.5",
        } as Prisma.InputJsonValue,
      },
    });

    await input.audit.log(AuditAction.HIGH_ALERT_OVERRIDE, "MEDICATION_ADMINISTRATION", {
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
}
