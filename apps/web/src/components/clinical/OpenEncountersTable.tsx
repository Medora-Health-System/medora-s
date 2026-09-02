"use client";

import React from "react";
import Link from "next/link";
import { encounterBcp47, tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { canonicalEncounterWorkspaceHref } from "@/features/encounters/canonicalEncounterWorkspaceHref";

const th: React.CSSProperties = { padding: 12, textAlign: "left" as const };
const td: React.CSSProperties = { padding: 12 };

type Row = {
  id: string;
  type?: string;
  status?: string;
  billingClassification?: string | null;
  createdAt?: string;
  roomLabel?: string | null;
  physicianAssigned?: { firstName?: string; lastName?: string } | null;
  patient?: { id?: string; firstName?: string; lastName?: string; mrn?: string | null };
  /** Pending medication lines at bedside (aligned with Orders tab). */
  pendingMedicationCount?: number;
};

export function OpenEncountersTable({
  encounters,
  loading,
  emptyMessage,
  showMarLink,
  workspaceRole = "OTHER",
}: {
  encounters: Row[];
  loading: boolean;
  emptyMessage: string;
  showMarLink?: boolean;
  workspaceRole?: "PROVIDER" | "RN" | "ADMIN" | "OTHER";
}) {
  const { t, language } = useI18n();
  const dateLoc = encounterBcp47(language);

  if (loading) {
    return <p>{t("common.loading")}</p>;
  }
  if (encounters.length === 0) {
    return (
      <div style={{ marginTop: 16, padding: 16, backgroundColor: "white", borderRadius: 8, border: "1px solid #eee" }}>
        <p style={{ margin: 0 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, overflowX: "auto", backgroundColor: "white", borderRadius: 8, border: "1px solid #eee" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={th}>{t("common.patient")}</th>
            <th style={th}>{t("common.nir")}</th>
            <th style={th}>{t("common.type")}</th>
            <th style={th}>{t("common.status")}</th>
            <th style={th}>{t("common.room")}</th>
            <th style={th}>{t("encounters.assignedProvider")}</th>
            <th style={th}>{t("common.arrival")}</th>
            <th style={th}>{t("encounters.pendingMedications")}</th>
            <th style={th}>{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {encounters.map((encounter) => {
            const pid = encounter.patient?.id;
            return (
              <tr key={encounter.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>
                  {encounter.patient?.firstName} {encounter.patient?.lastName}
                </td>
                <td style={td}>{encounter.patient?.mrn ?? t("common.dash")}</td>
                <td style={td}>
                  {encounter.type ? tEncounterType(t, encounter.type) : t("common.dash")}
                </td>
                <td style={td}>{encounter.status ? tEncounterStatus(t, encounter.status) : t("common.dash")}</td>
                <td style={td}>{encounter.roomLabel?.trim() || t("common.dash")}</td>
                <td style={td}>
                  {encounter.physicianAssigned
                    ? `${encounter.physicianAssigned.firstName ?? ""} ${encounter.physicianAssigned.lastName ?? ""}`.trim() ||
                      t("common.dash")
                    : t("common.dash")}
                </td>
                <td style={td}>
                  {encounter.createdAt ? new Date(encounter.createdAt).toLocaleString(dateLoc) : t("common.dash")}
                </td>
                <td style={td}>
                  {typeof encounter.pendingMedicationCount === "number" ? (
                    encounter.pendingMedicationCount > 0 ? (
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#c62828" }}>
                        {encounter.pendingMedicationCount}
                      </span>
                    ) : (
                      <span style={{ fontSize: 14, color: "#666" }}>0</span>
                    )
                  ) : (
                    t("common.dash")
                  )}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {pid ? (
                      <Link
                        href={`/app/patients/${pid}`}
                        style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}
                      >
                        {t("openEncountersTable.openPatientChart")}
                      </Link>
                    ) : null}
                    <Link
                      href={canonicalEncounterWorkspaceHref({
                        encounterId: encounter.id,
                        encounterType: encounter.type,
                        encounterStatus: encounter.status,
                        billingClassification: encounter.billingClassification,
                        role: workspaceRole,
                        source: "LANDING",
                      })}
                      style={{ fontSize: 14, color: "#1565c0", fontWeight: 500 }}
                    >
                      {t("openEncountersTable.openEncounter")}
                    </Link>
                    {showMarLink ? (
                      <Link
                        href={canonicalEncounterWorkspaceHref({
                          encounterId: encounter.id,
                          encounterType: encounter.type,
                          encounterStatus: encounter.status,
                          billingClassification: encounter.billingClassification,
                          role: workspaceRole,
                          source: "LANDING",
                          tab: "mar",
                        })}
                        style={{ fontSize: 14, color: "#2e7d32", fontWeight: 500 }}
                      >
                        {t("openEncountersTable.medAdmin")}
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
