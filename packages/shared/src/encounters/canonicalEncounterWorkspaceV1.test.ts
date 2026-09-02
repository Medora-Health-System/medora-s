import { describe, expect, it } from "vitest";
import {
  CanonicalEncounterWorkspaceKind,
  placementWorkspaceMustUsePlacementId,
  resolveCanonicalEncounterWorkspace,
  workspaceRoleFromRoleCodes,
} from "./canonicalEncounterWorkspaceV1.js";

const ED = {
  encounterId: "ed-1",
  encounterType: "EMERGENCY",
  encounterStatus: "OPEN",
};

describe("ED.HOSP.1G.2 canonical encounter workspace resolver", () => {
  it("Placement Queue Observation row → Placement workspace (placementId)", () => {
    const r = resolveCanonicalEncounterWorkspace({
      ...ED,
      placementId: "ipr-obs",
      requestedEncounterType: "OBSERVATION",
      source: "PLACEMENT_QUEUE",
      role: "ADMIN",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.PLACEMENT);
    expect(r.placementId).toBe("ipr-obs");
    expect(placementWorkspaceMustUsePlacementId(r)).toBe(true);
    expect(r.redirectFromLegacy).toBe(false);
  });

  it("Placement Queue Admission row → Placement workspace (placementId)", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "ed-2",
      encounterType: "EMERGENCY",
      encounterStatus: "OPEN",
      placementId: "ipr-ip",
      requestedEncounterType: "INPATIENT",
      source: "PLACEMENT_QUEUE",
      role: "ADMIN",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.PLACEMENT);
    expect(r.placementId).toBe("ipr-ip");
  });

  it("Provider + OPEN ED → new ED workspace (not generic, not placement)", () => {
    const r = resolveCanonicalEncounterWorkspace({
      ...ED,
      placementId: "ipr-obs",
      requestedEncounterType: "OBSERVATION",
      role: "PROVIDER",
      source: "LANDING",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.ED_ACTIVE);
    expect(r.redirectFromLegacy).toBe(true);
  });

  it("RN + OPEN ED → new ED workspace", () => {
    const r = resolveCanonicalEncounterWorkspace({
      ...ED,
      role: "RN",
      source: "LANDING",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.ED_ACTIVE);
  });

  it("Provider + inpatient → inpatient provider workspace", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "ip-1",
      encounterType: "INPATIENT",
      encounterStatus: "OPEN",
      requestedEncounterType: "INPATIENT",
      role: "PROVIDER",
      source: "LANDING",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.INPATIENT_PROVIDER);
    expect(r.redirectFromLegacy).toBe(true);
  });

  it("RN + inpatient → inpatient nursing workspace", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "ip-2",
      encounterType: "INPATIENT",
      encounterStatus: "OPEN",
      requestedEncounterType: "INPATIENT",
      role: "RN",
      source: "LANDING",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.INPATIENT_NURSING);
  });

  it("RN + observation receiving → observation nursing workspace", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "obs-1",
      encounterType: "INPATIENT",
      encounterStatus: "OPEN",
      requestedEncounterType: "OBSERVATION",
      billingClassification: "OBSERVATION",
      role: "RN",
      source: "LANDING",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.OBSERVATION_NURSING);
  });

  it("CLOSED encounter → read-only record (ED archive, not editable active)", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "ed-closed",
      encounterType: "EMERGENCY",
      encounterStatus: "CLOSED",
      role: "PROVIDER",
      source: "PATIENT_CHART",
    });
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.ED_CHART);
    expect(r.kind).not.toBe(CanonicalEncounterWorkspaceKind.ED_ACTIVE);
  });

  it("legacy OPEN ED redirects; clinic/dental stay generic (no loop)", () => {
    const ed = resolveCanonicalEncounterWorkspace({
      ...ED,
      role: "ADMIN",
      source: "LEGACY_URL",
    });
    expect(ed.redirectFromLegacy).toBe(true);
    expect(ed.kind).toBe(CanonicalEncounterWorkspaceKind.ED_ACTIVE);

    const clinic = resolveCanonicalEncounterWorkspace({
      encounterId: "op-1",
      encounterType: "OUTPATIENT",
      encounterStatus: "OPEN",
      role: "PROVIDER",
      source: "LEGACY_URL",
    });
    expect(clinic.kind).toBe(CanonicalEncounterWorkspaceKind.GENERIC);
    expect(clinic.redirectFromLegacy).toBe(false);

    const amb = resolveCanonicalEncounterWorkspace({
      ...ED,
      ambulatoryWorkspace: true,
      source: "LEGACY_URL",
    });
    expect(amb.kind).toBe(CanonicalEncounterWorkspaceKind.GENERIC);
    expect(amb.redirectFromLegacy).toBe(false);
  });

  it("legacy OPEN inpatient redirects to inpatient workspace", () => {
    const r = resolveCanonicalEncounterWorkspace({
      encounterId: "ip-open",
      encounterType: "INPATIENT",
      encounterStatus: "OPEN",
      requestedEncounterType: "INPATIENT",
      role: "PROVIDER",
      source: "LEGACY_URL",
    });
    expect(r.redirectFromLegacy).toBe(true);
    expect(r.kind).toBe(CanonicalEncounterWorkspaceKind.INPATIENT_PROVIDER);
  });

  it("workspaceRoleFromRoleCodes prefers PROVIDER then RN then ADMIN", () => {
    expect(workspaceRoleFromRoleCodes(["ADMIN", "PROVIDER"])).toBe("PROVIDER");
    expect(workspaceRoleFromRoleCodes(["RN"])).toBe("RN");
    expect(workspaceRoleFromRoleCodes(["ADMIN"])).toBe("ADMIN");
  });
});
