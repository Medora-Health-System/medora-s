import { ClinicalReviewOrchestratorService } from "./clinical-review-orchestrator.service.js";

const baseSnapshot = {
  snapshotVersion: "snapshot-v1",
  generatedAt: "2026-09-12T20:00:00.000Z",
  encounterContext: {
    encounterId: "11111111-1111-4111-8111-111111111111",
    facilityId: "22222222-2222-4222-8222-222222222222",
    patientId: "33333333-3333-4333-8333-333333333333",
    country: "US",
    encounterType: "CLINIC",
    status: "OPEN",
    careSetting: "OFFICE_OUTPATIENT_CLINIC",
  },
  patientContext: { age: 42, sexAtBirth: "F" },
  presentation: { chiefComplaint: "cough", vitalTrend: [] },
  clinicalDocumentation: { structuredEntries: [], reassessments: [] },
  diagnostics: { orders: [], results: [], pendingTests: [], criticalResults: [] },
  treatments: { medicationOrders: [], medicationAdministrations: [], procedures: [] },
  diagnoses: { documentedDiagnoses: [] },
  disposition: { followUps: [], appointments: [] },
} as any;

const deterministicSuggestion = {
  id: "11111111-1111-4111-8111-111111111112",
  category: "DOCUMENTATION_GAP",
  priority: "LOW",
  title: "Deterministic finding",
  summary: "A deterministic finding",
  reasoningSummary: "Structured rule result",
  evidence: [],
  recommendedActions: [],
  clinicalDisclaimer: "Provider review required.",
  source: "DETERMINISTIC",
  generatedAt: "2026-09-12T20:00:00.000Z",
  snapshotVersion: "snapshot-v1",
  status: "PENDING",
} as any;

const externalOutput = {
  suggestions: [
    {
      category: "DIAGNOSTIC_GAP",
      priority: "MEDIUM",
      title: "Review diagnostic context",
      summary: "A diagnostic review item may need clinician attention.",
      reasoningSummary: "This is based only on supplied encounter facts.",
      evidence: [{ sourceType: "TRIAGE", label: "Chief complaint", value: "cough" }],
      recommendedActions: [
        { actionType: "NAVIGATE", targetSection: "results", label: "Review results" },
      ],
      clinicalDisclaimer: "Clinical decision-making remains with the treating clinician.",
    },
  ],
};

describe("ClinicalReviewOrchestratorService", () => {
  const input = {
    facilityId: "22222222-2222-4222-8222-222222222222",
    encounterId: "11111111-1111-4111-8111-111111111111",
    actorUserId: "44444444-4444-4444-8444-444444444444",
  };

  it("returns deterministic review only when external AI is disabled", async () => {
    const snapshotBuilder = { build: jest.fn(async () => baseSnapshot) };
    const deterministicReview = { run: jest.fn(() => ({ suggestions: [deterministicSuggestion] })) };
    const featureFlags = { isFacilityEnabled: jest.fn(() => false) };
    const modelProvider = { providerName: "OPENAI", modelName: "test", generateStructured: jest.fn() };
    const service = new ClinicalReviewOrchestratorService(
      snapshotBuilder as any,
      deterministicReview as any,
      featureFlags as any,
      modelProvider as any
    );

    const result = await service.run(input);

    expect(result.suggestions).toEqual([deterministicSuggestion]);
    expect(modelProvider.generateStructured).not.toHaveBeenCalled();
    expect(snapshotBuilder.build).toHaveBeenCalledTimes(1);
  });

  it("merges validated external suggestions without allowing model provenance fields", async () => {
    const snapshotBuilder = { build: jest.fn(async () => baseSnapshot) };
    const deterministicReview = { run: jest.fn(() => ({ suggestions: [deterministicSuggestion] })) };
    const featureFlags = { isFacilityEnabled: jest.fn(() => true) };
    const modelProvider = {
      providerName: "OPENAI",
      modelName: "test",
      generateStructured: jest.fn(async (request: any) => ({
        provider: "OPENAI",
        model: "test",
        output: externalOutput,
        snapshotVersion: request.snapshotContext.snapshotVersion,
      })),
    };
    const service = new ClinicalReviewOrchestratorService(
      snapshotBuilder as any,
      deterministicReview as any,
      featureFlags as any,
      modelProvider as any
    );

    const result = await service.run(input);

    expect(snapshotBuilder.build).toHaveBeenCalledTimes(2);
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0]).toBe(deterministicSuggestion);
    expect(result.suggestions[1]).toMatchObject({
      category: "DIAGNOSTIC_GAP",
      source: "OPENAI",
      snapshotVersion: "snapshot-v1",
      status: "PENDING",
    });
    expect(result.suggestions[1]?.id).toMatch(/^[0-9a-f-]{36}$/i);

    const providerRequest = modelProvider.generateStructured.mock.calls[0]?.[0];
    const externalPayload = JSON.stringify(providerRequest.clinicalInput);
    expect(externalPayload).not.toContain(baseSnapshot.encounterContext.patientId);
    expect(externalPayload).not.toContain(baseSnapshot.encounterContext.encounterId);
    expect(providerRequest.systemInstruction).toContain("Do not provide CPT/E&M/payer/reimbursement advice");
  });

  it("rejects malformed model output and preserves deterministic findings", async () => {
    const snapshotBuilder = { build: jest.fn(async () => baseSnapshot) };
    const deterministicReview = { run: jest.fn(() => ({ suggestions: [deterministicSuggestion] })) };
    const featureFlags = { isFacilityEnabled: jest.fn(() => true) };
    const modelProvider = {
      providerName: "OPENAI",
      modelName: "test",
      generateStructured: jest.fn(async () => ({
        provider: "OPENAI",
        model: "test",
        output: { suggestions: [{ title: "malformed" }] },
        snapshotVersion: "snapshot-v1",
      })),
    };
    const service = new ClinicalReviewOrchestratorService(
      snapshotBuilder as any,
      deterministicReview as any,
      featureFlags as any,
      modelProvider as any
    );

    const result = await service.run(input);

    expect(result.suggestions).toEqual([deterministicSuggestion]);
    expect(snapshotBuilder.build).toHaveBeenCalledTimes(1);
  });

  it("discards a model result when the encounter changes during review", async () => {
    const changedSnapshot = { ...baseSnapshot, snapshotVersion: "snapshot-v2" } as any;
    const snapshotBuilder = {
      build: jest.fn()
        .mockResolvedValueOnce(baseSnapshot)
        .mockResolvedValueOnce(changedSnapshot),
    };
    const deterministicReview = {
      run: jest.fn((snapshot: any) => ({
        suggestions: snapshot.snapshotVersion === "snapshot-v2" ? [] : [deterministicSuggestion],
      })),
    };
    const featureFlags = { isFacilityEnabled: jest.fn(() => true) };
    const modelProvider = {
      providerName: "OPENAI",
      modelName: "test",
      generateStructured: jest.fn(async () => ({
        provider: "OPENAI",
        model: "test",
        output: externalOutput,
        snapshotVersion: "snapshot-v1",
      })),
    };
    const service = new ClinicalReviewOrchestratorService(
      snapshotBuilder as any,
      deterministicReview as any,
      featureFlags as any,
      modelProvider as any
    );

    const result = await service.run(input);

    expect(result.suggestions).toEqual([]);
    expect(deterministicReview.run).toHaveBeenLastCalledWith(changedSnapshot);
  });

  it("falls back safely when the external provider is unavailable", async () => {
    const snapshotBuilder = { build: jest.fn(async () => baseSnapshot) };
    const deterministicReview = { run: jest.fn(() => ({ suggestions: [deterministicSuggestion] })) };
    const featureFlags = { isFacilityEnabled: jest.fn(() => true) };
    const modelProvider = {
      providerName: "OPENAI",
      modelName: "test",
      generateStructured: jest.fn(async () => { throw new Error("provider down"); }),
    };
    const service = new ClinicalReviewOrchestratorService(
      snapshotBuilder as any,
      deterministicReview as any,
      featureFlags as any,
      modelProvider as any
    );

    const result = await service.run(input);

    expect(result.suggestions).toEqual([deterministicSuggestion]);
  });
});
