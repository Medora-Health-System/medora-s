import { describe, expect, it } from "vitest";
import {
  assertClinicalDocumentationAuditMetadataSafe,
  buildClinicalDocumentationAuditMetadata,
} from "./clinicalDocumentationEntry.js";
import {
  getClinicalDocumentationCatalogGovernance,
  isClinicalDocumentationCardCatalogHidden,
} from "./clinicalDocumentationCatalog.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS,
  FLOW_CPR_RECORD_CARD_ID,
  FLOW_OBSERVATION_MONITORING_CARD_ID,
  FLOW_THROMBOLYTIC_MI_CARD_ID,
  SCORE_ABUSE_CARD_ID,
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_GAD7_CARD_ID,
  SCORE_GENEVA_CARD_ID,
  SCORE_HEART_CARD_ID,
  SCORE_HUMAN_TRAFFICKING_CARD_ID,
  SCORE_PERC_CARD_ID,
  SCORE_PHQ9_CARD_ID,
  SCORE_RTS_CARD_ID,
  SCORE_SDOH_CARD_ID,
  SCORE_WELLS_PE_CARD_ID,
  calculateCiwaArTotal,
  calculateCowsTotal,
  calculateGad7Total,
  calculateGenevaTotal,
  calculateHeartTotal,
  calculatePercNegative,
  calculatePhq9Total,
  calculateRtsTotal,
  calculateWellsPeTotal,
  deriveCiwaArSeverity,
  deriveCowsSeverity,
  deriveGad7Severity,
  deriveGenevaRiskLevel,
  deriveHeartRiskLevel,
  derivePhq9Severity,
  derivePhq9SuicidalIdeationPositive,
  deriveRtsRiskFlag,
  deriveWellsPeRiskLevel,
  summarizeFoundationCatalogCompletionPayload,
  validateFoundationCatalogCompletionPayloadForCard,
} from "./foundationCatalogCompletionPayloads.js";

const ISO = "2026-05-28T14:00:00.000Z";

const CPR_OK = {
  eventStartTime: ISO,
  eventType: "CODE_BLUE",
  initialRhythm: "VFIB",
  compressionsStarted: "YES",
  airwaySupported: "YES",
  defibrillationPerformed: "YES",
  medicationReferenceDocumented: "YES",
  roscAchieved: "YES",
  patientDisposition: "TRANSFERRED_ICU",
  providerPresent: "YES",
  providerNotified: "NO",
} as const;

const MI_THROMBOLYTIC_OK = {
  administrationTime: ISO,
  indication: "STEMI",
  agent: "TENECTEPLASE",
  doseVerified: "YES",
  contraindicationChecklistReviewed: "YES",
  providerOrderVerified: "YES",
  cardiologyNotified: "YES",
  ecgReviewed: "YES",
  bloodPressureWithinParameters: "YES",
  medicationAdministered: "YES",
  administrationHeld: "NO",
  providerNotified: "NO",
} as const;

const OBSERVATION_OK = {
  monitoringTime: ISO,
  observationReason: "ED_OBSERVATION",
  patientStatus: "STABLE",
  vitalSignsReviewed: "YES",
  painReviewed: "YES",
  safetyReviewed: "YES",
  providerNotified: "NO",
} as const;

describe("foundationCatalogCompletionPayloads (EDOC.23B)", () => {
  it("all EDOC.23B cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
    }
  });

  it("1 — CPR validation + summary", () => {
    expect(validateFoundationCatalogCompletionPayloadForCard(FLOW_CPR_RECORD_CARD_ID, CPR_OK).ok).toBe(
      true
    );
    const bad = validateFoundationCatalogCompletionPayloadForCard(FLOW_CPR_RECORD_CARD_ID, {
      ...CPR_OK,
      providerPresent: "NO",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const summary = summarizeFoundationCatalogCompletionPayload(FLOW_CPR_RECORD_CARD_ID, CPR_OK, "en");
    expect(summary.some((l) => l.key === "Event type")).toBe(true);
    expect(summary.some((l) => l.key === "Provider notified")).toBe(true);
  });

  it("2 — restraint monitoring superseded (hidden)", () => {
    const card = getClinicalDocumentationCardById("flow_restraint_monitoring");
    expect(card).toBeTruthy();
    const gov = getClinicalDocumentationCatalogGovernance("flow_restraint_monitoring");
    expect(gov?.catalogStatus).toBe("HIDDEN");
    expect(gov?.supersededBy).toBe("safety_restraint_reassessment");
    expect(isClinicalDocumentationCardCatalogHidden(card!)).toBe(true);
  });

  it("3 — MI thrombolytic validation + summary", () => {
    expect(
      validateFoundationCatalogCompletionPayloadForCard(FLOW_THROMBOLYTIC_MI_CARD_ID, MI_THROMBOLYTIC_OK)
        .ok
    ).toBe(true);
    const bad = validateFoundationCatalogCompletionPayloadForCard(FLOW_THROMBOLYTIC_MI_CARD_ID, {
      ...MI_THROMBOLYTIC_OK,
      medicationAdministered: "NO",
      administrationHeld: "NO",
    });
    expect(bad.ok).toBe(false);
    const summary = summarizeFoundationCatalogCompletionPayload(
      FLOW_THROMBOLYTIC_MI_CARD_ID,
      MI_THROMBOLYTIC_OK,
      "fr"
    );
    expect(summary.some((l) => l.key === "Médicament administré")).toBe(true);
  });

  it("4 — observation monitoring validation + summary", () => {
    expect(
      validateFoundationCatalogCompletionPayloadForCard(
        FLOW_OBSERVATION_MONITORING_CARD_ID,
        OBSERVATION_OK
      ).ok
    ).toBe(true);
    const bad = validateFoundationCatalogCompletionPayloadForCard(FLOW_OBSERVATION_MONITORING_CARD_ID, {
      ...OBSERVATION_OK,
      patientStatus: "WORSENED",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const summary = summarizeFoundationCatalogCompletionPayload(
      FLOW_OBSERVATION_MONITORING_CARD_ID,
      OBSERVATION_OK,
      "en"
    );
    expect(summary.some((l) => l.key === "Patient status")).toBe(true);
  });

  it("5 — CIWA-Ar score calculation + summary", () => {
    const items = {
      nauseaVomiting: 4,
      tremor: 4,
      paroxysmalSweats: 4,
      anxiety: 4,
      agitation: 0,
      tactileDisturbances: 0,
      auditoryDisturbances: 0,
      visualDisturbances: 0,
      headache: 0,
      orientationClouding: 0,
    };
    const total = calculateCiwaArTotal(items);
    expect(total).toBe(16);
    expect(deriveCiwaArSeverity(total)).toBe("SEVERE");
    const payload = {
      assessmentTime: ISO,
      ...items,
      totalScore: total,
      severity: "SEVERE" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_CIWA_AR_CARD_ID, payload).ok).toBe(
      true
    );
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_CIWA_AR_CARD_ID, payload, "en");
    expect(summary.some((l) => l.key === "CIWA-Ar" && l.value.includes("16"))).toBe(true);
  });

  it("6 — COWS score calculation + summary", () => {
    const items = {
      restingPulse: 4,
      sweating: 4,
      restlessness: 5,
      pupilSize: 5,
      boneJointAches: 4,
      runnyNoseTearing: 4,
      giUpset: 5,
      tremor: 4,
      yawning: 4,
      anxietyIrritability: 4,
      goosefleshSkin: 5,
    };
    const total = calculateCowsTotal(items);
    expect(total).toBe(48);
    expect(deriveCowsSeverity(total)).toBe("SEVERE");
    const payload = {
      assessmentTime: ISO,
      ...items,
      totalScore: total,
      severity: "SEVERE" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_COWS_CARD_ID, payload).ok).toBe(true);
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_COWS_CARD_ID, payload, "en");
    expect(summary.some((l) => l.key === "COWS")).toBe(true);
  });

  it("7 — C-SSRS validation + summary", () => {
    const payload = {
      assessmentTime: ISO,
      wishToBeDead: "YES",
      suicidalThoughts: "YES",
      methodThoughts: "YES",
      intentWithoutPlan: "NO",
      intentWithPlan: "YES",
      suicidalBehavior: "NO",
      riskLevel: "HIGH" as const,
      providerNotified: "YES" as const,
      safetyPrecautionsInitiated: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_CSSRS_CARD_ID, payload).ok).toBe(
      true
    );
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_CSSRS_CARD_ID, payload, "en");
    expect(summary.some((l) => l.key === "Risk level")).toBe(true);
    expect(summary.some((l) => l.value === "wishToBeDead")).toBe(false);
  });

  it("8 — PHQ-9 calculation + severe notification rule", () => {
    const items = {
      littleInterest: 3,
      feelingDown: 3,
      sleepTrouble: 3,
      fatigue: 3,
      appetite: 3,
      feelingBad: 3,
      concentration: 2,
      psychomotor: 2,
      suicidalIdeation: 0,
    };
    const total = calculatePhq9Total(items);
    expect(total).toBe(22);
    expect(derivePhq9Severity(total)).toBe("SEVERE");
    const payload = {
      assessmentTime: ISO,
      ...items,
      totalScore: total,
      severity: "SEVERE" as const,
      suicidalIdeationItemPositive: derivePhq9SuicidalIdeationPositive(items.suicidalIdeation),
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_PHQ9_CARD_ID, payload).ok).toBe(
      true
    );
    const bad = validateFoundationCatalogCompletionPayloadForCard(SCORE_PHQ9_CARD_ID, {
      ...payload,
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("9 — GAD-7 calculation + severe notification rule", () => {
    const items = {
      feelingNervous: 3,
      cantStopWorrying: 3,
      worryingTooMuch: 3,
      troubleRelaxing: 3,
      restlessness: 3,
      irritability: 3,
      afraidSomethingAwful: 0,
    };
    const total = calculateGad7Total(items);
    expect(total).toBe(18);
    expect(deriveGad7Severity(total)).toBe("SEVERE");
    const payload = {
      assessmentTime: ISO,
      ...items,
      totalScore: total,
      severity: "SEVERE" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_GAD7_CARD_ID, payload).ok).toBe(
      true
    );
    const bad = validateFoundationCatalogCompletionPayloadForCard(SCORE_GAD7_CARD_ID, {
      ...payload,
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("10 — Revised Trauma Score calculation + summary", () => {
    const input = {
      gcsScore: 3,
      systolicBpCategory: "ZERO" as const,
      respiratoryRateCategory: "ZERO" as const,
    };
    const total = calculateRtsTotal(input);
    expect(deriveRtsRiskFlag(total)).toBe("HIGH");
    const payload = {
      assessmentTime: ISO,
      ...input,
      totalScore: total,
      riskFlag: "HIGH" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_RTS_CARD_ID, payload).ok).toBe(
      true
    );
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_RTS_CARD_ID, payload, "en");
    expect(summary.some((l) => l.key === "RTS")).toBe(true);
  });

  it("11 — HEART calculation + summary", () => {
    const items = { history: 2, ecg: 2, age: 2, riskFactors: 2, troponin: 2 };
    const total = calculateHeartTotal(items);
    expect(total).toBe(10);
    expect(deriveHeartRiskLevel(total)).toBe("HIGH");
    const payload = {
      assessmentTime: ISO,
      ...items,
      totalScore: total,
      riskLevel: "HIGH" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_HEART_CARD_ID, payload).ok).toBe(
      true
    );
  });

  it("12 — Wells PE calculation + summary", () => {
    const input = {
      clinicalSignsDvt: "YES" as const,
      peMostLikely: "YES" as const,
      heartRateOver100: "YES" as const,
      immobilizationOrSurgery: "NO" as const,
      previousDvtPe: "NO" as const,
      hemoptysis: "NO" as const,
      malignancy: "NO" as const,
    };
    const total = calculateWellsPeTotal(input);
    expect(total).toBe(7.5);
    expect(deriveWellsPeRiskLevel(total)).toBe("PE_LIKELY");
    const payload = {
      assessmentTime: ISO,
      ...input,
      totalScore: total,
      riskLevel: "PE_LIKELY" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_WELLS_PE_CARD_ID, payload).ok).toBe(
      true
    );
  });

  it("13 — PERC calculation + summary", () => {
    const allYes = {
      ageUnder50: "YES" as const,
      heartRateUnder100: "YES" as const,
      oxygenSaturationAtLeast95: "YES" as const,
      noHemoptysis: "YES" as const,
      noEstrogenUse: "YES" as const,
      noPriorDvtPe: "YES" as const,
      noUnilateralLegSwelling: "YES" as const,
      noRecentSurgeryTrauma: "YES" as const,
    };
    expect(calculatePercNegative(allYes)).toBe("YES");
    const payload = {
      assessmentTime: ISO,
      ...allYes,
      percNegative: "YES" as const,
      providerNotified: "NO" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_PERC_CARD_ID, payload).ok).toBe(
      true
    );
    const badPayload = {
      ...payload,
      noHemoptysis: "NO" as const,
      percNegative: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_PERC_CARD_ID, badPayload).ok).toBe(
      false
    );
  });

  it("14 — Geneva calculation + summary", () => {
    const input = {
      ageOver65: "YES" as const,
      previousDvtPe: "YES" as const,
      surgeryOrFractureRecent: "YES" as const,
      activeMalignancy: "YES" as const,
      unilateralLowerLimbPain: "YES" as const,
      hemoptysis: "YES" as const,
      heartRateCategory: "95_OR_MORE" as const,
      painOnPalpationAndEdema: "YES" as const,
    };
    const total = calculateGenevaTotal(input);
    expect(total).toBe(22);
    expect(deriveGenevaRiskLevel(total)).toBe("HIGH");
    const payload = {
      assessmentTime: ISO,
      ...input,
      totalScore: total,
      riskLevel: "HIGH" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_GENEVA_CARD_ID, payload).ok).toBe(
      true
    );
  });

  it("15 — Abuse screen validation + audit safety", () => {
    const payload = {
      screenTime: ISO,
      screenPerformed: "YES" as const,
      patientFeelsUnsafe: "YES" as const,
      physicalAbuseConcern: "NO" as const,
      emotionalAbuseConcern: "NO" as const,
      sexualAbuseConcern: "NO" as const,
      neglectConcern: "NO" as const,
      resourcesOffered: "YES" as const,
      mandatoryReportConsidered: "NO" as const,
      providerNotified: "YES" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_ABUSE_CARD_ID, payload).ok).toBe(
      true
    );
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_ABUSE_CARD_ID, payload, "en");
    expect(summary.some((l) => l.value.toLowerCase().includes("physical"))).toBe(false);
    const meta = buildClinicalDocumentationAuditMetadata({
      encounterId: "enc-1",
      patientId: "pat-1",
      entryId: "entry-1",
      category: "SCORES_AND_SCREENS",
      cardId: SCORE_ABUSE_CARD_ID,
      authorUserId: "user-1",
      authorRole: "RN",
      payloadKeyCount: Object.keys(payload).length,
      summaryLineCount: summary.length,
    });
    expect(() => assertClinicalDocumentationAuditMetadataSafe(meta as Record<string, unknown>)).not.toThrow();
  });

  it("16 — Human trafficking validation + audit safety", () => {
    const payload = {
      screenTime: ISO,
      screenPerformed: "YES" as const,
      unableToSpeakFreely: "YES" as const,
      identificationControlledByOther: "NO" as const,
      fearfulOrCoerced: "NO" as const,
      workLivingControlConcern: "NO" as const,
      physicalSafetyConcern: "NO" as const,
      resourcesOffered: "YES" as const,
      mandatoryReportConsidered: "NO" as const,
      providerNotified: "YES" as const,
    };
    expect(
      validateFoundationCatalogCompletionPayloadForCard(SCORE_HUMAN_TRAFFICKING_CARD_ID, payload).ok
    ).toBe(true);
    const summary = summarizeFoundationCatalogCompletionPayload(
      SCORE_HUMAN_TRAFFICKING_CARD_ID,
      payload,
      "en"
    );
    expect(summary.some((l) => l.key === "Safety concern present" && l.value === "Yes")).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("unableToSpeakFreely");
  });

  it("17 — SDOH validation + audit safety", () => {
    const payload = {
      screenTime: ISO,
      foodInsecurity: "YES" as const,
      housingInstability: "NO" as const,
      transportationNeed: "NO" as const,
      utilityNeed: "NO" as const,
      medicationAffordabilityConcern: "NO" as const,
      interpersonalSafetyConcern: "NO" as const,
      resourcesOffered: "YES" as const,
      caseManagementReferral: "NO" as const,
      providerNotified: "NO" as const,
    };
    expect(validateFoundationCatalogCompletionPayloadForCard(SCORE_SDOH_CARD_ID, payload).ok).toBe(
      true
    );
    const bad = validateFoundationCatalogCompletionPayloadForCard(SCORE_SDOH_CARD_ID, {
      ...payload,
      resourcesOffered: "NO",
    });
    expect(bad.ok).toBe(false);
    const summary = summarizeFoundationCatalogCompletionPayload(SCORE_SDOH_CARD_ID, payload, "en");
    expect(summary.some((l) => l.key === "Need identified" && l.value === "Yes")).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("foodInsecurity");
  });
});
