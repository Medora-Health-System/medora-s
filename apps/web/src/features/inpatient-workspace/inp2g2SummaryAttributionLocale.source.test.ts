/**
 * MEDUI.INP.2G.2 — focused source guards for Summary attribution + locale priority.
 * Does not reopen ownership / Care Plan / Print authorization behavior.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";

const webRoot = join(import.meta.dirname, "../../..");

function readWeb(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

describe("MEDUI.INP.2G.2 Summary attribution + EN locale source guards", () => {
  it("Summary reuses projectNursingAdmissionMedicalRecord (shared attribution projector)", () => {
    const summary = readWeb(
      "src/features/inpatient-workspace/InpatientEncounterMedicalRecordSummaryView.tsx"
    );
    expect(summary).toContain("projectNursingAdmissionMedicalRecord");
    expect(summary).toContain("formatNursingAdmissionAttributionClinician");
    expect(summary).toContain('data-testid="summary-nursing-admission-completed-by"');
    expect(summary).toContain('data-testid="summary-nursing-admission-signed-by"');
    expect(summary).toContain('data-testid="summary-nursing-admission-corrected-by"');
    // Attribution comes only via medical-record projection (shared projector inside) — not a direct reconstruct.
    expect(summary).not.toMatch(/projectNursingAdmissionClinicalAttribution\s*\(/);
  });

  it("I18nProvider resolves via resolveClientUiLanguage (stored user locale beats facility)", () => {
    const provider = readWeb("src/i18n/provider.tsx");
    expect(provider).toContain("resolveClientUiLanguage");
    expect(provider).toContain("storedLanguage: readStoredUiLanguageRaw()");
    expect(provider).toContain("facilityLanguage,");
    expect(provider).not.toContain("setLanguageState(facilityLanguage)");
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        facilityLanguage: "fr",
        cachedFacilityLanguage: "fr",
      })
    ).toBe("en");
  });
});
