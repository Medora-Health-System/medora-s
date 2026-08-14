import { DepartmentCode } from "@prisma/client";
import {
  mapServiceLineToPrismaDepartmentCodes,
  listAllMedoraServiceLinesForProvisioning,
  type MedoraServiceLine,
} from "@medora/shared";
import {
  ensureFacilityClinicalDepartments,
  ensureFacilityServiceLineDepartments,
  FacilityServiceLineDepartmentMappingError,
  toPrismaDepartmentCodeOrThrow,
} from "./facility-department-seed.util";

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
            if (!Object.values(DepartmentCode).includes(where.facilityId_code.code)) {
              throw new Error(
                `PrismaClientValidationError: Invalid DepartmentCode ${String(where.facilityId_code.code)}`
              );
            }
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
            if (!Object.values(DepartmentCode).includes(data.code)) {
              throw new Error(
                `PrismaClientValidationError: Invalid DepartmentCode ${String(data.code)}`
              );
            }
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

describe("ensureFacilityServiceLineDepartments (MEDUI.D4C.9A)", () => {
  const facilityId = "fac-dental-uat";

  function mockPrismaValidatingEnum(
    initial: Array<{ id: string; code: DepartmentCode; name: string }> = []
  ) {
    const rows = [...initial];
    return {
      department: {
        findUnique: jest.fn(
          async ({
            where,
          }: {
            where: { facilityId_code: { facilityId: string; code: DepartmentCode } };
          }) => {
            /** Production regression: reject codes not in live Prisma enum. */
            if (!Object.values(DepartmentCode).includes(where.facilityId_code.code)) {
              throw new Error(
                `PrismaClientValidationError: Invalid \`prisma.department.findUnique()\` invocation — Invalid value for argument \`code\`. Expected DepartmentCode.`
              );
            }
            const hit = rows.find(
              (r) =>
                where.facilityId_code.facilityId === facilityId &&
                r.code === where.facilityId_code.code
            );
            return hit ? { id: hit.id, name: hit.name } : null;
          }
        ),
        update: jest.fn(),
        create: jest.fn(
          async ({
            data,
          }: {
            data: { facilityId: string; code: DepartmentCode; name: string; isActive: boolean };
          }) => {
            if (!Object.values(DepartmentCode).includes(data.code)) {
              throw new Error(
                `PrismaClientValidationError: Invalid DepartmentCode ${String(data.code)}`
              );
            }
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

  it("creates DENTAL department when enabling Dental (production UAT regression)", async () => {
    expect(DepartmentCode.DENTAL).toBe("DENTAL");
    const prisma = mockPrismaValidatingEnum([
      { id: "obs", code: DepartmentCode.OBSERVATION, name: "Observation" },
      { id: "lab", code: DepartmentCode.LABORATORY, name: "Laboratoire" },
    ]);
    const result = await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "OBSERVATION", "LABORATORY", "DENTAL"],
      defaultLanguage: "fr",
    });
    expect(result.created).toBeGreaterThanOrEqual(1);
    expect(prisma._rows.some((r) => r.code === DepartmentCode.DENTAL)).toBe(true);
    expect(prisma._rows.find((r) => r.code === DepartmentCode.DENTAL)?.name).toBe(
      "Soins dentaires"
    );
    expect(prisma._rows.some((r) => r.code === DepartmentCode.OBSERVATION)).toBe(true);
    expect(prisma._rows.some((r) => r.code === DepartmentCode.LABORATORY)).toBe(true);
  });

  it("is idempotent — second Dental save does not duplicate", async () => {
    const prisma = mockPrismaValidatingEnum();
    await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL"],
    });
    const second = await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL"],
    });
    expect(second.created).toBe(0);
    expect(prisma._rows.filter((r) => r.code === DepartmentCode.DENTAL)).toHaveLength(1);
  });

  it("disable then re-enable reuses existing DENTAL row (no delete)", async () => {
    const prisma = mockPrismaValidatingEnum([
      { id: "dental-1", code: DepartmentCode.DENTAL, name: "Soins dentaires" },
      { id: "pc", code: DepartmentCode.PRIMARY_CARE, name: "Soins primaires" },
    ]);
    await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: "CLINIC",
      serviceLines: ["CLINIC"],
    });
    expect(prisma._rows.some((r) => r.code === DepartmentCode.DENTAL)).toBe(true);
    const after = await ensureFacilityServiceLineDepartments(prisma as never, facilityId, {
      facilityType: "CLINIC",
      serviceLines: ["CLINIC", "DENTAL"],
    });
    expect(after.created).toBe(0);
    expect(prisma._rows.filter((r) => r.code === DepartmentCode.DENTAL)).toHaveLength(1);
  });

  it("rejects unsupported mapped tokens against live Prisma enum", () => {
    expect(() =>
      toPrismaDepartmentCodeOrThrow("ORTHODONTICS" as never, "DENTAL")
    ).toThrow(FacilityServiceLineDepartmentMappingError);
  });

  it("every MedoraServiceLine maps to a live Prisma DepartmentCode", () => {
    for (const line of listAllMedoraServiceLinesForProvisioning()) {
      const tokens = mapServiceLineToPrismaDepartmentCodes(line as MedoraServiceLine);
      for (const token of tokens) {
        expect(Object.values(DepartmentCode)).toContain(token);
        expect(toPrismaDepartmentCodeOrThrow(token, line as MedoraServiceLine)).toBe(token);
      }
    }
  });
});
