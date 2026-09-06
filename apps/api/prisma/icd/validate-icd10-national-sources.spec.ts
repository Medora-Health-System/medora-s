import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import {
  parseClamlXml,
  parseFrenchCim10FrZip,
  parseNationalSourceArgs,
  parseSpanishCie10EsXlsx,
} from "../../prisma/icd/validate-icd10-national-sources";
import { intersectNationalSource } from "@medora/shared";

function tmpDir() {
  return mkdtempSync(join(tmpdir(), "p3f3-val-"));
}

function writeXlsx(path: string, sheets: Record<string, Array<Record<string, string>>>) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  }
  XLSX.writeFile(wb, path);
}

describe("validate-icd10-national-sources", () => {
  it("requires explicit --release", () => {
    const args = parseNationalSourceArgs(["--us=/tmp/us.txt", "--es=/tmp/es.xlsx", "--fr=/tmp/fr.zip"]);
    expect(args.release).toBe("");
    expect(args.us).toContain("us.txt");
  });

  it("parses a synthetic CIE-10-ES workbook", () => {
    const dir = tmpDir();
    const path = join(dir, "synthetic-es.xlsx");
    writeXlsx(path, {
      "ES2026 Finales": [
        { Código: "R11.0", Descripción: "SYNTH_ES_NAUSEA", Nodo_Final: "1" },
        { Código: "R11", Descripción: "SYNTH_ES_PARENT", Nodo_Final: "1" },
      ],
      "ES2026 Completa + Marcadores": [
        { Código: "R11", Descripción: "SYNTH_ES_PARENT", Nodo_Final: "0" },
        { Código: "R11.0", Descripción: "SYNTH_ES_NAUSEA", Nodo_Final: "1" },
      ],
    });
    const parsed = parseSpanishCie10EsXlsx(path);
    expect(parsed.finales).toHaveLength(2);
    expect(parsed.completeFinalCount).toBe(1);
    expect(parsed.completeNonFinalCount).toBe(1);
    expect(parsed.finales[0]?.normalizedCode).toBe("R110");
  });

  it("fails clearly when ES2026 Finales is missing", () => {
    const dir = tmpDir();
    const path = join(dir, "bad.xlsx");
    writeXlsx(path, { Other: [{ A: "1" }] });
    expect(() => parseSpanishCie10EsXlsx(path)).toThrow(/MALFORMED_XLSX_MISSING_SHEET/);
  });

  it("parses synthetic ClaML and rejects malformed XML", () => {
    const xml = `<?xml version="1.0"?>
<ClaML version="2.0.0">
  <Identifier authority="ATIH" uid="TEST"/>
  <Title date="2025-01-01" name="CIM-10-FR" version="TEST">SYNTH TITLE</Title>
  <Meta name="copyright" value="SYNTH COPYRIGHT"/>
  <Class code="R11" kind="category">
    <Rubric kind="preferred"><Label>SYNTH_FR_R11</Label></Rubric>
  </Class>
  <Class code="A42.1" kind="category">
    <Rubric kind="preferred"><Label>SYNTH_FR_A421</Label></Rubric>
  </Class>
</ClaML>`;
    const parsed = parseClamlXml(xml);
    expect(parsed.classes).toHaveLength(2);
    expect(parsed.authority).toBe("ATIH");
    expect(parsed.copyright).toContain("SYNTH COPYRIGHT");
    expect(parsed.classes.find((row) => row.normalizedCode === "R11")?.terminal).toBe(true);
    expect(() => parseClamlXml("<not-claml/>")).toThrow(/MALFORMED_CLAML/);
  });

  it("fails clearly when a ZIP has no ClaML XML", () => {
    const dir = tmpDir();
    const inner = join(dir, "readme.txt");
    const zip = join(dir, "bad.zip");
    writeFileSync(inner, "not claml");
    execFileSync("zip", ["-j", zip, inner]);
    expect(() => parseFrenchCim10FrZip(zip)).toThrow(/MALFORMED_ZIP_NO_CLAML/);
  });

  it("does not inherit a parent source label onto a US child", () => {
    const stats = intersectNationalSource({
      usRows: [
        { code: "L03", normalizedCode: "L03", label: "Cellulitis", selectable: false },
        { code: "L03.90", normalizedCode: "L0390", label: "Cellulitis, unspecified", selectable: true },
      ],
      sourceRows: [{ code: "L03", normalizedCode: "L03", label: "SYNTH_FR_PARENT", terminal: true, kind: "category" }],
      terminalOnly: true,
    });
    expect(stats.intersectionCodes).toEqual([]);
    expect(stats.categoryCollisionCodes).toEqual(["L03"]);
    expect(stats.usOnlyCodes).toEqual(["L0390"]);
  });
});
