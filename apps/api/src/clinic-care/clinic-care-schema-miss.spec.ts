import {
  CLINIC_CARE_SCHEMA_MISS_MESSAGE,
  isPrismaSchemaMissError,
} from "./clinic-care-schema-miss";

describe("MEDUI.D4C.2A.1 clinic-care schema miss detection", () => {
  it("detects Prisma P2021 / P2022", () => {
    expect(isPrismaSchemaMissError({ code: "P2021", message: "table does not exist" })).toBe(true);
    expect(isPrismaSchemaMissError({ code: "P2022", message: "column visitOrigin" })).toBe(true);
    expect(isPrismaSchemaMissError({ code: "P2002", message: "unique" })).toBe(false);
  });

  it("detects visitOrigin / Appointment messaging", () => {
    expect(isPrismaSchemaMissError({ message: "Unknown column visitOrigin" })).toBe(true);
    expect(
      isPrismaSchemaMissError({ message: "The table `public.Appointment` does not exist (P2021)" })
    ).toBe(true);
  });

  it("exports operator-facing migration hint", () => {
    expect(CLINIC_CARE_SCHEMA_MISS_MESSAGE).toContain("20261028120000_enterprise_appointment_visit_origin_d4c3");
  });
});
