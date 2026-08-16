"use client";

/**
 * MEDUI.D5A.5 — Dental treatment plan panel.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  D5A5_CERTIFICATION_ID,
  D5A5_TREATMENT_ACCEPTANCE,
  D5A5_TREATMENT_PLAN_ITEM_STATUSES,
  D5A5_TREATMENT_PLAN_PHASES,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type PlanItem = {
  id?: string;
  proposedTreatment: string;
  toothCodes: string;
  phase: string;
  status: string;
  priority: number;
  notes: string;
};

type Props = {
  encounterId: string;
  facilityId: string;
  locked?: boolean;
};

function newItem(): PlanItem {
  return {
    proposedTreatment: "",
    toothCodes: "",
    phase: "DISEASE_CONTROL",
    status: "PROPOSED",
    priority: 3,
    notes: "",
  };
}

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxSizing: "border-box",
};

export function EnterpriseDentalTreatmentPlanPanel({ encounterId, facilityId, locked }: Props) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [expectedBenefits, setExpectedBenefits] = useState("");
  const [materialRisks, setMaterialRisks] = useState("");
  const [reasonableAlternatives, setReasonableAlternatives] = useState("");
  const [noTreatmentDiscussed, setNoTreatmentDiscussed] = useState(false);
  const [patientQuestions, setPatientQuestions] = useState("");
  const [acceptanceOutcome, setAcceptanceOutcome] = useState("NOT_DISCUSSED");
  const [items, setItems] = useState<PlanItem[]>([]);

  const readOnly = locked || !canEdit;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/treatment-plan`,
        { facilityId }
      )) as {
        canEdit?: boolean;
        plan?: {
          expectedBenefits?: string | null;
          materialRisks?: string | null;
          reasonableAlternatives?: string | null;
          noTreatmentDiscussed?: boolean;
          patientQuestions?: string | null;
          acceptanceOutcome?: string;
          items?: Array<{
            id: string;
            proposedTreatment: string;
            toothCodes?: string[];
            phase?: string;
            status?: string;
            priority?: number;
            notes?: string | null;
          }>;
        } | null;
      };
      setCanEdit(Boolean(res.canEdit));
      const plan = res.plan;
      if (plan) {
        setExpectedBenefits(plan.expectedBenefits ?? "");
        setMaterialRisks(plan.materialRisks ?? "");
        setReasonableAlternatives(plan.reasonableAlternatives ?? "");
        setNoTreatmentDiscussed(Boolean(plan.noTreatmentDiscussed));
        setPatientQuestions(plan.patientQuestions ?? "");
        setAcceptanceOutcome(plan.acceptanceOutcome ?? "NOT_DISCUSSED");
        setItems(
          (plan.items ?? []).map((i) => ({
            id: i.id,
            proposedTreatment: i.proposedTreatment,
            toothCodes: (i.toothCodes ?? []).join(", "),
            phase: i.phase ?? "DISEASE_CONTROL",
            status: i.status ?? "PROPOSED",
            priority: i.priority ?? 3,
            notes: i.notes ?? "",
          }))
        );
      } else {
        setItems([]);
      }
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateItem = (idx: number, patch: Partial<PlanItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/treatment-plan`, {
        method: "PUT",
        facilityId,
        body: JSON.stringify({
          expectedBenefits: expectedBenefits.trim() || null,
          materialRisks: materialRisks.trim() || null,
          reasonableAlternatives: reasonableAlternatives.trim() || null,
          noTreatmentDiscussed,
          patientQuestions: patientQuestions.trim() || null,
          acceptanceOutcome,
          items: items.map((item, sequence) => ({
            id: item.id,
            proposedTreatment: item.proposedTreatment.trim(),
            toothCodes: item.toothCodes
              .split(/[,;\s]+/)
              .map((c) => c.trim())
              .filter(Boolean),
            phase: item.phase,
            status: item.status,
            priority: item.priority,
            notes: item.notes.trim() || null,
            sequence,
          })),
        }),
      });
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
    <div data-testid="dental-treatment-plan" data-certification={D5A5_CERTIFICATION_ID}>
      <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a5.treatmentPlan.title")}</h3>

        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.treatmentPlan.benefits")}
            <textarea disabled={readOnly} value={expectedBenefits} onChange={(e) => setExpectedBenefits(e.target.value)} rows={2} style={{ ...fieldStyle, marginTop: 4, fontFamily: "inherit" }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.treatmentPlan.risks")}
            <textarea disabled={readOnly} value={materialRisks} onChange={(e) => setMaterialRisks(e.target.value)} rows={2} style={{ ...fieldStyle, marginTop: 4, fontFamily: "inherit" }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.treatmentPlan.alternatives")}
            <textarea disabled={readOnly} value={reasonableAlternatives} onChange={(e) => setReasonableAlternatives(e.target.value)} rows={2} style={{ ...fieldStyle, marginTop: 4, fontFamily: "inherit" }} />
          </label>
          <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              disabled={readOnly}
              checked={noTreatmentDiscussed}
              onChange={(e) => setNoTreatmentDiscussed(e.target.checked)}
            />
            {t("dentalCareD5a5.treatmentPlan.noTreatmentDiscussed")}
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.treatmentPlan.patientQuestions")}
            <textarea disabled={readOnly} value={patientQuestions} onChange={(e) => setPatientQuestions(e.target.value)} rows={2} style={{ ...fieldStyle, marginTop: 4, fontFamily: "inherit" }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.treatmentPlan.acceptanceOutcome")}
            <select disabled={readOnly} value={acceptanceOutcome} onChange={(e) => setAcceptanceOutcome(e.target.value)} style={{ ...fieldStyle, marginTop: 4 }}>
              {D5A5_TREATMENT_ACCEPTANCE.map((a) => (
                <option key={a} value={a}>
                  {t(`dentalCareD5a5.treatmentPlan.acceptance.${a}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{t("dentalCareD5a5.treatmentPlan.items")}</h4>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, newItem()])}
              style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
            >
              {t("dentalCareD5a5.treatmentPlan.addItem")}
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("dentalCareD5a5.treatmentPlan.noItems")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, idx) => (
              <div key={item.id ?? `new-${idx}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 70px", gap: 6, marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.proposedTreatment")}
                    <input
                      disabled={readOnly}
                      value={item.proposedTreatment}
                      onChange={(e) => updateItem(idx, { proposedTreatment: e.target.value })}
                      style={{ ...fieldStyle, marginTop: 2 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.phase")}
                    <select disabled={readOnly} value={item.phase} onChange={(e) => updateItem(idx, { phase: e.target.value })} style={{ ...fieldStyle, marginTop: 2 }}>
                      {D5A5_TREATMENT_PLAN_PHASES.map((p) => (
                        <option key={p} value={p}>
                          {t(`dentalCareD5a5.treatmentPlan.phases.${p}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.status")}
                    <select disabled={readOnly} value={item.status} onChange={(e) => updateItem(idx, { status: e.target.value })} style={{ ...fieldStyle, marginTop: 2 }}>
                      {D5A5_TREATMENT_PLAN_ITEM_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`dentalCareD5a5.treatmentPlan.statuses.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.priority")}
                    <input
                      type="number"
                      min={1}
                      max={5}
                      disabled={readOnly}
                      value={item.priority}
                      onChange={(e) => updateItem(idx, { priority: Number(e.target.value) || 3 })}
                      style={{ ...fieldStyle, marginTop: 2 }}
                    />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "end" }}>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.toothCodes")}
                    <input
                      disabled={readOnly}
                      value={item.toothCodes}
                      onChange={(e) => updateItem(idx, { toothCodes: e.target.value })}
                      placeholder="PERM_16, PERM_26"
                      style={{ ...fieldStyle, marginTop: 2 }}
                    />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>
                    {t("dentalCareD5a5.treatmentPlan.notes")}
                    <input disabled={readOnly} value={item.notes} onChange={(e) => updateItem(idx, { notes: e.target.value })} style={{ ...fieldStyle, marginTop: 2 }} />
                  </label>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ padding: "6px 8px", fontSize: 11, border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer" }}
                    >
                      {t("dentalCareD5a5.treatmentPlan.removeItem")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}

        {!readOnly ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              marginTop: 12,
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
            {saving ? t("common.loading") : t("dentalCareD5a5.treatmentPlan.save")}
          </button>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.treatmentPlan.readOnly")}</p>
        )}
      </div>
    </div>
  );
}
