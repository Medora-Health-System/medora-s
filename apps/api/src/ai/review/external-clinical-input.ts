import type { EncounterAiSnapshot } from "@medora/shared";

function boundedText(value: { text: string; truncated: boolean; originalLength?: number } | null | undefined) {
  if (!value) return null;
  return { text: value.text, truncated: value.truncated };
}

/**
 * Builds the minimum provider payload needed for clinical chart review.
 *
 * Intentionally excludes facility/encounter/patient IDs, exact DOB, internal
 * record IDs, opaque structured payloads, billing classification, diagnosis /
 * procedure coding fields, signatures/credentials, and unrelated patient data.
 * Snapshot provenance is retained server-side and is not serialized into the
 * external provider request body.
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
      structuredEntries: (snapshot.clinicalDocumentation.structuredEntries ?? []).map((entry) => ({
        namespace: entry.namespace,
        documentedAt: entry.documentedAt,
        version: entry.version,
      })),
      reassessments: (snapshot.clinicalDocumentation.reassessments ?? []).map((entry) => ({
        namespace: entry.namespace,
        documentedAt: entry.documentedAt,
        version: entry.version,
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
