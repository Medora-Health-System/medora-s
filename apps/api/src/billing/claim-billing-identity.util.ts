import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "./claim-coverage-resolution.util";

function subscriberRelationIsPatient(relation: string | null | undefined): boolean {
  const rel = relation?.trim();
  if (!rel) return false;
  const u = rel.toLowerCase();
  if (u === "18" || u === "self" || u === "insured") return true;
  if (/\bself\b/.test(u)) return true;
  return false;
}

function hasSubscriberRelationship(relation: string | null | undefined): boolean {
  return Boolean(relation?.trim());
}

/**
 * Stable missing-field codes aligned with X12 preview / submission readiness (Phase 7).
 * Only emits a gap when required modeled data is absent or invalid.
 *
 * Provider / facility billing roles are evaluated in `resolveClaimBillingRoles` (Phase 7.4).
 */
export async function evaluateClaimIdentityGaps(
  prisma: PrismaService,
  input: {
    facilityId: string;
    patientId: string;
    serviceDate: Date | null;
  }
): Promise<string[]> {
  const gaps: string[] = [];

  const primaryResolution = await resolvePrimaryCoverage(prisma, {
    facilityId: input.facilityId,
    patientId: input.patientId,
    serviceDate: input.serviceDate,
  });

  if (!primaryResolution.ok) {
    gaps.push(primaryResolution.reasonCode);
    gaps.push("MISSING_PAYER_CONTEXT");
    gaps.push("MISSING_SUBSCRIBER_DATA");
  } else {
    const primary = primaryResolution.coverage;
    const freeTextPayer = Boolean(primary.payerNameFreeText?.trim());
    const catalogPayerOk = Boolean(primary.payerId && primary.payer && primary.payer.isActive);
    const hasPayerSource = Boolean(primary.payerId?.trim()) || freeTextPayer;
    if (!hasPayerSource) {
      gaps.push("MISSING_PAYER_SOURCE");
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (Boolean(primary.payerId?.trim()) && freeTextPayer) {
      gaps.push("AMBIGUOUS_PAYER");
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (primary.payerId && !primary.payer) {
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (!catalogPayerOk && !freeTextPayer) {
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (primary.payerId && primary.payer && primary.payer.isActive === false) {
      gaps.push("MISSING_PAYER_CONTEXT");
    }

    const hasMemberOrPolicy = Boolean(primary.memberId?.trim()) || Boolean(primary.policyNumber?.trim());
    if (!hasMemberOrPolicy) {
      gaps.push("MISSING_SUBSCRIBER_DATA");
    }

    if (!hasSubscriberRelationship(primary.relationToSubscriber)) {
      gaps.push("MISSING_SUBSCRIBER_RELATIONSHIP");
      gaps.push("MISSING_SUBSCRIBER_DATA");
    } else if (!subscriberRelationIsPatient(primary.relationToSubscriber) && !primary.subscriberName?.trim()) {
      gaps.push("MISSING_SUBSCRIBER_NAME");
      gaps.push("MISSING_SUBSCRIBER_DATA");
    }
  }

  return [...new Set(gaps)];
}
