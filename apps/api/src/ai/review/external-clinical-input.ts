import type { EncounterAiSnapshot } from "@medora/shared";

function boundedText(value: { text: string; truncated: boolean; originalLength?: number } | null | undefined) {
  if (!value) return null;
  return { text: value.text, truncated: value.truncated };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const PROVIDER_DOCUMENTATION_NAMESPACE = "erprovidermsev1";
const PROVIDER_DOCUMENTATION_TEXT_FIELDS = [
  "reasonForVisit",
  "chiefComplaint",
  "hpi",
  "rosFocusedImpression",
  "rosImportantPositives",
  "rosImportantNegatives",
  "rosRedFlags",
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "differentialAssessmentText",
  "mdmDataReviewed",
  "mdmRiskLevel",
  "mdmRiskStratification",
  "mdmClinicalRationale",
  "mdmPlanSummary",
  "mdmImmediateActionsRationale",
  "mdmConsultsDiscussed",
  "mdmAdmitObserveDischarge",
  "clinicalImpression",
  "treatmentPlan",
  "followUpDisposition",
  "examReassessmentExtra",
] as const;

function sanitizeProviderDocumentationPayload(payload: unknown): Record<string, unknown> | null {
  const source = asObject(payload);
  if (!source) return null;

  const result: Record<string, unknown> = {};
  for (const key of PROVIDER_DOCUMENTATION_TEXT_FIELDS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value.slice(0, 10_000);
    }
  }

  const exam = asObject(source.physicalExam);
  if (exam) {
    const sanitizedExam: Record<string, string> = {};
    for (const [section, value] of Object.entries(exam)) {
      if (typeof value === "string" && value.trim()) sanitizedExam[section] = value.slice(0, 5_000);
    }
    if (Object.keys(sanitizedExam).length) result.physicalExam = sanitizedExam;
  }

  return Object.keys(result).length ? result : null;
}

function structuredEntryForExternalReview(entry: NonNullable<EncounterAiSnapshot["clinicalDocumentation"]["structuredEntries"]>[number]) {
  const normalizedNamespace = entry.namespace.trim().toLowerCase();
  return {
    namespace: entry.namespace,
    documentedAt: entry.documentedAt,
    version: entry.version,
    clinicalContent:
      normalizedNamespace === PROVIDER_DOCUMENTATION_NAMESPACE
        ? sanitizeProviderDocumentationPayload(entry.payloadSummary)
        : null,
  };
}

/**
 * Builds the minimum provider payload needed for clinical chart review.
 *
 * Intentionally excludes facility/encounter/patient IDs, exact DOB, internal
 * record IDs, billing classification, diagnosis/procedure coding fields,
 * signatures/credentials, and unrelated patient data. For the provider
 * documentation namespace only, a strict allow-list exposes bounded clinical
 * section content (HPI/ROS/exam/MDM/plan) so Medora Assist can perform real
 * section-aware review without sending the opaque source payload.
 */
export function buildExternalClinicalInput(snapshot: EncounterAiSnapshot) {
  return {
    encounter: {
      country: snapshot.encounterContext.country,
      encounterType: snapshot.encounterContext.encounterType,
      status: snapshot.encounterContext.status,
      serviceLine: snapshot.encounterContext.serviceLine ?? null,
      workflowState: snapshot.encounterContext.workflowState ?? null,
      careSetting: snapshot.encounterContext.careSetting,
    },
    patient: {
      age: snapshot.patientContext.age ?? null,
      sexAtBirth: snapshot.patientContext.sexAtBirth ?? null,
    },
    presentation: snapshot.presentation,
    documentation: {
      providerDocumentationStatus: snapshot.clinicalDocumentation.providerDocumentationStatus ?? null,
      providerNote: boundedText(snapshot.clinicalDocumentation.providerNote),
      treatmentPlan: boundedText(snapshot.clinicalDocumentation.treatmentPlan),
      structuredEntries: (snapshot.clinicalDocumentation.structuredEntries ?? []).map(structuredEntryForExternalReview),
      reassessments: (snapshot.clinicalDocumentation.reassessments ?? []).map((entry) => ({
        namespace: entry.namespace,
        documentedAt: entry.documentedAt,
        version: entry.version,
        clinicalContent:
          entry.namespace.trim().toLowerCase() === PROVIDER_DOCUMENTATION_NAMESPACE
            ? sanitizeProviderDocumentationPayload(entry.payloadSummary)
            : null,
      })),
    },
    diagnostics: {
      orders: (snapshot.diagnostics.orders ?? []).map((order) => ({
        status: order.status ?? null,
        orderedAt: order.orderedAt ?? null,
        items: (order.items ?? []).map((item) => ({
          catalogItemType: item.catalogItemType ?? null,
          displayLabel: item.displayLabel ?? null,
          status: item.status ?? null,
          lifecycleState: item.lifecycleState ?? null,
          priority: item.priority ?? null,
          orderedAt: item.orderedAt ?? null,
          completedAt: item.completedAt ?? null,
        })),
      })),
      results: (snapshot.diagnostics.results ?? []).map((result) => ({
        resultText: boundedText(result.resultText),
        criticalValue: result.criticalValue ?? null,
        acknowledgedByProviderAt: result.acknowledgedByProviderAt ?? null,
        resultedAt: result.resultedAt ?? null,
        verifiedAt: result.verifiedAt ?? null,
      })),
      pendingTests: snapshot.diagnostics.pendingTests ?? [],
    },
    treatments: {
      medicationOrders: (snapshot.treatments.medicationOrders ?? []).map((medication) => ({
        displayLabel: medication.displayLabel ?? null,
        status: medication.status ?? null,
        lifecycleState: medication.lifecycleState ?? null,
        route: medication.route ?? null,
        frequencyCode: medication.frequencyCode ?? null,
        orderedAt: medication.orderedAt ?? null,
      })),
      medicationAdministrations: (snapshot.treatments.medicationAdministrations ?? []).map((administration) => ({
        scheduledAt: administration.scheduledAt ?? null,
        administeredAt: administration.administeredAt ?? null,
        status: administration.status ?? null,
        action: administration.action ?? null,
      })),
      procedures: (snapshot.treatments.procedures ?? []).map((procedure) => ({
        displayLabel: procedure.displayLabel ?? null,
        performedAt: procedure.performedAt ?? null,
        status: procedure.status ?? null,
      })),
    },
    diagnoses: {
      documentedDiagnoses: (snapshot.diagnoses.documentedDiagnoses ?? []).map((diagnosis) => ({
        display: diagnosis.display ?? null,
        isPrimary: diagnosis.isPrimary ?? null,
        status: diagnosis.status ?? null,
      })),
    },
    disposition: {
      disposition: snapshot.disposition.disposition ?? null,
      dischargeStatus: snapshot.disposition.dischargeStatus ?? null,
      dischargeSummary: boundedText(snapshot.disposition.dischargeSummary),
      followUps: (snapshot.disposition.followUps ?? []).map((followUp) => ({
        type: followUp.type ?? null,
        status: followUp.status ?? null,
        dueDate: followUp.dueDate ?? null,
        instructions: boundedText(followUp.instructions),
      })),
      appointments: (snapshot.disposition.appointments ?? []).map((appointment) => ({
        status: appointment.status ?? null,
        scheduledAt: appointment.scheduledAt ?? null,
        departmentCode: appointment.departmentCode ?? null,
        notes: boundedText(appointment.notes),
      })),
    },
  };
}
