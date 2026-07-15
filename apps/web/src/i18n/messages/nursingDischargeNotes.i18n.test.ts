import { describe, expect, it } from "vitest";
import { nursingDischargeNotesEn } from "./nursingDischargeNotes.en";
import { nursingDischargeNotesFr } from "./nursingDischargeNotes.fr";
import {
  NURSING_DISCHARGE_NOTE_PHRASES,
  NURSING_DISCHARGE_NOTE_TEMPLATES,
} from "@/features/emergency/nursingDischargeNoteTemplates";

function leafKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return leafKeys(v, path);
    return [path];
  });
}

describe("nursingDischargeNotes i18n", () => {
  it("mirrors EN/FR leaf keys", () => {
    expect(leafKeys(nursingDischargeNotesEn).sort()).toEqual(leafKeys(nursingDischargeNotesFr).sort());
  });

  it("covers every template and phrase label id", () => {
    for (const tpl of NURSING_DISCHARGE_NOTE_TEMPLATES) {
      expect(
        (nursingDischargeNotesEn.templateLabels as Record<string, string>)[tpl.id]
      ).toBeTruthy();
      expect(
        (nursingDischargeNotesFr.templateLabels as Record<string, string>)[tpl.id]
      ).toBeTruthy();
    }
    for (const ph of NURSING_DISCHARGE_NOTE_PHRASES) {
      expect((nursingDischargeNotesEn.phraseLabels as Record<string, string>)[ph.id]).toBeTruthy();
      expect((nursingDischargeNotesFr.phraseLabels as Record<string, string>)[ph.id]).toBeTruthy();
    }
  });

  it("French labels are not English copies for categories", () => {
    expect(nursingDischargeNotesFr.categories.teaching).not.toBe(
      nursingDischargeNotesEn.categories.teaching
    );
    expect(nursingDischargeNotesFr.clearGenerated).not.toBe(nursingDischargeNotesEn.clearGenerated);
  });
});
