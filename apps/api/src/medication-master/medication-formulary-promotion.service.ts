import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, MedicationMarWorkflow, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { PromoteStagingRowBody } from "./dto/promote-staging.dto";
import { evaluatePromotionEligibility } from "./promotion-eligibility.util";
import { collectPromotionAliases } from "./promotion-alias.util";
import {
  findPromotionDuplicates,
  type DuplicateCandidate,
  type DuplicateResolutionMode,
} from "./promotion-duplicate.util";

export type PromotionResultPayload = {
  stagingRowId: string;
  sourceRowId: string;
  duplicateResolution: DuplicateResolutionMode;
  conceptId: string;
  productId: string;
  packageId: string;
  facilityFormularyItemId: string | null;
  createdConcept: boolean;
  createdProduct: boolean;
  createdPackage: boolean;
  duplicateCandidates: DuplicateCandidate[];
  promotedAt: string;
};

export type PromoteRowOutcome =
  | { status: "promoted"; result: PromotionResultPayload }
  | { status: "skipped"; stagingRowId: string; reason: string; code: string }
  | { status: "blocked"; stagingRowId: string; reasons: Array<{ code: string; message: string }> };

function parseRawJson(value: unknown): Record<string, string> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function cell(raw: Record<string, string>, key: string): string {
  return (raw[key] ?? "").trim();
}

function yes(raw: Record<string, string>, key: string): boolean {
  const v = cell(raw, key).toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1" || v === "oui";
}

function mapMarWorkflow(raw: Record<string, string>): MedicationMarWorkflow {
  const w = cell(raw, "mar_workflow").toUpperCase();
  if (w === "INFUSION_SESSION") return MedicationMarWorkflow.INFUSION_SESSION;
  if (w === "PRN") return MedicationMarWorkflow.PRN;
  if (w === "CONTINUOUS") return MedicationMarWorkflow.CONTINUOUS;
  return MedicationMarWorkflow.SINGLE_DOSE;
}

function mapRouteCode(raw: Record<string, string>): string {
  const r = cell(raw, "route").toUpperCase() || "OTHER";
  return r.length > 0 ? r : "OTHER";
}

function parsePromotionResult(value: unknown): PromotionResultPayload | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.conceptId !== "string" || typeof o.productId !== "string" || typeof o.packageId !== "string") {
    return null;
  }
  return o as unknown as PromotionResultPayload;
}

@Injectable()
export class MedicationFormularyPromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async promoteStagingRow(
    stagingRowId: string,
    body: PromoteStagingRowBody,
    userId: string,
    facilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<PromoteRowOutcome> {
    const row = await this.prisma.medicationFormularyImportStaging.findUnique({
      where: { id: stagingRowId },
    });
    if (!row) throw new NotFoundException("Ligne de staging introuvable.");

    const existing = parsePromotionResult(row.promotionResultJson);
    if (existing && row.importedAt) {
      return { status: "promoted", result: existing };
    }

    const eligibility = evaluatePromotionEligibility(row);
    if (!eligibility.eligible) {
      return { status: "blocked", stagingRowId, reasons: eligibility.reasons };
    }

    const raw = parseRawJson(row.rawJson);
    const resolution = body.duplicateResolution ?? "CREATE_NEW";

    const duplicateCheck = await findPromotionDuplicates(this.prisma, {
      proposedConceptCode: row.proposedConceptCode,
      proposedProductCode: row.proposedProductCode,
      proposedPackageCode: row.proposedPackageCode,
      ndc11: row.ndc11,
      genericName: cell(raw, "generic_name") || row.sourceInventoryDescription,
      concentrationDisplay: cell(raw, "concentration_display"),
    });

    if (duplicateCheck.requiresResolution && resolution === "CREATE_NEW") {
      throw new ConflictException({
        code: "DUPLICATE_REQUIRES_RESOLUTION",
        message:
          "Doublon probable détecté. Choisir LINK_TO_EXISTING_CONCEPT, LINK_TO_EXISTING_PRODUCT ou NEW_PACKAGE_ONLY.",
        candidates: duplicateCheck.candidates,
      });
    }

    const targetFacilityId = row.facilityId ?? facilityId;
    if (!targetFacilityId) {
      throw new BadRequestException("facilityId requis sur la ligne ou dans la requête.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      return this.promoteInTransaction(tx, {
        row,
        raw,
        resolution,
        body,
        userId,
        facilityId: targetFacilityId,
        duplicateCandidates: duplicateCheck.candidates,
      });
    });

    await this.audit.log(AuditAction.CREATE, "MEDICATION_STAGING_PROMOTION", {
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
        conceptId: result.conceptId,
        productId: result.productId,
        packageId: result.packageId,
        facilityFormularyItemId: result.facilityFormularyItemId,
        duplicateResolution: resolution,
        createdConcept: result.createdConcept,
        createdProduct: result.createdProduct,
        createdPackage: result.createdPackage,
      },
    });

    return { status: "promoted", result };
  }

  async promoteStagingBatch(
    batchId: string,
    defaultBody: PromoteStagingRowBody,
    userId: string,
    facilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<{
    batchId: string;
    promoted: number;
    blocked: number;
    skipped: number;
    failed: number;
    outcomes: PromoteRowOutcome[];
  }> {
    const rows = await this.prisma.medicationFormularyImportStaging.findMany({
      where: { batchId },
      orderBy: { sourceRowId: "asc" },
    });
    if (rows.length === 0) throw new NotFoundException("Lot introuvable.");

    const outcomes: PromoteRowOutcome[] = [];
    let promoted = 0;
    let blocked = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const outcome = await this.promoteStagingRow(row.id, defaultBody, userId, facilityId, auditMeta);
        outcomes.push(outcome);
        if (outcome.status === "promoted") promoted++;
        else if (outcome.status === "blocked") blocked++;
        else skipped++;
      } catch (e) {
        failed++;
        outcomes.push({
          status: "skipped",
          stagingRowId: row.id,
          code: "PROMOTION_ERROR",
          reason: e instanceof Error ? e.message : "Erreur de promotion.",
        });
      }
    }

    return { batchId, promoted, blocked, skipped, failed, outcomes };
  }

  private async promoteInTransaction(
    tx: Prisma.TransactionClient,
    ctx: {
      row: {
        id: string;
        sourceRowId: string;
        batchId: string;
        proposedConceptCode: string | null;
        proposedProductCode: string | null;
        proposedPackageCode: string | null;
        ndc11: string | null;
        hcpcsCodeSuggested: string | null;
      };
      raw: Record<string, string>;
      resolution: DuplicateResolutionMode;
      body: PromoteStagingRowBody;
      userId: string;
      facilityId: string;
      duplicateCandidates: DuplicateCandidate[];
    }
  ): Promise<PromotionResultPayload> {
    const { row, raw, resolution, body, userId, facilityId, duplicateCandidates } = ctx;

    const conceptCode =
      row.proposedConceptCode?.trim() ||
      `CONCEPT_${cell(raw, "generic_name").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
    const productCode = row.proposedProductCode?.trim();
    const packageCode = row.proposedPackageCode?.trim();
    if (!productCode || !packageCode) {
      throw new BadRequestException("Codes produit et conditionnement requis.");
    }

    let createdConcept = false;
    let createdProduct = false;
    let createdPackage = false;

    let conceptId: string;
    if (resolution === "LINK_TO_EXISTING_CONCEPT" || resolution === "LINK_TO_EXISTING_PRODUCT" || resolution === "NEW_PACKAGE_ONLY") {
      const id = body.existingConceptId;
      if (!id && resolution !== "NEW_PACKAGE_ONLY") {
        throw new BadRequestException("existingConceptId requis.");
      }
      if (id) {
        const existing = await tx.medicationConcept.findUnique({ where: { id } });
        if (!existing) throw new BadRequestException("Concept existant introuvable.");
        conceptId = existing.id;
      } else {
        const byCode = await tx.medicationConcept.findUnique({ where: { code: conceptCode } });
        if (!byCode) throw new BadRequestException("Concept introuvable pour NEW_PACKAGE_ONLY.");
        conceptId = byCode.id;
      }
    } else {
      const existing = await tx.medicationConcept.findUnique({ where: { code: conceptCode } });
      if (existing) {
        throw new ConflictException(`Concept existe déjà: ${conceptCode}`);
      }
      const created = await tx.medicationConcept.create({
        data: {
          code: conceptCode,
          genericName: cell(raw, "generic_name"),
          displayName: cell(raw, "display_name_fr") || cell(raw, "generic_name"),
        },
      });
      conceptId = created.id;
      createdConcept = true;
    }

    const concentrationDisplay = cell(raw, "concentration_display") || "—";
    let concentrationId: string | undefined;
    const conc = await tx.medicationConcentration.create({
      data: { displayText: concentrationDisplay },
    });
    concentrationId = conc.id;

    const routeCode = mapRouteCode(raw);
    await tx.medicationRoute.upsert({
      where: { code: routeCode },
      create: { code: routeCode, label: routeCode },
      update: {},
    });
    const route = await tx.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

    let productId: string;
    if (resolution === "LINK_TO_EXISTING_PRODUCT" || resolution === "NEW_PACKAGE_ONLY") {
      const id = body.existingProductId;
      if (!id) throw new BadRequestException("existingProductId requis.");
      const existing = await tx.medicationProduct.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException("Produit existant introuvable.");
      if (existing.conceptId !== conceptId) {
        throw new BadRequestException("Le produit n'appartient pas au concept cible.");
      }
      productId = existing.id;
    } else if (resolution === "LINK_TO_EXISTING_CONCEPT") {
      const existing = await tx.medicationProduct.findUnique({ where: { code: productCode } });
      if (existing) {
        productId = existing.id;
      } else {
        const created = await this.createProduct(tx, {
          productCode,
          conceptId,
          raw,
          concentrationId,
          routeId: route.id,
          legacyCode: cell(raw, "legacy_catalog_medication_code"),
        });
        productId = created.id;
        createdProduct = true;
      }
    } else {
      const existing = await tx.medicationProduct.findUnique({ where: { code: productCode } });
      if (existing) throw new ConflictException(`Produit existe déjà: ${productCode}`);
      const created = await this.createProduct(tx, {
        productCode,
        conceptId,
        raw,
        concentrationId,
        routeId: route.id,
        legacyCode: cell(raw, "legacy_catalog_medication_code"),
      });
      productId = created.id;
      createdProduct = true;
    }

    const existingPkg = await tx.medicationPackage.findUnique({ where: { code: packageCode } });
    if (existingPkg) throw new ConflictException(`Conditionnement existe déjà: ${packageCode}`);

    const pkg = await tx.medicationPackage.create({
      data: {
        code: packageCode,
        productId,
        packageDescription: cell(raw, "package_description") || packageCode,
        packageType: cell(raw, "package_type").toUpperCase() || "OTHER",
        ndc11: row.ndc11,
        ndcDisplay: cell(raw, "ndc_display") || null,
        isDefaultForProduct: true,
      },
    });
    createdPackage = true;

    await this.ensureProfiles(tx, { conceptId, productId, packageId: pkg.id, row, raw });

    let facilityFormularyItemId: string | null = null;
    const existingFormulary = await tx.facilityFormularyItem.findUnique({
      where: { facilityId_packageId: { facilityId, packageId: pkg.id } },
    });
    if (!existingFormulary) {
      const sortRaw = cell(raw, "sort_priority");
      const boostRaw = cell(raw, "search_boost");
      const item = await tx.facilityFormularyItem.create({
        data: {
          facilityId,
          packageId: pkg.id,
          isOnFormulary: true,
          isEDFormulary: yes(raw, "ed_formulary"),
          favoriteTier: cell(raw, "favorite_tier") || null,
          sortPriority: sortRaw ? parseInt(sortRaw, 10) : null,
          searchBoost: boostRaw ? parseInt(boostRaw, 10) : null,
          allowManualOverride: false,
        },
      });
      facilityFormularyItemId = item.id;
    } else {
      facilityFormularyItemId = existingFormulary.id;
    }

    const aliases = collectPromotionAliases(raw);
    for (const a of aliases) {
      const exists = await tx.medicationSearchAlias.findFirst({
        where: {
          normalizedAlias: a.normalizedAlias,
          OR: [{ conceptId }, { productId }],
        },
      });
      if (exists) continue;
      await tx.medicationSearchAlias.create({
        data: {
          conceptId,
          productId,
          alias: a.alias,
          normalizedAlias: a.normalizedAlias,
          aliasType: a.aliasType,
        },
      });
    }

    const promotedAt = new Date();
    const payload: PromotionResultPayload = {
      stagingRowId: row.id,
      sourceRowId: row.sourceRowId,
      duplicateResolution: resolution,
      conceptId,
      productId,
      packageId: pkg.id,
      facilityFormularyItemId,
      createdConcept,
      createdProduct,
      createdPackage,
      duplicateCandidates,
      promotedAt: promotedAt.toISOString(),
    };

    await tx.medicationFormularyImportStaging.update({
      where: { id: row.id },
      data: {
        importedAt: promotedAt,
        importedByUserId: userId,
        promotionResultJson: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return payload;
  }

  private async createProduct(
    tx: Prisma.TransactionClient,
    params: {
      productCode: string;
      conceptId: string;
      raw: Record<string, string>;
      concentrationId: string;
      routeId: string;
      legacyCode: string;
    }
  ) {
    let legacyCatalogMedicationId: string | undefined;
    if (params.legacyCode) {
      const legacy = await tx.catalogMedication.findUnique({
        where: { code: params.legacyCode },
        select: { id: true },
      });
      if (legacy) legacyCatalogMedicationId = legacy.id;
    }

    const adminType = cell(params.raw, "administration_type").toUpperCase() || "OTHER";
    const billingClass =
      cell(params.raw, "hydration_vs_therapeutic").toUpperCase() === "HYDRATION"
        ? "HYDRATION"
        : cell(params.raw, "billing_class").toUpperCase() || "UNKNOWN";

    return tx.medicationProduct.create({
      data: {
        code: params.productCode,
        conceptId: params.conceptId,
        legacyCatalogMedicationId,
        strengthDisplay: cell(params.raw, "concentration_display") || "—",
        concentrationId: params.concentrationId,
        dosageForm: cell(params.raw, "dosage_form") || "unknown",
        defaultRouteId: params.routeId,
        administrationType: adminType,
        billingClass,
        governanceStatus: "REVIEW_REQUIRED",
      },
    });
  }

  private async ensureProfiles(
    tx: Prisma.TransactionClient,
    ctx: {
      conceptId: string;
      productId: string;
      packageId: string;
      row: { hcpcsCodeSuggested: string | null };
      raw: Record<string, string>;
    }
  ) {
    const { conceptId, productId, packageId, row, raw } = ctx;

    const safetyExists = await tx.medicationSafetyProfile.findUnique({ where: { conceptId } });
    if (!safetyExists) {
      await tx.medicationSafetyProfile.create({
        data: {
          conceptId,
          isHighAlert: yes(raw, "high_alert"),
          highAlertCategories: cell(raw, "high_alert_category")
            ? [cell(raw, "high_alert_category")]
            : undefined,
          lasaGroupId: cell(raw, "lasa_risk") !== "none" ? cell(raw, "lasa_risk") : null,
          isControlled: yes(raw, "controlled_substance"),
          controlledSchedule: cell(raw, "controlled_schedule") || null,
        },
      });
    }

    const adminExists = await tx.medicationAdministrationProfile.findUnique({ where: { productId } });
    if (!adminExists) {
      const infusion = yes(raw, "infusion_capable");
      await tx.medicationAdministrationProfile.create({
        data: {
          productId,
          defaultMarWorkflow: mapMarWorkflow(raw),
          requiresInfusionSession: infusion,
          allowsPartialDose: yes(raw, "allows_partial_dose"),
          allowsWasteDocumentation: yes(raw, "allows_waste_documentation"),
          hydrationFluid: cell(raw, "hydration_vs_therapeutic").toUpperCase() === "HYDRATION",
        },
      });
    }

    if (yes(raw, "infusion_capable")) {
      const infExists = await tx.infusionProfile.findUnique({ where: { productId } });
      if (!infExists) {
        await tx.infusionProfile.create({
          data: {
            productId,
            infusionType: cell(raw, "infusion_type").toUpperCase() || "THERAPEUTIC",
            requiresStopMarForBilling: true,
          },
        });
      }
    }

    const billingExists = await tx.medicationBillingProfile.findFirst({ where: { packageId } });
    if (!billingExists) {
      const wastage = cell(raw, "wastage_billable").toLowerCase();
      await tx.medicationBillingProfile.create({
        data: {
          packageId,
          hcpcsCodeSuggested: row.hcpcsCodeSuggested,
          hcpcsUnitType: cell(raw, "hcpcs_unit_type") || null,
          revenueCodeSuggested: cell(raw, "revenue_code_suggested") || null,
          billableUnitRule: cell(raw, "billing_unit_strategy").toUpperCase() || "UNKNOWN",
          companionProcedureCptSuggested: cell(raw, "companion_procedure_cpt_suggested") || null,
          wastageBillable: wastage === "yes" || wastage === "y",
          requiresManualReview: true,
        },
      });
    }
  }
}
