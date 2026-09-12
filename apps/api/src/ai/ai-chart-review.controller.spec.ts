import { BadRequestException } from "@nestjs/common";
import { AiChartReviewController } from "./ai-chart-review.controller.js";

describe("AiChartReviewController", () => {
  it("runs the authorized Phase 1E chart review orchestrator", async () => {
    const output = { suggestions: [] };
    const orchestrator = {
      run: jest.fn(async () => output),
    };
    const controller = new AiChartReviewController(orchestrator as any);

    const result = await controller.getChartReview("encounter-1", {
      user: { userId: "provider-1", facilityId: "facility-1" },
      headers: {},
    });

    expect(orchestrator.run).toHaveBeenCalledWith({
      facilityId: "facility-1",
      encounterId: "encounter-1",
      actorUserId: "provider-1",
    });
    expect(result).toBe(output);
  });

  it("rejects requests without facility context", async () => {
    const controller = new AiChartReviewController({ run: jest.fn() } as any);

    await expect(
      controller.getChartReview("encounter-1", { user: { userId: "provider-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects requests without an authenticated actor", async () => {
    const controller = new AiChartReviewController({ run: jest.fn() } as any);

    await expect(
      controller.getChartReview("encounter-1", { user: { facilityId: "facility-1" }, headers: {} })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
