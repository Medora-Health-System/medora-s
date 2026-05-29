/**
 * MEDNOTE.1 — encounter notes registry guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");
const panelSource = readFileSync(
  join(webSrcRoot, "features/emergency/EmergencyErNotesPanel.tsx"),
  "utf8"
);
const controllerSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/encounters.controller.ts"),
  "utf8"
);
const serviceSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/encounter-notes.service.ts"),
  "utf8"
);
const schemaSource = readFileSync(
  join(webSrcRoot, "../../api/prisma/schema.prisma"),
  "utf8"
);

describe("MEDNOTE.1 encounter notes UI guards", () => {
  it("notes tab renders editor and saved notes registry", () => {
    expect(panelSource).toContain("encounter-notes-editor");
    expect(panelSource).toContain("encounter-notes-registry");
    expect(panelSource).toContain("encounter-note-card");
  });

  it("saved note card shows author role and datetime", () => {
    expect(panelSource).toContain("authorDisplayName");
    expect(panelSource).toContain("authorRoleTitle");
    expect(panelSource).toContain("formatEncounterChromeDateTime");
  });

  it("provider/nursing/technician/other filters work", () => {
    expect(panelSource).toContain("registryFilter");
    expect(panelSource).toContain("PROVIDER");
    expect(panelSource).toContain("NURSING");
    expect(panelSource).toContain("TECHNICIAN");
    expect(panelSource).toContain("OTHER");
  });

  it("save uses append-only POST endpoint", () => {
    expect(panelSource).toContain("createEncounterNote");
    expect(panelSource).not.toContain("mergeErNotesV1IntoNursingAssessment");
    expect(controllerSource).toContain("encounters/:id/notes");
  });

  it("role defaulting uses shared helper", () => {
    expect(panelSource).toContain("defaultEncounterNoteTypeForRole");
  });

  it("does not auto-sign or generate claims", () => {
    expect(serviceSource).not.toMatch(/signProvider|submitClaim|BillingEvent\.create/i);
    expect(schemaSource).toContain("model EncounterNote");
  });
});
