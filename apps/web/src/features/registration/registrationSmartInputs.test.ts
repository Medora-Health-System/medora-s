import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { formatRegistrationPhone } from "./RegistrationPatientModals";

const source = readFileSync(new URL("./RegistrationPatientModals.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../app/app/patients/page.tsx", import.meta.url), "utf8");

describe("registration smart inputs", () => {
  it("formats US and Dominican Republic numbers as 10-digit local phone numbers", () => {
    expect(formatRegistrationPhone("5123698987", "United States")).toBe("512-369-8987");
    expect(formatRegistrationPhone("8097458778", "Dominican Republic")).toBe("809-745-8778");
  });

  it("adds the Haiti country code and formats the local eight digits", () => {
    expect(formatRegistrationPhone("33788974", "Haiti")).toBe("+509 33-78-8974");
    expect(formatRegistrationPhone("+50933788974", "Haïti")).toBe("+509 33-78-8974");
  });

  it("keeps address entry manual when Places is unavailable while supporting Google address autofill when configured", () => {
    expect(source).toContain("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    expect(source).toContain("AddressAutocompleteInput");
    expect(source).toContain('types: ["address"]');
    expect(source).toContain("stateProvince");
    expect(source).toContain("postalCode");
  });

  it("uses localized relationship and mode-of-arrival dropdowns and localizes the waiting room label", () => {
    expect(source).toContain("relationshipOptions.map");
    expect(source).toContain("arrivalOptions.map");
    expect(source).toContain("formatEncounterRoomDisplay(r, t)");
    expect(source).not.toContain('<input\n              type="text"\n              value={modeOfArrival}');
  });

  it("routes patient creation and consultation through the enhanced registration modals", () => {
    expect(page).toContain('from "@/features/registration/RegistrationPatientModals"');
    expect(page).toContain("<NewPatientModal");
    expect(page).toContain("<CreateConsultationModal");
  });
});
