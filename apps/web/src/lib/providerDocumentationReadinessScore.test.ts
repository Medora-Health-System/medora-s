import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emptyProviderDocumentationWorkspaceState } from "./providerDocumentationModel";
import { getProviderDocumentationDynamicClinicalClusters } from "./providerDocumentationDynamicClinicalClusters";
import { evaluateDocumentationQualityGuardrails } from "./providerDocumentationQualityGuardrails";
import {
  computeDocumentationReadinessScore,
  documentationReadinessScoreBlocksSigning,
  READINESS_SECTION_LABEL_KEYS,
} from "./providerDocumentationReadinessScore";

function scoreForTemplate(
  templateId: NonNullable<Parameters<typeof computeDocumentationReadinessScore>[0]["templateId"]>,
  state = emptyProviderDocumentationWorkspaceState()
) {
  const dynamicClusters = getProviderDocumentationDynamicClinicalClusters({ templateId, state });
  const guardrails = evaluateDocumentationQualityGuardrails({ templateId, state, dynamicClusters });
  return computeDocumentationReadinessScore({
    templateId,
    state,
    guardrails,
    dynamicClusters,
  });
}

function completeNoteState() {
  const state = emptyProviderDocumentationWorkspaceState();
  state.chiefComplaint = "chest pain";
  state.hpi = "exertional chest pain with diaphoresis and shortness of breath";
  state.rosImportantPositives = "diaphoresis";
  state.physicalExam.general = "well appearing";
  state.physicalExam.cardiovascular = "regular rate and rhythm";
  state.physicalExam.respiratory = "clear breath sounds";
  state.physicalExam.reassessment = "repeat chest pain reassessment performed";
  state.mdmWorkingAssessment = "ACS considered per assessment";
  state.mdmDifferentialSynthesis = "acute coronary syndrome considered";
  state.mdmDataReviewed = "troponin reviewed if obtained";
  state.mdmClinicalRationale = "HEART score elements considered";
  state.mdmPlanSummary = "serial reassessment performed";
  state.mdmAdmitObserveDischarge = "observation considered per assessment";
  state.clinicalImpression = "chest pain, rule out ACS";
  state.treatmentPlan = "monitoring and repeat troponin";
  state.followUpDisposition = "return precautions discussed";
  return state;
}

describe("providerDocumentationReadinessScore (19R)", () => {
  it("returns a low score for an empty note", () => {
    const readiness = scoreForTemplate("chest_pain");
    expect(readiness.score).toBeLessThan(45);
    expect(readiness.level).toBe("low");
    expect(readiness.strongSections).toEqual([]);
    expect(readiness.needsAttentionSections.length).toBe(6);
  });

  it("returns a strong score for a well-completed note without guardrails", () => {
    const readiness = scoreForTemplate("chest_pain", completeNoteState());
    expect(readiness.score).toBeGreaterThanOrEqual(75);
    expect(readiness.level).toBe("strong");
    expect(readiness.strongSections).toContain(READINESS_SECTION_LABEL_KEYS.mdm);
    expect(readiness.strongSections).toContain(READINESS_SECTION_LABEL_KEYS.reassessment);
  });

  it("lowers the score when MDM is missing", () => {
    const complete = completeNoteState();
    const withMdm = scoreForTemplate("chest_pain", complete).score;

    complete.mdmWorkingAssessment = "";
    complete.mdmDifferentialSynthesis = "";
    complete.mdmDataReviewed = "";
    complete.mdmClinicalRationale = "";
    complete.mdmPlanSummary = "";
    complete.mdmImmediateActionsRationale = "";
    complete.mdmConsultsDiscussed = "";
    complete.mdmAdmitObserveDischarge = "";
    complete.mdmRiskLevel = "";

    const withoutMdm = scoreForTemplate("chest_pain", complete).score;
    expect(withoutMdm).toBeLessThan(withMdm);
    expect(withoutMdm).toBeLessThanOrEqual(withMdm - 20);
  });

  it("reduces the score for high-severity guardrails", () => {
    const baseline = scoreForTemplate("chest_pain", completeNoteState()).score;
    const risky = emptyProviderDocumentationWorkspaceState();
    risky.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    risky.chiefComplaint = "chest pain";
    risky.physicalExam.respiratory = "clear breath sounds";
    const penalized = scoreForTemplate("chest_pain", risky).score;
    expect(penalized).toBeLessThan(baseline);
    expect(penalized).toBeLessThanOrEqual(baseline - 10);
  });

  it("reflects warning counts from guardrails", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "exertional chest pain; diaphoresis; shortness of breath";
    const readiness = scoreForTemplate("chest_pain", state);
    expect(readiness.warningCount).toBeGreaterThan(0);
    expect(readiness.highSeverityWarningCount).toBeGreaterThan(0);
  });

  it("never blocks signing", () => {
    const readiness = scoreForTemplate("chest_pain");
    expect(documentationReadinessScoreBlocksSigning(readiness)).toBe(false);
  });

  it("avoids billing and CPT language in readiness source strings", () => {
    const readinessSource = readFileSync(
      new URL("./providerDocumentationReadinessScore.ts", import.meta.url),
      "utf8"
    );
    const enMessages = readFileSync(new URL("../i18n/messages/en.ts", import.meta.url), "utf8");
    const readinessMessages = enMessages.slice(
      enMessages.indexOf("providerDocumentationReadinessScore:"),
      enMessages.indexOf("providerDocumentationComplaintIntel:")
    );
    expect(readinessMessages).not.toMatch(/billing level|audit-proof|guaranteed|\bcompliant\b|\bCPT\b/i);
    expect(readinessSource).toMatch(/Not used for billing, CPT, or coding/i);
    expect(readinessMessages).toMatch(/Documentation readiness|well-supported/i);
  });

  it("wires readiness summary into the workspace actions area", () => {
    const workspaceSource = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(workspaceSource).toContain("computeDocumentationReadinessScore");
    expect(workspaceSource).toContain("provider-documentation-readiness-score");
    expect(workspaceSource).toContain("renderDocumentationReadinessPanel");
  });
});
