import { PrismaService } from "../prisma/prisma.service";

/** CMS NPI (10 digits). */
const NPI_REGEX = /^\d{10}$/;

function isValidNpi(s: string | null | undefined): boolean {
  return Boolean(s && NPI_REGEX.test(s.trim()));
}

/** True when the patient is the insured subscriber (no separate subscriber demographics required). */
function subscriberRelationIsPatient(relation: string | null | undefined): boolean {
  if (!relation?.trim()) return true;
  const u = relation.trim().toLowerCase();
  if (u === "18" || u === "self" || u === "insured") return true;
  if (/\bself\b/.test(u)) return true;
  return false;
}

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function coverageActiveForServiceDate(
  cov: { isActive: boolean; effectiveFrom: Date | null; effectiveTo: Date | null },
  serviceDate: Date | null
): boolean {
  if (!cov.isActive) return false;
  if (!serviceDate) return true;
  const svc = utcDay(serviceDate);
  if (cov.effectiveFrom) {
    if (svc < utcDay(cov.effectiveFrom)) return false;
  }
  if (cov.effectiveTo) {
    if (svc > utcDay(cov.effectiveTo)) return false;
  }
  return true;
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

  const primary = await prisma.patientInsuranceCoverage.findFirst({
    where: { patientId: input.patientId, facilityId: input.facilityId, rank: "PRIMARY" },
    include: { payer: { select: { id: true, name: true, isActive: true } } },
  });

  if (!primary) {
    gaps.push("MISSING_PAYER_CONTEXT");
    gaps.push("MISSING_SUBSCRIBER_DATA");
  } else {
    const freeTextPayer = Boolean(primary.payerNameFreeText?.trim());
    const catalogPayerOk = Boolean(primary.payerId && primary.payer && primary.payer.isActive);
    const hasPayer = freeTextPayer || catalogPayerOk;
    if (primary.payerId && !primary.payer) {
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (!hasPayer) {
      gaps.push("MISSING_PAYER_CONTEXT");
    } else if (primary.payerId && primary.payer && primary.payer.isActive === false) {
      gaps.push("MISSING_PAYER_CONTEXT");
    }

    if (!coverageActiveForServiceDate(primary, input.serviceDate)) {
      gaps.push("MISSING_PAYER_CONTEXT");
    }

    const hasMemberOrPolicy = Boolean(primary.memberId?.trim()) || Boolean(primary.policyNumber?.trim());
    if (!hasMemberOrPolicy) {
      gaps.push("MISSING_SUBSCRIBER_DATA");
    }

    if (!subscriberRelationIsPatient(primary.relationToSubscriber) && !primary.subscriberName?.trim()) {
      gaps.push("MISSING_SUBSCRIBER_DATA");
    }
  }

  const providerId = input.renderingProviderId ?? input.attendingProviderId;
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
