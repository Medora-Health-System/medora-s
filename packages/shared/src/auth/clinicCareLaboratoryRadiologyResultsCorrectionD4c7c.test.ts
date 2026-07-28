/**
 * MEDUI.D4C.7C — Clinic laboratory / radiology results correction contracts.
 */

import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_LABORATORY_RADIOLOGY_RESULTS_CORRECTION_CERTIFICATION_ID,
  D4C7C_ACKNOWLEDGE_ACTION,
  D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES,
  D4C7C_LAB_ACTIONS,
  D4C7C_NAV_GROUP_LABEL_KEY,
  D4C7C_RAD_ACTIONS,
  D4C7C_ROLE_CAPABILITY_MATRIX_DOC,
  buildClinicLaboratoryEntryHref,
  buildClinicRadiologyEntryHref,
  canEnterLabOrRadResults,
  clinicCareAmbulatoryOrdersTilePath,
  clinicCareAmbulatoryResultsTilePath,
  clinicDiagnosticPocVsCentralLabDistinctionExists,
  clinicLabRadOrderStatusLabelKey,
  clinicLabRnResultEntrySeedChangeRequired,
  filterAmbulatoryLabRadWorklistOrders,
  frontDeskBillingResultEntryDenied,
  isClinicLaboratoryEntryHref,
  isClinicRadiologyEntryHref,
  medicationMustNotRouteToLabOrRad,
  resolveAmbulatoryWorklistCareSettingBadge,
  resolveClinicCareLabRadSidebarHref,
  resolveClinicDiagnosticWorklistRoute,
  rnLabSpecimenCollectionBlockedByResultSubmissionPolicy,
} from "./clinicCareLaboratoryRadiologyResultsCorrectionD4c7c.js";
import { resolveDepartmentalEncounterContext } from "../encounters/departmentalEncounterContext.js";
import { resolveClinicalEncounterContext } from "../encounters/clinicalEncounterIdentity.js";

describe("MEDUI.D4C.7C clinic laboratory + radiology results correction", () => {
  it("A — certification id + canonical enterprise lab/rad entry hrefs", () => {
    expect(CLINIC_CARE_LABORATORY_RADIOLOGY_RESULTS_CORRECTION_CERTIFICATION_ID).toBe(
      "MEDUI.D4C.7C"
    );
    const lab = buildClinicLaboratoryEntryHref();
    expect(lab).toContain("/app/lab-worklist");
    expect(lab).toContain("source=clinic-care");
    expect(lab).toContain("ambulatory=1");
    expect(isClinicLaboratoryEntryHref(lab)).toBe(true);
    const rad = buildClinicRadiologyEntryHref();
    expect(rad).toContain("/app/rad-worklist");
    expect(rad).toContain("source=clinic-care");
    expect(isClinicRadiologyEntryHref(rad)).toBe(true);
    expect(D4C7C_NAV_GROUP_LABEL_KEY).toBe("clinicCareD4c7c.nav.groupLabImaging");
  });

  it("B — no ClinicLaboratory / ClinicRadiology / ClinicResult duplicate authorities", () => {
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicLaboratoryOrder");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicLaboratoryResult");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicRadiologyOrder");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicRadiologyResult");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicDiagnosticWorklist");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicResultStatus");
    expect(D4C7C_FORBIDDEN_CLINIC_AUTHORITY_NAMES).toContain("ClinicResultAcknowledgement");
  });

  it("C — order routing LAB→lab, IMAGING→rad, MEDICATION≠lab/rad", () => {
    expect(resolveClinicDiagnosticWorklistRoute({ orderType: "LAB" })).toBe("LAB");
    expect(resolveClinicDiagnosticWorklistRoute({ catalogItemType: "LAB_TEST" })).toBe("LAB");
    expect(resolveClinicDiagnosticWorklistRoute({ orderType: "IMAGING" })).toBe("RADIOLOGY");
    expect(
      resolveClinicDiagnosticWorklistRoute({ catalogItemType: "IMAGING_STUDY" })
    ).toBe("RADIOLOGY");
    expect(resolveClinicDiagnosticWorklistRoute({ orderType: "MEDICATION" })).toBe("PHARMACY");
    expect(medicationMustNotRouteToLabOrRad({ orderType: "MEDICATION" })).toBe(true);
    expect(medicationMustNotRouteToLabOrRad({ orderType: "LAB" })).toBe(false);
  });

  it("D — AMBULATORY badge projection without mutating D3E.5 clinical identity", () => {
    expect(resolveAmbulatoryWorklistCareSettingBadge({ encounterType: "OUTPATIENT" })).toBe(
      "AMBULATORY"
    );
    expect(resolveAmbulatoryWorklistCareSettingBadge({ encounterType: "URGENT_CARE" })).toBe(
      "AMBULATORY"
    );
    expect(resolveAmbulatoryWorklistCareSettingBadge({ encounterType: "EMERGENCY" })).toBe(
      null
    );
    // D3E.5 identity stays UNKNOWN for outpatient (hospital Obs/IP pathway only).
    expect(resolveClinicalEncounterContext({ type: "OUTPATIENT" })).toBe("UNKNOWN");
    expect(resolveDepartmentalEncounterContext({ type: "OUTPATIENT" })).toBe("AMBULATORY");
    expect(resolveDepartmentalEncounterContext({ type: "EMERGENCY" })).toBe("ED");
    expect(resolveDepartmentalEncounterContext({ type: "INPATIENT" })).toBe("INPATIENT");
  });

  it("E — ambulatory worklist filter keeps Clinic orders; excludes ED when ambulatoryOnly", () => {
    const rows = [
      {
        facilityId: "f1",
        encounter: { type: "OUTPATIENT", patientId: "p1" },
        type: "LAB",
      },
      {
        facilityId: "f1",
        encounter: { type: "EMERGENCY", patientId: "p2" },
        type: "LAB",
      },
      {
        facilityId: "f1",
        encounter: { type: "URGENT_CARE", patientId: "p3" },
        type: "IMAGING",
      },
    ];
    const filtered = filterAmbulatoryLabRadWorklistOrders(rows, {
      facilityId: "f1",
      ambulatoryOnly: true,
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.encounter?.type !== "EMERGENCY")).toBe(true);
  });

  it("F — lab/rad actions distinct; acknowledgement ≠ entry/finalization", () => {
    expect(D4C7C_LAB_ACTIONS).toContain("COLLECT");
    expect(D4C7C_LAB_ACTIONS).toContain("ENTER");
    expect(D4C7C_LAB_ACTIONS).toContain("FINALIZE");
    expect(D4C7C_RAD_ACTIONS).toContain("BEGIN");
    expect(D4C7C_RAD_ACTIONS).toContain("PRELIMINARY");
    expect(D4C7C_RAD_ACTIONS).toContain("FINAL");
    expect(D4C7C_ACKNOWLEDGE_ACTION).toBe("ACKNOWLEDGE_RESULT");
    expect((D4C7C_LAB_ACTIONS as readonly string[]).includes(D4C7C_ACKNOWLEDGE_ACTION)).toBe(
      false
    );
    expect((D4C7C_RAD_ACTIONS as readonly string[]).includes(D4C7C_ACKNOWLEDGE_ACTION)).toBe(
      false
    );
  });

  it("G — role matrix: Front Desk/Billing no result entry; Provider/Lab/RN documented", () => {
    expect(D4C7C_ROLE_CAPABILITY_MATRIX_DOC.FRONT_DESK).toEqual([]);
    expect(D4C7C_ROLE_CAPABILITY_MATRIX_DOC.BILLING).toEqual([]);
    expect(D4C7C_ROLE_CAPABILITY_MATRIX_DOC.PROVIDER).toContain("ACKNOWLEDGE_RESULT");
    expect(D4C7C_ROLE_CAPABILITY_MATRIX_DOC.RN).toContain("ENTER_LAB_IF_FACILITY_POLICY");
    expect(D4C7C_ROLE_CAPABILITY_MATRIX_DOC.LAB_TECH).toContain("ENTER_VERIFY_FINALIZE_LAB");
    expect(frontDeskBillingResultEntryDenied(["FRONT_DESK"])).toBe(true);
    expect(frontDeskBillingResultEntryDenied(["BILLING"])).toBe(true);
    expect(canEnterLabOrRadResults(["FRONT_DESK"])).toBe(false);
    expect(canEnterLabOrRadResults(["LAB"])).toBe(true);
    expect(canEnterLabOrRadResults(["PROVIDER"])).toBe(true);
  });

  it("H — RN facility policy STOP + specimen not auto-blocked by submission flag", () => {
    const stop = clinicLabRnResultEntrySeedChangeRequired({
      facilityAllowsRnLabResultSubmission: false,
    });
    expect(stop.stop).toBe(true);
    expect(stop.authority).toContain("allowRnLabResultSubmission");
    expect(stop.proposedChange).toContain("allowRnLabResultSubmission=true");
    expect(
      clinicLabRnResultEntrySeedChangeRequired({
        facilityAllowsRnLabResultSubmission: true,
      }).stop
    ).toBe(false);
    expect(rnLabSpecimenCollectionBlockedByResultSubmissionPolicy()).toBe(false);
  });

  it("I — POC vs central-lab typed distinction STOP gap (no Clinic-only invent)", () => {
    const poc = clinicDiagnosticPocVsCentralLabDistinctionExists();
    expect(poc.exists).toBe(false);
    expect(poc.stop).toBe(true);
    expect(poc.gap).toMatch(/POC|CENTRAL_LAB|PROVIDER_PERFORMED/i);
  });

  it("J — French status label keys (no raw enum reliance for common statuses)", () => {
    expect(clinicLabRadOrderStatusLabelKey("IN_PROGRESS")).toContain("IN_PROGRESS");
    expect(clinicLabRadOrderStatusLabelKey("PLACED")).toContain("PLACED");
    expect(clinicLabRadOrderStatusLabelKey("VERIFIED")).toContain("VERIFIED");
    expect(clinicLabRadOrderStatusLabelKey("FINALIZED")).toBe(
      "printOutput.orderItemChart.PENDING"
    );
  });

  it("K — Active Clinic Workspace tiles + sidebar lab/rad rewrite when Clinic Care on", () => {
    expect(clinicCareAmbulatoryOrdersTilePath("enc-1")).toContain("section=orders");
    expect(clinicCareAmbulatoryResultsTilePath("enc-1")).toContain("section=results");
    expect(clinicCareAmbulatoryOrdersTilePath("enc-1")).toContain("workspace=ambulatory");
    expect(
      resolveClinicCareLabRadSidebarHref("/app/lab-worklist", {
        clinicCareEnabled: true,
        urgentCareEnabled: false,
        laboratoryEnabled: true,
        radiologyEnabled: false,
      })
    ).toBe(buildClinicLaboratoryEntryHref());
    expect(
      resolveClinicCareLabRadSidebarHref("/app/rad-worklist", {
        clinicCareEnabled: true,
        urgentCareEnabled: false,
        laboratoryEnabled: true,
        radiologyEnabled: true,
      })
    ).toBe(buildClinicRadiologyEntryHref());
    expect(
      resolveClinicCareLabRadSidebarHref("/app/lab-worklist", {
        clinicCareEnabled: false,
        urgentCareEnabled: false,
        laboratoryEnabled: true,
        radiologyEnabled: false,
      })
    ).toBe("/app/lab-worklist");
  });
});
