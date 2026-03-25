"use client";

import React from "react";
import Link from "next/link";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr, ui } from "@/lib/uiLabels";

const th: React.CSSProperties = { padding: 12, textAlign: "left" as const };
const td: React.CSSProperties = { padding: 12 };

type Row = {
  id: string;
  type?: string;
  status?: string;
  createdAt?: string;
  roomLabel?: string | null;
  physicianAssigned?: { firstName?: string; lastName?: string } | null;
  patient?: { id?: string; firstName?: string; lastName?: string; mrn?: string | null };
};

export function OpenEncountersTable({
  encounters,
  loading,
  emptyMessage,
  showMarLink,
}: {
  encounters: Row[];
  loading: boolean;
  emptyMessage: string;
  showMarLink?: boolean;
}) {
  if (loading) {
    return <p>{ui.common.loading}</p>;
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
            <th style={th}>{ui.common.patient}</th>
            <th style={th}>{ui.common.nir}</th>
            <th style={th}>{ui.common.type}</th>
            <th style={th}>{ui.common.status}</th>
            <th style={th}>{ui.common.room}</th>
            <th style={th}>Médecin attribué</th>
            <th style={th}>{ui.common.arrival}</th>
            <th style={th}>{ui.common.actions}</th>
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
                <td style={td}>{encounter.patient?.mrn ?? "—"}</td>
                <td style={td}>{encounter.type ? getEncounterTypeLabelFr(encounter.type) : ui.common.dash}</td>
                <td style={td}>{encounter.status ? getEncounterStatusLabelFr(encounter.status) : ui.common.dash}</td>
                <td style={td}>{encounter.roomLabel?.trim() || "—"}</td>
                <td style={td}>
                  {encounter.physicianAssigned
                    ? `${encounter.physicianAssigned.firstName ?? ""} ${encounter.physicianAssigned.lastName ?? ""}`.trim() || "—"
                    : "—"}
                </td>
                <td style={td}>
                  {encounter.createdAt ? new Date(encounter.createdAt).toLocaleString("fr-FR") : "—"}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {pid ? (
                      <Link
                        href={`/app/patients/${pid}`}
                        style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}
                      >
                        Ouvrir le dossier
                      </Link>
                    ) : null}
                    <Link
                      href={`/app/encounters/${encounter.id}`}
                      style={{ fontSize: 14, color: "#1565c0", fontWeight: 500 }}
                    >
                      Ouvrir la consultation
                    </Link>
                    {showMarLink ? (
                      <Link
                        href={`/app/encounters/${encounter.id}?tab=mar`}
                        style={{ fontSize: 14, color: "#2e7d32", fontWeight: 500 }}
                      >
                        Administration médicamenteuse
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
