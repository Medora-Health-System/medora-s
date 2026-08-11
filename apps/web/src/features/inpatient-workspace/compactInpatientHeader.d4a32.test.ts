/**
 * MEDUI.D4A.3.2 — Compact inpatient header, sticky nav, shared vitals/IV panels.
 * Updated assertions remain compatible with D4A.3.3 nursing sticky nav.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  INPATIENT_NURSING_STICKY_NAV_SECTIONS,
  INPATIENT_STICKY_NAV_SECTIONS,
  parseInpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { buildInpatientHeaderVitalPairs, initialsFromDisplayName } from "./inpatientHeaderVitalsPairs";

const root = join(__dirname);

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.D4A.3.2 compact inpatient header", () => {
  it("renders exactly one initials avatar and no duplicate Initial block", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain('data-testid="inpatient-header-avatar"');
    expect(src).toContain("EMERGENCY_AVATAR_CIRCLE_STYLE");
    expect(src).not.toMatch(/Initial\b/);
    expect(src).not.toContain("header.hospitalDay");
    expect(src).not.toContain("inpatientWorkspaceRecoveryD4a27b.header.encounterType");
    expect(src).not.toContain("inpatientRapidConvergenceD4a27c.header.facility");
    expect(src).not.toContain("unitRoomBed");
    expect(src).toContain("showAssignmentActions = false");
    expect(src).not.toContain("fullChart");
    expect(src).not.toContain("arrivalLabel");
    expect(src).not.toContain("sourceUnavailable");
  });

  it("shows admission diagnosis label (not chief complaint) and admission time only", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("inpatientCompactHeaderD4a32.admissionDiagnosis");
    expect(src).toContain("inpatientCompactHeaderD4a32.admissionLabel");
    expect(src).toContain("chiefConcern");
    expect(src).not.toContain("chiefComplaintShort");
    expect(src).not.toContain("arrival");
  });

  it("includes Room tile, ESI, vitals/allergies/code/isolation + IV syringe (no IV card)", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("EncounterGovernedRoomChip");
    expect(src).toContain("inpatient-header-room");
    expect(src).toContain("inpatient-header-esi");
    expect(src).toContain("EmergencyWorkspaceVitalsCard");
    expect(src).not.toContain("inpatient-header-iv-card");
    expect(src).toContain("inpatient-header-iv-syringe");
    expect(src).toContain("EmergencyWorkspaceAllergiesCard");
    expect(src).toContain("inpatient-header-code-card");
    expect(src).toContain("inpatient-header-isolation-card");
  });

  it("uses governed empty states instead of Source unavailable", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("noVitalsDocumented");
    expect(src).toContain("notDocumented");
    // D4A.3.4 — IV card removed; syringe uses active-state aria, not noActiveIv card copy
    expect(src).toContain("inpatientOverviewD4a34.ivInactiveAria");
    expect(en.inpatientCompactHeaderD4a32.noVitalsDocumented).not.toMatch(/source unavailable/i);
    expect(fr.inpatientCompactHeaderD4a32.noVitalsDocumented).not.toMatch(/indisponible/i);
  });

  it("sticky nav order merges Review Orders, MAR, Review Results into one nursing row", () => {
    const ids = INPATIENT_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(ids).toEqual(INPATIENT_NURSING_STICKY_NAV_SECTIONS.map((s) => s.id));
    expect(ids.slice(0, 3)).toEqual(["overview", "admission", "nursing"]);
    expect(ids.slice(3, 6)).toEqual(["orders", "medications", "results"]);
    const nav = read("InpatientWorkspaceSectionNav.tsx");
    expect(nav).toContain("inpatient-sticky-section-nav");
    expect(nav).toContain('position: "sticky"');
    expect(nav).toContain('flexWrap: "nowrap"');
    expect(nav).toContain("overflowX: \"auto\"");
  });

  it("renames Medications to MAR in UI while keeping medications route key", () => {
    expect(parseInpatientWorkspaceSection("mar")).toBe("medications");
    expect(parseInpatientWorkspaceSection("medications")).toBe("medications");
    expect(en.inpatientProviderD4a26.nav.medications).toBe("MAR");
    expect(fr.inpatientProviderD4a26.nav.medications).toBe("MAR");
    expect(en.inpatientCompactHeaderD4a32.nav.mar).toBe("MAR");
    expect(fr.inpatientCompactHeaderD4a32.nav.mar).toBe("MAR");
    const sticky = INPATIENT_STICKY_NAV_SECTIONS.find((s) => s.id === "medications");
    expect(sticky?.labelKey).toBe("inpatientCompactHeaderD4a32.nav.mar");
  });

  it("inpatient workspace never enables header assignment actions or full-chart link", () => {
    const active = read("InpatientActiveWorkspaceView.tsx");
    const header = read("EnterpriseHospitalPatientHeader.tsx");
    expect(active).not.toContain("showAssignmentActions");
    expect(active).not.toContain("onAssignToMe");
    expect(active).not.toContain("onRemoveAssignment");
    expect(active).not.toContain("assignHospitalRoleToMe");
    expect(header).toContain("showAssignmentActions = false");
    expect(header).toContain("hospital-header-assign-me");
    expect(header).not.toContain("fullChart");
  });

  it("wires shared EncounterVitalsPanel and EncounterIvAccessPanel (no duplicate clinical engines)", () => {
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).toContain('from "@/features/encounters/EncounterVitalsPanel"');
    expect(active).toContain('from "@/features/encounters/EncounterIvAccessPanel"');
    expect(active).toContain("EncounterVitalsPanel");
    expect(active).toContain("EncounterIvAccessPanel");
    expect(active).toContain("VitalSummaryPanel");
    expect(active).not.toContain("onOpenOrders");
    expect(active).not.toContain("onOpenMar");
    expect(active).not.toContain("onOpenResults");

    const vitalsPanel = readFileSync(
      join(root, "../encounters/EncounterVitalsPanel.tsx"),
      "utf8"
    );
    const ivPanel = readFileSync(join(root, "../encounters/EncounterIvAccessPanel.tsx"), "utf8");
    expect(vitalsPanel).toContain("EmergencyQuickVitalsEditor as EncounterVitalsPanel");
    expect(ivPanel).toContain("EmergencyIvAccessModal as EncounterIvAccessPanel");
  });

  it("overview no longer mounts longitudinal strip (removed in D4A.3.3)", () => {
    const active = read("InpatientActiveWorkspaceView.tsx");
    expect(active).not.toContain("InpatientLongitudinalOverviewStrip");
  });

  it("mirrors compact header i18n keys EN/FR", () => {
    const enKeys = Object.keys(en.inpatientCompactHeaderD4a32.nav);
    const frKeys = Object.keys(fr.inpatientCompactHeaderD4a32.nav);
    expect(enKeys).toEqual(frKeys);
    expect(Object.keys(en.inpatientCompactHeaderD4a32.overview)).toEqual(
      Object.keys(fr.inpatientCompactHeaderD4a32.overview)
    );
  });

  it("vital pairs helper never fabricates when unavailable", () => {
    const pairs = buildInpatientHeaderVitalPairs(
      {
        availability: "NO_DATA_DOCUMENTED",
        systolic: null,
        diastolic: null,
        heartRate: null,
        spo2: null,
        temperatureC: null,
        respiratoryRate: null,
      },
      "en",
      "—"
    );
    expect(pairs.every((p) => p.value === "—")).toBe(true);
    expect(initialsFromDisplayName("Ada Lovelace")).toBe("AL");
    expect(initialsFromDisplayName(null)).toBe("—");
  });

  it("ED shared components remain importable (no inpatient fork of save path)", () => {
    const edQuick = readFileSync(
      join(root, "../emergency/EmergencyQuickVitalsEditor.tsx"),
      "utf8"
    );
    expect(edQuick).toContain("saveIndependentEncounterVitals");
    const edIv = readFileSync(join(root, "../emergency/EmergencyIvAccessModal.tsx"), "utf8");
    expect(edIv).toContain("/iv-access");
  });
});
