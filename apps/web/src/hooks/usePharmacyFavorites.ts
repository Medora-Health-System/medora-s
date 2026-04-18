"use client";

import { useState, useCallback, useEffect } from "react";
import type { SupportedLanguage } from "@/i18n/config";
import { fetchMedicationFavorites, type MedicationSearchItem } from "@/lib/pharmacyApi";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

export function usePharmacyFavorites(facilityId: string | null, language: SupportedLanguage) {
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
      setError(e instanceof Error ? e.message : i18nMessage(language, "common.loadError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, language]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refresh: load };
}
