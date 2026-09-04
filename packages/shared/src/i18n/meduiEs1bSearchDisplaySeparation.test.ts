import { describe, expect, it } from "vitest";
import { type CanonicalCareProcedureRow } from "../procedures/canonicalCareProcedureCatalog.js";
import { searchCanonicalCareProcedures } from "../procedures/canonicalCareProcedureSearch.js";
import {
  searchSurgicalHistoryCatalog,
  resolveSurgicalHistoryDisplayName,
  type SurgicalHistoryCatalogEntry,
} from "../clinicalHistory/surgicalHistoryCatalog.js";
import {
  buildEnterpriseProcedureDefinition,
  resolveEnterpriseProcedureDisplayName,
} from "../procedures/enterpriseProcedureCatalog.js";
import {
  enterpriseProcedureSearchableText,
  filterEnterpriseProcedures,
} from "../procedures/enterpriseProcedureSearch.js";
import {
  adaptProductUiToBilingualStorageLocale,
  pickLegacyBilingualStoredPair,
} from "./productUiLocale.js";

const CARE_ROW: CanonicalCareProcedureRow = {
  code: "TEST_WOUND_DRESSING",
  displayNameEn: "Wound dressing",
  displayNameFr: "Pansement de plaie",
  category: "WOUND_CARE",
  aliases: ["bandage", "pansement"],
  executionRoleCategory: "NURSING",
  orderable: true,
  isActive: true,
  requiresProviderOrder: false,
  nursingProtocolAllowed: true,
  requiresClinicalNote: false,
  sortPriority: 1,
};

const SURGERY_ROW: SurgicalHistoryCatalogEntry = {
  id: "appendectomy_fixture",
  displayNameEn: "Appendectomy",
  displayNameFr: "Appendicectomie",
  aliases: ["appendix", "appendice"],
  category: "GENERAL",
};

describe("MEDUI.ES.1B-CERT multilingual retrieval vs locale-specific presentation", () => {
  it("care-procedure: French query may match an English-locale search without presenting FR as EN", () => {
    const hits = searchCanonicalCareProcedures({
      q: "pansement",
      locale: "en",
      catalog: [CARE_ROW],
    });
    expect(hits.map((h) => h.code)).toEqual(["TEST_WOUND_DRESSING"]);
    const display = pickLegacyBilingualStoredPair("en", {
      en: hits[0]!.displayNameEn,
      fr: hits[0]!.displayNameFr,
    });
    expect(display).toEqual({ kind: "localized", locale: "en", value: "Wound dressing" });
  });

  it("care-procedure: English query may match a French-locale search without presenting EN as FR", () => {
    const hits = searchCanonicalCareProcedures({
      q: "Wound dressing",
      locale: "fr",
      catalog: [CARE_ROW],
    });
    expect(hits).toHaveLength(1);
    const display = pickLegacyBilingualStoredPair("fr", {
      en: hits[0]!.displayNameEn,
      fr: hits[0]!.displayNameFr,
    });
    expect(display).toEqual({ kind: "localized", locale: "fr", value: "Pansement de plaie" });
  });

  it("surgical-history: French label may retrieve an EN search; EN display stays English", () => {
    const hits = searchSurgicalHistoryCatalog("appendicectomie", "en", [SURGERY_ROW]);
    expect(hits.map((h) => h.id)).toEqual(["appendectomy_fixture"]);
    expect(resolveSurgicalHistoryDisplayName(hits[0]!, "en")).toBe("Appendectomy");
    expect(resolveSurgicalHistoryDisplayName(hits[0]!, "fr")).toBe("Appendicectomie");
  });

  it("enterprise-procedure: French name is searchable from EN locale; display stays EN", () => {
    const row = buildEnterpriseProcedureDefinition({
      id: "wound_dressing_fixture",
      displayNameEn: "Wound dressing",
      displayNameFr: "Pansement",
      category: "WOUND_CARE",
      aliases: ["bandage"],
      orderable: true,
    });
    expect(enterpriseProcedureSearchableText(row, "en")).toContain("pansement");
    const hits = filterEnterpriseProcedures("Pansement", "en", [row]);
    expect(hits.map((h) => h.id)).toEqual(["wound_dressing_fixture"]);
    expect(resolveEnterpriseProcedureDisplayName(hits[0]!, "en")).toBe("Wound dressing");
    expect(resolveEnterpriseProcedureDisplayName(hits[0]!, "fr")).toBe("Pansement");
  });

  it("future unsupported locale does not treat EN/FR stored labels as Spanish", () => {
    expect(adaptProductUiToBilingualStorageLocale("es")).toEqual({ kind: "unsupported" });
    expect(
      pickLegacyBilingualStoredPair("es", {
        en: "Wound dressing",
        fr: "Pansement de plaie",
      })
    ).toEqual({
      kind: "unsupported",
      value: "UNLOCALIZED_SOURCE",
      source: "UNLOCALIZED_SOURCE",
    });
  });
});
