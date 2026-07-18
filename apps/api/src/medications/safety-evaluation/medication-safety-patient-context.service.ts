/**
 * Phase 10 — minimized patient context snapshot (no full chart copy).
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

export type AssembledPatientContext = {
  patientId: string;
  encounterId?: string;
  ageYears?: number;
  ageMonths?: number;
  weightKg?: number;
  sexAtBirth?: string;
  pregnancyStatus?: string;
  lactationStatus?: string;
  estimatedGfr?: number;
  creatinineClearance?: number;
  hepaticFunctionClassification?: string;
  activeDiagnosisCodes: string[];
  activeAllergyIds: string[];
  activeMedicationOrderIds: string[];
  activeHomeMedicationIds: string[];
  relevantLaboratoryResultIds: string[];
  emergencyContextTags: string[];
  missingContextFields: string[];
  contextCompleteness: "COMPLETE" | "PARTIAL" | "MINIMAL";
  fixtureMarker?: string;
};

function yearsFromDob(dob: Date | null | undefined, now = new Date()): number | undefined {
  if (!dob) return undefined;
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years >= 0 ? years : undefined;
}

export async function assemblePatientContextSnapshot(
  prisma: PrismaClient,
  input: {
    patientId: string;
    encounterId?: string;
    facilityId?: string;
    emergencyContextTags?: string[];
    pregnancyStatus?: string;
    lactationStatus?: string;
    estimatedGfr?: number;
    creatinineClearance?: number;
    hepaticFunctionClassification?: string;
    weightKg?: number;
    fixtureMarker?: string;
  }
): Promise<{ snapshotId: string; context: AssembledPatientContext }> {
  const patient = await prisma.patient.findFirst({
    where: {
      id: input.patientId,
      ...(input.facilityId ? { facilityId: input.facilityId } : {}),
    },
    select: {
      id: true,
      dob: true,
      sexAtBirth: true,
      clinicalHistoryProfileJson: true,
      facilityId: true,
    },
  });
  if (!patient) {
    throw new Error("Patient not found or unauthorized for safety evaluation context.");
  }

  const diagnoses = await prisma.diagnosis.findMany({
    where: {
      patientId: patient.id,
      ...(input.encounterId ? { encounterId: input.encounterId } : {}),
    },
    select: { id: true, code: true },
    take: 100,
  });

  const orders = await prisma.order.findMany({
    where: {
      patientId: patient.id,
      ...(input.encounterId ? { encounterId: input.encounterId } : {}),
    },
    select: { id: true, items: { select: { id: true }, take: 50 } },
    take: 50,
  });
  const activeMedicationOrderIds = orders.flatMap((o) => o.items.map((i) => i.id));

  const history =
    patient.clinicalHistoryProfileJson &&
    typeof patient.clinicalHistoryProfileJson === "object"
      ? (patient.clinicalHistoryProfileJson as Record<string, unknown>)
      : {};
  const allergyIds = Array.isArray(history.allergyIds)
    ? (history.allergyIds as unknown[]).map(String).slice(0, 50)
    : [];
  const homeMedIds = Array.isArray(history.homeMedicationIds)
    ? (history.homeMedicationIds as unknown[]).map(String).slice(0, 50)
    : [];

  const ageYears = yearsFromDob(patient.dob);
  const missing: string[] = [];
  if (ageYears == null) missing.push("ageYears");
  if (input.weightKg == null) missing.push("weightKg");
  if (!input.pregnancyStatus) missing.push("pregnancyStatus");
  if (!input.lactationStatus) missing.push("lactationStatus");
  if (input.estimatedGfr == null && input.creatinineClearance == null) {
    missing.push("renalFunction");
  }
  if (!input.hepaticFunctionClassification) missing.push("hepaticFunction");

  const contextCompleteness =
    missing.length === 0 ? "COMPLETE" : missing.length <= 3 ? "PARTIAL" : "MINIMAL";

  const context: AssembledPatientContext = {
    patientId: patient.id,
    encounterId: input.encounterId,
    ageYears,
    weightKg: input.weightKg,
    sexAtBirth: patient.sexAtBirth ? String(patient.sexAtBirth) : undefined,
    pregnancyStatus: input.pregnancyStatus,
    lactationStatus: input.lactationStatus,
    estimatedGfr: input.estimatedGfr,
    creatinineClearance: input.creatinineClearance,
    hepaticFunctionClassification: input.hepaticFunctionClassification,
    activeDiagnosisCodes: diagnoses.map((d) => d.code).filter(Boolean) as string[],
    activeAllergyIds: allergyIds,
    activeMedicationOrderIds,
    activeHomeMedicationIds: homeMedIds,
    relevantLaboratoryResultIds: [],
    emergencyContextTags: input.emergencyContextTags ?? [],
    missingContextFields: missing,
    contextCompleteness,
    fixtureMarker: input.fixtureMarker,
  };

  const row = await prisma.medicationSafetyPatientContextSnapshot.create({
    data: {
      id: randomUUID(),
      patientId: context.patientId,
      encounterId: context.encounterId,
      ageYears: context.ageYears,
      weightKg: context.weightKg,
      sexAtBirth: context.sexAtBirth,
      pregnancyStatus: context.pregnancyStatus,
      lactationStatus: context.lactationStatus,
      estimatedGfr: context.estimatedGfr,
      creatinineClearance: context.creatinineClearance,
      hepaticFunctionClassification: context.hepaticFunctionClassification,
      activeDiagnosisCodesJson: context.activeDiagnosisCodes as Prisma.InputJsonValue,
      activeAllergyIdsJson: context.activeAllergyIds as Prisma.InputJsonValue,
      activeMedicationOrderIdsJson:
        context.activeMedicationOrderIds as Prisma.InputJsonValue,
      activeHomeMedicationIdsJson:
        context.activeHomeMedicationIds as Prisma.InputJsonValue,
      relevantLaboratoryResultIdsJson:
        context.relevantLaboratoryResultIds as Prisma.InputJsonValue,
      emergencyContextTagsJson: context.emergencyContextTags as Prisma.InputJsonValue,
      contextCompleteness: context.contextCompleteness,
      missingContextFieldsJson: context.missingContextFields as Prisma.InputJsonValue,
      fixtureMarker: context.fixtureMarker,
    },
  });

  return { snapshotId: row.id, context };
}
