import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fieldSrc = readFileSync(
  join(import.meta.dirname, "../../components/mar/MedicationClinicalDateTimeField.tsx"),
  "utf8"
);

describe("marClinicalDateTimeField timezone (MEDUI.ENTERPRISE.TIMEZONE.1)", () => {
  it("Now button uses currentMarClinicalDateTimeLocalValue (facility TZ)", () => {
    expect(fieldSrc).toContain("currentMarClinicalDateTimeLocalValue");
    expect(fieldSrc).not.toContain("defaultMarClinicalDateTimeLocalValue(documentedAt");
  });

  it("schedule hints use facility timezone when set", () => {
    expect(fieldSrc).toContain("timeZone: facilityTimeZone.trim()");
  });
});
