/**
 * MEDUI.D4C.4 — Ambulatory Nursing / MA workspace + trackboard density + direct-nav.
 * Tests A–H (source-contract + shared projection).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_CARE_MA_ASSIGNMENT_ADAPTER,
  CLINIC_CARE_NURSING_QUEUE_STAGES,
  clinicCareAmbulatoryIntakeChartPath,
  clinicCareNursingNextWorkflowTransition,
  projectClinicCareIntakeStatus,
  projectClinicCareNursingQueueStage,
} from "@medora/shared";

const featureDir = __dirname;
const clinicCareAppDir = join(featureDir, "../../../app/app/clinic-care");
const apiClinicCareDir = join(featureDir, "../../../../api/src/clinic-care");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

describe("MEDUI.D4C.4 ambulatory nursing / MA workspace", () => {
  it("A — trackboard density: no Assign Room / Assign Nurse / Assign MA row buttons; inline room + provider Assign me", () => {
    const view = read("ClinicCareTrackboardView.tsx");
    expect(view).toContain("ClinicCareInlineRoomSelect");
    expect(view).toContain("claimProviderSelf");
    expect(view).toContain("clinicCareD4c4.assignMeProvider");
    expect(view).not.toContain("assignNurseSelf");
    expect(view).not.toContain("assignHospitalRoleToMe");
    expect(view).not.toContain("RoomAssignmentModal");
    expect(view).not.toContain("clinic-care-assign-room-");
    expect(view).not.toContain("clinic-care-assign-nurse-");
    expect(view).not.toContain("clinic-care-assign-ma-");
    expect(view).not.toContain("footerDeferral");
    expect(view).not.toMatch(/team\.nurse/);
  });

  it("B — nursing queue stage + intake projection helpers (enterprise workflow mapping)", () => {
    expect(projectClinicCareNursingQueueStage({ workflowState: "ARRIVED" })).toBe("WAITING_FOR_INTAKE");
    expect(projectClinicCareNursingQueueStage({ workflowState: "TRIAGE" })).toBe("IN_PROGRESS");
    expect(projectClinicCareNursingQueueStage({ workflowState: "IN_TREATMENT" })).toBe(
      "READY_FOR_PROVIDER"
    );
    expect(projectClinicCareNursingQueueStage({ workflowState: "RESULTS_PENDING" })).toBe("RETURNED");
    expect(projectClinicCareNursingQueueStage({ workflowState: "CLOSED", encounterStatus: "CLOSED" })).toBe(
      "COMPLETED"
    );
    expect(clinicCareNursingNextWorkflowTransition("ARRIVED")).toBe("TRIAGE");
    expect(clinicCareNursingNextWorkflowTransition("TRIAGE")).toBe("IN_TREATMENT");
    expect(clinicCareNursingNextWorkflowTransition("IN_TREATMENT")).toBeNull();
    expect(CLINIC_CARE_NURSING_QUEUE_STAGES).toHaveLength(5);

    const intake = projectClinicCareIntakeStatus({
      encounterVitals: { hr: 80 },
      clinicalHistoryProfileJson: {
        allergies: { nka: true },
        homeMedications: { medicationsSummary: "ASA" },
      },
    });
    expect(intake.vitals).toBe("DONE");
    expect(intake.allergies).toBe("DONE");
    expect(intake.medRec).toBe("PARTIAL");
    expect(clinicCareAmbulatoryIntakeChartPath("enc-1")).toContain("?tab=triage");
    expect(clinicCareAmbulatoryIntakeChartPath("enc-1", "history")).toContain("?tab=history");
  });

  it("C — nursing workspace mounts functional queue (no Open Nursing card); MA adapter documented", () => {
    const page = readFileSync(join(clinicCareAppDir, "nursing/page.tsx"), "utf8");
    expect(page).toContain("ClinicCareNursingWorkspaceView");
    expect(page).not.toContain("ClinicCareEmbeddedModule");
    expect(page).not.toContain("openNursing");
    const nursing = read("ClinicCareNursingWorkspaceView.tsx");
    expect(nursing).toContain("clinic-care-nursing-workspace");
    expect(nursing).toContain("clinic-care-nursing-queue");
    expect(nursing).toContain("clinicCareNursingNextWorkflowTransition");
    expect(nursing).toContain("patchEncounterWorkflowState");
    expect(nursing).toContain("clinic-care-nursing-ready-for-provider");
    expect(nursing).toContain("CLINIC_CARE_MA_ASSIGNMENT_ADAPTER");
    expect(nursing).toContain("assignHospitalRoleToMe");
    expect(nursing).toContain("assignNurseSelf");
    expect(nursing).toContain("EncounterVitalsPanel");
    expect(nursing).toContain("InpatientAllergyEditorModal");
    expect(nursing).toContain("clinicCareAmbulatoryIntakeChartPath");
    expect(CLINIC_CARE_MA_ASSIGNMENT_ADAPTER.ambulatoryNativeRoleDeferred).toBe(true);
    expect(CLINIC_CARE_MA_ASSIGNMENT_ADAPTER.enterpriseSlot).toBe("TECHNICIAN");
  });

  it("D — provider tab mounts worklist (no Open Provider card); SOAP deferred note present", () => {
    const page = readFileSync(join(clinicCareAppDir, "provider/page.tsx"), "utf8");
    expect(page).toContain("ClinicCareProviderWorkspaceView");
    expect(page).not.toContain("ClinicCareEmbeddedModule");
    const provider = read("ClinicCareProviderWorkspaceView.tsx");
    expect(provider).toContain("soapDeferred");
    expect(provider).toContain("assignProviderSelf");
    expect(provider).not.toContain("SOAP editor");
  });

  it("E — ancillary top tabs direct-redirect (no intermediate Open cards)", () => {
    const redirect = read("ClinicCareDirectCanonicalRedirect.tsx");
    expect(redirect).toContain("router.replace");
    expect(redirect).toContain("clinic-care-direct-redirect");
    for (const route of [
      "patients",
      "encounters",
      "follow-up",
      "billing",
      "laboratory",
      "radiology",
      "pharmacy",
      "public-health",
      "administration",
    ]) {
      const page = readFileSync(join(clinicCareAppDir, `${route}/page.tsx`), "utf8");
      expect(page).toContain("ClinicCareDirectCanonicalRedirect");
      expect(page).not.toContain("ClinicCareEmbeddedModule");
    }
  });

  it("F — room + provider assignment reuse enterprise APIs (no ClinicRoom* / ClinicUserAssignment*)", () => {
    const room = read("ClinicCareInlineRoomSelect.tsx");
    expect(room).toContain("updateEncounterRoomAssignment");
    expect(room).not.toMatch(/ClinicRoom/);
    const trackboard = read("ClinicCareTrackboardView.tsx");
    expect(trackboard).toContain("assignProviderSelf");
    expect(existsSync(join(featureDir, "ClinicRoom.ts"))).toBe(false);
    expect(existsSync(join(featureDir, "ClinicNursingNote.ts"))).toBe(false);
  });

  it("G — trackboard/API enrich nursingQueueStage + intakeStatus; schema-miss remains 503", () => {
    const service = readFileSync(join(apiClinicCareDir, "clinic-care.service.ts"), "utf8");
    expect(service).toContain("projectClinicCareNursingQueueStage");
    expect(service).toContain("projectClinicCareIntakeStatus");
    expect(service).toContain("nursingQueueStage");
    expect(service).toContain("intakeStatus");
    expect(service).toContain("maName");
    const controller = readFileSync(join(apiClinicCareDir, "clinic-care.controller.ts"), "utf8");
    expect(controller).toContain("CLINIC_CARE_SCHEMA_MISS");
    expect(controller).toContain("ServiceUnavailableException");
  });

  it("H — no second Clinic sidebar; nursing page has no left nav fork", () => {
    const shell = read("ClinicCareShell.tsx");
    expect(shell).toContain("ClinicCareTopNav");
    expect(shell).not.toContain("ClinicCareSideNav");
    expect(existsSync(join(featureDir, "ClinicCareSideNav.tsx"))).toBe(false);
    const nursing = read("ClinicCareNursingWorkspaceView.tsx");
    expect(nursing).not.toMatch(/SideNav|leftNav|secondaryNav/i);
  });
});
