"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchMedicationFavorites, type MedicationSearchItem } from "@/lib/pharmacyApi";

export function usePharmacyFavorites(facilityId: string | null) {
  const [items, setItems] = useState<MedicationSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMedicationFavorites(facilityId);
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les favoris");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refresh: load };
}
