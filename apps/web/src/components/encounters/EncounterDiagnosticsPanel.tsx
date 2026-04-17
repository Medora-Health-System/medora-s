"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";

export function EncounterDiagnosticsPanel({
  encounterId,
  patientId,
  facilityId,
  canPrescribe,
  isLocked,
  onGoPatientChart,
}: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  canPrescribe: boolean;
  isLocked: boolean;
  onGoPatientChart: () => void;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ id: string; code: string; description: string | null; onsetDate: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId });
        const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
        const forEncounter = items
          .filter((d: any) => d.encounterId === encounterId)
          .map((d: any) => ({
            id: d.id,
            code: d.code,
            description: d.description ?? null,
            onsetDate: d.onsetDate ?? null,
          }));
        if (!cancelled) setRows(forEncounter);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [encounterId, patientId, facilityId]);

  if (loading) {
    return (
      <div
        style={{
          padding: "16px 18px",
          backgroundColor: MEDORA_CARD_SHELL.background,
          border: MEDORA_CARD_SHELL.border,
          borderRadius: MEDORA_CARD_SHELL.radius,
          boxShadow: MEDORA_CARD_SHELL.boxShadow,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {t("encounterConsultDiagnostics.loading")}
      </div>
    );
  }

  const dxShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          ...dxShell,
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
          {t("encounterConsultDiagnostics.heading")}
        </h3>
        {canPrescribe ? (
          <button
            type="button"
            onClick={onGoPatientChart}
            disabled={isLocked}
            style={{
              padding: "8px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: 14,
              fontWeight: 600,
              cursor: isLocked ? "not-allowed" : "pointer",
              opacity: isLocked ? 0.65 : 1,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            {t("encounterConsultDiagnostics.addButton")}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <div style={{ ...dxShell, padding: "18px 20px", color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
          {t("encounterConsultDiagnostics.empty")}
        </div>
      ) : (
        <div style={{ ...dxShell, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterConsultDiagnostics.colCode")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterConsultDiagnostics.colLabel")}
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#334155", borderBottom: "1px solid #e2e8f0" }}>
                  {t("encounterConsultDiagnostics.colOnset")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                  <td style={{ padding: "12px 14px", color: "#0f172a" }}>{r.code}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>{r.description || "—"}</td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    {r.onsetDate ? new Date(r.onsetDate).toLocaleDateString(dateLocale) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
