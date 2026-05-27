"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { MedoraCard, MedoraCardInner, MedoraCardTitle, MedoraCardIdentity } from "@/components/medora-card";
import {
  edDispositionTouchButtonStyle,
  resolveEdDispositionLayoutMode,
  type EdDispositionLayoutMode,
} from "@/features/emergency/edDispositionResponsiveLayout";
import {
  emptyNursingDischargeExecutionForm,
  hydrateNursingDischargeExecutionForm,
  mergeNursingDischargeExecutionIntoNursingAssessment,
  NURSING_DISCHARGE_CONDITIONS,
  NURSING_DISCHARGE_DESTINATIONS,
  NURSING_DISCHARGE_TEACHING_ITEMS,
  nursingDischargeFormToStored,
  readNursingDischargeExecutionStored,
} from "./nursingDischargeExecutionModel";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
};

export function NursingDischargeExecutionSection({
  encounterId,
  facilityId,
  nursingAssessment,
  onSaved,
  canEdit,
  readOnlyProviderDecisionLine,
}: {
  encounterId: string;
  facilityId: string;
  nursingAssessment: unknown;
  onSaved: () => void | Promise<void>;
  canEdit: boolean;
  /** Optional read-only primary decision line for nursing context. */
  readOnlyProviderDecisionLine?: string | null;
}) {
  const { t, language } = useI18n();
  const stored = readNursingDischargeExecutionStored(nursingAssessment);
  const [form, setForm] = useState(() => hydrateNursingDischargeExecutionForm(nursingAssessment));
  const [saving, setSaving] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<EdDispositionLayoutMode>("desktopSplit");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveEdDispositionLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    setForm(hydrateNursingDischargeExecutionForm(nursingAssessment));
  }, [nursingAssessment]);

  const toggleTeaching = (item: (typeof NURSING_DISCHARGE_TEACHING_ITEMS)[number]) => {
    setForm((prev) => {
      const has = prev.teachingReviewed.includes(item);
      return {
        ...prev,
        teachingReviewed:
          has ? prev.teachingReviewed.filter((x) => x !== item) : [...prev.teachingReviewed, item],
      };
    });
  };

  const handleSave = useCallback(async () => {
    if (!canEdit || stored) return;
    setSaving(true);
    setSaveInfo(null);
    try {
      let name = t("providerDischargeDocumentation19Y.nursingSignerFallback");
      let title: string | undefined;
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) name = fn;
          const roleTitle = (me as { roleTitle?: string }).roleTitle?.trim();
          if (roleTitle) title = roleTitle;
        }
      } catch {
        /* ignore */
      }
      const payload = mergeNursingDischargeExecutionIntoNursingAssessment(
        nursingAssessment,
        nursingDischargeFormToStored(form, name, title)
      );
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: payload }),
      });
      await onSaved();
      setSaveInfo(t("providerDischargeDocumentation19Y.nursingSaveOk"));
    } catch (e) {
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("providerDischargeDocumentation19Y.nursingSaveFailed")
      );
    } finally {
      setSaving(false);
    }
  }, [canEdit, encounterId, facilityId, form, language, nursingAssessment, onSaved, stored, t]);

  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="I">
          <MedoraCardTitle title={t("providerDischargeDocumentation19Y.nursingSectionTitle")} />
        </MedoraCardIdentity>

        {readOnlyProviderDecisionLine ?
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{readOnlyProviderDecisionLine}</p>
        : null}

        {stored ?
          <div style={{ marginTop: 10, fontSize: 13, color: "#0f172a", lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>
              {t("providerDischargeDocumentation19Y.nursingCompletedLine")
                .replace("{name}", stored.dischargeSortieCompletedByDisplayName)
                .replace("{when}", new Date(stored.dischargeSortieCompletedAt).toLocaleString(language === "en" ? "en-US" : "fr-FR"))}
            </p>
            {stored.nursingDestination ?
              <p style={{ margin: "6px 0 0" }}>
                {t("providerDischargeDocumentation19Y.nursingDestinationLabel")}:{" "}
                {t(`providerDischargeDocumentation19Y.nursingDestination.${stored.nursingDestination}`)}
              </p>
            : null}
            {stored.dischargeSortieExecutionNote ?
              <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{stored.dischargeSortieExecutionNote}</p>
            : null}
          </div>
        : <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0 }}>
            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingDestinationLabel")}</label>
              <select
                value={form.destination}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value as typeof f.destination }))}
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              >
                <option value="">—</option>
                {NURSING_DISCHARGE_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`providerDischargeDocumentation19Y.nursingDestination.${d}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingDischargeAt")}</label>
              <input
                type="datetime-local"
                value={form.dischargeAtLocal}
                disabled={!canEdit}
                onChange={(e) => setForm((f) => ({ ...f, dischargeAtLocal: e.target.value }))}
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              />
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingTeachingSectionLabel")}</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {NURSING_DISCHARGE_TEACHING_ITEMS.map((item) => (
                  <label key={item} style={{ display: "flex", gap: 8, fontSize: 13, cursor: canEdit ? "pointer" : "not-allowed" }}>
                    <input
                      type="checkbox"
                      checked={form.teachingReviewed.includes(item)}
                      disabled={!canEdit}
                      onChange={() => toggleTeaching(item)}
                    />
                    <span>{t(`providerDischargeDocumentation19Y.nursingTeaching.${item}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingConditionLabel")}</label>
              <select
                value={form.conditionAtDischarge}
                disabled={!canEdit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, conditionAtDischarge: e.target.value as typeof f.conditionAtDischarge }))
                }
                style={{ ...inputBase, backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              >
                <option value="">—</option>
                {NURSING_DISCHARGE_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`providerDischargeDocumentation19Y.nursingCondition.${c}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t("providerDischargeDocumentation19Y.nursingNote")}</label>
              <textarea
                value={form.nursingDischargeNote}
                disabled={!canEdit}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, nursingDischargeNote: e.target.value }))}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: !canEdit ? "#f8fafc" : "#fff" }}
              />
            </div>

            {canEdit ?
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                style={edDispositionTouchButtonStyle(
                  {
                    alignSelf: layoutMode === "mobileStacked" ? "stretch" : "flex-start",
                    width: layoutMode === "mobileStacked" ? "100%" : undefined,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0ea5e9",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: saving ? "wait" : "pointer",
                  },
                  layoutMode
                )}
              >
                {saving ? t("common.saving") : t("providerDischargeDocumentation19Y.nursingSaveButton")}
              </button>
            : null}
          </div>
        }

        {saveInfo ?
          <p style={{ margin: "8px 0 0", fontSize: 12, color: saveInfo.includes("impossible") || saveInfo.includes("Unable") ? "#b91c1c" : "#15803d" }}>
            {saveInfo}
          </p>
        : null}
      </MedoraCardInner>
    </MedoraCard>
  );
}
