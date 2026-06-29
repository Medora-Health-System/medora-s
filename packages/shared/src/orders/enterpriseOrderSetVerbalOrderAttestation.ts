/**
 * MEDUI.ORDERSETS.ENTERPRISE_PHASE_7 — RN verbal-order/read-back attestation for RN standing orders.
 */
import { z } from "zod";
import { isRnStandingOrderSet, type EnterpriseOrderSetAuthority } from "./enterpriseOrderSets.js";

export const ENTERPRISE_ORDER_SET_VERBAL_ORDER_ATTESTATION_SURFACES = ["CREATE_ORDER_MODAL"] as const;
export type EnterpriseOrderSetVerbalOrderAttestationSurface =
  (typeof ENTERPRISE_ORDER_SET_VERBAL_ORDER_ATTESTATION_SURFACES)[number];

export const enterpriseOrderSetVerbalOrderAttestationSchema = z.object({
  verbalOrderReceivedFromProviderId: z.string().uuid(),
  verbalOrderReceivedFromProviderName: z.string().min(1).max(256).optional(),
  readBackConfirmed: z.literal(true),
  verbalOrderAttestedAt: z.string().datetime(),
  verbalOrderAttestedBy: z.string().uuid(),
  attestedSurface: z.enum(ENTERPRISE_ORDER_SET_VERBAL_ORDER_ATTESTATION_SURFACES),
});

export type EnterpriseOrderSetVerbalOrderAttestation = z.infer<
  typeof enterpriseOrderSetVerbalOrderAttestationSchema
>;

export type EnterpriseOrderSetVerbalOrderAttestationValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function requiresVerbalOrderAttestationForRole(input: {
  orderSetAuthority: EnterpriseOrderSetAuthority;
  canPrescribe: boolean;
  hasRnStandingOrderAuthority: boolean;
  roleCodes: readonly string[];
}): boolean {
  const normalized = new Set(input.roleCodes.map((code) => code.toUpperCase()));
  if (!normalized.has("RN")) return false;
  if (input.canPrescribe) return false;
  if (!input.hasRnStandingOrderAuthority) return false;
  return isRnStandingOrderSet(input.orderSetAuthority);
}

export function buildVerbalOrderAttestation(input: {
  verbalOrderReceivedFromProviderId: string;
  verbalOrderReceivedFromProviderName?: string | null;
  readBackConfirmed: true;
  verbalOrderAttestedAt: string;
  verbalOrderAttestedBy: string;
  attestedSurface?: EnterpriseOrderSetVerbalOrderAttestationSurface;
}): EnterpriseOrderSetVerbalOrderAttestation {
  const providerName = input.verbalOrderReceivedFromProviderName?.trim();
  return {
    verbalOrderReceivedFromProviderId: input.verbalOrderReceivedFromProviderId,
    ...(providerName ? { verbalOrderReceivedFromProviderName: providerName } : {}),
    readBackConfirmed: true,
    verbalOrderAttestedAt: input.verbalOrderAttestedAt,
    verbalOrderAttestedBy: input.verbalOrderAttestedBy,
    attestedSurface: input.attestedSurface ?? "CREATE_ORDER_MODAL",
  };
}

export function validateVerbalOrderAttestation(input: {
  attestation: EnterpriseOrderSetVerbalOrderAttestation | null | undefined;
  expectedAttestedBy?: string | null;
}): EnterpriseOrderSetVerbalOrderAttestationValidationResult {
  if (!input.attestation) {
    return {
      ok: false,
      code: "VERBAL_ORDER_ATTESTATION_REQUIRED",
      message: "Verbal order attestation is required for RN standing orders.",
    };
  }

  const parsed = enterpriseOrderSetVerbalOrderAttestationSchema.safeParse(input.attestation);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_VERBAL_ORDER_ATTESTATION",
      message: "Invalid verbal order attestation.",
    };
  }

  const attestation = parsed.data;
  if (!attestation.verbalOrderReceivedFromProviderId.trim()) {
    return {
      ok: false,
      code: "VERBAL_ORDER_PROVIDER_REQUIRED",
      message: "Verbal order provider is required.",
    };
  }

  if (attestation.readBackConfirmed !== true) {
    return {
      ok: false,
      code: "VERBAL_ORDER_READBACK_REQUIRED",
      message: "Read-back confirmation is required.",
    };
  }

  if (input.expectedAttestedBy?.trim()) {
    if (attestation.verbalOrderAttestedBy !== input.expectedAttestedBy.trim()) {
      return {
        ok: false,
        code: "VERBAL_ORDER_ATTESTED_BY_MISMATCH",
        message: "Verbal order attestation user mismatch.",
      };
    }
  }

  return { ok: true };
}

export function enterpriseOrderSetVerbalOrderAttestationAuditMetadata(
  attestation: EnterpriseOrderSetVerbalOrderAttestation
): Record<string, unknown> {
  return {
    verbalOrderReceivedFromProviderId: attestation.verbalOrderReceivedFromProviderId,
    ...(attestation.verbalOrderReceivedFromProviderName
      ? { verbalOrderReceivedFromProviderName: attestation.verbalOrderReceivedFromProviderName }
      : {}),
    verbalOrderReadBackConfirmed: attestation.readBackConfirmed,
    verbalOrderAttestedAt: attestation.verbalOrderAttestedAt,
    verbalOrderAttestedBy: attestation.verbalOrderAttestedBy,
    verbalOrderAttestedSurface: attestation.attestedSurface,
  };
}
