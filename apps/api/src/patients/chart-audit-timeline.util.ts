import { AuditAction } from "@prisma/client";

/** Break-glass (accès d'urgence dossier) — visible dans la frise patient. */
export const BREAK_GLASS_TIMELINE_ACTIONS: AuditAction[] = [
  AuditAction.BREAK_GLASS_START,
  AuditAction.BREAK_GLASS_ACCESS,
  AuditAction.BREAK_GLASS_END,
];

/** Actions présentes dans le schéma Prisma et exposées au dossier (V1 — lecture seule). */
export const CHART_AUDIT_TIMELINE_ACTIONS: AuditAction[] = [
  AuditAction.ENCOUNTER_CREATE,
  AuditAction.ENCOUNTER_UPDATE,
  AuditAction.ENCOUNTER_CLOSE,
  AuditAction.PROVIDER_DOCUMENTATION_SIGN,
  AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM,
  AuditAction.ORDER_CREATE,
  AuditAction.ORDERS_CREATED,
  AuditAction.ORDER_CANCEL,
  AuditAction.ORDER_ACK,
  AuditAction.ORDER_START,
  AuditAction.ORDER_COMPLETE,
  AuditAction.MEDICATION_DISPENSED,
  AuditAction.RESULT_VERIFY,
  AuditAction.CRITICAL_FLAG,
];

/**
 * Timeline consultation (API dédiée) — même périmètre d’actions que le bandeau dossier patient.
 * Exclut explicitement le bruit de lecture (CHART_ACCESS, ENCOUNTER_VIEW, ORDER_VIEW) par omission.
 */
export const ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS: AuditAction[] = [...CHART_AUDIT_TIMELINE_ACTIONS];

export type AuditTimelineItemDto = {
  id: string;
  action: AuditAction;
  createdAt: string;
  userDisplayFr: string | null;
  shortLabelFr: string;
  detailFr: string | null;
  encounterId: string | null;
  entityType: string;
  entityId: string | null;
};

/** Distinct label when metadata marks a provider-documentation unlock (vs generic encounter update). */
export function timelineShortLabelFr(row: { action: AuditAction; metadata: unknown }): string {
  const m = metadataRecord(row.metadata);
  if (m?.providerDocumentationUnlock === true) {
    return "Déverrouillage évaluation médicale";
  }
  return auditActionShortLabelFr(row.action);
}

export function auditActionShortLabelFr(action: AuditAction): string {
  const map: Partial<Record<AuditAction, string>> = {
    [AuditAction.ENCOUNTER_CREATE]: "Consultation créée",
    [AuditAction.ENCOUNTER_UPDATE]: "Consultation mise à jour",
    [AuditAction.ENCOUNTER_CLOSE]: "Consultation terminée",
    [AuditAction.PROVIDER_DOCUMENTATION_SIGN]: "Évaluation médicale signée",
    [AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM]: "Addendum ajouté",
    [AuditAction.ORDER_CREATE]: "Commande créée",
    [AuditAction.ORDERS_CREATED]: "Commandes créées",
    [AuditAction.ORDER_CANCEL]: "Commande annulée",
    [AuditAction.ORDER_ACK]: "Commande accusée réception",
    [AuditAction.ORDER_START]: "Commande démarrée",
    [AuditAction.ORDER_COMPLETE]: "Commande terminée",
    [AuditAction.MEDICATION_DISPENSED]: "Dispensation enregistrée",
    [AuditAction.RESULT_VERIFY]: "Résultat validé",
    [AuditAction.CRITICAL_FLAG]: "Valeur critique (résultat)",
    [AuditAction.BREAK_GLASS_START]: "Accès d'urgence (break-glass) démarré",
    [AuditAction.BREAK_GLASS_ACCESS]: "Accès d'urgence (break-glass) — consultation dossier",
    [AuditAction.BREAK_GLASS_END]: "Accès d'urgence (break-glass) terminé",
  };
  return map[action] ?? String(action);
}

function metadataRecord(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  return meta as Record<string, unknown>;
}

export function metadataEncounterId(metadata: unknown): string | null {
  const m = metadataRecord(metadata);
  if (!m) return null;
  const e = m.encounterId;
  return typeof e === "string" ? e : null;
}

/** Détail court optionnel — pas de JSON brut. */
export function buildAuditTimelineDetailFr(action: AuditAction, metadata: unknown): string | null {
  const m = metadataRecord(metadata);
  if (!m) return null;
  switch (action) {
    case AuditAction.ORDER_CANCEL:
      return typeof m.cancellationReason === "string" && m.cancellationReason.trim()
        ? `Motif : ${m.cancellationReason.trim()}`
        : null;
    case AuditAction.ORDER_COMPLETE:
      if (m.completedByNurse === true) return "Administration infirmière";
      return null;
    case AuditAction.MEDICATION_DISPENSED:
      if (typeof m.medicationCode === "string" && m.medicationCode.trim()) {
        return `Médicament : ${m.medicationCode.trim()}`;
      }
      return null;
    case AuditAction.RESULT_VERIFY:
      if (m.criticalValue === true) return "Résultat marqué critique";
      return null;
    case AuditAction.CRITICAL_FLAG:
      return typeof m.criticalValue === "boolean"
        ? m.criticalValue
          ? "Marqué critique"
          : "Critique levé"
        : null;
    case AuditAction.ENCOUNTER_CLOSE:
      if (m.deficienciesAcknowledged === true && Array.isArray(m.deficiencyCodes)) {
        const n = m.deficiencyCodes.length;
        return n > 0 ? `Clôture avec lacunes documentaires (${n})` : null;
      }
      return null;
    case AuditAction.ENCOUNTER_UPDATE:
      if (m?.providerDocumentationUnlock === true && typeof m.reason === "string" && m.reason.trim()) {
        return `Motif : ${m.reason.trim()}`;
      }
      return null;
    case AuditAction.ORDERS_CREATED:
      if (typeof m.count === "number" && m.count > 0) return `${m.count} ligne(s) depuis un protocole`;
      return null;
    case AuditAction.BREAK_GLASS_END:
      if (m?.superseded === true) return "Remplacé par une nouvelle session";
      if (m?.explicit === true) return "Clôture explicite";
      return null;
    default:
      return null;
  }
}

/** Ligne Prisma `AuditLog` avec `user` optionnel — formatage dossier / timeline. */
export function mapAuditLogRowToTimelineItem(row: {
  id: string;
  action: AuditAction;
  createdAt: Date;
  metadata: unknown;
  encounterId: string | null;
  entityType: string;
  entityId: string | null;
  user: { firstName: string; lastName: string } | null;
}): AuditTimelineItemDto {
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  const encounterId = row.encounterId ?? metadataEncounterId(row.metadata) ?? null;
  const userDisplayFr = row.user
    ? `${row.user.firstName} ${row.user.lastName}`.trim()
    : null;
  return {
    id: row.id,
    action: row.action,
    createdAt,
    userDisplayFr,
    shortLabelFr: timelineShortLabelFr(row),
    detailFr: buildAuditTimelineDetailFr(row.action, row.metadata),
    encounterId,
    entityType: row.entityType,
    entityId: row.entityId ?? null,
  };
}
