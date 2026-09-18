import { ReportsService } from "./reports.service";

describe("Administration Phase 3 report enrichment isolation", () => {
  it("scopes MRN lookup to the report facility", async () => {
    const prisma = {
      patient: {
        findMany: jest.fn().mockResolvedValue([{ id: "patient-a", mrn: "MRN-A" }]),
      },
    };
    const service = new ReportsService(prisma as never);
    const result = await (service as any).loadMrnMap("facility-a", ["patient-a"]);
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["patient-a"] }, facilityId: "facility-a" },
      select: { id: true, mrn: true },
    });
    expect(result.get("patient-a")).toBe("MRN-A");
  });
});
