import { ForbiddenException } from "@nestjs/common";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";

describe("MedicationMasterExplorerService", () => {
  const prisma = {
    medicationConcept: { findMany: jest.fn(), findUnique: jest.fn() },
    facilityFormularyItem: { findMany: jest.fn() },
    facility: { findUnique: jest.fn() },
  };

  const service = new MedicationMasterExplorerService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("assertFacilityScope rejects mismatched facility", () => {
    expect(() => service.assertFacilityScope("a", "b")).toThrow(ForbiddenException);
  });

  it("assertFacilityScope allows matching facility", () => {
    expect(() => service.assertFacilityScope("same", "same")).not.toThrow();
  });

  it("search returns empty when no concepts match", async () => {
    prisma.medicationConcept.findMany = jest.fn().mockResolvedValue([]);
    prisma.facilityFormularyItem.findMany = jest.fn().mockResolvedValue([]);

    const result = await service.search({
      q: "acetaminophen",
      limit: 10,
      offset: 0,
      activeOnly: undefined,
      ndcStatus: "any",
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(prisma.medicationConcept.findMany).toHaveBeenCalled();
  });
});
