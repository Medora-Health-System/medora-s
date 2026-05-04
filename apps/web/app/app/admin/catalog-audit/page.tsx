"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MEDICATION_ADMINISTRATION_TYPES,
  MEDICATION_CATALOG_BILLING_CLASSES,
  catalogAuditLabelHasAntibioticHint,
  catalogAuditLabelHasFluidHint,
  isRouteClearlyIvPushOrBolus,
} from "@medora/shared";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchCatalogAuditDashboard,
  patchCatalogClassification,
  type AdminCatalogAuditPayload,
  type AdminCatalogAuditRow,
  type PatchCatalogClassificationBody,
} from "@/lib/catalogAuditApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const CONFLICT_FLAG_PREFIX = new Set([
  "ROUTE_PUSH_BUT_INFUSION",
  "INFUSION_BUT_NOT_IV_ROUTE",
  "HYDRATION_MISMATCH",
  "THERAPEUTIC_MISMATCH",
  "UNKNOWN_HIGH_USAGE",
]);

function flagBadgeStyle(flag: string): CSSProperties {
  if (CONFLICT_FLAG_PREFIX.has(flag)) {
    return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  }
  return { background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" };
}

function cardShell(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fafafa",
    fontSize: 14,
  };
}

function warnBox(): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontSize: 13,
    marginTop: 10,
  };
}

export default function AdminCatalogAuditPage() {
  const { t, language } = useI18n();
  const { ready, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const [data, setData] = useState<AdminCatalogAuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editingRow, setEditingRow] = useState<AdminCatalogAuditRow | null>(null);
  const [formAdmin, setFormAdmin] = useState("");
  const [formBilling, setFormBilling] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [ackPushInfusion, setAckPushInfusion] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setError(t("catalogAudit.errorFacility"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCatalogAuditDashboard(facilityId));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setData(null);
      setError(normalizeUserFacingError(raw, language) || t("catalogAudit.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, language, t]);

  useEffect(() => {
    if (!ready || !isPlatformOperator || !facilityId) return;
    void load();
  }, [ready, isPlatformOperator, facilityId, load]);

  useEffect(() => {
    if (!successMessage) return;
    const id = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [successMessage]);

  const percents = useMemo(() => {
    if (!data?.summary.totalMedications) {
      return { classified: 0, unknown: 0 };
    }
    const total = data.summary.totalMedications;
    const classified = Math.round(((total - data.summary.unknownBillingClass) / total) * 1000) / 10;
    const unknown = Math.round((data.summary.unknownBillingClass / total) * 1000) / 10;
    return { classified, unknown };
  }, [data]);

  const openCorrection = useCallback((row: AdminCatalogAuditRow) => {
    setEditingRow(row);
    setFormAdmin(row.administrationType ?? "");
    setFormBilling(row.billingClass ?? "");
    setReviewNote("");
    setAckPushInfusion(false);
    setFormError(null);
  }, []);

  const closeCorrection = useCallback(() => {
    setEditingRow(null);
    setFormError(null);
    setSaveLoading(false);
  }, []);

  const labelLowerForWarnings = editingRow ? editingRow.label.toLowerCase() : "";

  const needsPushInfusionAck = Boolean(
    editingRow && formAdmin === "INFUSION" && isRouteClearlyIvPushOrBolus(editingRow.route ?? "")
  );

  const saveCorrection = useCallback(async () => {
    if (!facilityId || !editingRow) return;
    if (needsPushInfusionAck && !ackPushInfusion) {
      setFormError(t("catalogAudit.correction.mustAckPush"));
      return;
    }

    const nextAdmin = formAdmin === "" ? null : formAdmin;
    const nextBilling = formBilling === "" ? null : formBilling;
    const prevAdmin = editingRow.administrationType ?? null;
    const prevBilling = editingRow.billingClass ?? null;

    const body: PatchCatalogClassificationBody = {};
    if (nextAdmin !== prevAdmin) body.administrationType = nextAdmin as PatchCatalogClassificationBody["administrationType"];
    if (nextBilling !== prevBilling) body.billingClass = nextBilling as PatchCatalogClassificationBody["billingClass"];
    if (reviewNote.trim()) body.reviewNote = reviewNote.trim();

    if (body.administrationType === undefined && body.billingClass === undefined && body.reviewNote === undefined) {
      setFormError(t("catalogAudit.correction.noChanges"));
      return;
    }

    setSaveLoading(true);
    setFormError(null);
    try {
      await patchCatalogClassification(facilityId, editingRow.catalogMedicationId, body);
      setSuccessMessage(t("catalogAudit.saveSuccess"));
      closeCorrection();
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setFormError(normalizeUserFacingError(raw, language) || t("catalogAudit.saveError"));
    } finally {
      setSaveLoading(false);
    }
  }, [
    facilityId,
    editingRow,
    formAdmin,
    formBilling,
    reviewNote,
    needsPushInfusionAck,
    ackPushInfusion,
    load,
    closeCorrection,
    language,
    t,
  ]);

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isPlatformOperator) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("platformOps.restrictedBody")}</p>
        <Link href="/app">{t("catalogAudit.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("catalogAudit.backAdmin")}
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0, flex: "1 1 200px" }}>{t("catalogAudit.title")}</h1>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #1a1a1a",
            background: "#fff",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? t("common.loading") : t("catalogAudit.refresh")}
        </button>
      </div>

      <p style={{ color: "#555", maxWidth: 720, marginTop: 12 }}>{t("catalogAudit.intro")}</p>
      <p style={{ fontSize: 13, color: "#64748b", maxWidth: 720, marginTop: 8 }}>{t("catalogAudit.noPhiNote")}</p>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}
      {successMessage ? (
        <p style={{ color: "#166534", marginTop: 8, fontWeight: 600 }}>{successMessage}</p>
      ) : null}

      {data ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.classifiedPercent")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{percents.classified}%</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.unknownPercent")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{percents.unknown}%</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.conflicts")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.highRiskConflicts}</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.infusionCandidates")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.infusionCandidates}</div>
          </div>
          <div style={cardShell()}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{t("catalogAudit.summary.totalMedications")}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{data.summary.totalMedications}</div>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <p style={{ marginTop: 16, color: "#64748b" }}>{t("common.loading")}</p>
      ) : null}

      {data ? (
        <div style={{ marginTop: 20, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colMedication")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colRoute")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colAdminType")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colBillingClass")}</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>{t("catalogAudit.colUsage")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colFlags")}</th>
                <th style={{ padding: "8px 10px" }}>{t("catalogAudit.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.catalogMedicationId} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.label}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.route ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.administrationType ?? "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#334155" }}>{row.billingClass ?? "—"}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {row.usageCount ?? 0}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {row.flags.length ? (
                        row.flags.map((f) => (
                          <span
                            key={f}
                            title={f}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 9999,
                              whiteSpace: "nowrap",
                              ...flagBadgeStyle(f),
                            }}
                          >
                            {t(`catalogAudit.flags.${f}` as const)}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <button
                      type="button"
                      onClick={() => openCorrection(row)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #334155",
                        background: "#fff",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {t("catalogAudit.correction.open")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editingRow ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 12px",
            overflowY: "auto",
          }}
          role="presentation"
          onClick={closeCorrection}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              padding: 20,
              marginTop: 40,
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("catalogAudit.correction.title")}</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{t("catalogAudit.correction.intro")}</p>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{editingRow.label}</p>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
              <span style={{ fontWeight: 600 }}>{t("catalogAudit.correction.currentFlags")}:</span>{" "}
              {editingRow.flags.length ? editingRow.flags.join(", ") : "—"}
            </p>

            {editingRow.flags.includes("ROUTE_PUSH_BUT_INFUSION") ? (
              <div style={warnBox()}>{t("catalogAudit.correction.warnPushInfusion")}</div>
            ) : null}

            {needsPushInfusionAck ? (
              <div style={warnBox()}>
                <div>{t("catalogAudit.correction.warnInfusionOnPushRoute")}</div>
                <label style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ackPushInfusion}
                    onChange={(e) => setAckPushInfusion(e.target.checked)}
                  />
                  <span>{t("catalogAudit.correction.confirmInfusionOnPushAck")}</span>
                </label>
              </div>
            ) : null}

            {formBilling === "HYDRATION" && catalogAuditLabelHasAntibioticHint(labelLowerForWarnings) ? (
              <div style={warnBox()}>{t("catalogAudit.correction.warnHydrationAntibiotic")}</div>
            ) : null}

            {formBilling === "THERAPEUTIC" && catalogAuditLabelHasFluidHint(labelLowerForWarnings) ? (
              <div style={warnBox()}>{t("catalogAudit.correction.warnTherapeuticFluid")}</div>
            ) : null}

            <label style={{ display: "block", marginTop: 14, fontWeight: 600, fontSize: 13 }}>
              {t("catalogAudit.correction.adminLabel")}
              <select
                value={formAdmin}
                onChange={(e) => setFormAdmin(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                <option value="">{t("catalogAudit.correction.unsetOption")}</option>
                {MEDICATION_ADMINISTRATION_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {t(`catalogAudit.correction.admin_${v}` as const)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "block", marginTop: 14, fontWeight: 600, fontSize: 13 }}>
              {t("catalogAudit.correction.billingLabel")}
              <select
                value={formBilling}
                onChange={(e) => setFormBilling(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                <option value="">{t("catalogAudit.correction.unsetOption")}</option>
                {MEDICATION_CATALOG_BILLING_CLASSES.map((v) => (
                  <option key={v} value={v}>
                    {t(`catalogAudit.correction.billing_${v}` as const)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "block", marginTop: 14, fontWeight: 600, fontSize: 13 }}>
              {t("catalogAudit.correction.reviewNote")}
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                maxLength={500}
                rows={3}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 8,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>{t("catalogAudit.correction.reviewNoteHint")}</span>
            </label>

            {formError ? <p style={{ color: "#b91c1c", marginTop: 12, fontSize: 13 }}>{formError}</p> : null}

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void saveCorrection()}
                disabled={saveLoading || (needsPushInfusionAck && !ackPushInfusion)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: saveLoading || (needsPushInfusionAck && !ackPushInfusion) ? "#94a3b8" : "#0f172a",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saveLoading || (needsPushInfusionAck && !ackPushInfusion) ? "not-allowed" : "pointer",
                }}
              >
                {saveLoading ? t("catalogAudit.correction.saving") : t("catalogAudit.correction.save")}
              </button>
              <button
                type="button"
                onClick={closeCorrection}
                disabled={saveLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#fff",
                  fontWeight: 600,
                  cursor: saveLoading ? "wait" : "pointer",
                }}
              >
                {t("catalogAudit.correction.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
