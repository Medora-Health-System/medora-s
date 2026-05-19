import type { MedicationCatalogIndex } from "./priority-er-inventory-catalog-index";
import { reconcilePriorityErInventoryRow } from "./priority-er-inventory-reconciliation.util";
import type { PriorityErInventoryWorkbookRow } from "./priority-er-inventory-workbook.util";

function row(overrides: Partial<PriorityErInventoryWorkbookRow> = {}): PriorityErInventoryWorkbookRow {
  return {
    sourceRowId: "PRI_ER_Sheet_2",
    sheetName: "Sheet1",
    rowNumber: 2,
    workbookFilename: "inventory.xlsx",
    medication: "Norepinephrine",
    dose: "4 mg/4 mL",
    form: "IV",
    exactSourceText: "Norepinephrine 4 mg/4 mL IV",
    sourceNameExact: "Norepinephrine",
    sourceStrengthExact: "4 mg/4 mL",
    sourceRouteExact: "IV",
    sourcePackageExact: "IV",
    sourceReviewStatus: "MANUAL_REVIEW_REQUIRED",
    originalRow: {},
    ...overrides,
  };
}

function indexWith(entries: MedicationCatalogIndex["entries"]): MedicationCatalogIndex {
  return { entries, aliasToEntryKeys: new Map() };
}

describe("reconcilePriorityErInventoryRow", () => {
  it("returns EXACT_MATCH for same name dose and form", () => {
    const outcome = reconcilePriorityErInventoryRow(
      row(),
      indexWith([
        {
          kind: "product",
          id: "prod-1",
          code: "NOREPI_IV",
          nameNormalized: "norepinephrine",
          doseNormalized: "4 mg/4 ml",
          formNormalized: "iv",
          ndc11: null,
          legacyCatalogMedicationId: null,
          conceptId: "concept-1",
          productId: "prod-1",
        },
      ])
    );
    expect(outcome.reconciliationStatus).toBe("EXACT_MATCH");
    expect(outcome.matchedRefs).toHaveLength(1);
  });

  it("returns POSSIBLE_DUPLICATE for same name different dose", () => {
    const outcome = reconcilePriorityErInventoryRow(
      row({ dose: "8 mg/8 mL", sourceStrengthExact: "8 mg/8 mL" }),
      indexWith([
        {
          kind: "product",
          id: "prod-1",
          code: "NOREPI_IV",
          nameNormalized: "norepinephrine",
          doseNormalized: "4 mg/4 ml",
          formNormalized: "iv",
          ndc11: null,
          legacyCatalogMedicationId: null,
          conceptId: "concept-1",
          productId: "prod-1",
        },
      ])
    );
    expect(outcome.reconciliationStatus).toBe("POSSIBLE_DUPLICATE");
    expect(outcome.reviewFlags).toContain("POSSIBLE_DUPLICATE");
  });

  it("returns REVIEW_REQUIRED when dose missing", () => {
    const outcome = reconcilePriorityErInventoryRow(
      row({ dose: "", sourceStrengthExact: "", exactSourceText: "Norepinephrine IV" }),
      indexWith([])
    );
    expect(outcome.reconciliationStatus).toBe("REVIEW_REQUIRED");
    expect(outcome.missingDose).toBe(true);
  });

  it("returns NEW_CANDIDATE when no catalog match", () => {
    const outcome = reconcilePriorityErInventoryRow(row(), indexWith([]));
    expect(outcome.reconciliationStatus).toBe("NEW_CANDIDATE");
  });
});
