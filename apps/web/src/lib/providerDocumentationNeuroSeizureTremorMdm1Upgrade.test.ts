import { describe, expect, it } from "vitest";
import {
  SEIZURE_COMPLAINT_V1_INTEL,
  TREMOR_MOVEMENT_COMPLAINT_V1_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import {
  auditHumanDocumentationValues,
  messagesForBundle,
} from "./providerDocumentationHumanDocumentationAudit";
import {
  SEIZURE_TREMOR_MDM1_TEMPLATE_IDS,
  SEIZURE_TREMOR_REQUIRED_MDM1_SECTIONS,
} from "./providerDocumentationNeuroSeizureTremorGoldStandard";
import { NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationNeuroStrokeWeaknessGovernance";
import { providerDocumentationNeuroExpansionComplaintIntel19Mdm9En } from "@/i18n/messages/providerDocumentationNeuroExpansionComplaintIntel19Mdm9.en";
import { providerDocumentationNeuroExpansionComplaintIntel19Mdm9Fr } from "@/i18n/messages/providerDocumentationNeuroExpansionComplaintIntel19Mdm9.fr";

const BUNDLE_BY_TEMPLATE_ID = {
  seizure_complaint_v1: SEIZURE_COMPLAINT_V1_INTEL,
  tremor_movement_complaint_v1: TREMOR_MOVEMENT_COMPLAINT_V1_INTEL,
} as const;

const NAMESPACE_BY_TEMPLATE_ID = {
  seizure_complaint_v1: "seizureComplaintV1",
  tremor_movement_complaint_v1: "tremorMovementComplaintV1",
} as const;

const SEIZURE_CANNOT_MISS = [
  "diffStatusEpilepticus",
  "diffMeningitis",
  "diffIntracranialHemorrhage",
  "diffStroke",
  "diffHypoglycemia",
  "diffSepsis",
] as const;

const SEIZURE_DIFFERENTIAL_SUPPORT = [
  "diffSeizure",
  "diffEpilepsy",
  "diffBreakthroughSeizure",
  "diffMedicationNonadherence",
  "diffAlcoholWithdrawal",
  "diffMetabolicToxic",
  "diffIntracranialProcess",
  "diffInfection",
  "diffPsychogenicNonepileptic",
] as const;

const TREMOR_CANNOT_MISS = [
  "diffStroke",
  "diffIntracranialPathology",
  "diffElectrolyteAbnormality",
  "diffToxicIngestion",
] as const;

const TREMOR_DIFFERENTIAL_SUPPORT = [
  "diffEssentialTremor",
  "diffMedicationEffect",
  "diffAnxietyRelatedTremor",
  "diffMetabolicThyroid",
  "diffParkinsonianTremor",
] as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function namespaceMessages(
  source: Record<string, Record<string, string>>,
  namespace: string
): Record<string, string> {
  return source[namespace] ?? {};
}

describe("providerDocumentationNeuroSeizureTremorMdm1Upgrade — MEDUI.ED.POSTCERT.2", () => {
  it.each(SEIZURE_TREMOR_MDM1_TEMPLATE_IDS)("exposes full MDM.1 sections for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    for (const section of SEIZURE_TREMOR_REQUIRED_MDM1_SECTIONS) {
      const keys = bundle[section];
      expect(keys?.length, `${templateId}.${section}`).toBeGreaterThan(0);
    }
    expect(bundle.hpi?.length).toBeGreaterThan(0);
    expect(bundle.reassessment?.length).toBeGreaterThan(0);
    expect(bundle.followUpDisposition?.length).toBeGreaterThan(0);
    expect(bundle.mdmDifferentialSynthesis?.length).toBeGreaterThan(0);
    expect(Object.values(bundle.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
  });

  it.each([SEIZURE_COMPLAINT_V1_INTEL, TREMOR_MOVEMENT_COMPLAINT_V1_INTEL])(
    "passes Track C compliance",
    (bundle) => {
      expect(collectTrackCViolations(bundle)).toEqual([]);
      expect(() => assertTrackCCompliance(bundle)).not.toThrow();
    }
  );

  it.each(SEIZURE_TREMOR_MDM1_TEMPLATE_IDS)("passes human documentation value audit for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const messages = messagesForBundle(bundle, providerDocumentationNeuroExpansionComplaintIntel19Mdm9En);
    const violations = auditHumanDocumentationValues({
      phase: "MEDUI.ED.POSTCERT.2",
      templateId,
      bundle,
      messages,
    });
    expect(violations, templateId).toEqual([]);
  });

  it.each(SEIZURE_TREMOR_MDM1_TEMPLATE_IDS)("maintains EN/FR i18n key parity for %s", (templateId) => {
    const namespace = NAMESPACE_BY_TEMPLATE_ID[templateId];
    const enKeys = Object.keys(namespaceMessages(providerDocumentationNeuroExpansionComplaintIntel19Mdm9En, namespace));
    const frKeys = Object.keys(namespaceMessages(providerDocumentationNeuroExpansionComplaintIntel19Mdm9Fr, namespace));
    expect(frKeys.sort()).toEqual(enKeys.sort());
  });

  it.each(SEIZURE_TREMOR_MDM1_TEMPLATE_IDS)("has chart-ready EN i18n for every bundle key (%s)", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const namespace = NAMESPACE_BY_TEMPLATE_ID[templateId];
    const messages = namespaceMessages(providerDocumentationNeuroExpansionComplaintIntel19Mdm9En, namespace);
    const keys = flattenComplaintIntelligenceKeys(bundle).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(messages[key], `missing EN i18n for ${key}`).toBeTruthy();
    }
    const chartReadyMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => !key.toLowerCase().includes("reviewed"))
    );
    const dataReviewedMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => key.toLowerCase().includes("reviewed"))
    );
    expect(auditTrackCi18nMessageValues(chartReadyMessages)).toEqual([]);
    expect(auditTrackCi18nMessageValues(dataReviewedMessages, { allowReviewLanguage: true })).toEqual([]);
  });

  it("covers seizure cannot-miss and differential support diagnoses", () => {
    const suffixes = (SEIZURE_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...SEIZURE_CANNOT_MISS]));
    expect(suffixes).toEqual(expect.arrayContaining([...SEIZURE_DIFFERENTIAL_SUPPORT]));
  });

  it("covers tremor cannot-miss and differential support diagnoses", () => {
    const suffixes = (TREMOR_MOVEMENT_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...TREMOR_CANNOT_MISS]));
    expect(suffixes).toEqual(expect.arrayContaining([...TREMOR_DIFFERENTIAL_SUPPORT]));
  });

  it("does not change neuro stroke weakness governance ownership", () => {
    const governed = new Set<string>(NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS);
    for (const templateId of SEIZURE_TREMOR_MDM1_TEMPLATE_IDS) {
      expect(governed.has(templateId)).toBe(false);
    }
  });

  it("increases key coverage versus legacy partial MDM baseline", () => {
    expect(flattenComplaintIntelligenceKeys(SEIZURE_COMPLAINT_V1_INTEL).length).toBeGreaterThan(50);
    expect(flattenComplaintIntelligenceKeys(TREMOR_MOVEMENT_COMPLAINT_V1_INTEL).length).toBeGreaterThan(45);
  });
});
