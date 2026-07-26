/**
 * MEDUI.D4B.1 — Legal-record render projection (shared contract, not a PDF engine).
 */

import type {
  EnterpriseClinicalDocument,
  EnterpriseClinicalDocumentLegalProjection,
} from "./enterpriseClinicalDocumentContractD4b1.js";
import { ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION } from "./enterpriseClinicalDocumentContractD4b1.js";
import { getEnterpriseClinicalDocumentType } from "./enterpriseClinicalDocumentRegistryD4b1.js";

function displayName(
  actor: { displayName: string | null; roleTitle: string | null; userId: string | null } | null
): string | null {
  if (!actor) return null;
  if (actor.displayName) return actor.displayName;
  if (actor.userId) return actor.userId;
  return null;
}

export function buildEnterpriseClinicalDocumentLegalProjection(
  doc: EnterpriseClinicalDocument
): EnterpriseClinicalDocumentLegalProjection {
  const typeDef = getEnterpriseClinicalDocumentType(doc.documentTypeId);
  const unsigned =
    doc.lifecycleState === "DRAFT" ||
    doc.lifecycleState === "IN_PROGRESS" ||
    doc.lifecycleState === "READY_FOR_SIGNATURE";
  const amendmentLabel =
    doc.lifecycleState === "AMENDED" || doc.lineage.amendedFromId
      ? "enterpriseClinicalDocumentD4b1.labels.amended"
      : null;
  const addendumLabel = null;

  const structuredSections =
    doc.structured == null
      ? []
      : [
          {
            key: doc.structured.schemaId,
            title: doc.structured.schemaId,
            summary: `${Object.keys(doc.structured.payload).length} fields · ${doc.structured.schemaVersion}`,
          },
        ];

  const narrativeSections =
    doc.narrative?.sections.map((s) => ({
      key: s.key,
      title: s.title,
      text: s.text,
    })) ?? [];

  return {
    contractVersion: ENTERPRISE_CLINICAL_DOCUMENT_CONTRACT_VERSION,
    documentId: doc.documentId,
    patientId: doc.patientId,
    encounterId: doc.encounterId,
    facilityId: doc.facilityId,
    careSetting: doc.careSetting,
    documentTitle: typeDef?.titleKey ?? doc.documentTypeId,
    discipline: doc.discipline,
    authorDisplay: displayName(doc.author),
    signerDisplay: displayName(doc.responsibleSigner),
    cosignerDisplay: displayName(doc.cosigner),
    serviceAt: doc.serviceAt,
    signedAt: doc.signedAt,
    lifecycleState: doc.lifecycleState,
    amendmentLabel,
    addendumLabel,
    templateVersion: doc.templateVersion,
    unsignedDraftMarked: unsigned,
    enteredInErrorMarked: doc.enteredInError,
    structuredSections,
    narrativeSections,
    legalFooterKey: "enterpriseClinicalDocumentD4b1.legal.footer",
  };
}

/** Version history ordering helper (newest first). */
export function orderEnterpriseClinicalDocumentVersionHistory<
  T extends { createdAt: string; documentId: string },
>(rows: ReadonlyArray<T>): T[] {
  return [...rows].sort((a, b) => {
    const cmp = b.createdAt.localeCompare(a.createdAt);
    if (cmp !== 0) return cmp;
    return b.documentId.localeCompare(a.documentId);
  });
}

/** Bounded history page (avoid unbounded dumps). */
export function paginateEnterpriseClinicalDocumentVersionHistory<T>(
  rows: ReadonlyArray<T>,
  options?: { limit?: number; offset?: number }
): { items: T[]; total: number; limit: number; offset: number } {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const offset = Math.max(options?.offset ?? 0, 0);
  return {
    items: rows.slice(offset, offset + limit),
    total: rows.length,
    limit,
    offset,
  };
}
