"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  OBSERVATION_ORDER_TEMPLATE_GROUP_IDS,
  OBSERVATION_ORDER_TEMPLATE_ITEMS,
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

function defaultSelectedIds(): Set<string> {
  return new Set(OBSERVATION_ORDER_TEMPLATE_ITEMS.filter((i) => i.defaultSelected).map((i) => i.id));
}

export function ObservationOrderTemplateModal({
  open,
  encounterId,
  facilityId,
  onClose,
  onOrdersCreated,
}: {
  open: boolean;
  encounterId: string;
  facilityId: string;
  onClose: () => void;
  onOrdersCreated: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(() => defaultSelectedIds());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(defaultSelectedIds());
    setApplying(false);
  }, [open]);

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

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedList = useMemo(() => [...selected], [selected]);

  const onCreate = useCallback(async () => {
    if (selectedList.length === 0) {
      alert(t("encounterChrome.observationOrderTemplate.validationNeedOne"));
      return;
    }
    setApplying(true);
    try {
      await apiFetch(`/encounters/${encounterId}/observation-order-template/apply`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedItemIds: selectedList }),
      });
      await onOrdersCreated();
      onClose();
    } catch (e) {
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null, language);
      alert(msg || t("encounterChrome.observationOrderTemplate.createError"));
    } finally {
      setApplying(false);
    }
  }, [encounterId, facilityId, language, onClose, onOrdersCreated, selectedList, t]);

  if (!open) return null;

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
      onClick={() => !applying && onClose()}
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
          {t("encounterChrome.observationOrderTemplate.title")}
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
          {t("encounterChrome.observationOrderTemplate.intro")}
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
                  {items.map((item) => (
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
                        background: selected.has(item.id) ? "#f8fafc" : "#fff",
                        cursor: applying ? "not-allowed" : "pointer",
                        fontSize: 13,
                        color: "#334155",
                        lineHeight: 1.45,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        disabled={applying}
                        onChange={() => toggle(item.id)}
                        style={{ width: 14, height: 14, marginTop: 3 }}
                      />
                      <span>{item.manualLabelFr}</span>
                    </label>
                  ))}
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
            disabled={applying || selectedList.length === 0}
            onClick={() => void onCreate()}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              background: "#0f172a",
              color: "#fff",
              cursor: applying || selectedList.length === 0 ? "not-allowed" : "pointer",
              opacity: applying || selectedList.length === 0 ? 0.65 : 1,
            }}
          >
            {applying
              ? t("encounterChrome.observationOrderTemplate.creating")
              : t("encounterChrome.observationOrderTemplate.createSelected")}
          </button>
        </div>
      </div>
    </div>
  );
}
