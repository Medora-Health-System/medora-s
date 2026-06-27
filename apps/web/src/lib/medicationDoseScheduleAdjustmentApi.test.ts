import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MEDICATION_DOSE_SCHEDULE_ADJUSTMENT_PATH,
  adjustMarMedicationSchedule,
  adjustMedicationDoseSchedule,
  buildMedicationDoseScheduleAdjustmentPath,
  buildMedicationOrderItemScheduleAdjustmentPath,
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

  it("adjustMarMedicationSchedule resolves order-item fallback without empty dose path", async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ doseInstanceId: null, adjustTarget: "order_item" })
      .mockResolvedValueOnce({
        orderItemId: "oi-1",
        scheduledAt: "2026-06-23T15:00:00.000Z",
        adjustTarget: "order_item",
        reasonCode: "PROVIDER_INSTRUCTION",
      });

    await adjustMarMedicationSchedule(
      "fac-1",
      "enc-1",
      {
        orderItemId: "oi-1",
        scheduledAt: "2026-06-23T14:00:00.000Z",
        medicationDoseInstanceId: "",
      },
      {
        newScheduledAt: "2026-06-23T15:00:00.000Z",
        reasonCode: "PROVIDER_INSTRUCTION",
      }
    );

    expect(apiFetch).toHaveBeenNthCalledWith(
      1,
      "/facilities/fac-1/encounters/enc-1/medication-doses/resolve-for-schedule-adjustment",
      expect.objectContaining({ method: "POST" })
    );
    expect(apiFetch).toHaveBeenNthCalledWith(
      2,
      buildMedicationOrderItemScheduleAdjustmentPath("fac-1", "enc-1", "oi-1"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(JSON.stringify(vi.mocked(apiFetch).mock.calls)).not.toContain("/medication-doses//scheduled-at");
  });
});
