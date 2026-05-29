"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { useI18n } from "@/lib/i18n";
import { collectProcedureOrderDocumentationHints, ENTERPRISE_PROCEDURE_CATALOG } from "@medora/shared";
import type { ErProcedureLauncherStep } from "@/features/emergency/erProcedureLauncherCatalog";
import { parseEncounterDocumentedProcedureTypes } from "@/lib/procedureOrderDocumentationLinkageUi";
import { ProcedureOrderDocumentationLinkage } from "@/components/clinical/ProcedureOrderDocumentationLinkage";

type CareOrderItemRow = {
  id: string;
  enterpriseProcedureId?: string | null;
  status?: string | null;
};

function extractCareOrderItemsFromOrders(orders: unknown[]): CareOrderItemRow[] {
  const out: CareOrderItemRow[] = [];
  for (const raw of orders) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const order = raw as Record<string, unknown>;
    if (order.type !== "CARE" || order.status === "CANCELLED") continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const it of items) {
      if (!it || typeof it !== "object" || Array.isArray(it)) continue;
      const row = it as Record<string, unknown>;
      const id = String(row.id ?? "").trim();
      if (!id) continue;
      out.push({
        id,
        enterpriseProcedureId:
          typeof row.enterpriseProcedureId === "string" ? row.enterpriseProcedureId : null,
        status: typeof row.status === "string" ? row.status : null,
      });
    }
  }
  return out;
}

/**
 * MEDPROC.3 — surfaces procedure orders with available/recommended documentation in chart summary.
 */
export function ProcedureOrderDocumentationHintsCard({
  encounterId,
  facilityId,
  refreshToken,
  enabled,
  canOpenDocumentation,
  onOpenProcedureDocumentation,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  enabled: boolean;
  canOpenDocumentation: boolean;
  onOpenProcedureDocumentation: (step: ErProcedureLauncherStep) => void;
}) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [careItems, setCareItems] = useState<CareOrderItemRow[]>([]);
  const [documentedTypes, setDocumentedTypes] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!enabled || !encounterId || !facilityId) {
      setCareItems([]);
      setDocumentedTypes([]);
      setLoadError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void (async () => {
      try {
        const [orders, procedures] = await Promise.all([
          fetchOrdersForEncounter(facilityId, encounterId),
          apiFetch(`/encounters/${encounterId}/procedures`, { facilityId }),
        ]);
        if (cancelled) return;
        setCareItems(extractCareOrderItemsFromOrders(Array.isArray(orders) ? orders : []));
        setDocumentedTypes(parseEncounterDocumentedProcedureTypes(procedures));
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setCareItems([]);
          setDocumentedTypes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken, enabled]);

  const hints = useMemo(
    () => collectProcedureOrderDocumentationHints(careItems, documentedTypes),
    [careItems, documentedTypes]
  );

  if (!enabled) return null;
  if (loading) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: "12px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }
  if (loadError || hints.length === 0) return null;

  return (
    <div
      data-testid="procedure-order-documentation-hints"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        padding: "12px 14px",
      }}
    >
      <p
        style={{
          margin: "0 0 4px 0",
          fontSize: 12,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {t("procedureOrderDocumentationLinkage.providerHintsTitle")}
      </p>
      <p style={{ margin: "0 0 10px 0", fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
        {t("procedureOrderDocumentationLinkage.providerHintsSubline")}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {hints.map((hint) => {
          const catalogEntry = ENTERPRISE_PROCEDURE_CATALOG.find((row) => row.id === hint.enterpriseProcedureId);
          const label =
            language === "fr"
              ? catalogEntry?.displayNameFr ?? hint.enterpriseProcedureId
              : catalogEntry?.displayNameEn ?? hint.enterpriseProcedureId;
          return (
            <li key={hint.orderItemId} style={{ fontSize: 12, color: "#334155" }}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{label}</div>
              <ProcedureOrderDocumentationLinkage
                linkage={hint.linkage}
                canOpenDocumentation={canOpenDocumentation}
                onOpenProcedureDocumentation={() =>
                  onOpenProcedureDocumentation(hint.launcherStep as ErProcedureLauncherStep)
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
