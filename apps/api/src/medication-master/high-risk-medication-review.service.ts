import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import {
  HIGH_RISK_PENDING_GOVERNANCE_STATUS,
} from "./medication-product-governance.constants";
import {
  mergeHighRiskImportMeta,
  parseHighRiskImportMeta,
  type HighRiskImportMeta,
} from "./medication-high-risk-import-meta.util";
import { parseProductRuntimeActivation } from "./medication-product-runtime-activation.util";
import type {
  HighRiskApproveCatalogBody,
  HighRiskApproveProviderOrderingBody,
  HighRiskRejectBody,
} from "./dto/high-risk-medication-review.dto";

export type HighRiskMedicationQueueRow = {
  productId: string;
  productCode: string;
  medicationName: string;
  dose: string;
  form: string;
  classificationReasonCodes: string[];
  sourceFilename: string;
  sourceRowNumber: number;
  sourceRowKey: string;
  importedAt: string;
  facilityId: string;
  facilityName: string | null;
  duplicateWarning: string | null;
  isHighAlert: boolean;
  isControlled: boolean;
  governanceStatus: string;
};

export type HighRiskMedicationQueueResult = {
  rows: HighRiskMedicationQueueRow[];
  total: number;
};

export type HighRiskMedicationActionResult = {
  productId: string;
  governanceStatus: string;
  orderSearchEnabled: boolean;
  marEnabled: boolean;
  billingEnabled: boolean;
};

@Injectable()
export class HighRiskMedicationReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService,
    private readonly controlledImport: ControlledCatalogImportMedicationService
  ) {}

  async listQueue(
    facilityId: string,
    callerFacilityId: string | undefined
  ): Promise<HighRiskMedicationQueueResult> {
    this.explorer.assertFacilityScope(facilityId, callerFacilityId);

    const products = await this.prisma.medicationProduct.findMany({
      where: {
        governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
        packages: {
          some: {
            facilityFormularyItems: { some: { facilityId } },
          },
        },
      },
      include: {
        concept: { include: { safetyProfile: true } },
        packages: {
          where: { isDefaultForProduct: true },
          include: {
            facilityFormularyItems: { where: { facilityId }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { name: true },
    });

    const rows: HighRiskMedicationQueueRow[] = [];
    for (const product of products) {
      const meta = parseHighRiskImportMeta(product.governanceNotes);
      if (!meta || meta.status !== "PENDING") continue;

      rows.push({
        productId: product.id,
        productCode: product.code,
        medicationName: product.concept.displayName || product.concept.genericName,
        dose: product.strengthDisplay,
        form: product.dosageForm,
        classificationReasonCodes: meta.classificationReasonCodes,
        sourceFilename: meta.sourceFilename,
        sourceRowNumber: meta.sourceRowNumber,
        sourceRowKey: meta.sourceRowKey,
        importedAt: meta.importedAt,
        facilityId,
        facilityName: facility?.name ?? null,
        duplicateWarning: meta.duplicateWarning,
        isHighAlert: product.concept.safetyProfile?.isHighAlert ?? false,
        isControlled: product.concept.safetyProfile?.isControlled ?? false,
        governanceStatus: product.governanceStatus,
      });
    }

    return { rows, total: rows.length };
  }

  async approveCatalogOnly(
    productId: string,
    body: HighRiskApproveCatalogBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<HighRiskMedicationActionResult> {
    const product = await this.loadPendingProduct(productId, body.facilityId, callerFacilityId);
    const now = new Date().toISOString();

    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceStatus: "REVIEW_REQUIRED",
        governanceNotes: mergeHighRiskImportMeta(product.governanceNotes, {
          status: "CATALOG_APPROVED",
          approvedAt: now,
          approvedByUserId: userId,
        }),
      },
    });

    await this.audit.log(AuditAction.UPDATE, "HIGH_RISK_CATALOG_APPROVED", {
      userId,
      facilityId: body.facilityId,
      entityId: productId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        productCode: product.code,
        sourceRowKey: parseHighRiskImportMeta(product.governanceNotes)?.sourceRowKey,
        noteLength: body.note.trim().length,
      },
    });

    return this.buildActionResult(productId);
  }

  async approveProviderOrdering(
    productId: string,
    body: HighRiskApproveProviderOrderingBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<HighRiskMedicationActionResult> {
    const product = await this.loadPendingProduct(productId, body.facilityId, callerFacilityId);

    await this.controlledImport.activateProviderOrderSearchForImport(
      productId,
      body.facilityId,
      userId,
      body.note.trim(),
      auditMeta
    );

    const now = new Date().toISOString();
    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceNotes: mergeHighRiskImportMeta(product.governanceNotes, {
          status: "PROVIDER_ORDER_APPROVED",
          approvedAt: now,
          approvedByUserId: userId,
        }),
      },
    });

    const result = await this.buildActionResult(productId);
    if (result.marEnabled || result.billingEnabled) {
      throw new BadRequestException(
        "Activation interdite : le MAR ou la facturation ne doit pas être activé via cette file."
      );
    }

    await this.audit.log(AuditAction.UPDATE, "HIGH_RISK_PROVIDER_ORDER_APPROVED", {
      userId,
      facilityId: body.facilityId,
      entityId: productId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        productCode: product.code,
        sourceRowKey: parseHighRiskImportMeta(product.governanceNotes)?.sourceRowKey,
        orderSearchEnabled: result.orderSearchEnabled,
        marEnabled: false,
        billingEnabled: false,
      },
    });

    return result;
  }

  async reject(
    productId: string,
    body: HighRiskRejectBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<HighRiskMedicationActionResult> {
    const product = await this.loadPendingProduct(productId, body.facilityId, callerFacilityId);
    const now = new Date().toISOString();

    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceStatus: "BLOCKED",
        governanceNotes: mergeHighRiskImportMeta(product.governanceNotes, {
          status: "REJECTED",
          rejectedAt: now,
          rejectedByUserId: userId,
          rejectionNote: body.note.trim(),
        }),
      },
    });

    await this.audit.log(AuditAction.UPDATE, "HIGH_RISK_MEDICATION_REJECTED", {
      userId,
      facilityId: body.facilityId,
      entityId: productId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        productCode: product.code,
        sourceRowKey: parseHighRiskImportMeta(product.governanceNotes)?.sourceRowKey,
        noteLength: body.note.trim().length,
      },
    });

    return this.buildActionResult(productId);
  }

  private async loadPendingProduct(
    productId: string,
    facilityId: string,
    callerFacilityId: string | undefined
  ) {
    this.explorer.assertFacilityScope(facilityId, callerFacilityId);

    const product = await this.prisma.medicationProduct.findFirst({
      where: {
        id: productId,
        governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
        packages: {
          some: {
            facilityFormularyItems: { some: { facilityId } },
          },
        },
      },
      select: {
        id: true,
        code: true,
        governanceNotes: true,
        governanceStatus: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Médicament à risque élevé introuvable dans la file d’attente.");
    }

    const meta = parseHighRiskImportMeta(product.governanceNotes);
    if (!meta || meta.status !== "PENDING") {
      throw new BadRequestException("Ce médicament n’est plus en attente d’approbation.");
    }

    return product;
  }

  private async buildActionResult(productId: string): Promise<HighRiskMedicationActionResult> {
    const product = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { governanceStatus: true, governanceNotes: true },
    });
    if (!product) {
      throw new NotFoundException("Produit introuvable.");
    }
    const runtime = parseProductRuntimeActivation(product.governanceNotes);
    return {
      productId,
      governanceStatus: product.governanceStatus,
      orderSearchEnabled: runtime.orderSearchEnabled,
      marEnabled: runtime.marEnabled,
      billingEnabled: runtime.billingEnabled,
    };
  }
}

export type { HighRiskImportMeta };
