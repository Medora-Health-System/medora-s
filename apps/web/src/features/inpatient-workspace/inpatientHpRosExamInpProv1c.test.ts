/**
 * INP.PROV.1C — ROS / Physical Exam persistence + legal-text projection tests.
 */

import { describe, expect, it } from "vitest";
import {
  EXAM_SYSTEM_CODES,
  ROS_SYSTEM_CODES,
  emptyInpatientProviderWorkspaceV1,
  saveProviderHpDraft,
  signProviderHpDraft,
} from "@medora/shared";
import {
  applyAllSystemsNegative,
  applyNormalExam,
  buildInpatientExamNormalFindingsFromEdCatalog,
  buildInpatientRosNegativeFindingsFromEdCatalog,
  emptyInpatientHpSystemsDocument,
  INP_HP_SYSTEMS_STRUCTURED_KIND,
  INP_PROV_1C_ED_ROS_SOURCE,
  parseInpatientHpSystemsDocument,
  serializeInpatientHpSystemsDocument,
  updateInpatientHpSystemFinding,
} from "./inpatientHpRosExamInpProv1c";
import {
  buildProviderSmartAssistSuggestions,
  canInsertSmartAssistIntoHpSection,
} from "./providerDocumentationSmartAssistInpProv1b";

describe("INP.PROV.1C ROS / Exam projection", () => {
  it("reuses the ED complete-normal ROS catalog text", () => {
    expect(INP_PROV_1C_ED_ROS_SOURCE).toContain("Constitutional:");
    expect(INP_PROV_1C_ED_ROS_SOURCE).toContain("Respiratory:");
    const negatives = buildInpatientRosNegativeFindingsFromEdCatalog();
    expect(negatives.CONSTITUTIONAL).toMatch(/Denies fever/i);
    expect(negatives.RESPIRATORY).toMatch(/Denies cough/i);
    expect(negatives.OTHER).toMatch(/vision|ear pain|allergies/i);
  });

  it("maps ED exam fragment catalogs onto inpatient exam systems (no reassessment)", () => {
    const normals = buildInpatientExamNormalFindingsFromEdCatalog();
    expect(normals.GENERAL).toMatch(/alert/i);
    expect(normals.CARDIOVASCULAR).toMatch(/regular rate/i);
    expect(normals.RESPIRATORY).toMatch(/breath/i);
    expect(normals.OTHER).toBeUndefined();
  });

  it("primary bulk fills only undocumented ROS systems and preserves positives", () => {
    let doc = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    expect(doc.systems).toHaveLength(ROS_SYSTEM_CODES.length);
    for (const row of doc.systems) {
      expect(row.status).toBe("NEGATIVE");
    }
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    const again = applyAllSystemsNegative(doc, { replaceAll: false });
    expect(again.systems.find((s) => s.systemCode === "RESPIRATORY")).toEqual({
      systemCode: "RESPIRATORY",
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    expect(again.systems.find((s) => s.systemCode === "CARDIOVASCULAR")?.status).toBe(
      "NEGATIVE"
    );
  });

  it("explicit replaceAll clears exceptions and additional notes", () => {
    let doc = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "POSITIVE",
      text: "Dyspnea.",
    });
    doc = { ...doc, additionalNotes: "Legacy narrative" };
    const replaced = applyAllSystemsNegative(doc, { replaceAll: true });
    expect(replaced.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe(
      "NEGATIVE"
    );
    expect(replaced.additionalNotes).toBe("");
  });

  it("serializes human-readable legal ROS text without codes or structured markers", () => {
    let doc = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    const { text, structured } = serializeInpatientHpSystemsDocument(doc, "ROS");
    expect(structured.kind).toBe(INP_HP_SYSTEMS_STRUCTURED_KIND);
    expect(text).toContain("REVIEW OF SYSTEMS");
    expect(text).toContain("Constitutional: Negative");
    expect(text).toContain(
      "Respiratory: Positive — Shortness of breath and productive cough."
    );
    expect(text).not.toMatch(/\bCONSTITUTIONAL\b/);
    expect(text).not.toContain("INP_HP_SYSTEMS_V1");
    expect(text).not.toContain("{");
  });

  it("serializes human-readable legal Physical Exam text", () => {
    let doc = applyNormalExam(emptyInpatientHpSystemsDocument("PHYSICAL_EXAM"));
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "ABNORMAL",
      text: "Diminished breath sounds at bilateral bases.",
    });
    const { text } = serializeInpatientHpSystemsDocument(doc, "PHYSICAL_EXAM");
    expect(text).toContain("PHYSICAL EXAMINATION");
    expect(text).toMatch(/General:/);
    expect(text).toContain(
      "Respiratory: Abnormal — Diminished breath sounds at bilateral bases."
    );
    expect(text).not.toMatch(/\bRESPIRATORY\b/);
  });

  it("parse(serialize) round-trips clinical state", () => {
    let doc = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    doc = updateInpatientHpSystemFinding(doc, "NEUROLOGIC", {
      status: "NOT_ASSESSED",
      text: "",
    });
    doc = { ...doc, additionalNotes: "Extra ROS note." };
    const { text, structured } = serializeInpatientHpSystemsDocument(doc, "ROS");
    const fromStructured = parseInpatientHpSystemsDocument({
      kind: "ROS",
      text,
      structured,
    });
    expect(fromStructured.systems.find((s) => s.systemCode === "RESPIRATORY")).toEqual({
      systemCode: "RESPIRATORY",
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    expect(fromStructured.additionalNotes).toBe("Extra ROS note.");

    const fromTextOnly = parseInpatientHpSystemsDocument({
      kind: "ROS",
      text,
      structured: null,
    });
    expect(fromTextOnly.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe(
      "POSITIVE"
    );
    expect(fromTextOnly.systems.find((s) => s.systemCode === "CARDIOVASCULAR")?.status).toBe(
      "NEGATIVE"
    );
  });

  it("preserves legacy free-text ROS without classifying as normal", () => {
    const legacy = "Patient denies chest pain. Long narrative without system headers.";
    const parsed = parseInpatientHpSystemsDocument({
      kind: "ROS",
      text: legacy,
      structured: null,
    });
    expect(parsed.additionalNotes).toBe(legacy);
    expect(parsed.systems.every((s) => s.status === "UNDOCUMENTED")).toBe(true);
    const { text } = serializeInpatientHpSystemsDocument(parsed, "ROS");
    expect(text).toContain("Additional ROS notes:");
    expect(text).toContain(legacy);
    expect(text).not.toContain("Negative —");
  });

  it("saveProviderHpDraft persists text+structured; sign preserves; mutation blocked", () => {
    let workspace = emptyInpatientProviderWorkspaceV1();
    let ros = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    ros = updateInpatientHpSystemFinding(ros, "RESPIRATORY", {
      status: "POSITIVE",
      text: "Shortness of breath and productive cough.",
    });
    const rosSer = serializeInpatientHpSystemsDocument(ros, "ROS");
    const savedRos = saveProviderHpDraft({
      doc: workspace,
      sectionKey: "ROS",
      text: rosSer.text,
      structured: rosSer.structured,
      clientExpectedVersion: workspace.expectedVersion,
      actorUserId: "u1",
    });
    expect(savedRos.ok).toBe(true);
    if (!savedRos.ok) return;
    workspace = savedRos.doc;

    let exam = applyNormalExam(emptyInpatientHpSystemsDocument("PHYSICAL_EXAM"));
    exam = updateInpatientHpSystemFinding(exam, "RESPIRATORY", {
      status: "ABNORMAL",
      text: "Diminished breath sounds at bilateral bases.",
    });
    const examSer = serializeInpatientHpSystemsDocument(exam, "PHYSICAL_EXAM");
    const savedExam = saveProviderHpDraft({
      doc: workspace,
      sectionKey: "PHYSICAL_EXAM",
      text: examSer.text,
      structured: examSer.structured,
      clientExpectedVersion: workspace.expectedVersion,
      actorUserId: "u1",
    });
    expect(savedExam.ok).toBe(true);
    if (!savedExam.ok) return;
    workspace = savedExam.doc;

    const reloadedRos = parseInpatientHpSystemsDocument({
      kind: "ROS",
      text: workspace.hpDraft?.sections?.ROS?.text,
      structured: workspace.hpDraft?.sections?.ROS?.structured ?? null,
    });
    expect(reloadedRos.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe(
      "POSITIVE"
    );
    expect(workspace.hpDraft?.sections?.ROS?.text).toContain("REVIEW OF SYSTEMS");
    expect(workspace.hpDraft?.sections?.ROS?.text).not.toContain("INP_HP_SYSTEMS_V1");

    const reloadedExam = parseInpatientHpSystemsDocument({
      kind: "PHYSICAL_EXAM",
      text: workspace.hpDraft?.sections?.PHYSICAL_EXAM?.text,
      structured: workspace.hpDraft?.sections?.PHYSICAL_EXAM?.structured ?? null,
    });
    expect(reloadedExam.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe(
      "ABNORMAL"
    );
    expect(reloadedExam.systems.find((s) => s.systemCode === "GENERAL")?.status).toBe("NORMAL");

    const signed = signProviderHpDraft({
      doc: workspace,
      actorUserId: "u1",
      clientExpectedVersion: workspace.expectedVersion,
    });
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(signed.doc.hpDraft?.status).toBe("SIGNED");
    expect(signed.doc.hpDraft?.sections?.ROS?.text).toBe(rosSer.text);
    expect(signed.doc.hpDraft?.sections?.PHYSICAL_EXAM?.text).toBe(examSer.text);
    expect(signed.doc.hpDraft?.sections?.ROS?.structured?.kind).toBe(
      INP_HP_SYSTEMS_STRUCTURED_KIND
    );

    const blocked = saveProviderHpDraft({
      doc: signed.doc,
      sectionKey: "ROS",
      text: "overwrite",
      clientExpectedVersion: signed.doc.expectedVersion,
      actorUserId: "u1",
    });
    expect(blocked.ok).toBe(false);
  });

  it("Normal Exam preserves explicit abnormalities unless replaceAll", () => {
    let doc = applyNormalExam(emptyInpatientHpSystemsDocument("PHYSICAL_EXAM"));
    doc = updateInpatientHpSystemFinding(doc, "RESPIRATORY", {
      status: "ABNORMAL",
      text: "Diminished bases.",
    });
    const merged = applyNormalExam(doc, { replaceAll: false });
    expect(merged.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe("ABNORMAL");
    expect(merged.systems.find((s) => s.systemCode === "GENERAL")?.status).toBe("NORMAL");
    const wiped = applyNormalExam(doc, { replaceAll: true });
    expect(wiped.systems.find((s) => s.systemCode === "RESPIRATORY")?.status).toBe("NORMAL");
  });

  it("empty document serializes to empty legal text", () => {
    const empty = emptyInpatientHpSystemsDocument("ROS");
    const { text } = serializeInpatientHpSystemsDocument(empty, "ROS");
    expect(text).toBe("");
  });
});

describe("INP.PROV.1C Smart Assist destination integrity", () => {
  const lab = {
    kind: "lab" as const,
    hpSectionHint: "DIAGNOSTICS_REVIEWED" as const,
  };
  const problem = {
    kind: "problem" as const,
    hpSectionHint: "ASSESSMENT_PLAN" as const,
  };
  const order = {
    kind: "order" as const,
    hpSectionHint: "ASSESSMENT_PLAN" as const,
  };

  it("blocks lab/order/problem insert into ROS and Physical Exam", () => {
    expect(canInsertSmartAssistIntoHpSection("ROS", lab)).toBe(false);
    expect(canInsertSmartAssistIntoHpSection("PHYSICAL_EXAM", lab)).toBe(false);
    expect(canInsertSmartAssistIntoHpSection("ROS", order)).toBe(false);
    expect(canInsertSmartAssistIntoHpSection("PHYSICAL_EXAM", problem)).toBe(false);
  });

  it("allows Diagnostics Reviewed for labs and Assessment/Plan for problems/orders", () => {
    expect(canInsertSmartAssistIntoHpSection("DIAGNOSTICS_REVIEWED", lab)).toBe(true);
    expect(canInsertSmartAssistIntoHpSection("ASSESSMENT_PLAN", problem)).toBe(true);
    expect(canInsertSmartAssistIntoHpSection("ASSESSMENT_PLAN", order)).toBe(true);
    expect(canInsertSmartAssistIntoHpSection("HPI", lab)).toBe(false);
  });

  it("builds suggestions from canonical chart facts only", () => {
    const suggestions = buildProviderSmartAssistSuggestions({
      sections: { SUBJECTIVE: "", OBJECTIVE: "", ASSESSMENT: "", PLAN: "" },
      synthesis: {
        overview: { primaryDiagnosis: "Sepsis" },
        laboratories: {
          trending: [{ label: "WBC", current: "15.2", previous: "12", direction: "UP" }],
        },
      },
      orders: [
        {
          id: "o1",
          status: "ACTIVE",
          items: [{ id: "i1", displayLabel: "IV antibiotics", status: "ACTIVE" }],
        },
      ],
      noteStatus: "DRAFT",
      noteType: "HP",
      activeHpSection: "ROS",
    });
    expect(suggestions.some((s) => s.kind === "lab")).toBe(true);
    expect(suggestions.some((s) => s.kind === "problem")).toBe(true);
    for (const s of suggestions) {
      expect(canInsertSmartAssistIntoHpSection("ROS", s)).toBe(false);
      expect(canInsertSmartAssistIntoHpSection("PHYSICAL_EXAM", s)).toBe(false);
    }
  });
});

describe("INP.PROV.1C print/summary text contract", () => {
  it("print package body uses section text only (no structured leakage)", () => {
    const doc = applyAllSystemsNegative(emptyInpatientHpSystemsDocument("ROS"));
    const { text, structured } = serializeInpatientHpSystemsDocument(doc, "ROS");
    const printBody = `ROS: ${text}`;
    expect(printBody).toContain("REVIEW OF SYSTEMS");
    expect(JSON.stringify(structured)).toContain("INP_HP_SYSTEMS_V1");
    expect(printBody).not.toContain("INP_HP_SYSTEMS_V1");
    expect(printBody).not.toContain('"kind"');
  });
});
