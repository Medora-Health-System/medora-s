import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTrackboardRoomMutationPatch } from "@/lib/trackboardMutationPatch";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edRoomMutationInstantUpdate (MEDUI.ED.BEDBOARD.ROOM_MUTATION.1)", () => {
  const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
  const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
  const hospital = readSrc("features/hospitalization/HospitalizationBoardView.tsx");

  it("1 — save room patches trackboard immediately via applyTrackboardRoomMutationPatch", () => {
    expect(trackboard).toContain("applyTrackboardRoomMutationPatch");
    expect(trackboard).toContain("pendingRoomPatchesRef");
  });

  it("2 — save room patches bed board immediately via mergeBedBoardRoomUpdate", () => {
    expect(trackboard).toContain("mergeBedBoardRoomUpdate");
    expect(trackboard).toContain("applyBedBoardStatusPatch");
  });

  it("3 — modal closes after successful save", () => {
    expect(modal).toContain("await onSaved(res)");
    expect(modal).toContain("onClose()");
  });

  it("4 — save button disabled while pending", () => {
    expect(modal).toContain("disabled={saving}");
    expect(modal).toContain("setSaving(true)");
  });

  it("5 — duplicate save blocked while saving flag is set", () => {
    expect(modal).toContain("disabled={saving}");
    expect(modal).toMatch(/performSave[\s\S]{0,400}setSaving\(true\)/);
  });

  it("6 — clear room uses performSave with roomOverride null", () => {
    expect(modal).toContain("performSave({ roomOverride: null })");
  });

  it("7 — trackboard dispatches cross-surface room refresh event", () => {
    expect(trackboard).toContain("dispatchEncounterRoomAssignmentRefresh");
    expect(trackboard).toContain("MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH");
  });

  it("8 — hospital board applies same instant room patch helpers", () => {
    expect(hospital).toContain("applyTrackboardRoomMutationPatch");
    expect(hospital).toContain("rebuildFacilityBedBoardUnitsFromEncounters");
  });

  it("9 — mutation response used before background refetch", () => {
    expect(modal).toContain("const res = await updateEncounterRoomAssignment");
    expect(modal).toContain("await onSaved(res)");
    expect(trackboard).not.toContain("await loadEncounters");
  });

  it("10 — no hardcoded 10-second UI delay for room save", () => {
    expect(modal).not.toContain("setTimeout");
    expect(modal).not.toContain("10000");
  });

  it("unit patch helper updates governed room immediately", () => {
    const next = applyTrackboardRoomMutationPatch(
      [{ id: "enc-1", roomLabel: "1", governedRoomDisplay: "ED-1" }],
      {
        id: "enc-1",
        roomLabel: "5",
        governedRoomDisplay: "ED-5",
        governedRoomUnit: "ED",
        governedRoomHasAssignment: true,
      }
    );
    expect(next[0]?.governedRoomDisplay).toBe("ED-5");
  });
});
