import { describe, expect, it } from "vitest";
import {
  D4C9_CERTIFICATION_ID,
  FACILITY_CONFIGURATION_CONFLICT,
  buildServiceLineDisablePreflight,
  projectEnterpriseFacilityCapabilities,
} from "./enterpriseFacilityConfigurationAuthorityD4c9.js";
import {
  FACILITY_BILLING_WORKFLOW_UNRESOLVED,
  defaultBillingWorkflowModeForFacilityType,
  isFacilityBillingWorkflowUnresolved,
  resolveEffectiveFacilityBillingWorkflow,
} from "../encounters/facilityBillingWorkflow.js";
import { resolveDefaultBillingClassification } from "../encounters/billingClassification.js";
import {
  resolveDentalWorkspaceAccess,
} from "./enterpriseDentalServiceLineNavigationD5a2.js";
import {
  resolveFacilityModuleCapabilitiesD4c1,
} from "./facilityClinicCareProfileD4c1.js";
import { isFacilityCareSettingPathAllowed } from "./clinicWorkspaceCapabilityNavigationD4c2a.js";
import { resolveEnterprisePatientEncounterIndexHref } from "./enterprisePatientMedicalRecordD4c8c.js";

/**
 * MEDUI.D4C.9 enterprise hardening — mandatory platform consistency matrix (§T).
 * Proves one facility configuration authority propagates without Facility clones.
 */
describe("MEDUI.D4C.9 enterprise facility capability governance matrix", () => {
  const facilityId = "fac-bon-samaritain";

  it("1–2: Clinic enables Dental — same facilityId, dentalCareEnabled", () => {
    const before = projectEnterpriseFacilityCapabilities({
      facilityId,
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC"],
      careProfileJson: { schemaVersion: 1 },
      billing: { billingClassificationMode: "CLINIC_ONLY", billingSiteType: "CLINIC" },
    });
    expect(before.moduleCapabilities.dentalCareEnabled).toBe(false);

    const after = projectEnterpriseFacilityCapabilities({
      facilityId,
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC", "DENTAL"],
      careProfileJson: { schemaVersion: 1, dentalSpecialties: ["GENERAL_DENTISTRY"] },
      billing: { billingClassificationMode: "CLINIC_ONLY", billingSiteType: "CLINIC" },
    });
    expect(after.facilityId).toBe(facilityId);
    expect(after.moduleCapabilities.dentalCareEnabled).toBe(true);
    expect(after.moduleCapabilities.clinicCareEnabled).toBe(true);
    expect(after.certificationId).toBe(D4C9_CERTIFICATION_ID);
  });

  it("3–5: Dental guard/nav succeed; Clinic nav remains", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL"],
      careProfileJson: { schemaVersion: 1, dentalSpecialties: ["GENERAL_DENTISTRY"] },
    });
    expect(caps.dentalCareEnabled).toBe(true);
    expect(caps.clinicCareEnabled).toBe(true);
    expect(
      isFacilityCareSettingPathAllowed("/app/dental", {
        roleCodes: ["PROVIDER"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC", "DENTAL"],
      })
    ).toBe(true);
    expect(
      isFacilityCareSettingPathAllowed("/app/clinic-care", {
        roleCodes: ["PROVIDER"],
        facilityType: "CLINIC",
        facilityServiceLines: ["CLINIC", "DENTAL"],
      })
    ).toBe(true);
  });

  it("6–8: billing config unchanged; Dental encounter retains Dental context", () => {
    const billing = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: "CLINIC_ONLY",
      billingSiteType: "CLINIC",
    });
    expect(billing.effectiveMode).toBe("CLINIC_ONLY");
    expect(billing.source).toBe("EXPLICIT");
    const clinicClass = resolveDefaultBillingClassification({
      facilityBillingSiteType: billing.config.billingSiteType,
      encounterType: "OUTPATIENT",
    });
    expect(clinicClass).toBe("CLINIC_VISIT");
    const dentalHref = resolveEnterprisePatientEncounterIndexHref(
      {
        id: "enc-dental",
        status: "OPEN",
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
        },
      },
      { dentalCareEnabled: true }
    );
    expect(dentalHref).toBe("/app/dental/encounters/enc-dental");
  });

  it("9–10 / 15–16: medical record + historical after disable", () => {
    const closed = resolveEnterprisePatientEncounterIndexHref(
      { id: "enc-closed-dental", status: "CLOSED", type: "OUTPATIENT" },
      { dentalCareEnabled: false }
    );
    expect(closed).toBe("/app/encounters/enc-closed-dental");
    const openHistorical = resolveEnterprisePatientEncounterIndexHref(
      {
        id: "enc-open-dental",
        status: "OPEN",
        type: "OUTPATIENT",
        nursingAssessment: {
          dentalServiceLineV1: { careSetting: "DENTAL", serviceLine: "DENTAL" },
        },
      },
      { dentalCareEnabled: false }
    );
    expect(openHistorical).toBe("/app/encounters/enc-open-dental");
  });

  it("11 / 28–29: conflict code + disable preflight ack", () => {
    expect(FACILITY_CONFIGURATION_CONFLICT).toBe("FACILITY_CONFIGURATION_CONFLICT");
    const pre = buildServiceLineDisablePreflight({
      serviceLine: "DENTAL",
      openEncounterCount: 3,
      futureAppointmentCount: 6,
    });
    expect(pre.acknowledgementRequired).toBe(true);
  });

  it("12–14: Front Desk / Admin do not gain odontogram authoring", () => {
    const frontDesk = resolveDentalWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      dentalCareEnabled: true,
      specialties: ["GENERAL_DENTISTRY"],
    });
    expect(frontDesk.canAccessDentalShell).toBe(true);
    expect(frontDesk.canEditOdontogram).toBe(false);
    expect(frontDesk.canAccessDentalProvider).toBe(false);

    const admin = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
      specialties: ["GENERAL_DENTISTRY"],
    });
    expect(admin.canAccessDentalAdmin).toBe(true);
    expect(admin.canEditOdontogram).toBe(false);
    expect(admin.canAccessDentalProvider).toBe(false);
  });

  it("19–22: Lab / Pharmacy / Radiology lines project consistently", () => {
    const caps = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "LABORATORY", "PHARMACY", "RADIOLOGY"],
    });
    expect(caps.laboratoryEnabled).toBe(true);
    expect(caps.pharmacyEnabled).toBe(true);
    expect(caps.radiologyEnabled).toBe(true);
    const proj = projectEnterpriseFacilityCapabilities({
      facilityId,
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC", "LABORATORY", "PHARMACY", "RADIOLOGY"],
      billing: { billingClassificationMode: "CLINIC_ONLY", billingSiteType: "CLINIC" },
    });
    expect(proj.moduleCapabilities.laboratoryEnabled).toBe(true);
    expect(proj.moduleCapabilities.pharmacyEnabled).toBe(true);
    expect(proj.moduleCapabilities.radiologyEnabled).toBe(true);
    expect(proj.serviceLineReadiness.LABORATORY).toBe("ENABLED_READY");
    expect(proj.serviceLineReadiness.PHARMACY).toBe("ENABLED_READY");
    expect(proj.serviceLineReadiness.RADIOLOGY).toBe("ENABLED_READY");
  });

  it("21: pharmacy service line is independent of outpatient Rx capability shape", () => {
    const noPharmacyLine = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
    });
    expect(noPharmacyLine.pharmacyEnabled).toBe(false);
    expect(noPharmacyLine.clinicCareEnabled).toBe(true);
  });

  it("24–27: effective billing resolver + LEGACY policy", () => {
    const inferred = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: null,
      billingSiteType: "CLINIC",
    });
    expect(inferred.source).toBe("INFERRED_FROM_EXISTING_PROFILE");
    expect(inferred.effectiveMode).toBe("CLINIC_ONLY");

    const unresolved = resolveEffectiveFacilityBillingWorkflow({
      billingClassificationMode: null,
      billingSiteType: null,
    });
    expect(unresolved.source).toBe("UNRESOLVED");
    expect(isFacilityBillingWorkflowUnresolved(unresolved)).toBe(true);
    expect(FACILITY_BILLING_WORKFLOW_UNRESOLVED).toBe("FACILITY_BILLING_WORKFLOW_UNRESOLVED");

    expect(defaultBillingWorkflowModeForFacilityType("CLINIC")).toBe("CLINIC_ONLY");
    expect(defaultBillingWorkflowModeForFacilityType("HOSPITAL")).not.toBeNull();
  });

  it("30–32: no second authority — projection reuses module + billing resolvers", () => {
    const proj = projectEnterpriseFacilityCapabilities({
      facilityId,
      facilityType: "CLINIC",
      serviceLinesJson: ["CLINIC", "DENTAL"],
      careProfileJson: { schemaVersion: 1, dentalSpecialties: ["GENERAL_DENTISTRY"] },
      billing: { billingClassificationMode: "CLINIC_ONLY", billingSiteType: "CLINIC" },
    });
    const caps = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL"],
      careProfileJson: { schemaVersion: 1, dentalSpecialties: ["GENERAL_DENTISTRY"] },
    });
    expect(proj.moduleCapabilities.dentalCareEnabled).toBe(caps.dentalCareEnabled);
    expect(proj.billingWorkflow.effectiveMode).toBe("CLINIC_ONLY");
  });
});
