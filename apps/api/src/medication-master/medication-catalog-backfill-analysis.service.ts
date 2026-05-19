import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { deriveMedicationProductCode } from "./derive-medication-product-code.util";

export type CatalogBackfillRowCategory =
  | "READY_MAPPING"
  | "AMBIGUOUS"
  | "NDC_PACKAGE_REVIEW"
  | "INACTIVE_SKIPPED";

export type CatalogBackfillAnalysisRow = {
  catalogMedicationId: string;
  catalogCode: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  proposedConceptCode: string;
  proposedProductCode: string;
  proposedPackageCode: string;
  category: CatalogBackfillRowCategory;
  reasons: string[];
  hasNdc11: boolean;
};

export type CatalogBackfillAnalysisSummary = {
  totalCatalogRows: number;
  readyMapping: number;
  ambiguous: number;
  ndcPackageReview: number;
  inactiveSkipped: number;
  duplicateProductCodeGroups: number;
};

export type CatalogBackfillAnalysisResult = {
  dryRun: true;
  summary: CatalogBackfillAnalysisSummary;
  rows: CatalogBackfillAnalysisRow[];
};

const CATALOG_SELECT = {
  id: true,
  code: true,
  genericName: true,
  strength: true,
  dosageForm: true,
  route: true,
  ndc11: true,
  isActive: true,
} as const;

type CatalogRow = Prisma.CatalogMedicationGetPayload<{ select: typeof CATALOG_SELECT }>;

@Injectable()
export class MedicationCatalogBackfillAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read-only analysis: maps legacy `CatalogMedication` → proposed concept/product/package codes.
   * Does not write to MedicationConcept / MedicationProduct / MedicationPackage.
   */
  async analyzeCatalogBackfill(): Promise<CatalogBackfillAnalysisResult> {
    const catalog = await this.prisma.catalogMedication.findMany({
      select: CATALOG_SELECT,
      orderBy: { code: "asc" },
    });

    const rows: CatalogBackfillAnalysisRow[] = [];
    const productCodeCounts = new Map<string, number>();

    for (const med of catalog) {
      const analyzed = this.analyzeRow(med);
      rows.push(analyzed);
      if (analyzed.category !== "INACTIVE_SKIPPED") {
        productCodeCounts.set(
          analyzed.proposedProductCode,
          (productCodeCounts.get(analyzed.proposedProductCode) ?? 0) + 1
        );
      }
    }

    const duplicateProductCodeGroups = [...productCodeCounts.values()].filter((c) => c > 1).length;

    const summary: CatalogBackfillAnalysisSummary = {
      totalCatalogRows: catalog.length,
      readyMapping: rows.filter((r) => r.category === "READY_MAPPING").length,
      ambiguous: rows.filter((r) => r.category === "AMBIGUOUS").length,
      ndcPackageReview: rows.filter((r) => r.category === "NDC_PACKAGE_REVIEW").length,
      inactiveSkipped: rows.filter((r) => r.category === "INACTIVE_SKIPPED").length,
      duplicateProductCodeGroups,
    };

    return { dryRun: true, summary, rows };
  }

  private analyzeRow(med: CatalogRow): CatalogBackfillAnalysisRow {
    const reasons: string[] = [];
    const generic = (med.genericName ?? med.code).trim();
    const strength = (med.strength ?? "").trim();
    const dosageForm = (med.dosageForm ?? "unknown").trim();
    const route = (med.route ?? "unknown").trim();

    if (!med.isActive) {
      return this.buildRow(med, generic, "INACTIVE_SKIPPED", ["Catalog row inactive"], strength, dosageForm, route);
    }

    if (!med.genericName?.trim()) reasons.push("missing_generic_name");
    if (!med.strength?.trim()) reasons.push("missing_strength");
    if (!med.dosageForm?.trim()) reasons.push("missing_dosage_form");
    if (!med.route?.trim()) reasons.push("missing_route");

    const hasNdc11 = Boolean(med.ndc11 && /^\d{11}$/.test(med.ndc11));

    let category: CatalogBackfillRowCategory;
    if (reasons.length > 0) {
      category = "AMBIGUOUS";
    } else if (!hasNdc11) {
      category = "NDC_PACKAGE_REVIEW";
      reasons.push("missing_ndc11_for_package");
    } else {
      category = "READY_MAPPING";
    }

    return this.buildRow(med, generic, category, reasons, strength, dosageForm, route, hasNdc11);
  }

  private buildRow(
    med: CatalogRow,
    generic: string,
    category: CatalogBackfillRowCategory,
    reasons: string[],
    strength: string,
    dosageForm: string,
    route: string,
    hasNdc11 = Boolean(med.ndc11 && /^\d{11}$/.test(med.ndc11))
  ): CatalogBackfillAnalysisRow {
    const conceptSlug = generic
      .toUpperCase()
      .replace(/\s*\+\s*/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
    const proposedConceptCode = `CONCEPT_${conceptSlug || med.code}`;

    let proposedProductCode: string;
    try {
      proposedProductCode =
        med.code ||
        deriveMedicationProductCode({
          genericName: generic,
          strength: strength || "0",
          dosageForm,
          route,
        });
    } catch {
      proposedProductCode = med.code;
      reasons.push("derive_product_code_failed");
    }

    const proposedPackageCode = `${proposedProductCode}_PKG_DEFAULT`;

    return {
      catalogMedicationId: med.id,
      catalogCode: med.code,
      genericName: med.genericName,
      strength: med.strength,
      dosageForm: med.dosageForm,
      route: med.route,
      proposedConceptCode,
      proposedProductCode,
      proposedPackageCode,
      category,
      reasons,
      hasNdc11,
    };
  }
}
