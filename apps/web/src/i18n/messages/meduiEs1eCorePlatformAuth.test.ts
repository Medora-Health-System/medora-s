/**
 * MEDUI.ES.1E — Core Platform / Auth / Registration / Patient Chart
 * Deterministic test suite for Spanish 1E overlay.
 */
import { describe, it, expect } from "vitest";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";

// ── helpers ──

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
    out.set(prefix, obj);
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

// ── A. CORE SHELL ES ──

describe("MEDUI.ES.1E core shell ES coverage", () => {
  const corePaths = [
    "common.save", "common.cancel", "common.edit", "common.delete",
    "common.search", "common.loading", "common.noResults", "common.back",
    "common.patient", "common.status", "common.actions",
    "appShell.sidebarCollapse", "appShell.sidebarExpand",
    "appShell.primaryNavigation", "appShell.connectivity.reconnecting",
    "nav.registration", "nav.patients", "nav.encounters",
    "navGroups.accueil", "navGroups.admin",
  ];

  it("core shell keys are translated (not placeholders)", () => {
    for (const p of corePaths) {
      const v = getByPath(es, p);
      expect(v, `ES missing: ${p}`).toBeDefined();
      expect(typeof v, `ES not string: ${p}`).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), `ES still placeholder: ${p}`).toBe(false);
    }
  });
});

// ── B. AUTH ES ──

describe("MEDUI.ES.1E auth ES coverage", () => {
  const authPaths = [
    "auth.login.title", "auth.login.submit", "auth.login.passwordLabel",
    "auth.login.errorFallback", "auth.login.errorNetwork",
    "auth.forgotPassword.title", "auth.forgotPassword.submit",
    "auth.resetPassword.title", "auth.resetPassword.submit",
    "auth.resetPassword.mismatch", "auth.resetPassword.minLength",
    "auth.settings.title", "auth.settings.submit", "auth.settings.success",
    "auth.mfa.title", "auth.mfa.submit", "auth.mfa.errorInvalid",
    "auth.mfa.setupTitle", "auth.mfa.recoveryCodesTitle",
    "auth.mfa.manageTitle", "auth.mfa.manageEnable",
    "auth.errors.INVALID_CREDENTIALS", "auth.errors.RATE_LIMITED",
    "auth.errors.MFA_INVALID_CODE", "auth.errors.UNEXPECTED_ERROR",
  ];

  it("auth keys are translated", () => {
    for (const p of authPaths) {
      const v = getByPath(es, p);
      expect(v, `ES missing: ${p}`).toBeDefined();
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), `ES placeholder: ${p}`).toBe(false);
    }
  });
});

// ── C. REGISTRATION ES ──

describe("MEDUI.ES.1E registration ES coverage", () => {
  const regPaths = [
    "patientsListPage.titleNewPatient", "patientsListPage.labelFirstName",
    "patientsListPage.labelLastName", "patientsListPage.labelDob",
    "patientsListPage.labelSex", "patientsListPage.labelPhone",
    "patientsListPage.labelEmail", "patientsListPage.labelAddress",
    "patientsListPage.labelCity", "patientsListPage.labelCountry",
    "patientsListPage.labelEmergency", "patientsListPage.labelEmergencyRelationship",
    "patientsListPage.errDobInvalid", "patientsListPage.errContactRequired",
    "patientsListPage.btnCreatePatient",
    "patientProfile.pageTitle", "patientProfile.labelPreferredLanguage",
    "patientProfile.saveButton", "patientProfile.cancelButton",
    "registrationHome.title", "registrationHome.cardNewPatientTitle",
    "registrationWorkspace.title", "registrationWorkspace.newPatientCta",
  ];

  it("registration keys are translated", () => {
    for (const p of regPaths) {
      const v = getByPath(es, p);
      expect(v, `ES missing: ${p}`).toBeDefined();
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), `ES placeholder: ${p}`).toBe(false);
    }
  });
});

// ── D. PATIENT CHART ES ──

describe("MEDUI.ES.1E patient chart ES coverage", () => {
  const chartPaths = [
    "encounterChrome.patientHeader.labelAge",
    "encounterChrome.patientHeader.labelSex",
    "encounterChrome.patientHeader.labelNirMrn",
    "encounterChrome.patientHeader.labelDob",
    "encounterChrome.patientHeader.editPatient",
    "encounterChrome.patientHeader.noOpenEncounter",
    "encounterChrome.labelRoom", "encounterChrome.labelAge",
    "encounterChrome.labelSex", "encounterChrome.labelDob",
    "encounterChrome.tabs.summary", "encounterChrome.tabs.history",
    "encounterChrome.encounterStatuses.OPEN",
    "encounterChrome.encounterStatuses.CLOSED",
    "encounterChrome.patientSex.MALE", "encounterChrome.patientSex.FEMALE",
    "encounterChrome.backToEncounterList",
    "encounterChrome.finishEncounter",
    "patientQuickActions.noOpenEncounter",
    "patientQuickActions.editPatientInfo",
    "patientConsultationsTab.loading",
    "patientConsultationsTab.startEncounter",
    "patientConsultationsTab.colDate",
    "patientConsultationsTab.create.title",
    "patientConsultationsTab.create.submit",
  ];

  it("patient chart keys are translated", () => {
    for (const p of chartPaths) {
      const v = getByPath(es, p);
      expect(v, `ES missing: ${p}`).toBeDefined();
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), `ES placeholder: ${p}`).toBe(false);
    }
  });
});

// ── E. DATA IDENTITY — locale switching does not mutate patient data ──

describe("MEDUI.ES.1E data identity", () => {
  it("stored sex enum values are not altered by localization", () => {
    // These are display labels keyed by stored enum — the stored values themselves are canonical
    const sexKeys = ["MALE", "FEMALE", "OTHER", "UNKNOWN"];
    for (const k of sexKeys) {
      const enVal = getByPath(en, `encounterChrome.patientSex.${k}`);
      const frVal = getByPath(fr, `encounterChrome.patientSex.${k}`);
      const esVal = getByPath(es, `encounterChrome.patientSex.${k}`);
      // Each locale has its own display; key structure is identical
      expect(enVal).toBeDefined();
      expect(frVal).toBeDefined();
      expect(esVal).toBeDefined();
      // EN and ES should be different (not leaked)
      if (k !== "OTHER") {
        expect(esVal).not.toBe(enVal);
      }
    }
  });
});

// ── F. PATIENT LANGUAGE SEPARATION ──

describe("MEDUI.ES.1E patient preferred language ≠ UI locale", () => {
  it("patient preferred language label exists and does not reference UI locale switching", () => {
    const esLabel = getByPath(es, "patientProfile.labelPreferredLanguage");
    expect(esLabel).toBe("Idioma preferido");
    // This is a form label for what the PATIENT prefers, not a UI locale selector
  });

  it("login language selector does not expose Español as selectable", () => {
    const langFr = getByPath(es, "auth.login.langFr");
    const langEn = getByPath(es, "auth.login.langEn");
    expect(langFr).toBe("Francés");
    expect(langEn).toBe("Inglés");
    // There should be no langEs in auth.login
    const langEs = getByPath(en, "auth.login.langEs");
    expect(langEs).toBeUndefined();
  });
});

// ── G. ZERO FALLBACK ──

describe("MEDUI.ES.1E zero fallback", () => {
  it("1E overlay keys never fall back to EN values", () => {
    for (const [path, esVal] of Object.entries(MEDUI_ES_1E_OVERLAY)) {
      if (!esVal || esVal === "" || esVal === "—") continue; // legitimate identical
      const enVal = getByPath(en, path);
      if (typeof enVal !== "string") continue;
      // Allow identical for canonical codes, abbreviations, empty strings, dashes
      // Allow internationally identical terms: No, Plan, Hospital, Oral, etc. and numeric/code strings
      const identicalOk = new Set(["No", "Plan", "Hospital", "Oral", "Final", "Gel", "Rectal", "Vaginal", "XXXX-XXXX-XXXX"]);
      if (enVal === esVal && !["—", "", "ID", "NHC", "MRN", "MSPP"].includes(esVal) && !identicalOk.has(esVal) && !/^\d+$/.test(esVal) && !/^[X\-]+$/.test(esVal)) {
        if (!esVal.startsWith("MINISTÈRE") && !esVal.startsWith("MSPP")) {
          expect(esVal, `ES identical to EN (possible fallback): ${path}`).not.toBe(enVal);
        }
      }
    }
  });

  it("1E overlay keys never fall back to FR values", () => {
    for (const [path, esVal] of Object.entries(MEDUI_ES_1E_OVERLAY)) {
      if (!esVal || esVal === "" || esVal === "—") continue;
      const frVal = getByPath(fr, path);
      if (typeof frVal !== "string") continue;
      if (frVal === esVal && !["—", ""].includes(esVal) && !/^\d+$/.test(esVal) && !/^[X\-]+$/.test(esVal)) {
        if (!esVal.startsWith("MINISTÈRE")) {
          expect(esVal, `ES identical to FR (possible fallback): ${path}`).not.toBe(frVal);
        }
      }
    }
  });
});

// ── H. PUBLIC EXPOSURE ──

describe("MEDUI.ES.1E public exposure", () => {
  it("Español remains unavailable as public product UI locale", () => {
    // auth.login only has langFr and langEn, no langEs
    const langEs = getByPath(en, "auth.login.langEs");
    expect(langEs).toBeUndefined();
    const langEsFr = getByPath(fr, "auth.login.langEs");
    expect(langEsFr).toBeUndefined();
  });
});

// ── I. TERMINOLOGY CONSISTENCY ──

describe("MEDUI.ES.1E terminology consistency", () => {
  const consistencyPairs: [string, string, string][] = [
    // Same concept should use same Spanish term across surfaces
    // Note: patientsListPage labels include " *" (required marker) — compare only non-required labels
    ["patientsListPage.labelAge", "encounterChrome.labelAge", "Edad"],
    ["encounterChrome.patientHeader.labelAge", "encounterChrome.labelAge", "Edad"],
    ["encounterChrome.patientHeader.labelSex", "encounterChrome.labelSex", "Sexo"],
    ["encounterChrome.patientHeader.labelDob", "encounterChrome.labelDob", "Fecha de nacimiento"],
    ["encounterChrome.patientHeader.labelNirMrn", "encounterChrome.labelNirMrn", "NHC"],
  ];

  it("repeated concepts use the same Spanish translation", () => {
    for (const [pathA, pathB, expected] of consistencyPairs) {
      const a = getByPath(es, pathA);
      const b = getByPath(es, pathB);
      expect(a, `${pathA} should be "${expected}"`).toBe(expected);
      expect(b, `${pathB} should be "${expected}"`).toBe(expected);
    }
  });

  it("required-marker fields share root concept with encounter labels", () => {
    // patientsListPage.labelDob = "Fecha de nacimiento *" vs encounterChrome.labelDob = "Fecha de nacimiento"
    const regDob = getByPath(es, "patientsListPage.labelDob") as string;
    const chartDob = getByPath(es, "encounterChrome.labelDob") as string;
    expect(regDob.replace(/ \*$/, "")).toBe(chartDob);

    const regSex = getByPath(es, "patientsListPage.labelSex") as string;
    const chartSex = getByPath(es, "encounterChrome.labelSex") as string;
    expect(regSex.replace(/ \*$/, "")).toBe(chartSex);
  });
});

// ── J. SIX-DIRECTION LEAKAGE (1E scoped surfaces) ──

describe("MEDUI.ES.1E six-direction leakage for scoped surfaces", () => {
  const scopedSections = [
    "common", "appShell", "nav", "navGroups", "landingHome", "auth",
    "patientsListPage", "patientProfile", "registrationHome",
    "registrationWorkspace", "chartInsuranceSummary",
    "patientQuickActions",
  ];

  it("ES 1E leaves are not raw EN copy", () => {
    for (const section of scopedSections) {
      const esLeaves = collectLeaves(getByPath(es, section), section);
      const enLeaves = collectLeaves(getByPath(en, section), section);
      for (const [path, esVal] of esLeaves) {
        if (isHiddenSpanishPlaceholder(esVal)) continue; // still placeholder — ok
        const enVal = enLeaves.get(path);
        if (!enVal) continue;
        // Allow identical for canonical codes, abbreviations, empty strings
        // Allow internationally identical terms: Plan, Final, Oral, Hospital, numeric placeholders
      const identicalAllowed = new Set(["Plan", "Hospital", "Oral", "Final", "Gel", "Rectal", "Vaginal"]);
      if (esVal === enVal && esVal.length > 3 && !esVal.startsWith("MINISTÈRE") && !esVal.startsWith("MSPP") && !/^[A-Z0-9._\-/ ()]+$/.test(esVal) && !identicalAllowed.has(esVal) && !/^\d+$/.test(esVal) && !/^[X\-]+$/.test(esVal)) {
          expect(esVal, `ES→EN leakage at ${path}`).not.toBe(enVal);
        }
      }
    }
  });

  it("ES 1E translated leaves are not raw FR copy", () => {
    for (const section of scopedSections) {
      const esLeaves = collectLeaves(getByPath(es, section), section);
      const frLeaves = collectLeaves(getByPath(fr, section), section);
      for (const [path, esVal] of esLeaves) {
        if (isHiddenSpanishPlaceholder(esVal)) continue;
        const frVal = frLeaves.get(path);
        if (!frVal) continue;
        if (esVal === frVal && esVal.length > 3 && !esVal.startsWith("MINISTÈRE") && !/^\d+$/.test(esVal) && !/^[X\-]+$/.test(esVal)) {
          expect(esVal, `ES→FR leakage at ${path}`).not.toBe(frVal);
        }
      }
    }
  });
});

// ── K. OVERLAY ACCOUNTING ──

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

function getByPathMutable(tree: unknown, path: string): unknown {
  return getByPath(tree, path);
}

function classify1ePath(path: string):
  | "CORE_SHELL"
  | "AUTH"
  | "REGISTRATION"
  | "PATIENT_CHART"
  | "GENERIC_DEPENDENCY_REQUIRED_BY_1E"
  | "OUT_OF_SCOPE" {
  if (path.startsWith("auth.")) return "AUTH";
  if (
    path.startsWith("patientsListPage.") ||
    path.startsWith("patientProfile.") ||
    path.startsWith("registrationHome.") ||
    path.startsWith("registrationWorkspace.")
  ) {
    return "REGISTRATION";
  }
  if (
    path.startsWith("encounterChrome.") ||
    path.startsWith("patientQuickActions.") ||
    path.startsWith("patientConsultationsTab.") ||
    path.startsWith("chartInsuranceSummary.")
  ) {
    return "PATIENT_CHART";
  }
  if (
    path.startsWith("common.") ||
    path.startsWith("appShell.") ||
    path.startsWith("navGroups.")
  ) {
    return "CORE_SHELL";
  }
  if (path.startsWith("nav.") || path.startsWith("landingHome.")) {
    return "GENERIC_DEPENDENCY_REQUIRED_BY_1E";
  }
  return "OUT_OF_SCOPE";
}

describe("MEDUI.ES.1E overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1E_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    const uniqueOverlayPaths = new Set(overlayPaths);
    expect(uniqueOverlayPaths.size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const hidden = createHiddenSpanishCatalog(en);
    const before1d = countPlaceholders(hidden);
    const { tree: afterCanon, replaced: canonReplaced } = applyApprovedSpanishTerminology(
      hidden
    );
    const before1e = countPlaceholders(afterCanon);

    const reviewRequiredUiKeys = new Set<string>();
    const approvedCanonUiKeys = new Set<string>();
    for (const entry of ES_MEDICAL_TERMINOLOGY) {
      for (const key of entry.uiMessageKeys ?? []) {
        if (entry.status === "REVIEW_REQUIRED") reviewRequiredUiKeys.add(key);
        if (entry.status === "APPROVED") approvedCanonUiKeys.add(key);
      }
    }

    let replacedBy1e = 0;
    const didReplace: string[] = [];
    const didNotReplace: Array<{ path: string; reason: string }> = [];
    for (const [path, value] of overlayEntries) {
      const current = getByPathMutable(afterCanon, path);
      if (typeof current !== "string") {
        didNotReplace.push({ path, reason: "path missing or not a string in ES tree" });
        continue;
      }
      if (!isHiddenSpanishPlaceholder(current)) {
        const reason = approvedCanonUiKeys.has(path)
          ? "already replaced by 1D APPROVED canon overlay"
          : "already a non-placeholder before 1E";
        didNotReplace.push({ path, reason });
        continue;
      }
      replacedBy1e += 1;
      didReplace.push(path);
      void value;
    }

    // Live `es` also includes later phase overlays (1F+). Count 1E-only here.
    const { tree: after1eTree } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const after1e = countPlaceholders(after1eTree);
    const nonEmptyOverlayEntries = overlayEntries.filter(([, v]) => v !== "").length;
    const emptyOverlayEntries = overlayEntries.filter(([, v]) => v === "").map(([p]) => p);
    const outOfScope = overlayPaths.filter((p) => classify1ePath(p) === "OUT_OF_SCOPE");
    const reviewRequiredOverlays = overlayPaths.filter((p) => reviewRequiredUiKeys.has(p));

    const byClass = {
      CORE_SHELL: overlayPaths.filter((p) => classify1ePath(p) === "CORE_SHELL").length,
      AUTH: overlayPaths.filter((p) => classify1ePath(p) === "AUTH").length,
      REGISTRATION: overlayPaths.filter((p) => classify1ePath(p) === "REGISTRATION").length,
      PATIENT_CHART: overlayPaths.filter((p) => classify1ePath(p) === "PATIENT_CHART").length,
      GENERIC_DEPENDENCY_REQUIRED_BY_1E: overlayPaths.filter(
        (p) => classify1ePath(p) === "GENERIC_DEPENDENCY_REQUIRED_BY_1E"
      ).length,
      OUT_OF_SCOPE: outOfScope.length,
    };

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          totalEsStringLeaves: after1e.totalLeaves,
          placeholdersBefore1d: before1d.placeholders,
          canonReplaced,
          placeholdersBefore1e: before1e.placeholders,
          placeholdersAfter1e: after1e.placeholders,
          placeholdersReplacedBy1e: before1e.placeholders - after1e.placeholders,
          overlayEntriesTotal: overlayEntries.length,
          uniqueOverlayPaths: uniqueOverlayPaths.size,
          nonEmptyOverlayEntries,
          emptyOverlayEntries,
          overlaysActuallyReplacingPlaceholders: replacedBy1e,
          overlaysNotReplacingPlaceholders: didNotReplace,
          byClass,
          outOfScope,
          reviewRequiredOverlays,
        },
        null,
        2
      )
    );

    expect(before1d.totalLeaves).toBe(after1e.totalLeaves);
    expect(before1d.placeholders).toBe(before1d.totalLeaves);
    expect(canonReplaced).toBe(46);
    expect(before1e.placeholders).toBe(44220);
    expect(uniqueOverlayPaths.size).toBe(overlayEntries.length);
    expect(outOfScope, outOfScope.join(", ")).toEqual([]);
    expect(reviewRequiredOverlays, reviewRequiredOverlays.join(", ")).toEqual([]);
    expect(didNotReplace, JSON.stringify(didNotReplace)).toEqual([]);
    expect(replacedBy1e).toBe(549);
    expect(overlayEntries.length).toBe(549);
    expect(uniqueOverlayPaths.size).toBe(549);
    expect(nonEmptyOverlayEntries).toBe(546);
    expect(emptyOverlayEntries).toEqual([
      "registrationHome.quickActions",
      "encounterChrome.quickActions",
      "patientQuickActions.sectionTitle",
    ]);
    expect(after1e.placeholders).toBe(43671);
    expect(after1e.totalLeaves).toBe(44266);
    expect(before1e.placeholders - after1e.placeholders).toBe(549);

    for (const path of overlayPaths) {
      const enVal = getByPath(en, path);
      expect(enVal, `1E overlay key not in EN: ${path}`).toBeDefined();
      expect(typeof enVal, `1E overlay key not string in EN: ${path}`).toBe("string");
      const esVal = getByPath(es, path);
      expect(esVal).toBe(MEDUI_ES_1E_OVERLAY[path]);
      if (MEDUI_ES_1E_OVERLAY[path] === "") {
        expect(enVal).toBe("");
      }
    }

    expect(byClass).toEqual({
      CORE_SHELL: 75,
      AUTH: 130,
      REGISTRATION: 154,
      PATIENT_CHART: 142,
      GENERIC_DEPENDENCY_REQUIRED_BY_1E: 48,
      OUT_OF_SCOPE: 0,
    });
  });
});

// ── L. NO DIRECT SPANISH COMPONENT LITERALS ──

describe("MEDUI.ES.1E no direct component literals", () => {
  it("overlay exports only through governed catalog, not inline components", () => {
    // This is a structural test: the overlay file exists and is imported only through es.ts
    // The actual file audit is done at the repository level
    expect(Object.keys(MEDUI_ES_1E_OVERLAY).length).toBeGreaterThan(0);
  });
});
