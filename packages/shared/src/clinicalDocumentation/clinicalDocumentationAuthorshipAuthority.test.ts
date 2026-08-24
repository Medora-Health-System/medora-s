import { describe, expect, it } from "vitest";
import {
  CARE_PLAN_COMPONENT_NOT_AUTHOR,
  CLINICAL_DOCUMENTATION_NOT_AUTHOR,
  assertSameClinicalAuthor,
  isSameClinicalAuthor,
} from "./clinicalDocumentationAuthorshipAuthority.js";

describe("clinicalDocumentationAuthorshipAuthority (MEDUI.CP.1A)", () => {
  it("allows the original author to modify their own content", () => {
    expect(isSameClinicalAuthor("user-a", "user-a")).toBe(true);
    expect(
      assertSameClinicalAuthor({
        authorUserId: "user-a",
        actorUserId: "user-a",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: true });
  });

  it("denies another clinician with the same discipline/role context", () => {
    expect(isSameClinicalAuthor("user-a", "user-b")).toBe(false);
    expect(
      assertSameClinicalAuthor({
        authorUserId: "user-a",
        actorUserId: "user-b",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: false, code: CARE_PLAN_COMPONENT_NOT_AUTHOR });
  });

  it("denies missing author or actor ids", () => {
    expect(isSameClinicalAuthor(null, "user-a")).toBe(false);
    expect(isSameClinicalAuthor("user-a", "")).toBe(false);
    expect(
      assertSameClinicalAuthor({ authorUserId: "user-a", actorUserId: undefined })
    ).toEqual({ ok: false, code: CLINICAL_DOCUMENTATION_NOT_AUTHOR });
  });
});
