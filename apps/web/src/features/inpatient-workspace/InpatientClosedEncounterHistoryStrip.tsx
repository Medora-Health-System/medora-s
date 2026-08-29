"use client";

/**
 * INP.HIST.1A — Related ED + hospitalization course strip for closed inpatient records.
 * Read-only; uses canonical admissionSummaryJson only.
 */

import Link from "next/link";
import {
  buildInpatientHospitalCourseProjection,
  formatInpatientEncounterDateRange,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { inpatientHistoryEdRecordHref } from "./inpatientEncounterHistoryApi";
import { inpatientAllEncountersPath } from "./inpatientEncounterHistoryApi";

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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
        {course.encounterTypeLabel} · {dateRange} · {String(encounter.status ?? "").toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
        {course.courseSummary}
      </div>
      {course.originatingEdEncounterId ? (
        <p style={{ margin: "8px 0 0", fontSize: 12 }}>
          {t("inpatientEncounterHistoryInpHist1a.relatedEd")}:{" "}
          <Link
            href={inpatientHistoryEdRecordHref(course.originatingEdEncounterId)}
            style={{ color: "#2563eb", fontWeight: 600 }}
          >
            {t("inpatientEncounterHistoryInpHist1a.actions.viewEd")}
          </Link>
        </p>
      ) : null}
      {course.timeline.length > 0 ? (
        <ol
          style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569" }}
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
      ) : null}
      {course.timelineIncomplete ? (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#92400e" }}>
          {t("inpatientEncounterHistoryInpHist1a.timelineIncomplete")}
        </p>
      ) : null}
    </section>
  );
}
