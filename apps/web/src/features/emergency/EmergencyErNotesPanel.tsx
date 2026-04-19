"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import {
  MedoraCard,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  type ErNoteCategory,
  buildErNotesPartsForUi,
  mergeErNotesV1IntoNursingAssessment,
  readErNotesCategoryMetaFromNursingAssessment,
} from "@/features/emergency/erNotesV1";

const CATEGORIES: ErNoteCategory[] = ["provider", "nursing", "technician", "other"];

export function EmergencyErNotesPanel({
  encounterId,
  facilityId,
  nursingAssessment,
  encounterNotes,
  status,
  isLocked,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  nursingAssessment: unknown;
  encounterNotes: string | null | undefined;
  status: string | null | undefined;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [active, setActive] = useState<ErNoteCategory>("provider");
  const [parts, setParts] = useState<Record<ErNoteCategory, string>>(() =>
    buildErNotesPartsForUi(nursingAssessment, encounterNotes)
  );
  const [saving, setSaving] = useState(false);
  const readOnly = (status ?? "").trim() !== "OPEN" || isLocked;

  useEffect(() => {
    setParts(buildErNotesPartsForUi(nursingAssessment, encounterNotes));
  }, [nursingAssessment, encounterNotes]);

  const categoryMeta = useMemo(
    () => readErNotesCategoryMetaFromNursingAssessment(nursingAssessment),
    [nursingAssessment]
  );
  const activeAttribution = categoryMeta[active];

  const categoryLabel = useCallback(
    (c: ErNoteCategory) => t(`emergencyWorkspace.erNotesCategory.${c}`),
    [t]
  );

  const patchActive = useCallback(
    (text: string) => {
      setParts((prev) => ({ ...prev, [active]: text }));
    },
    [active]
  );

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    try {
      let savedByDisplayName = t("emergencyDisposition.signerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const saveMeta = { savedAt: new Date().toISOString(), savedByDisplayName };
      const mergedNav = mergeErNotesV1IntoNursingAssessment(nursingAssessment, parts, saveMeta);
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: mergedNav }),
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await Promise.resolve(onSaved());
      alert(queued ? t("encounterChrome.notesTab.saveQueued") : t("encounterChrome.notesTab.saveOk"));
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("encounterChrome.notesTab.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <MedoraCard leftAccentColor="#475569" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="N">
          <MedoraCardTitle
            title={t("emergencyWorkspace.notesTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("emergencyWorkspace.erNotesSubline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <div style={{ marginTop: 12, width: "100%" }}>
          {readOnly ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                backgroundColor: "#fffbeb",
                borderRadius: 10,
                border: "1px solid #fde68a",
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.45,
              }}
            >
              {t("encounterChrome.notesTab.readOnlyHint")}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
              alignItems: "center",
            }}
            role="tablist"
            aria-label={t("emergencyWorkspace.erNotesCategoryAria")}
          >
            {CATEGORIES.map((c) => {
              const isActive = c === active;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={readOnly}
                  onClick={() => setActive(c)}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: 10,
                    border: isActive ? "1px solid #64748b" : "1px solid #e2e8f0",
                    background: isActive ? "#f1f5f9" : "#fff",
                    color: readOnly ? "#94a3b8" : "#334155",
                    cursor: readOnly ? "not-allowed" : "pointer",
                  }}
                >
                  {categoryLabel(c)}
                </button>
              );
            })}
          </div>

          <textarea
            value={parts[active]}
            onChange={(e) => patchActive(e.target.value)}
            rows={10}
            readOnly={readOnly}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              marginBottom: 12,
              fontSize: 14,
              color: "#0f172a",
              background: readOnly ? "#f8fafc" : "#fff",
              cursor: readOnly ? "not-allowed" : "text",
            }}
            placeholder={t("encounterChrome.notesTab.placeholder")}
          />

          {activeAttribution ? (
            <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("emergencyWorkspace.erNotesAttribution")
                .replace("{name}", activeAttribution.savedByDisplayName)
                .replace(
                  "{datetime}",
                  formatEncounterChromeDateTime(activeAttribution.savedAt, language)
                )}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || readOnly}
            style={{
              padding: "10px 20px",
              backgroundColor: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving || readOnly ? "not-allowed" : "pointer",
              opacity: saving || readOnly ? 0.6 : 1,
            }}
          >
            {saving ? t("encounterChrome.notesTab.saving") : t("encounterChrome.notesTab.save")}
          </button>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
