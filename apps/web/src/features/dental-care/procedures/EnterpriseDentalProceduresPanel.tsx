"use client";

/**
 * MEDUI.D5A.5 — Dental procedures panel.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { D5A5_CERTIFICATION_ID } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { productUiBcp47Tag } from "@/i18n/config";

type ProcedureRow = {
  id: string;
  clinicalName: string;
  toothCodes: string[];
  performedAt: string;
  anesthesiaUsed: boolean;
  anesthesiaDetails?: string | null;
  notes?: string | null;
  treatmentPlanItemId?: string | null;
  providerDisplay?: string | null;
};

type Props = {
  encounterId: string;
  facilityId: string;
  locked?: boolean;
};

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxSizing: "border-box",
};

export function EnterpriseDentalProceduresPanel({ encounterId, facilityId, locked }: Props) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [clinicalName, setClinicalName] = useState("");
  const [toothCodes, setToothCodes] = useState("");
  const [treatmentPlanItemId, setTreatmentPlanItemId] = useState("");
  const [anesthesiaUsed, setAnesthesiaUsed] = useState(false);
  const [anesthesiaDetails, setAnesthesiaDetails] = useState("");
  const [notes, setNotes] = useState("");

  const readOnly = locked || !canEdit;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/procedures`,
        { facilityId }
      )) as { canEdit?: boolean; procedures?: ProcedureRow[] };
      setCanEdit(Boolean(res.canEdit));
      setProcedures(res.procedures ?? []);
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (readOnly || !clinicalName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/procedures`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({
          clinicalName: clinicalName.trim(),
          toothCodes: toothCodes
            .split(/[,;\s]+/)
            .map((c) => c.trim())
            .filter(Boolean),
          treatmentPlanItemId: treatmentPlanItemId.trim() || null,
          anesthesiaUsed,
          anesthesiaDetails: anesthesiaDetails.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      setClinicalName("");
      setToothCodes("");
      setTreatmentPlanItemId("");
      setAnesthesiaUsed(false);
      setAnesthesiaDetails("");
      setNotes("");
      await load();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div data-testid="dental-procedures" data-certification={D5A5_CERTIFICATION_ID}>
      <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a5.procedures.title")}</h3>

        {!readOnly ? (
          <div style={{ display: "grid", gap: 8, marginBottom: 14, padding: 10, background: "#f8fafc", borderRadius: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              {t("dentalCareD5a5.procedures.clinicalName")}
              <input value={clinicalName} onChange={(e) => setClinicalName(e.target.value)} style={{ ...fieldStyle, marginTop: 4 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                {t("dentalCareD5a5.procedures.toothCodes")}
                <input
                  value={toothCodes}
                  onChange={(e) => setToothCodes(e.target.value)}
                  placeholder="PERM_16"
                  style={{ ...fieldStyle, marginTop: 4 }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                {t("dentalCareD5a5.procedures.treatmentPlanItemId")}
                <input value={treatmentPlanItemId} onChange={(e) => setTreatmentPlanItemId(e.target.value)} style={{ ...fieldStyle, marginTop: 4 }} />
              </label>
            </div>
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={anesthesiaUsed} onChange={(e) => setAnesthesiaUsed(e.target.checked)} />
              {t("dentalCareD5a5.procedures.anesthesiaUsed")}
            </label>
            {anesthesiaUsed ? (
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                {t("dentalCareD5a5.procedures.anesthesiaDetails")}
                <input value={anesthesiaDetails} onChange={(e) => setAnesthesiaDetails(e.target.value)} style={{ ...fieldStyle, marginTop: 4 }} />
              </label>
            ) : null}
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              {t("dentalCareD5a5.procedures.notes")}
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fieldStyle, marginTop: 4, fontFamily: "inherit" }} />
            </label>
            <button
              type="button"
              disabled={saving || !clinicalName.trim()}
              onClick={() => void create()}
              style={{
                justifySelf: "start",
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? t("common.loading") : t("dentalCareD5a5.procedures.create")}
            </button>
          </div>
        ) : (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.procedures.readOnly")}</p>
        )}

        <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>{t("dentalCareD5a5.procedures.list")}</h4>
        {procedures.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("dentalCareD5a5.procedures.noProcedures")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
            {procedures.map((p) => (
              <li
                key={p.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <strong>{p.clinicalName}</strong>
                {p.toothCodes.length ? ` · ${p.toothCodes.join(", ")}` : ""}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {new Date(p.performedAt).toLocaleString(productUiBcp47Tag(language))}
                  {p.providerDisplay ? ` · ${p.providerDisplay}` : ""}
                  {p.anesthesiaUsed ? ` · ${t("dentalCareD5a5.procedures.anesthesiaUsed")}` : ""}
                </div>
                {p.notes ? <div style={{ fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>{p.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
