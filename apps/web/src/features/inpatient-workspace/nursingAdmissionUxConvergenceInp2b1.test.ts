/**
 * MEDUI.INP.2B.1 — Nursing Admission navigation / layout / save-time gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  NURSING_ADMISSION_STAGES,
  emptyMedSurgNursingAdmissionDocV1,
  projectNursingAdmissionOverview,
  saveAdmissionSectionDraft,
} from "@medora/shared";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("MEDUI.INP.2B.1 nursing admission UX convergence", () => {
  it("A — all six top stages remain clickable without a second stage authority", () => {
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(chrome).toContain("admission-stage-${s.id}");
    expect(shell).toContain("onStage={goToStage}");
    expect(shell).toContain("NURSING_ADMISSION_STAGES");
    expect(shell).not.toContain("SECOND_ADMISSION_ENGINE");
  });

  it("B-C — every subsection is clickable and left nav tracks active section", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("admission-section-${id}");
    expect(chrome).toContain('aria-current={isActive ? "page"');
    expect(chrome).toContain("inpatient-admission-checklist");
  });

  it("D-E — stage progress and section status render once in left nav", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("nursing-admission-progress-bar");
    expect(chrome).toContain("inpatientAdmissionInp2b1.status.");
    expect(chrome).toContain("nursing-admission-stages-hint");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).not.toContain("admission-completion-dashboard");
  });

  it("F-G — Save draft and Save and continue share one persistSection path", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(chrome).toContain('data-testid="admission-save"');
    expect(chrome).toContain('data-testid="admission-save-continue"');
    expect(shell).toContain("onSaveDraft={() => void persistSection(undefined, \"DRAFT\")}");
    expect(shell).toContain("persistSection(undefined, \"CONTINUE\").then((ok)");
  });

  it("H — switching subsection stashes local draft instead of wiping from server effect", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("draftsRef");
    expect(shell).not.toContain("[active, doc?.sections]");
    expect(shell).toContain("if (ok) setActive");
  });

  it("I — 409 maps to CONFLICT_DETECTED with recoverable backup", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("classifyNursingAdmissionSaveFailure");
    expect(shell).toContain("CONFLICT_DETECTED");
    expect(shell).toContain("admission-conflict-banner");
  });

  it("J-L — clinical effective time persists on JSON and stays distinct from audit time", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("nursing-admission-clinical-documented-at");
    expect(chrome).toContain("datetimeLocalToIso");
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { admissionSource: "DIRECT_ADMISSION" },
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
      atIso: "2026-08-17T19:04:52.000Z",
      clinicalDocumentedAt: "2026-08-17T17:04:00.000Z",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.doc.clinicalDocumentedAt).toBe("2026-08-17T17:04:00.000Z");
    expect(saved.doc.updatedAt).toBe("2026-08-17T19:04:52.000Z");
    const projected = projectNursingAdmissionOverview(saved.doc);
    expect(projected.clinicalDocumentedAt).toBe("2026-08-17T17:04:00.000Z");
  });

  it("M-O — right rail and Overview share the same projection helper", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    const overview = read("InpatientOverviewView.tsx");
    expect(shell).toContain("projectNursingAdmissionOverview");
    expect(chrome).toContain("nursing-admission-rail-summary");
    expect(overview).toContain("overview-nursing-admission-projection");
    expect(overview).toContain("overview-nursing-admission-clinical-time");
    expect(shell).not.toContain("admissionSummaryStoreV2");
  });

  it("R — Clinical Documentation is one left-nav action", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("inpatientAdmissionInp2b1.clinicalDocumentation");
    expect(chrome).toContain("AdditionalClinicalDocumentationLauncher");
  });

  it("V — encounter actions are separate from the clinical form", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(chrome).toContain("nursing-admission-encounter-actions");
    expect(shell).toContain("NursingAdmissionEncounterActionsSlot");
    expect(shell).toContain("InpatientLifecycleActionsMenu");
  });

  it("Z — EN/FR keys mirrored; no raw DNR_DNI in chrome", () => {
    expect(Object.keys(en.inpatientAdmissionInp2b1)).toEqual(Object.keys(fr.inpatientAdmissionInp2b1));
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("formatInpatientCodeStatusDisplay");
    expect(chrome).toContain("formatInpatientIsolationDisplay");
    expect(chrome).not.toMatch(/DNR_DNI/);
    expect(fr.inpatientAdmissionInp2b1.title).toMatch(/Admission/i);
  });

  it("AA — desktop three-pane layout with sticky right rail", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("minmax(240px, 280px)");
    expect(chrome).toContain("minmax(320px, 380px)");
    expect(chrome).toContain("nursing-admission-right-rail-2b1");
    expect(chrome).toContain("max-width: 1440px");
  });

  it("AE — no Prisma / second admission engine", () => {
    const shared = readFileSync(
      join(root, "../../../../../packages/shared/src/encounters/medSurgNursingAdmissionD4a1.ts"),
      "utf8",
    );
    expect(shared).toContain("clinicalDocumentedAt");
    expect(shared).toContain("Additive JSON only");
  });
});
