/**
 * MEDUI.D4C.5B — Unified Ambulatory Encounter Workspace (tests A–L).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_CARE_AMBULATORY_ENCOUNTER_WORKSPACE_CERTIFICATION_ID,
  CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS,
  CLINIC_CARE_PROVIDER_QUEUE_GROUPS,
  canAccessClinicCareAmbulatoryWorkspaceSection,
  clinicCareAmbulatoryActiveWorkspacePath,
  clinicCareAmbulatoryOpenWorkspacePath,
  clinicCareAmbulatoryOrdersSectionPath,
  clinicCareAmbulatoryResultsSectionPath,
  clinicCareRowMatchesView,
  filterAmbulatoryClinicalDataDocuments,
  getDefaultClinicCareAmbulatoryWorkspaceSection,
  getVisibleClinicCareAmbulatoryWorkspaceSections,
  isAmbulatoryClinicalDataDocumentAllowed,
  parseClinicCareAmbulatoryWorkspaceSection,
  projectClinicCareProviderQueueGroup,
  resolveClinicCareAmbulatoryWorkflowTarget,
  shouldSuppressGlobalDashboardForClinicCare,
} from "@medora/shared";
import {
  isAmbulatoryWorkspaceQuery,
  resolveAmbulatoryWorkspaceSectionFromSearch,
} from "./clinicCareAmbulatoryChartAdapter";
import { resolveClinicBoardPatientNameHref } from "./clinicCareBoardRoutes";

const featureDir = __dirname;
const encounterPage = join(featureDir, "../../../app/app/encounters/[id]/page.tsx");
const sidebarConfig = join(featureDir, "../../components/app-shell/sidebarNavConfig.ts");
const sidebarIcons = join(featureDir, "../../components/app-shell/SidebarNavIcons.tsx");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.5B unified ambulatory encounter workspace", () => {
  it("A — certification id + twelve inline sections with abbreviations", () => {
    expect(CLINIC_CARE_AMBULATORY_ENCOUNTER_WORKSPACE_CERTIFICATION_ID).toBe("MEDUI.D4C.5B");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toHaveLength(12);
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("medical-evaluation");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("orders");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("prescriptions");
    expect(CLINIC_CARE_AMBULATORY_WORKSPACE_SECTIONS).toContain("results");
    expect(parseClinicCareAmbulatoryWorkspaceSection("clinic")).toBe("medical-evaluation");
    expect(parseClinicCareAmbulatoryWorkspaceSection("mar")).toBe("medications");
    expect(parseClinicCareAmbulatoryWorkspaceSection("rx")).toBe("prescriptions");
  });

  it("B — Active Workspace path is canonical encounter route (no ClinicPatientChart)", () => {
    const path = clinicCareAmbulatoryActiveWorkspacePath("enc-1", "medical-evaluation");
    expect(path).toBe(
      "/app/encounters/enc-1?workspace=ambulatory&section=medical-evaluation"
    );
    expect(clinicCareAmbulatoryOpenWorkspacePath("enc-2")).toContain("section=medical-evaluation");
    expect(existsSync(join(featureDir, "ClinicPatientChart.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicEncounterChart.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicEncounterStatus.ts"))).toBe(false);
    const page = readFileSync(encounterPage, "utf8");
    expect(page).toContain("ClinicCareActiveAmbulatoryWorkspaceView");
    expect(page).toContain('workspace") === "ambulatory"');
  });

  it("C — Today's Visits / board open workspace; closed → encounter record", () => {
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "e1",
        patientId: "p1",
        status: "OPEN",
        fromTodaysVisits: true,
      })
    ).toContain("workspace=ambulatory");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "e1",
        patientId: "p1",
        status: "OPEN",
        fromTodaysVisits: true,
      })
    ).toContain("from=todays-visits");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "e2",
        patientId: "p2",
        status: "CLOSED",
      })
    ).toBe("/app/encounters/e2");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "e3",
        patientId: "p3",
        status: "SIGNED",
      })
    ).toContain("workspace=ambulatory");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "e3",
        patientId: "p3",
        status: "SIGNED",
      })
    ).not.toContain("/app/patients/");
    const trackboard = read("ClinicCareTrackboardView.tsx");
    expect(trackboard).toContain("fromTodaysVisits");
  });

  it("D — Start consultation targets IN_TREATMENT via EncounterWorkflowState", () => {
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_INTAKE", "ARRIVED")).toBe("TRIAGE");
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_PROVIDER", "TRIAGE")).toBe(
      "IN_TREATMENT"
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_CONSULTATION", "TRIAGE")).toBe(
      "IN_TREATMENT"
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("START_CONSULTATION", "IN_TREATMENT")).toBe(
      "IN_TREATMENT"
    );
    expect(resolveClinicCareAmbulatoryWorkflowTarget("READY_FOR_CHECKOUT", "IN_TREATMENT")).toBe(
      "DISPOSITION"
    );
    const view = read("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("patchEncounterWorkflowState");
    expect(view).toContain("START_CONSULTATION");
    expect(view).toContain("medical-evaluation");
  });

  it("E — role-aware tiles + route guards (not hide-only)", () => {
    const provider = getVisibleClinicCareAmbulatoryWorkspaceSections(["PROVIDER"]);
    expect(provider).toContain("medical-evaluation");
    expect(provider).toContain("orders");
    const rn = getVisibleClinicCareAmbulatoryWorkspaceSections(["RN"]);
    expect(rn).not.toContain("medical-evaluation");
    expect(rn).toContain("intake");
    expect(canAccessClinicCareAmbulatoryWorkspaceSection(["FRONT_DESK"], "orders")).toBe(false);
    expect(canAccessClinicCareAmbulatoryWorkspaceSection(["FRONT_DESK"], "follow-up")).toBe(true);
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["PROVIDER"])).toBe("medical-evaluation");
    expect(getDefaultClinicCareAmbulatoryWorkspaceSection(["RN"])).toBe("intake");
    const view = read("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("canAccessClinicCareAmbulatoryWorkspaceSection");
  });

  it("F — provider worklist includes WAITING (no empty false-negative for arrived/ready)", () => {
    expect(CLINIC_CARE_PROVIDER_QUEUE_GROUPS).toContain("WAITING");
    expect(projectClinicCareProviderQueueGroup("WAITING")).toBe("WAITING");
    expect(
      clinicCareRowMatchesView({
        view: "PROVIDER",
        stageId: "WAITING",
        createdAt: "2026-07-28T12:00:00.000Z",
        dayStartUtc: new Date("2026-07-28T00:00:00.000Z"),
        dayEndExclusiveUtc: new Date("2026-07-29T00:00:00.000Z"),
      })
    ).toBe(true);
    const provider = read("ClinicCareProviderWorkspaceView.tsx");
    expect(provider).toContain("clinicCareD4c5b.groupWaiting");
  });

  it("G — Orders/Results tile mounts reuse D4C.6 shared engines", () => {
    expect(clinicCareAmbulatoryOrdersSectionPath("e")).toContain("section=orders");
    expect(clinicCareAmbulatoryResultsSectionPath("e")).toContain("section=results");
    const panels = read("ClinicCareAmbulatoryWorkspacePanels.tsx");
    expect(panels).toContain("clinic-care-ambulatory-orders-mount");
    expect(panels).toContain("clinic-care-ambulatory-results-mount");
    expect(panels).toContain("EmergencyErOrdersPanel");
    expect(panels).toContain("EmergencyResultsPanel");
    expect(panels).not.toMatch(/from ["'].*ClinicOrder/);
    expect(panels).not.toMatch(/from ["'].*ClinicResult/);
    expect(existsSync(join(featureDir, "ClinicOrder.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicResult.tsx"))).toBe(false);
  });

  it("H — Medical Evaluation reuses ProviderDocumentationWorkspace AMBULATORY mode", () => {
    const me = read("ClinicCareAmbulatoryMedicalEvaluationPanel.tsx");
    expect(me).toContain("ProviderDocumentationWorkspace");
    expect(me).toContain('encounterMode="AMBULATORY"');
    expect(me).toContain("canAuthorAmbulatoryProviderDocumentation");
    expect(me).not.toContain("ClinicHpi");
    expect(me).not.toMatch(/\besiLevel\b/);
    expect(existsSync(join(featureDir, "ClinicHpi.tsx"))).toBe(false);
  });

  it("I — clinical data care-setting filter blocks ED-only types", () => {
    expect(
      isAmbulatoryClinicalDataDocumentAllowed({
        typeId: "THROMBOLYSIS",
        careSettings: ["ED"],
      })
    ).toBe(false);
    expect(
      isAmbulatoryClinicalDataDocumentAllowed({
        typeId: "CIWA",
        careSettings: ["ED"],
      })
    ).toBe(false);
    expect(
      isAmbulatoryClinicalDataDocumentAllowed({
        typeId: "OUTPATIENT_NOTE",
        careSettings: ["CLINIC", "OUTPATIENT"],
      })
    ).toBe(true);
    expect(
      filterAmbulatoryClinicalDataDocuments([
        { typeId: "TRAUMA_PRIMARY", careSettings: ["ED"] },
        { typeId: "PROGRESS_NOTE", careSettings: ["CLINIC"] },
      ])
    ).toHaveLength(1);
  });

  it("J — sidebar promotes Clinic Care; chart icon; suppress duplicate dashboard contract", () => {
    const nav = readFileSync(sidebarConfig, "utf8");
    const clinicIdx = nav.indexOf('href: "/app/clinic-care"');
    const trackIdx = nav.indexOf('href: "/app/trackboard"');
    expect(clinicIdx).toBeGreaterThan(-1);
    expect(trackIdx).toBeGreaterThan(-1);
    expect(clinicIdx).toBeLessThan(trackIdx);
    const icons = readFileSync(sidebarIcons, "utf8");
    expect(icons).toContain('"/app/clinic-care": "1f4ca.svg"');
    expect(
      shouldSuppressGlobalDashboardForClinicCare({
        ambulatoryFacility: true,
        clinicCareVisible: true,
        edVisible: false,
        hospitalVisible: false,
      })
    ).toBe(true);
    expect(
      shouldSuppressGlobalDashboardForClinicCare({
        ambulatoryFacility: true,
        clinicCareVisible: true,
        edVisible: true,
        hospitalVisible: false,
      })
    ).toBe(false);
  });

  it("K — header has no ESI / trauma / ED badge; workspace chrome present", () => {
    const header = read("ClinicCareAmbulatoryPatientHeader.tsx");
    expect(header).toContain("clinic-care-ambulatory-patient-header");
    expect(header).not.toMatch(/\besiLevel\b/);
    expect(header).toMatch(/no ESI/);
    expect(header.toLowerCase()).not.toMatch(/trauma protocol|trauma badge/);
    const view = read("ClinicCareActiveAmbulatoryWorkspaceView.tsx");
    expect(view).toContain("clinic-care-active-ambulatory-workspace");
    expect(view).toContain("data-care-setting");
    expect(view).toContain("clinicCareD4c5b.backClinicCare");
    expect(view).toContain("clinicCareD4c5b.backTodaysVisits");
  });

  it("L — i18n EN+FR keys + adapter section/query helpers; no Open Chart gateway language in D4C.5B", () => {
    const en = readFileSync(join(featureDir, "../../i18n/messages/en.ts"), "utf8");
    const fr = readFileSync(join(featureDir, "../../i18n/messages/fr.ts"), "utf8");
    expect(en).toContain("clinicCareD4c5b:");
    expect(fr).toContain("clinicCareD4c5b:");
    expect(en).toContain('title: "Active Clinic Workspace"');
    expect(fr).toContain('title: "Espace clinique actif"');
    expect(en).toContain("startConsultation");
    expect(fr).toContain("Démarrer la consultation");
    expect(isAmbulatoryWorkspaceQuery("?workspace=ambulatory&section=orders")).toBe(true);
    expect(resolveAmbulatoryWorkspaceSectionFromSearch("?tab=orders&workspace=ambulatory")).toBe(
      "orders"
    );
    expect(en).toContain("noOpenChart");
    expect(fr).toContain("noOpenChart");
  });
});
