/**
 * MEDUI.INP.2C.1 — Nursing Assessment workflow restoration gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  projectClinicalDocumentationSummaryLines,
  projectDevicesOverviewFromAuthorities,
} from "./projectNursingClinicalDocumentationSummary";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const board = read("../clinical-documentation/NursingDocumentationBoard.tsx");
const panel = read("InpatientNursingAssessmentPanel.tsx");
const overview = read("InpatientOverviewView.tsx");
const projector = read("projectInpatientOverview.ts");
const providerPanel = read("InpatientProviderWorkspacePanel.tsx");
const edNursing = read("../emergency/EmergencyNursingDocumentationGrid.tsx");
const obsPanel = existsSync(join(root, "../observation-workspace/ObservationWorkspacePanel.tsx"))
  ? read("../observation-workspace/ObservationWorkspacePanel.tsx")
  : "";

describe("MEDUI.INP.2C.1 nursing assessment workflow restoration", () => {
  it("A-B — historical columns + sticky Clinical Finding", () => {
    expect(board).toContain("nursing-column-historical");
    expect(board).toContain('data-testid="nursing-clinical-finding-header"');
    expect(board).toContain('position: "sticky"');
    expect(board).toContain("nursing-board-scroll");
    expect(board).toContain("overflowX");
  });

  it("C — saved columns immutable (aria-readonly historical)", () => {
    expect(board).toContain("aria-readonly={!isDraft}");
    expect(board).toContain("nursing-column-historical");
  });

  it("D-E — Add Column + dropdown selects for catalog findings", () => {
    expect(board).toContain("onNew");
    expect(board).toContain("nursing-select-");
    expect(board).toContain("<select");
    expect(board).not.toContain("nursing-rapid-chips-");
  });

  it("F-G — Copy Previous + field-level copied marker clear", () => {
    expect(board).toContain("onCopyPrevious");
    expect(board).toContain("copiedFieldIds");
    expect(panel).toContain("next.delete(id)");
    expect(panel).toContain("copiedVerify");
  });

  it("H-I — Discard draft + Save assessment endpoints", () => {
    expect(board).toContain("nursing-discard-draft");
    expect(panel).toContain("/inpatient-nursing-assessments");
    expect(panel).toContain("status: \"SAVED\"");
  });

  it("J — clinicalDocumentedAt shared by assessment draft and nursing note", () => {
    expect(panel).toContain("nursing-clinical-documented-at");
    expect(panel).toContain("clinicalDocumentedAt");
    expect(panel).toContain("nursing-note-section");
    expect(panel).toContain("nursing-note-save");
    expect(board).not.toContain("nursing-clinical-documented-at");
  });

  it("K-L — Nursing Summary uses assessment + Clinical Documentation projection", () => {
    expect(panel).toContain("buildSummaryLines");
    expect(panel).toContain("projectClinicalDocumentationSummaryLines");
    expect(panel).toContain("fetchClinicalDocumentationEntries");
    expect(panel).toContain("onEntriesChanged");
    const lines = projectClinicalDocumentationSummaryLines({
      entries: [
        {
          cardId: "io_summary",
          createdAt: new Date().toISOString(),
          payloadJson: { totalIntakeMl: 1000, totalOutputMl: 400 },
        },
      ],
      ivActive: [{ site: "Left forearm", gauge: "20G" }],
    });
    expect(lines.some((l) => /Intake & Output|Entrées et sorties/.test(l))).toBe(true);
    expect(lines.some((l) => /Lines \/ Drains \/ Devices|Voies/.test(l))).toBe(true);
  });

  it("M-N — Overview projects assessment + Clinical Docs devices; no duplicate persistence", () => {
    expect(overview).toContain("overview-nursing-assessment-projection");
    expect(overview).toContain("overview-io");
    expect(overview).toContain("overview-devices");
    expect(projector).toContain("devicesProjection");
    expect(providerPanel).toContain("projectDevicesOverviewFromAuthorities");
    expect(panel).not.toMatch(/structuredFindings[\s\S]*totalIntakeMl/);
    const devices = projectDevicesOverviewFromAuthorities({
      entries: [],
      ivActive: [{ site: "RAC", gauge: "18G" }],
    });
    expect(devices.availability).toBe("READY");
    expect(devices.lines.length).toBeGreaterThan(0);
  });

  it("O-Q — roles: provider read-only gate strings; RN/ADMIN write path present", () => {
    expect(panel).toContain("readOnly");
    expect(panel).toContain("isLocked");
    const api = readFileSync(
      join(root, "../../../../api/src/encounters/encounters.controller.ts"),
      "utf8",
    );
    expect(api).toMatch(
      /inpatient-nursing-assessments[\s\S]*?@RequireRoles\([\s\S]*?RoleCode\.RN[\s\S]*?RoleCode\.ADMIN/,
    );
  });

  it("R — EN/FR board keys mirrored", () => {
    const enBoard = (en as Record<string, unknown>).inpatientNursingAssessmentInp2c as {
      board: Record<string, string>;
    };
    const frBoard = (fr as Record<string, unknown>).inpatientNursingAssessmentInp2c as {
      board: Record<string, string>;
    };
    expect(Object.keys(enBoard.board).sort()).toEqual(Object.keys(frBoard.board).sort());
    expect(frBoard.board.notCharted).toMatch(/Non documenté/);
  });

  it("S-T — ED / Observation nursing not coupled to INP.2C.1 rail or chips", () => {
    expect(edNursing).not.toContain("NursingAssessmentContextRail");
    expect(edNursing).not.toContain("nursing-rapid-chips-");
    if (obsPanel) {
      expect(obsPanel).not.toContain("NursingAssessmentContextRail");
    }
    expect(panel).not.toContain("EmergencyNursing");
  });

  it("layout — board left + sticky summary rail; note full-width below; no Assessment Context rail", () => {
    expect(panel).not.toContain("NursingAssessmentContextRail");
    expect(panel).not.toContain("minmax(260px, 1fr)");
    expect(panel).toContain("minmax(0, 1fr) minmax(360px, 400px)");
    expect(panel).toContain('data-testid="nursing-summary-sidebar"');
    expect(panel).toContain('data-testid="nursing-note-section"');
    expect(panel).toContain("nursing-open-io");
    expect(panel).toContain("nursing-open-devices");
    expect(board).not.toContain('data-testid="nursing-summary-sidebar"');
    expect(existsSync(join(root, "NursingAssessmentContextRail.tsx"))).toBe(false);
  });
});
