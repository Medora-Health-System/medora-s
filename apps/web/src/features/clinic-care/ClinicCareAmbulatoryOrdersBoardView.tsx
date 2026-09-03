/**
 * MEDUI.D4C.6 — Ambulatory order board (Clinic Care projection).
 * Facility + AMBULATORY filter over enterprise Order — no ClinicOrder* engine.
 * Placement → enterprise chart orders tab / CreateOrderModal.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES,
  CLINIC_CARE_AMBULATORY_ORDER_STATUS_FILTERS,
  ambulatoryOrderPriorityDisplayKey,
  ambulatoryOrderStatusDisplayKey,
  clinicCareAmbulatoryOrderDetailPath,
  clinicCareAmbulatoryOrderMatchesFilters,
  clinicCareAmbulatoryOrdersChartPath,
  clinicCareAmbulatoryPatientChartPath,
  resolveClinicCareAmbulatoryOrdersBoardAccess,
  resolveClinicWorkspaceAccess,
  type ClinicCareAmbulatoryOrderCategory,
  type ClinicCareAmbulatoryOrderStatusFilter,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { ClinicCareShell } from "./ClinicCareShell";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";
import { productUiBcp47Tag } from "@/i18n/config";

type OrderBoardRow = {
  orderId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  orderType: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  itemCount: number;
  itemSummaries: Array<{ id: string; status: string; label: string }>;
};

type OrdersBoardPayload = {
  rows: OrderBoardRow[];
  truncated?: boolean;
  access?: { canViewBoard: boolean; canPlaceOrders: boolean; techSafeOnly: boolean };
  facilityTimeZone?: string;
};

const filterChip = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: active ? `1px solid ${CLINIC_CARE_SHELL.accent}` : `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: active ? "rgba(13,148,136,0.12)" : "#fff",
  color: active ? "#0f766e" : "#334155",
  fontSize: 12,
  fontWeight: active ? 700 : 600,
  cursor: "pointer",
});

const denseLink: React.CSSProperties = {
  color: "#0f766e",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: 13,
};

function categoryLabelKey(cat: ClinicCareAmbulatoryOrderCategory): string {
  return `clinicCareD4c6.categories.${cat.toLowerCase()}`;
}

function statusLabelKey(status: ClinicCareAmbulatoryOrderStatusFilter): string {
  return `clinicCareD4c6.statuses.${status.toLowerCase()}`;
}

export function ClinicCareAmbulatoryOrdersBoardView() {
  const { t, language } = useI18n();
  const locale = productUiBcp47Tag(language);
  const {
    facilityId,
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
    facilityTimeZone,
  } = useFacilityAndRoles();

  const resolved = ready
    ? resolveClinicWorkspaceAccess({
        roleCodes: roles,
        facilityType,
        facilityServiceLines,
        careProfileJson,
        facilityCountry,
      })
    : null;

  const boardAccess = resolved
    ? resolveClinicCareAmbulatoryOrdersBoardAccess({
        professionGroup: resolved.professionGroup,
        access: resolved.access,
      })
    : null;

  const [data, setData] = useState<OrdersBoardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ClinicCareAmbulatoryOrderCategory>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<ClinicCareAmbulatoryOrderStatusFilter>("ACTIVE");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await apiFetch("/clinic-care/orders-board", {
        facilityId,
      })) as OrdersBoardPayload;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/403|denied|Forbidden/i.test(message)) {
        setError(t("clinicCareD4c6.errors.ordersAccessDenied"));
      } else if (/CLINIC_CARE_SCHEMA_MISS|503/i.test(message)) {
        setError(t("clinicCareD4c2.errors.schemaMiss"));
      } else {
        setError(t("clinicCareD4c6.errors.ordersLoadFailed"));
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    if (boardAccess && !boardAccess.canViewBoard) {
      setLoading(false);
      setError(t("clinicCareD4c6.errors.ordersAccessDenied"));
      return;
    }
    void load();
  }, [ready, facilityId, boardAccess?.canViewBoard, load, t]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows ?? []).filter((row) => {
      if (
        !clinicCareAmbulatoryOrderMatchesFilters({
          orderType: row.orderType,
          status: row.status,
          category,
          statusFilter,
        })
      ) {
        return false;
      }
      if (!q) return true;
      const hay = `${row.patientName} ${row.mrn ?? ""} ${row.orderType} ${row.status} ${row.itemSummaries
        .map((i) => i.label)
        .join(" ")}`.toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [data?.rows, category, statusFilter, query]);

  const tz = data?.facilityTimeZone || facilityTimeZone || "UTC";

  return (
    <ClinicCareShell
      title={t("clinicCareD4c6.ordersTitle")}
      subtitle={t("clinicCareD4c6.ordersSubtitle")}
    >
      <div data-testid="clinic-care-orders-board">
        {boardAccess?.techSafeOnly ? (
          <p
            style={{ margin: "0 0 10px", fontSize: 12, color: "#92400e" }}
            data-testid="clinic-care-orders-tech-safe"
          >
            {t("clinicCareD4c6.techSafeOrdersNote")}
          </p>
        ) : null}

        {boardAccess?.canPlaceOrders ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c6.placementHint")}
          </p>
        ) : null}

        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
          role="group"
          aria-label={t("clinicCareD4c6.categoryFilters")}
        >
          {CLINIC_CARE_AMBULATORY_ORDER_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              style={filterChip(category === c)}
              onClick={() => setCategory(c)}
              data-testid={`clinic-orders-category-${c}`}
            >
              {t(categoryLabelKey(c))}
            </button>
          ))}
        </div>

        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
          role="group"
          aria-label={t("clinicCareD4c6.statusFilters")}
        >
          {CLINIC_CARE_AMBULATORY_ORDER_STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              style={filterChip(statusFilter === s)}
              onClick={() => setStatusFilter(s)}
              data-testid={`clinic-orders-status-${s}`}
            >
              {t(statusLabelKey(s))}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("clinicCareD4c6.ordersSearchPlaceholder")}
          aria-label={t("clinicCareD4c6.ordersSearchPlaceholder")}
          data-testid="clinic-orders-search"
          style={{
            width: "100%",
            maxWidth: 420,
            height: 34,
            marginBottom: 10,
            borderRadius: 10,
            border: `1px solid ${CLINIC_CARE_SHELL.border}`,
            padding: "0 10px",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        />

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
        ) : error ? (
          <div role="alert">
            <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              style={{ ...filterChip(false), marginTop: 8 }}
            >
              {t("clinicCareD4c2.retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p
            style={{ margin: 0, fontSize: 13, color: "#64748b" }}
            data-testid="clinic-orders-empty"
          >
            {t("clinicCareD4c6.ordersEmpty")}
          </p>
        ) : (
          <ul
            style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}
            data-testid="clinic-orders-list"
          >
            {rows.map((row) => (
              <li
                key={row.orderId}
                data-testid={`clinic-order-row-${row.orderId}`}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 12px",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${CLINIC_CARE_SHELL.border}`,
                  background: "#fff",
                }}
              >
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <Link href={clinicCareAmbulatoryPatientChartPath(row.patientId)} style={denseLink}>
                    {row.patientName}
                  </Link>
                  {row.mrn ? (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b" }}>
                      {row.mrn}
                    </span>
                  ) : null}
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {row.itemSummaries
                      .slice(0, 3)
                      .map((i) => i.label)
                      .join(" · ") || t("clinicCareD4c6.noLineItems")}
                    {row.itemCount > 3 ? ` (+${row.itemCount - 3})` : ""}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#0f172a",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                  }}
                >
                  {t(categoryLabelKey(row.category as ClinicCareAmbulatoryOrderCategory))}
                </span>
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
                  {t(ambulatoryOrderStatusDisplayKey(row.status))}
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {t("clinicCareD4c5b2.orderBoard.provider")}
                </span>
                <span style={{ fontSize: 11, color: "#0f766e", fontWeight: 600 }}>
                  {row.category === "MEDICATION"
                    ? t("clinicCareD4c5b3.destination.onsiteOrRx")
                    : t("clinicCareD4c5b3.destination.diagnostic")}
                </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {t(ambulatoryOrderPriorityDisplayKey(row.priority))}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {new Date(row.createdAt).toLocaleString(locale, { timeZone: tz })}
                </span>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <Link
                    href={clinicCareAmbulatoryOrderDetailPath({
                      encounterId: row.encounterId,
                      orderId: row.orderId,
                    })}
                    style={{ ...filterChip(false), textDecoration: "none" }}
                  >
                    {t("clinicCareD4c6.openOrder")}
                  </Link>
                  {boardAccess?.canPlaceOrders ? (
                    <Link
                      href={clinicCareAmbulatoryOrdersChartPath(row.encounterId)}
                      style={{ ...filterChip(true), textDecoration: "none" }}
                    >
                      {t("clinicCareD4c6.placeOrder")}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {data?.truncated ? (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#92400e" }}>
            {t("clinicCareD4c6.truncatedHint")}
          </p>
        ) : null}
      </div>
    </ClinicCareShell>
  );
}
