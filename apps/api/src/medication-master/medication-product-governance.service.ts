import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildMedicationMasterValidationWarnings } from "./medication-master-validation.util";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import {
  MEDICATION_PRODUCT_GOVERNANCE_AUDIT_ENTITY,
  type MedicationProductGovernanceStatus,
  type MedicationProductGovernanceTimelineEntry,
} from "./medication-product-governance.constants";
import { evaluateActivationReadiness } from "./medication-product-activation-readiness.util";
import type { MedicationProductGovernanceActionBody } from "./dto/medication-product-governance-action.dto";

const PRODUCT_GOVERNANCE_INCLUDE = {
  concept: {
    include: {
      safetyProfile: true,
      searchAliases: { select: { alias: true } },
    },
  },
  administrationProfile: true,
  infusionProfile: true,
  searchAliases: { select: { alias: true } },
  packages: {
    where: { isActive: true },
    include: {
      billingProfiles: { select: { requiresManualReview: true } },
    },
  },
} satisfies Prisma.MedicationProductInclude;

export type MedicationProductGovernanceStateDto = {
  productId: string;
  productCode: string;
  governanceStatus: string;
  activationApprovedAt: string | null;
  activationApprovedByUserId: string | null;
  governanceNotes: string | null;
  activationReadiness: { ready: boolean; blockingReasons: string[] };
  timeline: MedicationProductGovernanceTimelineEntry[];
};

@Injectable()
export class MedicationProductGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly explorer: MedicationMasterExplorerService,
    private readonly audit: AuditService
  ) {}

  assertFacilityScope(requestedFacilityId: string, callerFacilityId: string | undefined): void {
    this.explorer.assertFacilityScope(requestedFacilityId, callerFacilityId);
  }

  async getProductGovernanceState(
    productId: string,
    facilityId: string
  ): Promise<MedicationProductGovernanceStateDto> {
    const loaded = await this.loadProductForGovernance(productId, facilityId);
    const readiness = await this.computeReadiness(loaded, facilityId);
    const timeline = await this.loadTimeline(productId);

    return {
      productId: loaded.id,
      productCode: loaded.code,
      governanceStatus: loaded.governanceStatus,
      activationApprovedAt: loaded.activationApprovedAt?.toISOString() ?? null,
      activationApprovedByUserId: loaded.activationApprovedByUserId,
      governanceNotes: loaded.governanceNotes,
      activationReadiness: readiness,
      timeline,
    };
  }

  async approveActivation(
    productId: string,
    body: MedicationProductGovernanceActionBody,
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    const loaded = await this.loadProductForGovernance(productId, body.facilityId);
    const previousStatus = loaded.governanceStatus;
    const readiness = await this.computeReadiness(loaded, body.facilityId);

    if (!readiness.ready) {
      throw new BadRequestException({
        message: "Le produit ne satisfait pas les critères d’approbation d’activation.",
        blockingReasons: readiness.blockingReasons,
      });
    }

    const now = new Date();
    const updated = await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceStatus: "ACTIVATION_APPROVED",
        activationApprovedAt: now,
        activationApprovedByUserId: userId,
        governanceNotes: body.governanceNote?.trim() || loaded.governanceNotes,
      },
      select: { id: true, code: true, governanceStatus: true, conceptId: true },
    });

    await this.writeGovernanceAudit({
      action: "APPROVE_ACTIVATION",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: updated.conceptId,
      previousStatus,
      newStatus: updated.governanceStatus,
      governanceNote: body.governanceNote ?? null,
      auditMeta,
    });

    return {
      governanceOnly: true,
      product: updated,
      activationApprovedAt: now.toISOString(),
    };
  }

  async blockProduct(
    productId: string,
    body: MedicationProductGovernanceActionBody & { governanceNote: string },
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    if (!body.governanceNote?.trim()) {
      throw new BadRequestException("Une note de gouvernance est obligatoire pour bloquer.");
    }

    const loaded = await this.loadProductForGovernance(productId, body.facilityId);
    const previousStatus = loaded.governanceStatus;

    if (previousStatus === "RETIRED") {
      throw new BadRequestException("Impossible de bloquer un produit retiré.");
    }

    const updated = await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceStatus: "BLOCKED",
        governanceNotes: body.governanceNote.trim(),
        activationApprovedAt: null,
        activationApprovedByUserId: null,
      },
      select: { id: true, code: true, governanceStatus: true, conceptId: true },
    });

    await this.writeGovernanceAudit({
      action: "BLOCK",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: updated.conceptId,
      previousStatus,
      newStatus: updated.governanceStatus,
      governanceNote: body.governanceNote.trim(),
      auditMeta,
    });

    return { governanceOnly: true, product: updated };
  }

  async retireProduct(
    productId: string,
    body: MedicationProductGovernanceActionBody & { governanceNote: string },
    userId: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    if (!body.governanceNote?.trim()) {
      throw new BadRequestException("Une note de gouvernance est obligatoire pour retirer.");
    }

    const loaded = await this.loadProductForGovernance(productId, body.facilityId);
    const previousStatus = loaded.governanceStatus;

    const updated = await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceStatus: "RETIRED",
        governanceNotes: body.governanceNote.trim(),
        activationApprovedAt: null,
        activationApprovedByUserId: null,
      },
      select: { id: true, code: true, governanceStatus: true, conceptId: true },
    });

    await this.writeGovernanceAudit({
      action: "RETIRE",
      userId,
      facilityId: body.facilityId,
      productId,
      conceptId: updated.conceptId,
      previousStatus,
      newStatus: updated.governanceStatus,
      governanceNote: body.governanceNote.trim(),
      auditMeta,
    });

    return { governanceOnly: true, product: updated };
  }

  private async loadProductForGovernance(productId: string, facilityId: string) {
    const product = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      include: PRODUCT_GOVERNANCE_INCLUDE,
    });
    if (!product) throw new NotFoundException("Produit médicamenteux introuvable.");

    const packageIds = product.packages.map((p) => p.id);
    const formularyRows =
      packageIds.length === 0
        ? []
        : await this.prisma.facilityFormularyItem.findMany({
            where: { facilityId, packageId: { in: packageIds } },
            select: { packageId: true, isOnFormulary: true, isEDFormulary: true },
          });
    const formularyByPackage = new Map(formularyRows.map((r) => [r.packageId, r]));

    return {
      ...product,
      packages: product.packages.map((pkg) => ({
        ...pkg,
        facilityFormulary: formularyByPackage.get(pkg.id) ?? null,
      })),
    };
  }

  private async computeReadiness(
    product: Awaited<ReturnType<typeof this.loadProductForGovernance>>,
    facilityId: string
  ) {
    const conceptAliases = product.concept.searchAliases.map((a) => ({ alias: a.alias }));
    const productAliases = product.searchAliases.map((a) => ({ alias: a.alias }));

    const validationWarnings = buildMedicationMasterValidationWarnings({
      facilityId,
      concept: {
        code: product.concept.code,
        safetyProfile: product.concept.safetyProfile,
        conceptAliases,
      },
      products: [
        {
          code: product.code,
          administrationType: product.administrationType,
          administrationProfile: product.administrationProfile,
          infusionProfile: product.infusionProfile,
          productAliases,
          packages: product.packages.map((pkg) => ({
            code: pkg.code,
            ndc11: pkg.ndc11,
            billingProfiles: pkg.billingProfiles,
            facilityFormulary: pkg.facilityFormulary,
          })),
        },
      ],
    });

    const duplicateNdc = await this.hasDuplicateNdcOnOtherProducts(product.id, product.packages);

    return evaluateActivationReadiness({
      facilityId,
      productCode: product.code,
      governanceStatus: product.governanceStatus as MedicationProductGovernanceStatus,
      concept: { safetyProfile: product.concept.safetyProfile },
      product: {
        administrationType: product.administrationType,
        administrationProfile: product.administrationProfile,
        infusionProfile: product.infusionProfile,
        packages: product.packages.map((pkg) => ({
          code: pkg.code,
          ndc11: pkg.ndc11,
          billingProfiles: pkg.billingProfiles,
          facilityFormulary: pkg.facilityFormulary,
        })),
      },
      validationWarnings,
      duplicateNdcOnOtherProducts: duplicateNdc,
    });
  }

  private async hasDuplicateNdcOnOtherProducts(
    productId: string,
    packages: Array<{ ndc11: string | null }>
  ): Promise<boolean> {
    const ndcs = packages.map((p) => p.ndc11?.trim()).filter((n): n is string => Boolean(n));
    if (ndcs.length === 0) return false;

    const conflict = await this.prisma.medicationPackage.findFirst({
      where: {
        ndc11: { in: ndcs },
        isActive: true,
        productId: { not: productId },
      },
      select: { id: true },
    });
    return Boolean(conflict);
  }

  private async loadTimeline(productId: string): Promise<MedicationProductGovernanceTimelineEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { entityType: MEDICATION_PRODUCT_GOVERNANCE_AUDIT_ENTITY, entityId: productId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        createdAt: true,
        action: true,
        userId: true,
        metadata: true,
      },
    });

    return rows.map((r) => {
      const meta =
        r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {};
      return {
        at: r.createdAt.toISOString(),
        action: String(meta.governanceAction ?? r.action),
        previousStatus: meta.previousStatus != null ? String(meta.previousStatus) : null,
        newStatus: String(meta.newStatus ?? ""),
        userId: r.userId,
        governanceNote: meta.governanceNote != null ? String(meta.governanceNote) : null,
      };
    });
  }

  private async writeGovernanceAudit(params: {
    action: "APPROVE_ACTIVATION" | "BLOCK" | "RETIRE";
    userId: string;
    facilityId: string;
    productId: string;
    conceptId: string;
    previousStatus: string;
    newStatus: string;
    governanceNote: string | null;
    auditMeta?: { ip?: string; userAgent?: string };
  }) {
    await this.audit.log(AuditAction.UPDATE, MEDICATION_PRODUCT_GOVERNANCE_AUDIT_ENTITY, {
      userId: params.userId,
      facilityId: params.facilityId,
      entityId: params.productId,
      ip: params.auditMeta?.ip,
      userAgent: params.auditMeta?.userAgent,
      critical: true,
      metadata: {
        governanceAction: params.action,
        governanceOnly: true,
        productId: params.productId,
        conceptId: params.conceptId,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
        governanceNote: params.governanceNote,
        runtimeCutover: false,
      },
    });
  }
}
