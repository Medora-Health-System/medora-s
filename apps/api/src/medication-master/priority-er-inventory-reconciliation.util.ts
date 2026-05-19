import type { PriorityErReconciliationStatus } from "./priority-er-reconciliation.constants";
import type { CatalogIndexEntry, MedicationCatalogIndex } from "./priority-er-inventory-catalog-index";
import type { PriorityErInventoryWorkbookRow } from "./priority-er-inventory-workbook.util";
import {
  normalizeDoseForMatch,
  normalizeFormForMatch,
  normalizeMedicationNameForMatch,
} from "./priority-er-inventory-match-normalize.util";

export type DuplicateMatchRef = {
  kind: CatalogIndexEntry["kind"];
  id: string;
  code: string | null;
  conceptId: string | null;
  productId: string | null;
};

export type PriorityErReconciliationOutcome = {
  reconciliationStatus: PriorityErReconciliationStatus;
  duplicateWarnings: string[];
  reviewFlags: string[];
  validationErrors: Array<{ field?: string; code: string; message: string }>;
  matchedRefs: DuplicateMatchRef[];
  missingMedicationName: boolean;
  missingDose: boolean;
  missingForm: boolean;
};

function refsFromEntries(entries: CatalogIndexEntry[]): DuplicateMatchRef[] {
  const seen = new Set<string>();
  const out: DuplicateMatchRef[] = [];
  for (const e of entries) {
    const key = `${e.kind}:${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind: e.kind,
      id: e.id,
      code: e.code,
      conceptId: e.conceptId,
      productId: e.productId,
    });
  }
  return out;
}

function findNameMatches(
  index: MedicationCatalogIndex,
  nameNormalized: string
): CatalogIndexEntry[] {
  if (!nameNormalized) return [];
  const direct = index.entries.filter((e) => e.nameNormalized === nameNormalized);
  const alias = index.aliasToEntryKeys.get(nameNormalized) ?? [];
  return [...direct, ...alias];
}

function isExactEntryMatch(
  entry: CatalogIndexEntry,
  doseNormalized: string,
  formNormalized: string
): boolean {
  if (!doseNormalized && !formNormalized) return false;
  const doseMatch = !doseNormalized || !entry.doseNormalized || entry.doseNormalized === doseNormalized;
  const formMatch = !formNormalized || !entry.formNormalized || entry.formNormalized === formNormalized;
  if (doseNormalized && formNormalized) {
    return entry.doseNormalized === doseNormalized && entry.formNormalized === formNormalized;
  }
  if (doseNormalized) return entry.doseNormalized === doseNormalized;
  if (formNormalized) return entry.formNormalized === formNormalized;
  return doseMatch && formMatch;
}

/**
 * Duplicate reconciliation before promotion — never auto-merge.
 */
export function reconcilePriorityErInventoryRow(
  row: PriorityErInventoryWorkbookRow,
  index: MedicationCatalogIndex
): PriorityErReconciliationOutcome {
  const reviewFlags: string[] = ["MANUAL_REVIEW_REQUIRED"];
  const validationErrors: Array<{ field?: string; code: string; message: string }> = [];
  const duplicateWarnings: string[] = [];

  const missingMedicationName = row.medication.length === 0;
  const missingDose = row.dose.length === 0;
  const missingForm = row.form.length === 0;

  if (missingMedicationName) {
    reviewFlags.push("MISSING_MEDICATION_NAME");
    validationErrors.push({
      field: "medication",
      code: "MISSING_MEDICATION_NAME",
      message: "Nom du médicament manquant dans le fichier source.",
    });
  }
  if (missingDose) {
    reviewFlags.push("MISSING_DOSE");
    validationErrors.push({
      field: "dose",
      code: "MISSING_DOSE",
      message: "Dose manquante dans le fichier source.",
    });
  }
  if (missingForm) {
    reviewFlags.push("MISSING_FORM");
    validationErrors.push({
      field: "form",
      code: "MISSING_FORM",
      message: "Forme manquante dans le fichier source.",
    });
  }

  if (missingMedicationName || missingDose || missingForm) {
    return {
      reconciliationStatus: "REVIEW_REQUIRED",
      duplicateWarnings,
      reviewFlags,
      validationErrors,
      matchedRefs: [],
      missingMedicationName,
      missingDose,
      missingForm,
    };
  }

  const nameNormalized = normalizeMedicationNameForMatch(row.sourceNameExact);
  const doseNormalized = normalizeDoseForMatch(row.sourceStrengthExact);
  const formNormalized = normalizeFormForMatch(row.sourceRouteExact ?? row.form);

  const nameMatches = findNameMatches(index, nameNormalized);
  const exactMatches = nameMatches.filter((e) => isExactEntryMatch(e, doseNormalized, formNormalized));

  if (exactMatches.length > 0) {
    reviewFlags.push("EXACT_MATCH_CANDIDATE");
    duplicateWarnings.push(
      `Correspondance exacte possible (${exactMatches.length}) — vérification pharmacie requise, sans fusion automatique.`
    );
    return {
      reconciliationStatus: "EXACT_MATCH",
      duplicateWarnings,
      reviewFlags,
      validationErrors,
      matchedRefs: refsFromEntries(exactMatches),
      missingMedicationName,
      missingDose,
      missingForm,
    };
  }

  if (nameMatches.length > 0) {
    reviewFlags.push("POSSIBLE_DUPLICATE");
    duplicateWarnings.push(
      `Doublon possible (${nameMatches.length}) — même nom, dose/forme différente ou incertaine.`
    );
    return {
      reconciliationStatus: "POSSIBLE_DUPLICATE",
      duplicateWarnings,
      reviewFlags,
      validationErrors,
      matchedRefs: refsFromEntries(nameMatches),
      missingMedicationName,
      missingDose,
      missingForm,
    };
  }

  return {
    reconciliationStatus: "NEW_CANDIDATE",
    duplicateWarnings,
    reviewFlags,
    validationErrors,
    matchedRefs: [],
    missingMedicationName,
    missingDose,
    missingForm,
  };
}
