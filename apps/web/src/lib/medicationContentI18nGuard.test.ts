import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = join(srcRoot, "..");

const adminSources = [
  readFileSync(join(srcRoot, "components/admin/MedicationMasterValidationReview.tsx"), "utf8"),
  readFileSync(join(webRoot, "app/app/admin/medication-master/page.tsx"), "utf8"),
  readFileSync(join(webRoot, "app/app/admin/medication-governance/page.tsx"), "utf8"),
];

const frMessages = readFileSync(join(srcRoot, "i18n/messages/fr.ts"), "utf8");
const enMessages = readFileSync(join(srcRoot, "i18n/messages/en.ts"), "utf8");

describe("medication content i18n guard (19E.0)", () => {
  it("renders medication names from API data props, not i18n keys", () => {
    for (const src of adminSources) {
      expect(src).toMatch(/displayName|genericName|strengthDisplay/);
    }
    expect(adminSources[0]).toMatch(/concept\.displayName/);
  });

  it("French and English UI message catalogs do not embed sample drug names as translation values", () => {
    const drugSamples = ["Atorvastatin", "Épinéphrine", "Norepinephrine", " IVPB"];
    for (const sample of drugSamples) {
      expect(frMessages.includes(`"${sample}"`)).toBe(false);
      expect(enMessages.includes(`"${sample}"`)).toBe(false);
    }
  });
});
