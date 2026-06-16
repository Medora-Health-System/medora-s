import { describe, expect, it } from "vitest";
import {
  MEDICATION_REFILL_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import {
  auditHumanDocumentationValues,
  assertHumanDocumentationSampleNoteComplete,
  buildHumanDocumentationSamplesForFamilyTemplate,
  HUMAN_DOCUMENTATION_AUDIT_FAMILIES,
  HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS,
  messagesForBundle,
} from "./providerDocumentationHumanDocumentationAudit";
import {
  MEDICATION_REFILL_REQUIRED_MDM1_SECTIONS,
  MEDICATION_REFILL_TEMPLATE_ID,
} from "./providerDocumentationMedicationRefillGoldStandard";
import { providerDocumentationMedicationRefillComplaintIntelEn } from "@/i18n/messages/providerDocumentationMedicationRefillComplaintIntel.en";
import { providerDocumentationMedicationRefillComplaintIntelFr } from "@/i18n/messages/providerDocumentationMedicationRefillComplaintIntel.fr";

const ISOLATED_FAMILY_PREFIXES = [
  ".stroke.",
  ".weakness.",
  ".palpitationsComplaintV1.",
  ".mvcCollision.",
  ".pediatricFever.",
  ".psychiatricBehavioral.",
  ".chestPain.",
] as const;

const REQUIRED_HPI_SUFFIXES = [
  "hpiRequestsMedicationRefill",
  "hpiRanOutOfMedication",
  "hpiLastDoseTaken",
  "hpiUnableToReachPcp",
  "hpiMissedFollowUpAppointment",
  "hpiInsuranceIssue",
  "hpiPharmacyIssue",
  "hpiMedicationLost",
  "hpiMedicationStolen",
  "hpiTravelingAwayFromHome",
  "hpiBridgeRefillRequest",
] as const;

const REQUIRED_ROS_POSITIVE_SUFFIXES = [
  "rosNoAcuteComplaint",
  "rosSymptomsControlledOnMedication",
  "rosSymptomsWorseningAfterInterruption",
] as const;

const REQUIRED_ROS_NEGATIVE_SUFFIXES = [
  "rosDeniesChestPain",
  "rosDeniesShortnessOfBreath",
  "rosDeniesFever",
  "rosDeniesNeurologicSymptoms",
] as const;

const REQUIRED_EXAM_SUFFIXES = [
  "examNoAcuteDistress",
  "examWellAppearing",
  "examStableVitalSigns",
  "examNormalRespiratoryEffort",
  "examNormalMentalStatus",
] as const;

const REQUIRED_REASSESSMENT_SUFFIXES = [
  "reassessRemainsStable",
  "reassessNoAcuteFindings",
  "reassessRefillAppropriate",
  "reassessFurtherEvaluationRequired",
] as const;

const REQUIRED_DIFFERENTIAL_SUFFIXES = [
  "diffMedicationNonadherence",
  "diffPharmacyAccessIssue",
  "diffInsuranceCoverageIssue",
  "diffUncontrolledChronicCondition",
  "diffAcuteExacerbationRequiringEvaluation",
] as const;

const REQUIRED_RISK_SUFFIXES = [
  "riskLowRiskRefillRequest",
  "riskModerateRiskMedicationInterruption",
  "riskHighRiskCriticalMedicationUnavailable",
] as const;

const REQUIRED_IMPRESSION_SUFFIXES = [
  "impStableChronicCondition",
  "impMedicationRefillRequest",
  "impMedicationInterruption",
] as const;

const REQUIRED_PLAN_SUFFIXES = [
  "planBridgePrescriptionProvided",
  "planFollowUpWithPcp",
  "planSpecialistFollowUp",
  "planReturnPrecautionsProvided",
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

describe("providerDocumentationMedicationRefillGoldStandard — MEDUI.ED.POSTCERT.1B", () => {
  it("exposes full MDM.1 sections for medication_refill", () => {
    for (const section of MEDICATION_REFILL_REQUIRED_MDM1_SECTIONS) {
      const keys = MEDICATION_REFILL_COMPLAINT_INTEL[section];
      expect(keys?.length, section).toBeGreaterThan(0);
    }
    expect(MEDICATION_REFILL_COMPLAINT_INTEL.hpi?.length).toBeGreaterThan(0);
    expect(MEDICATION_REFILL_COMPLAINT_INTEL.reassessment?.length).toBeGreaterThan(0);
    expect(MEDICATION_REFILL_COMPLAINT_INTEL.followUpDisposition?.length).toBeGreaterThan(0);
    expect(Object.values(MEDICATION_REFILL_COMPLAINT_INTEL.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
  });

  it("passes Track C compliance", () => {
    expect(collectTrackCViolations(MEDICATION_REFILL_COMPLAINT_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(MEDICATION_REFILL_COMPLAINT_INTEL)).not.toThrow();
  });

  it("passes human documentation value audit (EN)", () => {
    const messages = messagesForBundle(
      MEDICATION_REFILL_COMPLAINT_INTEL,
      providerDocumentationMedicationRefillComplaintIntelEn
    );
    const violations = auditHumanDocumentationValues({
      phase: "MEDUI.ED.POSTCERT.1B",
      templateId: MEDICATION_REFILL_TEMPLATE_ID,
      bundle: MEDICATION_REFILL_COMPLAINT_INTEL,
      messages,
    });
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for active bundle keys", () => {
    const bundleSuffixes = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL).map(fragmentKeySuffix);
    const enMessages = namespaceMessages(providerDocumentationMedicationRefillComplaintIntelEn, "medicationRefill");
    const frMessages = namespaceMessages(providerDocumentationMedicationRefillComplaintIntelFr, "medicationRefill");
    for (const suffix of bundleSuffixes) {
      expect(enMessages[suffix], `missing EN i18n for ${suffix}`).toBeTruthy();
      expect(frMessages[suffix], `missing FR i18n for ${suffix}`).toBeTruthy();
    }
    const enKeys = Object.keys(enMessages);
    const frKeys = Object.keys(frMessages);
    expect(frKeys.sort()).toEqual(enKeys.sort());
  });

  it("has chart-ready EN i18n for every bundle key", () => {
    const messages = namespaceMessages(providerDocumentationMedicationRefillComplaintIntelEn, "medicationRefill");
    const keys = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL).map(fragmentKeySuffix);
    const bundleMessages = Object.fromEntries(keys.map((key) => [key, messages[key]]));
    for (const key of keys) {
      expect(messages[key], `missing EN i18n for ${key}`).toBeTruthy();
    }
    const chartReadyMessages = Object.fromEntries(
      Object.entries(bundleMessages).filter(([key]) => !key.toLowerCase().includes("reviewed"))
    );
    const dataReviewedMessages = Object.fromEntries(
      Object.entries(bundleMessages).filter(([key]) => key.toLowerCase().includes("reviewed"))
    );
    expect(auditTrackCi18nMessageValues(chartReadyMessages)).toEqual([]);
    expect(auditTrackCi18nMessageValues(dataReviewedMessages, { allowReviewLanguage: true })).toEqual([]);
  });

  it("covers required clinical content across sections", () => {
    const allSuffixes = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL).map(fragmentKeySuffix);
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_HPI_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_ROS_POSITIVE_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_ROS_NEGATIVE_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_EXAM_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_REASSESSMENT_SUFFIXES]));
    expect((MEDICATION_REFILL_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_DIFFERENTIAL_SUFFIXES])
    );
    expect((MEDICATION_REFILL_COMPLAINT_INTEL.mdmRiskStratification ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_RISK_SUFFIXES])
    );
    expect((MEDICATION_REFILL_COMPLAINT_INTEL.clinicalImpression ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_IMPRESSION_SUFFIXES])
    );
    expect((MEDICATION_REFILL_COMPLAINT_INTEL.mdmPlanSummary ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_PLAN_SUFFIXES])
    );
  });

  it("remains isolated from unrelated complaint families", () => {
    const keys = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL);
    for (const key of keys) {
      expect(key).toContain(".medicationRefill.");
      for (const prefix of ISOLATED_FAMILY_PREFIXES) {
        expect(key.includes(prefix)).toBe(false);
      }
    }
  });

  it("renders 20 complete human documentation sample notes", () => {
    const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === "MEDUI.ED.POSTCERT.1B");
    expect(family).toBeTruthy();
    const samples = buildHumanDocumentationSamplesForFamilyTemplate(
      family!,
      MEDICATION_REFILL_TEMPLATE_ID,
      20
    );
    expect(samples).toHaveLength(20);
    for (const sample of samples) {
      expect(sample.length).toBeGreaterThan(40);
      expect(() => assertHumanDocumentationSampleNoteComplete(sample)).not.toThrow();
      for (const section of HUMAN_DOC_REQUIRED_SAMPLE_SECTIONS) {
        expect(sample).toContain(section);
      }
    }
  });

  it("does not duplicate intelligence fragment keys within the bundle", () => {
    const keys = flattenComplaintIntelligenceKeys(MEDICATION_REFILL_COMPLAINT_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
