/**
 * Web i18n layer for shared clinical timeline display normalization (Phase 15F-D.1).
 */

import type { SupportedLanguage } from "@/i18n/config";
import {
  OBSERVATION_REASSESSMENT_EVENT_SOURCE,
  clinicalTimelineDisplayLabelKey,
  resolveClinicalTimelineDisplayEventType,
  type ClinicalTimelineStoredRow,
} from "@medora/shared";

export type ClinicalTimelineUiRow = ClinicalTimelineStoredRow & {
  createdBy?: { firstName?: string | null; lastName?: string | null };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), template);
}

/**
 * Summarize one append-only clinical event row for timeline UI / export helpers.
 */
export function summarizeClinicalTimelineRow(
  row: ClinicalTimelineUiRow,
  t: (key: string) => string
): { displayEventType: string; label: string; summary: string } {
  const displayEventType = resolveClinicalTimelineDisplayEventType(row);
  const payload = asRecord(row.payloadJson) ?? {};

  if (row.eventType === "VITALS_RECORDED") {
    return {
      displayEventType,
      label: t(clinicalTimelineDisplayLabelKey("VITALS_RECORDED")),
      summary: "",
    };
  }

  if (row.eventType === "NURSING_ASSESSMENT_SAVED" && payload.source === OBSERVATION_REASSESSMENT_EVENT_SOURCE) {
    const obs = asRecord(payload.observationReassessmentV1) ?? {};
    const roleRaw = typeof obs.role === "string" ? obs.role : "";
    const roleLabel =
      roleRaw === "PROVIDER"
        ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessmentRoleMd")
        : roleRaw === "RN"
          ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessmentRoleRn")
          : roleRaw;
    const ps = typeof obs.patientStatus === "string" ? obs.patientStatus : "";
    const statusLabel =
      ps === "improved"
        ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusImproved")
        : ps === "worsening"
          ? t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusWorsening")
          : t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationStatusUnchanged");
    const note = typeof obs.note === "string" && obs.note.trim() ? obs.note.trim() : "";
    const summary = note
      ? `${statusLabel} — ${note.slice(0, 160)}${note.length > 160 ? "…" : ""}`
      : statusLabel;
    return {
      displayEventType,
      label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.observationReassessment").replace(
        "{role}",
        roleLabel
      ),
      summary,
    };
  }

  if (row.eventType === "HANDOFF_PROVIDER") {
    const name =
      typeof payload.toDisplayName === "string" && payload.toDisplayName.trim()
        ? payload.toDisplayName.trim()
        : t("emergencyVisitSummaryPanel.clinicalTimeline.handoffUnknown");
    return {
      displayEventType,
      label: t(clinicalTimelineDisplayLabelKey("HANDOFF_PROVIDER")).includes("{name}")
        ? fillTemplate(t(clinicalTimelineDisplayLabelKey("HANDOFF_PROVIDER")), { name })
        : t("emergencyVisitSummaryPanel.clinicalTimeline.event.handoffProvider").replace("{name}", name),
      summary: "",
    };
  }

  if (row.eventType === "HANDOFF_NURSING") {
    const snap = asRecord(payload.snapshot);
    const rn =
      snap && typeof snap.receivingNurseName === "string" && snap.receivingNurseName.trim()
        ? snap.receivingNurseName.trim()
        : t("emergencyVisitSummaryPanel.clinicalTimeline.handoffUnknown");
    return {
      displayEventType,
      label: t("emergencyVisitSummaryPanel.clinicalTimeline.event.handoffNursing").replace("{name}", rn),
      summary: "",
    };
  }

  if (row.eventType === "IV_INSERTED" || row.eventType === "IV_REMOVED") {
    const gauge = typeof payload.gauge === "string" ? payload.gauge.trim() : "";
    const site = typeof payload.site === "string" ? payload.site.trim() : "";
    const detail = [gauge, site].filter(Boolean).join(" ").trim() || "—";
    const key = row.eventType === "IV_INSERTED" ? "IV_INSERTED" : "IV_REMOVED";
    return {
      displayEventType,
      label: fillTemplate(t(clinicalTimelineDisplayLabelKey(key)), { detail }),
      summary: "",
    };
  }

  const labelKey = clinicalTimelineDisplayLabelKey(displayEventType);
  const label = t(labelKey);
  return {
    displayEventType,
    label: label !== labelKey ? label : displayEventType,
    summary: "",
  };
}

export function formatClinicalTimeCorrectionLines(
  pair: { documentedAtIso: string | null; effectiveAtIso: string | null; hasCorrection: boolean },
  formatDt: (iso: string | null) => string,
  t: (key: string) => string
): string[] {
  const lines: string[] = [];
  if (pair.documentedAtIso) {
    lines.push(
      fillTemplate(t("clinicalTimelineDisplay.documentedAt"), {
        datetime: formatDt(pair.documentedAtIso),
      })
    );
  }
  if (pair.hasCorrection && pair.effectiveAtIso) {
    lines.push(
      fillTemplate(t("clinicalTimelineDisplay.correctedClinicalTime"), {
        datetime: formatDt(pair.effectiveAtIso),
      })
    );
  }
  return lines;
}
