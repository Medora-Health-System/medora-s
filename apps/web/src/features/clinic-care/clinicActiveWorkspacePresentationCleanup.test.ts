import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;
const webRoot = join(featureDir, "../../..");

function readWeb(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("Clinic active ambulatory workspace presentation cleanup", () => {
  const encounterLayout = readWeb("app/app/encounters/[id]/layout.tsx");
  const clinicPanels = readWeb("src/features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx");
  const triage = readWeb("src/features/emergency/EmergencyTriagePanel.tsx");
  const triageSections = readWeb("src/features/emergency/EmergencyTriageV1Sections.tsx");
  const providerWorkspace = readWeb("src/components/encounters/ProviderDocumentationWorkspace.tsx");
  const medicationTab = readWeb("src/components/encounters/MedicationAdministrationTab.tsx");
  const notes = readWeb("src/features/emergency/EmergencyErNotesPanel.tsx");
  const rx = readWeb("src/features/clinic-care/ClinicCareAmbulatoryPrescriptionPanel.tsx");
  const summary = readWeb("src/features/emergency/EncounterClinicalRecordSummaryView.tsx");

  it("scopes every cleanup to the Clinic ambulatory workspace rather than shared ED/Hospital pages", () => {
    expect(encounterLayout).toContain('data-testid="clinic-care-active-ambulatory-workspace"');
    expect(encounterLayout).toContain("CLINIC_AMBULATORY_PRESENTATION_CSS");
    expect(encounterLayout).toContain('data-testid="clinic-ambulatory-presentation-cleanup"');
  });

  it("removes the redundant Clinic workspace and intake helper copy without removing intake engines", () => {
    expect(encounterLayout).toContain('> header > p');
    expect(encounterLayout).toContain('[data-testid="clinic-care-ambulatory-intake"] > p:first-child');
    expect(encounterLayout).toContain('p:first-child:has(+ input[type="search"])');
    expect(clinicPanels).toContain("<EmergencyTriagePanel");
    expect(triage).toContain('t("erTriageComplaintTemplates.helper")');
  });

  it("hides only the Clinic expected-profile exception authoring row and full-triage escape link", () => {
    expect(encounterLayout).toContain('details:first-of-type > div > div:last-child');
    expect(encounterLayout).toContain('a[href*="workspace=ambulatory"][href*="section=intake"]');
    expect(triageSections).toContain("triageExceptionsNote");
    expect(triage).toContain("encounterTriageTabHref");
  });

  it("keeps the intake and provider summaries sticky without independent vertical scrolling", () => {
    expect(encounterLayout).toContain('[style*="position: sticky"][style*="overflow-y: auto"]');
    expect(encounterLayout).toContain('[data-testid="provider-documentation-summary-aside"]');
    expect(encounterLayout).toContain("max-height: none !important");
    expect(encounterLayout).toContain("overflow-y: visible !important");
    expect(providerWorkspace).toContain('data-testid="provider-documentation-summary-aside"');
  });

  it("removes the provider template helper but preserves template selection and documentation", () => {
    expect(encounterLayout).toContain('[data-testid="provider-template-activation-helper"]');
    expect(providerWorkspace).toContain('data-testid="provider-template-activation-helper"');
    expect(providerWorkspace).toContain("provider-documentation-template-picker");
  });

  it("simplifies the Clinic medication empty state without changing MAR authority or data flow", () => {
    expect(encounterLayout).toContain('[data-testid="mar-ambulatory-pending-fallback-hint"]');
    expect(encounterLayout).toContain('[data-testid="mar-ambulatory-empty-tasks"]');
    expect(encounterLayout).toContain('content: "No medication scheduled."');
    expect(medicationTab).toContain('data-testid="mar-ambulatory-empty-tasks"');
    expect(medicationTab).toContain("medication-administrations");
  });

  it("removes only presentation sublines from Notes, Rx, and Summary", () => {
    expect(encounterLayout).toContain(':has([data-testid="encounter-notes-editor"]) h2 + div');
    expect(encounterLayout).toContain('[data-testid="clinic-care-ambulatory-prescriptions"] > h3 + p');
    expect(encounterLayout).toContain('[data-testid="clinic-care-ambulatory-clinical-summary"] > h3 + p');
    expect(encounterLayout).toContain('[data-testid="encounter-clinical-record-summary"] > div:first-child h2 + div');
    expect(notes).toContain('t("encounterNotes.subline")');
    expect(rx).toContain('t("clinicCareD4c5b3.rx.hint")');
    expect(summary).toContain("encounterClinicalRecordSummary.readOnlySubline");
  });
});
