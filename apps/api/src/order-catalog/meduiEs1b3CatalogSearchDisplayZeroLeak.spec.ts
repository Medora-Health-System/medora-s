import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapImagingRowToCatalogSearchItem,
  mapLabRowToCatalogSearchItem,
  mapMedicationToCatalogSearchItem,
} from "./catalog-search.mapper";
import { resolveClassifierDisplayName } from "../terminology/resolve-classifier-catalog-meta.util";
import type { CatalogMedication } from "@prisma/client";

const env = process.env;

describe("MEDUI.ES.1B.3 catalog search mapper display isolation", () => {
  beforeEach(() => {
    process.env = { ...env };
    process.env.TERMINOLOGY_READ_CLASSIFIER = "true";
  });

  afterAll(() => {
    process.env = env;
  });

  it("lab mapper emits locale-specific secondary lines without stuffing name into displayNameFr", () => {
    const item = mapLabRowToCatalogSearchItem({
      id: "1",
      code: "CBC",
      name: "NFS",
      displayNameFr: "Numération formule sanguine",
      displayNameEn: "Complete Blood Count",
      description: "Catégorie : HEMATOLOGIE",
      searchText: "cbc nfs",
      billingCodeDefault: null,
      labCategoryClassifier: {
        labels: [
          { locale: "fr", displayName: "Hématologie" },
          { locale: "en", displayName: "Hematology" },
        ],
      },
    });
    expect(item.displayNameFr).toBe("Numération formule sanguine");
    expect(item.displayNameEn).toBe("Complete Blood Count");
    expect(item.secondaryTextFr).toContain("Hématologie");
    expect(item.secondaryTextEn).toContain("Hematology");
    expect(item.secondaryTextEn).not.toContain("Hématologie");
    expect(item.secondaryTextFr).not.toContain("Hematology");
  });

  it("lab missing FR display name is empty, not English name", () => {
    const item = mapLabRowToCatalogSearchItem({
      id: "1",
      code: "TROP",
      name: "Troponin",
      displayNameFr: null,
      displayNameEn: "Troponin",
      description: null,
      searchText: null,
      billingCodeDefault: null,
    });
    expect(item.displayNameFr).toBe("");
    expect(item.displayNameEn).toBe("Troponin");
  });

  it("imaging FR-only classifier does not leak into EN secondary", () => {
    const item = mapImagingRowToCatalogSearchItem({
      id: "1",
      code: "CT_HEAD",
      name: "Tête",
      displayNameFr: "Scanner cérébral",
      displayNameEn: "CT head",
      modality: "CT",
      bodyRegion: "HEAD",
      searchText: "ct tdm scanner",
      modalityClassifier: { labels: [{ locale: "fr", displayName: "Tomodensitométrie" }] },
      bodyRegionClassifier: { labels: [{ locale: "fr", displayName: "Tête" }] },
    });
    expect(item.secondaryTextFr).toContain("Tomodensitométrie");
    expect(item.secondaryTextEn).not.toContain("Tomodensitométrie");
    expect(item.secondaryTextEn).toContain("CT");
    expect(item.displayNameFr).toBe("Scanner cérébral");
    expect(item.displayNameFr).not.toBe("Tête");
  });

  it("medication mapper does not copy name into the other locale display field", () => {
    const item = mapMedicationToCatalogSearchItem({
      id: "m1",
      code: "MET500",
      name: "Metformine",
      genericName: "Metformin",
      displayNameFr: "Metformine",
      displayNameEn: "Metformin",
      strength: "500 mg",
      dosageForm: "comprimé",
      route: "orale",
      therapeuticClass: "Antidiabétique",
    } as CatalogMedication);
    expect(item.displayNameEn).toBe("Metformin");
    expect(item.displayNameFr).toBe("Metformine");
    expect(item.secondaryTextEn?.toLowerCase()).not.toContain("comprimé");
    expect(item.secondaryTextFr).toContain("comprimé");
    expect(item.code).toBe("MET500");
  });

  it("classifier display never falls back to the other language", () => {
    const classifier = { labels: [{ locale: "fr", displayName: "Hématologie" }] };
    expect(resolveClassifierDisplayName(classifier, "fr")).toBe("Hématologie");
    expect(resolveClassifierDisplayName(classifier, "en")).toBeNull();
  });

  it("procedure catalog service no longer stuffs name into displayNameEn", () => {
    const src = readFileSync(join(__dirname, "procedure-catalog.service.ts"), "utf8");
    expect(src).not.toMatch(/displayNameEn:\s*row\.displayNameEn\?\.trim\(\)\s*\|\|\s*row\.name/);
  });
});
