import { BadRequestException } from "@nestjs/common";
import { BillingCodeType, BillingReviewStatus, BillingSide, type BillingEvent } from "@prisma/client";
import type { InferredBillingCodeType } from "@medora/shared";
import { inferPrimaryCodeAndType } from "@medora/shared";

export function inferredTypeToPrismaCode(t: InferredBillingCodeType): BillingCodeType {
  if (t === "CPT") return BillingCodeType.CPT;
  if (t === "HCPCS") return BillingCodeType.HCPCS;
  if (t === "ICD10_CM") return BillingCodeType.ICD10_CM;
  if (t === "INTERNAL") return BillingCodeType.INTERNAL;
  return BillingCodeType.UNKNOWN;
}

const ALLOWED_PATCH_KEYS = new Set([
  "reviewStatus",
  "procedureCode",
  "hcpcsCode",
  "diagnosisCodes",
  "descriptionSnapshot",
  "billingSide",
  "serviceDate",
  "revenueCode",
  "modifier1",
  "modifier2",
  "units",
  "codeType",
]);

export type BillingEventPatchResult = {
  data: Pick<
    BillingEvent,
    | "procedureCode"
    | "hcpcsCode"
    | "diagnosisCodes"
    | "code"
    | "codeType"
    | "descriptionSnapshot"
    | "billingSide"
    | "serviceDate"
    | "revenueCode"
    | "modifier1"
    | "modifier2"
    | "units"
    | "reviewStatus"
  >;
  auditDelta: Record<string, { from: unknown; to: unknown }>;
};

function parseOptionalStringField(
  body: Record<string, unknown>,
  key: string,
  max: number
): string | null | undefined {
  if (!(key in body)) return undefined;
  const v = body[key];
  if (v === null) return null;
  if (typeof v !== "string") throw new BadRequestException(`Invalid ${key}`);
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * Merges validated PATCH body onto a BillingEvent row; recomputes primary `code` + `codeType` from coding fields.
 */
export function mergeBillingEventPatch(row: BillingEvent, body: Record<string, unknown>): BillingEventPatchResult {
  const keys = Object.keys(body).filter((k) => body[k] !== undefined);
  if (keys.length === 0) {
    throw new BadRequestException("No updates provided");
  }
  for (const k of keys) {
    if (!ALLOWED_PATCH_KEYS.has(k)) {
      throw new BadRequestException(`Field not allowed: ${k}`);
    }
  }

  let procedureCode = row.procedureCode;
  let hcpcsCode = row.hcpcsCode;
  let diagnosisCodes = row.diagnosisCodes;
  let descriptionSnapshot = row.descriptionSnapshot;
  let billingSide = row.billingSide;
  let serviceDate = row.serviceDate;
  let revenueCode = row.revenueCode;
  let modifier1 = row.modifier1;
  let modifier2 = row.modifier2;
  let units = row.units;
  let reviewStatus = row.reviewStatus;
  let codeTypeExplicit: BillingCodeType | undefined;

  const p = parseOptionalStringField(body, "procedureCode", 32);
  if (p !== undefined) procedureCode = p;
  const h = parseOptionalStringField(body, "hcpcsCode", 32);
  if (h !== undefined) hcpcsCode = h;
  const dx = parseOptionalStringField(body, "diagnosisCodes", 4000);
  if (dx !== undefined) diagnosisCodes = dx;
  const desc = parseOptionalStringField(body, "descriptionSnapshot", 8000);
  if (desc !== undefined) descriptionSnapshot = desc;
  const rev = parseOptionalStringField(body, "revenueCode", 32);
  if (rev !== undefined) revenueCode = rev;
  const m1 = parseOptionalStringField(body, "modifier1", 8);
  if (m1 !== undefined) modifier1 = m1;
  const m2 = parseOptionalStringField(body, "modifier2", 8);
  if (m2 !== undefined) modifier2 = m2;

  if ("billingSide" in body) {
    const v = body.billingSide;
    if (v === null) {
      billingSide = BillingSide.UNKNOWN;
    } else if (typeof v === "string" && Object.values(BillingSide).includes(v as BillingSide)) {
      billingSide = v as BillingSide;
    } else {
      throw new BadRequestException("Invalid billingSide");
    }
  }

  if ("reviewStatus" in body) {
    const v = body.reviewStatus;
    if (typeof v === "string" && Object.values(BillingReviewStatus).includes(v as BillingReviewStatus)) {
      reviewStatus = v as BillingReviewStatus;
    } else {
      throw new BadRequestException("Invalid reviewStatus");
    }
  }

  if ("serviceDate" in body) {
    const v = body.serviceDate;
    if (v === null || v === "") {
      serviceDate = null;
    } else if (typeof v === "string") {
      const ts = Date.parse(v);
      if (Number.isNaN(ts)) throw new BadRequestException("Invalid serviceDate");
      serviceDate = new Date(ts);
    } else {
      throw new BadRequestException("Invalid serviceDate");
    }
  }

  if ("units" in body) {
    const v = body.units;
    if (v === null) {
      units = null;
    } else if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      units = Math.min(Math.floor(v), 999999);
    } else {
      throw new BadRequestException("Invalid units");
    }
  }

  if ("codeType" in body) {
    const v = body.codeType;
    if (v === null) {
      codeTypeExplicit = BillingCodeType.UNKNOWN;
    } else if (typeof v === "string" && Object.values(BillingCodeType).includes(v as BillingCodeType)) {
      codeTypeExplicit = v as BillingCodeType;
    } else {
      throw new BadRequestException("Invalid codeType");
    }
  }

  const inferred = inferPrimaryCodeAndType({
    procedureCode,
    hcpcsCode,
    diagnosisCodes,
  });
  const code = inferred.code;
  const codeType = codeTypeExplicit ?? inferredTypeToPrismaCode(inferred.codeType);

  const data = {
    procedureCode,
    hcpcsCode,
    diagnosisCodes,
    code,
    codeType,
    descriptionSnapshot,
    billingSide,
    serviceDate,
    revenueCode,
    modifier1,
    modifier2,
    units,
    reviewStatus,
  };

  const auditDelta: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(data) as (keyof typeof data)[]) {
    const before = row[k];
    const after = data[k];
    let changed = false;
    if (before instanceof Date && after instanceof Date) {
      changed = before.getTime() !== after.getTime();
    } else {
      changed = before !== after;
    }
    if (changed) auditDelta[k] = { from: before, to: after };
  }

  return { data, auditDelta };
}
