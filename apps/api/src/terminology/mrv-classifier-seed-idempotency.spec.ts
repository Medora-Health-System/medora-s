import type { PrismaClient } from "@prisma/client";
import { MRV_CLASSIFIER_FOUNDATION } from "../../prisma/data/mrv-classifier-foundation";
import { seedMrvClassifiers } from "../../prisma/helpers/seed-mrv-classifiers";

type ClassifierRow = {
  id: string;
  domain: string;
  code: string;
  sortPriority: number;
  searchText: string;
  isActive: boolean;
};

type LabelRow = {
  classifierId: string;
  locale: "fr" | "en";
  displayName: string;
};

type AliasRow = {
  classifierId: string;
  alias: string;
};

function createPrismaStub(): PrismaClient {
  let idCounter = 0;
  const classifiersByKey = new Map<string, ClassifierRow>();
  const labelsByKey = new Map<string, LabelRow>();
  const aliasesByKey = new Map<string, AliasRow>();

  return {
    termClassifier: {
      upsert: jest.fn(async ({ where, create, update, select }: any) => {
        const key = `${where.domain_code.domain}::${where.domain_code.code}`;
        const existing = classifiersByKey.get(key);
        if (existing) {
          const next = { ...existing, ...update };
          classifiersByKey.set(key, next);
          return select?.id ? { id: next.id } : next;
        }
        idCounter += 1;
        const created: ClassifierRow = {
          id: `clf-${idCounter}`,
          domain: create.domain,
          code: create.code,
          sortPriority: create.sortPriority,
          searchText: create.searchText,
          isActive: create.isActive,
        };
        classifiersByKey.set(key, created);
        return select?.id ? { id: created.id } : created;
      }),
      groupBy: jest.fn(async () => {
        const counts = new Map<string, number>();
        for (const row of classifiersByKey.values()) {
          counts.set(row.domain, (counts.get(row.domain) ?? 0) + 1);
        }
        return [...counts.entries()].map(([domain, count]) => ({
          domain,
          _count: { _all: count },
        }));
      }),
      count: jest.fn(async ({ where }: any) => {
        if (where?.domain?.in) {
          const domains: string[] = where.domain.in;
          let total = 0;
          for (const row of classifiersByKey.values()) {
            if (domains.includes(row.domain)) total += 1;
          }
          return total;
        }
        if (where?.code) {
          let total = 0;
          for (const row of classifiersByKey.values()) {
            if (row.code === where.code) total += 1;
          }
          return total;
        }
        return classifiersByKey.size;
      }),
    },
    termClassifierLabel: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const key = `${where.classifierId_locale.classifierId}::${where.classifierId_locale.locale}`;
        const existing = labelsByKey.get(key);
        if (existing) {
          const next = { ...existing, ...update };
          labelsByKey.set(key, next);
          return next;
        }
        labelsByKey.set(key, {
          classifierId: create.classifierId,
          locale: create.locale,
          displayName: create.displayName,
        });
        return create;
      }),
    },
    termClassifierAlias: {
      upsert: jest.fn(async ({ where, create }: any) => {
        const key = `${where.classifierId_alias.classifierId}::${where.classifierId_alias.alias}`;
        if (!aliasesByKey.has(key)) {
          aliasesByKey.set(key, {
            classifierId: create.classifierId,
            alias: create.alias,
          });
        }
        return create;
      }),
    },
    __testStore: {
      classifiersByKey,
      labelsByKey,
      aliasesByKey,
    },
  } as unknown as PrismaClient;
}

describe("seedMrvClassifiers idempotency", () => {
  it("is idempotent across two runs for S1 domains and labels", async () => {
    const prisma = createPrismaStub() as PrismaClient & {
      __testStore: {
        classifiersByKey: Map<string, ClassifierRow>;
        labelsByKey: Map<string, LabelRow>;
        aliasesByKey: Map<string, AliasRow>;
      };
    };

    await seedMrvClassifiers(prisma);
    const firstClassifierCount = prisma.__testStore.classifiersByKey.size;
    const firstLabelCount = prisma.__testStore.labelsByKey.size;
    const firstAliasCount = prisma.__testStore.aliasesByKey.size;

    await seedMrvClassifiers(prisma);
    const secondClassifierCount = prisma.__testStore.classifiersByKey.size;
    const secondLabelCount = prisma.__testStore.labelsByKey.size;
    const secondAliasCount = prisma.__testStore.aliasesByKey.size;

    expect(secondClassifierCount).toBe(firstClassifierCount);
    expect(secondLabelCount).toBe(firstLabelCount);
    expect(secondAliasCount).toBe(firstAliasCount);

    const s1Domains = new Set(["MODALITY", "BODY_REGION", "VIEW_COUNT", "CONTRAST_TYPE"]);
    const s1Count = [...prisma.__testStore.classifiersByKey.values()].filter((row) =>
      s1Domains.has(row.domain)
    ).length;
    expect(s1Count).toBe(61);

    const s1LabelCount = [...prisma.__testStore.classifiersByKey.values()]
      .filter((row) => s1Domains.has(row.domain))
      .reduce((acc, row) => {
        const fr = prisma.__testStore.labelsByKey.has(`${row.id}::fr`) ? 1 : 0;
        const en = prisma.__testStore.labelsByKey.has(`${row.id}::en`) ? 1 : 0;
        return acc + fr + en;
      }, 0);
    expect(s1LabelCount).toBe(122);

    expect(MRV_CLASSIFIER_FOUNDATION).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ domain: "VIEW_COUNT", code: "VIEW_COUNT_UNSPECIFIED" }),
        expect.objectContaining({ domain: "MODALITY", code: "MODALITY_CTA" }),
        expect.objectContaining({ domain: "CONTRAST_TYPE", code: "CONTRAST_TYPE_WITH_AND_WITHOUT" }),
      ])
    );
  });
});
