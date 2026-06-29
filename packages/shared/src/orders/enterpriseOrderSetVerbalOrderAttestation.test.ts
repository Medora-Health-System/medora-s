import { describe, expect, it } from "vitest";
import {
  buildVerbalOrderAttestation,
  requiresVerbalOrderAttestationForRole,
  validateVerbalOrderAttestation,
} from "./enterpriseOrderSetVerbalOrderAttestation.js";

describe("enterpriseOrderSetVerbalOrderAttestation (MEDUI.ORDERSETS.ENTERPRISE_PHASE_7)", () => {
  const providerId = "550e8400-e29b-41d4-a716-446655440001";
  const userId = "550e8400-e29b-41d4-a716-446655440002";

  function validAttestation() {
    return buildVerbalOrderAttestation({
      verbalOrderReceivedFromProviderId: providerId,
      verbalOrderReceivedFromProviderName: "Dr. Example",
      readBackConfirmed: true,
      verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
      verbalOrderAttestedBy: userId,
    });
  }

  it("requires attestation only for RN + RN standing order authority", () => {
    expect(
      requiresVerbalOrderAttestationForRole({
        orderSetAuthority: "RN_STANDING_ORDER",
        canPrescribe: false,
        hasRnStandingOrderAuthority: true,
        roleCodes: ["RN"],
      })
    ).toBe(true);
    expect(
      requiresVerbalOrderAttestationForRole({
        orderSetAuthority: "PROVIDER_ORDER_SET",
        canPrescribe: false,
        hasRnStandingOrderAuthority: true,
        roleCodes: ["RN"],
      })
    ).toBe(false);
    expect(
      requiresVerbalOrderAttestationForRole({
        orderSetAuthority: "RN_STANDING_ORDER",
        canPrescribe: true,
        hasRnStandingOrderAuthority: false,
        roleCodes: ["PROVIDER"],
      })
    ).toBe(false);
  });

  it("rejects missing provider id", () => {
    const result = validateVerbalOrderAttestation({ attestation: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VERBAL_ORDER_ATTESTATION_REQUIRED");
  });

  it("rejects readBackConfirmed false", () => {
    const result = validateVerbalOrderAttestation({
      attestation: {
        ...validAttestation(),
        readBackConfirmed: false as true,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_VERBAL_ORDER_ATTESTATION");
  });

  it("accepts valid attestation", () => {
    const result = validateVerbalOrderAttestation({
      attestation: validAttestation(),
      expectedAttestedBy: userId,
    });
    expect(result.ok).toBe(true);
  });

  it("does not include co-sign fields", () => {
    const attestation = validAttestation() as Record<string, unknown>;
    expect(attestation).not.toHaveProperty("cosign");
    expect(attestation).not.toHaveProperty("pendingProviderSignature");
    expect(attestation).not.toHaveProperty("providerCosign");
  });
});
