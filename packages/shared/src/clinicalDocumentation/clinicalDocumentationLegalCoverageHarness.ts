import {
  assertClinicalDocumentationAuditMetadataSafe,
  buildClinicalDocumentationAuditMetadata,
  ensureClinicalDocumentationLegalDisplaySummary,
  mapClinicalDocumentationEntryForLegalChart,
  selectClinicalDocumentationPayloadSummary,
  type ClinicalDocumentationEntryLegalChartRow,
} from "./clinicalDocumentationEntry.js";

/** EDOC.TEST.1 — assert bilingual card summaries are non-empty for a saved payload. */
export function assertClinicalDocumentationSummaryGenerated(
  cardId: string,
  payload: Record<string, unknown>
): void {
  const en = ensureClinicalDocumentationLegalDisplaySummary(cardId, payload, "en");
  const fr = ensureClinicalDocumentationLegalDisplaySummary(cardId, payload, "fr");
  if (en.length === 0) {
    throw new Error(`Empty EN summary for card ${cardId}`);
  }
  if (fr.length === 0) {
    throw new Error(`Empty FR summary for card ${cardId}`);
  }
}

/** EDOC.TEST.1 — legal chart row must retain payload and non-empty bilingual summaries. */
export function assertClinicalDocumentationLegalExportInvariant(
  row: ClinicalDocumentationEntryLegalChartRow
): void {
  if (!row.id) throw new Error("Missing entry id on legal chart row");
  if (!row.cardId) throw new Error("Missing cardId on legal chart row");
  if (!row.category) throw new Error("Missing category on legal chart row");
  if (!row.payloadJson || typeof row.payloadJson !== "object") {
    throw new Error(`Missing payloadJson on legal chart row for ${row.cardId}`);
  }
  if (!row.payloadSummaryEn?.length) {
    throw new Error(`Empty payloadSummaryEn on legal chart row for ${row.cardId}`);
  }
  if (!row.payloadSummaryFr?.length) {
    throw new Error(`Empty payloadSummaryFr on legal chart row for ${row.cardId}`);
  }
}

/** EDOC.TEST.1 — UI/export summary selector must never return empty for saved entries. */
export function assertClinicalDocumentationPatientRecordSummaryVisible(
  row: ClinicalDocumentationEntryLegalChartRow,
  locale: "en" | "fr"
): void {
  const lines = selectClinicalDocumentationPayloadSummary(row, locale);
  if (lines.length === 0) {
    throw new Error(`Empty patient-record summary for ${row.cardId} (${locale})`);
  }
}

/** EDOC.TEST.1 — audit metadata allowlist only; no PHI keys or narrative fields. */
export function assertClinicalDocumentationAuditMetadataPhiSafe(
  meta: Record<string, unknown>
): void {
  assertClinicalDocumentationAuditMetadataSafe(meta);
  for (const [key, value] of Object.entries(meta)) {
    if (typeof value === "object" && value !== null) {
      throw new Error(`Audit metadata value for ${key} must be scalar`);
    }
  }
}

/** EDOC.TEST.1 — build + validate create audit metadata shape used by API save path. */
export function buildAndAssertClinicalDocumentationCreateAuditMetadata(input: {
  encounterId: string;
  patientId: string;
  entryId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorRole: string;
  payload: Record<string, unknown>;
}): Record<string, unknown> {
  const summaryLineCount = ensureClinicalDocumentationLegalDisplaySummary(
    input.cardId,
    input.payload,
    "en"
  ).length;
  const meta = buildClinicalDocumentationAuditMetadata({
    encounterId: input.encounterId,
    patientId: input.patientId,
    entryId: input.entryId,
    category: input.category,
    cardId: input.cardId,
    authorUserId: input.authorUserId,
    authorRole: input.authorRole,
    payloadKeyCount: Object.keys(input.payload).length,
    summaryLineCount,
  });
  assertClinicalDocumentationAuditMetadataPhiSafe(meta as Record<string, unknown>);
  return meta as Record<string, unknown>;
}

/** EDOC.TEST.1 — map entry response the same way legal chart/export does. */
export function mapClinicalDocumentationEntryForLegalCoverageTest(input: {
  id: string;
  encounterId: string;
  patientId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: string;
  payloadJson: Record<string, unknown>;
  voidedAt?: string | null;
  requiresWitnessSignature?: boolean;
  witnessedAt?: string | null;
  witnessedByUserId?: string | null;
  witnessDisplayNameSnapshot?: string | null;
  witnessRoleSnapshot?: string | null;
}): ClinicalDocumentationEntryLegalChartRow {
  return mapClinicalDocumentationEntryForLegalChart({
    id: input.id,
    encounterId: input.encounterId,
    patientId: input.patientId,
    category: input.category,
    cardId: input.cardId,
    authorUserId: input.authorUserId,
    authorDisplayNameSnapshot: input.authorDisplayNameSnapshot,
    authorRoleSnapshot: input.authorRoleSnapshot,
    createdAt: input.createdAt,
    payloadJson: input.payloadJson,
    voidedAt: input.voidedAt ?? null,
    requiresWitnessSignature: input.requiresWitnessSignature ?? false,
    witnessedAt: input.witnessedAt ?? null,
    witnessedByUserId: input.witnessedByUserId ?? null,
    witnessDisplayNameSnapshot: input.witnessDisplayNameSnapshot ?? null,
    witnessRoleSnapshot: input.witnessRoleSnapshot ?? null,
  });
}
