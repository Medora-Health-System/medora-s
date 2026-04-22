import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ClaimExportLine,
  ClaimExportPackage,
  EncounterClaimExportResult,
  EncounterX12ExportResult,
  X12Segment,
  X12TransactionPreview,
} from "@medora/shared";
import { ClaimExportService } from "./claim-export.service";
import { PrismaService } from "../prisma/prisma.service";
import { x12BuildSegment, x12SegmentsToText } from "./x12-segment-builder.util";

const IMPL_PROF = "005010X222A1";
const IMPL_INST = "005010X223A2";
const TS_REF = "0001";

function isoToYyyymmdd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function isoToHhmmss(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "000000";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}${mm}${ss}`;
}

/** Normalize ICD-10 for HI-style preview (strip dots; Medora may store with or without). */
function normalizeDxForHi(code: string): string {
  return code.trim().replace(/\./g, "");
}

function buildHiDiagnosis(diagnosisCodes: string[]): X12Segment | null {
  if (diagnosisCodes.length === 0) return null;
  const first = normalizeDxForHi(diagnosisCodes[0]!);
  const els: string[] = [`ABK:I10:${first}`];
  for (let i = 1; i < diagnosisCodes.length; i++) {
    els.push(`ABF:I10:${normalizeDxForHi(diagnosisCodes[i]!)}`);
  }
  return x12BuildSegment("HI", els);
}

function buildSv1Professional(line: ClaimExportLine): X12Segment {
  const primary = `HC:${line.code}`;
  const els = [primary, "0", "UN", String(line.quantity), "", "", ""];
  const m1 = line.modifier1?.trim();
  const m2 = line.modifier2?.trim();
  if (m1) els.push(m1);
  if (m2) els.push(m2);
  return x12BuildSegment("SV1", els);
}

function buildSv2Institutional(line: ClaimExportLine, missing: string[]): X12Segment {
  const rev = line.revenueCode?.trim();
  if (!rev) missing.push("MISSING_REVENUE_CODE_ON_LINE");
  const revUse = rev || "0001";
  const code = line.codeType === "HCPCS" ? `HC:${line.code}` : `HC:${line.code}`;
  return x12BuildSegment("SV2", [revUse, code, "0", "UN", String(line.quantity)]);
}

@Injectable()
export class X12837GeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claimExport: ClaimExportService
  ) {}

  async buildEncounterX12Preview(facilityId: string, encounterId: string): Promise<EncounterX12ExportResult> {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true },
    });
    if (!enc) {
      return {
        professional: null,
        facility: null,
        summary: {
          readyForGeneration: false,
          warnings: [],
          missingFields: ["MISSING_ENCOUNTER"],
        },
      };
    }

    let exportResult: EncounterClaimExportResult;
    try {
      exportResult = await this.claimExport.buildEncounterClaimExport(facilityId, encounterId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        return {
          professional: null,
          facility: null,
          summary: {
            readyForGeneration: false,
            warnings: [],
            missingFields: ["MISSING_ENCOUNTER"],
          },
        };
      }
      throw e;
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: enc.patientId },
      select: { firstName: true, lastName: true, mrn: true },
    });
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
      select: { name: true },
    });

    const profPkg = exportResult.professional;
    const facPkg = exportResult.facility;

    const claimIdentityGaps = exportResult.summary.claimIdentityGaps ?? [];

    const headerCtx = profPkg?.header ?? facPkg?.header;
    const rendUserId =
      headerCtx?.resolvedRenderingProviderUserId ??
      headerCtx?.renderingProviderId ??
      headerCtx?.attendingProviderId ??
      null;
    const billUserId =
      headerCtx?.resolvedBillingProviderUserId ??
      headerCtx?.attendingProviderId ??
      headerCtx?.renderingProviderId ??
      null;
    const userIds = [...new Set([rendUserId, billUserId].filter(Boolean))] as string[];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, billingNpi: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const renderingUser = rendUserId ? userById.get(rendUserId) ?? null : null;
    const attendingUser = billUserId ? userById.get(billUserId) ?? null : null;

    const professional = profPkg
      ? this.build837PPreview(profPkg, {
          facilityName: facility?.name ?? null,
          facilityId,
          patient,
          renderingUser,
          attendingUser,
          claimIdentityGaps,
        })
      : null;

    const facilityPrev = facPkg
      ? this.build837IPreview(facPkg, {
          facilityName: facility?.name ?? null,
          facilityId,
          patient,
          renderingUser,
          attendingUser,
          claimIdentityGaps,
        })
      : null;

    const summaryMissing = new Set<string>();
    const summaryWarnings = new Set<string>();
    for (const m of professional?.missingFields ?? []) summaryMissing.add(m);
    for (const m of facilityPrev?.missingFields ?? []) summaryMissing.add(m);
    for (const w of professional?.warnings ?? []) summaryWarnings.add(w);
    for (const w of facilityPrev?.warnings ?? []) summaryWarnings.add(w);
    if (!exportResult.summary.readyForExport) {
      summaryWarnings.add("X12_EXPORT_VALIDATION_NOT_READY");
    }
    for (const w of exportResult.summary.warnings ?? []) summaryWarnings.add(w);
    for (const c of exportResult.summary.contextWarnings ?? []) summaryWarnings.add(c);

    const segCount =
      (professional?.segments.length ?? 0) > 0 || (facilityPrev?.segments.length ?? 0) > 0;
    const readyForGeneration = segCount;

    return {
      professional,
      facility: facilityPrev,
      summary: {
        readyForGeneration,
        warnings: [...summaryWarnings],
        missingFields: [...summaryMissing],
      },
    };
  }

  private build837PPreview(
    pkg: ClaimExportPackage,
    ctx: {
      facilityName: string | null;
      facilityId: string;
      patient: { firstName: string | null; lastName: string | null; mrn: string | null } | null;
      renderingUser: { firstName: string | null; lastName: string | null; billingNpi: string | null } | null;
      attendingUser: { firstName: string | null; lastName: string | null; billingNpi: string | null } | null;
      claimIdentityGaps: string[];
    }
  ): X12TransactionPreview {
    const warnings: string[] = ["X12_837P_PREVIEW_SCAFFOLD_NOT_SUBMISSION_READY"];
    const missingFields: string[] = [];
    const segments: X12Segment[] = [];

    const h = pkg.header;
    const claimRef = h.encounterId.replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "CLAIM";
    const svcDate = h.serviceStartDate ?? h.serviceEndDate;
    const ymd = isoToYyyymmdd(svcDate) ?? isoToYyyymmdd(new Date().toISOString())!;
    const tm = isoToHhmmss(svcDate);

    if (!svcDate) missingFields.push("MISSING_SERVICE_DATE");
    if (h.diagnosisCodes.length === 0) missingFields.push("MISSING_DIAGNOSIS_CODE");
    const resolvedRenderingId =
      h.resolvedRenderingProviderUserId ?? h.renderingProviderId ?? h.attendingProviderId ?? null;
    if (!resolvedRenderingId) missingFields.push("MISSING_RENDERING_PROVIDER");
    const identityProf = ctx.claimIdentityGaps.filter((m) => m !== "MISSING_FACILITY_EXPORT_CONTEXT");
    for (const m of identityProf) missingFields.push(m);

    segments.push(x12BuildSegment("ST", ["837", TS_REF, IMPL_PROF]));
    segments.push(x12BuildSegment("BHT", ["0019", "00", claimRef, ymd, tm, "CH"]));

    const facName = ctx.facilityName?.trim() || "FACILITY";
    segments.push(x12BuildSegment("NM1", ["41", "2", facName, "", "", "", "", "46", h.facilityId]));

    if (ctx.patient?.lastName || ctx.patient?.firstName) {
      segments.push(
        x12BuildSegment("NM1", [
          "QC",
          "1",
          ctx.patient.lastName ?? "",
          ctx.patient.firstName ?? "",
          "",
          "",
          "",
          "MI",
          ctx.patient.mrn ?? h.patientId,
        ])
      );
    } else {
      warnings.push("X12_PATIENT_NAME_FALLBACK_ID");
      segments.push(x12BuildSegment("NM1", ["QC", "1", "UNKNOWN", "PATIENT", "", "", "", "MI", h.patientId]));
    }

    const prov = ctx.renderingUser ?? ctx.attendingUser;
    const npi = prov?.billingNpi?.trim() ?? "";
    if (prov) {
      segments.push(
        x12BuildSegment("NM1", ["82", "1", prov.lastName ?? "", prov.firstName ?? "", "", "", "", "XX", npi])
      );
    } else {
      segments.push(x12BuildSegment("NM1", ["82", "1", "UNKNOWN", "PROVIDER", "", "", "", "XX", ""]));
    }

    segments.push(x12BuildSegment("CLM", [claimRef, "0", "", "", "11", "B", "1", "Y", "A", "Y", "Y"]));

    const hi = buildHiDiagnosis(h.diagnosisCodes);
    if (hi) segments.push(hi);
    else warnings.push("X12_NO_HI_DIAGNOSIS_SEGMENT");

    let lx = 0;
    for (const line of pkg.lines) {
      lx++;
      segments.push(x12BuildSegment("LX", [String(lx)]));
      segments.push(buildSv1Professional(line));
    }

    const seCount = String(segments.length + 1);
    segments.push(x12BuildSegment("SE", [seCount, TS_REF]));

    return {
      kind: "837P",
      segments,
      text: x12SegmentsToText(segments),
      warnings,
      missingFields: [...new Set(missingFields)],
    };
  }

  private build837IPreview(
    pkg: ClaimExportPackage,
    ctx: {
      facilityName: string | null;
      facilityId: string;
      patient: { firstName: string | null; lastName: string | null; mrn: string | null } | null;
      renderingUser: { firstName: string | null; lastName: string | null; billingNpi: string | null } | null;
      attendingUser: { firstName: string | null; lastName: string | null; billingNpi: string | null } | null;
      claimIdentityGaps: string[];
    }
  ): X12TransactionPreview {
    const warnings: string[] = [
      "X12_837I_PREVIEW_SCAFFOLD_NOT_SUBMISSION_READY",
      "X12_837I_INSTITUTIONAL_FIELDS_INCOMPLETE",
    ];
    const missingFields: string[] = [];
    const segments: X12Segment[] = [];

    const h = pkg.header;
    const claimRef = h.encounterId.replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "CLAIM";
    const svcDate = h.serviceStartDate ?? h.serviceEndDate;
    const ymd = isoToYyyymmdd(svcDate) ?? isoToYyyymmdd(new Date().toISOString())!;
    const tm = isoToHhmmss(svcDate);

    if (!svcDate) missingFields.push("MISSING_SERVICE_DATE");
    if (h.diagnosisCodes.length === 0) missingFields.push("MISSING_DIAGNOSIS_CODE");
    const resolvedRenderingId =
      h.resolvedRenderingProviderUserId ?? h.renderingProviderId ?? h.attendingProviderId ?? null;
    if (!resolvedRenderingId) missingFields.push("MISSING_RENDERING_PROVIDER");
    for (const m of ctx.claimIdentityGaps) missingFields.push(m);

    segments.push(x12BuildSegment("ST", ["837", TS_REF, IMPL_INST]));
    segments.push(x12BuildSegment("BHT", ["0019", "00", claimRef, ymd, tm, "CH"]));

    const facName = ctx.facilityName?.trim() || "FACILITY";
    segments.push(x12BuildSegment("NM1", ["41", "2", facName, "", "", "", "", "46", h.facilityId]));

    if (ctx.patient?.lastName || ctx.patient?.firstName) {
      segments.push(
        x12BuildSegment("NM1", [
          "QC",
          "1",
          ctx.patient.lastName ?? "",
          ctx.patient.firstName ?? "",
          "",
          "",
          "",
          "MI",
          ctx.patient.mrn ?? h.patientId,
        ])
      );
    } else {
      segments.push(x12BuildSegment("NM1", ["QC", "1", "UNKNOWN", "PATIENT", "", "", "", "MI", h.patientId]));
    }

    const prov = ctx.renderingUser ?? ctx.attendingUser;
    const npi = prov?.billingNpi?.trim() ?? "";
    if (prov) {
      segments.push(
        x12BuildSegment("NM1", ["82", "1", prov.lastName ?? "", prov.firstName ?? "", "", "", "", "XX", npi])
      );
    } else {
      segments.push(x12BuildSegment("NM1", ["82", "1", "UNKNOWN", "PROVIDER", "", "", "", "XX", ""]));
    }

    segments.push(x12BuildSegment("CLM", [claimRef, "0", "", "", "11", "B", "1", "Y", "A", "Y", "Y"]));

    const hi = buildHiDiagnosis(h.diagnosisCodes);
    if (hi) segments.push(hi);

    const lineMissing: string[] = [];
    let lx = 0;
    for (const line of pkg.lines) {
      lx++;
      segments.push(x12BuildSegment("LX", [String(lx)]));
      const perLineMissing: string[] = [];
      segments.push(buildSv2Institutional(line, perLineMissing));
      for (const m of perLineMissing) lineMissing.push(m);
    }
    for (const m of lineMissing) missingFields.push(m);

    const seCount = String(segments.length + 1);
    segments.push(x12BuildSegment("SE", [seCount, TS_REF]));

    return {
      kind: "837I",
      segments,
      text: x12SegmentsToText(segments),
      warnings,
      missingFields: [...new Set(missingFields)],
    };
  }
}
