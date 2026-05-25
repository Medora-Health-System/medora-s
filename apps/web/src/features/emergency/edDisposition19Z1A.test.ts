import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { emptyDischargeForm } from "@/lib/encounterDischarge";
import { buildProviderDischargeJsonForSave } from "./ProviderDischargeDocumentationSection";
import { validateErDispositionCanonicalIntegrity } from "./erDispositionCanonicalIntegrity";
import {
  ER_DISCHARGE_MODE_ADMISSION,
  ER_DISCHARGE_MODE_AMA,
  ER_DISCHARGE_MODE_DECEASED,
  ER_DISCHARGE_MODE_HOME,
  ER_DISCHARGE_MODE_OTHER,
  ER_DISCHARGE_MODE_TRANSFER,
  mergeErDischargeForEncounterPatch,
  type ErDispositionOutcomeUi,
} from "./emergencyDispositionV1";
import { erDispositionBadgeFromEncounterJson } from "./erTrackboardDispositionBadge";
import {
  applyProviderDischargeDocumentationToDischargeForm,
  emptyProviderDischargeDocumentationForm,
  ER_DISPOSITION_SCHEMA_VERSION,
  hydrateProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  readDispositionSchemaVersion,
  readProviderDischargeDocumentationMeta,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import { getErPrintPacketHtml } from "./erPrintPacket";
import { buildEmergencyVisitSummaryModel } from "./emergencyVisitSummaryModel";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const CHART_EXPORT_HTML_SOURCE = readFileSync(
  new URL("../../../../api/src/encounters/chart-export-html.util.ts", import.meta.url),
  "utf8"
);

function completeCard(
  id: string,
  sourceEncounterDiagnosisId: string,
  code: string,
  displayName: string,
  opts?: { isPrimaryDiagnosis?: boolean }
) {
  return {
    id,
    sourceEncounterDiagnosisId,
    encounterDiagnosisId: sourceEncounterDiagnosisId,
    code,
    displayName,
    isPrimaryDiagnosis: opts?.isPrimaryDiagnosis ?? true,
    displayOrder: 0,
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
    diagnosisDocs: [completeCard("doc-1", "dx-1", "R07.9", "Chest pain")],
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

function nursingExec(overrides?: Record<string, unknown>) {
  return {
    erDispositionExecutionV1: {
      dischargeSortieCompletedAt: "2026-05-18T21:00:00.000Z",
      dischargeSortieCompletedByDisplayName: "Inf. Marie",
      nursingDestination: "HOME",
      ...overrides,
    },
  };
}

describe("edDisposition19Z1A — canonical disposition integrity guard", () => {
  describe("schema version", () => {
    it("1. provider disposition save writes dispositionSchemaVersion = 19Z.1A", () => {
      const saved = saveWithOutcome("HOME");
      expect(saved.dispositionSchemaVersion).toBe(ER_DISPOSITION_SCHEMA_VERSION);
      expect(readDispositionSchemaVersion(saved)).toBe("19Z.1A");
    });

    it("2. old records without dispositionSchemaVersion hydrate safely", () => {
      const legacy = { dischargeMode: ER_DISCHARGE_MODE_HOME, disposition: "Legacy summary" };
      const form = hydrateProviderDischargeDocumentationForm(legacy);
      expect(form.diagnosisDocs).toEqual([]);
      expect(readDispositionSchemaVersion(legacy)).toBeNull();
      const integrity = validateErDispositionCanonicalIntegrity({ dischargeSummaryJson: legacy });
      expect(integrity.ok).toBe(true);
      expect(integrity.warnings).toContain("LEGACY_NO_DISPOSITION_SCHEMA_VERSION");
    });

    it("3. UI preview does not display dispositionSchemaVersion", () => {
      const saved = saveWithOutcome("HOME");
      const sections = buildProviderDischargeDocumentationPreviewSections(sampleProviderForm(), saved, "en");
      const joined = sections.flatMap((s) => s.lines).join("\n");
      expect(joined).not.toContain("dispositionSchemaVersion");
      expect(joined).not.toContain("19Z.1A");
    });

    it("4. raw export JSON retains dispositionSchemaVersion", () => {
      const saved = saveWithOutcome("HOME");
      expect(CHART_EXPORT_HTML_SOURCE).toContain("dischargeSummaryJson");
      expect(saved.dispositionSchemaVersion).toBe(ER_DISPOSITION_SCHEMA_VERSION);
    });
  });

  describe("integrity validator", () => {
    it("5. provider docs without dischargeMode fail integrity validator", () => {
      const json = mergeProviderDischargeDocumentationIntoDischargeJson({}, sampleProviderForm(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const result = validateErDispositionCanonicalIntegrity({ dischargeSummaryJson: json });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("PROVIDER_DOCS_WITHOUT_DISCHARGE_MODE");
    });

    it("6. provider docs with dischargeMode pass", () => {
      const saved = saveWithOutcome("HOME");
      const result = validateErDispositionCanonicalIntegrity({ dischargeSummaryJson: saved });
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("7. nursing completed without provider disposition fails", () => {
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: {},
        nursingAssessment: nursingExec(),
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("NURSING_EXECUTION_WITHOUT_PROVIDER_DISPOSITION");
    });

    it("8. deceased mode with home nursing execution fails", () => {
      const saved = saveWithOutcome("DECEASED");
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: saved,
        nursingAssessment: nursingExec(),
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("DECEASED_MODE_WITH_HOME_NURSING_EXECUTION");
    });

    it("9. transfer mode with home nursing execution fails", () => {
      const saved = saveWithOutcome("TRANSFER");
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: saved,
        nursingAssessment: nursingExec(),
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("TRANSFER_MODE_WITH_HOME_NURSING_EXECUTION");
    });

    it("10. observation care level without admission mode warns", () => {
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME },
        admissionSummaryJson: { careLevel: "Observation" },
      });
      expect(result.warnings).toContain("OBSERVATION_CARE_LEVEL_WITHOUT_ADMISSION_MODE");
    });

    it("11. legacy dischargeMode-only record warns but does not fail", () => {
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME, disposition: "Chest pain stable" },
      });
      expect(result.ok).toBe(true);
      expect(result.warnings).toContain("LEGACY_DISCHARGE_MODE_WITHOUT_PROVIDER_DOCS");
      expect(result.warnings).toContain("LEGACY_NO_DISPOSITION_SCHEMA_VERSION");
    });
  });

  describe("trackboard disposition matrix", () => {
    it("12. provider-only discharge home shows Sortie en attente, not null badge", () => {
      const saved = saveWithOutcome("HOME");
      const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved, nursingAssessment: {} });
      expect(badge).not.toBeNull();
      expect(badge!.variant).toBe("discharge");
      expect(badge!.shortLabel).toBe("Sortie en attente");
      expect(badge!.source).toBe("dischargeMode");
    });

    it("13. nursing-completed discharge shows SORTIE", () => {
      const saved = saveWithOutcome("HOME");
      const badge = erDispositionBadgeFromEncounterJson({
        dischargeSummaryJson: saved,
        nursingAssessment: nursingExec(),
      });
      expect(badge!.shortLabel).toBe("SORTIE");
    });

    it("14. trackboard transfer shows Transfert", () => {
      const saved = saveWithOutcome("TRANSFER");
      const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
      expect(badge!.variant).toBe("transfer");
      expect(badge!.shortLabel).toBe("Transfert");
    });

    it("15. trackboard AMA shows LAMA", () => {
      const saved = saveWithOutcome("AMA");
      const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
      expect(badge!.variant).toBe("ama");
      expect(badge!.shortLabel).toBe("LAMA");
    });

    it("16. trackboard LWBS shows LWBS", () => {
      const saved = saveWithOutcome("LWBS");
      const badge = erDispositionBadgeFromEncounterJson({
        dischargeSummaryJson: saved,
        nursingAssessment: { erDispositionV1: { lwbsNarrative: "Left before provider eval" } },
      });
      expect(badge!.variant).toBe("lwbs");
      expect(badge!.shortLabel).toBe("LWBS");
    });

    it("17. trackboard deceased shows Décès", () => {
      const saved = saveWithOutcome("DECEASED");
      const badge = erDispositionBadgeFromEncounterJson({ dischargeSummaryJson: saved });
      expect(badge!.variant).toBe("deceased");
      expect(badge!.shortLabel).toBe("Décès");
    });

    it("18. admission/observation shows Observation chip", () => {
      const saved = saveWithOutcome("ADMISSION");
      const badge = erDispositionBadgeFromEncounterJson({
        dischargeSummaryJson: saved,
        admissionSummaryJson: { careLevel: "Observation" },
      });
      expect(badge!.variant).toBe("observe");
      expect(badge!.shortLabel).toBe("Observation");
    });

    it("19. no provider disposition yields no disposition badge", () => {
      const badge = erDispositionBadgeFromEncounterJson({
        dischargeSummaryJson: {},
        admissionSummaryJson: {},
        nursingAssessment: {},
      });
      expect(badge).toBeNull();
    });
  });

  describe("preview / summary / export snapshot locks", () => {
    it("20. right preview includes provider diagnosis cards", () => {
      const sections = buildProviderDischargeDocumentationPreviewSections(sampleProviderForm(), saveWithOutcome("HOME"), "en");
      expect(sections.find((s) => s.id === "providerDoc")?.lines.some((l) => l.includes("R07.9"))).toBe(true);
    });

    it("21. right preview includes return precautions once", () => {
      const sections = buildProviderDischargeDocumentationPreviewSections(sampleProviderForm(), {}, "en");
      const planning = sections.find((s) => s.id === "providerPlanning");
      expect(planning!.lines.filter((l) => l.includes("Return if chest pain worsens"))).toHaveLength(1);
    });

    it("22. right preview excludes governance metadata", () => {
      const sections = buildProviderDischargeDocumentationPreviewSections(sampleProviderForm(), saveWithOutcome("HOME"), "en");
      const joined = sections.flatMap((s) => s.lines).join("\n");
      expect(joined).not.toContain("abc123hash");
      expect(joined).not.toContain("chest_pain_v1");
    });

    it("23. ED Summary includes provider discharge docs", () => {
      const block = buildProviderDischargeDocumentationSummaryBlock(saveWithOutcome("HOME"), "en");
      expect(block!.lines.some((l) => l.includes("Description for R07.9"))).toBe(true);
    });

    it("24. ER packet includes provider discharge docs", () => {
      const saved = saveWithOutcome("HOME");
      const html = getErPrintPacketHtml({
        patient: { firstName: "Jean", lastName: "Dupont", dob: "1980-01-01", sex: "M" },
        encounter: { createdAt: "2026-05-18T10:00:00.000Z", dischargeSummaryJson: saved, nursingAssessment: {} },
        triageSnapshot: null,
        language: "fr",
      });
      expect(html).toContain("Description for R07.9");
      expect(html).not.toContain("abc123hash");
    });

    it("25. chart export JSON path includes provider docs and schema version", () => {
      const saved = saveWithOutcome("HOME");
      expect(saved.providerDischargeDiagnosisDocs).toBeDefined();
      expect(saved.dispositionSchemaVersion).toBe(ER_DISPOSITION_SCHEMA_VERSION);
    });

    it("26. ER packet human-readable HTML does not leak template hashes", () => {
      const saved = saveWithOutcome("HOME");
      const html = getErPrintPacketHtml({
        patient: { firstName: "Jean", lastName: "Dupont", dob: "1980-01-01", sex: "M" },
        encounter: { createdAt: "2026-05-18T10:00:00.000Z", dischargeSummaryJson: saved, nursingAssessment: {} },
        triageSnapshot: null,
        language: "en",
      });
      expect(html).not.toContain("templateAppliedHash");
      expect(html).not.toContain("abc123hash");
    });
  });

  describe("attribution and separation", () => {
    it("27. attribution name/date/title preserved", () => {
      const saved = saveWithOutcome("HOME");
      const meta = readProviderDischargeDocumentationMeta(saved);
      expect(meta.documentedByDisplayName).toBe("Dr Test");
      expect(meta.documentedByTitle).toBe("MD");
      expect(meta.documentedAt).toBe("2026-05-18T18:00:00.000Z");
      const block = buildProviderDischargeDocumentationSummaryBlock(saved, "en");
      expect(block!.lines.some((l) => l.includes("Dr Test"))).toBe(true);
      expect(block!.lines.some((l) => l.includes("MD"))).toBe(true);
    });

    it("28. old records without title still load", () => {
      const saved = mergeProviderDischargeDocumentationIntoDischargeJson({}, sampleProviderForm(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Legacy",
      });
      const meta = readProviderDischargeDocumentationMeta(saved);
      expect(meta.documentedByTitle).toBeNull();
      expect(meta.documentedByDisplayName).toBe("Dr Legacy");
    });

    it("29. nursing execution remains separate from provider decision", () => {
      const saved = saveWithOutcome("HOME");
      const summary = buildEmergencyVisitSummaryModel(
        { createdAt: "2026-05-18T10:00:00.000Z", dischargeSummaryJson: saved, nursingAssessment: nursingExec() },
        null,
        null,
        "fr"
      );
      expect(summary.providerDischargeDocumentation).not.toBeNull();
      expect(summary.nursingDischargeDocumentation).not.toBeNull();
    });

    it("30. provider decision does not falsely mark nursing execution on discharge JSON", () => {
      const saved = saveWithOutcome("HOME");
      expect(saved).not.toHaveProperty("dischargeSortieCompletedAt");
    });
  });

  describe("dictation abstraction", () => {
    it("31. dictation uses shared DictationFieldLabel without save payload change", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(uiSource).toContain('@/components/clinical/DictationFieldLabel');
      expect(uiSource).not.toContain("function MicrophoneGlyph");
      const before = mergeProviderDischargeDocumentationIntoDischargeJson({}, sampleProviderForm(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      expect(before).not.toHaveProperty("dictationTargetId");
    });
  });

  describe("AMA + admission conflict coverage", () => {
    it("32. AMA with home nursing execution fails integrity", () => {
      const saved = saveWithOutcome("AMA");
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: saved,
        nursingAssessment: nursingExec(),
      });
      expect(result.errors).toContain("AMA_MODE_WITH_HOME_NURSING_EXECUTION");
    });

    it("33. admission mode with home nursing execution fails integrity", () => {
      const saved = saveWithOutcome("ADMISSION");
      const result = validateErDispositionCanonicalIntegrity({
        dischargeSummaryJson: saved,
        nursingAssessment: nursingExec(),
      });
      expect(result.errors).toContain("ADMISSION_MODE_WITH_HOME_NURSING_EXECUTION");
    });
  });
});
