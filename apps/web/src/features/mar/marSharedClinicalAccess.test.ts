import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("marSharedClinicalAccess (MEDUI.MAR.SHARED_CLINICAL_ACCESS)", () => {
  const marTab = readSrc("components/encounters/MedicationAdministrationTab.tsx");
  const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
  const api = readSrc("lib/marShiftTimelineApi.ts");
  const en = readSrc("i18n/messages/en.ts");
  const fr = readSrc("i18n/messages/fr.ts");

  it("encounter MAR tab does not pass assignedToUserId as a visibility gate", () => {
    expect(marTab).toContain("<FacilityMarShiftTimeline");
    expect(marTab).not.toContain("assignedToUserId={currentUserId}");
    expect(marTab).toContain("viewerUserId={currentUserId}");
  });

  it("timeline fetch drops assignedToUserId when encounterId is set", () => {
    expect(timeline).toContain(
      "assignedToUserId: encounterId?.trim() ? undefined : assignedToUserId"
    );
    expect(api).toContain("!query.encounterId?.trim() && query.assignedToUserId?.trim()");
  });

  it("header shows Assigned nurse with strong name styling", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-assigned-nurse-name"');
    expect(timeline).toContain("fontWeight: 700");
    expect(en).toContain('assignedNurseLabel: "Assigned nurse"');
    expect(fr).toContain('assignedNurseLabel: "Infirmier(ère) responsable"');
  });

  it("keeps optional Viewing as / Session de copy for coworker clarity", () => {
    expect(en).toContain('viewingAsLine: "Viewing as: {name}"');
    expect(fr).toContain('viewingAsLine: "Session de : {name}"');
  });
});
