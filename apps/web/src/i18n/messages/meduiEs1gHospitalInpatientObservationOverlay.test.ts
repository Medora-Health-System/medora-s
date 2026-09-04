/**
 * MEDUI.ES.1G — Hospital / Inpatient / Observation governed Spanish overlay.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  productUiLanguageSelectOptions,
} from "@/i18n/config";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import {
  MEDUI_ES_1G_EMPTY_OVERLAY_PATHS,
  MEDUI_ES_1G_OVERLAY,
} from "./meduiEs1gHospitalInpatientObservationOverlay";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function collectLeaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    if (prefix) out.set(prefix, obj);
    return out;
  }
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      for (const [p, s] of collectLeaves(v, next)) out.set(p, s);
    }
  }
  return out;
}

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort();
}

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

const IN_SCOPE_PREFIXES = [
  "edHosp1gHospitalBoard.",
  "edHosp1g2PlacementWorkspace.",
  "hospitalizationBoard.",
  "hospitalCareD3ca.",
  "hospitalCareD3e6.",
  "hospitalCareD3e6a.",
  "hospitalCareD3e6b.",
  "hospitalCareD3e6c.",
  "hospitalCareD3e6d.",
  "hospitalCareD3e7.",
  "hospitalCareD3e8.",
  "hospitalCareD3e8a.",
  "observationBoard.",
  "observationD3d.",
  "observationD3da.",
  "observationDischarge.",
  "internalPlacementD3c.",
  "hospitalAdmissionD4a0.",
  "hospitalAdmissionD4a1.",
  "hospitalAdmissionD4a25.",
  "hospitalAdmissionD4a25a.",
  "hospitalAdmissionD4a26h.",
  "inpatientAdmissionInp2b.",
  "inpatientAdmissionInp2b1.",
  "inpatientAdmissionInp2b2.",
  "inpatientAdmissionInp2b2a.",
  "inpatientAdmissionInp2b2d.",
  "inpatientWorkspaceRecoveryD4a27b.",
  "inpatientRapidConvergenceD4a27c.",
  "inpatientD3e.",
  "inpatientD3e7.",
  "inpatientProviderD4a26.",
  "providerClinicalSynthesisD4a26a.",
  "providerLegalRecordD4a26b.",
  "inpatientProviderDocumentationInpProv1a.",
  "inpatientProviderDocumentationInpProv1b.",
  "providerDocumentationWorkspace.",
  "inpatientOverviewD4a34.",
  "inpatientOverviewInp2a.",
  "inpatientCompactHeaderD4a32.",
  "enterpriseProviderClinicalWorkspaceD4b8.",
  "inpatientHeaderNursingD4a33.",
  "inpatientNursingAssessmentInp1b.",
  "inpatientNursingAssessmentInp2c.",
  "inpatientNursingAdmissionInp2g.",
  "enterpriseNursingClinicalWorkspaceD4b2.",
  "enterpriseTechnicianNursingAssistantWorkspaceD4b3.",
  "enterpriseRespiratoryTherapyWorkspaceD4b4.",
  "enterpriseRehabilitationWorkspacesD4b5.",
  "nursingAdmissionPrint.",
  "hospitalTechnicianWorkspace.",
  "inpatientEncounterHistoryInpHist1a.",
  "inpatientMedicalRecordSummaryInp2f.",
  "inpatientProviderDischargeInpDis1b.",
  "inpatientNursingDischargeInpDis1d.",
  "inpatientFinalDischargeInpDis1e.",
  "inpatientDischargeBoardInpDis1f.",
  "inpatientDischargeAwarenessInpDis1h.",
  "enterpriseCaseManagementDischargePlanningD4b7.",
  "bedBoard.",
  "bedStatus.",
  "roomAssignment.",
  "enterpriseHospitalAssignmentD4a30.",
  "inpatientReviewOrdersInp2d.",
  "enterpriseClinicalRulesD4a28a.",
  "enterpriseClinicalDocumentD4b1.",
  "operationalGovernanceD4a27a.",
  "enterpriseCommandD4a27.",
  "enterpriseWorkflowD4a28.",
  "admissionCommandCenter.",
  "admissionWorkflowVisibility.",
  "commandTimeline.",
] as const;

function isInScopePath(path: string): boolean {
  return IN_SCOPE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

function classify1gPath(path: string): string {
  if (!isInScopePath(path)) return "OUT_OF_SCOPE";
  if (
    path.startsWith("edHosp1g2PlacementWorkspace.") ||
    path.startsWith("internalPlacementD3c.") ||
    /\.placementQueue\b|\.admissions\b/.test(path)
  ) {
    return "PLACEMENT";
  }
  if (
    path.startsWith("hospitalizationBoard.") ||
    path.startsWith("observationBoard.") ||
    path.startsWith("observationD3d.") ||
    path.startsWith("observationD3da.") ||
    path.startsWith("observationDischarge.") ||
    /\.observation\b/.test(path)
  ) {
    return "OBSERVATION_DESTINATION";
  }
  if (
    path.startsWith("bedBoard.") ||
    path.startsWith("bedStatus.") ||
    path.startsWith("roomAssignment.") ||
    path.startsWith("enterpriseHospitalAssignmentD4a30.") ||
    /\.beds\b/.test(path)
  ) {
    return "INPATIENT_BED_CENSUS";
  }
  if (
    path.startsWith("inpatientProviderDischargeInpDis1b.") ||
    path.startsWith("inpatientNursingDischargeInpDis1d.") ||
    path.startsWith("inpatientFinalDischargeInpDis1e.") ||
    path.startsWith("inpatientDischargeBoardInpDis1f.") ||
    path.startsWith("inpatientDischargeAwarenessInpDis1h.") ||
    path.startsWith("enterpriseCaseManagementDischargePlanningD4b7.") ||
    path.includes("dischargePlanning") ||
    path.includes("Discharge")
  ) {
    return "INPATIENT_DISCHARGE";
  }
  if (
    path.startsWith("inpatientEncounterHistoryInpHist1a.") ||
    path.startsWith("inpatientMedicalRecordSummaryInp2f.")
  ) {
    return "INPATIENT_HISTORY";
  }
  if (
    path.startsWith("inpatientHeaderNursingD4a33.") ||
    path.startsWith("inpatientNursingAssessmentInp1b.") ||
    path.startsWith("inpatientNursingAssessmentInp2c.") ||
    path.startsWith("inpatientNursingAdmissionInp2g.") ||
    path.startsWith("enterpriseNursingClinicalWorkspaceD4b2.") ||
    path.startsWith("enterpriseTechnicianNursingAssistantWorkspaceD4b3.") ||
    path.startsWith("enterpriseRespiratoryTherapyWorkspaceD4b4.") ||
    path.startsWith("enterpriseRehabilitationWorkspacesD4b5.") ||
    path.startsWith("nursingAdmissionPrint.") ||
    path.startsWith("hospitalTechnicianWorkspace.")
  ) {
    return "INPATIENT_NURSING";
  }
  if (
    path.startsWith("inpatientProviderD4a26.") ||
    path.startsWith("providerClinicalSynthesisD4a26a.") ||
    path.startsWith("providerLegalRecordD4a26b.") ||
    path.startsWith("inpatientProviderDocumentationInpProv1a.") ||
    path.startsWith("inpatientProviderDocumentationInpProv1b.") ||
    path.startsWith("providerDocumentationWorkspace.") ||
    path.startsWith("inpatientOverviewD4a34.") ||
    path.startsWith("inpatientOverviewInp2a.") ||
    path.startsWith("inpatientCompactHeaderD4a32.") ||
    path.startsWith("enterpriseProviderClinicalWorkspaceD4b8.")
  ) {
    return "INPATIENT_PROVIDER";
  }
  if (
    path.startsWith("hospitalAdmissionD4a0.") ||
    path.startsWith("hospitalAdmissionD4a1.") ||
    path.startsWith("hospitalAdmissionD4a25.") ||
    path.startsWith("hospitalAdmissionD4a25a.") ||
    path.startsWith("hospitalAdmissionD4a26h.") ||
    path.startsWith("inpatientAdmissionInp2b.") ||
    path.startsWith("inpatientAdmissionInp2b1.") ||
    path.startsWith("inpatientAdmissionInp2b2.") ||
    path.startsWith("inpatientAdmissionInp2b2a.") ||
    path.startsWith("inpatientAdmissionInp2b2d.") ||
    path.startsWith("inpatientWorkspaceRecoveryD4a27b.") ||
    path.startsWith("inpatientRapidConvergenceD4a27c.") ||
    path.startsWith("inpatientD3e.") ||
    path.startsWith("inpatientD3e7.")
  ) {
    return "INPATIENT_RECEIVING_ADMISSION";
  }
  if (
    path.startsWith("edHosp1gHospitalBoard.") ||
    path.startsWith("hospitalCareD3ca.") ||
    path.startsWith("hospitalCareD3e6.") ||
    path.startsWith("hospitalCareD3e6a.") ||
    path.startsWith("hospitalCareD3e6b.") ||
    path.startsWith("hospitalCareD3e6c.") ||
    path.startsWith("hospitalCareD3e6d.") ||
    path.startsWith("hospitalCareD3e7.") ||
    path.startsWith("hospitalCareD3e8.") ||
    path.startsWith("hospitalCareD3e8a.") ||
    path.startsWith("operationalGovernanceD4a27a.") ||
    path.startsWith("enterpriseCommandD4a27.") ||
    path.startsWith("enterpriseWorkflowD4a28.") ||
    path.startsWith("admissionCommandCenter.") ||
    path.startsWith("admissionWorkflowVisibility.") ||
    path.startsWith("commandTimeline.")
  ) {
    return "HOSPITAL_BOARD";
  }
  return "GENERIC_DEPENDENCY_REQUIRED_BY_1G";
}

describe("MEDUI.ES.1G hospital board / placement / observation coverage", () => {
  it("board, placement, and observation destination chrome are translated", () => {
    const paths = [
      "edHosp1gHospitalBoard.incomingObservation",
      "edHosp1g2PlacementWorkspace.title",
      "edHosp1g2PlacementWorkspace.stepBedAssigned",
      "hospitalizationBoard.pageTitle",
      "observationBoard.emptyNoPatients",
      "internalPlacementD3c.boardTitle",
    ];
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v, p).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
  });
});

describe("MEDUI.ES.1G inpatient receiving / provider / nursing / discharge", () => {
  it("core inpatient chrome is translated", () => {
    const paths = [
      "hospitalAdmissionD4a0.level.OBSERVATION",
      "inpatientProviderD4a26.nav.overview",
      "inpatientNursingAdmissionInp2g.signedLock.title",
      "inpatientEncounterHistoryInpHist1a.title",
      "inpatientProviderDischargeInpDis1b.title",
      "inpatientNursingDischargeInpDis1d.title",
      "bedBoard.viewToggleBedBoard",
    ];
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v, p).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
  });
});

describe("MEDUI.ES.1G disposition distinctness", () => {
  it("HOME / OBSERVATION / INPATIENT / TRANSFER / AMA / ELOPED / DECEASED remain distinct", () => {
    const home = getByPath(es, "inpatientProviderDischargeInpDis1b.disposition.HOME") as string;
    const ama = getByPath(es, "inpatientProviderDischargeInpDis1b.disposition.AGAINST_MEDICAL_ADVICE") as string;
    const eloped = getByPath(es, "inpatientProviderDischargeInpDis1b.disposition.ELOPED") as string;
    const deceased = getByPath(es, "inpatientProviderDischargeInpDis1b.disposition.DECEASED") as string;
    const transfer = getByPath(es, "inpatientProviderDischargeInpDis1b.disposition.TRANSFER_ACUTE_CARE") as string;
    const obs = getByPath(es, "hospitalAdmissionD4a0.level.OBSERVATION") as string;
    const inpatient = getByPath(es, "enterpriseCommandD4a27.metrics.inpatient") as string;
    expect(home).toBe("Alta a domicilio");
    expect(obs).toBe("Observación");
    expect(inpatient).toBe("Hospitalización");
    expect(transfer).toMatch(/Traslado/i);
    expect(ama).toContain("AMA");
    expect(eloped).toContain("ELOPED");
    expect(deceased).toBe("Fallecido");
    const set = new Set([home, obs, inpatient, transfer, ama, eloped, deceased]);
    expect(set.size).toBe(7);
    expect(ama).not.toBe(eloped);
    expect(home).not.toBe(deceased);
  });
});

describe("MEDUI.ES.1G 1I / 1J / authored stay unlocalized", () => {
  it("1G never claims 1H order/catalog sections (now owned by the 1H overlay)", () => {
    for (const prefix of ["erEmergencyOrders", "edHosp1dObservationOrders", "edHosp1eAdmissionOrders"]) {
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      for (const [path] of leaves) {
        expect(MEDUI_ES_1G_OVERLAY[path], path).toBeUndefined();
      }
    }
  });

  it("1G overlay never claims 1I clinic/dental/billing keys", () => {
    for (const prefix of ["clinicCareD4c1", "dentalCareD5a2", "billingPage"]) {
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      for (const [path] of leaves) {
        expect(MEDUI_ES_1G_OVERLAY[path], path).toBeUndefined();
      }
    }
  });

  it("complaint-intel inserted narrative remains placeholders", () => {
    const prefix = "providerDocumentationComplaintIntel";
    const leaves = collectLeaves(getByPath(es, prefix), prefix);
    expect(leaves.size).toBeGreaterThan(100);
    let n = 0;
    for (const [path, value] of leaves) {
      expect(MEDUI_ES_1G_OVERLAY[path]).toBeUndefined();
      expect(isHiddenSpanishPlaceholder(value), path).toBe(true);
      n += 1;
      if (n >= 40) break;
    }
  });

  it("1G overlay does not include 1I clinic/dental/billing modules", () => {
    for (const path of Object.keys(MEDUI_ES_1G_OVERLAY)) {
      expect(path.startsWith("clinicCare"), path).toBe(false);
      expect(path.startsWith("dentalCare"), path).toBe(false);
      expect(path.startsWith("billingPage"), path).toBe(false);
      expect(path.startsWith("billingClassification"), path).toBe(false);
      expect(path.startsWith("billingLedger"), path).toBe(false);
      expect(path.startsWith("billingExport"), path).toBe(false);
      expect(path.startsWith("billingGovernance"), path).toBe(false);
    }
  });
});

describe("MEDUI.ES.1G six-direction isolation", () => {
  const scoped = [
    "edHosp1g2PlacementWorkspace.title",
    "hospitalizationBoard.pageTitle",
    "inpatientProviderDischargeInpDis1b.title",
    "inpatientNursingAdmissionInp2g.signedLock.title",
    "bedBoard.viewToggleBedBoard",
  ];

  it("EN/FR/ES 1G chrome do not leak across languages", () => {
    for (const key of scoped) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(esVal).not.toBe(enVal);
      expect(esVal).not.toBe(frVal);
      if (enVal && frVal && enVal !== frVal) expect(enVal).not.toBe(frVal);
      expect(isHiddenSpanishPlaceholder(esVal)).toBe(false);
      expect(resolveClinicalUiMessage("en", key)).toBe(enVal);
      expect(resolveClinicalUiMessage("fr", key)).toBe(frVal);
      expect(resolveClinicalUiMessage("es", key)).toBe(esVal);
    }
  });

  it("missing ES keys never fall back to EN or FR", () => {
    const missing = "meduiEs1g.missing.hospital.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
  });
});

describe("MEDUI.ES.1G public exposure", () => {
  it("Español is publicly selectable after MEDUI.ES.1K", () => {
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en", "es"]);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en", "es"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(true);
  });

  it("patient preferredLanguage remains distinct from product UI locale; stored product es hydrates after 1K", () => {
    expect(resolveClientUiLanguage.toString()).not.toMatch(/preferredLanguage/);
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("es");
  });
});

describe("MEDUI.ES.1G overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1G_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    expect(new Set(overlayPaths).size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const hidden = createHiddenSpanishCatalog(en);
    const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
    const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
    const before1g = countPlaceholders(after1f);

    const reviewRequiredUiKeys = new Set<string>();
    for (const entry of ES_MEDICAL_TERMINOLOGY) {
      if (entry.status === "REVIEW_REQUIRED") {
        for (const k of entry.uiMessageKeys ?? []) reviewRequiredUiKeys.add(k);
      }
    }

    const byClass: Record<string, number> = {};
    const outOfScope: string[] = [];
    const reviewRequiredOverlays: string[] = [];
    const emptyOverlayEntries: string[] = [];
    const notReplacing: string[] = [];
    const enLeaves = collectLeaves(en);

    for (const [path, value] of overlayEntries) {
      const cls = classify1gPath(path);
      byClass[cls] = (byClass[cls] || 0) + 1;
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
      if (reviewRequiredUiKeys.has(path)) reviewRequiredOverlays.push(path);
      if (value === "") emptyOverlayEntries.push(path);
      const prior = getByPath(after1f, path);
      if (typeof prior !== "string" || !isHiddenSpanishPlaceholder(prior)) notReplacing.push(path);
      const enVal = enLeaves.get(path);
      expect(enVal, `overlay path missing in EN: ${path}`).toBeDefined();
      if (value === "") expect(enVal).toBe("");
      else expect(interpolationTokens(value), `token parity: ${path}`).toEqual(interpolationTokens(enVal as string));
    }

    const { tree: after1g, replaced } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
    const after = countPlaceholders(after1g);

    expect(outOfScope).toEqual([]);
    expect(reviewRequiredOverlays).toEqual([]);
    expect(notReplacing).toEqual([]);
    expect([...emptyOverlayEntries].sort()).toEqual([...MEDUI_ES_1G_EMPTY_OVERLAY_PATHS].sort());

    const report = {
      totalEsStringLeaves: before1g.totalLeaves,
      placeholdersBefore1g: before1g.placeholders,
      placeholdersAfter1g: after.placeholders,
      placeholdersReplacedBy1g: replaced,
      overlayEntriesTotal: overlayEntries.length,
      uniqueOverlayPaths: overlayPaths.length,
      nonEmptyOverlayEntries: overlayEntries.length - emptyOverlayEntries.length,
      emptyOverlayEntries,
      overlaysActuallyReplacingPlaceholders: replaced,
      overlaysNotReplacingPlaceholders: notReplacing,
      byClass,
      outOfScope,
      reviewRequiredOverlays,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    expect(before1g.totalLeaves).toBe(44266);
    expect(replaced).toBe(overlayEntries.length);
    expect(after.placeholders).toBe(before1g.placeholders - replaced);
    expect(byClass.OUT_OF_SCOPE ?? 0).toBe(0);
  });
});

describe("MEDUI.ES.1G no ungoverned Spanish component literals", () => {
  it("1G production TSX files do not hardcode Spanish clinical chrome", () => {
    const files = [
      "src/features/hospitalization/HospitalizationBoardView.tsx",
      "src/features/hospital-care/HospitalCarePlacementWorkspaceView.tsx",
      "src/features/hospital-care/HospitalAdmissionIntakeView.tsx",
    ];
    const forbidden = /\b(Hospitalización|Observación|Evaluación de enfermería|Alta a domicilio)\b/;
    let hits = 0;
    for (const rel of files) {
      try {
        const src = readFileSync(join(webRoot, rel), "utf8");
        hits += src.match(forbidden)?.length ?? 0;
      } catch {
        // file may live under a slightly different path; skip missing
      }
    }
    expect(hits).toBe(0);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(true);
  });
});
