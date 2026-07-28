import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_TRACKBOARD_METRIC_IDS,
  clinicCareRowMatchesView,
  defaultClinicCareTrackboardViewForProfession,
  facilityLocalDayUtcBounds,
  projectClinicCareStage,
  resolveClinicCareTrackboardFieldVisibility,
  resolveClinicCareWorkspaceRoleAccess,
  resolveFacilityModuleCapabilitiesD4c1,
} from "@medora/shared";
import { CLINIC_CARE_KPI_TOKENS, CLINIC_CARE_STAGE_TOKENS } from "./clinicCareTokens";

/** Mirrors ClinicCareTrackboardView SHELL_NAV visibility rules for contract tests. */
function shellNavVisible(
  id: string,
  access: ReturnType<typeof resolveClinicCareWorkspaceRoleAccess>
): boolean {
  switch (id) {
    case "trackboard":
    case "todaysVisits":
      return true;
    case "registration":
      return access.canAccessRegistration;
    case "nursing":
      return access.canAccessNursingMa || access.canAccessTechnicianSafeNursingMaProjection;
    case "provider":
      return access.canAccessProviderDocumentation && access.canAuthorProviderDocumentation;
    case "patients":
      return access.canAccessPatients;
    case "encounters":
      return access.canAccessEncounters;
    case "followUps":
      return access.canAccessFollowUps;
    case "immunizations":
      return access.canAccessPublicHealthImmunizations;
    case "diseaseReporting":
      return access.canAccessPublicHealthDiseaseReporting;
    case "billing":
      return access.canAccessBilling;
    case "pharmacy":
      return access.canAccessPharmacy;
    default:
      return false;
  }
}

describe("MEDUI.D4C.2 clinic care shell / trackboard UI contracts", () => {
  const clinicCaps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
  const haitiClinicCaps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: "CLINIC",
    facilityCountry: "Haiti",
  });

  it("renders six mandatory primary KPI cards including Discharge Pending", () => {
    expect(CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS).toHaveLength(6);
    expect(CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS).toEqual([
      "TODAYS_VISITS",
      "WAITING",
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "DISCHARGE_PENDING",
      "FOLLOW_UPS_DUE",
    ]);
    expect(CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS).toEqual([]);
    expect(CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS).toContain("DISCHARGE_PENDING");
    expect(CLINIC_CARE_TRACKBOARD_METRIC_IDS as readonly string[]).not.toContain(
      "READY_FOR_COMPLETION"
    );
    for (const id of CLINIC_CARE_TRACKBOARD_METRIC_IDS) {
      expect(CLINIC_CARE_KPI_TOKENS[id].accent).toMatch(/^#/);
    }
  });

  it("keeps stage colors secondary to textual stage labels", () => {
    expect(CLINIC_CARE_STAGE_TOKENS.WAITING.text).toBeTruthy();
    expect(CLINIC_CARE_STAGE_TOKENS.STATUS_UNAVAILABLE.bg).toBeTruthy();
    expect(CLINIC_CARE_STAGE_TOKENS.DISCHARGE_PENDING).toBeDefined();
    expect(projectClinicCareStage({ workflowState: null, encounterStatus: "OPEN" }).stageId).toBe(
      "STATUS_UNAVAILABLE"
    );
  });

  it("defaults provider and technician board views differently", () => {
    expect(defaultClinicCareTrackboardViewForProfession("PROVIDER")).toBe("PROVIDER");
    expect(defaultClinicCareTrackboardViewForProfession("TECHNICIAN")).toBe("NURSING_MA");
    expect(defaultClinicCareTrackboardViewForProfession("FRONT_DESK")).toBe("ALL_TODAY");
    expect(defaultClinicCareTrackboardViewForProfession("BILLING")).toBe("ALL_TODAY");
  });

  it("filters follow-up due view only when encounter has open follow-up", () => {
    const day = facilityLocalDayUtcBounds(new Date("2026-07-27T18:00:00.000Z"), "America/Chicago");
    expect(
      clinicCareRowMatchesView({
        view: "FOLLOW_UP_DUE",
        stageId: "IN_PROGRESS",
        createdAt: day.startUtc,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
        hasOpenFollowUpDue: true,
      })
    ).toBe(true);
    expect(
      clinicCareRowMatchesView({
        view: "FOLLOW_UP_DUE",
        stageId: "IN_PROGRESS",
        createdAt: day.startUtc,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
        hasOpenFollowUpDue: false,
      })
    ).toBe(false);
  });

  it("Front Desk sees shell + operational nav; no clinical docs / PH write", () => {
    const front = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "FRONT_DESK",
      moduleCapabilities: haitiClinicCaps,
      roleCodes: ["FRONT_DESK"],
      facilityCountry: "Haiti",
    });
    expect(front.canAccessClinicCareShell).toBe(true);
    expect(shellNavVisible("registration", front)).toBe(true);
    expect(shellNavVisible("todaysVisits", front)).toBe(true);
    expect(shellNavVisible("patients", front)).toBe(true);
    expect(shellNavVisible("encounters", front)).toBe(true);
    expect(shellNavVisible("provider", front)).toBe(false);
    expect(shellNavVisible("nursing", front)).toBe(false);
    expect(shellNavVisible("followUps", front)).toBe(false);
    expect(shellNavVisible("immunizations", front)).toBe(false);
    const vis = resolveClinicCareTrackboardFieldVisibility("FRONT_DESK");
    expect(vis.showClinicalActionLinks).toBe(false);
    expect(vis.showChiefComplaint).toBe(false);
    expect(vis.showOpenOrderCount).toBe(false);
    expect(vis.showDischargeActions).toBe(false);
    expect(front.canAuthorProviderDocumentation).toBe(false);
    expect(front.canIssueProviderOrders).toBe(false);
    expect(front.canPrescribe).toBe(false);
  });

  it("Billing sees shell + billing-relevant nav; billing-readiness KPI; no clinical actions", () => {
    const billing = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "BILLING",
      moduleCapabilities: clinicCaps,
      roleCodes: ["BILLING"],
    });
    expect(billing.canAccessClinicCareShell).toBe(true);
    expect(shellNavVisible("billing", billing)).toBe(true);
    expect(shellNavVisible("patients", billing)).toBe(true);
    expect(shellNavVisible("encounters", billing)).toBe(true);
    expect(shellNavVisible("provider", billing)).toBe(false);
    expect(shellNavVisible("nursing", billing)).toBe(false);
    const vis = resolveClinicCareTrackboardFieldVisibility("BILLING");
    expect(vis.showClinicalActionLinks).toBe(false);
    expect(vis.showResultsPendingCount).toBe(false);
    expect(vis.showDischargePendingKpi).toBe(true);
    expect(vis.showDischargeActions).toBe(false);
    expect(billing.canAuthorProviderDocumentation).toBe(false);
  });

  it("Technician remains safe; Provider/Nurse Haiti PH nav exposed", () => {
    const tech = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "TECHNICIAN",
      moduleCapabilities: haitiClinicCaps,
      roleCodes: ["LAB"],
      facilityCountry: "Haiti",
    });
    expect(tech.canAccessClinicCareShell).toBe(true);
    expect(tech.canAccessClinicTrackboardProjection).toBe(true);
    expect(tech.canAuthorProviderDocumentation).toBe(false);
    expect(tech.canIssueProviderOrders).toBe(false);
    expect(tech.canPrescribe).toBe(false);
    expect(tech.canMutateDiagnosesOrProblemList).toBe(false);
    expect(shellNavVisible("provider", tech)).toBe(false);
    expect(shellNavVisible("nursing", tech)).toBe(true);
    expect(shellNavVisible("immunizations", tech)).toBe(false);

    const provider = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "PROVIDER",
      moduleCapabilities: haitiClinicCaps,
      facilityCountry: "Haiti",
    });
    expect(provider.canAccessClinicCareShell).toBe(true);
    expect(provider.canAuthorProviderDocumentation).toBe(true);
    expect(shellNavVisible("provider", provider)).toBe(true);
    expect(shellNavVisible("immunizations", provider)).toBe(true);
    expect(shellNavVisible("diseaseReporting", provider)).toBe(true);
    expect(provider.canAccessMsppHaitiPathway).toBe(true);

    const nurse = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "RN",
      moduleCapabilities: haitiClinicCaps,
      facilityCountry: "Haiti",
    });
    expect(nurse.canAccessNursingMa).toBe(true);
    expect(shellNavVisible("nursing", nurse)).toBe(true);
    expect(shellNavVisible("followUps", nurse)).toBe(true);
    expect(shellNavVisible("immunizations", nurse)).toBe(true);
    expect(shellNavVisible("diseaseReporting", nurse)).toBe(true);
  });

  it("Clinic-disabled facilities cannot authorize protected trackboard projection", () => {
    const hospitalCaps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "HOSPITAL" });
    expect(hospitalCaps.clinicCareEnabled).toBe(false);
    const front = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "FRONT_DESK",
      moduleCapabilities: hospitalCaps,
      roleCodes: ["FRONT_DESK"],
    });
    expect(front.canAccessClinicCareShell).toBe(false);
    expect(front.canAccessClinicTrackboardProjection).toBe(false);
  });

  it("role-restricted columns/actions absent for Front Desk and Billing", () => {
    expect(resolveClinicCareTrackboardFieldVisibility("FRONT_DESK").showOpenOrderCount).toBe(false);
    expect(resolveClinicCareTrackboardFieldVisibility("BILLING").showChiefComplaint).toBe(false);
    expect(resolveClinicCareTrackboardFieldVisibility("PROVIDER").showClinicalActionLinks).toBe(true);
  });
});
