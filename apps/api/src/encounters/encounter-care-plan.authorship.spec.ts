import {
  assertSameClinicalAuthor,
  CARE_PLAN_COMPONENT_NOT_AUTHOR,
} from "@medora/shared";

describe("MEDUI.CP.1A care plan component authorship", () => {
  it("allows the original author to correct their component", () => {
    expect(
      assertSameClinicalAuthor({
        authorUserId: "rn-a",
        actorUserId: "rn-a",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: true });
  });

  it("denies RN B correcting RN A component", () => {
    expect(
      assertSameClinicalAuthor({
        authorUserId: "rn-a",
        actorUserId: "rn-b",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: false, code: CARE_PLAN_COMPONENT_NOT_AUTHOR });
  });

  it("denies provider correcting RN component", () => {
    expect(
      assertSameClinicalAuthor({
        authorUserId: "rn-a",
        actorUserId: "provider-a",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: false, code: CARE_PLAN_COMPONENT_NOT_AUTHOR });
  });

  it("denies provider B correcting provider A component", () => {
    expect(
      assertSameClinicalAuthor({
        authorUserId: "provider-a",
        actorUserId: "provider-b",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: false, code: CARE_PLAN_COMPONENT_NOT_AUTHOR });
  });

  it("admin role alone does not satisfy authorship", () => {
    expect(
      assertSameClinicalAuthor({
        authorUserId: "rn-a",
        actorUserId: "admin-user",
        code: CARE_PLAN_COMPONENT_NOT_AUTHOR,
      })
    ).toEqual({ ok: false, code: CARE_PLAN_COMPONENT_NOT_AUTHOR });
  });
});
