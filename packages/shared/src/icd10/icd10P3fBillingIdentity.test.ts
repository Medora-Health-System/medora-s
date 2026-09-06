import { describe, expect, it } from "vitest";
import { buildOrderedDiagnosisCodesForClaimExport } from "../claimDiagnosisCodes.js";

describe("P3-F billing diagnosis identity", () => {
  it("exports canonical ICD-10-CM codes, never localized display labels", () => {
    const codes = buildOrderedDiagnosisCodesForClaimExport(
      [{ code: "R10.85" }, { code: "A42.1" }],
      [],
    );
    expect(codes).toEqual(["R10.85", "A42.1"]);
    expect(Object.keys({ code: "R10.85" } as { code: string })).toEqual(["code"]);
  });
});
