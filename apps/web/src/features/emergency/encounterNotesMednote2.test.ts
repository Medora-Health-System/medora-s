import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

describe("encounterNotes MEDNOTE.2 governance UI", () => {
  const panelSource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErNotesPanel.tsx"),
    "utf8"
  );
  const apiSource = readFileSync(join(webSrcRoot, "lib/encounterNotesApi.ts"), "utf8");
  const schemaSource = readFileSync(
    join(webSrcRoot, "../../api/prisma/schema.prisma"),
    "utf8"
  );

  it("panel exposes amend/void/cosign actions without edit button", () => {
    expect(panelSource).toContain("encounter-note-amend-btn");
    expect(panelSource).toContain("encounter-note-void-btn");
    expect(panelSource).toContain("encounter-note-cosign-btn");
    expect(panelSource).not.toContain("actionEdit");
    expect(panelSource).not.toMatch(/>\s*Edit\s*</);
  });

  it("panel shows governance badges", () => {
    expect(panelSource).toContain("encounterNotes.badgeAmendment");
    expect(panelSource).toContain("encounterNotes.badgeVoided");
    expect(panelSource).toContain("encounterNotes.badgeCosigned");
    expect(panelSource).toContain("encounterNotes.badgePendingCosign");
  });

  it("api client has governance endpoints", () => {
    expect(apiSource).toContain("amendEncounterNote");
    expect(apiSource).toContain("/amend");
    expect(apiSource).toContain("voidEncounterNote");
    expect(apiSource).toContain("/void");
    expect(apiSource).toContain("cosignEncounterNote");
    expect(apiSource).toContain("/cosign");
  });

  it("schema has MEDNOTE.2 fields", () => {
    expect(schemaSource).toContain("amendedFromNoteId");
    expect(schemaSource).toContain("voidReasonCode");
    expect(schemaSource).toContain("requiresCosign");
    expect(schemaSource).toContain("ENCOUNTER_NOTE_AMENDED");
    expect(schemaSource).toContain("ENCOUNTER_NOTE_VOIDED");
    expect(schemaSource).toContain("ENCOUNTER_NOTE_COSIGNED");
  });
});
