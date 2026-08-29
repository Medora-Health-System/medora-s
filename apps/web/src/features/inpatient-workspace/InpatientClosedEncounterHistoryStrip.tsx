"use client";

/**
 * INP.HIST.1A — Hospitalization summary strip for closed inpatient medical records.
 * Read-only; canonical admissionSummaryJson / bedTransfers only.
 */

import Link from "next/link";
import {
  buildInpatientHospitalCourseProjection,
  formatInpatientEncounterDateRange,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  inpatientAllEncountersPath,
  inpatientHistoryEdRecordHref,
} from "./inpatientEncounterHistoryApi";

type Props = {
  encounter: {
    id: string;
    status?: string | null;
    type?: string | null;
    createdAt?: string | null;
    dischargedAt?: string | null;
    roomLabel?: string | null;
    admissionSummaryJson?: unknown;
    dischargeSummaryJson?: unknown;
  };
  showBackToAllEncounters?: boolean;
};

export function InpatientClosedEncounterHistoryStrip({
  encounter,
  showBackToAllEncounters = false,
}: Props) {
  const { t } = useI18n();
  if (String(encounter.type ?? "").toUpperCase() !== "INPATIENT") return null;

  const course = buildInpatientHospitalCourseProjection({
    id: encounter.id,
    type: encounter.type,
    status: encounter.status,
    createdAt: encounter.createdAt,
    dischargedAt: encounter.dischargedAt,
    roomLabel: encounter.roomLabel,
    admissionSummaryJson: encounter.admissionSummaryJson,
    dischargeSummaryJson: encounter.dischargeSummaryJson,
  });

  const dateRange = formatInpatientEncounterDateRange({
    createdAt: encounter.createdAt,
    dischargedAt: encounter.dischargedAt,
    status: encounter.status,
  });

  const unitSegments = course.timeline.filter((s) => s.kind === "UNIT");
  const hasDocumentedTransfers = unitSegments.some((s) => !s.currentStateOnly);

  return (
    <section
      data-testid="inp-hist-1a-closed-history-strip"
      style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px", marginBottom: 12 }}
    >
      {showBackToAllEncounters ? (
        <p style={{ margin: "0 0 8px", fontSize: 12 }}>
          <Link href={inpatientAllEncountersPath()} style={{ color: "#2563eb", fontWeight: 600 }}>
            ← {t("inpatientEncounterHistoryInpHist1a.modeAllEncounters")}
          </Link>
        </p>
      ) : null}

      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientEncounterHistoryInpHist1a.hospitalizationLabel")}
      </div>
      <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>{dateRange}</div>
      {course.dispositionLabel ? (
        <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
          {t("inpatientEncounterHistoryInpHist1a.finalDispositionLabel")}: {course.dispositionLabel}
        </div>
      ) : null}
      <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
        {t("inpatientEncounterHistoryInpHist1a.table.course")}: {course.courseSummary}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        {t("inpatientEncounterHistoryInpHist1a.encounterIdLabel")} · {encounter.id}
      </div>

      {course.originatingEdEncounterId ? (
        <p style={{ margin: "10px 0 0", fontSize: 12 }} data-testid="inp-hist-1a-related-ed">
          {t("inpatientEncounterHistoryInpHist1a.relatedEd")}
          <br />
          <Link
            href={inpatientHistoryEdRecordHref(course.originatingEdEncounterId)}
            style={{ color: "#2563eb", fontWeight: 600 }}
          >
            {t("inpatientEncounterHistoryInpHist1a.relatedEdEmergency")} —{" "}
            {t("inpatientEncounterHistoryInpHist1a.actions.viewEd")}
          </Link>
        </p>
      ) : null}

      <div
        style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}
        data-testid="inp-hist-1a-location-history"
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
          {t("inpatientEncounterHistoryInpHist1a.locationHistoryTitle")}
        </div>
        {hasDocumentedTransfers ? (
          <>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
              {t("inpatientEncounterHistoryInpHist1a.locationHistoryFromTransfers")}
            </p>
            <ol
              style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569" }}
              data-testid="inp-hist-1a-timeline"
            >
              {course.timeline.map((seg, idx) => (
                <li key={`${seg.kind}-${idx}`}>
                  {seg.label}
                  {seg.startedAt || seg.endedAt
                    ? ` · ${[seg.startedAt, seg.endedAt].filter(Boolean).join(" → ")}`
                    : ""}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("inpatientEncounterHistoryInpHist1a.locationHistoryUnavailable")}
          </p>
        )}
      </div>
    </section>
  );
}
