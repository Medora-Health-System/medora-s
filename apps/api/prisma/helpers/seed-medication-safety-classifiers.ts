import type { PrismaClient } from "@prisma/client";
import type { MedicationSafetyClassifierSeedEntry } from "../../../../packages/shared/src/medication/medicationSafetyClassifierValidation";
import { loadMedicationSafetyClassifierSeedModules } from "./medication-governance-seed-modules";

const MEDICATION_SAFETY_DOMAINS = [
  "CONTROLLED_SUBSTANCE",
  "HIGH_ALERT",
  "SAFETY_REQUIREMENT",
  "LASA",
] as const;

function normalizeSearchText(parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function upsertClassifier(prisma: PrismaClient, entry: MedicationSafetyClassifierSeedEntry): Promise<string> {
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

/**
 * M1.3B — Seed medication safety reference classifiers into TermClassifier only.
 * Does not read or write CatalogMedication, MedicationSafetyProfile, or orders.
 */
export async function seedMedicationSafetyClassifiers(prisma: PrismaClient): Promise<void> {
  const {
    MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
    MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
    assertMedicationSafetyClassifierManifest,
  } = await loadMedicationSafetyClassifierSeedModules();

  assertMedicationSafetyClassifierManifest(MEDICATION_SAFETY_CLASSIFIER_MANIFEST);

  for (const entry of MEDICATION_SAFETY_CLASSIFIER_MANIFEST) {
    await upsertClassifier(prisma, entry);
  }

  const counts = await prisma.termClassifier.groupBy({
    by: ["domain"],
    where: { domain: { in: [...MEDICATION_SAFETY_DOMAINS] } },
    _count: { _all: true },
  });
  const byDomain = Object.fromEntries(counts.map((c) => [c.domain, c._count._all]));

  for (const [domain, expected] of Object.entries(MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS)) {
    const actual = byDomain[domain] ?? 0;
    if (actual !== expected) {
      throw new Error(`[med-safety-classifier-seed] ${domain} count ${actual} !== expected ${expected}`);
    }
  }
}
