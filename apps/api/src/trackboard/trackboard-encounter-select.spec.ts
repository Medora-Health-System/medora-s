import {
  assertTrackboardSelectExcludesD3bFields,
  TRACKBOARD_ACTIVE_ENCOUNTER_SELECT,
  TRACKBOARD_ARCHIVE_ENCOUNTER_SELECT,
  TRACKBOARD_ENCOUNTER_FORBIDDEN_SELECT_KEYS,
} from "./trackboard-encounter-select";

describe("Trackboard explicit select contract (pre-/post-D3B)", () => {
  it("active select excludes D3B hospital episode fields and relations", () => {
    expect(() =>
      assertTrackboardSelectExcludesD3bFields(
        TRACKBOARD_ACTIVE_ENCOUNTER_SELECT as unknown as Record<string, unknown>
      )
    ).not.toThrow();
    for (const key of TRACKBOARD_ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
      expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT).not.toHaveProperty(key);
    }
  });

  it("archive select excludes D3B hospital episode fields and relations", () => {
    expect(() =>
      assertTrackboardSelectExcludesD3bFields(
        TRACKBOARD_ARCHIVE_ENCOUNTER_SELECT as unknown as Record<string, unknown>
      )
    ).not.toThrow();
    for (const key of TRACKBOARD_ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
      expect(TRACKBOARD_ARCHIVE_ENCOUNTER_SELECT).not.toHaveProperty(key);
    }
  });

  it("active select includes facility-scoped and operational Trackboard fields", () => {
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.facilityId).toBe(true);
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.status).toBe(true);
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.roomLabel).toBe(true);
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.patient).toBeTruthy();
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.triage).toBeTruthy();
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.physicianAssigned).toBeTruthy();
    expect(TRACKBOARD_ACTIVE_ENCOUNTER_SELECT.nurseAssigned).toBeTruthy();
  });

  it("assert helper fails closed when D3B key leaks", () => {
    expect(() =>
      assertTrackboardSelectExcludesD3bFields({ hospitalEpisodeId: true })
    ).toThrow(/hospitalEpisodeId/);
  });
});
