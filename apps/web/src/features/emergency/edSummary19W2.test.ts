import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildVisitSummaryProviderDocumentationBlock,
  providerDocumentationToVisitSummaryBlock,
} from "@/features/emergency/erProviderDocumentationSummary";
import { buildErClinicalTimeline, buildErClinicalTimelineSourceRows } from "@/features/emergency/erClinicalTimeline";
import { buildEmergencyVisitSummaryModel } from "@/features/emergency/emergencyVisitSummaryModel";
import { getErPrintPacketHtml } from "@/features/emergency/erPrintPacket";

const CHART_EXPORT_SERVICE_SOURCE = readFileSync(
  new URL("../../../../api/src/encounters/chart-export.service.ts", import.meta.url),
  "utf8"
);
const CHART_EXPORT_HTML_SOURCE = readFileSync(
  new URL("../../../../api/src/encounters/chart-export-html.util.ts", import.meta.url),
  "utf8"
);

const workspaceNursingAssessment = {
  erProviderMseV1: {
    workspaceMetadata: {
      source: "PROVIDER_DOCUMENTATION_WORKSPACE",
      encounterMode: "ED",
      documentType: "INITIAL_PROVIDER_NOTE",
      savedAt: "2026-05-18T08:20:00.000Z",
      savedBy: "John Smith, MD",
    },
    chiefConcern: "Chest pain",
    hpiNarrative: "Douleur thoracique aiguë depuis 2 heures.",
    focusedImpression: "Chest pain, cardiac vs GI",
    examGeneralAppearance: "Patient alert, mild distress.",
    mdmWorkingAssessment: "Low suspicion ACS.",
    clinicalImpression: "Musculoskeletal chest wall pain.",
    treatmentPlan: "Analgesia and discharge instructions.",
    followUpDisposition: "Primary care follow-up in 3 days.",
  },
};

const baseEncounter = {
  id: "enc-1",
  createdAt: "2026-05-18T08:00:00.000Z",
  updatedAt: "2026-05-18T14:00:00.000Z",
  chiefComplaint: "Chest pain",
  visitReason: null,
  nursingAssessment: workspaceNursingAssessment,
  dischargeSummaryJson: { dischargeMode: "HOME" },
  admissionSummaryJson: null,
  physicianAssigned: { firstName: "John", lastName: "Smith" },
  providerDocumentationStatus: "SIGNED",
  providerDocumentationSignedAt: "2026-05-18T09:00:00.000Z",
  providerDocumentationSignedByDisplayFr: "John Smith, MD",
  providerAddenda: [
    {
      id: "add-1",
      text: "Addendum: patient tolerated treatment well.",
      createdAt: "2026-05-18T09:15:00.000Z",
      createdByDisplayFr: "John Smith, MD",
    },
  ],
  treatmentPlan: null,
  providerNote: null,
};

describe("edSummary19W2 — provider documentation section", () => {
  it("includes HPI/ROS/exam/MDM/impression/plan sections", () => {
    const block = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: workspaceNursingAssessment,
      locale: "en",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: baseEncounter.providerDocumentationSignedAt,
      providerDocumentationSignedByDisplayFr: baseEncounter.providerDocumentationSignedByDisplayFr,
      providerAddenda: baseEncounter.providerAddenda,
    });
    expect(block).not.toBeNull();
    const labels = block!.sections.map((s) => s.label);
    expect(labels).toEqual(expect.arrayContaining(["HPI", "ROS", "Physical Exam", "MDM", "Impression", "Plan"]));
    const joined = block!.sections.map((s) => s.text).join("\n");
    expect(joined).toContain("Douleur thoracique aiguë depuis 2 heures.");
  });

  it("includes saved/signed metadata", () => {
    const block = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: workspaceNursingAssessment,
      locale: "en",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: "2026-05-18T09:00:00.000Z",
      providerDocumentationSignedByDisplayFr: "John Smith, MD",
    });
    expect(block?.statusLine).toBe("Status: Signed");
    expect(block?.signedBy).toBe("John Smith, MD");
    const summary = providerDocumentationToVisitSummaryBlock(block!, "en");
    expect(summary.lines.join("\n")).toContain("John Smith, MD");
  });

  it("includes provider addenda", () => {
    const block = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: workspaceNursingAssessment,
      locale: "en",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: baseEncounter.providerDocumentationSignedAt,
      providerDocumentationSignedByDisplayFr: baseEncounter.providerDocumentationSignedByDisplayFr,
      providerAddenda: baseEncounter.providerAddenda,
    });
    expect(block?.addenda).toHaveLength(1);
    expect(block?.addenda[0]?.text).toContain("patient tolerated treatment well");
  });

  it("does not label unsigned documentation as signed", () => {
    const block = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: workspaceNursingAssessment,
      locale: "en",
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: "2026-05-18T09:00:00.000Z",
      providerDocumentationSignedByDisplayFr: "John Smith, MD",
    });
    expect(block?.statusLine).toBe("Status: Draft");
    expect(block?.signedBy).toBeNull();
    expect(block?.signedAt).toBeNull();
    const summary = providerDocumentationToVisitSummaryBlock(block!, "en");
    expect(summary.lines.join("\n")).not.toMatch(/Signed by/);
  });

  it("preserves saved French clinical text in English UI", () => {
    const block = buildVisitSummaryProviderDocumentationBlock({
      nursingAssessment: workspaceNursingAssessment,
      locale: "en",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: baseEncounter.providerDocumentationSignedAt,
      providerDocumentationSignedByDisplayFr: baseEncounter.providerDocumentationSignedByDisplayFr,
    });
    const hpi = block?.sections.find((s) => s.label === "HPI")?.text ?? "";
    expect(hpi).toContain("Douleur thoracique");
    expect(hpi).not.toContain("Acute pain translated");
  });
});

describe("edSummary19W2 — clinical timeline", () => {
  it("sorts entries chronologically", () => {
    const rows = buildErClinicalTimelineSourceRows({
      locale: "en",
      t: (k) => k,
      encounter: baseEncounter,
      triageSnapshot: { triageCompleteAt: "2026-05-18T08:02:00.000Z" },
      orders: [],
      marAdmins: [
        {
          id: "mar-1",
          medicationLabelSnapshot: "Ketorolac 30 mg",
          marAction: "administered",
          route: "IM",
          administeredAt: "2026-05-18T08:11:00.000Z",
          notes: "IM_INJECTION_SITE:right_deltoid",
          administeredBy: { firstName: "Marie", lastName: "Nurse" },
        },
      ],
      procedureEntries: [],
    });
    const timeline = buildErClinicalTimeline({
      locale: "en",
      t: (k) => k,
      encounter: baseEncounter,
      triageSnapshot: { triageCompleteAt: "2026-05-18T08:02:00.000Z" },
      orders: [],
      marAdmins: [
        {
          id: "mar-1",
          medicationLabelSnapshot: "Ketorolac 30 mg",
          marAction: "administered",
          route: "IM",
          administeredAt: "2026-05-18T08:11:00.000Z",
          notes: "IM_INJECTION_SITE:right_deltoid",
          administeredBy: { firstName: "Marie", lastName: "Nurse" },
        },
      ],
    });
    expect(timeline.dated[0]?.category).toBe("TRIAGE");
    expect(timeline.dated.some((e) => e.category === "MEDICATION_ADMINISTRATION")).toBe(true);
    expect(timeline.dated.some((e) => e.category === "PROVIDER_DOCUMENTATION")).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("uses short MAR/procedure summaries without duplicating full sections", () => {
    const timeline = buildErClinicalTimeline({
      locale: "en",
      t: (k) => (k === "marTab.actions.administered" ? "Administered" : k),
      encounter: baseEncounter,
      marAdmins: [
        {
          id: "mar-1",
          medicationLabelSnapshot: "Ketorolac 30 mg",
          marAction: "administered",
          route: "IM",
          administeredAt: "2026-05-18T08:11:00.000Z",
          notes: null,
          administeredBy: { firstName: "Marie", lastName: "Nurse" },
        },
      ],
      procedureEntries: [
        {
          id: "proc-1",
          documentedAt: "2026-05-18T08:25:00.000Z",
          documentedByDisplayName: "John Smith, MD",
          documentationRole: "PROVIDER",
          payload: {
            procedureType: "LACERATION_REPAIR",
            performedAt: "2026-05-18T08:25:00.000Z",
            notes: "Very long procedure note that should not appear in full inside timeline reference.",
          },
        },
      ],
    });
    const mar = timeline.all.find((e) => e.category === "MEDICATION_ADMINISTRATION");
    expect(mar?.summary).toContain("Ketorolac");
    expect(mar?.summary.length).toBeLessThan(120);
    const proc = timeline.all.find((e) => e.category === "PROCEDURE_PROVIDER_NOTE");
    expect(proc?.summary).not.toContain("Very long procedure note");
  });
});

describe("edSummary19W2 — ER packet and chart export", () => {
  it("ER packet includes full provider documentation and clinical timeline", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T08:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: "HOME" },
        nursingAssessment: workspaceNursingAssessment,
        providerDocumentationStatus: "SIGNED",
        providerDocumentationSignedAt: "2026-05-18T09:00:00.000Z",
        providerDocumentationSignedByDisplayFr: "John Smith, MD",
        providerAddenda: baseEncounter.providerAddenda,
      },
      triageSnapshot: { triageCompleteAt: "2026-05-18T08:02:00.000Z" },
      language: "en",
      clinicalTimelineEntries: buildErClinicalTimeline({
        locale: "en",
        t: (k) => k,
        encounter: baseEncounter,
        triageSnapshot: { triageCompleteAt: "2026-05-18T08:02:00.000Z" },
      }).all,
    });
    expect(html).toContain("Provider documentation (ED)");
    expect(html).toContain("Clinical timeline");
    expect(html).toContain("Douleur thoracique");
    expect(html).toContain("Provider ED note signed");
  });

  it("chart export JSON/HTML include ed clinical timeline", () => {
    expect(CHART_EXPORT_SERVICE_SOURCE).toContain("edClinicalTimeline");
    expect(CHART_EXPORT_SERVICE_SOURCE).toContain("buildEdClinicalTimelineForChartExport");
    expect(CHART_EXPORT_HTML_SOURCE).toContain("Clinical timeline");
    expect(CHART_EXPORT_HTML_SOURCE).toContain("edClinicalTimelineHtml");
  });

  it("model exposes providerDocumentation without suppressing current note when history exists", () => {
    const model = buildEmergencyVisitSummaryModel(baseEncounter, null, null, "en", null, [
      {
        id: "hist-1",
        eventType: "PROVIDER_MSE_SAVED",
        createdAt: "2026-05-18T07:00:00.000Z",
        payloadJson: {},
      },
    ]);
    expect(model.providerDocumentation).not.toBeNull();
    expect(model.evaluationMedicale).not.toBeNull();
    expect(model.providerMseHistory.length).toBeGreaterThan(0);
  });

  it("does not change save/autosave or MAR modules", () => {
    expect(
      readFileSync(
        new URL("../../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
        "utf8"
      )
    ).not.toContain("buildErClinicalTimeline");
  });
});
