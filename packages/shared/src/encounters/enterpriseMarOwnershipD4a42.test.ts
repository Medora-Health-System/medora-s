/**
 * MEDUI.D4A.4.2 — characterization + unit tests for MAR ownership generalization.
 */
import { describe, expect, it } from "vitest";
import {
  emptyHospitalAssignmentBag,
  mergeHospitalAssignmentBagIntoSummary,
  type EnterpriseAssignmentSlotV1,
} from "./enterpriseAssignmentEngineD4a30.js";
import {
  collectMarNursingAssigneeEncounterIds,
  filterByMarNursingAssignee,
  marNursingOwnershipMatchesAssignee,
  projectMarNursingOwnership,
  resolveMarNursingOwnership,
  resolveMarOwnershipCompatibilityMode,
  ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION_CERTIFICATION_ID,
} from "./enterpriseMarOwnershipD4a42.js";
import { resolveActiveEncounterOwnership } from "./enterpriseEncounterOwnershipResolverD4a41.js";

function slot(userId: string, displayName?: string | null): EnterpriseAssignmentSlotV1 {
  return {
    userId,
    assignedAt: "2026-07-01T12:00:00.000Z",
    source: "SELF_ASSIGN",
    displayName: displayName ?? null,
  };
}

function hospitalSummary(
  careSetting: "OBSERVATION" | "INPATIENT",
  primaryRnUserId: string | null,
  displayName?: string | null
) {
  const bag = emptyHospitalAssignmentBag(careSetting);
  if (primaryRnUserId) {
    bag.workflow.PRIMARY_RN = slot(primaryRnUserId, displayName);
  }
  return mergeHospitalAssignmentBagIntoSummary({}, bag);
}

describe("MEDUI.D4A.4.2 — Enterprise MAR Ownership Generalization", () => {
  it("characterization: inpatient MAR uses PRIMARY_RN not ED receiving nurse", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "ed-receiving-rn",
      physicianAssignedUserId: "ed-md",
      admissionSummaryJson: hospitalSummary("INPATIENT", "ip-primary-rn", "IP RN"),
    });
    expect(mar.assignedNurseUserId).toBe("ip-primary-rn");
    expect(mar.assignedNurseDisplayName).toBe("IP RN");
    expect(mar.source).toBe("HOSPITAL_ASSIGNMENT_BAG");
    expect(mar.careSetting).toBe("INPATIENT");
    expect(mar.certification).toBe(ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION_CERTIFICATION_ID);
  });

  it("characterization: observation uses bag PRIMARY_RN with Encounter.type INPATIENT", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "ed-rn",
      admissionSummaryJson: hospitalSummary("OBSERVATION", "obs-rn"),
    });
    expect(mar.careSetting).toBe("OBSERVATION");
    expect(mar.assignedNurseUserId).toBe("obs-rn");
  });

  it("characterization: emergency still uses ED nurse column", () => {
    const mar = resolveMarNursingOwnership({
      type: "EMERGENCY",
      nurseAssignedUserId: "ed-rn-1",
      admissionSummaryJson: hospitalSummary("INPATIENT", "should-not-win"),
    });
    expect(mar.careSetting).toBe("EMERGENCY");
    expect(mar.assignedNurseUserId).toBe("ed-rn-1");
    expect(mar.source).toBe("ED_ENCOUNTER_COLUMNS");
  });

  it("characterization: STRICT empty bag → unassigned even when ED columns populated", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "legacy-ed-rn",
      admissionSummaryJson: hospitalSummary("INPATIENT", null),
      compatibilityMode: "STRICT",
    });
    expect(mar.assignedNurseUserId).toBeNull();
    expect(mar.assignmentStatus).toBe("UNASSIGNED");
    expect(mar.isLegacyFallback).toBe(false);
  });

  it("characterization: STRICT missing bag → unresolved / null assignee", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "legacy-ed-rn",
      admissionSummaryJson: {},
      compatibilityMode: "STRICT",
    });
    expect(mar.assignedNurseUserId).toBeNull();
    expect(["UNASSIGNED", "UNRESOLVED"]).toContain(mar.assignmentStatus);
  });

  it("characterization: LEGACY_COMPATIBILITY surfaces labeled ED fallback", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "legacy-ed-rn",
      admissionSummaryJson: hospitalSummary("INPATIENT", null),
      compatibilityMode: "LEGACY_COMPATIBILITY",
    });
    expect(mar.assignedNurseUserId).toBe("legacy-ed-rn");
    expect(mar.isLegacyFallback).toBe(true);
    expect(mar.source).toBe("LEGACY_ED_COLUMNS_COMPATIBILITY");
  });

  it("compatibility mode helper defaults STRICT; only explicit LEGACY", () => {
    expect(resolveMarOwnershipCompatibilityMode(undefined)).toBe("STRICT");
    expect(resolveMarOwnershipCompatibilityMode("")).toBe("STRICT");
    expect(resolveMarOwnershipCompatibilityMode("strict")).toBe("STRICT");
    expect(resolveMarOwnershipCompatibilityMode("LEGACY_COMPATIBILITY")).toBe(
      "LEGACY_COMPATIBILITY"
    );
  });

  it("BREAK_RN slot does not replace PRIMARY_RN for MAR nursing ownership", () => {
    const bag = emptyHospitalAssignmentBag("INPATIENT");
    bag.workflow.PRIMARY_RN = slot("primary-rn");
    bag.workflow.BREAK_RN = slot("break-rn");
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "ed-rn",
      admissionSummaryJson: mergeHospitalAssignmentBagIntoSummary({}, bag),
    });
    expect(mar.assignedNurseUserId).toBe("primary-rn");
    expect(mar.ownership.breakNurse.userId).toBe("break-rn");
  });

  it("assignee filter matches hospital PRIMARY_RN not ED column", () => {
    const fields = {
      type: "INPATIENT" as const,
      nurseAssignedUserId: "ed-receiving-rn",
      admissionSummaryJson: hospitalSummary("INPATIENT", "ip-rn"),
    };
    expect(marNursingOwnershipMatchesAssignee(fields, "ip-rn")).toBe(true);
    expect(marNursingOwnershipMatchesAssignee(fields, "ed-receiving-rn")).toBe(false);
  });

  it("collectMarNursingAssigneeEncounterIds batches pure map", () => {
    const ids = collectMarNursingAssigneeEncounterIds(
      [
        {
          id: "e1",
          type: "INPATIENT",
          nurseAssignedUserId: "ed-rn",
          admissionSummaryJson: hospitalSummary("INPATIENT", "rn-a"),
        },
        {
          id: "e2",
          type: "EMERGENCY",
          nurseAssignedUserId: "rn-a",
        },
        {
          id: "e3",
          type: "INPATIENT",
          nurseAssignedUserId: "ed-rn",
          admissionSummaryJson: hospitalSummary("INPATIENT", "rn-b"),
        },
      ],
      "rn-a"
    );
    expect(ids.sort()).toEqual(["e1", "e2"]);
  });

  it("filterByMarNursingAssignee preserves non-matching exclusion", () => {
    const rows = [
      { doseId: "d1", nurseAssignedUserId: "ed", bagRn: "rn-1" },
      { doseId: "d2", nurseAssignedUserId: "ed", bagRn: "rn-2" },
    ];
    const filtered = filterByMarNursingAssignee(
      rows,
      (r) => ({
        type: "INPATIENT",
        nurseAssignedUserId: r.nurseAssignedUserId,
        admissionSummaryJson: hospitalSummary("INPATIENT", r.bagRn),
      }),
      "rn-1"
    );
    expect(filtered.map((r) => r.doseId)).toEqual(["d1"]);
  });

  it("projectMarNursingOwnership does not mutate historical authorship concepts", () => {
    // Contract: MAR ownership projection only reads primaryNurse — never admin fields.
    const ownership = resolveActiveEncounterOwnership({
      type: "EMERGENCY",
      nurseAssignedUserId: "ed-rn",
    });
    const mar = projectMarNursingOwnership(ownership);
    expect(mar.assignedNurseUserId).toBe("ed-rn");
    expect(Object.keys(mar).sort()).toEqual(
      [
        "assignedNurseDisplayName",
        "assignedNurseUserId",
        "assignmentStatus",
        "careSetting",
        "certification",
        "compatibilityMode",
        "isLegacyFallback",
        "ownership",
        "ownershipResolverCertification",
        "source",
      ].sort()
    );
  });

  it("due/overdue timing is independent of ownership projection (contract)", () => {
    // Ownership resolve does not accept or return due windows / dose status.
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      admissionSummaryJson: hospitalSummary("INPATIENT", "rn-1"),
    });
    expect(mar).not.toHaveProperty("dueWindowStartAt");
    expect(mar).not.toHaveProperty("doseStatus");
    expect(mar).not.toHaveProperty("overdue");
  });
});
