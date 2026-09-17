import { describe, expect, it } from "vitest";
import {
  countDigitalCareRoster,
  digitalCareInitials,
  digitalCareIsActive,
  digitalCareIsDischarged,
  digitalCarePortalAccessActions,
  digitalCarePortalAccessMessageKey,
  digitalCareSafeLabel,
  digitalCareVisitStatusPresentation,
  digitalCareVisibleTabs,
  filterDigitalCareRoster,
  fillCountTemplate,
  mapDigitalCareUserError,
  mapPatientAppAccessStatus,
} from "./digitalCareWorkspaceView";
import type { DigitalCareRosterPatient } from "@/lib/digitalCareStaffWorkspaceApi";

const patient = (overrides: Partial<DigitalCareRosterPatient>): DigitalCareRosterPatient => ({
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Marie Toussaint",
  mrn: "1002456",
  dob: "1985-03-12T00:00:00.000Z",
  ageYears: 41,
  sex: "F",
  phone: "+509",
  email: "marie@example.com",
  address: "Cap-Haïtien",
  visitType: "ED",
  visitStatus: "OPEN",
  arrivedAt: new Date().toISOString(),
  dischargedAt: null,
  unit: "ED",
  attending: "Dr Jean",
  encounterId: "22222222-2222-4222-8222-222222222222",
  portalActive: true,
  unreadCount: 0,
  ...overrides,
});

describe("Digital Care workspace view helpers", () => {
  it("never displays a UUID as a patient label", () => {
    expect(digitalCareSafeLabel("11111111-1111-4111-8111-111111111111")).toBe("—");
    expect(digitalCareSafeLabel("Marie Toussaint")).toBe("Marie Toussaint");
    expect(digitalCareInitials("Marie Toussaint")).toBe("MT");
  });

  it("filters roster sections from authoritative encounter state", () => {
    const rows = [
      patient({ unreadCount: 2 }),
      patient({ id: "a", visitType: "OBSERVATION", displayName: "Obs" }),
      patient({ id: "b", visitStatus: "CLOSED", dischargedAt: "2026-09-14T00:00:00.000Z", arrivedAt: "2026-09-01T00:00:00.000Z", displayName: "Out" }),
      patient({ id: "c", visitType: "OBSERVATION", visitStatus: "CLOSED", dischargedAt: null, displayName: "Closed Obs" }),
    ];
    expect(filterDigitalCareRoster(rows, "UNREAD")).toHaveLength(1);
    expect(filterDigitalCareRoster(rows, "OBSERVATION").map((row) => row.displayName)).toEqual(["Obs"]);
    expect(filterDigitalCareRoster(rows, "DISCHARGED")[0]?.displayName).toBe("Out");
    expect(filterDigitalCareRoster(rows, "ACTIVE").every((row) => row.displayName !== "Out")).toBe(true);
    expect(filterDigitalCareRoster(rows, "ACTIVE").map((row) => row.displayName)).not.toContain("Closed Obs");
    expect(filterDigitalCareRoster(rows, "DISCHARGED").map((row) => row.displayName)).toEqual(["Out", "Closed Obs"]);
    expect(filterDigitalCareRoster(rows, "ALL")).toHaveLength(4);
  });

  it("treats CLOSED encounters as discharged even without dischargedAt", () => {
    const closed = patient({ visitStatus: "CLOSED", dischargedAt: null, displayName: "Closed" });
    expect(digitalCareIsDischarged(closed)).toBe(true);
    expect(digitalCareIsActive(closed)).toBe(false);
    expect(filterDigitalCareRoster([closed], "ACTIVE")).toHaveLength(0);
    expect(filterDigitalCareRoster([closed], "DISCHARGED")[0]?.displayName).toBe("Closed");
    expect(digitalCareVisitStatusPresentation(closed)).toEqual(
      expect.objectContaining({ discharged: true, statusKey: "digitalCare.status.discharged", marker: "#94a3b8" }),
    );
    expect(digitalCareVisitStatusPresentation(closed).statusKey).not.toBe("digitalCare.status.activeVisit");
  });

  it("keeps observation visits labeled observation while still marking discharge", () => {
    const activeObs = patient({ visitType: "OBSERVATION", visitStatus: "OPEN", dischargedAt: null });
    const dischargedObs = patient({ visitType: "OBSERVATION", visitStatus: "CLOSED", dischargedAt: "2026-09-14T00:00:00.000Z" });
    expect(filterDigitalCareRoster([activeObs, dischargedObs], "OBSERVATION")).toEqual([activeObs]);
    expect(digitalCareVisitStatusPresentation(activeObs)).toEqual(
      expect.objectContaining({ observation: true, discharged: false, statusKey: "digitalCare.status.activeVisit" }),
    );
    expect(digitalCareVisitStatusPresentation(dischargedObs).statusKey).toBe("digitalCare.status.discharged");
  });

  it("counts loaded roster filters without extra queries", () => {
    const rows = [
      patient({ visitStatus: "OPEN", dischargedAt: null }),
      patient({ id: "obs", visitType: "OBSERVATION", visitStatus: "OPEN", dischargedAt: null }),
      patient({ id: "out", visitStatus: "CLOSED", dischargedAt: "2026-09-14T00:00:00.000Z" }),
    ];
    expect(countDigitalCareRoster(rows)).toEqual(
      expect.objectContaining({ ALL: 3, ACTIVE: 2, OBSERVATION: 1, DISCHARGED: 1 }),
    );
  });

  it("fills patient count copy without exposing identifiers", () => {
    expect(fillCountTemplate("Showing {shown} of {total} patients", 8, 142)).toBe("Showing 8 of 142 patients");
  });

  it("ALL includes facility patients without a recent arrival", () => {
    const stale = patient({ arrivedAt: "2020-01-01T00:00:00.000Z" });
    expect(filterDigitalCareRoster([stale], "RECENT")).toHaveLength(0);
    expect(filterDigitalCareRoster([stale], "ALL")).toHaveLength(1);
  });

  it("maps portal-inactive and 500s without calling them patient-not-found", () => {
    expect(mapDigitalCareUserError(new Error("Patient portal is not active for this patient."))).toBe("portalInactive");
    expect(mapDigitalCareUserError(Object.assign(new Error("Patient not found"), { status: 404 }))).toBe("patientNotFound");
    expect(mapDigitalCareUserError(Object.assign(new Error("Internal server error."), { status: 500 }))).toBe("generic");
    expect(mapDigitalCareUserError(new Error("Secure messaging storage is unavailable."))).toBe("messagingUnavailable");
    expect(mapDigitalCareUserError(Object.assign(new Error("Access denied"), { status: 403 }))).toBe("notAuthorized");
    expect(mapDigitalCareUserError(new Error("Activation code invalid or expired"))).toBe("activationExpired");
    expect(mapDigitalCareUserError(new Error("failed to fetch"))).toBe("network");
  });

  it("maps authoritative portal access fields into Patient App Access states", () => {
    expect(mapPatientAppAccessStatus(null)).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "NOT_LINKED", latestActivation: null })).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "NOT_LINKED", latestActivation: { state: "PENDING" } })).toBe("PENDING");
    expect(mapPatientAppAccessStatus({ accessStatus: "NOT_LINKED", latestActivation: { state: "EXPIRED" } })).toBe("EXPIRED");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: "ACTIVE", revokedAt: null, latestActivation: { state: "USED" } })).toBe("ACTIVE");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: "ACTIVE", latestActivation: { state: "PENDING" } })).toBe("ACTIVE");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: "DISABLED", latestActivation: { state: "PENDING" } })).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: "LOCKED" })).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: "PENDING_VERIFICATION" })).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "VERIFIED", accountStatus: null })).toBe("NOT_ACTIVATED");
    expect(mapPatientAppAccessStatus({ accessStatus: "REVOKED", accountStatus: "ACTIVE", revokedAt: "2026-09-14T00:00:00.000Z" })).toBe("REVOKED");
    expect(mapPatientAppAccessStatus({ accessStatus: "NOT_LINKED", latestActivation: { state: "USED" } })).toBe("NOT_ACTIVATED");
  });

  it("does not treat access GET 404 as a loaded Active/Pending Patient App Access state", () => {
    const missing = Object.assign(new Error("Cannot GET /patient-portal-admin/v1/patients/x/access"), { status: 404 });
    const notAtFacility = Object.assign(new Error("Patient not found at this facility"), { status: 404 });
    expect(mapDigitalCareUserError(missing)).toBe("patientNotFound");
    expect(digitalCarePortalAccessMessageKey(missing)).toBe("digitalCare.appAccess.loadError");
    expect(digitalCarePortalAccessMessageKey(notAtFacility)).toBe("digitalCare.appAccess.loadError");
    expect(digitalCarePortalAccessMessageKey(Object.assign(new Error("Access denied"), { status: 403 }))).toBe(
      "digitalCare.error.notAuthorized",
    );
    expect(
      digitalCarePortalAccessActions({
        canActivate: true,
        canRevoke: true,
        access: null,
        lookupFailed: true,
      }),
    ).toEqual(
      expect.objectContaining({
        showStatus: false,
        showActivate: false,
        showRegenerate: false,
        showRevoke: false,
      }),
    );
  });

  it("shows Activate only after a successful access lookup", () => {
    expect(
      digitalCarePortalAccessActions({
        canActivate: true,
        canRevoke: true,
        access: { accessStatus: "NOT_LINKED", latestActivation: null },
        lookupFailed: false,
      }).showActivate,
    ).toBe(true);
    expect(
      digitalCarePortalAccessActions({
        canActivate: true,
        canRevoke: false,
        access: { accessStatus: "NOT_LINKED", latestActivation: { state: "PENDING" } },
        lookupFailed: false,
      }),
    ).toEqual(expect.objectContaining({ kind: "PENDING", showActivate: false, showRegenerate: true, showRevoke: false }));
  });

  it("hides Digital Care tabs that the facility configuration disabled", () => {
    expect(digitalCareVisibleTabs({ digitalCare: { secureMessaging: false, resultRelease: true } })).not.toContain("messages");
    expect(digitalCareVisibleTabs({ digitalCare: { secureMessaging: false, resultRelease: true } })).toContain("results");
  });
});
