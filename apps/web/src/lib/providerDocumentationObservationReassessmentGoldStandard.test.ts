import { describe, expect, it } from "vitest";
import {
  OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
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
  OBSERVATION_REASSESSMENT_REQUIRED_MDM1_SECTIONS,
  OBSERVATION_REASSESSMENT_TEMPLATE_ID,
} from "./providerDocumentationObservationReassessmentGoldStandard";
import { providerDocumentationObservationReassessmentComplaintIntelEn } from "@/i18n/messages/providerDocumentationObservationReassessmentComplaintIntel.en";
import { providerDocumentationObservationReassessmentComplaintIntelFr } from "@/i18n/messages/providerDocumentationObservationReassessmentComplaintIntel.fr";

const ISOLATED_FAMILY_PREFIXES = [
  ".stroke.",
  ".weakness.",
  ".palpitationsComplaintV1.",
  ".mvcCollision.",
  ".pediatricFever.",
  ".psychiatricBehavioral.",
  ".chestPain.",
  ".medicationRefill.",
] as const;

const REQUIRED_HPI_SUFFIXES = [
  "hpiObservationForSerialReassessment",
  "hpiPersistentSymptomsRequiringMonitoring",
  "hpiIntervalSymptomChange",
  "hpiTreatmentResponse",
  "hpiRepeatEvaluationPerformed",
  "hpiAwaitingRepeatTesting",
  "hpiAwaitingConsultantRecommendation",
  "hpiObservationForDiagnosticClarification",
] as const;

const REQUIRED_ROS_POSITIVE_SUFFIXES = [
  "rosPersistentSymptoms",
  "rosImprovingSymptoms",
  "rosRecurrentSymptoms",
] as const;

const REQUIRED_ROS_NEGATIVE_SUFFIXES = [
  "rosDeniesChestPain",
  "rosDeniesShortnessOfBreath",
  "rosDeniesNeurologicDeterioration",
  "rosDeniesWorseningAbdominalPain",
  "rosDeniesFever",
  "rosDeniesSyncope",
] as const;

const REQUIRED_EXAM_SUFFIXES = [
  "examWellAppearing",
  "examNoAcuteDistress",
  "examStableVitalSigns",
  "examNormalRespiratoryEffort",
  "examNormalMentalStatus",
  "examRepeatExaminationReassuring",
  "examIntervalExaminationUnchanged",
] as const;

const REQUIRED_REASSESSMENT_SUFFIXES = [
  "reassessSymptomsImproved",
  "reassessSymptomsUnchanged",
  "reassessSymptomsWorsened",
  "reassessRepeatExaminationPerformed",
  "reassessRepeatVitalSignsStable",
  "reassessRemainsHemodynamicallyStable",
  "reassessConsultantRecommendationsAddressed",
  "reassessObservationGoalsAchieved",
  "reassessFurtherObservationRequired",
] as const;

const REQUIRED_DIFFERENTIAL_SUFFIXES = [
  "diffEvolvingAcuteIllness",
  "diffUnresolvedSymptoms",
  "diffDelayedTreatmentResponse",
  "diffOccultPathologyRequiringObservation",
  "diffProgressionOfIllness",
] as const;

const REQUIRED_RISK_SUFFIXES = [
  "riskLowRiskObservationCourse",
  "riskModerateRiskExtendedObservation",
  "riskHighRiskAdmissionRequired",
] as const;

const REQUIRED_IMPRESSION_SUFFIXES = [
  "impClinicallyImproved",
  "impClinicallyStable",
  "impRequiresContinuedObservation",
  "impRequiresAdmission",
] as const;

const REQUIRED_PLAN_SUFFIXES = [
  "planContinueObservation",
  "planObtainRepeatTesting",
  "planConsultantFollowUp",
  "planDischargeAfterObservation",
  "planAdmitForOngoingCare",
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

describe("providerDocumentationObservationReassessmentGoldStandard — MEDUI.ED.POSTCERT.1C", () => {
  it("exposes full MDM.1 sections for observation_reassessment", () => {
    for (const section of OBSERVATION_REASSESSMENT_REQUIRED_MDM1_SECTIONS) {
      const keys = OBSERVATION_REASSESSMENT_COMPLAINT_INTEL[section];
      expect(keys?.length, section).toBeGreaterThan(0);
    }
    expect(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.hpi?.length).toBeGreaterThan(0);
    expect(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.reassessment?.length).toBeGreaterThan(0);
    expect(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.followUpDisposition?.length).toBeGreaterThan(0);
    expect(Object.values(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.physicalExam ?? {}).flat().length).toBeGreaterThan(0);
  });

  it("passes Track C compliance", () => {
    expect(collectTrackCViolations(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL)).toEqual([]);
    expect(() => assertTrackCCompliance(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL)).not.toThrow();
  });

  it("passes human documentation value audit (EN)", () => {
    const messages = messagesForBundle(
      OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
      providerDocumentationObservationReassessmentComplaintIntelEn
    );
    const violations = auditHumanDocumentationValues({
      phase: "MEDUI.ED.POSTCERT.1C",
      templateId: OBSERVATION_REASSESSMENT_TEMPLATE_ID,
      bundle: OBSERVATION_REASSESSMENT_COMPLAINT_INTEL,
      messages,
    });
    expect(violations).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for active bundle keys", () => {
    const bundleSuffixes = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL).map(
      fragmentKeySuffix
    );
    const enMessages = namespaceMessages(
      providerDocumentationObservationReassessmentComplaintIntelEn,
      "observationReassessment"
    );
    const frMessages = namespaceMessages(
      providerDocumentationObservationReassessmentComplaintIntelFr,
      "observationReassessment"
    );
    for (const suffix of bundleSuffixes) {
      expect(enMessages[suffix], `missing EN i18n for ${suffix}`).toBeTruthy();
      expect(frMessages[suffix], `missing FR i18n for ${suffix}`).toBeTruthy();
    }
    const enKeys = Object.keys(enMessages);
    const frKeys = Object.keys(frMessages);
    expect(frKeys.sort()).toEqual(enKeys.sort());
  });

  it("has chart-ready EN i18n for every bundle key", () => {
    const messages = namespaceMessages(
      providerDocumentationObservationReassessmentComplaintIntelEn,
      "observationReassessment"
    );
    const keys = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL).map(fragmentKeySuffix);
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
    const allSuffixes = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL).map(
      fragmentKeySuffix
    );
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_HPI_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_ROS_POSITIVE_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_ROS_NEGATIVE_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_EXAM_SUFFIXES]));
    expect(allSuffixes).toEqual(expect.arrayContaining([...REQUIRED_REASSESSMENT_SUFFIXES]));
    expect((OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_DIFFERENTIAL_SUFFIXES])
    );
    expect((OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.mdmRiskStratification ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_RISK_SUFFIXES])
    );
    expect((OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.clinicalImpression ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_IMPRESSION_SUFFIXES])
    );
    expect((OBSERVATION_REASSESSMENT_COMPLAINT_INTEL.mdmPlanSummary ?? []).map(fragmentKeySuffix)).toEqual(
      expect.arrayContaining([...REQUIRED_PLAN_SUFFIXES])
    );
    expect(allSuffixes).toContain("diffDischargeReadiness");
  });

  it("remains isolated from unrelated complaint families", () => {
    const keys = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL);
    for (const key of keys) {
      expect(key).toContain(".observationReassessment.");
      for (const prefix of ISOLATED_FAMILY_PREFIXES) {
        expect(key.includes(prefix)).toBe(false);
      }
    }
  });

  it("renders 20 complete human documentation sample notes", () => {
    const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === "MEDUI.ED.POSTCERT.1C");
    expect(family).toBeTruthy();
    const samples = buildHumanDocumentationSamplesForFamilyTemplate(
      family!,
      OBSERVATION_REASSESSMENT_TEMPLATE_ID,
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
    const keys = flattenComplaintIntelligenceKeys(OBSERVATION_REASSESSMENT_COMPLAINT_INTEL);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
