"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { getPendingMedicationAdminsFromQueue } from "@/lib/pendingMedicationAdminsFromQueue";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { normalizeMedicationDisplayForLocale } from "@/lib/localizedMedicationDisplay";
import { isOrderItemIdUuid } from "@/lib/orderItemIdUuid";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import type { SupportedLanguage } from "@/i18n/config";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning, isHighRiskMedication } from "@/lib/highRiskMedication";
import { MedicationMarSafetyGovernanceBadges } from "@/components/medication/MedicationMarSafetyGovernanceBadges";
import { MedicationMarSafetySummaryPanel } from "@/components/medication/MedicationMarSafetySummaryPanel";
import { orderItemToMedicationSafetyGovernanceDisplay, marLasaAcknowledgementComplete } from "@/features/mar/orderItemMedicationSafetyGovernance";
import { resolveMarAdministrationHistoryLabel } from "@/features/mar/marAdministrationHistoryLabel";
import {
  marAdministrationRequiresDoubleCheck,
  lasaMarRequiresAcknowledgement,
  validateControlledSubstanceMarCreate,
  validateHighAlertMarCreate,
  validateLasaMarCreate,
  validatePharmacyMarCreate,
  isIncompleteMedicationOrderDisplayLabel,
  isOrderDisplayLabelUnavailable,
  mergeMarCreateBillingFields,
  resolveMarHiddenBillingPayload,
  formatMarModalDefaultAdministeredQuantity,
  resolveMarAdministeredQuantityForCreate,
  validateMarAdministeredQuantityRequired,
  type MarHiddenBillingPayload,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { extractMarSaveErrorMessage } from "@/features/mar/marSaveErrorMessage";
import { MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH } from "@/lib/applyEncounterRoomAssignmentUpdate";
import {
  MarControlledSubstanceFields,
  marControlledWorkflowVisible,
  type MarControlledSubstanceFormState,
} from "@/components/medication/MarControlledSubstanceFields";
import {
  MarHighAlertFields,
  marHighAlertNeedsVerifierSelection,
  marHighAlertWorkflowVisible,
  marInfusionStartWitnessRequired,
  type MarHighAlertRouteOptions,
  type MarHighAlertFormState,
} from "@/components/medication/MarHighAlertFields";
import { SecondClinicianVerificationModal } from "@/components/clinical/SecondClinicianVerificationModal";
import {
  MarLasaFields,
  marLasaWorkflowVisible,
  type MarLasaFormState,
} from "@/components/medication/MarLasaFields";
import {
  MarPharmacyVerificationPanel,
  marPharmacyWorkflowVisible,
  type MarPharmacyFormState,
} from "@/components/medication/MarPharmacyVerificationPanel";
import { useEncounterClinicalDataOptional } from "@/hooks/EncounterClinicalDataProvider";
import { perfClinicalDataLog } from "@/hooks/encounterClinicalDataPerf";
import {
  resolveMedicationMarActionFromStorage,
  getEncounterAllergyDocumentationSummary,
  getMedicationSafetyWarnings,
  medicationWarningsRequireMarHighRiskAck,
  evaluateMedicationTimingSafety,
  assessMarAdministrationVariance,
  resolveMarMedicationTimingAdvisory,
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcDate,
  resolveClinicalTimeZone,
  computeAdvancedMedicationSafetyForSingleLine,
  mergeAdvancedMedicationLineWithDraft,
  isMedicationInfusionCandidate,
  medicationAdministrationCountsAsCompletedAdministration,
  imInjectionSiteValues,
  isIntramuscularMarRoute,
  marModalRequiresInjectionSite,
  validateImInjectionSiteForMarCreate,
  validatePrnAdministrationForMarCreate,
  isPrnAdministrationBeforeNextEligible,
  MAR_PRN_EARLY_OVERRIDE_NOTE_PREFIX,
  resolveMarPrnOrderMetadata,
  marPrnReasonCodesForGroup,
  marPrnAdministrationRequiresPainScore,
  isOpioidPainMedicationLabel,
  type MarPrnReasonCode,
  type ImInjectionSiteId,
  type MedicationInfusionCandidateInput,
  type AdvancedMedicationSafetyLine,
  type MedicationSafetyCatalogInput,
  type MedicationSafetyWarning,
  type MarShiftTimelineShiftCode,
  MEDICATION_INFUSION_NURSE_STOP_REASON_CODES,
  type MedicationAdministrationHistoryEntry,
  buildVaccineValidationBlockerReport,
  buildCompletedVaccineAdministrationViewModel,
  buildVaccineAdministrationAuditNote,
  isVaccineMedicationForMar,
  parseVaccineAdministrationDocumentationFromMarNotes,
  normalizeVaccineAdministrationDocumentation,
  sanitizeMarAdministrationVisibleNote,
  resolveVaccineAdministrationDisplayName,
  serializeVaccineAdministrationDocumentationForMarNotes,
  vaccineInjectionSiteLaterality,
  vaccineManufacturerLabel,
  VACCINE_MANUFACTURER_CATALOG,
  type VaccineAdministrationDocumentation,
  type VaccineEducationRecipient,
  type VaccineReviewedTopic,
} from "@medora/shared";
import { startMedicationInfusion, stopMedicationInfusion } from "@/lib/medicationInfusionApi";
import {
  pauseContinuousFluid,
  resumeContinuousFluid,
  startContinuousFluid,
  stopContinuousFluid,
  startFluidBolus,
  completeFluidBolus,
} from "@/lib/continuousFluidApi";
import {
  fetchMedicationPassQueue,
  type MedicationPassQueueItem,
  type MedicationPassQueueResponse,
} from "@/lib/medicationPassQueueApi";
import { appendMedicationDoseInstanceIdToMarCreateBody } from "@/features/mar/medicationPassQueueMarIntegration";
import { adjustMarMedicationSchedule } from "@/lib/medicationDoseScheduleAdjustmentApi";
import { MAR_TAB_SHOW_LEGACY_SECTIONS } from "@/features/mar/marTabUnifiedTimeline";
import { MedicationPassQueuePanel } from "@/components/encounters/MedicationPassQueuePanel";
import { FacilityMarShiftTimeline } from "@/components/encounters/FacilityMarShiftTimeline";
import { MarHistoricalDateNavigationBar } from "@/components/mar/MarHistoricalDateNavigationBar";
import { MarAdministrationRowCorrectionControls } from "@/components/mar/MarAdministrationRowCorrectionControls";
import { fetchMedicationAdministrationHistory } from "@/lib/medicationAdministrationHistoryApi";
import {
  buildHistoricalMarTimeline,
  resolveFacilityLocalToday,
} from "@/lib/marHistoricalTimeline";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";
import {
  findPassQueueItemForTimelineCell,
  marShiftTimelineStartWitnessRequired,
  resolveMarShiftTimelineOrderId,
  type MarShiftTimelineActionHandlers,
  type MarShiftTimelineRefuseHoldInput,
} from "@/features/mar/marShiftTimelineActions";
import { submitMarShiftTimelineTerminalMar } from "@/features/mar/marShiftTimelineTerminalMar";
import {
  findMedicationInfusionTimelineFromOrderEvents,
  formatInfusionDurationForI18n,
  formatInfusionElapsedInnerOnly,
  medicationInfusionClassificationText,
  medicationRouteSnapshotForInfusionCheck,
} from "@/features/emergency/erOrderLifecycleUi";
import { orderItemLikeToAdvancedMedicationSafetyLine } from "@/lib/advancedMedicationSafetyLineMappers";
import { AdvancedMedicationSafetyPanel } from "@/components/medication/AdvancedMedicationSafetyPanel";
import { MedicationSoftSafetyPanel } from "@/components/medication/MedicationSoftSafetyPanel";
import { ClinicalLatestVitalsBanner } from "@/components/clinical/ClinicalLatestVitalsBanner";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { medicationMarIntendedTimingUrgency } from "@/lib/medicationMarIntendedUrgency";
import {
  canAdjustMedicationAdministrationTime,
  resolveMedicationAdministrationDisplayTimes,
} from "@/features/mar/medicationAdministrationEffectiveTimeDisplay";
import {
  buildMarCreateEffectiveTimeRequestFields,
  marRecordModalEffectiveTimeClientError,
} from "@/features/mar/marRecordModalEffectiveTime";
import { MedicationClinicalDateTimeField } from "@/components/mar/MedicationClinicalDateTimeField";
import { MedicationAllergyReviewProviderNotice } from "@/components/mar/MedicationAllergyReviewProviderNotice";
import {
  buildMarClinicalTimeDocumentationNotes,
  currentMarClinicalDateTimeLocalValue,
  marClinicalDateTimeLocalToUtcIso,
  validateMarClinicalDateTimeField,
} from "@/features/mar/marUniversalMedicationActionTime";
import { MedicationAdministrationEffectiveTimeModal } from "@/components/encounters/MedicationAdministrationEffectiveTimeModal";
import { MedicationAdministrationTimeCell } from "@/components/encounters/MedicationAdministrationTimeCell";
import { MedicationAdministrationInfusionPhaseChip } from "@/components/encounters/MedicationAdministrationInfusionPhaseChip";
import {
  clinicalTabletCompactBannerStyle,
  clinicalTabletCompactHistoryItemStyle,
  clinicalTabletCompactMarCellStyle,
  clinicalTabletCompactMarHeaderCellStyle,
  clinicalTabletUsesCompactPanel,
  resolveClinicalTabletPanelDensityMode,
} from "@/lib/clinicalTabletPanelDensity";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";
import {
  MedicationAdministrationAdjustedBadge,
  MedicationAdministrationClockButton,
  MedicationAdministrationDocumentButton,
} from "@/components/encounters/MedicationAdministrationClockButton";
import {
  buildMedicationAdministrationRowClockAction,
  buildMedicationAdministrationRowDocumentAction,
  buildMedicationAdministrationTaskRowClockAction,
} from "@/features/mar/buildMedicationAdministrationRowClockAction";
import { isEncounterLocked } from "@/lib/encounterLock";
import {
  buildClinicalDraftKey,
  clinicalDraftPayloadSignature,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";

type AdminRow = {
  id: string;
  orderItemId: string | null;
  medicationLabelSnapshot?: string | null;
  administeredAt: string;
  createdAt?: string | null;
  effectiveAdministeredAt?: string | null;
  effectiveAdministeredAtVersion?: number | null;
  notes: string | null;
  /** From API (`findByEncounter`) or offline queue payload when present. */
  marAction?: string | null;
  infusionPhase?: string | null;
  infusionSessionKey?: string | null;
  doseValue?: string | number | null;
  doseUnit?: string | null;
  route?: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
  pendingSync?: boolean;
  administeredQuantity?: number | null;
};

type OrderItemApi = {
  id?: string;
  createdAt?: string | null;
  quantity?: number | null;
  catalogItemId?: string | null;
  catalogItemType?: string | null;
  manualLabel?: string | null;
  strength?: string | number | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
  route?: string | null;
  notes?: string | null;
  frequencyCode?: string | null;
  intendedAdministrationAt?: string | null;
  catalogMedication?: {
    code?: string | null;
    name?: string | null;
    displayNameEn?: string | null;
    displayNameFr?: string | null;
    genericName?: string | null;
    therapeuticClass?: string | null;
    administrationType?: string | null;
    route?: string | null;
    strength?: string | null;
    ndc11?: string | null;
    ndcDisplay?: string | null;
    billingUnitType?: string | null;
    isControlled?: boolean | null;
    controlledSchedule?: string | null;
    requiresWitness?: boolean | null;
    requiresDoubleSign?: boolean | null;
  } | null;
  medicationPackage?: {
    ndc11?: string | null;
    ndcDisplay?: string | null;
  } | null;
  medicationSafetyGovernance?: MedicationSafetyGovernanceDisplayInput | null;
};

/** Prefer live order-line label when MAR snapshot is incomplete (M1.7A.5 / M1.7A.6). */
function marMedicationDisplayLabel(
  medicationLabelSnapshot: string | null | undefined,
  orderLineLabel: string,
  strengthCandidates: (string | null | undefined)[] = []
): string {
  const snap = medicationLabelSnapshot?.trim();
  const incompleteOpts = { strengthCandidates, catalogItemType: "MEDICATION" as const };
  if (snap && !isIncompleteMedicationOrderDisplayLabel(snap, incompleteOpts)) return snap;
  const live = orderLineLabel.trim();
  if (live && !isIncompleteMedicationOrderDisplayLabel(live, incompleteOpts)) return live;
  return live || snap || orderLineLabel;
}

function marOrderItemToSafetyCatalogInput(it: OrderItemApi, displayLabel: string): MedicationSafetyCatalogInput {
  const cm = it.catalogMedication;
  const strengthRaw = it.strength;
  const strengthStr =
    typeof strengthRaw === "string"
      ? strengthRaw
      : strengthRaw != null && String(strengthRaw).trim() !== ""
        ? String(strengthRaw)
        : undefined;
  return {
    code: cm?.code ?? undefined,
    name: cm?.name ?? undefined,
    displayName: cm?.displayNameEn?.trim() || cm?.displayNameFr?.trim() || displayLabel,
    genericName: cm?.genericName?.trim() || undefined,
    therapeuticClass: cm?.therapeuticClass?.trim() || undefined,
    strength: strengthStr,
    route: it.route?.trim() || cm?.route?.trim() || undefined,
    manualLabel:
      String(it.catalogItemType ?? "").toUpperCase() === "MEDICATION" && !it.catalogItemId?.trim()
        ? it.manualLabel?.trim() || displayLabel
        : undefined,
    isControlled: cm?.isControlled ?? undefined,
    controlledSchedule: cm?.controlledSchedule ?? undefined,
  };
}

const RECENT_MS = 24 * 60 * 60 * 1000;

const MAR_INFUSION_STATUS_BADGE_ACTIVE: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "5px 12px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.01em",
  backgroundColor: "#e0f2fe",
  color: "#0369a1",
  border: "1px solid #7dd3fc",
};

const MAR_INFUSION_STATUS_BADGE_COMPLETED: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "5px 12px",
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.01em",
  backgroundColor: "#ccfbf1",
  color: "#0f766e",
  border: "1px solid #5eead4",
};

/** MAR table: min width matches colgroup sum so columns stay readable; horizontal scroll when viewport is narrower. */
const MAR_TABLE_MIN_WIDTH_PX = 1630;

/** Prefer normal word boundaries; avoid `anywhere` / aggressive `break-word` on attribution prose. */
const MAR_CELL_WRAP_LONG_TEXT: React.CSSProperties = {
  overflowWrap: "break-word",
  wordBreak: "normal",
  lineHeight: 1.35,
};

const MAR_TABLE_METRIC_CELL: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: 12,
  verticalAlign: "top",
  minWidth: 0,
  ...MAR_CELL_WRAP_LONG_TEXT,
  color: "#334155",
};

const MAR_TABLE_CONTROLS_CELL: React.CSSProperties = {
  padding: "10px 8px",
  verticalAlign: "top",
  minWidth: 0,
};

const MAR_DRAFT_VERSION = "medication-mar-documentation-v1";
const INFUSION_DRAFT_VERSION = "infusion-documentation-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

type MarDocumentationDraftPayload = {
  notes: string;
  effectiveTimeReason: string;
};

type InfusionDocumentationDraftPayload = {
  note: string;
};

function marDraftPayloadSignature(payload: MarDocumentationDraftPayload): string {
  return clinicalDraftPayloadSignature(payload);
}

function marDraftPayloadHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<MarDocumentationDraftPayload>;
  return Boolean(p.notes?.trim() || p.effectiveTimeReason?.trim());
}

function infusionDraftPayloadHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<InfusionDocumentationDraftPayload>;
  return Boolean(p.note?.trim());
}

type MarOrderEventRow = {
  id: string;
  orderId: string;
  eventType: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED";
  performedByDisplayName?: string | null;
  performedAt: string;
  metadata?: unknown;
};

function parseOrderEventsForMar(raw: unknown[] | null): MarOrderEventRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row) => ({
      id: String(row.id ?? ""),
      orderId: String(row.orderId ?? ""),
      eventType: String(row.eventType ?? "").trim().toUpperCase() as MarOrderEventRow["eventType"],
      performedByDisplayName:
        typeof row.performedByDisplayName === "string" ? row.performedByDisplayName : null,
      performedAt: String(row.performedAt ?? ""),
      metadata: row.metadata,
    }))
    .filter((e) => e.id && e.orderId && e.performedAt);
}

function isSameLocalCalendarDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

type MarAction = "administered" | "refused" | "not_available" | "md_changed";

function actionLabel(a: MarAction, tr: (k: string) => string): string {
  return tr(`marTab.actions.${a}`);
}

function buildMarNotes(
  action: MarAction,
  routeLine: string | undefined,
  userNotes: string,
  tr: (k: string) => string,
  injectionSite?: ImInjectionSiteId | ""
): string {
  const lines = [`${tr("marTab.noteActionPrefix")} ${actionLabel(action, tr)}`];
  if (routeLine?.trim()) lines.push(`${tr("marTab.noteRoutePrefix")} ${routeLine.trim()}`);
  if (injectionSite) {
    lines.push(`${tr("marTab.noteInjectionSitePrefix")} ${tr(`marTab.injectionSites.${injectionSite}`)}`);
  }
  const n = userNotes.trim();
  if (n) lines.push(n);
  return lines.join("\n");
}

const VACCINE_DEFAULT_TOPICS: VaccineReviewedTopic[] = [
  "reason_for_medication",
  "signs_of_allergic_reaction",
  "precautions",
];

function isTdapCatalogCode(code: string | null | undefined): boolean {
  return (code ?? "").trim().toUpperCase().startsWith("TDAP_");
}

function vaccineModalDefaultDose(catalogCode: string | null | undefined): { dose: string; unit: string } {
  if (isTdapCatalogCode(catalogCode)) return { dose: "0.5", unit: "mL" };
  return { dose: "", unit: "mL" };
}

/**
 * Resolved MAR clinical outcome: prefer persisted `marAction` (ER-3.2), then legacy notes parse.
 * `OrderItem.status` only answers active vs terminal lifecycle for the Orders dashboard.
 */
function latestMarClinicalActionForRow(latest: AdminRow | undefined): MarAction | undefined {
  if (!latest) return undefined;
  return resolveMedicationMarActionFromStorage({
    marAction: latest.marAction ?? null,
    notes: latest.notes,
  });
}

export type EncounterMarAllergySource = {
  vitals?: unknown;
  nursingAssessment?: unknown;
  triage?: { vitalsJson?: unknown } | null;
} | null;

export function MedicationAdministrationTab({
  encounterId,
  facilityId,
  currentUserId,
  encounterStatus,
  providerDocumentationStatus,
  roleCodes = [],
  encounterAllergySource = null,
  facilityTimeZone = null,
  embeddedWorkspaceLayout = false,
}: {
  encounterId: string;
  facilityId: string;
  currentUserId: string;
  encounterStatus: string;
  /** When SIGNED, clinical mutations (including MAR time adjust) are blocked server-side. */
  providerDocumentationStatus?: string | null;
  /** RN / PROVIDER / ADMIN may adjust effective administration time (MAR tab callers). */
  roleCodes?: string[];
  /** Parent encounter allergy context — avoids refetching GET /encounters/:id on the MAR tab. */
  encounterAllergySource?: EncounterMarAllergySource;
  /** Facility IANA timezone from encounter page shell (not fetched inside this tab). */
  facilityTimeZone?: string | null;
  /** Flatter MAR timeline when nested in ED workspace card. */
  embeddedWorkspaceLayout?: boolean;
}) {
  const { t, language } = useI18n();
  const clinicalData = useEncounterClinicalDataOptional();
  const useSharedClinicalData = clinicalData != null;
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [orders, setOrders] = useState<unknown[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [orderEventsRaw, setOrderEventsRaw] = useState<unknown[] | null>(null);
  const [infusionBusy, setInfusionBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Affichage immédiat si l’enregistrement MAR est seulement mis en file (pas encore confirmé serveur). */
  const [marQueuedOfflineNotice, setMarQueuedOfflineNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [modalItem, setModalItem] = useState<{
    orderItemId: string;
    label: string;
    authorityLine: string;
    attributionLines: string[];
    highRiskWarning: string | null;
    softSafetyWarnings: MedicationSafetyWarning[];
    advancedSafetyLine: AdvancedMedicationSafetyLine;
    routeHint: string;
    catalogCode?: string | null;
    catalogDisplayNameEn?: string | null;
    catalogDisplayNameFr?: string | null;
    therapeuticClass?: string | null;
    ndcHint: string;
    hiddenBilling: MarHiddenBillingPayload;
    billingUnitHint: string;
    orderedQuantity: number | null;
    governanceDisplay: MedicationSafetyGovernanceDisplayInput;
    /** When true, MAR modal hides one-step “administered” (perfusion uses start/stop). */
    hideAdministeredAction?: boolean;
    /** Same input as open-orders infusion classifier — blocks accidental MAR “administered” for bags/IV abx. */
    infusionClassifyPayload?: MedicationInfusionCandidateInput;
    /** M1.8B.7I.5 — dose-gated MAR instance when opened from pass queue. */
    medicationDoseInstanceId?: string | null;
    scheduledAt?: string | null;
    dueWindowStartAt?: string | null;
    dueWindowEndAt?: string | null;
    isPrn?: boolean;
    prnIndication?: string | null;
    prnReasonGroup?: ReturnType<typeof resolveMarPrnOrderMetadata>["prnReasonGroup"];
    frequencyCode?: string | null;
    directionsSig?: string | null;
    genericName?: string | null;
  } | null>(null);
  const [modalAction, setModalAction] = useState<MarAction>("administered");
  const [modalRoute, setModalRoute] = useState("");
  const [modalInjectionSite, setModalInjectionSite] = useState<ImInjectionSiteId | "">("");
  const [marPrnReasonCode, setMarPrnReasonCode] = useState<MarPrnReasonCode | "">("");
  const [marPrnEarlyOverrideReason, setMarPrnEarlyOverrideReason] = useState("");
  const [marPrnReasonOther, setMarPrnReasonOther] = useState("");
  const [marPainScore, setMarPainScore] = useState("");
  const [marPainLocation, setMarPainLocation] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalDoseValue, setModalDoseValue] = useState("");
  const [modalDoseUnit, setModalDoseUnit] = useState("");
  const [modalAdminQty, setModalAdminQty] = useState("");
  const [modalBillingQty, setModalBillingQty] = useState("");
  const [modalNdc, setModalNdc] = useState("");
  const [vaccineLotNumber, setVaccineLotNumber] = useState("");
  const [vaccineExpirationDate, setVaccineExpirationDate] = useState("");
  const [vaccineManufacturerId, setVaccineManufacturerId] = useState<VaccineAdministrationDocumentation["manufacturerId"]>("");
  const [vaccineVisGiven, setVaccineVisGiven] = useState(false);
  const [vaccineVisRecipient, setVaccineVisRecipient] = useState<VaccineAdministrationDocumentation["visRecipient"]>("none");
  const [vaccineVisDate, setVaccineVisDate] = useState("");
  const [vaccineAllergiesVerified, setVaccineAllergiesVerified] = useState(false);
  const [vaccineFiveRightsConfirmed, setVaccineFiveRightsConfirmed] = useState(false);
  const [vaccineEducationReviewed, setVaccineEducationReviewed] = useState(false);
  const [vaccineReviewedWith, setVaccineReviewedWith] = useState<VaccineEducationRecipient | "">("");
  const [vaccineReviewedTopics, setVaccineReviewedTopics] = useState<VaccineReviewedTopic[]>([]);
  const [vaccineUnderstandingConfirmed, setVaccineUnderstandingConfirmed] = useState(false);
  const [vaccineAmountWasted, setVaccineAmountWasted] = useState("");
  const [marAllergyDocSummary, setMarAllergyDocSummary] = useState<string | null>(null);
  const [marAllergySafetyAck, setMarAllergySafetyAck] = useState(false);
  const [marTimingOverrideAck, setMarTimingOverrideAck] = useState(false);
  const [marScheduleTimingReason, setMarScheduleTimingReason] = useState("");
  const [marScheduleTimingReasonCode, setMarScheduleTimingReasonCode] = useState("");
  const [marHighRiskSafetyAck, setMarHighRiskSafetyAck] = useState(false);
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
  const [modalShowEffectiveTimeEditor, setModalShowEffectiveTimeEditor] = useState(true);
  const [modalEffectiveTimeLocal, setModalEffectiveTimeLocal] = useState("");
  const [modalEffectiveTimeReason, setModalEffectiveTimeReason] = useState("");
  const [modalClinicalTimeReasonCode, setModalClinicalTimeReasonCode] = useState("");
  const [marDraftRestoredAt, setMarDraftRestoredAt] = useState<string | null>(null);
  const [marDraftSavedLocallyAt, setMarDraftSavedLocallyAt] = useState<string | null>(null);
  const [marSafetyDetailsOpen, setMarSafetyDetailsOpen] = useState(false);
  const [marGovernanceDetailsOpen, setMarGovernanceDetailsOpen] = useState(false);
  const [marControlledForm, setMarControlledForm] = useState<MarControlledSubstanceFormState>({
    witnessUserId: null,
    witnessDisplayName: "",
    wasteAmount: "",
    wasteUnit: "",
    wasteReason: "",
    overrideReason: "",
    controlledOverrideAcknowledged: false,
    useOverride: false,
  });
  const [marHighAlertForm, setMarHighAlertForm] = useState<MarHighAlertFormState>({
    verifierUserId: null,
    verifierDisplayName: "",
    highAlertOverrideReason: "",
    highAlertOverrideAcknowledged: false,
    useOverride: false,
  });
  const [showHighAlertVerifierModal, setShowHighAlertVerifierModal] = useState(false);
  const [marLasaForm, setMarLasaForm] = useState<MarLasaFormState>({
    lasaAcknowledged: false,
    lasaMedicationSelectionConfirmed: false,
    secondReadUserId: null,
    secondReadDisplayName: "",
    lasaOverrideReason: "",
    lasaOverrideAcknowledged: false,
    useOverride: false,
  });
  const [marLasaFieldErrors, setMarLasaFieldErrors] = useState<
    Partial<Record<keyof MarLasaFormState | "lasa", string>>
  >({});
  const [marPharmacyForm, setMarPharmacyForm] = useState<MarPharmacyFormState>({
    pharmacyVerificationOverrideReason: "",
    pharmacyVerificationOverrideAcknowledged: false,
    useOverride: false,
  });
  const [adminTimeModalRow, setAdminTimeModalRow] = useState<AdminRow | null>(null);
  const [adminTimeSaving, setAdminTimeSaving] = useState(false);
  const [marHistoryRawEntries, setMarHistoryRawEntries] = useState<MedicationAdministrationHistoryEntry[]>(
    []
  );
  const [infusionModal, setInfusionModal] = useState<{
    orderItemId: string;
    orderId: string;
    op: "start" | "stop";
    label: string;
  } | null>(null);
  const [infusionStartWitnessModal, setInfusionStartWitnessModal] = useState<{
    orderItemId: string;
    orderId: string;
    label: string;
  } | null>(null);
  const [pendingInfusionStartVerifier, setPendingInfusionStartVerifier] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);
  const [infusionModalNote, setInfusionModalNote] = useState("");
  const [infusionStopReasonCode, setInfusionStopReasonCode] = useState("COMPLETED");
  const [infusionStopReasonDetail, setInfusionStopReasonDetail] = useState("");
  const [infusionClinicalTimeValue, setInfusionClinicalTimeValue] = useState("");
  const [infusionTimingReasonCode, setInfusionTimingReasonCode] = useState("");
  const [infusionTimingReasonDetail, setInfusionTimingReasonDetail] = useState("");
  const [infusionDraftRestoredAt, setInfusionDraftRestoredAt] = useState<string | null>(null);
  const [infusionDraftSavedLocallyAt, setInfusionDraftSavedLocallyAt] = useState<string | null>(null);
  const [passQueue, setPassQueue] = useState<MedicationPassQueueResponse>({
    enabled: false,
    at: "",
    count: 0,
    items: [],
  });
  const timelineRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const refreshMarViews = useCallback(async () => {
    await timelineRefreshRef.current?.();
  }, []);

  const timelineCloseDrawerRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onRoomAssignmentRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ encounterId?: string }>).detail;
      if (detail?.encounterId && detail.encounterId !== encounterId) return;
      void refreshMarViews();
    };
    window.addEventListener(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH, onRoomAssignmentRefresh);
    return () => window.removeEventListener(MEDORA_ENCOUNTER_ROOM_ASSIGNMENT_REFRESH, onRoomAssignmentRefresh);
  }, [encounterId, refreshMarViews]);
  const timelineReopenDrawerRef = useRef<
    ((orderItemId: string, medicationDoseInstanceId?: string | null, scheduledAt?: string | null) => void) | null
  >(null);
  const timelineDrawerAdministerTargetRef = useRef<{
    orderItemId: string;
    medicationDoseInstanceId: string;
    scheduledAt: string;
  } | null>(null);
  const [pendingTimelineStartItem, setPendingTimelineStartItem] = useState<MarShiftTimelineCellItem | null>(
    null
  );
  const marRestoringDraftRef = useRef(false);
  const infusionRestoringDraftRef = useRef(false);
  /** Re-render periodically so infusion elapsed time updates on the MAR grid. */
  const [, setInfusionClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setInfusionClockTick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const [panelDensity, setPanelDensity] = useState(() =>
    typeof window !== "undefined" ? resolveClinicalTabletPanelDensityMode(window.innerWidth) : "default"
  );
  const clinicalTz = useMemo(
    () => resolveClinicalTimeZone({ facilityTimeZone }),
    [facilityTimeZone]
  );

  useEffect(() => {
    if (!infusionModal) return;
    setInfusionClinicalTimeValue(clinicalDatetimeLocalFromInstant(new Date(), clinicalTz));
    setInfusionTimingReasonCode("");
    setInfusionTimingReasonDetail("");
  }, [infusionModal, clinicalTz]);
  const [marSelectedDateLocal, setMarSelectedDateLocal] = useState(() =>
    resolveFacilityLocalToday(clinicalTz)
  );
  const [marShiftCode, setMarShiftCode] = useState<MarShiftTimelineShiftCode>("7A_7P");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyDensity = () => {
      setPanelDensity(resolveClinicalTabletPanelDensityMode(window.innerWidth));
    };
    applyDensity();
    window.addEventListener("resize", applyDensity);
    return () => window.removeEventListener("resize", applyDensity);
  }, []);

  const handleMarSelectedDateChange = useCallback((dateLocal: string) => {
    setMarSelectedDateLocal(dateLocal);
  }, []);

  const loadMarHistoryForCorrections = useCallback(async () => {
    try {
      const rows = await fetchMedicationAdministrationHistory(encounterId, facilityId);
      setMarHistoryRawEntries(rows);
    } catch {
      setMarHistoryRawEntries([]);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadMarHistoryForCorrections();
  }, [loadMarHistoryForCorrections]);

  useEffect(() => {
    if (!modalItem) return;
    const tz = resolveClinicalTimeZone({ facilityTimeZone });
    setModalEffectiveTimeLocal(currentMarClinicalDateTimeLocalValue(tz));
    setModalClinicalTimeReasonCode("");
    setModalEffectiveTimeReason("");
    setModalShowEffectiveTimeEditor(true);
  }, [modalItem?.orderItemId, facilityTimeZone]);

  const clearModalEffectiveTime = useCallback(() => {
    const tz = resolveClinicalTimeZone({ facilityTimeZone });
    setModalShowEffectiveTimeEditor(true);
    setModalEffectiveTimeLocal(currentMarClinicalDateTimeLocalValue(tz));
    setModalEffectiveTimeReason("");
    setModalClinicalTimeReasonCode("");
  }, [facilityTimeZone]);

  const encounterOpen = encounterStatus === "OPEN";
  const encounterClinicalMutationsAllowed =
    encounterOpen && !isEncounterLocked({ providerDocumentationStatus });
  /** When omitted, callers rely on MAR-tab route gating (RN / PROVIDER / ADMIN only). */
  const canAdjustAdminTime = canAdjustMedicationAdministrationTime(
    roleCodes.length > 0 ? roleCodes : ["RN", "PROVIDER", "ADMIN"]
  );
  const marDraftScope = useMemo<ClinicalDraftScope | null>(() => {
    const orderItemId = modalItem?.orderItemId?.trim();
    if (!orderItemId) return null;
    return {
      workflowType: "MEDICATION_MAR_DOCUMENTATION",
      encounterId,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: MAR_DRAFT_VERSION,
      subjectId: orderItemId,
    };
  }, [encounterId, facilityId, modalItem?.orderItemId]);
  const marDraftKey = useMemo(() => (marDraftScope ? buildClinicalDraftKey(marDraftScope) : null), [marDraftScope]);
  const marDraftPayload = useMemo<MarDocumentationDraftPayload>(
    () => ({ notes: modalNotes, effectiveTimeReason: modalEffectiveTimeReason }),
    [modalEffectiveTimeReason, modalNotes]
  );
  const marDraftDirty = Boolean(
    modalItem &&
      marDraftKey &&
      marDraftPayloadSignature(marDraftPayload) !== marDraftPayloadSignature({ notes: "", effectiveTimeReason: "" })
  );
  const infusionDraftScope = useMemo<ClinicalDraftScope | null>(() => {
    if (!infusionModal) return null;
    return {
      workflowType:
        infusionModal.op === "start" ? "INFUSION_START_DOCUMENTATION" : "INFUSION_STOP_DOCUMENTATION",
      encounterId,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: INFUSION_DRAFT_VERSION,
      subjectId: infusionModal.orderItemId,
    };
  }, [encounterId, facilityId, infusionModal]);
  const infusionDraftKey = useMemo(
    () => (infusionDraftScope ? buildClinicalDraftKey(infusionDraftScope) : null),
    [infusionDraftScope]
  );
  const infusionDraftPayload = useMemo<InfusionDocumentationDraftPayload>(
    () => ({ note: infusionModalNote }),
    [infusionModalNote]
  );
  const infusionDraftDirty = Boolean(infusionModal && infusionDraftKey && infusionModalNote.trim());

  useClinicalBeforeUnloadWarning({
    dirty: (marDraftDirty && Boolean(marDraftSavedLocallyAt)) || (infusionDraftDirty && Boolean(infusionDraftSavedLocallyAt)),
    workflowEditable: encounterClinicalMutationsAllowed,
  });

  const orderItemById = useMemo(() => {
    const map = new Map<string, OrderItemApi>();
    for (const o of orders) {
      const order = asApiObject(o);
      const items = Array.isArray(order?.items) ? order.items : [];
      for (const it of items) {
        const row = asApiObject(it) as OrderItemApi | null;
        if (row?.id) map.set(String(row.id), row);
      }
    }
    return map;
  }, [orders]);

  const resolveHistoryMedicationLabel = useCallback(
    (admin: Pick<AdminRow, "medicationLabelSnapshot" | "orderItemId">) => {
      const orderItem = admin.orderItemId ? orderItemById.get(admin.orderItemId) : undefined;
      return resolveMarAdministrationHistoryLabel({
        medicationLabelSnapshot: admin.medicationLabelSnapshot,
        orderItem: orderItem as Parameters<typeof resolveMarAdministrationHistoryLabel>[0]["orderItem"],
        language: language as SupportedLanguage,
        t,
      });
    },
    [orderItemById, language, t]
  );

  useEffect(() => {
    if (!encounterAllergySource) return;
    setMarAllergyDocSummary(
      getEncounterAllergyDocumentationSummary({
        vitals: encounterAllergySource.vitals,
        nursingAssessment: encounterAllergySource.nursingAssessment,
        triageVitalsJson: encounterAllergySource.triage?.vitalsJson ?? null,
      })
    );
  }, [encounterAllergySource]);

  const loadAllStandalone = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pendingAdmins, pendingOrders] = await Promise.all([
      getPendingMedicationAdminsFromQueue(
        facilityId,
        encounterId,
        t("marTab.pendingSyncFirstName"),
        t("marTab.pendingSyncLastName")
      ).catch(() => [] as AdminRow[]),
      getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]),
    ]);

    try {
      const [o, a, encRaw, passQueueRes, ev] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
        encounterAllergySource
          ? Promise.resolve(null)
          : apiFetch(`/encounters/${encounterId}`, { facilityId }),
        fetchMedicationPassQueue(facilityId, { encounterId, includeUpcoming: true }),
        apiFetch(`/encounters/${encounterId}/order-events`, { facilityId }).catch(() => []),
      ]);
      const eventsRaw = Array.isArray(ev) ? ev : [];

      const serverOrders = Array.isArray(o) ? o : [];
      const serverAdmins = Array.isArray(a) ? (a as AdminRow[]) : [];
      if (!encounterAllergySource) {
        const encObj = asApiObject(encRaw) as {
          vitals?: unknown;
          nursingAssessment?: unknown;
          triage?: { vitalsJson?: unknown } | null;
        } | null;
        setMarAllergyDocSummary(
          getEncounterAllergyDocumentationSummary({
            vitals: encObj?.vitals,
            nursingAssessment: encObj?.nursingAssessment,
            triageVitalsJson: encObj?.triage?.vitalsJson ?? null,
          })
        );
      }

      setOrders(mergeOrders(serverOrders, pendingOrders));
      setAdmins([...serverAdmins, ...pendingAdmins]);
      setOrderEventsRaw(eventsRaw);
      setPassQueue(passQueueRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marTab.loadFailed"));
      setOrders(mergeOrders([], pendingOrders));
      setAdmins(pendingAdmins);
      setOrderEventsRaw([]);
      if (!encounterAllergySource) setMarAllergyDocSummary(null);
      setPassQueue({ enabled: false, at: new Date().toISOString(), count: 0, items: [] });
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, encounterAllergySource, t]);

  const reloadMarData = useCallback(async () => {
    if (useSharedClinicalData && clinicalData) {
      await clinicalData.refresh("marMutation", { reason: "mutation", force: true });
      return;
    }
    await loadAllStandalone();
  }, [useSharedClinicalData, clinicalData, loadAllStandalone]);

  const handleMarCorrectionSaved = useCallback(async () => {
    await reloadMarData();
    await refreshMarViews();
    await loadMarHistoryForCorrections();
  }, [loadMarHistoryForCorrections, reloadMarData, refreshMarViews]);

  useEffect(() => {
    if (!useSharedClinicalData || !clinicalData) return;
    perfClinicalDataLog("MAR tab using shared orders cache");
    setOrders(clinicalData.orders);
    setAdmins(clinicalData.medicationAdministrations as AdminRow[]);
    setOrderEventsRaw(clinicalData.orderEvents);
    setPassQueue(clinicalData.passQueue);
    const awaitingFirstPayload =
      clinicalData.orders.length === 0 && clinicalData.medicationAdministrations.length === 0;
    setLoading(clinicalData.loading.any && awaitingFirstPayload);
    if (clinicalData.errors.mar || clinicalData.errors.orders) {
      setError(clinicalData.errors.mar || clinicalData.errors.orders);
    } else if (!clinicalData.loading.any || !awaitingFirstPayload) {
      setError(null);
    }
  }, [
    useSharedClinicalData,
    clinicalData,
    clinicalData?.orders,
    clinicalData?.medicationAdministrations,
    clinicalData?.orderEvents,
    clinicalData?.passQueue,
    clinicalData?.loading.any,
    clinicalData?.errors.mar,
    clinicalData?.errors.orders,
  ]);

  useEffect(() => {
    if (useSharedClinicalData) return;
    void loadAllStandalone();
  }, [useSharedClinicalData, loadAllStandalone]);

  const adminsByOrderItemId = useMemo(() => {
    const m = new Map<string, AdminRow[]>();
    for (const r of admins) {
      if (!r.orderItemId) continue;
      const list = m.get(r.orderItemId) ?? [];
      list.push(r);
      m.set(r.orderItemId, list);
    }
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
      m.set(k, list);
    }
    return m;
  }, [admins]);

  const marOrderEventRows = useMemo(() => parseOrderEventsForMar(orderEventsRaw), [orderEventsRaw]);

  const runMarInfusion = useCallback(
    async (
      orderItemId: string,
      orderId: string,
      op: "start" | "stop",
      note?: string,
      startVerifier?: { userId: string; displayName: string } | null,
      options?: {
        medicationDoseInstanceId?: string;
        startedAtIso?: string;
        stoppedAtIso?: string;
        stopReasonCode?: string;
        reasonDetail?: string;
        skipReload?: boolean;
        skipModalClose?: boolean;
      }
    ) => {
      const busyKey = `${orderId}:${orderItemId}:${op}`;
      setInfusionBusy(busyKey);
      setError(null);
      try {
        if (op === "start") {
          await startMedicationInfusion(orderItemId, facilityId, {
            ...(note?.trim() ? { notes: note.trim() } : {}),
            ...(options?.startedAtIso?.trim() ? { startedAt: options.startedAtIso.trim() } : {}),
            ...(options?.medicationDoseInstanceId?.trim()
              ? { medicationDoseInstanceId: options.medicationDoseInstanceId.trim() }
              : {}),
            ...(startVerifier?.userId
              ? {
                  highAlertVerifierUserId: startVerifier.userId,
                  highAlertVerifierDisplayName: startVerifier.displayName,
                }
              : {}),
          });
        } else {
          await stopMedicationInfusion(orderItemId, facilityId, {
            stopReasonCode: options?.stopReasonCode?.trim() || infusionStopReasonCode || "COMPLETED",
            ...(options?.reasonDetail?.trim() || infusionStopReasonDetail.trim()
              ? { reasonDetail: (options?.reasonDetail ?? infusionStopReasonDetail).trim() }
              : {}),
            ...(note?.trim() ? { notes: note.trim() } : {}),
            ...(options?.stoppedAtIso?.trim() ? { stoppedAt: options.stoppedAtIso.trim() } : {}),
            ...(options?.medicationDoseInstanceId?.trim()
              ? { medicationDoseInstanceId: options.medicationDoseInstanceId.trim() }
              : {}),
          });
        }
        if (infusionDraftKey && typeof window !== "undefined") {
          removeClinicalDraft(window.localStorage, infusionDraftKey);
        }
        if (!options?.skipModalClose) {
          setInfusionModal(null);
          setInfusionModalNote("");
          setInfusionStopReasonCode("COMPLETED");
          setInfusionStopReasonDetail("");
          setPendingInfusionStartVerifier(null);
          setInfusionDraftRestoredAt(null);
          setInfusionDraftSavedLocallyAt(null);
        }
        if (!options?.skipReload) {
          await reloadMarData();
        }
      } catch (e) {
        setError(
          extractMarSaveErrorMessage(e, language, t("marTab.infusionActionError"), t)
        );
        throw e;
      } finally {
        setInfusionBusy(null);
      }
    },
    [facilityId, infusionDraftKey, infusionStopReasonCode, infusionStopReasonDetail, language, reloadMarData, t]
  );

  /** Same medication line = same `orderItemId`; most recent MAR row with outcome "administered". */
  const lastAdministeredForModal = useMemo(() => {
    if (!modalItem) return null;
    const list = adminsByOrderItemId.get(modalItem.orderItemId) ?? [];
    for (const r of list) {
      const act = resolveMedicationMarActionFromStorage({
        marAction: r.marAction ?? null,
        notes: r.notes,
      });
      if (act === "administered") return r;
    }
    return null;
  }, [modalItem, adminsByOrderItemId]);

  const modalPrnEarlyAdministration = useMemo(() => {
    if (!modalItem?.isPrn || modalAction !== "administered") return false;
    const clinicalTz = resolveClinicalTimeZone({ facilityTimeZone });
    const proposed =
      modalEffectiveTimeLocal.trim()
        ? clinicalDatetimeLocalToUtcDate(modalEffectiveTimeLocal, clinicalTz) ?? new Date()
        : new Date();
    return isPrnAdministrationBeforeNextEligible({
      proposedAdministeredAt: proposed,
      lastAdministeredAt: lastAdministeredForModal?.administeredAt ?? null,
      frequencyCode: modalItem.frequencyCode,
    });
  }, [
    modalItem,
    modalAction,
    modalEffectiveTimeLocal,
    facilityTimeZone,
    lastAdministeredForModal,
  ]);

  const taskRows = useMemo(() => {
    type RowDraft = {
      orderId: string;
      orderItemId: string;
      isInfusionLifecycleMed: boolean;
      infusionClassifyPayload: MedicationInfusionCandidateInput;
      label: string;
      routeHint: string;
      catalogCode: string | null;
      catalogDisplayNameEn: string | null;
      catalogDisplayNameFr: string | null;
      ndcHint: string;
      hiddenBilling: MarHiddenBillingPayload;
      billingUnitHint: string;
      orderedQuantity: number | null;
      intendedAt?: string | null;
      authorityLine: string;
      attributionLines: string[];
      highRiskWarning: string | null;
      safetyCatalogInput: MedicationSafetyCatalogInput;
      advancedSafetyLine: AdvancedMedicationSafetyLine;
      governanceDisplay: MedicationSafetyGovernanceDisplayInput;
    };
    const drafts: RowDraft[] = [];
    for (const order of orders) {
      if ((order as { status?: string }).status === "CANCELLED") continue;
      const parentOrderId = String((order as { id?: unknown }).id ?? "").trim();
      const items = (order as { items?: OrderItemApi[] }).items ?? [];
      for (const it of items) {
        if (!it.id) continue;
        if (String(it.id).startsWith("local:")) continue;
        if (!isOrderItemPendingNurseMedication(it)) continue;
        const embeddedOrderIdRaw = (it as { orderId?: unknown }).orderId;
        const embeddedOrderId =
          typeof embeddedOrderIdRaw === "string"
            ? embeddedOrderIdRaw.trim()
            : embeddedOrderIdRaw != null && String(embeddedOrderIdRaw).trim() !== ""
              ? String(embeddedOrderIdRaw).trim()
              : "";
        const orderId = parentOrderId || embeddedOrderId;
        const label = getOrderItemDisplayLabelForLanguage(
          it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
          language as SupportedLanguage,
          t
        );
        const itemRec = it as Record<string, unknown>;
        const routeSnap = medicationRouteSnapshotForInfusionCheck(itemRec);
        const catM = it.catalogMedication;
        const catRow = catM && typeof catM === "object" ? (catM as Record<string, unknown>) : null;
        const fulfillment = String(it.medicationFulfillmentIntent ?? "ADMINISTER_CHART");
        const rawClassText = medicationInfusionClassificationText(itemRec).trim();
        const medicationLabelForClass = (rawClassText || label.trim()).trim() || null;
        const infusionClassifyPayload: MedicationInfusionCandidateInput = {
          route: routeSnap.trim() || null,
          medicationLabel: medicationLabelForClass,
          code: typeof catRow?.code === "string" ? catRow.code : null,
          genericName: typeof catRow?.genericName === "string" ? catRow.genericName : null,
          metadata: null,
          catalogAdministrationType:
            typeof catRow?.administrationType === "string" ? catRow.administrationType : null,
        };
        const isInfusionLifecycleMed =
          String(it.catalogItemType ?? "") === "MEDICATION" &&
          fulfillment === "ADMINISTER_CHART" &&
          isMedicationInfusionCandidate(infusionClassifyPayload);
        const rawQ = it.quantity;
        const orderedQuantity =
          typeof rawQ === "number" && Number.isFinite(rawQ)
            ? rawQ
            : rawQ != null && String(rawQ).trim() !== ""
              ? (() => {
                  const n = Number(rawQ);
                  return Number.isFinite(n) ? n : null;
                })()
              : null;
        const hiddenBilling = resolveMarHiddenBillingPayload({
          catalogMedication: catM as OrderItemApi["catalogMedication"],
          medicationPackage: (it as OrderItemApi).medicationPackage ?? null,
          strength: it.strength,
          quantity: orderedQuantity,
        });
        drafts.push({
          orderId,
          orderItemId: it.id,
          isInfusionLifecycleMed,
          infusionClassifyPayload,
          label,
          catalogCode: typeof catRow?.code === "string" ? catRow.code : null,
          catalogDisplayNameEn: typeof catRow?.displayNameEn === "string" ? catRow.displayNameEn : null,
          catalogDisplayNameFr: typeof catRow?.displayNameFr === "string" ? catRow.displayNameFr : null,
          authorityLine: formatOrderAuthority(order as Record<string, unknown>, t),
          attributionLines: formatOrderAttributionLines(order as Record<string, unknown>, t, language),
          highRiskWarning: highRiskMedicationWarning({ ...it, label }, t),
          routeHint: it.route?.trim() || it.catalogMedication?.route?.trim() || "",
          ndcHint: hiddenBilling.ndc ?? "",
          hiddenBilling,
          billingUnitHint: it.catalogMedication?.billingUnitType?.trim() || "",
          orderedQuantity,
          intendedAt: it.intendedAdministrationAt ?? null,
          safetyCatalogInput: marOrderItemToSafetyCatalogInput(it, label),
          advancedSafetyLine:
            orderItemLikeToAdvancedMedicationSafetyLine(it, label) ?? ({
              lineKey: it.id,
              catalogItemId: it.catalogItemId ?? null,
              displayName: label,
            } satisfies AdvancedMedicationSafetyLine),
          governanceDisplay: orderItemToMedicationSafetyGovernanceDisplay(it, {
            highRiskNameMatch: isHighRiskMedication({ ...it, label }),
          }),
        });
      }
    }
    const siblingInputs = drafts.map((d) => d.safetyCatalogInput);
    return drafts.map((row, idx) => {
      const { safetyCatalogInput, ...rest } = row;
      return {
        ...rest,
        therapeuticClass: safetyCatalogInput.therapeuticClass ?? null,
        softSafetyWarnings: getMedicationSafetyWarnings(safetyCatalogInput, {
          siblingMedications: siblingInputs.filter((_, i) => i !== idx),
        }),
      };
    });
  }, [orders, language, t]);

  useEffect(() => {
    if (!modalItem || !marDraftKey || !marDraftScope || marRestoringDraftRef.current) return;
    setMarDraftRestoredAt(null);
    setMarDraftSavedLocallyAt(null);
    if (typeof window === "undefined") return;
    const rowStillDraftable = taskRows.some((row) => row.orderItemId === modalItem.orderItemId);
    const draft = readClinicalDraft<MarDocumentationDraftPayload>(window.localStorage, marDraftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: marDraftScope,
      workflowEditable: encounterClinicalMutationsAllowed && rowStillDraftable,
      encounterStatus,
      hasPayloadContent: marDraftPayloadHasContent,
    });
    if (canRestore && draft) {
      marRestoringDraftRef.current = true;
      setModalNotes(draft.payload.notes ?? "");
      setModalEffectiveTimeReason(draft.payload.effectiveTimeReason ?? "");
      setMarDraftRestoredAt(draft.metadata.savedLocallyAt);
      setMarDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
      queueMicrotask(() => {
        marRestoringDraftRef.current = false;
      });
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, marDraftKey);
    }
  }, [encounterClinicalMutationsAllowed, encounterStatus, marDraftKey, marDraftScope, modalItem, taskRows]);

  useEffect(() => {
    if (!modalItem || !marDraftKey || !marDraftScope || marRestoringDraftRef.current) return;
    if (!encounterClinicalMutationsAllowed) return;
    if (!marDraftDirty || !marDraftPayloadHasContent(marDraftPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, marDraftKey);
      setMarDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      marDraftKey,
      createClinicalDraft({
        scope: marDraftScope,
        payload: marDraftPayload,
        savedLocallyAt,
      })
    );
    setMarDraftSavedLocallyAt(savedLocallyAt);
  }, [encounterClinicalMutationsAllowed, marDraftDirty, marDraftKey, marDraftPayload, marDraftScope, modalItem]);

  useEffect(() => {
    if (!infusionModal || !infusionDraftKey || !infusionDraftScope || infusionRestoringDraftRef.current) return;
    setInfusionDraftRestoredAt(null);
    setInfusionDraftSavedLocallyAt(null);
    if (typeof window === "undefined") return;
    const draft = readClinicalDraft<InfusionDocumentationDraftPayload>(window.localStorage, infusionDraftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: infusionDraftScope,
      workflowEditable: encounterClinicalMutationsAllowed,
      encounterStatus,
      hasPayloadContent: infusionDraftPayloadHasContent,
    });
    if (canRestore && draft) {
      infusionRestoringDraftRef.current = true;
      setInfusionModalNote(draft.payload.note ?? "");
      setInfusionDraftRestoredAt(draft.metadata.savedLocallyAt);
      setInfusionDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
      queueMicrotask(() => {
        infusionRestoringDraftRef.current = false;
      });
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, infusionDraftKey);
    }
  }, [encounterClinicalMutationsAllowed, encounterStatus, infusionDraftKey, infusionDraftScope, infusionModal]);

  useEffect(() => {
    if (!infusionModal || !infusionDraftKey || !infusionDraftScope || infusionRestoringDraftRef.current) return;
    if (!encounterClinicalMutationsAllowed) return;
    if (!infusionDraftDirty || !infusionDraftPayloadHasContent(infusionDraftPayload)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, infusionDraftKey);
      setInfusionDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      infusionDraftKey,
      createClinicalDraft({
        scope: infusionDraftScope,
        payload: infusionDraftPayload,
        savedLocallyAt,
      })
    );
    setInfusionDraftSavedLocallyAt(savedLocallyAt);
  }, [
    encounterClinicalMutationsAllowed,
    infusionDraftDirty,
    infusionDraftKey,
    infusionDraftPayload,
    infusionDraftScope,
    infusionModal,
  ]);

  const marAdvancedMedicationSafetyWarnings = useMemo(() => {
    if (!modalItem?.advancedSafetyLine || modalAction !== "administered") return [];
    const adminQty = modalAdminQty.trim() ? Number(modalAdminQty) : null;
    const draft = mergeAdvancedMedicationLineWithDraft(modalItem.advancedSafetyLine, {
      strength: modalDoseValue.trim() || undefined,
      route: modalRoute.trim() || undefined,
      quantity:
        adminQty != null && Number.isFinite(adminQty)
          ? adminQty
          : modalItem.orderedQuantity != null && Number.isFinite(modalItem.orderedQuantity)
            ? modalItem.orderedQuantity
            : undefined,
    });
    const siblings = taskRows
      .filter((r) => r.orderItemId !== modalItem.orderItemId)
      .map((r) => r.advancedSafetyLine);
    return computeAdvancedMedicationSafetyForSingleLine({
      primaryLine: draft,
      siblingEncounterLines: siblings,
    });
  }, [modalItem, modalAction, taskRows, modalDoseValue, modalRoute, modalAdminQty]);

  const modalResolvedRoute = modalRoute.trim() || modalItem?.routeHint || "";
  const modalIsVaccine = useMemo(() => {
    if (!modalItem) return false;
    return isVaccineMedicationForMar({
      catalogCode: modalItem.catalogCode,
      medicationLabel: modalItem.label,
      genericName: modalItem.genericName,
      therapeuticClass: modalItem.therapeuticClass,
    });
  }, [modalItem]);
  const modalVaccineDisplayName = useMemo(() => {
    if (!modalItem) return "";
    return resolveVaccineAdministrationDisplayName({
      catalogCode: modalItem.catalogCode,
      displayNameEn: modalItem.catalogDisplayNameEn ?? modalItem.label,
      displayNameFr: modalItem.catalogDisplayNameFr ?? modalItem.label,
      locale: language === "en" ? "en" : "fr",
    });
  }, [language, modalItem]);
  const modalVaccineDocumentation = useMemo<VaccineAdministrationDocumentation | null>(() => {
    if (!modalItem || !modalIsVaccine) return null;
    const administeredAt = modalEffectiveTimeLocal.trim()
      ? marClinicalDateTimeLocalToUtcIso(modalEffectiveTimeLocal, clinicalTz) || new Date().toISOString()
      : new Date().toISOString();
    return {
      vaccineProductId: null,
      catalogCode: modalItem.catalogCode ?? "",
      vaccineDisplayName: modalVaccineDisplayName || modalItem.label,
      dose: modalDoseValue.trim() || (isTdapCatalogCode(modalItem.catalogCode) ? "0.5" : ""),
      unit: modalDoseUnit.trim() || (isTdapCatalogCode(modalItem.catalogCode) ? "mL" : ""),
      route: modalResolvedRoute || (isTdapCatalogCode(modalItem.catalogCode) ? "IM" : ""),
      site: modalInjectionSite,
      laterality: vaccineInjectionSiteLaterality(modalInjectionSite),
      lotNumber: vaccineLotNumber,
      expirationDate: vaccineExpirationDate,
      manufacturerId: vaccineManufacturerId,
      manufacturerDisplayName: vaccineManufacturerLabel(vaccineManufacturerId, language === "en" ? "en" : "fr"),
      visGiven: vaccineVisGiven,
      visRecipient: vaccineVisGiven ? vaccineVisRecipient : "none",
      visDate: vaccineVisGiven ? vaccineVisDate : "",
      visEditionDate: null,
      allergiesVerified: vaccineAllergiesVerified,
      fiveRightsConfirmed: vaccineFiveRightsConfirmed,
      educationReviewed: vaccineEducationReviewed,
      reviewedWith: vaccineReviewedWith,
      reviewedTopics: vaccineReviewedTopics,
      understandingConfirmed: vaccineUnderstandingConfirmed,
      amountWasted: vaccineAmountWasted,
      administeredAt,
      administeredBy: currentUserId,
      administeredByCredentials: "",
    };
  }, [
    clinicalTz,
    currentUserId,
    language,
    modalDoseUnit,
    modalDoseValue,
    modalEffectiveTimeLocal,
    modalInjectionSite,
    modalIsVaccine,
    modalItem,
    modalResolvedRoute,
    modalVaccineDisplayName,
    vaccineAllergiesVerified,
    vaccineAmountWasted,
    vaccineEducationReviewed,
    vaccineExpirationDate,
    vaccineFiveRightsConfirmed,
    vaccineLotNumber,
    vaccineManufacturerId,
    vaccineReviewedTopics,
    vaccineReviewedWith,
    vaccineUnderstandingConfirmed,
    vaccineVisDate,
    vaccineVisGiven,
    vaccineVisRecipient,
  ]);
  const modalNormalizedVaccineDocumentation = useMemo(
    () =>
      modalVaccineDocumentation
        ? normalizeVaccineAdministrationDocumentation(modalVaccineDocumentation)
        : null,
    [modalVaccineDocumentation]
  );
  const modalVaccineNotePreview = useMemo(
    () =>
      modalNormalizedVaccineDocumentation
        ? buildVaccineAdministrationAuditNote(modalNormalizedVaccineDocumentation, language === "en" ? "en" : "fr")
        : "",
    [language, modalNormalizedVaccineDocumentation]
  );
  const modalVaccineValidationBlockers = useMemo(
    () =>
      modalNormalizedVaccineDocumentation
        ? buildVaccineValidationBlockerReport(modalNormalizedVaccineDocumentation)
        : null,
    [modalNormalizedVaccineDocumentation]
  );
  const modalIsContinuousInfusion =
    modalItem?.infusionClassifyPayload != null &&
    isMedicationInfusionCandidate(modalItem.infusionClassifyPayload);
  const marInfusionStartRouteOptionsFromRow = useCallback(
    (row: (typeof taskRows)[0]): MarHighAlertRouteOptions => {
      const payload = row.infusionClassifyPayload;
      return {
        orderRoute: row.routeHint || payload?.route || null,
        marRoute: row.routeHint || payload?.route || null,
        route: row.routeHint || payload?.route || null,
        catalogCode: payload?.code ?? null,
        genericName: payload?.genericName ?? null,
        therapeuticClass: row.therapeuticClass ?? null,
        administrationType: payload?.catalogAdministrationType ?? null,
        isContinuousInfusion: true,
      };
    },
    []
  );

  const modalHighAlertRouteOptions = useMemo((): MarHighAlertRouteOptions | undefined => {
    if (!modalItem) return undefined;
    const orderItem = orderItemById.get(modalItem.orderItemId);
    const catalog = orderItem?.catalogMedication;
    return {
      route: modalResolvedRoute || null,
      orderRoute: orderItem?.route?.trim() || modalItem.routeHint || null,
      marRoute: modalRoute.trim() || null,
      catalogRoute: catalog?.route?.trim() || null,
      administrationType:
        catalog?.administrationType?.trim() ||
        modalItem.infusionClassifyPayload?.catalogAdministrationType?.trim() ||
        null,
      isContinuousInfusion: modalIsContinuousInfusion,
      catalogCode: modalItem.infusionClassifyPayload?.code ?? catalog?.code ?? null,
      genericName: modalItem.infusionClassifyPayload?.genericName ?? catalog?.genericName ?? null,
      therapeuticClass: catalog?.therapeuticClass ?? null,
    };
  }, [
    modalItem,
    modalResolvedRoute,
    modalRoute,
    modalIsContinuousInfusion,
    orderItemById,
  ]);
  const modalRequiresInjectionSite = marModalRequiresInjectionSite({
    marAction: modalAction,
    route: modalResolvedRoute,
  });
  const modalShowsPrnSection =
    Boolean(modalItem?.isPrn) && modalAction === "administered";
  const modalPrnReasonOptions = useMemo(() => {
    if (!modalItem?.prnReasonGroup) return [] as MarPrnReasonCode[];
    return [...marPrnReasonCodesForGroup(modalItem.prnReasonGroup)];
  }, [modalItem?.prnReasonGroup]);
  const modalRequiresPainScore = useMemo(() => {
    if (!modalItem?.isPrn) return false;
    return marPrnAdministrationRequiresPainScore({
      medicationLabel: modalItem.label,
      genericName: modalItem.genericName,
      therapeuticClass: modalItem.therapeuticClass,
      prnIndication: modalItem.prnIndication,
      prnReasonGroup: modalItem.prnReasonGroup,
    });
  }, [modalItem]);
  const modalOpioidPrnMissingRespiratoryRate = useMemo(() => {
    if (!modalShowsPrnSection || !modalRequiresPainScore) return false;
    if (
      !isOpioidPainMedicationLabel(modalItem?.label, modalItem?.genericName ?? null)
    ) {
      return false;
    }
    const vitals = encounterAllergySource?.vitals;
    if (!vitals || typeof vitals !== "object") return true;
    const record = vitals as Record<string, unknown>;
    const rr = record.respiratoryRate ?? record.respRate ?? record.rr;
    return rr == null || String(rr).trim() === "";
  }, [
    modalShowsPrnSection,
    modalRequiresPainScore,
    modalItem?.label,
    modalItem?.genericName,
    encounterAllergySource?.vitals,
  ]);

  useEffect(() => {
    if (!modalItem) return;
    if (!isIntramuscularMarRoute(modalResolvedRoute)) {
      setModalInjectionSite("");
    }
  }, [modalItem, modalResolvedRoute]);

  const advancedMarWarningCount = marAdvancedMedicationSafetyWarnings.length;

  const openModal = (
    row: (typeof taskRows)[0],
    options?: {
      hideAdministeredAction?: boolean;
      medicationDoseInstanceId?: string | null;
      scheduledAt?: string | null;
      dueWindowStartAt?: string | null;
      dueWindowEndAt?: string | null;
    }
  ) => {
    const orderItem = orderItemById.get(row.orderItemId);
    const fallbackScheduled =
      row.intendedAt?.trim() ||
      (orderItem?.createdAt ? String(orderItem.createdAt) : null);
    const scheduledAt = options?.scheduledAt?.trim() || fallbackScheduled;
    const dueWindowStartAt = options?.dueWindowStartAt?.trim() || scheduledAt;
    const dueWindowEndAt =
      options?.dueWindowEndAt?.trim() ||
      (scheduledAt
        ? new Date(new Date(scheduledAt).getTime() + 60 * 60 * 1000).toISOString()
        : null);
    const hideAdmin = options?.hideAdministeredAction === true;
    const directionsSig = orderItem?.notes?.trim() || null;
    const frequencyCode = orderItem?.frequencyCode?.trim() || null;
    const catalogMed = asApiObject(orderItem?.catalogMedication);
    const genericName =
      typeof catalogMed?.genericName === "string" ? catalogMed.genericName : null;
    const prnMeta = resolveMarPrnOrderMetadata({
      frequencyCode,
      directionsSig,
      medicationLabel: row.label,
      genericName,
      therapeuticClass: row.therapeuticClass,
    });
    setModalItem({
      orderItemId: row.orderItemId,
      label: row.label,
      authorityLine: row.authorityLine,
      attributionLines: row.attributionLines,
      highRiskWarning: row.highRiskWarning,
      softSafetyWarnings: row.softSafetyWarnings,
      advancedSafetyLine: row.advancedSafetyLine,
      routeHint: row.routeHint,
      catalogCode: row.catalogCode,
      catalogDisplayNameEn: row.catalogDisplayNameEn,
      catalogDisplayNameFr: row.catalogDisplayNameFr,
      therapeuticClass: row.therapeuticClass,
      ndcHint: row.ndcHint,
      hiddenBilling: row.hiddenBilling,
      billingUnitHint: row.billingUnitHint,
      orderedQuantity: row.orderedQuantity,
      hideAdministeredAction: hideAdmin,
      infusionClassifyPayload: row.infusionClassifyPayload,
      governanceDisplay: row.governanceDisplay,
      medicationDoseInstanceId: options?.medicationDoseInstanceId?.trim() || null,
      scheduledAt,
      dueWindowStartAt,
      dueWindowEndAt,
      isPrn: prnMeta.isPrn,
      prnIndication: prnMeta.prnIndication,
      prnReasonGroup: prnMeta.prnReasonGroup,
      frequencyCode,
      directionsSig,
      genericName,
    });
    setModalSubmitError(null);
    setMarPrnReasonCode("");
    setMarPrnReasonOther("");
    setMarPrnEarlyOverrideReason("");
    setMarPainScore("");
    setMarPainLocation("");
    setMarScheduleTimingReason("");
    setModalAction(hideAdmin ? "refused" : "administered");
    const vaccineDefaults = vaccineModalDefaultDose(row.catalogCode);
    const vaccineDetected = isVaccineMedicationForMar({
      catalogCode: row.catalogCode,
      medicationLabel: row.label,
      genericName,
      therapeuticClass: row.therapeuticClass,
    });
    setModalRoute(vaccineDetected && isTdapCatalogCode(row.catalogCode) ? "IM" : row.routeHint);
    setModalInjectionSite("");
    setModalNotes("");
    setModalDoseValue(vaccineDetected ? vaccineDefaults.dose : "");
    setModalDoseUnit(vaccineDetected ? vaccineDefaults.unit : row.billingUnitHint);
    setModalAdminQty(formatMarModalDefaultAdministeredQuantity(row.orderedQuantity));
    setModalBillingQty("");
    setModalNdc(row.ndcHint);
    setMarAllergySafetyAck(false);
    setMarTimingOverrideAck(false);
    setMarHighRiskSafetyAck(false);
    setMarControlledForm({
      witnessUserId: null,
      witnessDisplayName: "",
      wasteAmount: "",
      wasteUnit: row.billingUnitHint || "",
      wasteReason: "",
      overrideReason: "",
      controlledOverrideAcknowledged: false,
      useOverride: false,
    });
    setMarHighAlertForm({
      verifierUserId: null,
      verifierDisplayName: "",
      highAlertOverrideReason: "",
      highAlertOverrideAcknowledged: false,
      useOverride: false,
    });
    setMarLasaForm({
      lasaAcknowledged: false,
      lasaMedicationSelectionConfirmed: false,
      secondReadUserId: null,
      secondReadDisplayName: "",
      lasaOverrideReason: "",
      lasaOverrideAcknowledged: false,
      useOverride: false,
    });
    setMarLasaFieldErrors({});
    setMarPharmacyForm({
      pharmacyVerificationOverrideReason: "",
      pharmacyVerificationOverrideAcknowledged: false,
      useOverride: false,
    });
    setVaccineLotNumber("");
    setVaccineExpirationDate("");
    setVaccineManufacturerId("");
    setVaccineVisGiven(false);
    setVaccineVisRecipient("none");
    setVaccineVisDate("");
    setVaccineAllergiesVerified(false);
    setVaccineFiveRightsConfirmed(false);
    setVaccineEducationReviewed(false);
    setVaccineReviewedWith("");
    setVaccineReviewedTopics(vaccineDetected ? [...VACCINE_DEFAULT_TOPICS] : []);
    setVaccineUnderstandingConfirmed(false);
    setVaccineAmountWasted("");
    setMarDraftRestoredAt(null);
    setMarDraftSavedLocallyAt(null);
    setMarSafetyDetailsOpen(false);
    setMarGovernanceDetailsOpen(false);
    clearModalEffectiveTime();
  };

  const openModalFromPassQueueItem = useCallback(
    (item: MedicationPassQueueItem) => {
      const row = taskRows.find((r) => r.orderItemId === item.orderItemId);
      if (!row) {
        setError(t("marPassQueue.errOrderLineNotFound"));
        return;
      }
      if (row.isInfusionLifecycleMed) {
        setError(t("marTab.errInfusionUseStartStop"));
        return;
      }
      openModal(row, {
        medicationDoseInstanceId: item.medicationDoseInstanceId,
        scheduledAt: item.scheduledAt,
        dueWindowStartAt: item.dueWindowStartAt,
        dueWindowEndAt: item.dueWindowEndAt,
      });
    },
    [taskRows, t]
  );

  const openModalFromTimelineItem = useCallback(
    (item: MarShiftTimelineCellItem) => {
      const row = taskRows.find((r) => r.orderItemId === item.orderItemId);
      if (!row) {
        throw new Error(t("marShiftTimeline.actionError"));
      }
      timelineDrawerAdministerTargetRef.current = {
        orderItemId: item.orderItemId,
        medicationDoseInstanceId: item.medicationDoseInstanceId ?? "",
        scheduledAt: item.scheduledAt ?? "",
      };
      openModal(row, {
        medicationDoseInstanceId: item.medicationDoseInstanceId?.trim() || null,
        scheduledAt: item.scheduledAt,
        dueWindowStartAt: item.dueWindowStartAt,
        dueWindowEndAt: item.dueWindowEndAt,
      });
      timelineCloseDrawerRef.current?.();
    },
    [openModal, taskRows, t]
  );

  const submitTimelineTerminalMar = useCallback(
    async (
      item: MarShiftTimelineCellItem,
      action: "REFUSE" | "HOLD" | "MARK_MISSED",
      input: MarShiftTimelineRefuseHoldInput
    ) => {
      if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
      await submitMarShiftTimelineTerminalMar(encounterId, facilityId, item, action, input);
      await reloadMarData();
      await refreshMarViews();
    },
    [encounterId, facilityId, reloadMarData, t]
  );

  const marShiftTimelineActionHandlers = useMemo((): MarShiftTimelineActionHandlers => {
    const actionsDisabled = !encounterOpen || !encounterClinicalMutationsAllowed;
    return {
      disabled: actionsDisabled,
      busy: Boolean(infusionBusy),
      onRequestAdminister: async (item) => {
        openModalFromTimelineItem(item);
      },
      onRequestStartInfusion: async (item, input) => {
        const passItem = findPassQueueItemForTimelineCell(item, passQueue.items);
        const orderId = resolveMarShiftTimelineOrderId(item, passItem);
        const label = item.medicationLabel?.trim() || item.primaryText;
        if (marShiftTimelineStartWitnessRequired(item, passItem)) {
          setPendingTimelineStartItem(item);
          setPendingInfusionStartVerifier(null);
          setInfusionStartWitnessModal({ orderItemId: item.orderItemId, orderId, label });
          return false;
        }
        await runMarInfusion(item.orderItemId, orderId, "start", input.notes, null, {
          medicationDoseInstanceId: item.medicationDoseInstanceId,
          startedAtIso: input.startedAt,
          skipReload: true,
          skipModalClose: true,
        });
        await reloadMarData();
        await refreshMarViews();
        return true;
      },
      onExecuteStopInfusion: async (item, input) => {
        const passItem = findPassQueueItemForTimelineCell(item, passQueue.items);
        const orderId = resolveMarShiftTimelineOrderId(item, passItem);
        await runMarInfusion(item.orderItemId, orderId, "stop", input.notes, null, {
          medicationDoseInstanceId: item.medicationDoseInstanceId,
          stoppedAtIso: input.stoppedAt,
          stopReasonCode: input.stopReasonCode,
          reasonDetail: input.reasonDetail,
          skipReload: true,
          skipModalClose: true,
        });
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteRefuse: async (item, input) => {
        await submitTimelineTerminalMar(item, "REFUSE", input);
      },
      onExecuteHold: async (item, input) => {
        await submitTimelineTerminalMar(item, "HOLD", input);
      },
      onExecuteMissed: async (item, input) => {
        await submitTimelineTerminalMar(item, "MARK_MISSED", input);
      },
      onRequestScheduleAdjustment: async (item, input) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await adjustMarMedicationSchedule(
          facilityId,
          encounterId,
          {
            orderItemId: item.orderItemId,
            scheduledAt: item.scheduledAt,
            medicationDoseInstanceId: item.medicationDoseInstanceId,
          },
          {
            newScheduledAt: input.newScheduledAtIso,
            reasonCode: input.reasonCode,
            reasonDetail: input.reasonDetail,
          }
        );
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteStartFluid: async (item, input) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await startContinuousFluid(item.orderItemId, facilityId, {
          ...(input?.notes ? { notes: input.notes } : {}),
          ...(input?.startedAt ? { startedAt: input.startedAt } : {}),
        });
        await reloadMarData();
        await refreshMarViews();
      },
      onExecutePauseFluid: async (item) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await pauseContinuousFluid(item.orderItemId, facilityId);
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteResumeFluid: async (item) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await resumeContinuousFluid(item.orderItemId, facilityId);
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteStopFluid: async (item, input) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await stopContinuousFluid(item.orderItemId, facilityId, {
          notes: input.notes,
          stoppedAt: input.stoppedAt,
        });
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteStartBolus: async (item, input) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await startFluidBolus(item.orderItemId, facilityId, {
          ...(input?.notes ? { notes: input.notes } : {}),
          ...(input?.startedAt ? { startedAt: input.startedAt } : {}),
        });
        await reloadMarData();
        await refreshMarViews();
      },
      onExecuteCompleteBolus: async (item, input) => {
        if (!facilityId) throw new Error(t("marShiftTimeline.actionError"));
        await completeFluidBolus(item.orderItemId, facilityId, {
          notes: input.notes,
          completedAt: input.stoppedAt,
        });
        await reloadMarData();
        await refreshMarViews();
      },
    };
  }, [
    encounterClinicalMutationsAllowed,
    encounterOpen,
    facilityId,
    infusionBusy,
    openModalFromTimelineItem,
    passQueue.items,
    reloadMarData,
    runMarInfusion,
    submitTimelineTerminalMar,
    t,
  ]);

  const closeModal = () => {
    if (submitting) return;
    timelineDrawerAdministerTargetRef.current = null;
    setModalItem(null);
    setModalSubmitError(null);
    setShowHighAlertVerifierModal(false);
    setMarTimingOverrideAck(false);
    setMarScheduleTimingReason("");
    setMarHighRiskSafetyAck(false);
    clearModalEffectiveTime();
  };

  const submitModal = async (options?: {
    highAlertVerifierUserId?: string | null;
    highAlertVerifierDisplayName?: string | null;
  }) => {
    if (!modalItem || encounterStatus !== "OPEN") return;
    const marHighAlertFormEffective: MarHighAlertFormState =
      options?.highAlertVerifierUserId != null
        ? {
            ...marHighAlertForm,
            verifierUserId: options.highAlertVerifierUserId,
            verifierDisplayName:
              options.highAlertVerifierDisplayName?.trim() ?? marHighAlertForm.verifierDisplayName,
          }
        : marHighAlertForm;
    const orderItemId =
      typeof modalItem.orderItemId === "string" ? modalItem.orderItemId.trim() : "";
    if (!isOrderItemIdUuid(orderItemId)) {
      setModalSubmitError(t("marTab.errInvalidOrderItemId"));
      return;
    }
    if (
      modalAction === "administered" &&
      marAllergyDocSummary &&
      !marAllergySafetyAck
    ) {
      setModalSubmitError(t("marTab.errAllergyAckRequired"));
      return;
    }
    if (
      modalAction === "administered" &&
      modalItem.infusionClassifyPayload &&
      isMedicationInfusionCandidate(modalItem.infusionClassifyPayload)
    ) {
      setModalSubmitError(t("marTab.errInfusionUseStartStop"));
      return;
    }
    const routeLine = modalRoute.trim() || modalItem.routeHint;
    const imSiteValidation = validateImInjectionSiteForMarCreate({
      marAction: modalAction,
      route: routeLine,
      injectionSite: modalInjectionSite || undefined,
      notes: modalNotes,
      userNotesOnly: true,
    });
    if (imSiteValidation) {
      setModalSubmitError(
        t(
          imSiteValidation.code === "injection_site_other_notes_required"
            ? "marTab.errInjectionSiteOtherNotesRequired"
            : "marTab.errInjectionSiteRequired"
        )
      );
      return;
    }
    if (modalAction === "administered" && modalIsVaccine && modalVaccineValidationBlockers) {
      if (!modalVaccineValidationBlockers.ok) {
        setModalSubmitError(
          t("marTab.vaccine.errSummary").replace(
            "{fields}",
            modalVaccineValidationBlockers.blockerCodes
              .map((code) => t(`marTab.vaccine.blockers.${code}`))
              .join(", ")
          )
        );
        return;
      }
    }
    if (modalAction === "administered" && modalItem?.isPrn) {
      const clinicalTz = resolveClinicalTimeZone({ facilityTimeZone });
      const nowForPrn = new Date();
      const administeredAtForPrn =
        modalEffectiveTimeLocal.trim()
          ? clinicalDatetimeLocalToUtcDate(modalEffectiveTimeLocal, clinicalTz) ?? nowForPrn
          : nowForPrn;
      const prnValidation = validatePrnAdministrationForMarCreate({
        marAction: modalAction,
        frequencyCode: modalItem.frequencyCode,
        directionsSig: modalItem.directionsSig,
        medicationLabel: modalItem.label,
        genericName: modalItem.genericName,
        therapeuticClass: modalItem.therapeuticClass,
        prnReasonCode: marPrnReasonCode || null,
        prnReasonOther: marPrnReasonOther,
        painScore: marPainScore.trim() ? Number(marPainScore) : null,
        proposedAdministeredAt: administeredAtForPrn,
        lastAdministeredAt: lastAdministeredForModal?.administeredAt ?? null,
        prnEarlyOverrideReason: marPrnEarlyOverrideReason,
      });
      if (prnValidation) {
        setModalSubmitError(t(`marPrnGovernance.errors.${prnValidation.code}`));
        return;
      }
    }
    const documentedAt = new Date();
    const clinicalTz = resolveClinicalTimeZone({ facilityTimeZone });
    const linkedOrderItem = orderItemById.get(orderItemId);
    const linkedOrder = orders
      .map((o) => asApiObject(o))
      .find((ord) => {
        const items = Array.isArray(ord?.items) ? ord.items : [];
        return items.some((it) => asApiObject(it)?.id === orderItemId);
      });
    const orderCreatedAt = linkedOrder?.createdAt
      ? new Date(String(linkedOrder.createdAt))
      : documentedAt;
    const orderItemCreatedAt = linkedOrderItem?.createdAt
      ? new Date(String(linkedOrderItem.createdAt))
      : null;
    const orderCancelledAt =
      String(linkedOrder?.status ?? "").toUpperCase() === "CANCELLED" && linkedOrder?.cancelledAt
        ? new Date(String(linkedOrder.cancelledAt))
        : null;
    const controlledMedication = Boolean(linkedOrderItem?.catalogMedication?.isControlled);

    const facilityTzToUtcIso = (local: string) =>
      marClinicalDateTimeLocalToUtcIso(local, clinicalTz);

    if (modalEffectiveTimeLocal.trim() && modalItem) {
      const universalActionType =
        modalItem.isPrn && modalAction === "administered"
          ? "PRN_ADMINISTER"
          : modalAction === "refused"
            ? "REFUSE"
            : modalAction === "not_available"
              ? "NOT_AVAILABLE"
              : modalAction === "md_changed"
                ? "MD_CHANGED"
                : "ADMINISTER";
      const universalValidation = validateMarClinicalDateTimeField({
        actionType: universalActionType,
        clinicalTimeLocal: modalEffectiveTimeLocal,
        documentedAtIso: documentedAt.toISOString(),
        scheduledTime: modalItem.isPrn ? null : modalItem.scheduledAt,
        currentScheduledTime: modalItem.isPrn ? null : modalItem.scheduledAt,
        facilityTimeZone: clinicalTz,
      });
      if (!universalValidation.ok) {
        setModalSubmitError(
          universalValidation.code === "INVALID_TIME"
            ? t("marClinicalTime.invalidTime")
            : t("marClinicalTime.invalidTime")
        );
        return;
      }
    }

    if (modalAction === "administered" && modalEffectiveTimeLocal.trim()) {
      const clientErr = marRecordModalEffectiveTimeClientError({
        effectiveTimeLocal: modalEffectiveTimeLocal,
        effectiveTimeReason: modalEffectiveTimeReason,
        documentedAt,
        orderCreatedAt,
        orderItemCreatedAt,
        orderCancelledAt,
        controlledMedication,
        toUtcIso: facilityTzToUtcIso,
        t,
      });
      if (clientErr) {
        setModalSubmitError(clientErr);
        return;
      }
    }

    if (modalDoseValue.trim()) {
      const doseNum = Number(modalDoseValue);
      if (!Number.isFinite(doseNum) || doseNum < 0) {
        setModalSubmitError(t("marTab.errInvalidNumericField"));
        return;
      }
    }
    if (modalAdminQty.trim()) {
      const adminNum = Number(modalAdminQty);
      if (!Number.isFinite(adminNum) || adminNum < 0) {
        setModalSubmitError(t("marTab.errInvalidNumericField"));
        return;
      }
    }

    const resolvedAdministeredQuantity =
      modalAction === "administered"
        ? resolveMarAdministeredQuantityForCreate({
            marAction: modalAction,
            explicitQuantity: modalAdminQty.trim() ? Number(modalAdminQty) : null,
            orderedQuantity: modalItem.orderedQuantity,
          })
        : null;

    if (modalAction === "administered") {
      const qtyValidation = validateMarAdministeredQuantityRequired({
        marAction: modalAction,
        administeredQuantity: resolvedAdministeredQuantity,
      });
      if (!qtyValidation.ok) {
        setModalSubmitError(t("marTab.errAdministeredQuantityRequired"));
        return;
      }
    }

    if (modalAction === "administered" && modalItem) {
      const sharedControlledOverride =
        marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction) &&
        marControlledForm.useOverride;
      if (
        marHighAlertNeedsVerifierSelection(
          modalItem.governanceDisplay,
          modalAction,
          marHighAlertFormEffective,
          modalHighAlertRouteOptions,
          {
            sharedOverrideReason: sharedControlledOverride ? marControlledForm.overrideReason : undefined,
            sharedUseOverride: sharedControlledOverride,
            sharedOverrideAcknowledged: marControlledForm.controlledOverrideAcknowledged,
          }
        )
      ) {
        setShowHighAlertVerifierModal(true);
        return;
      }
    }

    setSubmitting(true);
    setModalSubmitError(null);
    setError(null);
    try {
      const routeLine = modalRoute.trim() || modalItem.routeHint;
      const requiresInjectionSite = marModalRequiresInjectionSite({
        marAction: modalAction,
        route: routeLine,
      });
      const effectiveFields =
        modalAction === "administered"
          ? buildMarCreateEffectiveTimeRequestFields({
              effectiveTimeLocal: modalEffectiveTimeLocal,
              effectiveTimeReason: modalEffectiveTimeReason,
              toUtcIso: facilityTzToUtcIso,
            })
          : null;
      if (
        modalItem &&
        marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction)
      ) {
        const govCtx = {
          isControlled: true,
          requiresWitness: modalItem.governanceDisplay.requiresWitness === true,
          wasteDocumentationRecommended:
            modalItem.governanceDisplay.wasteDocumentationRecommended === true,
        };
        const validation = validateControlledSubstanceMarCreate({
          marAction: modalAction,
          governance: govCtx,
          witnessUserId: marControlledForm.witnessUserId,
          witnessDisplayName: marControlledForm.witnessDisplayName,
          administeredByUserId: currentUserId ?? undefined,
          wasteAmount: marControlledForm.wasteAmount.trim()
            ? Number(marControlledForm.wasteAmount)
            : null,
          wasteUnit: marControlledForm.wasteUnit.trim() || modalItem.billingUnitHint || null,
          wasteReason: marControlledForm.wasteReason,
          overrideReason: marControlledForm.overrideReason,
          controlledOverrideAcknowledged: marControlledForm.controlledOverrideAcknowledged,
          orderedQuantity: modalItem.orderedQuantity,
          administeredQuantity: resolvedAdministeredQuantity,
        });
        if (!validation.ok) {
          setModalSubmitError(validation.message);
          return;
        }
      }

      if (
        modalItem &&
        marHighAlertWorkflowVisible(modalItem.governanceDisplay, modalAction, modalHighAlertRouteOptions)
      ) {
        const requiresDoubleCheck = marAdministrationRequiresDoubleCheck({
          isHighAlert: modalItem.governanceDisplay.isHighAlert === true,
          requiresDoubleSign: modalItem.governanceDisplay.requiresDoubleSign === true,
          highAlertClass: modalItem.governanceDisplay.highAlertClass,
          ...modalHighAlertRouteOptions,
        });
        const sharedControlledOverride =
          marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction) &&
          marControlledForm.useOverride;
        const haValidation = validateHighAlertMarCreate({
          marAction: modalAction,
          governance: requiresDoubleCheck
            ? {
                isHighAlert: true,
                requiresDoubleCheck: true,
                safetyRequirementCodes: [],
              }
            : null,
          highAlertVerifierUserId: marHighAlertFormEffective.verifierUserId,
          highAlertVerifierDisplayName: marHighAlertFormEffective.verifierDisplayName,
          administeredByUserId: currentUserId ?? undefined,
          controlledWitnessUserId: marControlledForm.witnessUserId,
          highAlertOverrideReason: marHighAlertFormEffective.highAlertOverrideReason,
          highAlertOverrideAcknowledged: marHighAlertFormEffective.highAlertOverrideAcknowledged,
          sharedOverrideReason: sharedControlledOverride ? marControlledForm.overrideReason : undefined,
          sharedControlledOverrideAcknowledged: sharedControlledOverride
            ? marControlledForm.controlledOverrideAcknowledged
            : undefined,
        });
        if (!haValidation.ok) {
          setModalSubmitError(haValidation.message);
          return;
        }
      }

      if (modalItem && marLasaWorkflowVisible(modalItem.governanceDisplay, modalAction)) {
        const lasaValidation = validateLasaMarCreate({
          marAction: modalAction,
          governance: lasaMarRequiresAcknowledgement({
            lasaGroupId: modalItem.governanceDisplay.lasaGroupId,
            lasaSeverity: modalItem.governanceDisplay.lasaSeverity,
          })
            ? {
                lasaGroupId: modalItem.governanceDisplay.lasaGroupId ?? null,
                lasaGroupLabel: modalItem.governanceDisplay.lasaGroupLabel ?? null,
                lasaSeverity: modalItem.governanceDisplay.lasaSeverity ?? null,
                requiresAcknowledgement: true,
              }
            : null,
          lasaAcknowledged: marLasaForm.lasaAcknowledged,
          lasaMedicationSelectionConfirmed: marLasaForm.lasaMedicationSelectionConfirmed,
          lasaSecondReadUserId: marLasaForm.secondReadUserId,
          lasaSecondReadDisplayName: marLasaForm.secondReadDisplayName,
          lasaOverrideReason: marLasaForm.lasaOverrideReason,
          lasaOverrideAcknowledged: marLasaForm.lasaOverrideAcknowledged,
          administeredByUserId: currentUserId ?? undefined,
        });
        if (!lasaValidation.ok) {
          setMarLasaFieldErrors({ lasa: lasaValidation.message });
          setModalSubmitError(lasaValidation.message);
          return;
        }
      }

      if (modalItem && marPharmacyWorkflowVisible(modalItem.governanceDisplay, modalAction)) {
        const pharmStatus = modalItem.governanceDisplay.pharmacyVerificationStatus ?? "PENDING";
        const pharmValidation = validatePharmacyMarCreate({
          marAction: modalAction,
          governance: {
            requiresPharmacyVerification: true,
            verificationStatus: pharmStatus,
          },
          pharmacyVerificationOverrideReason: marPharmacyForm.pharmacyVerificationOverrideReason,
          pharmacyVerificationOverrideAcknowledged:
            marPharmacyForm.pharmacyVerificationOverrideAcknowledged,
        });
        if (!pharmValidation.ok) {
          setModalSubmitError(pharmValidation.message);
          return;
        }
      }

      const hiddenBillingFields = mergeMarCreateBillingFields({
        hidden: modalItem.hiddenBilling,
        ndc: modalNdc,
        doseValue: modalDoseValue.trim() ? Number(modalDoseValue) : null,
        billingQuantity: modalBillingQty.trim() ? Number(modalBillingQty) : null,
        doseUnit: modalDoseUnit,
        administeredQuantity: resolvedAdministeredQuantity,
      });

      const universalActionTypeForNotes =
        modalItem?.isPrn && modalAction === "administered"
          ? "PRN_ADMINISTER"
          : modalAction === "refused"
            ? "REFUSE"
            : modalAction === "not_available"
              ? "NOT_AVAILABLE"
              : modalAction === "md_changed"
                ? "MD_CHANGED"
                : "ADMINISTER";
      const clinicalTimeIsoForNotes = modalEffectiveTimeLocal.trim()
        ? marClinicalDateTimeLocalToUtcIso(modalEffectiveTimeLocal, clinicalTz)
        : null;
      const universalTimingNotes =
        clinicalTimeIsoForNotes && modalItem
          ? buildMarClinicalTimeDocumentationNotes({
              actionType: universalActionTypeForNotes,
              clinicalTimeIso: clinicalTimeIsoForNotes,
              documentedAtIso: documentedAt.toISOString(),
              scheduledTime: modalItem.isPrn ? null : modalItem.scheduledAt,
              currentScheduledTime: modalItem.isPrn ? null : modalItem.scheduledAt,
            })
          : null;
      const vaccineDocumentationNote =
        modalAction === "administered" && modalNormalizedVaccineDocumentation
          ? [
              serializeVaccineAdministrationDocumentationForMarNotes(modalNormalizedVaccineDocumentation),
              modalVaccineNotePreview,
            ]
              .filter(Boolean)
              .join("\n")
          : null;

      const body = appendMedicationDoseInstanceIdToMarCreateBody(
        {
        orderItemId,
        marAction: modalAction,
        administeredAt:
          modalAction === "administered"
            ? documentedAt.toISOString()
            : clinicalTimeIsoForNotes ?? documentedAt.toISOString(),
        ...(routeLine ? { route: routeLine } : {}),
        ...(hiddenBillingFields.doseValue != null ? { doseValue: hiddenBillingFields.doseValue } : {}),
        ...(hiddenBillingFields.doseUnit ? { doseUnit: hiddenBillingFields.doseUnit } : {}),
        ...(resolvedAdministeredQuantity != null
          ? { administeredQuantity: resolvedAdministeredQuantity }
          : {}),
        ...(hiddenBillingFields.billingQuantity != null
          ? { billingQuantity: hiddenBillingFields.billingQuantity }
          : {}),
        ...(hiddenBillingFields.ndc ? { ndc: hiddenBillingFields.ndc } : {}),
        ...(hiddenBillingFields.doseUnit ? { quantityUnit: hiddenBillingFields.doseUnit } : {}),
        notes: buildMarNotes(
          modalAction,
          routeLine,
          [
            universalTimingNotes,
            modalAction === "administered" &&
            modalItem?.isPrn &&
            marPrnEarlyOverrideReason.trim() &&
            modalPrnEarlyAdministration
              ? `${MAR_PRN_EARLY_OVERRIDE_NOTE_PREFIX}${marPrnEarlyOverrideReason.trim()}`
              : null,
            vaccineDocumentationNote,
          ]
            .filter(Boolean)
            .concat(modalNotes.trim() ? [modalNotes] : [])
            .join("\n"),
          t,
          requiresInjectionSite ? modalInjectionSite || undefined : undefined
        ),
        ...(requiresInjectionSite && modalInjectionSite ? { injectionSite: modalInjectionSite } : {}),
        ...(modalAction === "administered" && modalItem?.isPrn && marPrnReasonCode
          ? {
              prnReasonCode: marPrnReasonCode,
              ...(marPrnReasonCode === "other" && marPrnReasonOther.trim()
                ? { prnReasonOther: marPrnReasonOther.trim() }
                : {}),
              ...(marPainScore.trim() ? { painScore: Number(marPainScore) } : {}),
              ...(marPainLocation.trim() ? { painLocation: marPainLocation.trim() } : {}),
            }
          : {}),
        ...(modalAction === "administered" && marAllergyDocSummary && marAllergySafetyAck
          ? { safetyAcknowledgedMedicationAllergies: true }
          : {}),
        ...(effectiveFields ?? {}),
        ...(modalItem &&
        marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction)
          ? {
              ...(marControlledForm.witnessUserId
                ? { witnessUserId: marControlledForm.witnessUserId }
                : {}),
              ...(marControlledForm.witnessDisplayName.trim() && !marControlledForm.witnessUserId
                ? { witnessDisplayName: marControlledForm.witnessDisplayName.trim() }
                : {}),
              ...(marControlledForm.wasteAmount.trim()
                ? { wasteAmount: Number(marControlledForm.wasteAmount) }
                : {}),
              ...(marControlledForm.wasteUnit.trim() || modalItem.billingUnitHint
                ? { wasteUnit: (marControlledForm.wasteUnit.trim() || modalItem.billingUnitHint).trim() }
                : {}),
              ...(marControlledForm.wasteReason.trim() ? { wasteReason: marControlledForm.wasteReason.trim() } : {}),
              ...(marControlledForm.overrideReason.trim()
                ? { overrideReason: marControlledForm.overrideReason.trim() }
                : {}),
              ...(marControlledForm.controlledOverrideAcknowledged
                ? { controlledOverrideAcknowledged: true }
                : {}),
            }
          : {}),
        ...(modalItem &&
        marHighAlertWorkflowVisible(modalItem.governanceDisplay, modalAction, modalHighAlertRouteOptions)
          ? {
              ...(marHighAlertFormEffective.verifierUserId
                ? {
                    highAlertVerifierUserId: marHighAlertFormEffective.verifierUserId,
                    ...(marHighAlertFormEffective.verifierDisplayName.trim()
                      ? {
                          highAlertVerifierDisplayName:
                            marHighAlertFormEffective.verifierDisplayName.trim(),
                        }
                      : {}),
                  }
                : {}),
              ...(marHighAlertFormEffective.highAlertOverrideReason.trim()
                ? { highAlertOverrideReason: marHighAlertFormEffective.highAlertOverrideReason.trim() }
                : {}),
              ...(marHighAlertFormEffective.highAlertOverrideAcknowledged
                ? { highAlertOverrideAcknowledged: true }
                : {}),
            }
          : {}),
        ...(modalItem && marLasaWorkflowVisible(modalItem.governanceDisplay, modalAction)
          ? {
              ...(marLasaForm.lasaAcknowledged ? { lasaAcknowledged: true } : {}),
              ...(marLasaForm.lasaMedicationSelectionConfirmed
                ? { lasaMedicationSelectionConfirmed: true }
                : {}),
              ...(marLasaForm.secondReadUserId
                ? { lasaSecondReadUserId: marLasaForm.secondReadUserId }
                : {}),
              ...(marLasaForm.secondReadDisplayName.trim() && !marLasaForm.secondReadUserId
                ? { lasaSecondReadDisplayName: marLasaForm.secondReadDisplayName.trim() }
                : {}),
              ...(marLasaForm.lasaOverrideReason.trim()
                ? { lasaOverrideReason: marLasaForm.lasaOverrideReason.trim() }
                : {}),
              ...(marLasaForm.lasaOverrideAcknowledged ? { lasaOverrideAcknowledged: true } : {}),
            }
          : {}),
        ...(modalItem && marPharmacyWorkflowVisible(modalItem.governanceDisplay, modalAction)
          ? {
              ...(marPharmacyForm.pharmacyVerificationOverrideReason.trim()
                ? {
                    pharmacyVerificationOverrideReason:
                      marPharmacyForm.pharmacyVerificationOverrideReason.trim(),
                  }
                : {}),
              ...(marPharmacyForm.pharmacyVerificationOverrideAcknowledged
                ? { pharmacyVerificationOverrideAcknowledged: true }
                : {}),
            }
          : {}),
        },
        modalItem.medicationDoseInstanceId
      );
      const res = await apiFetch(`/encounters/${encounterId}/medication-administrations`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      if (queued) {
        setMarQueuedOfflineNotice(true);
      } else {
        setMarQueuedOfflineNotice(false);
      }
      if (marDraftKey && typeof window !== "undefined") {
        removeClinicalDraft(window.localStorage, marDraftKey);
      }
      setMarDraftRestoredAt(null);
      setMarDraftSavedLocallyAt(null);
      const drawerReopenTarget =
        modalAction === "administered" ? timelineDrawerAdministerTargetRef.current : null;
      timelineDrawerAdministerTargetRef.current = null;
      setModalItem(null);
      await reloadMarData();
      if (drawerReopenTarget) {
        timelineReopenDrawerRef.current?.(
          drawerReopenTarget.orderItemId,
          drawerReopenTarget.medicationDoseInstanceId,
          drawerReopenTarget.scheduledAt
        );
      } else {
        await refreshMarViews();
      }
    } catch (err) {
      const apiErr = err as Error & {
        body?: { code?: string; message?: string | string[] };
      };
      const errorCode =
        apiErr.body && typeof apiErr.body === "object" && !Array.isArray(apiErr.body)
          ? apiErr.body.code
          : null;
      if (errorCode === "LASA_ACKNOWLEDGEMENT_REQUIRED") {
        setMarLasaFieldErrors({ lasa: t("marLasa.errAckRequired") });
        setModalSubmitError(t("marLasa.errAckRequired"));
        return;
      }
      setModalSubmitError(
        extractMarSaveErrorMessage(err, language, t("marTab.saveFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = encounterStatus === "OPEN";
  const nowMs = Date.now();
  const marCompact = clinicalTabletUsesCompactPanel(panelDensity);
  const marHistoricalTimeline = useMemo(
    () =>
      buildHistoricalMarTimeline({
        selectedDateLocal: marSelectedDateLocal,
        shiftCode: marShiftCode,
        facilityTimeZone: clinicalTz,
        locale: language,
      }),
    [clinicalTz, language, marSelectedDateLocal, marShiftCode]
  );
  const marTableHeaderCellStyle: React.CSSProperties = marCompact
    ? { ...clinicalTabletCompactMarHeaderCellStyle(), textAlign: "left" }
    : { padding: "10px 8px", textAlign: "left", fontSize: 12 };
  const marTablePrimaryCellStyle: React.CSSProperties = marCompact
    ? { ...clinicalTabletCompactMarCellStyle(), verticalAlign: "top" }
    : { padding: "12px 8px", fontSize: 13 };
  const marTableMetricCellStyle: React.CSSProperties = marCompact
    ? { ...MAR_TABLE_METRIC_CELL, ...clinicalTabletCompactMarCellStyle() }
    : MAR_TABLE_METRIC_CELL;
  const marTableControlsCellStyle: React.CSSProperties = marCompact
    ? { ...MAR_TABLE_CONTROLS_CELL, ...clinicalTabletCompactMarCellStyle() }
    : MAR_TABLE_CONTROLS_CELL;
  const marAdministerMinHeight = marCompact ? CLINICAL_MIN_TOUCH_TARGET_PX : 40;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "none",
        minWidth: 0,
        alignSelf: "stretch",
        boxSizing: "border-box",
      }}
    >
      {error ? (
        <p style={{ color: "#c62828", fontSize: 14, marginTop: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      <MedicationAllergyReviewProviderNotice facilityId={facilityId} encounterId={encounterId} />
      {marQueuedOfflineNotice ? (
        <div
          role="alert"
          style={
            marCompact
              ? clinicalTabletCompactBannerStyle({
                  marginTop: error ? 8 : 0,
                  border: "1px solid #ef9a9a",
                  backgroundColor: "#ffebee",
                  color: "#b71c1c",
                  fontWeight: 600,
                })
              : {
                  marginBottom: 12,
                  marginTop: error ? 8 : 0,
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #ef9a9a",
                  backgroundColor: "#ffebee",
                  fontSize: 13,
                  color: "#b71c1c",
                  lineHeight: 1.5,
                  fontWeight: 600,
                }
          }
        >
          {t("marTab.offlineNotice")}
        </div>
      ) : null}

      <ClinicalLatestVitalsBanner encounterId={encounterId} facilityId={facilityId} />

      <MarHistoricalDateNavigationBar
        selectedDateLocal={marSelectedDateLocal}
        facilityTimeZone={clinicalTz}
        shiftLabel={marHistoricalTimeline.shiftLabel}
        shiftTimeRangeLabel={marHistoricalTimeline.shiftTimeRangeLabel}
        isToday={marHistoricalTimeline.isToday}
        compact={marCompact}
        onDateChange={handleMarSelectedDateChange}
        onToday={() => handleMarSelectedDateChange(resolveFacilityLocalToday(clinicalTz))}
      />

      <div
        data-testid="mar-workspace-timeline"
        style={{
          width: "100%",
          minWidth: 0,
        }}
      >
        <FacilityMarShiftTimeline
          facilityId={facilityId}
          encounterId={encounterId}
          assignedToUserId={currentUserId}
          viewerUserId={currentUserId}
          compact={marCompact}
          embedded={embeddedWorkspaceLayout}
          facilityTimeZone={clinicalTz}
          selectedDateLocal={marSelectedDateLocal}
          historicalReadOnly={!marHistoricalTimeline.isToday}
          actionHandlers={marShiftTimelineActionHandlers}
          onShiftCodeChange={setMarShiftCode}
          onRegisterRefresh={(refresh) => {
            timelineRefreshRef.current = refresh;
          }}
          onRegisterCloseDrawer={(close) => {
            timelineCloseDrawerRef.current = close;
          }}
          onRegisterReopenDrawer={(reopen) => {
            timelineReopenDrawerRef.current = reopen;
          }}
        />
      </div>

      {MAR_TAB_SHOW_LEGACY_SECTIONS ? (
      <>
      <MedicationPassQueuePanel
        enabled={passQueue.enabled}
        items={passQueue.items}
        onSelectItem={openModalFromPassQueueItem}
        actionsDisabled={!isOpen}
        compact={marCompact}
      />

      <h3 style={{ margin: marCompact ? "0 0 6px 0" : "0 0 8px 0", fontSize: marCompact ? 15 : 16 }}>{t("marTab.title")}</h3>
      {!isOpen ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#616161" }}>{t("marTab.closedHint")}</p> : null}

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : taskRows.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.emptyTasks")}</p>
      ) : (
        <div
          style={{
            display: "block",
            width: "100%",
            maxWidth: "none",
            minWidth: 0,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: MAR_TABLE_MIN_WIDTH_PX,
              tableLayout: "fixed",
              borderCollapse: "collapse",
              backgroundColor: "white",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          >
            <colgroup>
              <col style={{ width: 90 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 180 }} />
              <col style={{ width: 120 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", backgroundColor: "#f5f5f5" }}>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnCategory")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnIssued")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnWhen")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnOrderLine")}</th>
                <th style={{ ...marTableHeaderCellStyle, verticalAlign: "bottom" }}>
                  {t("marTab.columnLastAction")}
                </th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnMarStarted")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnMarStopped")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnMarPerformedBy")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnMarElapsed")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnMarControls")}</th>
                <th style={marTableHeaderCellStyle}>{t("marTab.columnTitle")}</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row) => {
                const list = adminsByOrderItemId.get(row.orderItemId) ?? [];
                const latest = list[0];
                const latestTime = latest ? new Date(latest.administeredAt).getTime() : 0;
                const marActionResolved = latestMarClinicalActionForRow(latest);
                const marSaysAdministered = latest
                  ? medicationAdministrationCountsAsCompletedAdministration({
                      marAction: latest.marAction ?? marActionResolved,
                      notes: latest.notes,
                      infusionPhase: latest.infusionPhase,
                    })
                  : false;
                const marRowLocked = Boolean(latest?.pendingSync || marSaysAdministered);
                const recentWindow = latestTime > 0 && nowMs - latestTime < RECENT_MS;

                const resolvedOrderIdForInfusion = String(row.orderId ?? "").trim();
                const infusionTimeline =
                  row.isInfusionLifecycleMed && resolvedOrderIdForInfusion
                    ? findMedicationInfusionTimelineFromOrderEvents(
                        marOrderEventRows,
                        resolvedOrderIdForInfusion,
                        row.orderItemId
                      )
                    : { active: null, lastCompleted: null };
                const activeMarInfusion = infusionTimeline.active;
                const completedMarInfusion = infusionTimeline.lastCompleted;

                const marDashCell = (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{t("common.dash")}</span>
                );

                let marLastAction: React.ReactNode;
                let marStarted: React.ReactNode = marDashCell;
                let marStopped: React.ReactNode = marDashCell;
                let marPerformer: React.ReactNode = marDashCell;
                let marElapsed: React.ReactNode = marDashCell;
                let marControls: React.ReactNode;

                const infusionControlsStackStyle: React.CSSProperties = {
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minWidth: 0,
                  width: "100%",
                };

                const infusionBusyKeyOrder = resolvedOrderIdForInfusion || row.orderItemId;
                const infusionBusyStart =
                  infusionBusy === `${infusionBusyKeyOrder}:${row.orderItemId}:start`;
                const infusionBusyStop =
                  infusionBusy === `${infusionBusyKeyOrder}:${row.orderItemId}:stop`;
                const primaryInfusionDisabled =
                  !isOpen || submitting || marRowLocked || infusionBusyStart || infusionBusyStop;

                const infusionControlsEl = (
                  <div style={infusionControlsStackStyle}>
                    {!activeMarInfusion ? (
                      <button
                        type="button"
                        disabled={primaryInfusionDisabled}
                        onClick={() => {
                          const startTarget = {
                            orderItemId: row.orderItemId,
                            orderId: resolvedOrderIdForInfusion || row.orderItemId,
                            label: row.label,
                          };
                          if (
                            marInfusionStartWitnessRequired(
                              row.governanceDisplay,
                              marInfusionStartRouteOptionsFromRow(row)
                            )
                          ) {
                            setPendingInfusionStartVerifier(null);
                            setInfusionStartWitnessModal(startTarget);
                            return;
                          }
                          setInfusionModal({ ...startTarget, op: "start" });
                          setInfusionModalNote("");
                        }}
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          minHeight: 40,
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          backgroundColor: isOpen && !marRowLocked ? "#1565c0" : "#bdbdbd",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: primaryInfusionDisabled ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          whiteSpace: "normal",
                        }}
                      >
                        {infusionBusyStart ? t("marTab.infusionStarting") : t("marTab.startInfusion")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={primaryInfusionDisabled}
                        onClick={() => {
                          setInfusionModal({
                            orderItemId: row.orderItemId,
                            orderId: resolvedOrderIdForInfusion || row.orderItemId,
                            op: "stop",
                            label: row.label,
                          });
                          setInfusionModalNote("");
                        }}
                        style={{
                          padding: "8px 10px",
                          fontSize: 13,
                          minHeight: 40,
                          width: "100%",
                          minWidth: 0,
                          boxSizing: "border-box",
                          backgroundColor: isOpen && !marRowLocked ? "#2e7d32" : "#bdbdbd",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: primaryInfusionDisabled ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          whiteSpace: "normal",
                        }}
                      >
                        {infusionBusyStop ? t("marTab.infusionStopping") : t("marTab.stopInfusion")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isOpen || submitting || marRowLocked}
                      onClick={() => openModal(row, { hideAdministeredAction: true })}
                      style={{
                        padding: "6px 8px",
                        fontSize: 11,
                        minHeight: 36,
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        backgroundColor: "white",
                        color: "#1565c0",
                        border: "1px solid #90caf9",
                        borderRadius: 6,
                        cursor: isOpen && !marRowLocked ? "pointer" : "not-allowed",
                        fontWeight: 600,
                        whiteSpace: "normal",
                      }}
                    >
                      {t("marTab.infusionAltMarActions")}
                    </button>
                  </div>
                );

                const administerControlEl = (
                  <button
                    type="button"
                    disabled={!isOpen || submitting || marRowLocked}
                    onClick={() => openModal(row)}
                    style={{
                      padding: "8px 10px",
                      fontSize: 13,
                      minHeight: marAdministerMinHeight,
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      backgroundColor: isOpen && !marRowLocked ? "#2e7d32" : "#bdbdbd",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: isOpen && !marRowLocked ? "pointer" : "not-allowed",
                      fontWeight: 600,
                      whiteSpace: "normal",
                    }}
                  >
                    {t("marTab.administer")}
                  </button>
                );

                if (latest?.pendingSync) {
                  marLastAction = (
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        fontWeight: 600,
                      }}
                    >
                      {t("marTab.statusPendingSync")}
                    </span>
                  );
                  marStarted = marStopped = marPerformer = marElapsed = marDashCell;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else if (row.isInfusionLifecycleMed && activeMarInfusion) {
                  const startedMs = activeMarInfusion.infusionStartedAtIso
                    ? new Date(activeMarInfusion.infusionStartedAtIso).getTime()
                    : NaN;
                  const elapsedInner =
                    !Number.isNaN(startedMs) ? formatInfusionElapsedInnerOnly(nowMs - startedMs, t) : null;
                  const startedAtStr = activeMarInfusion.infusionStartedAtIso
                    ? formatClinicalInstantForFacility(
                        activeMarInfusion.infusionStartedAtIso,
                        facilityTimeZone,
                        language
                      )
                    : null;
                  const byParts = [activeMarInfusion.startedByDisplayName, activeMarInfusion.startedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const byJoined = byParts.join(t("infusionTimeline.infusionTimelineDivider"));
                  marLastAction = (
                    <span style={MAR_INFUSION_STATUS_BADGE_ACTIVE}>
                      {t("erEmergencyOrders.infusionInProgress")}
                    </span>
                  );
                  marStarted = startedAtStr ? (
                    <span style={{ fontSize: 12, color: "#334155" }}>{startedAtStr}</span>
                  ) : (
                    marDashCell
                  );
                  marStopped = marDashCell;
                  marPerformer = byJoined ? (
                    <span style={{ fontSize: 12, color: "#334155", ...MAR_CELL_WRAP_LONG_TEXT }}>{byJoined}</span>
                  ) : (
                    marDashCell
                  );
                  marElapsed =
                    elapsedInner != null ? (
                      <span style={{ fontSize: 12, color: "#334155" }}>
                        {t("marTab.infusionElapsedLabel").replace("{elapsed}", elapsedInner)}
                      </span>
                    ) : (
                      marDashCell
                    );
                  marControls = infusionControlsEl;
                } else if (row.isInfusionLifecycleMed && completedMarInfusion && !activeMarInfusion) {
                  const lc = completedMarInfusion;
                  const startAt =
                    lc.infusionStartedAtIso &&
                    !Number.isNaN(new Date(lc.infusionStartedAtIso).getTime())
                      ? formatClinicalInstantForFacility(lc.infusionStartedAtIso, facilityTimeZone, language)
                      : t("common.dash");
                  const stopAt =
                    lc.infusionStoppedAtIso && !Number.isNaN(new Date(lc.infusionStoppedAtIso).getTime())
                      ? formatClinicalInstantForFacility(lc.infusionStoppedAtIso, facilityTimeZone, language)
                      : t("common.dash");
                  const durLine = formatInfusionDurationForI18n(lc.durationMinutes, t);
                  const startByParts = [lc.startedByDisplayName, lc.startedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const stopByParts = [lc.stoppedByDisplayName, lc.stoppedByTitle].filter(
                    (x): x is string => typeof x === "string" && Boolean(x.trim())
                  );
                  const startByLine =
                    startByParts.length > 0
                      ? t("infusionTimeline.infusionStartedBy").replace(
                          "{by}",
                          startByParts.join(t("infusionTimeline.infusionTimelineDivider"))
                        )
                      : t("common.dash");
                  const stopByLine =
                    stopByParts.length > 0
                      ? t("infusionTimeline.infusionStoppedBy").replace(
                          "{by}",
                          stopByParts.join(t("infusionTimeline.infusionTimelineDivider"))
                        )
                      : t("common.dash");
                  marLastAction = (
                    <span style={MAR_INFUSION_STATUS_BADGE_COMPLETED}>
                      {t("infusionTimeline.infusionCompleted")}
                    </span>
                  );
                  marStarted = <span style={{ fontSize: 12, color: "#334155" }}>{startAt}</span>;
                  marStopped = <span style={{ fontSize: 12, color: "#334155" }}>{stopAt}</span>;
                  marPerformer = (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: "#475569", ...MAR_CELL_WRAP_LONG_TEXT }}>{startByLine}</span>
                      <span style={{ fontSize: 11, color: "#475569", ...MAR_CELL_WRAP_LONG_TEXT }}>{stopByLine}</span>
                    </div>
                  );
                  marElapsed = (
                    <span style={{ fontSize: 12, color: "#334155", ...MAR_CELL_WRAP_LONG_TEXT }}>{durLine}</span>
                  );
                  marControls = marDashCell;
                } else if (marSaysAdministered) {
                  marLastAction = <span>🟢 {t("marTab.statusAdministered")}</span>;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else if (latest && !marSaysAdministered) {
                  marLastAction = (
                    <span>
                      🟠 {actionLabel(marActionResolved as MarAction, t)}
                      {recentWindow ? ` · ${t("marTab.statusRecentLabel")}` : ""}
                    </span>
                  );
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                } else {
                  marLastAction = <span>🔴 {t("marTab.statusPending")}</span>;
                  marControls = row.isInfusionLifecycleMed ? infusionControlsEl : administerControlEl;
                }

                const adminListForRow = adminsByOrderItemId.get(row.orderItemId) ?? [];
                const marRowClock = buildMedicationAdministrationTaskRowClockAction({
                  administrations: adminListForRow,
                  encounterOpen: encounterClinicalMutationsAllowed,
                  canAdjust: canAdjustAdminTime,
                  infusionActive: Boolean(row.isInfusionLifecycleMed && activeMarInfusion),
                  activeInfusionSessionKey: activeMarInfusion?.infusionSessionKey ?? null,
                });
                const resolvedClockAdmin =
                  marRowClock.administrationId != null
                    ? adminListForRow.find((a) => a.id === marRowClock.administrationId) ?? null
                    : null;
                const displayName =
                  marMedicationDisplayLabel(latest?.medicationLabelSnapshot, row.label, [
                    latest?.medicationLabelSnapshot,
                    row.label,
                  ]);
                const showDocAction = buildMedicationAdministrationRowDocumentAction({
                  encounterOpen: encounterClinicalMutationsAllowed,
                  canAdjust: canAdjustAdminTime,
                }).show;
                const latestVaccineDocumentation = parseVaccineAdministrationDocumentationFromMarNotes(latest?.notes);
                const latestVaccineView =
                  latestVaccineDocumentation && marSaysAdministered
                    ? buildCompletedVaccineAdministrationViewModel(
                        latestVaccineDocumentation,
                        language === "en" ? "en" : "fr"
                      )
                    : null;

                const marControlsWithClock = (
                  <div style={infusionControlsStackStyle}>
                    {marControls}
                    {showDocAction || marRowClock.show ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {showDocAction ? (
                          <MedicationAdministrationDocumentButton
                            title={t("marTab.adminTime.documentNoteTooltip")}
                            onClick={() => {
                              if (row.isInfusionLifecycleMed || marSaysAdministered) {
                                openModal(row, { hideAdministeredAction: true });
                              } else {
                                openModal(row);
                              }
                            }}
                            disabled={!isOpen || submitting}
                          />
                        ) : null}
                        {marRowClock.show ? (
                          <MedicationAdministrationClockButton
                            enabled={marRowClock.enabled}
                            title={t(marRowClock.tooltipKey)}
                            onClick={() => {
                              if (resolvedClockAdmin) setAdminTimeModalRow(resolvedClockAdmin);
                            }}
                          />
                        ) : null}
                        {marRowClock.showAdjustedBadge ? (
                          <MedicationAdministrationAdjustedBadge
                            label={t("marTab.adminTime.adjustedBadge")}
                            title={t("marTab.adminTime.adjustedBadgeTooltip")}
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {resolvedClockAdmin ? (
                      <MarAdministrationRowCorrectionControls
                        row={resolvedClockAdmin}
                        medicationLabel={displayName}
                        encounterId={encounterId}
                        facilityId={facilityId}
                        facilityTimeZone={facilityTimeZone}
                        language={language}
                        encounterOpen={encounterClinicalMutationsAllowed}
                        canAdjust={canAdjustAdminTime}
                        readOnly={!marHistoricalTimeline.isToday}
                        historyEntries={marHistoryRawEntries}
                        t={t}
                        onOpenTimeCorrection={() => setAdminTimeModalRow(resolvedClockAdmin)}
                        onSaved={handleMarCorrectionSaved}
                      />
                    ) : null}
                  </div>
                );

                const intendedLine =
                  row.intendedAt != null && String(row.intendedAt).trim() !== ""
                    ? formatClinicalInstantForFacility(String(row.intendedAt), facilityTimeZone, language)
                    : null;

                const intendedUrgency = intendedLine
                  ? medicationMarIntendedTimingUrgency(row.intendedAt, nowMs, marSaysAdministered)
                  : null;
                const intendedLineStyle: React.CSSProperties =
                  intendedUrgency === "overdue"
                    ? {
                        fontSize: 12,
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 4,
                        color: "#b71c1c",
                        backgroundColor: "#ffebee",
                        fontWeight: 600,
                      }
                    : intendedUrgency === "dueSoon"
                      ? {
                          fontSize: 12,
                          marginTop: 4,
                          padding: "6px 8px",
                          borderRadius: 4,
                          color: "#e65100",
                          backgroundColor: "#fff8e1",
                          fontWeight: 600,
                        }
                      : { fontSize: 12, color: "#424242", marginTop: 4 };

                const issuedCell = row.attributionLines[0]?.trim() || "—";
                const titleCellParts: string[] = [];
                if (row.authorityLine?.trim()) titleCellParts.push(row.authorityLine.trim());
                for (const line of row.attributionLines.slice(1)) {
                  if (line.trim()) titleCellParts.push(line.trim());
                }
                const titleCell = titleCellParts.length > 0 ? titleCellParts.join(" · ") : "—";

                return (
                  <tr
                    key={row.orderItemId}
                    style={{
                      borderBottom: "1px solid #eee",
                      verticalAlign: "top",
                      backgroundColor: latest?.pendingSync ? "#fff8e1" : undefined,
                    }}
                  >
                    <td style={{ ...marTablePrimaryCellStyle, color: "#334155", fontWeight: 600 }}>
                      {t("marTab.columnCategoryValue")}
                    </td>
                    <td style={{ ...marTablePrimaryCellStyle, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                      {issuedCell}
                    </td>
                    <td style={{ ...marTablePrimaryCellStyle, color: "#424242" }}>
                      {latest ? (
                        <MedicationAdministrationTimeCell
                          row={latest}
                          facilityTimeZone={facilityTimeZone}
                          language={language}
                          t={t}
                        />
                      ) : (
                        <div style={{ whiteSpace: "nowrap" }}>{t("common.dash")}</div>
                      )}
                      {intendedLine ? (
                        <div
                          style={intendedLineStyle}
                          title={
                            intendedUrgency === "overdue"
                              ? t("marTab.intendedOverdueTitle")
                              : intendedUrgency === "dueSoon"
                                ? t("marTab.intendedDueSoonTitle")
                                : undefined
                          }
                        >
                          {t("marTab.intendedPrefix")} {intendedLine}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...marTablePrimaryCellStyle, fontSize: marCompact ? 13 : 14, ...MAR_CELL_WRAP_LONG_TEXT }}>
                      <div style={{ fontWeight: 600 }}>{displayName}</div>
                      {row.routeHint ? (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          {t("marTab.routePrefix")}{" "}
                          {normalizeMedicationDisplayForLocale(row.routeHint, language)}
                        </div>
                      ) : null}
                      {row.highRiskWarning ? (
                        <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 600 }}>
                          {row.highRiskWarning}
                        </div>
                      ) : null}
                      <MedicationMarSafetyGovernanceBadges governance={row.governanceDisplay} compact />
                      {latestVaccineView ? (
                        <div
                          data-testid="completed-vaccine-readonly-details"
                          style={{
                            marginTop: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#f8fafc",
                            fontSize: 12,
                            color: "#334155",
                          }}
                        >
                          {latestVaccineView.rows.map((detail) => (
                            <div key={detail.key}>
                              <strong>{language === "en" ? detail.labelEn : detail.labelFr}:</strong>{" "}
                              {detail.value}
                            </div>
                          ))}
                          {latestVaccineView.note ? (
                            <div style={{ marginTop: 6 }}>{latestVaccineView.note}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td style={marTableMetricCellStyle}>
                      {marLastAction}
                    </td>
                    <td style={marTableMetricCellStyle}>{marStarted}</td>
                    <td style={marTableMetricCellStyle}>{marStopped}</td>
                    <td style={marTableMetricCellStyle}>{marPerformer}</td>
                    <td style={marTableMetricCellStyle}>{marElapsed}</td>
                    <td style={marTableControlsCellStyle}>{marControlsWithClock}</td>
                    <td style={{ ...marTablePrimaryCellStyle, fontSize: 12, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                      {titleCell}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ margin: marCompact ? "16px 0 6px 0" : "24px 0 8px 0", fontSize: marCompact ? 15 : 16 }}>{t("marTab.historyTitle")}</h3>
      {loading ? null : admins.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {admins
            .slice()
            .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())
            .map((r) => {
              const label = resolveHistoryMedicationLabel(r);
              const vaccineDocumentation = parseVaccineAdministrationDocumentationFromMarNotes(r.notes);
              const vaccineView = vaccineDocumentation
                ? buildCompletedVaccineAdministrationViewModel(
                    vaccineDocumentation,
                    language === "en" ? "en" : "fr"
                  )
                : null;
              const visibleNotes = vaccineView
                ? ""
                : sanitizeMarAdministrationVisibleNote(r.notes, language === "en" ? "en" : "fr");
              const historyClock = buildMedicationAdministrationRowClockAction({
                administration: r,
                encounterOpen: encounterClinicalMutationsAllowed,
                canAdjust: canAdjustAdminTime,
              });
              return (
                <li
                  key={r.id}
                  style={
                    marCompact
                      ? clinicalTabletCompactHistoryItemStyle({
                          backgroundColor: "#fafafa",
                          borderRadius: 8,
                          border: "1px solid #eee",
                          fontSize: 13,
                        })
                      : {
                          padding: "12px 14px",
                          marginBottom: 8,
                          backgroundColor: "#fafafa",
                          borderRadius: 8,
                          border: "1px solid #eee",
                          fontSize: 14,
                        }
                  }
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 600,
                        }}
                      >
                        <span>{label}</span>
                        <MedicationAdministrationInfusionPhaseChip row={r} t={t} />
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <MedicationAdministrationTimeCell
                          row={r}
                          facilityTimeZone={facilityTimeZone}
                          language={language}
                          t={t}
                          showPerformer
                        />
                      </div>
                    </div>
                    {historyClock.show ? (
                      <MedicationAdministrationClockButton
                        enabled={historyClock.enabled}
                        title={t(historyClock.tooltipKey)}
                        onClick={() => setAdminTimeModalRow(r)}
                      />
                    ) : null}
                  </div>
                  <MarAdministrationRowCorrectionControls
                    row={r}
                    medicationLabel={label}
                    encounterId={encounterId}
                    facilityId={facilityId}
                    facilityTimeZone={facilityTimeZone}
                    language={language}
                    encounterOpen={encounterClinicalMutationsAllowed}
                    canAdjust={canAdjustAdminTime}
                    readOnly={!marHistoricalTimeline.isToday}
                    historyEntries={marHistoryRawEntries}
                    t={t}
                    onOpenTimeCorrection={() => setAdminTimeModalRow(r)}
                    onSaved={handleMarCorrectionSaved}
                  />
                  {vaccineView ? (
                    <div
                      data-testid="vaccine-history-readonly-details"
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#fff",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      {vaccineView.rows.map((detail) => (
                        <div key={detail.key}>
                          <strong>{language === "en" ? detail.labelEn : detail.labelFr}:</strong>{" "}
                          {detail.value}
                        </div>
                      ))}
                      {vaccineView.note ? <div style={{ marginTop: 6 }}>{vaccineView.note}</div> : null}
                    </div>
                  ) : null}
                  {visibleNotes ? (
                    <pre
                      style={{
                        margin: "8px 0 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "inherit",
                        fontSize: 13,
                        color: "#333",
                      }}
                    >
                      {visibleNotes}
                    </pre>
                  ) : null}
                </li>
              );
            })}
        </ul>
      )}
      </>
      ) : null}

      {modalItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mar-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="mar-modal-title" style={{ margin: "0 0 12px 0", fontSize: 17 }}>
              {t("marTab.modalTitle")}
            </h4>

            {modalSubmitError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #ef9a9a",
                  backgroundColor: "#ffebee",
                  fontSize: 13,
                  color: "#b71c1c",
                  fontWeight: 600,
                }}
              >
                {modalSubmitError}
              </div>
            ) : null}

            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{modalItem.label}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
              {modalItem.authorityLine}
            </p>
            {modalItem.attributionLines.map((line) => (
              <p key={line} style={{ margin: "0 0 6px 0", fontSize: 13, color: "#64748b", ...MAR_CELL_WRAP_LONG_TEXT }}>
                {line}
              </p>
            ))}
            {modalItem.highRiskWarning ? (
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                {modalItem.highRiskWarning}
              </p>
            ) : null}
            <MedicationMarSafetyGovernanceBadges governance={modalItem.governanceDisplay} />
            <details
              style={{ marginBottom: 12 }}
              open={marGovernanceDetailsOpen}
              onToggle={(e) => setMarGovernanceDetailsOpen(e.currentTarget.open)}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                  listStyle: "none",
                  marginBottom: 8,
                }}
              >
                {t("mar.viewSafetyDetails")}
              </summary>
              <MedicationMarSafetySummaryPanel governance={modalItem.governanceDisplay} density="compact" />
            </details>
            <MarPharmacyVerificationPanel
              governance={modalItem.governanceDisplay}
              marAction={modalAction}
              state={marPharmacyForm}
              onChange={(patch) => setMarPharmacyForm((prev) => ({ ...prev, ...patch }))}
              dateLocale={dateLocale}
            />
            <MarControlledSubstanceFields
              facilityId={facilityId}
              currentUserId={currentUserId}
              governance={modalItem.governanceDisplay}
              marAction={modalAction}
              orderedQuantity={modalItem.orderedQuantity}
              administeredQuantity={modalAdminQty}
              defaultWasteUnit={modalItem.billingUnitHint}
              state={marControlledForm}
              onChange={(patch) => setMarControlledForm((prev) => ({ ...prev, ...patch }))}
            />
            <MarHighAlertFields
              governance={modalItem.governanceDisplay}
              marAction={modalAction}
              routeOptions={modalHighAlertRouteOptions}
              state={marHighAlertForm}
              onChange={(patch) => setMarHighAlertForm((prev) => ({ ...prev, ...patch }))}
              sharedOverrideReason={
                marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction) &&
                marControlledForm.useOverride
                  ? marControlledForm.overrideReason
                  : undefined
              }
              sharedUseOverride={
                marControlledWorkflowVisible(modalItem.governanceDisplay, modalAction) &&
                marControlledForm.useOverride
              }
              onUseSharedOverride={(use) => {
                if (!use) return;
                setMarHighAlertForm((prev) => ({ ...prev, useOverride: false }));
              }}
            />
            <MarLasaFields
              facilityId={facilityId}
              governance={modalItem.governanceDisplay}
              marAction={modalAction}
              medicationLabel={modalItem.label}
              state={marLasaForm}
              onChange={(patch) => {
                setMarLasaForm((prev) => ({ ...prev, ...patch }));
                if (Object.keys(marLasaFieldErrors).length > 0) {
                  setMarLasaFieldErrors({});
                }
              }}
              fieldErrors={marLasaFieldErrors}
            />

            {(() => {
              const list = adminsByOrderItemId.get(modalItem.orderItemId) ?? [];
              const latest = list[0];
              const lastWhen = latest
                ? formatClinicalInstantForFacility(latest.administeredAt, facilityTimeZone, language)
                : t("common.dash");
              const now = new Date();
              let todayCount = 0;
              let todayQty = 0;
              let todayHasQty = false;
              let cumQty = 0;
              let cumHasQty = false;
              let cumEvents = 0;
              for (const r of list) {
                const act = resolveMedicationMarActionFromStorage({
                  marAction: r.marAction ?? null,
                  notes: r.notes,
                });
                if (act !== "administered") continue;
                cumEvents += 1;
                const q = r.administeredQuantity;
                if (typeof q === "number" && Number.isFinite(q)) {
                  cumQty += q;
                  cumHasQty = true;
                }
                if (isSameLocalCalendarDay(r.administeredAt, now)) {
                  todayCount += 1;
                  if (typeof q === "number" && Number.isFinite(q)) {
                    todayQty += q;
                    todayHasQty = true;
                  }
                }
              }
              const orderedLabel =
                modalItem.orderedQuantity != null ? String(modalItem.orderedQuantity) : t("common.dash");
              const cumulativeLabel = cumHasQty
                ? t("marTab.safetyPreviewCumulative").replace("{qty}", String(cumQty))
                : t("marTab.safetyPreviewCumulativeEvents").replace("{count}", String(cumEvents));
              return (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    fontSize: 12,
                    color: "#334155",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "#0f172a" }}>
                    {t("marTab.safetyPreviewTitle")}
                  </div>
                  <div>{t("marTab.safetyPreviewLastAdmin").replace("{when}", lastWhen)}</div>
                  <div>{t("marTab.safetyPreviewToday").replace("{count}", String(todayCount))}</div>
                  {todayHasQty ? (
                    <div>{t("marTab.safetyPreviewTodayQty").replace("{qty}", String(todayQty))}</div>
                  ) : null}
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    {t("marTab.safetyPreviewOrdered").replace("{qty}", orderedLabel)}
                    <span style={{ color: "#94a3b8" }}> · </span>
                    {cumulativeLabel}
                  </div>
                  <details
                    style={{ marginTop: 10 }}
                    open={marSafetyDetailsOpen}
                    onToggle={(e) => setMarSafetyDetailsOpen(e.currentTarget.open)}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        listStyle: "none",
                      }}
                    >
                      {t("mar.viewSafetyDetails")}
                    </summary>
                    <div style={{ marginTop: 10 }}>
                      <MedicationSoftSafetyPanel
                        warnings={modalItem.softSafetyWarnings}
                        density="compact"
                        therapeuticClass={modalItem.therapeuticClass}
                      />
                      {modalAction === "administered" ? (
                        <AdvancedMedicationSafetyPanel warnings={marAdvancedMedicationSafetyWarnings} density="compact" />
                      ) : null}
                    </div>
                  </details>
                </div>
              );
            })()}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.routeOptional")}
            </label>
            <input
              type="text"
              value={modalRoute}
              onChange={(e) => setModalRoute(e.target.value)}
              placeholder={
                normalizeMedicationDisplayForLocale(modalItem.routeHint, language) ||
                t("marTab.routePlaceholder")
              }
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            {modalShowsPrnSection ? (
              <div
                data-testid="mar-prn-governance-section"
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  {t("marPrnGovernance.sectionTitle")}
                </div>
                {modalItem?.prnIndication?.trim() ? (
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569" }}>
                    {t("marPrnGovernance.orderIndication")}: {modalItem.prnIndication}
                  </p>
                ) : null}
                {modalPrnEarlyAdministration ? (
                  <div
                    data-testid="mar-prn-early-override-warning"
                    style={{
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      backgroundColor: "#fffbeb",
                      color: "#92400e",
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    {t("marPrnGovernance.earlyOverrideWarning")}
                  </div>
                ) : null}
                {modalPrnEarlyAdministration ? (
                  <>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marPrnGovernance.earlyOverrideReasonLabel")} *
                    </label>
                    <textarea
                      data-testid="mar-prn-early-override-reason"
                      value={marPrnEarlyOverrideReason}
                      onChange={(e) => setMarPrnEarlyOverrideReason(e.target.value)}
                      disabled={submitting}
                      rows={2}
                      style={{
                        width: "100%",
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        fontSize: 16,
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </>
                ) : null}
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  {t("marPrnGovernance.reasonLabel")} *
                </label>
                <select
                  data-testid="mar-prn-reason-code"
                  value={marPrnReasonCode}
                  onChange={(e) => setMarPrnReasonCode(e.target.value as MarPrnReasonCode | "")}
                  disabled={submitting}
                  required
                  style={{
                    width: "100%",
                    padding: 12,
                    marginBottom: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 16,
                    boxSizing: "border-box",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="">{t("marPrnGovernance.reasonPlaceholder")}</option>
                  {modalPrnReasonOptions.map((code) => (
                    <option key={code} value={code}>
                      {t(`marPrnGovernance.reasons.${code}`)}
                    </option>
                  ))}
                </select>
                {marPrnReasonCode === "other" ? (
                  <>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marPrnGovernance.otherLabel")} *
                    </label>
                    <input
                      data-testid="mar-prn-reason-other"
                      type="text"
                      value={marPrnReasonOther}
                      onChange={(e) => setMarPrnReasonOther(e.target.value)}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        fontSize: 16,
                        boxSizing: "border-box",
                      }}
                    />
                  </>
                ) : null}
                {modalRequiresPainScore ? (
                  <>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marPrnGovernance.painScoreLabel")} *
                    </label>
                    <select
                      data-testid="mar-prn-pain-score"
                      value={marPainScore}
                      onChange={(e) => setMarPainScore(e.target.value)}
                      disabled={submitting}
                      required
                      style={{
                        width: "100%",
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        fontSize: 16,
                        boxSizing: "border-box",
                        backgroundColor: "#fff",
                      }}
                    >
                      <option value="">{t("marPrnGovernance.painScorePlaceholder")}</option>
                      {Array.from({ length: 11 }, (_, n) => (
                        <option key={n} value={String(n)}>
                          {n}/10
                        </option>
                      ))}
                    </select>
                    <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marPrnGovernance.painLocationLabel")}
                    </label>
                    <input
                      data-testid="mar-prn-pain-location"
                      type="text"
                      value={marPainLocation}
                      onChange={(e) => setMarPainLocation(e.target.value)}
                      disabled={submitting}
                      placeholder={t("marPrnGovernance.painLocationPlaceholder")}
                      style={{
                        width: "100%",
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        fontSize: 16,
                        boxSizing: "border-box",
                      }}
                    />
                    {modalOpioidPrnMissingRespiratoryRate ? (
                      <p
                        data-testid="mar-prn-opioid-resp-warning"
                        style={{ margin: 0, fontSize: 13, color: "#b45309" }}
                      >
                        {t("marPrnGovernance.opioidRespiratoryWarning")}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}

            {modalRequiresInjectionSite ? (
              <>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  {t("marTab.injectionSiteLabel")} *
                </label>
                <select
                  value={modalInjectionSite}
                  onChange={(e) => setModalInjectionSite(e.target.value as ImInjectionSiteId | "")}
                  disabled={submitting}
                  required
                  style={{
                    width: "100%",
                    padding: 12,
                    marginBottom: 14,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 16,
                    boxSizing: "border-box",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="">{t("marTab.injectionSitePlaceholder")}</option>
                  {imInjectionSiteValues.map((siteId) => (
                    <option key={siteId} value={siteId}>
                      {t(`marTab.injectionSites.${siteId}`)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {modalIsVaccine ? (
              <section
                data-testid="vaccine-mar-documentation-section"
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                  {t("marTab.vaccine.sectionTitle")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>
                    <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marTab.vaccine.lotNumber")} *
                    </span>
                    <input
                      data-testid="vaccine-lot-number"
                      value={vaccineLotNumber}
                      onChange={(e) => setVaccineLotNumber(e.target.value)}
                      disabled={submitting}
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </label>
                  <label>
                    <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      {t("marTab.vaccine.expirationDate")} *
                    </span>
                    <input
                      data-testid="vaccine-expiration-date"
                      type="date"
                      value={vaccineExpirationDate}
                      onChange={(e) => setVaccineExpirationDate(e.target.value)}
                      disabled={submitting}
                      style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                  </label>
                </div>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {t("marTab.vaccine.manufacturer")} *
                  </span>
                  <select
                    data-testid="vaccine-manufacturer"
                    value={vaccineManufacturerId}
                    onChange={(e) =>
                      setVaccineManufacturerId(e.target.value as VaccineAdministrationDocumentation["manufacturerId"])
                    }
                    disabled={submitting}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                  >
                    <option value="">{t("marTab.vaccine.selectPlaceholder")}</option>
                    {VACCINE_MANUFACTURER_CATALOG.map((m) => (
                      <option key={m.id} value={m.id}>
                        {language === "en" ? m.labelEn : m.labelFr}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                    <input
                      data-testid="vaccine-vis-given"
                      type="checkbox"
                      checked={vaccineVisGiven}
                      onChange={(e) => setVaccineVisGiven(e.target.checked)}
                      disabled={submitting}
                    />
                    {t("marTab.vaccine.visGiven")}
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                    <input
                      data-testid="vaccine-allergies-verified"
                      type="checkbox"
                      checked={vaccineAllergiesVerified}
                      onChange={(e) => setVaccineAllergiesVerified(e.target.checked)}
                      disabled={submitting}
                    />
                    {t("marTab.vaccine.allergiesVerified")} *
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                    <input
                      data-testid="vaccine-five-rights"
                      type="checkbox"
                      checked={vaccineFiveRightsConfirmed}
                      onChange={(e) => setVaccineFiveRightsConfirmed(e.target.checked)}
                      disabled={submitting}
                    />
                    {t("marTab.vaccine.fiveRights")} *
                  </label>
                </div>
                {vaccineVisGiven ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <label>
                      <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                        {t("marTab.vaccine.visRecipient")} *
                      </span>
                      <select
                        data-testid="vaccine-vis-recipient"
                        value={vaccineVisRecipient}
                        onChange={(e) =>
                          setVaccineVisRecipient(e.target.value as VaccineAdministrationDocumentation["visRecipient"])
                        }
                        disabled={submitting}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                      >
                        <option value="none">{t("marTab.vaccine.selectPlaceholder")}</option>
                        {(["patient", "parent", "guardian", "family", "caregiver"] as const).map((value) => (
                          <option key={value} value={value}>
                            {t(`marTab.vaccine.recipients.${value}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                        {t("marTab.vaccine.visDate")} *
                      </span>
                      <input
                        data-testid="vaccine-vis-date"
                        type="date"
                        value={vaccineVisDate}
                        onChange={(e) => setVaccineVisDate(e.target.value)}
                        disabled={submitting}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                      />
                    </label>
                  </div>
                ) : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                    <input
                      data-testid="vaccine-education-reviewed"
                      type="checkbox"
                      checked={vaccineEducationReviewed}
                      onChange={(e) => setVaccineEducationReviewed(e.target.checked)}
                      disabled={submitting}
                    />
                    {t("marTab.vaccine.educationReviewed")} *
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
                    <input
                      data-testid="vaccine-understanding-confirmed"
                      type="checkbox"
                      checked={vaccineUnderstandingConfirmed}
                      onChange={(e) => setVaccineUnderstandingConfirmed(e.target.checked)}
                      disabled={submitting}
                    />
                    {t("marTab.vaccine.understandingConfirmed")} *
                  </label>
                </div>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {t("marTab.vaccine.reviewedWith")} *
                  </span>
                  <select
                    data-testid="vaccine-reviewed-with"
                    value={vaccineReviewedWith}
                    onChange={(e) => setVaccineReviewedWith(e.target.value as VaccineEducationRecipient | "")}
                    disabled={submitting}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                  >
                    <option value="">{t("marTab.vaccine.selectPlaceholder")}</option>
                    {(["patient", "parent", "guardian", "spouse", "family", "caregiver"] as const).map((value) => (
                      <option key={value} value={value}>
                        {t(`marTab.vaccine.recipients.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ marginTop: 10 }}>
                  <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {t("marTab.vaccine.reviewedTopics")} *
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {VACCINE_DEFAULT_TOPICS.map((topic) => (
                      <label key={topic} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          data-testid={`vaccine-topic-${topic}`}
                          type="checkbox"
                          checked={vaccineReviewedTopics.includes(topic)}
                          onChange={() =>
                            setVaccineReviewedTopics((prev) =>
                              prev.includes(topic) ? prev.filter((x) => x !== topic) : [...prev, topic]
                            )
                          }
                          disabled={submitting}
                        />
                        {t(`marTab.vaccine.topics.${topic}`)}
                      </label>
                    ))}
                  </div>
                </div>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {t("marTab.vaccine.amountWasted")}
                  </span>
                  <input
                    data-testid="vaccine-amount-wasted"
                    value={vaccineAmountWasted}
                    onChange={(e) => setVaccineAmountWasted(e.target.value)}
                    disabled={submitting}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                  />
                </label>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {t("marTab.vaccine.notePreview")}
                  </span>
                  <textarea
                    data-testid="vaccine-note-preview"
                    readOnly
                    value={modalVaccineNotePreview}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </label>
              </section>
            ) : null}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.doseUnitPlaceholder")}
            </label>
            <input
              type="text"
              value={modalDoseUnit}
              onChange={(e) => setModalDoseUnit(e.target.value)}
              placeholder={modalItem.billingUnitHint || t("marTab.doseUnitPlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.adminQuantityPlaceholder")}
            </label>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={modalAdminQty}
              onChange={(e) => setModalAdminQty(e.target.value)}
              placeholder={t("marTab.adminQuantityPlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.actionHeading")}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {(
                (["administered", "refused", "not_available", "md_changed"] as const).filter(
                  (a) => !(modalItem.hideAdministeredAction && a === "administered")
                )
              ).map((a) => (
                <label
                  key={a}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 15,
                    padding: "10px 8px",
                    borderRadius: 8,
                    border: modalAction === a ? "2px solid #2e7d32" : "1px solid #ddd",
                    cursor: submitting ? "default" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="mar-action"
                    checked={modalAction === a}
                    onChange={() => {
                      setModalAction(a);
                      if (a !== "administered") {
                        setMarAllergySafetyAck(false);
                        setMarTimingOverrideAck(false);
                        setMarHighRiskSafetyAck(false);
                      }
                    }}
                    disabled={submitting}
                  />
                  {actionLabel(a, t)}
                </label>
              ))}
            </div>

            {modalAction === "administered" && marAllergyDocSummary ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  backgroundColor: "#fef2f2",
                  fontSize: 13,
                  color: "#991b1b",
                  lineHeight: 1.45,
                }}
              >
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={marAllergySafetyAck}
                    disabled={submitting}
                    onChange={(e) => setMarAllergySafetyAck(e.target.checked)}
                  />
                  <span>{t("marTab.allergyAckLabel")}</span>
                </label>
              </div>
            ) : null}

            {modalAction === "administered" &&
            modalItem &&
            medicationWarningsRequireMarHighRiskAck(modalItem.softSafetyWarnings) ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f1f5f9",
                  fontSize: 13,
                  color: "#0f172a",
                  lineHeight: 1.45,
                }}
              >
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: submitting ? "default" : "pointer", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={marHighRiskSafetyAck}
                    disabled={submitting}
                    onChange={(e) => setMarHighRiskSafetyAck(e.target.checked)}
                  />
                  <span>{t("marTab.highRiskMarAckLabel")}</span>
                </label>
              </div>
            ) : null}

            {(() => {
              if (!modalItem || modalAction !== "administered" || canAdjustAdminTime) {
                return null;
              }
              const clinicalTz = resolveClinicalTimeZone({ facilityTimeZone });
              const documentedAtForTiming = new Date();
              const clinicalEventAt =
                modalEffectiveTimeLocal.trim()
                  ? clinicalDatetimeLocalToUtcDate(modalEffectiveTimeLocal, clinicalTz) ?? documentedAtForTiming
                  : documentedAtForTiming;
              const timingAdvisory = resolveMarMedicationTimingAdvisory({
                scheduledAt: modalItem.isPrn ? null : modalItem.scheduledAt,
                clinicalEventAt,
                documentedAt: documentedAtForTiming,
                isPrn: modalItem.isPrn,
              });
              if (timingAdvisory.severity === "NONE" || !timingAdvisory.messageKey) {
                return null;
              }
              const isSignificant = timingAdvisory.severity === "SIGNIFICANT_DIFFERENCE";
              return (
                <div
                  role="status"
                  data-testid={
                    isSignificant
                      ? "mar-significant-difference-advisory"
                      : "mar-outside-window-advisory"
                  }
                  style={{
                    marginBottom: 12,
                    padding: "12px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.45,
                    fontWeight: 600,
                    border: isSignificant ? "1px solid #ea580c" : "1px solid #f59e0b",
                    backgroundColor: isSignificant ? "#fff7ed" : "#fffbeb",
                    color: isSignificant ? "#9a3412" : "#92400e",
                  }}
                >
                  {t(timingAdvisory.messageKey)}
                </div>
              );
            })()}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{t("marTab.notesLabel")}</label>
            {marDraftRestoredAt ? (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                {t("marTab.localDraftRestored")}
              </p>
            ) : null}
            {marDraftSavedLocallyAt ? (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                {t("marTab.localDraftSaved")}
              </p>
            ) : null}
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              rows={3}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "#666" }}>{t("marTab.timestampHint")}</p>

            {(() => {
              if (!modalItem || modalAction !== "administered" || !lastAdministeredForModal) return null;
              const timingEv = evaluateMedicationTimingSafety({
                lastAdministeredAt: lastAdministeredForModal.administeredAt,
                now: new Date(),
                medicationKey: modalItem.orderItemId,
              });
              if (timingEv.level === "none") return null;
              const by = lastAdministeredForModal.administeredBy;
              const rnName = `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() || t("common.dash");
              const minutes = timingEv.minutesSinceLast ?? 0;
              const msgBase = `medicationTimingSafety.${timingEv.messageKey}`;
              const timingText = t(msgBase)
                .replace("{minutes}", String(minutes))
                .replace("{name}", rnName);
              const shell =
                timingEv.level === "critical"
                  ? {
                      border: "1px solid #ef4444",
                      backgroundColor: "#fef2f2",
                      color: "#991b1b",
                    }
                  : timingEv.level === "warning"
                    ? {
                        border: "1px solid #f59e0b",
                        backgroundColor: "#fffbeb",
                        color: "#92400e",
                      }
                    : {
                        border: "1px solid #3b82f6",
                        backgroundColor: "#eff6ff",
                        color: "#1e40af",
                      };
              return (
                <div style={{ marginBottom: 14 }}>
                  <div
                    role="status"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      lineHeight: 1.45,
                      fontWeight: 600,
                      ...shell,
                    }}
                  >
                    {timingText}
                  </div>
                  {timingEv.level === "critical" ? (
                    <label
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        marginTop: 10,
                        cursor: submitting ? "default" : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marTimingOverrideAck}
                        disabled={submitting}
                        onChange={(e) => setMarTimingOverrideAck(e.target.checked)}
                      />
                      <span>{t("medicationTimingSafety.overrideAck")}</span>
                    </label>
                  ) : null}
                </div>
              );
            })()}

            {modalItem &&
            canAdjustAdminTime &&
            (modalAction === "administered" ||
              modalAction === "refused" ||
              modalAction === "not_available" ||
              modalAction === "md_changed") ? (
              <div style={{ marginTop: 14 }}>
                <MedicationClinicalDateTimeField
                  label={t("marClinicalTime.clinicalTimeLabel")}
                  value={modalEffectiveTimeLocal}
                  onChange={setModalEffectiveTimeLocal}
                  documentedAt={new Date().toISOString()}
                  scheduledTime={modalItem.isPrn ? null : modalItem.scheduledAt}
                  currentScheduledTime={modalItem.isPrn ? null : modalItem.scheduledAt}
                  actionType={
                    modalItem.isPrn && modalAction === "administered"
                      ? "PRN_ADMINISTER"
                      : modalAction === "refused"
                        ? "REFUSE"
                        : modalAction === "not_available"
                          ? "NOT_AVAILABLE"
                          : modalAction === "md_changed"
                            ? "MD_CHANGED"
                            : "ADMINISTER"
                  }
                  facilityTimeZone={resolveClinicalTimeZone({ facilityTimeZone })}
                  required
                  disabled={submitting}
                  showReasonWhenRequired={false}
                  testId="mar-record-modal-clinical-time"
                />
              </div>
            ) : null}

            {modalAction === "administered" &&
            modalIsVaccine &&
            modalVaccineValidationBlockers &&
            !modalVaccineValidationBlockers.ok ? (
              <div
                role="alert"
                data-testid="vaccine-save-validation-panel"
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #f59e0b",
                  backgroundColor: "#fffbeb",
                  color: "#92400e",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                {t("marTab.vaccine.errSummary").replace(
                  "{fields}",
                  modalVaccineValidationBlockers.blockerCodes
                    .map((code) => t(`marTab.vaccine.blockers.${code}`))
                    .join(", ")
                )}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: 10,
              }}
            >
              <div style={{ flex: "1 1 120px" }} />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "flex-end",
                  flex: "1 1 200px",
                  minWidth: 0,
                }}
              >
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {t("marTab.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitModal()}
                disabled={(() => {
                  if (submitting) return true;
                  if (!modalItem || modalAction !== "administered") return false;
                  if (
                    marModalRequiresInjectionSite({
                      marAction: modalAction,
                      route: modalRoute.trim() || modalItem.routeHint,
                    }) &&
                    !modalInjectionSite
                  ) {
                    return true;
                  }
                  if (marAllergyDocSummary && !marAllergySafetyAck) return true;
                  if (
                    medicationWarningsRequireMarHighRiskAck(modalItem.softSafetyWarnings) &&
                    !marHighRiskSafetyAck
                  ) {
                    return true;
                  }
                  if (lastAdministeredForModal) {
                    const te = evaluateMedicationTimingSafety({
                      lastAdministeredAt: lastAdministeredForModal.administeredAt,
                      now: new Date(),
                      medicationKey: modalItem.orderItemId,
                    });
                    if (te.level === "critical" && !marTimingOverrideAck) return true;
                  }
                  if (
                    marLasaWorkflowVisible(modalItem.governanceDisplay, modalAction) &&
                    !marLasaAcknowledgementComplete(marLasaForm)
                  ) {
                    return true;
                  }
                  return false;
                })()}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "none",
                  background: "#1a1a1a",
                  color: "white",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {submitting ? t("common.loading") : t("marTab.save")}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {infusionStartWitnessModal && facilityId ? (
        <SecondClinicianVerificationModal
          facilityId={facilityId}
          currentUserId={currentUserId ?? undefined}
          title={t("marHighAlert.verifierModalTitle")}
          subtitle={t("marHighAlert.verifierModalSubtitle")}
          roleFilter="RN"
          mode="require-second-clinician"
          open={Boolean(infusionStartWitnessModal)}
          saving={Boolean(infusionBusy)}
          testId="mar-infusion-start-verifier-modal"
          confirmLabel={t("marHighAlert.verifierModalConfirm")}
          searchLabel={t("marHighAlert.verifierLabel")}
          searchAria={t("marHighAlert.verifierAria")}
          searchPlaceholder={t("marHighAlert.verifierPlaceholder")}
          onCancel={() => {
            setInfusionStartWitnessModal(null);
            setPendingTimelineStartItem(null);
          }}
          onConfirm={(userId, user) => {
            const displayName = `${user.firstName} ${user.lastName}`.trim();
            const target = infusionStartWitnessModal;
            const timelineItem = pendingTimelineStartItem;
            setInfusionStartWitnessModal(null);
            setPendingTimelineStartItem(null);
            if (timelineItem && target) {
              void (async () => {
                try {
                  await runMarInfusion(
                    timelineItem.orderItemId,
                    target.orderId,
                    "start",
                    undefined,
                    { userId, displayName },
                    {
                      medicationDoseInstanceId: timelineItem.medicationDoseInstanceId,
                      skipReload: true,
                      skipModalClose: true,
                    }
                  );
                  await reloadMarData();
                  await refreshMarViews();
                } catch {
                  // runMarInfusion sets tab error state
                }
              })();
              return;
            }
            setPendingInfusionStartVerifier({ userId, displayName });
            if (target) {
              setInfusionModal({
                orderItemId: target.orderItemId,
                orderId: target.orderId,
                op: "start",
                label: target.label,
              });
              setInfusionModalNote("");
            }
          }}
        />
      ) : null}

      {showHighAlertVerifierModal && facilityId ? (
        <SecondClinicianVerificationModal
          facilityId={facilityId}
          currentUserId={currentUserId ?? undefined}
          title={t("marHighAlert.verifierModalTitle")}
          subtitle={t("marHighAlert.verifierModalSubtitle")}
          roleFilter="RN"
          mode="require-second-clinician"
          open={showHighAlertVerifierModal}
          saving={submitting}
          testId="mar-high-alert-verifier-modal"
          confirmLabel={t("marHighAlert.verifierModalConfirm")}
          searchLabel={t("marHighAlert.verifierLabel")}
          searchAria={t("marHighAlert.verifierAria")}
          searchPlaceholder={t("marHighAlert.verifierPlaceholder")}
          onCancel={() => setShowHighAlertVerifierModal(false)}
          onConfirm={async (userId, user) => {
            const displayName = `${user.firstName} ${user.lastName}`.trim();
            setMarHighAlertForm((prev) => ({
              ...prev,
              verifierUserId: userId,
              verifierDisplayName: displayName,
            }));
            setShowHighAlertVerifierModal(false);
            await submitModal({
              highAlertVerifierUserId: userId,
              highAlertVerifierDisplayName: displayName,
            });
          }}
        />
      ) : null}

      {infusionModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mar-infusion-doc-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !infusionBusy) setInfusionModal(null);
          }}
        >
          <div
            style={{
              width: "min(440px, 100%)",
              backgroundColor: "white",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="mar-infusion-doc-title" style={{ margin: "0 0 10px", fontSize: 17 }}>
              {infusionModal.op === "start" ? t("marTab.infusionStartModalTitle") : t("marTab.infusionStopModalTitle")}
            </h4>
            <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>
              {infusionModal.label}
            </p>
            {infusionDraftRestoredAt ? (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                {t("marTab.localDraftRestored")}
              </p>
            ) : null}
            {infusionDraftSavedLocallyAt ? (
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                {t("marTab.localDraftSaved")}
              </p>
            ) : null}
            {infusionModal.op === "stop" ? (
              <>
                <label
                  htmlFor="mar-infusion-clinical-time"
                  style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
                >
                  {t("marShiftTimeline.drawer.stopTimeField")}
                </label>
                <input
                  id="mar-infusion-clinical-time"
                  data-testid="mar-infusion-clinical-stop-time"
                  type="datetime-local"
                  value={infusionClinicalTimeValue}
                  onChange={(e) => setInfusionClinicalTimeValue(e.target.value)}
                  disabled={Boolean(infusionBusy)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 15,
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
                <label
                  htmlFor="mar-infusion-stop-reason"
                  style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
                >
                  {t("marInfusionStopReason.fieldLabel")}
                </label>
                <select
                  id="mar-infusion-stop-reason"
                  data-testid="mar-infusion-stop-reason"
                  value={infusionStopReasonCode}
                  onChange={(e) => setInfusionStopReasonCode(e.target.value)}
                  disabled={Boolean(infusionBusy)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 15,
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                >
                  {MEDICATION_INFUSION_NURSE_STOP_REASON_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t(`marInfusionStopReason.${code}`)}
                    </option>
                  ))}
                </select>
                <label
                  htmlFor="mar-infusion-stop-reason-detail"
                  style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
                >
                  {t("marInfusionStopReason.detailLabel")}
                </label>
                <input
                  id="mar-infusion-stop-reason-detail"
                  data-testid="mar-infusion-stop-reason-detail"
                  type="text"
                  value={infusionStopReasonDetail}
                  onChange={(e) => setInfusionStopReasonDetail(e.target.value)}
                  disabled={Boolean(infusionBusy)}
                  placeholder={t("marInfusionStopReason.detailPlaceholder")}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 15,
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
              </>
            ) : (
              <>
                <label
                  htmlFor="mar-infusion-clinical-start-time"
                  style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}
                >
                  {t("marShiftTimeline.drawer.startTimeField")}
                </label>
                <input
                  id="mar-infusion-clinical-start-time"
                  data-testid="mar-infusion-clinical-start-time"
                  type="datetime-local"
                  value={infusionClinicalTimeValue}
                  onChange={(e) => setInfusionClinicalTimeValue(e.target.value)}
                  disabled={Boolean(infusionBusy)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    fontSize: 15,
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.infusionNoteLabel")}
            </label>
            <textarea
              value={infusionModalNote}
              onChange={(e) => setInfusionModalNote(e.target.value)}
              rows={3}
              disabled={Boolean(infusionBusy)}
              placeholder={t("marTab.infusionNotePlaceholder")}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 15,
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("marTab.infusionManualActionHint")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                disabled={Boolean(infusionBusy)}
                onClick={() => {
                  setInfusionModal(null);
                  setPendingInfusionStartVerifier(null);
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: infusionBusy ? "not-allowed" : "pointer",
                }}
              >
                {t("marTab.cancel")}
              </button>
              <button
                type="button"
                disabled={Boolean(infusionBusy)}
                onClick={() => {
                  const saveAt = new Date();
                  const clinicalIso =
                    clinicalDatetimeLocalToUtcDate(infusionClinicalTimeValue, clinicalTz)?.toISOString() ??
                    saveAt.toISOString();
                  const combinedNote = infusionModalNote.trim() || undefined;
                  void runMarInfusion(
                    infusionModal.orderItemId,
                    infusionModal.orderId,
                    infusionModal.op,
                    combinedNote || undefined,
                    infusionModal.op === "start" ? pendingInfusionStartVerifier : null,
                    {
                      ...(infusionModal.op === "start" ? { startedAtIso: clinicalIso } : { stoppedAtIso: clinicalIso }),
                    }
                  );
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: infusionModal.op === "start" ? "#1565c0" : "#2e7d32",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: infusionBusy ? "not-allowed" : "pointer",
                }}
              >
                {infusionBusy
                  ? t("common.loading")
                  : infusionModal.op === "start"
                    ? t("marTab.startInfusion")
                    : t("marTab.stopInfusion")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adminTimeModalRow ? (() => {
        const row = adminTimeModalRow;
        const displayTimes = resolveMedicationAdministrationDisplayTimes(row);
        const oid = row.orderItemId;
        const linkedOrderItem = oid ? orderItemById.get(oid) : undefined;
        const linkedOrder = oid
          ? orders
              .map((o) => asApiObject(o))
              .find((ord) => {
                const items = Array.isArray(ord?.items) ? ord.items : [];
                return items.some((it) => asApiObject(it)?.id === oid);
              })
          : null;
        const orderCreatedAt = linkedOrder?.createdAt
          ? new Date(String(linkedOrder.createdAt))
          : new Date(row.administeredAt);
        const orderItemCreatedAt = linkedOrderItem?.createdAt
          ? new Date(String(linkedOrderItem.createdAt))
          : null;
        const orderCancelledAt =
          String(linkedOrder?.status ?? "").toUpperCase() === "CANCELLED" && linkedOrder?.cancelledAt
            ? new Date(String(linkedOrder.cancelledAt))
            : null;
        const label = resolveHistoryMedicationLabel(row);
        return (
          <MedicationAdministrationEffectiveTimeModal
            open
            encounterId={encounterId}
            facilityId={facilityId}
            medicationAdministrationId={row.id}
            workflowEditable={encounterClinicalMutationsAllowed}
            medicationLabel={label}
            defaultEffectiveIso={displayTimes.effectiveIso}
            originalAdministeredAt={new Date(row.administeredAt)}
            systemDocumentedAt={row.createdAt ? new Date(row.createdAt) : new Date(row.administeredAt)}
            orderCreatedAt={orderCreatedAt}
            orderItemCreatedAt={orderItemCreatedAt}
            orderCancelledAt={orderCancelledAt}
            adjustmentVersion={row.effectiveAdministeredAtVersion ?? 0}
            controlledMedication={Boolean(linkedOrderItem?.catalogMedication?.isControlled)}
            facilityTimeZone={clinicalTz}
            t={t}
            saving={adminTimeSaving}
            onClose={() => {
              if (!adminTimeSaving) setAdminTimeModalRow(null);
            }}
            onSave={async (payload) => {
              setAdminTimeSaving(true);
              try {
                await apiFetch(
                  `/encounters/${encounterId}/medication-administrations/${row.id}/effective-administered-time`,
                  {
                    facilityId,
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  }
                );
                setAdminTimeModalRow(null);
                await reloadMarData();
              } catch (err) {
                throw err;
              } finally {
                setAdminTimeSaving(false);
              }
            }}
          />
        );
      })() : null}
    </div>
  );
}
