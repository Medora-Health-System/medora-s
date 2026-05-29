import { z } from "zod";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  CLINICAL_DOCUMENTATION_CATEGORIES,
  type ClinicalDocumentationCategory,
} from "./clinicalDocumentationTypes.js";

/** Max serialized payload size (bytes, UTF-8 approximated by string length). */
export const CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES = 16_384;

export const clinicalDocumentationEntryCreateDtoSchema = z.object({
  category: z.enum(CLINICAL_DOCUMENTATION_CATEGORIES),
  cardId: z.string().trim().min(1).max(120),
  payloadJson: z.record(z.unknown()),
});

export type ClinicalDocumentationEntryCreateDto = z.infer<
  typeof clinicalDocumentationEntryCreateDtoSchema
>;

export type ClinicalDocumentationEntryResponse = {
  id: string;
  encounterId: string;
  category: ClinicalDocumentationCategory;
  cardId: string;
  cardTitleEn: string;
  cardTitleFr: string;
  authorDisplayName: string;
  authorRoleTitle: string;
  createdAt: string;
  payloadJson: Record<string, unknown>;
  voidedAt: string | null;
};

export const FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS = [
  "payloadJson",
  "payload",
  "freeText",
  "notes",
  "noteBody",
  "clinicalNarrative",
  "patientName",
  "firstName",
  "lastName",
  "mrn",
  "chiefComplaint",
  "diagnosisText",
  "clinicalNote",
  "hpi",
  "mdm",
  "ros",
  "body",
] as const;

export const ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS = [
  "encounterId",
  "patientId",
  "entryId",
  "category",
  "cardId",
  "authorUserId",
  "authorRole",
  "payloadKeyCount",
] as const;

export type ClinicalDocumentationAuditMetadata = {
  encounterId: string;
  patientId: string;
  entryId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorRole: string;
  payloadKeyCount: number;
};

export function buildClinicalDocumentationAuditMetadata(
  input: ClinicalDocumentationAuditMetadata
): ClinicalDocumentationAuditMetadata {
  return { ...input };
}

export function assertClinicalDocumentationAuditMetadataSafe(
  meta: Record<string, unknown>
): void {
  for (const forbidden of FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS) {
    if (forbidden in meta) {
      throw new Error(`Forbidden clinical documentation audit key: ${forbidden}`);
    }
  }
  for (const key of Object.keys(meta)) {
    if (!(ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unexpected clinical documentation audit key: ${key}`);
    }
  }
}

/** EDOC.2 — minimal payload for the first AVAILABLE card.
 * Generic payloadJson is intentionally allowed only for this foundation card.
 * EDOC.3+ cards (NIHSS, I&O, PO Challenge, CPR, blood products, sedation, etc.) must add
 * card-specific validators in validatePayloadForAvailableCard before AVAILABLE. */
export const EDOC_BASIC_STRUCTURED_CARD_ID = "edoc_basic_structured_v1" as const;

const basicItemSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
});

export const edocBasicStructuredPayloadSchema = z.object({
  items: z.array(basicItemSchema).min(1).max(20),
});

export function validatePayloadForAvailableCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  if (cardId === EDOC_BASIC_STRUCTURED_CARD_ID) {
    const parsed = edocBasicStructuredPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, message: "Invalid structured entry payload" };
    }
    return { ok: true };
  }
  // EDOC.3+: add per-card schemas here (NIHSS, I&O, PO Challenge, etc.) before marking AVAILABLE.
  return { ok: false, message: "Card is not available for structured save" };
}

export function assertClinicalDocumentationEntryCreateAllowed(
  dto: ClinicalDocumentationEntryCreateDto
): void {
  const card = getClinicalDocumentationCardById(dto.cardId);
  if (!card) {
    throw new Error("Unknown clinical documentation card");
  }
  if (card.category !== dto.category) {
    throw new Error("Category does not match card");
  }
  if (card.implementationStatus !== "AVAILABLE") {
    throw new Error("Clinical documentation card is not available for save");
  }
  if (!dto.payloadJson || typeof dto.payloadJson !== "object" || Array.isArray(dto.payloadJson)) {
    throw new Error("payloadJson must be an object");
  }
  const serialized = JSON.stringify(dto.payloadJson);
  if (serialized.length > CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES) {
    throw new Error("payloadJson exceeds maximum size");
  }
  const payloadCheck = validatePayloadForAvailableCard(dto.cardId, dto.payloadJson);
  if (!payloadCheck.ok) {
    throw new Error(payloadCheck.message);
  }
}

export function resolveClinicalDocumentationEntryTitles(cardId: string): {
  cardTitleEn: string;
  cardTitleFr: string;
} {
  const card = getClinicalDocumentationCardById(cardId);
  return {
    cardTitleEn: card?.titleEn ?? cardId,
    cardTitleFr: card?.titleFr ?? cardId,
  };
}

/** Shallow key/value summary for legal chart display (no deep PHI expansion). */
export function summarizeClinicalDocumentationPayload(
  payload: Record<string, unknown>
): Array<{ key: string; value: string }> {
  const lines: Array<{ key: string; value: string }> = [];
  if (Array.isArray(payload.items)) {
    for (const item of payload.items) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        const key = String(row.key ?? "").trim();
        const value = String(row.value ?? "").trim();
        if (key && value) lines.push({ key, value });
      }
    }
    return lines;
  }
  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      lines.push({ key, value: String(value) });
    } else if (Array.isArray(value)) {
      lines.push({ key, value: `[${value.length} items]` });
    } else if (typeof value === "object") {
      lines.push({ key, value: "[object]" });
    }
  }
  return lines.slice(0, 40);
}

export function mapClinicalDocumentationEntryResponse(input: {
  id: string;
  encounterId: string;
  category: string;
  cardId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date | string;
  payloadJson: unknown;
  voidedAt?: Date | string | null;
}): ClinicalDocumentationEntryResponse {
  const titles = resolveClinicalDocumentationEntryTitles(input.cardId);
  const createdAt =
    input.createdAt instanceof Date ? input.createdAt.toISOString() : String(input.createdAt);
  const voidedAt =
    input.voidedAt == null
      ? null
      : input.voidedAt instanceof Date
        ? input.voidedAt.toISOString()
        : String(input.voidedAt);
  return {
    id: input.id,
    encounterId: input.encounterId,
    category: input.category as ClinicalDocumentationCategory,
    cardId: input.cardId,
    cardTitleEn: titles.cardTitleEn,
    cardTitleFr: titles.cardTitleFr,
    authorDisplayName: input.authorDisplayNameSnapshot,
    authorRoleTitle: input.authorRoleSnapshot,
    createdAt,
    payloadJson:
      input.payloadJson && typeof input.payloadJson === "object" && !Array.isArray(input.payloadJson)
        ? (input.payloadJson as Record<string, unknown>)
        : {},
    voidedAt,
  };
}

export type ClinicalDocumentationEntryLegalChartRow = ClinicalDocumentationEntryResponse & {
  payloadSummary: Array<{ key: string; value: string }>;
};

export function mapClinicalDocumentationEntryForLegalChart(
  input: Parameters<typeof mapClinicalDocumentationEntryResponse>[0]
): ClinicalDocumentationEntryLegalChartRow {
  const base = mapClinicalDocumentationEntryResponse(input);
  return {
    ...base,
    payloadSummary: summarizeClinicalDocumentationPayload(base.payloadJson),
  };
}
