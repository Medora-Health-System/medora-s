/** MEDUI.MEDICATION.PULMONARY_RUNTIME_UI_AND_INFUSION_COMPLETION.1 */

import { describe, expect, it } from "vitest";
import {
  buildRespiratoryMedicationResponseNotes,
  parseRespiratoryMedicationResponseNotes,
  sortRespiratoryMedicationResponsesNewestFirst,
} from "../mar/respiratoryMedicationResponseNotes.js";
import { shouldUseRespiratoryMedicationResponsePathway } from "../mar/respiratoryMedicationResponseGovernance.js";
import { buildMarPainResponseTimelineProjection } from "../mar/marPainResponseTimelineProjection.js";
import { isValidContinuousInfusionTransition, resolveContinuousInfusionLifecycleState } from "./continuousInfusionLifecycleGovernance.js";
import {
  localizeIcuMarTimelineSecondaryText,
  resolveIcuMarTimelineInfusionEventLabel,
} from "../mar/icuMarTimelineDisplay.js";
import {
  ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT,
} from "./enterprisePulmonaryFormularySupplement.js";
import { isEnterprisePulmonaryCatalogCode } from "../medication/pulmonaryMedicationCatalogRegistry.js";

describe("respiratory medication response notes", () => {
  it("appends and parses respiratory response with author initials", () => {
    const built = buildRespiratoryMedicationResponseNotes(null, {
      responseCode: "IMPROVED_BREATHING",
      responseTime: "2026-06-23T12:00:00.000Z",
      documentedAt: "2026-06-23T12:05:00.000Z",
      respiratoryRateBefore: 24,
      respiratoryRateAfter: 18,
      oxygenSaturationBefore: 92,
      oxygenSaturationAfter: 97,
      documentedByInitials: "RN",
      documentedByUserId: "user-1",
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const parsed = parseRespiratoryMedicationResponseNotes(built.notes);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.documentedByInitials).toBe("RN");
    expect(parsed[0]?.respiratoryRateAfter).toBe(18);
  });

  it("supports multiple append-only responses", () => {
    const first = buildRespiratoryMedicationResponseNotes(null, {
      responseCode: "NO_CHANGE",
      documentedAt: "2026-06-23T12:00:00.000Z",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = buildRespiratoryMedicationResponseNotes(first.notes, {
      responseCode: "IMPROVED_BREATHING",
      documentedAt: "2026-06-23T12:30:00.000Z",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const sorted = sortRespiratoryMedicationResponsesNewestFirst(
      parseRespiratoryMedicationResponseNotes(second.notes)
    );
    expect(sorted).toHaveLength(2);
    expect(sorted[0]?.responseCode).toBe("IMPROVED_BREATHING");
  });
});

describe("pulmonary pathway routing", () => {
  it("routes albuterol neb to respiratory pathway", () => {
    expect(
      shouldUseRespiratoryMedicationResponsePathway({
        catalogCode: "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
      })
    ).toBe(true);
  });

  it("does not route morphine to respiratory pathway", () => {
    expect(
      shouldUseRespiratoryMedicationResponsePathway({
        medicationLabel: "Morphine 2 mg IV",
      })
    ).toBe(false);
  });

  it("projects respiratory timeline without pain reassessment secondary text", () => {
    const projection = buildMarPainResponseTimelineProjection({
      catalogCode: "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION",
      medicationLabel: "Albuterol Neb",
      marAction: "administered",
      administeredAt: "2026-06-23T12:00:00.000Z",
      doseStatus: "COMPLETED",
      defaultSecondaryText: "COMPLETED",
    });
    expect(projection.secondaryText).not.toBe("AWAITING_REASSESSMENT");
    expect(projection.responseDocumentationAvailable).toBe(true);
  });
});

describe("continuous infusion lifecycle", () => {
  it("prevents duplicate running from invalid transition", () => {
    expect(isValidContinuousInfusionTransition("RUNNING", "RUNNING")).toBe(false);
    expect(isValidContinuousInfusionTransition("RUNNING", "PAUSED")).toBe(true);
    expect(isValidContinuousInfusionTransition("PAUSED", "RESTARTED")).toBe(true);
  });

  it("resolves paused lifecycle state", () => {
    expect(
      resolveContinuousInfusionLifecycleState({
        ordered: true,
        verified: true,
        started: true,
        running: true,
        paused: true,
        stopped: false,
      })
    ).toBe("PAUSED");
  });
});

describe("ICU MAR timeline labels", () => {
  it("localizes infusion enum labels in English and French", () => {
    expect(resolveIcuMarTimelineInfusionEventLabel("INFUSION_RATE_CHANGE", "en")).toBe("Rate changed");
    expect(resolveIcuMarTimelineInfusionEventLabel("INFUSION_PAUSE", "fr")).toBe("Perfusion en pause");
    expect(localizeIcuMarTimelineSecondaryText("INFUSION_START", "en")).toBe("Infusion started");
    expect(localizeIcuMarTimelineSecondaryText("INFUSION_RESTART", "fr")).toBe("Perfusion reprise");
  });
});

describe("pulmonary supplement seed entries", () => {
  it("includes levalbuterol and hypertonic saline neb", () => {
    const codes = ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT.map((e) => e.catalogCode);
    expect(codes.some((c) => /LEVALBUTEROL|XOPENEX/i.test(c))).toBe(true);
    expect(codes.some((c) => /HYPERTONIC|SALINE|NEB/i.test(c))).toBe(true);
    for (const code of codes) {
      expect(isEnterprisePulmonaryCatalogCode(code)).toBe(true);
    }
  });
});
