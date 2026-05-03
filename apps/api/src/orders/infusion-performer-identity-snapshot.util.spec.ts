import { buildInfusionPerformerIdentitySnapshot, resolvePerformedByDisplayNameFromOrderEvent } from "./infusion-performer-identity-snapshot.util";

describe("buildInfusionPerformerIdentitySnapshot", () => {
  it("includes display name, sorted role pipe, title from primary role name, and fixed action time", () => {
    const snap = buildInfusionPerformerIdentitySnapshot({
      userId: "u1",
      firstName: "Anne",
      lastName: "Dupont",
      roleCodesPipe: "ADMIN|RN",
      primaryRoleTitle: "Infirmier(ère) diplômé(e)",
      actionRecordedAt: "2026-05-02T12:00:00.000Z",
    });
    expect(snap).toEqual({
      performedByUserId: "u1",
      performedByDisplayName: "Anne Dupont",
      performedByTitle: "Infirmier(ère) diplômé(e)",
      performedByRoleSnapshot: "ADMIN|RN",
      actionRecordedAt: "2026-05-02T12:00:00.000Z",
    });
  });

  it("falls back performedByTitle to first role code when no primary role name", () => {
    const snap = buildInfusionPerformerIdentitySnapshot({
      userId: "u2",
      firstName: "Bob",
      lastName: "Martin",
      roleCodesPipe: "PROVIDER|RN",
      actionRecordedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(snap.performedByTitle).toBe("PROVIDER");
  });

  it("omits display name when both names empty", () => {
    const snap = buildInfusionPerformerIdentitySnapshot({
      userId: "u3",
      firstName: "",
      lastName: "",
      roleCodesPipe: "UNKNOWN",
      actionRecordedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(snap.performedByDisplayName).toBeUndefined();
    expect(snap.performedByTitle).toBeUndefined();
  });
});

describe("resolvePerformedByDisplayNameFromOrderEvent", () => {
  it("prefers metadata snapshot over join fallback", () => {
    expect(
      resolvePerformedByDisplayNameFromOrderEvent(
        { performedByDisplayName: "Snapshot Name" },
        "Join Name"
      )
    ).toBe("Snapshot Name");
  });

  it("uses join fallback when metadata missing", () => {
    expect(resolvePerformedByDisplayNameFromOrderEvent(null, "Join Name")).toBe("Join Name");
  });
});
