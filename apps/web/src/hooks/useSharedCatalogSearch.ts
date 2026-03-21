"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { CatalogSearchAdapter } from "@/lib/catalogSearchAdapter";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_MIN_CHARS = 2;

export function useSharedCatalogSearch(
  facilityId: string | null,
  catalogType: CatalogType,
  adapter: CatalogSearchAdapter,
  options?: {
    limit?: number;
    minChars?: number;
    debounceMs?: number;
    favoritesFirst?: boolean;
  }
) {
  const limit = options?.limit ?? 20;
  const minChars = options?.minChars ?? DEFAULT_MIN_CHARS;
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const favoritesFirst = options?.favoritesFirst ?? false;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!facilityId || q.trim().length < minChars) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const items = await adapter.search({
          facilityId,
          catalogType,
          q: q.trim(),
          limit,
          ...(catalogType === "MEDICATION" ? { favoritesFirst } : {}),
        });
        setResults(items);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [adapter, facilityId, catalogType, limit, minChars, favoritesFirst]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < minChars) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    timerRef.current = setTimeout(() => runSearch(query), debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch, minChars, debounceMs]);

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

  const selectCurrent = useCallback((): CatalogSearchItem | null => {
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
    noResults: !loading && query.trim().length >= minChars && results.length === 0,
    minChars,
  };
}
