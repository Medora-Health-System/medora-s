import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PROVIDER_DISCHARGE_EDUCATION_TEMPLATES,
  matchProviderDischargeEducationTemplate,
} from "./providerDischargeEducationTemplates";
import {
  applyProviderDischargeTemplateToCard,
  BATCH_1_ED_DISCHARGE_TEMPLATE_IDS,
  buildProviderDischargeCardFromDiagnosis,
  PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplate,
} from "./providerDischargeTemplateRegistry";
import {
  buildProviderDischargeRegistryGovernanceSnapshot,
  computeProviderDischargeRegistryGovernanceSnapshotHash,
  scanProviderDischargeTemplateUnsafePhrases,
  validateProviderDischargeTemplateRegistry,
} from "./providerDischargeTemplateRegistryValidator";
import {
  buildProviderDischargeTemplateHashPayload,
  computeProviderDischargeTemplateAppliedHash,
  providerDischargeTemplateHashCanonicalString,
} from "./providerDischargeTemplateAppliedHash";
import {
  extractSharedFieldsFromTemplate,
  mergeDedupedFollowUpRows,
  mergeSharedFieldsFromSelectedTemplates,
  mergeTemplateSharedFieldsIntoForm,
  mergeUniquePrecautionText,
} from "./providerDischargeSharedPlanningMerge";
import {
  createDiagnosisDocFromRef,
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
  sortProviderDischargeDiagnosisCards,
  validateProviderDischargeDocumentation,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const validationMessages = {
  requiredDescription: "Description required",
  requiredInstructions: "Instructions required",
  requiredMedication: "Medication required",
  requiredReturnPrecautions: "Return precautions required",
  requiredFollowUp: "Follow-up required",
};

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
  };
}

function formWithThreeSelected(): ProviderDischargeDocumentationForm {
  const refs = [
    { encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain, unspecified", isPrimary: true },
    { encounterDiagnosisId: "dx-2", code: "R10.9", label: "Abdominal pain, unspecified" },
    { encounterDiagnosisId: "dx-3", code: "S01.01", label: "Laceration of scalp" },
  ];
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "",
    diagnosisRefs: refs,
    diagnosisDocs: [
      completeCard("doc-1", "dx-1", "R07.9", "Chest pain, unspecified", { isPrimaryDiagnosis: true, displayOrder: 0 }),
      completeCard("doc-2", "dx-2", "R10.9", "Abdominal pain, unspecified", { displayOrder: 1 }),
      completeCard("doc-3", "dx-3", "S01.01", "Laceration of scalp", { displayOrder: 2 }),
    ],
    returnPrecautions: "Shared return precautions",
    returnWorkSchool: "May return tomorrow",
    followUps: [{ ...newDefaultFollowUpRow(), timing: "1 week" }],
  });
}

function normalizeTestForm(
  partial: Partial<ProviderDischargeDocumentationForm> &
    Pick<ProviderDischargeDocumentationForm, "diagnosisRefs" | "diagnosisDocs">
): ProviderDischargeDocumentationForm {
  return normalizeProviderDischargeDiagnosisCards({
    ...emptyProviderDischargeDocumentationForm(),
    ...partial,
  });
}

function syntheticRegistryTemplate(
  overrides: Partial<ProviderDischargeTemplate> & Pick<ProviderDischargeTemplate, "id">
): ProviderDischargeTemplate {
  return {
    version: "1.0.0",
    title: "Synthetic template",
    specialtyCategory: "emergency_medicine",
    riskCategory: "moderate",
    clinicalReviewStatus: "draft",
    effectiveFrom: "2026-05-18",
    diagnosisMappings: { icdExact: [`Z-${overrides.id}`] },
    sourceReferences: [{ label: "Synthetic source" }],
    suggestedText: {
      description: "ED evaluation was performed for this concern.",
      diagnosisInstructions: "Return precautions were reviewed. Follow-up is recommended.",
      medicationTreatment: "Take medications only as prescribed or directed.",
      returnPrecautions: "Seek care if symptoms worsen.",
    },
    ...overrides,
  };
}

describe("edDisposition19Y", () => {
  describe("19Y.2 card model hardening", () => {
    it("new card includes sourceEncounterDiagnosisId", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      expect(card.sourceEncounterDiagnosisId).toBe("dx-abc");
    });

    it("new card includes isPrimaryDiagnosis", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      expect(card.isPrimaryDiagnosis).toBe(true);
    });

    it("new card includes displayOrder", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-abc",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 3,
        isPrimaryDiagnosis: false,
      });
      expect(card.displayOrder).toBe(3);
    });

    it("first encounter diagnosis is primary by default when normalized", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [{ encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain", isPrimary: true }],
        diagnosisDocs: [
          {
            ...completeCard("doc-1", "dx-1", "R07.9", "Chest pain"),
            isPrimaryDiagnosis: false,
            displayOrder: -1,
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.isPrimaryDiagnosis).toBe(true);
      expect(form.diagnosisDocs[0]!.displayOrder).toBe(0);
    });

    it("legacy encounterDiagnosisId hydrates into sourceEncounterDiagnosisId", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            encounterDiagnosisId: "legacy-dx",
            code: "R07.9",
            displayName: "Chest pain",
            description: "x",
            diagnosisInstructions: "x",
            medicationTreatment: "x",
            returnPrecautions: "x",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1 week", phone: "", address: "", comments: "" }],
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.sourceEncounterDiagnosisId).toBe("legacy-dx");
    });

    it("missing displayOrder hydrates from selected diagnosis order", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [
          { encounterDiagnosisId: "dx-a", code: "A", label: "A" },
          { encounterDiagnosisId: "dx-b", code: "B", label: "B" },
        ],
        diagnosisDocs: [
          { ...completeCard("c-b", "dx-b", "B", "B"), displayOrder: -1 },
          { ...completeCard("c-a", "dx-a", "A", "A"), displayOrder: -1 },
        ],
      });
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-a")!.displayOrder).toBe(0);
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-b")!.displayOrder).toBe(1);
    });

    it("missing isPrimaryDiagnosis hydrates with first selected card primary", () => {
      const form = normalizeTestForm({
        diagnosisRefs: [
          { encounterDiagnosisId: "dx-a", code: "A", label: "A", isPrimary: true },
          { encounterDiagnosisId: "dx-b", code: "B", label: "B" },
        ],
        diagnosisDocs: [
          { ...completeCard("c-a", "dx-a", "A", "A"), isPrimaryDiagnosis: false, displayOrder: 0 },
          { ...completeCard("c-b", "dx-b", "B", "B"), isPrimaryDiagnosis: false, displayOrder: 1 },
        ],
      });
      expect(form.diagnosisDocs.find((d) => d.sourceEncounterDiagnosisId === "dx-a")!.isPrimaryDiagnosis).toBe(true);
    });

    it("summary sorts primary first then displayOrder", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.isPrimaryDiagnosis = true;
      form.diagnosisDocs[0]!.isPrimaryDiagnosis = false;
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      const r10Idx = block!.lines.findIndex((l) => l.startsWith("R10.9"));
      const r07Idx = block!.lines.findIndex((l) => l.startsWith("R07.9"));
      expect(r10Idx).toBeGreaterThan(-1);
      expect(r07Idx).toBeGreaterThan(-1);
      expect(r10Idx).toBeLessThan(r07Idx);
      expect(block!.lines[r10Idx]).toContain("primary");
    });

    it("print/summary builder uses sorted selected docs (primary first)", () => {
      const cards = sortProviderDischargeDiagnosisCards([
        completeCard("c2", "dx-2", "R10.9", "Abdominal pain", { displayOrder: 1 }),
        completeCard("c1", "dx-1", "R07.9", "Chest pain", { isPrimaryDiagnosis: true, displayOrder: 0 }),
      ]);
      expect(cards[0]!.code).toBe("R07.9");
      expect(cards[0]!.isPrimaryDiagnosis).toBe(true);
    });
  });

  describe("19Y.2 template registry", () => {
    it("registry file exports PROVIDER_DISCHARGE_TEMPLATE_REGISTRY", () => {
      expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length).toBeGreaterThan(0);
    });

    it("templates are versioned", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.version.trim()).not.toBe("");
      }
    });

    it("templates contain sourceReferences", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.sourceReferences.length).toBeGreaterThan(0);
        expect(template.sourceReferences[0]!.label.trim()).not.toBe("");
      }
    });

    it("exact ICD match beats family match", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      expect(resolved.matchLevel).toBe("icdExact");
      expect(resolved.template.id).toBe("chest_pain_v1");
    });

    it("family match beats keyword match", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R10.9", displayName: "Nausea" });
      expect(resolved.matchLevel).toBe("icdFamily");
      expect(resolved.template.id).toBe("abdominal_pain_v1");
    });

    it("keyword match beats generic fallback", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z00.00",
        displayName: "abdominal pain after meal",
      });
      expect(resolved.matchLevel).toBe("keyword");
      expect(resolved.template.id).toBe("abdominal_pain_v1");
    });

    it("generic fallback works when no other match exists", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unspecified" });
      expect(resolved.matchLevel).toBe("generic");
      expect(resolved.template.id).toBe("generic_ed_discharge_v1");
    });

    it("template application stores templateMeta fields", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, {
        providerConfirmed: true,
        actor: { displayName: "Dr Test", appliedAt: "2026-05-18T18:00:00.000Z" },
        overwriteExisting: true,
      });
      expect(next.templateMeta?.templateId).toBe("chest_pain_v1");
      expect(next.templateMeta?.templateVersion).toBe("1.1.0");
      expect(next.templateMeta?.matchLevel).toBe("icdExact");
      expect(next.templateMeta?.sourceReferences.length).toBeGreaterThan(0);
      expect(next.templateMeta?.providerConfirmed).toBe(true);
      expect(next.templateMeta?.templateAppliedHash?.length).toBe(64);
      expect(next.templateMeta?.specialtyCategory).toBe("cardiology");
      expect(next.templateMeta?.riskCategory).toBe("moderate");
    });

    it("applying template does not overwrite non-empty provider text", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Provider-authored description";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { overwriteExisting: false });
      expect(next.description).toBe("Provider-authored description");
      expect(next.diagnosisInstructions.length).toBeGreaterThan(0);
    });

    it("legacy education adapter still resolves chest pain template", () => {
      const template = matchProviderDischargeEducationTemplate({ code: "R07.9", label: "Chest pain" });
      expect(template?.id).toBe("chest_pain_v1");
    });

    it("education templates include source metadata for each template", () => {
      for (const template of PROVIDER_DISCHARGE_EDUCATION_TEMPLATES) {
        expect(template.sources.length).toBeGreaterThan(0);
      }
    });
  });

  describe("19Y.2A template governance metadata", () => {
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const genericTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find(
      (t) => t.id === "generic_ed_discharge_v1"
    )!;

    it("applying a template stores templateAppliedHash", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { overwriteExisting: true });
      expect(next.templateMeta?.templateAppliedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("templateAppliedHash is deterministic for same template version/content", () => {
      const a = computeProviderDischargeTemplateAppliedHash(chestTemplate);
      const b = computeProviderDischargeTemplateAppliedHash(chestTemplate);
      expect(a).toBe(b);
    });

    it("changing template content changes templateAppliedHash", () => {
      const base = computeProviderDischargeTemplateAppliedHash(chestTemplate);
      const mutated = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        suggestedText: { ...chestTemplate.suggestedText, description: "Different description text." },
      });
      expect(mutated).not.toBe(base);
    });

    it("hash input includes sourceReferences", () => {
      const payload = buildProviderDischargeTemplateHashPayload(chestTemplate);
      expect(payload.sourceReferences[0]?.url).toContain("medlineplus.gov");
      const withoutUrl = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        sourceReferences: [{ label: chestTemplate.sourceReferences[0]!.label }],
      });
      expect(withoutUrl).not.toBe(computeProviderDischargeTemplateAppliedHash(chestTemplate));
    });

    it("hash input includes specialtyCategory and riskCategory", () => {
      const withCategories = computeProviderDischargeTemplateAppliedHash(chestTemplate);
      const withoutCategories = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        specialtyCategory: undefined,
        riskCategory: undefined,
        clinicalReviewStatus: undefined,
        effectiveFrom: undefined,
      });
      expect(withCategories).not.toBe(withoutCategories);
    });

    it("changing clinicalReviewStatus or effectiveFrom changes templateAppliedHash", () => {
      const base = computeProviderDischargeTemplateAppliedHash(chestTemplate);
      const reviewChanged = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        clinicalReviewStatus: "reviewed",
      });
      const dateChanged = computeProviderDischargeTemplateAppliedHash({
        ...chestTemplate,
        effectiveFrom: "2026-06-01",
      });
      expect(reviewChanged).not.toBe(base);
      expect(dateChanged).not.toBe(base);
    });

    it("hash payload includes governance review and effective dates", () => {
      const payload = buildProviderDischargeTemplateHashPayload(chestTemplate);
      expect(payload.clinicalReviewStatus).toBe("draft");
      expect(payload.effectiveFrom).toBe("2026-05-18");
    });

    it("pure JS SHA-256 matches Node crypto for canonical template payload", () => {
      const canonical = providerDischargeTemplateHashCanonicalString(chestTemplate);
      const nodeHash = createHash("sha256").update(canonical, "utf8").digest("hex");
      expect(computeProviderDischargeTemplateAppliedHash(chestTemplate)).toBe(nodeHash);
    });

    it("existing cards without templateAppliedHash hydrate safely", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            isPrimaryDiagnosis: true,
            displayOrder: 0,
            description: "Saved text",
            diagnosisInstructions: "Saved",
            medicationTreatment: "Saved",
            returnPrecautions: "Saved",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
            templateMeta: {
              templateId: "chest_pain_v1",
              templateVersion: "1.0.0",
              matchLevel: "icdExact",
              sourceReferences: ["MedlinePlus — Angina"],
            },
          },
        ],
      });
      expect(form.diagnosisDocs[0]!.templateMeta?.templateAppliedHash).toBeUndefined();
      expect(form.diagnosisDocs[0]!.description).toBe("Saved text");
    });

    it("chart export raw dischargeSummaryJson retains templateAppliedHash", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.templateMeta = {
        templateId: "chest_pain_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdExact",
        sourceReferences: ["MedlinePlus — Angina"],
        templateAppliedHash: computeProviderDischargeTemplateAppliedHash(chestTemplate),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      };
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const doc = (merged.providerDischargeDiagnosisDocs as Record<string, unknown>[])[0]!;
      expect(doc.templateMeta).toMatchObject({
        templateAppliedHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      });
    });

    it("summary does not display templateAppliedHash", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.templateMeta = {
        templateId: "chest_pain_v1",
        templateVersion: "1.0.0",
        matchLevel: "icdExact",
        sourceReferences: ["MedlinePlus — Angina"],
        templateAppliedHash: computeProviderDischargeTemplateAppliedHash(chestTemplate),
        specialtyCategory: "cardiology",
        riskCategory: "moderate",
      };
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      expect(block?.lines.join("\n")).not.toContain("templateAppliedHash");
      expect(block?.lines.join("\n")).not.toMatch(/[a-f0-9]{64}/);
    });

    it("chest pain template has specialtyCategory cardiology", () => {
      expect(chestTemplate.specialtyCategory).toBe("cardiology");
    });

    it("generic template has riskCategory unspecified", () => {
      expect(genericTemplate.riskCategory).toBe("unspecified");
    });

    it("categories are not used for billing/coding decisions", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("specialtyCategory");
      expect(billing).not.toContain("riskCategory");
      expect(billing).not.toContain("templateAppliedHash");
    });

    it("React UI components do not contain template governance metadata", () => {
      const uiFiles = [
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"),
        join(webRoot, "src/features/emergency/providerDischargeDocumentationSummary.ts"),
      ];
      for (const file of uiFiles) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain("templateAppliedHash");
        expect(source).not.toContain("specialtyCategory");
        expect(source).not.toContain("riskCategory");
      }
    });
  });

  describe("19Y.1A per-diagnosis behavior (preserved)", () => {
    it("selecting three diagnoses yields three independent cards", () => {
      expect(getSelectedDiagnosisDocs(formWithThreeSelected())).toHaveLength(3);
    });

    it("blocks save when any selected diagnosis is missing required fields", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.description = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("allows save when all selected diagnosis cards are complete", () => {
      expect(validateProviderDischargeDocumentation(formWithThreeSelected(), validationMessages)).toBeNull();
    });

    it("legacy single shared fields hydrate into first card safely", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        dischargeDiagnosisSummary: "Legacy description",
        dischargeInstructions: "Legacy instructions",
        medicationInstructions: "Legacy meds",
        returnPrecautions: "Legacy precautions",
        providerDischargeDiagnosisRefs: [
          { encounterDiagnosisId: "dx-legacy", code: "R07.9", label: "Chest pain", isPrimary: true },
        ],
      });
      expect(form.diagnosisDocs[0]!.description).toBe("Legacy description");
      expect(form.diagnosisDocs[0]!.sourceEncounterDiagnosisId).toBe("dx-legacy");
    });

    it("save merge writes structured per-diagnosis docs with hardened metadata", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const docs = merged.providerDischargeDiagnosisDocs as Record<string, unknown>[];
      expect(docs[0]!.sourceEncounterDiagnosisId).toBeTruthy();
      expect(docs[0]!.isPrimaryDiagnosis).toBe(true);
      expect(typeof docs[0]!.displayOrder).toBe("number");
    });

    it("medication treatment text does not create order/eRx/MAR identifiers", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[0]!.medicationTreatment = "Ibuprofen 400 mg PO q6h PRN pain";
      const json = JSON.stringify(
        mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
          documentedAt: new Date().toISOString(),
          documentedByDisplayName: "Dr Test",
        })
      );
      expect(json).not.toContain('"orderId"');
      expect(json).not.toContain('"marAction"');
    });
  });

  describe("19Y.3 Batch 1 ED diagnosis templates", () => {
    const FORBIDDEN_FABRICATED_PATTERNS = [
      /troponin/i,
      /\bACS ruled out\b/i,
      /\bCT (was|is) normal\b/i,
      /\bpatient improved\b/i,
      /\bconsult (was|performed)\b/i,
      /critical care provided/i,
      /\b992\d{2}\b/,
      /\bCPT\b/,
      /\bE\/M level\b/i,
    ];

    const batchTemplates = () =>
      BATCH_1_ED_DISCHARGE_TEMPLATE_IDS.map(
        (id) => PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id)!
      );

    it("all 6 Batch 1 templates exist", () => {
      expect(BATCH_1_ED_DISCHARGE_TEMPLATE_IDS).toHaveLength(6);
      for (const id of BATCH_1_ED_DISCHARGE_TEMPLATE_IDS) {
        expect(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.some((t) => t.id === id)).toBe(true);
      }
    });

    it("each Batch 1 template has version", () => {
      for (const template of batchTemplates()) {
        expect(template.version.trim()).not.toBe("");
      }
    });

    it("each Batch 1 template has sourceReferences", () => {
      for (const template of batchTemplates()) {
        expect(template.sourceReferences.length).toBeGreaterThan(0);
      }
    });

    it("each Batch 1 template has specialtyCategory", () => {
      for (const template of batchTemplates()) {
        expect(template.specialtyCategory?.trim()).toBeTruthy();
      }
    });

    it("each Batch 1 template has riskCategory", () => {
      for (const template of batchTemplates()) {
        expect(template.riskCategory?.trim()).toBeTruthy();
      }
    });

    it("each Batch 1 template produces deterministic templateAppliedHash", () => {
      for (const template of batchTemplates()) {
        const a = computeProviderDischargeTemplateAppliedHash(template);
        const b = computeProviderDischargeTemplateAppliedHash(template);
        expect(a).toBe(b);
        expect(a).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it("chest pain exact R07.9 resolves to chest pain template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      expect(resolved.template.id).toBe("chest_pain_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("chest pain R07 family resolves to chest pain template", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.2", displayName: "Precordial pain" });
      expect(resolved.template.id).toBe("chest_pain_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("abdominal pain R10 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R10.84", displayName: "Generalized pain" });
      expect(resolved.template.id).toBe("abdominal_pain_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("headache R51 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "Headache" });
      expect(resolved.template.id).toBe("headache_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("URI/cough J06 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "J06.9", displayName: "URI" });
      expect(resolved.template.id).toBe("uri_cough_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("URI/cough R05 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R05.9", displayName: "Cough" });
      expect(resolved.template.id).toBe("uri_cough_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("UTI N39.0 exact resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "N39.0", displayName: "UTI" });
      expect(resolved.template.id).toBe("uti_v1");
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("UTI R30 family resolves correctly", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R30.0", displayName: "Dysuria" });
      expect(resolved.template.id).toBe("uti_v1");
      expect(resolved.matchLevel).toBe("icdFamily");
    });

    it("wound/laceration injury families resolve correctly", () => {
      for (const code of ["S01.01", "S41.012", "S61.1", "T14.1"]) {
        const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName: "Laceration" });
        expect(resolved.template.id).toBe("wound_laceration_v1");
        expect(["icdExact", "icdFamily"]).toContain(resolved.matchLevel);
      }
    });

    it("exact match beats family", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "N39.0", displayName: "UTI" });
      expect(resolved.matchLevel).toBe("icdExact");
    });

    it("family beats keyword", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "migraine headache" });
      expect(resolved.matchLevel).toBe("icdFamily");
      expect(resolved.template.id).toBe("headache_v1");
    });

    it("keyword beats generic", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z00.00", displayName: "persistent cough" });
      expect(resolved.matchLevel).toBe("keyword");
      expect(resolved.template.id).toBe("uri_cough_v1");
    });

    it("generic fallback remains safe/empty", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "Z99.99", displayName: "Unspecified" });
      expect(resolved.matchLevel).toBe("generic");
      expect(resolved.template.suggestedText.description).toBe("");
      expect(resolved.template.suggestedText.returnPrecautions).toBe("");
    });

    it("template text does not contain fabricated test/result language", () => {
      for (const template of batchTemplates()) {
        const blob = JSON.stringify(template.suggestedText);
        for (const pattern of FORBIDDEN_FABRICATED_PATTERNS) {
          expect(blob).not.toMatch(pattern);
        }
      }
    });

    it("template text does not contain billing code / CPT / E/M level language", () => {
      for (const template of batchTemplates()) {
        const blob = JSON.stringify(template);
        expect(blob).not.toMatch(/\b992\d{2}\b/);
        expect(blob).not.toMatch(/\bCPT\b/);
        expect(blob).not.toMatch(/E\/M level/i);
      }
    });

    it("React UI files do not contain template paragraphs", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });

    it("applying template fills diagnosis-card fields only", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R07.9",
        displayName: "Chest pain",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R07.9", displayName: "Chest pain" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { overwriteExisting: true });
      expect(next.description.trim()).not.toBe("");
      expect(next.diagnosisInstructions.trim()).not.toBe("");
      expect(next.medicationTreatment.trim()).not.toBe("");
      expect(next.returnPrecautions).toBe("");
      expect(next.followUps).toEqual([]);
    });

    it("return precautions/follow-up merge into shared bottom planning only", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const chest = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(chest));
      expect(merged.returnPrecautions).toContain("Return immediately");
      expect(merged.followUps.length).toBeGreaterThan(0);
    });

    it("provider-entered text is not overwritten on template apply", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-1",
        code: "R51.9",
        displayName: "Headache",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
      });
      card.description = "Clinician note retained";
      const resolved = resolveProviderDischargeTemplateForDiagnosis({ code: "R51.9", displayName: "Headache" });
      const next = applyProviderDischargeTemplateToCard(card, resolved, { overwriteExisting: false });
      expect(next.description).toBe("Clinician note retained");
    });
  });

  describe("19Y.3A template governance & clinical safety", () => {
    const registryValidation = validateProviderDischargeTemplateRegistry(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);

    it("every template has clinicalReviewStatus", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.clinicalReviewStatus).toBeTruthy();
      }
    });

    it("every template has valid clinicalReviewStatus", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(["draft", "reviewed", "approved"]).toContain(template.clinicalReviewStatus);
      }
    });

    it("every template has effectiveFrom", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(template.effectiveFrom.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("effectiveTo validation works", () => {
      const bad = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({
          id: "bad-effective-to",
          effectiveFrom: "2026-05-18",
          effectiveTo: "2026-05-01",
        }),
      ]);
      expect(bad.ok).toBe(false);
      expect(bad.errors.some((e) => e.includes("effectiveTo is before effectiveFrom"))).toBe(true);
    });

    it("duplicate template ID fails", () => {
      const t = syntheticRegistryTemplate({ id: "dup-id" });
      const result = validateProviderDischargeTemplateRegistry([t, { ...t }]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate template id"))).toBe(true);
    });

    it("invalid semver fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "bad-semver", version: "v1" }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid semver"))).toBe(true);
    });

    it("missing sourceReferences fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-sources", sourceReferences: [] }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("missing sourceReferences"))).toBe(true);
    });

    it("missing specialtyCategory fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-specialty", specialtyCategory: undefined }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("missing riskCategory fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-risk", riskCategory: undefined }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("missing effectiveFrom fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "no-effective-from", effectiveFrom: "" }),
      ]);
      expect(result.ok).toBe(false);
    });

    it("duplicate ICD exact mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "dx-a", diagnosisMappings: { icdExact: ["R07.9"] } }),
        syntheticRegistryTemplate({ id: "dx-b", diagnosisMappings: { icdExact: ["R07.9"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate icdExact"))).toBe(true);
    });

    it("duplicate ICD family mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "fam-a", diagnosisMappings: { icdFamily: ["R10"] } }),
        syntheticRegistryTemplate({ id: "fam-b", diagnosisMappings: { icdFamily: ["R10"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate icdFamily"))).toBe(true);
    });

    it("duplicate keyword mapping fails", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({ id: "kw-a", diagnosisMappings: { keyword: ["chest pain"] } }),
        syntheticRegistryTemplate({ id: "kw-b", diagnosisMappings: { keyword: ["chest pain"] } }),
      ]);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate keyword"))).toBe(true);
    });

    it("exact and family on same template does not fail collision validation", () => {
      const result = validateProviderDischargeTemplateRegistry([
        syntheticRegistryTemplate({
          id: "same-template-exact-family",
          diagnosisMappings: { icdExact: ["R07.9"], icdFamily: ["R07"] },
        }),
      ]);
      expect(result.ok).toBe(true);
    });

    it("current registry has no mapping collisions", () => {
      expect(registryValidation.ok).toBe(true);
      expect(registryValidation.errors).toEqual([]);
    });

    it("unsafe phrase troponins negative fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-troponin",
          suggestedText: {
            description: "Troponins negative today.",
            diagnosisInstructions: "Rest.",
            medicationTreatment: "None.",
            returnPrecautions: "Return if worse.",
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("unsafe phrase CT normal fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-ct",
          suggestedText: {
            description: "CT normal.",
            diagnosisInstructions: "Rest.",
            medicationTreatment: "None.",
            returnPrecautions: "Return if worse.",
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("unsafe phrase ACS ruled out fails", () => {
      const hits = scanProviderDischargeTemplateUnsafePhrases(
        syntheticRegistryTemplate({
          id: "unsafe-acs",
          suggestedText: {
            description: "ACS ruled out.",
            diagnosisInstructions: "Rest.",
            medicationTreatment: "None.",
            returnPrecautions: "Return if worse.",
          },
        })
      );
      expect(hits.length).toBeGreaterThan(0);
    });

    it("current registry has no unsafe phrases", () => {
      for (const template of PROVIDER_DISCHARGE_TEMPLATE_REGISTRY) {
        expect(scanProviderDischargeTemplateUnsafePhrases(template)).toEqual([]);
      }
    });

    it("registry governance snapshot is deterministic", () => {
      const a = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      const b = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(a).toBe(b);
    });

    it("intentional template text change changes registry governance snapshot hash", () => {
      const base = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      const mutated = computeProviderDischargeRegistryGovernanceSnapshotHash(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.map((t) =>
          t.id === "chest_pain_v1" ?
            {
              ...t,
              suggestedText: { ...t.suggestedText, description: "Intentional drift for snapshot test." },
            }
          : t
        )
      );
      expect(mutated).not.toBe(base);
    });

    it("registry governance snapshot hash remains stable for reviewed registry", () => {
      const hash = computeProviderDischargeRegistryGovernanceSnapshotHash(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(buildProviderDischargeRegistryGovernanceSnapshot(PROVIDER_DISCHARGE_TEMPLATE_REGISTRY)).toHaveLength(
        PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.length
      );
      // Update this constant intentionally when registry governance content changes.
      expect(hash).toBe("de5cecf77a8009cd79a9366a2c23452d10ed5301d362df20990558f9da488ba5");
    });

    it("timesApplied exists in type but is not incremented anywhere", () => {
      const registrySource = readFileSync(
        join(webRoot, "src/features/emergency/providerDischargeTemplateRegistry.ts"),
        "utf8"
      );
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(registrySource).toContain("timesApplied?:");
      expect(registrySource).not.toMatch(/timesApplied\s*\+\+|timesApplied\s*=\s*\(.*\+\s*1\)/);
      expect(uiSource).not.toContain("timesApplied");
    });

    it("no governance metadata appears in provider/patient UI", () => {
      const uiFiles = [
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"),
      ];
      for (const file of uiFiles) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain("clinicalReviewStatus");
        expect(source).not.toContain("effectiveFrom");
        expect(source).not.toContain("timesApplied");
      }
    });

    it("no billing/eRx/MAR/order logic changed by governance validator", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("clinicalReviewStatus");
      expect(billing).not.toContain("validateProviderDischargeTemplateRegistry");
    });
  });

  describe("19Y.2B shared discharge planning layout", () => {
    const uiSource = readFileSync(
      join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
      "utf8"
    );
    const chestTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "chest_pain_v1")!;
    const abdominalTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "abdominal_pain_v1")!;

    it("each selected diagnosis renders one card", () => {
      expect(getSelectedDiagnosisDocs(formWithThreeSelected())).toHaveLength(3);
    });

    it("diagnosis card UI contains Description / Instructions / Medication-treatment", () => {
      expect(uiSource).toContain("descriptionRequired");
      expect(uiSource).toContain("diagnosisInstructionsRequired");
      expect(uiSource).toContain("medicationTreatmentRequired");
    });

    it("diagnosis card UI does NOT contain Return precautions field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("returnPrecautionsRequired");
    });

    it("diagnosis card UI does NOT contain Follow-up field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("followUpRequired");
    });

    it("diagnosis card UI does NOT contain Return to work/school field", () => {
      const cardBlock = uiSource.slice(uiSource.indexOf("DiagnosisDocumentationCard"), uiSource.indexOf("SharedDischargePlanningSection"));
      expect(cardBlock).not.toContain("workSchoolQuick");
    });

    it("shared Discharge planning section renders once", () => {
      expect(uiSource).toContain("<SharedDischargePlanningSection");
      expect(uiSource.match(/<SharedDischargePlanningSection/g)?.length).toBe(1);
      expect(uiSource).toContain("dischargePlanningSection");
    });

    it("shared section contains Return precautions", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("returnPrecautionsRequired");
    });

    it("shared section contains Return to work/school", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("workSchoolQuick");
    });

    it("shared section contains Follow-up", () => {
      const sharedBlock = uiSource.slice(uiSource.indexOf("SharedDischargePlanningSection"));
      expect(sharedBlock).toContain("followUpRequired");
    });

    it("return precautions merge from multiple selected diagnosis templates", () => {
      const form = emptyProviderDischargeDocumentationForm();
      const merged = mergeSharedFieldsFromSelectedTemplates(form, [
        extractSharedFieldsFromTemplate(chestTemplate),
        extractSharedFieldsFromTemplate(abdominalTemplate),
      ]);
      expect(merged.returnPrecautions).toContain(chestTemplate.suggestedText.returnPrecautions.slice(0, 24));
      expect(merged.returnPrecautions).toContain(abdominalTemplate.suggestedText.returnPrecautions.slice(0, 24));
    });

    it("return precautions dedupe duplicate sentences", () => {
      const sentence = "Return to the emergency department for worsening symptoms.";
      const merged = mergeUniquePrecautionText(sentence, [sentence, sentence]);
      expect(merged.split("\n").filter(Boolean)).toHaveLength(1);
    });

    it("follow-up suggestions merge/dedupe from multiple diagnoses", () => {
      const row = { ...newDefaultFollowUpRow(), specialty: "CARDIOLOGY", providerOrFacility: "Dr A", timing: "1 week" };
      const merged = mergeDedupedFollowUpRows([row], [{ ...row, id: "other-id" }]);
      expect(merged).toHaveLength(1);
    });

    it("provider-entered shared return precautions are not overwritten", () => {
      const form = { ...formWithThreeSelected(), returnPrecautions: "Provider custom precautions" };
      const merged = mergeTemplateSharedFieldsIntoForm(form, extractSharedFieldsFromTemplate(chestTemplate));
      expect(merged.returnPrecautions).toBe("Provider custom precautions");
    });

    it("save blocks if any diagnosis card missing description", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.description = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if any diagnosis card missing instructions", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.diagnosisInstructions = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if any diagnosis card missing medication/treatment", () => {
      const form = formWithThreeSelected();
      form.diagnosisDocs[1]!.medicationTreatment = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).not.toBeNull();
    });

    it("save blocks if shared return precautions missing", () => {
      const form = formWithThreeSelected();
      form.returnPrecautions = "";
      const errors = validateProviderDischargeDocumentation(form, validationMessages);
      expect(errors?.shared?.returnPrecautions).toBeTruthy();
    });

    it("save blocks if shared follow-up missing", () => {
      const form = formWithThreeSelected();
      form.followUps = [{ ...newDefaultFollowUpRow() }];
      const errors = validateProviderDischargeDocumentation(form, validationMessages);
      expect(errors?.shared?.followUps).toBeTruthy();
    });

    it("save does NOT require return precautions inside each card", () => {
      const form = formWithThreeSelected();
      for (const doc of form.diagnosisDocs) doc.returnPrecautions = "";
      expect(validateProviderDischargeDocumentation(form, validationMessages)).toBeNull();
    });

    it("legacy per-card returnPrecautions/followUps hydrate into shared fields", () => {
      const form = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            isPrimaryDiagnosis: true,
            displayOrder: 0,
            description: "Saved",
            diagnosisInstructions: "Saved",
            medicationTreatment: "Saved",
            returnPrecautions: "Legacy card precautions",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
          },
        ],
        providerDischargeDiagnosisRefs: [{ encounterDiagnosisId: "dx-1", code: "R07.9", label: "Chest pain", isPrimary: true }],
      });
      expect(form.returnPrecautions).toContain("Legacy card precautions");
      expect(form.followUps.some((r) => r.timing === "1w")).toBe(true);
    });

    it("new save writes shared returnPrecautions/followUps once", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      expect(merged.returnPrecautions).toBe("Shared return precautions");
      expect(merged.providerDischargeFollowUps).toHaveLength(1);
      const doc = (merged.providerDischargeDiagnosisDocs as Record<string, unknown>[])[0]!;
      expect(doc.returnPrecautions).toBeUndefined();
      expect(doc.followUps).toBeUndefined();
    });

    it("summary renders return precautions/follow-up once", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      const text = block!.lines.join("\n");
      expect(text).toContain("Discharge planning");
      expect(text.match(/Return precautions/g)?.length).toBe(1);
      expect(text.match(/Follow-up/g)?.length).toBe(1);
    });

    it("ER packet uses same summary builder (return precautions once)", () => {
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: "2026-05-18T18:00:00.000Z",
        documentedByDisplayName: "Dr A",
      });
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "fr");
      const text = block!.lines.join("\n");
      expect(text).toContain("Planification de sortie");
      expect(text.match(/Consignes de retour/g)?.length).toBe(1);
    });

    it("chart export remains backward compatible with legacy per-card fields", () => {
      const legacy = hydrateProviderDischargeDocumentationForm({
        providerDischargeDiagnosisDocs: [
          {
            id: "d1",
            sourceEncounterDiagnosisId: "dx-1",
            code: "R07.9",
            displayName: "Chest pain",
            description: "x",
            diagnosisInstructions: "x",
            medicationTreatment: "x",
            returnPrecautions: "Legacy card",
            followUps: [{ id: "f1", specialty: "PRIMARY_CARE", name: "PCP", timing: "1w", phone: "", address: "", comments: "" }],
          },
        ],
      });
      expect(legacy.returnPrecautions).toContain("Legacy card");
    });

    it("card keys remain stable by doc id", () => {
      expect(uiSource).toContain("key={doc.id}");
      expect(uiSource).toContain("React.memo");
    });

    it("no orders/eRx/MAR created from shared planning merge", () => {
      const json = JSON.stringify(mergeProviderDischargeDocumentationIntoDischargeJson({}, formWithThreeSelected(), {
        documentedAt: new Date().toISOString(),
        documentedByDisplayName: "Dr Test",
      }));
      expect(json).not.toContain('"orderId"');
      expect(json).not.toContain('"marAction"');
    });
  });

  describe("19Y.2 regression gates", () => {
    it("React UI files do not contain registry paragraph fragments", () => {
      const uiSource = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(uiSource).not.toContain(fragment);
      }
    });

    it("registry owns clinical paragraph fragments", () => {
      const registrySource = readFileSync(
        join(webRoot, "src/features/emergency/providerDischargeTemplateRegistry.ts"),
        "utf8"
      );
      for (const fragment of PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS) {
        expect(registrySource).toContain(fragment);
      }
    });

    it("disposition panel keeps Primary Decision and validation", () => {
      const source = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");
      expect(source).toContain("sectionPrimaryDecision");
      expect(source).toContain("validateProviderDischargeDocumentation");
    });

    it("provider section uses registry not inline education templates", () => {
      const source = readFileSync(
        join(webRoot, "src/features/emergency/ProviderDischargeDocumentationSection.tsx"),
        "utf8"
      );
      expect(source).toContain("providerDischargeTemplateRegistry");
      expect(source).not.toContain("providerDischargeEducationTemplates");
    });

    it("billing capture module unchanged", () => {
      const billing = readFileSync(join(webRoot, "../../packages/shared/src/billingCaptureV1.ts"), "utf8");
      expect(billing).not.toContain("providerDischargeDiagnosisDocs");
    });

    it("instructional chrome regression gate still exists", () => {
      const gate = readFileSync(join(webRoot, "src/i18n/messages/instructionalChrome.test.ts"), "utf8");
      expect(gate).toContain("instructionalChrome");
    });

    it("English and French provider discharge i18n include required labels", () => {
      const en = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.en.ts"), "utf8");
      const fr = readFileSync(join(webRoot, "src/i18n/messages/providerDischargeDocumentation19Y.fr.ts"), "utf8");
      expect(en).toContain("descriptionRequired");
      expect(fr).toContain("descriptionRequired");
    });
  });
});
