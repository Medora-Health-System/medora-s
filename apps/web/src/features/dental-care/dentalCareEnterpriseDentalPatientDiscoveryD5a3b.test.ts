import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A1_FORBIDDEN_AUTHORITIES,
  patientSearchQueryIsEligible,
} from "@medora/shared";

const featureDir = join(__dirname);
const dashboard = readFileSync(join(featureDir, "DentalCareDashboardView.tsx"), "utf8");
const sidebarIcons = readFileSync(
  join(featureDir, "../../components/app-shell/SidebarNavIcons.tsx"),
  "utf8"
);
const identityRule = readFileSync(
  join(featureDir, "../../../../../.cursor/rules/enterprise-patient-facility-identity-invariant.mdc"),
  "utf8"
);

describe("MEDUI.D5A.3B enterprise Dental patient discovery & safe encounter launch", () => {
  it("reuses PatientSearchAndSelect + enterprise /patients/search (not free-text as Patient.id)", () => {
    expect(dashboard).toContain("PatientSearchAndSelect");
    expect(dashboard).toContain('testIdPrefix="dental-patient-search"');
    expect(dashboard).toContain("selectedPatient");
    expect(dashboard).toContain("selectedPatient?.id");
    expect(dashboard).toContain("clearSelectionOnQueryChange");
    expect(dashboard).toContain("onClearSelection");
    expect(dashboard).toMatch(
      /\/patients\/\$\{encodeURIComponent\(patientId\)\}\/encounters/
    );
    expect(dashboard).not.toMatch(/patientId\.trim\(\).*encounters/);
    expect(dashboard).not.toContain("setPatientId");
    expect(dashboard).not.toContain("patientIdPlaceholder");
    expect(dashboard).toContain('disabled={!canStart}');
    expect(dashboard).toContain("MEDUI.D5A.3B");
  });

  it("enforces min 3 chars via shared patientSearchQueryIsEligible", () => {
    expect(patientSearchQueryIsEligible("Du")).toBe(false);
    expect(patientSearchQueryIsEligible("Duk")).toBe(true);
    expect(patientSearchQueryIsEligible("  Je  ")).toBe(false);
    expect(patientSearchQueryIsEligible("Jese")).toBe(true);
  });

  it("forbids DentalPatient / DentalMRN / DentalRegistration forks", () => {
    expect(dashboard).not.toMatch(/\bDentalPatient\b/);
    expect(dashboard).not.toMatch(/\bDentalMRN\b/);
    expect(dashboard).not.toMatch(/\bDentalRegistration\b/);
    expect(D5A1_FORBIDDEN_AUTHORITIES).toContain("DentalPatient");
    expect(identityRule).toContain("ONE FACILITY");
    expect(identityRule).toContain("free-text");
    expect(identityRule).toContain("Patient.id");
  });

  it("preserves Dental worklist as encounter projection (not patient registry)", () => {
    expect(dashboard).toContain('/dental-care/worklist');
    expect(dashboard).toContain("dental-worklist-row");
    expect(dashboard).not.toContain("/dental/patients");
    expect(dashboard).not.toContain("/dental-care/patients");
  });

  it("replaces Dental sidebar question-mark fallback with tooth icon", () => {
    expect(sidebarIcons).toContain("IconDentalTooth");
    expect(sidebarIcons).toContain('data-testid="sidebar-icon-dental"');
    expect(sidebarIcons).toContain('/app/dental');
    expect(sidebarIcons).toMatch(/href\.startsWith\("\/app\/dental\/"\)/);
  });

  it("keeps enterprise Encounter create + Dental service-line tag flow", () => {
    expect(dashboard).toContain("buildDentalServiceLineTag");
    expect(dashboard).toContain("mergeDentalServiceLineIntoNursingAssessment");
    expect(dashboard).toContain('type: "OUTPATIENT"');
    expect(dashboard).toContain('roomLabel: "DENTAL"');
    expect(dashboard).toContain("enterpriseDentalEncounterWorkspacePath");
  });
});
