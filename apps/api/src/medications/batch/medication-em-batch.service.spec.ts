import {
  assertBatchClinicalActivationDisabled,
  assertBatchNoBulkRealMappingApproval,
  EM_BATCH_DEFAULT_MANIFEST_META,
  getEmBatchFamilyStats,
} from "@medora/shared";
import { buildPhase7BatchManifestPayload } from "./medication-em-batch.service";

describe("medication-em-batch.service — workflow guards", () => {
  it("builds a deterministic batch manifest hash", () => {
    const a = buildPhase7BatchManifestPayload();
    const b = buildPhase7BatchManifestPayload();
    expect(a.batchManifestHash).toBe(b.batchManifestHash);
    expect(a.batchId).toBe(EM_BATCH_DEFAULT_MANIFEST_META.batchId);
    expect(a.clinicalActivationAllowed).toBe(false);
    expect(a.expectedMedicationFamilyCount).toBe(getEmBatchFamilyStats().totalFamilies);
  });

  it("keeps safety gates disabled", () => {
    expect(() => assertBatchClinicalActivationDisabled(false)).not.toThrow();
    expect(() => assertBatchNoBulkRealMappingApproval("BULK_VERIFY")).toThrow();
  });
});
