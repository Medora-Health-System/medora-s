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
};

type CodePart = { code: string; codeType: "CPT" | "HCPCS" };

function omitFromClaimAssembly(ev: Pick<BillingEvent, "sourceModule" | "codeType" | "procedureCode" | "hcpcsCode" | "code">): boolean {
  if (billingLedgerRowIsInformationalNonBillable(ev)) return true;
  if (ev.codeType === BillingCodeType.ICD10_CM) return true;
  return false;
}

function extractCodeParts(ev: BillingEvent): CodePart[] {
  const parts: CodePart[] = [];
  const pc = ev.procedureCode?.trim();
  const hc = ev.hcpcsCode?.trim();
  const c = ev.code?.trim();

  if (pc) parts.push({ code: pc, codeType: "CPT" });
  if (hc) parts.push({ code: hc, codeType: "HCPCS" });

  if (parts.length > 0) return parts;

  if (c) {
    if (ev.codeType === BillingCodeType.CPT) parts.push({ code: c, codeType: "CPT" });
    else if (ev.codeType === BillingCodeType.HCPCS) parts.push({ code: c, codeType: "HCPCS" });
    else if (ev.codeType === BillingCodeType.INTERNAL || ev.codeType === BillingCodeType.UNKNOWN || ev.codeType == null) {
      parts.push({ code: c, codeType: "CPT" });
    }
  }

  return parts.filter((p) => p.code.trim().toUpperCase() !== "UNMAPPED");
}

function routePartToTargets(side: BillingSide, part: CodePart): ("professional" | "facility")[] {
  if (side === BillingSide.BOTH) return ["professional", "facility"];
  if (side === BillingSide.PROFESSIONAL) return ["professional"];
  if (side === BillingSide.FACILITY) return ["facility"];
  return part.codeType === "CPT" ? ["professional"] : ["facility"];
}

/**
 * When a blocking event has no extractable codes (e.g. UNMAPPED-only), attribute missing readiness
 * to each package that would have received lines from this row (same rules as billingSide / UNKNOWN).
 */
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
  return {
    code: part.code,
    codeType: part.codeType,
    description: ev.descriptionSnapshot?.trim() || "",
    sourceModule: ev.sourceModule,
    quantity: qty,
    unitPrice: price != null && Number.isFinite(price) ? price : undefined,
    originSide: originSideForLine(ev, target),
  };
}

type RoutedLine = {
  target: "professional" | "facility";
  line: ClaimLine;
};

/** Clinical display order for claim lines (lower = earlier). Other modules sort after MED_ADMIN. */
const CLAIM_LINE_MODULE_PRIORITY: Partial<Record<BillingSourceModule, number>> = {
  [BillingSourceModule.ENCOUNTER_EM]: 1,
  [BillingSourceModule.PROCEDURE]: 2,
  [BillingSourceModule.LAB_RESULT]: 3,
  [BillingSourceModule.IMAGING_RESULT]: 4,
  [BillingSourceModule.MED_ADMIN]: 5,
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
  return a.sourceModule.localeCompare(b.sourceModule);
}

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

  for (const ev of active) {
    if (omitFromClaimAssembly(ev)) continue;

    const parts = extractCodeParts(ev);
    const blocks = billingLedgerRowMissingBillableCodeBlocksReadiness(ev);

    if (parts.length === 0) {
      /* No billable codes to list (e.g. uncoded / UNMAPPED only). Do not emit placeholder lines;
       * package missing counts still reflect per-package readiness when the event blocks. */
      if (blocks) {
        const d = packageMissingDeltasForBlockingEventNoLines(ev);
        professionalMissing += d.prof;
        facilityMissing += d.fac;
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

  const profLines = profRouted.map((r) => r.line);
  const facLines = facRouted.map((r) => r.line);
  profLines.sort(compareClaimLinesClinically);
  facLines.sort(compareClaimLinesClinically);

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

  return {
    professional,
    facility,
    summary: {
      totalLines: professional.totalLines + facility.totalLines,
      missingCodes: summaryMissing,
      ready: summaryMissing === 0,
    },
  };
}

@Injectable()
export class ClaimBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads ledger rows for the encounter and returns professional vs facility claim packages.
   */
  async buildEncounterClaims(facilityId: string, encounterId: string): Promise<EncounterClaimsResult> {
    const events = await this.prisma.billingEvent.findMany({
      where: { facilityId, encounterId },
      orderBy: [{ sourceModule: "asc" }, { serviceDate: "desc" }, { createdAt: "desc" }],
    });
    return buildEncounterClaimsFromEvents(events);
  }
}
