import { describe, expect, it } from "vitest";
import {
  D4C8C_CERTIFICATION_ID,
  patientPageMustNotEmbedClosedClinicalRecord,
  projectEnterprisePatientEncounterIndex,
  resolveEnterprisePatientEncounterIndexHref,
} from "./enterprisePatientMedicalRecordD4c8c.js";
import { EncounterDisplayMode } from "./enterpriseClosedEncounterViewerD4c8a.js";
import { shouldShowEnterpriseReopenAction } from "./enterpriseClosedEncounterViewerD4c8a.js";

describe("MEDUI.D4C.8C enterprise patient medical record index", () => {
  it("exports certification id", () => {
    expect(D4C8C_CERTIFICATION_ID).toBe("MEDUI.D4C.8C");
  });

  it("CLOSED shows lock and navigates by encounterId to enterprise record", () => {
    const row = projectEnterprisePatientEncounterIndex({
      id: "enc-closed",
      status: "CLOSED",
      type: "OUTPATIENT",
      closedAt: "2026-08-01T12:00:00.000Z",
      providerDocumentationStatus: "SIGNED",
    });
    expect(row.isClosed).toBe(true);
    expect(row.showClosedLock).toBe(true);
    expect(row.displayMode).toBe(EncounterDisplayMode.CLOSED_READ_ONLY);
    expect(row.href).toBe("/app/encounters/enc-closed");
    expect(row.closedAt).toBe("2026-08-01T12:00:00.000Z");
  });

  it("OPEN does not show closed lock and uses active ambulatory workspace", () => {
    const row = projectEnterprisePatientEncounterIndex({
      id: "enc-open",
      status: "OPEN",
      type: "OUTPATIENT",
    });
    expect(row.isClosed).toBe(false);
    expect(row.showClosedLock).toBe(false);
    expect(row.href).toContain("/app/encounters/enc-open");
    expect(row.href).toContain("section=");
  });

  it("SIGNED alone does not imply CLOSED lock or closed href", () => {
    const row = projectEnterprisePatientEncounterIndex({
      id: "enc-signed-open",
      status: "OPEN",
      type: "OUTPATIENT",
      providerDocumentationStatus: "SIGNED",
      dischargedAt: "2026-08-01T12:00:00.000Z",
    });
    expect(row.isClosed).toBe(false);
    expect(row.showClosedLock).toBe(false);
    expect(row.displayMode).toBe(EncounterDisplayMode.ACTIVE);
    expect(row.href).toContain("/app/encounters/enc-signed-open");
    expect(row.href).toContain("section=");
  });

  it("OPEN emergency routes to ED active workspace", () => {
    expect(
      resolveEnterprisePatientEncounterIndexHref({
        id: "ed-1",
        status: "OPEN",
        type: "EMERGENCY",
      })
    ).toBe("/app/emergency/active/ed-1");
  });

  it("OPEN inpatient uses enterprise encounter path (active shell)", () => {
    expect(
      resolveEnterprisePatientEncounterIndexHref({
        id: "inp-1",
        status: "OPEN",
        type: "INPATIENT",
      })
    ).toBe("/app/encounters/inp-1");
  });

  it("projects durable serviceLine on encounter index without collapsing OUTPATIENT rows", () => {
    const clinic = projectEnterprisePatientEncounterIndex({
      id: "c1",
      status: "OPEN",
      type: "OUTPATIENT",
      serviceLine: "CLINIC",
    });
    const dental = projectEnterprisePatientEncounterIndex({
      id: "d1",
      status: "OPEN",
      type: "OUTPATIENT",
      serviceLine: "DENTAL",
    });
    expect(clinic.serviceLine).toBe("CLINIC");
    expect(dental.serviceLine).toBe("DENTAL");
    expect(clinic.href).not.toBe(dental.href);
    expect(dental.href).toBe("/app/dental/encounters/d1");
  });

  it("legacy null serviceLine remains readable on index", () => {
    const row = projectEnterprisePatientEncounterIndex({
      id: "legacy",
      status: "CLOSED",
      type: "OUTPATIENT",
      serviceLine: null,
    });
    expect(row.serviceLine).toBeNull();
    expect(row.href).toBe("/app/encounters/legacy");
  });

  it("reopen remains Admin-only (D4C.7K)", () => {
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(
      false
    );
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["RN"] })).toBe(false);
  });

  it("patient page must not embed closed clinical record composition", () => {
    expect(patientPageMustNotEmbedClosedClinicalRecord("PatientConsultationsTab only")).toBe(true);
    expect(
      patientPageMustNotEmbedClosedClinicalRecord("import { EnterpriseClosedEncounterClinicalRecord }")
    ).toBe(false);
  });
});
