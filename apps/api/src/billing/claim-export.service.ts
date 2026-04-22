import { Injectable, NotFoundException } from "@nestjs/common";
import type { BillingEvent } from "@prisma/client";
import {
  billingLedgerDiagnosisStringHasCode,
  billingLedgerRowIsDiagnosisLedgerLine,
  type EncounterClaimExportResult,
  type ClaimExportHeader,
  type ClaimExportLine,
  type ClaimExportPackage,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ClaimBuilderService, type ClaimLine } from "./claim-builder.service";
import type { ClaimValidationIssue } from "./claim-validation.util";
import { evaluateClaimIdentityGaps } from "./claim-billing-identity.util";
import { evaluateClaimCompleteness } from "./claim-completeness.util";

function issueCodes(issues: ClaimValidationIssue[]): string[] {
  return [...new Set(issues.map((i) => i.code))];
}

function isExportableCode(code: string): boolean {
  const c = code.trim();
  return c.length > 0 && c.toUpperCase() !== "UNMAPPED";
}

function collectDiagnosisCodesForEncounter(events: BillingEvent[]): string[] {
  const set = new Set<string>();
  for (const ev of events) {
    const raw = ev.diagnosisCodes?.trim();
    if (raw && billingLedgerDiagnosisStringHasCode(raw)) {
      for (const part of raw.split(";")) {
        const p = part.trim();
        if (p) set.add(p);
      }
    }
    if (billingLedgerRowIsDiagnosisLedgerLine(ev.sourceModule) && ev.code?.trim()) {
      set.add(ev.code.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function buildEventModifierMap(events: BillingEvent[]): Map<string, Pick<BillingEvent, "modifier1" | "modifier2" | "revenueCode">> {
  const m = new Map<string, Pick<BillingEvent, "modifier1" | "modifier2" | "revenueCode">>();
  for (const ev of events) {
    m.set(ev.id, {
      modifier1: ev.modifier1,
      modifier2: ev.modifier2,
      revenueCode: ev.revenueCode,
    });
  }
  return m;
}

function serviceDateRangeIso(events: BillingEvent[]): { start: string | null; end: string | null } {
  const times = events
    .filter((e) => e.serviceDate != null)
    .map((e) => e.serviceDate!.getTime())
    .sort((a, b) => a - b);
  if (times.length === 0) return { start: null, end: null };
  return {
    start: new Date(times[0]!).toISOString(),
    end: new Date(times[times.length - 1]!).toISOString(),
  };
}

function mapClaimLinesToExport(
  lines: ClaimLine[],
  eventMods: Map<string, Pick<BillingEvent, "modifier1" | "modifier2" | "revenueCode">>
): ClaimExportLine[] {
  const out: ClaimExportLine[] = [];
  let lineNumber = 0;
  for (const line of lines) {
    if (!isExportableCode(line.code)) continue;
    if (line.companionCode && !isExportableCode(line.companionCode)) continue;
    lineNumber++;
    const evId = line.billingEventId;
    const mods = evId ? eventMods.get(evId) : undefined;
    out.push({
      lineNumber,
      code: line.code.trim(),
      codeType: line.codeType,
      companionCode: line.companionCode?.trim() ?? null,
      companionCodeType: line.companionCodeType ?? null,
      description: line.description?.trim() ? line.description : null,
      quantity: line.quantity,
      sourceModule: String(line.sourceModule),
      originSide: line.originSide,
      modifier1: mods?.modifier1?.trim() ? mods.modifier1 : null,
      modifier2: mods?.modifier2?.trim() ? mods.modifier2 : null,
      revenueCode: mods?.revenueCode?.trim() ? mods.revenueCode : null,
    });
  }
  return out;
}

function packageReady(hasLines: boolean, blockers: ClaimValidationIssue[]): boolean {
  return hasLines && blockers.length === 0;
}

@Injectable()
export class ClaimExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claimBuilder: ClaimBuilderService
  ) {}

  async buildEncounterClaimExport(facilityId: string, encounterId: string): Promise<EncounterClaimExportResult> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        providerId: true,
        physicianAssignedUserId: true,
        admittedAt: true,
        dischargedAt: true,
        createdAt: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const claims = await this.claimBuilder.buildEncounterClaims(facilityId, encounterId);
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId },
      orderBy: [{ sourceModule: "asc" }, { serviceDate: "desc" }, { createdAt: "desc" }],
    });

    const diagnosisCodes = collectDiagnosisCodesForEncounter(events);
    const eventMods = buildEventModifierMap(events);
    const svcDates = serviceDateRangeIso(events);

    const attendingProviderId = encounter.physicianAssignedUserId ?? null;
    const renderingProviderId = encounter.providerId ?? null;

    const contextWarnings: string[] = [];
    if (!attendingProviderId && !renderingProviderId) {
      contextWarnings.push("EXPORT_CONTEXT_NO_PROVIDER_ON_ENCOUNTER");
    }
    if (!svcDates.start && !encounter.admittedAt) {
      contextWarnings.push("EXPORT_CONTEXT_NO_SERVICE_DATE_RANGE");
    }

    const serviceStartDate = svcDates.start ?? (encounter.admittedAt ? encounter.admittedAt.toISOString() : null);
    const serviceEndDate = svcDates.end ?? (encounter.dischargedAt ? encounter.dischargedAt.toISOString() : null);

    const serviceDateForIdentity = svcDates.start
      ? new Date(svcDates.start)
      : encounter.admittedAt ?? encounter.createdAt ?? null;

    const claimIdentityGaps = await evaluateClaimIdentityGaps(this.prisma, {
      facilityId,
      patientId: encounter.patientId,
      serviceDate: serviceDateForIdentity,
      renderingProviderId: encounter.providerId ?? null,
      attendingProviderId: encounter.physicianAssignedUserId ?? null,
      includeFacilityInstitutionalGaps: true,
    });
    const claimIdentityReady = claimIdentityGaps.length === 0;

    const v = claims.validation;
    const summaryBlockers = issueCodes(v.summary.blockers);
    const summaryWarnings = issueCodes(v.summary.warnings);

    const profLines = mapClaimLinesToExport(claims.professional.lines, eventMods);
    const facLines = mapClaimLinesToExport(claims.facility.lines, eventMods);

    const profBlockers = issueCodes(v.professional.blockers);
    const profWarnings = issueCodes(v.professional.warnings);
    const facBlockers = issueCodes(v.facility.blockers);
    const facWarnings = issueCodes(v.facility.warnings);

    const completeness = evaluateClaimCompleteness({
      identityGaps: claimIdentityGaps,
      encounterValidationSummaryBlockers: summaryBlockers,
      encounterValidationSummaryWarnings: summaryWarnings,
      professionalBlockers: profBlockers,
      professionalWarnings: profWarnings,
      facilityBlockers: facBlockers,
      facilityWarnings: facWarnings,
      contextWarnings,
      diagnosisCodes,
      hasProfessionalPackage: profLines.length > 0,
      hasFacilityPackage: facLines.length > 0,
      facilityExportLines: facLines,
    });

    const profHeader: ClaimExportHeader = {
      encounterId,
      patientId: encounter.patientId,
      facilityId,
      claimType: "PROFESSIONAL",
      ready: completeness.claimReady && packageReady(profLines.length > 0, v.professional.blockers),
      blockers: profBlockers,
      warnings: profWarnings,
      diagnosisCodes,
      attendingProviderId,
      renderingProviderId,
      serviceStartDate,
      serviceEndDate,
    };

    const facHeader: ClaimExportHeader = {
      encounterId,
      patientId: encounter.patientId,
      facilityId,
      claimType: "FACILITY",
      ready: completeness.claimReady && packageReady(facLines.length > 0, v.facility.blockers),
      blockers: facBlockers,
      warnings: facWarnings,
      diagnosisCodes,
      attendingProviderId,
      renderingProviderId,
      serviceStartDate,
      serviceEndDate,
    };

    const professional: ClaimExportPackage | null =
      profLines.length > 0 ? { header: profHeader, lines: profLines } : null;

    const facility: ClaimExportPackage | null = facLines.length > 0 ? { header: facHeader, lines: facLines } : null;

    return {
      professional,
      facility,
      summary: {
        readyForExport: completeness.claimReady,
        blockers: summaryBlockers,
        warnings: summaryWarnings,
        ...(contextWarnings.length > 0 ? { contextWarnings } : {}),
        claimIdentityGaps,
        claimIdentityReady,
        claimReady: completeness.claimReady,
        claimBlockers: completeness.blockers,
        claimWarnings: completeness.warnings,
        claimInfo: completeness.info,
      },
    };
  }
}
