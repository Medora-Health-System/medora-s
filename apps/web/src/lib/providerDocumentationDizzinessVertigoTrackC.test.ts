import { describe, expect, it } from "vitest";
import {
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { NEAR_SYNCOPE_COMPLAINT_V1_INTEL } from "./providerDocumentationCardiacComplaintIntelligence19Mdm4";
import { VERTIGO_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";
import {
  assertTrackCCompliance,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationDizzinessVertigoComplaintIntelEn } from "@/i18n/messages/providerDocumentationDizzinessVertigoComplaintIntel.en";

export const DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES = [
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  VERTIGO_COMPLAINT_V1_INTEL,
] as const;

export const DIZZINESS_VERTIGO_TEMPLATE_IDS = [
  "dizziness_syncope",
  "near_syncope_complaint_v1",
  "vertigo_complaint_v1",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(bundle: (typeof DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES)[number]) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    providerDocumentationDizzinessVertigoComplaintIntelEn[
      namespace as keyof typeof providerDocumentationDizzinessVertigoComplaintIntelEn
    ] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationDizzinessVertigoTrackC — MEDUI.ED.ME.2M-R", () => {
  it("accounts for all discovered dizziness/vertigo/syncope template IDs", () => {
    for (const templateId of DIZZINESS_VERTIGO_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES)("has seven-section MDM gold standard", (bundle) => {
    expect(bundle.mdmWorkingAssessment?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmDataReviewed?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmRiskStratification?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmClinicalRationale?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.clinicalImpression?.length ?? 0).toBeGreaterThan(0);
    expect(bundle.mdmPlanSummary?.length ?? 0).toBeGreaterThan(0);
  });

  it("excludes prohibited reviewed wording from HPI and exam keys on dizziness bundle", () => {
    const prohibited = [
      "reviewed",
      "reviewcompleted",
      "historyobtained",
      "assessmentcompleted",
      "ifdocumented",
      "ifindicated",
      "ifgiven",
      "considered",
    ];
    for (const fragmentKey of DIZZINESS_SYNCOPE_COMPLAINT_INTEL.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(DIZZINESS_SYNCOPE_COMPLAINT_INTEL.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it("covers cannot-miss diagnoses on dizziness bundle", () => {
    const suffixes = (DIZZINESS_SYNCOPE_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffPosteriorCirculationStroke",
        "diffIntracranialHemorrhage",
        "diffCardiacArrhythmia",
        "diffPulmonaryEmbolism",
        "diffAorticDissection",
        "diffSepsis",
        "diffSevereElectrolyteAbnormality",
      ])
    );
  });

  it("covers common and serious differentials", () => {
    const suffixes = (DIZZINESS_SYNCOPE_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(
      expect.arrayContaining([
        "diffBenignParoxysmalPositionalVertigo",
        "diffVestibularNeuritis",
        "diffLabyrinthitis",
        "diffMeniereDisease",
        "diffOrthostaticHypotension",
        "diffOrthostaticSyncope",
        "diffDehydration",
        "diffVasovagalSyncope",
        "diffMedicationEffect",
        "diffHypoglycemia",
        "diffCardiacArrhythmia",
        "diffStructuralHeartDisease",
        "diffAcuteCoronarySyndrome",
        "diffStroke",
        "diffTransientIschemicAttack",
        "diffSeizure",
        "diffAnemia",
        "diffVertebrobasilarInsufficiency",
        "diffCerebellarInfarction",
      ])
    );
  });

  it("ME.2M-RB — covers required peripheral vertigo, syncope, exam, reasoning, and plan chips", () => {
    const bundle = DIZZINESS_SYNCOPE_COMPLAINT_INTEL;
    const messages = messagesForBundle(bundle);
    const diff = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    const exam = Object.values(bundle.physicalExam ?? {}).flat().map(fragmentKeySuffix);
    const reasoning = (bundle.mdmClinicalRationale ?? []).map(fragmentKeySuffix);
    const plan = (bundle.mdmPlanSummary ?? []).map(fragmentKeySuffix);

    expect(messages.diffBenignParoxysmalPositionalVertigo).toBe("benign paroxysmal positional vertigo");
    expect(messages.diffLabyrinthitis).toBe("labyrinthitis");
    expect(messages.diffMeniereDisease).toBe("Meniere disease");
    expect(messages.diffVasovagalSyncope).toBe("vasovagal syncope");
    expect(messages.diffOrthostaticSyncope).toBe("orthostatic syncope");
    expect(messages.diffStructuralHeartDisease).toBe("structural heart disease");
    expect(messages.diffPosteriorCirculationStroke).toBe("posterior circulation stroke");
    expect(messages.diffVertebrobasilarInsufficiency).toBe("vertebrobasilar insufficiency");
    expect(messages.diffCerebellarInfarction).toBe("cerebellar infarction");
    expect(messages.diffPulmonaryEmbolism).toBe("pulmonary embolism");
    expect(messages.diffAorticDissection).toBe("aortic dissection");

    expect(exam).toEqual(
      expect.arrayContaining([
        "examHorizontalNystagmus",
        "examVerticalNystagmus",
        "examPositiveDixHallpike",
        "examNegativeDixHallpike",
        "examGaitInstability",
        "examTruncalAtaxia",
      ])
    );
    expect(messages.examHorizontalNystagmus).toBe("horizontal nystagmus");
    expect(messages.examGaitInstability).toBe("gait instability");

    expect(reasoning).toEqual(
      expect.arrayContaining([
        "reasoningSymptomsMostConsistentPeripheralVertigo",
        "reasoningSymptomsNotConsistentCentralVertigo",
        "reasoningLowSuspicionPosteriorCirculationStroke",
        "reasoningNoFocalNeurologicDeficitIdentified",
        "reasoningSymptomsReproducedWithPositionalTesting",
      ])
    );

    expect(plan).toEqual(
      expect.arrayContaining([
        "planEpleyManeuverDiscussed",
        "planFallPrecautionsDiscussed",
        "planMeclizinePrescribed",
        "planNeurologyFollowUpRecommended",
        "planCardiologyFollowUpRecommended",
        "planReturnPrecautionsDiscussed",
      ])
    );
    expect(diff).toEqual(expect.arrayContaining(["diffPulmonaryEmbolism", "diffAorticDissection"]));
  });

  it.each(DIZZINESS_VERTIGO_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
    expect(complaintIntelligenceMdmChipBindingsForTemplate(template).map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "clinicalImpression",
      "mdmPlanSummary",
    ]);
  });

  it.each(DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES)("has chart-ready i18n for every intel fragment", (bundle) => {
    const messages = messagesForBundle(bundle);
    expect(Object.keys(messages).length).toBe(flattenComplaintIntelligenceKeys(bundle).length);
    expect(messages.examDizzinessReviewed).toBeUndefined();
    expect(messages.examNeuroAssessmentCompleted).toBeUndefined();
    expect(messages.examGaitIfDocumented).toBeUndefined();
    expect(messages.examNystagmusIfDocumented).toBeUndefined();
    expect(messages.hpiDizzinessBeganToday).toBe("dizziness began today");
  });

  it("has no duplicate fragment keys within each bundle", () => {
    for (const bundle of DIZZINESS_VERTIGO_GOLD_STANDARD_BUNDLES) {
      const keys = flattenComplaintIntelligenceKeys(bundle);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
