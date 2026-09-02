import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CanonicalEncounterWorkspaceKind,
  resolveCanonicalEncounterWorkspace,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  canonicalEncounterWorkspaceHref,
  legacyGenericEncounterRedirectHref,
} from "@/features/encounters/canonicalEncounterWorkspaceHref";
import { hospitalPlacementWorkspacePath } from "./hospitalCarePaths";
import { filterHospitalUnitsForPlacementDestination } from "./hospitalCareUnitsApi";

const root = join(__dirname);
const webAppRoot = join(__dirname, "../../../app/app");

describe("ED.HOSP.1G.2 placement workspace + routing", () => {
  it("Placement Queue Observation and Admission rows open placementId workspace", () => {
    const queue = readFileSync(join(root, "HospitalCarePlacementQueueView.tsx"), "utf8");
    expect(queue).toContain("hospitalPlacementWorkspacePath(row.id)");
    expect(queue).not.toContain("row.originatingEncounterId");
    expect(queue).not.toContain("NEXT_PUBLIC");
    expect(queue).not.toContain("BED-1");
    expect(hospitalPlacementWorkspacePath("ipr-1")).toBe(
      "/app/hospitalisation/placement-queue/ipr-1"
    );

    const obs = resolveCanonicalEncounterWorkspace({
      encounterId: "ed-1",
      encounterType: "EMERGENCY",
      encounterStatus: "OPEN",
      placementId: "ipr-obs",
      requestedEncounterType: "OBSERVATION",
      source: "PLACEMENT_QUEUE",
      role: "ADMIN",
    });
    expect(obs.kind).toBe(CanonicalEncounterWorkspaceKind.PLACEMENT);
    expect(canonicalEncounterWorkspaceHref({
      encounterId: "ed-1",
      placementId: "ipr-obs",
      source: "PLACEMENT_QUEUE",
    })).toBe("/app/hospitalisation/placement-queue/ipr-obs");

    const adm = resolveCanonicalEncounterWorkspace({
      encounterId: "ed-2",
      encounterType: "EMERGENCY",
      encounterStatus: "OPEN",
      placementId: "ipr-ip",
      requestedEncounterType: "INPATIENT",
      source: "PLACEMENT_QUEUE",
      role: "ADMIN",
    });
    expect(adm.kind).toBe(CanonicalEncounterWorkspaceKind.PLACEMENT);
    expect(canonicalEncounterWorkspaceHref({
      encounterId: "ed-2",
      placementId: "ipr-ip",
      source: "PLACEMENT_QUEUE",
    })).toBe("/app/hospitalisation/placement-queue/ipr-ip");
  });

  it("Provider ED / RN ED / inpatient / observation / closed routing matrix", () => {
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "ed-1",
        encounterType: "EMERGENCY",
        encounterStatus: "OPEN",
        role: "PROVIDER",
        source: "LANDING",
      })
    ).toBe("/app/emergency/active/ed-1");
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "ed-1",
        encounterType: "EMERGENCY",
        encounterStatus: "OPEN",
        role: "RN",
        source: "LANDING",
        tab: "mar",
      })
    ).toBe("/app/emergency/active/ed-1?section=mar");
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "ip-1",
        encounterType: "INPATIENT",
        encounterStatus: "OPEN",
        requestedEncounterType: "INPATIENT",
        role: "PROVIDER",
        source: "LANDING",
      })
    ).toBe("/app/hospitalisation/inpatient/active/ip-1/provider");
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "ip-1",
        encounterType: "INPATIENT",
        encounterStatus: "OPEN",
        requestedEncounterType: "INPATIENT",
        role: "RN",
        source: "LANDING",
      })
    ).toBe("/app/hospitalisation/inpatient/active/ip-1/nursing");
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "obs-1",
        encounterType: "INPATIENT",
        encounterStatus: "OPEN",
        requestedEncounterType: "OBSERVATION",
        role: "RN",
        source: "LANDING",
      })
    ).toBe("/app/hospitalisation/observation/active/obs-1/nursing");
    expect(
      canonicalEncounterWorkspaceHref({
        encounterId: "ed-closed",
        encounterType: "EMERGENCY",
        encounterStatus: "CLOSED",
        role: "PROVIDER",
        source: "PATIENT_CHART",
      })
    ).toBe("/app/emergency/chart/ed-closed");
  });

  it("legacy /app/encounters OPEN ED and inpatient redirect; clinic does not loop", () => {
    expect(
      legacyGenericEncounterRedirectHref({
        encounterId: "ed-1",
        encounterType: "EMERGENCY",
        encounterStatus: "OPEN",
        role: "PROVIDER",
      })
    ).toBe("/app/emergency/active/ed-1");
    expect(
      legacyGenericEncounterRedirectHref({
        encounterId: "ip-1",
        encounterType: "INPATIENT",
        encounterStatus: "OPEN",
        requestedEncounterType: "INPATIENT",
        role: "PROVIDER",
      })
    ).toBe("/app/hospitalisation/inpatient/active/ip-1/provider");
    expect(
      legacyGenericEncounterRedirectHref({
        encounterId: "op-1",
        encounterType: "OUTPATIENT",
        encounterStatus: "OPEN",
        role: "PROVIDER",
      })
    ).toBeNull();
    expect(
      legacyGenericEncounterRedirectHref({
        encounterId: "ed-1",
        encounterType: "EMERGENCY",
        encounterStatus: "OPEN",
        ambulatoryWorkspace: true,
      })
    ).toBeNull();
  });

  it("landing pages and patient chart use the canonical href helper", () => {
    const provider = readFileSync(join(webAppRoot, "provider/page.tsx"), "utf8");
    expect(provider).toContain("canonicalEncounterWorkspaceHref");
    const nursing = readFileSync(join(webAppRoot, "nursing/page.tsx"), "utf8");
    expect(nursing).toContain("canonicalEncounterWorkspaceHref");
    expect(nursing).toContain('tab: "mar"');
    const chart = readFileSync(join(root, "../../components/patient-chart/PatientQuickActions.tsx"), "utf8");
    expect(chart).toContain("canonicalEncounterWorkspaceHref");
    const header = readFileSync(join(root, "../../components/patient-chart/PatientHeaderCard.tsx"), "utf8");
    expect(header).toContain("canonicalEncounterWorkspaceHref");
    const legacyPage = readFileSync(join(webAppRoot, "encounters/[id]/page.tsx"), "utf8");
    expect(legacyPage).toContain("legacyGenericEncounterRedirectHref");
    expect(legacyPage).not.toContain("confirmInpatientTransfer");
    const operational = readFileSync(
      join(root, "../../components/encounters/EncounterOperationalPanel.tsx"),
      "utf8"
    );
    expect(operational).not.toContain("confirmInpatientTransfer");
    expect(operational).not.toContain("showConfirmInpatientTransfer");
  });

  it("placement workspace uses placementId, unit registry, existing transitions, and projects handoff", () => {
    const ws = readFileSync(join(root, "HospitalCarePlacementWorkspaceView.tsx"), "utf8");
    expect(ws).toContain("params.placementId");
    expect(ws).toContain("fetchHospitalUnitRegistry");
    expect(ws).toContain("filterHospitalUnitsForPlacementDestination");
    expect(ws).toContain("transitionPlacementRequest");
    expect(ws).toContain("readErHandoffV1FromNursingAssessment");
    expect(ws).not.toContain("confirmInpatientTransfer");
    expect(ws).not.toContain("NEXT_PUBLIC");
    expect(ws).not.toContain("BED-1");
    const page = readFileSync(
      join(webAppRoot, "hospitalisation/placement-queue/[placementId]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("HospitalCarePlacementWorkspaceView");
  });

  it("eligible units come from facility registry flags, not hard-coded OBS/MS/ICU", () => {
    const units = [
      {
        id: "1",
        code: "U-A",
        name: "Obs unit",
        unitType: "X",
        levelOfCare: "Y",
        specialty: null,
        active: true,
        acceptsInpatient: false,
        acceptsObservation: true,
        developmentOnly: false,
        patientCount: 0,
        occupiedBedCount: 0,
        availableBedCount: 2,
        alertCount: 0,
        rooms: [],
        physicalLocationHint: null,
      },
      {
        id: "2",
        code: "U-B",
        name: "IP unit",
        unitType: "X",
        levelOfCare: "Y",
        specialty: null,
        active: true,
        acceptsInpatient: true,
        acceptsObservation: false,
        developmentOnly: false,
        patientCount: 0,
        occupiedBedCount: 0,
        availableBedCount: 1,
        alertCount: 0,
        rooms: [],
        physicalLocationHint: null,
      },
    ];
    expect(filterHospitalUnitsForPlacementDestination(units, "OBSERVATION").map((u) => u.code)).toEqual([
      "U-A",
    ]);
    expect(filterHospitalUnitsForPlacementDestination(units, "INPATIENT").map((u) => u.code)).toEqual([
      "U-B",
    ]);
  });

  it("mirrors 1G.2 i18n keys and has no env-var clinician copy", () => {
    expect(Object.keys(en.edHosp1g2PlacementWorkspace).sort()).toEqual(
      Object.keys(fr.edHosp1g2PlacementWorkspace).sort()
    );
    expect(en.hospitalCareD3e7.placement.actionsOff).not.toContain("NEXT_PUBLIC");
    expect(fr.hospitalCareD3e7.placement.actionsOff).not.toContain("NEXT_PUBLIC");
    expect(fr.edHosp1g2PlacementWorkspace.title).toBe("Placement");
  });
});
