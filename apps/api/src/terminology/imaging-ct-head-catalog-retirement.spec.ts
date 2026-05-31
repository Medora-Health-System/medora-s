import {
  CT_HEAD_RETIREMENT_PREDECESSOR_CODE,
  CT_HEAD_RETIREMENT_SUCCESSOR_CODE,
  deactivateCtHeadCatalog,
} from "./imaging-ct-head-catalog-retirement";

const PREDECESSOR_ID = "pred-id";
const SUCCESSOR_ID = "succ-id";

function buildRetirementPrisma(initial: { predecessorActive: boolean; successorActive: boolean }) {
  let predecessorActive = initial.predecessorActive;
  let successorActive = initial.successorActive;

  const tx = {
    catalogImagingStudy: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        if (where.code === CT_HEAD_RETIREMENT_PREDECESSOR_CODE || where.id === PREDECESSOR_ID) {
          return {
            id: PREDECESSOR_ID,
            code: CT_HEAD_RETIREMENT_PREDECESSOR_CODE,
            isActive: predecessorActive,
          };
        }
        if (where.code === CT_HEAD_RETIREMENT_SUCCESSOR_CODE || where.id === SUCCESSOR_ID) {
          return {
            id: SUCCESSOR_ID,
            code: CT_HEAD_RETIREMENT_SUCCESSOR_CODE,
            isActive: successorActive,
          };
        }
        return null;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { isActive: boolean };
        }) => {
          if (where.id === PREDECESSOR_ID) {
            predecessorActive = data.isActive;
            return {
              id: PREDECESSOR_ID,
              code: CT_HEAD_RETIREMENT_PREDECESSOR_CODE,
              isActive: predecessorActive,
            };
          }
          if (where.id === SUCCESSOR_ID) {
            successorActive = data.isActive;
            return {
              id: SUCCESSOR_ID,
              code: CT_HEAD_RETIREMENT_SUCCESSOR_CODE,
              isActive: successorActive,
            };
          }
          throw new Error("unexpected update target");
        }
      ),
    },
  };

  return {
    $transaction: jest.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
    catalogImagingStudy: tx.catalogImagingStudy,
    getState: () => ({ predecessorActive, successorActive }),
  };
}

describe("deactivateCtHeadCatalog (2C.5B)", () => {
  it("deactivates CT_HEAD and keeps CT_HEAD_WO_CONTRAST active", async () => {
    const prisma = buildRetirementPrisma({ predecessorActive: true, successorActive: true });
    const result = await deactivateCtHeadCatalog(prisma as never);

    expect(result.updated).toBe(true);
    expect(result.predecessor).toEqual({ code: "CT_HEAD", isActive: false });
    expect(result.successor).toEqual({ code: "CT_HEAD_WO_CONTRAST", isActive: true });
    expect(prisma.getState().predecessorActive).toBe(false);
    expect(prisma.catalogImagingStudy.update).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when CT_HEAD is already inactive", async () => {
    const prisma = buildRetirementPrisma({ predecessorActive: false, successorActive: true });
    const result = await deactivateCtHeadCatalog(prisma as never);

    expect(result.updated).toBe(false);
    expect(result.predecessor.isActive).toBe(false);
    expect(prisma.catalogImagingStudy.update).not.toHaveBeenCalled();
  });

  it("throws when successor is inactive", async () => {
    const prisma = buildRetirementPrisma({ predecessorActive: true, successorActive: false });
    await expect(deactivateCtHeadCatalog(prisma as never)).rejects.toThrow(/must remain active/);
  });

  it("throws when predecessor catalog row is missing", async () => {
    const prisma = buildRetirementPrisma({ predecessorActive: true, successorActive: true });
    prisma.catalogImagingStudy.findUnique.mockImplementation(async ({ where }: { where: { code?: string } }) => {
      if (where.code === CT_HEAD_RETIREMENT_SUCCESSOR_CODE) {
        return { id: SUCCESSOR_ID, code: CT_HEAD_RETIREMENT_SUCCESSOR_CODE, isActive: true };
      }
      return null;
    });
    await expect(deactivateCtHeadCatalog(prisma as never)).rejects.toThrow(/predecessor catalog row/);
  });
});

describe("historical CT_HEAD catalog resolution (2C.5B)", () => {
  it("allows inactive CT_HEAD lookup by id without isActive filter", async () => {
    const inactiveRow = {
      id: PREDECESSOR_ID,
      code: "CT_HEAD",
      displayNameEn: "CT head",
      displayNameFr: "Scanner cérébral",
      isActive: false,
    };

    const prisma = {
      catalogImagingStudy: {
        findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
          expect(where.id.in).toEqual([PREDECESSOR_ID]);
          return [inactiveRow];
        }),
      },
    };

    const rows = await prisma.catalogImagingStudy.findMany({
      where: { id: { in: [PREDECESSOR_ID] } },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.code).toBe("CT_HEAD");
    expect(rows[0]?.isActive).toBe(false);
  });
});
