import { describe, expect, it } from "vitest";
import {
  auditMedicationOrderGovernancePermissions,
  isChartAdminMedicationOrderItem,
  isMedicationOrderLineItem,
  isStandingMedicationOrderLineActiveInOrders,
  normalizeMedicationOrderLifecycleStatus,
  resolveMedicationOrderGovernanceCanPrescribe,
} from "@/lib/medicationOrderGovernancePermissions";

describe("medicationOrderGovernancePermissions", () => {
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
    const vancomycinRow = {
      id: "item-vanco",
      status: "ACKNOWLEDGED",
      frequencyCode: "Q12H",
      medicationFulfillmentIntent: "ADMINISTER_CHART",
      medicationLifecycleStatus: null,
    };
    expect(isStandingMedicationOrderLineActiveInOrders(vancomycinRow)).toBe(true);
    expect(isChartAdminMedicationOrderItem(vancomycinRow)).toBe(true);
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
