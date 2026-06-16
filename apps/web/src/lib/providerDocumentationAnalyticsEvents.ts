/**
 * MEDUI.ED.POSTCERT.5 — Provider documentation analytics event definitions.
 * Event contracts only. No runtime collection implementation.
 * No PHI, patient identifiers, or note text.
 */
import type { EnterpriseGovernanceFamilyId } from "./providerDocumentationEnterpriseGovernanceRegistry";
import type { EnterpriseGovernanceOwnerId } from "./providerDocumentationEnterpriseGovernanceV2";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type {
  ProviderDocumentationAnalyticsChipCategory,
  ProviderDocumentationAnalyticsMdmSectionId,
  ProviderDocumentationAnalyticsTemplateLifecycleEvent,
} from "./providerDocumentationAnalyticsModel";

/** Base envelope for all provider-documentation analytics events (aggregate-safe). */
export type ProviderDocumentationAnalyticsEventBase = {
  /** ISO-8601 timestamp when the event would be emitted. */
  occurredAt: string;
  /** Facility scope for multi-tenant aggregation (no patient id). */
  facilityId?: string;
  /** Clinician role bucket for adoption breakdown (no user id). */
  roleBucket?: "physician" | "nurse_practitioner" | "physician_assistant" | "other";
};

export type ProviderDocumentationTemplateLifecycleAnalyticsEvent = ProviderDocumentationAnalyticsEventBase & {
  type: ProviderDocumentationAnalyticsTemplateLifecycleEvent;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
  auditPhase: string | null;
};

export type ProviderDocumentationChipAnalyticsEvent = ProviderDocumentationAnalyticsEventBase & {
  type:
    | "chip_displayed"
    | "chip_inserted"
    | "chip_removed"
    | "chip_reinserted";
  chipId: string;
  chipCategory: ProviderDocumentationAnalyticsChipCategory;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
};

export type ProviderDocumentationMdmAnalyticsEvent = ProviderDocumentationAnalyticsEventBase & {
  type: "mdm_section_present" | "mdm_section_missing" | "mdm_completed";
  sectionId: ProviderDocumentationAnalyticsMdmSectionId;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
};

export type ProviderDocumentationGovernanceDriftAnalyticsEvent = ProviderDocumentationAnalyticsEventBase & {
  type: "governance_drift_detected";
  indicator:
    | "ownerless_template"
    | "duplicate_owner"
    | "missing_human_doc_registration"
    | "missing_track_c_registration"
    | "missing_mdm1_registration"
    | "missing_governance_module"
    | "isolation_violation";
  templateId?: string;
  familyId?: EnterpriseGovernanceFamilyId;
  governanceOwnerId?: EnterpriseGovernanceOwnerId;
  detail: string;
};

export type ProviderDocumentationCertificationDriftAnalyticsEvent = ProviderDocumentationAnalyticsEventBase & {
  type: "certification_drift_detected";
  indicator:
    | "new_uncertified_template"
    | "new_ownerless_template"
    | "new_unregistered_family"
    | "new_unisolated_family";
  templateId?: string;
  familyId?: EnterpriseGovernanceFamilyId;
  detail: string;
};

/** Canonical event name constants for downstream collectors. */
export const PROVIDER_DOC_ANALYTICS_EVENT_NAMES = {
  TEMPLATE_OPENED: "PROVIDER_DOC_TEMPLATE_OPENED",
  TEMPLATE_ACTIVATED: "PROVIDER_DOC_TEMPLATE_ACTIVATED",
  TEMPLATE_COMPLETED: "PROVIDER_DOC_TEMPLATE_COMPLETED",
  TEMPLATE_ABANDONED: "PROVIDER_DOC_TEMPLATE_ABANDONED",
  TEMPLATE_SAVED: "PROVIDER_DOC_TEMPLATE_SAVED",
  TEMPLATE_EXPORTED: "PROVIDER_DOC_TEMPLATE_EXPORTED",
  CHIP_DISPLAYED: "PROVIDER_DOC_CHIP_DISPLAYED",
  CHIP_INSERTED: "PROVIDER_DOC_CHIP_INSERTED",
  CHIP_REMOVED: "PROVIDER_DOC_CHIP_REMOVED",
  CHIP_REINSERTED: "PROVIDER_DOC_CHIP_REINSERTED",
  MDM_SECTION_PRESENT: "PROVIDER_DOC_MDM_SECTION_PRESENT",
  MDM_SECTION_MISSING: "PROVIDER_DOC_MDM_SECTION_MISSING",
  MDM_COMPLETED: "PROVIDER_DOC_MDM_COMPLETED",
  GOVERNANCE_DRIFT_DETECTED: "PROVIDER_DOC_GOVERNANCE_DRIFT_DETECTED",
  CERTIFICATION_DRIFT_DETECTED: "PROVIDER_DOC_CERTIFICATION_DRIFT_DETECTED",
} as const;

export type ProviderDocumentationAnalyticsEventName =
  (typeof PROVIDER_DOC_ANALYTICS_EVENT_NAMES)[keyof typeof PROVIDER_DOC_ANALYTICS_EVENT_NAMES];

export type ProviderDocumentationAnalyticsEvent =
  | ProviderDocumentationTemplateLifecycleAnalyticsEvent
  | ProviderDocumentationChipAnalyticsEvent
  | ProviderDocumentationMdmAnalyticsEvent
  | ProviderDocumentationGovernanceDriftAnalyticsEvent
  | ProviderDocumentationCertificationDriftAnalyticsEvent;

/** Maps lifecycle event type to canonical event name. */
export const LIFECYCLE_EVENT_TO_CANONICAL_NAME: Record<
  ProviderDocumentationAnalyticsTemplateLifecycleEvent,
  ProviderDocumentationAnalyticsEventName
> = {
  template_opened: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_OPENED,
  template_activated: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_ACTIVATED,
  template_completed: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_COMPLETED,
  template_abandoned: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_ABANDONED,
  template_saved: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_SAVED,
  template_exported: PROVIDER_DOC_ANALYTICS_EVENT_NAMES.TEMPLATE_EXPORTED,
};

export function isProviderDocumentationAnalyticsEvent(value: unknown): value is ProviderDocumentationAnalyticsEvent {
  if (value == null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.type === "string" && typeof record.occurredAt === "string";
}
