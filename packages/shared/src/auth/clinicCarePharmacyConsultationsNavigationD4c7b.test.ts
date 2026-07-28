/**
 * MEDUI.D4C.7B — Pharmacy navigation, inventory-alert privacy, Consultations routing.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_PHARMACY_CONSULTATIONS_NAVIGATION_CERTIFICATION_ID,
  D4C7B_ADMIN_INVENTORY_ALERT_WIDGET_DEFERRAL,
  D4C7B_CANONICAL_PHARMACY_ROLE_CODE,
  D4C7B_CLINIC_CONSULTATIONS_LIST_HREF,
  D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  D4C7B_GENERIC_ENCOUNTERS_LIST_HREF,
  buildClinicPharmacyEntryHref,
  canAccessClinicPharmacyNavigation,
  canAccessPharmacyInventoryAlerts,
  clinicCareAmbulatoryOpenWorkspacePathForRole,
  isCanonicalPharmacyRoleCode,
  isClinicPharmacyEntryHref,
  isPharmacySidebarHref,
  resolveAmbulatoryWorkspaceRoleDefaultSection,
  resolveClinicCareAwareSidebarHref,
  resolveConsultationsListHref,
  shouldExposeInventoryAlertsOnClinicClinicalBoard,
} from "./clinicCarePharmacyConsultationsNavigationD4c7b.js";

describe("MEDUI.D4C.7B clinic pharmacy + consultations navigation", () => {
  it("A — Pharmacy navigation role gates + clinic entry href", () => {
    expect(CLINIC_CARE_PHARMACY_CONSULTATIONS_NAVIGATION_CERTIFICATION_ID).toBe(
      "MEDUI.D4C.7B"
    );
    expect(D4C7B_CANONICAL_PHARMACY_ROLE_CODE).toBe("PHARMACY");
    expect(isCanonicalPharmacyRoleCode("PHARMACY")).toBe(true);
    expect(isCanonicalPharmacyRoleCode("PHARMACIST")).toBe(true);
    expect(canAccessClinicPharmacyNavigation(["ADMIN"])).toBe(true);
    expect(canAccessClinicPharmacyNavigation(["PHARMACY"])).toBe(true);
    expect(canAccessClinicPharmacyNavigation(["PROVIDER"])).toBe(false);
    expect(canAccessClinicPharmacyNavigation(["RN"])).toBe(false);
    expect(canAccessClinicPharmacyNavigation(["PATIENT_CARE_TECH"])).toBe(false);
    expect(canAccessClinicPharmacyNavigation(["FRONT_DESK"])).toBe(false);
    expect(canAccessClinicPharmacyNavigation(["BILLING"])).toBe(false);
    const href = buildClinicPharmacyEntryHref();
    expect(href).toContain("/app/pharmacy");
    expect(href).toContain("source=clinic-care");
    expect(href).toContain("ambulatory=1");
    expect(isClinicPharmacyEntryHref(href)).toBe(true);
  });

  it("B — no ClinicPharmacy / ClinicConsultation duplicate authorities listed", () => {
    expect(D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicPharmacy");
    expect(D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicPharmacyQueue");
    expect(D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicConsultation");
    expect(D4C7B_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicEncounterList");
  });

  it("C — inventory-alert privacy + Clinical Board non-exposure + Admin widget deferral", () => {
    expect(shouldExposeInventoryAlertsOnClinicClinicalBoard()).toBe(false);
    expect(canAccessPharmacyInventoryAlerts(["ADMIN"])).toBe(true);
    expect(canAccessPharmacyInventoryAlerts(["PHARMACY"])).toBe(true);
    expect(canAccessPharmacyInventoryAlerts(["PROVIDER"])).toBe(false);
    expect(canAccessPharmacyInventoryAlerts(["RN"])).toBe(false);
    expect(D4C7B_ADMIN_INVENTORY_ALERT_WIDGET_DEFERRAL).toBe("D4C.8");
  });

  it("D — Consultations routing prefers ambulatory clinic-care worklist", () => {
    expect(
      resolveConsultationsListHref({
        clinicCareEnabled: true,
        edEnabled: false,
      })
    ).toBe(D4C7B_CLINIC_CONSULTATIONS_LIST_HREF);
    expect(
      resolveConsultationsListHref({
        clinicCareEnabled: false,
        edEnabled: true,
      })
    ).toBe(D4C7B_GENERIC_ENCOUNTERS_LIST_HREF);
    // Mixed ED+Clinic: page gate keeps generic list; sidebar still rewrites Consultations.
    expect(
      resolveConsultationsListHref({
        clinicCareEnabled: true,
        edEnabled: true,
      })
    ).toBe(D4C7B_GENERIC_ENCOUNTERS_LIST_HREF);
    expect(
      resolveClinicCareAwareSidebarHref("/app/encounters", {
        clinicCareEnabled: true,
        urgentCareEnabled: false,
        edEnabled: true,
        pharmacyEnabled: true,
      })
    ).toBe(D4C7B_CLINIC_CONSULTATIONS_LIST_HREF);
    expect(
      resolveClinicCareAwareSidebarHref("/app/encounters", {
        clinicCareEnabled: true,
        urgentCareEnabled: false,
        edEnabled: false,
        pharmacyEnabled: true,
      })
    ).toBe(D4C7B_CLINIC_CONSULTATIONS_LIST_HREF);
    expect(
      resolveClinicCareAwareSidebarHref("/app/pharmacy", {
        clinicCareEnabled: true,
        urgentCareEnabled: false,
        edEnabled: false,
        pharmacyEnabled: true,
      })
    ).toBe(buildClinicPharmacyEntryHref());
  });

  it("E — role-aware default Active Clinic Workspace sections", () => {
    expect(
      resolveAmbulatoryWorkspaceRoleDefaultSection({ roleCodes: ["PROVIDER"] })
    ).toBe("medical-evaluation");
    expect(resolveAmbulatoryWorkspaceRoleDefaultSection({ roleCodes: ["RN"] })).toBe(
      "intake"
    );
    expect(
      resolveAmbulatoryWorkspaceRoleDefaultSection({ roleCodes: ["PHARMACY"] })
    ).toBe("medications");
    expect(
      resolveAmbulatoryWorkspaceRoleDefaultSection({ roleCodes: ["FRONT_DESK"] })
    ).toBe("follow-up");
    expect(
      resolveAmbulatoryWorkspaceRoleDefaultSection({ roleCodes: ["ADMIN"] })
    ).toBe("summary");
    const path = clinicCareAmbulatoryOpenWorkspacePathForRole("enc-1", {
      roleCodes: ["PROVIDER"],
      from: "consultations",
    });
    expect(path).toContain("workspace=ambulatory");
    expect(path).toContain("section=medical-evaluation");
    expect(path).toContain("from=consultations");
    expect(path).not.toContain("workspace=ed");
  });

  it("F — generic encounters href retained for ED-only facilities", () => {
    expect(
      resolveConsultationsListHref({
        clinicCareEnabled: false,
        urgentCareEnabled: false,
        edEnabled: true,
      })
    ).toBe(D4C7B_GENERIC_ENCOUNTERS_LIST_HREF);
    expect(
      resolveClinicCareAwareSidebarHref("/app/encounters", {
        clinicCareEnabled: false,
        urgentCareEnabled: false,
        edEnabled: true,
        pharmacyEnabled: false,
      })
    ).toBe("/app/encounters");
  });

  it("G — Pharmacy sidebar helper + French product labels contract (Pharmacie entry)", () => {
    expect(isPharmacySidebarHref("/app/pharmacy")).toBe(true);
    expect(isPharmacySidebarHref("/app/pharmacy?source=clinic-care&ambulatory=1")).toBe(
      true
    );
    expect(isPharmacySidebarHref("/app/encounters")).toBe(false);
    // Product FR label lives in uiLabels / i18n; contract: primary entry is Pharmacie not a fork.
    expect(buildClinicPharmacyEntryHref().startsWith("/app/pharmacy")).toBe(true);
  });

  it("H — regression anchors: certification + ambulatory open path shape", () => {
    expect(CLINIC_CARE_PHARMACY_CONSULTATIONS_NAVIGATION_CERTIFICATION_ID).toMatch(
      /^MEDUI\.D4C\.7B$/
    );
    const rnPath = clinicCareAmbulatoryOpenWorkspacePathForRole("x", {
      roleCodes: ["RN"],
    });
    expect(rnPath).toContain("/app/encounters/x?");
    expect(rnPath).toContain("section=intake");
  });
});
