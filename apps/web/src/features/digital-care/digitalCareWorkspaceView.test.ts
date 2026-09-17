import { describe, expect, it } from "vitest";
import {
  digitalCareInitials,
  digitalCareIsActive,
  digitalCareIsDischarged,
  digitalCareSafeLabel,
  digitalCareVisibleTabs,
  filterDigitalCareRoster,
  fillCountTemplate,
  mapDigitalCareUserError,
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
    expect(filterDigitalCareRoster(rows, "ACTIVE").map((row) => row.displayName)).not.toContain("Closed Obs");
    expect(filterDigitalCareRoster(rows, "DISCHARGED").map((row) => row.displayName)).toEqual(["Out", "Closed Obs"]);
  });

  it("treats CLOSED as discharged even when legacy dischargedAt is missing", () => {
    const legacyClosed = patient({ visitStatus: "CLOSED", dischargedAt: null });
    expect(digitalCareIsDischarged(legacyClosed)).toBe(true);
    expect(digitalCareIsActive(legacyClosed)).toBe(false);
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
  });

  it("hides Digital Care tabs that the facility configuration disabled", () => {
    expect(digitalCareVisibleTabs({ digitalCare: { secureMessaging: false, resultRelease: true } })).not.toContain("messages");
    expect(digitalCareVisibleTabs({ digitalCare: { secureMessaging: false, resultRelease: true } })).toContain("results");
  });
});
