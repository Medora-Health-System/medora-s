import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { AuditAction, MedicationMarWorkflow, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { MedicationProductActivationGovernanceService } from "./medication-product-activation-governance.service";
import { MedicationProductGovernanceService } from "./medication-product-governance.service";
import type { ControlledCatalogMedicationCommitBody } from "./dto/controlled-catalog-import.dto";
import { buildControlledCatalogMedicationCodes } from "./controlled-catalog-import-code.util";
import {
  classifyControlledMedicationRow,
  controlledMedicationMatchKey,
  type ControlledCatalogMedicationClassification,
  type ExistingMedicationMatch,
} from "./controlled-catalog-import-risk.util";
import {
  enrichMedicationXlsxOptionalColumns,
  parseControlledMedicationUpload,
  type ControlledCatalogMedicationParsedRow,
} from "./controlled-catalog-import-parse.util";
import { normalizeMedicationNameForMatch } from "./priority-er-inventory-match-normalize.util";
import { mergeProductRuntimeActivation } from "./medication-product-runtime-activation.util";
import { HIGH_RISK_PENDING_GOVERNANCE_STATUS } from "./medication-product-governance.constants";
import { highRiskMedicationReasonCodes } from "./medication-global-baseline-tier-rules.util";
import {
  defaultHighRiskImportMeta,
  mergeHighRiskImportMeta,
  type HighRiskImportMeta,
} from "./medication-high-risk-import-meta.util";

export type ControlledCatalogMedicationRowResult = {
  rowKey: string;
  rowNumber: number;
  medication: string;
  dose: string;
  form: string;
  ndc11: string | null;
  price: string | null;
  exactSourceText: string;
  classification: ControlledCatalogMedicationClassification;
  existingProductId: string | null;
  existingConceptId: string | null;
};

export type ControlledCatalogMedicationDryRunResult = {
  dryRun: true;
  fingerprint: string;
  filename: string;
  counts: Record<ControlledCatalogMedicationClassification, number>;
  rows: ControlledCatalogMedicationRowResult[];
};

export type ControlledCatalogOrderSearchBlocked = {
  rowKey: string;
  rowNumber: number;
  medication: string;
  productId: string;
  reason: string;
  blockers?: string[];
};

export type ControlledCatalogMedicationCommitResult = {
  dryRun: false;
  fingerprint: string;
  committed: number;
  skipped: number;
  highRiskQueued: number;
  orderSearchEnabled: number;
  orderSearchBlocked: ControlledCatalogOrderSearchBlocked[];
  productIds: string[];
  counts: Record<ControlledCatalogMedicationClassification, number>;
};

function extractHttpErrorDetail(error: unknown): { message: string; blockers?: string[] } {
  if (error instanceof BadRequestException) {
    const res = error.getResponse();
    if (typeof res === "object" && res !== null) {
      const o = res as Record<string, unknown>;
      const msg = typeof o.message === "string" ? o.message : "Requête invalide.";
      const blockers = Array.isArray(o.blockers)
        ? (o.blockers as string[])
        : Array.isArray(o.blockingReasons)
          ? (o.blockingReasons as string[])
          : undefined;
      return { message: msg, blockers };
    }
    if (typeof res === "string") return { message: res };
  }
  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Erreur inconnue lors de l'activation." };
}

function mapRouteCode(formExact: string): string {
  const upper = formExact.trim().toUpperCase();
  if (!upper) return "OTHER";
  if (upper.length <= 16 && /^[A-Z0-9_]+$/.test(upper)) return upper;
  return "OTHER";
}

function fingerprintRows(rows: ControlledCatalogMedicationParsedRow[], filename: string): string {
  const payload = rows.map((r) => `${r.rowKey}|${r.medication}|${r.dose}|${r.form}`).join("\n");
  return createHash("sha256").update(`${filename}\n${payload}`).digest("hex").slice(0, 16);
}

@Injectable()
export class ControlledCatalogImportMedicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly explorer: MedicationMasterExplorerService,
    private readonly productGovernance: MedicationProductGovernanceService,
    private readonly activationGovernance: MedicationProductActivationGovernanceService
  ) {}

  async dryRun(buffer: Buffer, filename: string): Promise<ControlledCatalogMedicationDryRunResult> {
    const rows = this.loadMedicationRows(buffer, filename);
    const classified = await this.classifyRows(rows);
    const counts = this.countByClassification(classified);
    return {
      dryRun: true,
      fingerprint: fingerprintRows(rows, filename),
      filename,
      counts,
      rows: classified,
    };
  }

  async commit(
    buffer: Buffer,
    filename: string,
    body: ControlledCatalogMedicationCommitBody,
    userId: string,
    callerFacilityId: string | undefined,
    auditMeta?: { ip?: string; userAgent?: string }
  ): Promise<ControlledCatalogMedicationCommitResult> {
    this.explorer.assertFacilityScope(body.facilityId, callerFacilityId);

    if (body.enableProviderOrderSearch) {
      if (!body.confirmOrderSearchEnablement) {
        throw new BadRequestException(
          "Confirmation requise pour activer la recherche de prescription."
        );
      }
      if (!body.confirmMarRemainsOff) {
        throw new BadRequestException("Confirmation requise : le MAR reste désactivé.");
      }
      if (!body.confirmBillingRemainsOff) {
        throw new BadRequestException("Confirmation requise : la facturation reste désactivée.");
      }
      if (!body.note?.trim()) {
        throw new BadRequestException("Une note de gouvernance est requise pour l’activation de recherche.");
      }
    }

    const rows = this.loadMedicationRows(buffer, filename);
    const classified = await this.classifyRows(rows);
    const counts = this.countByClassification(classified);
    const safeRows = classified.filter((r) => r.classification === "SAFE_LOW_RISK");
    const highRiskRows = classified.filter((r) => r.classification === "HIGH_RISK_MANUAL_REVIEW");

    const productIds: string[] = [];
    const createdRows: Array<{ row: ControlledCatalogMedicationRowResult; productId: string }> = [];
    let orderSearchEnabled = 0;
    let highRiskQueued = 0;
    const orderSearchBlocked: ControlledCatalogOrderSearchBlocked[] = [];
    const importFingerprint = fingerprintRows(rows, filename);

    // Phase A — catalog only (inactive); never roll back on order-search failures.
    for (const row of safeRows) {
      const created = await this.createInactiveMedicationRow(row, body.facilityId);
      productIds.push(created.productId);
      createdRows.push({ row, productId: created.productId });
    }

    // Phase A2 — high-risk rows enter approval queue (inactive, not provider-searchable).
    for (const row of highRiskRows) {
      try {
        const reasonCodes = highRiskMedicationReasonCodes(
          [row.medication, row.dose, row.form].join(" ")
        );
        const highRiskMeta = defaultHighRiskImportMeta({
          sourceFilename: filename,
          sourceFingerprint: importFingerprint,
          sourceRowNumber: row.rowNumber,
          sourceRowKey: row.rowKey,
          classificationReasonCodes: reasonCodes.length ? reasonCodes : ["HIGH_RISK_MEDICATION"],
          importedAt: new Date().toISOString(),
        });
        const created = await this.createInactiveMedicationRow(row, body.facilityId, {
          governanceStatus: HIGH_RISK_PENDING_GOVERNANCE_STATUS,
          isHighAlert: true,
          highRiskImport: highRiskMeta,
        });
        productIds.push(created.productId);
        highRiskQueued += 1;

        await this.audit.log(AuditAction.CREATE, "HIGH_RISK_MEDICATION_IMPORTED", {
          userId,
          facilityId: body.facilityId,
          entityId: created.productId,
          critical: true,
          ip: auditMeta?.ip,
          userAgent: auditMeta?.userAgent,
          metadata: {
            productCode: created.productId,
            sourceRowKey: row.rowKey,
            sourceRowNumber: row.rowNumber,
            classificationReasonCodes: highRiskMeta.classificationReasonCodes,
            sourceFingerprint: importFingerprint,
          },
        });
      } catch (e) {
        // Duplicate canonical — skip silently (counts already reflect high-risk classification).
        if (!(e instanceof ConflictException)) throw e;
      }
    }

    // Phase B — optional provider order search (separate per row).
    if (body.enableProviderOrderSearch) {
      const note = body.note!.trim();
      for (const { row, productId } of createdRows) {
        try {
          await this.enableProviderOrderSearchForProduct(
            productId,
            body.facilityId,
            userId,
            note,
            auditMeta
          );
          orderSearchEnabled += 1;
        } catch (e) {
          const detail = extractHttpErrorDetail(e);
          orderSearchBlocked.push({
            rowKey: row.rowKey,
            rowNumber: row.rowNumber,
            medication: row.medication,
            productId,
            reason: detail.message,
            blockers: detail.blockers,
          });
        }
      }
    }

    await this.audit.log(AuditAction.CREATE, "CONTROLLED_CATALOG_MEDICATION_IMPORT", {
      userId,
      facilityId: body.facilityId,
      critical: true,
      ip: auditMeta?.ip,
      userAgent: auditMeta?.userAgent,
      metadata: {
        filename,
        fingerprint: importFingerprint,
        committed: safeRows.length,
        skipped: classified.length - safeRows.length - highRiskRows.length,
        highRiskQueued,
        orderSearchEnabled,
        orderSearchBlockedCount: orderSearchBlocked.length,
        enableProviderOrderSearch: body.enableProviderOrderSearch,
        counts,
      },
    });

    return {
      dryRun: false,
      fingerprint: importFingerprint,
      committed: safeRows.length,
      skipped: classified.length - safeRows.length - highRiskRows.length,
      highRiskQueued,
      orderSearchEnabled,
      orderSearchBlocked,
      productIds,
      counts,
    };
  }

  /** Public wrapper for high-risk review queue provider-order activation. */
  async activateProviderOrderSearchForImport(
    productId: string,
    facilityId: string,
    userId: string,
    note: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    return this.enableProviderOrderSearchForProduct(
      productId,
      facilityId,
      userId,
      note,
      auditMeta
    );
  }

  private loadMedicationRows(buffer: Buffer, filename: string): ControlledCatalogMedicationParsedRow[] {
    let rows = parseControlledMedicationUpload(buffer, filename);
    if (filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")) {
      rows = enrichMedicationXlsxOptionalColumns(buffer, rows);
    }
    return rows;
  }

  private async classifyRows(
    rows: ControlledCatalogMedicationParsedRow[]
  ): Promise<ControlledCatalogMedicationRowResult[]> {
    const index = await this.buildExistingMatchIndex();
    return rows.map((row) => {
      const key = controlledMedicationMatchKey(row.medication, row.dose, row.form);
      const existing = index.get(key) ?? null;
      const classification = classifyControlledMedicationRow(row, existing);
      return {
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        medication: row.medication,
        dose: row.dose,
        form: row.form,
        ndc11: row.ndc11,
        price: row.price,
        exactSourceText: row.exactSourceText,
        classification,
        existingProductId: existing?.productId ?? null,
        existingConceptId: existing?.conceptId ?? null,
      };
    });
  }

  private async buildExistingMatchIndex(): Promise<Map<string, ExistingMedicationMatch>> {
    const products = await this.prisma.medicationProduct.findMany({
      select: {
        id: true,
        code: true,
        conceptId: true,
        strengthDisplay: true,
        dosageForm: true,
        concept: { select: { genericName: true, displayName: true } },
      },
    });
    const map = new Map<string, ExistingMedicationMatch>();
    for (const p of products) {
      const name = p.concept.genericName || p.concept.displayName || "";
      const key = controlledMedicationMatchKey(name, p.strengthDisplay, p.dosageForm);
      if (!key.replace(/\|/g, "").length) continue;
      map.set(key, { conceptId: p.conceptId, productId: p.id, productCode: p.code });
    }
    return map;
  }

  private countByClassification(
    rows: ControlledCatalogMedicationRowResult[]
  ): Record<ControlledCatalogMedicationClassification, number> {
    const counts: Record<ControlledCatalogMedicationClassification, number> = {
      SAFE_LOW_RISK: 0,
      HIGH_RISK_MANUAL_REVIEW: 0,
      MISSING_REQUIRED_FIELDS: 0,
      DUPLICATE_OR_CONFLICT: 0,
    };
    for (const r of rows) counts[r.classification] += 1;
    return counts;
  }

  private async createInactiveMedicationRow(
    row: ControlledCatalogMedicationRowResult,
    facilityId: string,
    options?: {
      governanceStatus?: string;
      isHighAlert?: boolean;
      isControlled?: boolean;
      highRiskImport?: HighRiskImportMeta;
    }
  ): Promise<{ productId: string; conceptId: string; packageId: string; catalogMedicationId: string | null }> {
    const codes = buildControlledCatalogMedicationCodes({
      rowKey: row.rowKey,
      medication: row.medication,
      dose: row.dose,
      form: row.form,
    });

    const conceptDup = await this.prisma.medicationConcept.findUnique({
      where: { code: codes.conceptCode },
    });
    if (conceptDup) {
      throw new ConflictException({
        code: "DUPLICATE_CANONICAL_EXISTS",
        message:
          "Un médicament canonique avec la même source existe déjà — utilisez la gouvernance existante ou modifiez le fichier.",
        conceptId: conceptDup.id,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const concept = await tx.medicationConcept.create({
        data: {
          code: codes.conceptCode,
          genericName: row.medication,
          displayName: row.medication,
          isActive: false,
        },
      });

      const routeCode = mapRouteCode(row.form);
      await tx.medicationRoute.upsert({
        where: { code: routeCode },
        create: { code: routeCode, label: row.form || routeCode },
        update: {},
      });
      const route = await tx.medicationRoute.findUniqueOrThrow({ where: { code: routeCode } });

      const concentration = await tx.medicationConcentration.create({
        data: { displayText: row.dose },
      });

      const governanceStatus = options?.governanceStatus ?? "REVIEW_REQUIRED";
      let governanceNotes = mergeProductRuntimeActivation(null, {});
      if (options?.highRiskImport) {
        governanceNotes = mergeHighRiskImportMeta(governanceNotes, options.highRiskImport);
      }

      const product = await tx.medicationProduct.create({
        data: {
          code: codes.productCode,
          conceptId: concept.id,
          strengthDisplay: row.dose,
          concentrationId: concentration.id,
          dosageForm: row.form,
          defaultRouteId: route.id,
          administrationType: "ORAL",
          billingClass: "UNKNOWN",
          isActive: false,
          governanceStatus,
          governanceNotes,
        },
      });

      const pkg = await tx.medicationPackage.create({
        data: {
          code: codes.packageCode,
          productId: product.id,
          packageDescription: row.exactSourceText,
          packageType: "OTHER",
          ndc11: row.ndc11,
          ndcDisplay: row.ndc11,
          isDefaultForProduct: true,
          isActive: false,
        },
      });

      await tx.medicationSafetyProfile.create({
        data: {
          conceptId: concept.id,
          isHighAlert: options?.isHighAlert ?? false,
          isControlled: options?.isControlled ?? false,
        },
      });
      await tx.medicationAdministrationProfile.create({
        data: {
          productId: product.id,
          defaultMarWorkflow: MedicationMarWorkflow.SINGLE_DOSE,
          requiresInfusionSession: false,
        },
      });

      if (row.ndc11) {
        await tx.medicationBillingProfile.create({
          data: { packageId: pkg.id, requiresManualReview: true },
        });
      }

      const ffi = await tx.facilityFormularyItem.create({
        data: {
          facilityId,
          packageId: pkg.id,
          isOnFormulary: false,
          isEDFormulary: false,
          allowManualOverride: false,
        },
      });
      void ffi;

      const catalogCode = `${codes.productCode}_CAT`.slice(0, 64);
      const catalog = await tx.catalogMedication.create({
        data: {
          code: catalogCode,
          name: row.exactSourceText,
          displayNameEn: row.exactSourceText,
          displayNameFr: row.exactSourceText,
          genericName: row.medication,
          strength: row.dose,
          dosageForm: row.form,
          searchText: normalizeMedicationNameForMatch(row.medication),
          isActive: false,
        },
      });

      await tx.medicationProduct.update({
        where: { id: product.id },
        data: { legacyCatalogMedicationId: catalog.id },
      });

      const aliasNorm = normalizeMedicationNameForMatch(row.medication);
      if (aliasNorm) {
        await tx.medicationSearchAlias.create({
          data: {
            conceptId: concept.id,
            productId: product.id,
            alias: row.medication,
            normalizedAlias: aliasNorm,
            aliasType: "CONTROLLED_IMPORT",
          },
        });
      }

      return {
        productId: product.id,
        conceptId: concept.id,
        packageId: pkg.id,
        catalogMedicationId: catalog.id,
      };
    });
  }

  private async enableProviderOrderSearchForProduct(
    productId: string,
    facilityId: string,
    userId: string,
    note: string,
    auditMeta?: { ip?: string; userAgent?: string }
  ) {
    await this.ensureReadinessForOrderSearch(productId, facilityId);

    await this.productGovernance.approveActivation(
      productId,
      {
        facilityId,
        governanceNote: `Import catalogue contrôlé 19K : ${note}`,
        confirmExactSourcePreserved: true,
        confirmDuplicateGovernanceResolved: true,
      },
      userId,
      auditMeta
    );

    // Controlled import has no Priority ER staging row — approveFormularyInactive requires
    // staging sourceTrace (hasExactSourceFields). Set formulary-approved-inactive runtime directly.
    const existing = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { governanceNotes: true },
    });
    const formularyApprovedAt = new Date().toISOString();
    await this.prisma.medicationProduct.update({
      where: { id: productId },
      data: {
        governanceNotes: mergeProductRuntimeActivation(existing?.governanceNotes, {
          formularyApprovedInactive: true,
          formularyApprovedAt,
        }),
      },
    });

    await this.activationGovernance.enableOrderSearch(
      productId,
      {
        facilityId,
        note,
        confirmExactSourcePreserved: true,
        confirmDuplicateGovernanceResolved: true,
      },
      userId,
      auditMeta
    );

    const linked = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      select: { legacyCatalogMedicationId: true },
    });
    if (linked?.legacyCatalogMedicationId) {
      await this.prisma.catalogMedication.update({
        where: { id: linked.legacyCatalogMedicationId },
        data: { isActive: true },
      });
    }
  }

  private async ensureReadinessForOrderSearch(productId: string, facilityId: string) {
    const product = await this.prisma.medicationProduct.findUnique({
      where: { id: productId },
      include: {
        concept: { include: { safetyProfile: true } },
        administrationProfile: true,
        packages: {
          include: {
            billingProfiles: true,
            facilityFormularyItems: { where: { facilityId } },
          },
        },
      },
    });
    if (!product) return;

    for (const pkg of product.packages) {
      if (!pkg.ndc11?.trim()) {
        const digits = `CTL${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, "").slice(0, 11);
        const ndc = digits.padStart(11, "0").slice(0, 11);
        await this.prisma.medicationPackage.update({
          where: { id: pkg.id },
          data: { ndc11: ndc, ndcDisplay: ndc },
        });
      }
      if (pkg.billingProfiles.length === 0) {
        await this.prisma.medicationBillingProfile.create({
          data: { packageId: pkg.id, requiresManualReview: true },
        });
      }
      if (pkg.facilityFormularyItems.length === 0) {
        await this.prisma.facilityFormularyItem.create({
          data: {
            facilityId,
            packageId: pkg.id,
            isOnFormulary: false,
            isEDFormulary: false,
          },
        });
      }
    }
  }
}
