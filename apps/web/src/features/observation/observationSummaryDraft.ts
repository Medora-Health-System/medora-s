import type { ObservationOperationalSnapshot } from "@medora/shared";

/** Caller supplies localized labels (French product copy from `t()`). */
export type ObservationSummaryDraftLabels = {
  /** e.g. "Observation context (draft — review before save)" */
  draftBanner: string;
  /** e.g. "Presenting concern" */
  motifLabel: string;
  /** e.g. "Length of stay (operational)" */
  losLabel: string;
  /** e.g. "Reassessment — provider lane" */
  laneProviderLabel: string;
  laneRnLabel: string;
  laneOverdue: string;
  laneDue: string;
  laneOk: string;
  /** e.g. "Pending results (aggregate)" */
  pendingLabel: string;
  pendingNone: string;
  pendingCount: string;
  criticalLabsFlag: string;
  vitalsStale: string;
  vitalsOk: string;
  extended24h: string;
};

function laneStatus(snapshot: ObservationOperationalSnapshot, lane: "provider" | "rnObservation", labels: ObservationSummaryDraftLabels): string {
  const l = snapshot.reassessmentLanes[lane];
  if (l.overdue) return labels.laneOverdue;
  if (l.due) return labels.laneDue;
  return labels.laneOk;
}

/**
 * Builds a multi-line **draft** for provider discharge / disposition text from operational read-only context.
 * Does not persist. Caller should `appendQuickNoteToField` into an editable textarea.
 */
export function buildObservationSummaryDraft(
  snapshot: ObservationOperationalSnapshot | null | undefined,
  pendingResultsCount: number,
  criticalResultUnacknowledged: boolean,
  motifPlain: string,
  labels: ObservationSummaryDraftLabels,
  options?: { readinessLineLabels?: string[] }
): string {
  const lines: string[] = [labels.draftBanner];
  const motif = motifPlain.trim();
  lines.push(motif ? `${labels.motifLabel}: ${motif}` : `${labels.motifLabel}: —`);

  if (snapshot) {
    lines.push(`${labels.losLabel}: ${snapshot.losLabel}`);
    lines.push(`${labels.laneProviderLabel}: ${laneStatus(snapshot, "provider", labels)}`);
    lines.push(`${labels.laneRnLabel}: ${laneStatus(snapshot, "rnObservation", labels)}`);
    if (snapshot.vitalsStale) {
      lines.push(labels.vitalsStale);
    } else {
      lines.push(labels.vitalsOk);
    }
    if (snapshot.extendedStay24h) {
      lines.push(labels.extended24h);
    }
    const pend = typeof pendingResultsCount === "number" && pendingResultsCount > 0;
    lines.push(
      pend ? labels.pendingCount.replace("{count}", String(pendingResultsCount)) : labels.pendingNone
    );
    if (criticalResultUnacknowledged || snapshot.flags.criticalLabsUnacked) {
      lines.push(labels.criticalLabsFlag);
    }
    const readiness = (options?.readinessLineLabels ?? []).filter((s) => s.trim());
    for (const r of readiness.slice(0, 6)) {
      lines.push(r);
    }
  } else {
    lines.push(`${labels.losLabel}: —`);
    const pend = typeof pendingResultsCount === "number" && pendingResultsCount > 0;
    lines.push(
      pend ? labels.pendingCount.replace("{count}", String(pendingResultsCount)) : labels.pendingNone
    );
    if (criticalResultUnacknowledged) {
      lines.push(labels.criticalLabsFlag);
    }
  }

  return lines.join("\n");
}
