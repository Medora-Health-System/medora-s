import { describe, expect, it } from "vitest";
import {
  isMarSafetyGovernanceErrorCode,
  marSafetyGovernanceErrorMessageForCode,
  resolveMarSafetyGovernanceErrorMessage,
} from "./marSafetyGovernanceErrorMessage";

describe("marSafetyGovernanceErrorMessage (K.10B.9A)", () => {
  const tFr = (key: string) => {
    const map: Record<string, string> = {
      "marShiftTimeline.safetyGovernanceErrors.MAR_EARLY_ADMIN_REASON_REQUIRED":
        "Une administration anticipée nécessite un motif.",
    };
    return map[key] ?? key;
  };

  it("recognizes MAR safety governance error codes", () => {
    expect(isMarSafetyGovernanceErrorCode("MAR_EARLY_ADMIN_REASON_REQUIRED")).toBe(true);
    expect(isMarSafetyGovernanceErrorCode("NO_ACTIVE_INFUSION")).toBe(false);
  });

  it("resolveMarSafetyGovernanceErrorMessage maps structured API body", () => {
    const err = {
      body: {
        statusCode: 400,
        code: "MAR_LATE_ADMIN_REASON_REQUIRED",
        errorCode: "MAR_LATE_ADMIN_REASON_REQUIRED",
        message: "Late administration requires a reason.",
      },
    };
    expect(resolveMarSafetyGovernanceErrorMessage(err, "en")).toBe(
      "Late administration requires a reason."
    );
    expect(resolveMarSafetyGovernanceErrorMessage(err, "fr")).toBe(
      "Une administration tardive nécessite un motif."
    );
  });

  it("marSafetyGovernanceErrorMessageForCode uses i18n when provided", () => {
    expect(
      marSafetyGovernanceErrorMessageForCode("MAR_EARLY_ADMIN_REASON_REQUIRED", "fr", tFr)
    ).toBe("Une administration anticipée nécessite un motif.");
  });
});
