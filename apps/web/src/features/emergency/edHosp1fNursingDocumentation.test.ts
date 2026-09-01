import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edHosp1fNursingDocumentationEn } from "@/i18n/messages/edHosp1fNursingDocumentation.en";
import { edHosp1fNursingDocumentationFr } from "@/i18n/messages/edHosp1fNursingDocumentation.fr";
import { requestedEncounterTypeForOutcomeUi } from "@/features/emergency/edHosp1bDispositionOutcomeMapping";
import {
  edNursingAmaIsDistinctFromElopement,
  edNursingHandoffApplies,
  shouldMountAdmissionOrderComposer,
  shouldMountObservationOrderComposer,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, "src", relativePath), "utf8");
}

describe("ED.HOSP.1F nursing documentation + handoff UI", () => {
  const composer = readSrc("features/emergency/EdNursingDocumentationComposer.tsx");
  const nursing = readSrc("features/emergency/AdaptiveDispositionNursingSection.tsx");
  const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const schema = readFileSync(join(webRoot, "../../apps/api/prisma/schema.prisma"), "utf8");
  const controller = readFileSync(join(webRoot, "../../apps/api/src/encounters/encounters.controller.ts"), "utf8");

  it("reuses EncounterNote + erHandoffV1 and does not add Prisma models", () => {
    expect(composer).toContain("createEncounterNote");
    expect(composer).toContain("noteType: \"NURSING\"");
    expect(composer).toContain("mergeErHandoffV1IntoNursingAssessment");
    expect(composer).toContain("voidEncounterNote");
    expect(composer).toContain("amendEncounterNote");
    expect(composer).not.toContain("edNursingNoteV2");
    expect(composer).not.toContain("handoffNoteJson");
    expect(schema).not.toContain("model EdNursingNote");
    expect(schema).toContain("model EncounterNote");
  });

  it("exposes Start Handoff, templates, free note, event time, and external receiving nurse", () => {
    expect(composer).toContain("ed-nursing-start-handoff");
    expect(composer).toContain("ed-nursing-template-select");
    expect(composer).toContain("ed-nursing-free-note");
    expect(composer).toContain("ed-nursing-event-time");
    expect(composer).toContain("ed-nursing-external-receiving");
    expect(composer).toContain("ClinicalUserRoleAutocomplete");
    expect(composer).toContain("ed-nursing-cancel-note");
    expect(composer).toContain("ed-nursing-canceled-bar");
    expect(composer).not.toContain("/admin/users");
  });

  it("handoff is actionable in structured nursing execution", () => {
    expect(nursing).toContain("EdNursingDocumentationComposer");
    expect(nursing).toContain("HANDOFF_REVIEWED");
    expect(nursing).not.toContain("nursing-directory-gap");
  });

  it("reuses structured/internal receiving nurse and keeps external free-text", () => {
    expect(composer).toContain("hydrateHandoffReceiverFromCanonical");
    expect(composer).toContain("decodeReceivingNurse");
    expect(composer).toContain("ed-nursing-internal-receiving-search");
    expect(composer).toContain("ed-nursing-external-receiving");
    expect(composer).toContain('overflow: "visible"');
    expect(composer).not.toContain("/admin/users");
  });

  it("workspace mounts composer on nursing and notes", () => {
    expect(workspace).toContain("EdNursingDocumentationComposer");
    expect(workspace).toContain('activeSection === "nursing"');
    expect(workspace).toContain('activeSection === "notes"');
    expect(workspace).not.toContain("emergencyDisposition.nursingExecutionTitle");
  });

  it("author RN may void own notes via existing void route", () => {
    expect(controller).toContain("encounters/:id/notes/:noteId/void");
    expect(controller).toMatch(/void[\s\S]{0,250}RoleCode\.RN/);
    expect(controller).toMatch(
      /admission\/decision"\)[\s\S]{0,120}@RequireRoles\(RoleCode\.PROVIDER, RoleCode\.ADMIN\)/
    );
    expect(controller).toContain("roster/clinical-users");
  });

  it("EN/FR keys match; AMA remains distinct from Elopement", () => {
    expect(Object.keys(edHosp1fNursingDocumentationEn.templates).sort()).toEqual(
      Object.keys(edHosp1fNursingDocumentationFr.templates).sort()
    );
    expect(Object.keys(edHosp1fNursingDocumentationEn.chips).sort()).toEqual(
      Object.keys(edHosp1fNursingDocumentationFr.chips).sort()
    );
    expect(edHosp1fNursingDocumentationEn.templates.AMA_STANDARD).not.toBe(
      edHosp1fNursingDocumentationEn.templates.ELOPEMENT_STANDARD
    );
    expect(edHosp1fNursingDocumentationFr.templates.AMA_STANDARD).not.toBe(
      edHosp1fNursingDocumentationFr.templates.ELOPEMENT_STANDARD
    );
    expect(edNursingAmaIsDistinctFromElopement()).toBe(true);
    expect(edNursingHandoffApplies("AMA")).toBe(false);
  });

  it("#189/#191 regressions: Admission INPATIENT, Observation OBSERVATION, no Prisma", () => {
    expect(shouldMountAdmissionOrderComposer("ADMISSION")).toBe(true);
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(requestedEncounterTypeForOutcomeUi("OBSERVATION")).toBe("OBSERVATION");
    expect(requestedEncounterTypeForOutcomeUi("ADMISSION")).toBe("INPATIENT");
    expect(nursing).toContain("mergeAdaptiveEdNursingIntoNursingAssessment");
  });
});
