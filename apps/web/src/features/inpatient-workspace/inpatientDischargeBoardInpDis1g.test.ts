/**
 * INP.DIS.1G — Production workflow completion regressions (source-level).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildInpatientDischargeChartDraft,
  mergeChartDraftPreservingClinicianEdits,
  markClinicianEditedField,
  validateInpatientProviderDischarge1C,
  emptyInpatientProviderDischarge,
  type InpatientProviderDischargeV1C,
} from "@medora/shared";

const boardPath = join(__dirname, "InpatientDischargeBoard.tsx");
const enPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.en.ts");
const frPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.fr.ts");
const apiPath = join(__dirname, "../hospital-care/inpatientOperationsApi.ts");
const controllerPath = join(
  __dirname,
  "../../../../api/src/encounters/inpatient-operations.controller.ts"
);
const providerSvcPath = join(
  __dirname,
  "../../../../api/src/encounters/inpatient-provider-discharge.service.ts"
);

describe("INP.DIS.1G production discharge workflow", () => {
  it("provider write capability excludes ADMIN-only (PROVIDER required)", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain('const canProvider = roles.includes("PROVIDER")');
    expect(board).not.toMatch(
      /canProvider = roles\.includes\("PROVIDER"\)\s*\|\|\s*roles\.includes\("ADMIN"\)/
    );
    expect(board).toContain("providerWriteEnabled");
    expect(board).toContain("providerCanAuthor");
  });

  it("validation codes map to EN/FR user-facing HOSPITAL_COURSE_REQUIRED text", () => {
    const en = readFileSync(enPath, "utf8");
    const fr = readFileSync(frPath, "utf8");
    expect(en).toContain("HOSPITAL_COURSE_REQUIRED");
    expect(en).toMatch(/Hospital course is required/i);
    expect(fr).toContain("HOSPITAL_COURSE_REQUIRED");
    expect(fr).toMatch(/résumé du séjour hospitalier/i);
    expect(en).toContain("WAITING_PROVIDER_FINALIZE");
    expect(fr).toContain("WAITING_PROVIDER_FINALIZE");
  });

  it("board uses validationLabel helper (never raw namespace keys alone)", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("validationLabel");
    expect(board).toContain("buildInpatientDischargeChartDraft");
    expect(board).toContain("mergeChartDraftPreservingClinicianEdits");
    expect(board).toContain("InpatientDischargeMedicationsPanel");
    expect(board).toContain("InpatientDischargeMedReconPanel");
    expect(board).toContain("executeInpatientFinalDischarge");
    expect(board).not.toContain("dischargeInpatientEncounter");
  });

  it("draft save allows empty hospital course; finalize requires it", () => {
    const doc = {
      ...emptyInpatientProviderDischarge(),
      finalDisposition: { code: "HOME_WITH_HOME_HEALTH" },
      dischargeDiagnoses: [
        {
          id: "dx1",
          code: "R07.9",
          description: "Chest pain",
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      hospitalCourse: "",
      conditionAtDischarge: { status: "STABLE" },
    } as InpatientProviderDischargeV1C;
    expect(validateInpatientProviderDischarge1C(doc, "draft")).toEqual({ ok: true });
    const complete = validateInpatientProviderDischarge1C(doc, "complete");
    expect(complete.ok).toBe(false);
    if (!complete.ok) {
      expect(complete.errors).toContain("HOSPITAL_COURSE_REQUIRED");
    }
  });

  it("chart draft autofill preserves clinician-edited hospital course", () => {
    const existing = {
      ...emptyInpatientProviderDischarge(),
      hospitalCourse: "Clinician narrative",
      fieldProvenance: markClinicianEditedField(null, "hospitalCourse"),
    } as InpatientProviderDischargeV1C;
    const draft = buildInpatientDischargeChartDraft({
      reasonForAdmission: "Chest pain",
      progressNoteExcerpts: ["Day 1: improved"],
      language: "en",
    });
    const { next, refreshed } = mergeChartDraftPreservingClinicianEdits({
      existing,
      draft,
    });
    expect(next.hospitalCourse).toBe("Clinician narrative");
    expect(refreshed).not.toContain("hospitalCourse");
  });

  it("server provider write remains PROVIDER-only", () => {
    const svc = readFileSync(providerSvcPath, "utf8");
    expect(svc).toContain("requireProviderWrite");
    expect(svc).toContain("RoleCode.PROVIDER");
    expect(svc).toContain("INPATIENT_PROVIDER_DISCHARGE_PROVIDER_ONLY");
  });

  it("legacy lifecycle discharge bypass remains absent", () => {
    const ctrl = readFileSync(controllerPath, "utf8");
    const api = readFileSync(apiPath, "utf8");
    expect(ctrl).not.toContain('@Post("encounters/:encounterId/lifecycle/discharge")');
    expect(api).not.toContain("dischargeInpatientEncounter");
    expect(api).toContain("executeInpatientFinalDischarge");
  });

  it("discharge medications + med recon panels exist", () => {
    const meds = readFileSync(join(__dirname, "InpatientDischargeMedicationsPanel.tsx"), "utf8");
    const recon = readFileSync(join(__dirname, "InpatientDischargeMedReconPanel.tsx"), "utf8");
    const print = readFileSync(
      join(__dirname, "../../components/encounters/DischargePrintLayout.tsx"),
      "utf8"
    );
    expect(meds).toContain("MedicationAutocomplete");
    expect(meds).toContain("InpatientDischargeMedicationLine1C");
    expect(meds).toContain('mode="prescribe"');
    expect(recon).toContain("finalizeInpatientMedRecon");
    expect(recon).toContain("noneDocumented");
    expect(recon).toContain("historyUnavailable");
    expect(recon).toContain("bulkContinue");
    expect(recon).toContain("recon-continue");
    expect(recon).toContain("recon-stop");
    expect(recon).toContain("recon-edit");
    expect(recon).toContain("allRequiredMedReconDecisionsComplete");
    expect(readFileSync(boardPath, "utf8")).toContain("buildInpatientDischargeMedReconPreload");
    expect(print).toContain("collectInpatientDischargeMedicationPrintFacts");
    expect(print).toContain("printOutput.dischargeMedications.sectionTitle");
  });

  it("draft med-recon save uses markComplete false (no finalizedAt on draft)", () => {
    const recon = readFileSync(join(__dirname, "InpatientDischargeMedReconPanel.tsx"), "utf8");
    expect(recon).toContain("markComplete");
    expect(recon).toContain("save(false)");
    expect(recon).toContain("save(true)");
  });
});
