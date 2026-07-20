import { describe, expect, it } from "vitest";
import { ChartCertificationModuleAuthority, ChartCertificationSourceAuthority } from "../chartCertificationB1/types.js";
import {
  buildChartCertificationB3,
  stageB3AdvisoryFindingsIndependentlyBlock,
} from "./buildChartCertificationB3.js";
import { classifyMedicationOrder, NormalizedMedicationCategory } from "./classifyMedication.js";
import { enterpriseChartCertificationStageB3Enabled } from "./featureFlag.js";
import { computeMedicationProcedureRevision } from "./revision.js";
import type {
  ChartCertificationB3Context,
  InfusionSessionSnapshot,
  MarAdministrationSnapshot,
  MedicationOrderSnapshot,
  ProcedureEvidenceSnapshot,
} from "./types.js";

function med(partial: Partial<MedicationOrderSnapshot>): MedicationOrderSnapshot {
  return {
    orderId: "o1",
    orderItemId: "mi1",
    medicationLabel: "Morphine 4 mg",
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    frequencyCode: "ONCE",
    isPrn: false,
    prnIndication: null,
    fulfillmentIntent: "ADMINISTER_CHART",
    medicationLifecycleStatus: "ACTIVE",
    orderStatus: "PLACED",
    itemStatus: "PLACED",
    lifecycleState: "ORDERED",
    heldReason: null,
    discontinueReason: null,
    cancelledAt: null,
    replacesOrderItemId: null,
    supersededByOrderItemId: null,
    startAt: null,
    endAt: null,
    updatedAt: "2026-07-20T12:00:00.000Z",
    catalogItemType: "MEDICATION",
    ...partial,
  };
}

function mar(partial: Partial<MarAdministrationSnapshot>): MarAdministrationSnapshot {
  return {
    id: "ma1",
    orderItemId: "mi1",
    doseInstanceId: null,
    marAction: "administered",
    administeredAt: "2026-07-20T12:10:00.000Z",
    doseValue: "4",
    doseUnit: "mg",
    route: "IV",
    notesHasRefusalReason: false,
    notesHasHoldReason: false,
    notesHasOmissionReason: false,
    notesHasNotAvailableAction: false,
    notesHasPrnIndication: false,
    notesHasEffectivenessResponse: false,
    infusionPhase: null,
    infusionSessionKey: null,
    wasteDocumented: false,
    witnessCompleted: false,
    controlledSubstance: false,
    wastedAmountPresent: false,
    quantityMismatch: false,
    updatedAt: "2026-07-20T12:10:00.000Z",
    voided: false,
    isCorrection: false,
    ...partial,
  };
}

function emptyMeds(
  overrides: Partial<ChartCertificationB3Context["medications"]> = {}
): ChartCertificationB3Context["medications"] {
  const base = {
    medicationOrders: [] as MedicationOrderSnapshot[],
    marAdministrations: [] as MarAdministrationSnapshot[],
    doseInstances: [],
    infusionSessions: [] as InfusionSessionSnapshot[],
    procedures: [] as ProcedureEvidenceSnapshot[],
    reassessments: [],
    medicationProcedureRevision: "empty",
    loadError: null,
    ...overrides,
  };
  return {
    ...base,
    medicationProcedureRevision: computeMedicationProcedureRevision(base),
  };
}

function baseCtx(
  medications: ChartCertificationB3Context["medications"],
  dischargeMode = "Domicile"
): ChartCertificationB3Context {
  return {
    encounterId: "e1",
    facilityId: "f1",
    encounterVersion: 2,
    evaluatedAt: "2026-07-20T15:00:00.000Z",
    encounter: {
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      type: "EMERGENCY",
      createdAt: "2026-07-20T10:00:00.000Z",
      dischargedAt: null,
      dischargeStatus: null,
      disposition: null,
      chiefComplaint: "Pain",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: "2026-07-20T14:00:00.000Z",
      providerDocumentationSignedByUserId: "p1",
      providerNotePresent: true,
      treatmentPlanPresent: true,
      physicianAssignedUserId: "p1",
      nurseAssignedUserId: "n1",
      roomLabel: "1",
      billingFinalizationStatus: "READY_FOR_REVIEW",
      billingReadinessSnapshot: { isReady: true },
      dischargeSummaryJson: {
        dischargeMode,
        instructions: "x",
        followUp: "y",
        patientInstructionsGiven: true,
      },
      admissionSummaryJson:
        dischargeMode.includes("Admission") ? { admittingService: "Med" } : null,
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "OK" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-07-20T14:30:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
        ...(dischargeMode.includes("Admission") || dischargeMode.includes("Transfert")
          ? { erHandoffV1: { reportGiven: true, readyForInpatientTransfer: true } }
          : {}),
      },
    },
    patient: {
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "1",
      phone: "1",
      firstNamePresent: true,
      lastNamePresent: true,
      ageYears: 36,
    },
    triage: {
      present: true,
      triageCompleteAt: "2026-07-20T10:05:00.000Z",
      esi: 3,
      chiefComplaint: "Pain",
      vitalsPresent: true,
      activeVitalsReadingCount: 1,
      strokeScreenPresent: true,
      sepsisScreenPresent: true,
      updatedAt: null,
    },
    nursing: {
      assessmentPresent: true,
      reassessmentPresent: false,
      clinicalDocActiveCount: 0,
      noteActiveCount: 0,
    },
    provider: {
      signed: true,
      contentPresent: true,
      hasMdm: true,
      hasPhysicalExamSignal: true,
      hasHistorySignal: true,
      diagnosisCount: 1,
      supervisingAttestationRequired: false,
      supervisingAttestationPresent: false,
    },
    established: {
      dispositionCanClose: true,
      dispositionBlockers: [],
      dispositionLoadError: false,
      physicalDepartureComplete: true,
      closeCheckLoadError: false,
    },
    diagnostics: {
      orderItems: [],
      ecgDocumentation: [],
      diagnosticRevision: "2026-07-20T12:00:00.000Z",
      sendOutFollowUpModelPresent: false,
      loadError: null,
    },
    medications,
  };
}

describe("chartCertificationB3", () => {
  it("flag defaults OFF", () => {
    expect(enterpriseChartCertificationStageB3Enabled(null)).toBe(false);
    expect(
      enterpriseChartCertificationStageB3Enabled({
        ENTERPRISE_CHART_CERTIFICATION_STAGE_B3: "true",
      })
    ).toBe(true);
  });

  it("classifies discharge prescription vs ED administration", () => {
    expect(
      classifyMedicationOrder(
        med({ fulfillmentIntent: "PHARMACY_DISPENSE", isDischargePrescription: true })
      )
    ).toBe(NormalizedMedicationCategory.DISCHARGE_PRESCRIPTION);
    expect(classifyMedicationOrder(med({}))).toBe(
      NormalizedMedicationCategory.ED_ADMINISTRATION_REQUIRED
    );
  });

  it("excludes discharge prescription from MAR deficiencies", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [
            med({
              fulfillmentIntent: "PHARMACY_DISPENSE",
              isDischargePrescription: true,
              medicationLabel: "Amoxicillin RX",
            }),
          ],
        })
      )
    );
    expect(result.deficiencies.some((d) => d.stableCode === "MAR_DOSE_UNRESOLVED")).toBe(false);
    expect(result.certificationStage).toBe("B3");
  });

  it("PRN never administered → no MAR deficiency", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [
            med({
              isPrn: true,
              frequencyCode: "PRN",
              prnIndication: "pain",
              medicationLabel: "Oxycodone PRN",
            }),
          ],
        })
      )
    );
    expect(result.deficiencies.some((d) => d.stableCode.startsWith("MAR_"))).toBe(false);
  });

  it("home discharge active infusion unresolved", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [med({ medicationLabel: "NS infusion continuous", route: "IV" })],
          infusionSessions: [
            {
              id: "inf1",
              orderItemId: "mi1",
              status: "IN_PROGRESS",
              startedAt: "2026-07-20T11:00:00.000Z",
              stoppedAt: null,
              discontinuationReasonPresent: false,
              handoffDocumented: false,
              adverseEventDocumented: false,
              infiltrationDocumented: false,
              updatedAt: "2026-07-20T11:00:00.000Z",
            },
          ],
        })
      )
    );
    expect(
      result.deficiencies.some((d) => d.stableCode === "INFUSION_UNRESOLVED_AT_DISPOSITION")
    ).toBe(true);
  });

  it("admission handoff allows continuing infusion", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          infusionSessions: [
            {
              id: "inf1",
              orderItemId: "mi1",
              status: "IN_PROGRESS",
              startedAt: "2026-07-20T11:00:00.000Z",
              stoppedAt: null,
              discontinuationReasonPresent: false,
              handoffDocumented: true,
              adverseEventDocumented: false,
              infiltrationDocumented: false,
              updatedAt: "2026-07-20T11:00:00.000Z",
            },
          ],
        }),
        "Admission / hospitalisation"
      )
    );
    expect(
      result.deficiencies.some((d) => d.stableCode === "INFUSION_UNRESOLVED_AT_DISPOSITION")
    ).toBe(false);
  });

  it("supply/charge alone does not prove procedure performance", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          procedures: [
            {
              orderItemId: "p1",
              enterpriseProcedureId: "splint",
              procedureLabel: "Splint",
              orderStatus: "COMPLETED",
              lifecycleState: "COMPLETED",
              performedClass: "PROCEDURE_PERFORMED",
              hasSignedDocumentation: false,
              hasDocumentationEvent: false,
              consentPresent: false,
              timeoutPresent: false,
              operatorPresent: false,
              siteSidePresent: false,
              techniquePresent: false,
              complicationsStatusPresent: false,
              postAssessmentPresent: false,
              supplyOrChargeOnly: true,
              updatedAt: "2026-07-20T12:00:00.000Z",
            },
          ],
        })
      )
    );
    expect(result.deficiencies.some((d) => d.stableCode === "PROCEDURE_DOCUMENTATION_MISSING")).toBe(
      false
    );
    expect(
      result.informationalItems.some(
        (i) => i.stableCode === "PROCEDURE_SUPPLY_CHARGE_INSUFFICIENT_EVIDENCE"
      )
    ).toBe(true);
  });

  it("unsigned procedure note yields one root-cause deficiency", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          procedures: [
            {
              orderItemId: "p1",
              enterpriseProcedureId: "lac",
              procedureLabel: "Laceration repair",
              orderStatus: "COMPLETED",
              lifecycleState: "COMPLETED",
              performedClass: "PROCEDURE_PERFORMED",
              hasSignedDocumentation: false,
              hasDocumentationEvent: true,
              consentPresent: true,
              timeoutPresent: true,
              operatorPresent: true,
              siteSidePresent: true,
              techniquePresent: true,
              complicationsStatusPresent: true,
              postAssessmentPresent: true,
              supplyOrChargeOnly: false,
              updatedAt: "2026-07-20T12:00:00.000Z",
            },
          ],
        })
      )
    );
    const unsigned = result.deficiencies.filter((d) => d.stableCode === "PROCEDURE_NOTE_UNSIGNED");
    expect(unsigned).toHaveLength(1);
  });

  it("pain reassessment only when analgesic administered", () => {
    const withAnalgesic = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [med({})],
          marAdministrations: [mar({})],
        })
      )
    );
    expect(withAnalgesic.deficiencies.some((d) => d.stableCode === "PAIN_REASSESSMENT_MISSING")).toBe(
      true
    );

    const noPainMed = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [med({ medicationLabel: "Ondansetron 4 mg" })],
          marAdministrations: [mar({})],
        })
      )
    );
    expect(noPainMed.deficiencies.some((d) => d.stableCode === "PAIN_REASSESSMENT_MISSING")).toBe(
      false
    );
  });

  it("med reconciliation remains partially evaluated", () => {
    const result = buildChartCertificationB3(baseCtx(emptyMeds()));
    const recon = result.moduleSummaries.find((m) => m.module === "MEDICATION_RECONCILIATION");
    expect(recon?.authority).toBe(ChartCertificationModuleAuthority.PARTIALLY_EVALUATED);
    expect(recon?.ready).toBeNull();
  });

  it("advisory findings never independently block", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          medicationOrders: [med({ doseValue: null, route: null })],
        })
      )
    );
    expect(stageB3AdvisoryFindingsIndependentlyBlock(result)).toBe(false);
    expect(
      result.deficiencies
        .filter((d) => d.sourceAuthority !== ChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW)
        .every(
          (d) =>
            !d.effects.blocksClinicalClosure &&
            !d.effects.blocksDisposition &&
            !d.effects.blocksBilling
        )
    ).toBe(true);
  });

  it("evaluator load error yields null readiness not READY", () => {
    const result = buildChartCertificationB3(
      baseCtx(
        emptyMeds({
          loadError: {
            code: "B3_LOAD_FAILED",
            messageKey: "edLifecycle.certification.b3.errors.loadFailed",
          },
        })
      )
    );
    expect(result.coverageStatus).toBe("ERROR");
    expect(result.evaluatedReadiness.marReady).toBeNull();
    expect(result.evaluatedReadiness.medicationOrdersReady).toBeNull();
  });

  it("runs Stage B3 synthetic engineering benchmark with zero critical false negatives", async () => {
    const { runChartCertificationB3Benchmark } = await import("./benchmark.js");
    const metrics = runChartCertificationB3Benchmark();
    expect(metrics.cases).toBeGreaterThanOrEqual(60);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.duplicateRate).toBe(0);
    expect(metrics.evaluatorErrorFalseReady).toBe(0);
    expect(metrics.recall).toBe(1);
  });
});
