import type { PrismaClient } from "@prisma/client";
import {
  MRV_CLASSIFIER_DOMAIN_COUNTS,
  MRV_CLASSIFIER_FOUNDATION,
  type MrvClassifierSeedEntry,
} from "../data/mrv-classifier-foundation";

const FORBIDDEN_DOMAINS = new Set(["CARE_LEVEL", "UNIT_TYPE"]);
const FORBIDDEN_CODES = new Set(["CONTRAST_TYPE_UNSPECIFIED"]);

function normalizeSearchText(parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function upsertClassifier(prisma: PrismaClient, entry: MrvClassifierSeedEntry): Promise<string> {
  if (FORBIDDEN_DOMAINS.has(entry.domain)) {
    throw new Error(`[mrv-seed] forbidden domain: ${entry.domain}`);
  }
  if (FORBIDDEN_CODES.has(entry.code)) {
    throw new Error(`[mrv-seed] forbidden code: ${entry.code}`);
  }

  const searchText = normalizeSearchText([
    entry.code,
    entry.labels.fr,
    entry.labels.en,
    ...entry.aliases,
  ]);

  const classifier = await prisma.termClassifier.upsert({
    where: { domain_code: { domain: entry.domain, code: entry.code } },
    create: {
      domain: entry.domain,
      code: entry.code,
      sortPriority: entry.sortPriority,
      searchText,
      isActive: true,
    },
    update: {
      sortPriority: entry.sortPriority,
      searchText,
      isActive: true,
    },
    select: { id: true },
  });

  for (const locale of ["fr", "en"] as const) {
    const displayName = locale === "fr" ? entry.labels.fr : entry.labels.en;
    await prisma.termClassifierLabel.upsert({
      where: { classifierId_locale: { classifierId: classifier.id, locale } },
      create: { classifierId: classifier.id, locale, displayName },
      update: { displayName },
    });
  }

  for (const alias of entry.aliases) {
    await prisma.termClassifierAlias.upsert({
      where: { classifierId_alias: { classifierId: classifier.id, alias } },
      create: { classifierId: classifier.id, alias },
      update: {},
    });
  }

  return classifier.id;
}

export async function seedMrvClassifiers(prisma: PrismaClient): Promise<void> {
  for (const entry of MRV_CLASSIFIER_FOUNDATION) {
    await upsertClassifier(prisma, entry);
  }

  const counts = await prisma.termClassifier.groupBy({
    by: ["domain"],
    _count: { _all: true },
  });
  const byDomain = Object.fromEntries(counts.map((c) => [c.domain, c._count._all]));

  for (const [domain, expected] of Object.entries(MRV_CLASSIFIER_DOMAIN_COUNTS)) {
    const actual = byDomain[domain] ?? 0;
    if (actual !== expected) {
      throw new Error(`[mrv-seed] ${domain} count ${actual} !== expected ${expected}`);
    }
  }

  const forbidden = await prisma.termClassifier.count({
    where: { domain: { in: [...FORBIDDEN_DOMAINS] } },
  });
  if (forbidden > 0) {
    throw new Error(`[mrv-seed] forbidden domain rows present: ${forbidden}`);
  }

  const unspecified = await prisma.termClassifier.count({
    where: { code: "CONTRAST_TYPE_UNSPECIFIED" },
  });
  if (unspecified > 0) {
    throw new Error("[mrv-seed] CONTRAST_TYPE_UNSPECIFIED must not be seeded");
  }
}
