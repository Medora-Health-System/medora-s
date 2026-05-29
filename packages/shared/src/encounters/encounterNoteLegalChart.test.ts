import { describe, expect, it } from "vitest";
import {
  ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS,
  FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS,
  assertEncounterNoteAuditMetadataSafe,
  buildEncounterNoteAuditMetadata,
} from "./encounterNoteTypes.js";

describe("encounterNote legal chart audit (MEDNOTE.1A)", () => {
  it("builds allowlisted audit metadata only", () => {
    const meta = buildEncounterNoteAuditMetadata({
      encounterId: "e1",
      patientId: "p1",
      noteId: "n1",
      noteType: "NURSING",
      authorUserId: "u1",
      authorRole: "RN",
      bodyLength: 42,
    });
    expect(Object.keys(meta).sort()).toEqual(
      ["authorRole", "authorUserId", "bodyLength", "encounterId", "noteId", "noteType", "patientId"].sort()
    );
    assertEncounterNoteAuditMetadataSafe(meta as Record<string, unknown>);
  });

  it("builds MEDNOTE.2 governance audit metadata", () => {
    const meta = buildEncounterNoteAuditMetadata({
      encounterId: "e1",
      patientId: "p1",
      noteId: "n2",
      amendedFromNoteId: "n1",
      amendedByUserId: "u1",
      reasonCode: "Correction",
      isAmendment: true,
    });
    for (const key of Object.keys(meta)) {
      expect(ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS).toContain(key);
    }
    assertEncounterNoteAuditMetadataSafe(meta as Record<string, unknown>);
  });

  it("rejects forbidden PHI keys in audit metadata", () => {
    for (const forbidden of FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS) {
      expect(() =>
        assertEncounterNoteAuditMetadataSafe({
          encounterId: "e1",
          patientId: "p1",
          noteId: "n1",
          noteType: "NURSING",
          authorUserId: "u1",
          authorRole: "RN",
          bodyLength: 10,
          [forbidden]: "must not appear",
        })
      ).toThrow();
    }
  });

  it("rejects unexpected audit keys", () => {
    expect(() =>
      assertEncounterNoteAuditMetadataSafe({
        encounterId: "e1",
        patientId: "p1",
        noteId: "n1",
        noteType: "NURSING",
        authorUserId: "u1",
        authorRole: "RN",
        bodyLength: 10,
        extraField: true,
      })
    ).toThrow(/Unexpected encounter note audit key/);
  });
});
