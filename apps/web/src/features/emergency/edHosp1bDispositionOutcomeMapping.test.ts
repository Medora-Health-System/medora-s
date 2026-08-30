import { describe, expect, it } from "vitest";
import { billingClassificationForPlacementDestination } from "@medora/shared";
import {
  mergeAdaptiveEdNursingIntoNursingAssessment,
  pathwayFromDispositionOutcomeUi,
  readAdaptiveEdNursingExecution,
} from "@medora/shared";
import {
  ER_DISCHARGE_MODE_ADMISSION,
  ER_DISCHARGE_MODE_HOME,
  ER_DISCHARGE_MODE_TRANSFER,
  ER_DISCHARGE_MODE_AMA,
  ER_DISCHARGE_MODE_LWBS,
  ER_DISCHARGE_MODE_ELOPEMENT,
  ER_DISCHARGE_MODE_DECEASED,
  ER_DISCHARGE_MODE_OTHER,
  emptyErDispositionSupplementForm,
  inferOutcomeUiFromForms,
  localizedErDischargeModeLabel,
  outcomeUiToDischargeMode,
} from "./emergencyDispositionV1";
import {
  ED_HOSP_1B_PROVIDER_OUTCOMES,
  canonicalEdDispositionEnginePath,
  inferOutcomeHintsFromAdmissionSummary,
  isAdmissionDecisionOutcome,
  isInternalPlacementDestinationLocked,
  isObservationAdmissionDestinationSwitchBlocked,
  isObservationPlacementIntent,
  legacyCareLevelForOutcomeUi,
  requestedEncounterTypeForOutcomeUi,
} from "./edHosp1bDispositionOutcomeMapping";
import {
  EMTALA_DISPOSITION_CATEGORY_VALUES,
  applyEmtalaV1ComplementToNursingAssessment,
  emptyEmtalaDispositionComplementForm,
  readErEmtalaV1FromNursing,
} from "./erEmtalaV1";
import { buildEmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

function persistAdmissionDecisionLike(
  outcome: "OBSERVATION" | "ADMISSION",
  opts?: { careLevel?: string | null; stampRequestedType?: boolean }
) {
  const dest = requestedEncounterTypeForOutcomeUi(outcome);
  const care = opts?.careLevel ?? legacyCareLevelForOutcomeUi(outcome);
  const summary: Record<string, unknown> = {
    careLevel: care,
    admissionPacketV1: { levelOfCareCode: care },
  };
  if (opts?.stampRequestedType !== false && dest) {
    summary.requestedEncounterType = dest;
  }
  return summary;
}

function hydrateFromPersistedAdmission(summary: unknown) {
  return inferOutcomeUiFromForms(
    ER_DISCHARGE_MODE_ADMISSION,
    emptyErDispositionSupplementForm(),
    inferOutcomeHintsFromAdmissionSummary(summary)
  );
}

describe("ED.HOSP.1B outcome mapping", () => {
  it("exposes OBSERVATION and ADMISSION as separate top-level outcomes", () => {
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES).toEqual([
      "HOME",
      "OBSERVATION",
      "ADMISSION",
      "TRANSFER",
      "AMA",
      "LWBS",
      "ELOPEMENT",
      "DECEASED",
      "OTHER",
    ]);
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES.indexOf("OBSERVATION")).toBeLessThan(
      ED_HOSP_1B_PROVIDER_OUTCOMES.indexOf("ADMISSION")
    );
  });

  it("maps OBSERVATION to requestedEncounterType OBSERVATION and admission discharge mode", () => {
    expect(requestedEncounterTypeForOutcomeUi("OBSERVATION")).toBe("OBSERVATION");
    expect(outcomeUiToDischargeMode("OBSERVATION")).toBe(ER_DISCHARGE_MODE_ADMISSION);
    expect(canonicalEdDispositionEnginePath("OBSERVATION")).toBe("ADMISSION");
    expect(isAdmissionDecisionOutcome("OBSERVATION")).toBe(true);
  });

  it("maps ADMISSION to requestedEncounterType INPATIENT", () => {
    expect(requestedEncounterTypeForOutcomeUi("ADMISSION")).toBe("INPATIENT");
    expect(outcomeUiToDischargeMode("ADMISSION")).toBe(ER_DISCHARGE_MODE_ADMISSION);
    expect(canonicalEdDispositionEnginePath("ADMISSION")).toBe("ADMISSION");
  });

  it("preserves HOME and TRANSFER engine mappings", () => {
    expect(outcomeUiToDischargeMode("HOME")).toBe(ER_DISCHARGE_MODE_HOME);
    expect(canonicalEdDispositionEnginePath("HOME")).toBe("HOME");
    expect(requestedEncounterTypeForOutcomeUi("HOME")).toBeNull();
    expect(outcomeUiToDischargeMode("TRANSFER")).toBe(ER_DISCHARGE_MODE_TRANSFER);
    expect(canonicalEdDispositionEnginePath("TRANSFER")).toBe("TRANSFER");
  });

  it("1. placement OFF: Observation save/reload hydrates Observation from careLevel", () => {
    const persisted = persistAdmissionDecisionLike("OBSERVATION", { stampRequestedType: false });
    expect(persisted.careLevel).toBe("OBSERVATION");
    expect(persisted.requestedEncounterType).toBeUndefined();
    expect(hydrateFromPersistedAdmission(persisted)).toBe("OBSERVATION");
  });

  it("2. placement OFF: Admission save/reload hydrates Admission from inpatient careLevel", () => {
    const persisted = persistAdmissionDecisionLike("ADMISSION", { stampRequestedType: false });
    expect(persisted.careLevel).toBe("MEDICAL_SURGICAL");
    expect(hydrateFromPersistedAdmission(persisted)).toBe("ADMISSION");
  });

  it("3. placement ON: Observation save/reload uses requestedEncounterType OBSERVATION", () => {
    const persisted = persistAdmissionDecisionLike("OBSERVATION");
    expect(persisted.requestedEncounterType).toBe("OBSERVATION");
    expect(hydrateFromPersistedAdmission(persisted)).toBe("OBSERVATION");
  });

  it("4. placement ON: Admission save/reload uses requestedEncounterType INPATIENT", () => {
    const persisted = persistAdmissionDecisionLike("ADMISSION");
    expect(persisted.requestedEncounterType).toBe("INPATIENT");
    expect(hydrateFromPersistedAdmission(persisted)).toBe("ADMISSION");
  });

  it("5. persisted Observation cannot silently hydrate as Admission", () => {
    expect(
      hydrateFromPersistedAdmission({
        careLevel: "OBSERVATION",
        requestedEncounterType: "OBSERVATION",
        admissionPacketV1: { levelOfCareCode: "OBSERVATION" },
      })
    ).toBe("OBSERVATION");
    expect(
      hydrateFromPersistedAdmission({
        careLevel: "OBSERVATION",
        admissionPacketV1: { levelOfCareCode: "OBSERVATION" },
      })
    ).toBe("OBSERVATION");
  });

  it("6. persisted Admission cannot silently hydrate as Observation", () => {
    expect(
      hydrateFromPersistedAdmission({
        careLevel: "MEDICAL_SURGICAL",
        requestedEncounterType: "INPATIENT",
      })
    ).toBe("ADMISSION");
    expect(hydrateFromPersistedAdmission({ careLevel: "TELEMETRY" })).toBe("ADMISSION");
  });

  it("7. conflicting legacy fields: requestedEncounterType wins over careLevel", () => {
    expect(isObservationPlacementIntent({ requestedEncounterType: "INPATIENT", careLevel: "OBSERVATION" })).toBe(
      false
    );
    expect(
      hydrateFromPersistedAdmission({
        requestedEncounterType: "INPATIENT",
        careLevel: "OBSERVATION",
        admissionPacketV1: { levelOfCareCode: "OBSERVATION" },
      })
    ).toBe("ADMISSION");
    expect(isObservationPlacementIntent({ requestedEncounterType: "OBSERVATION", careLevel: "MEDICAL_SURGICAL" })).toBe(
      true
    );
    expect(
      hydrateFromPersistedAdmission({
        requestedEncounterType: "OBSERVATION",
        careLevel: "MEDICAL_SURGICAL",
        admissionPacketV1: { levelOfCareCode: "MEDICAL_SURGICAL" },
      })
    ).toBe("OBSERVATION");
  });

  it("10-11. OBSERVATION ↔ ADMISSION switch before save updates dest and careLevel locally", () => {
    let outcome: "OBSERVATION" | "ADMISSION" = "OBSERVATION";
    let care = legacyCareLevelForOutcomeUi(outcome, "TELEMETRY");
    expect(care).toBe("OBSERVATION");
    expect(requestedEncounterTypeForOutcomeUi(outcome)).toBe("OBSERVATION");
    outcome = "ADMISSION";
    care = legacyCareLevelForOutcomeUi(outcome, care);
    expect(care).toBe("MEDICAL_SURGICAL");
    expect(requestedEncounterTypeForOutcomeUi(outcome)).toBe("INPATIENT");
    outcome = "OBSERVATION";
    care = legacyCareLevelForOutcomeUi(outcome, care);
    expect(care).toBe("OBSERVATION");
    expect(requestedEncounterTypeForOutcomeUi(outcome)).toBe("OBSERVATION");
    expect(hydrateFromPersistedAdmission({ careLevel: "TELEMETRY" })).toBe("ADMISSION");
  });

  it("12. committed placement (REQUESTED+) blocks Observation ↔ Admission dest switch", () => {
    expect(isInternalPlacementDestinationLocked("DRAFT")).toBe(false);
    expect(isInternalPlacementDestinationLocked("SIGNED")).toBe(false);
    expect(isInternalPlacementDestinationLocked(null)).toBe(false);
    for (const status of [
      "REQUESTED",
      "UNDER_REVIEW",
      "ACCEPTED",
      "BED_ASSIGNED",
      "READY_FOR_TRANSFER",
      "DEPARTED_ED",
      "ARRIVED_DESTINATION",
    ]) {
      expect(isInternalPlacementDestinationLocked(status)).toBe(true);
      expect(
        isObservationAdmissionDestinationSwitchBlocked({
          placementStatus: status,
          placementRequestedEncounterType: "OBSERVATION",
          nextOutcome: "ADMISSION",
        })
      ).toBe(true);
      expect(
        isObservationAdmissionDestinationSwitchBlocked({
          placementStatus: status,
          placementRequestedEncounterType: "INPATIENT",
          nextOutcome: "OBSERVATION",
        })
      ).toBe(true);
      expect(
        isObservationAdmissionDestinationSwitchBlocked({
          placementStatus: status,
          placementRequestedEncounterType: "OBSERVATION",
          nextOutcome: "OBSERVATION",
        })
      ).toBe(false);
      expect(
        isObservationAdmissionDestinationSwitchBlocked({
          placementStatus: status,
          placementRequestedEncounterType: "OBSERVATION",
          nextOutcome: "HOME",
        })
      ).toBe(false);
    }
    expect(
      isObservationAdmissionDestinationSwitchBlocked({
        placementStatus: "DRAFT",
        placementRequestedEncounterType: "OBSERVATION",
        nextOutcome: "ADMISSION",
      })
    ).toBe(false);
  });

  it("placement OFF: observation legacy packet uses OBSERVATION careLevel", () => {
    expect(legacyCareLevelForOutcomeUi("OBSERVATION", "")).toBe("OBSERVATION");
    expect(legacyCareLevelForOutcomeUi("OBSERVATION", "Observation")).toBe("Observation");
    expect(isObservationPlacementIntent({ careLevel: "OBSERVATION" })).toBe(true);
    expect(
      inferOutcomeUiFromForms(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), {
        careLevel: "OBSERVATION",
      })
    ).toBe("OBSERVATION");
  });

  it("placement OFF: admission legacy packet uses inpatient careLevel", () => {
    expect(legacyCareLevelForOutcomeUi("ADMISSION", "OBSERVATION")).toBe("MEDICAL_SURGICAL");
    expect(legacyCareLevelForOutcomeUi("ADMISSION", "TELEMETRY")).toBe("TELEMETRY");
    expect(isObservationPlacementIntent({ careLevel: "MEDICAL_SURGICAL" })).toBe(false);
    expect(
      inferOutcomeUiFromForms(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), {
        careLevel: "MEDICAL_SURGICAL",
      })
    ).toBe("ADMISSION");
  });

  it("does not change billing destination mapping", () => {
    expect(billingClassificationForPlacementDestination("OBSERVATION")).toBe("OBSERVATION");
    expect(billingClassificationForPlacementDestination("INPATIENT")).toBe("INPATIENT");
  });

  it("renders human-readable Observation / Admission labels", () => {
    expect(
      localizedErDischargeModeLabel(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), "en", {
        careLevel: "OBSERVATION",
      })
    ).toBe("Observation");
    expect(
      localizedErDischargeModeLabel(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), "en", {
        careLevel: "MEDICAL_SURGICAL",
      })
    ).toBe("Admission");
    expect(
      localizedErDischargeModeLabel(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), "fr", {
        requestedEncounterType: "OBSERVATION",
      })
    ).toBe("Observation");
    expect(
      localizedErDischargeModeLabel(ER_DISCHARGE_MODE_ADMISSION, emptyErDispositionSupplementForm(), "fr", {
        requestedEncounterType: "INPATIENT",
      })
    ).toBe("Admission");
  });

  it("17. Observation does not write EMTALA transfer fields; category stays local ADMISSION", () => {
    expect(EMTALA_DISPOSITION_CATEGORY_VALUES).not.toContain("OBSERVATION");
    const complement = emptyEmtalaDispositionComplementForm();
    complement.transferRequestedAt = "2026-05-18T12:00";
    complement.acceptingFacilityName = "Other Hospital";
    complement.transferReason = "Higher level of care";
    const na = applyEmtalaV1ComplementToNursingAssessment(
      {},
      {
        outcome: "OBSERVATION",
        complement,
        dispositionDecidedAtIso: "2026-05-18T12:00:00.000Z",
      }
    );
    const stored = readErEmtalaV1FromNursing(na);
    expect(stored?.emtalaDispositionCategory).toBe("ADMISSION");
    expect(stored?.transferRequestedAt).toBeUndefined();
    expect(stored?.acceptingFacilityName).toBeUndefined();
    expect(stored?.transferReason).toBeUndefined();
  });

  it("18. actual Transfer EMTALA still stores TRANSFER category and transfer fields", () => {
    const complement = emptyEmtalaDispositionComplementForm();
    complement.transferRequestedAt = "2026-05-18T12:00";
    complement.acceptingFacilityName = "Other Hospital";
    complement.transferReason = "Higher level of care";
    const na = applyEmtalaV1ComplementToNursingAssessment(
      {},
      {
        outcome: "TRANSFER",
        complement,
        dispositionDecidedAtIso: "2026-05-18T12:00:00.000Z",
      }
    );
    const stored = readErEmtalaV1FromNursing(na);
    expect(stored?.emtalaDispositionCategory).toBe("TRANSFER");
    expect(stored?.acceptingFacilityName).toBe("Other Hospital");
    expect(stored?.transferReason).toBe("Higher level of care");
  });

  it("15-16. closed-record visit summary distinguishes Observation vs Admission", () => {
    const obs = buildEmergencyVisitSummaryModel(
      {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: {
          careLevel: "OBSERVATION",
          requestedEncounterType: "OBSERVATION",
        },
        nursingAssessment: {},
      },
      null,
      null,
      "en"
    );
    expect(obs.disposition?.lines.join("\n")).toContain("Observation");
    expect(obs.disposition?.lines.join("\n")).not.toContain("requestedEncounterType");
    expect(obs.disposition?.lines.join("\n")).not.toMatch(/\bINPATIENT\b/);
    const adm = buildEmergencyVisitSummaryModel(
      {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: {
          careLevel: "MEDICAL_SURGICAL",
          requestedEncounterType: "INPATIENT",
        },
        nursingAssessment: {},
      },
      null,
      null,
      "en"
    );
    expect(adm.disposition?.lines.join("\n")).toContain("Admission");
    expect(adm.disposition?.lines.join("\n")).not.toContain("Emergency Department Observation");
  });

  it("22. nursing Observation pathway persists under existing adaptive key", () => {
    expect(pathwayFromDispositionOutcomeUi("OBSERVATION")).toBe("OBSERVATION");
    const na = mergeAdaptiveEdNursingIntoNursingAssessment(
      { erDispositionExecutionV1: { dischargeSortieCompletedAt: "x", dischargeSortieCompletedByDisplayName: "RN" } },
      {
        version: 1,
        pathway: "OBSERVATION",
        sections: { observationPlan: "Monitor" },
        completedAt: null,
        completedByDisplayName: null,
        revision: 0,
      }
    );
    expect(Object.keys(na)).toContain("erAdaptiveNursingExecutionV1");
    expect(Object.keys(na)).not.toContain("edHosp1b");
    const read = readAdaptiveEdNursingExecution(na);
    expect(read?.pathway).toBe("OBSERVATION");
    expect(read?.sections.observationPlan).toBe("Monitor");
  });

  it("24. existing non-OBS/ADMIT discharge modes still hydrate as themselves", () => {
    const empty = emptyErDispositionSupplementForm();
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_HOME, empty)).toBe("HOME");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_TRANSFER, empty)).toBe("TRANSFER");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_AMA, empty)).toBe("AMA");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_LWBS, empty)).toBe("LWBS");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_ELOPEMENT, empty)).toBe("ELOPEMENT");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_DECEASED, empty)).toBe("DECEASED");
    expect(inferOutcomeUiFromForms(ER_DISCHARGE_MODE_OTHER, empty)).toBe("OTHER");
  });
});
