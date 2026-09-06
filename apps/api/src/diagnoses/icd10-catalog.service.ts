import { BadRequestException, Injectable } from "@nestjs/common";
import {
  mapIcd10ExactnessToDisplayResolution,
  normalizeIcd10CodeForLookup,
  selectOfficialIcd10CmReleaseVersionForDateOfService,
  type ProductUiLanguage,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildIcd10CatalogSearchMatch,
  buildIcd10CatalogSearchSelectSql,
  type Icd10CatalogSearchRow,
} from "./icd10-catalog-search.query";
import { Icd10TerminologyService } from "./icd10-terminology.service";

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 50;

export type Icd10CatalogSearchHit = Icd10CatalogSearchRow & {
  displayLabel: string;
  displayResolution: "EXACT_SOURCE_LABEL" | "EXACT_GOVERNED_LABEL" | "UNLOCALIZED_CODE";
};

export type Icd10CatalogSearchOptions = {
  dateOfService?: string;
  releaseVersion?: string;
};

function resolveSearchReleaseVersion(options?: Icd10CatalogSearchOptions): string {
  try {
    const explicit = options?.releaseVersion?.trim();
    if (explicit) return explicit;
    const date = options?.dateOfService?.trim() || new Date().toISOString().slice(0, 10);
    return selectOfficialIcd10CmReleaseVersionForDateOfService(date);
  } catch (err) {
    throw new BadRequestException(err instanceof Error ? err.message : "Invalid ICD-10-CM date of service");
  }
}

@Injectable()
export class Icd10CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly terminology: Icd10TerminologyService,
  ) {}

  async search(
    q: string,
    locale: ProductUiLanguage,
    limit = DEFAULT_SEARCH_LIMIT,
    options?: Icd10CatalogSearchOptions,
  ) {
    const raw = q?.trim() ?? "";
    const take = Math.min(Math.max(1, limit), MAX_SEARCH_LIMIT);
    if (!raw) {
      return { items: [] as const, limit: take };
    }

    const match = buildIcd10CatalogSearchMatch(raw, locale);
    if (!match) {
      return { items: [] as const, limit: take };
    }

    const releaseVersion = resolveSearchReleaseVersion(options);
    const selectSql = buildIcd10CatalogSearchSelectSql(match, take, { releaseVersion, locale });
    const catalogItems =
      typeof this.prisma.$transaction === "function"
        ? await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('jit', 'off', true)`;
            return tx.$queryRaw<Icd10CatalogSearchRow[]>(selectSql);
          })
        : await this.prisma.$queryRaw<Icd10CatalogSearchRow[]>(selectSql);

    const displays = await this.terminology.resolveDisplaysForCatalogRows({
      locale,
      catalogRows: catalogItems.map((row) => ({
        id: row.id,
        code: row.code,
        codeSystem: row.codeSystem,
        releaseVersion: row.releaseVersion,
        shortDescription: row.shortDescription,
        longDescription: row.longDescription,
      })),
    });

    const items: Icd10CatalogSearchHit[] = catalogItems.map((row) => {
      const display = displays.get(row.id);
      return {
        ...row,
        displayLabel: display?.displayName ?? row.code,
        displayResolution: display
          ? mapIcd10ExactnessToDisplayResolution(display.exactness)
          : "UNLOCALIZED_CODE",
      };
    });

    return { items, limit: take };
  }

  async findByCode(codeParam: string, options?: Icd10CatalogSearchOptions) {
    const raw = codeParam?.trim() ?? "";
    if (!raw) return null;
    const norm = normalizeIcd10CodeForLookup(raw);
    const releaseVersion = resolveSearchReleaseVersion(options);
    const select = {
      id: true,
      code: true,
      normalizedCode: true,
      shortDescription: true,
      longDescription: true,
      chapter: true,
      category: true,
      isBillable: true,
      effectiveYear: true,
      codeSetVersion: true,
      releaseVersion: true,
    } as const;
    const byNorm = await this.prisma.icd10DiagnosisCode.findFirst({
      where: {
        normalizedCode: norm,
        isActive: true,
        isSelectable: true,
        releaseVersion,
      },
      select,
    });
    if (byNorm) return byNorm;
    return this.prisma.icd10DiagnosisCode.findFirst({
      where: { code: raw, isActive: true, isSelectable: true, releaseVersion },
      select,
    });
  }
}
