/**
 * MEDUI.LAB.REF.1 — NestJS enterprise lab reference / critical resolver (DB-backed).
 * Care settings (ED / IP / Obs / Clinic / Dental) share this single authority.
 */

import { Injectable } from "@nestjs/common";
import {
  applyLabReferenceSnapshotToObservation,
  formatResolvedReferenceText,
  normalizeLabAliasCode,
  resolveLabCriticalValue,
  resolveLabReferenceInterval,
  type LabCriticalPolicyCandidate,
  type LabIntervalCandidate,
  type LabObservationReferenceSnapshot,
  type LabPatientSexInput,
  type ResolvedLabCriticalValue,
  type ResolvedLabReferenceInterval,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

export type LabRefResolveContext = {
  facilityId: string;
  canonicalAnalyteId: string;
  patientDemographics: {
    sex?: LabPatientSexInput;
    ageYears?: number | null;
    pregnancy?: "NOT_PREGNANT" | "PREGNANT" | "UNKNOWN" | null;
  };
  specimen?: string | null;
  unit?: string | null;
  methodOrAnalyzer?: string | null;
  collectedAt: Date;
};

@Injectable()
export class LabReferenceIntervalService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCanonicalAnalyteIdByAlias(aliasOrCode: string | null | undefined): Promise<{
    id: string;
    code: string;
    defaultLoincCode: string | null;
  } | null> {
    const key = normalizeLabAliasCode(aliasOrCode);
    if (!key) return null;

    const byCode = await this.prisma.canonicalLabAnalyte.findFirst({
      where: { code: key, isActive: true },
      select: { id: true, code: true, defaultLoincCode: true },
    });
    if (byCode) return byCode;

    const alias = await this.prisma.canonicalLabAnalyteAlias.findUnique({
      where: { aliasCode: key },
      include: {
        analyte: { select: { id: true, code: true, defaultLoincCode: true, isActive: true } },
      },
    });
    if (!alias?.analyte?.isActive) return null;
    return {
      id: alias.analyte.id,
      code: alias.analyte.code,
      defaultLoincCode: alias.analyte.defaultLoincCode,
    };
  }

  async resolveReferenceInterval(ctx: LabRefResolveContext): Promise<ResolvedLabReferenceInterval> {
    const [facilityRows, canonicalRows] = await Promise.all([
      this.prisma.facilityLabReferenceIntervalOverride.findMany({
        where: {
          facilityId: ctx.facilityId,
          canonicalLabAnalyteId: ctx.canonicalAnalyteId,
          status: "ACTIVE",
        },
      }),
      this.prisma.labReferenceInterval.findMany({
        where: {
          canonicalLabAnalyteId: ctx.canonicalAnalyteId,
          status: "ACTIVE",
        },
      }),
    ]);

    return resolveLabReferenceInterval({
      facilityId: ctx.facilityId,
      canonicalAnalyteId: ctx.canonicalAnalyteId,
      patientDemographics: ctx.patientDemographics,
      specimen: ctx.specimen,
      unit: ctx.unit,
      methodOrAnalyzer: ctx.methodOrAnalyzer,
      collectedAt: ctx.collectedAt,
      facilityIntervals: facilityRows.map(mapIntervalRow),
      canonicalIntervals: canonicalRows.map(mapIntervalRow),
    });
  }

  async resolveCriticalValue(
    ctx: LabRefResolveContext & { patientValue: string | number | null | undefined }
  ): Promise<ResolvedLabCriticalValue> {
    const policies = await this.prisma.labCriticalValuePolicy.findMany({
      where: {
        canonicalLabAnalyteId: ctx.canonicalAnalyteId,
        status: "ACTIVE",
        OR: [{ facilityId: null }, { facilityId: ctx.facilityId }],
      },
    });

    return resolveLabCriticalValue({
      facilityId: ctx.facilityId,
      canonicalAnalyteId: ctx.canonicalAnalyteId,
      patientDemographics: ctx.patientDemographics,
      specimen: ctx.specimen,
      unit: ctx.unit,
      methodOrAnalyzer: ctx.methodOrAnalyzer,
      collectedAt: ctx.collectedAt,
      patientValue: ctx.patientValue,
      policies: policies.map(mapCriticalRow),
    });
  }

  async resolvePanelObservationsForAuthoring(args: {
    facilityId: string;
    panelCode: "CBC" | "BMP" | "CMP";
    patientDemographics: LabRefResolveContext["patientDemographics"];
    collectedAt?: Date;
  }) {
    const panel = await this.prisma.labPanelDefinition.findUnique({
      where: { code: args.panelCode },
      include: {
        members: {
          orderBy: { sortOrder: "asc" },
          include: {
            analyte: {
              select: { id: true, code: true, displayNameEn: true, defaultLoincCode: true },
            },
          },
        },
      },
    });
    if (!panel) {
      return { panelCode: args.panelCode, observations: [] as const };
    }

    const collectedAt = args.collectedAt ?? new Date();
    const isCbc = args.panelCode === "CBC";
    const specimen = isCbc ? "WHOLE_BLOOD_EDTA" : "SERUM";
    const methodOrAnalyzer = isCbc ? "Sysmex_XN_9000" : null;

    const observations = [];
    for (const m of panel.members) {
      const analyte = m.analyte;
      const unitHint = m.unitHint;
      const resolved = await this.resolveReferenceInterval({
        facilityId: args.facilityId,
        canonicalAnalyteId: analyte.id,
        patientDemographics: args.patientDemographics,
        specimen,
        unit: unitHint,
        methodOrAnalyzer,
        collectedAt,
      });

      const refText = formatResolvedReferenceText(resolved);
      observations.push({
        code: analyte.code,
        name: analyte.displayNameEn,
        value: "",
        unit: resolved.unit ?? unitHint ?? "",
        referenceLow: resolved.low,
        referenceHigh: resolved.high,
        referenceText: refText ?? "",
        flag: null as null,
        canonicalAnalyteId: analyte.id,
        canonicalAnalyteCode: analyte.code,
        loincCode: resolved.loincCode ?? analyte.defaultLoincCode,
        intervalAuthority: resolved.authority,
        intervalId: resolved.intervalId,
        intervalSourceName: resolved.sourceName,
        intervalSourceIdentifier: resolved.sourceIdentifier,
        intervalSourceUrl: resolved.sourceUrl,
      });
    }

    return { panelCode: args.panelCode, observations };
  }

  /**
   * Snapshot resolved authority into LAB structured observations at verification.
   * Locked snapshots are preserved (historical medical-record integrity).
   */
  async snapshotLabResultObservations(args: {
    facilityId: string;
    resultData: unknown;
    patientDemographics: LabRefResolveContext["patientDemographics"];
    collectedAt: Date;
    specimen?: string | null;
    methodOrAnalyzer?: string | null;
  }): Promise<unknown> {
    if (!args.resultData || typeof args.resultData !== "object" || Array.isArray(args.resultData)) {
      return args.resultData;
    }
    const data = args.resultData as Record<string, unknown>;
    if (data.resultType !== "LAB" || !Array.isArray(data.observations)) {
      return args.resultData;
    }

    const nextObservations: unknown[] = [];
    for (const raw of data.observations) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        nextObservations.push(raw);
        continue;
      }
      const obs = raw as {
        code?: string;
        name: string;
        value: string;
        unit?: string | null;
        referenceLow?: number | null;
        referenceHigh?: number | null;
        referenceText?: string | null;
        flag?: string | null;
        referenceSnapshot?: LabObservationReferenceSnapshot | null;
      };

      if (obs.referenceSnapshot?.locked) {
        nextObservations.push(obs);
        continue;
      }

      const analyte = await this.resolveCanonicalAnalyteIdByAlias(obs.code ?? obs.name);
      if (!analyte) {
        nextObservations.push(
          applyLabReferenceSnapshotToObservation({
            observation: obs,
            canonicalAnalyteId: null,
            canonicalAnalyteCode: null,
            resolved: unresolvedInterval(),
            critical: emptyCritical(),
            preserveLocked: true,
          })
        );
        continue;
      }

      const resolved = await this.resolveReferenceInterval({
        facilityId: args.facilityId,
        canonicalAnalyteId: analyte.id,
        patientDemographics: args.patientDemographics,
        specimen: args.specimen,
        unit: obs.unit,
        methodOrAnalyzer: args.methodOrAnalyzer,
        collectedAt: args.collectedAt,
      });

      const critical = await this.resolveCriticalValue({
        facilityId: args.facilityId,
        canonicalAnalyteId: analyte.id,
        patientDemographics: args.patientDemographics,
        specimen: args.specimen,
        unit: obs.unit,
        methodOrAnalyzer: args.methodOrAnalyzer,
        collectedAt: args.collectedAt,
        patientValue: obs.value,
      });

      nextObservations.push(
        applyLabReferenceSnapshotToObservation({
          observation: obs,
          canonicalAnalyteId: analyte.id,
          canonicalAnalyteCode: analyte.code,
          resolved: {
            ...resolved,
            loincCode: resolved.loincCode ?? analyte.defaultLoincCode,
          },
          critical,
          preserveLocked: true,
        })
      );
    }

    return { ...data, observations: nextObservations };
  }
}

function mapIntervalRow(row: {
  id: string;
  specimen: string | null;
  unit: string | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
  sexApplicability: string;
  pregnancyApplicability: string;
  methodOrAnalyzer: string | null;
  low: number | null;
  high: number | null;
  textualInterval: string | null;
  loincCode: string | null;
  sourceName: string | null;
  sourceIdentifier: string | null;
  sourceUrl: string | null;
  sourceVersion?: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: string;
}): LabIntervalCandidate {
  return {
    id: row.id,
    specimen: row.specimen,
    unit: row.unit,
    ageMinYears: row.ageMinYears,
    ageMaxYears: row.ageMaxYears,
    sexApplicability: row.sexApplicability as LabIntervalCandidate["sexApplicability"],
    pregnancyApplicability:
      row.pregnancyApplicability as LabIntervalCandidate["pregnancyApplicability"],
    methodOrAnalyzer: row.methodOrAnalyzer,
    low: row.low,
    high: row.high,
    textualInterval: row.textualInterval,
    loincCode: row.loincCode,
    sourceName: row.sourceName,
    sourceIdentifier: row.sourceIdentifier,
    sourceUrl: row.sourceUrl,
    sourceVersion: row.sourceVersion ?? null,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    status: row.status,
  };
}

function mapCriticalRow(row: {
  id: string;
  facilityId: string | null;
  specimen: string | null;
  unit: string | null;
  ageMinYears: number | null;
  ageMaxYears: number | null;
  sexApplicability: string;
  methodOrAnalyzer: string | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  textualCritical: string | null;
  sourceName: string | null;
  sourceIdentifier: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  status: string;
}): LabCriticalPolicyCandidate {
  return {
    id: row.id,
    facilityId: row.facilityId,
    specimen: row.specimen,
    unit: row.unit,
    ageMinYears: row.ageMinYears,
    ageMaxYears: row.ageMaxYears,
    sexApplicability: row.sexApplicability as LabCriticalPolicyCandidate["sexApplicability"],
    methodOrAnalyzer: row.methodOrAnalyzer,
    criticalLow: row.criticalLow,
    criticalHigh: row.criticalHigh,
    textualCritical: row.textualCritical,
    sourceName: row.sourceName,
    sourceIdentifier: row.sourceIdentifier,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    status: row.status,
  };
}

function unresolvedInterval(): ResolvedLabReferenceInterval {
  return {
    authority: "UNRESOLVED",
    intervalId: null,
    low: null,
    high: null,
    textualInterval: null,
    unit: null,
    loincCode: null,
    specimen: null,
    methodOrAnalyzer: null,
    sourceName: null,
    sourceIdentifier: null,
    sourceUrl: null,
    sourceVersion: null,
  };
}

function emptyCritical(): ResolvedLabCriticalValue {
  return {
    status: null,
    policyId: null,
    facilityScoped: false,
    criticalLow: null,
    criticalHigh: null,
    textualCritical: null,
    sourceName: null,
  };
}
