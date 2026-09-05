/**
 * MEDUI.LOCALE.P0 — facility language switch end-to-end contract.
 *
 * Exercises the production hydration path used by I18nProvider
 * (`hydrateProductUiLanguage`), not a standalone `resolveProductUiLanguageOrDefault`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { getCatalogResultOneLineDisplay } from "@/lib/catalogDisplayLabel";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  clearRuntimeFacilityUiLanguage,
  FACILITY_UI_LANGUAGE_STORAGE_KEY,
  hydrateProductUiLanguage,
  persistFacilityUiLanguage,
  readActiveFacilityLanguage,
  readRuntimeFacilityUiLanguage,
  readStoredUiLanguageRaw,
  resolveClientUiLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from "@/i18n/resolveClientUiLanguage";
import { readStoredUiLanguage } from "@/i18n/readStoredUiLanguage";
import {
  existingOrderDisplayLabel,
  filterEnterpriseOrderSetsForBrowser,
  resolveEnterpriseOrderSetDisplayName,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readWeb(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
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

const SENTINEL_KEY = "adminHub.useThisFacility";
const SENTINEL = {
  en: "Use this facility",
  fr: "Utiliser cet établissement",
  es: "Usar este establecimiento",
} as const;

const LISINOPRIL: CatalogSearchItem = {
  id: "med-lis",
  code: "LISINOPRIL_20_MG_TABLET_ORAL",
  type: "MEDICATION",
  displayNameEn: "Lisinopril 20 mg tablet, oral",
  displayNameFr: "Lisinopril 20 mg, comprimé oral",
  metadata: { genericName: "Lisinopril", strength: "20 mg", dosageForm: "tablet", route: "oral" },
};

const XR_HIP: CatalogSearchItem = {
  id: "img-hip",
  code: "XR_HIP",
  type: "IMAGING_STUDY",
  displayNameEn: "Hip X-ray",
  displayNameFr: "Radiographie de la hanche",
};

const UA: CatalogSearchItem = {
  id: "lab-ua",
  code: "UA",
  type: "LAB_TEST",
  displayNameEn: "Urinalysis",
  displayNameFr: "Analyse d'urine",
};

const LISINOPRIL_ORDER = {
  id: "med-lisinopril-1",
  type: "MEDICATION",
  items: [
    {
      catalogItemType: "MEDICATION",
      displayLabelEn: "Lisinopril 20 mg tablet, oral",
      displayLabelFr: "Lisinopril 20 mg, comprimé oral",
      catalogMedication: {
        code: "LISINOPRIL_20_MG_TABLET_ORAL",
        name: "Lisinopril",
        displayNameEn: "Lisinopril 20 mg tablet, oral",
        displayNameFr: "Lisinopril 20 mg, comprimé oral",
      },
    },
  ],
};

const FACILITY_ROLES = [
  { facilityId: "facility-en", defaultLanguage: "en" },
  { facilityId: "facility-fr", defaultLanguage: "fr" },
  { facilityId: "facility-es", defaultLanguage: "es" },
];

describe("MEDUI.LOCALE.P0 facility language switch", () => {
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

  it("FACILITY LANGUAGE SWITCH END-TO-END CONTRACT", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "en");

    const activate = (facilityId: string) => {
      const lang = readActiveFacilityLanguage(FACILITY_ROLES, facilityId);
      return hydrateProductUiLanguage(lang);
    };

    expect(activate("facility-en")).toBe("en");
    expect(resolveClinicalUiMessage("en", SENTINEL_KEY)).toBe(SENTINEL.en);

    expect(activate("facility-fr")).toBe("fr");
    expect(resolveClinicalUiMessage("fr", SENTINEL_KEY)).toBe(SENTINEL.fr);
    expect(resolveClinicalUiMessage("fr", SENTINEL_KEY)).not.toBe(SENTINEL.en);

    expect(activate("facility-es")).toBe("es");
    expect(resolveClinicalUiMessage("es", SENTINEL_KEY)).toBe(SENTINEL.es);
    expect(resolveClinicalUiMessage("es", SENTINEL_KEY)).not.toBe(SENTINEL.en);
    expect(resolveClinicalUiMessage("es", SENTINEL_KEY)).not.toBe(SENTINEL.fr);

    persistFacilityUiLanguage("es");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(FACILITY_ROLES, "facility-es"))).toBe("es");

    expect(activate("facility-en")).toBe("en");
  });

  it("hydrates through I18nProvider production path, not resolveProductUiLanguageOrDefault", () => {
    const provider = readWeb("src/i18n/provider.tsx");
    expect(provider).toContain("hydrateProductUiLanguage");
    expect(provider).toContain("applyFacilityLanguage");
    expect(provider).toContain("I18nFacilityLanguageBridge");
    expect(provider).not.toContain("resolveProductUiLanguageOrDefault");
    expect(provider).not.toContain("setLanguageState(facilityLanguage)");
  });

  it("active facility language is consumed by the locale provider dependency chain", () => {
    const layout = readWeb("app/app/layout.tsx");
    expect(layout).toContain("readActiveFacilityLanguage");
    expect(layout).toContain("I18nFacilityLanguageBridge");
    expect(layout).toContain("facilityLanguage={facilityLanguage}");
    expect(layout).not.toContain("<I18nProvider facilityLanguage");
    const provider = readWeb("src/i18n/provider.tsx");
    expect(provider).toContain("[sessionFacilityLanguage]");
    expect(provider).toContain("hydrateProductUiLanguage(sessionFacilityLanguage)");
  });

  it("same-facility language update follows session defaultLanguage", () => {
    const rapidCity = [{ facilityId: "rapid-city", defaultLanguage: "en" }];
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(rapidCity, "rapid-city"))).toBe("en");
    rapidCity[0]!.defaultLanguage = "es";
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(rapidCity, "rapid-city"))).toBe("es");
    rapidCity[0]!.defaultLanguage = "fr";
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(rapidCity, "rapid-city"))).toBe("fr");
    rapidCity[0]!.defaultLanguage = "en";
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(rapidCity, "rapid-city"))).toBe("en");
  });

  it("stale cookie/localStorage/session English cannot override active facility ES/FR", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "en");
    storage.setItem(FACILITY_UI_LANGUAGE_STORAGE_KEY, "en");
    expect(hydrateProductUiLanguage("es")).toBe("es");
    expect(readRuntimeFacilityUiLanguage()).toBe("es");
    expect(readStoredUiLanguage()).toBe("es");
    expect(readStoredUiLanguageRaw()).toBe("en");

    expect(hydrateProductUiLanguage("fr")).toBe("fr");
    expect(readStoredUiLanguage()).toBe("fr");
  });

  it("stale Spanish localStorage cannot override active facility French", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "es");
    expect(hydrateProductUiLanguage("fr")).toBe("fr");
  });

  it("stale French session locale cannot override active facility English", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "fr");
    expect(hydrateProductUiLanguage("en")).toBe("en");
  });

  it("cross-facility isolation Rapid City ES / Wayne EN / Sainte Croix FR", () => {
    const roles = [
      { facilityId: "rapid-city", defaultLanguage: "es" },
      { facilityId: "wayne", defaultLanguage: "en" },
      { facilityId: "sainte-croix", defaultLanguage: "fr" },
    ];
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "en");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(roles, "rapid-city"))).toBe("es");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(roles, "wayne"))).toBe("en");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(roles, "sainte-croix"))).toBe("fr");
    expect(hydrateProductUiLanguage(readActiveFacilityLanguage(roles, "rapid-city"))).toBe("es");
  });

  it("login stored language still applies when no active facility is known", () => {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, "fr");
    expect(hydrateProductUiLanguage(undefined)).toBe("fr");
    expect(readRuntimeFacilityUiLanguage()).toBeNull();
  });

  it("Platform Admin cookie key is not read by the clinical resolver", () => {
    const clinical = readWeb("src/i18n/resolveClientUiLanguage.ts");
    const platform = readWeb("src/i18n/I18nProvider.tsx");
    expect(clinical).not.toMatch(/document\.cookie/);
    expect(clinical).not.toContain("medora.locale");
    expect(platform).toContain('const STORAGE = "medora.locale"');
    expect(platform).toContain("document.cookie = `medora_locale=");
  });

  it("Use this facility uses the server-owned switch, not a readable-cookie-only write", () => {
    const admin = readWeb("app/app/admin/page.tsx");
    expect(admin).toContain("switchActiveFacility");
    expect(admin).toContain("invalidateAuthMeSessionCache");
    expect(admin).not.toMatch(/document\.cookie = `medora_facility_id=/);
  });

  it("clinical catalog one-line labels follow the hydrated facility locale", () => {
    const t = (locale: "en" | "fr" | "es") => (key: string) => resolveClinicalUiMessage(locale, key);

    const en = hydrateProductUiLanguage("en");
    const lisEn = getCatalogResultOneLineDisplay(LISINOPRIL, en, t(en));
    expect(lisEn.primary).toBe("Lisinopril 20 mg tablet, oral");
    expect(lisEn.visibleLines).toBe(1);

    const fr = hydrateProductUiLanguage("fr");
    const lisFr = getCatalogResultOneLineDisplay(LISINOPRIL, fr, t(fr));
    expect(lisFr.primary).toBe("Lisinopril 20 mg, comprimé oral");
    expect(lisFr.visibleLines).toBe(1);

    const es = hydrateProductUiLanguage("es");
    const lisEs = getCatalogResultOneLineDisplay(LISINOPRIL, es, t(es));
    expect(lisEs.primary).toBe("Lisinopril 20 mg, comprimido oral");
    expect(lisEs.visibleLines).toBe(1);

    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "en")).toBe("Lisinopril 20 mg tablet, oral");
    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "fr")).toBe("Lisinopril 20 mg, comprimé oral");
    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "es")).toBe("Lisinopril 20 mg, comprimido oral");
    expect(LISINOPRIL_ORDER.id).toBe("med-lisinopril-1");

    for (const locale of ["en", "fr", "es"] as const) {
      const hip = getCatalogResultOneLineDisplay(XR_HIP, locale, t(locale));
      const ua = getCatalogResultOneLineDisplay(UA, locale, t(locale));
      expect(hip.primary.length).toBeGreaterThan(0);
      expect(ua.primary.length).toBeGreaterThan(0);
      expect(hip.primary).not.toContain(" · ");
      expect(ua.primary).not.toContain(" · ");
    }

    const chestEn = filterEnterpriseOrderSetsForBrowser({ query: "chest pain", locale: "en" }).filter(
      (s) => s.code === "ed_chest_pain_v1"
    );
    const chestFr = filterEnterpriseOrderSetsForBrowser({ query: "douleur thoracique", locale: "fr" }).filter(
      (s) => s.code === "ed_chest_pain_v1"
    );
    const chestEs = filterEnterpriseOrderSetsForBrowser({ query: "dolor torácico", locale: "es" }).filter(
      (s) => s.code === "ed_chest_pain_v1"
    );
    expect(chestEn).toHaveLength(1);
    expect(chestFr).toHaveLength(1);
    expect(chestEs).toHaveLength(1);
    expect(resolveEnterpriseOrderSetDisplayName(chestEn[0]!, "en")).not.toBe(
      resolveEnterpriseOrderSetDisplayName(chestEs[0]!, "es")
    );
  });
});
