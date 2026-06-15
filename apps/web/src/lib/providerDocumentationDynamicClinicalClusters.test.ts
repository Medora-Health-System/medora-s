import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  toggleDocumentationFragment,
} from "./providerDocumentationModel";
import {
  DYNAMIC_CLINICAL_CLUSTER_IDS,
  excludeClusterSuggestionsFromDynamicSuggestions,
  getProviderDocumentationDynamicClinicalClusters,
} from "./providerDocumentationDynamicClinicalClusters";
import { getProviderDocumentationDynamicSuggestions } from "./providerDocumentationDynamicIntelligence";

function stateWithHpi(text: string) {
  const state = emptyProviderDocumentationWorkspaceState();
  state.hpi = text;
  return state;
}

describe("providerDocumentationDynamicClinicalClusters (19P)", () => {
  it("defines all ten high-value pathway clusters", () => {
    expect(DYNAMIC_CLINICAL_CLUSTER_IDS).toEqual([
      "respiratory_distress",
      "sepsis_infection",
      "acs_chest_pain",
      "stroke_neuro_deficit",
      "surgical_abdomen",
      "pediatric_dehydration",
      "testicular_torsion",
      "ectopic_pregnancy",
      "psychiatric_safety",
      "spine_neuro_red_flag",
    ]);
  });

  it("does not activate respiratory cluster with a single trigger", () => {
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "sob",
      state: stateWithHpi("wheezing only"),
    });
    expect(clusters).toEqual([]);
  });

  it("activates respiratory cluster with multi-trigger combination", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "hypoxia; wheezing";
    state.physicalExam.respiratory = "retractions present on exam";
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "sob",
      state,
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("respiratory_distress");
    expect(clusters[0]?.severity).toBe("high");
    expect(clusters[0]?.matchedTriggerReasonKeys.length).toBeGreaterThanOrEqual(2);
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.sob.diffPneumonia");
    expect(keys).toContain("providerDocumentationDynamicClusters.fragments.continuousPulseOxConsidered");
  });

  it("activates chest pain ACS cluster with exertional + diaphoresis + SOB", () => {
    const state = stateWithHpi("exertional chest pain; diaphoresis; shortness of breath");
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "chest_pain",
      state,
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("acs_chest_pain");
    expect(clusters[0]?.severity).toBe("high");
    expect(clusters[0]?.matchedTriggerReasonKeys).toHaveLength(3);
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome");
    expect(keys).toContain("providerDocumentationDynamicClusters.fragments.unstableAnginaConsidered");
  });

  it("activates surgical abdomen cluster with RLQ + guarding + vomiting", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "RLQ pain; vomiting";
    state.physicalExam.abdomen = "guarding on exam";
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "abdominal_pain",
      state,
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("surgical_abdomen");
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.abdominal.diffAppendicitis");
    expect(keys).toContain("providerDocumentationDynamicClusters.fragments.surgicalAbdomenConsidered");
  });

  it("activates torsion cluster with sudden testicular pain + nausea", () => {
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "male_genital_complaint",
      state: stateWithHpi("sudden testicular pain; nausea"),
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("testicular_torsion");
    expect(clusters[0]?.severity).toBe("high");
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.maleGenitalComplaint.diffTesticularTorsion");
  });

  it("activates ectopic cluster with pelvic pain + bleeding + pregnancy concern", () => {
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "female_pelvic_gyn_complaint",
      state: stateWithHpi("pelvic pain; vaginal bleeding; pregnancy concern"),
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("ectopic_pregnancy");
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy");
  });

  it("activates psychiatric safety cluster with suicidal thoughts + weapon access", () => {
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "psychiatric_behavioral",
      state: stateWithHpi("suicidal thoughts; access to weapons"),
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.id).toBe("psychiatric_safety");
    expect(clusters[0]?.severity).toBe("high");
    const keys = clusters[0]?.suggestions.map((item) => item.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationComplaintIntel.psychiatricBehavioral.diffBehavioralCrisis");
    expect(keys).toContain("providerDocumentationComplaintIntel.psychiatricBehavioral.mdmInvoluntaryHoldConsidered");
  });

  it("removes clusters when trigger text is removed", () => {
    let hpi = "exertional chest pain; diaphoresis; shortness of breath";
    let clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "chest_pain",
      state: stateWithHpi(hpi),
    });
    expect(clusters).toHaveLength(1);

    hpi = toggleDocumentationFragment(hpi, "diaphoresis");
    clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "chest_pain",
      state: stateWithHpi(hpi),
    });
    expect(clusters).toEqual([]);
  });

  it("does not auto-insert cluster suggestion fragments on template apply", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "sob",
      resolveFragment: (key) => key,
    });
    expect(JSON.stringify(next)).not.toContain("providerDocumentationDynamicClusters.fragments");
    expect(JSON.stringify(next)).not.toContain("continuousPulseOxConsidered");
  });

  it("does not leak clusters across templates", () => {
    const state = stateWithHpi("exertional chest pain; diaphoresis; shortness of breath");
    const abdominalClusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "abdominal_pain",
      state,
    });
    expect(abdominalClusters).toEqual([]);
  });

  it("assigns moderate severity for pediatric dehydration with two triggers and high with three", () => {
    const moderate = getProviderDocumentationDynamicClinicalClusters({
      templateId: "diarrhea",
      state: stateWithHpi("vomiting; diarrhea"),
    });
    expect(moderate[0]?.severity).toBe("moderate");

    const high = getProviderDocumentationDynamicClinicalClusters({
      templateId: "diarrhea",
      state: stateWithHpi("vomiting; diarrhea; dry mucous membranes"),
    });
    expect(high[0]?.severity).toBe("high");
  });

  it("excludes cluster suggestions from flat dynamic suggestions list", () => {
    const state = stateWithHpi("exertional chest pain; diaphoresis; shortness of breath");
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "chest_pain",
      state,
    });
    const flat = getProviderDocumentationDynamicSuggestions({ templateId: "chest_pain", state });
    const deduped = excludeClusterSuggestionsFromDynamicSuggestions(flat, clusters);
    const clusterKeys = new Set(clusters.flatMap((cluster) => cluster.suggestions.map((item) => item.fragmentKey)));
    for (const suggestion of deduped) {
      expect(clusterKeys.has(suggestion.fragmentKey)).toBe(false);
    }
  });

  it("keeps cluster suggestions toggleable via documentation fragment helper", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.mdmDifferentialSynthesis = "";
    const clusters = getProviderDocumentationDynamicClinicalClusters({
      templateId: "male_genital_complaint",
      state: stateWithHpi("sudden testicular pain; nausea"),
    });
    const fragmentKey =
      clusters[0]?.suggestions.find((item) => item.category === "differential")?.fragmentKey ?? "";
    expect(fragmentKey).toContain("diffTesticularTorsion");
    const fragmentText = "testicular torsion considered";
    state.mdmDifferentialSynthesis = toggleDocumentationFragment(state.mdmDifferentialSynthesis, fragmentText);
    expect(state.mdmDifferentialSynthesis).toContain(fragmentText);
    state.mdmDifferentialSynthesis = toggleDocumentationFragment(state.mdmDifferentialSynthesis, fragmentText);
    expect(state.mdmDifferentialSynthesis).not.toContain(fragmentText);
  });

  it("uses pattern language in cluster titles (not diagnosis-detected wording)", () => {
    const enMessages = readFileSync(new URL("../i18n/messages/en.ts", import.meta.url), "utf8");
    expect(enMessages).toMatch(/High-risk respiratory pattern/);
    expect(enMessages).not.toMatch(/respiratory failure detected|diagnosis detected/i);
  });

  it("does not mutate workspace state when computing clusters", () => {
    const state = stateWithHpi("hypoxia; wheezing; retractions");
    const snapshot = JSON.stringify(state);
    getProviderDocumentationDynamicClinicalClusters({ templateId: "sob", state });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
