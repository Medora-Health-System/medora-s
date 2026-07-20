/**
 * Stage A permanent chart-certification benchmark (synthetic, reviewed fixtures).
 * Measures exact-set match / precision / recall for the current shared engine scope.
 * Does not claim enterprise-wide 99.99% accuracy.
 */

import { buildEdClosedEncounterCertification } from "./edClosedEncounterCertification.js";
import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_HOME,
  type EdEncounterLifecycleEncounterSnapshot,
} from "./edEncounterLifecycle.js";

export const CHART_CERTIFICATION_BENCHMARK_VERSION =
  "chart-certification-benchmark-stage-a-1.0.0";

export type ChartCertificationBenchmarkCase = {
  id: string;
  title: string;
  reviewedBy: string;
  snapshot: EdEncounterLifecycleEncounterSnapshot;
  dispositionReadiness?: Parameters<typeof buildEdClosedEncounterCertification>[0]["dispositionReadiness"];
  diagnosisCount?: number | null;
  /** Expected deduplicationKeys and/or deficiency ids. */
  expectedKeys: string[];
};

export const CHART_CERTIFICATION_BENCHMARK_CASES: ChartCertificationBenchmarkCase[] = [
  {
    id: "home-unsigned-provider",
    title: "Home discharge with unsigned provider note",
    reviewedBy: "stage-a-engineering-clinical-review",
    snapshot: {
      status: "OPEN",
      providerDocumentationStatus: "DRAFT",
      chiefComplaint: "Abdominal pain",
      providerNote: "Stable, discharge home",
      encounterType: "EMERGENCY",
      dischargeSummaryJson: {
        dischargeMode: ED_DISCHARGE_MODE_HOME,
        instructions: "Return if worse",
        followUp: "PCP",
      },
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "RN assessment complete" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
    },
    expectedKeys: ["PROVIDER_NOTE_UNSIGNED"],
  },
  {
    id: "home-missing-nursing",
    title: "Home discharge missing nursing assessment",
    reviewedBy: "stage-a-engineering-clinical-review",
    snapshot: {
      status: "OPEN",
      providerDocumentationStatus: "SIGNED",
      chiefComplaint: "Fever",
      providerNote: "Viral syndrome",
      encounterType: "EMERGENCY",
      dischargeSummaryJson: {
        dischargeMode: ED_DISCHARGE_MODE_HOME,
        instructions: "Fluids",
        followUp: "PCP",
      },
      nursingAssessment: {
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
    },
    expectedKeys: ["NURSING_ASSESSMENT_MISSING"],
  },
  {
    id: "admission-no-home-discharge-rules",
    title: "Admission must not require home discharge summary packet",
    reviewedBy: "stage-a-engineering-clinical-review",
    snapshot: {
      status: "OPEN",
      providerDocumentationStatus: "SIGNED",
      chiefComplaint: "ACS",
      providerNote: "Admit medicine",
      encounterType: "EMERGENCY",
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: { admittingService: "Medicine" },
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "RN note" } } },
        erHandoffV1: { readyForInpatientTransfer: true },
      },
    },
    /** May still include departure/handoff operational items; exclude home discharge summary. */
    expectedKeys: [],
  },
];

export type ChartCertificationBenchmarkMetrics = {
  cases: number;
  exactSetMatches: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  exactSetMatchRate: number;
  duplicateRate: number;
  engineVersion: string;
  benchmarkVersion: string;
};

function keysForResult(
  result: ReturnType<typeof buildEdClosedEncounterCertification>
): string[] {
  return result.deficiencies.map((d) => d.deduplicationKey ?? d.stableCode ?? d.id).sort();
}

export function runChartCertificationBenchmarkStageA(): ChartCertificationBenchmarkMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let exact = 0;
  let duplicateHits = 0;
  let deficiencyTotal = 0;

  for (const c of CHART_CERTIFICATION_BENCHMARK_CASES) {
    const result = buildEdClosedEncounterCertification({
      lifecycleSnapshot: c.snapshot,
      dispositionReadiness: c.dispositionReadiness,
      diagnosisCount: c.diagnosisCount,
    });
    const actual = keysForResult(result);
    const expected = [...c.expectedKeys].sort();
    deficiencyTotal += actual.length;
    const unique = new Set(actual);
    duplicateHits += actual.length - unique.size;

    if (actual.join("|") === expected.join("|")) exact += 1;

    for (const k of actual) {
      if (expected.includes(k)) tp += 1;
      else fp += 1;
    }
    for (const k of expected) {
      if (!actual.includes(k)) fn += 1;
    }
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  return {
    cases: CHART_CERTIFICATION_BENCHMARK_CASES.length,
    exactSetMatches: exact,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    exactSetMatchRate: exact / CHART_CERTIFICATION_BENCHMARK_CASES.length,
    duplicateRate: deficiencyTotal === 0 ? 0 : duplicateHits / deficiencyTotal,
    engineVersion: "ed-chart-certification-engine-stage-a-1.0.0",
    benchmarkVersion: CHART_CERTIFICATION_BENCHMARK_VERSION,
  };
}
