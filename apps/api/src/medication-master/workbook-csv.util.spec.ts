import { missingRequiredColumns, parseWorkbookCsv } from "./workbook-csv.util";

describe("parseWorkbookCsv", () => {
  it("parses header and quoted fields", () => {
    const csv = `workbook_row_id,generic_name,display_name_fr
PRI_001,"Norepinephrine","Norépinéphrine"`;
    const { headers, rows } = parseWorkbookCsv(csv);
    expect(headers).toContain("workbook_row_id");
    expect(rows[0]?.generic_name).toBe("Norepinephrine");
    expect(rows[0]?.display_name_fr).toBe("Norépinéphrine");
  });

  it("reports missing required columns", () => {
    const missing = missingRequiredColumns(["generic_name"], ["workbook_row_id", "generic_name"]);
    expect(missing).toEqual(["workbook_row_id"]);
  });
});
