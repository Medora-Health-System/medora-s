import { describe, expect, it } from "vitest";
import {
  isStableAuthErrorCode,
  messageForAuthErrorCode,
  pickAuthErrorCodeFromResponse,
  pickAuthErrorCodeOrLegacyMessage,
} from "./authApiErrorCode";

function fakeT(key: string): string {
  const map: Record<string, string> = {
    "auth.errors.MFA_INVALID_CODE": "EN invalid",
    "auth.mfa.errorInvalid": "EN fallback",
  };
  return map[key] ?? key;
}

describe("authApiErrorCode", () => {
  it("detects stable machine codes", () => {
    expect(isStableAuthErrorCode("MFA_INVALID_CODE")).toBe(true);
    expect(isStableAuthErrorCode("bad")).toBe(false);
    expect(isStableAuthErrorCode("mfa_lowercase")).toBe(false);
  });

  it("pickAuthErrorCodeFromResponse prefers errorCode", () => {
    expect(pickAuthErrorCodeFromResponse({ errorCode: "MFA_GRANT_INVALID", error: "noise" })).toBe(
      "MFA_GRANT_INVALID"
    );
  });

  it("pickAuthErrorCodeOrLegacyMessage returns legacy when no code", () => {
    expect(pickAuthErrorCodeOrLegacyMessage({ error: "Some old text" })).toEqual({
      code: null,
      legacyMessage: "Some old text",
    });
  });

  it("messageForAuthErrorCode maps known keys", () => {
    expect(messageForAuthErrorCode(fakeT, "MFA_INVALID_CODE", "auth.mfa.errorInvalid")).toBe("EN invalid");
  });

  it("messageForAuthErrorCode falls back when code unknown", () => {
    expect(messageForAuthErrorCode(fakeT, "UNKNOWN_XYZ", "auth.mfa.errorInvalid")).toBe("EN fallback");
  });
});
