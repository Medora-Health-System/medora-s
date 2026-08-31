import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emptyDischargeForm } from "@/lib/encounterDischarge";
import { buildProviderDischargeJsonForSave } from "./ProviderDischargeDocumentationSection";
import {
  ER_DISCHARGE_MODE_ADMISSION,
  ER_DISCHARGE_MODE_AMA,
  ER_DISCHARGE_MODE_DECEASED,
  ER_DISCHARGE_MODE_HOME,
  ER_DISCHARGE_MODE_LWBS,
  ER_DISCHARGE_MODE_OTHER,
  ER_DISCHARGE_MODE_TRANSFER,
  mergeErDischargeForEncounterPatch,
  outcomeUiToDischargeMode,
  type ErDispositionOutcomeUi,
} from "./emergencyDispositionV1";
import { erDispositionBadgeFromEncounterJson } from "./erTrackboardDispositionBadge";
import {
  applyProviderDischargeDocumentationToDischargeForm,
  emptyProviderDischargeDocumentationForm,
  mergeCanonicalErDispositionIntoDischargeJson,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  providerDischargeDictationTextareaId,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { getErPrintPacketHtml } from "./erPrintPacket";
import { buildEmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function completeCard(
  id: string,
  sourceEncounterDiagnosisId: string,
  code: string,
  displayName: string,
  opts?: { isPrimaryDiagnosis?: boolean; displayOrder?: number }
) {
  return {
    id,
    sourceEncounterDiagnosisId,
    encounterDiagnosisId: sourceEncounterDiagnosisId,
    code,
    displayName,
    isPrimaryDiagnosis: opts?.isPrimaryDiagnosis ?? false,
    displayOrder: opts?.displayOrder ?? 0,
    description: `Description for ${code}`,
    diagnosisInstructions: `Instructions for ${code}`,
    medicationTreatment: `Medication for ${code}`,
    treatment: "",
    returnPrecautions: "",
    returnWorkSchool: "",
    followUps: [],
    medicationLines: [],
    templateMeta: {
      templateId: "chest_pain_v1",
      templateVersion: "1.0.0",
      matchLevel: "icdExact" as const,
      sourceReferences: ["Ref"],
      templateAppliedHash: "abc123hash",
    },
    sourceTemplateId: "chest_pain_v1",
  };
}

function sampleProviderForm(): ProviderDischargeDocumentationForm {
  return normalizeProviderDischargeDiagnosisCards({
    ...emptyProviderDischargeDocumentationForm(),
    patientLeftEdAt: "2026-05-18T20:00:00.000Z",
    diagnosisRefs: [{ encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain", isPrimary: true }],
    diagnosisDocs: [completeCard("doc-1", "dx-1", "R07.9", "Chest pain", { isPrimaryDiagnosis: true })],
    returnPrecautions: "Return if chest pain worsens",
    returnWorkSchool: "May return to work in 2 days",
    followUps: [{ ...newDefaultFollowUpRow(), providerOrFacility: "Dr Smith", timing: "1 week" }],
  });
}

function saveWithOutcome(
  outcome: ErDispositionOutcomeUi,
  providerForm = sampleProviderForm()
): Record<string, unknown> {
  const dischargeForm = applyProviderDischargeDocumentationToDischargeForm(emptyDischargeForm(), providerForm);
  const canonical = mergeErDischargeForEncounterPatch({}, dischargeForm, false, true, outcome);
  return buildProviderDischargeJsonForSave(
    {},
    providerForm,
    { documentedAt: "2026-05-18T18:00:00.000Z", documentedByDisplayName: "Dr Test", documentedByTitle: "MD" },
    canonical
  );
}

describe("edDisposition19Z — canonical disposition sync / trackboard / preview", () => {
  it("1. saving Primary Decision discharge home updates canonical dischargeMode", () => {
    const saved = saveWithOutcome("HOME");
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_HOME);
  });

  it("2. trackboard model shows discharge decision after save", () => {
    const saved = saveWithOutcome("HOME");
    const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
    expect(badge?.variant).toBe("discharge");
    expect(badge?.source).toBe("dischargeMode");
  });

  it("3. trackboard does not remain without disposition badge after discharge home saved", () => {
    const saved = saveWithOutcome("HOME");
    const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
    expect(badge).not.toBeNull();
    expect(badge!.shortLabel).toMatch(/Sortie|SORTIE/i);
  });

  it("4. transfer decision appears in trackboard model", () => {
    const saved = saveWithOutcome("TRANSFER");
    const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
    expect(badge?.variant).toBe("transfer");
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_TRANSFER);
  });

  it("5. AMA decision appears in trackboard model", () => {
    const saved = saveWithOutcome("AMA");
    const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
    expect(badge?.variant).toBe("ama");
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_AMA);
  });

  it("6. LWBS decision appears in trackboard model", () => {
    const saved = saveWithOutcome("LWBS");
    const badge = erDispositionBadgeFromEncounterJson({
      dischargeSummaryJson: saved,
      nursingAssessment: { erDispositionV1: { lwbsNarrative: "Patient left before evaluation" } },
    });
    expect(badge?.variant).toBe("lwbs");
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_LWBS);
  });

  it("7. admission/observation decision appears in trackboard model", () => {
    const saved = saveWithOutcome("ADMISSION");
    const badge = erDispositionBadgeFromEncounterJson({
      dischargeSummaryJson: saved,
      admissionSummaryJson: { careLevel: "Observation" },
    });
    expect(badge?.variant).toBe("observe");
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_ADMISSION);
  });

  it("7a. governed admission decision appears without a duplicate discharge mode", () => {
    const badge = erDispositionBadgeFromEncounterJson({
      admissionSummaryJson: {
        admissionDecisionMode: "SIGN",
        careLevel: "MEDICAL_SURGICAL",
      },
    });
    expect(badge).toMatchObject({ variant: "admit", shortLabel: "Admission" });
  });

  it("7b. canonical packet level of care distinguishes observation", () => {
    const badge = erDispositionBadgeFromEncounterJson({
      admissionSummaryJson: {
        admissionDecisionMode: "SIGN",
        admissionPacketV1: { levelOfCareCode: "OBSERVATION" },
      },
    });
    expect(badge).toMatchObject({ variant: "observe", shortLabel: "Observation" });
  });

  it("8. right-side disposition preview includes provider discharge diagnosis documentation", () => {
    const form = sampleProviderForm();
    const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
    const docSection = sections.find((s) => s.id === "providerDoc");
    expect(docSection).toBeDefined();
    expect(docSection!.lines.some((l) => l.includes("R07.9"))).toBe(true);
    expect(docSection!.lines.some((l) => l.includes("Description for R07.9"))).toBe(true);
    expect(docSection!.lines.some((l) => l.includes("Instructions for R07.9"))).toBe(true);
    expect(docSection!.lines.some((l) => l.includes("Medication for R07.9"))).toBe(true);
  });

  it("9. preview includes shared return precautions once", () => {
    const form = sampleProviderForm();
    const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
    const planning = sections.find((s) => s.id === "providerPlanning");
    expect(planning).toBeDefined();
    const precautionLines = planning!.lines.filter((l) => l.includes("Return if chest pain worsens"));
    expect(precautionLines.length).toBe(1);
  });

  it("10. preview includes follow-up once", () => {
    const form = sampleProviderForm();
    const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
    const planning = sections.find((s) => s.id === "providerPlanning");
    expect(planning!.lines.some((l) => l.includes("Dr Smith"))).toBe(true);
    expect(planning!.lines.some((l) => l.includes("1 week"))).toBe(true);
  });

  it("11. preview excludes template hashes and governance metadata", () => {
    const form = sampleProviderForm();
    const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en");
    const joined = sections.flatMap((s) => s.lines).join("\n");
    expect(joined).not.toContain("abc123hash");
    expect(joined).not.toContain("clinicalReviewStatus");
    expect(joined).not.toContain("sourceTemplateId");
    expect(joined).not.toContain("templateAppliedHash");
  });

  it("12. ED Summary includes provider discharge documentation after save", () => {
    const saved = saveWithOutcome("HOME");
    const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    expect(block).not.toBeNull();
    expect(block!.lines.some((l) => l.includes("Dr Test"))).toBe(true);
    expect(block!.lines.some((l) => l.includes("Description for R07.9"))).toBe(true);
    expect(block!.lines.some((l) => l.includes("Return if chest pain worsens"))).toBe(true);
  });

  it("13. ER packet includes provider discharge documentation after save", () => {
    const saved = saveWithOutcome("HOME");
    const html = getErPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Dupont", dob: "1980-01-01", sex: "M" },
      encounter: {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: saved,
        nursingAssessment: {},
      },
      triageSnapshot: null,
      language: "fr",
    });
    expect(html).toContain("Description for R07.9");
    expect(html).toContain("Return if chest pain worsens");
    expect(html).not.toContain("abc123hash");
  });

  it("14. saved JSON preserves provider discharge documentation and canonical fields", () => {
    const saved = saveWithOutcome("HOME");
    const docs = saved.providerDischargeDiagnosisDocs as unknown[];
    expect(Array.isArray(docs) && docs.length).toBeGreaterThan(0);
    expect(saved.dischargeMode).toBe(ER_DISCHARGE_MODE_HOME);
    expect(saved.disposition).toBe("Description for R07.9");
  });

  it("15. attribution name/date/time preserved where available", () => {
    const saved = saveWithOutcome("HOME");
    const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    expect(block!.lines.some((l) => l.includes("Dr Test"))).toBe(true);
    expect(block!.lines.some((l) => l.includes("MD"))).toBe(true);
    const preview = buildProviderDischargeDocumentationPreviewSections(sampleProviderForm(), saved, "en");
    const meta = preview.find((s) => s.id === "providerMeta");
    expect(meta?.lines.some((l) => l.includes("Dr Test"))).toBe(true);
  });

  it("16. nursing execution remains separate from provider decision", () => {
    const saved = saveWithOutcome("HOME");
    const nursingAssessment = {
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-05-18T21:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "Inf. Marie",
      },
    };
    const providerBlock = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
    const summary = buildEmergencyVisitSummaryModel(
      {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: saved,
        nursingAssessment,
        admissionSummaryJson: null,
      },
      null,
      null,
      "fr"
    );
    expect(providerBlock).not.toBeNull();
    expect(summary.providerDischargeDocumentation).not.toBeNull();
    expect(summary.nursingDischargeDocumentation).not.toBeNull();
    expect(summary.nursingDischargeDocumentation!.lines.some((l) => l.includes("Inf. Marie"))).toBe(true);
  });

  it("17. provider decision does not falsely mark nursing execution completed", () => {
    const saved = saveWithOutcome("HOME");
    expect(saved).not.toHaveProperty("dischargeSortieCompletedAt");
    const badge = erDispositionBadgeFromEncounterJson({
      dischargeSummaryJson: saved,
      nursingAssessment: {},
    });
    expect(badge?.shortLabel).toMatch(/attente|pending/i);
  });

    it("18. dictation affordance uses shared DictationFieldLabel component", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).toContain("DictationFieldLabel");
      expect(uiSource).toContain("@/components/clinical/DictationFieldLabel");
      expect(uiSource).toContain("providerDischargeDictationTextareaId.diagnosisDescription");
      expect(uiSource).toContain('id={descriptionId}');
    });

  it("19. dictation addition does not change save payload shape", () => {
    const form = sampleProviderForm();
    const before = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-05-18T18:00:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    const canonical = mergeErDischargeForEncounterPatch(
      {},
      applyProviderDischargeDocumentationToDischargeForm(emptyDischargeForm(), form),
      false,
      true,
      "HOME"
    );
    const after = mergeCanonicalErDispositionIntoDischargeJson(before, canonical);
    expect(after.dischargeMode).toBe(ER_DISCHARGE_MODE_HOME);
    expect(after).not.toHaveProperty("dictationTargetId");
    expect(providerDischargeDictationTextareaId.diagnosisDescription("doc-1")).toBe(
      "prov-discharge-dx-doc-1-description"
    );
  });

  it("provider-only save without canonical overlay omits dischargeMode (regression guard)", () => {
    const form = sampleProviderForm();
    const withoutCanonical = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
      documentedAt: "2026-05-18T18:00:00.000Z",
      documentedByDisplayName: "Dr Test",
    });
    expect(withoutCanonical.dischargeMode).toBeUndefined();
  });

  it("mergeCanonicalErDispositionIntoDischargeJson copies all canonical keys", () => {
    const merged = mergeCanonicalErDispositionIntoDischargeJson(
      { disposition: "old" },
      {
        dischargeMode: ER_DISCHARGE_MODE_HOME,
        disposition: "new disposition",
        medicationsGiven: "meds",
      }
    );
    expect(merged.dischargeMode).toBe(ER_DISCHARGE_MODE_HOME);
    expect(merged.disposition).toBe("new disposition");
    expect(merged.medicationsGiven).toBe("meds");
  });

  it("deceased decision appears in trackboard model", () => {
    const saved = saveWithOutcome("DECEASED");
    const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
    expect(badge?.variant).toBe("deceased");
    expect(outcomeUiToDischargeMode("DECEASED")).toBe(ER_DISCHARGE_MODE_DECEASED);
  });

  it("EmergencyDispositionPanel passes canonical patch to buildProviderDischargeJsonForSave", () => {
    const panelSource = readFileSync(
      join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"),
      "utf8"
    );
    expect(panelSource).toContain("buildProviderDischargeJsonForSave(");
    expect(panelSource).toContain("mergedDischarge");
    expect(panelSource).not.toContain("buildProviderDischargeDocumentationPreviewSections");
    const summarySource = readFileSync(
      join(webRoot, "src/features/emergency/emergencyVisitSummaryModel.ts"),
      "utf8"
    );
    expect(summarySource).toContain("buildErDispositionPreviewModel");
  });
});
