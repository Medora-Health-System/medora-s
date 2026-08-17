/**
 * MEDUI.INP.2B — Nursing admission enterprise rapid-documentation gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  NURSING_ADMISSION_STAGES,
  ADMISSION_SOURCE_RAPID_OPTIONS,
  MODE_OF_ARRIVAL_RAPID_OPTIONS,
  CONDITION_ON_ARRIVAL_RAPID_OPTIONS,
  projectNursingAdmissionOverview,
  emptyMedSurgNursingAdmissionDocV1,
} from "@medora/shared";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("MEDUI.INP.2B nursing admission rapid documentation", () => {
  it("A1 stages remain six and cover all clinical sections", () => {
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    const keys = NURSING_ADMISSION_STAGES.flatMap((s) => [...s.sectionKeys]);
    expect(keys).toContain("OVERVIEW");
    expect(keys).toContain("FALL_SAFETY");
    expect(keys).toContain("PROVIDER_ADMISSION");
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("A2 Save Draft / Save & Continue controls remain in shell", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain('data-testid="admission-save"');
    expect(shell).toContain('data-testid="admission-save-continue"');
    expect(shell).toContain("inpatientRapidConvergenceD4a27c.nav.previous");
    expect(shell).toContain("computeAdmissionCompletionSummary");
  });

  it("B5–B7 rapid arrival catalogs persist canonical codes without unsafe defaults", () => {
    expect(ADMISSION_SOURCE_RAPID_OPTIONS.map((o) => o.code)).toContain("EMERGENCY_DEPARTMENT");
    expect(MODE_OF_ARRIVAL_RAPID_OPTIONS.map((o) => o.code)).toContain("PRIVATE_VEHICLE");
    expect(CONDITION_ON_ARRIVAL_RAPID_OPTIONS.map((o) => o.code)).toEqual([
      "STABLE",
      "GUARDED",
      "SERIOUS",
      "CRITICAL",
      "UNABLE_TO_DETERMINE",
    ]);
    expect(CONDITION_ON_ARRIVAL_RAPID_OPTIONS.every((o) => Boolean(o.displayFr))).toBe(true);
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).toContain("ADMISSION_SOURCE_RAPID_OPTIONS");
    expect(rapid).toContain("CONDITION_ON_ARRIVAL_RAPID_OPTIONS");
    expect(rapid).toContain('data-testid="rapid-overview-arrival"');
    expect(rapid).not.toContain("catalogAsOptions");
    expect(rapid).not.toMatch(/set\("admissionSource",\s*"EMERGENCY/);
    expect(rapid).toContain("OTHER");
  });

  it("C8–C12 enterprise fork suppressions and domain projections", () => {
    const form = read("NursingAdmissionStructuredSectionForm.tsx");
    expect(form).toContain('SUPPRESSED_ENTERPRISE_FORK_FIELDS = new Set(["codeStatus", "isolationStatus"])');
    expect(form).toContain("CLINICAL_HELP_FIELD_KEYS");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("resolveAuthoritativeCodeStatus");
    expect(shell).toContain("resolveAuthoritativeIsolation");
    expect(shell).toContain("NursingAdmissionContextRail");
  });

  it("D13–D15 RN write / provider read / platform-admin boundary", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain('readOnly={!(roles.includes("RN") || roles.includes("ADMIN"))}');
    const api = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.controller.ts"),
      "utf8",
    );
    expect(api).toMatch(
      /nursing-admission\/sections[\s\S]*?@RequireRoles\(RoleCode\.RN, RoleCode\.ADMIN\)/,
    );
    expect(api).toMatch(
      /nursing-admission\/sign[\s\S]*?@RequireRoles\(RoleCode\.RN, RoleCode\.ADMIN\)/,
    );
    expect(api).toContain('@Get("encounters/:encounterId/nursing-admission")');
  });

  it("E18–E24 Overview admission projection and deep link", () => {
    const empty = projectNursingAdmissionOverview(null);
    expect(empty.availability).toBe("EMPTY");
    const doc = emptyMedSurgNursingAdmissionDocV1({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
    });
    doc.sections.OVERVIEW = {
      ...doc.sections.OVERVIEW!,
      answers: {
        admissionSource: "DIRECT_ADMISSION",
        modeOfArrival: "AMBULATORY",
      },
    };
    const projected = projectNursingAdmissionOverview(doc);
    expect(projected.availability).toBe("READY");
    expect(projected.admissionSource).toBe("DIRECT_ADMISSION");
    const overview = read("InpatientOverviewView.tsx");
    expect(overview).toContain("overview-nursing-admission-projection");
    expect(overview).toContain('onNavigateSection?.("admission")');
    expect(overview).toContain('data-readonly="true"');
  });

  it("F25–F26 admission context rail is projection-only", () => {
    const rail = read("NursingAdmissionContextRail.tsx");
    expect(rail).toContain('data-persistence="none"');
    expect(rail).not.toContain("apiFetch");
    expect(rail).not.toContain("POST");
  });

  it("G27–G28 assessment remains separate; INP.1B.6 panel unchanged path", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("InpatientNursingAssessmentSection");
    expect(panel).toContain("InpatientAdmissionClinicalShell");
    expect(panel).not.toContain("EmergencyNursingReassessmentPanel");
  });

  it("H29–H31 EN/FR admission i18n mirrored without impl jargon", () => {
    expect(Object.keys(en.inpatientAdmissionInp2b)).toEqual(Object.keys(fr.inpatientAdmissionInp2b));
    expect(fr.inpatientAdmissionInp2b.overview.openAdmission).toMatch(/admission/i);
    expect(fr.inpatientAdmissionInp2b.rail.title).not.toMatch(/INP\.2B|D4A|JSON/i);
    expect(en.hospitalAdmissionD4a26h.status.legacySynthetic).not.toMatch(/legacy synthetic/i);
    expect(fr.hospitalAdmissionD4a26h.codeStatus.source).not.toMatch(/inpatientClinicalOps/i);
  });

  it("I32–I36 regression isolation markers", () => {
    const sections = read("inpatientWorkspaceSections.ts");
    expect(sections).not.toContain("EmergencyTrackboard");
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toContain("MedicationAdministrationTab");
    expect(rapid).not.toContain("EnterpriseInterdisciplinaryCarePlansD4b6");
    expect(rapid).not.toContain("dischargeLifecycle");
  });
});
