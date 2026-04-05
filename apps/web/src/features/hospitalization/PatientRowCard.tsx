"use client";

import React from "react";
import Link from "next/link";
import type { HospitalizationBoardAcuity, HospitalizationBoardRow } from "./hospitalizationBoardRow";
import { patientInitialsFromFullName } from "./patientInitials";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardRoomBlock,
  MedoraCardTitle,
  NEUTRAL_BADGE,
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { getEncounterStatusBoardLabelFr, ui } from "@/lib/uiLabels";

const ACUITY_LABEL_FR: Record<HospitalizationBoardAcuity, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

const ACUITY_BORDER_HEX: Record<HospitalizationBoardAcuity, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const ACUITY_SOFT: Record<HospitalizationBoardAcuity, PriorityBadgeSoft> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  monitoring: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  stable: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
};

/** Aligné sur le tableau de bord (`trackboard`) — pastilles statut consultation. */
const ENCOUNTER_STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

type Props = {
  row: HospitalizationBoardRow;
};

export function PatientRowCard({ row }: Props) {
  const initials = patientInitialsFromFullName(row.patientName);
  const statusKey = (row.status || "").trim();
  const statusSoft = ENCOUNTER_STATUS_BADGE_SOFT[statusKey] ?? NEUTRAL_BADGE;

  return (
    <MedoraCard
      leftAccentColor={ACUITY_BORDER_HEX[row.acuity]}
      variant="default"
      className="transition-shadow hover:shadow-md"
    >
      <MedoraCardInner>
        <MedoraCardIdentity initials={initials}>
          <MedoraCardTitle
            title={row.patientName}
            subline={
              <>
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{row.ageSex}</p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                  Consultation hospitalière
                </p>
              </>
            }
          />
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
            {row.chiefComplaint}
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            {row.esi != null ? (
              <>
                <span style={{ fontWeight: 600, color: "#475569" }}>ESI</span> {row.esi}
                {" · "}
              </>
            ) : null}
            <span style={{ fontWeight: 600, color: "#475569" }}>Arrivée</span> {row.arrivalTime}
          </p>
        </MedoraCardIdentity>

        <MedoraCardRoomBlock label={ui.common.room} value={row.room} />

        <div
          className="hosp-meta-block"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            width: "100%",
            minWidth: 200,
            flexShrink: 0,
          }}
        >
          <MedoraCardActions railBorderTopColor="#f1f5f9" gap={8} minWidth={200} alignItems="flex-start">
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{row.physician}</p>
            <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
              <span style={{ color: "#94a3b8" }}>Inf. </span>
              {row.nurseDisplay}
            </p>
            <MedoraCardBadgeRow marginTop={0}>
              <MedoraCardBadge soft={ACUITY_SOFT[row.acuity]}>{ACUITY_LABEL_FR[row.acuity]}</MedoraCardBadge>
              <MedoraCardBadge soft={statusSoft}>
                {statusKey ? getEncounterStatusBoardLabelFr(statusKey) : ui.common.dash}
              </MedoraCardBadge>
              <Link
                href={`/app/encounters/${row.id}`}
                className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100/80"
              >
                {ui.common.view}
              </Link>
              <Link
                href={`/app/encounters/${row.id}?tab=summary`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Résumé
              </Link>
            </MedoraCardBadgeRow>
          </MedoraCardActions>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
