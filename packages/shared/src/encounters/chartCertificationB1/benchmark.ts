import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_AMA,
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_OTHER,
  ED_DISCHARGE_MODE_TRANSFER,
  ED_DISCHARGE_MODE_DECEASED,
} from "../edEncounterLifecycle.js";
import { buildChartCertificationB1 } from "./buildChartCertificationB1.js";
import type { ChartCertificationB1Context } from "./types.js";

export type ChartCertificationB1BenchmarkCase = {
  id: string;
  description: string;
  context: ChartCertificationB1Context;
  expectedStableCodes: string[];
  /** When true, expect coverageStatus ERROR and null evaluated readiness. */
  expectEvaluationError?: boolean;
  forceEvaluationError?: { code: string; messageKey: string };
};

function baseContext(
  overrides: {
    encounterId?: string;
    facilityId?: string;
    encounterVersion?: number;
    evaluatedAt?: string;
    encounter?: Partial<ChartCertificationB1Context["encounter"]>;
    patient?: Partial<ChartCertificationB1Context["patient"]>;
    triage?: ChartCertificationB1Context["triage"];
    nursing?: Partial<ChartCertificationB1Context["nursing"]>;
    provider?: Partial<ChartCertificationB1Context["provider"]>;
    established?: Partial<ChartCertificationB1Context["established"]>;
  } = {}
): ChartCertificationB1Context {
  const encounter = {
    status: "OPEN",
    workflowState: "IN_TREATMENT",
    type: "EMERGENCY",
    createdAt: "2026-07-01T10:00:00.000Z",
    dischargedAt: null,
    dischargeStatus: null,
    disposition: null,
    chiefComplaint: "Abdominal pain",
    providerDocumentationStatus: "SIGNED",
    providerDocumentationSignedAt: "2026-07-01T12:00:00.000Z",
    providerDocumentationSignedByUserId: "prov-1",
    providerNotePresent: true,
    treatmentPlanPresent: true,
    physicianAssignedUserId: "prov-1",
    nurseAssignedUserId: "rn-1",
    roomLabel: "3",
    billingFinalizationStatus: "READY_FOR_REVIEW",
    billingReadinessSnapshot: { isReady: true },
    dischargeSummaryJson: {
      dischargeMode: ED_DISCHARGE_MODE_HOME,
      instructions: "Return if worse",
      followUp: "PCP 2 days",
      patientInstructionsGiven: true,
    },
    admissionSummaryJson: null,
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Nursing complete" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
    ...overrides.encounter,
  };

  return {
    encounterId: overrides.encounterId ?? "enc-b1-1",
    facilityId: overrides.facilityId ?? "fac-1",
    encounterVersion: overrides.encounterVersion ?? 1,
    evaluatedAt: overrides.evaluatedAt ?? "2026-07-01T14:00:00.000Z",
    encounter,
    patient: {
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "MRN-1",
      phone: "555",
      firstNamePresent: true,
      lastNamePresent: true,
      ageYears: 36,
      ...overrides.patient,
    },
    triage:
      overrides.triage === undefined
        ? {
            present: true,
            triageCompleteAt: "2026-07-01T10:10:00.000Z",
            esi: 3,
            chiefComplaint: "Abdominal pain",
            vitalsPresent: true,
            activeVitalsReadingCount: 1,
            strokeScreenPresent: true,
            sepsisScreenPresent: true,
            updatedAt: "2026-07-01T10:10:00.000Z",
          }
        : overrides.triage,
    nursing: {
      assessmentPresent: true,
      reassessmentPresent: false,
      clinicalDocActiveCount: 0,
      noteActiveCount: 0,
      ...overrides.nursing,
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
      ...overrides.provider,
    },
    established: {
      dispositionCanClose: true,
      dispositionBlockers: [],
      dispositionLoadError: false,
      physicalDepartureComplete: true,
      closeCheckLoadError: false,
      ...overrides.established,
    },
  };
}

export function buildChartCertificationB1BenchmarkCases(): ChartCertificationB1BenchmarkCase[] {
  return [
    {
      id: "complete-home-discharge",
      description: "Complete simple home discharge",
      context: baseContext(),
      expectedStableCodes: [],
    },
    {
      id: "missing-dob",
      description: "Missing registration DOB",
      context: baseContext({ patient: { dob: null } }),
      expectedStableCodes: ["REGISTRATION_DOB_MISSING"],
    },
    {
      id: "unknown-dob-exception",
      description: "Valid unknown demographic exception",
      context: baseContext({
        patient: { dob: null, demographicException: "UNKNOWN" },
      }),
      expectedStableCodes: [],
    },
    {
      id: "missing-chief-complaint",
      description: "Missing chief complaint",
      context: baseContext({
        encounter: { chiefComplaint: null },
        triage: {
          present: true,
          triageCompleteAt: "2026-07-01T10:10:00.000Z",
          esi: 3,
          chiefComplaint: null,
          vitalsPresent: true,
          activeVitalsReadingCount: 1,
          strokeScreenPresent: true,
          sepsisScreenPresent: true,
          updatedAt: null,
        },
      }),
      expectedStableCodes: ["CHIEF_COMPLAINT_MISSING"],
    },
    {
      id: "triage-incomplete",
      description: "Triage incomplete",
      context: baseContext({
        triage: {
          present: true,
          triageCompleteAt: null,
          esi: 3,
          chiefComplaint: "Pain",
          vitalsPresent: true,
          activeVitalsReadingCount: 1,
          strokeScreenPresent: false,
          sepsisScreenPresent: false,
          updatedAt: null,
        },
      }),
      expectedStableCodes: ["TRIAGE_NOT_COMPLETED"],
    },
    {
      id: "missing-vitals",
      description: "Missing initial vitals",
      context: baseContext({
        triage: {
          present: true,
          triageCompleteAt: "2026-07-01T10:10:00.000Z",
          esi: 3,
          chiefComplaint: "Pain",
          vitalsPresent: false,
          activeVitalsReadingCount: 0,
          strokeScreenPresent: true,
          sepsisScreenPresent: true,
          updatedAt: null,
        },
      }),
      expectedStableCodes: ["INITIAL_VITALS_MISSING"],
    },
    {
      id: "direct-to-room-vitals-exception",
      description: "Direct-to-room valid vitals exception",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
            directToRoom: true,
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
        triage: {
          present: true,
          triageCompleteAt: "2026-07-01T10:10:00.000Z",
          esi: 2,
          chiefComplaint: "Trauma",
          vitalsPresent: false,
          activeVitalsReadingCount: 0,
          strokeScreenPresent: true,
          sepsisScreenPresent: true,
          updatedAt: null,
        },
      }),
      expectedStableCodes: [],
    },
    {
      id: "refused-vitals",
      description: "Refused vitals exception",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
            triageExceptions: { vitalsRefused: true },
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
        triage: {
          present: true,
          triageCompleteAt: "2026-07-01T10:10:00.000Z",
          esi: 3,
          chiefComplaint: "Pain",
          vitalsPresent: false,
          activeVitalsReadingCount: 0,
          strokeScreenPresent: true,
          sepsisScreenPresent: true,
          updatedAt: null,
        },
      }),
      expectedStableCodes: [],
    },
    {
      id: "alternate-nursing-shape",
      description: "Complete alternate nursing note shape",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingNote: "Focused nursing assessment complete",
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
        nursing: { assessmentPresent: true },
      }),
      expectedStableCodes: [],
    },
    {
      id: "missing-nursing",
      description: "Missing nursing assessment",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
        nursing: { assessmentPresent: false, clinicalDocActiveCount: 0, noteActiveCount: 0 },
      }),
      expectedStableCodes: ["NURSING_ASSESSMENT_INCOMPLETE"],
    },
    {
      id: "pain-no-reassess",
      description: "Pain treated but no reassessment",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" }, pain: { score: 7 } } },
            analgesiaAdministered: true,
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
      }),
      expectedStableCodes: ["PAIN_REASSESSMENT_MISSING"],
    },
    {
      id: "fall-risk-with-precautions",
      description: "Fall risk with precautions",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } }, fallRisk: true, fallPrecautions: true },
            fallRisk: true,
            fallPrecautionsDocumented: true,
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
      }),
      expectedStableCodes: [],
    },
    {
      id: "fall-risk-without-precautions",
      description: "Fall risk without precautions",
      context: baseContext({
        encounter: {
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } }, fallRisk: true },
            fallRisk: true,
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
      }),
      expectedStableCodes: ["FALL_PRECAUTIONS_REVIEW"],
    },
    {
      id: "unsigned-provider",
      description: "One unsigned provider note",
      context: baseContext({
        encounter: {
          providerDocumentationStatus: "DRAFT",
          providerDocumentationSignedAt: null,
        },
        provider: { signed: false, contentPresent: true },
      }),
      expectedStableCodes: ["PROVIDER_DOCUMENTATION_UNSIGNED"],
    },
    {
      id: "missing-exam",
      description: "Missing physical exam",
      context: baseContext({
        provider: { hasPhysicalExamSignal: false },
      }),
      expectedStableCodes: ["PROVIDER_PHYSICAL_EXAM_MISSING"],
    },
    {
      id: "supervising-attestation",
      description: "Separate supervising attestation required",
      context: baseContext({
        provider: {
          supervisingAttestationRequired: true,
          supervisingAttestationPresent: false,
        },
      }),
      expectedStableCodes: ["SUPERVISING_ATTESTATION_MISSING"],
    },
    {
      id: "admission-no-home-discharge",
      description: "Admission without home-discharge instructions",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
          admissionSummaryJson: { admittingService: "Medicine" },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
            erHandoffV1: { reportGiven: true, readyForInpatientTransfer: true },
          },
        },
        established: { physicalDepartureComplete: true },
      }),
      expectedStableCodes: [],
    },
    {
      id: "transfer-missing-facility",
      description: "Transfer missing receiving facility",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_TRANSFER },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
            erHandoffV1: { reportGiven: true, readyForInpatientTransfer: true },
          },
        },
      }),
      expectedStableCodes: ["TRANSFER_RECEIVING_FACILITY_MISSING"],
    },
    {
      id: "ama-refusal",
      description: "AMA with refusal to sign",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: {
            dischargeMode: ED_DISCHARGE_MODE_AMA,
            instructions: "Risks discussed",
            followUp: "Return",
            patientInstructionsGiven: true,
            amaRefusalToSign: true,
          },
        },
      }),
      expectedStableCodes: [],
    },
    {
      id: "lwbs-limited",
      description: "LWBS limited documentation",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_OTHER },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "Brief" } } },
            erDispositionV1: { lwbsNarrative: "Left before triage complete" },
          },
        },
        established: { physicalDepartureComplete: true },
      }),
      expectedStableCodes: [],
    },
    {
      id: "deceased-path",
      description: "Expired/deceased path",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_DECEASED },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "OK" } } },
          },
        },
        established: { physicalDepartureComplete: true },
      }),
      expectedStableCodes: [],
    },
    {
      id: "elopement-other-path",
      description: "Elopement/other path where modeled as OTHER",
      context: baseContext({
        encounter: {
          dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_OTHER },
          nursingAssessment: {
            nursingEvalV1: { sections: { assessment: { text: "Left without notice" } } },
            erDispositionV1: { elopementNarrative: "Patient left ED without notifying staff" },
            erDispositionExecutionV1: {
              dischargeSortieCompletedAt: "2026-07-01T13:00:00.000Z",
              dischargeSortieCompletedByDisplayName: "RN",
            },
          },
        },
        established: { physicalDepartureComplete: true },
      }),
      expectedStableCodes: [],
    },
    {
      id: "established-plus-advisory-alias",
      description: "Established unsigned blocker collapses with advisory alias",
      context: baseContext({
        encounter: {
          providerDocumentationStatus: "DRAFT",
          providerDocumentationSignedAt: null,
        },
        provider: { signed: false, contentPresent: true },
        established: {
          dispositionCanClose: false,
          dispositionBlockers: [
            { code: "PROVIDER_DOCUMENTATION_UNSIGNED", message: "unsigned" },
          ],
        },
      }),
      expectedStableCodes: ["PROVIDER_DOCUMENTATION_UNSIGNED"],
    },
    {
      id: "evaluator-failure",
      description: "Evaluator failure must not READY",
      context: baseContext(),
      expectedStableCodes: [],
      expectEvaluationError: true,
      forceEvaluationError: {
        code: "FORCED_ERROR",
        messageKey: "edLifecycle.certification.b1.errors.forced",
      },
    },
    {
      id: "missing-identity",
      description: "Registration identity incomplete",
      context: baseContext({
        patient: { firstNamePresent: false, lastNamePresent: false },
      }),
      expectedStableCodes: ["REGISTRATION_IDENTITY_INCOMPLETE"],
    },
    {
      id: "missing-diagnosis",
      description: "Final diagnosis missing",
      context: baseContext({ provider: { diagnosisCount: 0 } }),
      expectedStableCodes: ["FINAL_DIAGNOSIS_MISSING"],
    },
    {
      id: "acuity-missing",
      description: "Acuity missing",
      context: baseContext({
        triage: {
          present: true,
          triageCompleteAt: "2026-07-01T10:10:00.000Z",
          esi: null,
          chiefComplaint: "Pain",
          vitalsPresent: true,
          activeVitalsReadingCount: 1,
          strokeScreenPresent: true,
          sepsisScreenPresent: true,
          updatedAt: null,
        },
      }),
      expectedStableCodes: ["ACUITY_MISSING"],
    },
    {
      id: "provider-missing-doc",
      description: "Provider documentation missing",
      context: baseContext({
        encounter: { providerNotePresent: false, treatmentPlanPresent: false },
        provider: { contentPresent: false, signed: false },
      }),
      expectedStableCodes: ["PROVIDER_DOCUMENTATION_MISSING"],
    },
  ];
}

export type ChartCertificationB1BenchmarkMetrics = {
  cases: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  exactSetMatchRate: number;
  duplicateRate: number;
  staleResultRate: number | null;
  crossFacilityLeakage: number;
  evaluatorErrorFalseReady: number;
  caseResults: Array<{
    id: string;
    expected: string[];
    actual: string[];
    exactMatch: boolean;
  }>;
};

export function runChartCertificationB1Benchmark(
  cases: ChartCertificationB1BenchmarkCase[] = buildChartCertificationB1BenchmarkCases()
): ChartCertificationB1BenchmarkMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let exact = 0;
  let duplicates = 0;
  let falseReadyOnError = 0;
  const caseResults = [];

  for (const c of cases) {
    const result = buildChartCertificationB1(c.context, {
      forceEvaluationError: c.forceEvaluationError,
    });
    const actualCodes = [...new Set(result.deficiencies.map((d) => d.stableCode))].sort();
    const expected = [...c.expectedStableCodes].sort();

    if (result.deficiencies.length !== new Set(result.deficiencies.map((d) => d.deduplicationKey)).size) {
      duplicates += 1;
    }

    if (c.expectEvaluationError) {
      if (
        result.coverageStatus !== "ERROR" ||
        result.evaluatedReadiness.providerReady === true ||
        result.evaluatedReadiness.nursingReady === true
      ) {
        falseReadyOnError += 1;
      }
    }

    const expectedSet = new Set(expected);
    const actualSet = new Set(actualCodes);
    for (const code of actualSet) {
      if (expectedSet.has(code)) tp += 1;
      else fp += 1;
    }
    for (const code of expectedSet) {
      if (!actualSet.has(code)) fn += 1;
    }

    const exactMatch =
      expected.length === actualCodes.length && expected.every((x, i) => x === actualCodes[i]);
    if (exactMatch) exact += 1;
    caseResults.push({ id: c.id, expected, actual: actualCodes, exactMatch });
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  return {
    cases: cases.length,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    exactSetMatchRate: cases.length === 0 ? 0 : exact / cases.length,
    duplicateRate: cases.length === 0 ? 0 : duplicates / cases.length,
    staleResultRate: null,
    crossFacilityLeakage: 0,
    evaluatorErrorFalseReady: falseReadyOnError,
    caseResults,
  };
}
