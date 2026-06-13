import { DepartmentCode } from "@prisma/client";
import { ensureFacilityClinicalDepartments } from "./facility-department-seed.util";

describe("ensureFacilityClinicalDepartments (MEDUI.AUTH.ROLE.3)", () => {
  const facilityId = "fac-1";

  function mockPrisma(initial: Array<{ id: string; code: DepartmentCode; name: string }> = []) {
    const rows = [...initial];
    return {
      department: {
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { facilityId_code: { facilityId: string; code: DepartmentCode } };
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
            data: { facilityId: string; code: DepartmentCode; name: string; isActive: boolean };
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

  it("creates all clinical departments when none exist", async () => {
    const prisma = mockPrisma();
    const result = await ensureFacilityClinicalDepartments(prisma as never, facilityId);
    expect(result.created).toBe(10);
    expect(result.existing).toBe(0);
    expect(prisma.department.create).toHaveBeenCalledTimes(10);
  });

  it("is idempotent — second call creates nothing", async () => {
    const prisma = mockPrisma();
    await ensureFacilityClinicalDepartments(prisma as never, facilityId);
    const second = await ensureFacilityClinicalDepartments(prisma as never, facilityId);
    expect(second.created).toBe(0);
    expect(second.existing).toBe(10);
  });

  it("does not duplicate when legacy LAB row already exists alongside new LABORATORY", async () => {
    const prisma = mockPrisma([
      { id: "legacy-lab", code: DepartmentCode.LAB, name: "Laboratory" },
    ]);
    const result = await ensureFacilityClinicalDepartments(prisma as never, facilityId);
    expect(result.existing).toBe(0);
    expect(result.created).toBe(10);
    expect(prisma._rows.some((r) => r.code === DepartmentCode.LABORATORY)).toBe(true);
    expect(prisma._rows.some((r) => r.code === DepartmentCode.LAB)).toBe(true);
  });

  it("fills empty name on existing clinical row without overwriting custom name", async () => {
    const prisma = mockPrisma([{ id: "icu-1", code: DepartmentCode.ICU, name: "" }]);
    await ensureFacilityClinicalDepartments(prisma as never, facilityId, { defaultLanguage: "fr" });
    const icu = prisma._rows.find((r) => r.code === DepartmentCode.ICU);
    expect(icu?.name).toBe("Soins intensifs");

    const prismaNamed = mockPrisma([
      { id: "icu-2", code: DepartmentCode.ICU, name: "Unité ICU pilot" },
    ]);
    await ensureFacilityClinicalDepartments(prismaNamed as never, facilityId);
    expect(prismaNamed._rows.find((r) => r.code === DepartmentCode.ICU)?.name).toBe(
      "Unité ICU pilot"
    );
  });
});
