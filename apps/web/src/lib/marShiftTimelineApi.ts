import { apiFetch } from "@/lib/apiClient";

export type MarShiftTimelineHover = {
  title: string;
  due: string;
  dose: string | null;
  route: string | null;
  rate?: string | null;
  witness: string | null;
  status: string;
};

export type MarShiftTimelineDrawerAction =
  | "ADMINISTER"
  | "START_INFUSION"
  | "STOP_INFUSION"
  | "START_FLUID"
  | "PAUSE_FLUID"
  | "RESUME_FLUID"
  | "STOP_FLUID"
  | "START_BOLUS"
  | "COMPLETE_BOLUS"
  | "CHANGE_SCHEDULED_TIME"
  | "REFUSE"
  | "HOLD"
  | "MARK_MISSED"
  | "VIEW_ORDER";

export type MarShiftTimelineCellItem = {
  type: "MEDICATION";
  medicationDoseInstanceId: string;
  orderItemId: string;
  medicationLabel: string | null;
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  doseStatus: string;
  doseKind: string;
  route: string | null;
  frequencyCode: string | null;
  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  requiresWitness: boolean;
  readOnly: boolean;
  clinicalAction: string | null;
  startedAt: string | null;
  startedByDisplay: string | null;
  startedByInitials: string | null;
  stoppedAt: string | null;
  stoppedByDisplay: string | null;
  stoppedByInitials: string | null;
  administeredAt: string | null;
  administeredByDisplay: string | null;
  administeredByInitials: string | null;
  completionSummary: string | null;
  orderPrnIndication?: string | null;
  prnReasonLabel?: string | null;
  prnPainScore?: number | null;
  prnPainLocation?: string | null;
  isPrnBand?: boolean;
  prnFrequencyLabel?: string | null;
  prnLastGivenAt?: string | null;
  prnNextEligibleAt?: string | null;
  prnProjectionKey?: string | null;
  continuousFluidStatus?: string | null;
  fluidRateLabel?: string | null;
  fluidVolumeInfusedMl?: number | null;
  fluidStartedAt?: string | null;
  fluidStoppedAt?: string | null;
  fluidCompletedAt?: string | null;
  fluidBolusStatus?: string | null;
  fluidBolusVolumeMl?: number | null;
  fluidRunningDurationLabel?: string | null;
  fluidActiveDurationLabel?: string | null;
  fluidTotalDurationLabel?: string | null;
  fluidPausedAt?: string | null;
  isFluidBolus?: boolean;
  cancellationReason?: string | null;
  cancellationDetails?: string | null;
  cancelledAt?: string | null;
  cancelledByDisplay?: string | null;
  hover: MarShiftTimelineHover;
  actions: MarShiftTimelineDrawerAction[];
  scheduleAdjustment?: {
    isRescheduled: boolean;
    originalScheduledAt: string | null;
    currentScheduledAt: string;
    lastChangedAt: string | null;
    lastChangedByDisplay: string | null;
    lastReasonCode: string | null;
    lastReasonDetail: string | null;
    riskSeverity: string | null;
    reviewRecommended: boolean;
    adjustmentCount: number;
    badgeLabel: "RESCHEDULED" | null;
  } | null;
  scheduleAdjustmentChain?: Array<{
    kind: "ORIGINAL_SCHEDULED" | "RESCHEDULED" | "ADMINISTERED";
    atIso: string;
    label: string;
    reasonCode?: string | null;
    reasonDetail?: string | null;
    changedByDisplay?: string | null;
    riskSeverity?: string | null;
    reviewRecommended?: boolean;
  }>;
  medicationResponseBadge?: {
    label: "RESPONSE";
    displayLabel: string;
    count: number;
    severity: "routine" | "neutral" | "safety";
  } | null;
  medicationResponseFollowUp?: {
    status: "RECOMMENDED" | "OVERDUE";
    earliestAt: string | null;
    latestAt: string | null;
    responseCount: number;
  } | null;
  medicationResponseAdverseEscalation?: boolean;
  medicationAdministrationId?: string | null;
  medicationResponses?: Array<{
    responseCode: string;
    responseDetail: string | null;
    responseTime: string | null;
    documentedAt: string;
    painBefore: number | null;
    painAfter: number | null;
  }>;
  administrationVariance?: {
    hasVariance: boolean;
    classification: string | null;
    badgeLabel: "ON_TIME" | "EARLY" | "LATE" | null;
    scheduledAt: string | null;
    administeredAt: string | null;
    effectiveScheduledAt: string | null;
    actualAdministrationAt: string | null;
    varianceMinutes: number | null;
    severity: string | null;
    reviewRecommended: boolean;
    reasonCode: string | null;
    reasonDetail: string | null;
    performedByDisplay: string | null;
    performedAt: string | null;
  } | null;
};

export type MarShiftTimelineRowCell = {
  columnKey: string;
  items: MarShiftTimelineCellItem[];
};

export type MarShiftTimelineRow = {
  patientId: string;
  encounterId: string;
  patientDisplay: string;
  roomLabel: string | null;
  governedRoomDisplay?: string | null;
  assignedNurseUserId: string | null;
  cells: MarShiftTimelineRowCell[];
  rowKind?: "SCHEDULED" | "PRN";
  prnBandSubtitle?: string | null;
};

export type MarShiftTimelineColumn = {
  key: string;
  label: string;
  startAt: string;
  endAt: string;
};

export type MarShiftTimelineResponse = {
  enabled: boolean;
  facility: {
    id: string;
    name: string;
    timeZone: string;
  };
  title: string;
  viewer: {
    userId: string;
    displayName: string;
    role: string;
  };
  shift: {
    code: string;
    label: string;
    startAt: string;
    endAt: string;
    timeZone: string;
    columns: MarShiftTimelineColumn[];
  };
  rows: MarShiftTimelineRow[];
  locale?: "en" | "fr";
};

export type FetchMarShiftTimelineInput = {
  facilityId: string;
  encounterId?: string;
  assignedToUserId?: string;
  shiftCode?: string;
  shiftStart?: string;
  shiftEnd?: string;
  includeCompleted?: boolean;
  includeUpcoming?: boolean;
  locale?: string;
};

function buildMarShiftTimelineSearchParams(query: Omit<FetchMarShiftTimelineInput, "facilityId">): string {
  const params = new URLSearchParams();
  if (query.shiftCode?.trim()) params.set("shiftCode", query.shiftCode.trim());
  if (query.shiftStart?.trim()) params.set("shiftStart", query.shiftStart.trim());
  if (query.shiftEnd?.trim()) params.set("shiftEnd", query.shiftEnd.trim());
  if (query.encounterId?.trim()) params.set("encounterId", query.encounterId.trim());
  if (query.assignedToUserId?.trim()) params.set("assignedToUserId", query.assignedToUserId.trim());
  if (query.includeCompleted === true) params.set("includeCompleted", "true");
  if (query.includeCompleted === false) params.set("includeCompleted", "false");
  if (query.includeUpcoming === true) params.set("includeUpcoming", "true");
  if (query.includeUpcoming === false) params.set("includeUpcoming", "false");
  if (query.locale?.trim()) params.set("locale", query.locale.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** GET /facilities/:facilityId/mar-shift-timeline (M1.8B.7K.1). */
export async function fetchMarShiftTimeline(
  input: FetchMarShiftTimelineInput
): Promise<MarShiftTimelineResponse> {
  const { facilityId, ...query } = input;
  const path = `/facilities/${encodeURIComponent(facilityId)}/mar-shift-timeline${buildMarShiftTimelineSearchParams(query)}`;
  const res = await apiFetch(path, { facilityId });
  if (!res || typeof res !== "object" || Array.isArray(res)) {
    throw new Error("Invalid MAR shift timeline response");
  }
  return res as MarShiftTimelineResponse;
}
