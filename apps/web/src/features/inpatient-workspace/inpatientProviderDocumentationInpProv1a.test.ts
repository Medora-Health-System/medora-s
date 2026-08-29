/**
 * INP.PROV.1A — navigation / auth / hardening source-level regressions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  INPATIENT_NURSING_STICKY_NAV_SECTIONS,
  INPATIENT_PROVIDER_STICKY_NAV_SECTIONS,
  parseInpatientWorkspaceSection,
  stickyNavSectionsForInpatientRole,
} from "./inpatientWorkspaceSections";

const root = join(__dirname);

describe("INP.PROV.1A provider documentation navigation", () => {
  it("PROVIDER sticky includes Provider Documentation after Summary; nursing does not", () => {
    const providerIds = INPATIENT_PROVIDER_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(providerIds).toContain("providerDocumentation");
    expect(providerIds.indexOf("providerDocumentation")).toBeGreaterThan(
      providerIds.indexOf("summary")
    );
    expect(INPATIENT_NURSING_STICKY_NAV_SECTIONS.map((s) => s.id)).not.toContain(
      "providerDocumentation"
    );
  });

  it("role sticky builder hides board from RN/TECH/PCT", () => {
    expect(
      stickyNavSectionsForInpatientRole({
        workspaceRole: "NURSING",
        roles: ["RN"],
      }).map((s) => s.id)
    ).not.toContain("providerDocumentation");
    expect(
      stickyNavSectionsForInpatientRole({
        workspaceRole: "TECHNICIAN",
        roles: ["TECH"],
      }).map((s) => s.id)
    ).not.toContain("providerDocumentation");
    expect(
      stickyNavSectionsForInpatientRole({
        workspaceRole: "TECHNICIAN",
        roles: ["PCT"],
      }).map((s) => s.id)
    ).not.toContain("providerDocumentation");
    expect(
      stickyNavSectionsForInpatientRole({
        workspaceRole: "PROVIDER",
        roles: ["PROVIDER"],
      }).map((s) => s.id)
    ).toContain("providerDocumentation");
    expect(
      stickyNavSectionsForInpatientRole({
        workspaceRole: "CHART",
        roles: ["ADMIN"],
      }).map((s) => s.id)
    ).toContain("providerDocumentation");
  });

  it("parses providerDocumentation deep link", () => {
    expect(parseInpatientWorkspaceSection("providerDocumentation")).toBe("providerDocumentation");
    expect(parseInpatientWorkspaceSection("provider-docs")).toBe("providerDocumentation");
  });

  it("ActiveWorkspaceView uses role-aware sticky + view gate", () => {
    const view = readFileSync(join(root, "InpatientActiveWorkspaceView.tsx"), "utf8");
    expect(view).toContain("stickyNavSectionsForInpatientRole");
    expect(view).toContain("canViewInpatientProviderDocumentationBoard");
    expect(view).toContain("isInpatientProviderDocumentationAuthoringSection");
  });

  it("WorkspacePanel mounts Provider Documentation board and AUTHOR requires PROVIDER", () => {
    const panel = readFileSync(join(root, "InpatientWorkspacePanel.tsx"), "utf8");
    expect(panel).toContain("InpatientProviderDocumentationBoard");
    expect(panel).toContain("canAuthorInpatientProviderDocumentation");
    expect(panel).toContain('case "providerDocumentation"');
  });

  it("board mounts INP.PROV.1B workspace; ADMIN view-only; durable engines reused (no second store)", () => {
    const board = readFileSync(join(root, "InpatientProviderDocumentationBoard.tsx"), "utf8");
    expect(board).toContain("InpatientProviderDocumentationWorkspaceInpProv1b");
    expect(board).toContain("canAuthorInpatientProviderDocumentation");
    expect(board).toContain("inp-prov-1a-view-only");
    expect(board).not.toContain("procedure_note");
    expect(board).not.toContain("carryForwardText");
    expect(board).not.toContain("inp-prov-1a-carry-forward");
    const workspace = readFileSync(
      join(root, "InpatientProviderDocumentationWorkspaceInpProv1b.tsx"),
      "utf8"
    );
    expect(workspace).toContain("InpatientProviderWorkspacePanel");
    // Consults stay in the clinical-ops surface: the 1B note workspace only authors Progress/H&P.
    expect(workspace).not.toContain("InpatientClinicalOpsPanel");
    expect(workspace).toContain("CreateOrderModal");
    expect(workspace).toContain("saveProviderProgressNote");
    expect(workspace).toContain("signProviderProgressNote");
    const panel = readFileSync(join(root, "InpatientProviderWorkspacePanel.tsx"), "utf8");
    // INP.PROV.1C: H&P draft fields remain dictation-ready; ROS/exam use per-system mics.
    expect(panel).toContain("data-dictation-ready");
    expect(panel).toContain("inp-prov-hp-draft");
    expect(panel).toContain("InpatientHpSystemFindingsEditorInpProv1c");
    expect(panel).toContain("serializeInpatientHpSystemsDocument");
    expect(panel).not.toContain("ClinicalNormalExceptionSelector");
    expect(panel).toContain("inp-prov-progress-today");
    expect(panel).toContain("inp-prov-problem-assessment");
    expect(panel).toContain("inp-prov-problem-plan");
  });

  it("ClinicalOpsPanel consults honor canWrite for request/ack/complete", () => {
    const ops = readFileSync(join(root, "InpatientClinicalOpsPanel.tsx"), "utf8");
    expect(ops).toContain("canWrite = true");
    expect(ops).toContain("ip-ops-consults-readonly");
    expect(ops).toContain("ip-ops-consults-writable");
    expect(ops).toContain("ip-ops-request-consult");
    expect(ops).toContain("ip-ops-ack-consult");
    expect(ops).toContain("ip-ops-complete-consult");
    expect(ops).toContain("if (!canWrite) return");
    expect(ops).toContain("canWrite && c.status === \"REQUESTED\"");
    expect(ops).toContain("{canWrite ? (");
  });

  it("Summary projects canonical provider documentation metadata without a second store", () => {
    const summary = readFileSync(
      join(root, "InpatientEncounterMedicalRecordSummaryView.tsx"),
      "utf8"
    );
    expect(summary).toMatch(/progressNotes|H&P/);
    expect(summary).not.toContain("InpatientProviderDocumentationBoard");
  });
});
