import { describe, expect, it } from "vitest";
import {
  buildNonBlockingPharmacyI18nReport,
  buildNonBlockingPharmacyPolicyReport,
  buildTranche2NonBlockingOrderabilityReport,
  buildTrueHardStopRegressionReport,
  evaluateNonBlockingPharmacyWorkflow,
  runNonBlockingPharmacyReviewCertification,
  TRUE_MEDICATION_HARD_STOPS,
} from "./nonBlockingPharmacyReviewPolicy.js";
import { marPharmacyVerificationBlocksAdministration } from "./marAdministrationGovernancePolicy.js";
import { pharmacyStatusAllowsAdministration } from "./pharmacyMarGovernance.js";
import { runGovernedTranche1PilotActivationReport } from "./tranche1PilotActivation.js";
import { buildVaccineMarAdministrationHardeningReport } from "./vaccineMarAdministrationDocumentation.js";

describe("nonBlockingPharmacyReviewPolicy (MEDUI.MEDICATION.TRANCHE_2_NONBLOCKING_PHARMACY_REVIEW.1)", () => {
  const pharmacyReviewOrder = () =>
    evaluateNonBlockingPharmacyWorkflow({
      requiresPharmacyReview: true,
      pharmacyReviewReason: "Pharmacy may review this order",
    });

  it("01 — pharmacy-review medication appears in provider search", () => {
    expect(pharmacyReviewOrder().searchable).toBe(true);
  });

  it("02 — pharmacy-review medication can be selected", () => {
    expect(pharmacyReviewOrder().selectable).toBe(true);
  });

  it("03 — pharmacy-review medication order persists", () => {
    expect(pharmacyReviewOrder().orderPersistedImmediately).toBe(true);
  });

  it("04 — pharmacy-review medication schedules to MAR immediately", () => {
    expect(pharmacyReviewOrder().marScheduledImmediately).toBe(true);
  });

  it("05 — pharmacy-review medication is administrable", () => {
    expect(pharmacyReviewOrder().administrable).toBe(true);
    expect(marPharmacyVerificationBlocksAdministration()).toBe(false);
    expect(pharmacyStatusAllowsAdministration("PENDING")).toBe(true);
  });

  it("06 — pharmacy-review metadata is visible to pharmacy", () => {
    const evaluated = pharmacyReviewOrder();
    expect(evaluated.pharmacyVisible).toBe(true);
    expect(evaluated.metadata).toMatchObject({
      pharmacyReviewSuggested: true,
      pharmacyVisibility: "visibleToPharmacy",
      pharmacyFollowUpStatus: "not_reviewed",
    });
  });

  it("07 — pharmacy review status does not block MAR", () => {
    const evaluated = evaluateNonBlockingPharmacyWorkflow({
      requiresPharmacyReview: true,
      pharmacyFollowUpStatus: "reviewed",
    });
    expect(evaluated.marScheduledImmediately).toBe(true);
    expect(evaluated.administrable).toBe(true);
  });

  it("08 — clarification status is visible but does not retroactively erase order", () => {
    const evaluated = evaluateNonBlockingPharmacyWorkflow({
      requiresPharmacyReview: true,
      pharmacyFollowUpStatus: "clarification_requested",
    });
    expect(evaluated.metadata.pharmacyFollowUpStatus).toBe("clarification_requested");
    expect(evaluated.orderPersistedImmediately).toBe(true);
    expect(evaluated.marScheduledImmediately).toBe(true);
  });

  it("09 — pharmacy supply-needed status is visible to nurse", () => {
    const evaluated = evaluateNonBlockingPharmacyWorkflow({
      requiresPharmacyReview: true,
      pharmacyReviewReason: "Pharmacy supply may be needed",
      pharmacyFollowUpStatus: "not_available",
    });
    expect(evaluated.metadata.pharmacyReviewReason).toBe("Pharmacy supply may be needed");
    expect(evaluated.marScheduledImmediately).toBe(true);
    expect(evaluated.administrable).toBe(true);
  });

  it("10 — duplicate collision still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.DUPLICATE_COLLISION).toBe(true);
  });

  it("11 — retired medication still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.RETIRED_OR_DISCONTINUED_MEDICATION).toBe(true);
  });

  it("12 — not-in-catalog medication still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.NOT_IN_CATALOG).toBe(true);
  });

  it("13 — invalid route/dose/form still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.INVALID_ROUTE_DOSE_FORM).toBe(true);
  });

  it("14 — facility-prohibited medication still blocks", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.FACILITY_PROHIBITED_MEDICATION).toBe(true);
  });

  it("15 — allergy hard stop still blocks when configured", () => {
    expect(buildTrueHardStopRegressionReport().eachHardStopBlocks.PATIENT_ALLERGY_HARD_STOP).toBe(true);
  });

  it("16 — controlled/legal restriction still blocks when configured", () => {
    const regression = buildTrueHardStopRegressionReport();
    expect(regression.eachHardStopBlocks.CONTROLLED_WORKFLOW_RESTRICTION).toBe(true);
    expect(regression.eachHardStopBlocks.LEGAL_RESTRICTION).toBe(true);
  });

  it("17 — Tranche 2 is reclassified as orderable with pharmacy visibility", () => {
    const report = buildTranche2NonBlockingOrderabilityReport();
    expect(report.correctedDecision).toBe("READY_FOR_PROVIDER_ORDERING_WITH_PHARMACY_REVIEW_VISIBILITY");
    expect(report.pharmacyApprovalRequiredToProceed).toBe(false);
    expect(report.providerMayOrder).toBe(true);
    expect(report.orderAppearsOnMar).toBe(true);
  });

  it("18 — no wording says pharmacy approval required", () => {
    const report = buildNonBlockingPharmacyI18nReport();
    const joined = [...report.en, ...report.fr].join(" ").toLowerCase();
    expect(joined).not.toContain("pharmacy approval required");
    expect(joined).not.toContain("waiting for pharmacy approval");
    expect(joined).not.toContain("blocked pending pharmacy");
    expect(joined).not.toContain("approbation pharmacie");
  });

  it("19 — EN text has no FR leakage", () => {
    expect(buildNonBlockingPharmacyI18nReport().enHasFrLeakage).toBe(false);
  });

  it("20 — FR text has no EN leakage", () => {
    expect(buildNonBlockingPharmacyI18nReport().frHasEnLeakage).toBe(false);
  });

  it("21 — Tranche 1 remains active", () => {
    expect(runGovernedTranche1PilotActivationReport().finalDecision).toBe("READY_FOR_TRANCHE_1_PILOT_ACTIVATION");
  });

  it("22 — vaccine MAR documentation is unaffected", () => {
    const vaccine = buildVaccineMarAdministrationHardeningReport();
    expect(vaccine.compatibility.marBehaviorChanged).toBe(false);
    expect(vaccine.compatibility.providerSearchChanged).toBe(false);
    expect(vaccine.compatibility.migrationsRequired).toBe(false);
  });

  it("23 — full non-blocking pharmacy review certification is ready", () => {
    const policy = buildNonBlockingPharmacyPolicyReport();
    const report = runNonBlockingPharmacyReviewCertification();
    expect(policy.trueHardStops).toEqual(TRUE_MEDICATION_HARD_STOPS);
    expect(report.finalDecision).toBe("READY_FOR_TRANCHE_2_PROVIDER_ORDERING");
  });
});
