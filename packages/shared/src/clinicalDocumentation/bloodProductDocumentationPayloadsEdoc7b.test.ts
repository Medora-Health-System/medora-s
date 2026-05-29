import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  BLOOD_PRODUCT_COMPLETION_ONLY_FIELD_NAMES,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  EDOC_7C_BLOOD_MONITORING_TIMERS_BACKLOG_ID,
  bloodProductCompletionPayloadSchema,
  bloodProductPreAssessmentPayloadSchema,
  bloodProductUnitVolumeMlFieldSchema,
  validateBloodProductPayloadForCard,
} from "./bloodProductDocumentationPayloads.js";

const NOW = "2026-05-28T14:00:00.000Z";

const PRE_ASSESSMENT_VALID = {
  assessmentTime: NOW,
  productType: "PRBC",
  unitIdentifier: "UNIT-PA-1",
  unitVolumeMl: 300,
  baselineTemperature: "37.0",
  baselineHeartRate: 80,
  baselineRespRate: 16,
  baselineBloodPressure: "120/80",
  baselineSpo2: 98,
  patientIdentityVerified: true,
  consentVerified: true,
  symptomsPresent: false,
  symptomChecklist: [],
};

const COMPLETION_VALID = {
  completionTime: NOW,
  endTime: NOW,
  productType: "PRBC",
  unitIdentifier: "UNIT-C-1",
  volumeInfusedMl: 250,
  postTemperature: "37.0",
  postHeartRate: 82,
  postRespRate: 16,
  postBloodPressure: "118/76",
  postSpo2: 97,
  reactionObserved: false,
  transfusionCompleted: true,
  providerNotified: false,
};

describe("EDOC.7B blood product volume and pre-assessment isolation", () => {
  const payloadsSource = readFileSync(
    join(import.meta.dirname, "bloodProductDocumentationPayloads.ts"),
    "utf8"
  );
  const formSource = readFileSync(
    join(import.meta.dirname, "../../../../apps/web/src/features/clinical-documentation/ClinicalDocumentationBloodProductForm.tsx"),
    "utf8"
  );

  it("preset unit volumes are defined for clinical quick-select (EDOC.7B)", () => {
    expect(BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML).toEqual([250, 300, 350, 500]);
  });

  it("verification accepts preset and custom positive unitVolumeMl", () => {
    for (const ml of BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML) {
      expect(bloodProductUnitVolumeMlFieldSchema.safeParse(ml).success).toBe(true);
      const result = validateBloodProductPayloadForCard(BLOOD_PRODUCT_VERIFICATION_CARD_ID, {
        verificationTime: NOW,
        productType: "PRBC",
        unitIdentifier: "U1",
        unitVolumeMl: ml,
        patientIdentityVerified: true,
        bloodTypeVerified: true,
        crossmatchVerified: true,
        expirationVerified: true,
        consentVerified: true,
        specialRequirements: "NONE",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.unitVolumeMl).toBe(ml);
        expect(result.data).not.toHaveProperty("volumePreset");
      }
    }
    const custom = validateBloodProductPayloadForCard(BLOOD_PRODUCT_VERIFICATION_CARD_ID, {
      verificationTime: NOW,
      productType: "PRBC",
      unitIdentifier: "U1",
      unitVolumeMl: 275,
      patientIdentityVerified: true,
      bloodTypeVerified: true,
      crossmatchVerified: true,
      expirationVerified: true,
      consentVerified: true,
      specialRequirements: "NONE",
    });
    expect(custom.ok).toBe(true);
    if (custom.ok) expect(custom.data.unitVolumeMl).toBe(275);
  });

  it("initiation accepts preset unitVolumeMl", () => {
    const result = validateBloodProductPayloadForCard(BLOOD_PRODUCT_INITIATION_CARD_ID, {
      startTime: NOW,
      productType: "FFP",
      unitIdentifier: "U1",
      unitVolumeMl: 500,
      baselineTemperature: "37.0",
      baselineHeartRate: 80,
      baselineRespRate: 16,
      baselineBloodPressure: "120/80",
      baselineSpo2: 98,
      preMedicationAdministered: false,
      providerOrderVerified: true,
      consentVerified: true,
      administrationStarted: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.unitVolumeMl).toBe(500);
  });

  it("rejects non-positive unitVolumeMl", () => {
    expect(bloodProductUnitVolumeMlFieldSchema.safeParse(0).success).toBe(false);
    expect(bloodProductUnitVolumeMlFieldSchema.safeParse(-1).success).toBe(false);
  });

  it("pre-assessment strict schema rejects completion-only fields", () => {
    expect(bloodProductPreAssessmentPayloadSchema.safeParse(PRE_ASSESSMENT_VALID).success).toBe(
      true
    );
    const withCompletionLeak = {
      ...PRE_ASSESSMENT_VALID,
      completionTime: NOW,
      endTime: NOW,
      volumeInfusedMl: 250,
      postTemperature: "37.0",
      reactionObserved: true,
    };
    expect(bloodProductPreAssessmentPayloadSchema.safeParse(withCompletionLeak).success).toBe(
      false
    );
    const validated = validateBloodProductPayloadForCard(
      BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
      PRE_ASSESSMENT_VALID
    );
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      for (const field of BLOOD_PRODUCT_COMPLETION_ONLY_FIELD_NAMES) {
        expect(validated.data).not.toHaveProperty(field);
      }
    }
  });

  it("completion schema accepts completion-only fields including completionTime", () => {
    expect(bloodProductCompletionPayloadSchema.safeParse(COMPLETION_VALID).success).toBe(true);
    const result = validateBloodProductPayloadForCard(
      BLOOD_PRODUCT_COMPLETION_CARD_ID,
      COMPLETION_VALID
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.completionTime).toBe(NOW);
      expect(result.data.endTime).toBe(NOW);
      expect(result.data.volumeInfusedMl).toBe(250);
      expect(result.data.postHeartRate).toBe(82);
      expect(result.data.reactionObserved).toBe(false);
    }
  });

  it("form source does not spread completion into pre-assessment save", () => {
    expect(formSource).toContain("BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID");
    const preAssessmentCaseMatch = formSource.match(
      /case BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID:[\s\S]*?payload = \{([\s\S]*?)\};\s*break;/
    );
    expect(preAssessmentCaseMatch).not.toBeNull();
    const preAssessmentCaseBody = preAssessmentCaseMatch![1]!;
    expect(preAssessmentCaseBody).toContain("baselineSpo2");
    expect(preAssessmentCaseBody).not.toContain("...completion");
  });

  it("documents EDOC.7C blood monitoring timers backlog", () => {
    expect(payloadsSource).toContain(EDOC_7C_BLOOD_MONITORING_TIMERS_BACKLOG_ID);
    expect(payloadsSource).toContain("Blood Monitoring Timers");
  });
});
