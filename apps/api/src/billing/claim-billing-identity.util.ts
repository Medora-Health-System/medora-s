import { PrismaService } from "../prisma/prisma.service";
import { resolvePrimaryCoverage } from "./claim-coverage-resolution.util";

/** CMS NPI (10 digits). */
const NPI_REGEX = /^\d{10}$/;

function isValidNpi(s: string | null | undefined): boolean {
  return Boolean(s && NPI_REGEX.test(s.trim()));
}

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

function resolveProviderRoles(input: { renderingProviderId: string | null; attendingProviderId: string | null }) {
  const renderingProviderId = input.renderingProviderId ?? input.attendingProviderId;
  const billingProviderId = input.attendingProviderId ?? input.renderingProviderId;
  return { renderingProviderId, billingProviderId };
}

/**
 * Stable missing-field codes aligned with X12 preview / submission readiness (Phase 7).
 * Only emits a gap when required modeled data is absent or invalid.
 */
export async function evaluateClaimIdentityGaps(
  prisma: PrismaService,
  input: {
    facilityId: string;
    patientId: string;
    serviceDate: Date | null;
    renderingProviderId: string | null;
    attendingProviderId: string | null;
    includeFacilityInstitutionalGaps: boolean;
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

  const { renderingProviderId, billingProviderId } = resolveProviderRoles(input);
  const providerId = renderingProviderId ?? billingProviderId;
  if (providerId) {
    const u = await prisma.user.findUnique({
      where: { id: providerId },
      select: { billingNpi: true, isActive: true },
    });
    if (!u?.isActive || !isValidNpi(u.billingNpi)) {
      gaps.push("MISSING_PROVIDER_NPI");
    }
  } else {
    gaps.push("MISSING_PROVIDER_NPI");
  }

  if (input.includeFacilityInstitutionalGaps) {
    const f = await prisma.facility.findUnique({
      where: { id: input.facilityId },
      select: {
        billingLegalName: true,
        billingNpi: true,
        taxIdEin: true,
        billingAddressLine1: true,
        billingCity: true,
        billingStateProvince: true,
        billingPostalCode: true,
      },
    });
    const instOk =
      f &&
      f.billingLegalName?.trim() &&
      isValidNpi(f.billingNpi) &&
      f.taxIdEin?.trim() &&
      f.billingAddressLine1?.trim() &&
      f.billingCity?.trim() &&
      f.billingStateProvince?.trim() &&
      f.billingPostalCode?.trim();
    if (!instOk) {
      gaps.push("MISSING_FACILITY_EXPORT_CONTEXT");
    }
  }

  return [...new Set(gaps)];
}
