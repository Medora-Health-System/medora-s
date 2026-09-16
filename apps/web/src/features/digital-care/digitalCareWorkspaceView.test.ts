import { describe, expect, it } from "vitest";
import {
  digitalCareInitials,
  digitalCareSafeLabel,
  filterDigitalCareRoster,
  fillCountTemplate,
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

  it("filters roster sections from live identity fields", () => {
    const rows = [
      patient({ unreadCount: 2 }),
      patient({ id: "a", visitType: "OBSERVATION", displayName: "Obs" }),
      patient({ id: "b", visitStatus: "CLOSED", dischargedAt: "2026-09-14T00:00:00.000Z", arrivedAt: "2026-09-01T00:00:00.000Z", displayName: "Out" }),
    ];
    expect(filterDigitalCareRoster(rows, "UNREAD")).toHaveLength(1);
    expect(filterDigitalCareRoster(rows, "OBSERVATION")[0]?.displayName).toBe("Obs");
    expect(filterDigitalCareRoster(rows, "DISCHARGED")[0]?.displayName).toBe("Out");
  });

  it("fills patient count copy without exposing identifiers", () => {
    expect(fillCountTemplate("Showing {shown} of {total} patients", 8, 142)).toBe("Showing 8 of 142 patients");
  });
});
