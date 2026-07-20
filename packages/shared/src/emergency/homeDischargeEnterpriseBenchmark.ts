/**
 * D2 enterprise Home Discharge benchmark — synthetic cases measuring
 * content vs communication, follow-up completeness, and closure readiness helpers.
 *
 * Authority measurement only — does not mutate production close rules.
 */

import {
  hasClosureAdequateDischargeInstructions,
  hasClosureFollowUpDocumented,
  hasClosurePatientInstructionsExplained,
  hasClosureReturnPrecautionsDocumented,
  isClosureFollowUpRowComplete,
} from "./closureDischargeReadiness.js";
import { resolveHomeDischargeDocumentationState } from "./homeDischargeDocumentationState.js";

export type HomeDischargeBenchmarkCase = {
  id: string;
  family: string;
  summary: Record<string, unknown>;
  expect: {
    instructionContentAdequate: boolean;
    followUpPresent: boolean;
    returnPrecautionsPresent: boolean;
    instructionsCommunicated: boolean;
    finalDiagnosisPresent: boolean;
  };
};

function baseHomeSummary(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    dischargeMode: "Domicile",
    providerDischargeDiagnosisDocs: [
      {
        id: "d1",
        description: "Acute bronchitis",
        diagnosisInstructions: "Rest and fluids",
        medicationTreatment: "Supportive care",
      },
    ],
    providerDischargeReturnPrecautions: "Return if fever > 39 or dyspnea",
    providerDischargeFollowUps: [
      {
        id: "f1",
        specialty: "PRIMARY_CARE",
        providerOrFacility: "Clinic A",
        timing: "48 hours",
        phone: "555-0100",
      },
    ],
    patientInstructionsGiven: true,
    ...overrides,
  };
}

export const HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES: readonly HomeDischargeBenchmarkCase[] = [
  {
    id: "home-complete",
    family: "complete",
    summary: baseHomeSummary(),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-missing-diagnosis",
    family: "diagnosis",
    summary: baseHomeSummary({
      providerDischargeDiagnosisDocs: [],
      disposition: "",
      dischargeDiagnosisSummary: "",
    }),
    expect: {
      instructionContentAdequate: false,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: false,
    },
  },
  {
    id: "home-instructions-content-missing",
    family: "content",
    summary: baseHomeSummary({
      providerDischargeDiagnosisDocs: [{ id: "d1", description: "Only description" }],
    }),
    expect: {
      instructionContentAdequate: false,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-communication-missing",
    family: "communication",
    summary: baseHomeSummary({ patientInstructionsGiven: false }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: false,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-structured-followup-present",
    family: "follow-up",
    summary: baseHomeSummary({ followUp: "", followUpInstructions: "" }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-followup-incomplete-row",
    family: "follow-up",
    summary: baseHomeSummary({
      providerDischargeFollowUps: [{ id: "f1", providerOrFacility: "Clinic A", timing: "" }],
      followUp: "",
      followUpInstructions: "",
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: false,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-followup-missing",
    family: "follow-up",
    summary: baseHomeSummary({
      providerDischargeFollowUps: [],
      followUp: "",
      followUpInstructions: "",
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: false,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-return-precautions-missing",
    family: "precautions",
    summary: baseHomeSummary({
      providerDischargeReturnPrecautions: "",
      returnPrecautions: "",
      returnIfWorse: "",
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: false,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-no-prescription-required-still-adequate",
    family: "medications",
    summary: baseHomeSummary({
      providerDischargeDiagnosisDocs: [
        {
          id: "d1",
          description: "Sprain",
          diagnosisInstructions: "RICE protocol",
          medicationTreatment: "No prescription — OTC analgesia as needed",
        },
      ],
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-content-yes-communication-unknown",
    family: "communication",
    summary: baseHomeSummary({ patientInstructionsGiven: undefined }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: false,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-work-school-optional",
    family: "planning",
    summary: baseHomeSummary({ returnWorkSchool: "", providerDischargeReturnWorkSchool: "" }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-narrative-followup-fallback",
    family: "follow-up",
    summary: baseHomeSummary({
      providerDischargeFollowUps: [],
      followUpInstructions: "See PCP in 2 days",
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-followup-row-provider-only-incomplete",
    family: "follow-up",
    summary: {
      dischargeMode: "Domicile",
      providerDischargeDiagnosisDocs: [
        {
          id: "d1",
          description: "UTI",
          diagnosisInstructions: "Complete antibiotics",
          medicationTreatment: "Nitrofurantoin course",
        },
      ],
      providerDischargeReturnPrecautions: "Return if fever",
      providerDischargeFollowUps: [{ id: "f1", providerOrFacility: "Urology", timing: "" }],
      patientInstructionsGiven: true,
    },
    expect: {
      instructionContentAdequate: true,
      followUpPresent: false,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-refused-communication-not-yes",
    family: "communication",
    summary: baseHomeSummary({
      patientInstructionsGiven: false,
      patientInstructionsRefused: true,
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: false,
      finalDiagnosisPresent: true,
    },
  },
  {
    id: "home-arrays-preserved-multi-followup",
    family: "arrays",
    summary: baseHomeSummary({
      providerDischargeFollowUps: [
        {
          id: "f1",
          specialty: "PRIMARY_CARE",
          providerOrFacility: "Clinic A",
          timing: "2 days",
          phone: "111",
        },
        {
          id: "f2",
          specialty: "CARDIOLOGY",
          providerOrFacility: "Dr Cardio",
          timing: "1 week",
          address: "Main St",
        },
      ],
    }),
    expect: {
      instructionContentAdequate: true,
      followUpPresent: true,
      returnPrecautionsPresent: true,
      instructionsCommunicated: true,
      finalDiagnosisPresent: true,
    },
  },
];

export type HomeDischargeBenchmarkMetrics = {
  totalCases: number;
  exactSetMatch: number;
  exactSetMatchRate: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  contentCommunicationSeparationCases: number;
  followUpAlignmentCases: number;
};

export function evaluateHomeDischargeBenchmarkCase(c: HomeDischargeBenchmarkCase): {
  ok: boolean;
  mismatches: string[];
} {
  const semantic = resolveHomeDischargeDocumentationState(c.summary);
  const mismatches: string[] = [];

  const hasMedicationOrders = false;
  const instructionContentAdequate = hasClosureAdequateDischargeInstructions(
    c.summary,
    hasMedicationOrders
  );
  const followUpPresent = hasClosureFollowUpDocumented(c.summary);
  const returnPrecautionsPresent = hasClosureReturnPrecautionsDocumented(c.summary);
  const instructionsCommunicated = hasClosurePatientInstructionsExplained(c.summary);
  const finalDiagnosisPresent = semantic.diagnosisDocumentation.finalDiagnosisPresent;

  if (instructionContentAdequate !== c.expect.instructionContentAdequate) {
    mismatches.push("instructionContentAdequate");
  }
  if (followUpPresent !== c.expect.followUpPresent) mismatches.push("followUpPresent");
  if (returnPrecautionsPresent !== c.expect.returnPrecautionsPresent) {
    mismatches.push("returnPrecautionsPresent");
  }
  if (instructionsCommunicated !== c.expect.instructionsCommunicated) {
    mismatches.push("instructionsCommunicated");
  }
  if (finalDiagnosisPresent !== c.expect.finalDiagnosisPresent) {
    mismatches.push("finalDiagnosisPresent");
  }

  // Structural array preservation smoke for multi-row case
  if (c.id === "home-arrays-preserved-multi-followup") {
    const rows = c.summary.providerDischargeFollowUps as Record<string, unknown>[];
    if (!Array.isArray(rows) || rows.length !== 2) mismatches.push("arrayLength");
    if (!rows.every((r) => isClosureFollowUpRowComplete(r))) mismatches.push("arrayRowComplete");
  }

  return { ok: mismatches.length === 0, mismatches };
}

export function runHomeDischargeEnterpriseBenchmark(
  cases: readonly HomeDischargeBenchmarkCase[] = HOME_DISCHARGE_ENTERPRISE_BENCHMARK_CASES
): HomeDischargeBenchmarkMetrics {
  let exact = 0;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let contentComm = 0;
  let followUpAlign = 0;

  for (const c of cases) {
    const { ok } = evaluateHomeDischargeBenchmarkCase(c);
    if (ok) exact += 1;

    const predictedReady =
      hasClosureAdequateDischargeInstructions(c.summary, false) &&
      hasClosureFollowUpDocumented(c.summary) &&
      hasClosureReturnPrecautionsDocumented(c.summary) &&
      hasClosurePatientInstructionsExplained(c.summary);
    const expectedReady =
      c.expect.instructionContentAdequate &&
      c.expect.followUpPresent &&
      c.expect.returnPrecautionsPresent &&
      c.expect.instructionsCommunicated;

    if (predictedReady && expectedReady) tp += 1;
    else if (predictedReady && !expectedReady) fp += 1;
    else if (!predictedReady && expectedReady) fn += 1;

    if (c.family === "communication") contentComm += 1;
    if (c.family === "follow-up") followUpAlign += 1;
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  return {
    totalCases: cases.length,
    exactSetMatch: exact,
    exactSetMatchRate: cases.length === 0 ? 1 : exact / cases.length,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    contentCommunicationSeparationCases: contentComm,
    followUpAlignmentCases: followUpAlign,
  };
}
