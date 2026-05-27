/**
 * Phase 19T.3 — patient longitudinal history wiring (source-level).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dirname, "../../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("patientClinicalHistoryProfile (19T.3)", () => {
  it("exposes reconcile helper from shared package", () => {
    expect(readWebSource("src/features/emergency/patientClinicalHistoryProfile.ts")).toContain(
      "reconcileEncounterHistoryIntoPatientProfile"
    );
  });

  it("reconciles on ED triage save via API service hook", () => {
    expect(readFileSync(join(webRoot, "../api/src/triage/triage.service.ts"), "utf8")).toContain(
      "patientClinicalHistory.reconcileFromEncounterTriage"
    );
  });

  it("prefers patient profile in carry-forward hydration", () => {
    expect(readFileSync(join(webRoot, "../api/src/triage/triage-carry-forward.service.ts"), "utf8")).toContain(
      "hydrationSource: \"patient_profile\""
    );
  });

  it("shows reconciliation banner in triage panel", () => {
    expect(readWebSource("src/features/emergency/EmergencyTriagePanel.tsx")).toContain(
      "PatientHistoryReconciliationBanner"
    );
  });

  it("shows longitudinal profile on patient chart summary", () => {
    expect(readWebSource("src/components/patient-chart/PatientSummaryTab.tsx")).toContain(
      "PatientClinicalHistoryProfileBlock"
    );
    expect(readWebSource("src/lib/chartApi.ts")).toContain("clinicalHistoryProfile");
  });

  it("French longitudinal history labels exist", () => {
    const fr = readWebSource("src/i18n/messages/erTriage.fr.ts");
    expect(fr).toContain("Profil d'antécédents patient mis à jour");
    expect(readFileSync(join(webRoot, "src/i18n/messages/fr.ts"), "utf8")).toContain(
      "Antécédents longitudinal (profil patient)"
    );
  });
});
