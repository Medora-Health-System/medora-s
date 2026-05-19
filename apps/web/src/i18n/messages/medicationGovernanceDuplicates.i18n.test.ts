import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const pageSource = readFileSync(
  join(webRoot, "app/app/admin/medication-governance/duplicates/page.tsx"),
  "utf8"
);

describe("medicationGovernanceDuplicates i18n (19F)", () => {
  it("English chrome does not use French diacritics", () => {
    const enDup = en.medicationGovernanceDuplicates;
    expect(enDup.title).toContain("Duplicate governance");
    expect(enDup.title).not.toContain("Gouvernance doublons");
  });

  it("French chrome is French", () => {
    expect(fr.medicationGovernanceDuplicates.title).toContain("Gouvernance doublons");
  });

  it("page uses API medication fields without translating drug names", () => {
    expect(pageSource).toMatch(/r\.medication|r\.exactSourceText/);
    expect(pageSource).toMatch(/medicationGovernanceDuplicates\./);
    expect(pageSource).not.toMatch(/t\([^)]*Acetaminophen/);
  });
});
