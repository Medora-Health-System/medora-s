import {
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
  MEDICATION_SAFETY_CLASSIFIER_DOMAINS,
  MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT,
  type MedicationSafetyClassifierDomain,
  validateMedicationSafetyClassifierCode,
} from "./medicationSafetyClassifiers.js";

export type MedicationSafetyClassifierSeedEntry = {
  domain: MedicationSafetyClassifierDomain;
  code: string;
  sortPriority: number;
  labels: { fr: string; en: string };
  aliases: string[];
};

export type MedicationSafetyClassifierManifestIssue = {
  kind: "DUPLICATE_CODE" | "INVALID_ENTRY" | "DOMAIN_COUNT_MISMATCH" | "EMPTY_MANIFEST";
  message: string;
};

/** Throws if manifest is incomplete or contains duplicate (domain, code) pairs. */
export function assertMedicationSafetyClassifierManifest(manifest: MedicationSafetyClassifierSeedEntry[]): void {
  const issues = validateMedicationSafetyClassifierManifest(manifest);
  if (issues.length > 0) {
    throw new Error(
      `[medication-safety-classifier] manifest invalid: ${issues.map((i) => i.message).join("; ")}`
    );
  }
}

export function validateMedicationSafetyClassifierManifest(
  manifest: MedicationSafetyClassifierSeedEntry[]
): MedicationSafetyClassifierManifestIssue[] {
  const issues: MedicationSafetyClassifierManifestIssue[] = [];

  if (manifest.length === 0) {
    issues.push({ kind: "EMPTY_MANIFEST", message: "manifest is empty" });
    return issues;
  }

  const seen = new Set<string>();
  const byDomain = new Map<MedicationSafetyClassifierDomain, number>();

  for (const entry of manifest) {
    const validated = validateMedicationSafetyClassifierCode(entry.domain, entry.code);
    if (!validated.ok) {
      issues.push({ kind: "INVALID_ENTRY", message: validated.error });
      continue;
    }
    if (entry.code !== validated.code) {
      issues.push({
        kind: "INVALID_ENTRY",
        message: `code must be uppercase: ${entry.domain}/${entry.code}`,
      });
    }
    const key = `${validated.domain}\0${validated.code}`;
    if (seen.has(key)) {
      issues.push({
        kind: "DUPLICATE_CODE",
        message: `duplicate classifier ${validated.domain}/${validated.code}`,
      });
    }
    seen.add(key);

    if (!entry.labels.fr?.trim() || !entry.labels.en?.trim()) {
      issues.push({
        kind: "INVALID_ENTRY",
        message: `missing label for ${validated.domain}/${validated.code}`,
      });
    }

    byDomain.set(validated.domain, (byDomain.get(validated.domain) ?? 0) + 1);
  }

  for (const domain of MEDICATION_SAFETY_CLASSIFIER_DOMAINS) {
    const expected = MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS[domain];
    const actual = byDomain.get(domain) ?? 0;
    if (actual !== expected) {
      issues.push({
        kind: "DOMAIN_COUNT_MISMATCH",
        message: `${domain} count ${actual} !== expected ${expected}`,
      });
    }
  }

  if (manifest.length !== MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT) {
    issues.push({
      kind: "DOMAIN_COUNT_MISMATCH",
      message: `total manifest length ${manifest.length} !== expected ${MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT}`,
    });
  }

  return issues;
}

/** Returns duplicate (domain, code) keys if any. */
export function findDuplicateMedicationSafetyClassifierCodes(
  manifest: MedicationSafetyClassifierSeedEntry[]
): string[] {
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const entry of manifest) {
    const key = `${entry.domain}/${entry.code}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2) dupes.push(key);
  }
  return dupes;
}
