/**
 * D4A.2.2 — Boundary: Admission Review workspace, status messaging, simulation (no DB).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hospitalAdmissionReviewPath } from "./hospitalCarePaths";

const root = join(__dirname);

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("MEDUI.ADMISSION_WORKFLOW_VISIBILITY.D4A2_2 boundary", () => {
  it("review path is admissions/review (not census, IP, or placement board)", () => {
    expect(hospitalAdmissionReviewPath("enc-1")).toBe(
      "/app/hospitalisation/admissions/review/enc-1"
    );
    expect(hospitalAdmissionReviewPath("enc-1")).not.toContain("placement-queue");
    expect(hospitalAdmissionReviewPath("enc-1")).not.toContain("inpatient");
  });

  it("Admission Review workspace is read-only with edit link + timeline + simulation", () => {
    const src = read("AdmissionReviewWorkspaceView.tsx");
    expect(src).toContain("admission-review-workspace");
    expect(src).toContain("admission-workflow-timeline");
    expect(src).toContain("admission-package-preview");
    expect(src).toContain("admission-simulation-controls");
    expect(src).toContain("buildAdmissionWorkflowVisibilityModel");
    expect(src).not.toContain("/internal-placement/draft");
    expect(src).toContain("editDecision");
    expect(src).toContain("simulationStage");
  });

  it("direct admission intake surfaces facility mismatch before impossible submit", () => {
    const intake = read("HospitalAdmissionIntakeView.tsx");
    expect(intake).toContain("registeredAtAnotherFacility");
    expect(intake).toContain("admission-patient-facility-mismatch");
    expect(intake).toContain("patientFacilityMismatch");
    expect(intake).toContain("PATIENT_NOT_FOUND_IN_FACILITY");
    expect(intake).toContain("eligibleAtFacility");
  });

  it("post-SIGN navigates to Admission Review and avoids false Admission Submitted copy", () => {
    const panel = read("../emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("hospitalAdmissionReviewPath");
    expect(panel).toContain("router.push(hospitalAdmissionReviewPath(encounterId))");
    expect(panel).toContain("signAdmissionOkPlacementOn");
    expect(panel).not.toMatch(/Admission Submitted/);
    expect(panel).not.toMatch(/Admission signed and submitted/);
  });

  it("EN/FR status messaging keys stay mirrored (no vague submitted wording)", () => {
    const en = read("../../i18n/messages/admissionWorkflowVisibility.en.ts");
    const fr = read("../../i18n/messages/admissionWorkflowVisibility.fr.ts");
    for (const key of [
      "DECISION_SIGNED_NO_PLACEMENT",
      "PLACEMENT_REQUESTED_WAITING_BED",
      "BED_ASSIGNED_WAITING_RECEIVING",
      "ARRIVED_INPATIENT_CREATED",
      "ADMISSION_CANCELLED",
      "simulation",
      "editDecision",
      "signedNoPlacement",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
    expect(en).not.toMatch(/Admission Submitted/);
    expect(fr).not.toMatch(/Admission Submitted/);

    const enDisp = readFileSync(join(root, "../../i18n/messages/en.ts"), "utf8");
    const frDisp = readFileSync(join(root, "../../i18n/messages/fr.ts"), "utf8");
    expect(enDisp).toContain("signAdmissionOkPlacementOn");
    expect(frDisp).toContain("signAdmissionOkPlacementOn");
    expect(enDisp).toContain("admissionWorkflowVisibilityEn");
    expect(frDisp).toContain("admissionWorkflowVisibilityFr");
  });

  it("page route mounts Admission Review workspace", () => {
    const page = readFileSync(
      join(
        root,
        "../../../app/app/hospitalisation/admissions/review/[encounterId]/page.tsx"
      ),
      "utf8"
    );
    expect(page).toContain("AdmissionReviewWorkspaceView");
  });
});
