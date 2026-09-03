/**
 * MEDUI.D4C.7A — web source guards for ambulatory MDM FR localization
 * and duplicate ambulatory discharge removal.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  applyMdmTemplatePendingSelections,
  buildMdmTemplateDropdownOptions,
  HIGH_VALUE_MDM_TEMPLATES,
} from "@/lib/providerDocumentationMdmTemplateCatalog";
import { emptyProviderDocumentationWorkspaceState } from "@/lib/providerDocumentationModel";
import {
  ambulatoryMdmNarrativeContainsEdOnlyWording,
  shouldHideAmbulatoryRoutineMedEvalMdmChromeFields,
} from "@medora/shared";

const featureDir = __dirname;
const root = join(featureDir, "../../..");

function readFeature(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

function readWeb(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8");
}

const enMessages = readFileSync(join(root, "src/i18n/messages/en.ts"), "utf8");
const frMessages = readFileSync(join(root, "src/i18n/messages/fr.ts"), "utf8");

describe("MEDUI.D4C.7A ambulatory MDM localization / discharge cleanup", () => {
  it("A — Justification clinique + Actions immédiates hidden for AMBULATORY presentation only", () => {
    const workspace = readWeb("components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(workspace).toContain("shouldHideAmbulatoryRoutineMedEvalMdmChromeFields");
    expect(workspace).toContain("hideAmbulatoryMdmChrome");
    expect(workspace).toContain('{!hideAmbulatoryMdmChrome ? (');
    expect(workspace).toContain('providerDocumentationWorkspace.clinicalRationale');
    expect(workspace).toContain('providerDocumentationWorkspace.immediateActions');
    expect(shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode: "AMBULATORY" })).toBe(
      true
    );
    expect(shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode: "ED" })).toBe(false);
  });

  it("B — French ambulatory MDM catalog inserts French narrative without ED boilerplate", () => {
    expect(frMessages).toContain("providerDocumentationMdmHighValueAmbulatory");
    expect(frMessages).toContain("Le patient vit à domicile avec sa famille");
    expect(frMessages).toContain("Préoccupation du patient");
    expect(frMessages).toContain("sevrage tabagique");
    expect(frMessages).toMatch(/providerDocumentationMdmHighValueAmbulatory[\s\S]{0,1200}reconsulter rapidement/);
    expect(frMessages).not.toMatch(
      /providerDocumentationMdmHighValueAmbulatory[\s\S]{0,2000}return to the ED/i
    );
    expect(frMessages).not.toMatch(
      /providerDocumentationMdmHighValueAmbulatory[\s\S]{0,2000}emergency department/i
    );
    expect(enMessages).toContain("providerDocumentationMdmHighValueAmbulatory");
    const options = buildMdmTemplateDropdownOptions(null, "AMBULATORY");
    const standard = options.find((o) => o.id === "hv-standard-mdm");
    expect(standard?.fragmentKey).toBe("providerDocumentationMdmHighValueAmbulatory.standardMdm");
    expect(standard?.field).toBe("mdmWorkingAssessment");
  });

  it("C — ED high-value MDM catalog keys unchanged (no global U.S. ED narrative rewrite)", () => {
    const options = buildMdmTemplateDropdownOptions(null, "ED");
    const standard = options.find((o) => o.id === "hv-standard-mdm");
    expect(standard?.fragmentKey).toBe("providerDocumentationMdmHighValue.standardMdm");
    expect(standard?.field).toBe("mdmClinicalRationale");
    expect(enMessages).toContain("return to the ED");
  });

  it("D — obsolete PatientDischargeInstructionsClosureCard removed from ambulatory discharge workflow", () => {
    const workflow = readFeature("ClinicCareAmbulatoryDischargeWorkflow.tsx");
    expect(workflow).not.toContain("PatientDischargeInstructionsClosureCard");
    expect(workflow).toContain("ProviderDischargeDocumentationSection");
    expect(workflow).toContain("clinicCareD4c7a.discharge.singleEngineHint");
    expect(existsSync(join(featureDir, "ClinicDischarge.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicMDM.tsx"))).toBe(false);
  });

  it("E — Med Eval still reuses ProviderDocumentationWorkspace AMBULATORY (no ClinicMDM)", () => {
    const me = readFeature("ClinicCareAmbulatoryMedicalEvaluationPanel.tsx");
    expect(me).toContain("ProviderDocumentationWorkspace");
    expect(me).toContain('encounterMode="AMBULATORY"');
    expect(me).toContain("authoredDocumentLocale");
    expect(me).not.toContain("ClinicMDM");
    const clinicTab = readFileSync(
      join(root, "app/app/encounters/[id]/page.tsx"),
      "utf8"
    );
    expect(clinicTab).toContain("facilityCountry={facilityCountry}");
    expect(clinicTab).toContain("authoredDocumentLocale={resolveProductUiLanguageOrDefault(language)}");
    expect(clinicTab).toContain("facilityCountry={session.facilityCountry}");
  });

  it("F — Apply French / Refresh explicit path present; signed path immutable in source", () => {
    const workspace = readWeb("components/encounters/ProviderDocumentationWorkspace.tsx");
    expect(workspace).toContain("detectLegacyEnglishMdmInFrenchDraft");
    expect(workspace).toContain("applyExplicitFrenchMdmFragmentRefresh");
    expect(workspace).toContain("clinicCareD4c7a.mdm.applyFrenchRefresh");
    expect(workspace).toContain("signedOrFinalized");
    expect(frMessages).toContain("Appliquer le français / Actualiser");
    expect(enMessages).toContain("Apply French / Refresh");
  });

  it("G — ambulatory apply inserts ambulatory French fragments into visible fields", () => {
    const frFragments: Record<string, string> = {
      "providerDocumentationMdmHighValueAmbulatory.standardMdm":
        "Le patient vit à domicile avec sa famille et bénéficie d'un bon soutien familial et social.",
      "providerDocumentationMdmHighValueAmbulatory.patientConcern":
        "Le patient était fortement préoccupé que ses symptômes mettent potentiellement sa vie en danger et qu'une évaluation médicale immédiate soit nécessaire.",
      "providerDocumentationMdmHighValueAmbulatory.diagnosticStudiesReview":
        "Des examens diagnostiques, analyses de laboratoire, imagerie et autres évaluations cliniquement indiquées ont été prescrits.",
      "providerDocumentationMdmHighValueAmbulatory.ekgNormal": "L'ECG montrait un rythme sinusal normal.",
      "providerDocumentationMdmHighValueAmbulatory.smokingCessation":
        "Le patient a reçu un conseil de sevrage tabagique.",
      "providerDocumentationMdmHighValueAmbulatory.pmpReviewed":
        "Programme de surveillance des prescriptions consulté lorsque disponible.",
    };
    const resolveFragment = (key: string) => frFragments[key] ?? key;
    const options = buildMdmTemplateDropdownOptions(null, "AMBULATORY");
    const pendingIds = new Set(HIGH_VALUE_MDM_TEMPLATES.map((item) => item.id));
    const patch = applyMdmTemplatePendingSelections({
      value: emptyProviderDocumentationWorkspaceState(),
      options,
      pendingIds,
      resolveFragment,
    });
    const blob = Object.values(patch).join("\n");
    expect(blob).toContain("soutien familial");
    expect(blob).toContain("évaluation médicale immédiate");
    expect(ambulatoryMdmNarrativeContainsEdOnlyWording(blob)).toBe(false);
    expect(patch.mdmWorkingAssessment).toBeTruthy();
    expect(patch.mdmClinicalRationale).toBeUndefined();
  });

  it("H — i18n clinicCareD4c7a mirrored EN/FR; MDM labels stay French in FR chrome", () => {
    expect(enMessages).toContain("clinicCareD4c7a:");
    expect(frMessages).toContain("clinicCareD4c7a:");
    expect(frMessages).toContain('mdmTemplateStandardMdm: "MDM standard"');
    expect(frMessages).toContain('mdmTemplatePatientConcern: "Préoccupation du patient"');
    expect(frMessages).toContain('mdmTemplateEkgNormal: "ECG normal"');
    expect(frMessages).toContain('mdmTemplateDiagnosticStudiesReview: "Études diagnostiques et revue MDM"');
    expect(frMessages).toContain('mdmTemplateSmokingCessation: "Sevrage tabagique"');
    expect(frMessages).toContain("Justification clinique");
    expect(frMessages).toContain("Actions immédiates / justification");
  });
});
