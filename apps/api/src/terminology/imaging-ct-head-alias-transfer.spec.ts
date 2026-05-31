import {
  CT_HEAD_ALIAS_PREDECESSOR_CODE,
  CT_HEAD_ALIAS_SUCCESSOR_CODE,
  CT_HEAD_ALIAS_TRANSFER_TEXT,
  transferCtHeadAliasOwnership,
} from "./imaging-ct-head-alias-transfer";

const PREDECESSOR_ID = "pred-id";
const SUCCESSOR_ID = "succ-id";

type AliasRow = { id: string; catalogImagingStudyId: string; alias: string; language?: string | null };

function buildTransferPrisma(initial: {
  predecessorAliases: AliasRow[];
  successorAliases: AliasRow[];
}) {
  let predecessorAliases = [...initial.predecessorAliases];
  let successorAliases = [...initial.successorAliases];
  let nextId = 1;

  const tx = {
    catalogImagingStudy: {
      findUnique: jest.fn(async ({ where }: { where: { code: string } }) => {
        if (where.code === CT_HEAD_ALIAS_PREDECESSOR_CODE) {
          return { id: PREDECESSOR_ID, code: CT_HEAD_ALIAS_PREDECESSOR_CODE };
        }
        if (where.code === CT_HEAD_ALIAS_SUCCESSOR_CODE) {
          return { id: SUCCESSOR_ID, code: CT_HEAD_ALIAS_SUCCESSOR_CODE };
        }
        return null;
      }),
    },
    imagingStudyAlias: {
      deleteMany: jest.fn(async ({ where }: { where: { catalogImagingStudyId: string; alias: string } }) => {
        if (where.catalogImagingStudyId === PREDECESSOR_ID) {
          const before = predecessorAliases.length;
          predecessorAliases = predecessorAliases.filter((row) => row.alias !== where.alias);
          return { count: before - predecessorAliases.length };
        }
        return { count: 0 };
      }),
      findFirst: jest.fn(
        async ({ where }: { where: { catalogImagingStudyId: string; alias: string } }) => {
          const pool =
            where.catalogImagingStudyId === PREDECESSOR_ID ? predecessorAliases : successorAliases;
          return pool.find((row) => row.alias === where.alias) ?? null;
        }
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: { catalogImagingStudyId: string; alias: string; language?: string | null };
        }) => {
          const row: AliasRow = {
            id: `alias-${nextId++}`,
            catalogImagingStudyId: data.catalogImagingStudyId,
            alias: data.alias,
            language: data.language ?? null,
          };
          if (data.catalogImagingStudyId === PREDECESSOR_ID) {
            predecessorAliases.push(row);
          } else {
            successorAliases.push(row);
          }
          return row;
        }
      ),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
    catalogImagingStudy: tx.catalogImagingStudy,
    imagingStudyAlias: tx.imagingStudyAlias,
    getState: () => ({ predecessorAliases, successorAliases }),
  };

  return prisma;
}

describe("transferCtHeadAliasOwnership (2C.3.4B)", () => {
  it("deletes predecessor alias and creates successor alias in one transaction", async () => {
    const prisma = buildTransferPrisma({
      predecessorAliases: [
        { id: "a1", catalogImagingStudyId: PREDECESSOR_ID, alias: CT_HEAD_ALIAS_TRANSFER_TEXT },
      ],
      successorAliases: [
        { id: "a2", catalogImagingStudyId: SUCCESSOR_ID, alias: "stroke bleed" },
      ],
    });

    const result = await transferCtHeadAliasOwnership(prisma as never);

    expect(result.deletedFromPredecessor).toBe(1);
    expect(result.createdOnSuccessor).toBe(true);
    expect(result.verified).toEqual({ predecessorHasAlias: false, successorHasAlias: true });

    const state = prisma.getState();
    expect(state.predecessorAliases.some((row) => row.alias === CT_HEAD_ALIAS_TRANSFER_TEXT)).toBe(
      false
    );
    expect(state.successorAliases.some((row) => row.alias === CT_HEAD_ALIAS_TRANSFER_TEXT)).toBe(
      true
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when successor already owns ct head", async () => {
    const prisma = buildTransferPrisma({
      predecessorAliases: [],
      successorAliases: [
        { id: "a1", catalogImagingStudyId: SUCCESSOR_ID, alias: CT_HEAD_ALIAS_TRANSFER_TEXT },
      ],
    });

    const result = await transferCtHeadAliasOwnership(prisma as never);

    expect(result.deletedFromPredecessor).toBe(0);
    expect(result.createdOnSuccessor).toBe(false);
    expect(result.verified).toEqual({ predecessorHasAlias: false, successorHasAlias: true });
  });

  it("throws when predecessor catalog row is missing", async () => {
    const prisma = buildTransferPrisma({
      predecessorAliases: [],
      successorAliases: [],
    });
    prisma.catalogImagingStudy.findUnique.mockImplementation(async ({ where }: { where: { code: string } }) => {
      if (where.code === CT_HEAD_ALIAS_SUCCESSOR_CODE) {
        return { id: SUCCESSOR_ID, code: CT_HEAD_ALIAS_SUCCESSOR_CODE };
      }
      return null;
    });

    await expect(transferCtHeadAliasOwnership(prisma as never)).rejects.toThrow(/predecessor catalog row/);
  });
});
