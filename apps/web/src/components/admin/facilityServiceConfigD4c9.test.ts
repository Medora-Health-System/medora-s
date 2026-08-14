/**
 * MEDUI.D4C.9 — Facility service-line configuration & billing workflow UI guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultBillingWorkflowModeForFacilityType,
  resolveEffectiveFacilityBillingWorkflow,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import { emptyFacilityBillingWorkflowForm } from "@/components/admin/FacilityBillingWorkflowFields";

const root = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.D4C.9 facility service-line configuration", () => {
  it("exposes existing-facility service config modal on admin users page", () => {
    const page = read("app/app/admin/users/page.tsx");
    const modal = read("src/components/admin/FacilityServiceConfigModal.tsx");
    expect(page).toContain("FacilityServiceConfigModal");
    expect(page).toContain("open-facility-service-config");
    expect(page).toContain("facilityServiceConfigD4c9");
    expect(modal).toContain("patchAdminFacilityServiceConfig");
    expect(modal).toContain("FacilityTypeServiceLineFields");
    expect(modal).toContain("dentalSpecialties");
    expect(modal).not.toMatch(/\bclass\s+DentalFacility\b/);
    expect(modal).not.toContain("FacilityFeatureOverride");
  });

  it("hides LEGACY on create and defaults new workflow to CLINIC_ONLY", () => {
    const fields = read("src/components/admin/FacilityBillingWorkflowFields.tsx");
    const page = read("app/app/admin/users/page.tsx");
    expect(emptyFacilityBillingWorkflowForm().billingClassificationMode).toBe("CLINIC_ONLY");
    expect(fields).toContain('variant === "create"');
    expect(fields).toContain("allowLegacyOption");
    expect(page).toContain('variant="create"');
    expect(defaultBillingWorkflowModeForFacilityType("HOSPITAL")).toBe("HOSPITAL_ENTERPRISE");
  });

  it("projects LEGACY inference and unresolved failure", () => {
    expect(
      resolveEffectiveFacilityBillingWorkflow({
        billingClassificationMode: null,
        billingSiteType: "URGENT_CARE",
      }).effectiveMode
    ).toBe("URGENT_CARE_ONLY");
    expect(
      resolveEffectiveFacilityBillingWorkflow({
        billingClassificationMode: null,
        billingSiteType: null,
      }).source
    ).toBe("UNRESOLVED");
  });

  it("exposes FR/EN facility service config labels", () => {
    expect((en as any).facilityServiceConfigD4c9.openButton).toMatch(/Services/);
    expect((fr as any).facilityServiceConfigD4c9.openButton).toBe(
      "Services et configuration de l’établissement"
    );
    expect((fr as any).facilityServiceConfigD4c9.unresolvedHelp).toContain("parcours de facturation");
  });
});
