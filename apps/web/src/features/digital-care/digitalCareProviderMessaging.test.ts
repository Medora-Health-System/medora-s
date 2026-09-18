import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { digitalCareOverlayKeyParity } from "@/i18n/messages/digitalCareNavOverrides";
import { getRouteGuardRedirect, isAppPathAllowedForRoles } from "@/lib/landingRoute";

const CANONICAL_DIGITAL_CARE = "/app/digital-care";

const emergencyClinicalProfile = {
  prismaDepartmentCode: "EMERGENCY" as const,
  facilityType: "HOSPITAL" as const,
  facilityServiceLines: null,
};

const hospitalClinicalProfile = {
  prismaDepartmentCode: "INPATIENT" as const,
  facilityType: "HOSPITAL" as const,
  facilityServiceLines: ["INPATIENT"],
};

const clinicClinicalProfile = {
  prismaDepartmentCode: "CLINIC" as const,
  facilityType: "CLINIC" as const,
  facilityServiceLines: ["CLINIC"],
};

function sessionHrefs(role: string, profile: Record<string, unknown>): string[] {
  return filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
    roleCodes: [role],
    profile: { roleCodes: [role], ...profile },
  }).map((item) => item.href);
}

describe("Digital Care provider messaging workspace", () => {
  it("exposes one dedicated ADMIN/provider/RN sidebar destination", () => {
    const item = SIDEBAR_NAV_ITEMS.find((candidate) => candidate.href === CANONICAL_DIGITAL_CARE);
    expect(item).toBeDefined();
    expect(item?.label).toBe("nav.digitalCare");
    expect(item?.roles).toEqual(["ADMIN", "RN", "PROVIDER"]);
    expect(item?.navAreas).toEqual(["EMERGENCY", "HOSPITAL", "CLINIC_CARE"]);
    expect(item?.href).not.toBe("/app/provider/digital-care");
  });

  it("keeps Digital Care sidebar roles on ADMIN, PROVIDER, and RN", () => {
    const item = SIDEBAR_NAV_ITEMS.find((candidate) => candidate.href === CANONICAL_DIGITAL_CARE);
    expect(item?.roles).not.toContain("FRONT_DESK");
    expect(item?.roles).not.toContain("MEDORA_SUPER_ADMIN");
    expect(item?.roles).not.toContain("LAB");
    expect(item?.roles).not.toContain("RADIOLOGY");
    expect(item?.roles).not.toContain("PHARMACY");
    expect(item?.roles).not.toContain("BILLING");
  });

  it("shows Digital Care in the sidebar for ADMIN, PROVIDER, and RN", () => {
    for (const role of ["ADMIN", "PROVIDER", "RN"]) {
      expect(sessionHrefs(role, emergencyClinicalProfile)).toContain(CANONICAL_DIGITAL_CARE);
    }
  });

  it("does not show Digital Care in FRONT_DESK or MEDORA_SUPER_ADMIN sidebars", () => {
    expect(sessionHrefs("FRONT_DESK", { facilityType: "CLINIC", facilityServiceLines: ["CLINIC"] })).not.toContain(
      CANONICAL_DIGITAL_CARE
    );
    expect(
      sessionHrefs("MEDORA_SUPER_ADMIN", { facilityType: "HOSPITAL", facilityServiceLines: ["INPATIENT"] }),
    ).not.toContain(CANONICAL_DIGITAL_CARE);
  });

  it("lets ADMIN, PROVIDER, and RN stay on /app/digital-care", () => {
    for (const role of ["ADMIN", "PROVIDER", "RN"]) {
      expect(getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role])).toBeNull();
      expect(isAppPathAllowedForRoles(CANONICAL_DIGITAL_CARE, [role])).toBe(true);
    }
  });

  it("redirects unauthorized roles away from /app/digital-care", () => {
    for (const role of ["FRONT_DESK", "LAB", "RADIOLOGY", "PHARMACY", "BILLING", "MEDORA_SUPER_ADMIN"]) {
      const redirect = getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role]);
      expect(redirect).toBeTruthy();
      expect(redirect).not.toBe(CANONICAL_DIGITAL_CARE);
      expect(isAppPathAllowedForRoles(CANONICAL_DIGITAL_CARE, [role])).toBe(false);
    }
  });

  it("does not grant Digital Care to LAB or FRONT_DESK even when hospital/clinic areas are visible", () => {
    expect(
      isAppPathAllowedForRoles(CANONICAL_DIGITAL_CARE, ["LAB"], {
        navigationProfile: { roleCodes: ["LAB"], ...hospitalClinicalProfile },
      })
    ).toBe(false);
    expect(
      getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, ["FRONT_DESK"], {
        navigationProfile: { roleCodes: ["FRONT_DESK"], ...clinicClinicalProfile },
      })
    ).toBeTruthy();
  });

  it("keeps Digital Care on Emergency, Hospital, and Clinic Care clinical profiles", () => {
    for (const role of ["ADMIN", "PROVIDER", "RN"]) {
      expect(sessionHrefs(role, emergencyClinicalProfile)).toContain(CANONICAL_DIGITAL_CARE);
      expect(sessionHrefs(role, hospitalClinicalProfile)).toContain(CANONICAL_DIGITAL_CARE);
      expect(sessionHrefs(role, clinicClinicalProfile)).toContain(CANONICAL_DIGITAL_CARE);
      expect(
        getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role], {
          navigationProfile: { roleCodes: [role], ...emergencyClinicalProfile },
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role], {
          navigationProfile: { roleCodes: [role], ...hospitalClinicalProfile },
        })
      ).toBeNull();
      expect(
        getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role], {
          navigationProfile: { roleCodes: [role], ...clinicClinicalProfile },
        })
      ).toBeNull();
    }
  });

  it("localizes the Digital Care label in all supported UI languages", () => {
    expect(resolveClinicalUiMessage("en", "nav.digitalCare")).toBe("Digital Care");
    expect(resolveClinicalUiMessage("fr", "nav.digitalCare")).toBe("Soins numériques");
    expect(resolveClinicalUiMessage("es", "nav.digitalCare")).toBe("Atención Digital");
    expect(resolveClinicalUiMessage("fr", "digitalCare.title")).toBe("Soins numériques");
    expect(resolveClinicalUiMessage("fr", "digitalCare.subtitle")).toContain("Communication patient");
    expect(resolveClinicalUiMessage("en", "digitalCare.tab.results")).toBe("Patient results");
    expect(resolveClinicalUiMessage("fr", "digitalCare.tab.messages")).toBe("Messages");
    expect(digitalCareOverlayKeyParity()).toEqual([]);
  });

  it("keeps provider/RN Digital Care focused on clinical messaging and removes patient app access controls", () => {
    const workspace = readFileSync(join(__dirname, "DigitalCareProviderWorkspace.tsx"), "utf8");
    expect(workspace).toContain("PatientSearchAndSelect");
    expect(workspace).toContain("onSelect={(patient) => setSelectedId(patient.id)}");
    expect(workspace).toContain('useState<DigitalCareRosterFilter>("ALL")');
    expect(workspace).toContain("fetchDigitalCareWorkspace(facilityId, patientId)");
    expect(workspace).toContain("releaseDigitalCareResult");
    expect(workspace).toContain("createDigitalCareStaffThread");
    expect(workspace).not.toContain("DigitalCarePatientAppAccess");
    expect(workspace).not.toContain("issuePatientPortalActivation");
    expect(workspace).not.toContain("revokePatientPortalAccess");
    expect(workspace).not.toContain("sendPatientPortalInvitation");
    expect(workspace).toContain("digitalCareVisitStatusPresentation");
    expect(workspace).not.toContain("localStorage");
    expect(workspace).not.toContain("sessionStorage");
    expect(workspace).not.toContain("console.log");
  });

  it("refreshes an open message thread without requiring a browser refresh", () => {
    const workspace = readFileSync(join(__dirname, "DigitalCareProviderWorkspace.tsx"), "utf8");
    expect(workspace).toContain('thread.status !== "OPEN"');
    expect(workspace).toContain("fetchDigitalCareStaffThread(facilityId, thread.id).then(setThread)");
    expect(workspace).toContain("window.setInterval(refresh, 2000)");
    expect(workspace).toContain("window.clearInterval(timer)");
  });

  it("returns a closed conversation to new-message state for the same patient", () => {
    const workspace = readFileSync(join(__dirname, "DigitalCareProviderWorkspace.tsx"), "utf8");
    expect(workspace).toContain("closeDigitalCareStaffThread");
    expect(workspace).toMatch(/closeDigitalCareStaffThread[\s\S]{0,800}setThread\(null\)/);
  });

  it("moves patient app invitation and access controls to facility administration", () => {
    const access = readFileSync(join(__dirname, "DigitalCarePatientActivationPanel.tsx"), "utf8");
    const admin = readFileSync(join(__dirname, "../../components/admin/FacilityAdminControlPanel.tsx"), "utf8");
    const api = readFileSync(join(__dirname, "../../lib/patientPortalAdminApi.ts"), "utf8");
    expect(admin).toContain("DigitalCarePatientActivationPanel");
    expect(access).toContain("fetchPatientPortalAccess");
    expect(access).toContain("issuePatientPortalActivation");
    expect(access).toContain("revokePatientPortalAccess");
    expect(access).toContain("sendPatientPortalInvitation");
    expect(access).toContain('roles.includes("ADMIN")');
    expect(access).toContain('roles.includes("MEDORA_SUPER_ADMIN")');
    expect(access).not.toContain('roles.includes("FRONT_DESK")');
    expect(api).toContain("/patient-portal-admin/v1/patients/");
    expect(api).toContain("/activation");
    expect(api).toContain("/invitation");
    expect(api).toContain("{ facilityId }");
  });

  it("does not expose an invitation activation secret after email send", () => {
    const access = readFileSync(join(__dirname, "DigitalCarePatientActivationPanel.tsx"), "utf8");
    const api = readFileSync(join(__dirname, "../../lib/patientPortalAdminApi.ts"), "utf8");
    expect(api).toContain("PatientPortalInvitationIssue");
    expect(api).not.toMatch(/invitation[\s\S]{0,200}activationCode/);
    expect(access).toContain("setInvitation(result)");
    expect(access).toContain("setActivationCode(null)");
    expect(access).toContain("invitation.maskedEmail");
    expect(access).not.toContain("invitation.activationCode");
  });
});
