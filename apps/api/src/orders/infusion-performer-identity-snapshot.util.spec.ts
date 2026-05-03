import {
  buildInfusionPerformerIdentitySnapshot,
  buildInfusionPerformerIdentitySnapshotFromDbParts,
  resolvePerformedByDisplayNameFromOrderEvent,
} from "./infusion-performer-identity-snapshot.util";

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

describe("buildInfusionPerformerIdentitySnapshotFromDbParts", () => {
  const fixedAt = "2026-05-02T12:00:00.000Z";

  it("uses user + DB roles when present (title from lexicographically first role)", () => {
    const snap = buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId: "u1",
      user: { firstName: "Anne", lastName: "Dupont" },
      roleRows: [
        { code: "RN", name: "Infirmier(ère)" },
        { code: "ADMIN", name: null },
      ],
      actionRecordedAt: fixedAt,
    });
    expect(snap.performedByUserId).toBe("u1");
    expect(snap.performedByDisplayName).toBe("Anne Dupont");
    expect(snap.performedByRoleSnapshot).toBe("ADMIN|RN");
    expect(snap.performedByTitle).toBe("ADMIN");
    expect(snap.actionRecordedAt).toBe(fixedAt);
  });

  it("uses Role.name for title when that role sorts first", () => {
    const snap = buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId: "u1b",
      user: { firstName: "Anne", lastName: "Dupont" },
      roleRows: [{ code: "RN", name: "Infirmier(ère) diplômé(e)" }],
      actionRecordedAt: fixedAt,
    });
    expect(snap.performedByRoleSnapshot).toBe("RN");
    expect(snap.performedByTitle).toBe("Infirmier(ère) diplômé(e)");
  });

  it("falls back to requestor role codes when DB role rows empty", () => {
    const snap = buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId: "u2",
      user: { firstName: "Bob", lastName: "Martin" },
      roleRows: [],
      requestorRoleCodesFallback: ["RN", "PROVIDER"],
      actionRecordedAt: fixedAt,
    });
    expect(snap.performedByRoleSnapshot).toBe("PROVIDER|RN");
    expect(snap.performedByDisplayName).toBe("Bob Martin");
  });

  it("omits display name when user null (still has userId + roles)", () => {
    const snap = buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId: "ghost",
      user: null,
      roleRows: [{ code: "RN", name: null }],
      actionRecordedAt: fixedAt,
    });
    expect(snap.performedByDisplayName).toBeUndefined();
    expect(snap.performedByRoleSnapshot).toBe("RN");
    expect(snap.performedByTitle).toBe("RN");
  });

  it("uses UNKNOWN when no DB roles and no fallback", () => {
    const snap = buildInfusionPerformerIdentitySnapshotFromDbParts({
      userId: "u4",
      user: { firstName: null, lastName: null },
      roleRows: [],
      actionRecordedAt: fixedAt,
    });
    expect(snap.performedByRoleSnapshot).toBe("UNKNOWN");
    expect(snap.performedByTitle).toBeUndefined();
  });

  it("does not throw when roleRows empty and fallback empty", () => {
    expect(() =>
      buildInfusionPerformerIdentitySnapshotFromDbParts({
        userId: "u5",
        user: { firstName: "X", lastName: "Y" },
        roleRows: [],
        requestorRoleCodesFallback: [],
        actionRecordedAt: fixedAt,
      })
    ).not.toThrow();
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
