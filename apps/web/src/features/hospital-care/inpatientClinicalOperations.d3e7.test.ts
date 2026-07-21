import { describe, expect, it } from "vitest";
import {
  placementActionsForStatus,
  placementActionToStatus,
  validateDirectAdmissionHardBlockers,
  directAdmissionMustNotCreateEdEncounter,
  inpatientMedicationAutoCopyForbidden,
  INPATIENT_OPS_DEV_ACTIVATION_PROFILE,
  inpatientOpsProductionDefaultsAreOff,
  placementActionsEnabled,
  inpatientOperationsFlagsFromProcessEnv,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("D3E.7 Inpatient clinical operations UI contracts", () => {
  it("mirrors D3E.7 i18n keys between en and fr", () => {
    expect(Object.keys(en.hospitalCareD3e7.placement.actions).sort()).toEqual(
      Object.keys(fr.hospitalCareD3e7.placement.actions).sort()
    );
    expect(Object.keys(en.inpatientD3e7.ops).sort()).toEqual(
      Object.keys(fr.inpatientD3e7.ops).sort()
    );
  });

  it("French product copy for placement actions and admissions", () => {
    expect(fr.hospitalCareD3e7.placement.actions.accept).toMatch(/Accepter/i);
    expect(fr.hospitalCareD3e7.admissions.submit).toMatch(/admission/i);
    expect(fr.inpatientD3e7.ops.medReconHint.toLowerCase()).toContain("explicites");
  });

  it("placement actions map to server statuses and never invent free-form status", () => {
    expect(placementActionToStatus("ACCEPT")).toBe("ACCEPTED");
    expect(placementActionToStatus("MARK_ARRIVED")).toBe("ARRIVED_DESTINATION");
    expect(placementActionsForStatus("ACCEPTED")).toContain("ASSIGN_BED");
    expect(placementActionsForStatus("COMPLETED")).toEqual([]);
  });

  it("direct admission hard blockers and pathway rules", () => {
    expect(validateDirectAdmissionHardBlockers({ patientId: "", admissionSource: "DIRECT" })).toContain(
      "PATIENT_REQUIRED"
    );
    expect(directAdmissionMustNotCreateEdEncounter()).toBe(true);
    expect(inpatientMedicationAutoCopyForbidden()).toBe(true);
  });

  it("production placement/ops flags default OFF; dev profile enables", () => {
    expect(inpatientOpsProductionDefaultsAreOff()).toBe(true);
    expect(placementActionsEnabled({})).toBe(false);
    const env = inpatientOperationsFlagsFromProcessEnv({
      ...INPATIENT_OPS_DEV_ACTIVATION_PROFILE,
    } as unknown as NodeJS.ProcessEnv);
    expect(placementActionsEnabled(env)).toBe(true);
  });
});
