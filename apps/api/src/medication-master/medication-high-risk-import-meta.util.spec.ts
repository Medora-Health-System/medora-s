import {
  defaultHighRiskImportMeta,
  mergeHighRiskImportMeta,
  parseHighRiskImportMeta,
} from "./medication-high-risk-import-meta.util";
import { mergeProductRuntimeActivation } from "./medication-product-runtime-activation.util";

describe("medication-high-risk-import-meta.util", () => {
  it("merges and parses high-risk import metadata in governanceNotes", () => {
    const base = mergeProductRuntimeActivation(null, {});
    const meta = defaultHighRiskImportMeta({
      sourceFilename: "meds.csv",
      sourceFingerprint: "abc123",
      sourceRowNumber: 5,
      sourceRowKey: "row-5",
      classificationReasonCodes: ["MORPHINE"],
      importedAt: "2026-05-18T12:00:00.000Z",
    });
    const notes = mergeHighRiskImportMeta(base, meta);
    const parsed = parseHighRiskImportMeta(notes);
    expect(parsed?.status).toBe("PENDING");
    expect(parsed?.sourceRowNumber).toBe(5);
    expect(parsed?.classificationReasonCodes).toContain("MORPHINE");
  });
});
