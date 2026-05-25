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
  buildProviderDischargeCardFromDiagnosis,
  applyProviderDischargeTemplateToCard,
  PROVIDER_DISCHARGE_REGISTRY_PARAGRAPH_FRAGMENTS,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import {
  buildProviderDischargeTemplateHashPayload,
  computeProviderDischargeTemplateAppliedHash,
  providerDischargeTemplateHashCanonicalString,
} from "./providerDischargeTemplateAppliedHash";
import {
  createDiagnosisDocFromRef,
  getSelectedDiagnosisDocs,
  hydrateProviderDischargeDocumentationForm,
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
    returnPrecautions: `Precautions for ${code}`,
    followUps: [{ ...newDefaultFollowUpRow(), timing: "1 week" }],
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
  });
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
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "",
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
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "",
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
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "",
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
      expect(resolved.template.id).toBe("abdominal_pain_family_v1");
    });

    it("keyword match beats generic fallback", () => {
      const resolved = resolveProviderDischargeTemplateForDiagnosis({
        code: "Z00.00",
        displayName: "abdominal pain after meal",
      });
      expect(resolved.matchLevel).toBe("keyword");
      expect(resolved.template.id).toBe("abdominal_pain_keyword_v1");
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
      expect(next.templateMeta?.templateVersion).toBe("1.0.0");
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
      });
      expect(withCategories).not.toBe(withoutCategories);
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
