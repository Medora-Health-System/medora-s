import { describe, expect, it } from "vitest";
import {
  auditMedicationOrderGovernancePermissions,
  isChartAdminMedicationOrderItem,
  isMarManagedMedicationOrderItem,
  isMedicationOrderLineItem,
  isStandingMedicationOrderLineActiveInOrders,
  normalizeMedicationOrderLifecycleStatus,
  resolveMedicationGovernanceRenderState,
  resolveMedicationOrderGovernanceCanPrescribe,
  shouldRenderMedicationGovernance,
} from "@/lib/medicationOrderGovernancePermissions";

const vancomycinQ12H = {
  id: "item-vanco",
  status: "ACKNOWLEDGED",
  frequencyCode: "Q12H",
  manualLabel: "Vancomycin 750 mg IVPB Q12H",
  medicationFulfillmentIntent: "ADMINISTER_CHART",
  medicationLifecycleStatus: null,
};

describe("resolveMedicationGovernanceRenderState", () => {
  it("Vancomycin IVPB Q12H active after MAR completion renders governance for provider", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: vancomycinQ12H,
      permissions: { canPrescribeProp: false, roles: ["PROVIDER"] },
    });
    expect(state.shouldRender).toBe(true);
    expect(state.canMutate).toBe(true);
    expect(state.isStandingActiveOrder).toBe(true);
    expect(state.isMarManagedOrder).toBe(true);
    expect(state.hiddenReason).toBeNull();
  });

  it("null lifecycle status renders as ACTIVE", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: vancomycinQ12H,
      permissions: { roles: ["PROVIDER"] },
    });
    expect(state.normalizedLifecycleStatus).toBe("ACTIVE");
  });

  it("legacy medication row without catalogItemType still renders", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: { id: "legacy-1", status: "ORDERED" },
      permissions: { roles: ["ADMIN"] },
    });
    expect(state.isMedicationOrder).toBe(true);
    expect(state.shouldRender).toBe(true);
  });

  it("RN user cannot mutate but sees read-only governance on standing active order", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: vancomycinQ12H,
      permissions: { roles: ["RN"] },
    });
    expect(state.shouldRender).toBe(true);
    expect(state.canMutate).toBe(false);
    expect(state.effectiveCanPrescribe).toBe(false);
  });

  it("provider and admin can mutate when lifecycle is ACTIVE", () => {
    for (const role of ["PROVIDER", "ADMIN", "MEDORA_SUPER_ADMIN"] as const) {
      const state = resolveMedicationGovernanceRenderState({
        orderType: "MEDICATION",
        orderItem: vancomycinQ12H,
        permissions: { roles: [role] },
      });
      expect(state.canMutate).toBe(true);
      expect(state.effectiveCanPrescribe).toBe(true);
    }
  });

  it("signed encounter blocks mutation for provider", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: vancomycinQ12H,
      permissions: { roles: ["PROVIDER"], encounterSigned: true },
    });
    expect(state.shouldRender).toBe(true);
    expect(state.canMutate).toBe(false);
  });

  it("hidden state returns NOT_MEDICATION_ORDER for non-medication rows", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "LAB",
      orderItem: { id: "lab-1", status: "ORDERED" },
      permissions: { roles: ["PROVIDER"] },
    });
    expect(state.shouldRender).toBe(false);
    expect(state.hiddenReason).toBe("NOT_MEDICATION_ORDER");
    expect(state.hiddenReasonCode).toBe("NOT_MEDICATION_ORDER");
  });

  it("hidden state returns INACTIVE_STANDING_ORDER for RN on terminal workflow status", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: { id: "done-1", status: "COMPLETED", medicationLifecycleStatus: null },
      permissions: { roles: ["RN"] },
    });
    expect(state.shouldRender).toBe(false);
    expect(state.hiddenReason).toBe("INACTIVE_STANDING_ORDER");
  });

  it("provider still renders governance on discontinued lifecycle for history access", () => {
    const state = resolveMedicationGovernanceRenderState({
      orderType: "MEDICATION",
      orderItem: {
        id: "disc-1",
        status: "ACKNOWLEDGED",
        medicationLifecycleStatus: "DISCONTINUED",
      },
      permissions: { roles: ["PROVIDER"] },
    });
    expect(state.shouldRender).toBe(true);
    expect(state.isStandingActiveOrder).toBe(false);
    expect(state.canMutate).toBe(false);
  });

  it("shouldRenderMedicationGovernance mirrors resolveMedicationGovernanceRenderState", () => {
    expect(
      shouldRenderMedicationGovernance("MEDICATION", vancomycinQ12H, { roles: ["PROVIDER"] })
    ).toBe(true);
    expect(
      shouldRenderMedicationGovernance("LAB", vancomycinQ12H, { roles: ["PROVIDER"] })
    ).toBe(false);
  });
});

describe("medicationOrderGovernancePermissions primitives", () => {
  it("provider and admin roles can prescribe for governance", () => {
    expect(resolveMedicationOrderGovernanceCanPrescribe(["PROVIDER"])).toBe(true);
    expect(resolveMedicationOrderGovernanceCanPrescribe(["ADMIN"])).toBe(true);
    expect(resolveMedicationOrderGovernanceCanPrescribe(["MEDORA_SUPER_ADMIN"])).toBe(true);
  });

  it("RN-only user cannot prescribe for governance", () => {
    expect(resolveMedicationOrderGovernanceCanPrescribe(["RN"])).toBe(false);
  });

  it("accepts medication order lines when catalogItemType is missing (legacy rows)", () => {
    expect(isMedicationOrderLineItem("MEDICATION", { id: "item-1" })).toBe(true);
    expect(isMedicationOrderLineItem("MEDICATION", { catalogItemType: "MEDICATION" })).toBe(true);
    expect(isMedicationOrderLineItem("LAB", { catalogItemType: "MEDICATION" })).toBe(false);
  });

  it("null medicationLifecycleStatus resolves to ACTIVE", () => {
    expect(normalizeMedicationOrderLifecycleStatus(null)).toBe("ACTIVE");
    expect(normalizeMedicationOrderLifecycleStatus(undefined)).toBe("ACTIVE");
  });

  it("Q12H standing order remains active after MAR dose completion workflow", () => {
    expect(isStandingMedicationOrderLineActiveInOrders(vancomycinQ12H)).toBe(true);
    expect(isChartAdminMedicationOrderItem(vancomycinQ12H)).toBe(true);
    expect(isMarManagedMedicationOrderItem("MEDICATION", vancomycinQ12H)).toBe(true);
  });

  it("terminal workflow status COMPLETED excludes standing order from open governance", () => {
    expect(
      isStandingMedicationOrderLineActiveInOrders({
        status: "COMPLETED",
        medicationLifecycleStatus: null,
      })
    ).toBe(false);
  });

  it("discontinued lifecycle suppresses standing active open-order classification", () => {
    expect(
      isStandingMedicationOrderLineActiveInOrders({
        status: "ACKNOWLEDGED",
        medicationLifecycleStatus: "DISCONTINUED",
      })
    ).toBe(false);
  });

  it("audit falls back to roles when canPrescribe prop is false", () => {
    const audit = auditMedicationOrderGovernancePermissions({
      canPrescribeProp: false,
      roles: ["PROVIDER"],
    });
    expect(audit.effectiveCanPrescribe).toBe(true);
    expect(audit.source).toBe("roles");
  });
});
