import { Injectable } from "@nestjs/common";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  type BillingEvent,
} from "@prisma/client";
import {
  billingLedgerRowIsInformationalNonBillable,
  billingLedgerRowMissingBillableCodeBlocksReadiness,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildEncounterClaimValidation,
  type ClaimEncounterValidation,
} from "./claim-validation.util";

export type {
  ClaimEncounterValidation,
  ClaimEncounterValidationMeta,
  ClaimPackageInput,
  ClaimValidationLineRef,
  ClaimValidationIssue,
  ClaimValidationIssueCode,
  ClaimPackageValidation,
} from "./claim-validation.util";

/** How this line was routed from `BillingEvent.billingSide` (arrays may still duplicate BOTH rows per package). */
export type ClaimLineOriginSide = "professional" | "facility" | "both";

/** Single service line for professional or facility claim assembly (Phase 5 — no submission). */
export type ClaimLine = {
  code: string;
  codeType: "CPT" | "HCPCS";
  description: string;
  sourceModule: BillingSourceModule;
  quantity: number;
  unitPrice?: number;
  /** Source routing: BOTH events duplicate the same line on pro + fac packages; UI may collapse identical pairs. */
  originSide: ClaimLineOriginSide;
  /** Present when >1: identical routed rows merged (same merge key within this package). */
  mergedFromCount?: number;
  /** When drug HCPCS + admin CPT share one ledger row (MAR-style). */
  companionCode?: string;
  companionCodeType?: "CPT" | "HCPCS";
  /** For ENCOUNTER_EM dedup: newest row wins. */
  billingEventId?: string;
  eventCreatedAt?: string;
};

export type ClaimPackage = {
  lines: ClaimLine[];
  totalLines: number;
  missingCodes: number;
  ready: boolean;
};

export type EncounterClaimsResult = {
  professional: ClaimPackage;
  facility: ClaimPackage;
  summary: {
    totalLines: number;
    missingCodes: number;
    ready: boolean;
  };
  /** Phase 5.2 — deterministic validation (blockers vs warnings). */
  validation: ClaimEncounterValidation;
};

type CodePart = {
  code: string;
  codeType: "CPT" | "HCPCS";
  companionCode?: string;
  companionCodeType?: "CPT" | "HCPCS";
};

/**
 * Phase 5.1 prep — normalize free-text route for future CPT/rules (not used for inference yet).
 * Deterministic lowercase trim + a few canonical synonyms.
 */
export function normalizeRouteForFutureUse(route: string): string {
  const raw = route.trim();
  if (!raw) return "";
  let n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe");
  if (/\binjectable\b/.test(n)) n = n.replace(/\binjectable\b/g, "injection");
  if (/\borale\b/.test(n)) n = n.replace(/\borale\b/g, "po");
  return n.trim();
}

function omitFromClaimAssembly(ev: Pick<BillingEvent, "sourceModule" | "codeType" | "procedureCode" | "hcpcsCode" | "code">): boolean {
  if (billingLedgerRowIsInformationalNonBillable(ev)) return true;
  if (ev.codeType === BillingCodeType.ICD10_CM) return true;
  return false;
}

function isMedAdminModule(sm: BillingSourceModule): boolean {
  const s = sm as string;
  return s === "MED_ADMIN" || s === "MEDICATION_ADMINISTRATION";
}

function extractCodeParts(ev: BillingEvent): CodePart[] {
  const parts: CodePart[] = [];
  const pc = ev.procedureCode?.trim();
  const hc = ev.hcpcsCode?.trim();
  const c = ev.code?.trim();

  if (pc) parts.push({ code: pc, codeType: "CPT" });
  if (hc) parts.push({ code: hc, codeType: "HCPCS" });

  if (parts.length > 0) return collapseMedicationDualCodes(ev, parts);

  if (c) {
    if (ev.codeType === BillingCodeType.CPT) parts.push({ code: c, codeType: "CPT" });
    else if (ev.codeType === BillingCodeType.HCPCS) parts.push({ code: c, codeType: "HCPCS" });
    else if (ev.codeType === BillingCodeType.INTERNAL || ev.codeType === BillingCodeType.UNKNOWN || ev.codeType == null) {
      parts.push({ code: c, codeType: "CPT" });
    }
  }

  return collapseMedicationDualCodes(ev, parts.filter((p) => p.code.trim().toUpperCase() !== "UNMAPPED"));
}

/** Drug HCPCS + admin CPT on the same MAR ledger row → one claim line (do not split). */
function collapseMedicationDualCodes(ev: BillingEvent, parts: CodePart[]): CodePart[] {
  if (!isMedAdminModule(ev.sourceModule) || parts.length !== 2) return parts;
  const cpt = parts.find((p) => p.codeType === "CPT");
  const hcpcs = parts.find((p) => p.codeType === "HCPCS");
  if (!cpt || !hcpcs) return parts;
  return [
    {
      code: cpt.code,
      codeType: "CPT",
      companionCode: hcpcs.code,
      companionCodeType: "HCPCS",
    },
  ];
}

function routePartToTargets(side: BillingSide, part: CodePart): ("professional" | "facility")[] {
  /* Combined drug + admin on one row: same logical line on both packages (no split by UNKNOWN). */
  if (part.companionCode && part.companionCodeType) {
    return ["professional", "facility"];
  }
  if (side === BillingSide.BOTH) return ["professional", "facility"];
  if (side === BillingSide.PROFESSIONAL) return ["professional"];
  if (side === BillingSide.FACILITY) return ["facility"];
  return part.codeType === "CPT" ? ["professional"] : ["facility"];
}

function packageMissingDeltasForBlockingEventNoLines(ev: BillingEvent): { prof: number; fac: number } {
  switch (ev.billingSide) {
    case BillingSide.BOTH:
      return { prof: 1, fac: 1 };
    case BillingSide.PROFESSIONAL:
      return { prof: 1, fac: 0 };
    case BillingSide.FACILITY:
      return { prof: 0, fac: 1 };
    default:
      return { prof: 1, fac: 1 };
  }
}

function originSideForLine(ev: BillingEvent, target: "professional" | "facility"): ClaimLineOriginSide {
  if (ev.billingSide === BillingSide.BOTH) return "both";
  if (ev.billingSide === BillingSide.PROFESSIONAL) return "professional";
  if (ev.billingSide === BillingSide.FACILITY) return "facility";
  return target === "professional" ? "professional" : "facility";
}

function toClaimLine(ev: BillingEvent, part: CodePart, target: "professional" | "facility"): ClaimLine {
  const qty = ev.units != null && ev.units > 0 ? ev.units : 1;
  const price = ev.priceSnapshot != null ? Number(ev.priceSnapshot) : undefined;
  const line: ClaimLine = {
    code: part.code,
    codeType: part.codeType,
    description: ev.descriptionSnapshot?.trim() || "",
    sourceModule: ev.sourceModule,
    quantity: qty,
    unitPrice: price != null && Number.isFinite(price) ? price : undefined,
    originSide: originSideForLine(ev, target),
    billingEventId: ev.id,
    eventCreatedAt: ev.createdAt.toISOString(),
  };
  if (part.companionCode && part.companionCodeType) {
    line.companionCode = part.companionCode;
    line.companionCodeType = part.companionCodeType;
  }
  return line;
}

/** Merge key: code + codeType + sourceModule + originSide (+ companion pair when present). No description/price. */
function claimLineMergeKey(line: ClaimLine): string {
  return [
    line.code,
    line.codeType,
    line.companionCode ?? "",
    line.companionCodeType ?? "",
    line.sourceModule,
    line.originSide,
  ].join("\0");
}

/**
 * Deterministic merge within one package: same merge key → one row, quantities summed.
 */
export function mergeClaimLinesForPackage(lines: ClaimLine[]): ClaimLine[] {
  const ordered = [...lines].sort(compareClaimLinesClinically);
  const map = new Map<string, ClaimLine>();
  for (const line of ordered) {
    const key = claimLineMergeKey(line);
    const existing = map.get(key);
    if (!existing) {
      const { mergedFromCount: _m, ...rest } = line;
      map.set(key, { ...rest, mergedFromCount: 1 });
    } else {
      existing.quantity += line.quantity;
      existing.mergedFromCount = (existing.mergedFromCount ?? 1) + 1;
    }
  }
  return Array.from(map.values()).sort(compareClaimLinesClinically);
}

/** Keep newest ENCOUNTER_EM line per package when multiple ledger rows exist (deterministic by `eventCreatedAt`). */
function dedupeEncounterEmLines(lines: ClaimLine[]): { lines: ClaimLine[]; suppressedCount: number } {
  const em = lines.filter((l) => (l.sourceModule as string) === "ENCOUNTER_EM");
  if (em.length <= 1) return { lines, suppressedCount: 0 };
  let winner = em[0]!;
  for (const l of em) {
    if ((l.eventCreatedAt ?? "").localeCompare(winner.eventCreatedAt ?? "") > 0) winner = l;
  }
  const keepId = winner.billingEventId;
  if (!keepId) return { lines, suppressedCount: 0 };
  const out: ClaimLine[] = [];
  let suppressed = 0;
  for (const l of lines) {
    if ((l.sourceModule as string) !== "ENCOUNTER_EM") {
      out.push(l);
      continue;
    }
    if (l.billingEventId === keepId) out.push(l);
    else suppressed++;
  }
  return { lines: out.sort(compareClaimLinesClinically), suppressedCount: suppressed };
}

type RoutedLine = {
  target: "professional" | "facility";
  line: ClaimLine;
};

const CLAIM_LINE_MODULE_PRIORITY: Record<string, number> = {
  ENCOUNTER_EM: 1,
  PROCEDURE: 2,
  LAB_RESULT: 3,
  IMAGING_RESULT: 4,
  MED_ADMIN: 5,
};

function claimLineModulePriority(m: BillingSourceModule): number {
  return CLAIM_LINE_MODULE_PRIORITY[m] ?? 100;
}

function compareClaimLinesClinically(a: ClaimLine, b: ClaimLine): number {
  const pa = claimLineModulePriority(a.sourceModule);
  const pb = claimLineModulePriority(b.sourceModule);
  if (pa !== pb) return pa - pb;
  const byCode = a.code.localeCompare(b.code);
  if (byCode !== 0) return byCode;
  const cc = (a.companionCode ?? "").localeCompare(b.companionCode ?? "");
  if (cc !== 0) return cc;
  return a.sourceModule.localeCompare(b.sourceModule);
}

type AssemblyCtx = {
  blockingNoExtractBoth: number;
  blockingNoExtractUnknown: number;
  medAdminHcpcsWithoutProcedure: number;
  multipleEmSuppressedProf: number;
  multipleEmSuppressedFac: number;
};

/**
 * Deterministic claim assembly from billing ledger rows (Phase 5).
 * Does not modify BillingEvent rows or existing capture logic.
 */
export function buildEncounterClaimsFromEvents(events: BillingEvent[]): EncounterClaimsResult {
  const active = events.filter(
    (e) => e.reviewStatus !== BillingReviewStatus.VOIDED && e.reviewStatus !== BillingReviewStatus.SKIPPED
  );

  let summaryMissing = 0;
  for (const ev of active) {
    if (billingLedgerRowMissingBillableCodeBlocksReadiness(ev)) summaryMissing++;
  }

  const routed: RoutedLine[] = [];
  let professionalMissing = 0;
  let facilityMissing = 0;
  let blockingNoExtractBoth = 0;
  let blockingNoExtractUnknown = 0;
  let medAdminHcpcsWithoutProcedure = 0;

  for (const ev of active) {
    if (omitFromClaimAssembly(ev)) continue;

    const parts = extractCodeParts(ev);
    if (isMedAdminModule(ev.sourceModule) && parts.length >= 1) {
      const singleHcpcsOnly =
        parts.length === 1 && parts[0].codeType === "HCPCS" && !parts[0].companionCode;
      if (singleHcpcsOnly) medAdminHcpcsWithoutProcedure++;
    }
    const blocks = billingLedgerRowMissingBillableCodeBlocksReadiness(ev);

    if (parts.length === 0) {
      if (blocks) {
        const d = packageMissingDeltasForBlockingEventNoLines(ev);
        professionalMissing += d.prof;
        facilityMissing += d.fac;
        if (ev.billingSide === BillingSide.BOTH) blockingNoExtractBoth++;
        if (ev.billingSide === BillingSide.UNKNOWN) blockingNoExtractUnknown++;
      }
      continue;
    }

    for (const part of parts) {
      for (const target of routePartToTargets(ev.billingSide, part)) {
        if (blocks) {
          if (target === "professional") professionalMissing++;
          else facilityMissing++;
        }
        routed.push({
          target,
          line: toClaimLine(ev, part, target),
        });
      }
    }
  }

  const profRouted = routed.filter((r) => r.target === "professional");
  const facRouted = routed.filter((r) => r.target === "facility");

  let profLinesRaw = profRouted.map((r) => r.line);
  let facLinesRaw = facRouted.map((r) => r.line);

  const emP = dedupeEncounterEmLines(profLinesRaw);
  const emF = dedupeEncounterEmLines(facLinesRaw);
  profLinesRaw = emP.lines;
  facLinesRaw = emF.lines;

  const profLines = mergeClaimLinesForPackage(profLinesRaw);
  const facLines = mergeClaimLinesForPackage(facLinesRaw);

  const ctx: AssemblyCtx = {
    blockingNoExtractBoth,
    blockingNoExtractUnknown,
    medAdminHcpcsWithoutProcedure,
    multipleEmSuppressedProf: emP.suppressedCount,
    multipleEmSuppressedFac: emF.suppressedCount,
  };

  const professional: ClaimPackage = {
    lines: profLines,
    totalLines: profLines.length,
    missingCodes: professionalMissing,
    ready: professionalMissing === 0,
  };
  const facility: ClaimPackage = {
    lines: facLines,
    totalLines: facLines.length,
    missingCodes: facilityMissing,
    ready: facilityMissing === 0,
  };

  const validation = buildEncounterClaimValidation(
    active,
    omitFromClaimAssembly,
    {
      ...professional,
      claimLines: profLines.map((l) => ({
        sourceModule: l.sourceModule as string,
        code: l.code,
        mergedFromCount: l.mergedFromCount,
      })),
    },
    {
      ...facility,
      claimLines: facLines.map((l) => ({
        sourceModule: l.sourceModule as string,
        code: l.code,
        mergedFromCount: l.mergedFromCount,
      })),
    },
    summaryMissing,
    ctx
  );

  return {
    professional,
    facility,
    summary: {
      totalLines: professional.totalLines + facility.totalLines,
      missingCodes: summaryMissing,
      ready: summaryMissing === 0,
    },
    validation,
  };
}

@Injectable()
export class ClaimBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async buildEncounterClaims(facilityId: string, encounterId: string): Promise<EncounterClaimsResult> {
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId },
      orderBy: [{ sourceModule: "asc" }, { serviceDate: "desc" }, { createdAt: "desc" }],
    });
    return buildEncounterClaimsFromEvents(events);
  }
}
