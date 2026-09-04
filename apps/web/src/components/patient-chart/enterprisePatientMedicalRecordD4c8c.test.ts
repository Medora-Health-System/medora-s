import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D4C8C_CERTIFICATION_ID,
  patientPageMustNotEmbedClosedClinicalRecord,
  projectPatientEncounterIndexRow,
} from "./encounterListProjection";
import {
  isEnterpriseEncounterClosed,
  shouldShowEnterpriseReopenAction,
} from "@medora/shared";

describe("MEDUI.D4C.8C enterprise patient medical record", () => {
  it("CLOSED row shows lock projection and encounterId record href", () => {
    const row = projectPatientEncounterIndexRow({
      id: "c1",
      status: "CLOSED",
      type: "OUTPATIENT",
      closedAt: "2026-08-10T10:00:00.000Z",
    });
    expect(row.showClosedLock).toBe(true);
    expect(row.href).toBe("/app/encounters/c1");
  });

  it("OPEN row does not show closed lock and uses ambulatory workspace", () => {
    const row = projectPatientEncounterIndexRow({ id: "o1", status: "OPEN", type: "OUTPATIENT" });
    expect(row.showClosedLock).toBe(false);
    expect(row.href).toContain("/app/encounters/o1");
    expect(row.href).toContain("section=");
  });

  it("SIGNED alone does not show closed lock", () => {
    const row = projectPatientEncounterIndexRow({
      id: "s1",
      status: "OPEN",
      type: "EMERGENCY",
      providerDocumentationStatus: "SIGNED",
    });
    expect(isEnterpriseEncounterClosed("OPEN")).toBe(false);
    expect(row.showClosedLock).toBe(false);
    expect(row.href).toBe("/app/emergency/active/s1");
  });

  it("patient page does not duplicate D4C.8B clinical composition", () => {
    const page = readFileSync(
      resolve(__dirname, "../../../app/app/patients/[id]/page.tsx"),
      "utf8"
    );
    expect(patientPageMustNotEmbedClosedClinicalRecord(page)).toBe(true);
    expect(page).toContain("EnterprisePatientMedicalRecord");
    expect(page).toContain("PatientConsultationsTab");
  });

  it("encounter index wires D4C.8C projection and accessible closed lock", () => {
    const tab = readFileSync(resolve(__dirname, "./PatientConsultationsTab.tsx"), "utf8");
    expect(tab).toContain("projectPatientEncounterIndexRow");
    expect(tab).toContain('aria-label={t("enterprisePatientMedicalRecordD4c8c.encounters.closedAria")}');
    expect(tab).toContain("enterprise-patient-open-closed-encounter");
    expect(tab).not.toContain("EnterpriseClosedEncounterClinicalRecord");
  });

  it("closed viewer exposes encounter-scoped export for authorized roles", () => {
    const viewer = readFileSync(
      resolve(__dirname, "../encounters/EnterpriseClosedEncounterViewer.tsx"),
      "utf8"
    );
    expect(viewer).toContain("encounterChartExportHtmlHref");
    expect(viewer).toContain("EnterpriseReopenEncounterAction");
    expect(viewer).toContain("EnterpriseClosedEncounterClinicalRecord");
  });

  it("reopen remains Admin-only; Provider/RN hidden", () => {
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(false);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["RN"] })).toBe(false);
  });

  it("i18n FR/EN keys exist", () => {
    const fr = readFileSync(resolve(__dirname, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(resolve(__dirname, "../../i18n/messages/en.ts"), "utf8");
    for (const src of [fr, en]) {
      expect(src).toContain("enterprisePatientMedicalRecordD4c8c:");
      expect(src).toContain("closedAria:");
    }
    expect(fr).toContain("Dossier médical");
    expect(en).toContain("Medical record");
    expect(D4C8C_CERTIFICATION_ID).toBe("MEDUI.D4C.8C");
  });
});
