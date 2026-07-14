import { parseIcd10CmReleaseText, withDot } from "./parse-icd10-cm-release";
import { selectScopedCodes, TENDON_SCOPE_FAMILIES, LIGAMENT_SCOPE_FAMILIES } from "./icd10-tendon-ligament-scope";
import { ICD10_CM_FY2026_MANIFEST } from "./icd10-cm-release-manifest";

describe("parse-icd10-cm-release", () => {
  it("withDot preserves seventh characters", () => {
    expect(withDot("S86011A")).toBe("S86.011A");
    expect(withDot("S83.511A")).toBe("S83.511A");
  });

  it("parses CMS order lines and marks headers non-selectable", () => {
    const order = [
      "00001" + " " + "A00".padEnd(7, " ") + " " + "0" + " " + "Cholera".padEnd(60, " ") + " " + "Cholera",
      "00002" +
        " " +
        "A000".padEnd(7, " ") +
        " " +
        "1" +
        " " +
        "Cholera due to Vibrio cholerae 01, biovar cholerae".padEnd(60, " ") +
        " " +
        "Cholera due to Vibrio cholerae 01, biovar cholerae",
    ].join("\n");

    const parsed = parseIcd10CmReleaseText("fixture-order.txt", order, { format: "order" });
    expect(parsed.parseFailures).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]!.isBillable).toBe(false);
    expect(parsed.rows[0]!.isSelectable).toBe(false);
    expect(parsed.rows[1]!.isBillable).toBe(true);
    expect(parsed.rows[1]!.isSelectable).toBe(true);
    expect(parsed.rows[1]!.code).toBe("A00.0");
  });

  it("scopes tendon and ligament families from official-like rows", () => {
    const rows = [
      {
        code: "S86.011A",
        normalizedCode: "S86011A",
        shortDescription: "Strain of right Achilles tendon, initial encounter",
        longDescription: "Strain of right Achilles tendon, initial encounter",
        isBillable: true,
      },
      {
        code: "S83.511A",
        normalizedCode: "S83511A",
        shortDescription: "Sprain of anterior cruciate ligament of right knee, initial encounter",
        longDescription: "Sprain of anterior cruciate ligament of right knee, initial encounter",
        isBillable: true,
      },
      {
        code: "R50.9",
        normalizedCode: "R509",
        shortDescription: "Fever, unspecified",
        longDescription: "Fever, unspecified",
        isBillable: true,
      },
    ];
    const tendon = selectScopedCodes(rows, TENDON_SCOPE_FAMILIES);
    const ligament = selectScopedCodes(rows, LIGAMENT_SCOPE_FAMILIES);
    expect(tendon.map((r) => r.code)).toContain("S86.011A");
    expect(ligament.map((r) => r.code)).toContain("S83.511A");
    expect(tendon.map((r) => r.code)).not.toContain("R50.9");
  });

  it("FY2026 manifest has non-empty authoritative checksum", () => {
    expect(ICD10_CM_FY2026_MANIFEST.artifactSha256).toHaveLength(64);
    expect(ICD10_CM_FY2026_MANIFEST.preferredInnerFileSha256).toHaveLength(64);
    expect(ICD10_CM_FY2026_MANIFEST.artifactFileName).toContain("2026");
  });
});
