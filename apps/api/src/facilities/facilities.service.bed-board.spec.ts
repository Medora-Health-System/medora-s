import {
  BED_STATUS_UPDATE_EVENT,
} from "@medora/shared";
import { FacilityBedBoardService } from "./facility-bed-board.service";

const facilityId = "fac-1";

function buildBedBoardMocks(options?: {
  encounters?: unknown[];
  auditRows?: unknown[];
}) {
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findMany: jest.fn().mockResolvedValue(options?.encounters ?? []),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue(options?.auditRows ?? []),
    },
  };
  const service = new FacilityBedBoardService(prisma as never, { log: auditLog } as never);
  return { service, prisma, auditLog };
}

describe("FacilityBedBoardService bed-board view (K.10B.10D)", () => {
  it("returns occupancy counts in unit summary", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-ed-1",
          facilityId,
          roomLabel: "1",
          status: "OPEN",
          type: "EMERGENCY",
          workflowState: "IN_TREATMENT",
          disposition: null,
          admissionSummaryJson: null,
          patient: { firstName: "A", lastName: "One", mrn: "M1" },
        },
        {
          id: "enc-ed-2",
          facilityId,
          roomLabel: "2",
          status: "OPEN",
          type: "EMERGENCY",
          workflowState: "IN_TREATMENT",
          disposition: null,
          admissionSummaryJson: null,
          patient: { firstName: "B", lastName: "Two", mrn: "M2" },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "ED");
    const unit = board.units[0];
    expect(unit?.unit).toBe("ED");
    expect(unit?.summary.occupied).toBe(2);
    expect(unit?.summary.available).toBeGreaterThan(0);
  });

  it("counts blocked beds from operational overlay", async () => {
    const { service } = buildBedBoardMocks({
      auditRows: [
        {
          entityId: "MS:1",
          createdAt: new Date("2026-06-03T12:00:00.000Z"),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:1",
            status: "BLOCKED",
            cleared: false,
            reasonCode: "MAINTENANCE",
            reasonText: "Broken rail",
          },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "MS");
    expect(board.units[0]?.summary.blocked).toBe(1);
    const blocked = board.units[0]?.beds.find((b) => b.storageKey === "MS:1");
    expect(blocked?.status).toBe("BLOCKED");
    expect(blocked?.reasonText).toBe("Broken rail");
  });

  it("counts transfer pending from encounter disposition", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-icu",
          facilityId,
          roomLabel: "ICU-1",
          status: "OPEN",
          type: "INPATIENT",
          workflowState: "IN_TREATMENT",
          disposition: "transfer_to_ms",
          admissionSummaryJson: { serviceUnit: "ICU" },
          patient: { firstName: "Transfer", lastName: "Patient", mrn: "M3" },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "ICU");
    expect(board.units[0]?.summary.transferPending).toBe(1);
  });

  it("counts discharge pending from workflow state", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-obs",
          facilityId,
          roomLabel: "OBS-3",
          status: "OPEN",
          type: "INPATIENT",
          workflowState: "DISCHARGE_READY",
          disposition: null,
          admissionSummaryJson: { serviceUnit: "Observation" },
          patient: { firstName: "Discharge", lastName: "Ready", mrn: "M4" },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "OBS");
    expect(board.units[0]?.summary.dischargePending).toBe(1);
  });

  it("empty unit still returns summary with all beds available", async () => {
    const { service } = buildBedBoardMocks();
    const board = await service.getBedBoard(facilityId, "ICU");
    const unit = board.units[0];
    expect(unit?.beds.length).toBeGreaterThan(0);
    expect(unit?.summary.occupied).toBe(0);
    expect(unit?.summary.available).toBe(unit?.beds.length);
  });

  it("mixed statuses aggregate correctly", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-ms",
          facilityId,
          roomLabel: "MS-2",
          status: "OPEN",
          type: "INPATIENT",
          workflowState: "IN_TREATMENT",
          disposition: null,
          admissionSummaryJson: { serviceUnit: "Med/Surg" },
          patient: { firstName: "Occupied", lastName: "Bed", mrn: "M5" },
        },
      ],
      auditRows: [
        {
          entityId: "MS:1",
          createdAt: new Date("2026-06-03T12:00:00.000Z"),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:1",
            status: "DIRTY",
            cleared: false,
          },
        },
        {
          entityId: "MS:3",
          createdAt: new Date("2026-06-03T12:00:00.000Z"),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:3",
            status: "CLEANING",
            cleared: false,
          },
        },
        {
          entityId: "MS:4",
          createdAt: new Date("2026-06-03T12:00:00.000Z"),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:4",
            status: "RESERVED",
            cleared: false,
          },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "MS");
    const summary = board.units[0]?.summary;
    expect(summary?.occupied).toBe(1);
    expect(summary?.dirty).toBe(1);
    expect(summary?.cleaning).toBe(1);
    expect(summary?.reserved).toBe(1);
    expect(summary?.available).toBeGreaterThan(0);
  });

  it("bed rows expose storageKey and displayKey aliases", async () => {
    const { service } = buildBedBoardMocks();
    const board = await service.getBedBoard(facilityId, "ED");
    const first = board.units[0]?.beds[0];
    expect(first?.storageKey).toBe(first?.bedKey);
    expect(first?.displayKey).toBe(first?.display);
  });
});
