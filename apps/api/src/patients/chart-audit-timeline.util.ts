import { AuditAction } from "@prisma/client";

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
    case AuditAction.ORDERS_CREATED:
      if (typeof m.count === "number" && m.count > 0) return `${m.count} ligne(s) depuis un protocole`;
      return null;
    default:
      return null;
  }
}
