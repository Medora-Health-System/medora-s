import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("MEDUI.CP.1A legacy care plan ops write freeze", () => {
  it("rejects appendCarePlanItem writes with CARE_PLAN_LEGACY_OPS_WRITE_FROZEN", () => {
    const src = readFileSync(
      join(__dirname, "inpatient-operations.service.ts"),
      "utf8"
    );
    expect(src).toContain("CARE_PLAN_LEGACY_OPS_WRITE_FROZEN");
    expect(src).toMatch(/if \(patch\.appendCarePlanItem\)[\s\S]*?CARE_PLAN_LEGACY_OPS_WRITE_FROZEN/);
    expect(src).not.toMatch(
      /if \(patch\.appendCarePlanItem\)[\s\S]*?ops\.carePlan\s*=/
    );
  });
});
