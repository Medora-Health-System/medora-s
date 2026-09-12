import { BadRequestException, ConflictException } from "@nestjs/common";
import { AiChartReviewController } from "./ai-chart-review.controller.js";

function createController(options?: {
  output?: any;
  snapshotVersion?: string;
}) {
  const output = options?.output ?? { suggestions: [] };
  const orchestrator = { run: jest.fn(async () => output) };
  const snapshotBuilder = {
    build: jest.fn(async () => ({ snapshotVersion: options?.snapshotVersion ?? "snapshot-v1" })),
  };
  const aiAudit = { log: jest.fn(async () => undefined) };
  const controller = new AiChartReviewController(orchestrator as any, snapshotBuilder as any, aiAudit as any);
  return { controller, orchestrator, snapshotBuilder, aiAudit };
}

const request = {
  user: { userId: "provider-1", facilityId: "facility-1" },
  headers: {},
};

describe("AiChartReviewController", () => {
  it("runs the chart review and records PHI-safe request/completion audit events", async () => {
    const output = {
      suggestions: [
        {
          snapshotVersion: "snapshot-v1",
        },
      ],
    };
    const { controller, orchestrator, aiAudit } = createController({ output });

    const result = await controller.getChartReview("encounter-1", request);

    expect(orchestrator.run).toHaveBeenCalledWith({
      facilityId: "facility-1",
      encounterId: "encounter-1",
      actorUserId: "provider-1",
    });
    expect(aiAudit.log).toHaveBeenNthCalledWith(
      1,
      "AI_REVIEW_REQUESTED",
      { facilityId: "facility-1", encounterId: "encounter-1" },
      "provider-1"
    );
    expect(aiAudit.log).toHaveBeenNthCalledWith(
      2,
      "AI_REVIEW_COMPLETED",
      {
        facilityId: "facility-1",
        encounterId: "encounter-1",
        snapshotVersion: "snapshot-v1",
      },
      "provider-1"
    );
    expect(result).toBe(output);
  });

  it("does not let audit telemetry failure block chart review", async () => {
    const { controller, orchestrator, aiAudit } = createController();
    aiAudit.log.mockRejectedValue(new Error("audit unavailable"));

    await expect(controller.getChartReview("encounter-1", request)).resolves.toEqual({ suggestions: [] });
    expect(orchestrator.run).toHaveBeenCalledTimes(1);
  });

  it("accepts helpful feedback only after current encounter authorization and snapshot validation", async () => {
    const { controller, snapshotBuilder, aiAudit } = createController({ snapshotVersion: "snapshot-v1" });

    const result = await controller.submitSuggestionFeedback(
      "encounter-1",
      {
        suggestionId: "11111111-1111-4111-8111-111111111111",
        category: "CLINICAL_SAFETY",
        snapshotVersion: "snapshot-v1",
        rating: "HELPFUL",
      },
      request
    );

    expect(snapshotBuilder.build).toHaveBeenCalledWith({
      facilityId: "facility-1",
      encounterId: "encounter-1",
      actorUserId: "provider-1",
    });
    expect(aiAudit.log).toHaveBeenCalledWith(
      "AI_SUGGESTION_HELPFUL",
      {
        facilityId: "facility-1",
        encounterId: "encounter-1",
        snapshotVersion: "snapshot-v1",
        suggestionId: "11111111-1111-4111-8111-111111111111",
        category: "CLINICAL_SAFETY",
      },
      "provider-1"
    );
    expect(result).toEqual({ accepted: true });
  });

  it("rejects feedback for stale suggestions", async () => {
    const { controller } = createController({ snapshotVersion: "snapshot-v2" });

    await expect(
      controller.submitSuggestionFeedback(
        "encounter-1",
        {
          suggestionId: "11111111-1111-4111-8111-111111111111",
          category: "CLINICAL_SAFETY",
          snapshotVersion: "snapshot-v1",
          rating: "NOT_HELPFUL",
        },
        request
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects malformed feedback before audit", async () => {
    const { controller, snapshotBuilder, aiAudit } = createController();

    await expect(
      controller.submitSuggestionFeedback(
        "encounter-1",
        { suggestionId: "not-a-uuid", rating: "HELPFUL" },
        request
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(snapshotBuilder.build).not.toHaveBeenCalled();
    expect(aiAudit.log).not.toHaveBeenCalled();
  });

  it("rejects requests without facility context", async () => {
    const { controller } = createController();

    await expect(
      controller.getChartReview("encounter-1", { user: { userId: "provider-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects requests without an authenticated actor", async () => {
    const { controller } = createController();

    await expect(
      controller.getChartReview("encounter-1", { user: { facilityId: "facility-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
