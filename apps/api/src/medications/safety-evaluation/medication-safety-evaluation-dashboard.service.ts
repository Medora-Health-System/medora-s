import type { PrismaClient } from "@prisma/client";
import {
  PHASE10_SAFETY_EVALUATION_DEFAULTS,
  resolveMedicationSafetyEvaluationMode,
} from "@medora/shared";
import { getMedicationSafetyEvaluationMode } from "./medication-safety-evaluation-config";

export async function getSafetyEvaluationDashboard(prisma: PrismaClient) {
  const mode = getMedicationSafetyEvaluationMode();
  const [
    evaluationRuns,
    completedRuns,
    failedRuns,
    findings,
    interactionFindings,
    allergyFindings,
    duplicateFindings,
    renalFindings,
    hepaticFindings,
    pregnancyFindings,
    doseReviewFindings,
    insufficientContext,
    unresolvedIdentities,
    suppressedFindings,
    validations,
  ] = await Promise.all([
    prisma.medicationSafetyEvaluationRun.count(),
    prisma.medicationSafetyEvaluationRun.count({ where: { status: "COMPLETED" } }),
    prisma.medicationSafetyEvaluationRun.count({ where: { status: "FAILED" } }),
    prisma.medicationSafetyEvaluationFinding.count(),
    prisma.medicationSafetyEvaluationFinding.count({
      where: { findingType: "DRUG_DRUG_INTERACTION" },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: {
        findingType: {
          in: [
            "DIRECT_ALLERGY_MATCH",
            "ACTIVE_INGREDIENT_ALLERGY_MATCH",
            "THERAPEUTIC_CLASS_ALLERGY_MATCH",
            "KNOWN_CROSS_REACTIVITY",
            "POSSIBLE_CROSS_REACTIVITY",
          ],
        },
      },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: {
        findingType: {
          in: [
            "EXACT_DUPLICATE_INGREDIENT",
            "COMBINATION_PRODUCT_DUPLICATE_INGREDIENT",
            "THERAPEUTIC_CLASS_DUPLICATION",
          ],
        },
      },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: { findingType: { in: ["RENAL_CONTRAINDICATION", "RENAL_DOSE_REVIEW"] } },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: { findingType: { in: ["HEPATIC_CONTRAINDICATION", "HEPATIC_DOSE_REVIEW"] } },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: {
        findingType: { in: ["PREGNANCY_CONSIDERATION", "LACTATION_CONSIDERATION"] },
      },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: {
        findingType: {
          in: [
            "MAXIMUM_DOSE_REVIEW",
            "CUMULATIVE_DOSE_REVIEW",
            "WEIGHT_RELATED_CONSIDERATION",
            "AGE_RELATED_CONSIDERATION",
          ],
        },
      },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: { findingType: "INSUFFICIENT_PATIENT_CONTEXT" },
    }),
    prisma.medicationSafetyEvaluationFinding.count({
      where: { findingType: "UNRESOLVED_MEDICATION_IDENTITY" },
    }),
    prisma.medicationSafetyEvaluationRun.aggregate({
      _sum: { findingsSuppressed: true, findingsDeduplicated: true },
    }),
    prisma.medicationSafetyFindingValidation.count(),
  ]);

  const durations = await prisma.medicationSafetyEvaluationRun.findMany({
    where: { durationMs: { not: null }, fixtureMarker: null },
    select: { durationMs: true },
    take: 500,
    orderBy: { requestedAt: "desc" },
  });
  const sorted = durations
    .map((d) => d.durationMs!)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const median =
    sorted.length === 0 ? null : sorted[Math.floor(sorted.length / 2)] ?? null;
  const p95 =
    sorted.length === 0
      ? null
      : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? null;

  return {
    operatingMode: mode,
    evaluationRuns,
    completedRuns,
    failedRuns,
    findings,
    interactionFindings,
    allergyFindings,
    duplicateTherapyFindings: duplicateFindings,
    renalFindings,
    hepaticFindings,
    pregnancyFindings,
    doseReviewFindings,
    insufficientContextFindings: insufficientContext,
    unresolvedIdentities,
    suppressedFindings: suppressedFindings._sum.findingsSuppressed ?? 0,
    duplicateFindingsPrevented: suppressedFindings._sum.findingsDeduplicated ?? 0,
    validationReviews: validations,
    medianEvaluationDurationMs: median,
    p95EvaluationDurationMs: p95,
    providerFacingAlerts: 0,
    orderBlocks: 0,
    orderMutations: 0,
    marMutations: 0,
    billingMutations: 0,
    overrideWorkflowEnabled: false,
    automaticDoseModificationEnabled: false,
    clinicalNotificationsEnabled: false,
    activeCdsModeAvailable: false,
    shadowOnly: true,
    configFailClosedDemo: resolveMedicationSafetyEvaluationMode("ACTIVE_ALERT"),
    defaults: PHASE10_SAFETY_EVALUATION_DEFAULTS,
  };
}

export async function getSafetyEvaluationMetrics(prisma: PrismaClient) {
  return getSafetyEvaluationDashboard(prisma);
}

export async function listEvaluationRuns(
  prisma: PrismaClient,
  filters?: { status?: string; limit?: number; offset?: number }
) {
  const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
  const offset = Math.max(filters?.offset ?? 0, 0);
  const where = filters?.status ? { status: filters.status } : undefined;
  const [rows, total] = await Promise.all([
    prisma.medicationSafetyEvaluationRun.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      take: limit,
      skip: offset,
      include: { _count: { select: { findings: true } } },
    }),
    prisma.medicationSafetyEvaluationRun.count({ where }),
  ]);
  return { rows, total, limit, offset };
}

export async function getEvaluationRun(prisma: PrismaClient, id: string) {
  return prisma.medicationSafetyEvaluationRun.findUnique({
    where: { id },
    include: {
      findings: { orderBy: { createdAt: "desc" }, take: 200 },
      contextSnapshot: true,
    },
  });
}

export async function listFindings(
  prisma: PrismaClient,
  filters?: { findingType?: string; limit?: number }
) {
  return prisma.medicationSafetyEvaluationFinding.findMany({
    where: filters?.findingType ? { findingType: filters.findingType } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(filters?.limit ?? 100, 200),
    include: { validations: true },
  });
}

export async function getFinding(prisma: PrismaClient, id: string) {
  return prisma.medicationSafetyEvaluationFinding.findUnique({
    where: { id },
    include: { validations: true, suppressions: true, evaluationRun: true },
  });
}
