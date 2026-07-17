import { describe, expect, it } from "vitest";
import {
  certifyDischargeFailureModes,
  certifyDischargeSafetyLanguage,
  certifyEnterpriseDischargeScenario,
  certifyOutputConsistencyForScenario,
  certifyProviderCustomTextPreservation,
  END_TO_END_DISCHARGE_PIPELINE_AUDIT,
  ENTERPRISE_DISCHARGE_SCENARIOS,
  runEnterpriseDischargeCertification,
  runEnterpriseScenarioCertification,
} from "./providerDischargeEnterpriseCertification";
import { resolveClinicalConditionFamily } from "./providerDischargeConditionFamilyResolver";
import { resolveDischargeTemplateForDiagnosisGated } from "./providerDischargeTemplateResolverGate";
import {
  ADULT_FEVER_TEMPLATE_ID,
  PEDIATRIC_FEVER_TEMPLATE_ID,
} from "./providerDischargePediatricFeverAgePolicy";
import { GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID, resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";
import { certifyGenericFallbackHospitalGrade } from "./providerDischargeUniversalInstructionCertification";
import { runResolverSafetyCertification } from "./providerDischargeResolverSafetyCertification";
import { mergeMedicationNamesForDischargeContext } from "./providerDischargeMedicationContext";
import {
  patientSpecificAdditionContainsForbiddenLanguage,
  resolvePatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";
import { hydrateProviderDischargeDocumentationForm } from "./providerDischargeDocumentationModel";

describe("MEDUI.ED.DISCHARGE.ENTERPRISE_CERTIFICATION.1", () => {
  describe("Phase 1 — pipeline audit", () => {
    it("01 — pipeline audit covers all major stages", () => {
      expect(END_TO_END_DISCHARGE_PIPELINE_AUDIT.length).toBeGreaterThanOrEqual(10);
      const stages = END_TO_END_DISCHARGE_PIPELINE_AUDIT.map((r) => r.stage);
      expect(stages.some((s) => s.includes("Diagnosis"))).toBe(true);
      expect(stages.some((s) => s.includes("print"))).toBe(true);
      expect(stages.some((s) => s.includes("ER packet"))).toBe(true);
    });

    it("02 — all pipeline stages certified", () => {
      expect(END_TO_END_DISCHARGE_PIPELINE_AUDIT.every((r) => r.status === "CERTIFIED")).toBe(true);
    });

    it("03 — medication context stage present", () => {
      expect(
        END_TO_END_DISCHARGE_PIPELINE_AUDIT.some((r) => r.stage.includes("Medication-aware"))
      ).toBe(true);
    });
  });

  describe("Phase 2 — E2E scenario certification (20 scenarios)", () => {
    it("04 — all 20 enterprise scenarios defined", () => {
      expect(ENTERPRISE_DISCHARGE_SCENARIOS).toHaveLength(20);
    });

    it("05 — enterprise scenario suite all pass", () => {
      const report = runEnterpriseScenarioCertification();
      expect(report.failCount).toBe(0);
      expect(report.allPass).toBe(true);
    });

    for (const scenario of ENTERPRISE_DISCHARGE_SCENARIOS) {
      it(`scenario ${scenario.id} — ${scenario.label}`, () => {
        const row = certifyEnterpriseDischargeScenario(scenario);
        expect(row.status, row.notes.join("; ")).toBe("PASS");
        expect(row.hasDescription).toBe(true);
        expect(row.hasInstructions).toBe(true);
        expect(row.hasMedicationTreatment).toBe(true);
        expect(row.hasReturnPrecautions).toBe(true);
        expect(row.hasFollowUp).toBe(true);
      });
    }

    it("26 — s01 combined risk additions present", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s01")!);
      expect(row.additionIds.some((id) => id.includes("glp1"))).toBe(true);
      expect(row.additionIds.some((id) => id.includes("older_adult"))).toBe(true);
    });

    it("27 — s10 PE unsafe family blocked in gated resolver", () => {
      const gated = resolveDischargeTemplateForDiagnosisGated(
        { code: "I26.99", displayName: "PE" },
        { featureFlags: { ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER: true } }
      );
      expect(gated.resolverPath).not.toBe("family");
    });
  });

  describe("Phase 3 — output consistency", () => {
    it("28 — output consistency for s01", () => {
      expect(certifyOutputConsistencyForScenario(ENTERPRISE_DISCHARGE_SCENARIOS[0]!).consistent).toBe(true);
    });

    it("29 — output consistency for generic fallback s14", () => {
      expect(certifyOutputConsistencyForScenario(ENTERPRISE_DISCHARGE_SCENARIOS[13]!).consistent).toBe(true);
    });

    it("30 — output consistency sample across high-risk scenarios", () => {
      for (const id of ["s02", "s05", "s12", "s14"]) {
        const scenario = ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === id)!;
        expect(certifyOutputConsistencyForScenario(scenario).consistent, id).toBe(true);
      }
    });
  });

  describe("Phase 4 — safety language", () => {
    it("31 — discharge safety language certification passes", () => {
      expect(certifyDischargeSafetyLanguage().allPass).toBe(true);
    });

    it("32 — generic fallback hospital-grade", () => {
      expect(certifyGenericFallbackHospitalGrade("en").hospitalGrade).toBe(true);
    });

    it("33 — resolver safety certification passes", () => {
      expect(runResolverSafetyCertification().allPassed).toBe(true);
    });

    it("34 — patient-specific additions free of forbidden language", () => {
      for (const scenario of ENTERPRISE_DISCHARGE_SCENARIOS.filter((s) => s.patientContext)) {
        const row = certifyEnterpriseDischargeScenario(scenario);
        expect(row.safetyLanguageOk, scenario.id).toBe(true);
      }
    });

    it("35 — R50.9 pediatric requires age context in family resolver", () => {
      expect(
        resolveClinicalConditionFamily({
          code: "R50.9",
          displayName: "Fever",
          context: { patientAgeYears: 10 },
        }).templateId
      ).toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("36 — R50.9 unknown age does not route pediatric fever", () => {
      expect(
        resolveClinicalConditionFamily({ code: "R50.9", displayName: "Fever" }).templateId
      ).not.toBe(PEDIATRIC_FEVER_TEMPLATE_ID);
    });

    it("37 — R50.9 adult fever family routing", () => {
      expect(
        resolveClinicalConditionFamily({
          code: "R50.9",
          displayName: "Fever",
          context: { patientAgeYears: 72 },
        }).templateId
      ).toBe(ADULT_FEVER_TEMPLATE_ID);
    });
  });

  describe("Phase 5 — provider custom text preservation", () => {
    it("38 — custom text preservation report passes", () => {
      expect(certifyProviderCustomTextPreservation().allPass).toBe(true);
    });

    it("39 — description preserved until refresh", () => {
      expect(certifyProviderCustomTextPreservation().descriptionPreserved).toBe(true);
    });

    it("40 — instructions preserved until refresh", () => {
      expect(certifyProviderCustomTextPreservation().instructionsPreserved).toBe(true);
    });

    it("41 — refresh updates template fields", () => {
      expect(certifyProviderCustomTextPreservation().refreshUpdatesFields).toBe(true);
    });

    it("42 — patient-specific additions render separately from custom text", () => {
      expect(certifyProviderCustomTextPreservation().additionsRenderSeparately).toBe(true);
    });
  });

  describe("Phase 6 — failure modes", () => {
    it("43 — all failure modes no crash", () => {
      expect(certifyDischargeFailureModes().every((f) => f.noCrash)).toBe(true);
    });

    it("44 — unknown code safe fallback", () => {
      const mode = certifyDischargeFailureModes().find((f) => f.mode === "unknown code")!;
      expect(mode.noCrash).toBe(true);
    });

    it("45 — invalid code safe fallback", () => {
      const mode = certifyDischargeFailureModes().find((f) => f.mode === "invalid code")!;
      expect(mode.noCrash).toBe(true);
    });

    it("46 — malformed discharge JSON hydrates safely", () => {
      expect(() =>
        hydrateProviderDischargeDocumentationForm({ providerDischargeDocumentation: 12345 })
      ).not.toThrow();
    });

    it("47 — empty medication list no medication additions", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        context: {},
        locale: "en",
      });
      expect(additions.filter((a) => a.id.startsWith("medication_"))).toHaveLength(0);
    });

    it("48 — canceled orders excluded from context", () => {
      const names = mergeMedicationNamesForDischargeContext({
        medicationOrderRows: [
          {
            id: "1",
            medicationName: "Morphine",
            dose: "—",
            route: "PO",
            instructions: "—",
            orderedBy: "Dr",
            orderedAt: "—",
            status: "CANCELLED",
          },
        ],
      });
      expect(names).toHaveLength(0);
    });
  });

  describe("Phase 7 — enterprise integration checks", () => {
    it("49 — full enterprise certification ready", () => {
      expect(runEnterpriseDischargeCertification().enterpriseReady).toBe(true);
    });

    it("50 — Z99.99 resolves generic template", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unknown" }).template.id
      ).toBe(GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID);
    });

    it("51 — R11.2 resolves nausea vomiting template", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R11.2", displayName: "Nausea and vomiting" })
          .template.id
      ).toBe("nausea_vomiting_v1");
    });

    it("52 — R07.9 chest pain template", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" }).template.id
      ).toBe("chest_pain_v1");
    });

    it("53 — E11.65 hyperglycemia template", () => {
      expect(
        resolveProviderDischargeTemplateForDiagnosis({ code: "E11.65", displayName: "Hyperglycemia" }).template.id
      ).toBe("hyperglycemia_v1");
    });

    it("54 — F41.9 family anxiety template when family resolver used", () => {
      expect(
        resolveClinicalConditionFamily({ code: "F41.9", displayName: "Anxiety" }).templateId
      ).toBe("anxiety_panic_crisis_v1");
    });

    it("55 — R45.851 suicidal ideation family template", () => {
      expect(
        resolveClinicalConditionFamily({ code: "R45.851", displayName: "Suicidal ideation" }).templateId
      ).toBe("suicidal_ideation_post_assessment_v1");
    });

    it("56 — I82.409 DVT high-risk family template", () => {
      expect(
        resolveClinicalConditionFamily({ code: "I82.409", displayName: "DVT evaluation" }).templateId
      ).toBe("high_risk_medical_leg_swelling_v1");
    });

    it("57 — polypharmacy scenario triggers polypharmacy addition", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s17")!);
      expect(row.additionIds.some((id) => id.includes("polypharmacy"))).toBe(true);
    });

    it("58 — fall risk opioid/benzo addition for older adult", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s18")!);
      expect(row.additionIds.some((id) => id.includes("fall_risk"))).toBe(true);
    });

    it("59 — immunocompromised fever scenario addition", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s19")!);
      expect(row.additionIds.some((id) => id.includes("immunocompromised"))).toBe(true);
    });

    it("60 — no patient context produces no medication additions", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s20")!);
      expect(row.additionIds.every((id) => !id.startsWith("medication_"))).toBe(true);
    });

    it("61 — medication additions never contain forbidden stop/dose language", () => {
      const row = certifyEnterpriseDischargeScenario(ENTERPRISE_DISCHARGE_SCENARIOS.find((s) => s.id === "s18")!);
      for (const id of row.additionIds) {
        const additions = resolvePatientSpecificDischargeAdditions({
          templateIds: ["nausea_vomiting_v1"],
          context: { patientAgeYears: 68, medicationNames: ["Oxycodone", "Lorazepam"] },
          locale: "en",
        });
        for (const a of additions) {
          expect(patientSpecificAdditionContainsForbiddenLanguage(a.text)).toBe(false);
        }
      }
      expect(row.additionIds.length).toBeGreaterThan(0);
    });

    it("62 — OB/GYN N93.9 female context routes obgyn template", () => {
      expect(
        resolveClinicalConditionFamily({
          code: "N93.9",
          displayName: "Vaginal bleeding",
          context: { patientSex: "female" },
        }).templateId
      ).toBe("obgyn_vaginal_bleeding_v1");
    });
  });
});
