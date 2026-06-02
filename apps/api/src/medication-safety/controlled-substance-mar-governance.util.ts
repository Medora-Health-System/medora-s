import { BadRequestException } from "@nestjs/common";
import {
  AuditAction,
  MedicationOverrideType,
  MedicationVerificationStatus,
  MedicationVerificationType,
  MedicationWasteStatus,
  type Prisma,
} from "@prisma/client";
import type { AuditService } from "../common/services/audit.service";
import {
  controlledSubstanceMarGovernanceApplies,
  validateControlledSubstanceMarCreate,
  type ControlledSubstanceMarCreateInput,
  type ControlledSubstanceMarGovernanceContext,
  type MedicationAdministrationCreateDto,
} from "@medora/shared";
import { mergeMedicationSafetyGovernanceRead } from "./medication-safety-governance-read.util";

export type ControlledSubstanceMarPersistInput = {
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
  governance: ControlledSubstanceMarGovernanceContext;
  orderedQuantity: number | null;
};

export async function resolveControlledSubstanceMarGovernance(
  prisma: Pick<Prisma.TransactionClient, "medicationProduct">,
  catalogMedicationId: string | null,
  catalogRow: {
    id: string;
    isControlled: boolean;
    controlledSchedule: string | null;
    requiresWitness: boolean;
    requiresDoubleSign: boolean;
  } | null
): Promise<ControlledSubstanceMarGovernanceContext | null> {
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
  if (!merged?.isControlled && !catalogRow.isControlled) return null;
  return {
    isControlled: merged?.isControlled ?? catalogRow.isControlled,
    requiresWitness: merged?.requiresWitness ?? catalogRow.requiresWitness,
    wasteDocumentationRecommended: merged?.wasteDocumentationRecommended ?? false,
    catalogMedicationId,
  };
}

export function assertControlledSubstanceMarCreate(
  input: ControlledSubstanceMarCreateInput
): ReturnType<typeof validateControlledSubstanceMarCreate> & { ok: true } {
  const result = validateControlledSubstanceMarCreate(input);
  if (!result.ok) {
    throw new BadRequestException(result.message);
  }
  return result;
}

function phiSafeGovernanceMetadata(governance: ControlledSubstanceMarGovernanceContext): Record<string, unknown> {
  return {
    isControlled: governance.isControlled,
    requiresWitness: governance.requiresWitness,
    wasteDocumentationRecommended: governance.wasteDocumentationRecommended ?? false,
    catalogMedicationId: governance.catalogMedicationId ?? null,
  };
}

export async function persistControlledSubstanceMarGovernance(
  input: ControlledSubstanceMarPersistInput
): Promise<void> {
  const marAction = input.data.marAction ?? "administered";
  if (!controlledSubstanceMarGovernanceApplies(input.governance, marAction)) {
    return;
  }

  const validation = assertControlledSubstanceMarCreate({
    marAction,
    governance: input.governance,
    witnessUserId: input.data.witnessUserId,
    witnessDisplayName: input.data.witnessDisplayName,
    administeredByUserId: input.administeredByUserId,
    wasteAmount: input.data.wasteAmount ?? null,
    wasteUnit: input.data.wasteUnit,
    wasteReason: input.data.wasteReason,
    wasteWitnessUserId: input.data.wasteWitnessUserId,
    overrideReason: input.data.overrideReason,
    controlledOverrideAcknowledged: input.data.controlledOverrideAcknowledged,
    orderedQuantity: input.orderedQuantity,
    administeredQuantity: input.data.administeredQuantity ?? null,
  });

  const govMeta = phiSafeGovernanceMetadata(input.governance);
  const witnessUserId = input.data.witnessUserId?.trim() || null;
  const witnessDisplayName = input.data.witnessDisplayName?.trim() || null;

  if (validation.witnessProvided) {
    await input.tx.medicationAdministrationVerification.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        catalogMedicationId: input.catalogMedicationId,
        verificationType: MedicationVerificationType.WITNESS,
        verificationStatus: MedicationVerificationStatus.COMPLETED,
        verifierUserId: input.administeredByUserId,
        witnessedByUserId: witnessUserId,
        metadata: witnessDisplayName
          ? ({ witnessDisplayName, sourcePhase: "M1.3F.4" } as Prisma.InputJsonValue)
          : ({ sourcePhase: "M1.3F.4" } as Prisma.InputJsonValue),
      },
    });

    await input.audit.log(AuditAction.MEDICATION_WITNESS_VERIFICATION_COMPLETED, "MEDICATION_ADMINISTRATION", {
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
        verificationType: "WITNESS",
        witnessedByUserId: witnessUserId,
        witnessDisplayNameProvided: Boolean(witnessDisplayName),
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
        overrideType: MedicationOverrideType.CONTROLLED_SUBSTANCE_OVERRIDE,
        overrideReason: input.data.overrideReason?.trim() || null,
        actorUserId: input.administeredByUserId,
        metadata: {
          ...govMeta,
          sourcePhase: "M1.3F.4",
        } as Prisma.InputJsonValue,
      },
    });

    await input.audit.log(AuditAction.CONTROLLED_SUBSTANCE_OVERRIDE, "MEDICATION_ADMINISTRATION", {
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
        overrideReasonLength: input.data.overrideReason?.trim().length ?? 0,
      },
    });
  }

  if (validation.wasteDocumented && input.data.wasteAmount != null) {
    const wasteWitnessId =
      input.data.wasteWitnessUserId?.trim() || witnessUserId || null;
    await input.tx.medicationWasteDocumentation.create({
      data: {
        facilityId: input.facilityId,
        medicationAdministrationId: input.medicationAdministrationId,
        encounterId: input.encounterId,
        orderItemId: input.orderItemId,
        catalogMedicationId: input.catalogMedicationId,
        wastedAmount: input.data.wasteAmount,
        wastedUnit: input.data.wasteUnit!.trim(),
        wasteReason: input.data.wasteReason?.trim() || null,
        witnessUserId: wasteWitnessId,
        documentedByUserId: input.administeredByUserId,
        status: MedicationWasteStatus.COMPLETED,
        metadata: { sourcePhase: "M1.3F.4" } as Prisma.InputJsonValue,
      },
    });

    await input.audit.log(AuditAction.MEDICATION_WASTE_RECORDED, "MEDICATION_ADMINISTRATION", {
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
        wasteAmount: Number(input.data.wasteAmount),
        wasteUnit: input.data.wasteUnit?.trim() ?? null,
      },
    });

    if (wasteWitnessId) {
      await input.audit.log(AuditAction.MEDICATION_WASTE_WITNESSED, "MEDICATION_ADMINISTRATION", {
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
          witnessUserId: wasteWitnessId,
        },
      });
    }
  }
}
