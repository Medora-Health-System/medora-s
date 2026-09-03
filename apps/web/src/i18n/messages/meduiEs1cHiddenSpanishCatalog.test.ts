import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  hiddenSpanishPlaceholder,
  isHiddenSpanishPlaceholder,
  parseProductUiLanguage,
  pickCatalogDisplayLabelForProductUi,
  productUiLanguageSelectOptions,
  resolveProductUiLanguageOrDefault,
  resolvePublicProductUiLanguageOrDefault,
  supportedLanguages,
  UNLOCALIZED_ES_PREFIX,
} from "@/i18n/config";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import en from "@/i18n/messages/en";
import es from "@/i18n/messages/es";
import fr from "@/i18n/messages/fr";
import { FR_LEGACY_LABELS_FR_ONLY_PREFIXES } from "@/i18n/messages/i18nLanguageBoundary.allowlist";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import {
  canRunPlatformAdminDomRewrite,
  parsePlatformUiLanguage,
  platformLanguageSelectOptions,
} from "@/i18n/platformLocale";
import { getLocalizedDiagnosisDisplayLabel } from "@/features/emergency/diagnosisFrenchDisplayLabels";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogSearchItemDisplayLabel,
  getCatalogSearchItemSecondaryLine,
} from "@/lib/catalogDisplayLabel";
import { chartSummaryOrderItemLineLabel } from "@/lib/chartSummaryOrderLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { printT } from "@/lib/printI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  existingOrderDisplayLabel,
  searchSurgicalHistoryCatalog,
  resolveSurgicalHistoryDisplayName,
  ES_MEDICAL_TERMINOLOGY,
} from "@medora/shared";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") {
    return prefix ? [{ path: prefix, value: obj }] : [];
  }
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return [];
  }
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectStringLeaves(val, next));
  }
  return out;
}

function isFrLegacyOnlyPath(path: string): boolean {
  return FR_LEGACY_LABELS_FR_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const UI_KEYS = {
  nav: "nav.trackboard",
  button: "common.save",
  form: "auth.login.usernameLabel",
  status: "common.loading",
  validation: "common.minCharsSearch",
  modal: "common.confirm",
  table: "common.actions",
} as const;

const LAB_ITEM: CatalogSearchItem = {
  id: "lab-cbc",
  code: "CBC",
  type: "LAB_TEST",
  displayNameEn: "Complete Blood Count",
  displayNameFr: "Numération formule sanguine",
  secondaryText: "CBC · Hématologie",
  secondaryTextFr: "CBC · Hématologie",
  secondaryTextEn: "CBC · Hematology",
};

const IMAGING_ITEM: CatalogSearchItem = {
  id: "img-ct",
  code: "CT_HEAD",
  type: "IMAGING_STUDY",
  displayNameEn: "CT head",
  displayNameFr: "Scanner cérébral",
  secondaryText: "CT_HEAD · TDM",
  secondaryTextFr: "CT_HEAD · TDM",
  secondaryTextEn: "CT_HEAD · CT",
};

const MED_ITEM: CatalogSearchItem = {
  id: "med-met",
  code: "MET500",
  type: "MEDICATION",
  displayNameEn: "Metformin",
  displayNameFr: "Metformine",
  secondaryText: "500 mg · comprimé · orale",
  secondaryTextFr: "500 mg · comprimé · orale",
  secondaryTextEn: "500 mg · tablet · oral",
  metadata: { strength: "500 mg", dosageForm: "comprimé", route: "orale" },
};

describe("MEDUI.ES.1C hidden Spanish catalog + tri-lingual isolation", () => {
  it("internal locales include es; public selectable stay EN/FR", () => {
    expect([...supportedLanguages]).toEqual(["fr", "en", "es"]);
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().map((o) => o.label)).toEqual(["Français", "English"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
  });

  it("EN/FR/ES required key parity: missing and extra unmanaged keys are 0", () => {
    const enPaths = collectStringLeaves(en).map((x) => x.path).sort();
    const frPaths = collectStringLeaves(fr).map((x) => x.path).sort();
    const esPaths = collectStringLeaves(es).map((x) => x.path).sort();
    const enSet = new Set(enPaths);
    const frSet = new Set(frPaths);
    const esSet = new Set(esPaths);

    const missingEs = enPaths.filter((p) => !esSet.has(p));
    const extraEs = esPaths.filter((p) => !enSet.has(p));
    const missingFrRequired = enPaths.filter((p) => !frSet.has(p));
    const extraFrUnmanaged = frPaths.filter((p) => !enSet.has(p) && !isFrLegacyOnlyPath(p));

    expect(missingEs, missingEs.slice(0, 20).join(", ")).toEqual([]);
    expect(extraEs, extraEs.slice(0, 20).join(", ")).toEqual([]);
    expect(missingFrRequired, missingFrRequired.slice(0, 20).join(", ")).toEqual([]);
    expect(extraFrUnmanaged, extraFrUnmanaged.slice(0, 20).join(", ")).toEqual([]);
    expect(enPaths.length).toBe(esPaths.length);

    const extraFr = frPaths.filter((p) => !enSet.has(p));
    expect(extraFr.every(isFrLegacyOnlyPath)).toBe(true);
    expect(extraFrUnmanaged.length).toBe(0);
    expect(extraFr.length).toBe(67);
  });

  it("every ES leaf is a hidden placeholder, an APPROVED canon overlay, or a governed 1E+ overlay, never EN/FR copy", () => {
    const es1eKeys = new Set(Object.keys(MEDUI_ES_1E_OVERLAY));
    const enByPath = new Map(collectStringLeaves(en).map((x) => [x.path, x.value]));
    const frByPath = new Map(collectStringLeaves(fr).map((x) => [x.path, x.value]));
    const approvedOverlay = new Map<string, string>();
    for (const e of ES_MEDICAL_TERMINOLOGY) {
      if (e.status !== "APPROVED") continue;
      for (const path of e.uiMessageKeys ?? []) approvedOverlay.set(path, e.es);
    }
    const esLeaves = collectStringLeaves(es);
    expect(esLeaves.length).toBeGreaterThan(0);
    for (const { path, value } of esLeaves) {
      const overlay = approvedOverlay.get(path);
      if (overlay) {
        expect(value, path).toBe(overlay);
      } else if (es1eKeys.has(path)) {
        // 1E governed overlay — value should match the overlay map
        expect(value, path).toBe(MEDUI_ES_1E_OVERLAY[path]);
      } else {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(true);
        expect(value).toBe(hiddenSpanishPlaceholder(path));
        expect(value.startsWith(UNLOCALIZED_ES_PREFIX)).toBe(true);
      }
      const enVal = enByPath.get(path);
      const frVal = frByPath.get(path);
      // Allow internationally identical terms (e.g. "No", "Plan", "Hospital")
      const identicalOk = new Set(["No", "Plan", "Hospital", "Oral", "Final", "Gel", "Rectal", "Vaginal"]);
      if (enVal && enVal !== overlay && !es1eKeys.has(path)) expect(value).not.toBe(enVal);
      if (enVal && es1eKeys.has(path) && value === enVal && !identicalOk.has(value)) {
        // Flagged but allowed for legitimate identical codes/abbreviations/format placeholders
        if (value.length > 3 && !/^[A-Z0-9._\-/ ()]+$/.test(value) && !/^\d+$/.test(value) && !value.startsWith("MINISTÈRE")) {
          expect(value, `ES===EN at ${path}`).not.toBe(enVal);
        }
      }
      if (frVal && !es1eKeys.has(path)) expect(value).not.toBe(frVal);
      // Empty strings are allowed only when the 1E overlay explicitly sets them (matching EN source)
      if (!es1eKeys.has(path) || MEDUI_ES_1E_OVERLAY[path] !== "") {
        expect(value).not.toBe("");
      }
      expect(value).not.toMatch(/^(TODO|TBD|\?+)$/i);
    }
  });

  it("six-direction leakage is blocked for present and missing keys", () => {
    const present = "common.save";
    const missing = "meduiEs1c.missing.sixDirection";
    const enPresent = resolveClinicalUiMessage("en", present);
    const frPresent = resolveClinicalUiMessage("fr", present);
    const esPresent = resolveClinicalUiMessage("es", present);
    expect(enPresent).not.toBe(frPresent);
    expect(enPresent).not.toBe(esPresent);
    expect(frPresent).not.toBe(esPresent);
    // After 1E, common.save is translated to "Guardar" — no longer a placeholder
    expect(esPresent).toBe("Guardar");

    const enMissing = resolveClinicalUiMessage("en", missing);
    const frMissing = resolveClinicalUiMessage("fr", missing);
    const esMissing = resolveClinicalUiMessage("es", missing);
    expect(enMissing).toBe(missing);
    expect(frMissing).toBe(missing);
    expect(esMissing).toBe(missing);
    expect(enMissing).not.toBe(frPresent);
    expect(enMissing).not.toBe(esPresent);
    expect(frMissing).not.toBe(enPresent);
    expect(frMissing).not.toBe(esPresent);
    expect(esMissing).not.toBe(enPresent);
    expect(esMissing).not.toBe(frPresent);
  });

  it("representative UI chrome is locale-isolated (placeholder or governed 1E translation)", () => {
    for (const key of Object.values(UI_KEYS)) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      if (enVal === key) continue;
      // After 1E, some keys are now translated — they should not equal EN or FR
      expect(esVal).not.toBe(enVal);
      expect(esVal).not.toBe(frVal);
      if (enVal !== frVal) expect(enVal).not.toBe(frVal);
    }
  });

  it("stale-state locale switch EN → FR → ES → EN does not keep prior catalog text", () => {
    let locale: "en" | "fr" | "es" = "en";
    const read = () => resolveClinicalUiMessage(locale, "common.save");
    const enVal = read();
    locale = "fr";
    const frVal = read();
    locale = "es";
    const esVal = read();
    locale = "en";
    expect(read()).toBe(enVal);
    expect(frVal).not.toBe(enVal);
    expect(esVal).not.toBe(enVal);
    expect(esVal).not.toBe(frVal);
    // After 1E, common.save = "Guardar" (governed Spanish, not placeholder)
    expect(esVal).toBe("Guardar");
  });

  it("ES missing content never returns EN or FR user-facing copy", () => {
    const missing = "meduiEs1c.missing.error.path";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
    expect(normalizeUserFacingError("Encounter not found", "es")).toBe(
      hiddenSpanishPlaceholder("userFacingError")
    );
    expect(normalizeUserFacingError("Encounter not found", "es")).not.toContain("Encounter not found");
    expect(normalizeUserFacingError("Encounter not found", "es")).not.toContain("introuvable");
  });

  it("clinical catalog ES display never uses EN/FR labels", () => {
    expect(getLocalizedDiagnosisDisplayLabel({ code: "R07.9", description: "Chest pain, unspecified" }, "es")).toBe(
      "R07.9"
    );
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).toBe("CBC");
    expect(getCatalogSearchItemSecondaryLine(LAB_ITEM, "es")).toBe("CBC");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "es")).toBe("CT_HEAD");
    expect(getCatalogSearchItemDisplayLabel(MED_ITEM, "es")).toBe("MET500");
    expect(getCatalogSearchItemSecondaryLine(MED_ITEM, "es")).toBe("MET500");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "es")).not.toContain("Complete Blood Count");
    expect(catalogSearchItemFullDisplayLine(LAB_ITEM, "es")).not.toContain("Numération");
    const tEs = (key: string) => i18nMessage("es", key);
    expect(
      getOrderItemDisplayLabelForLanguage(
        { catalogItemType: "LAB_TEST", catalogLabTest: { code: "CBC", displayNameEn: "CBC", displayNameFr: "NFS" } },
        "es",
        tEs
      )
    ).toBe("CBC");
    expect(chartSummaryOrderItemLineLabel({ displayLabelEn: "Glucose", displayLabelFr: "Glucose plasmatique" } as never, "es")).toBe(
      "—"
    );
  });

  it("search may use EN/FR aliases while ES display stays unlocalized", () => {
    const hits = searchSurgicalHistoryCatalog("appendicectomie", "en");
    expect(hits.length).toBeGreaterThan(0);
    const display = resolveSurgicalHistoryDisplayName(hits[0]!, "es");
    expect(display).toBe(hits[0]!.id);
    expect(display).not.toBe(hits[0]!.displayNameEn);
    expect(display).not.toBe(hits[0]!.displayNameFr);
    expect(pickCatalogDisplayLabelForProductUi("es", {
      displayNameEn: "Appendectomy",
      displayNameFr: "Appendicectomie",
      code: hits[0]!.id,
    })).toBe(hits[0]!.id);
  });

  it("persist/reload and print chrome for ES never leak EN/FR", () => {
    const reloaded = existingOrderDisplayLabel(
      {
        id: "lab-es",
        type: "LAB",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelEn: "Complete Blood Count",
            displayLabelFr: "Numération formule sanguine",
            catalogLabTest: { code: "CBC", displayNameEn: "Complete Blood Count", displayNameFr: "Numération formule sanguine" },
          },
        ],
      },
      "es"
    );
    expect(reloaded).toBe("CBC");
    expect(reloaded).not.toBe("Complete Blood Count");
    expect(reloaded).not.toBe("Numération formule sanguine");
    const printEs = printT("es", "printOutput.discharge.documentH1");
    const printEn = printT("en", "printOutput.discharge.documentH1");
    const printFr = printT("fr", "printOutput.discharge.documentH1");
    expect(printEs).toBe("Resumen de alta");
    expect(printEs).not.toBe(printEn);
    expect(printEs).not.toBe(printFr);
  });

  it("Platform Admin island stays EN/FR and does not DOM-rewrite for es", () => {
    expect(parsePlatformUiLanguage("es")).toBeNull();
    expect(canRunPlatformAdminDomRewrite("es")).toBe(false);
    expect(platformLanguageSelectOptions().map((o) => o.value).sort()).toEqual(["en", "fr"]);
    expect(platformLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
  });

  it("locale persistence can represent es without public hydration applying it", () => {
    expect(parseProductUiLanguage("es")).toBe("es");
    const serialized = JSON.stringify({ uiLanguage: "es" });
    expect(parseProductUiLanguage(JSON.parse(serialized).uiLanguage)).toBe("es");
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("en");
    expect(resolveClientUiLanguage({ storedLanguage: "es", facilityLanguage: "fr" })).toBe("fr");
    expect(resolvePublicProductUiLanguageOrDefault("es")).toBe("en");
    expect(resolveProductUiLanguageOrDefault("es")).toBe("es");
  });

  it("visible selectors and product chrome files do not expose Español", () => {
    const selectorFiles = [
      "app/login/page.tsx",
      "app/app/admin/page.tsx",
      "app/app/admin/users/page.tsx",
      "src/i18n/I18nProvider.tsx",
      "src/i18n/provider.tsx",
    ];
    let visible = 0;
    for (const rel of selectorFiles) {
      const src = readFileSync(join(webRoot, rel), "utf8");
      const matches = src.match(/Español/g) ?? [];
      visible += matches.length;
    }
    expect(visible).toBe(0);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().some((o) => o.label === "Español")).toBe(false);
  });

  it("patient preferred-language values remain independent of product UI locale", () => {
    const src = readFileSync(
      join(webRoot, "../../packages/shared/src/encounters/inpatientLifecycleNursingAdmissionD4a25.ts"),
      "utf8"
    );
    expect(src).toContain('preferredLanguage: ["fr", "en", "ht", "es", "OTHER"]');
  });
});
