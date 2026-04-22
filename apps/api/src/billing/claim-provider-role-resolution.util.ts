import { PrismaService } from "../prisma/prisma.service";

/** CMS NPI (10 digits). */
const NPI_REGEX = /^\d{10}$/;

function isValidNpi(s: string | null | undefined): boolean {
  return Boolean(s && NPI_REGEX.test(s.trim()));
}

export type ClaimBillingRoleResolution = {
  renderingProviderUserId: string | null;
  billingProviderUserId: string | null;
  facilityBillingUsed: boolean;
  professionalBillingContextResolved: boolean;
  institutionalBillingContextResolved: boolean;
  roleWarnings: string[];
  roleBlockers: string[];
};

/**
 * Deterministic billing-role resolution for export / completeness (Phase 7.4).
 * Uses only encounter provider ids and facility billing identity; does not invent roles.
 *
 * Rules:
 * - Rendering user id: encounter `providerId` (rendering) when set, else `physicianAssignedUserId` (attending).
 * - Billing user id: `physicianAssignedUserId` when set, else `providerId` (same as historical claim-builder ordering).
 * - When only one id exists, both roles resolve to that user; auditable warnings describe the fallback.
 * - Professional package: requires resolved rendering user with active account and valid billing NPI.
 *   When billing user differs from rendering user, billing user must also have valid billing NPI.
 * - Facility package: facility billing identity must satisfy the same structural checks as institutional export.
 */
export async function resolveClaimBillingRoles(
  prisma: PrismaService,
  input: {
    facilityId: string;
    encounterRenderingProviderId: string | null;
    encounterAttendingProviderId: string | null;
    hasProfessionalPackage: boolean;
    hasFacilityPackage: boolean;
  }
): Promise<ClaimBillingRoleResolution> {
  const rendRaw = input.encounterRenderingProviderId?.trim() || null;
  const attRaw = input.encounterAttendingProviderId?.trim() || null;

  const renderingProviderUserId = rendRaw ?? attRaw;
  const billingProviderUserId = attRaw ?? rendRaw;

  const roleWarnings: string[] = [];
  const roleBlockers: string[] = [];

  if (input.hasProfessionalPackage) {
    if (!rendRaw && attRaw) {
      roleWarnings.push("RENDERING_PROVIDER_FALLBACK_TO_ATTENDING");
    }
    if (!attRaw && rendRaw) {
      roleWarnings.push("BILLING_PROVIDER_FALLBACK_TO_RENDERING");
    }
  }

  const userIds = [...new Set([renderingProviderUserId, billingProviderUserId].filter(Boolean))] as string[];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, billingNpi: true, isActive: true },
        })
      : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  if (input.hasProfessionalPackage) {
    if (!renderingProviderUserId) {
      roleBlockers.push("MISSING_RENDERING_PROVIDER");
      roleBlockers.push("MISSING_BILLING_PROVIDER");
    } else {
      const ru = byId.get(renderingProviderUserId);
      if (!ru?.isActive || !isValidNpi(ru.billingNpi)) {
        roleBlockers.push("MISSING_RENDERING_PROVIDER_NPI");
      }
      if (billingProviderUserId && billingProviderUserId !== renderingProviderUserId) {
        const bu = byId.get(billingProviderUserId);
        if (!bu?.isActive || !isValidNpi(bu.billingNpi)) {
          roleBlockers.push("MISSING_BILLING_PROVIDER_NPI");
        }
      }
    }
  }

  let institutionalBillingContextResolved = !input.hasFacilityPackage;
  if (input.hasFacilityPackage) {
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
    institutionalBillingContextResolved = Boolean(instOk);
    if (!instOk) {
      roleBlockers.push("MISSING_FACILITY_EXPORT_CONTEXT");
    }
  }

  const uniqueBlockers = [...new Set(roleBlockers)];
  const profRoleBlockers = uniqueBlockers.filter((c) =>
    [
      "MISSING_RENDERING_PROVIDER",
      "MISSING_BILLING_PROVIDER",
      "MISSING_RENDERING_PROVIDER_NPI",
      "MISSING_BILLING_PROVIDER_NPI",
    ].includes(c)
  );
  const professionalBillingContextResolved = !input.hasProfessionalPackage || profRoleBlockers.length === 0;

  return {
    renderingProviderUserId,
    billingProviderUserId,
    facilityBillingUsed: input.hasFacilityPackage,
    professionalBillingContextResolved,
    institutionalBillingContextResolved,
    roleWarnings: [...new Set(roleWarnings)].sort((a, b) => a.localeCompare(b)),
    roleBlockers: uniqueBlockers.sort((a, b) => a.localeCompare(b)),
  };
}
