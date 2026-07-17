import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeFileChecksumSha256 } from "./rxnorm-row-checksum";
import { parseRxnconsoRrf } from "./parse-rxnconso-rrf";

const FIXTURE_PATH = join(__dirname, "fixtures", "structural-rxnconso-p5.rrf.fixture");
const MANIFEST_PATH = join(__dirname, "fixtures", "structural-rxnorm-manifest-p5.json");

describe("parseRxnconsoRrf", () => {
  it("parses structural fixture with expected accept/skip/malformed counts", async () => {
    const parsed = await parseRxnconsoRrf({
      filePath: FIXTURE_PATH,
      termTypes: ["IN", "SCD", "SBD", "DF", "GPCK"],
    });

    expect(parsed.rowsRead).toBe(10);
    expect(parsed.malformedRows).toBe(1);
    expect(parsed.suppressedRows).toBe(1);
    expect(parsed.rowsAccepted).toBe(5);
    expect(parsed.rowsSkipped).toBeGreaterThanOrEqual(4);
    expect(parsed.acceptedRows.every((row) => row.rxcui.startsWith("900000"))).toBe(true);
    expect(parsed.acceptedRows.every((row) => !row.rxcui.startsWith("SYNTH"))).toBe(true);
  });

  it("normalizes display terms on accepted rows", async () => {
    const parsed = await parseRxnconsoRrf({ filePath: FIXTURE_PATH });
    const ingredient = parsed.acceptedRows.find((row) => row.termType === "IN");
    expect(ingredient?.displayTerm).toBe("Acetaminophen");
    expect(ingredient?.normalizedTerm).toBe("acetaminophen");
  });

  it("supports dryRun without returning accepted rows", async () => {
    const parsed = await parseRxnconsoRrf({ filePath: FIXTURE_PATH, dryRun: true });
    expect(parsed.dryRun).toBe(true);
    expect(parsed.rowsAccepted).toBeGreaterThan(0);
    expect(parsed.acceptedRows).toEqual([]);
  });

  it("matches manifest-declared fixture checksum", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      files: Array<{ fileName: string; sha256: string }>;
    };
    const declared = manifest.files[0]?.sha256;
    const computed = computeFileChecksumSha256(readFileSync(FIXTURE_PATH));
    expect(computed).toBe(declared);
  });
});
