"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { useI18n } from "@/lib/i18n";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import {
  attachmentsFromResultDataAll,
  clinicalResultFromOrderItemLike,
} from "@/lib/clinicalResultNormalize";
import { getCachedRecord } from "@/lib/offline/offlineCache";
import { getPendingOrderItemResultsForEncounter } from "@/lib/offline/pendingOrderItemResults";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

type PendingLocalResult = {
  pendingSync: boolean;
  resultText?: string;
  notes?: string;
  attachments?: any[];
};

function hasLabRadResult(item: any): boolean {
  if (item.catalogItemType !== "LAB_TEST" && item.catalogItemType !== "IMAGING_STUDY") return false;
  const r = item.result;
  const att = r?.resultData ? attachmentsFromResultDataAll(r.resultData).length > 0 : false;
  return !!(
    r?.resultText?.trim() ||
    att ||
    r?.verifiedAt ||
    item.status === "RESULTED" ||
    item.status === "VERIFIED"
  );
}

function mergeItemWithPendingSnapshot(item: any, pending: PendingLocalResult): any {
  const prev = item.result && typeof item.result === "object" ? item.result : {};
  const textParts = [pending.resultText, pending.notes].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  const mergedText = textParts.length > 0 ? textParts.join("\n\n") : undefined;
  const resultData =
    pending.attachments && pending.attachments.length > 0
      ? { attachments: pending.attachments }
      : (prev as { resultData?: unknown }).resultData;

  return {
    ...item,
    result: {
      ...prev,
      resultText: mergedText ?? (prev as { resultText?: string }).resultText,
      criticalValue: (prev as { criticalValue?: boolean }).criticalValue,
      resultData,
      verifiedAt: (prev as { verifiedAt?: string | null }).verifiedAt ?? null,
      enteredByDisplayFr: (prev as { enteredByDisplayFr?: string | null }).enteredByDisplayFr ?? null,
    },
  };
}

/** Ligne labo/imagerie telle que construite pour l’affichage (réutilisable par l’UI urgences). */
export type EncounterLabRadRow = { order: unknown; item: any; pendingSync: boolean };

export type EncounterResultsLabRadSnapshot = {
  loading: boolean;
  rows: EncounterLabRadRow[];
  ordersLoadFailedNoCache: boolean;
};

export function EncounterResultsTab({
  encounterId,
  facilityId,
  refreshToken,
  onLabRadSnapshot,
  hideIntroNote = false,
  /** Si false : charge les commandes et notifie `onLabRadSnapshot`, mais n’affiche pas la liste détaillée (cockpit urgences). */
  embeddedDetailList = true,
  /** Densité réduite pour {@link ClinicalResultViewer} (ex. cockpit urgences avec détail). */
  compactResultViewer = false,
  /** Si true et aucune ligne : pas de grand bloc « aucun résultat » (le parent affiche déjà le résumé). */
  suppressEmptyDetailPlaceholder = false,
  /** Si true : affiche un bouton « Accuser réception » par résultat non encore accusé (RN/PROVIDER/ADMIN seulement). */
  canAcknowledgeResults = false,
}: {
  encounterId: string;
  facilityId: string;
  /** Incrémenté après saisie résultat (événement global) pour recharger. */
  refreshToken: number;
  /** État + lignes affichables (évite un second GET pour un résumé externe, ex. urgences). */
  onLabRadSnapshot?: (snapshot: EncounterResultsLabRadSnapshot) => void;
  /** Masque le bloc d’intro gris si le parent fournit déjà le contexte. */
  hideIntroNote?: boolean;
  embeddedDetailList?: boolean;
  compactResultViewer?: boolean;
  suppressEmptyDetailPlaceholder?: boolean;
  canAcknowledgeResults?: boolean;
}) {
  const { t, language } = useI18n();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  /** true si le GET commandes a échoué et qu’aucun cache exploitable n’était disponible (ids manquants pour fusion locale). */
  const [ordersLoadFailedNoCache, setOrdersLoadFailedNoCache] = useState(false);
  const [pendingResultByItemId, setPendingResultByItemId] = useState<Map<string, PendingLocalResult>>(() => new Map());
  /** clé busy de l'item en cours d'accusé réception (empêche double-clic + relance). */
  const [ackBusyItemId, setAckBusyItemId] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  /** Compteur local pour relancer le GET commandes après accusé réception sans recharger toute la page. */
  const [localAckTick, setLocalAckTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setOrdersLoadFailedNoCache(false);
      try {
        const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch {
        const ordersCacheKey = `encounter-orders:${facilityId}:${encounterId}`;
        const cached = await getCachedRecord<any[]>("encounter_summaries", ordersCacheKey);
        const cachedArr =
          cached?.data && Array.isArray(cached.data) && cached.data.length > 0 ? cached.data : null;
        if (!cancelled) {
          if (cachedArr) {
            setOrders(cachedArr);
          } else {
            setOrders([]);
            setOrdersLoadFailedNoCache(true);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken, localAckTick]);

  const onAcknowledge = async (orderItemId: string) => {
    setAckBusyItemId(orderItemId);
    setAckError(null);
    try {
      await apiFetch(`/orders/${orderItemId}/result/acknowledge`, {
        method: "POST",
        facilityId,
      });
      setLocalAckTick((x) => x + 1);
    } catch (e) {
      setAckError(
        e instanceof Error && e.message
          ? e.message
          : t("patientChartUi.encounterResultsAckFailed")
      );
    } finally {
      setAckBusyItemId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const ids = orders.flatMap((o) => (o.items || []).map((it: { id?: string }) => it.id).filter(Boolean)) as string[];
    if (ids.length === 0) {
      setPendingResultByItemId(new Map());
      return;
    }
    void (async () => {
      const rec = await getPendingOrderItemResultsForEncounter(encounterId);
      const m = new Map<string, PendingLocalResult>();
      for (const id of ids) {
        const p = rec[id];
        if (p && p.pendingSync) m.set(id, p as PendingLocalResult);
      }
      if (!cancelled) setPendingResultByItemId(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [orders, encounterId, refreshToken]);

  const rows = useMemo(() => {
    const out: { order: any; item: any; pendingSync: boolean }[] = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        if (item.catalogItemType !== "LAB_TEST" && item.catalogItemType !== "IMAGING_STUDY") continue;
        const pending = pendingResultByItemId.get(item.id);
        if (hasLabRadResult(item)) {
          out.push({ order, item, pendingSync: false });
        } else if (pending) {
          out.push({ order, item: mergeItemWithPendingSnapshot(item, pending), pendingSync: true });
        }
      }
    }
    return out;
  }, [orders, pendingResultByItemId]);

  const snapshotRef = useRef(onLabRadSnapshot);
  snapshotRef.current = onLabRadSnapshot;

  useEffect(() => {
    snapshotRef.current?.({
      loading,
      rows,
      ordersLoadFailedNoCache,
    });
  }, [loading, rows, ordersLoadFailedNoCache]);

  const resultCardShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  if (!embeddedDetailList) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ fontSize: 14, color: "#64748b", padding: "4px 2px" }}>{t("patientChartUi.encounterResultsLoading")}</div>
    );
  }

  if (rows.length === 0) {
    if (ordersLoadFailedNoCache) {
      return (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px solid #fde68a",
            backgroundColor: "#fffbeb",
            fontSize: 14,
            color: "#78350f",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {t("patientChartUi.encounterResultsOrdersFailed")}
        </div>
      );
    }
    if (suppressEmptyDetailPlaceholder) {
      return null;
    }
    return (
      <div
        style={{
          ...resultCardShell,
          padding: "20px 22px",
          fontSize: 14,
          color: "#64748b",
          lineHeight: 1.5,
        }}
      >
        {t("patientChartUi.encounterResultsEmpty")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!hideIntroNote ? (
        <div style={{ ...resultCardShell, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{t("patientChartUi.encounterResultsIntro")}</p>
        </div>
      ) : null}
      {ackError ? (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#991b1b",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
          }}
        >
          {ackError}
        </div>
      ) : null}
      {rows.map(({ item, pendingSync }) => {
        const v = clinicalResultFromOrderItemLike({
          displayLabel: getOrderItemDisplayLabelForLanguage(item, language, t),
          status: item.status,
          catalogItemType: item.catalogItemType,
          result: item.result,
          emptyTitleFallback: t("patientChartUi.clinicalResultTitleFallback"),
        });
        const acknowledgedAt =
          item.result && typeof item.result === "object"
            ? (item.result as { acknowledgedByProviderAt?: string | null }).acknowledgedByProviderAt
            : null;
        const showAckButton =
          canAcknowledgeResults &&
          !pendingSync &&
          item.status === "RESULTED" &&
          !acknowledgedAt;
        const ackBusy = ackBusyItemId === item.id;
        return (
          <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingSync ? (
              <div
                role="status"
                style={{
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#78350f",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 12,
                }}
              >
                {t("patientChartUi.encounterResultsPendingSync")}
              </div>
            ) : null}
            <div style={{ ...resultCardShell, padding: "16px 18px", overflow: "hidden" }}>
              <ClinicalResultViewer
                title={v.title}
                itemStatus={v.itemStatus}
                verifiedAt={v.verifiedAt}
                resultDocumentedAt={v.resultDocumentedAt}
                resultClinicalAt={v.resultClinicalAt}
                resultEffectiveVersion={v.resultEffectiveVersion}
                criticalValue={v.criticalValue}
                resultText={v.resultText}
                attachments={v.attachments}
                enteredByDisplayFr={v.enteredByDisplayFr}
                acknowledgedByDisplayFr={v.acknowledgedByDisplayFr}
                acknowledgedByProviderAt={v.acknowledgedByProviderAt}
                catalogItemType={v.catalogItemType}
                compact={compactResultViewer}
              />
              {acknowledgedAt && !pendingSync ? (
                <p
                  style={{
                    margin: "10px 0 0 0",
                    fontSize: 11,
                    color: "#15803d",
                    fontWeight: 600,
                  }}
                >
                  {t("patientChartUi.encounterResultsAcknowledged")}
                </p>
              ) : null}
              {showAckButton ? (
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => void onAcknowledge(item.id)}
                    disabled={ackBusy}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: ackBusy ? "#f1f5f9" : "#fff",
                      color: "#0f172a",
                      cursor: ackBusy ? "default" : "pointer",
                    }}
                  >
                    {ackBusy
                      ? t("patientChartUi.encounterResultsAckBusy")
                      : t("patientChartUi.encounterResultsAcknowledgeButton")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
