"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { searchMedications, type MedicationSearchItem } from "@/lib/pharmacyApi";

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

export function useMedicationSearch(facilityId: string | null, options?: { favoritesFirst?: boolean; limit?: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicationSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!facilityId || q.trim().length < MIN_CHARS) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await searchMedications(facilityId, {
          q: q.trim(),
          limit: options?.limit ?? 20,
          favoritesFirst: options?.favoritesFirst ?? true,
        });
        setResults(res.items ?? []);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [facilityId, options?.limit, options?.favoritesFirst]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    timerRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  const moveSelection = useCallback(
    (delta: number) => {
      if (results.length === 0) return;
      setSelectedIndex((i) => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next >= results.length) return results.length - 1;
        return next;
      });
    },
    [results.length]
  );

  const selectCurrent = useCallback((): MedicationSearchItem | null => {
    if (results.length === 0) return null;
    const idx = selectedIndex >= 0 && selectedIndex < results.length ? selectedIndex : 0;
    return results[idx] ?? null;
  }, [results, selectedIndex]);

  return {
    query,
    setQuery,
    results,
    loading,
    selectedIndex,
    setSelectedIndex,
    isOpen,
    setIsOpen,
    close,
    moveSelection,
    selectCurrent,
    noResults: !loading && query.trim().length >= MIN_CHARS && results.length === 0,
  };
}
