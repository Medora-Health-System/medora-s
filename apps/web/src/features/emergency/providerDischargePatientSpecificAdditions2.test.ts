import { describe, expect, it } from "vitest";
import {
  BEHAVIORAL_HEALTH_TEMPLATE_IDS,
  detectAnticoagulantMedicationFromContext,
  detectAsthmaFromContext,
  detectCopdFromContext,
  detectCkdProgressionFromContext,
  detectDiabetesComplicationFromContext,
  detectHeartFailureFromContext,
  detectImmunocompromisedFromContext,
  detectPolypharmacyFromContext,
  detectPregnancyFromContext,
  MAX_PATIENT_SPECIFIC_ADDITIONS,
  PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES,
  PATIENT_SPECIFIC_DISCHARGE_RULES,
  patientSpecificAdditionContainsForbiddenLanguage,
  resolvePatientSpecificDischargeAdditions,
  sortPatientSpecificDischargeAdditions,
  SEVERITY_SORT_ORDER,
  buildPatientSpecificDischargeContext,
} from "./providerDischargePatientSpecificAdditions";

function ctx(overrides: Parameters<typeof buildPatientSpecificDischargeContext>[0] = {}) {
  return buildPatientSpecificDischargeContext(overrides);
}

function resolve(
  templateIds: string[],
  context: ReturnType<typeof buildPatientSpecificDischargeContext>,
  locale: "en" | "fr" = "en"
) {
  return resolvePatientSpecificDischargeAdditions({ templateIds, context, locale });
}

const EIGHT_MEDS = [
  "Lisinopril 10 mg",
  "Metformin 500 mg",
  "Atorvastatin 20 mg",
  "Aspirin 81 mg",
  "Vitamin D",
  "Omeprazole 20 mg",
  "Amlodipine 5 mg",
  "Levothyroxine 50 mcg",
];

describe("MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.2", () => {
  describe("anticoagulant personalization", () => {
    it.each([
      ["Eliquis", "eliquis"],
      ["Apixaban", "apixaban"],
      ["Xarelto", "xarelto"],
      ["Rivaroxaban", "rivaroxaban"],
      ["Pradaxa", "pradaxa"],
      ["Dabigatran", "dabigatran"],
      ["Warfarin", "warfarin"],
      ["Coumadin", "coumadin"],
      ["Lovenox", "lovenox"],
      ["Enoxaparin", "enoxaparin"],
    ])("detects %s anticoagulant", (_label, token) => {
      expect(detectAnticoagulantMedicationFromContext(ctx({ medicationNames: [`${token} daily`] }))).toBe(
        true
      );
    });

    it("adds bleeding warning for Eliquis on any discharge template", () => {
      const additions = resolve(["chest_pain_v1"], ctx({ medicationNames: ["Eliquis 5 mg"] }));
      expect(additions.some((a) => a.id === "anticoagulant_bleeding_neurologic_warning")).toBe(true);
      expect(additions[0].severity).toBe("high_risk");
    });

    it("does not add anticoagulant guidance without medication evidence", () => {
      const additions = resolve(["chest_pain_v1"], ctx({ diagnosisCodes: ["I10"] }));
      expect(additions.some((a) => a.source === "anticoagulant")).toBe(false);
    });

    it("anticoagulant text contains no dosing advice", () => {
      const additions = resolve(["wound_laceration_v1"], ctx({ medicationNames: ["Warfarin 5 mg"] }));
      const text = additions.find((a) => a.id === "anticoagulant_bleeding_neurologic_warning")!.text;
      expect(text.toLowerCase()).not.toContain("mg");
      expect(patientSpecificAdditionContainsForbiddenLanguage(text)).toBe(false);
    });
  });

  describe("heart failure personalization", () => {
    it("detects I50 heart failure ICD", () => {
      expect(detectHeartFailureFromContext(ctx({ diagnosisCodes: ["I50.9"] }))).toBe(true);
    });

    it("detects CHF label", () => {
      expect(detectHeartFailureFromContext(ctx({ diagnosisLabels: ["Congestive heart failure"] }))).toBe(
        true
      );
    });

    it("adds HF monitoring on shortness of breath template", () => {
      const additions = resolve(
        ["shortness_of_breath_v1"],
        ctx({ diagnosisCodes: ["I50.23"], diagnosisLabels: ["Heart failure"] })
      );
      expect(additions.some((a) => a.id === "heart_failure_symptom_monitoring")).toBe(true);
    });

    it("does not add HF monitoring without HF evidence", () => {
      const additions = resolve(["shortness_of_breath_v1"], ctx({ diagnosisCodes: ["J06.9"] }));
      expect(additions.some((a) => a.id === "heart_failure_symptom_monitoring")).toBe(false);
    });
  });

  describe("COPD / asthma personalization", () => {
    it("detects J44 COPD", () => {
      expect(detectCopdFromContext(ctx({ diagnosisCodes: ["J44.1"] }))).toBe(true);
    });

    it("detects J45 asthma", () => {
      expect(detectAsthmaFromContext(ctx({ diagnosisCodes: ["J45.909"] }))).toBe(true);
    });

    it("adds rescue warning for COPD on copd template", () => {
      const additions = resolve(["copd_exacerbation_v1"], ctx({ diagnosisCodes: ["J44.1"] }));
      expect(additions.some((a) => a.id === "copd_asthma_rescue_warning")).toBe(true);
    });

    it("adds rescue warning for asthma on asthma template", () => {
      const additions = resolve(["asthma_exacerbation_v1"], ctx({ diagnosisLabels: ["Asthma exacerbation"] }));
      expect(additions.some((a) => a.id === "copd_asthma_rescue_warning")).toBe(true);
    });

    it("does not add respiratory warning without COPD or asthma evidence", () => {
      const additions = resolve(["copd_exacerbation_v1"], ctx({ diagnosisCodes: ["R05.9"] }));
      expect(additions.some((a) => a.id === "copd_asthma_rescue_warning")).toBe(false);
    });
  });

  describe("pregnancy personalization", () => {
    it("detects O-code pregnancy diagnosis", () => {
      expect(detectPregnancyFromContext(ctx({ diagnosisCodes: ["O21.9"] }))).toBe(true);
    });

    it("detects pregnancy label", () => {
      expect(detectPregnancyFromContext(ctx({ diagnosisLabels: ["Pregnancy, first trimester"] }))).toBe(true);
    });

    it("adds OB warning on pregnancy template with pregnancy evidence", () => {
      const additions = resolve(
        ["obgyn_hyperemesis_v1"],
        ctx({ diagnosisCodes: ["O21.0"], diagnosisLabels: ["Hyperemesis in pregnancy"] })
      );
      expect(additions.some((a) => a.id === "pregnancy_ob_warning")).toBe(true);
    });

    it("never triggers pregnancy warning without pregnancy evidence", () => {
      const additions = resolve(["obgyn_hyperemesis_v1"], ctx({ diagnosisCodes: ["R11.2"] }));
      expect(additions.some((a) => a.id === "pregnancy_ob_warning")).toBe(false);
    });
  });

  describe("immunocompromised personalization", () => {
    it("detects neutropenia ICD", () => {
      expect(detectImmunocompromisedFromContext(ctx({ diagnosisCodes: ["D70.9"] }))).toBe(true);
    });

    it("detects transplant history label", () => {
      expect(detectImmunocompromisedFromContext(ctx({ diagnosisLabels: ["Kidney transplant recipient"] }))).toBe(
        true
      );
    });

    it("detects tacrolimus medication", () => {
      expect(detectImmunocompromisedFromContext(ctx({ medicationNames: ["Tacrolimus 1 mg BID"] }))).toBe(true);
    });

    it("adds infection warning on fever template", () => {
      const additions = resolve(
        ["infectious_fever_unknown_source_v1"],
        ctx({ diagnosisLabels: ["Chemotherapy history"] })
      );
      expect(additions.some((a) => a.id === "immunocompromised_fever_infection_warning")).toBe(true);
    });

    it("does not add immunocompromised warning without evidence", () => {
      const additions = resolve(["infectious_fever_unknown_source_v1"], ctx({ diagnosisCodes: ["R50.9"] }));
      expect(additions.some((a) => a.id === "immunocompromised_fever_infection_warning")).toBe(false);
    });
  });

  describe("fall risk / older adult expansion", () => {
    it("adds fall risk reminder for age 70 on syncope template", () => {
      const additions = resolve(["syncope_v1"], ctx({ patientAgeYears: 70 }));
      expect(additions.some((a) => a.id === "older_adult_fall_risk_reminder")).toBe(true);
    });

    it("adds confusion monitoring for older adult on weakness template", () => {
      const additions = resolve(["high_risk_medical_general_weakness_v1"], ctx({ patientAgeYears: 68 }));
      expect(additions.some((a) => a.id === "older_adult_confusion_monitoring")).toBe(true);
    });

    it("does not add fall risk for younger adult", () => {
      const additions = resolve(["syncope_v1"], ctx({ patientAgeYears: 45 }));
      expect(additions.some((a) => a.id === "older_adult_fall_risk_reminder")).toBe(false);
    });
  });

  describe("polypharmacy personalization", () => {
    it("detects polypharmacy at 8 medications", () => {
      expect(detectPolypharmacyFromContext(ctx({ medicationNames: EIGHT_MEDS }))).toBe(true);
    });

    it("does not detect polypharmacy below threshold", () => {
      expect(detectPolypharmacyFromContext(ctx({ medicationNames: EIGHT_MEDS.slice(0, 7) }))).toBe(false);
    });

    it("adds medication list review for polypharmacy", () => {
      const additions = resolve(["hypertension_v1"], ctx({ medicationNames: EIGHT_MEDS }));
      expect(additions.some((a) => a.id === "polypharmacy_medication_list_review")).toBe(true);
      expect(additions.find((a) => a.id === "polypharmacy_medication_list_review")!.severity).toBe("info");
    });
  });

  describe("behavioral health follow-up support", () => {
    it("adds follow-up support on behavioral health crisis template", () => {
      const additions = resolve(["behavioral_health_crisis_follow_up_v1"], ctx({}));
      expect(additions.some((a) => a.id === "behavioral_health_followup_support")).toBe(true);
    });

    it("covers all behavioral health template IDs", () => {
      for (const templateId of BEHAVIORAL_HEALTH_TEMPLATE_IDS) {
        const additions = resolve([templateId], ctx({}));
        expect(additions.some((a) => a.id === "behavioral_health_followup_support")).toBe(true);
      }
    });
  });

  describe("diabetes complications and CKD progression", () => {
    it("detects diabetes complication ICD", () => {
      expect(detectDiabetesComplicationFromContext(ctx({ diagnosisCodes: ["E11.22"] }))).toBe(true);
    });

    it("does not treat E11.9 alone as complication", () => {
      expect(detectDiabetesComplicationFromContext(ctx({ diagnosisCodes: ["E11.9"] }))).toBe(false);
    });

    it("adds complication follow-up on diabetes sick-day template", () => {
      const additions = resolve(
        ["diabetes_sick_day_precautions_v1"],
        ctx({ diagnosisCodes: ["E11.40"], diagnosisLabels: ["Diabetic neuropathy"] })
      );
      expect(additions.some((a) => a.id === "diabetes_complication_followup")).toBe(true);
    });

    it("detects advanced CKD stage", () => {
      expect(detectCkdProgressionFromContext(ctx({ diagnosisCodes: ["N18.4"] }))).toBe(true);
    });

    it("adds nephrology follow-up for advanced CKD on renal template", () => {
      const additions = resolve(
        ["renal_dehydration_followup_v1"],
        ctx({ diagnosisCodes: ["N18.5"], diagnosisLabels: ["CKD stage 5"] })
      );
      expect(additions.some((a) => a.id === "ckd_progression_nephrology_followup")).toBe(true);
    });
  });

  describe("risk prioritization engine", () => {
    it("orders high_risk before caution before info", () => {
      const additions = resolve(
        ["nausea_vomiting_v1"],
        ctx({
          patientAgeYears: 72,
          diagnosisCodes: ["E11.9", "N18.3"],
          medicationNames: [...EIGHT_MEDS, "Eliquis 5 mg", "Ozempic"],
        })
      );
      for (let i = 1; i < additions.length; i += 1) {
        expect(SEVERITY_SORT_ORDER[additions[i - 1].severity]).toBeLessThanOrEqual(
          SEVERITY_SORT_ORDER[additions[i].severity]
        );
      }
    });

    it("sortPatientSpecificDischargeAdditions is stable", () => {
      const unsorted = resolve(
        ["copd_exacerbation_v1"],
        ctx({ diagnosisCodes: ["J44.1", "I50.9"], medicationNames: ["Eliquis"], patientAgeYears: 70 })
      );
      const sorted = sortPatientSpecificDischargeAdditions(unsorted);
      expect(sorted[0].severity).toBe("high_risk");
    });

    it("limits excessive output to MAX_PATIENT_SPECIFIC_ADDITIONS", () => {
      const additions = resolve(
        ["nausea_vomiting_v1"],
        ctx({
          patientAgeYears: 72,
          diagnosisCodes: ["E11.22", "N18.5", "I50.9", "J44.1", "D70.9"],
          medicationNames: [...EIGHT_MEDS, "Eliquis", "Ozempic", "Warfarin", "Tacrolimus"],
        })
      );
      expect(additions.length).toBeLessThanOrEqual(MAX_PATIENT_SPECIFIC_ADDITIONS);
    });

    it("prevents duplicate rule IDs", () => {
      const additions = resolve(
        ["nausea_vomiting_v1", "nausea_vomiting_v1"],
        ctx({ diagnosisCodes: ["E11.9", "E11.65"], medicationNames: ["Eliquis"] })
      );
      const ids = additions.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("localization", () => {
    it("renders French anticoagulant guidance", () => {
      const additions = resolve(["chest_pain_v1"], ctx({ medicationNames: ["Eliquis"] }), "fr");
      const rule = additions.find((a) => a.id === "anticoagulant_bleeding_neurologic_warning");
      expect(rule?.text).toContain("anticoagulant");
    });

    it("renders French behavioral health follow-up", () => {
      const additions = resolve(["behavioral_health_crisis_follow_up_v1"], ctx({}), "fr");
      expect(additions[0].text).toContain("santé mentale");
    });
  });

  describe("safety guardrails", () => {
    it("all rules pass forbidden language check in English", () => {
      for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
        expect(patientSpecificAdditionContainsForbiddenLanguage(rule.text.en)).toBe(false);
        expect(patientSpecificAdditionContainsForbiddenLanguage(rule.text.fr)).toBe(false);
      }
    });

    it("no rule text contains stop or dose-change phrases", () => {
      for (const rule of PATIENT_SPECIFIC_DISCHARGE_RULES) {
        for (const phrase of PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES) {
          expect(rule.text.en.toLowerCase()).not.toContain(phrase);
        }
      }
    });
  });

  describe("phase 1 behavior preserved", () => {
    it("R11.2 + diabetes still adds glucose monitoring", () => {
      const additions = resolve(["nausea_vomiting_v1"], ctx({ diagnosisCodes: ["E11.9"] }));
      expect(additions.some((a) => a.id === "diabetes_glucose_monitoring_reduced_intake")).toBe(true);
    });

    it("R11.2 without risk factors still adds nothing", () => {
      const additions = resolve(["nausea_vomiting_v1"], ctx({ patientAgeYears: 40 }));
      expect(additions).toEqual([]);
    });

    it("unknown context still does not guess", () => {
      const additions = resolve(["nausea_vomiting_v1"], ctx({}));
      expect(additions).toEqual([]);
    });
  });
});
