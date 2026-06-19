import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataI18n (MEDUI.ED.CLINICAL_DATA.1)", () => {
  const enSource = readSrc("i18n/messages/en.ts");
  const frSource = readSrc("i18n/messages/fr.ts");

  it("English tile label is Clinical Data", () => {
    expect(en.emergencyWorkspace.tileAria.clinicalData).toBe("Clinical Data");
    expect(en.emergencyWorkspace.sectionTitle.clinicalData).toBe("Clinical Data");
    expect(en.emergencyClinicalData.title).toBe("Clinical Data");
  });

  it("French tile label is Données cliniques", () => {
    expect(fr.emergencyWorkspace.tileAria.clinicalData).toBe("Données cliniques");
    expect(fr.emergencyWorkspace.sectionTitle.clinicalData).toBe("Données cliniques");
    expect(fr.emergencyClinicalData.title).toBe("Données cliniques");
  });

  it("mirrored i18n keys exist in en and fr source files", () => {
    for (const key of [
      "emergencyClinicalData.title",
      "emergencyClinicalData.subtitle",
      "emergencyClinicalData.readOnlyBanner",
      "emergencyClinicalData.summaryTitle",
      "emergencyClinicalData.summaryPlaceholder",
      "emergencyWorkspace.tileAria.clinicalData",
      "emergencyWorkspace.sectionTitle.clinicalData",
      "clinicalDocumentation.actionReview",
    ]) {
      expect(enSource).toContain(key.split(".").pop()!);
      expect(frSource).toContain(key.split(".").pop()!);
    }
  });

  it("review action label differs from open in both locales", () => {
    expect(en.clinicalDocumentation.actionReview).toBe("Review");
    expect(en.clinicalDocumentation.actionOpen).toBe("Open");
    expect(fr.clinicalDocumentation.actionReview).toBe("Consulter");
    expect(fr.clinicalDocumentation.actionOpen).toBe("Ouvrir");
  });
});
