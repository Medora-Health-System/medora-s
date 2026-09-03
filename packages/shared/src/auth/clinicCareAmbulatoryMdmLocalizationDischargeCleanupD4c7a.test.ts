/**
 * MEDUI.D4C.7A — shared helpers for ambulatory MDM localization + discharge cleanup.
 */

import { describe, expect, it } from "vitest";
import {
  AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS,
  CLINIC_CARE_AMBULATORY_MDM_LOCALIZATION_DISCHARGE_CLEANUP_CERTIFICATION_ID,
  D4C7A_AUTHORITATIVE_AMBULATORY_DISCHARGE_MOUNT,
  D4C7A_FORBIDDEN_AUTHORITY_NAMES,
  D4C7A_OBSOLETE_AMBULATORY_DISCHARGE_MOUNT,
  ambulatoryMdmNarrativeContainsEdOnlyWording,
  applyExplicitFrenchMdmFragmentRefresh,
  detectLegacyEnglishMdmInFrenchDraft,
  omitEmptyAmbulatoryHiddenMdmFields,
  resolveAmbulatoryHighValueMdmTargetField,
  resolveAuthoredDocumentLocale,
  resolveMdmHighValueFragmentKey,
  shouldHideAmbulatoryRoutineMedEvalMdmChromeFields,
} from "./clinicCareAmbulatoryMdmLocalizationDischargeCleanupD4c7a.js";

describe("MEDUI.D4C.7A ambulatory MDM localization / discharge cleanup", () => {
  it("A — certification id and no ClinicMDM / ClinicDischarge forks listed", () => {
    expect(CLINIC_CARE_AMBULATORY_MDM_LOCALIZATION_DISCHARGE_CLEANUP_CERTIFICATION_ID).toBe(
      "MEDUI.D4C.7A"
    );
    expect(D4C7A_FORBIDDEN_AUTHORITY_NAMES).toContain("ClinicMDM");
    expect(D4C7A_FORBIDDEN_AUTHORITY_NAMES).toContain("ClinicDischarge");
    expect(D4C7A_AUTHORITATIVE_AMBULATORY_DISCHARGE_MOUNT).toBe(
      "ProviderDischargeDocumentationSection"
    );
    expect(D4C7A_OBSOLETE_AMBULATORY_DISCHARGE_MOUNT).toBe(
      "PatientDischargeInstructionsClosureCard"
    );
  });

  it("B — care-setting presentation filter hides Justification clinique / Actions immédiates only for AMBULATORY", () => {
    expect(
      shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode: "AMBULATORY" })
    ).toBe(true);
    expect(shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode: "ED" })).toBe(
      false
    );
    expect(
      shouldHideAmbulatoryRoutineMedEvalMdmChromeFields({ encounterMode: "OBSERVATION" })
    ).toBe(false);
    expect(AMBULATORY_HIDDEN_MDM_PRESENTATION_FIELDS).toEqual([
      "mdmClinicalRationale",
      "mdmImmediateActionsRationale",
    ]);
  });

  it("C — authored-document locale prefers explicit authored over app locale; locale ≠ jurisdiction", () => {
    expect(resolveAuthoredDocumentLocale({ appLocale: "en", authoredDocumentLocale: "fr" })).toBe(
      "fr"
    );
    expect(resolveAuthoredDocumentLocale({ appLocale: "fr", authoredDocumentLocale: "en" })).toBe(
      "en"
    );
    expect(resolveAuthoredDocumentLocale({ appLocale: "fr" })).toBe("fr");
    expect(resolveAuthoredDocumentLocale({ appLocale: "en" })).toBe("en");
    expect(resolveAuthoredDocumentLocale({ appLocale: "es" })).toBe("en");
    expect(resolveAuthoredDocumentLocale({ authoredDocumentLocale: "es-MX", appLocale: "fr" })).toBe(
      "fr"
    );
  });

  it("D — ambulatory high-value MDM fragment keys map to ambulatory catalog; ED unchanged", () => {
    expect(
      resolveMdmHighValueFragmentKey({
        fragmentKey: "providerDocumentationMdmHighValue.standardMdm",
        encounterMode: "AMBULATORY",
      })
    ).toBe("providerDocumentationMdmHighValueAmbulatory.standardMdm");
    expect(
      resolveMdmHighValueFragmentKey({
        fragmentKey: "providerDocumentationMdmHighValue.patientConcern",
        encounterMode: "ED",
      })
    ).toBe("providerDocumentationMdmHighValue.patientConcern");
  });

  it("E — ambulatory remaps clinical-rationale high-value inserts onto visible fields", () => {
    expect(
      resolveAmbulatoryHighValueMdmTargetField({
        templateId: "hv-standard-mdm",
        defaultField: "mdmClinicalRationale",
        encounterMode: "AMBULATORY",
      })
    ).toBe("mdmWorkingAssessment");
    expect(
      resolveAmbulatoryHighValueMdmTargetField({
        templateId: "hv-diagnostic-studies-review",
        defaultField: "mdmClinicalRationale",
        encounterMode: "AMBULATORY",
      })
    ).toBe("mdmDataReviewed");
    expect(
      resolveAmbulatoryHighValueMdmTargetField({
        templateId: "hv-standard-mdm",
        defaultField: "mdmClinicalRationale",
        encounterMode: "ED",
      })
    ).toBe("mdmClinicalRationale");
  });

  it("F — ambulatory MDM forbids ED-only wording", () => {
    expect(
      ambulatoryMdmNarrativeContainsEdOnlyWording(
        "They are invited to return to the ED at any time if there is any change."
      )
    ).toBe(true);
    expect(
      ambulatoryMdmNarrativeContainsEdOnlyWording(
        "Return to the emergency department immediately for worsening symptoms."
      )
    ).toBe(true);
    expect(
      ambulatoryMdmNarrativeContainsEdOnlyWording(
        "Le patient a été informé de reconsulter rapidement en cas d'aggravation."
      )
    ).toBe(false);
  });

  it("G — legacy English in French draft needs explicit refresh; signed immutable", () => {
    const english =
      "The patient was substantially concerned that their symptoms were potentially risking their life.";
    const detect = detectLegacyEnglishMdmInFrenchDraft({
      authoredLocale: "fr",
      fieldTexts: [english, "texte libre clinicien"],
      englishFragments: [english],
    });
    expect(detect.needsExplicitFrenchRefresh).toBe(true);

    const signed = detectLegacyEnglishMdmInFrenchDraft({
      authoredLocale: "fr",
      fieldTexts: [english],
      englishFragments: [english],
      signedOrFinalized: true,
    });
    expect(signed.needsExplicitFrenchRefresh).toBe(false);

    const applied = applyExplicitFrenchMdmFragmentRefresh({
      fieldText: `${english}\n\ntexte libre clinicien`,
      replacements: [
        {
          english,
          french:
            "Le patient était fortement préoccupé que ses symptômes mettent potentiellement sa vie en danger et qu'une évaluation médicale immédiate soit nécessaire.",
        },
      ],
    });
    expect(applied.replacedCount).toBe(1);
    expect(applied.nextText).toContain("texte libre clinicien");
    expect(applied.nextText).not.toContain("substantially concerned");
  });

  it("H — empty hidden ambulatory MDM fields omitted from persisted blob", () => {
    const omitted = omitEmptyAmbulatoryHiddenMdmFields(
      {
        mdmWorkingAssessment: "ok",
        mdmClinicalRationale: "",
        mdmImmediateActionsRationale: "   ",
        mdmPlanSummary: "plan",
      },
      "AMBULATORY"
    );
    expect(omitted).not.toHaveProperty("mdmClinicalRationale");
    expect(omitted).not.toHaveProperty("mdmImmediateActionsRationale");
    expect(omitted.mdmWorkingAssessment).toBe("ok");

    const edKept = omitEmptyAmbulatoryHiddenMdmFields(
      { mdmClinicalRationale: "", mdmImmediateActionsRationale: "" },
      "ED"
    );
    expect(edKept).toHaveProperty("mdmClinicalRationale");
  });
});
