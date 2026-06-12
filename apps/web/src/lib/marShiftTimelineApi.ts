import { apiFetch } from "@/lib/apiClient";

export type MarShiftTimelineHover = {
  title: string;
  due: string;
  dose: string | null;
  route: string | null;
  witness: string | null;
  status: string;
};

export type MarShiftTimelineDrawerAction =
  | "ADMINISTER"
  | "START_INFUSION"
  | "STOP_INFUSION"
  | "REFUSE"
  | "HOLD"
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
  hover: MarShiftTimelineHover;
  actions: MarShiftTimelineDrawerAction[];
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
  assignedNurseUserId: string | null;
  cells: MarShiftTimelineRowCell[];
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
