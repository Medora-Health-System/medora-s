"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchLowStock, fetchExpiring, type InventoryItemRow } from "@/lib/pharmacyApi";
import { useI18n } from "@/lib/i18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";

const EXPIRING_WINDOW_DAYS = 90;
const NEAR_EXPIRY_DAYS = 30;
const TOP_ITEMS_SHOW = 5;

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  marginBottom: 20,
};

const linkStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: 14,
  fontWeight: 500,
};

function formatDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale);
}

function fillTemplate(s: string, vars: Record<string, string | number>) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function daysUntil(expirationDate: string | null): number | null {
  if (!expirationDate) return null;
  const exp = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function isNearExpiry(expirationDate: string | null): boolean {
  const days = daysUntil(expirationDate);
  return days !== null && days <= NEAR_EXPIRY_DAYS && days >= 0;
}

function isExpired(expirationDate: string | null): boolean {
  const days = daysUntil(expirationDate);
  return days !== null && days < 0;
}

export function PharmacyAlertsCard({
  facilityId,
  onRefreshInventory,
}: {
  facilityId: string;
  onRefreshInventory?: () => void;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [lowStock, setLowStock] = useState<InventoryItemRow[]>([]);
  const [expiring, setExpiring] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [low, exp] = await Promise.all([
        fetchLowStock(facilityId),
        fetchExpiring(facilityId, EXPIRING_WINDOW_DAYS),
      ]);
      setLowStock(Array.isArray(low) ? low : []);
      setExpiring(Array.isArray(exp) ? exp : []);
    } catch (e: any) {
      setError(e?.message || t("pharmacyAlertsCard.loadFailed"));
      setLowStock([]);
      setExpiring([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && lowStock.length === 0 && expiring.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{t("pharmacyAlertsCard.title")}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{t("pharmacyAlertsCard.loading")}</p>
      </div>
    );
  }

  if (error && lowStock.length === 0 && expiring.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{t("pharmacyAlertsCard.title")}</h3>
        <p style={{ margin: 0, fontSize: 14, color: "#b00020" }}>{error}</p>
        <button
          type="button"
          onClick={load}
          style={{
            marginTop: 8,
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
            background: "#f5f5f5",
          }}
        >
          {t("pharmacyAlertsCard.retry")}
        </button>
      </div>
    );
  }

  const lowCount = lowStock.length;
  const expCount = expiring.length;
  const topLow = lowStock.slice(0, TOP_ITEMS_SHOW);
  const topExpiring = expiring.slice(0, TOP_ITEMS_SHOW);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t("pharmacyAlertsCard.title")}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/app/pharmacy/low-stock" style={linkStyle}>
            {t("pharmacyAlertsCard.linkLowStock")} {lowCount > 0 && `(${lowCount})`}
          </Link>
          <span style={{ color: "#ccc" }}>·</span>
          <Link href="/app/pharmacy/expiring" style={linkStyle}>
            {t("pharmacyAlertsCard.linkExpiring")} {expCount > 0 && `(${expCount})`}
          </Link>
          <span style={{ color: "#ccc" }}>·</span>
          <Link href="/app/pharmacy/inventory" style={linkStyle}>
            {t("pharmacyAlertsCard.linkInventory")}
          </Link>
          {onRefreshInventory && (
            <>
              <span style={{ color: "#ccc" }}>·</span>
              <button
                type="button"
                onClick={() => { load(); onRefreshInventory(); }}
                style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {t("pharmacyAlertsCard.refresh")}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 14 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {t("pharmacyAlertsCard.lowStockHeading")}
            {lowCount > 0 && (
              <span style={{ marginLeft: 6, color: "#b45309", fontWeight: 500 }}>
                {fillTemplate(t("pharmacyAlertsCard.articles"), { count: lowCount })}
              </span>
            )}
          </div>
          {topLow.length === 0 ? (
            <p style={{ margin: 0, color: "#666" }}>{t("pharmacyAlertsCard.none")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {topLow.map((item) => (
                <li key={item.id} style={{ marginBottom: 4 }}>
                  <Link href={`/app/pharmacy/inventory?receive=${item.id}`} style={{ color: "#1a1a1a" }}>
                    {catalogMedicationNameForLocale(item.catalogMedication, language) ||
                      item.catalogMedication?.code ||
                      item.sku}
                  </Link>
                  {" "}
                  <span style={{ color: "#666" }}>
                    {fillTemplate(t("pharmacyAlertsCard.inStock"), {
                      qty: item.quantityOnHand,
                      level: item.reorderLevel,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {lowCount > TOP_ITEMS_SHOW && (
            <Link href="/app/pharmacy/low-stock" style={{ fontSize: 13, color: "#666" }}>
              {fillTemplate(t("pharmacyAlertsCard.moreLink"), { count: lowCount - TOP_ITEMS_SHOW })}
            </Link>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {fillTemplate(t("pharmacyAlertsCard.expiringHeading"), { days: EXPIRING_WINDOW_DAYS })}
            {expCount > 0 && (
              <span style={{ marginLeft: 6, color: "#b45309", fontWeight: 500 }}>
                {fillTemplate(t("pharmacyAlertsCard.articles"), { count: expCount })}
              </span>
            )}
          </div>
          {topExpiring.length === 0 ? (
            <p style={{ margin: 0, color: "#666" }}>{t("pharmacyAlertsCard.none")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {topExpiring.map((item) => {
                const days = daysUntil(item.expirationDate);
                const expired = isExpired(item.expirationDate);
                const near = isNearExpiry(item.expirationDate);
                const rowBg =
                  expired ? "#fef2f2" : near ? "#fffbeb" : undefined;
                return (
                  <li
                    key={item.id}
                    style={{
                      marginBottom: 4,
                      padding: "2px 6px",
                      marginLeft: -6,
                      borderRadius: 4,
                      backgroundColor: rowBg,
                    }}
                  >
                    <Link href={`/app/pharmacy/inventory?receive=${item.id}`} style={{ color: "#1a1a1a" }}>
                      {catalogMedicationNameForLocale(item.catalogMedication, language) ||
                      item.catalogMedication?.code ||
                      item.sku}
                    </Link>
                    {" "}
                    <span style={{ color: "#666" }}>
                      {fillTemplate(t("pharmacyAlertsCard.expiryOn"), {
                        date: formatDate(item.expirationDate, dateLocale),
                      })}
                      {days !== null && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontWeight: 500,
                            color: expired ? "#b91c1c" : near ? "#b45309" : "#666",
                          }}
                        >
                          {expired
                            ? t("pharmacyAlertsCard.expiredTag")
                            : near
                              ? fillTemplate(t("pharmacyAlertsCard.daysToExpiry"), { days })
                              : ""}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {expCount > TOP_ITEMS_SHOW && (
            <Link href="/app/pharmacy/expiring" style={{ fontSize: 13, color: "#666" }}>
              {fillTemplate(t("pharmacyAlertsCard.moreLink"), { count: expCount - TOP_ITEMS_SHOW })}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
