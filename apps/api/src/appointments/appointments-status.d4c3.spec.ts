import { canCheckInAppointment, canMarkAppointmentArrived } from "@medora/shared";

describe("MEDUI.D4C.3 appointment status transitions", () => {
  it("ARRIVED and CHECKED_IN remain distinct", () => {
    expect(canMarkAppointmentArrived("SCHEDULED")).toBe(true);
    expect(canMarkAppointmentArrived("ARRIVED")).toBe(false);
    expect(canCheckInAppointment("SCHEDULED")).toBe(true);
    expect(canCheckInAppointment("ARRIVED")).toBe(true);
    expect(canCheckInAppointment("CHECKED_IN")).toBe(false);
    expect(canCheckInAppointment("NO_SHOW")).toBe(false);
  });
});
