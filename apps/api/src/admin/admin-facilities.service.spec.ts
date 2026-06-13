import { FacilityType } from "@prisma/client";
import {
  ensureFacilityClinicalDepartments,
  ensureFacilityServiceLineDepartments,
} from "./facility-department-seed.util";

describe("ensureFacilityServiceLineDepartments (MEDUI.FACILITY.TYPE.1)", () => {
  const facilityId = "fac-type-1";

  function mockPrisma(initial: Array<{ id: string; code: string; name: string }> = []) {
    const rows = [...initial];
    return {
      department: {
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { facilityId_code: { facilityId: string; code: string } };
          }) => {
            const hit = rows.find(
              (r) =>
                where.facilityId_code.facilityId === facilityId &&
                r.code === where.facilityId_code.code
            );
            return hit ? { id: hit.id, name: hit.name } : null;
          }
        ),
        update: jest.fn(
          async ({ where, data }: { where: { id: string }; data: { name: string } }) => {
            const row = rows.find((r) => r.id === where.id);
            if (row) row.name = data.name;
            return row;
          }
        ),
        create: jest.fn(
          async ({
            data,
          }: {
            data: { facilityId: string; code: string; name: string; isActive: boolean };
          }) => {
            const row = {
              id: `dept-${rows.length + 1}`,
              code: data.code,
              name: data.name,
            };
            rows.push(row);
            return row;
          }
        ),
      },
      _rows: rows,
    };
  }

  it("creates only freestanding ER service line departments", async () => {
    const prisma = mockPrisma();
    const result = await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: FacilityType.FREESTANDING_ER,
    });
    expect(result.created).toBe(4);
    expect(prisma._rows.map((r) => r.code).sort()).toEqual([
      "EMERGENCY",
      "LABORATORY",
      "OBSERVATION",
      "RADIOLOGY",
    ]);
  });

  it("does not delete existing departments when seeding subset", async () => {
    const prisma = mockPrisma([{ id: "icu-1", code: "ICU", name: "ICU" }]);
    await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: FacilityType.CLINIC,
    });
    expect(prisma._rows.some((r) => r.code === "ICU")).toBe(true);
  });

  it("ensureFacilityClinicalDepartments still seeds full registry", async () => {
    const prisma = mockPrisma();
    const result = await ensureFacilityClinicalDepartments(prisma as never, facilityId);
    expect(result.created).toBe(10);
  });
});
