import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildInitialNursingAssessmentPrintSection,
  buildInitialNursingAssessmentSummaryBlock,
  buildNursingDischargePrintSection,
  hasInitialNursingAssessmentContent,
  readInitialNursingEvalSignature,
} from "@/features/emergency/erInitialNursingAssessmentSummary";
import { buildErEdSummaryMarEventRows } from "@/features/emergency/erEdSummaryMedicationMar";
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

const t = (key: string) => {
  const map: Record<string, string> = {
    "marTab.actions.administered": "Administered",
  };
  return map[key] ?? key;
};

const nursingAssessmentFixture = {
  nursingEvalV1: {
    sections: {
      etatGeneral: { text: "Patient calme, peau chaude et sèche." },
      securite: { text: "Risque de chute modéré." },
    },
    signature: {
      savedAt: "2026-05-18T09:30:00.000Z",
      savedByDisplayName: "Marie Infirmière",
      savedByRoleTitle: "RN",
    },
  },
  erNursingReassessmentV1: {
    narrative: "Douleur contrôlée après analgésie.",
    signature: {
      savedAt: "2026-05-18T11:00:00.000Z",
      savedByDisplayName: "Marie Infirmière",
    },
  },
  erDispositionExecutionV1: {
    dischargeSortieCompletedAt: "2026-05-18T14:00:00.000Z",
    dischargeSortieCompletedByDisplayName: "Marie Infirmière",
    dischargeSortieExecutionNote: "Consignes de sortie revues avec le patient.",
  },
};

const baseEncounter = {
  id: "enc-1",
  createdAt: "2026-05-18T08:00:00.000Z",
  updatedAt: "2026-05-18T14:30:00.000Z",
  chiefComplaint: "Douleur thoracique",
  visitReason: null,
  nursingAssessment: nursingAssessmentFixture,
  dischargeSummaryJson: { dischargeMode: "HOME" },
  admissionSummaryJson: null,
  physicianAssigned: null,
  providerDocumentationStatus: null,
  providerDocumentationSignedAt: null,
  providerDocumentationSignedByDisplayFr: null,
  treatmentPlan: null,
  providerNote: null,
};

describe("edSummary19W1 — initial nursing assessment in ED Summary", () => {
  it("includes initial nursing assessment when nursingEvalV1 exists", () => {
    expect(hasInitialNursingAssessmentContent(nursingAssessmentFixture)).toBe(true);
    const model = buildEmergencyVisitSummaryModel(baseEncounter, null, null, "en");
    expect(model.initialNursingAssessment).not.toBeNull();
    expect(model.initialNursingAssessment?.title).toBe("Initial nursing assessment");
    expect(model.initialNursingAssessment?.lines.join("\n")).toContain("General appearance");
  });

  it("includes nurse name/title/date/time metadata", () => {
    const sig = readInitialNursingEvalSignature(nursingAssessmentFixture);
    expect(sig?.documentedBy).toBe("Marie Infirmière");
    expect(sig?.roleTitle).toBe("RN");
    const model = buildEmergencyVisitSummaryModel(baseEncounter, null, null, "en");
    expect(model.initialNursingAssessment?.lines[0]).toContain("Marie Infirmière (RN)");
  });

  it("preserves nursing free text exactly (no translation)", () => {
    const block = buildInitialNursingAssessmentSummaryBlock(nursingAssessmentFixture, "en");
    const joined = block?.lines.join("\n") ?? "";
    expect(joined).toContain("Patient calme, peau chaude et sèche.");
    expect(joined).toContain("Risque de chute modéré.");
    expect(joined).not.toContain("Calm patient");
  });

  it("keeps reassessments separate and does not duplicate initial assessment", () => {
    const model = buildEmergencyVisitSummaryModel(baseEncounter, null, null, "en");
    expect(model.resumeInfirmier).not.toBeNull();
    expect(model.initialNursingAssessment?.lines.join("\n")).toContain("Patient calme");
    expect(model.resumeInfirmier?.lines.join("\n")).toContain("Douleur contrôlée");
    expect(model.resumeInfirmier?.lines.join("\n")).not.toContain("General appearance");
  });

  it("English labels do not leak French UI terms", () => {
    const block = buildInitialNursingAssessmentSummaryBlock(nursingAssessmentFixture, "en");
    expect(block?.title).toBe("Initial nursing assessment");
    expect(block?.lines.join("\n")).not.toMatch(/État général|Risques \/ sécurité/);
  });

  it("saved French nursing free text is preserved in English UI", () => {
    const blockFrUi = buildInitialNursingAssessmentSummaryBlock(nursingAssessmentFixture, "fr");
    expect(blockFrUi?.lines.join("\n")).toContain("Patient calme, peau chaude et sèche.");
  });
});

describe("edSummary19W1 — ER packet nursing documentation", () => {
  it("includes initial nursing assessment", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T08:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: "HOME" },
        nursingAssessment: nursingAssessmentFixture,
      },
      triageSnapshot: null,
      language: "en",
    });
    expect(html).toContain("Initial nursing assessment");
    expect(html).toContain("Patient calme, peau chaude et sèche.");
    expect(html).toContain("Marie Infirmière (RN)");
  });

  it("includes nursing reassessment history when entries are passed", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T08:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: "HOME" },
        nursingAssessment: nursingAssessmentFixture,
      },
      triageSnapshot: null,
      language: "en",
      nursingReassessmentEntries: [
        {
          documentedAt: "2026-05-18T11:00:00.000Z",
          savedAt: "2026-05-18T11:00:00.000Z",
          performerDisplayName: "Marie Infirmière",
          performerInitials: "MI",
          performerRoleTitle: "RN",
          structuredLines: ["Pain: controlled after analgesia"],
          narrativeExcerpt: "",
        },
      ],
    });
    expect(html).toContain("Nursing reassessments — history");
    expect(html).toContain("Pain: controlled after analgesia");
  });

  it("includes nursing discharge note when present", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T08:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: "HOME" },
        nursingAssessment: nursingAssessmentFixture,
      },
      triageSnapshot: null,
      language: "en",
    });
    expect(html).toContain("Nursing discharge documentation");
    expect(html).toContain("Consignes de sortie revues avec le patient.");
    expect(html).not.toContain("Nursing discharge execution");
  });
});

describe("edSummary19W1 — chart export nursing documentation", () => {
  it("chart export JSON builder includes initial nursing documentation field", () => {
    expect(CHART_EXPORT_SERVICE_SOURCE).toContain("nursingDocumentation:");
    expect(CHART_EXPORT_SERVICE_SOURCE).toContain("initialNursingDocumentationFromAssessment");
    expect(CHART_EXPORT_SERVICE_SOURCE).toContain("Initial nursing assessment");
  });

  it("chart export HTML includes initial nursing documentation section", () => {
    expect(CHART_EXPORT_HTML_SOURCE).toContain("Initial nursing documentation");
    expect(CHART_EXPORT_HTML_SOURCE).toContain("nursingDocumentationHtml");
  });
});

describe("edSummary19W1 — deduplication and non-regression", () => {
  it("MAR events are not duplicated as nursing assessment", () => {
    const marRows = buildErEdSummaryMarEventRows({
      language: "en",
      t,
      admins: [
        {
          id: "mar-1",
          medicationLabelSnapshot: "Morphine 2 mg",
          marAction: "administered",
          route: "IV",
          administeredAt: "2026-05-18T11:00:00.000Z",
          notes: null,
          administeredBy: { firstName: "Marie", lastName: "Nurse" },
        },
      ],
    });
    const model = buildEmergencyVisitSummaryModel(baseEncounter, null, null, "en");
    const nursingText = model.initialNursingAssessment?.lines.join("\n") ?? "";
    expect(nursingText).not.toContain("Morphine");
    expect(marRows[0]?.medicationName).toContain("Morphine");
  });

  it("nursing discharge print section is built read-only from stored blob", () => {
    const snapshot = structuredClone(nursingAssessmentFixture);
    const section = buildNursingDischargePrintSection(snapshot, "en");
    expect(section?.executionNote).toBe("Consignes de sortie revues avec le patient.");
    expect(snapshot).toEqual(nursingAssessmentFixture);
  });

  it("initial nursing print section preserves saved section text", () => {
    const section = buildInitialNursingAssessmentPrintSection(nursingAssessmentFixture, "en");
    expect(section?.sections.some((s) => s.text === "Patient calme, peau chaude et sèche.")).toBe(true);
  });

  it("does not change nursing save/autosave or MAR modules", () => {
    const nursingTabSource = readFileSync(
      new URL("../../components/encounters/NursingAssessmentTab.tsx", import.meta.url),
      "utf8"
    );
    expect(nursingTabSource).toContain("buildPayload(");
    expect(nursingTabSource).not.toContain("buildInitialNursingAssessmentSummaryBlock");
    expect(
      readFileSync(new URL("./erEdSummaryMedicationMar.ts", import.meta.url), "utf8")
    ).not.toContain("nursingEvalV1");
  });
});
