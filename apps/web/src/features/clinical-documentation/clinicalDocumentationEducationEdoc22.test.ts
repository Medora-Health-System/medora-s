import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
  PATIENT_EDUCATION_SESSION_CARD_ID,
  TEACH_BACK_VERIFICATION_CARD_ID,
  summarizePatientEducationDischargePayload,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation education (EDOC.22)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationEducationForm.tsx"),
    "utf8"
  );
  const chartTabs = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartClinicalTabs.tsx"),
    "utf8"
  );
  const printLayout = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartPrintLayout.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.22 education form", () => {
    expect(hub).toContain("isEdoc22PatientEducationDischargeTeachingDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationEducationForm");
  });

  it("form exposes cards with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-education-form");
    expect(form).toContain("EDU_PATIENT_TOPIC_OPTIONS");
    expect(form).toContain("EDU_TEACH_BACK_TOPIC_OPTIONS");
    expect(form).toContain("EDU_BARRIER_TYPE_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validatePatientEducationDischargeTeachingDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("bilingual education form keys mirrored", () => {
    expect(en).toContain("education:");
    expect(fr).toContain("education:");
    expect(en).toContain("teachBackSuccessful:");
    expect(fr).toContain("teachBackSuccessful:");
    expect(en).toContain("barrierType:");
    expect(fr).toContain("barrierType:");
  });

  it("patient chart and print layout support education export path", () => {
    expect(chartTabs).toContain("clinicalDocumentationEntries");
    expect(chartTabs).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain("clinicalDocumentationEntries");
    expect(printLayout).toContain("selectClinicalDocumentationPayloadSummary");
  });

  it("EN and FR summaries render", () => {
    const enSummary = summarizePatientEducationDischargePayload(
      PATIENT_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: "2026-05-28T14:00:00.000Z",
        topic: "MEDICATIONS",
        audience: "PATIENT",
        interpreterUsed: "NO",
        educationProvided: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      },
      "en"
    );
    expect(enSummary.some((l) => l.key === "Topic")).toBe(true);

    const frSummary = summarizePatientEducationDischargePayload(
      DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
      {
        reviewTime: "2026-05-28T14:00:00.000Z",
        instructionsReviewed: "YES",
        warningSignsReviewed: "YES",
        activityRestrictionsReviewed: "YES",
        dietInstructionsReviewed: "YES",
        followUpReviewed: "YES",
        teachBackCompleted: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(frSummary.some((l) => l.key === "Consignes revues")).toBe(true);

    const teachBack = summarizePatientEducationDischargePayload(
      TEACH_BACK_VERIFICATION_CARD_ID,
      {
        verificationTime: "2026-05-28T14:00:00.000Z",
        topicReviewed: "DISCHARGE",
        teachBackSuccessful: "YES",
        additionalEducationRequired: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(teachBack.some((l) => l.key === "Successful")).toBe(true);
  });
});
