/**
 * INP.HIST.1A — Inpatient encounter history / hospitalization course projectors.
 *
 * Reuses durable admissionSummaryJson pointers + inpatientLifecycleV1.bedTransfers.
 * Does NOT invent ED↔IP links or unit segments without authoritative data.
 * Does NOT create a second encounter or transfer engine.
 */

import {
  readHospitalAdmissionCorrelation,
} from "./hospitalAdmissionCorrelationV1.js";
import {
  readInpatientLifecycleMeta,
  type InpatientLifecycleMetaV1,
} from "./inpatientLifecycleNursingAdmissionD4a25.js";

export type InpatientHistoryTimelineKind =
  | "EMERGENCY"
  | "UNIT"
  | "DISCHARGE"
  | "ADMIT_MARKER";

export type InpatientHistoryTimelineSegment = {
  kind: InpatientHistoryTimelineKind;
  /** Display label (unit code, "Emergency Department", disposition label). */
  label: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Linked encounter id when segment is ED or mirrors an encounter. */
  relatedEncounterId?: string | null;
  /** Bed keys when known from lifecycle transfers. */
  fromBedKey?: string | null;
  toBedKey?: string | null;
  /** True when segment was inferred only from current-state (not transfer history). */
  currentStateOnly?: boolean;
};

export type InpatientHospitalCourseProjection = {
  /** Compact course string for list rows, e.g. "ED → ICU → MED_SURG → Home". */
  courseSummary: string;
  /** Structured timeline; only includes known authoritative segments. */
  timeline: InpatientHistoryTimelineSegment[];
  originatingEdEncounterId: string | null;
  encounterTypeLabel: "Hospitalization" | "Inpatient";
  dispositionLabel: string | null;
  /** True when course used only current unit (no bedTransfers). */
  timelineIncomplete: boolean;
};

export type InpatientHistoryEncounterInput = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  admittedAt?: string | null;
  dischargedAt?: string | null;
  roomLabel?: string | null;
  admissionSummaryJson?: unknown;
  dischargeSummaryJson?: unknown;
};

const DISPOSITION_LABELS: Record<string, string> = {
  HOME: "Home",
  HOME_WITH_HOME_HEALTH: "Home Health",
  SNF: "SNF",
  ACUTE_REHAB: "Acute Rehab",
  LTAC: "LTAC",
  HOSPICE: "Hospice",
  TRANSFER_ACUTE: "Transferred to another acute facility",
  TRANSFER: "Transferred to another acute facility",
  AMA: "AMA",
  ELOPED: "Eloped",
  DECEASED: "Deceased",
  ASSISTED_LIVING: "Assisted Living",
  OTHER: "Other",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

/** Resolve linked ED encounter id from canonical JSON only — never patient+date inference. */
export function readInpatientOriginatingEdEncounterId(
  admissionSummaryJson: unknown
): string | null {
  const root = asRecord(admissionSummaryJson) ?? {};
  const fromRoot =
    trimOrNull(root.originatingEdEncounterId) ?? trimOrNull(root.sourceEdEncounterId);
  if (fromRoot) return fromRoot;
  const corr = readHospitalAdmissionCorrelation(admissionSummaryJson);
  const fromCorr = trimOrNull(corr?.sourceEncounterId);
  if (fromCorr) return fromCorr;
  return null;
}

export function formatInpatientDispositionLabel(code: string | null | undefined): string | null {
  const raw = trimOrNull(code);
  if (!raw) return null;
  const key = raw.toUpperCase();
  return DISPOSITION_LABELS[key] ?? raw.replace(/_/g, " ");
}

function readDispositionCode(input: InpatientHistoryEncounterInput): string | null {
  const life = readInpatientLifecycleMeta(input.admissionSummaryJson);
  const fromLife =
    trimOrNull(life?.discharge?.clinicalDispositionCode) ??
    trimOrNull(life?.discharge?.disposition) ??
    trimOrNull(life?.discharge?.destination);
  if (fromLife) return fromLife;
  const ds = asRecord(input.dischargeSummaryJson);
  if (!ds) return null;
  const finalDisp = asRecord(ds.finalDisposition);
  return (
    trimOrNull(finalDisp?.code) ??
    trimOrNull(ds.clinicalDispositionCode) ??
    trimOrNull(ds.disposition) ??
    trimOrNull(ds.destination)
  );
}

/**
 * Authoritative unit/service only — never roomLabel (room ≠ level-of-care history).
 */
export function readAuthoritativeCurrentUnit(
  admissionSummaryJson: unknown
): string | null {
  const root = asRecord(admissionSummaryJson) ?? {};
  return trimOrNull(root.serviceUnit) ?? trimOrNull(root.requestedUnit);
}

function unitDisplay(unit: string | null | undefined): string {
  const u = trimOrNull(unit);
  if (!u) return "Unit";
  return u.replace(/_/g, "/");
}

/**
 * Collapse consecutive same-unit transfers into one segment (room change ≠ new hospitalization).
 */
export function buildUnitSegmentsFromBedTransfers(
  transfers: NonNullable<InpatientLifecycleMetaV1["bedTransfers"]>,
  options: {
    admitAt: string | null;
    endAt: string | null;
    currentUnit: string | null;
  }
): InpatientHistoryTimelineSegment[] {
  if (!transfers.length) {
    if (!options.currentUnit) return [];
    return [
      {
        kind: "UNIT",
        label: unitDisplay(options.currentUnit),
        startedAt: options.admitAt,
        endedAt: options.endAt,
        currentStateOnly: true,
      },
    ];
  }

  const sorted = [...transfers].sort((a, b) => {
    const ta = Date.parse(a.effectiveAt || a.transferredAt || "") || 0;
    const tb = Date.parse(b.effectiveAt || b.transferredAt || "") || 0;
    return ta - tb;
  });

  const segments: InpatientHistoryTimelineSegment[] = [];
  const first = sorted[0]!;
  const initialUnit = trimOrNull(first.fromUnit);
  if (initialUnit) {
    segments.push({
      kind: "UNIT",
      label: unitDisplay(initialUnit),
      startedAt: options.admitAt,
      endedAt: first.effectiveAt || first.transferredAt || null,
      fromBedKey: first.fromBedKey,
      toBedKey: first.fromBedKey,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    const next = sorted[i + 1];
    const toUnit = trimOrNull(t.toUnit);
    if (!toUnit) continue;
    const start = t.effectiveAt || t.transferredAt || null;
    const end = next
      ? next.effectiveAt || next.transferredAt || null
      : options.endAt;

    const prev = segments[segments.length - 1];
    if (prev && prev.kind === "UNIT" && prev.label === unitDisplay(toUnit)) {
      // Same unit (room change) — extend end; do not split hospitalization.
      prev.endedAt = end;
      prev.toBedKey = t.toBedKey;
      continue;
    }

    segments.push({
      kind: "UNIT",
      label: unitDisplay(toUnit),
      startedAt: start,
      endedAt: end,
      fromBedKey: t.fromBedKey,
      toBedKey: t.toBedKey,
    });
  }

  return segments;
}

export function buildInpatientHospitalCourseProjection(
  input: InpatientHistoryEncounterInput
): InpatientHospitalCourseProjection {
  const originatingEdEncounterId = readInpatientOriginatingEdEncounterId(
    input.admissionSummaryJson
  );
  const life = readInpatientLifecycleMeta(input.admissionSummaryJson);
  const admitAt =
    trimOrNull(input.admittedAt) ?? trimOrNull(input.createdAt);
  const endAt =
    trimOrNull(input.dischargedAt) ??
    trimOrNull(life?.discharge?.dischargedAt) ??
    null;
  const dispositionCode = readDispositionCode(input);
  const dispositionLabel = formatInpatientDispositionLabel(dispositionCode);
  const transfers = life?.bedTransfers ?? [];
  const currentUnit = readAuthoritativeCurrentUnit(input.admissionSummaryJson);
  const unitSegments = buildUnitSegmentsFromBedTransfers(transfers, {
    admitAt,
    endAt,
    currentUnit,
  });
  // Without durable bedTransfers, unit history is incomplete even if current serviceUnit is known.
  const timelineIncomplete = transfers.length === 0;

  const timeline: InpatientHistoryTimelineSegment[] = [];
  if (originatingEdEncounterId) {
    timeline.push({
      kind: "EMERGENCY",
      label: "Emergency Department",
      startedAt: null,
      endedAt: admitAt,
      relatedEncounterId: originatingEdEncounterId,
    });
    timeline.push({
      kind: "ADMIT_MARKER",
      label: "Admitted",
      startedAt: admitAt,
      endedAt: admitAt,
      relatedEncounterId: input.id,
    });
  }
  timeline.push(...unitSegments);
  if (dispositionLabel && (String(input.status ?? "").toUpperCase() === "CLOSED" || endAt)) {
    timeline.push({
      kind: "DISCHARGE",
      label: dispositionLabel,
      startedAt: endAt,
      endedAt: endAt,
    });
  }

  const courseParts: string[] = [];
  if (originatingEdEncounterId) courseParts.push("ED");
  for (const seg of unitSegments) {
    if (seg.kind === "UNIT") courseParts.push(seg.label);
  }
  if (dispositionLabel && String(input.status ?? "").toUpperCase() === "CLOSED") {
    courseParts.push(dispositionLabel);
  } else if (String(input.status ?? "").toUpperCase() === "OPEN" && courseParts.length > 0) {
    // Still hospitalized — do not imply discharge.
  }

  return {
    courseSummary: courseParts.length ? courseParts.join(" → ") : currentUnit ? unitDisplay(currentUnit) : "—",
    timeline,
    originatingEdEncounterId,
    encounterTypeLabel: originatingEdEncounterId ? "Hospitalization" : "Inpatient",
    dispositionLabel,
    timelineIncomplete,
  };
}

/** Date range label for list rows (no fabricated times). */
export function formatInpatientEncounterDateRange(input: {
  createdAt?: string | null;
  admittedAt?: string | null;
  dischargedAt?: string | null;
  status?: string | null;
  locale?: string;
}): string {
  const startRaw = trimOrNull(input.admittedAt) ?? trimOrNull(input.createdAt);
  const endRaw = trimOrNull(input.dischargedAt);
  const locale = input.locale ?? "en-US";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const start = startRaw ? fmt(startRaw) : null;
  const end = endRaw ? fmt(endRaw) : null;
  if (start && end && start !== end) return `${start}–${end}`;
  if (start && end) return start;
  if (start) return start;
  return "—";
}
