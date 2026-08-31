"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatAgeYearsSexForLocale, DISPLAY_DASH } from "@/lib/patientDisplay";
import { MedoraCard, MedoraCardBadge } from "@/components/medora-card";
import type { HospitalCarePlacementQueueRow } from "./hospitalCarePlacementApi";

function patientName(row: HospitalCarePlacementQueueRow, dash: string): string {
  const first = row.patient.firstName?.trim() ?? "";
  const last = row.patient.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || dash;
}

export function HospitalCarePatientCard({
  row,
  href,
  durationLabel,
  onActivate,
}: {
  row: HospitalCarePlacementQueueRow;
  href?: string;
  durationLabel?: string | null;
  onActivate?: () => void;
}) {
  const { t, language } = useI18n();
  const dash = t("common.dash") || DISPLAY_DASH;
  const ageSex = formatAgeYearsSexForLocale(
    row.patient.dob,
    row.patient.sexAtBirth,
    null,
    language
  );
  const statusLabel = row.trackboardLabel
    ? t(`internalPlacementD3c.status.${row.trackboardLabel}` as Parameters<typeof t>[0])
    : row.status;

  const body = (
    <div
      data-testid={`hospital-care-patient-card-${row.id}`}
      role={onActivate || href ? "button" : undefined}
      tabIndex={onActivate || href ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (!onActivate) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      style={{ marginBottom: 8, cursor: href || onActivate ? "pointer" : "default" }}
    >
      <MedoraCard leftAccentColor="#0d9488">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "flex-start",
            padding: 12,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {patientName(row, dash)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {t("hospitalCareD3ca.card.mrn")}: {row.patient.mrn?.trim() || dash}
              {" · "}
              {ageSex || dash}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
              {t("hospitalCareD3ca.card.unit")}: {row.assignedUnitCode || dash}
              {" · "}
              {t("hospitalCareD3ca.card.room")}: {row.assignedRoomKey || dash}
              {" · "}
              {t("hospitalCareD3ca.card.bed")}: {row.assignedBedKey || dash}
            </div>
            {durationLabel ? (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{durationLabel}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <MedoraCardBadge soft={{ bg: "#e0f2fe", text: "#075985", border: "#7dd3fc" }}>
              {statusLabel}
            </MedoraCardBadge>
            <MedoraCardBadge soft={{ bg: "#f8fafc", text: "#334155", border: "#e2e8f0" }}>
              {row.requestedEncounterType === "OBSERVATION"
                ? t("hospitalCareD3ca.destination.observation")
                : t("hospitalCareD3ca.destination.inpatientAdmission")}
            </MedoraCardBadge>
          </div>
        </div>
      </MedoraCard>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {body}
      </Link>
    );
  }
  return body;
}
