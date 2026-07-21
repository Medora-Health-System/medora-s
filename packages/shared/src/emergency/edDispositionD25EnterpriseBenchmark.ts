/**
 * D2.5 — deterministic 100-case disposition pathway / MSE benchmark.
 * Exact-set match on pathway blockers + MSE status + print kind + ready flag.
 */

import {
  ED_DISCHARGE_MODE_AMA,
  ED_DISCHARGE_MODE_DECEASED,
  ED_DISCHARGE_MODE_ELOPEMENT,
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_LWBS,
  ED_DISCHARGE_MODE_OTHER,
  type EdDispositionPath,
} from "../encounters/edEncounterLifecycle.js";
import { evaluatePathwayDocumentationBlockers } from "../encounters/edDispositionPathwayDocumentationV1.js";
import {
  resolveEdDispositionPrintKind,
  type EdDispositionPrintKind,
} from "../encounters/edDispositionSummaryRouting.js";
import {
  MseClinicalStatus,
  MseDocumentationStatus,
  MEDICAL_SCREENING_EXAMINATION_V1_KEY,
  readMedicalScreeningExaminationV1,
} from "../encounters/medicalScreeningExaminationV1.js";

export type D25BenchmarkCase = {
  id: string;
  path: EdDispositionPath;
  nursingAssessment: unknown;
  dischargeSummaryJson: unknown;
  expectedBlockerCodes: string[];
  expectedMseStatus: string;
  expectedPrintKind: EdDispositionPrintKind;
  expectedReady: boolean;
};

function completeAma() {
  return {
    intentToLeaveAt: "2026-07-20T10:00",
    reasonStated: "Wants to leave",
    recommendedCareSummary: "Further evaluation",
    capacityAssessed: "YES",
    capacityNarrative: "Oriented x3",
    materialRisksDiscussed: "Worsening possible",
    benefitsDiscussed: "Stay for treatment",
    alternativesOffered: "Observation",
    returnPrecautions: "Return if worse",
    signatureOrRefusal: "SIGNED",
    departureAt: "2026-07-20T11:00",
    conditionAtLastObservation: "Stable",
    source: "CURRENT",
  };
}

function completeLwbs() {
  return {
    careStage: "LEFT_BEFORE_MSE",
    lastSeenAt: "2026-07-20T09:00",
    searchAttemptsDocumented: true,
    departureAt: "2026-07-20T09:30",
    contactAttempted: false,
    source: "CURRENT",
  };
}

function completeElopement() {
  return {
    careStage: "TREATMENT_IN_PROGRESS",
    lastSeenAt: "2026-07-20T12:00",
    lastKnownStatus: "Ambulating to bathroom",
    outstandingRisksDocumented: true,
    searchResponseDocumented: true,
    notificationsDocumented: true,
    eventClassification: "voluntary unauthorized departure",
    source: "CURRENT",
  };
}

function completeDeceased() {
  return {
    pronouncementComplete: true,
    dateOfDeath: "2026-07-20",
    timeOfDeath: "14:00",
    pronouncedBy: "Dr Test",
    nextOfKinNotificationStatus: "Notified in person",
    medicalExaminerStatus: "Not required",
    donationReferralStatus: "Not applicable",
    postmortemCareComplete: true,
    belongingsDocumented: true,
    bodyCustodyDocumented: true,
    autopsyRequested: "NO",
    source: "CURRENT",
  };
}

function completeOther() {
  return {
    codedReason: "ADMINISTRATIVE",
    explanation: "Chart correction only",
    supervisorReviewComplete: true,
    departureType: "Administrative",
    destination: "Home",
    source: "CURRENT",
  };
}

function mseNotStarted() {
  return {
    [MEDICAL_SCREENING_EXAMINATION_V1_KEY]: {
      status: MseClinicalStatus.NOT_STARTED,
      documentationStatus: MseDocumentationStatus.NONE,
      source: "CURRENT",
      emtalaComplianceClaim: false,
      revision: 0,
    },
  };
}

function mseCompleted() {
  return {
    [MEDICAL_SCREENING_EXAMINATION_V1_KEY]: {
      status: MseClinicalStatus.COMPLETED,
      documentationStatus: MseDocumentationStatus.SIGNED,
      signedAt: "2026-07-20T08:00:00.000Z",
      signedByDisplayName: "Dr Test",
      clinicianNameSnapshot: "Dr Test",
      source: "CURRENT",
      emtalaComplianceClaim: false,
      revision: 1,
      emergencyMedicalConditionDetermination: "NOT_PRESENT",
    },
  };
}

function mode(path: EdDispositionPath): string {
  switch (path) {
    case "HOME":
      return ED_DISCHARGE_MODE_HOME;
    case "AMA":
      return ED_DISCHARGE_MODE_AMA;
    case "LWBS":
      return ED_DISCHARGE_MODE_LWBS;
    case "ELOPEMENT":
      return ED_DISCHARGE_MODE_ELOPEMENT;
    case "DECEASED":
      return ED_DISCHARGE_MODE_DECEASED;
    case "OTHER":
      return ED_DISCHARGE_MODE_OTHER;
    default:
      return ED_DISCHARGE_MODE_HOME;
  }
}

function buildCase(
  id: string,
  path: EdDispositionPath,
  nursing: Record<string, unknown>,
  expectedBlockerCodes: string[],
  expectedReady: boolean,
  expectedMseStatus: string = MseClinicalStatus.NOT_STARTED
): D25BenchmarkCase {
  return {
    id,
    path,
    nursingAssessment: nursing,
    dischargeSummaryJson: {
      dischargeMode: mode(path),
      // Deliberate Home packet noise — must never clear pathway blockers.
      providerDischargeDiagnosisDocs: [{ code: "R51", description: "Headache" }],
      patientInstructionsGiven: true,
    },
    expectedBlockerCodes: [...expectedBlockerCodes].sort(),
    expectedMseStatus,
    expectedPrintKind: resolveEdDispositionPrintKind(path),
    expectedReady,
  };
}

/** 100 deterministic cases: 20 Home, 20 AMA, 15 LWBS, 15 Elopement, 20 Deceased, 10 Other. */
export function buildEdDispositionD25EnterpriseBenchmarkCases(): D25BenchmarkCase[] {
  const cases: D25BenchmarkCase[] = [];

  for (let i = 1; i <= 20; i++) {
    cases.push(
      buildCase(
        `HOME-${String(i).padStart(2, "0")}`,
        "HOME",
        mseCompleted(),
        [],
        true,
        MseClinicalStatus.COMPLETED
      )
    );
  }

  for (let i = 1; i <= 20; i++) {
    if (i <= 10) {
      cases.push(
        buildCase(
          `AMA-COMPLETE-${String(i).padStart(2, "0")}`,
          "AMA",
          { ...mseCompleted(), erAmaDispositionV1: completeAma() },
          [],
          true,
          MseClinicalStatus.COMPLETED
        )
      );
    } else if (i <= 15) {
      cases.push(
        buildCase(`AMA-MISSING-CAP-${String(i).padStart(2, "0")}`, "AMA", {
          ...mseCompleted(),
          erAmaDispositionV1: { ...completeAma(), capacityAssessed: "" },
        }, ["AMA_CAPACITY_NOT_DOCUMENTED"], false, MseClinicalStatus.COMPLETED)
      );
    } else {
      cases.push(
        buildCase(`AMA-HOME-NOISE-${String(i).padStart(2, "0")}`, "AMA", {
          ...mseNotStarted(),
          erAmaDispositionV1: { ...completeAma(), materialRisksDiscussed: "" },
        }, ["AMA_MATERIAL_RISKS_NOT_DOCUMENTED"], false)
      );
    }
  }

  for (let i = 1; i <= 15; i++) {
    if (i <= 8) {
      cases.push(
        buildCase(
          `LWBS-OK-${String(i).padStart(2, "0")}`,
          "LWBS",
          { ...mseNotStarted(), erLwbsDispositionV1: completeLwbs() },
          [],
          true
        )
      );
    } else if (i <= 12) {
      cases.push(
        buildCase(
          `LWBS-MSE-CONFLICT-${String(i).padStart(2, "0")}`,
          "LWBS",
          { ...mseCompleted(), erLwbsDispositionV1: completeLwbs() },
          ["LWBS_MSE_STATUS_CONFLICT"],
          false,
          MseClinicalStatus.COMPLETED
        )
      );
    } else {
      cases.push(
        buildCase(`LWBS-MISSING-${String(i).padStart(2, "0")}`, "LWBS", {
          ...mseNotStarted(),
          erLwbsDispositionV1: { ...completeLwbs(), careStage: "", lastSeenAt: "" },
        }, ["LWBS_CARE_STAGE_MISSING", "LWBS_LAST_SEEN_TIME_MISSING"], false)
      );
    }
  }

  for (let i = 1; i <= 15; i++) {
    if (i <= 8) {
      cases.push(
        buildCase(
          `ELOPEMENT-OK-${String(i).padStart(2, "0")}`,
          "ELOPEMENT",
          { ...mseCompleted(), erElopementDispositionV1: completeElopement() },
          [],
          true,
          MseClinicalStatus.COMPLETED
        )
      );
    } else {
      cases.push(
        buildCase(`ELOPEMENT-MISSING-${String(i).padStart(2, "0")}`, "ELOPEMENT", {
          ...mseCompleted(),
          erElopementDispositionV1: {
            ...completeElopement(),
            notificationsDocumented: false,
            lastKnownStatus: "",
          },
        }, ["ELOPEMENT_LAST_KNOWN_STATUS_MISSING", "ELOPEMENT_NOTIFICATION_MISSING"], false, MseClinicalStatus.COMPLETED)
      );
    }
  }

  for (let i = 1; i <= 20; i++) {
    if (i <= 10) {
      cases.push(
        buildCase(
          `DECEASED-OK-${String(i).padStart(2, "0")}`,
          "DECEASED",
          { ...mseNotStarted(), erDeceasedDispositionV1: completeDeceased() },
          [],
          true
        )
      );
    } else {
      cases.push(
        buildCase(`DECEASED-MISSING-${String(i).padStart(2, "0")}`, "DECEASED", {
          ...mseNotStarted(),
          erDeceasedDispositionV1: {
            ...completeDeceased(),
            pronouncementComplete: false,
            belongingsDocumented: false,
          },
        }, ["DEATH_PRONOUNCEMENT_INCOMPLETE", "DEATH_BELONGINGS_INCOMPLETE"], false)
      );
    }
  }

  for (let i = 1; i <= 10; i++) {
    if (i <= 5) {
      cases.push(
        buildCase(
          `OTHER-OK-${String(i).padStart(2, "0")}`,
          "OTHER",
          { ...mseNotStarted(), erOtherDispositionV1: completeOther() },
          [],
          true
        )
      );
    } else {
      cases.push(
        buildCase(`OTHER-UNGOVERNED-${String(i).padStart(2, "0")}`, "OTHER", {
          ...mseNotStarted(),
          erOtherDispositionV1: { ...completeOther(), codedReason: "" },
        }, ["OTHER_REASON_UNGOVERNED"], false)
      );
    }
  }

  if (cases.length !== 100) {
    throw new Error(`D2.5 benchmark must contain 100 cases, got ${cases.length}`);
  }
  return cases;
}

export type D25BenchmarkMetrics = {
  total: number;
  exactSetMatchRate: number;
  falseReadyCount: number;
  crossPathHomeSatisfactionCount: number;
  fabricatedMseCompletionCount: number;
  precision: number;
  recall: number;
};

export function evaluateEdDispositionD25EnterpriseBenchmark(
  cases: D25BenchmarkCase[] = buildEdDispositionD25EnterpriseBenchmarkCases()
): D25BenchmarkMetrics {
  let exact = 0;
  let falseReady = 0;
  let crossPath = 0;
  let fabricatedMse = 0;
  let tp = 0;
  let fp = 0;
  let fn = 0;

  for (const c of cases) {
    const blockers = evaluatePathwayDocumentationBlockers(
      c.path,
      c.nursingAssessment,
      c.dischargeSummaryJson
    );
    const codes = blockers.map((b) => b.code).sort();
    const mse = readMedicalScreeningExaminationV1(c.nursingAssessment);
    const ready = codes.length === 0;
    const printKind = resolveEdDispositionPrintKind(c.path);

    const setMatch =
      codes.length === c.expectedBlockerCodes.length &&
      codes.every((x, i) => x === c.expectedBlockerCodes[i]) &&
      mse.status === c.expectedMseStatus &&
      printKind === c.expectedPrintKind &&
      ready === c.expectedReady;

    if (setMatch) exact += 1;

    // Precision/recall on blocker code multiset presence for critical signals
    const expectedSet = new Set(c.expectedBlockerCodes);
    const actualSet = new Set(codes);
    for (const code of actualSet) {
      if (expectedSet.has(code)) tp += 1;
      else fp += 1;
    }
    for (const code of expectedSet) {
      if (!actualSet.has(code)) fn += 1;
    }

    if (ready && !c.expectedReady) falseReady += 1;

    // Home packet present must not clear pathway blockers when expected incomplete
    if (
      c.path !== "HOME" &&
      c.expectedBlockerCodes.length > 0 &&
      ready
    ) {
      crossPath += 1;
    }

    if (c.path === "LWBS" && c.id.includes("OK") && mse.status === MseClinicalStatus.COMPLETED) {
      fabricatedMse += 1;
    }
    if (
      c.path === "LWBS" &&
      c.expectedMseStatus === MseClinicalStatus.NOT_STARTED &&
      mse.status === MseClinicalStatus.COMPLETED &&
      !c.expectedBlockerCodes.includes("LWBS_MSE_STATUS_CONFLICT")
    ) {
      fabricatedMse += 1;
    }
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  return {
    total: cases.length,
    exactSetMatchRate: exact / cases.length,
    falseReadyCount: falseReady,
    crossPathHomeSatisfactionCount: crossPath,
    fabricatedMseCompletionCount: fabricatedMse,
    precision,
    recall,
  };
}
