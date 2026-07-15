import { removeDiagnosisDtoSchema } from "./remove-diagnosis.dto";

describe("removeDiagnosisDtoSchema", () => {
  it("accepts ENTERED_IN_ERROR without free text", () => {
    const parsed = removeDiagnosisDtoSchema.safeParse({ reasonCode: "ENTERED_IN_ERROR" });
    expect(parsed.success).toBe(true);
  });

  it("requires reasonText when reasonCode is OTHER", () => {
    const missing = removeDiagnosisDtoSchema.safeParse({ reasonCode: "OTHER" });
    expect(missing.success).toBe(false);

    const ok = removeDiagnosisDtoSchema.safeParse({
      reasonCode: "OTHER",
      reasonText: "Wrong laterality documented",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects unknown reason codes", () => {
    const parsed = removeDiagnosisDtoSchema.safeParse({ reasonCode: "NOT_A_REASON" });
    expect(parsed.success).toBe(false);
  });
});
