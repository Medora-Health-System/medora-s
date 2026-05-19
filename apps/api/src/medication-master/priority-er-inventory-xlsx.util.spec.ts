import {
  buildPriorityErInventoryXlsxBuffer,
  parsePriorityErInventoryWorkbook,
} from "./priority-er-inventory-workbook.util";

describe("parsePriorityErInventoryWorkbook", () => {
  it("preserves exact Medication/Dose/Form cell values", () => {
    const buffer = buildPriorityErInventoryXlsxBuffer([
      { medication: " Atorvastatin ", dose: "40 mg", form: " PO " },
    ]);
    const { rows } = parsePriorityErInventoryWorkbook(buffer, "PHARMACY INVENTORY LIST (1).xlsx");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.medication).toBe(" Atorvastatin ");
    expect(rows[0]?.dose).toBe("40 mg");
    expect(rows[0]?.form).toBe(" PO ");
  });

  it("constructs exact_source_text from Medication + Dose + Form", () => {
    const buffer = buildPriorityErInventoryXlsxBuffer([
      { medication: "Atorvastatin", dose: "40 mg", form: "tablet PO" },
    ]);
    const { rows } = parsePriorityErInventoryWorkbook(buffer, "inventory.xlsx");
    expect(rows[0]?.exactSourceText).toBe("Atorvastatin 40 mg tablet PO");
    expect(rows[0]?.sourceReviewStatus).toBe("MANUAL_REVIEW_REQUIRED");
  });

  it("detects French Médicament header", () => {
    const ws = buildPriorityErInventoryXlsxBuffer(
      [{ medication: "Épinéphrine", dose: "1 mg/mL", form: "IV" }],
      "Feuille1"
    );
    const { rows, parsedSheetName } = parsePriorityErInventoryWorkbook(ws, "inventaire.xlsx");
    expect(parsedSheetName).toBe("Feuille1");
    expect(rows[0]?.medication).toBe("Épinéphrine");
  });

  it("throws MISSING_REQUIRED_COLUMNS when headers are absent", () => {
    const XLSX = require("xlsx") as typeof import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["SKU", "Qty"],
        ["A1", "5"],
      ]),
      "Sheet1"
    );
    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    expect(() => parsePriorityErInventoryWorkbook(buffer, "bad.xlsx")).toThrow(
      /Colonnes obligatoires introuvables/
    );
  });
});
