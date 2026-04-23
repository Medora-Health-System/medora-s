"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  createDiagnosis,
  reorderEncounterDiagnoses,
  searchIcd10Catalog,
  type Icd10SearchHit,
} from "@/lib/chartApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type DxRow = {
  id: string;
  code: string;
  description: string | null;
  onsetDate: string | null;
  sortOrder: number;
  codeSource?: string;
  createdAt: string;
};

export function EncounterDiagnosticsPanel({
  encounterId,
  patientId,
  facilityId,
  canDocumentDiagnoses,
  isLocked,
  onGoPatientChart,
}: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  /** RN, provider, or admin — aligned with POST /encounters/:id/diagnoses roles. */
  canDocumentDiagnoses: boolean;
  isLocked: boolean;
  onGoPatientChart: () => void;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DxRow[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<Icd10SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/patients/${patientId}/diagnoses?limit=200`, { facilityId });
      const items = Array.isArray((data as { items?: unknown }).items) ? (data as { items: Record<string, unknown>[] }).items : [];
      const forEncounter = items
        .filter((d) => d.encounterId === encounterId)
        .map((d) => ({
          id: String(d.id),
          code: String(d.code ?? ""),
          description: (d.description as string | null) ?? null,
          onsetDate: (d.onsetDate as string | null) ?? null,
          sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
          codeSource: typeof d.codeSource === "string" ? d.codeSource : undefined,
          createdAt: typeof d.createdAt === "string" ? d.createdAt : "",
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
      setRows(forEncounter);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId, patientId, facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    let cancelled = false;
    const tmr = setTimeout(() => {
      setSearching(true);
      void searchIcd10Catalog(facilityId, q, 25)
        .then((res) => {
          if (!cancelled) setSearchHits(Array.isArray(res.items) ? res.items : []);
        })
        .catch(() => {
          if (!cancelled) setSearchHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [searchQ, facilityId]);

  const primaryHint = useMemo(() => t("encounterConsultDiagnostics.primaryHint"), [t]);

  const pickCatalog = async (hit: Icd10SearchHit) => {
    if (isLocked) return;
    setSaving(true);
    setError(null);
    try {
      await createDiagnosis(facilityId, encounterId, { icd10CatalogId: hit.id });
      setSearchQ("");
      setSearchHits([]);
      await load();
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError((e as { message?: string })?.message, language) ||
          t("encounterConsultDiagnostics.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async () => {
    if (isLocked) return;
    const code = manualCode.trim();
    if (!code) {
      setError(t("encounterConsultDiagnostics.manualCodeRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDiagnosis(facilityId, encounterId, {
        code,
        description: manualDesc.trim() || undefined,
        manualNonCatalog: true,
      });
      setManualOpen(false);
      setManualCode("");
      setManualDesc("");
      await load();
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError((e as { message?: string })?.message, language) ||
          t("encounterConsultDiagnostics.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  const moveRow = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= rows.length || isLocked) return;
    const next = [...rows];
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    const orderedIds = next.map((r) => r.id);
    setReorderBusy(true);
    setError(null);
    try {
      await reorderEncounterDiagnoses(facilityId, encounterId, orderedIds);
      await load();
    } catch (e: unknown) {
      setError(
        normalizeUserFacingError((e as { message?: string })?.message, language) ||
          t("encounterConsultDiagnostics.reorderError")
      );
    } finally {
      setReorderBusy(false);
    }
  };

  const codeSourceLabel = (src?: string) => {
    if (src === "ICD10_CATALOG") return t("encounterConsultDiagnostics.sourceCatalog");
    if (src === "MANUAL_DECLARED") return t("encounterConsultDiagnostics.sourceManual");
    if (src === "LEGACY") return t("encounterConsultDiagnostics.sourceLegacy");
    return "";
  };

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
        {canDocumentDiagnoses ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              }}
            >
              {t("encounterConsultDiagnostics.addButton")}
            </button>
          </div>
        ) : null}
      </div>

      {canDocumentDiagnoses && !isLocked ? (
        <div style={{ ...dxShell, padding: "14px 18px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b" }}>{primaryHint}</p>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
            {t("encounterConsultDiagnostics.icdSearchLabel")}
          </label>
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t("encounterConsultDiagnostics.icdSearchPlaceholder")}
            autoComplete="off"
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
            }}
          />
          {searching ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{t("encounterConsultDiagnostics.icdSearching")}</div>
          ) : null}
          {!searching && searchQ.trim().length >= 2 && searchHits.length === 0 ? (
            <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{t("encounterConsultDiagnostics.icdNoResults")}</div>
          ) : null}
          {searchHits.length > 0 ? (
            <ul
              style={{
                margin: "10px 0 0 0",
                padding: 0,
                listStyle: "none",
                maxHeight: 220,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              {searchHits.map((h) => (
                <li key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    disabled={saving || isLocked}
                    onClick={() => void pickCatalog(h)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      cursor: saving || isLocked ? "not-allowed" : "pointer",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{h.code}</div>
                    <div style={{ color: "#475569", marginTop: 2 }}>{h.shortDescription}</div>
                    {!h.isBillable ? (
                      <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>{t("encounterConsultDiagnostics.nonBillableCode")}</div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: manualOpen ? "#e2e8f0" : "#fff",
                cursor: "pointer",
              }}
            >
              {t("encounterConsultDiagnostics.manualToggle")}
            </button>
          </div>
          {manualOpen ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
                {t("encounterConsultDiagnostics.manualWarning")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t("encounterConsultDiagnostics.manualCodePh")}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <input
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder={t("encounterConsultDiagnostics.manualDescPh")}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => void submitManual()}
                  disabled={saving}
                  style={{
                    alignSelf: "flex-start",
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                  }}
                >
                  {t("encounterConsultDiagnostics.manualSubmit")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            ...dxShell,
            padding: "12px 14px",
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

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
                  {t("encounterConsultDiagnostics.colOrder")}
                </th>
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
              {rows.map((r, idx) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                  <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                    {canDocumentDiagnoses && !isLocked ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          disabled={reorderBusy || idx === 0}
                          onClick={() => void moveRow(idx, -1)}
                          aria-label={t("encounterConsultDiagnostics.moveUp")}
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            cursor: idx === 0 || reorderBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={reorderBusy || idx === rows.length - 1}
                          onClick={() => void moveRow(idx, 1)}
                          aria-label={t("encounterConsultDiagnostics.moveDown")}
                          style={{
                            padding: "4px 8px",
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            cursor: idx === rows.length - 1 || reorderBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#0f172a", verticalAlign: "top" }}>
                    <div>{r.code}</div>
                    {r.codeSource ? (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{codeSourceLabel(r.codeSource)}</div>
                    ) : null}
                  </td>
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
