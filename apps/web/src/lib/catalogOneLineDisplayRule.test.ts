/**
 * Permanent product rule: one canonical concept = one result row = one primary display line
 * = active language only. Search may inspect aliases. Display never stacks a second language.
 */
import { describe, expect, it } from "vitest";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogResultOneLineDisplay,
  getCatalogSearchItemDisplayLabel,
} from "@/lib/catalogDisplayLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { formatIcd10ServerResolvedOneLineDisplay, existingOrderDisplayLabel, filterEnterpriseOrderSetsForBrowser, searchCanonicalCareProcedures } from "@medora/shared";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

const t = (locale: "en" | "fr" | "es") => (key: string) => i18nMessage(locale, key);

const LISINOPRIL: CatalogSearchItem = {
  id: "med-lis",
  code: "LISINOPRIL_20_MG_TABLET_ORAL",
  type: "MEDICATION",
  displayNameEn: "Lisinopril 20 mg tablet, oral",
  displayNameFr: "Lisinopril 20 mg, comprimé oral",
  secondaryText: "Lisinopril 20 mg, comprimé oral",
  secondaryTextEn: "Lisinopril 20 mg tablet, oral",
  secondaryTextFr: "Lisinopril 20 mg, comprimé oral",
  metadata: { genericName: "Lisinopril", strength: "20 mg", dosageForm: "tablet", route: "oral" },
};

const XR_HIP: CatalogSearchItem = {
  id: "img-hip",
  code: "XR_HIP",
  type: "IMAGING_STUDY",
  displayNameEn: "Hip X-ray",
  displayNameFr: "Radiographie de la hanche",
  secondaryText: "Radiographie de la hanche",
  secondaryTextEn: "XR_HIP",
  secondaryTextFr: "XR_HIP",
};

const UA: CatalogSearchItem = {
  id: "lab-ua",
  code: "UA",
  type: "LAB_TEST",
  displayNameEn: "Urinalysis",
  displayNameFr: "Analyse d'urine",
  secondaryTextEn: "UA",
  secondaryTextFr: "UA",
};

const CASES: CatalogSearchItem[] = [LISINOPRIL, XR_HIP, UA];

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

function secondLanguageHits(item: CatalogSearchItem, locale: "en" | "fr" | "es", text: string): number {
  const others = [
    locale !== "en" ? item.displayNameEn : "",
    locale !== "fr" ? item.displayNameFr : "",
  ].filter(Boolean) as string[];
  return others.filter((label) => label && text === label).length;
}

describe("permanent one-line order display rule", () => {
  it("1 visible lines per canonical order result = 1", () => {
    for (const item of CASES) {
      for (const locale of ["en", "fr", "es"] as const) {
        const view = getCatalogResultOneLineDisplay(item, locale, t(locale));
        expect(view.visibleLines, `${item.code} ${locale}`).toBe(1);
        expect(view.primary.trim().length, `${item.code} ${locale}`).toBeGreaterThan(0);
      }
    }
  });

  it("2 second-language subtitle count = 0", () => {
    for (const item of CASES) {
      for (const locale of ["en", "fr", "es"] as const) {
        const view = getCatalogResultOneLineDisplay(item, locale, t(locale));
        expect(secondLanguageHits(item, locale, view.primary)).toBe(0);
        if (view.metadata) {
          expect(secondLanguageHits(item, locale, view.metadata)).toBe(0);
        }
      }
    }
  });

  it("3 duplicate canonical label count = 0", () => {
    for (const item of CASES) {
      for (const locale of ["en", "fr", "es"] as const) {
        const view = getCatalogResultOneLineDisplay(item, locale, t(locale));
        const full = catalogSearchItemFullDisplayLine(item, locale, t(locale));
        expect(full).not.toBe(`${item.code} · ${item.code}`);
        if (view.metadata) {
          expect(view.metadata).not.toBe(view.primary);
        }
      }
    }
  });

  it("4 duplicate translated/source label count = 0", () => {
    const stacked = getCatalogResultOneLineDisplay(LISINOPRIL, "en", t("en"));
    expect(stacked.primary).not.toBe(LISINOPRIL.displayNameFr);
    expect(stacked.metadata).not.toBe(LISINOPRIL.displayNameFr);
    expect(catalogSearchItemFullDisplayLine(LISINOPRIL, "en", t("en"))).not.toContain(
      "Lisinopril 20 mg, comprimé oral"
    );
  });

  it("5 EN UI contains FR/ES subtitle = 0", () => {
    for (const item of CASES) {
      const view = getCatalogResultOneLineDisplay(item, "en", t("en"));
      expect(view.primary).not.toBe(item.displayNameFr);
      expect(view.metadata ?? "").not.toBe(item.displayNameFr);
      expect(view.primary).not.toMatch(/comprimido|radiografía|análisis de orina/i);
    }
  });

  it("6 FR UI contains EN/ES subtitle = 0", () => {
    for (const item of CASES) {
      const view = getCatalogResultOneLineDisplay(item, "fr", t("fr"));
      expect(view.primary).not.toBe(item.displayNameEn);
      expect(view.metadata ?? "").not.toBe(item.displayNameEn);
      expect(view.primary).not.toMatch(/hip x-ray|complete blood count|comprimido oral/i);
    }
  });

  it("7 ES UI contains EN/FR subtitle = 0", () => {
    for (const item of CASES) {
      const view = getCatalogResultOneLineDisplay(item, "es", t("es"));
      expect(view.primary).not.toBe(item.displayNameEn);
      expect(view.primary).not.toBe(item.displayNameFr);
      expect(view.metadata ?? "").not.toBe(item.displayNameEn);
      expect(view.metadata ?? "").not.toBe(item.displayNameFr);
      expect(catalogSearchItemFullDisplayLine(item, "es", t("es"))).not.toMatch(
        /Hip X-ray|Radiographie de la hanche|Urinalysis|Analyse d'urine|comprimé oral/
      );
    }
  });

  it("8 persisted/reloaded order still renders exactly one line", () => {
    for (const locale of ["en", "fr", "es"] as const) {
      const line = existingOrderDisplayLabel(LISINOPRIL_ORDER, locale);
      expect(line.includes("\n")).toBe(false);
      expect(line.split(" · ").filter((part) => part === "LISINOPRIL_20_MG_TABLET_ORAL").length).toBeLessThan(2);
    }
  });

  it("9 language switch changes the one display line, not the order count", () => {
    const en = existingOrderDisplayLabel(LISINOPRIL_ORDER, "en");
    const fr = existingOrderDisplayLabel(LISINOPRIL_ORDER, "fr");
    const es = existingOrderDisplayLabel(LISINOPRIL_ORDER, "es");
    expect(LISINOPRIL_ORDER.id).toBe("med-lisinopril-1");
    expect(LISINOPRIL_ORDER.items).toHaveLength(1);
    expect(en).not.toBe(fr);
    expect(es).toBe("Lisinopril 20 mg, comprimido oral");
    expect(es).not.toBe(en);
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL, "es")).not.toBe(
      getCatalogSearchItemDisplayLabel(LISINOPRIL, "en")
    );
  });

  it("10 search alias match never creates another visible row", () => {
    const chestEn = filterEnterpriseOrderSetsForBrowser({ query: "chest pain", locale: "en" });
    const chestEs = filterEnterpriseOrderSetsForBrowser({ query: "dolor torácico", locale: "es" });
    const chestFr = filterEnterpriseOrderSetsForBrowser({ query: "douleur thoracique", locale: "fr" });
    const codesEn = chestEn.filter((s) => s.code === "ed_chest_pain_v1");
    const codesEs = chestEs.filter((s) => s.code === "ed_chest_pain_v1");
    const codesFr = chestFr.filter((s) => s.code === "ed_chest_pain_v1");
    expect(codesEn).toHaveLength(1);
    expect(codesEs).toHaveLength(1);
    expect(codesFr).toHaveLength(1);
    const oxygen = searchCanonicalCareProcedures({ q: "oxigenoterapia", locale: "es", limit: 20 });
    expect(new Set(oxygen.map((row) => row.code)).size).toBe(oxygen.length);
    const orderLine = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "MEDICATION",
        catalogMedication: {
          code: "LISINOPRIL_20_MG_TABLET_ORAL",
          displayNameEn: "Lisinopril 20 mg tablet, oral",
          displayNameFr: "Lisinopril 20 mg, comprimé oral",
        },
      },
      "es",
      t("es")
    );
    expect(orderLine).toBe("Lisinopril 20 mg, comprimido oral");
    expect(orderLine).not.toContain("\n");
    const dx = formatIcd10ServerResolvedOneLineDisplay({
      code: "R07.9",
      displayLabel: "Dolor torácico no especificado",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    expect(dx.visibleLines).toBe(1);
    expect(dx.primary).toBe("Dolor torácico no especificado");
    expect(dx.primary).not.toBe("Chest pain, unspecified");
    const unmapped = formatIcd10ServerResolvedOneLineDisplay({
      code: "Z99.89",
      displayLabel: "Z99.89",
      displayResolution: "UNLOCALIZED_CODE",
    });
    expect(unmapped.primary).toBe("Z99.89");
    expect(unmapped.metadata).toBeNull();
  });
});
