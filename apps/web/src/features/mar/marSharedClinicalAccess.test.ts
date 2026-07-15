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
});
