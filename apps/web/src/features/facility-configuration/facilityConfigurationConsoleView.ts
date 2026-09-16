import type { FacilityConfigurationSettings, FacilityModuleKey, FacilityModuleRuntime } from "@medora/shared";
import { FACILITY_MODULE_KEYS, resolveFacilityModuleLiveStatus } from "@medora/shared";

export const FACILITY_CONSOLE_SECTIONS = [
  "modules",
  "digitalCare",
  "patientPortal",
  "branding",
  "notifications",
  "clinicalRules",
  "scheduling",
  "ai",
  "security",
  "integrations",
] as const;

export type FacilityConsoleSection = (typeof FACILITY_CONSOLE_SECTIONS)[number];

export const FACILITY_MODULE_ACCENT: Record<FacilityModuleKey, { bg: string; text: string; bar: string }> = {
  emergency: { bg: "#fef2f2", text: "#991b1b", bar: "#ef4444" },
  urgentCare: { bg: "#fff7ed", text: "#c2410c", bar: "#f97316" },
  clinic: { bg: "#f0fdfa", text: "#0f766e", bar: "#14b8a6" },
  observation: { bg: "#fffbeb", text: "#b45309", bar: "#f59e0b" },
  hospital: { bg: "#eef2ff", text: "#3730a3", bar: "#6366f1" },
  laboratory: { bg: "#faf5ff", text: "#6b21a8", bar: "#a855f7" },
  radiology: { bg: "#eff6ff", text: "#1d4ed8", bar: "#3b82f6" },
  pharmacy: { bg: "#f0fdf4", text: "#166534", bar: "#22c55e" },
  billing: { bg: "#ecfeff", text: "#0e7490", bar: "#06b6d4" },
  scheduling: { bg: "#f8fafc", text: "#334155", bar: "#64748b" },
  digitalCare: { bg: "#ecfeff", text: "#0f766e", bar: "#14b8a6" },
  patientPortal: { bg: "#eff6ff", text: "#1e40af", bar: "#2563eb" },
  telemedicine: { bg: "#f5f3ff", text: "#5b21b6", bar: "#8b5cf6" },
  ai: { bg: "#fdf2f8", text: "#9d174d", bar: "#ec4899" },
};

export function facilityConfigurationIsDirty(
  saved: FacilityConfigurationSettings | null,
  draft: FacilityConfigurationSettings | null,
): boolean {
  if (!saved || !draft) return false;
  return JSON.stringify(saved) !== JSON.stringify(draft);
}

export function facilityConsoleEnabledProgress(modules: FacilityConfigurationSettings["modules"]): {
  enabled: number;
  total: number;
  percent: number;
} {
  const total = FACILITY_MODULE_KEYS.length;
  const enabled = FACILITY_MODULE_KEYS.filter((key) => resolveFacilityModuleLiveStatus(modules[key]) === "LIVE").length;
  return { enabled, total, percent: Math.round((enabled / total) * 100) };
}

export function setFacilityModuleRuntime(
  current: FacilityModuleRuntime,
  patch: Partial<FacilityModuleRuntime>,
): FacilityModuleRuntime {
  const next = { ...current, ...patch };
  if (patch.enabled === false) {
    next.visible = false;
    next.hidden = true;
  }
  if (patch.enabled === true) {
    next.hidden = false;
    next.visible = true;
  }
  if (patch.hidden === true) {
    next.visible = false;
  }
  if (patch.visible === true) {
    next.hidden = false;
  }
  return next;
}

export const DIGITAL_CARE_SWITCHES = [
  "secureMessaging",
  "resultRelease",
  "autoRelease",
  "manualRelease",
  "criticalResultWorkflow",
  "documents",
  "carePlans",
  "education",
  "medicationSharing",
  "dischargeSharing",
  "questionnaires",
  "remoteMonitoring",
  "videoVisits",
  "providerChat",
  "patientChat",
  "readReceipts",
  "attachments",
  "pushNotifications",
  "emailNotifications",
  "smsNotifications",
] as const;

export const PATIENT_PORTAL_SWITCHES = [
  "enabled",
  "registration",
  "appointments",
  "visits",
  "documents",
  "messages",
  "invoices",
  "medications",
  "labResults",
  "radiology",
  "carePlans",
  "telehealth",
  "notifications",
  "portalHome",
] as const;

export const NOTIFICATION_SWITCHES = [
  "sms",
  "email",
  "push",
  "appointmentReminder",
  "resultReady",
  "messageReceived",
  "medicationReminder",
  "followUpReminder",
  "dischargeReminder",
] as const;

export const CLINICAL_RULE_SWITCHES = [
  "medicationReconciliation",
  "requiredSignatures",
  "dischargeApproval",
  "criticalLabWorkflow",
  "criticalImagingWorkflow",
  "providerVerification",
  "nurseVerification",
] as const;

export const SCHEDULING_SWITCHES = ["onlineBooking", "queue", "walkIn", "telemedicine", "providerCalendar"] as const;
export const AI_SWITCHES = ["notes", "coding", "summaries", "discharge", "suggestions", "ambientScribe"] as const;
export const INTEGRATION_KEYS = [
  "laboratory",
  "radiology",
  "pacs",
  "fhir",
  "hl7",
  "stripe",
  "twilio",
  "smtp",
  "sendgrid",
  "pharmacy",
] as const;

export const FACILITY_OPERATIONS_LINKS: Array<{ href: string; labelKey: string; adminOnly?: boolean; platformOnly?: boolean }> = [
  { href: "/app/admin/users", labelKey: "adminHub.usersAndAccess" },
  { href: "/app/admin/audit", labelKey: "adminHub.auditLogLink" },
  { href: "/app/reports", labelKey: "adminHub.opsReportsLink" },
  { href: "/app/admin/go-live", labelKey: "adminHub.goLiveLink" },
  { href: "/app/admin/enterprise-workflow", labelKey: "adminHub.enterpriseWorkflowLink" },
  { href: "/app/admin/enterprise-clinical-rules", labelKey: "adminHub.enterpriseClinicalRulesLink" },
  { href: "/app/admin/revenue-cycle", labelKey: "adminHub.revenueCycleLink" },
  { href: "/app/admin/integrations", labelKey: "adminHub.integrationsLink", platformOnly: true },
];
