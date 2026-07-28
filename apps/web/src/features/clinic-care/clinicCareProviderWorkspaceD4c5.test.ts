/**
 * MEDUI.D4C.5 — Ambulatory provider workspace, rapid H&P, clinical summary.
 * Tests A–L (source-contract + shared projection).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS,
  CLINIC_CARE_PROVIDER_QUEUE_GROUPS,
  CLINIC_CARE_PROVIDER_WORKSPACE_CERTIFICATION_ID,
  canAuthorAmbulatoryProviderDocumentation,
  clinicCareAmbulatoryPatientChartPath,
  clinicCareAmbulatoryProviderChartPath,
  filterAmbulatoryEncounterRows,
  isClinicCareAmbulatoryProviderTabVisible,
  projectClinicCareProviderQueueGroup,
  resolveClinicCareProviderDocumentationMode,
  sortClinicCareProviderQueueGroups,
} from "@medora/shared";
import {
  documentTypeForEncounterMode,
  providerDocumentationTitleKey,
  readProviderDocumentationWorkspaceMetadata,
  buildProviderDocumentationMetadata,
  buildProviderDocumentationSavePayload,
  emptyProviderDocumentationWorkspaceState,
  applyCompleteNormalRosPrefill,
  applyCompleteNormalPhysicalExamPrefill,
} from "@/lib/providerDocumentationModel";

const featureDir = __dirname;
const clinicCareAppDir = join(featureDir, "../../../app/app/clinic-care");
const encounterPage = join(featureDir, "../../../app/app/encounters/[id]/page.tsx");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.5 ambulatory provider workspace", () => {
  it("A — provider worklist mounts functionally (no Open card); groups from canonical stages", () => {
    const page = readFileSync(join(clinicCareAppDir, "provider/page.tsx"), "utf8");
    expect(page).toContain("ClinicCareProviderWorkspaceView");
    expect(page).not.toContain("ClinicCareEmbeddedModule");
    const provider = read("ClinicCareProviderWorkspaceView.tsx");
    expect(provider).toContain("clinic-care-provider-workspace");
    expect(provider).toContain("projectClinicCareProviderQueueGroup");
    expect(provider).toContain("clinicCareAmbulatoryProviderChartPath");
    expect(provider).toContain("assignProviderSelf");
    expect(provider).not.toContain("soapDeferred");
    expect(CLINIC_CARE_PROVIDER_QUEUE_GROUPS).toEqual([
      "WAITING",
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "DISCHARGE_PENDING",
    ]);
    expect(projectClinicCareProviderQueueGroup("IN_PROGRESS")).toBe("IN_PROGRESS");
    expect(projectClinicCareProviderQueueGroup("WAITING")).toBe("WAITING");
    expect(sortClinicCareProviderQueueGroups(["DISCHARGE_PENDING", "WAITING", "IN_PROGRESS"])).toEqual([
      "WAITING",
      "IN_PROGRESS",
      "DISCHARGE_PENDING",
    ]);
  });

  it("B — chart path reuses enterprise encounter + patient engines (no ClinicPatientChart)", () => {
    const path = clinicCareAmbulatoryProviderChartPath("enc-1");
    expect(path).toContain("/app/encounters/enc-1");
    expect(path).toContain("section=medical-evaluation");
    expect(path).toContain("workspace=ambulatory");
    expect(path).not.toContain("tab=clinic");
    expect(clinicCareAmbulatoryPatientChartPath("pat-1")).toBe("/app/patients/pat-1");
    expect(existsSync(join(featureDir, "ClinicPatientChart.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicHpi.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicROS.tsx"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicPhysicalExam.tsx"))).toBe(false);
    const board = read("clinicCareBoardRoutes.ts");
    expect(board).toContain("clinicCareAmbulatoryProviderChartPath");
    expect(board).toContain("clinicPatientChartPath");
  });

  it("C — AMBULATORY provider documentation mode reuses INITIAL_PROVIDER_NOTE durability", () => {
    expect(resolveClinicCareProviderDocumentationMode({ encounterType: "OUTPATIENT" })).toBe(
      "AMBULATORY"
    );
    expect(resolveClinicCareProviderDocumentationMode({ encounterType: "URGENT_CARE" })).toBe(
      "AMBULATORY"
    );
    expect(
      resolveClinicCareProviderDocumentationMode({
        encounterType: "OUTPATIENT",
        observationWorkflowActive: true,
      })
    ).toBe("OBSERVATION");
    expect(resolveClinicCareProviderDocumentationMode({ encounterType: "EMERGENCY" })).toBe("ED");
    expect(documentTypeForEncounterMode("AMBULATORY")).toBe("INITIAL_PROVIDER_NOTE");
    expect(providerDocumentationTitleKey("AMBULATORY")).toContain("titleAmbulatory");
    expect(CLINIC_CARE_PROVIDER_WORKSPACE_CERTIFICATION_ID).toBe("MEDUI.D4C.5");
  });

  it("D — rapid H&P reuses complete-normal ROS/PE prefills (editable, no silent prior copy)", () => {
    const empty = emptyProviderDocumentationWorkspaceState();
    const withRos = applyCompleteNormalRosPrefill({ state: empty, text: "ROS normal editable" });
    expect(withRos.rosFocusedImpression).toContain("ROS normal editable");
    const withExam = applyCompleteNormalPhysicalExamPrefill({
      state: withRos,
      resolveFragment: (key) => `fragment:${key}`,
    });
    expect(withExam.physicalExam.general.length).toBeGreaterThan(0);
    const meta = buildProviderDocumentationMetadata({
      encounterMode: "AMBULATORY",
      savedAt: "2026-07-27T12:00:00.000Z",
      savedBy: "Dr Test",
    });
    const payload = buildProviderDocumentationSavePayload({
      previousNursingAssessment: {},
      state: withExam,
      metadata: meta,
    });
    const readBack = readProviderDocumentationWorkspaceMetadata(payload.nursingAssessment);
    expect(readBack?.encounterMode).toBe("AMBULATORY");
    expect(readBack?.documentType).toBe("INITIAL_PROVIDER_NOTE");
    expect(readBack?.savedBy).toBe("Dr Test");
  });

  it("E — encounter clinic tab wires AMBULATORY mode + clinical summary panel + author gate", () => {
    const page = readFileSync(encounterPage, "utf8");
    expect(page).toContain("providerDocumentationEncounterMode");
    expect(page).toContain("ClinicCareAmbulatoryClinicalSummaryPanel");
    expect(page).toContain("canAuthorProviderDocumentation");
    expect(page).toContain("ambulatoryLayout");
    expect(page).toContain("filterEncounterTabsForAmbulatoryAdapter");
    expect(page).not.toContain("ClinicHpi");
    expect(page).not.toContain("ClinicROS");
    expect(page).not.toContain("ClinicPhysicalExam");
    const summary = read("ClinicCareAmbulatoryClinicalSummaryPanel.tsx");
    expect(summary).toContain("EmergencyClinicalDataPanel");
    expect(existsSync(join(featureDir, "ClinicClinicalSummary.tsx"))).toBe(false);
  });

  it("F — ambulatory tab adapter hides ED-heavy tabs (MAR / pathways / observation)", () => {
    expect(isClinicCareAmbulatoryProviderTabVisible("clinic")).toBe(true);
    expect(isClinicCareAmbulatoryProviderTabVisible("history")).toBe(true);
    expect(isClinicCareAmbulatoryProviderTabVisible("mar")).toBe(false);
    expect(isClinicCareAmbulatoryProviderTabVisible("pathways")).toBe(false);
    expect(isClinicCareAmbulatoryProviderTabVisible("observation_summary")).toBe(false);
    expect(CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS).toContain("orders");
    expect(CLINIC_CARE_AMBULATORY_PROVIDER_TAB_IDS).toContain("diagnostics");
    const adapter = read("clinicCareAmbulatoryChartAdapter.ts");
    expect(adapter).toContain("filterEncounterTabsForAmbulatoryAdapter");
  });

  it("G — All Encounters / Patients tabs mount direct content (no Open cards)", () => {
    const encountersPage = readFileSync(join(clinicCareAppDir, "encounters/page.tsx"), "utf8");
    expect(encountersPage).toContain("ClinicCareAmbulatoryEncountersView");
    expect(encountersPage).not.toContain("ClinicCareEmbeddedModule");
    expect(encountersPage).not.toContain("openEncounters");
    const patientsPage = readFileSync(join(clinicCareAppDir, "patients/page.tsx"), "utf8");
    expect(patientsPage).toContain("ClinicCareAmbulatoryPatientsView");
    expect(patientsPage).not.toContain("ClinicCareEmbeddedModule");
    const encounters = read("ClinicCareAmbulatoryEncountersView.tsx");
    expect(encounters).toContain("ambulatoryOnly");
    expect(encounters).toContain("clinic-care-encounters-ambulatory-filter");
    const patients = read("ClinicCareAmbulatoryPatientsView.tsx");
    expect(patients).toContain("/patients/search");
    expect(patients).toContain("clinicCareAmbulatoryPatientChartPath");
    expect(
      filterAmbulatoryEncounterRows([
        { type: "OUTPATIENT" },
        { type: "EMERGENCY" },
        { type: "URGENT_CARE" },
      ])
    ).toHaveLength(2);
  });

  it("H — authorization: only PROVIDER/ADMIN author ambulatory provider docs", () => {
    expect(canAuthorAmbulatoryProviderDocumentation(["PROVIDER"])).toBe(true);
    expect(canAuthorAmbulatoryProviderDocumentation(["ADMIN"])).toBe(true);
    expect(canAuthorAmbulatoryProviderDocumentation(["RN"])).toBe(false);
    expect(canAuthorAmbulatoryProviderDocumentation(["PATIENT_CARE_TECH"])).toBe(false);
    expect(canAuthorAmbulatoryProviderDocumentation(["FRONT_DESK"])).toBe(false);
    expect(canAuthorAmbulatoryProviderDocumentation(["CLINIC_ADMIN" as never])).toBe(false);
    const provider = read("ClinicCareProviderWorkspaceView.tsx");
    expect(provider).toContain('roles.includes("PROVIDER")');
  });

  it("I — capability nav still gates provider tab; shell has no second sidebar", () => {
    const shell = read("ClinicCareShell.tsx");
    expect(shell).toContain("ClinicCareTopNav");
    expect(shell).toContain("isClinicWorkspacePathAllowed");
    expect(shell).not.toContain("ClinicCareSideNav");
    expect(existsSync(join(featureDir, "ClinicCareSideNav.tsx"))).toBe(false);
  });

  it("J — i18n clinicCareD4c5 keys mirrored EN/FR; ambulatory title present", () => {
    const fr = readFileSync(join(featureDir, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(join(featureDir, "../../i18n/messages/en.ts"), "utf8");
    expect(fr).toContain("clinicCareD4c5:");
    expect(en).toContain("clinicCareD4c5:");
    expect(fr).toContain("titleAmbulatory:");
    expect(en).toContain("titleAmbulatory:");
    expect(fr).toContain("providerTitle:");
    expect(en).toContain("providerTitle:");
    expect(fr).toContain("clinicalSummaryTitle:");
    expect(en).toContain("clinicalSummaryTitle:");
  });

  it("K — save/sign lifecycle stays on enterprise ProviderDocumentationWorkspace", () => {
    const page = readFileSync(encounterPage, "utf8");
    expect(page).toContain("ProviderDocumentationWorkspace");
    expect(page).toContain("sign-provider-documentation");
    expect(page).toContain("buildProviderDocumentationSavePayload");
    expect(page).toContain("provider-addenda");
    expect(page).not.toContain("ClinicProviderNote");
    expect(page).not.toContain("ClinicSignEngine");
  });

  it("L — certification id + no Clinic* documentation forks in clinic-care feature dir", () => {
    expect(CLINIC_CARE_PROVIDER_WORKSPACE_CERTIFICATION_ID).toBe("MEDUI.D4C.5");
    for (const name of [
      "ClinicPatientChart.tsx",
      "ClinicHpi.ts",
      "ClinicROS.ts",
      "ClinicPhysicalExam.ts",
      "ClinicProviderNote.tsx",
      "ClinicDischarge.ts",
    ]) {
      expect(existsSync(join(featureDir, name))).toBe(false);
    }
  });
});
