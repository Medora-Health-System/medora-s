import { BadRequestException } from "@nestjs/common";
import { AiChartReviewController } from "./ai-chart-review.controller.js";

describe("AiChartReviewController", () => {
  it("builds an authorized encounter snapshot and runs deterministic review", async () => {
    const snapshot = { snapshotVersion: "snapshot-v1" } as any;
    const output = { suggestions: [] };
    const snapshotBuilder = {
      build: jest.fn(async () => snapshot),
    };
    const reviewEngine = {
      run: jest.fn(() => output),
    };
    const controller = new AiChartReviewController(snapshotBuilder as any, reviewEngine as any);

    const result = await controller.getChartReview("encounter-1", {
      user: { userId: "provider-1", facilityId: "facility-1" },
      headers: {},
    });

    expect(snapshotBuilder.build).toHaveBeenCalledWith({
      facilityId: "facility-1",
      encounterId: "encounter-1",
      actorUserId: "provider-1",
    });
    expect(reviewEngine.run).toHaveBeenCalledWith(snapshot);
    expect(result).toBe(output);
  });

  it("rejects requests without facility context", async () => {
    const controller = new AiChartReviewController({ build: jest.fn() } as any, { run: jest.fn() } as any);

    await expect(
      controller.getChartReview("encounter-1", { user: { userId: "provider-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects requests without an authenticated actor", async () => {
    const controller = new AiChartReviewController({ build: jest.fn() } as any, { run: jest.fn() } as any);

    await expect(
      controller.getChartReview("encounter-1", { user: { facilityId: "facility-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
