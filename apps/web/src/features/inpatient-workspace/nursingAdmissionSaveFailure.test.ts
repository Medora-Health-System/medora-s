import { describe, expect, it } from "vitest";
import {
  classifyNursingAdmissionSaveFailure,
  nursingAdmissionSaveFailureMessageKey,
} from "./nursingAdmissionSaveFailure";

describe("MEDUI.INP.2B.2B nursing admission save failure classification", () => {
  it("classifies network failures separately from validation", () => {
    expect(classifyNursingAdmissionSaveFailure(new TypeError("Failed to fetch")).kind).toBe("NETWORK");
    expect(nursingAdmissionSaveFailureMessageKey("NETWORK")).toBe("inpatientAdmissionInp2b2a.saveNetwork");
  });

  it("classifies AUTHORITATIVE_DOMAIN_RECORD_REQUIRED without exposing the code in the message key", () => {
    const err = Object.assign(new Error("Request failed"), {
      status: 400,
      errorCode: "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED",
      body: { message: { code: "AUTHORITATIVE_DOMAIN_RECORD_REQUIRED", sectionId: "PAIN" } },
    });
    const classified = classifyNursingAdmissionSaveFailure(err);
    expect(classified.kind).toBe("AUTHORITATIVE_DOMAIN");
    expect(nursingAdmissionSaveFailureMessageKey(classified.kind)).toBe(
      "inpatientAdmissionInp2b2a.saveDomainLink"
    );
    expect(nursingAdmissionSaveFailureMessageKey(classified.kind)).not.toMatch(/AUTHORITATIVE/);
  });

  it("classifies section validation and missing preload confirm", () => {
    expect(
      classifyNursingAdmissionSaveFailure(
        Object.assign(new Error("bad"), {
          status: 400,
          errorCode: "SECTION_VALIDATION_FAILED",
        })
      ).kind
    ).toBe("VALIDATION");
    expect(
      classifyNursingAdmissionSaveFailure(
        Object.assign(new Error("missing"), {
          status: 400,
          errorCode: "PRELOAD_ITEM_NOT_FOUND",
        })
      ).kind
    ).toBe("PRELOAD");
  });

  it("keeps 409 as conflict", () => {
    expect(
      classifyNursingAdmissionSaveFailure(
        Object.assign(new Error("conflict"), { status: 409, errorCode: "EXPECTED_VERSION_CONFLICT" })
      ).kind
    ).toBe("CONFLICT");
  });
});
