import { describe, expect, it } from "vitest";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import { getLocalizedDiagnosisDisplayLabel } from "@/features/emergency/diagnosisFrenchDisplayLabels";
import { resolveCertificationDeficiencyDisplay } from "@/features/emergency/certificationDeficiencyDisplay";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { printT } from "@/lib/printI18n";
import { parsePlatformUiLanguage, canRunPlatformAdminDomRewrite } from "@/i18n/platformLocale";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { pickLegacyBilingualStoredPair } from "@/i18n/config";

const tEn = (key: string) => i18nMessage("en", key);
const tFr = (key: string) => i18nMessage("fr", key);

const catalogItem: CatalogSearchItem = {
  id: "lab-1",
  code: "GLU",
  type: "LAB_TEST",
  displayNameEn: "Glucose",
  displayNameFr: "Glucose plasmatique",
  name: "Glucose",
};

describe("MEDUI.ES.1B.1 zero-fallback display isolation", () => {
  it("catalog FR missing localized name uses code, not English", () => {
    const item = { ...catalogItem, displayNameFr: "", displayNameEn: "Glucose" };
    expect(getCatalogSearchItemDisplayLabel(item, "fr", tFr)).toBe("GLU");
    expect(getCatalogSearchItemDisplayLabel(item, "fr", tFr)).not.toBe("Glucose");
  });

  it("catalog EN missing localized name uses code, not French", () => {
    const item = { ...catalogItem, displayNameEn: "", displayNameFr: "Glucose plasmatique" };
    expect(getCatalogSearchItemDisplayLabel(item, "en", tEn)).toBe("GLU");
    expect(getCatalogSearchItemDisplayLabel(item, "en", tEn)).not.toBe("Glucose plasmatique");
  });

  it("unsupported es catalog display is code, not EN or FR", () => {
    expect(getCatalogSearchItemDisplayLabel(catalogItem, "es", tEn)).toBe("GLU");
    expect(getCatalogSearchItemDisplayLabel(catalogItem, "es", tEn)).not.toBe("Glucose");
    expect(getCatalogSearchItemDisplayLabel(catalogItem, "es", tEn)).not.toBe("Glucose plasmatique");
  });

  it("diagnosis FR unmapped does not render English description", () => {
    expect(
      getLocalizedDiagnosisDisplayLabel({ code: "Z00.00", description: "Encounter for general exam" }, "fr")
    ).toBe("Z00.00");
  });

  it("diagnosis unsupported es does not render EN or FR prose", () => {
    const label = getLocalizedDiagnosisDisplayLabel(
      { code: "R07.9", description: "Chest pain, unspecified" },
      "es"
    );
    expect(label).toBe("R07.9");
    expect(label).not.toMatch(/chest pain/i);
    expect(label).not.toMatch(/douleur/i);
  });

  it("medication order FR without displayNameFr does not use English name", () => {
    const label = getOrderItemDisplayLabelForLanguage(
      {
        catalogItemType: "MEDICATION",
        catalogMedication: { displayNameEn: "Metformin", displayNameFr: "", code: "ZZ" },
      },
      "fr",
      tFr
    );
    expect(label).not.toBe("Metformin");
  });

  it("search hit display stays on the active locale pair", () => {
    const display = pickLegacyBilingualStoredPair("en", {
      en: "Wound dressing",
      fr: "Pansement de plaie",
    });
    expect(display).toEqual({ kind: "localized", locale: "en", value: "Wound dressing" });
    expect(pickLegacyBilingualStoredPair("es", { en: "Wound dressing", fr: "Pansement de plaie" })).toEqual({
      kind: "unsupported",
      value: "Wound dressing",
      source: "UNLOCALIZED_SOURCE",
    });
  });

  it("print chrome is active-locale-only", () => {
    expect(printT("en", "printOutput.discharge.documentH1")).not.toBe(
      printT("fr", "printOutput.discharge.documentH1")
    );
    expect(printT("en", "missing.print.key.path")).toBe("missing.print.key.path");
    expect(printT("fr", "missing.print.key.path")).toBe("missing.print.key.path");
  });

  it("errors do not cross-substitute EN/FR", () => {
    expect(normalizeUserFacingError("not authenticated", "fr")).toBe("Non authentifié.");
    expect(normalizeUserFacingError("not authenticated", "en")).toBe("Not signed in.");
    expect(normalizeUserFacingError("not authenticated", "fr")).not.toBe("Not signed in.");
  });

  it("certification FR missing does not use EN; es is unlocalized", () => {
    const tMissing = (key: string) => key;
    const fr = resolveCertificationDeficiencyDisplay(tMissing, "fr", {
      title: "Vitals missing",
      description: "No recent vitals",
      titleKey: "missing.cert.title",
      stableCode: "VITALS_MISSING",
    });
    expect(fr.title).toBe("missing.cert.title");
    expect(fr.title).not.toBe("Vitals missing");
    const es = resolveCertificationDeficiencyDisplay(tMissing, "es", {
      title: "Vitals missing",
      description: "No recent vitals",
      titleKey: "missing.cert.title",
      stableCode: "VITALS_MISSING",
    });
    expect(es.title).toBe("missing.cert.title");
  });

  it("Platform Admin unsupported locale does not become FR", () => {
    expect(parsePlatformUiLanguage("es")).toBeNull();
    expect(canRunPlatformAdminDomRewrite("es")).toBe(false);
  });
});
