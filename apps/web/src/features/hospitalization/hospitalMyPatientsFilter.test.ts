import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOSPITAL_BOARD_VIEW_TABS,
  filterHospitalBoardRows,
  hospitalAssignmentProjectionFromSummary,
  isHospitalCareTechAssigner,
} from "./hospitalMyPatientsFilter";
import {
  ENTERPRISE_HOSPITAL_ASSIGNMENT_BAG_KEY,
  emptyHospitalAssignmentBag,
  mergeHospitalAssignmentBagIntoSummary,
} from "@medora/shared";

describe("hospitalMyPatientsFilter D4A.3.0-H1", () => {
  it("tabs include My Patients default set", () => {
    expect(HOSPITAL_BOARD_VIEW_TABS[0]).toBe("myPatients");
    expect(HOSPITAL_BOARD_VIEW_TABS).toContain("allPatients");
    expect(HOSPITAL_BOARD_VIEW_TABS).toContain("incompleteCharts");
    expect(HOSPITAL_BOARD_VIEW_TABS).toContain("unassignedPatients");
  });

  it("projection ignores ED-like fields outside bag", () => {
    const summary = mergeHospitalAssignmentBagIntoSummary(
      { physicianAssignedUserId: "ed-md" },
      emptyHospitalAssignmentBag("OBSERVATION")
    );
    const p = hospitalAssignmentProjectionFromSummary(summary);
    expect(p.providerUnassigned).toBe(true);
    expect(summary).toHaveProperty(ENTERPRISE_HOSPITAL_ASSIGNMENT_BAG_KEY);
  });

  it("filters my patients and unassigned", () => {
    const rows = [
      { encounterId: "a", providerUserId: "u1", nurseUserId: null, technicianUserId: null },
      { encounterId: "b", providerUserId: null, nurseUserId: null, technicianUserId: null },
    ];
    const mine = filterHospitalBoardRows(rows, "myPatients", {
      currentUserId: "u1",
      roles: ["PROVIDER"],
    });
    expect(mine.map((r) => r.encounterId)).toEqual(["a"]);
    const unassigned = filterHospitalBoardRows(rows, "unassignedPatients", {
      currentUserId: "u1",
      roles: ["PROVIDER"],
    });
    expect(unassigned.map((r) => r.encounterId)).toEqual(["b"]);
  });

  it("incomplete charts is not a My Patients alias", () => {
    const rows = [
      {
        encounterId: "assigned-ok",
        providerUserId: "u1",
        alerts: [] as Array<{ code: string }>,
      },
      {
        encounterId: "assigned-ready",
        providerUserId: "u1",
        alerts: [{ code: "READY_DISCHARGE" }],
      },
      {
        encounterId: "assigned-reassess-only",
        providerUserId: "u1",
        alerts: [{ code: "REASSESSMENT_OVERDUE" }],
      },
      {
        encounterId: "unassigned-ready",
        providerUserId: null,
        alerts: [{ code: "READY_DISCHARGE" }],
      },
    ];
    const mine = filterHospitalBoardRows(rows, "myPatients", {
      currentUserId: "u1",
      roles: ["PROVIDER"],
    });
    expect(mine.map((r) => r.encounterId).sort()).toEqual([
      "assigned-ok",
      "assigned-ready",
      "assigned-reassess-only",
    ]);
    const incomplete = filterHospitalBoardRows(rows, "incompleteCharts", {
      currentUserId: "u1",
      roles: ["PROVIDER"],
    });
    expect(incomplete.map((r) => r.encounterId)).toEqual(["assigned-ready"]);
  });

  it("care-tech assigner is PATIENT_CARE_TECH not LAB/RAD", () => {
    expect(isHospitalCareTechAssigner(["PATIENT_CARE_TECH"])).toBe(true);
    expect(isHospitalCareTechAssigner(["LAB"])).toBe(false);
    expect(isHospitalCareTechAssigner(["RADIOLOGY"])).toBe(false);
    expect(isHospitalCareTechAssigner(["ADMIN"])).toBe(true);
  });

  it("Provider Census board renamed to My Patients in UI + i18n", () => {
    const root = join(__dirname, "..", "inpatient-workspace");
    const board = readFileSync(join(root, "ProviderCensusBoard.tsx"), "utf8");
    expect(board).toContain("enterpriseHospitalAssignmentD4a30.myPatients");
    expect(board).toContain('tab === "myPatients"');
    expect(board).toContain("filterMyIncompleteChartsEncountersEnterprise");
    expect(board).not.toContain('includes("LAB")');
    const en = readFileSync(
      join(__dirname, "../../i18n/messages/providerClinicalSynthesisD4a26a.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(__dirname, "../../i18n/messages/providerClinicalSynthesisD4a26a.fr.ts"),
      "utf8"
    );
    expect(en).toContain('title: "My Patients"');
    expect(fr).toContain('title: "Mes patients"');
  });
});
