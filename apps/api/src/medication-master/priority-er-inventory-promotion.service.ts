import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { PromotePriorityErStagingRowBody } from "./dto/priority-er-promote-staging.dto";
import { buildPriorityErCanonicalCodes } from "./priority-er-inventory-code.util";
import {
  evaluatePriorityErPromotionEligibility,
  type PriorityErPromotionBlockReason,
} from "./priority-er-inventory-promotion-eligibility.util";
import { parsePriorityErGovernance } from "./priority-er-inventory-governance.util";
import {
  isPriorityErInventoryStagingRow,
  parsePriorityErReconciliationMeta,
  parsePriorityErSourceTrace,
} from "./priority-er-inventory-staging-source.util";
import type { DuplicateResolutionMode } from "./promotion-duplicate.util";
import {
  normalizeDoseForMatch,
  normalizeFormForMatch,
  normalizeMedicationNameForMatch,
} from "./priority-er-inventory-match-normalize.util";
import { medicationFormularyImportStagingPromotionSelect } from "./medication-formulary-import-staging.types";

export type PriorityErPromotionResultPayload = {
  stagingRowId: string;
  sourceRowId: string;
  exactSourceText: string;
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string;
  duplicateResolution: DuplicateResolutionMode;
  conceptId: string;
  productId: string;
  packageId: string;
  facilityFormularyItemId: string | null;
  conceptCode: string;
  productCode: string;
  packageCode: string;
  createdConcept: boolean;
  createdProduct: boolean;
  createdPackage: boolean;
  runtimeOrderable: false;
  promotedAt: string;
};

export type PromotePriorityErRowOutcome =
  | { status: "promoted"; result: PriorityErPromotionResultPayload }
  | {
      status: "blocked";
      stagingRowId: string;
      reasons: PriorityErPromotionBlockReason[];
    };

function parseExistingPromotion(value: unknown): PriorityErPromotionResultPayload | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.conceptId !== "string" || typeof o.productId !== "string") return null;
  return o as unknown as PriorityErPromotionResultPayload;
}

function mapRouteCode(formExact: string): string {
  const upper = formExact.trim().toUpperCase();
  if (!upper) return "OTHER";
  if (upper.length <= 16 && /^[A-Z0-9_]+$/.test(upper)) return upper;
  return "OTHER";
}

@Injectable()
export class PriorityErInventoryPromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async promoteStagingRow(
    stagingRowId: string,
    body: PromotePriorityErStagingRowBody,
    userId: string,
    facilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<PromotePriorityErRowOutcome> {
    const row = await this.prisma.medicationFormularyImportStaging.findUnique({
      where: { id: stagingRowId },
      select: medicationFormularyImportStagingPromotionSelect,
    });
    if (!row) throw new NotFoundException("Ligne de staging introuvable.");

    const existing = parseExistingPromotion(row.promotionResultJson);
    if (existing) {
      return { status: "promoted", result: existing };
    }

    const governance = parsePriorityErGovernance(row.rawJson);
    const eligibility = evaluatePriorityErPromotionEligibility(row, {
      duplicateResolution:
        body.duplicateResolution ??
        (governance.governanceDecision === "LINK_TO_EXISTING"
          ? governance.linkedProductId
            ? "LINK_TO_EXISTING_PRODUCT"
            : "LINK_TO_EXISTING_CONCEPT"
          : undefined),
      confirmCreateDespiteDuplicate: body.confirmCreateDespiteDuplicate,
      activateBilling: body.activateBilling,
      activatePackageWithNdc: body.activatePackageWithNdc,
    });
    if (!eligibility.eligible) {
      return { status: "blocked", stagingRowId, reasons: eligibility.reasons };
    }

    const targetFacilityId = row.facilityId ?? facilityId;
    if (!targetFacilityId) {
      throw new BadRequestException("facilityId requis sur la ligne ou dans la requête.");
    }

    const resolution =
      body.duplicateResolution ??
      (governance.governanceDecision === "LINK_TO_EXISTING"
        ? governance.linkedProductId
          ? "LINK_TO_EXISTING_PRODUCT"
          : "LINK_TO_EXISTING_CONCEPT"
        : governance.governanceDecision === "CREATE_NEW_APPROVED"
          ? "CREATE_NEW"
          : "CREATE_NEW");
    const trace = parsePriorityErSourceTrace(row.rawJson);
    const reconciliation = parsePriorityErReconciliationMeta(row.rawJson);
    const codes = buildPriorityErCanonicalCodes({
      sourceRowId: row.sourceRowId,
      sourceNameExact: trace.sourceNameExact,
      sourceStrengthExact: trace.sourceStrengthExact,
      sourceRouteExact: trace.sourceRouteExact,
    });

    await this.assertNoDuplicateCanonicalCreate({
      resolution,
      trace,
      conceptCode: codes.conceptCode,
      productCode: codes.productCode,
      packageCode: codes.packageCode,
      existingConceptId:
        body.existingConceptId ??
        governance.linkedConceptId ??
        reconciliation.matchedConceptIds[0],
      existingProductId:
        body.existingProductId ??
        governance.linkedProductId ??
        reconciliation.matchedProductIds[0],
    });

    const result = await this.prisma.$transaction(async (tx) =>
      this.promoteInTransaction(tx, {
        row,
        trace,
        codes,
        resolution,
        body,
        userId,
        facilityId: targetFacilityId,
      })
    );

    await this.audit.log(AuditAction.CREATE, "MEDICATION_PRIORITY_ER_STAGING_PROMOTION", {
      userId,
      facilityId: targetFacilityId,
      entityId: stagingRowId,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      critical: true,
      metadata: {
        stagingRowId,
        sourceRowId: row.sourceRowId,
        batchId: row.batchId,
        exactSourceText: trace.exactSourceText,
        conceptId: result.conceptId,
        productId: result.productId,
        packageId: result.packageId,
        createdConcept: result.createdConcept,
        createdProduct: result.createdProduct,
        createdPackage: result.createdPackage,
        runtimeOrderable: false,
      },
    });

    return { status: "promoted", result };
  }

  private async assertNoDuplicateCanonicalCreate(params: {
    resolution: DuplicateResolutionMode;
    trace: ReturnType<typeof parsePriorityErSourceTrace>;
    conceptCode: string;
    productCode: string;
    packageCode: string;
    existingConceptId?: string;
    existingProductId?: string;
  }) {
    if (
      params.resolution === "LINK_TO_EXISTING_CONCEPT" ||
      params.resolution === "LINK_TO_EXISTING_PRODUCT" ||
      params.resolution === "NEW_PACKAGE_ONLY"
    ) {
      return;
    }

    const nameNorm = normalizeMedicationNameForMatch(params.trace.sourceNameExact);
    const doseNorm = normalizeDoseForMatch(params.trace.sourceStrengthExact);
    const formNorm = normalizeFormForMatch(params.trace.sourceRouteExact);

    const existingConcept = await this.prisma.medicationConcept.findFirst({
      where: {
        OR: [
          { code: params.conceptCode },
          {
            genericName: { equals: params.trace.sourceNameExact, mode: "insensitive" },
          },
        ],
      },
      select: { id: true, code: true, genericName: true },
    });

    if (existingConcept && existingConcept.id !== params.existingConceptId) {
      const products = await this.prisma.medicationProduct.findMany({
        where: { conceptId: existingConcept.id },
        select: { id: true, strengthDisplay: true, dosageForm: true },
        take: 20,
      });
      const exactProduct = products.find(
        (p) =>
          normalizeDoseForMatch(p.strengthDisplay) === doseNorm &&
          normalizeFormForMatch(p.dosageForm) === formNorm
      );
      if (exactProduct && exactProduct.id !== params.existingProductId) {
        throw new ConflictException({
          code: "DUPLICATE_CANONICAL_EXISTS",
          message:
            "Un médicament canonique avec la même source exacte existe déjà — utiliser le lien vers l'existant.",
          conceptId: existingConcept.id,
          productId: exactProduct.id,
        });
      }
    }

    const productByCode = await this.prisma.medicationProduct.findUnique({
      where: { code: params.productCode },
      select: { id: true },
    });
    if (productByCode) {
      throw new ConflictException({
        code: "DUPLICATE_PRODUCT_CODE",
        message: `Code produit déjà utilisé: ${params.productCode}`,
      });
    }

    const pkgByCode = await this.prisma.medicationPackage.findUnique({
      where: { code: params.packageCode },
      select: { id: true },
    });
    if (pkgByCode) {
      throw new ConflictException({
        code: "DUPLICATE_PACKAGE_CODE",
        message: `Code conditionnement déjà utilisé: ${params.packageCode}`,
      });
    }

    if (nameNorm) {
      const aliasHit = await this.prisma.medicationSearchAlias.findFirst({
        where: { normalizedAlias: nameNorm },
        select: { conceptId: true, productId: true },
      });
      if (aliasHit?.conceptId && aliasHit.conceptId !== params.existingConceptId) {
        throw new ConflictException({
          code: "DUPLICATE_ALIAS",
          message: "Alias de recherche en conflit avec un concept existant.",
          conceptId: aliasHit.conceptId,
        });
      }
    }
  }

  private async promoteInTransaction(
    tx: Prisma.TransactionClient,
    ctx: {
      row: {
        id: string;
        sourceRowId: string;
        batchId: string;
        rawJson: unknown;
        reviewFlags: unknown;
        ndc11: string | null;
        hcpcsCodeSuggested: string | null;
      };
      trace: ReturnType<typeof parsePriorityErSourceTrace>;
      codes: ReturnType<typeof buildPriorityErCanonicalCodes>;
      resolution: DuplicateResolutionMode;
      body: PromotePriorityErStagingRowBody;
      userId: string;
      facilityId: string;
    }
  ): Promise<PriorityErPromotionResultPayload> {
    const { row, trace, codes, resolution, body, userId, facilityId } = ctx;
    const reconciliation = parsePriorityErReconciliationMeta(row.rawJson);
    const flags = Array.isArray(row.reviewFlags) ? (row.reviewFlags as string[]) : [];

    let createdConcept = false;
    let createdProduct = false;
    let createdPackage = false;

    let conceptId: string;
    let conceptCode = codes.conceptCode;

    if (
      resolution === "LINK_TO_EXISTING_CONCEPT" ||
      resolution === "LINK_TO_EXISTING_PRODUCT" ||
      resolution === "NEW_PACKAGE_ONLY"
    ) {
      const linkConceptId = body.existingConceptId ?? reconciliation.matchedConceptIds[0];
      if (!linkConceptId) {
        throw new BadRequestException("existingConceptId requis pour lier un concept existant.");
      }
      const existing = await tx.medicationConcept.findUnique({ where: { id: linkConceptId } });
      if (!existing) throw new BadRequestException("Concept existant introuvable.");
      conceptId = existing.id;
      conceptCode = existing.code;
    } else {
      const dup = await tx.medicationConcept.findUnique({ where: { code: conceptCode } });
      if (dup) {
        throw new ConflictException(`Concept existe déjà: ${conceptCode}`);
      }
      const created = await tx.medicationConcept.create({
        data: {
          code: conceptCode,
          genericName: trace.sourceNameExact,
          displayName: trace.sourceNameExact,
          isActive: false,
        },
      });
      conceptId = created.id;
      createdConcept = true;
    }

    const routeCode = mapRouteCode(trace.sourceRouteExact);
    await tx.medicationRoute.upsert({
      where: { code: routeCode },
      create: { code: routeCode, label: trace.sourceRouteExact || routeCode },
      update: {},
    });
    const route = await tx.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

    const concentration = await tx.medicationConcentration.create({
      data: { displayText: trace.sourceStrengthExact },
    });

    let productId: string;
    let productCode = codes.productCode;

    if (resolution === "LINK_TO_EXISTING_PRODUCT" || resolution === "NEW_PACKAGE_ONLY") {
      const linkProductId = body.existingProductId ?? reconciliation.matchedProductIds[0];
      if (!linkProductId) {
        throw new BadRequestException("existingProductId requis pour lier un produit existant.");
      }
      const existing = await tx.medicationProduct.findUnique({ where: { id: linkProductId } });
      if (!existing) throw new BadRequestException("Produit existant introuvable.");
      if (existing.conceptId !== conceptId) {
        throw new BadRequestException("Le produit n'appartient pas au concept cible.");
      }
      productId = existing.id;
      productCode = existing.code;
    } else if (resolution === "LINK_TO_EXISTING_CONCEPT") {
      const byStrength = await tx.medicationProduct.findFirst({
        where: {
          conceptId,
          strengthDisplay: trace.sourceStrengthExact,
          dosageForm: trace.sourceRouteExact,
        },
      });
      if (byStrength) {
        productId = byStrength.id;
        productCode = byStrength.code;
      } else {
        const created = await this.createInactiveProduct(tx, {
          productCode,
          conceptId,
          trace,
          concentrationId: concentration.id,
          routeId: route.id,
        });
        productId = created.id;
        createdProduct = true;
      }
    } else {
      const dup = await tx.medicationProduct.findUnique({ where: { code: productCode } });
      if (dup) throw new ConflictException(`Produit existe déjà: ${productCode}`);
      const created = await this.createInactiveProduct(tx, {
        productCode,
        conceptId,
        trace,
        concentrationId: concentration.id,
        routeId: route.id,
      });
      productId = created.id;
      createdProduct = true;
    }

    const existingPkg = await tx.medicationPackage.findUnique({ where: { code: codes.packageCode } });
    if (existingPkg) {
      throw new ConflictException(`Conditionnement existe déjà: ${codes.packageCode}`);
    }

    const includeNdc = body.activatePackageWithNdc === true && !flags.includes("NDC_REVIEW_REQUIRED");
    const pkg = await tx.medicationPackage.create({
      data: {
        code: codes.packageCode,
        productId,
        packageDescription: trace.exactSourceText || trace.sourceRouteExact,
        packageType: "OTHER",
        ndc11: includeNdc ? row.ndc11 : null,
        ndcDisplay: includeNdc ? row.ndc11 : null,
        isDefaultForProduct: true,
        isActive: false,
      },
    });
    createdPackage = true;

    await this.ensureInactiveProfiles(tx, {
      conceptId,
      productId,
      packageId: pkg.id,
      trace,
      row,
      activateBilling: body.activateBilling === true && !flags.includes("BILLING_REVIEW_REQUIRED"),
    });

    let facilityFormularyItemId: string | null = null;
    const existingFormulary = await tx.facilityFormularyItem.findUnique({
      where: { facilityId_packageId: { facilityId, packageId: pkg.id } },
    });
    if (!existingFormulary) {
      const item = await tx.facilityFormularyItem.create({
        data: {
          facilityId,
          packageId: pkg.id,
          isOnFormulary: false,
          isEDFormulary: false,
          allowManualOverride: false,
        },
      });
      facilityFormularyItemId = item.id;
    } else {
      facilityFormularyItemId = existingFormulary.id;
    }

    const normalizedAlias = normalizeMedicationNameForMatch(trace.sourceNameExact);
    if (normalizedAlias) {
      const aliasExists = await tx.medicationSearchAlias.findFirst({
        where: {
          normalizedAlias,
          OR: [{ conceptId }, { productId }],
        },
      });
      if (!aliasExists) {
        await tx.medicationSearchAlias.create({
          data: {
            conceptId,
            productId,
            alias: trace.sourceNameExact,
            normalizedAlias,
            aliasType: "INVENTORY_SOURCE",
          },
        });
      }
    }

    const promotedAt = new Date();
    const payload: PriorityErPromotionResultPayload = {
      stagingRowId: row.id,
      sourceRowId: row.sourceRowId,
      exactSourceText: trace.exactSourceText,
      sourceNameExact: trace.sourceNameExact,
      sourceStrengthExact: trace.sourceStrengthExact,
      sourceRouteExact: trace.sourceRouteExact,
      duplicateResolution: resolution,
      conceptId,
      productId,
      packageId: pkg.id,
      facilityFormularyItemId,
      conceptCode,
      productCode,
      packageCode: codes.packageCode,
      createdConcept,
      createdProduct,
      createdPackage,
      runtimeOrderable: false,
      promotedAt: promotedAt.toISOString(),
    };

    const preservationRaw =
      row.rawJson != null && typeof row.rawJson === "object" && !Array.isArray(row.rawJson)
        ? { ...(row.rawJson as Record<string, unknown>) }
        : {};

    await tx.medicationFormularyImportStaging.update({
      where: { id: row.id },
      data: {
        proposedConceptCode: conceptCode,
        proposedProductCode: productCode,
        proposedPackageCode: codes.packageCode,
        importGateStatus: "PROMOTED",
        overallStatus: "promoted",
        importedAt: promotedAt,
        importedByUserId: userId,
        promotionResultJson: {
          ...payload,
          sourcePreservation: {
            ...trace,
            rawJson: preservationRaw,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return payload;
  }

  private async createInactiveProduct(
    tx: Prisma.TransactionClient,
    params: {
      productCode: string;
      conceptId: string;
      trace: ReturnType<typeof parsePriorityErSourceTrace>;
      concentrationId: string;
      routeId: string;
    }
  ) {
    return tx.medicationProduct.create({
      data: {
        code: params.productCode,
        conceptId: params.conceptId,
        strengthDisplay: params.trace.sourceStrengthExact,
        concentrationId: params.concentrationId,
        dosageForm: params.trace.sourceRouteExact,
        defaultRouteId: params.routeId,
        administrationType: "OTHER",
        billingClass: "UNKNOWN",
        isActive: false,
        governanceStatus: "REVIEW_REQUIRED",
      },
    });
  }

  private async ensureInactiveProfiles(
    tx: Prisma.TransactionClient,
    ctx: {
      conceptId: string;
      productId: string;
      packageId: string;
      trace: ReturnType<typeof parsePriorityErSourceTrace>;
      row: { hcpcsCodeSuggested: string | null };
      activateBilling: boolean;
    }
  ) {
    const safetyExists = await tx.medicationSafetyProfile.findUnique({
      where: { conceptId: ctx.conceptId },
    });
    if (!safetyExists) {
      await tx.medicationSafetyProfile.create({
        data: { conceptId: ctx.conceptId, isHighAlert: false, isControlled: false },
      });
    }

    const adminExists = await tx.medicationAdministrationProfile.findUnique({
      where: { productId: ctx.productId },
    });
    if (!adminExists) {
      await tx.medicationAdministrationProfile.create({
        data: {
          productId: ctx.productId,
          defaultMarWorkflow: "SINGLE_DOSE",
          requiresInfusionSession: false,
          allowsPartialDose: false,
          allowsWasteDocumentation: false,
          hydrationFluid: false,
        },
      });
    }

    if (ctx.activateBilling && ctx.row.hcpcsCodeSuggested) {
      const billingExists = await tx.medicationBillingProfile.findFirst({
        where: { packageId: ctx.packageId },
      });
      if (!billingExists) {
        await tx.medicationBillingProfile.create({
          data: {
            packageId: ctx.packageId,
            hcpcsCodeSuggested: ctx.row.hcpcsCodeSuggested,
            requiresManualReview: true,
          },
        });
      }
    }
  }
}
