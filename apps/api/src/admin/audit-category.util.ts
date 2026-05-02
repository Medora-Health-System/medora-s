import { AuditAction } from "@prisma/client";

export type AuditUiCategory = "critical" | "clinical" | "billing" | "access" | "override" | "other";

const BILLING_EXPORT_ENTITIES = new Set(["EXTERNAL_BILLING_EXPORT", "EXTERNAL_BILLING_AUTO_EXPORT"]);

export function classifyAuditUiCategory(action: AuditAction, entityType: string): AuditUiCategory {
  if (entityType === "ED_REPORT_EXPORT") {
    return "clinical";
  }
  if (
    action === AuditAction.CRITICAL_FLAG ||
    action === AuditAction.BREAK_GLASS_START ||
    action === AuditAction.BREAK_GLASS_ACCESS ||
    action === AuditAction.BREAK_GLASS_END
  ) {
    return "critical";
  }
  if (action === AuditAction.BILLING_REOPENED || action === AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM) {
    return "override";
  }
  if (BILLING_EXPORT_ENTITIES.has(entityType)) {
    return "billing";
  }
  if (
    action === AuditAction.BILLING_FINALIZED ||
    entityType === "BILLING_REVIEW_DECISION"
  ) {
    return "billing";
  }
  if (
    action === AuditAction.VIEW ||
    action === AuditAction.CHART_ACCESS ||
    action === AuditAction.CHART_OPEN ||
    action === AuditAction.PATIENT_VIEW ||
    action === AuditAction.ENCOUNTER_VIEW ||
    action === AuditAction.ORDER_VIEW
  ) {
    return "access";
  }
  if (
    action === AuditAction.ORDER_CREATE ||
    action === AuditAction.ORDER_CANCEL ||
    action === AuditAction.ORDER_UPDATE ||
    action === AuditAction.ORDER_ACK ||
    action === AuditAction.ORDER_START ||
    action === AuditAction.ORDER_COMPLETE ||
    action === AuditAction.ENCOUNTER_CLOSE ||
    action === AuditAction.ENCOUNTER_CREATE ||
    action === AuditAction.ENCOUNTER_UPDATE ||
    action === AuditAction.TRIAGE_SAVE ||
    action === AuditAction.MEDICATION_DISPENSED ||
    action === AuditAction.PROVIDER_DOCUMENTATION_SIGN ||
    action === AuditAction.RESULT_UPLOAD ||
    action === AuditAction.RESULT_VERIFY ||
    action === AuditAction.PATHWAY_ACTIVATED ||
    action === AuditAction.ORDERS_CREATED
  ) {
    return "clinical";
  }
  return "other";
}

export type AuditPreset = "critical_events" | "clinical_actions" | "billing_exports" | "access_views" | "overrides";

export function auditPresetWhere(preset: AuditPreset): { OR: Array<Record<string, unknown>> } {
  switch (preset) {
    case "critical_events":
      return {
        OR: [
          { action: AuditAction.CRITICAL_FLAG },
          { action: AuditAction.BREAK_GLASS_START },
          { action: AuditAction.BREAK_GLASS_ACCESS },
          { action: AuditAction.BREAK_GLASS_END },
        ],
      };
    case "clinical_actions":
      return {
        OR: [
          { action: AuditAction.ORDER_CREATE },
          { action: AuditAction.ORDER_CANCEL },
          { action: AuditAction.ORDER_UPDATE },
          { action: AuditAction.ORDER_ACK },
          { action: AuditAction.ORDER_START },
          { action: AuditAction.ORDER_COMPLETE },
          { action: AuditAction.ENCOUNTER_CLOSE },
          { action: AuditAction.ENCOUNTER_CREATE },
          { action: AuditAction.ENCOUNTER_UPDATE },
          { action: AuditAction.TRIAGE_SAVE },
          { action: AuditAction.MEDICATION_DISPENSED },
          { action: AuditAction.PROVIDER_DOCUMENTATION_SIGN },
          { action: AuditAction.RESULT_UPLOAD },
          { action: AuditAction.RESULT_VERIFY },
          { action: AuditAction.PATHWAY_ACTIVATED },
          { action: AuditAction.ORDERS_CREATED },
        ],
      };
    case "billing_exports":
      return {
        OR: [
          { entityType: "EXTERNAL_BILLING_EXPORT" },
          { entityType: "EXTERNAL_BILLING_AUTO_EXPORT" },
          { action: AuditAction.BILLING_FINALIZED },
        ],
      };
    case "access_views":
      return {
        OR: [
          { action: AuditAction.VIEW },
          { action: AuditAction.CHART_ACCESS },
          { action: AuditAction.CHART_OPEN },
          { action: AuditAction.PATIENT_VIEW },
          { action: AuditAction.ENCOUNTER_VIEW },
          { action: AuditAction.ORDER_VIEW },
        ],
      };
    case "overrides":
      return {
        OR: [{ action: AuditAction.BILLING_REOPENED }, { action: AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM }],
      };
    default:
      return { OR: [] };
  }
}
