/**
 * MEDUI.TRILANG.2 — Clinic / ED / Hospital / Observation / Inpatient
 * reachable product-owned UI completeness. Missing locale content = CI failure,
 * not a production sentinel.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isHiddenSpanishPlaceholder } from "@medora/shared";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { printOrderItemChartLabel, printT } from "@/lib/printI18n";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { I18nProvider, useI18n } from "@/i18n/provider";
import {
  clearRuntimeFacilityUiLanguage,
  FACILITY_UI_LANGUAGE_STORAGE_KEY,
  hydrateProductUiLanguage,
  persistFacilityUiLanguage,
  readActiveFacilityLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from "@/i18n/resolveClientUiLanguage";
import en from "./en";
import es from "./es";
import fr from "./fr";
import {
  MEDUI_TRILANG_2_CERTIFIED_PREFIXES,
  MEDUI_TRILANG_2_EMPTY_OVERLAY_PATHS,
  MEDUI_TRILANG_2_KEY_EXCEPTIONS,
  MEDUI_TRILANG_2_OVERLAY,
  MEDUI_TRILANG_2_PRODUCTION_SCREENSHOT_KEYS,
  MEDUI_TRILANG_2_WORKSPACE_PREFIXES,
} from "./meduiTrilang2ClinicalWorkspaceOverlay";

const EXPECTED_OVERLAY_SIZE = 1329;
const EXPECTED_REMAINING_PLACEHOLDERS = 23013;

const SCREENSHOT_ES: Record<(typeof MEDUI_TRILANG_2_PRODUCTION_SCREENSHOT_KEYS)[number], string> = {
  "diagnosisEntry.icdSearchLabel": "Buscar CIE-10-CM (código o texto diagnóstico)",
  "diagnosisEntry.icdSearchPlaceholder": "p. ej. R10.9 o abdominal / abd (mín. 2 caracteres)",
  "diagnosisEntry.manualToggle": "Introducir diagnóstico no catalogado manualmente",
  "diagnosisEntry.primaryBadge": "Principal",
  "diagnosisOnset.clinicalOnset": "Inicio clínico",
  "diagnosisOnset.documentedLine": "Documentado {when}",
  "printOutput.orderItemChart.terminalDone": "Completada",
  "erMseExamChips.genAlert": "alerta",
  "erMseExamChips.genNoAcuteDistress": "sin dificultad aguda",
  "erMseExamChips.genUncomfortableAppearing": "aspecto de malestar",
  "erMseExamChips.genToxicAppearing": "aspecto tóxico",
  "vitalsContext.tempShort": "Temp",
  "vitalsUnits.tempHintF": "≈ {n} °F",
  "vitalsContext.perMin": "/min",
  "vitalsContext.mmHg": "mmHg",
  "vitalsContext.percent": "%",
  "vitalsContext.oxygenDeviceLabel": "Administración de oxígeno",
  "vitalsContext.measuredDate": "Fecha de medición",
  "vitalsContext.measuredTime": "Hora de medición",
  "vitalsContext.saveVitals": "Guardar signos vitales",
  "vitalsContext.clear": "Borrar",
  "vitalSummary.labels.bp": "PA",
  "vitalSummary.labels.spo2": "SpO₂",
  "vitalSummary.labels.weight": "Peso",
  "vitalSummary.labels.height": "Talla",
  "erTriageComplaintTemplates.helper":
    "Plantillas de motivos frecuentes: haga clic para rellenar el motivo (y el relato de triaje si está vacío).",
  "erTriageComplaintTemplates.searchPlaceholder": "Buscar plantillas…",
};

const UNIT_OR_COGNATE = new Set(["Temp", "mmHg", "%", "/min", "SpO₂", "≈ {n} °F", "Principal"]);

function collectLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") return prefix ? [{ path: prefix, value: obj }] : [];
  if (obj == null || typeof obj !== "object") return [];
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectLeaves(val, next));
  }
  return out;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`);
}

function leavesForPrefixes(
  leaves: Array<{ path: string; value: string }>,
  prefixes: readonly string[]
): Array<{ path: string; value: string }> {
  return leaves.filter((leaf) => prefixes.some((prefix) => matchesPrefix(leaf.path, prefix)));
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function decodeHtml(html: string): string {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const SENTINEL_RE = /UNLOCALIZED_ES::|UNLOCALIZED_SOURCE/;
const RAW_KEY_RE = /\b[a-z][a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+){2,}\b/;

function WorkspaceChrome({ keys }: { keys: readonly string[] }) {
  const { t, language } = useI18n();
  return createElement(
    "main",
    { "data-locale": language },
    keys.map((key) => createElement("span", { "data-key": key, key }, t(key)))
  );
}

function renderWorkspace(locale: "en" | "fr" | "es", keys: readonly string[]): string {
  return renderToStaticMarkup(
    createElement(I18nProvider, {
      facilityLanguage: locale,
      children: createElement(WorkspaceChrome, { keys: keys as string[] }),
    })
  );
}

type MemoryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
};

function createMemoryStorage(): MemoryStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

const FACILITY_ROLES = [
  { facilityId: "facility-en", defaultLanguage: "en" },
  { facilityId: "facility-fr", defaultLanguage: "fr" },
  { facilityId: "facility-es", defaultLanguage: "es" },
];

const enLeaves = collectLeaves(en);
const frLeaves = collectLeaves(fr);
const esLeaves = collectLeaves(es);
const enByPath = new Map(enLeaves.map((x) => [x.path, x.value]));
const frByPath = new Map(frLeaves.map((x) => [x.path, x.value]));
const esByPath = new Map(esLeaves.map((x) => [x.path, x.value]));
const exceptionKeys = new Set(MEDUI_TRILANG_2_KEY_EXCEPTIONS.map((e) => e.key));

function countWorkspace(prefixes: readonly string[]): {
  total: number;
  enComplete: number;
  frComplete: number;
  esComplete: number;
  missingEn: string[];
  missingFr: string[];
  missingEs: string[];
  sentinels: string[];
  rawKeys: string[];
} {
  const overlayPaths = Object.keys(MEDUI_TRILANG_2_OVERLAY).filter((path) =>
    prefixes.some((prefix) => matchesPrefix(path, prefix))
  );
  const missingEn: string[] = [];
  const missingFr: string[] = [];
  const missingEs: string[] = [];
  const sentinels: string[] = [];
  const rawKeys: string[] = [];
  let enComplete = 0;
  let frComplete = 0;
  let esComplete = 0;
  for (const path of overlayPaths) {
    const enVal = enByPath.get(path);
    const frVal = frByPath.get(path);
    const esVal = esByPath.get(path);
    const allowEmpty = exceptionKeys.has(path);
    if (enVal === undefined || (!allowEmpty && enVal === "")) missingEn.push(path);
    else enComplete += 1;
    if (frVal === undefined || (!allowEmpty && frVal === "")) missingFr.push(path);
    else frComplete += 1;
    if (
      esVal === undefined ||
      isHiddenSpanishPlaceholder(esVal) ||
      (!allowEmpty && esVal === "")
    ) {
      missingEs.push(path);
    } else esComplete += 1;
    if (typeof esVal === "string" && SENTINEL_RE.test(esVal)) sentinels.push(path);
    if (esVal === path) rawKeys.push(path);
  }
  return {
    total: overlayPaths.length,
    enComplete,
    frComplete,
    esComplete,
    missingEn,
    missingFr,
    missingEs,
    sentinels,
    rawKeys,
  };
}

describe("MEDUI.TRILANG.2 overlay accounting", () => {
  it("covers every remaining required clinical key exactly once", () => {
    const keys = Object.keys(MEDUI_TRILANG_2_OVERLAY);
    expect(keys).toHaveLength(EXPECTED_OVERLAY_SIZE);
    expect(new Set(keys).size).toBe(EXPECTED_OVERLAY_SIZE);
    expect(MEDUI_TRILANG_2_EMPTY_OVERLAY_PATHS).toHaveLength(28);
    expect(MEDUI_TRILANG_2_KEY_EXCEPTIONS).toHaveLength(28);
    for (const ex of MEDUI_TRILANG_2_KEY_EXCEPTIONS) {
      expect(ex.classification).toBe("INTENTIONAL_EMPTY");
      expect(ex.key.length).toBeGreaterThan(0);
      expect(ex.reason.length).toBeGreaterThan(0);
      expect(MEDUI_TRILANG_2_OVERLAY[ex.key]).toBe("");
      expect(enByPath.get(ex.key)).toBe("");
      expect(frByPath.get(ex.key)).toBe("");
      expect(esByPath.get(ex.key)).toBe("");
    }
    for (const [path, value] of Object.entries(MEDUI_TRILANG_2_OVERLAY)) {
      expect(i18nMessage("es", path), path).toBe(value);
      expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
      expect(value, path).not.toContain("UNLOCALIZED_ES::");
      expect(value, path).not.toContain("UNLOCALIZED_SOURCE");
    }
  });
});

describe("MEDUI.TRILANG.2 production screenshot regression", () => {
  it("authors EN/FR/ES for every observed production hole (no sentinels)", () => {
    for (const key of MEDUI_TRILANG_2_PRODUCTION_SCREENSHOT_KEYS) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(enVal, key).not.toMatch(SENTINEL_RE);
      expect(frVal, key).not.toMatch(SENTINEL_RE);
      expect(esVal, key).not.toMatch(SENTINEL_RE);
      expect(isHiddenSpanishPlaceholder(esVal), key).toBe(false);
      expect(enVal, key).not.toBe("");
      expect(frVal, key).not.toBe("");
      expect(esVal, key).toBe(SCREENSHOT_ES[key]);
      if (!UNIT_OR_COGNATE.has(esVal)) {
        expect(esVal, key).not.toBe(enVal);
        expect(esVal, key).not.toBe(frVal);
      }
    }
  });

  it("print chart terminal state uses authored Spanish, not a raw printOutput key", () => {
    expect(printOrderItemChartLabel("es", "COMPLETED")).toBe("Completada");
    expect(printOrderItemChartLabel("es", "RESULTED")).toBe("Completada");
    expect(printOrderItemChartLabel("es", "VERIFIED")).toBe("Completada");
    expect(printT("es", "printOutput.orderItemChart.terminalDone")).toBe("Completada");
    expect(printOrderItemChartLabel("en", "COMPLETED")).not.toMatch(SENTINEL_RE);
    expect(printOrderItemChartLabel("fr", "COMPLETED")).not.toMatch(SENTINEL_RE);
    expect(printOrderItemChartLabel("es", "COMPLETED")).not.toBe("printOutput.orderItemChart.terminalDone");
  });
});

describe("MEDUI.TRILANG.2 certified namespace completeness", () => {
  it("EN/FR/ES key sets match and required values are authored", () => {
    const missing: string[] = [];
    const sentinels: string[] = [];
    const rawKeys: string[] = [];
    for (const prefix of MEDUI_TRILANG_2_CERTIFIED_PREFIXES) {
      const enFamily = leavesForPrefixes(enLeaves, [prefix]);
      const frFamily = leavesForPrefixes(frLeaves, [prefix]);
      const esFamily = leavesForPrefixes(esLeaves, [prefix]);
      const enSet = new Set(enFamily.map((x) => x.path));
      const frSet = new Set(frFamily.map((x) => x.path));
      const esSet = new Set(esFamily.map((x) => x.path));
      for (const path of enSet) {
        if (!frSet.has(path) || !esSet.has(path)) missing.push(path);
      }
      for (const { path, value } of esFamily) {
        if (isHiddenSpanishPlaceholder(value) || SENTINEL_RE.test(value)) sentinels.push(path);
        if (value === path) rawKeys.push(path);
        if (value === "" && !exceptionKeys.has(path)) missing.push(path);
      }
    }
    expect(missing, missing.slice(0, 40).join("\n")).toEqual([]);
    expect(sentinels, sentinels.slice(0, 40).join("\n")).toEqual([]);
    expect(rawKeys, rawKeys.slice(0, 40).join("\n")).toEqual([]);
  });

  it("exceptions are exact keys only — no wildcard exemptions", () => {
    for (const ex of MEDUI_TRILANG_2_KEY_EXCEPTIONS) {
      expect(ex.key.includes("*")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(MEDUI_TRILANG_2_OVERLAY, ex.key)).toBe(true);
    }
  });
});

describe("MEDUI.TRILANG.2 workspace counts", () => {
  it("Clinic / ED / Hospital / shared required keys are complete", () => {
    const shared = countWorkspace(MEDUI_TRILANG_2_WORKSPACE_PREFIXES.shared);
    const clinic = countWorkspace([
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.shared,
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.clinic,
    ]);
    const ed = countWorkspace([
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.shared,
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.ed,
    ]);
    const hospital = countWorkspace([
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.shared,
      ...MEDUI_TRILANG_2_WORKSPACE_PREFIXES.hospital,
    ]);
    for (const [name, stats] of Object.entries({ clinic, ed, hospital, shared })) {
      expect(stats.missingEn, `${name} missing EN ${stats.missingEn.slice(0, 20).join(", ")}`).toEqual([]);
      expect(stats.missingFr, `${name} missing FR ${stats.missingFr.slice(0, 20).join(", ")}`).toEqual([]);
      expect(stats.missingEs, `${name} missing ES ${stats.missingEs.slice(0, 20).join(", ")}`).toEqual([]);
      expect(stats.sentinels, `${name} sentinels`).toEqual([]);
      expect(stats.rawKeys, `${name} raw keys`).toEqual([]);
      expect(stats.enComplete).toBe(stats.total);
      expect(stats.frComplete).toBe(stats.total);
      expect(stats.esComplete).toBe(stats.total);
    }
    expect(clinic.total).toBeGreaterThan(0);
    expect(ed.total).toBeGreaterThan(0);
    expect(hospital.total).toBeGreaterThan(0);
    expect(shared.total).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(
      "MEDUI.TRILANG.2_WORKSPACE_COUNTS",
      JSON.stringify({ clinic, ed, hospital, shared, overlay: EXPECTED_OVERLAY_SIZE })
    );
  });
});

describe("MEDUI.TRILANG.2 remaining clinical placeholders", () => {
  it("certified prefixes have 0 remaining UNLOCALIZED_ES leaves", () => {
    const leftover = esLeaves.filter(
      (leaf) =>
        isHiddenSpanishPlaceholder(leaf.value) &&
        MEDUI_TRILANG_2_CERTIFIED_PREFIXES.some((prefix) => matchesPrefix(leaf.path, prefix))
    );
    expect(leftover.map((x) => x.path), leftover.slice(0, 40).map((x) => x.path).join("\n")).toEqual([]);
    const placeholders = esLeaves.filter((leaf) => isHiddenSpanishPlaceholder(leaf.value)).length;
    expect(placeholders).toBe(EXPECTED_REMAINING_PLACEHOLDERS);
  });
});

describe("MEDUI.TRILANG.2 facility pipeline", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = createMemoryStorage();
    const windowStub = {
      localStorage: storage,
      navigator: { language: "en-US", languages: ["en-US"] },
    };
    Object.defineProperty(globalThis, "window", { value: windowStub, configurable: true, writable: true });
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
    Object.defineProperty(globalThis, "navigator", {
      value: windowStub.navigator,
      configurable: true,
      writable: true,
    });
    clearRuntimeFacilityUiLanguage();
  });

  afterEach(() => {
    clearRuntimeFacilityUiLanguage();
  });

  it("facility ES/FR/EN hydrates I18nProvider path into Clinic, ED, and Hospital chrome", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "en");
    const clinicKey = "diagnosisEntry.icdSearchLabel";
    const edKey = "erMseExamChips.genAlert";
    const hospitalKey = "enterpriseClosedClinicalRecordD4c8b.sections.addenda";
    const vitalsKey = "vitalsContext.saveVitals";

    const activate = (facilityId: string) => {
      const lang = readActiveFacilityLanguage(FACILITY_ROLES, facilityId);
      return hydrateProductUiLanguage(lang);
    };

    expect(activate("facility-es")).toBe("es");
    expect(resolveClinicalUiMessage("es", clinicKey)).toBe(SCREENSHOT_ES[clinicKey]);
    expect(resolveClinicalUiMessage("es", edKey)).toBe(SCREENSHOT_ES[edKey]);
    expect(resolveClinicalUiMessage("es", vitalsKey)).toBe(SCREENSHOT_ES[vitalsKey]);
    expect(resolveClinicalUiMessage("es", hospitalKey)).not.toMatch(SENTINEL_RE);
    expect(resolveClinicalUiMessage("es", clinicKey)).not.toBe(i18nMessage("en", clinicKey));
    expect(resolveClinicalUiMessage("es", clinicKey)).not.toBe(i18nMessage("fr", clinicKey));

    expect(activate("facility-fr")).toBe("fr");
    expect(resolveClinicalUiMessage("fr", clinicKey)).toBe(i18nMessage("fr", clinicKey));
    expect(resolveClinicalUiMessage("fr", edKey)).toBe(i18nMessage("fr", edKey));
    expect(resolveClinicalUiMessage("fr", hospitalKey)).toBe(i18nMessage("fr", hospitalKey));
    expect(resolveClinicalUiMessage("fr", clinicKey)).not.toMatch(SENTINEL_RE);

    expect(activate("facility-en")).toBe("en");
    expect(resolveClinicalUiMessage("en", clinicKey)).toBe(i18nMessage("en", clinicKey));
    expect(resolveClinicalUiMessage("en", edKey)).toBe(i18nMessage("en", edKey));
    expect(resolveClinicalUiMessage("en", hospitalKey)).toBe(i18nMessage("en", hospitalKey));

    persistFacilityUiLanguage("es");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(FACILITY_ROLES, "facility-es"))).toBe("es");
    expect(storage.getItem(FACILITY_UI_LANGUAGE_STORAGE_KEY)).toBe("es");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(FACILITY_ROLES, "facility-es"))).toBe("es");
  });
});

describe("MEDUI.TRILANG.2 representative workspace render scan", () => {
  const clinicKeys = [
    "diagnosisEntry.icdSearchLabel",
    "diagnosisEntry.icdSearchPlaceholder",
    "diagnosisEntry.manualToggle",
    "diagnosisEntry.primaryBadge",
    "diagnosisOnset.clinicalOnset",
    "diagnosisOnset.documentedLine",
    "vitalSummary.labels.bp",
    "vitalSummary.labels.spo2",
    "vitalSummary.labels.weight",
    "vitalSummary.labels.height",
    "vitalsContext.saveVitals",
    "clinicalDashboard.providerSubtitle",
  ] as const;
  const edKeys = [
    "erMseExamChips.genAlert",
    "erMseExamChips.genNoAcuteDistress",
    "erMseExamChips.genUncomfortableAppearing",
    "erMseExamChips.genToxicAppearing",
    "erTriageComplaintTemplates.helper",
    "erTriageComplaintTemplates.searchPlaceholder",
    "printOutput.orderItemChart.terminalDone",
  ] as const;
  const hospitalKeys = [
    "enterpriseClosedEncounterD4c8a.lifecycle.roles",
    "enterpriseClosedClinicalRecordD4c8b.diagnoses.primary",
    "nursingDischargeVitals.saveDischargeVitals",
    "patientDischargeInstructions.save",
  ] as const;

  it.each([
    ["clinic", clinicKeys],
    ["ed", edKeys],
    ["hospital", hospitalKeys],
  ] as const)("%s workspace markup has 0 sentinels and 0 raw keys for en/fr/es", (_name, keys) => {
    for (const locale of ["en", "fr", "es"] as const) {
      const html = renderWorkspace(locale, keys);
      const decoded = decodeHtml(html);
      expect(decoded, locale).not.toContain("UNLOCALIZED_ES::");
      expect(decoded, locale).not.toContain("UNLOCALIZED_SOURCE");
      for (const key of keys) {
        const resolved = resolveClinicalUiMessage(locale, key);
        expect(decoded, `${locale} ${key}`).toContain(resolved);
        expect(resolved, `${locale} ${key}`).not.toBe(key);
      }
      const stripped = decoded.replace(/data-key="[^"]+"/g, "");
      expect(stripped, locale).not.toMatch(RAW_KEY_RE);
    }
  });
});

describe("MEDUI.TRILANG.2 zero-fallback on screenshot chrome", () => {
  it("does not copy EN↔FR↔ES except identical units/cognates", () => {
    for (const key of MEDUI_TRILANG_2_PRODUCTION_SCREENSHOT_KEYS) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      if (!UNIT_OR_COGNATE.has(enVal) && enVal !== frVal) {
        expect(enVal, key).not.toBe(frVal);
      }
      if (!UNIT_OR_COGNATE.has(esVal)) {
        expect(esVal, key).not.toBe(enVal);
        expect(esVal, key).not.toBe(frVal);
      }
    }
  });
});
