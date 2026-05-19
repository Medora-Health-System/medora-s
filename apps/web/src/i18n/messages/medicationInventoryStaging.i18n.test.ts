import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";
import { stagingImportErrorMessage } from "@/lib/medicationInventoryStagingApi";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const stagingPageSource = readFileSync(
  join(webRoot, "app/app/admin/medication-inventory-staging/page.tsx"),
  "utf8"
);

const enStaging = en.medicationInventoryStaging;
const frStaging = fr.medicationInventoryStaging;

const FRENCH_UI_MARKERS = /[àâäéèêëïîôùûçœÀÂÄÉÈÊËÏÎÔÙÛÇŒ]/;

const ENGLISH_FORBIDDEN_ON_EN_PAGE = [
  "Inventaire urgences",
  "Simuler l'import",
  "Simuler l’import",
  "Aucune ligne",
  "ligne(s)",
  "Chargement…",
  "Actualiser",
  "Médicament",
  "Réconciliation",
  "Exporter CSV",
];

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") {
    return [{ path: prefix, value: obj }];
  }
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return [];
  }
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    out.push(...collectStringLeaves(val, next));
  }
  return out;
}

describe("medicationInventoryStaging i18n (19E.1B)", () => {
  it("mirrors EN and FR message keys", () => {
    const enPaths = collectStringLeaves(enStaging).map((x) => x.path).sort();
    const frPaths = collectStringLeaves(frStaging).map((x) => x.path).sort();
    expect(enPaths).toEqual(frPaths);
  });

  it("English catalog uses English chrome strings (not French labels)", () => {
    expect(enStaging.title).toContain("ER inventory");
    expect(enStaging.title).not.toContain("Inventaire urgences");
    expect(enStaging.importDryRunButton).toBe("Run dry-run");
    expect(enStaging.emptyRows).toBe("No rows for this filter.");
    expect(enStaging.rowCount).toBe("{count} row(s)");
  });

  it("French catalog uses French chrome strings", () => {
    expect(frStaging.title).toContain("Inventaire urgences");
    expect(frStaging.importDryRunButton).toContain("Simuler");
    expect(frStaging.emptyRows).toContain("Aucune ligne");
    expect(frStaging.rowCount).toBe("{count} ligne(s)");
  });

  it("English UI strings avoid French diacritics", () => {
    for (const { path, value } of collectStringLeaves(enStaging)) {
      expect(value, `en.medicationInventoryStaging.${path}`).not.toMatch(FRENCH_UI_MARKERS);
    }
  });

  it("staging page source has no hardcoded French UI literals", () => {
    for (const phrase of ENGLISH_FORBIDDEN_ON_EN_PAGE) {
      expect(stagingPageSource).not.toContain(phrase);
    }
    expect(stagingPageSource).toMatch(/t\("medicationInventoryStaging\./);
    expect(stagingPageSource).toMatch(/r\.medication|r\.exactSourceText/);
  });

  it("maps import error codes to English when language is en", () => {
    const msg = stagingImportErrorMessage(
      new Error("Colonnes obligatoires introuvables (MISSING_REQUIRED_COLUMNS)"),
      "en"
    );
    expect(msg).toBe(enStaging.errors.MISSING_REQUIRED_COLUMNS);
    expect(msg).not.toContain("Colonnes obligatoires");
  });

  it("maps import error codes to French when language is fr", () => {
    const msg = stagingImportErrorMessage(
      new Error("Colonnes obligatoires introuvables (MISSING_REQUIRED_COLUMNS)"),
      "fr"
    );
    expect(msg).toBe(frStaging.errors.MISSING_REQUIRED_COLUMNS);
  });

  it("staging page promotes using API medication fields only", () => {
    expect(stagingPageSource).toMatch(/promotePriorityErStagingRow/);
    expect(stagingPageSource).toMatch(/r\.medication/);
    expect(stagingPageSource).not.toMatch(/t\([^)]*Acetaminophen/);
  });

  it("does not translate medication field names in message catalogs", () => {
    const drugSamples = ["Acetaminophen", "Atorvastatin", "Épinéphrine"];
    for (const sample of drugSamples) {
      for (const { value } of collectStringLeaves(enStaging)) {
        expect(value).not.toContain(sample);
      }
      for (const { value } of collectStringLeaves(frStaging)) {
        expect(value).not.toContain(sample);
      }
    }
  });
});
