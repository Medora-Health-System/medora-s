import { describe, expect, it } from "vitest";
import {
  canAmendEncounterNote,
  canCosignEncounterNote,
  canReviewEncounterNotes,
  canVoidEncounterNote,
  defaultRequiresCosignForNoteType,
  encounterNotePendingCosign,
  mapEncounterNoteForLegalChart,
  sortEncounterNotesChronological,
} from "./encounterNoteGovernance.js";

describe("encounterNoteGovernance (MEDNOTE.2)", () => {
  const baseNote = {
    authorUserId: "u1",
    voidedAt: null as string | null,
    voidedByUserId: null,
    voidReasonCode: null,
    isAmendment: false,
    amendedFromNoteId: null,
    amendmentReason: null,
    requiresCosign: false,
    cosignedAt: null as string | null,
    cosignedByUserId: null,
    cosignRoleSnapshot: null,
  };

  it("defaultRequiresCosignForNoteType returns false for MVP types", () => {
    expect(defaultRequiresCosignForNoteType("PROVIDER")).toBe(false);
    expect(defaultRequiresCosignForNoteType("NURSING")).toBe(false);
    expect(defaultRequiresCosignForNoteType("TECHNICIAN")).toBe(false);
    expect(defaultRequiresCosignForNoteType("OTHER")).toBe(false);
  });

  it("canAmendEncounterNote allows author only on non-void non-legacy", () => {
    expect(canAmendEncounterNote({ ...baseNote, legacy: false }, "u1")).toBe(true);
    expect(canAmendEncounterNote({ ...baseNote, legacy: false }, "u2")).toBe(false);
    expect(canAmendEncounterNote({ ...baseNote, voidedAt: "2026-01-01T00:00:00.000Z" }, "u1")).toBe(
      false
    );
    expect(canAmendEncounterNote({ ...baseNote, legacy: true }, "u1")).toBe(false);
  });

  it("canVoidEncounterNote allows reviewers only", () => {
    expect(canVoidEncounterNote(baseNote, ["PROVIDER"])).toBe(true);
    expect(canVoidEncounterNote(baseNote, ["ADMIN"])).toBe(true);
    expect(canVoidEncounterNote(baseNote, ["RN"])).toBe(false);
    expect(
      canVoidEncounterNote({ ...baseNote, voidedAt: "2026-01-01T00:00:00.000Z" }, ["PROVIDER"])
    ).toBe(false);
  });

  it("canCosignEncounterNote requires pending cosign and reviewer role", () => {
    const pending = { ...baseNote, requiresCosign: true };
    expect(canCosignEncounterNote(pending, ["PROVIDER"])).toBe(true);
    expect(canCosignEncounterNote(pending, ["RN"])).toBe(false);
    expect(canCosignEncounterNote({ ...pending, cosignedAt: "2026-01-01T00:00:00.000Z" }, ["PROVIDER"])).toBe(
      false
    );
  });

  it("encounterNotePendingCosign detects pending state", () => {
    expect(encounterNotePendingCosign({ ...baseNote, requiresCosign: true })).toBe(true);
    expect(
      encounterNotePendingCosign({
        ...baseNote,
        requiresCosign: true,
        cosignedAt: "2026-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });

  it("canReviewEncounterNotes", () => {
    expect(canReviewEncounterNotes(["RN", "PROVIDER"])).toBe(true);
    expect(canReviewEncounterNotes(["RN"])).toBe(false);
  });

  it("mapEncounterNoteForLegalChart preserves governance fields", () => {
    const mapped = mapEncounterNoteForLegalChart({
      id: "n1",
      noteType: "NURSING",
      body: "text",
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane",
      authorRoleSnapshot: "RN",
      createdAt: new Date("2026-05-28T08:15:00.000Z"),
      voidedAt: null,
      isAmendment: true,
      amendedFromNoteId: "orig",
      amendmentReason: "Correction",
      requiresCosign: true,
      cosignedAt: null,
    });
    expect(mapped.isAmendment).toBe(true);
    expect(mapped.amendedFromNoteId).toBe("orig");
    expect(mapped.requiresCosign).toBe(true);
  });

  it("sortEncounterNotesChronological orders oldest first", () => {
    const sorted = sortEncounterNotesChronological([
      { createdAt: "2026-05-28T09:00:00.000Z" },
      { createdAt: "2026-05-28T08:00:00.000Z" },
    ]);
    expect(sorted[0]?.createdAt).toBe("2026-05-28T08:00:00.000Z");
  });
});
