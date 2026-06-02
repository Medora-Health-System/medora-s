import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, PharmacyVerificationStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { parsePharmacyGovernanceFromProfile } from "@medora/shared";
import { mergeMedicationSafetyGovernanceRead } from "./medication-safety-governance-read.util";

@Injectable()
export class PharmacyVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  private async loadOrderItemContext(orderItemId: string, facilityId: string) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { facilityId } },
      select: {
        id: true,
        catalogItemType: true,
        catalogItemId: true,
        order: { select: { id: true, encounterId: true, facilityId: true, patientId: true } },
      },
    });
    if (!orderItem || orderItem.catalogItemType !== "MEDICATION") {
      throw new NotFoundException("Ligne de médicament introuvable.");
    }
    return orderItem;
  }

  private async requiresPharmacyForOrderItem(
    catalogMedicationId: string | null
  ): Promise<boolean> {
    if (!catalogMedicationId) return false;
    const catalog = await this.prisma.catalogMedication.findUnique({
      where: { id: catalogMedicationId },
      select: {
        id: true,
        isControlled: true,
        controlledSchedule: true,
        requiresWitness: true,
        requiresDoubleSign: true,
      },
    });
    const product = await this.prisma.medicationProduct.findFirst({
      where: { legacyCatalogMedicationId: catalogMedicationId, isActive: true },
      select: {
        legacyCatalogMedicationId: true,
        concept: {
          select: {
            safetyProfile: {
              select: {
                isHighAlert: true,
                highAlertCategories: true,
                lasaGroupId: true,
                isControlled: true,
                controlledSchedule: true,
                requiresWitness: true,
                requiresDoubleSign: true,
              },
            },
          },
        },
        administrationProfile: { select: { allowsWasteDocumentation: true } },
      },
    });
    const profileRow = product
      ? {
          legacyCatalogMedicationId: product.legacyCatalogMedicationId,
          concept: { safetyProfile: product.concept.safetyProfile },
          administrationProfile: product.administrationProfile,
        }
      : null;
    const merged = mergeMedicationSafetyGovernanceRead(catalog, profileRow, null);
    const safety = profileRow?.concept.safetyProfile ?? null;
    const parsed = parsePharmacyGovernanceFromProfile({
      controlledSchedule: merged?.controlledSchedule ?? catalog?.controlledSchedule,
      highAlertCategories: safety?.highAlertCategories,
    });
    return parsed.requiresPharmacyVerification;
  }

  async completeVerification(
    orderItemId: string,
    facilityId: string,
    pharmacistUserId: string,
    verificationNote?: string | null
  ) {
    const orderItem = await this.loadOrderItemContext(orderItemId, facilityId);
    const requires = await this.requiresPharmacyForOrderItem(orderItem.catalogItemId);
    if (!requires) {
      throw new BadRequestException("Ce médicament ne requiert pas de vérification pharmacie.");
    }

    const row = await this.prisma.pharmacyVerification.create({
      data: {
        facilityId,
        orderItemId: orderItem.id,
        encounterId: orderItem.order.encounterId,
        catalogMedicationId: orderItem.catalogItemId,
        verificationStatus: PharmacyVerificationStatus.VERIFIED,
        pharmacistUserId,
        verificationNote: verificationNote?.trim() || null,
        metadata: { sourcePhase: "M1.3F.7" } as Prisma.InputJsonValue,
      },
    });

    await this.audit.log(AuditAction.PHARMACY_VERIFICATION_COMPLETED, "ORDER_ITEM", {
      userId: pharmacistUserId,
      facilityId,
      patientId: orderItem.order.patientId,
      encounterId: orderItem.order.encounterId,
      entityId: orderItem.id,
      orderId: orderItem.order.id,
      critical: true,
      metadata: {
        pharmacyVerificationId: row.id,
        verificationStatus: "VERIFIED",
      },
    });

    return row;
  }

  async rejectVerification(
    orderItemId: string,
    facilityId: string,
    pharmacistUserId: string,
    verificationNote?: string | null
  ) {
    const orderItem = await this.loadOrderItemContext(orderItemId, facilityId);
    const requires = await this.requiresPharmacyForOrderItem(orderItem.catalogItemId);
    if (!requires) {
      throw new BadRequestException("Ce médicament ne requiert pas de vérification pharmacie.");
    }

    const row = await this.prisma.pharmacyVerification.create({
      data: {
        facilityId,
        orderItemId: orderItem.id,
        encounterId: orderItem.order.encounterId,
        catalogMedicationId: orderItem.catalogItemId,
        verificationStatus: PharmacyVerificationStatus.REJECTED,
        pharmacistUserId,
        verificationNote: verificationNote?.trim() || null,
        metadata: { sourcePhase: "M1.3F.7" } as Prisma.InputJsonValue,
      },
    });

    await this.audit.log(AuditAction.PHARMACY_VERIFICATION_REJECTED, "ORDER_ITEM", {
      userId: pharmacistUserId,
      facilityId,
      patientId: orderItem.order.patientId,
      encounterId: orderItem.order.encounterId,
      entityId: orderItem.id,
      orderId: orderItem.order.id,
      critical: true,
      metadata: {
        pharmacyVerificationId: row.id,
        verificationStatus: "REJECTED",
      },
    });

    return row;
  }
}
