/**
 * MEDUI.INP.2E.2 — Enterprise MAR order-to-administration convergence (web gates).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE,
  clinicAmbulatoryFacilityMedicationOrderMode,
  evaluateMedicationOrderScheduleCreateGate,
  inpatientFacilityMedicationOrderMode,
  isStructuredMedicationOrderRoute,
  normalizeMedicationRoute,
  nursingAdmissionHomeMedUpdateCreatesOrderOrMar,
  shouldCreateMarShiftTimelineOrderItemFallback,
} from "@medora/shared";

const webSrc = join(__dirname, "../..");
const readSrc = (rel: string) => readFileSync(join(webSrc, rel), "utf8");

const FLAGS_ON = { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true };

describe("MEDUI.INP.2E.2 enterprise MAR order-to-administration", () => {
  it("A — inpatient standing composer is FACILITY_ADMINISTER_STANDING, not DEFAULT or ER_ADMINISTER_ONLY", () => {
    expect(inpatientFacilityMedicationOrderMode()).toBe(
      D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE
    );
    const workspace = readSrc("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    const review = readSrc("features/inpatient-workspace/InpatientReviewOrdersPanel.tsx");
    expect(workspace).toContain("inpatientFacilityMedicationOrderMode()");
    expect(review).toContain("inpatientFacilityMedicationOrderMode()");
    expect(workspace).not.toContain('medicationOrderMode="DEFAULT"');
    expect(workspace).not.toContain('medicationOrderMode="ER_ADMINISTER_ONLY"');
  });

  it("B — daily/BID remaining schedule-eligible for ADMINISTER_CHART", () => {
    for (const frequencyCode of ["DAILY", "BID"] as const) {
      const gate = evaluateMedicationOrderScheduleCreateGate({
        frequencyCode,
        featureFlags: FLAGS_ON,
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      });
      expect(gate.shouldCreate).toBe(true);
      expect(gate.classification).toBe("RECURRING");
    }
  });

  it("C-E — NOW/STAT/ONCE stay direct-MAR (fallback, no fabricated recurring doses)", () => {
    for (const frequencyCode of ["NOW", "STAT", "ONCE"] as const) {
      const gate = evaluateMedicationOrderScheduleCreateGate({
        frequencyCode,
        featureFlags: FLAGS_ON,
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      });
      expect(gate.shouldCreate).toBe(false);
      expect(gate.reason).toBe("DIRECT_MAR_FREQUENCY_NEVER_SCHEDULES");
      expect(
        shouldCreateMarShiftTimelineOrderItemFallback({
          frequencyCode,
          notes: null,
          intendedAdministrationAt: null,
          hasMedicationDoseInstances: false,
          featureFlags: FLAGS_ON,
        })
      ).toBe(true);
    }
  });

  it("F — PRN is ON_DEMAND without recurring expansion", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "PRN",
      featureFlags: FLAGS_ON,
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("ON_DEMAND");
  });

  it("G — PHARMACY_DISPENSE BID never schedules", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: FLAGS_ON,
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("NOT_FACILITY_ADMIN_INTENT");
  });

  it("H — Clinic facility Orders remain ER_ADMINISTER_ONLY (enterprise MAR)", () => {
    expect(
      clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: true })
    ).toBe("ER_ADMINISTER_ONLY");
    const panels = readSrc("features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("clinicAmbulatoryFacilityMedicationOrderMode");
    expect(panels).not.toContain("ClinicMAR");
  });

  it("I — Clinic Rx remains OUTPATIENT_RX_ONLY", () => {
    const rx = readSrc("features/clinic-care/ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(rx).toContain('medicationOrderMode="OUTPATIENT_RX_ONLY"');
  });

  it("J — home-med editor does not create Order/MAR", () => {
    expect(nursingAdmissionHomeMedUpdateCreatesOrderOrMar()).toBe(false);
    const editor = readSrc(
      "features/inpatient-workspace/NursingAdmissionEnterpriseHistoryEditor.tsx"
    );
    expect(editor).toContain("Does not create orders or MAR doses");
    expect(editor).not.toContain("MedicationDoseInstance");
    expect(editor).not.toContain("/encounters/");
  });

  it("K-M — hold/resume/discontinue remain on enterprise medication lifecycle", () => {
    const lifecycle = readFileSync(
      join(webSrc, "../../api/src/orders/medication-order-lifecycle.service.ts"),
      "utf8"
    );
    expect(lifecycle).toContain("holdOrderItem");
    expect(lifecycle).toContain("resumeOrderItem");
    expect(lifecycle).toContain("discontinueOrderItem");
    expect(lifecycle).toContain("medicationFulfillmentIntent");
  });

  it("N — duplicate MAR remains server-authoritative", () => {
    const spec = readFileSync(
      join(
        webSrc,
        "../../api/src/medication-administration/medication-administration-dose-gated-mar.spec.ts"
      ),
      "utf8"
    );
    expect(spec).toContain("rejects duplicate MAR on the same dose");
  });

  it("O — clinical vs audit time remains distinct", () => {
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toMatch(/effectiveClinicalAt|clinicalTime|administeredAt/);
  });

  it("P-Q — RN/PROVIDER/ADMIN on MAR writes; PCT not granted", () => {
    const controller = readFileSync(
      join(webSrc, "../../api/src/medication-administration/medication-administration.controller.ts"),
      "utf8"
    );
    const timeline = readFileSync(
      join(webSrc, "../../api/src/medication-dose/mar-shift-timeline.controller.ts"),
      "utf8"
    );
    expect(controller).toContain("RoleCode.RN");
    expect(controller).toContain("RoleCode.PROVIDER");
    expect(controller).toContain("RoleCode.ADMIN");
    expect(controller).not.toContain("PATIENT_CARE_TECH");
    expect(timeline).toContain("@RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)");
    expect(timeline).not.toContain("PATIENT_CARE_TECH");
  });

  it("R — no facility UUID hardcoding in INP.2E.2 composer/schedule helpers", () => {
    const shared = readFileSync(
      join(
        webSrc,
        "../../../packages/shared/src/auth/enterpriseMarAuthorityClinicOrderRxD4c7g.ts"
      ),
      "utf8"
    );
    expect(shared).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(inpatientFacilityMedicationOrderMode()).not.toMatch(/Wayne|Haiti/i);
  });

  it("S — ED default remains ER_ADMINISTER_ONLY; Observation does not pass inpatient standing mode", () => {
    const er = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(er).toContain('medicationOrderMode = "ER_ADMINISTER_ONLY"');
    const observation = readSrc("features/observation-workspace/ObservationWorkspacePanel.tsx");
    expect(observation).toContain("EmergencyErOrdersPanel");
    expect(observation).not.toContain("inpatientFacilityMedicationOrderMode");
    expect(observation).not.toContain("FACILITY_ADMINISTER_STANDING");
  });

  it("composer requires a selected route for facility-administered lines and does not infer IM/IV from injectable", () => {
    const modal = readSrc("components/orders/CreateOrderModal.tsx");
    expect(modal).toContain("errFacilityAdminRouteRequired");
    expect(en.createOrderModal.errFacilityAdminRouteRequired.length).toBeGreaterThan(0);
    expect(fr.createOrderModal.errFacilityAdminRouteRequired.length).toBeGreaterThan(0);
    expect(en.createOrderModal.errFacilityAdminRouteRequired).not.toMatch(/injectable/i);
    expect(
      normalizeMedicationRoute({ route: "injectable", administrationType: "" })
    ).toBeUndefined();
    expect(isStructuredMedicationOrderRoute("injectable")).toBe(false);
    expect(isStructuredMedicationOrderRoute("IM")).toBe(true);
  });

  it("timeline and expansion exclude PHARMACY_DISPENSE at domain layer", () => {
    const timeline = readFileSync(
      join(webSrc, "../../api/src/medication-dose/mar-shift-timeline.service.ts"),
      "utf8"
    );
    const expansion = readFileSync(
      join(webSrc, "../../api/src/medication-dose/medication-dose-expansion.service.ts"),
      "utf8"
    );
    const fallback = readFileSync(
      join(webSrc, "../../api/src/medication-dose/mar-shift-timeline-order-item-fallback.util.ts"),
      "utf8"
    );
    expect(timeline).toContain("medicationFulfillmentIntent: { not: \"PHARMACY_DISPENSE\" }");
    expect(expansion).toContain("NOT_FACILITY_ADMIN_INTENT");
    expect(fallback).toContain('medicationFulfillmentIntent: "ADMINISTER_CHART"');
  });
});
