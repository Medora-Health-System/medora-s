"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { ClinicalResultViewer } from "@/components/clinical/ClinicalResultViewer";
import {
  attachmentsFromResultDataAll,
  clinicalResultFromOrderItemLike,
} from "@/lib/clinicalResultNormalize";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken]);

  const rows = useMemo(() => {
    const out: { order: any; item: any }[] = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        if (hasLabRadResult(item)) out.push({ order, item });
      }
    }
    return out;
  }, [orders]);

  if (loading) {
    return <div style={{ color: "#616161", fontSize: 14 }}>Chargement des résultats…</div>;
  }

  if (rows.length === 0) {
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
      {rows.map(({ item }) => {
        const v = clinicalResultFromOrderItemLike({
          displayLabelFr: getOrderItemDisplayLabelFr(item),
          status: item.status,
          catalogItemType: item.catalogItemType,
          result: item.result,
        });
        return (
          <ClinicalResultViewer
            key={item.id}
            title={v.title}
            itemStatus={v.itemStatus}
            verifiedAt={v.verifiedAt}
            criticalValue={v.criticalValue}
            resultText={v.resultText}
            attachments={v.attachments}
            enteredByDisplayFr={v.enteredByDisplayFr}
            catalogItemType={v.catalogItemType}
          />
        );
      })}
    </div>
  );
}
