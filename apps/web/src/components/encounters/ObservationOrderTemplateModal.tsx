"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  OBSERVATION_ORDER_TEMPLATE_GROUP_IDS,
  OBSERVATION_ORDER_TEMPLATE_ITEMS,
  observationOrderTemplateItemManualLabel,
  type ObservationOrderTemplateGroupId,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const GROUP_LABEL_KEYS: Record<ObservationOrderTemplateGroupId, string> = {
  monitoring: "encounterChrome.observationOrderTemplate.groups.monitoring",
  nursing_reassessment: "encounterChrome.observationOrderTemplate.groups.nursing_reassessment",
  comfort: "encounterChrome.observationOrderTemplate.groups.comfort",
  diagnostics_hint: "encounterChrome.observationOrderTemplate.groups.diagnostics_hint",
  disposition: "encounterChrome.observationOrderTemplate.groups.disposition",
};

function initialSelectableSelection(existing: Set<string>): Set<string> {
  const next = new Set<string>();
  for (const item of OBSERVATION_ORDER_TEMPLATE_ITEMS) {
    if (!item.defaultSelected) continue;
    if (existing.has(item.id)) continue;
    next.add(item.id);
  }
  return next;
}

function careLineCountFromApplyPayload(created: unknown): number {
  if (!created || typeof created !== "object" || Array.isArray(created)) return 0;
  const o = created as Record<string, unknown>;
  if (o.summary && typeof o.summary === "object" && !Array.isArray(o.summary)) {
    const c = (o.summary as { createdCount?: unknown }).createdCount;
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  if (o.order && typeof o.order === "object" && !Array.isArray(o.order)) {
    const items = (o.order as { items?: unknown }).items;
    return Array.isArray(items) ? items.length : 0;
  }
  const legacyItems = o.items;
  return Array.isArray(legacyItems) ? legacyItems.length : 0;
}

export function ObservationOrderTemplateModal({
  open,
  encounterId,
  facilityId,
  existingTemplateItemIds,
  onClose,
  onOrdersCreated,
}: {
  open: boolean;
  encounterId: string;
  facilityId: string;
  /** Stable template item ids already represented by active CARE lines from this template bundle. */
  existingTemplateItemIds: string[];
  onClose: () => void;
  onOrdersCreated: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const existingSet = useMemo(() => new Set(existingTemplateItemIds), [existingTemplateItemIds]);
  const [selected, setSelected] = useState<Set<string>>(() => initialSelectableSelection(new Set()));
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [successLineCount, setSuccessLineCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSelected(initialSelectableSelection(existingSet));
    setApplying(false);
    setApplySuccess(false);
    setSuccessLineCount(0);
  }, [open, existingSet]);

  useEffect(() => {
    if (!applySuccess) return;
    const tid = window.setTimeout(() => {
      setApplySuccess(false);
      onClose();
    }, 2800);
    return () => window.clearTimeout(tid);
  }, [applySuccess, onClose]);

  const byGroup = useMemo(() => {
    const m = new Map<ObservationOrderTemplateGroupId, (typeof OBSERVATION_ORDER_TEMPLATE_ITEMS)[number][]>();
    for (const g of OBSERVATION_ORDER_TEMPLATE_GROUP_IDS) {
      m.set(g, []);
    }
    for (const item of OBSERVATION_ORDER_TEMPLATE_ITEMS) {
      const list = m.get(item.group);
      if (list) list.push(item);
    }
    return m;
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (applySuccess || applying || existingSet.has(id)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [applySuccess, applying, existingSet]
  );

  const selectedList = useMemo(() => [...selected], [selected]);

  const newSelectionCount = useMemo(
    () => selectedList.filter((id) => !existingSet.has(id)).length,
    [selectedList, existingSet]
  );

  const allTemplateLinesApplied = existingSet.size >= OBSERVATION_ORDER_TEMPLATE_ITEMS.length;

  const onCreate = useCallback(async () => {
    if (applySuccess || applying) return;
    if (newSelectionCount === 0) {
      alert(t("encounterChrome.observationOrderTemplate.validationNeedOne"));
      return;
    }
    setApplying(true);
    try {
      const created = await apiFetch(`/encounters/${encounterId}/observation-order-template/apply`, {
        method: "POST",
        facilityId,
        headers: {
          "Content-Type": "application/json",
          "x-medora-ui-language": language,
        },
        body: JSON.stringify({ selectedItemIds: selectedList }),
      });
      if (
        created &&
        typeof created === "object" &&
        !Array.isArray(created) &&
        (created as { queued?: boolean }).queued === true
      ) {
        alert(t("encounterChrome.observationOrderTemplate.queuedApply"));
        return;
      }
      const summary =
        created && typeof created === "object" && !Array.isArray(created)
          ? (created as { summary?: { allAlreadyPresent?: boolean } }).summary
          : undefined;
      if (summary?.allAlreadyPresent) {
        alert(t("encounterChrome.observationOrderTemplate.allAlreadyPresent"));
        return;
      }
      await onOrdersCreated();
      setSuccessLineCount(Math.max(careLineCountFromApplyPayload(created), newSelectionCount));
      setApplySuccess(true);
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      alert(msg || t("encounterChrome.observationOrderTemplate.createError"));
    } finally {
      setApplying(false);
    }
  }, [
    applySuccess,
    applying,
    encounterId,
    facilityId,
    language,
    newSelectionCount,
    onOrdersCreated,
    selectedList,
    t,
  ]);

  const closeFromSuccess = useCallback(() => {
    setApplySuccess(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const formDisabled = applySuccess || applying;
  const labelLocale = language === "en" ? "en" : "fr";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => !applying && !applySuccess && onClose()}
      role="presentation"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
          padding: "18px 20px",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="observation-order-template-title"
      >
        <h2
          id="observation-order-template-title"
          style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}
        >
          {applySuccess
            ? t("encounterChrome.observationOrderTemplate.successTitle")
            : t("encounterChrome.observationOrderTemplate.title")}
        </h2>

        {applySuccess ? (
          <div>
            <div
              role="status"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                fontSize: 13,
                color: "#166534",
                lineHeight: 1.55,
              }}
            >
              <p style={{ margin: 0 }}>{t("encounterChrome.observationOrderTemplate.successBody")}</p>
              {successLineCount > 0 ? (
                <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#15803d" }}>
                  {t("encounterChrome.observationOrderTemplate.successLineCount").replace("{count}", String(successLineCount))}
                </p>
              ) : null}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeFromSuccess}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {t("encounterChrome.observationOrderTemplate.successClose")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
              {t("encounterChrome.observationOrderTemplate.intro")}
            </p>

            {existingSet.size > 0 ? (
              <div
                role="status"
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  fontSize: 13,
                  color: "#1e3a8a",
                  lineHeight: 1.55,
                }}
              >
                {allTemplateLinesApplied
                  ? t("encounterChrome.observationOrderTemplate.allLinesAppliedBanner")
                  : t("encounterChrome.observationOrderTemplate.partialAppliedBanner")}
              </div>
            ) : null}

            <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.observationOrderTemplate.skip")}</span> —{" "}
              {t("encounterChrome.observationOrderTemplate.skipHint")}
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>{t("encounterChrome.observationOrderTemplate.cancel")}</span> —{" "}
              {t("encounterChrome.observationOrderTemplate.cancelHint")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {OBSERVATION_ORDER_TEMPLATE_GROUP_IDS.map((groupId) => {
                const items = byGroup.get(groupId) ?? [];
                if (!items.length) return null;
                return (
                  <div key={groupId}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#64748b",
                        marginBottom: 8,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {t(GROUP_LABEL_KEYS[groupId])}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((item) => {
                        const already = existingSet.has(item.id);
                        const checked = already || selected.has(item.id);
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "18px 1fr",
                              gap: 10,
                              alignItems: "flex-start",
                              padding: "8px 10px",
                              border: "1px solid #e2e8f0",
                              borderRadius: 8,
                              background: checked ? "#f8fafc" : "#fff",
                              cursor: formDisabled || already ? "not-allowed" : "pointer",
                              fontSize: 13,
                              color: "#334155",
                              lineHeight: 1.45,
                              opacity: already ? 0.72 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={formDisabled || already}
                              onChange={() => toggle(item.id)}
                              style={{ width: 14, height: 14, marginTop: 3 }}
                            />
                            <span>
                              {observationOrderTemplateItemManualLabel(item.id, labelLocale)}
                              {already ? (
                                <span style={{ display: "block", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                  {t("encounterChrome.observationOrderTemplate.lineAlreadyOnChart")}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 20 }}>
              <button
                type="button"
                disabled={applying}
                onClick={onClose}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#fff",
                  color: "#334155",
                  cursor: applying ? "not-allowed" : "pointer",
                }}
              >
                {t("encounterChrome.observationOrderTemplate.cancel")}
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={() => {
                  onClose();
                }}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "#f1f5f9",
                  color: "#334155",
                  cursor: applying ? "not-allowed" : "pointer",
                }}
              >
                {t("encounterChrome.observationOrderTemplate.skip")}
              </button>
              <button
                type="button"
                disabled={applying || newSelectionCount === 0}
                onClick={() => void onCreate()}
                style={{
                  padding: "10px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 10,
                  background: "#0f172a",
                  color: "#fff",
                  cursor: applying || newSelectionCount === 0 ? "not-allowed" : "pointer",
                  opacity: applying || newSelectionCount === 0 ? 0.65 : 1,
                }}
              >
                {applying
                  ? t("encounterChrome.observationOrderTemplate.creating")
                  : t("encounterChrome.observationOrderTemplate.createSelected")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
