import { BadRequestException } from "@nestjs/common";
import {
  enterpriseOrderSetProvenanceAuditMetadata,
  validateEnterpriseOrderSetApplication,
  type EnterpriseOrderSetProvenance,
  type OrderCreateDto,
} from "@medora/shared";
import { RoleCode } from "@prisma/client";

export function assertEnterpriseOrderSetProvenanceForCreate(input: {
  data: OrderCreateDto;
  roleCodes: readonly string[];
}): void {
  const provenance = input.data.enterpriseOrderSetProvenance;
  if (!provenance) return;

  if (provenance.orderType !== input.data.type) {
    throw new BadRequestException("Enterprise order set provenance order type mismatch.");
  }

  const normalizedRoles = input.roleCodes.map((code) => code.toUpperCase());
  const canPrescribe =
    normalizedRoles.includes(RoleCode.PROVIDER) || normalizedRoles.includes(RoleCode.ADMIN);
  const hasRnStandingOrderAuthority =
    normalizedRoles.includes(RoleCode.RN) && !canPrescribe;

  const result = validateEnterpriseOrderSetApplication({
    provenance,
    itemCount: input.data.items.length,
    roleCodes: input.roleCodes,
    canPrescribe,
    hasRnStandingOrderAuthority,
  });

  if (!result.ok) {
    throw new BadRequestException(result.message);
  }
}

export function enterpriseOrderSetAuditMetadataFromDto(
  provenance: EnterpriseOrderSetProvenance | undefined,
  orderId?: string
): Record<string, unknown> {
  if (!provenance) return {};
  return enterpriseOrderSetProvenanceAuditMetadata(provenance, orderId ? { orderId } : undefined);
}
