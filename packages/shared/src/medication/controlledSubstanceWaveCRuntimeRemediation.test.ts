import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPilotMedicationBlockerAuditReport,
  isExemptFromTranche1PilotOrderGate,
  validatePilotOrderPlacementWithEnterpriseBypass,
} from "./pilotMedicationBlockerAudit.js";
import { buildDuplicateMedicationResolutionReport } from "./medicationSearchDuplicateResolution.js";
import {
  runControlledSubstanceWaveCRuntimeRemediationReport,
  resetControlledSubstanceWaveCRuntimeRemediationCaches,
} from "./controlledSubstanceWaveCRuntimeRemediation.js";
import {
  requiresEnterprisePainReassessment,
  resolveEnterprisePainReassessmentMarStatus,
} from "../mar/enterprisePainReassessmentWorkflow.js";
import { prewarmProviderOrderableCatalogCodesRegistry, resetProviderOrderableCatalogCodesRegistryForTests } from "./providerOrderableCatalogCodesRegistry.js";

describe("MEDUI.MEDICATION.CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATION.1", () => {
  beforeEach(() => {
    resetControlledSubstanceWaveCRuntimeRemediationCaches();
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  it("01 — gabapentin 300 bypasses legacy pilot scope blockers", () => {
    const code = "GABAPENTIN_300_MG_GELULE_ORALE";
    expect(isExemptFromTranche1PilotOrderGate(code)).toBe(true);
    const validation = validatePilotOrderPlacementWithEnterpriseBypass({
      facilityId: "real-facility",
      catalogCode: code,
      providerGroupId: "other",
      roleCodes: ["PROVIDER"],
    });
    expect(validation.allowed).toBe(true);
    expect(validation.blockers).not.toContain("PILOT_SCOPE_REQUIRED");
  });

  it("02 — pilot blocker audit remediates sample gabapentin order", () => {
    const report = buildPilotMedicationBlockerAuditReport();
    expect(report.decision).toBe("PILOT_BLOCKERS_REMEDIATED");
    expect(report.sampleFacilityAllowedAfter).toBe(true);
  });

  it("03 — duplicate hydromorphone/fentanyl search rows suppressed", () => {
    prewarmProviderOrderableCatalogCodesRegistry();
    const report = buildDuplicateMedicationResolutionReport(
      prewarmProviderOrderableCatalogCodesRegistry()
    );
    expect(report.suppressedSearchCodes).toContain("HYDROMORPHONE_2MG_ML_INJECTABLE");
    expect(report.suppressedSearchCodes).toContain("FENTANYL_50MCG_ML_INJECTABLE");
  });

  it("04 — enterprise pain reassessment status transitions", () => {
    expect(
      requiresEnterprisePainReassessment({ medicationLabel: "Cyclobenzaprine 10 mg PO" })
    ).toBe(true);
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Gabapentin 300 mg",
        marAction: "administered",
        administrationNotes: "administered",
      })
    ).toBe("AWAITING_REASSESSMENT");
    expect(
      resolveEnterprisePainReassessmentMarStatus({
        medicationLabel: "Gabapentin 300 mg",
        marAction: "administered",
        administrationNotes:
          'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","painBefore":8,"painAfter":3,"documentedAt":"2026-06-24T12:00:00.000Z"}',
      })
    ).toBe("REASSESSMENT_COMPLETED");
  });

  it("05 — full runtime remediation report completes", () => {
    const report = runControlledSubstanceWaveCRuntimeRemediationReport();
    expect(report.finalDecision).toBe("CONTROLLED_SUBSTANCES_WAVE_C_RUNTIME_REMEDIATED");
    expect(report.compatibilityAudit.activationChanged).toBe(false);
    expect(report.compatibilityAudit.registryLookupComplexity).toBe("O(1)");
    expect(report.pilotMedicationBlocker.sampleFacilityAllowedAfter).toBe(true);
    expect(report.painReassessmentWorkflow.decision).toBe("PASS");
  });
});
