"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  createDiagnosis,
  removeDiagnosis,
  reorderEncounterDiagnoses,
  type Icd10SearchHit,
} from "@/lib/chartApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { Icd10DiagnosisEntryPanel } from "@/components/diagnosis/Icd10DiagnosisEntryPanel";
import {
  RemoveDiagnosisModal,
  type RemoveDiagnosisConfirmPayload,
} from "@/components/diagnosis/RemoveDiagnosisModal";
import { getLocalizedDiagnosisDisplayLabel } from "@/features/emergency/diagnosisFrenchDisplayLabels";
import {
  diagnosisOrdersDiagnosisCardShellStyle,
  diagnosisOrdersListStyle,
  diagnosisOrdersTouchButtonStyle,
  resolveDiagnosisOrdersLayoutMode,
  type DiagnosisOrdersLayoutMode,
} from "@/features/emergency/diagnosisOrdersResponsiveLayout";

type DxRow = {
  id: string;
  code: string;
  description: string | null;
  onsetDate: string | null;
  sortOrder: number;
  codeSource?: string;
  createdAt: string;
  status?: string;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [layoutMode, setLayoutMode] = useState<DiagnosisOrdersLayoutMode>("desktopDense");
  const [removeTarget, setRemoveTarget] = useState<{ row: DxRow; index: number } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveDiagnosisOrdersLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  const tEntry = useCallback((key: string) => t(key), [t]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/patients/${patientId}/diagnoses?status=ACTIVE&limit=200`, { facilityId });
      const items = Array.isArray((data as { items?: unknown }).items) ? (data as { items: Record<string, unknown>[] }).items : [];
      const forEncounter = items
        .filter((d) => d.encounterId === encounterId && (d.status == null || d.status === "ACTIVE"))
        .map((d) => ({
          id: String(d.id),
          code: String(d.code ?? ""),
          description: (d.description as string | null) ?? null,
          onsetDate: (d.onsetDate as string | null) ?? null,
          sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
          codeSource: typeof d.codeSource === "string" ? d.codeSource : undefined,
          createdAt: typeof d.createdAt === "string" ? d.createdAt : "",
          status: typeof d.status === "string" ? d.status : "ACTIVE",
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

  const pickCatalog = async (hit: Icd10SearchHit) => {
    if (isLocked) return;
    setSaving(true);
    setError(null);
    try {
      await createDiagnosis(facilityId, encounterId, {
        icd10CatalogId: hit.id,
        code: hit.code,
        description: hit.shortDescription,
      });
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(
        normalizeUserFacingError(raw, language) || t("encounterConsultDiagnostics.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async (payload: {
    code: string;
    description?: string;
    onsetDate?: string;
    notes?: string;
    manualNonCatalog: true;
  }) => {
    if (isLocked) return;
    setSaving(true);
    setError(null);
    try {
      await createDiagnosis(facilityId, encounterId, {
        code: payload.code,
        description: payload.description,
        onsetDate: payload.onsetDate,
        notes: payload.notes,
        manualNonCatalog: true,
      });
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(
        normalizeUserFacingError(raw, language) || t("encounterConsultDiagnostics.saveError")
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
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(
        normalizeUserFacingError(raw, language) || t("encounterConsultDiagnostics.reorderError")
      );
    } finally {
      setReorderBusy(false);
    }
  };

  const confirmRemove = async (payload: RemoveDiagnosisConfirmPayload) => {
    if (!removeTarget || isLocked) return;
    setRemoveBusy(true);
    setError(null);
    setSuccessNotice(null);
    try {
      await removeDiagnosis(facilityId, removeTarget.row.id, payload);
      setRemoveTarget(null);
      setSuccessNotice(
        removeTarget.index === 0 && rows.length > 1
          ? t("removeDiagnosisModal.primaryPromoted")
          : t("removeDiagnosisModal.success")
      );
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : (e as { message?: string })?.message;
      setError(
        normalizeUserFacingError(raw, language) || t("removeDiagnosisModal.failure")
      );
    } finally {
      setRemoveBusy(false);
    }
  };

  const removeButtonStyle = (layout: DiagnosisOrdersLayoutMode): React.CSSProperties =>
    diagnosisOrdersTouchButtonStyle(
      {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 36,
        minHeight: 36,
        padding: "6px 10px",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: 8,
        border: "1px solid #fecaca",
        background: "#fef2f2",
        color: "#b91c1c",
        cursor: removeBusy || reorderBusy ? "not-allowed" : "pointer",
      },
      layout
    );

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
    <div
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      data-testid="encounter-diagnostics-panel-layout"
      data-layout-mode={layoutMode}
    >
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
              style={diagnosisOrdersTouchButtonStyle(
                {
                  padding: "8px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isLocked ? "not-allowed" : "pointer",
                  opacity: isLocked ? 0.65 : 1,
                },
                layoutMode
              )}
            >
              {t("encounterConsultDiagnostics.addButton")}
            </button>
          </div>
        ) : null}
      </div>

      {canDocumentDiagnoses && !isLocked ? (
        <div style={{ ...dxShell, padding: "14px 18px" }}>
          <Icd10DiagnosisEntryPanel
            facilityId={facilityId}
            disabled={isLocked}
            language={language}
            t={tEntry}
            saving={saving}
            onError={setError}
            onPickCatalog={async (hit) => {
              await pickCatalog(hit);
            }}
            onSubmitManual={submitManual}
          />
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

      {successNotice ? (
        <div
          role="status"
          style={{
            ...dxShell,
            padding: "12px 14px",
            borderColor: "#a7f3d0",
            background: "#ecfdf5",
            color: "#065f46",
            fontSize: 13,
          }}
        >
          {successNotice}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ ...dxShell, padding: "18px 20px", color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
          {t("encounterConsultDiagnostics.empty")}
        </div>
      ) : layoutMode === "desktopDense" ? (
        <div style={{ ...dxShell, overflowX: "auto", minWidth: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 480 }}>
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
                {canDocumentDiagnoses && !isLocked ? (
                  <th
                    aria-label={t("encounterConsultDiagnostics.colActions")}
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#334155",
                      borderBottom: "1px solid #e2e8f0",
                      width: 72,
                    }}
                  />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
                  <td style={{ padding: "10px 14px", verticalAlign: "middle" }}>
                    {canDocumentDiagnoses && !isLocked ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            disabled={reorderBusy || removeBusy || idx === 0}
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
                            disabled={reorderBusy || removeBusy || idx === rows.length - 1}
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
                        {idx === 0 ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#1d4ed8",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {t("diagnosisEntry.primaryBadge")}
                          </span>
                        ) : null}
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
                  <td style={{ padding: "12px 14px", color: "#334155", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                    {getLocalizedDiagnosisDisplayLabel({ code: r.code, description: r.description }, language) || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    {r.onsetDate ? new Date(r.onsetDate).toLocaleDateString(dateLocale) : "—"}
                  </td>
                  {canDocumentDiagnoses && !isLocked ? (
                    <td style={{ padding: "10px 14px", textAlign: "right", verticalAlign: "middle" }}>
                      <button
                        type="button"
                        data-testid={`remove-diagnosis-${r.id}`}
                        disabled={removeBusy || reorderBusy}
                        title={t("removeDiagnosisModal.removeAria")}
                        aria-label={t("removeDiagnosisModal.removeAria")}
                        onClick={() => setRemoveTarget({ row: r, index: idx })}
                        style={removeButtonStyle(layoutMode)}
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul style={diagnosisOrdersListStyle(layoutMode)}>
          {rows.map((r, idx) => (
            <li key={r.id} style={{ minWidth: 0 }}>
              <div style={diagnosisOrdersDiagnosisCardShellStyle()}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.code}</div>
                    {r.codeSource ? (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{codeSourceLabel(r.codeSource)}</div>
                    ) : null}
                    {idx === 0 ? (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#1d4ed8",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t("diagnosisEntry.primaryBadge")}
                      </span>
                    ) : null}
                  </div>
                  {canDocumentDiagnoses && !isLocked ? (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                      <button
                        type="button"
                        disabled={reorderBusy || removeBusy || idx === 0}
                        onClick={() => void moveRow(idx, -1)}
                        aria-label={t("encounterConsultDiagnostics.moveUp")}
                        style={diagnosisOrdersTouchButtonStyle(
                          {
                            padding: "6px 10px",
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            cursor: idx === 0 || reorderBusy ? "not-allowed" : "pointer",
                          },
                          layoutMode
                        )}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={reorderBusy || removeBusy || idx === rows.length - 1}
                        onClick={() => void moveRow(idx, 1)}
                        aria-label={t("encounterConsultDiagnostics.moveDown")}
                        style={diagnosisOrdersTouchButtonStyle(
                          {
                            padding: "6px 10px",
                            fontSize: 12,
                            borderRadius: 8,
                            border: "1px solid #e2e8f0",
                            background: "#fff",
                            cursor: idx === rows.length - 1 || reorderBusy ? "not-allowed" : "pointer",
                          },
                          layoutMode
                        )}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        data-testid={`remove-diagnosis-${r.id}`}
                        disabled={removeBusy || reorderBusy}
                        title={t("removeDiagnosisModal.removeAria")}
                        aria-label={t("removeDiagnosisModal.removeAria")}
                        onClick={() => setRemoveTarget({ row: r, index: idx })}
                        style={removeButtonStyle(layoutMode)}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </div>
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: 14,
                    color: "#334155",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }}
                >
                  {getLocalizedDiagnosisDisplayLabel({ code: r.code, description: r.description }, language) || "—"}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                  <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterConsultDiagnostics.colOnset")}</span>{" "}
                  {r.onsetDate ? new Date(r.onsetDate).toLocaleDateString(dateLocale) : "—"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RemoveDiagnosisModal
        open={Boolean(removeTarget)}
        code={removeTarget?.row.code ?? ""}
        description={removeTarget?.row.description ?? null}
        isPrimary={removeTarget?.index === 0}
        submitting={removeBusy}
        onClose={() => {
          if (removeBusy) return;
          setRemoveTarget(null);
        }}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
