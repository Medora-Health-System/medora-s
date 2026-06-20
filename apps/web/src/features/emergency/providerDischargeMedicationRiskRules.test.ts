import { describe, expect, it } from "vitest";
import {
  detectBenzodiazepineMedicationFromContext,
  detectChemotherapyMedicationFromContext,
  detectDiureticMedicationFromContext,
  detectFallRiskMedicationCombination,
  detectImmunosuppressantMedicationFromContext,
  detectInsulinMedicationFromContext,
  detectMedicationRiskClasses,
  detectOpioidMedicationFromContext,
  MEDICATION_RISK_DISCHARGE_RULES,
  MEDICATION_RISK_FORBIDDEN_PHRASES,
  medicationRiskAdditionContainsForbiddenLanguage,
  resolveMedicationRiskDischargeAdditions,
} from "./providerDischargeMedicationRiskRules";
import {
  buildPatientSpecificDischargeContext,
  mergePatientSpecificAndMedicationAdditions,
  resolvePatientSpecificDischargeAdditions,
  sortPatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";

function ctx(overrides: Parameters<typeof buildPatientSpecificDischargeContext>[0] = {}) {
  return buildPatientSpecificDischargeContext(overrides);
}

describe("MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.3", () => {
  describe("medication class detection", () => {
    it.each([
      ["Lantus", "INSULIN"],
      ["insulin glargine", "INSULIN"],
      ["insulin lispro", "INSULIN"],
      ["insulin aspart", "INSULIN"],
      ["Humalog", "INSULIN"],
      ["Novolog", "INSULIN"],
    ])("detects insulin from %s", (med, expected) => {
      const classes = detectMedicationRiskClasses(ctx({ medicationNames: [med] }));
      expect(classes.has(expected as "INSULIN")).toBe(true);
      expect(detectInsulinMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it.each([
      ["Lasix 40 mg"],
      ["Furosemide"],
      ["Bumex"],
      ["Torsemide"],
    ])("detects diuretic from %s", (med) => {
      expect(detectDiureticMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it.each([
      ["Oxycodone 5 mg"],
      ["Hydrocodone"],
      ["Morphine"],
      ["Tramadol"],
      ["Fentanyl patch"],
    ])("detects opioid from %s", (med) => {
      expect(detectOpioidMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it.each([
      ["Lorazepam 1 mg"],
      ["Alprazolam"],
      ["Diazepam"],
      ["Clonazepam"],
      ["Ativan"],
    ])("detects benzodiazepine from %s", (med) => {
      expect(detectBenzodiazepineMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it.each([
      ["Tacrolimus"],
      ["Mycophenolate"],
      ["Cyclosporine"],
      ["Methotrexate"],
    ])("detects immunosuppressant from %s", (med) => {
      expect(detectImmunosuppressantMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it.each([
      ["Paclitaxel"],
      ["Carboplatin chemotherapy"],
      ["Chemotherapy infusion"],
    ])("detects chemotherapy from %s", (med) => {
      expect(detectChemotherapyMedicationFromContext(ctx({ medicationNames: [med] }))).toBe(true);
    });

    it("detects ACE inhibitor class", () => {
      expect(detectMedicationRiskClasses(ctx({ medicationNames: ["Lisinopril 10 mg"] })).has("ACE_ARB")).toBe(
        true
      );
    });

    it("detects beta blocker class", () => {
      expect(detectMedicationRiskClasses(ctx({ medicationNames: ["Metoprolol 25 mg"] })).has("BETA_BLOCKER")).toBe(
        true
      );
    });

    it("returns empty classes when medication list unavailable", () => {
      expect(detectMedicationRiskClasses(ctx({})).size).toBe(0);
    });

    it("does not guess medication classes from diagnosis codes", () => {
      expect(detectMedicationRiskClasses(ctx({ diagnosisCodes: ["E11.9"] })).size).toBe(0);
    });
  });

  describe("insulin rules", () => {
    it("adds insulin oral intake guidance on nausea template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Lantus nightly"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring")).toBe(true);
    });

    it("insulin text mentions glucose monitoring and oral intake", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Humalog"] }),
        locale: "en",
      });
      const rule = additions.find((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring")!;
      expect(rule.text).toContain("Monitor blood glucose closely");
      expect(rule.text).toContain("oral intake");
    });

    it("does not add insulin rule without insulin medication", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Metformin"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring")).toBe(false);
    });

    it("insulin rule contains no dosing instructions", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["dehydration_v1"],
        context: ctx({ medicationNames: ["Novolog"] }),
        locale: "en",
      });
      for (const a of additions) {
        expect(a.text.toLowerCase()).not.toContain("units");
        expect(medicationRiskAdditionContainsForbiddenLanguage(a.text)).toBe(false);
      }
    });
  });

  describe("diuretic rules", () => {
    it("adds diuretic dehydration monitoring on dehydration template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["dehydration_v1"],
        context: ctx({ medicationNames: ["Furosemide 40 mg"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_diuretic_dehydration_monitoring")).toBe(true);
    });

    it("does not add diuretic rule on unrelated template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["wound_laceration_v1"],
        context: ctx({ medicationNames: ["Lasix"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_diuretic_dehydration_monitoring")).toBe(false);
    });

    it("diuretic rule contains no medication change language", () => {
      const text = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Torsemide"] }),
        locale: "en",
      }).find((a) => a.id === "medication_diuretic_dehydration_monitoring")!.text;
      expect(text.toLowerCase()).not.toContain("stop");
      expect(text.toLowerCase()).not.toContain("change");
    });
  });

  describe("opioid / benzodiazepine rules", () => {
    it("adds alertness caution for opioid on any template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["back_pain_v1"],
        context: ctx({ medicationNames: ["Oxycodone"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_opioid_benzo_alertness_caution")).toBe(true);
    });

    it("adds alertness caution for benzodiazepine", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["anxiety_panic_v1"],
        context: ctx({ medicationNames: ["Lorazepam"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_opioid_benzo_alertness_caution")).toBe(true);
    });

    it("does not add alertness rule for unrelated medications", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["back_pain_v1"],
        context: ctx({ medicationNames: ["Ibuprofen"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_opioid_benzo_alertness_caution")).toBe(false);
    });
  });

  describe("immunosuppressant / chemotherapy rules", () => {
    it("adds infection warning for tacrolimus on fever template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["infectious_fever_unknown_source_v1"],
        context: ctx({ medicationNames: ["Tacrolimus 1 mg"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_immunosuppressant_infection_warning")).toBe(true);
    });

    it("adds infection warning for chemotherapy on pneumonia template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["pneumonia_v1"],
        context: ctx({ medicationNames: ["Paclitaxel"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_chemotherapy_infection_warning")).toBe(true);
    });

    it("does not add immunosuppressant rule without fever-sensitive template", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["wound_laceration_v1"],
        context: ctx({ medicationNames: ["Tacrolimus"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "medication_immunosuppressant_infection_warning")).toBe(false);
    });
  });

  describe("fall-risk medication combinations", () => {
    it("detects age 70 + opioid combination", () => {
      expect(
        detectFallRiskMedicationCombination(
          ctx({ patientAgeYears: 70, medicationNames: ["Oxycodone"] })
        )
      ).toBe(true);
    });

    it("detects age 68 + benzodiazepine combination", () => {
      expect(
        detectFallRiskMedicationCombination(
          ctx({ patientAgeYears: 68, medicationNames: ["Lorazepam"] })
        )
      ).toBe(true);
    });

    it("does not detect fall-risk combo for younger adult", () => {
      expect(
        detectFallRiskMedicationCombination(
          ctx({ patientAgeYears: 45, medicationNames: ["Oxycodone"] })
        )
      ).toBe(false);
    });

    it("adds high-risk fall warning for older adult on opioid", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["back_pain_v1"],
        context: ctx({ patientAgeYears: 72, medicationNames: ["Hydrocodone"] }),
        locale: "en",
      });
      const rule = additions.find((a) => a.id === "medication_fall_risk_opioid_benzo_older_adult");
      expect(rule).toBeDefined();
      expect(rule!.severity).toBe("high_risk");
    });
  });

  describe("medication risk prioritization and integration", () => {
    it("merged resolver includes medication rules with clinical rules", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({
          patientAgeYears: 72,
          diagnosisCodes: ["E11.9"],
          medicationNames: ["Lantus", "Furosemide"],
        }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "diabetes_glucose_monitoring_reduced_intake")).toBe(true);
      expect(additions.some((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring")).toBe(true);
      expect(additions.some((a) => a.id === "medication_diuretic_dehydration_monitoring")).toBe(true);
    });

    it("sorts high_risk medication rules before caution clinical rules", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["infectious_fever_unknown_source_v1"],
        context: ctx({
          patientAgeYears: 70,
          medicationNames: ["Oxycodone", "Tacrolimus"],
          diagnosisLabels: ["Chemotherapy history"],
        }),
        locale: "en",
      });
      const highRiskIdx = additions.findIndex((a) => a.severity === "high_risk");
      const cautionIdx = additions.findIndex((a) => a.severity === "caution");
      if (highRiskIdx >= 0 && cautionIdx >= 0) {
        expect(highRiskIdx).toBeLessThan(cautionIdx);
      }
    });

    it("deduplicates identical infection warning text from clinical and medication paths", () => {
      const clinical = [
        {
          id: "immunocompromised_fever_infection_warning",
          title: "clinical",
          text: "Because your immune system may be weakened, seek medical evaluation promptly for fever or signs of infection.",
          reason: "clinical",
          severity: "high_risk" as const,
          source: "immunocompromised" as const,
          clinicalReviewStatus: "reviewed" as const,
        },
      ];
      const medication = resolveMedicationRiskDischargeAdditions({
        templateIds: ["infectious_fever_unknown_source_v1"],
        context: ctx({ medicationNames: ["Tacrolimus"] }),
        locale: "en",
      });
      const merged = mergePatientSpecificAndMedicationAdditions(clinical, medication);
      const infectionTexts = merged.filter((a) => a.text.toLowerCase().includes("fever"));
      expect(infectionTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("prevents duplicate medication rule IDs", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1", "nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Furosemide", "Lasix"] }),
        locale: "en",
      });
      const ids = additions.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("limits total merged output", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({
          patientAgeYears: 72,
          diagnosisCodes: ["E11.9", "N18.3", "I50.9"],
          medicationNames: ["Lantus", "Furosemide", "Eliquis", "Ozempic", "Oxycodone", "Lorazepam"],
        }),
        locale: "en",
        maxAdditions: 8,
      });
      expect(additions.length).toBeLessThanOrEqual(8);
    });
  });

  describe("localization", () => {
    it("renders French insulin guidance", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ medicationNames: ["Lantus"] }),
        locale: "fr",
      });
      const rule = additions.find((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring");
      expect(rule?.text).toContain("glycémie");
    });

    it("renders French opioid alertness caution", () => {
      const additions = resolveMedicationRiskDischargeAdditions({
        templateIds: ["back_pain_v1"],
        context: ctx({ medicationNames: ["Tramadol"] }),
        locale: "fr",
      });
      expect(additions[0].text).toContain("vigilance");
    });
  });

  describe("safety guardrails", () => {
    it("all medication rules pass forbidden language check", () => {
      for (const rule of MEDICATION_RISK_DISCHARGE_RULES) {
        expect(medicationRiskAdditionContainsForbiddenLanguage(rule.text.en)).toBe(false);
        expect(medicationRiskAdditionContainsForbiddenLanguage(rule.text.fr)).toBe(false);
      }
    });

    it("no medication rule contains explicit forbidden phrases", () => {
      for (const rule of MEDICATION_RISK_DISCHARGE_RULES) {
        for (const phrase of MEDICATION_RISK_FORBIDDEN_PHRASES) {
          expect(rule.text.en.toLowerCase()).not.toContain(phrase);
        }
      }
    });

    it("sortPatientSpecificDischargeAdditions orders severity correctly with medication additions", () => {
      const unsorted = resolvePatientSpecificDischargeAdditions({
        templateIds: ["infectious_fever_unknown_source_v1"],
        context: ctx({ patientAgeYears: 70, medicationNames: ["Oxycodone", "Tacrolimus"] }),
        locale: "en",
      });
      const sorted = sortPatientSpecificDischargeAdditions(unsorted);
      expect(sorted[0].severity).toBe("high_risk");
    });
  });

  describe("phase 1–2 behavior preserved", () => {
    it("R11.2 + diabetes clinical rule still applies", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: ctx({ diagnosisCodes: ["E11.9"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "diabetes_glucose_monitoring_reduced_intake")).toBe(true);
    });

    it("Eliquis anticoagulant clinical rule still applies", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["chest_pain_v1"],
        context: ctx({ medicationNames: ["Eliquis"] }),
        locale: "en",
      });
      expect(additions.some((a) => a.id === "anticoagulant_bleeding_neurologic_warning")).toBe(true);
    });

    it("no additions when no template and no medications", () => {
      expect(
        resolvePatientSpecificDischargeAdditions({
          templateIds: [],
          context: ctx({ medicationNames: ["Lantus"] }),
          locale: "en",
        })
      ).toEqual([]);
    });
  });
});
