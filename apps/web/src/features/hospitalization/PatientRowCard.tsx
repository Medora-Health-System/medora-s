"use client";

import React from "react";
import type { HospitalizationAcuity, MockHospitalizationPatient } from "./mockData";
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
  type PriorityBadgeSoft,
} from "@/components/medora-card";
import { ui } from "@/lib/uiLabels";

const ACUITY_LABEL_FR: Record<HospitalizationAcuity, string> = {
  critical: "Critique",
  monitoring: "Surveillance",
  stable: "Stable",
};

const ACUITY_BORDER_HEX: Record<HospitalizationAcuity, string> = {
  critical: "#ef4444",
  monitoring: "#fbbf24",
  stable: "#10b981",
};

const ACUITY_SOFT: Record<HospitalizationAcuity, PriorityBadgeSoft> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  monitoring: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  stable: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
};

type Props = {
  row: MockHospitalizationPatient;
};

export function PatientRowCard({ row }: Props) {
  const initials = patientInitialsFromFullName(row.patientName);

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
            subline={<p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{row.ageSex}</p>}
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
              <button
                type="button"
                className="rounded-lg border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100/80"
                onClick={() => {}}
              >
                Voir
              </button>
            </MedoraCardBadgeRow>
          </MedoraCardActions>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
