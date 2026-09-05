import { Injectable } from "@nestjs/common";
import {
  normalizeIcd10CodeForLookup,
  resolveIcd10DiagnosisDisplay,
  type Icd10DiagnosisDisplayResult,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class Icd10TerminologyService {
  constructor(private readonly prisma: PrismaService) {}

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

    const terminologyRows = catalog
      ? await this.prisma.icd10DiagnosisTerminology.findMany({
          where: { icd10CatalogId: catalog.id },
          select: {
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
          },
        })
      : [];

    return resolveIcd10DiagnosisDisplay({
      codeSystem: input.codeSystem,
      releaseVersion: input.releaseVersion,
      code: catalog?.code ?? input.code,
      locale: input.locale,
      catalog,
      terminologyRows,
    });
  }
}
