import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { MedicationDoseScheduleAdjustmentController } from "./medication-dose-schedule-adjustment.controller";
import { MedicationDoseScheduleAdjustmentService } from "./medication-dose-schedule-adjustment.service";

describe("MedicationDoseScheduleAdjustmentController", () => {
  const service = {
    resolveFacilityTimeZone: jest.fn(),
    adjustScheduledAt: jest.fn(),
  };

  const controller = new MedicationDoseScheduleAdjustmentController(
    service as unknown as MedicationDoseScheduleAdjustmentService
  );

  const req = {
    user: {
      userId: "user-1",
      facilityId: "fac-1",
      roleCodes: [RoleCode.RN],
      firstName: "Jessica",
      lastName: "RN",
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service.resolveFacilityTimeZone.mockResolvedValue("America/Port-au-Prince");
    service.adjustScheduledAt.mockResolvedValue({
      doseInstanceId: "dose-1",
      scheduledAt: "2026-06-23T14:00:00.000Z",
      dueWindowStartAt: "2026-06-23T13:30:00.000Z",
      dueWindowEndAt: "2026-06-23T14:30:00.000Z",
      doseStatus: "DUE",
    });
  });

  it("PATCH :doseInstanceId/scheduled-at delegates to service with dose id", async () => {
    const result = await controller.adjustScheduledAt(
      "fac-1",
      "enc-1",
      "dose-1",
      {
        newScheduledAt: "2026-06-23T14:00:00.000Z",
        reasonCode: "PROVIDER_INSTRUCTION",
      },
      req
    );

    expect(service.adjustScheduledAt).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac-1",
        encounterId: "enc-1",
        doseInstanceId: "dose-1",
        newScheduledAtIso: "2026-06-23T14:00:00.000Z",
        reasonCode: "PROVIDER_INSTRUCTION",
      })
    );
    expect(result.doseInstanceId).toBe("dose-1");
  });

  it("rejects cross-facility requests", async () => {
    await expect(
      controller.adjustScheduledAt(
        "other-facility",
        "enc-1",
        "dose-1",
        { newScheduledAt: "2026-06-23T14:00:00.000Z", reasonCode: "PROVIDER_INSTRUCTION" },
        req
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("propagates NotFoundException when dose is missing", async () => {
    service.adjustScheduledAt.mockRejectedValue(new NotFoundException("Medication dose not found"));
    await expect(
      controller.adjustScheduledAt(
        "fac-1",
        "enc-1",
        "missing-dose",
        { newScheduledAt: "2026-06-23T14:00:00.000Z", reasonCode: "PROVIDER_INSTRUCTION" },
        req
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
