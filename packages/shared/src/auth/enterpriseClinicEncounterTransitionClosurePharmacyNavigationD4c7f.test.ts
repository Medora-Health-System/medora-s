import { describe, expect, it } from "vitest";
import {
  CLINIC_ENCOUNTER_TRANSITION_CLOSURE_PHARMACY_NAV_CERTIFICATION_ID,
  D4C7F_ADMIN_PHARMACY_CLINICAL_AUTHORITY,
  D4C7F_CLOSURE_GUARD_CLASSIFICATION,
  D4C7F_ENCOUNTER_PENDING_ITEMS_CODE,
  D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS,
  D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  D4C7F_PENDING_ITEMS_ACK_VERSION,
  D4C7F_PHARMACY_ROLE_CLINICAL_AUTHORITY,
  EMPTY_D4C7F_PENDING_ITEM_COUNTS,
  ambulatoryWorkflowPendingLabelKey,
  assertNoForbiddenClinicD4c7fAuthority,
  canOverrideAmbulatoryPendingClosureItems,
  clinicAdminHasFullPharmacyNavAccess,
  isActiveInfusionFromAdministrations,
  projectD4c7fClosurePreflight,
  resolveClinicCareAwarePharmacySidebarHref,
  resolveSidebarNavIconPathname,
  resolveSidebarTwemojiSvgFile,
  totalD4c7fPendingItems,
} from "./enterpriseClinicEncounterTransitionClosurePharmacyNavigationD4c7f.js";

describe("MEDUI.D4C.7F — encounter transition / closure / pharmacy nav", () => {
  it("A — closure preflight: no pending → canClose", () => {
    const p = projectD4c7fClosurePreflight({
      encounterId: "e1",
      currentStatus: "OPEN",
      pendingItems: { ...EMPTY_D4C7F_PENDING_ITEM_COUNTS },
      nonOverridableBlockers: [],
      roleCodes: ["PROVIDER"],
    });
    expect(p.canClose).toBe(true);
    expect(p.overrideAllowed).toBe(false);
    expect(p.acknowledgementVersion).toBe(D4C7F_PENDING_ITEMS_ACK_VERSION);
  });

  it("A — pending medications → overrideAllowed for provider", () => {
    const pending = { ...EMPTY_D4C7F_PENDING_ITEM_COUNTS, medications: 2 };
    const p = projectD4c7fClosurePreflight({
      encounterId: "e1",
      currentStatus: "OPEN",
      pendingItems: pending,
      pendingItemIds: ["oi1", "oi2"],
      nonOverridableBlockers: [],
      roleCodes: ["PROVIDER"],
    });
    expect(p.canClose).toBe(false);
    expect(p.overrideAllowed).toBe(true);
    expect(totalD4c7fPendingItems(p.pendingItems)).toBe(2);
    expect(p.pendingItemIds).toEqual(["oi1", "oi2"]);
  });

  it("A — multiple categories + non-overridable separately", () => {
    const p = projectD4c7fClosurePreflight({
      encounterId: "e1",
      currentStatus: "OPEN",
      pendingItems: {
        ...EMPTY_D4C7F_PENDING_ITEM_COUNTS,
        laboratory: 1,
        imaging: 1,
        medications: 1,
        procedures: 1,
        followUps: 1,
      },
      nonOverridableBlockers: [
        { code: "ACTIVE_INFUSION_RUNNING", message: "Une perfusion est toujours en cours." },
      ],
      roleCodes: ["PROVIDER"],
    });
    expect(p.overrideAllowed).toBe(false);
    expect(p.nonOverridableBlockers).toHaveLength(1);
    expect(D4C7F_CLOSURE_GUARD_CLASSIFICATION.ACTIVE_ORDERS_UNRESOLVED).toBe(
      "OVERRIDABLE_PENDING"
    );
  });

  it("C — override auth matrix", () => {
    expect(canOverrideAmbulatoryPendingClosureItems(["PROVIDER"])).toBe(true);
    expect(canOverrideAmbulatoryPendingClosureItems(["MEDORA_SUPER_ADMIN"])).toBe(true);
    expect(canOverrideAmbulatoryPendingClosureItems(["RN"])).toBe(false);
    expect(canOverrideAmbulatoryPendingClosureItems(["ADMIN"])).toBe(false);
    expect(canOverrideAmbulatoryPendingClosureItems(["PHARMACY"])).toBe(false);
    expect(canOverrideAmbulatoryPendingClosureItems(["FRONT_DESK"])).toBe(false);
    expect(canOverrideAmbulatoryPendingClosureItems(["BILLING"])).toBe(false);
  });

  it("D — active infusion detection", () => {
    expect(
      isActiveInfusionFromAdministrations([
        { notes: "Perfusion IV — début 10:00", infusionPhase: "INFUSION_START" },
      ])
    ).toBe(true);
    expect(
      isActiveInfusionFromAdministrations([
        { notes: "Perfusion IV terminée", infusionPhase: "INFUSION_STOP" },
      ])
    ).toBe(false);
    expect(isActiveInfusionFromAdministrations([])).toBe(false);
  });

  it("E — pending workflow labels", () => {
    expect(ambulatoryWorkflowPendingLabelKey("COMPLETE_VISIT")).toBe(
      "clinicCareD4c7f.pending.closing"
    );
    expect(ambulatoryWorkflowPendingLabelKey("START_INTAKE")).toBe(
      "clinicCareD4c7f.pending.startIntake"
    );
  });

  it("I — navigation icon pathname aliases (no question-mark for clinic rewrites)", () => {
    expect(resolveSidebarNavIconPathname("/app/clinic-care/nursing")).toBe("/app/nursing");
    expect(resolveSidebarNavIconPathname("/app/clinic-care/provider")).toBe("/app/provider");
    expect(resolveSidebarNavIconPathname("/app/clinic-care/encounters")).toBe("/app/encounters");
    expect(
      resolveSidebarNavIconPathname("/app/lab-worklist?source=clinic-care&ambulatory=1")
    ).toBe("/app/lab-worklist");
    expect(
      resolveSidebarNavIconPathname("/app/pharmacy?source=clinic-care&ambulatory=1")
    ).toBe("/app/pharmacy");
    const map = {
      "/app/nursing": "1fac0.svg",
      "/app/provider": "1f9d1-200d-2695-fe0f.svg",
      "/app/encounters": "1f4c4.svg",
      "/app/lab-worklist": "1f9ea.svg",
      "/app/pharmacy": "1f48a.svg",
    };
    expect(resolveSidebarTwemojiSvgFile("/app/clinic-care/nursing", map)).toBe("1fac0.svg");
    expect(
      resolveSidebarTwemojiSvgFile("/app/pharmacy?source=clinic-care&ambulatory=1", map)
    ).toBe("1f48a.svg");
    expect(resolveSidebarTwemojiSvgFile("/app/unknown-route", map)).toBe("2753.svg");
  });

  it("J/K — Pharmacy nav for ADMIN+capability and PHARMACY; denied without", () => {
    expect(
      clinicAdminHasFullPharmacyNavAccess({ roleCodes: ["ADMIN"], pharmacyEnabled: true })
    ).toBe(true);
    expect(
      clinicAdminHasFullPharmacyNavAccess({ roleCodes: ["PHARMACY"], pharmacyEnabled: true })
    ).toBe(true);
    expect(
      clinicAdminHasFullPharmacyNavAccess({ roleCodes: ["ADMIN"], pharmacyEnabled: false })
    ).toBe(false);
    expect(
      clinicAdminHasFullPharmacyNavAccess({ roleCodes: ["PROVIDER"], pharmacyEnabled: true })
    ).toBe(false);
    expect(D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS).toContain("/app/pharmacy/inventory");
    expect(D4C7F_ENTERPRISE_PHARMACY_NAV_PATHS).toContain("/app/pharmacy/dispense");
    const inv = resolveClinicCareAwarePharmacySidebarHref("/app/pharmacy/inventory", {
      clinicCareEnabled: true,
      pharmacyEnabled: true,
    });
    expect(inv).toContain("source=clinic-care");
    expect(inv).toContain("ambulatory=1");
    expect(inv.startsWith("/app/pharmacy/inventory")).toBe(true);
  });

  it("M — Admin operational ≠ pharmacist clinical authority", () => {
    expect(D4C7F_ADMIN_PHARMACY_CLINICAL_AUTHORITY.mayVerifyPharmacy).toBe(false);
    expect(D4C7F_ADMIN_PHARMACY_CLINICAL_AUTHORITY.mayAdministerMar).toBe(false);
    expect(D4C7F_PHARMACY_ROLE_CLINICAL_AUTHORITY.mayVerifyPharmacy).toBe(true);
  });

  it("architecture — certification id, forbidden names, typed code", () => {
    expect(CLINIC_ENCOUNTER_TRANSITION_CLOSURE_PHARMACY_NAV_CERTIFICATION_ID).toBe(
      "MEDUI.D4C.7F"
    );
    expect(D4C7F_ENCOUNTER_PENDING_ITEMS_CODE).toBe("ENCOUNTER_PENDING_ITEMS");
    expect(D4C7F_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicPharmacyDashboard");
    expect(assertNoForbiddenClinicD4c7fAuthority("EncountersService.close")).toBe(true);
    expect(assertNoForbiddenClinicD4c7fAuthority("closeClinicEncounterWithOverride")).toBe(
      false
    );
  });
});
