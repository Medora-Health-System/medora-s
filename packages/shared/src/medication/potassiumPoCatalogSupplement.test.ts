import { describe, expect, it } from "vitest";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import { buildActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import { listActiveTranche2ProviderOrderingCatalogCodes } from "./tranche2ProviderOrderingActivation.js";
import { HAITI_MEDICATION_FORMULARY_CATALOG } from "./haitiMedicationFormularyCatalog.js";

const PO_POTASSIUM_CODES = [
  "POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE",
  "POTASSIUM_CHLORIDE_40_MEQ_COMPRIME_ORALE",
] as const;

describe("Potassium chloride PO catalog supplement", () => {
  it("PO potassium entries exist in Haiti formulary catalog", () => {
    for (const code of PO_POTASSIUM_CODES) {
      const row = HAITI_MEDICATION_FORMULARY_CATALOG.find((entry) => entry.code === code);
      expect(row).toBeDefined();
      expect(row?.route).toBe("orale");
      expect(row?.therapeuticClass).toBe("Électrolyte");
      expect(row?.isActive).toBe(true);
    }
  });

  it("PO potassium is orderable and MAR-ready in unified orderability map", () => {
    const map = buildUnifiedOrderabilityMap();
    for (const code of PO_POTASSIUM_CODES) {
      const record = map.get(code);
      expect(record).toBeDefined();
      expect(record?.route).toBe("orale");
      const governance = buildActivationGovernanceRecord(record!);
      expect(governance.marReady).toBe(true);
      expect(governance.orderSearchReady).toBe(true);
    }
  });

  it("PO potassium is on tranche 2 provider-ordering supplement allow-list", () => {
    const active = listActiveTranche2ProviderOrderingCatalogCodes();
    for (const code of PO_POTASSIUM_CODES) {
      expect(active).toContain(code);
    }
  });

  it("PO potassium seed aliases include pot, potassium, and KCl", () => {
    for (const code of PO_POTASSIUM_CODES) {
      const row = HAITI_MEDICATION_FORMULARY_CATALOG.find((entry) => entry.code === code);
      const aliases = (row?.commonAliases ?? []).map((alias) => alias.toLowerCase());
      expect(aliases).toEqual(expect.arrayContaining(["pot", "potassium", "kcl"]));
    }
  });
});
