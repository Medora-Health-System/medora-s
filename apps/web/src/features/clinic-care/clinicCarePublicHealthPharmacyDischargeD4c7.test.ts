/**
 * MEDUI.D4C.7 — web source guards for public health / pharmacy / ambulatory discharge.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const featureDir = __dirname;

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.7 Clinic Care public health / pharmacy / discharge mounts", () => {
  it("A — Follow-up mounts shared ProviderDischargeDocumentationSection via D4C.7 workflow", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    const workflow = read("ClinicCareAmbulatoryDischargeWorkflow.tsx");
    expect(panels).toContain("ClinicCareAmbulatoryDischargeWorkflow");
    expect(workflow).toContain("ProviderDischargeDocumentationSection");
    expect(workflow).toContain("careSettingContext");
    expect(workflow).toContain('careSetting: "CLINIC"');
    expect(existsSync(join(featureDir, "ClinicDischarge.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicDischargeInstruction.tsx"))).toBe(false);
  });

  it("B — facilityDisplayName threaded from Active Workspace", () => {
    const active = read("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(active).toContain("facilityDisplayName=");
    expect(panels).toContain("facilityDisplayName");
    expect(panels).toContain("facilityCountry");
  });

  it("C — PatientDischargeInstructionsClosureCard removed from ambulatory Suivi/sortie (D4C.7A)", () => {
    const workflow = read("ClinicCareAmbulatoryDischargeWorkflow.tsx");
    expect(workflow).not.toContain("PatientDischargeInstructionsClosureCard");
    expect(workflow).toContain("clinic-care-d4c7-discharge-workflow");
    expect(workflow).toContain("ProviderDischargeDocumentationSection");
    expect(workflow).toContain("clinicCareD4c7a.discharge.singleEngineHint");
  });

  it("D — PH deep links to enterprise Vaccinations / Déclarations (no Open PH gateway card)", () => {
    const workflow = read("ClinicCareAmbulatoryDischargeWorkflow.tsx");
    expect(workflow).toContain("buildClinicCarePublicHealthDeepLink");
    expect(workflow).toContain("vaccinations");
    expect(workflow).toContain("diseaseReports");
    expect(workflow).not.toMatch(/Open PH gateway/i);
    expect(existsSync(join(featureDir, "ClinicVaccination.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicDiseaseReport.tsx"))).toBe(false);
  });

  it("E — Summary still reuses EmergencyVisitSummaryPanel (no ClinicSummary)", () => {
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("EmergencyVisitSummaryPanel");
    expect(panels).toContain("summaryReadOnly");
    expect(existsSync(join(featureDir, "ClinicSummary.tsx"))).toBe(false);
  });

  it("F — care-setting adaptation lives on apply path (typed context)", () => {
    const registry = read("../emergency/providerDischargeTemplateRegistry.ts");
    const gold = read("../emergency/providerDischargeTemplateGoldStandard.ts");
    const section = read("../emergency/ProviderDischargeDocumentationSection.tsx");
    expect(registry).toContain("adaptDischargeSuggestedTextBodyForCareSetting");
    expect(registry).toContain("careSettingContext");
    expect(gold).toContain("resolveUniversalReturnSuffixForCareSetting");
    expect(section).toContain("careSettingContext");
    expect(section).toContain("resolveDischargeVisitFramingPhrases");
  });

  it("G — Clinic pharmacy redirect uses ambulatory filter; no ClinicPharmacy", () => {
    const pharmacyRedirect = readFileSync(
      join(featureDir, "../../../app/app/clinic-care/pharmacy/page.tsx"),
      "utf8"
    );
    const pharmacyPage = readFileSync(join(featureDir, "../../../app/app/pharmacy/page.tsx"), "utf8");
    expect(pharmacyRedirect).toContain("buildClinicPharmacyEntryHref");
    expect(pharmacyRedirect).toContain("ClinicCareDirectCanonicalRedirect");
    expect(pharmacyPage).toContain("filterAmbulatoryPharmacyQueueOrders");
    expect(existsSync(join(featureDir, "ClinicPharmacy.tsx"))).toBe(false);
  });

  it("H — i18n clinicCareD4c7 mirrored EN/FR checkout + print gates", () => {
    const en = readFileSync(join(featureDir, "../../i18n/messages/en.ts"), "utf8");
    const fr = readFileSync(join(featureDir, "../../i18n/messages/fr.ts"), "utf8");
    expect(en).toContain("clinicCareD4c7:");
    expect(fr).toContain("clinicCareD4c7:");
    expect(fr).toContain("Retour à domicile");
    expect(fr).toContain("Sortie de la consultation");
    expect(fr).toContain("jamais");
    expect(fr).toContain("urgence");
    expect(en).toContain("Visit checkout");
    expect(en).toContain("blockedEdWording");
  });
});
