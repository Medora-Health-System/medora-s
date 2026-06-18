import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isEncounterAssignedToCurrentUser,
  resolveMyPatientsEncounters,
  resolveNurseAssignedUserId,
  resolvePhysicianAssignedUserId,
  type EdMyPatientsEncounter,
  type EdMyPatientsFilterContext,
} from "./edMyPatientsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function encounter(partial: Partial<EdMyPatientsEncounter> & { id: string }): EdMyPatientsEncounter {
  return partial;
}

function ctx(partial: Partial<EdMyPatientsFilterContext>): EdMyPatientsFilterContext {
  return {
    currentUserId: "user-1",
    roles: ["RN"],
    ...partial,
  };
}

describe("edMyPatientsFilter (MEDUI.ED.LIFECYCLE.4)", () => {
  it("assigned nurse appears in My Patients for RN", () => {
    const enc = encounter({
      id: "e1",
      nurseAssignedUserId: "user-1",
    });
    expect(isEncounterAssignedToCurrentUser(enc, ctx({ roles: ["RN"] }))).toBe(true);
    expect(resolveMyPatientsEncounters([enc], ctx({ roles: ["RN"] }))).toHaveLength(1);
  });

  it("assigned provider appears in My Patients for PROVIDER", () => {
    const enc = encounter({
      id: "e2",
      physicianAssignedUserId: "user-1",
    });
    expect(isEncounterAssignedToCurrentUser(enc, ctx({ roles: ["PROVIDER"] }))).toBe(true);
    expect(resolveMyPatientsEncounters([enc], ctx({ roles: ["PROVIDER"] }))).toHaveLength(1);
  });

  it("non-assigned encounters are hidden from My Patients", () => {
    const rows = [
      encounter({ id: "e1", nurseAssignedUserId: "other" }),
      encounter({ id: "e2", physicianAssignedUserId: "other" }),
      encounter({ id: "e3" }),
    ];
    expect(resolveMyPatientsEncounters(rows, ctx({ roles: ["RN", "PROVIDER"] }))).toEqual([]);
  });

  it("trackboard emergencyOnly list is not narrowed by My Patients filter", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const emergencyOnlyBlock = trackboard.slice(
      trackboard.indexOf("const emergencyOnly"),
      trackboard.indexOf("const activeTrackboardBase")
    );
    expect(emergencyOnlyBlock).not.toContain("resolveMyActivePatientsEncounters");
    expect(emergencyOnlyBlock).not.toContain("myPatientsBase");
    expect(trackboard).toContain("encounterListRows");
    expect(trackboard).toContain('boardViewMode === "incompleteCharts"');
  });

  it("search applies independently to My Patients without changing trackboard rows", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("const filtered = useMemo");
    expect(trackboard).toContain("const myPatientsFiltered = useMemo");
    expect(trackboard).not.toMatch(
      /const filtered[\s\S]{0,300}resolveMyPatientsEncounters/
    );
  });

  it("empty state uses dedicated My Patients i18n key", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('data-testid="ed-my-patients-empty"');
    expect(trackboard).toContain("edLifecycle.myPatients.empty");
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain(
      'empty: "No encounters are currently assigned to you."'
    );
    expect(fr).toContain(
      "empty: \"Aucune rencontre ne vous est actuellement assignée.\""
    );
  });

  it("My Patients tab count uses assignment-filtered base length", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('view === "myPatients" && myPatientsBase.length > 0');
    expect(trackboard).toContain("${base} (${myPatientsBase.length})");
  });

  it("admin sees encounters assigned to them in either nurse or provider slot", () => {
    const nurseAssigned = encounter({ id: "e1", nurseAssignedUserId: "admin-1" });
    const providerAssigned = encounter({
      id: "e2",
      physicianAssigned: { id: "admin-1" },
    });
    const other = encounter({ id: "e3", nurseAssignedUserId: "other" });
    const adminCtx = ctx({ currentUserId: "admin-1", roles: ["ADMIN"] });
    expect(resolveMyPatientsEncounters([nurseAssigned, providerAssigned, other], adminCtx).map((r) => r.id)).toEqual([
      "e1",
      "e2",
    ]);
  });

  it("assignment filter uses lifecycle read model for active patients", () => {
    const filterSrc = readSrc("features/emergency/edMyPatientsFilter.ts");
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(filterSrc).toContain("resolveEdEncounterLifecycleState");
    expect(filterSrc).toContain("resolveMyActivePatientsEncounters");
    expect(trackboard).toContain("resolveMyActivePatientsEncounters");
  });

  it("no API changes introduced for My Patients workspace", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    const filterSrc = readSrc("features/emergency/edMyPatientsFilter.ts");
    expect(filterSrc).not.toContain("apiFetch");
    expect(filterSrc).not.toContain("fetchOpenEncounters");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("myPatients");
    expect(trackboard).toContain("fetchOpenEncounters");
  });

  it("resolves assignment ids from relation fallbacks", () => {
    const enc = encounter({
      id: "e1",
      nurseAssigned: { id: "rn-9" },
      physicianAssigned: { id: "md-9" },
    });
    expect(resolveNurseAssignedUserId(enc)).toBe("rn-9");
    expect(resolvePhysicianAssignedUserId(enc)).toBe("md-9");
  });
});
