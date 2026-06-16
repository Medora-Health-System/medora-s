import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  toggleDocumentationFragment,
} from "./providerDocumentationModel";
import {
  buildDocumentationCorpus,
  DYNAMIC_INTEL_TEMPLATE_IDS,
  getProviderDocumentationDynamicSuggestions,
} from "./providerDocumentationDynamicIntelligence";

function stateWithHpi(text: string) {
  const state = emptyProviderDocumentationWorkspaceState();
  state.hpi = text;
  return state;
}

describe("providerDocumentationDynamicIntelligence (19O)", () => {
  it("covers the v1 high-value template scope", () => {
    expect(DYNAMIC_INTEL_TEMPLATE_IDS).toEqual(
      expect.arrayContaining([
        "chest_pain",
        "sob",
        "abdominal_pain",
        "stroke_symptoms",
        "headache",
        "dizziness_syncope",
        "fever",
        "asthma_wheezing",
        "male_genital_complaint",
        "female_pelvic_gyn_complaint",
      ])
    );
    expect(DYNAMIC_INTEL_TEMPLATE_IDS.length).toBe(10);
  });

  it("returns no suggestions when no trigger text is selected", () => {
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "chest_pain",
      state: emptyProviderDocumentationWorkspaceState(),
    });
    expect(suggestions).toEqual([]);
  });

  it("suggests ACS/HEART/troponin for chest pain with exertional and SOB triggers", () => {
    const state = stateWithHpi("exertional chest pain; associated shortness of breath");
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "chest_pain",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome");
    expect(keys).toContain("providerDocumentationComplaintIntel.chestPain.waConcernForAcs");
    expect(keys).toContain("providerDocumentationComplaintIntel.chestPain.mdmTroponinReviewed");
    expect(keys).toContain("providerDocumentationComplaintIntel.chestPain.planSerialTroponinsOrdered");
  });

  it("suggests appendicitis and serial abdominal exams for RLQ pain with guarding", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "RLQ pain";
    state.physicalExam.abdomen = "guarding on exam";
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "abdominal_pain",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.abdominal.diffAppendicitis");
    expect(keys).toContain("providerDocumentationComplaintIntel.abdominal.mdmSerialAbdominalExamsPerformed");
    expect(keys).toContain("providerDocumentationComplaintIntel.abdominal.reassessSerialAbdominalExam");
  });

  it("suggests stroke alert, CT, and thrombolytic review for weakness and speech difficulty", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "unilateral weakness; speech difficulty";
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "stroke_symptoms",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.stroke.mdmStrokeAlertActivated");
    expect(keys).toContain("providerDocumentationComplaintIntel.stroke.mdmCtHeadReviewed");
    expect(keys).toContain("providerDocumentationComplaintIntel.stroke.mdmThrombolyticEligibilityConsidered");
  });

  it("suggests SAH, CT, and LP for thunderclap headache", () => {
    const state = stateWithHpi("thunderclap onset; worst headache of life");
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "headache",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage");
    expect(keys).toContain("providerDocumentationComplaintIntel.headache.waConcernForIntracranialProcess");
    expect(keys).toContain("providerDocumentationComplaintIntel.headache.mdmCtHeadReviewed");
    expect(keys).toContain("providerDocumentationComplaintIntel.headache.mdmLumbarPunctureReviewed");
  });

  it("suggests admission and repeat lung exam for pediatric asthma with hypoxia and retractions", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "wheezing reported";
    state.rosRedFlags = "retractions; hypoxia";
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "asthma_wheezing",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.pediatricAsthmaWheezing.mdmRepeatLungExamPerformed");
    expect(keys).toContain("providerDocumentationComplaintIntel.pediatricAsthmaWheezing.mdmOxygenRequirementAssessed");
    expect(keys).toContain(
      "providerDocumentationComplaintIntel.pediatricAsthmaWheezing.mdmAdmissionConsideredPersistentDistress"
    );
  });

  it("suggests torsion and urology for male genital sudden testicular pain", () => {
    const state = stateWithHpi("sudden testicular pain; nausea");
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "male_genital_complaint",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.maleGenitalComplaint.diffTesticularTorsion");
    expect(keys).toContain("providerDocumentationComplaintIntel.maleGenitalComplaint.mdmTesticularTorsionConsidered");
    expect(keys).toContain("providerDocumentationComplaintIntel.maleGenitalComplaint.mdmUrologyConsultationConsidered");
  });

  it("suggests ectopic pregnancy and pregnancy testing for female pelvic pregnancy concern", () => {
    const state = stateWithHpi("pelvic pain; pregnancy concern");
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "female_pelvic_gyn_complaint",
      state,
    });
    const keys = suggestions.map((item) => item.fragmentKey);
    expect(keys).toContain("providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy");
    expect(keys).toContain("providerDocumentationComplaintIntel.femalePelvicGynComplaint.waConcernForEctopicPregnancy");
    expect(keys).toContain("providerDocumentationComplaintIntel.femalePelvicGynComplaint.mdmPregnancyTestReviewed");
  });

  it("does not auto-insert dynamic suggestion fragments on template apply", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "chest_pain",
      resolveFragment: (key) => key,
    });
    expect(JSON.stringify(next)).not.toContain("providerDocumentationComplaintIntel.chestPain.waConcernForAcs");
    expect(JSON.stringify(next)).not.toContain("providerDocumentationDynamicIntel");
  });

  it("does not mutate workspace state when computing suggestions", () => {
    const state = stateWithHpi("exertional chest pain");
    const snapshot = JSON.stringify(state);
    getProviderDocumentationDynamicSuggestions({ templateId: "chest_pain", state });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("changes suggestions when trigger text is removed", () => {
    let hpi = "exertional chest pain";
    let suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "chest_pain",
      state: stateWithHpi(hpi),
    });
    expect(suggestions.some((item) => item.fragmentKey.includes("planSerialTroponinsOrdered"))).toBe(true);

    hpi = toggleDocumentationFragment(hpi, "exertional chest pain");
    suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "chest_pain",
      state: stateWithHpi(hpi),
    });
    expect(suggestions.some((item) => item.fragmentKey.includes("planSerialTroponinsOrdered"))).toBe(false);
  });

  it("does not leak chest pain suggestions into abdominal pain template", () => {
    const state = stateWithHpi("exertional chest pain; diaphoresis");
    const abdominalSuggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "abdominal_pain",
      state,
    });
    expect(abdominalSuggestions).toEqual([]);
  });

  it("includes reason keys and target fields for each suggestion", () => {
    const state = stateWithHpi("exertional chest pain");
    const suggestions = getProviderDocumentationDynamicSuggestions({
      templateId: "chest_pain",
      state,
    });
    for (const suggestion of suggestions) {
      expect(suggestion.reasonKey.startsWith("providerDocumentationDynamicIntel.reasons.")).toBe(true);
      expect(suggestion.labelKey).toBe(suggestion.fragmentKey);
      expect(typeof suggestion.targetField).toBe("string");
      expect(["differential", "mdm", "reassessment", "disposition"]).toContain(suggestion.category);
    }
  });

  it("builds corpus from HPI, ROS, exam, and MDM fields", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "alpha";
    state.rosImportantPositives = "beta";
    state.physicalExam.abdomen = "gamma";
    state.mdmDataReviewed = "delta";
    expect(buildDocumentationCorpus(state)).toContain("alpha");
    expect(buildDocumentationCorpus(state)).toContain("beta");
    expect(buildDocumentationCorpus(state)).toContain("gamma");
    expect(buildDocumentationCorpus(state)).toContain("delta");
  });

  it("wires dynamic suggestions into the workspace with toggle behavior", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("getProviderDocumentationDynamicSuggestions");
    expect(source).toContain("dynamicSuggestionsTitle");
    expect(source).toContain("toggleField(suggestion.targetField, suggestion.fragmentKey)");
    expect(source).toContain("aria-pressed={selected}");
  });
});
