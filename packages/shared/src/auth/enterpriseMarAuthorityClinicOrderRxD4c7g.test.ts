/**
 * MEDUI.D4C.7G — Enterprise MAR authority + Clinic order→MAR + pure outpatient Rx.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_ENTERPRISE_MAR_AUTHORITY_ORDER_RX_CERTIFICATION_ID,
  D4C7G_ERROR_CODES,
  D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE,
  D4C7G_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES,
  D4C7G_OUTPATIENT_RX_ORDER_MODE,
  assertOutpatientRxModeRejectsFacilityAdminIntent,
  buildFacilityMarProjectionObservability,
  clinicAmbulatoryFacilityMedicationOrderMode,
  clinicAmbulatoryOutpatientRxOrderMode,
  composerForcesFacilityAdministerIntent,
  composerUsesErQuantityConfirmation,
  inpatientFacilityMedicationOrderMode,
  isPureOutpatientPrescriptionOrderCreate,
  resolveComposerDefaultMedicationFulfillmentIntent,
  resolveComposerDefaultMedicationQuantity,
  resolveOutpatientRxLineIntent,
  shouldShowAmbulatoryPendingMarOrderItemFallback,
  shouldSkipPilotScopeForOutpatientRxCreate,
} from "../index.js";

describe("MEDUI.D4C.7G enterprise MAR authority / Clinic Rx", () => {
  it("A — certification id + forbidden Clinic* authorities", () => {
    expect(CLINIC_ENTERPRISE_MAR_AUTHORITY_ORDER_RX_CERTIFICATION_ID).toBe("MEDUI.D4C.7G");
    expect(D4C7G_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicMAR");
    expect(D4C7G_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicPrescription");
    expect(D4C7G_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES).toContain("ClinicMedicationAdministration");
  });

  it("B — Clinic facility Orders remain ER_ADMINISTER_ONLY (D4C.7E preserved)", () => {
    expect(
      clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: true })
    ).toBe("ER_ADMINISTER_ONLY");
  });

  it("C — Clinic Rx uses OUTPATIENT_RX_ONLY (not DEFAULT facility composer)", () => {
    expect(clinicAmbulatoryOutpatientRxOrderMode({ ambulatoryCareSetting: true })).toBe(
      D4C7G_OUTPATIENT_RX_ORDER_MODE
    );
    expect(clinicAmbulatoryOutpatientRxOrderMode({ ambulatoryCareSetting: false })).toBe(
      "DEFAULT"
    );
    expect(resolveOutpatientRxLineIntent()).toBe("PHARMACY_DISPENSE");
  });

  it("D — ambulatory pending MAR fallback when timeline hidden", () => {
    expect(
      shouldShowAmbulatoryPendingMarOrderItemFallback({
        showFacilityMarShiftTimeline: false,
        marTabShowLegacySections: false,
      })
    ).toBe(true);
    expect(
      shouldShowAmbulatoryPendingMarOrderItemFallback({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: false,
      })
    ).toBe(false);
    expect(
      shouldShowAmbulatoryPendingMarOrderItemFallback({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: true,
      })
    ).toBe(true);
  });

  it("E — pure outpatient Rx skips pilot scope; facility-admin does not", () => {
    expect(
      shouldSkipPilotScopeForOutpatientRxCreate({
        type: "MEDICATION",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "PHARMACY_DISPENSE",
          },
        ],
      })
    ).toBe(true);
    expect(
      shouldSkipPilotScopeForOutpatientRxCreate({
        type: "MEDICATION",
        items: [
          {
            catalogItemType: "MEDICATION",
            medicationFulfillmentIntent: "ADMINISTER_CHART",
          },
        ],
      })
    ).toBe(false);
    expect(
      isPureOutpatientPrescriptionOrderCreate({
        type: "MEDICATION",
        items: [
          { catalogItemType: "LAB_TEST", medicationFulfillmentIntent: "PHARMACY_DISPENSE" },
        ],
      })
    ).toBe(false);
  });

  it("F — MAR projection observability when surface hidden", () => {
    const failed = buildFacilityMarProjectionObservability({
      orderId: "ord-1",
      orderItemId: "oi-1",
      intent: "ADMINISTER_CHART",
      pendingEligible: true,
      timelineVisible: false,
      pendingTaskSurfaceVisible: false,
    });
    expect(failed.eligible).toBe(true);
    expect(failed.errorCode).toBe(D4C7G_ERROR_CODES.FACILITY_MEDICATION_MAR_PROJECTION_FAILED);
    expect(failed.exclusionReason).toBe("MAR_UI_SURFACE_HIDDEN");

    const ok = buildFacilityMarProjectionObservability({
      orderId: "ord-1",
      orderItemId: "oi-1",
      intent: "ADMINISTER_CHART",
      pendingEligible: true,
      timelineVisible: false,
      pendingTaskSurfaceVisible: true,
    });
    expect(ok.errorCode).toBeNull();
    expect(ok.eligible).toBe(true);
  });

  it("G — outpatient Rx mode rejects facility-admin intent", () => {
    expect(
      assertOutpatientRxModeRejectsFacilityAdminIntent({
        medicationOrderMode: D4C7G_OUTPATIENT_RX_ORDER_MODE,
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      }).ok
    ).toBe(false);
    expect(
      assertOutpatientRxModeRejectsFacilityAdminIntent({
        medicationOrderMode: D4C7G_OUTPATIENT_RX_ORDER_MODE,
        medicationFulfillmentIntent: "PHARMACY_DISPENSE",
      }).ok
    ).toBe(true);
  });

  it("INP.2E.2 — inpatient standing mode forces ADMINISTER_CHART without ER qty confirmation", () => {
    expect(inpatientFacilityMedicationOrderMode()).toBe(
      D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE
    );
    expect(
      composerForcesFacilityAdministerIntent(inpatientFacilityMedicationOrderMode())
    ).toBe(true);
    expect(composerUsesErQuantityConfirmation(inpatientFacilityMedicationOrderMode())).toBe(
      false
    );
    expect(
      resolveComposerDefaultMedicationFulfillmentIntent(inpatientFacilityMedicationOrderMode())
    ).toBe("ADMINISTER_CHART");
    expect(
      resolveComposerDefaultMedicationQuantity(inpatientFacilityMedicationOrderMode())
    ).toBe(1);
    expect(composerUsesErQuantityConfirmation("ER_ADMINISTER_ONLY")).toBe(true);
    expect(resolveComposerDefaultMedicationFulfillmentIntent("DEFAULT")).toBe(
      "PHARMACY_DISPENSE"
    );
  });
});
