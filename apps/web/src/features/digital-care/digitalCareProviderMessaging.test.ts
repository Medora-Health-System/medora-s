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

  it("keeps FRONT_DESK excluded from Digital Care", () => {
    const item = SIDEBAR_NAV_ITEMS.find((candidate) => candidate.href === CANONICAL_DIGITAL_CARE);
    expect(item?.roles).not.toContain("FRONT_DESK");
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

  it("does not give FRONT_DESK Digital Care", () => {
    expect(sessionHrefs("FRONT_DESK", { facilityType: "CLINIC", facilityServiceLines: ["CLINIC"] })).not.toContain(
      CANONICAL_DIGITAL_CARE
    );
  });

  it("lets ADMIN, PROVIDER, and RN stay on /app/digital-care", () => {
    for (const role of ["ADMIN", "PROVIDER", "RN"]) {
      expect(getRouteGuardRedirect(CANONICAL_DIGITAL_CARE, [role])).toBeNull();
      expect(isAppPathAllowedForRoles(CANONICAL_DIGITAL_CARE, [role])).toBe(true);
    }
  });

  it("redirects unauthorized roles away from /app/digital-care", () => {
    for (const role of ["FRONT_DESK", "LAB", "RADIOLOGY", "PHARMACY", "BILLING"]) {
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

  it("selects Digital Care patients by PatientSearchHitV1.id and defaults the roster to all facility patients", () => {
    const workspace = readFileSync(join(__dirname, "DigitalCareProviderWorkspace.tsx"), "utf8");
    expect(workspace).toContain("PatientSearchAndSelect");
    expect(workspace).toContain("onSelect={(patient) => setSelectedId(patient.id)}");
    expect(workspace).toContain('useState<DigitalCareRosterFilter>("ALL")');
    expect(workspace).toContain("fetchDigitalCareWorkspace(facilityId, patientId)");
    expect(workspace).toContain("releaseDigitalCareResult");
    expect(workspace).toContain("createDigitalCareStaffThread");
  });
});
