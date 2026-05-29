import { describe, expect, it } from "vitest";
import {
  canWitnessClinicalDocumentationEntry,
  clinicalDocumentationPendingWitness,
  resolveClinicalDocumentationWitnessStatus,
} from "./clinicalDocumentationWitnessGovernance.js";

describe("clinicalDocumentationWitnessGovernance", () => {
  const pending = {
    authorUserId: "author-1",
    requiresWitnessSignature: true,
    witnessedAt: null,
    voidedAt: null,
  };

  it("resolveClinicalDocumentationWitnessStatus", () => {
    expect(
      resolveClinicalDocumentationWitnessStatus({
        requiresWitnessSignature: false,
        witnessedAt: null,
      })
    ).toBe("NOT_REQUIRED");
    expect(
      resolveClinicalDocumentationWitnessStatus({
        requiresWitnessSignature: true,
        witnessedAt: null,
      })
    ).toBe("PENDING_WITNESS");
    expect(
      resolveClinicalDocumentationWitnessStatus({
        requiresWitnessSignature: true,
        witnessedAt: "2026-05-28T12:00:00.000Z",
      })
    ).toBe("WITNESSED");
  });

  it("blocks self-witness and allows second signer with role", () => {
    expect(clinicalDocumentationPendingWitness(pending)).toBe(true);
    expect(canWitnessClinicalDocumentationEntry(pending, "author-1", ["RN"])).toBe(false);
    expect(canWitnessClinicalDocumentationEntry(pending, "witness-2", ["RN"])).toBe(true);
    expect(canWitnessClinicalDocumentationEntry(pending, "witness-2", ["FRONT_DESK"])).toBe(false);
  });
});
