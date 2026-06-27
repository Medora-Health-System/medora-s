import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MEDICATION_DOSE_SCHEDULE_ADJUSTMENT_PATH,
  adjustMedicationDoseSchedule,
  buildMedicationDoseScheduleAdjustmentPath,
} from "./medicationDoseScheduleAdjustmentApi";

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

describe("medicationDoseScheduleAdjustmentApi", () => {
  beforeEach(async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    vi.mocked(apiFetch).mockReset();
  });

  it("documents the dose-scoped scheduled-at route template", () => {
    expect(MEDICATION_DOSE_SCHEDULE_ADJUSTMENT_PATH).toBe(
      "/facilities/:facilityId/encounters/:encounterId/medication-doses/:doseInstanceId/scheduled-at"
    );
  });

  it("buildMedicationDoseScheduleAdjustmentPath includes doseInstanceId segment", () => {
    expect(
      buildMedicationDoseScheduleAdjustmentPath("fac-1", "enc-1", "dose-abc")
    ).toBe("/facilities/fac-1/encounters/enc-1/medication-doses/dose-abc/scheduled-at");
  });

  it("PATCH uses dose-scoped path and never omits doseInstanceId", async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    vi.mocked(apiFetch).mockResolvedValue({
      doseInstanceId: "dose-abc",
      scheduledAt: "2026-06-23T14:00:00.000Z",
      dueWindowStartAt: "2026-06-23T13:30:00.000Z",
      dueWindowEndAt: "2026-06-23T14:30:00.000Z",
      doseStatus: "DUE",
    });

    await adjustMedicationDoseSchedule("fac-1", "enc-1", "dose-abc", {
      newScheduledAt: "2026-06-23T14:00:00.000Z",
      reasonCode: "PROVIDER_INSTRUCTION",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/facilities/fac-1/encounters/enc-1/medication-doses/dose-abc/scheduled-at",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("rejects empty doseInstanceId before calling apiFetch", async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    await expect(
      adjustMedicationDoseSchedule("fac-1", "enc-1", "", {
        newScheduledAt: "2026-06-23T14:00:00.000Z",
        reasonCode: "PROVIDER_INSTRUCTION",
      })
    ).rejects.toThrow(/dose instance is required/i);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
