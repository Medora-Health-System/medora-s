import { Injectable } from "@nestjs/common";
import {
  normalizeIcd10CodeForLookup,
  parseProductUiLanguage,
  resolveIcd10DiagnosisDisplay,
  type Icd10CatalogDisplaySource,
  type Icd10DiagnosisDisplayResult,
  type Icd10TerminologyDisplayRow,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

const TERMINOLOGY_DISPLAY_SELECT = {
  icd10CatalogId: true,
  codeSystem: true,
  releaseVersion: true,
  code: true,
  locale: true,
  preferredLabel: true,
  labelRegister: true,
  provenance: true,
  exactness: true,
  sourceId: true,
  terminologyVersion: true,
  sourcePriority: true,
  status: true,
  isEffective: true,
} as const;

export type Icd10CatalogTerminologySource = Icd10CatalogDisplaySource & { id: string };

@Injectable()
export class Icd10TerminologyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bounded set-based resolution for N catalog rows (search/list, N ≤ 50/200).
   * One terminology query for FR/ES. EN skips terminology (official catalog English only).
   * Reuses P2 resolveIcd10DiagnosisDisplay — no second precedence engine.
   */
  async resolveDisplaysForCatalogRows(input: {
    locale: string;
    catalogRows: readonly Icd10CatalogTerminologySource[];
  }): Promise<Map<string, Icd10DiagnosisDisplayResult>> {
    const out = new Map<string, Icd10DiagnosisDisplayResult>();
    if (input.catalogRows.length === 0) return out;

    const unique: Icd10CatalogTerminologySource[] = [];
    const seen = new Set<string>();
    for (const row of input.catalogRows) {
      if (!row.id || seen.has(row.id)) continue;
      seen.add(row.id);
      unique.push(row);
    }

    const language = parseProductUiLanguage(input.locale);
    const terminologyRows: Array<Icd10TerminologyDisplayRow & { icd10CatalogId: string }> =
      language === "en" || language == null || unique.length === 0
        ? []
        : await this.prisma.icd10DiagnosisTerminology.findMany({
            where: {
              icd10CatalogId: { in: unique.map((row) => row.id) },
              locale: language,
            },
            select: TERMINOLOGY_DISPLAY_SELECT,
          });

    const rowsByCatalogId = new Map<string, Icd10TerminologyDisplayRow[]>();
    for (const row of terminologyRows) {
      const list = rowsByCatalogId.get(row.icd10CatalogId) ?? [];
      list.push(row);
      rowsByCatalogId.set(row.icd10CatalogId, list);
    }

    for (const catalog of unique) {
      out.set(
        catalog.id,
        resolveIcd10DiagnosisDisplay({
          codeSystem: catalog.codeSystem,
          releaseVersion: catalog.releaseVersion,
          code: catalog.code,
          locale: input.locale,
          catalog,
          terminologyRows: rowsByCatalogId.get(catalog.id) ?? [],
        }),
      );
    }
    return out;
  }

  async resolveIcd10DiagnosisDisplay(input: {
    codeSystem: string;
    releaseVersion: string;
    code: string;
    locale: string;
  }): Promise<Icd10DiagnosisDisplayResult> {
    const normalizedCode = normalizeIcd10CodeForLookup(input.code);
    const catalog = normalizedCode
      ? await this.prisma.icd10DiagnosisCode.findFirst({
          where: {
            codeSystem: input.codeSystem,
            releaseVersion: input.releaseVersion,
            normalizedCode,
          },
          select: {
            id: true,
            code: true,
            codeSystem: true,
            releaseVersion: true,
            shortDescription: true,
            longDescription: true,
          },
        })
      : null;

    if (!catalog) {
      return resolveIcd10DiagnosisDisplay({
        codeSystem: input.codeSystem,
        releaseVersion: input.releaseVersion,
        code: input.code,
        locale: input.locale,
        catalog: null,
        terminologyRows: [],
      });
    }

    const resolved = await this.resolveDisplaysForCatalogRows({
      locale: input.locale,
      catalogRows: [catalog],
    });
    return (
      resolved.get(catalog.id) ??
      resolveIcd10DiagnosisDisplay({
        codeSystem: input.codeSystem,
        releaseVersion: input.releaseVersion,
        code: catalog.code,
        locale: input.locale,
        catalog,
        terminologyRows: [],
      })
    );
  }
}
