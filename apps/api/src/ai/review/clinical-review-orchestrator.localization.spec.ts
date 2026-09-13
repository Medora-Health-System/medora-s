import { ClinicalReviewOrchestratorService } from "./clinical-review-orchestrator.service.js";

const snapshot = {
  snapshotVersion: "snapshot-v1",
  encounterContext: { careSetting: "EMERGENCY_DEPARTMENT" },
} as any;

const input = {
  facilityId: "22222222-2222-4222-8222-222222222222",
  encounterId: "11111111-1111-4111-8111-111111111111",
  actorUserId: "44444444-4444-4444-8444-444444444444",
};

function serviceFor(suggestion: any, enabled = false, providerOutput?: any) {
  const snapshotBuilder = { build: jest.fn(async () => snapshot) };
  const deterministicReview = { run: jest.fn(() => ({ suggestions: [suggestion] })) };
  const featureFlags = { isFacilityEnabled: jest.fn(() => enabled) };
  const modelProvider = {
    providerName: "OPENAI",
    modelName: "test",
    generateStructured: jest.fn(async (request: any) => ({
      provider: "OPENAI",
      model: "test",
      output: providerOutput ?? { suggestions: [] },
      snapshotVersion: request.snapshotContext.snapshotVersion,
    })),
  };
  return { service: new ClinicalReviewOrchestratorService(snapshotBuilder as any, deterministicReview as any, featureFlags as any, modelProvider as any), modelProvider };
}

describe("ClinicalReviewOrchestratorService clinician-first localization", () => {
  it("turns MDM counters into a direct Spanish problem statement and hides opaque evidence counters", async () => {
    const finding = {
      id: "11111111-1111-4111-8111-111111111112",
      category: "MDM_GAP",
      priority: "MEDIUM",
      title: "Medical decision-making documentation may be incomplete",
      summary: "The structured MDM is missing documented data reviewed, risk/management reasoning.",
      reasoningSummary: "Completeness only.",
      evidence: [
        { sourceType: "MDM", label: "MDM domains documented", value: 2 },
        { sourceType: "MDM", label: "MDM domains reviewed", value: 4 },
      ],
      recommendedActions: [{ actionType: "NAVIGATE", targetSection: "medical-evaluation", label: "Review MDM" }],
      clinicalDisclaimer: "Provider review required.",
      source: "deterministic",
      generatedAt: "2026-09-13T15:00:00.000Z",
      snapshotVersion: "snapshot-v1",
      status: "PENDING",
    };
    const { service } = serviceFor(finding);

    const result = await service.run(input, "es");

    expect(result.suggestions[0]?.summary).toBe(
      "Falta documentar datos revisados y razonamiento de riesgo y manejo en la toma de decisiones médicas."
    );
    expect(result.suggestions[0]?.evidence).toEqual([]);
  });

  it("requires external model findings to be self-explanatory without numbered evidence references", async () => {
    const finding = {
      id: "11111111-1111-4111-8111-111111111112",
      category: "DOCUMENTATION_GAP",
      priority: "LOW",
      title: "Documentation",
      summary: "Documentation gap",
      reasoningSummary: "Review",
      evidence: [],
      recommendedActions: [],
      clinicalDisclaimer: "Review",
      source: "deterministic",
      generatedAt: "2026-09-13T15:00:00.000Z",
      snapshotVersion: "snapshot-v1",
      status: "PENDING",
    };
    const { service, modelProvider } = serviceFor(finding, true);

    await service.run(input, "es");

    const instruction = modelProvider.generateStructured.mock.calls[0]?.[0]?.systemInstruction as string;
    expect(instruction).toContain("CLINICIAN-FIRST DISPLAY IS REQUIRED");
    expect(instruction).toContain('Never make the clinician decode labels such as "Evidence 1"');
    expect(instruction).toContain("Spanish");
  });
});
