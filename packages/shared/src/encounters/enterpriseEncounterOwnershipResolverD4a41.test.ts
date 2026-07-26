/**
 * MEDUI.D4A.4.1 — Characterization + unit tests for enterprise ownership resolver.
 * Documents dual-source behavior (ED columns vs hospital bag) and authority policy.
 */
import { describe, expect, it } from "vitest";
import {
  applyHospitalAssignmentMutation,
  applyHospitalWorkflowAssignmentMutation,
  applyClinicalAttendingMutation,
  emptyHospitalAssignmentBag,
  mergeHospitalAssignmentBagIntoSummary,
} from "./enterpriseAssignmentEngineD4a30.js";
import {
  ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
  resolveActiveEncounterOwnership,
  resolveActiveEncounterOwnershipBatch,
  resolveOwnershipCareSetting,
} from "./enterpriseEncounterOwnershipResolverD4a41.js";

function hospitalSummary(
  careSetting: "OBSERVATION" | "INPATIENT",
  mutate?: (bag: ReturnType<typeof emptyHospitalAssignmentBag>) => ReturnType<typeof emptyHospitalAssignmentBag>
) {
  let bag = emptyHospitalAssignmentBag(careSetting);
  if (mutate) bag = mutate(bag);
  return mergeHospitalAssignmentBagIntoSummary(
    { requestedEncounterType: careSetting },
    bag
  );
}

describe("enterpriseEncounterOwnershipResolverD4a41 — characterization", () => {
  it("exports certification id", () => {
    expect(ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER.D4A4_1"
    );
  });

  it("Emergency: primary RN/provider resolve from ED columns; source metadata ED", () => {
    const result = resolveActiveEncounterOwnership({
      type: "EMERGENCY",
      physicianAssignedUserId: "ed-md-1",
      nurseAssignedUserId: "ed-rn-1",
      admissionSummaryJson: null,
    });
    expect(result.careSetting).toBe("EMERGENCY");
    expect(result.authoritySource).toBe("ED_ENCOUNTER_COLUMNS");
    expect(result.primaryProvider.userId).toBe("ed-md-1");
    expect(result.primaryProvider.source).toBe("ED_ENCOUNTER_COLUMNS");
    expect(result.primaryProvider.assignmentStatus).toBe("ASSIGNED");
    expect(result.primaryNurse.userId).toBe("ed-rn-1");
    expect(result.primaryNurse.source).toBe("ED_ENCOUNTER_COLUMNS");
    expect(result.clinicalAttending.assignmentStatus).toBe("UNSUPPORTED_CARE_SETTING");
  });

  it("Inpatient conflict: bag PRIMARY_* wins; ED columns do not override", () => {
    const summary = hospitalSummary("INPATIENT", (bag) => {
      let next = applyHospitalAssignmentMutation(bag, {
        role: "PROVIDER",
        actorUserId: "ip-md",
        nextUserId: "ip-md",
        source: "SELF_ASSIGN",
        displayName: "IP MD",
      });
      next = applyHospitalAssignmentMutation(next, {
        role: "NURSE",
        actorUserId: "ip-rn",
        nextUserId: "ip-rn",
        source: "SELF_ASSIGN",
        displayName: "IP RN",
      });
      return next;
    });
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      physicianAssignedUserId: "ed-receiving-md",
      nurseAssignedUserId: "ed-receiving-rn",
      admissionSummaryJson: summary,
    });
    expect(result.careSetting).toBe("INPATIENT");
    expect(result.authoritySource).toBe("HOSPITAL_ASSIGNMENT_BAG");
    expect(result.primaryProvider.userId).toBe("ip-md");
    expect(result.primaryProvider.source).toBe("HOSPITAL_ASSIGNMENT_BAG");
    expect(result.primaryNurse.userId).toBe("ip-rn");
    expect(result.primaryNurse.source).toBe("HOSPITAL_ASSIGNMENT_BAG");
    expect(result.primaryProvider.userId).not.toBe("ed-receiving-md");
    expect(result.diagnostics).toContain("SOURCE_CONFLICT_ED_VS_HOSPITAL");
    expect(result.hasSourceConflict).toBe(true);
  });

  it("Observation: bag careSetting OBSERVATION even when Encounter.type is INPATIENT", () => {
    const summary = hospitalSummary("OBSERVATION", (bag) =>
      applyHospitalAssignmentMutation(bag, {
        role: "NURSE",
        actorUserId: "obs-rn",
        nextUserId: "obs-rn",
        source: "SELF_ASSIGN",
      })
    );
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
      admissionSummaryJson: summary,
    });
    expect(result.careSetting).toBe("OBSERVATION");
    expect(result.authoritySource).toBe("HOSPITAL_ASSIGNMENT_BAG");
    expect(result.primaryNurse.userId).toBe("obs-rn");
    expect(result.primaryNurse.source).toBe("HOSPITAL_ASSIGNMENT_BAG");
  });

  it("STRICT empty bag: unresolved hospital ownership; does not fall back to ED columns", () => {
    const summary = hospitalSummary("INPATIENT");
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      physicianAssignedUserId: "legacy-md",
      nurseAssignedUserId: "legacy-rn",
      admissionSummaryJson: summary,
      compatibilityMode: "STRICT",
    });
    expect(result.primaryProvider.userId).toBeNull();
    expect(result.primaryNurse.userId).toBeNull();
    expect(result.primaryProvider.assignmentStatus).toBe("UNASSIGNED");
    expect(result.primaryProvider.source).toBe("UNRESOLVED");
    expect(result.primaryProvider.isLegacyFallback).toBe(false);
    expect(result.diagnostics).toContain("HOSPITAL_PRIMARY_UNASSIGNED");
    expect(result.diagnostics).toContain("ED_COLUMNS_POPULATED_ON_HOSPITAL_ENCOUNTER");
  });

  it("STRICT missing bag: unresolved; does not promote ED columns", () => {
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: { requestedEncounterType: "INPATIENT" },
      physicianAssignedUserId: "legacy-md",
      nurseAssignedUserId: "legacy-rn",
      compatibilityMode: "STRICT",
    });
    expect(result.careSetting).toBe("INPATIENT");
    expect(result.primaryProvider.userId).toBeNull();
    expect(result.primaryNurse.userId).toBeNull();
    expect(result.diagnostics).toContain("HOSPITAL_BAG_ABSENT");
    expect(result.primaryProvider.isLegacyFallback).toBe(false);
  });

  it("LEGACY_COMPATIBILITY: explicit labeled fallback when bag empty and ED columns set", () => {
    const summary = hospitalSummary("INPATIENT");
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      physicianAssignedUserId: "legacy-md",
      nurseAssignedUserId: "legacy-rn",
      admissionSummaryJson: summary,
      compatibilityMode: "LEGACY_COMPATIBILITY",
    });
    expect(result.primaryProvider.userId).toBe("legacy-md");
    expect(result.primaryProvider.source).toBe("LEGACY_ED_COLUMNS_COMPATIBILITY");
    expect(result.primaryProvider.isLegacyFallback).toBe(true);
    expect(result.primaryNurse.userId).toBe("legacy-rn");
    expect(result.diagnostics).toContain("LEGACY_FALLBACK_APPLIED");
    // Authority source remains hospital bag policy lane — fallback is labeled, not new SSoT
    expect(result.authoritySource).toBe("HOSPITAL_ASSIGNMENT_BAG");
  });

  it("Conflicting sources: care-setting policy determines authority; no mutation of input", () => {
    const summary = hospitalSummary("INPATIENT", (bag) =>
      applyHospitalAssignmentMutation(bag, {
        role: "PROVIDER",
        actorUserId: "bag-md",
        nextUserId: "bag-md",
        source: "SELF_ASSIGN",
      })
    );
    const frozen = JSON.parse(JSON.stringify(summary));
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-rn",
      admissionSummaryJson: summary,
    });
    expect(result.primaryProvider.userId).toBe("bag-md");
    expect(result.hasSourceConflict).toBe(true);
    expect(JSON.stringify(summary)).toBe(JSON.stringify(frozen));
  });
});

describe("enterpriseEncounterOwnershipResolverD4a41 — unit", () => {
  it("clinical attending distinct from primary provider", () => {
    const summary = hospitalSummary("INPATIENT", (bag) => {
      let next = applyHospitalAssignmentMutation(bag, {
        role: "PROVIDER",
        actorUserId: "primary-md",
        nextUserId: "primary-md",
        source: "SELF_ASSIGN",
      });
      next = applyClinicalAttendingMutation(next, {
        actorUserId: "admin",
        attendingProviderUserId: "attending-md",
        attendingProviderDisplayName: "Attending",
      });
      return next;
    });
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      admissionSummaryJson: summary,
    });
    expect(result.primaryProvider.userId).toBe("primary-md");
    expect(result.clinicalAttending.userId).toBe("attending-md");
    expect(result.clinicalAttending.concept).toBe("CLINICAL_ATTENDING");
    expect(result.clinicalAttending.source).toBe("HOSPITAL_ASSIGNMENT_BAG");
  });

  it("PCT, covering, break, charge resolve from bag workflow slots", () => {
    const summary = hospitalSummary("INPATIENT", (bag) => {
      let next = applyHospitalAssignmentMutation(bag, {
        role: "TECHNICIAN",
        actorUserId: "pct-1",
        nextUserId: "pct-1",
        source: "SELF_ASSIGN",
      });
      next = applyHospitalWorkflowAssignmentMutation(next, {
        slot: "COVERING_PROVIDER",
        actorUserId: "cov",
        nextUserId: "cov",
        source: "SELF_ASSIGN",
      });
      next = applyHospitalWorkflowAssignmentMutation(next, {
        slot: "BREAK_RN",
        actorUserId: "brk",
        nextUserId: "brk",
        source: "SELF_ASSIGN",
      });
      next = applyHospitalWorkflowAssignmentMutation(next, {
        slot: "CHARGE_RN",
        actorUserId: "chg",
        nextUserId: "chg",
        source: "SELF_ASSIGN",
      });
      return next;
    });
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      admissionSummaryJson: summary,
    });
    expect(result.patientCareTech.userId).toBe("pct-1");
    expect(result.coveringProvider.userId).toBe("cov");
    expect(result.breakNurse.userId).toBe("brk");
    expect(result.chargeNurse.userId).toBe("chg");
  });

  it("unknown care setting → unresolved", () => {
    const result = resolveActiveEncounterOwnership({
      type: "OUTPATIENT",
      physicianAssignedUserId: "x",
      nurseAssignedUserId: "y",
    });
    expect(result.careSetting).toBe("UNKNOWN");
    expect(result.authoritySource).toBe("NONE");
    expect(result.primaryProvider.assignmentStatus).toBe("UNRESOLVED");
    expect(result.diagnostics).toContain("UNKNOWN_CARE_SETTING");
  });

  it("invalid bag input is diagnosed when key present but unreadable", () => {
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: {
        requestedEncounterType: "INPATIENT",
        enterpriseHospitalAssignmentV1: { v: 99, careSetting: "INPATIENT" },
      },
    });
    expect(result.diagnostics).toContain("INVALID_BAG_INPUT");
    expect(result.primaryProvider.userId).toBeNull();
  });

  it("deterministic output for identical input", () => {
    const input = {
      type: "EMERGENCY" as const,
      physicianAssignedUserId: "a",
      nurseAssignedUserId: "b",
    };
    expect(resolveActiveEncounterOwnership(input)).toEqual(
      resolveActiveEncounterOwnership(input)
    );
  });

  it("batch helper maps pure rows without mutation", () => {
    const rows = [
      { type: "EMERGENCY", nurseAssignedUserId: "n1", physicianAssignedUserId: "p1" },
      {
        type: "INPATIENT",
        billingClassification: "INPATIENT",
        admissionSummaryJson: hospitalSummary("INPATIENT"),
        nurseAssignedUserId: "x",
      },
    ];
    const out = resolveActiveEncounterOwnershipBatch(rows);
    expect(out).toHaveLength(2);
    expect(out[0]!.careSetting).toBe("EMERGENCY");
    expect(out[1]!.primaryNurse.userId).toBeNull();
  });

  it("documents classifier conflict when bag OBSERVATION disagrees with clinical INPATIENT", () => {
    const bagOnly = emptyHospitalAssignmentBag("OBSERVATION");
    const summary = mergeHospitalAssignmentBagIntoSummary(
      { requestedEncounterType: "INPATIENT" },
      bagOnly
    );
    const cs = resolveOwnershipCareSetting({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: summary,
    });
    expect(cs.careSetting).toBe("OBSERVATION");
    expect(cs.classifierConflict).toBe(true);
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      admissionSummaryJson: summary,
    });
    expect(result.careSetting).toBe("OBSERVATION");
    expect(result.diagnostics).toContain("CARE_SETTING_CLASSIFIER_CONFLICT");
    expect(result.careSettingClassifierConflict).not.toBeNull();
  });

  it("LEGACY applies only to empty primary slots; bag assignees stay authoritative", () => {
    const summary = hospitalSummary("INPATIENT", (bag) =>
      applyHospitalAssignmentMutation(bag, {
        role: "NURSE",
        actorUserId: "bag-rn",
        nextUserId: "bag-rn",
        source: "SELF_ASSIGN",
      })
    );
    const result = resolveActiveEncounterOwnership({
      type: "INPATIENT",
      nurseAssignedUserId: "ed-rn",
      physicianAssignedUserId: "ed-md",
      admissionSummaryJson: summary,
      compatibilityMode: "LEGACY_COMPATIBILITY",
    });
    expect(result.primaryNurse.userId).toBe("bag-rn");
    expect(result.primaryNurse.isLegacyFallback).toBe(false);
    expect(result.primaryNurse.hasSourceConflict).toBe(true); // ed-rn differs
    expect(result.primaryProvider.userId).toBe("ed-md");
    expect(result.primaryProvider.isLegacyFallback).toBe(true);
    expect(result.diagnostics).toContain("LEGACY_FALLBACK_APPLIED");
  });
});
