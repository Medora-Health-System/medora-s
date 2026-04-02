"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import {
  attachmentsFromResultDataAll,
  clinicalResultFromOrderItemLike,
} from "@/lib/clinicalResultNormalize";
import { getCachedRecord } from "@/lib/offline/offlineCache";
import { getPendingOrderItemResultsForEncounter } from "@/lib/offline/pendingOrderItemResults";

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

export function EncounterResultsTab({
  encounterId,
  facilityId,
  refreshToken,
}: {
  encounterId: string;
  facilityId: string;
  /** Incrémenté après saisie résultat (événement global) pour recharger. */
  refreshToken: number;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  /** true si le GET commandes a échoué et qu’aucun cache exploitable n’était disponible (ids manquants pour fusion locale). */
  const [ordersLoadFailedNoCache, setOrdersLoadFailedNoCache] = useState(false);
  const [pendingResultByItemId, setPendingResultByItemId] = useState<Map<string, PendingLocalResult>>(() => new Map());

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
  }, [encounterId, facilityId, refreshToken]);

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

  if (loading) {
    return <div style={{ color: "#616161", fontSize: 14 }}>Chargement des résultats…</div>;
  }

  if (rows.length === 0) {
    if (ordersLoadFailedNoCache) {
      return (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ffcc80",
            backgroundColor: "#fff8e1",
            fontSize: 14,
            color: "#5d4037",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          Impossible de charger les commandes depuis le serveur. Les résultats en attente de synchronisation sur cet
          appareil peuvent être temporairement masqués jusqu&apos;à une reconnexion réussie.
        </div>
      );
    }
    return (
      <div style={{ padding: 16, background: "#fafafa", borderRadius: 8, fontSize: 14, color: "#555" }}>
        Aucun résultat laboratoire ou imagerie enregistré pour cette consultation. Les résultats saisis depuis les files
        apparaîtront ici automatiquement.
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#616161" }}>
        Résultats liés à cette consultation (laboratoire et imagerie). Les mêmes données sont visibles dans le dossier
        patient (onglet « Résultats »).
      </p>
      {rows.map(({ item, pendingSync }) => {
        const v = clinicalResultFromOrderItemLike({
          displayLabelFr: getOrderItemDisplayLabelFr(item),
          status: item.status,
          catalogItemType: item.catalogItemType,
          result: item.result,
        });
        return (
          <div key={item.id} style={{ marginBottom: pendingSync ? 12 : 0 }}>
            {pendingSync ? (
              <div
                role="status"
                style={{
                  marginBottom: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6d4c41",
                  background: "#fff8e1",
                  border: "1px solid #ffe082",
                  borderRadius: 8,
                }}
              >
                En attente de synchronisation — affichage local sur cet appareil uniquement.
              </div>
            ) : null}
            <ClinicalResultViewer
              title={v.title}
              itemStatus={v.itemStatus}
              verifiedAt={v.verifiedAt}
              criticalValue={v.criticalValue}
              resultText={v.resultText}
              attachments={v.attachments}
              enteredByDisplayFr={v.enteredByDisplayFr}
              catalogItemType={v.catalogItemType}
            />
          </div>
        );
      })}
    </div>
  );
}
