"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchLowStock, fetchExpiring, type InventoryItemRow } from "@/lib/pharmacyApi";

const EXPIRING_DAYS = 90;
const TOP_SHOW = 5;

export function usePharmacyAlerts(facilityId: string | null) {
  const [lowStock, setLowStock] = useState<InventoryItemRow[]>([]);
  const [expiring, setExpiring] = useState<InventoryItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setLowStock([]);
      setExpiring([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [low, exp] = await Promise.all([
        fetchLowStock(facilityId),
        fetchExpiring(facilityId, EXPIRING_DAYS),
      ]);
      setLowStock(Array.isArray(low) ? low : []);
      setExpiring(Array.isArray(exp) ? exp : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les alertes");
      setLowStock([]);
      setExpiring([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    load();
  }, [load]);

  const lowCount = lowStock.length;
  const expCount = expiring.length;
  const criticalCount = lowStock.filter(
    (i) => i.expirationDate && new Date(i.expirationDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ).length;

  return {
    lowStock,
    expiring,
    lowCount,
    expCount,
    criticalCount,
    topLow: lowStock.slice(0, TOP_SHOW),
    topExpiring: expiring.slice(0, TOP_SHOW),
    loading,
    error,
    refresh: load,
  };
}
