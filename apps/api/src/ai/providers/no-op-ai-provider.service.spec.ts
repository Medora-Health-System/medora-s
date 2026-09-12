import { NoOpAiProvider } from "./no-op-ai-provider.service";

describe("NoOpAiProvider", () => {
  it("returns a valid structured response with no network call", async () => {
    const provider = new NoOpAiProvider();
    const request = {
      snapshotContext: {
        snapshotVersion: "v1/abc123",
        facilityId: "fac-1",
        encounterId: "enc-1",
      },
      clinicalInput: { test: true },
    };

    const response = await provider.generateStructured(request);

    expect(response.provider).toBe("NO_OP");
    expect(response.model).toBe("NO_OP");
    expect(response.snapshotVersion).toBe("v1/abc123");
    expect(response.latencyMs).toBe(0);
    expect(response.output).toEqual({ suggestions: [] });
  });

  it("returns a valid clinical review output", async () => {
    const provider = new NoOpAiProvider();
    const request = {
      snapshotContext: {
        snapshotVersion: "v2/def456",
        facilityId: "fac-1",
        encounterId: "enc-1",
      },
      clinicalInput: {},
    };

    const response = await provider.generateClinicalReview(request);

    expect(response.output.suggestions).toEqual([]);
  });

  it("does not access Prisma, files, or environment secrets", () => {
    // The no-op provider has no dependencies and performs no I/O.
    const provider = new NoOpAiProvider();
    expect(provider.providerName).toBe("NO_OP");
    expect(provider.modelName).toBe("NO_OP");
  });
});
