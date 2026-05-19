import * as fs from "node:fs";
import * as XLSX from "xlsx";
import {
  buildHeaderlessPriorityErInventoryXlsxBuffer,
  buildPriorityErInventoryXlsxBuffer,
  detectColumnIndexes,
  detectHeaderlessColumnLayout,
  detectHeaderlessStartColumn,
  matrixQualifiesForHeaderlessLayout,
  parsePriorityErInventoryWorkbook,
} from "./priority-er-inventory-workbook.util";

const LOCAL_PHARMACY_FIXTURE = "/Users/matz/Desktop/PHARMACY INVENTORY LIST (1).xlsx";

describe("priority-er-inventory-workbook.util (active parser)", () => {
  const userSampleRows = [
    ["Acetaminophen", "100mg/100ml", "Injection"],
    ["Acetaminophen", "500mg/50ml", "Injection"],
    ["Acetaminophen", "500mg", "Tablet"],
  ];

  it("does not treat drug data rows as column headers", () => {
    for (const row of userSampleRows) {
      expect(detectColumnIndexes(row)).toBeNull();
    }
  });

  it("qualifies headerless layout for user sample rows", () => {
    expect(matrixQualifiesForHeaderlessLayout(userSampleRows)).toBe(true);
  });

  it("still qualifies when a title cell says Medication alone (no full header row)", () => {
    const matrix = [["Medication"], ...userSampleRows];
    expect(detectColumnIndexes(["Medication"])).not.toBeNull();
    expect(matrixQualifiesForHeaderlessLayout(matrix)).toBe(true);
  });

  it("parses headerless workbook matching local PHARMACY INVENTORY shape", () => {
    const buffer = buildHeaderlessPriorityErInventoryXlsxBuffer(
      userSampleRows.map(([medication, dose, form]) => ({ medication, dose, form }))
    );
    const result = parsePriorityErInventoryWorkbook(buffer, "PHARMACY INVENTORY LIST (1).xlsx");
    expect(result.headerlessDetected).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.exactSourceText).toBe("Acetaminophen 100mg/100ml Injection");
    expect(result.rows[2]?.exactSourceText).toBe("Acetaminophen 500mg Tablet");
    expect(result.rows.every((r) => r.sourceReviewStatus === "MANUAL_REVIEW_REQUIRED")).toBe(true);
  });

  it("detects gapped columns when dose and form are not adjacent (C/D/F)", () => {
    const matrix = userSampleRows.map((r) => ["", "", r[0], r[1], "", r[2]]);
    expect(detectHeaderlessColumnLayout(matrix)).toEqual({
      medicationCol: 2,
      doseCol: 3,
      formCol: 5,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), "Sheet1");
    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parsePriorityErInventoryWorkbook(buffer, "PHARMACY INVENTORY LIST (1).xlsx");
    expect(result.headerlessDetected).toBe(true);
    expect(result.rows[0]?.form).toBe("Injection");
    expect(result.rows[0]?.exactSourceText).toBe("Acetaminophen 100mg/100ml Injection");
  });

  it("detects column offset when column A is blank", () => {
    const matrix = userSampleRows.map((r) => ["", ...r]);
    expect(detectHeaderlessStartColumn(matrix)).toBe(1);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(matrix),
      "Sheet1"
    );
    const buffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    const result = parsePriorityErInventoryWorkbook(buffer, "PHARMACY INVENTORY LIST (1).xlsx");
    expect(result.headerlessDetected).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.medication).toBe("Acetaminophen");
  });

  it("preserves exact cell text without trim", () => {
    const buffer = buildHeaderlessPriorityErInventoryXlsxBuffer([
      { medication: " Acetaminophen ", dose: "100mg/100ml", form: " Injection " },
    ]);
    const { rows } = parsePriorityErInventoryWorkbook(buffer, "inventory.xlsx");
    expect(rows[0]?.medication).toBe(" Acetaminophen ");
    expect(rows[0]?.form).toBe(" Injection ");
  });

  it("uses explicit Medication/Dose/Form header when present", () => {
    const buffer = buildPriorityErInventoryXlsxBuffer([
      { medication: "Atorvastatin", dose: "40 mg", form: "PO" },
    ]);
    const result = parsePriorityErInventoryWorkbook(buffer, "inventory.xlsx");
    expect(result.headerlessDetected).toBe(false);
    expect(result.rows[0]?.medication).toBe("Atorvastatin");
  });

  it("parses local PHARMACY INVENTORY LIST fixture when present", () => {
    if (!fs.existsSync(LOCAL_PHARMACY_FIXTURE)) return;
    const buffer = fs.readFileSync(LOCAL_PHARMACY_FIXTURE);
    const result = parsePriorityErInventoryWorkbook(buffer, "PHARMACY INVENTORY LIST (1).xlsx");
    expect(result.headerlessDetected).toBe(true);
    expect(result.rows.length).toBeGreaterThan(100);
    expect(result.rows[0]?.medication).toBe("Acetaminophen");
    expect(result.rows[0]?.dose).toBe("100mg/100ml");
    expect(result.rows[0]?.form).toBe("Injection");
    expect(result.rows.every((r) => r.sourceReviewStatus === "MANUAL_REVIEW_REQUIRED")).toBe(true);
  });

  it("throws MISSING_REQUIRED_COLUMNS for non-inventory 2-column sheets", () => {
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
