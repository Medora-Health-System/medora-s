import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import { getProviderDocumentationDynamicClinicalClusters } from "./providerDocumentationDynamicClinicalClusters";
import {
  DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS,
  documentationGuardrailsBlockSigning,
  evaluateDocumentationQualityGuardrails,
} from "./providerDocumentationQualityGuardrails";

function evaluateForTemplate(
  templateId: NonNullable<Parameters<typeof evaluateDocumentationQualityGuardrails>[0]["templateId"]>,
  state = emptyProviderDocumentationWorkspaceState()
) {
  const dynamicClusters = getProviderDocumentationDynamicClinicalClusters({ templateId, state });
  return evaluateDocumentationQualityGuardrails({ templateId, state, dynamicClusters });
}

describe("providerDocumentationQualityGuardrails (19Q)", () => {
  it("returns no warnings for an empty note without a template", () => {
    const warnings = evaluateDocumentationQualityGuardrails({
      templateId: null,
      state: emptyProviderDocumentationWorkspaceState(),
      dynamicClusters: [],
    });
    expect(warnings).toEqual([]);
  });

  it("warns for ACS cluster without repeat reassessment documentation", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    const warnings = evaluateForTemplate("chest_pain", state);
    expect(warnings.some((item) => item.id === "acs_missing_reassessment")).toBe(true);
    expect(warnings.find((item) => item.id === "acs_missing_reassessment")?.severity).toBe("high");
  });

  it("removes ACS reassessment warning when reassessment is documented", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    state.physicalExam.reassessment = "repeat chest pain reassessment performed";
    state.mdmClinicalRationale = "HEART score elements considered";
    state.mdmAdmitObserveDischarge = "observation considered per assessment";
    const warnings = evaluateForTemplate("chest_pain", state);
    expect(warnings.some((item) => item.id === "acs_missing_reassessment")).toBe(false);
  });

  it("warns for stroke cluster without last-known-well documentation", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "unilateral weakness; speech difficulty";
    const warnings = evaluateForTemplate("stroke_symptoms", state);
    expect(warnings.some((item) => item.id === "stroke_missing_lkw")).toBe(true);
  });

  it("warns for pediatric fever template without caregiver return precautions", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "fever reviewed";
    const warnings = evaluateForTemplate("fever", state);
    expect(warnings.some((item) => item.id === "pediatric_missing_caregiver_precautions")).toBe(true);
  });

  it("warns for torsion cluster without ultrasound consideration", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "sudden testicular pain; nausea";
    const warnings = evaluateForTemplate("male_genital_complaint", state);
    expect(warnings.some((item) => item.id === "torsion_missing_ultrasound")).toBe(true);
  });

  it("warns for psych safety cluster without safety planning", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "suicidal thoughts; access to weapons";
    const warnings = evaluateForTemplate("psychiatric_behavioral", state);
    expect(warnings.some((item) => item.id === "psych_missing_safety_planning")).toBe(true);
  });

  it("warns when MDM is empty on an active template", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "abdominal pain";
    const warnings = evaluateForTemplate("abdominal_pain", state);
    expect(warnings.some((item) => item.id === "general_missing_mdm")).toBe(true);
  });

  it("removes warnings when relevant documentation is added", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "suicidal thoughts; access to weapons";
    state.mdmPlanSummary = "safety plan considered";
    state.physicalExam.reassessment = "behavior reassessed";
    state.mdmAdmitObserveDischarge = "psychiatric admission considered";
    const warnings = evaluateForTemplate("psychiatric_behavioral", state);
    expect(warnings.some((item) => item.id === "psych_missing_safety_planning")).toBe(false);
    expect(warnings.some((item) => item.id === "psych_missing_reassessment")).toBe(false);
    expect(warnings.some((item) => item.id === "psych_missing_consult_disposition")).toBe(false);
  });

  it("never blocks signing", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    const warnings = evaluateForTemplate("chest_pain", state);
    expect(documentationGuardrailsBlockSigning(warnings)).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("does not auto-insert content through guardrail evaluation", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    const snapshot = JSON.stringify(state);
    evaluateForTemplate("chest_pain", state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("does not auto-insert on template apply", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    expect(JSON.stringify(next)).not.toContain("providerDocumentationQualityGuardrails");
  });

  it("maps section jump targets to accordion sections", () => {
    expect(DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS.physicalExam).toBe(
      "providerDocumentationWorkspace.sectionExam"
    );
    expect(DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS.mdm).toBe("providerDocumentationWorkspace.sectionMdm");
    expect(DOCUMENTATION_GUARDRAIL_SECTION_LABEL_KEYS.impressionPlan).toBe(
      "providerDocumentationWorkspace.sectionPlan"
    );

    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "unilateral weakness; speech difficulty";
    const warnings = evaluateForTemplate("stroke_symptoms", state);
    const lkwWarning = warnings.find((item) => item.id === "stroke_missing_lkw");
    expect(lkwWarning?.suggestedSection).toBe("hpi");
  });

  it("uses supportive advisory language in i18n copy", () => {
    const enMessages = readFileSync(new URL("../i18n/messages/en.ts", import.meta.url), "utf8");
    expect(enMessages).toMatch(/Consider documenting|may benefit from/i);
    expect(enMessages).not.toMatch(/malpractice|invalid chart|required coding/i);
  });

  it("wires quality guardrails into the workspace actions area", () => {
    const workspaceSource = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(workspaceSource).toContain("evaluateDocumentationQualityGuardrails");
    expect(workspaceSource).toContain("provider-documentation-quality-guardrails");
    expect(workspaceSource).toContain("jumpToGuardrailSection");
    expect(workspaceSource).toContain("handleSignClick");
  });
});
