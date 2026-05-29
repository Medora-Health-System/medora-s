import { describe, expect, it } from "vitest";
import {
  defaultEncounterNoteTypeForRole,
  encounterNotePreview,
  filterEncounterNotesByType,
} from "./encounterNote.js";
import { legacyErNotesV1DisplayEntries } from "./erNotesV1LegacyRead.js";

describe("encounterNote (MEDNOTE.1)", () => {
  it("defaults note type from role", () => {
    expect(defaultEncounterNoteTypeForRole("PROVIDER")).toBe("PROVIDER");
    expect(defaultEncounterNoteTypeForRole("RN")).toBe("NURSING");
    expect(defaultEncounterNoteTypeForRole("LAB")).toBe("TECHNICIAN");
    expect(defaultEncounterNoteTypeForRole("FRONT_DESK")).toBe("OTHER");
  });

  it("filters notes by type", () => {
    const notes = [
      { noteType: "PROVIDER" as const, id: "1" },
      { noteType: "NURSING" as const, id: "2" },
    ];
    expect(filterEncounterNotesByType(notes, "NURSING")).toHaveLength(1);
    expect(filterEncounterNotesByType(notes, "ALL")).toHaveLength(2);
  });

  it("builds legacy erNotesV1 display entries without migration", () => {
    const entries = legacyErNotesV1DisplayEntries(
      {
        erNotesV1: {
          provider: "12-lead completed",
          categoryLastSaved: {
            provider: { savedAt: "2026-05-28T12:00:00.000Z", savedByDisplayName: "Dr A" },
          },
        },
      },
      "enc-1"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.legacy).toBe(true);
    expect(entries[0]?.noteType).toBe("PROVIDER");
  });

  it("preview truncates long body", () => {
    const long = "x".repeat(200);
    expect(encounterNotePreview(long, 50).endsWith("…")).toBe(true);
  });
});
