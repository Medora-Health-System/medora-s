import {
  governanceBlockerCodeFromMessage,
  logMarCreateValidationBlocked,
} from "./mar-create-validation-log.util";

describe("mar-create-validation-log.util (M1.7A.8)", () => {
  it("maps pharmacy verification message to blocker code", () => {
    expect(
      governanceBlockerCodeFromMessage(
        "Vérification pharmacie requise avant administration. Attendez la validation pharmacien ou documentez une dérogation motivée."
      )
    ).toBe("PHARMACY_VERIFICATION_REQUIRED");
  });

  it("logMarCreateValidationBlocked does not throw", () => {
    expect(() =>
      logMarCreateValidationBlocked({
        encounterId: "enc-1",
        orderItemId: "oi-1",
        marAction: "administered",
        message: "Vérification pharmacie requise avant administration.",
        governanceBlockerCode: "PHARMACY_VERIFICATION_REQUIRED",
      })
    ).not.toThrow();
  });
});
