/**
 * MEDUI.TRILANG.1 — Clinical catalog + ordering tri-lingual certification.
 * Search may inspect EN/FR/ES aliases. Display is active locale only.
 */
import { describe, expect, it } from "vitest";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogSearchItemDisplayLabel,
} from "@/lib/catalogDisplayLabel";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { selectableDxPrimaryFromGovernedMaps } from "@/components/diagnosis/icd10SelectableDisplayTestUtil";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  CLINICAL_CATALOG_ES_IMAGING,
  CLINICAL_CATALOG_ES_LAB,
  CLINICAL_CATALOG_ES_MEDICATION,
  CLINICAL_CATALOG_ES_ORDER_SET,
  CLINICAL_CATALOG_ES_ORDER_SET_ITEM,
  CLINICAL_CATALOG_ES_PROCEDURE,
  MK_EXPANSION_WAVE2_SPECIALTY_PACKS,
  activeEnterpriseOrderSets,
  allEnterpriseOrderSetItems,
  composeImagingDisplayEs,
  composeMedicationDisplayEs,
  existingOrderDisplayLabel,
  filterEnterpriseOrderSetsForBrowser,
  isHiddenSpanishPlaceholder,
  lookupGovernedCatalogEsLabel,
  resolveEnterpriseOrderSetDisplayName,
  resolveEnterpriseOrderSetItemDisplayName,
  resolveFluidOrderEntryTypeDisplay,
  resolveMkExpansionWave2PackTitle,
  resolveSurgicalHistoryDisplayName,
  searchCanonicalCareProcedures,
  searchSurgicalHistoryCatalog,
  FLUID_ORDER_ENTRY_TYPE_OPTIONS,
  SURGICAL_HISTORY_CATALOG,
  VACCINE_MANUFACTURER_CATALOG,
  resolveVaccineManufacturerDisplay,
  buildVaccineAdministrationAuditNote,
  vaccineAdministrationNoteIsMonolingual,
  sanitizeMarAdministrationVisibleNote,
  serializeVaccineAdministrationDocumentationForMarNotes,
  buildTdapVaccineAdministrationNote,
  tdapNoteIsMonolingual,
  pickLegacyBilingualStoredPair,
  sampleCompleteTdapVaccineAdministrationForm,
  buildMarInjectionSiteNoteLine,
  type VaccineAdministrationDocumentation,
} from "@medora/shared";
import es from "./es";
import { MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY } from "./meduiTrilang1ClinicalChromeOverlay";

const tEs = (key: string) => i18nMessage("es", key);
const EN_LEAK_IN_ES =
  /\b(x-ray|lower extremity|upper extremity|with iv contrast|without iv contrast|emptying study|chest pain \(rn|copd exacerbation|asthma exacerbation)\b/i;

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

const LAB_ITEM: CatalogSearchItem = {
  id: "lab-cbc",
  code: "CBC",
  type: "LAB_TEST",
  displayNameEn: "Complete Blood Count",
  displayNameFr: "Numération formule sanguine",
  secondaryText: "CBC",
  secondaryTextEn: "CBC · Hematology",
  secondaryTextFr: "CBC · Hématologie",
};

const IMAGING_ITEM: CatalogSearchItem = {
  id: "img-hip",
  code: "XR_HIP",
  type: "IMAGING_STUDY",
  displayNameEn: "Hip X-ray",
  displayNameFr: "Radiographie de la hanche",
  secondaryText: "XR_HIP",
  secondaryTextEn: "XR_HIP",
  secondaryTextFr: "XR_HIP",
};

const MED_ITEM: CatalogSearchItem = {
  id: "med-lis",
  code: "LISINOPRIL_20_MG_TABLET_ORAL",
  type: "MEDICATION",
  displayNameEn: "Lisinopril",
  displayNameFr: "Lisinopril",
  secondaryText: "20 mg",
  secondaryTextEn: "20 mg · tablet · oral",
  secondaryTextFr: "20 mg · comprimé · orale",
  metadata: { genericName: "Lisinopril", strength: "20 mg", dosageForm: "tablet", route: "oral" },
};

const CBC_ORDER = {
  id: "lab-1",
  type: "LAB",
  items: [
    {
      catalogItemType: "LAB_TEST",
      displayLabelEn: "Complete Blood Count",
      displayLabelFr: "Numération formule sanguine",
      catalogLabTest: {
        code: "CBC",
        displayNameEn: "Complete Blood Count",
        displayNameFr: "Numération formule sanguine",
      },
    },
  ],
};

describe("MEDUI.TRILANG.1 display contract", () => {
  it("A active-locale-only catalog display", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "en")).toBe("Complete Blood Count");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "fr")).toBe("Numération formule sanguine");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).toBe("Hemograma completo");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "en")).toBe("Hip X-ray");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "fr")).toBe("Radiographie de la hanche");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "es")).toBe("Radiografía de cadera");
    expect(getCatalogSearchItemDisplayLabel(MED_ITEM, "es")).toBe("Lisinopril 20 mg, comprimido oral");
    expect(getCatalogSearchItemDisplayLabel(MED_ITEM, "en")).toContain("Lisinopril");
  });

  it("B multilingual search aliases do not change display locale", () => {
    expect(lookupGovernedCatalogEsLabel("LAB_TEST", "UA")).toBe("Análisis de orina");
    expect(lookupGovernedCatalogEsLabel("LAB_TEST", "TROPONIN")).toBe("Troponina");
    expect(lookupGovernedCatalogEsLabel("IMAGING_STUDY", "XR_HIP")).toBe("Radiografía de cadera");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).not.toBe(LAB_ITEM.displayNameEn);
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).not.toBe(LAB_ITEM.displayNameFr);
  });

  it("C/D one canonical item = one row; maps have unique keys", () => {
    for (const map of [
      CLINICAL_CATALOG_ES_LAB,
      CLINICAL_CATALOG_ES_IMAGING,
      CLINICAL_CATALOG_ES_PROCEDURE,
      CLINICAL_CATALOG_ES_MEDICATION,
      CLINICAL_CATALOG_ES_ORDER_SET,
      CLINICAL_CATALOG_ES_ORDER_SET_ITEM,
    ]) {
      const keys = Object.keys(map);
      expect(new Set(keys).size).toBe(keys.length);
    }
    const chest = filterEnterpriseOrderSetsForBrowser({ query: "chest", locale: "es" });
    const codes = chest.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    const procedures = searchCanonicalCareProcedures({ q: "oxygen", locale: "es", limit: 25 });
    expect(new Set(procedures.map((p) => p.code)).size).toBe(procedures.length);
  });

  it("E no EN/FR leakage in ES catalog display", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "es")).not.toMatch(/Complete Blood Count|Numération/);
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "es")).not.toMatch(/Hip X-ray|Radiographie/);
    expect(catalogSearchItemFullDisplayLine(MED_ITEM, "es")).not.toContain(" · Lisinopril 20 mg, comprimido oral");
    expect(catalogSearchItemFullDisplayLine(IMAGING_ITEM, "es")).not.toBe("XR_HIP · XR_HIP");
    for (const [code, label] of Object.entries(CLINICAL_CATALOG_ES_IMAGING)) {
      expect(label, code).not.toMatch(EN_LEAK_IN_ES);
      expect(label, code).not.toBe(code);
    }
    for (const [code, label] of Object.entries(CLINICAL_CATALOG_ES_ORDER_SET)) {
      expect(label, code).not.toBe(code);
      expect(label, code).not.toMatch(/RN Standing|COPD Exacerbation|Asthma Exacerbation/);
    }
  });

  it("F/G FR and EN stay isolated from ES overlays", () => {
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "fr")).toBe("Numération formule sanguine");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "en")).toBe("Complete Blood Count");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "fr")).not.toBe("Hemograma completo");
    expect(getCatalogSearchItemDisplayLabel(LAB_ITEM, "en")).not.toBe("Hemograma completo");
  });

  it("H/I/J no visible UNLOCALIZED_ES, UNLOCALIZED_SOURCE, or raw keys in P0 clinical chrome", () => {
    for (const family of [
      "clinicalSafetyGuardrails",
      "providerDischargeDocumentation19Y",
      "medicationKnowledgeExpansionWave2",
      "facilityIdentityD4c7i",
      "facilityServiceConfigD4c9",
    ]) {
      const leaves = collectLeaves((es as Record<string, unknown>)[family], family);
      expect(leaves.length, family).toBeGreaterThan(0);
      for (const { path, value } of leaves) {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
        expect(value, path).not.toContain("UNLOCALIZED_SOURCE");
        expect(value, path).not.toBe(path);
      }
    }
    expect(i18nMessage("es", "clinicalSafetyGuardrails.latestVitalsTitle")).toBe("Últimos signos vitales");
    expect(i18nMessage("es", "providerDischargeDocumentation19Y.sectionTitle")).toBe(
      "Documentación de alta"
    );
  });

  it("K persist/reload identity; L language switch does not duplicate the order", () => {
    expect(existingOrderDisplayLabel(CBC_ORDER, "en")).toBe("Complete Blood Count");
    expect(existingOrderDisplayLabel(CBC_ORDER, "fr")).toBe("Numération formule sanguine");
    expect(existingOrderDisplayLabel(CBC_ORDER, "es")).toBe("Hemograma completo");
    expect(CBC_ORDER.items[0]?.catalogLabTest?.code).toBe("CBC");
    const hip = {
      id: "img-1",
      type: "IMAGING",
      items: [
        {
          catalogItemType: "IMAGING_STUDY",
          displayLabelEn: "Hip X-ray",
          displayLabelFr: "Radiographie de la hanche",
          catalogImagingStudy: {
            code: "XR_HIP",
            displayNameEn: "Hip X-ray",
            displayNameFr: "Radiographie de la hanche",
          },
        },
      ],
    };
    expect(existingOrderDisplayLabel(hip, "es")).toBe("Radiografía de cadera");
    expect(existingOrderDisplayLabel(hip, "en")).toBe("Hip X-ray");
    expect(hip.items[0]?.catalogImagingStudy?.code).toBe("XR_HIP");
  });

  it("M order-set titles and items are localized; internal IDs are not primary", () => {
    const chest = activeEnterpriseOrderSets().find((s) => s.code === "ed_chest_pain_v1");
    expect(chest).toBeTruthy();
    expect(resolveEnterpriseOrderSetDisplayName(chest!, "en")).not.toBe("ed_chest_pain_v1");
    expect(resolveEnterpriseOrderSetDisplayName(chest!, "fr")).not.toBe("ed_chest_pain_v1");
    expect(resolveEnterpriseOrderSetDisplayName(chest!, "es")).toBe("Dolor torácico — Urgencias");
    expect(resolveEnterpriseOrderSetDisplayName(chest!, "es")).not.toMatch(/ed_chest_pain/);
    const items = allEnterpriseOrderSetItems(chest!);
    expect(items.length).toBeGreaterThan(0);
    const uniqueKeys = new Set(items.map((item) => item.key));
    expect(uniqueKeys.size).toBe(items.length);
    for (const item of items) {
      const esLabel = resolveEnterpriseOrderSetItemDisplayName(item, "es");
      expect(esLabel).not.toBe(item.key);
      expect(esLabel).not.toMatch(EN_LEAK_IN_ES);
    }
  });

  it("N/O clinicalSafetyGuardrails and providerDischargeDocumentation chrome complete", () => {
    const overlayKeys = Object.keys(MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY);
    expect(overlayKeys.filter((k) => k.startsWith("clinicalSafetyGuardrails.")).length).toBe(5);
    expect(
      overlayKeys.filter((k) => k.startsWith("providerDischargeDocumentation19Y.")).length
    ).toBeGreaterThan(40);
    for (const [path, value] of Object.entries(MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY)) {
      expect(i18nMessage("es", path), path).toBe(value);
    }
  });

  it("P medication taxonomy is localized under ES", () => {
    const expected: Record<string, string> = {
      CARDIOLOGY: "Cardiología / reanimación",
      PULMONARY: "Neumología / vía aérea",
      NEUROLOGY: "Neurología",
      INFECTIOUS_DISEASE: "Enfermedades infecciosas",
      TRAUMA: "Trauma / hemostasia",
      TOXICOLOGY: "Toxicología / antídotos",
      ENDOCRINE: "Endocrinología / electrolitos",
      OB: "Obstetricia",
    };
    for (const pack of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
      const esTitle = resolveMkExpansionWave2PackTitle(pack, "es");
      expect(esTitle).not.toBe(pack.packKey);
      expect(esTitle).not.toMatch(
        /^(CARDIOLOGY|PULMONARY|NEUROLOGY|INFECTIOUS_DISEASE|TRAUMA|TOXICOLOGY|ENDOCRINE|OB)$/
      );
      expect(esTitle).not.toMatch(/Infectious Disease|Toxicology|Endocrine|^Cardiology$|^Pulmonary$/i);
    }
    for (const [packKey, label] of Object.entries(expected)) {
      const pack = MK_EXPANSION_WAVE2_SPECIALTY_PACKS.find((p) => p.packKey === packKey);
      expect(resolveMkExpansionWave2PackTitle(pack!, "es")).toBe(label);
    }
    expect(i18nMessage("es", "medicationKnowledgeExpansionWave2.packAll")).toBe("Todos");
    expect(i18nMessage("es", "medicationKnowledgeExpansionWave2.packAll")).not.toBe("All");
  });

  it("Q adminHub and publicHealthSummary have no sentinels", () => {
    for (const family of ["adminHub", "publicHealthSummary"]) {
      const leaves = collectLeaves((es as Record<string, unknown>)[family], family);
      expect(leaves.length, family).toBeGreaterThan(0);
      for (const { path, value } of leaves) {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(false);
        expect(value, path).not.toContain("UNLOCALIZED_SOURCE");
        expect(value, path).not.toBe(path);
        expect(value, path).not.toMatch(/^UNLOCALIZED_ES::/);
      }
    }
    expect(i18nMessage("es", "adminHub.title")).toBe("Centro de administración");
    expect(i18nMessage("es", "publicHealthSummary.pageTitle")).toBe("Resumen de salud pública");
  });
});

describe("MEDUI.TRILANG.1 catalog coverage + search", () => {
  it("reports reachable catalog counts with no missing ES overlay values", () => {
    expect(Object.keys(CLINICAL_CATALOG_ES_LAB).length).toBe(68);
    expect(Object.keys(CLINICAL_CATALOG_ES_IMAGING).length).toBe(214);
    expect(Object.keys(CLINICAL_CATALOG_ES_PROCEDURE).length).toBe(55);
    expect(Object.keys(CLINICAL_CATALOG_ES_MEDICATION).length).toBe(254);
    expect(Object.keys(CLINICAL_CATALOG_ES_ORDER_SET).length).toBe(66);
    expect(Object.keys(CLINICAL_CATALOG_ES_ORDER_SET_ITEM).length).toBe(117);
    expect(activeEnterpriseOrderSets().length).toBeGreaterThan(50);
    for (const [code, label] of Object.entries(CLINICAL_CATALOG_ES_LAB)) {
      expect(label.trim(), code).not.toBe("");
    }
    for (const [code, label] of Object.entries(CLINICAL_CATALOG_ES_PROCEDURE)) {
      expect(label.trim(), code).not.toBe("");
      expect(label, code).not.toBe(code);
    }
  });

  it("specialty packs are Spanish under ES and never CARDIOLOGY as UI", () => {
    for (const pack of MK_EXPANSION_WAVE2_SPECIALTY_PACKS) {
      const esTitle = resolveMkExpansionWave2PackTitle(pack, "es");
      expect(esTitle).not.toBe(pack.packKey);
      expect(esTitle).not.toMatch(/Infectious Disease|Toxicology|Endocrine|Cardiology|Pulmonary|Psychiatry \/ withdrawal/i);
    }
    const cardio = MK_EXPANSION_WAVE2_SPECIALTY_PACKS.find((p) => p.packKey === "CARDIOLOGY");
    expect(resolveMkExpansionWave2PackTitle(cardio!, "es")).toBe("Cardiología / reanimación");
  });

  it("diagnoses, order chrome, and composed medication identity", () => {
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R07.9", description: "Chest pain, unspecified" }, "es")).toBe(
      "Dolor torácico no especificado"
    );
    expect(
      getOrderItemDisplayLabelForLanguage(
        { catalogItemType: "LAB_TEST", catalogLabTest: { code: "CBC", displayNameEn: "CBC", displayNameFr: "NFS" } },
        "es",
        tEs
      )
    ).toBe("Hemograma completo");
    expect(
      composeMedicationDisplayEs({
        genericName: "Amlodipine",
        strength: "5 mg",
        dosageForm: "tablet",
        route: "oral",
      })
    ).toBe("Amlodipino 5 mg, comprimido oral");
    expect(composeImagingDisplayEs("XR_HIP")).toBe("Radiografía de cadera");
    expect(composeImagingDisplayEs("CT_HEAD")).toBe("TC de cráneo");
  });

  it("French/Spanish search terms still yield one canonical concept", () => {
    const pain = filterEnterpriseOrderSetsForBrowser({ query: "dolor torácico", locale: "es" });
    expect(pain.some((s) => s.code === "ed_chest_pain_v1")).toBe(true);
    expect(new Set(pain.map((s) => s.code)).size).toBe(pain.length);
    const oxygen = searchCanonicalCareProcedures({ q: "oxigenoterapia", locale: "es", limit: 10 });
    expect(oxygen.some((row) => row.code === "oxygen_therapy")).toBe(true);
    expect(new Set(oxygen.map((row) => row.code)).size).toBe(oxygen.length);
  });

  it("surgical history, fluids, and manufacturer identity are active-locale-only", () => {
    const hits = searchSurgicalHistoryCatalog("apendicectomia", "es");
    expect(hits.some((h) => h.id === "appendectomy")).toBe(true);
    expect(new Set(hits.map((h) => h.id)).size).toBe(hits.length);
    expect(resolveSurgicalHistoryDisplayName(hits.find((h) => h.id === "appendectomy")!, "es")).toBe(
      "Apendicectomía"
    );
    expect(resolveSurgicalHistoryDisplayName(hits.find((h) => h.id === "appendectomy")!, "en")).toBe(
      "Appendectomy"
    );
    expect(SURGICAL_HISTORY_CATALOG.length).toBe(11);
    for (const entry of SURGICAL_HISTORY_CATALOG) {
      const esLabel = resolveSurgicalHistoryDisplayName(entry, "es");
      expect(esLabel).not.toBe(entry.id);
      expect(esLabel).not.toBe(entry.displayNameEn);
      if (entry.displayNameEn !== entry.displayNameFr) {
        expect(esLabel).not.toBe(entry.displayNameFr);
      }
    }
    const ns = FLUID_ORDER_ENTRY_TYPE_OPTIONS.find((o) => o.code === "NS")!;
    expect(resolveFluidOrderEntryTypeDisplay(ns, "es")).toBe("Cloruro de sodio 0,9 % (NS)");
    expect(resolveFluidOrderEntryTypeDisplay(ns, "es")).not.toBe("UNLOCALIZED_SOURCE");
    expect(resolveFluidOrderEntryTypeDisplay(ns, "en")).toBe("Normal Saline / NS");
    const unknownMfr = VACCINE_MANUFACTURER_CATALOG.find((m) => m.id === "unknown")!;
    expect(resolveVaccineManufacturerDisplay(unknownMfr, "es")).toBe("Fabricante desconocido");
    expect(resolveVaccineManufacturerDisplay(unknownMfr, "es")).not.toBe("Unknown manufacturer");
  });
});

const UA_ITEM: CatalogSearchItem = {
  id: "lab-ua",
  code: "UA",
  type: "LAB_TEST",
  displayNameEn: "Urinalysis",
  displayNameFr: "Analyse d'urine",
  secondaryText: "UA",
};

const LISINOPRIL_GOLDEN: CatalogSearchItem = {
  ...MED_ITEM,
  displayNameEn: "Lisinopril 20 mg tablet, oral",
  displayNameFr: "Lisinopril 20 mg, comprimé oral",
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

const UA_ORDER = {
  id: "lab-ua-1",
  type: "LAB",
  items: [
    {
      catalogItemType: "LAB_TEST",
      displayLabelEn: "Urinalysis",
      displayLabelFr: "Analyse d'urine",
      catalogLabTest: {
        code: "UA",
        displayNameEn: "Urinalysis",
        displayNameFr: "Analyse d'urine",
      },
    },
  ],
};

const HIP_ORDER = {
  id: "img-hip-1",
  type: "IMAGING",
  items: [
    {
      catalogItemType: "IMAGING_STUDY",
      displayLabelEn: "Hip X-ray",
      displayLabelFr: "Radiographie de la hanche",
      catalogImagingStudy: {
        code: "XR_HIP",
        displayNameEn: "Hip X-ray",
        displayNameFr: "Radiographie de la hanche",
      },
    },
  ],
};

const VACCINE_DOC: VaccineAdministrationDocumentation = {
  vaccineProductId: "product-tdap",
  catalogCode: "TDAP_VACCINE_0.5_ML_INJECTABLE_INJECTABLEINTRAMUSCULAR",
  vaccineDisplayName: "Tdap vaccine",
  dose: "0.5",
  unit: "mL",
  route: "IM",
  site: "right_deltoid" as const,
  laterality: "right" as const,
  lotNumber: "U8653BA",
  expirationDate: "2027-09-01",
  manufacturerId: "sanofi_pasteur" as const,
  manufacturerDisplayName: "Sanofi Pasteur",
  visGiven: true,
  visRecipient: "patient" as const,
  visDate: "2026-06-14",
  visEditionDate: "2026-06-14",
  allergiesVerified: true,
  fiveRightsConfirmed: true,
  educationReviewed: true,
  reviewedWith: "patient" as const,
  reviewedTopics: ["reason_for_medication", "signs_of_allergic_reaction", "precautions"],
  understandingConfirmed: true,
  amountWasted: "",
  administeredAt: "2026-06-14T15:30:00.000Z",
  administeredBy: "Elizabeth Posada",
  administeredByCredentials: "RN",
};

describe("MEDUI.TRILANG.1 generated text + persist/reload R–Z", () => {
  it("R/S vaccine generated-note is active-locale; ES has no EN/FR leakage", () => {
    const esNote = buildVaccineAdministrationAuditNote(VACCINE_DOC, "es");
    const enNote = buildVaccineAdministrationAuditNote(VACCINE_DOC, "en");
    const frNote = buildVaccineAdministrationAuditNote(VACCINE_DOC, "fr");
    expect(vaccineAdministrationNoteIsMonolingual(esNote, "es")).toBe(true);
    expect(esNote).toContain("administrado por vía");
    expect(esNote).not.toMatch(/\badministered\b/i);
    expect(esNote).not.toContain("Vaccine information statement");
    expect(esNote).not.toContain("Fiche d'information vaccinale");
    expect(enNote).not.toContain("administrado");
    expect(frNote).not.toContain("administrado");
    const tdapEs = buildTdapVaccineAdministrationNote(sampleCompleteTdapVaccineAdministrationForm(), "es");
    expect(tdapNoteIsMonolingual(tdapEs, "es")).toBe(true);
    expect(tdapEs).toContain("administrado");
    expect(tdapEs).not.toMatch(/\bgiven\b/i);
    const persisted = serializeVaccineAdministrationDocumentationForMarNotes(VACCINE_DOC);
    expect(sanitizeMarAdministrationVisibleNote(persisted, "es")).toContain("administrado por vía");
    expect(sanitizeMarAdministrationVisibleNote(persisted, "en")).toContain("administered");
    expect(sanitizeMarAdministrationVisibleNote(persisted, "fr")).toContain("administré");
    expect(buildMarInjectionSiteNoteLine("right_deltoid", "es")).toBe("Sitio de inyección: Deltoides derecho");
    expect(buildMarInjectionSiteNoteLine("right_deltoid", "es")).not.toMatch(/Injection site|Site d'injection/i);
  });

  it("T/U persist/reload current-locale display; reverse ES-created identity is stable", () => {
    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "en")).toContain("Lisinopril");
    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "fr")).toContain("Lisinopril");
    expect(existingOrderDisplayLabel(LISINOPRIL_ORDER, "es")).toBe("Lisinopril 20 mg, comprimido oral");
    expect(LISINOPRIL_ORDER.id).toBe("med-lisinopril-1");
    expect(LISINOPRIL_ORDER.items[0]?.catalogMedication?.code).toBe("LISINOPRIL_20_MG_TABLET_ORAL");
    expect(existingOrderDisplayLabel(UA_ORDER, "es")).toBe("Análisis de orina");
    expect(existingOrderDisplayLabel(HIP_ORDER, "es")).toBe("Radiografía de cadera");
    expect(existingOrderDisplayLabel(UA_ORDER, "en")).toBe("Urinalysis");
    expect(existingOrderDisplayLabel(HIP_ORDER, "fr")).toBe("Radiographie de la hanche");
  });

  it("V export active-locale display does not coerce ES generated MAR notes to EN/FR", () => {
    const persisted = serializeVaccineAdministrationDocumentationForMarNotes(VACCINE_DOC);
    const esExport = sanitizeMarAdministrationVisibleNote(persisted, "es");
    expect(esExport).not.toMatch(/\badministered\b/i);
    expect(esExport).not.toContain("Allergies verified");
    expect(esExport).not.toContain("Allergies vérifiées");
    expect(esExport).toContain("Alergias verificadas");
  });

  it("W canonical ICD fallback never leaks the other-language description", () => {
    const unmapped = { code: "Z99.89", description: "Dependence on unspecified enabling machine" };
    expect(selectableDxPrimaryFromGovernedMaps(unmapped, "es")).toBe("Z99.89");
    expect(selectableDxPrimaryFromGovernedMaps(unmapped, "es")).not.toBe(unmapped.description);
    expect(selectableDxPrimaryFromGovernedMaps(unmapped, "fr")).toBe("Z99.89");
    expect(selectableDxPrimaryFromGovernedMaps({ code: "R07.9", description: "Chest pain, unspecified" }, "es")).toBe(
      "Dolor torácico no especificado"
    );
  });

  it("X/Y Lisinopril and XR_HIP golden identity: one row, active locale only", () => {
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL_GOLDEN, "en")).toBe("Lisinopril 20 mg tablet, oral");
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL_GOLDEN, "fr")).toBe("Lisinopril 20 mg, comprimé oral");
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL_GOLDEN, "es")).toBe("Lisinopril 20 mg, comprimido oral");
    expect(catalogSearchItemFullDisplayLine(LISINOPRIL_GOLDEN, "es")).not.toBe(
      "LISINOPRIL_20_MG_TABLET_ORAL · LISINOPRIL_20_MG_TABLET_ORAL"
    );
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL_GOLDEN, "es")).not.toMatch(/comprimé/);
    expect(getCatalogSearchItemDisplayLabel(LISINOPRIL_GOLDEN, "en")).not.toMatch(/comprimido|comprimé/);
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "en")).toBe("Hip X-ray");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "fr")).toBe("Radiographie de la hanche");
    expect(getCatalogSearchItemDisplayLabel(IMAGING_ITEM, "es")).toBe("Radiografía de cadera");
    expect(getCatalogSearchItemDisplayLabel(UA_ITEM, "en")).toBe("Urinalysis");
    expect(getCatalogSearchItemDisplayLabel(UA_ITEM, "fr")).toBe("Analyse d'urine");
    expect(getCatalogSearchItemDisplayLabel(UA_ITEM, "es")).toBe("Análisis de orina");
    const chest = activeEnterpriseOrderSets().find((s) => s.code === "ed_chest_pain_v1")!;
    const itemKeysEn = allEnterpriseOrderSetItems(chest).map((i) => i.key);
    const itemKeysEs = allEnterpriseOrderSetItems(chest).map((i) => i.key);
    expect(itemKeysEn).toEqual(itemKeysEs);
    expect(resolveEnterpriseOrderSetDisplayName(chest, "es")).toBe("Dolor torácico — Urgencias");
  });

  it("Z no persistence locale coercion of catalog identity", () => {
    expect(pickLegacyBilingualStoredPair("es", { en: "Hip X-ray", fr: "Radiographie de la hanche" })).toEqual({
      kind: "unsupported",
      value: "UNLOCALIZED_SOURCE",
      source: "UNLOCALIZED_SOURCE",
    });
    expect(existingOrderDisplayLabel(HIP_ORDER, "es")).toBe("Radiografía de cadera");
    expect(existingOrderDisplayLabel(HIP_ORDER, "es")).not.toBe("UNLOCALIZED_SOURCE");
    expect(existingOrderDisplayLabel(HIP_ORDER, "es")).not.toBe("Hip X-ray");
    expect(LISINOPRIL_ORDER.items[0]?.catalogMedication?.code).toBe("LISINOPRIL_20_MG_TABLET_ORAL");
    expect(UA_ORDER.items[0]?.catalogLabTest?.code).toBe("UA");
    expect(HIP_ORDER.items[0]?.catalogImagingStudy?.code).toBe("XR_HIP");
  });
});
