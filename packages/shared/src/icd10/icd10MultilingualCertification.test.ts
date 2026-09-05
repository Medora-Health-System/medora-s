import { describe, expect, it } from "vitest";
import { resolveIcd10DiagnosisDisplay } from "./icd10DisplayResolver.js";
import {
  countAliasUsedAsDisplay,
  countConsumerUsedAsClinician,
  countCrossLanguageFallback,
  evaluateIcd10MultilingualCertification,
  icd10MultilingualCertificationExitCode,
  isEnglishCatalogFallbackOnNonEnglishLocale,
  type Icd10MultilingualCertificationCounts,
} from "./icd10MultilingualCertification.js";
import type { Icd10CatalogDisplaySource, Icd10DiagnosisDisplayResult, Icd10TerminologyDisplayRow } from "./icd10TerminologyTypes.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_GOVERNED_TERMINOLOGY_VERSION,
  ICD10_SOURCE_PRIORITY,
} from "./icd10TerminologyTypes.js";

const incomplete: Icd10MultilingualCertificationCounts = {
  release: "FY2026",
  totalSearchable: 106,
  enExact: 106,
  frExact: 3,
  esExact: 3,
  missingEn: 0,
  missingFr: 103,
  missingEs: 103,
  codeOnlyEn: 0,
  codeOnlyFr: 103,
  codeOnlyEs: 103,
  categorySubstitutions: 0,
  invalidTerminologyCodes: 0,
  orphanTerminology: 0,
  duplicateActivePreferredLabels: 0,
  duplicateEffectiveClinicianLabels: 0,
  crossLanguageFallback: 0,
  aliasUsedAsDisplay: 0,
  consumerUsedAsClinician: 0,
  canonicalCodeMutations: 0,
  expectedBillableRows: 74719,
};

describe("ICD multilingual certification gates", () => {
  it("does not treat architecture readiness as full FR/ES coverage", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(gates.SAFE_ARCHITECTURE).toBe(true);
    expect(gates.FULL_TRILINGUAL_COVERAGE).toBe(false);
  });

  it("uses distinct exit codes so incomplete coverage is never an ambiguous green", () => {
    const gates = evaluateIcd10MultilingualCertification(incomplete);
    expect(icd10MultilingualCertificationExitCode("safety", gates)).toBe(0);
    expect(icd10MultilingualCertificationExitCode("coverage", gates)).toBe(2);
    expect(icd10MultilingualCertificationExitCode("both", gates)).toBe(2);
    expect(icd10MultilingualCertificationExitCode("both", { ...gates, SAFE_ARCHITECTURE: false })).toBe(1);
  });

  it("fails safety on duplicate effective clinician labels", () => {
    const gates = evaluateIcd10MultilingualCertification({
      ...incomplete,
      duplicateEffectiveClinicianLabels: 1,
    });
    expect(gates.SAFE_ARCHITECTURE).toBe(false);
    expect(icd10MultilingualCertificationExitCode("safety", gates)).toBe(1);
  });
});

const SYSTEM = ICD10_CM_CODE_SYSTEM;
const RELEASE = "FY2026";

function catalog(code: string, english: string): Icd10CatalogDisplaySource {
  return {
    code,
    codeSystem: SYSTEM,
    releaseVersion: RELEASE,
    shortDescription: english,
    longDescription: english,
  };
}

function terminologyRow(
  code: string,
  locale: "fr" | "es",
  preferredLabel: string,
  extras: Partial<Icd10TerminologyDisplayRow> = {},
): Icd10TerminologyDisplayRow {
  return {
    codeSystem: SYSTEM,
    releaseVersion: RELEASE,
    code,
    locale,
    preferredLabel,
    labelRegister: "CLINICIAN_PREFERRED",
    provenance: "MEDORA_GOVERNED",
    exactness: "EXACT_GOVERNED",
    status: "APPROVED",
    sourceId: ICD10_GOVERNED_SOURCE_ID,
    terminologyVersion: ICD10_GOVERNED_TERMINOLOGY_VERSION,
    sourcePriority: ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    isEffective: true,
    ...extras,
  };
}

function unlocalized(code: string): Icd10DiagnosisDisplayResult {
  return {
    code,
    displayName: code,
    exactness: "UNLOCALIZED_CODE",
    provenance: null,
    localized: false,
    sourceKind: "UNLOCALIZED_CODE",
  };
}

function englishCatalogLeak(code: string, english: string): Icd10DiagnosisDisplayResult {
  return {
    code,
    displayName: english,
    exactness: "EXACT_SOURCE",
    provenance: "OFFICIAL_SOURCE",
    localized: true,
    sourceKind: "CATALOG_SOURCE",
  };
}

describe("P3-E certifier leakage origin hardening", () => {
  it("CASE 1 — FR governed cognate is not fallback", () => {
    const cat = catalog("R00.2", "Palpitations");
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R00.2",
      locale: "fr",
      catalog: cat,
      terminologyRows: [terminologyRow("R00.2", "fr", "Palpitations")],
    });
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R00.2",
      locale: "es",
      catalog: cat,
      terminologyRows: [],
    });
    expect(fr.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(fr.exactness).toBe("EXACT_GOVERNED");
    expect(countCrossLanguageFallback({ fr, es })).toBe(0);
    expect(isEnglishCatalogFallbackOnNonEnglishLocale(fr)).toBe(false);
  });

  it("CASE 2 — ES governed cognate is not fallback", () => {
    const cat = catalog("R04.0", "Epistaxis");
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R04.0",
      locale: "es",
      catalog: cat,
      terminologyRows: [terminologyRow("R04.0", "es", "Epistaxis")],
    });
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R04.0",
      locale: "fr",
      catalog: cat,
      terminologyRows: [],
    });
    expect(es.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(countCrossLanguageFallback({ fr, es })).toBe(0);
  });

  it("licensed-vendor FR EXACT_SOURCE cognate is not fallback", () => {
    const cat = catalog("R00.2", "Palpitations");
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R00.2",
      locale: "fr",
      catalog: cat,
      terminologyRows: [
        terminologyRow("R00.2", "fr", "Palpitations", {
          provenance: "LICENSED_VENDOR",
          exactness: "EXACT_SOURCE",
          sourceId: "VENDOR_CONTRACT_A",
          terminologyVersion: "VENDOR.2026.1",
          sourcePriority: ICD10_SOURCE_PRIORITY.LICENSED_VENDOR,
        }),
      ],
    });
    expect(fr.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(fr.exactness).toBe("EXACT_SOURCE");
    expect(fr.provenance).toBe("LICENSED_VENDOR");
    expect(fr.displayName).toBe("Palpitations");
    expect(countCrossLanguageFallback({ fr, es: unlocalized("R00.2") })).toBe(0);
  });

  it("licensed-vendor ES EXACT_SOURCE cognate is not fallback", () => {
    const cat = catalog("R04.0", "Epistaxis");
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R04.0",
      locale: "es",
      catalog: cat,
      terminologyRows: [
        terminologyRow("R04.0", "es", "Epistaxis", {
          provenance: "LICENSED_VENDOR",
          exactness: "EXACT_SOURCE",
          sourceId: "VENDOR_CONTRACT_A",
          terminologyVersion: "VENDOR.2026.1",
          sourcePriority: ICD10_SOURCE_PRIORITY.LICENSED_VENDOR,
        }),
      ],
    });
    expect(es.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(es.exactness).toBe("EXACT_SOURCE");
    expect(countCrossLanguageFallback({ fr: unlocalized("R04.0"), es })).toBe(0);
  });

  it("official localized FR EXACT_SOURCE cognate is not fallback", () => {
    const cat = catalog("R00.2", "Palpitations");
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R00.2",
      locale: "fr",
      catalog: cat,
      terminologyRows: [
        terminologyRow("R00.2", "fr", "Palpitations", {
          provenance: "OFFICIAL_SOURCE",
          exactness: "EXACT_SOURCE",
          sourceId: "OFFICIAL_FR_FY2026",
          terminologyVersion: "OFFICIAL.FR.2026",
          sourcePriority: ICD10_SOURCE_PRIORITY.OFFICIAL_SOURCE,
        }),
      ],
    });
    expect(fr.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(fr.provenance).toBe("OFFICIAL_SOURCE");
    expect(fr.exactness).toBe("EXACT_SOURCE");
    expect(countCrossLanguageFallback({ fr, es: unlocalized("R00.2") })).toBe(0);
  });

  it("official localized ES EXACT_SOURCE cognate is not fallback", () => {
    const cat = catalog("R04.0", "Epistaxis");
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "R04.0",
      locale: "es",
      catalog: cat,
      terminologyRows: [
        terminologyRow("R04.0", "es", "Epistaxis", {
          provenance: "OFFICIAL_SOURCE",
          exactness: "EXACT_SOURCE",
          sourceId: "OFFICIAL_ES_FY2026",
          terminologyVersion: "OFFICIAL.ES.2026",
          sourcePriority: ICD10_SOURCE_PRIORITY.OFFICIAL_SOURCE,
        }),
      ],
    });
    expect(es.sourceKind).toBe("TERMINOLOGY_ROW");
    expect(es.provenance).toBe("OFFICIAL_SOURCE");
    expect(countCrossLanguageFallback({ fr: unlocalized("R04.0"), es })).toBe(0);
  });

  it("real FR English catalog-origin leak is fallback", () => {
    expect(
      countCrossLanguageFallback({
        fr: englishCatalogLeak("R14.0", "Abdominal distension (gaseous)"),
        es: unlocalized("R14.0"),
      }),
    ).toBeGreaterThan(0);
  });

  it("real ES English catalog-origin leak is fallback", () => {
    expect(
      countCrossLanguageFallback({
        fr: unlocalized("A42.1"),
        es: englishCatalogLeak("A42.1", "Abdominal actinomycosis"),
      }),
    ).toBeGreaterThan(0);
  });

  it("CASE 5 — missing ES UNLOCALIZED_CODE is not fallback", () => {
    const cat = catalog("A42.1", "Abdominal actinomycosis");
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "A42.1",
      locale: "es",
      catalog: cat,
      terminologyRows: [],
    });
    expect(es.sourceKind).toBe("UNLOCALIZED_CODE");
    expect(es.displayName).toBe("A42.1");
    expect(countCrossLanguageFallback({ fr: unlocalized("A42.1"), es })).toBe(0);
  });

  it("CASE 6 — missing FR UNLOCALIZED_CODE is not fallback", () => {
    const cat = catalog("A42.1", "Abdominal actinomycosis");
    const fr = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "A42.1",
      locale: "fr",
      catalog: cat,
      terminologyRows: [],
    });
    expect(fr.sourceKind).toBe("UNLOCALIZED_CODE");
    expect(countCrossLanguageFallback({ fr, es: unlocalized("A42.1") })).toBe(0);
  });

  it("CASE 7 — alias used as visible clinician label is counted", () => {
    const es: Icd10DiagnosisDisplayResult = {
      code: "R10.85",
      displayName: "dolor abdominal",
      exactness: "EXACT_GOVERNED",
      provenance: "MEDORA_GOVERNED",
      localized: true,
      sourceKind: "TERMINOLOGY_ROW",
    };
    expect(
      countAliasUsedAsDisplay({
        catalogId: "cat-r1085",
        fr: unlocalized("R10.85"),
        es,
        clinicianFrLabels: new Set(),
        clinicianEsLabels: new Set(["Dolor abdominal en varios sitios"]),
        aliases: [{ icd10CatalogId: "cat-r1085", locale: "es", aliasText: "dolor abdominal" }],
      }),
    ).toBeGreaterThan(0);
  });

  it("CASE 8 — consumer string used as clinician display is counted", () => {
    const es: Icd10DiagnosisDisplayResult = {
      code: "R10.85",
      displayName: "stomachache",
      exactness: "EXACT_GOVERNED",
      provenance: "MEDORA_GOVERNED",
      localized: true,
      sourceKind: "TERMINOLOGY_ROW",
    };
    expect(
      countConsumerUsedAsClinician({
        fr: unlocalized("R10.85"),
        es,
        consumerLabels: new Set(["stomachache"]),
      }),
    ).toBeGreaterThan(0);
  });

  it("CASE 10 — locale=es cannot present catalog English; catalog-origin fixture still fails", () => {
    const cat = catalog("A42.1", "Abdominal actinomycosis");
    const es = resolveIcd10DiagnosisDisplay({
      codeSystem: SYSTEM,
      releaseVersion: RELEASE,
      code: "A42.1",
      locale: "es",
      catalog: cat,
      terminologyRows: [],
    });
    expect(es.sourceKind).toBe("UNLOCALIZED_CODE");
    expect(es.displayName).not.toBe("Abdominal actinomycosis");
    expect(countCrossLanguageFallback({ fr: unlocalized("A42.1"), es })).toBe(0);
    expect(
      countCrossLanguageFallback({
        fr: unlocalized("A42.1"),
        es: englishCatalogLeak("A42.1", "Abdominal actinomycosis"),
      }),
    ).toBeGreaterThan(0);
  });

  it("CASE 9 — terminology-row origin is never fallback even when spelling equals English", () => {
    const resolved: Icd10DiagnosisDisplayResult = {
      code: "R00.2",
      displayName: "Palpitations",
      exactness: "EXACT_SOURCE",
      provenance: "MEDORA_GOVERNED",
      localized: true,
      sourceKind: "TERMINOLOGY_ROW",
    };
    expect(isEnglishCatalogFallbackOnNonEnglishLocale(resolved)).toBe(false);
    expect(countCrossLanguageFallback({ fr: resolved, es: unlocalized("R00.2") })).toBe(0);
  });
});

