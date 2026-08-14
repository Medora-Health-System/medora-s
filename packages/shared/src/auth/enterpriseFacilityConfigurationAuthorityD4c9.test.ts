import { describe, expect, it } from "vitest";
import {
  D4C9_CERTIFICATION_ID,
  FACILITY_CONFIGURATION_CONFLICT,
  buildServiceLineDisablePreflight,
  projectEnterpriseFacilityCapabilities,
} from "./enterpriseFacilityConfigurationAuthorityD4c9.js";
import { resolveEnterprisePatientEncounterIndexHref } from "./enterprisePatientMedicalRecordD4c8c.js";

describe("MEDUI.D4C.9 enterprise facility configuration authority", () => {
  it("projects one facility capability authority including Dental readiness", () => {
    const proj = projectEnterpriseFacilityCapabilities({
      facilityId: "f1",
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC", "DENTAL", "LABORATORY"],
      careProfileJson: {
        schemaVersion: 1,
        dentalSpecialties: ["GENERAL_DENTISTRY"],
      },
      billing: { billingClassificationMode: "CLINIC_ONLY", billingSiteType: "CLINIC" },
      updatedAt: "2026-08-14T12:00:00.000Z",
    });
    expect(proj.certificationId).toBe(D4C9_CERTIFICATION_ID);
    expect(proj.moduleCapabilities.dentalCareEnabled).toBe(true);
    expect(proj.moduleCapabilities.laboratoryEnabled).toBe(true);
    expect(proj.moduleCapabilities.clinicCareEnabled).toBe(true);
    expect(proj.billingWorkflow.effectiveMode).toBe("CLINIC_ONLY");
    expect(proj.billingWorkflow.source).toBe("EXPLICIT");
    expect(proj.serviceLineReadiness.DENTAL).toBe("ENABLED_READY");
    expect(proj.navigationAreas).toContain("DENTAL_CARE");
    expect(FACILITY_CONFIGURATION_CONFLICT).toBe("FACILITY_CONFIGURATION_CONFLICT");
  });

  it("marks Dental attention when enabled without specialties", () => {
    const proj = projectEnterpriseFacilityCapabilities({
      facilityId: "f1",
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC", "DENTAL"],
      careProfileJson: { schemaVersion: 1, dentalSpecialties: [] },
      billing: { billingClassificationMode: null, billingSiteType: "CLINIC" },
    });
    expect(proj.serviceLineReadiness.DENTAL).toBe("ENABLED_ATTENTION");
    expect(proj.billingWorkflow.source).toBe("INFERRED_FROM_EXISTING_PROFILE");
  });

  it("builds disable preflight acknowledgement when open work remains", () => {
    const pre = buildServiceLineDisablePreflight({
      serviceLine: "DENTAL",
      openEncounterCount: 3,
      futureAppointmentCount: 6,
    });
    expect(pre.acknowledgementRequired).toBe(true);
    expect(pre.openEncounterCount).toBe(3);
  });

  it("routes OPEN dental to enterprise record when Dental currently disabled (historical read)", () => {
    const href = resolveEnterprisePatientEncounterIndexHref(
      {
        id: "e1",
        status: "OPEN",
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
        },
      },
      { dentalCareEnabled: false }
    );
    expect(href).toBe("/app/encounters/e1");
    expect(href).not.toContain("/dental/");
  });

  it("keeps OPEN dental workspace href when Dental enabled", () => {
    const href = resolveEnterprisePatientEncounterIndexHref(
      {
        id: "e1",
        status: "OPEN",
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
        },
      },
      { dentalCareEnabled: true }
    );
    expect(href).toBe("/app/dental/encounters/e1");
  });

  it("keeps CLOSED dental on enterprise record regardless of enablement", () => {
    const href = resolveEnterprisePatientEncounterIndexHref(
      { id: "e1", status: "CLOSED", type: "OUTPATIENT" },
      { dentalCareEnabled: false }
    );
    expect(href).toBe("/app/encounters/e1");
  });
});
