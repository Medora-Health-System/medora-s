import { describe, expect, it } from "vitest";
import {
  assertAuthenticSourceNotFixtureMasquerade,
  assertBatchClinicalActivationDisabled,
  assertBatchNoBulkRealMappingApproval,
  assertLegalBatchStatusTransition,
  evaluatePhase7BatchAttestation,
  PHASE7_BATCH_DEFAULTS,
} from "./medicationBatchGovernance.js";
import {
  EM_BATCH_MEDICATION_FAMILIES,
  getEmBatchFamilyStats,
} from "./medicationEmBatchFamilies.js";

describe("medicationBatchGovernance", () => {
  it("keeps clinical activation and bulk mapping approval disabled", () => {
    expect(PHASE7_BATCH_DEFAULTS.clinicalActivationAllowed).toBe(false);
    expect(() => assertBatchClinicalActivationDisabled(false)).not.toThrow();
    expect(() => assertBatchClinicalActivationDisabled(true)).toThrow();
    expect(() => assertBatchNoBulkRealMappingApproval("BULK_APPROVE")).toThrow();
  });

  it("enforces legal batch status transitions without skips", () => {
    expect(() => assertLegalBatchStatusTransition("DRAFT", "SOURCE_VALIDATED")).not.toThrow();
    expect(() => assertLegalBatchStatusTransition("DRAFT", "STAGED")).toThrow(/Illegal/);
  });

  it("rejects authentic/synthetic masquerade", () => {
    expect(() =>
      assertAuthenticSourceNotFixtureMasquerade({
        sourceClassification: "AUTHENTIC_NLM_RXNORM",
        isSynthetic: true,
      })
    ).toThrow(/isSynthetic/);
  });

  it("keeps curated EM family count in the controlled 75–125 range", () => {
    const stats = getEmBatchFamilyStats();
    expect(stats.totalFamilies).toBeGreaterThanOrEqual(75);
    expect(stats.totalFamilies).toBeLessThanOrEqual(125);
    expect(EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded).length).toBe(stats.totalFamilies);
  });

  it("attests only when checksum/manifest verified and clinical activations remain zero", () => {
    const base = {
      batchId: "EM_CONTROLLED_BATCH_V1",
      batchVersion: "1.0.0",
      sourceReleaseId: "rxnorm-2026aa",
      sourceChecksumVerified: true,
      manifestHashVerified: true,
      medicationFamiliesApproved: 100,
      sourceRowsProcessed: 100,
      existingConceptsReused: 10,
      existingProductsReused: 5,
      existingPackagesReused: 2,
      newConceptsCreated: 0,
      newProductsCreated: 0,
      newPackagesCreated: 0,
      exactDuplicatesBlocked: 3,
      probableDuplicatesReviewed: 2,
      possibleDuplicatesReviewed: 1,
      ndcConflictsResolved: 0,
      mappingCandidatesCreated: 20,
      realMappingsVerified: 25,
      mappingsRejected: 1,
      mappingsDeferred: 2,
      catalogPreparationRecordsCreated: 10,
      clinicalActivationsCreated: 0,
      rollbackTested: true,
      unresolvedBlockingIssues: 0,
      attestedBy: "medication-admin",
      attestedAt: "2026-07-17T00:00:00.000Z",
    };
    expect(evaluatePhase7BatchAttestation(base).FinalDecision).toBe(
      "MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED"
    );
    expect(
      evaluatePhase7BatchAttestation({ ...base, clinicalActivationsCreated: 1 }).FinalDecision
    ).toBe("MEDICATION_INTELLIGENCE_PHASE_7_BATCH_NOT_ATTESTED");
  });
});
