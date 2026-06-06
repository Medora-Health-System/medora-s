"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useSharedCatalogSearch } from "@/hooks/useSharedCatalogSearch";
import {
  createRemoteCatalogSearchAdapter,
  type CatalogSearchAdapter,
} from "@/lib/catalogSearchAdapter";
import { createOfflineAwareCatalogSearchAdapter } from "@/lib/offline/catalogSearchOfflineAdapter";
import type { SupportedLanguage } from "@/i18n/config";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";
import { getCatalogSearchItemDisplayLabel } from "@/lib/catalogDisplayLabel";
import { formatCatalogMedicationSubtitleForLocale } from "@/lib/localizedMedicationDisplay";
import { MedicationCanonicalBadges } from "@/components/medication/MedicationCanonicalBadges";
import { compactMedicationRoute } from "@medora/shared";
import { useI18n } from "@/lib/i18n";

function catalogListPrimaryLine(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return getCatalogSearchItemDisplayLabel(item, language, t);
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function catalogSearchHaystack(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return [
    item.code,
    item.name,
    item.displayNameEn,
    item.displayNameFr,
    item.secondaryText,
    item.searchText,
    item.metadata?.strength,
    item.metadata?.dosageForm,
    item.metadata?.route,
    ...(item.metadata?.commonAliases ?? []),
    ...(item.metadata?.canonicalReadOnly?.canonicalAliases ?? []),
    catalogListPrimaryLine(item, language, t),
  ]
    .filter(Boolean)
    .join(" ");
}

function rankCatalogSearchItem(
  item: CatalogSearchItem,
  query: string,
  language: SupportedLanguage,
  t: (key: string) => string
): number {
  const needle = normalizeSearchText(query);
  if (!needle) return 3;

  const primary = normalizeSearchText(catalogListPrimaryLine(item, language, t));
  const code = normalizeSearchText(item.code);
  const haystack = normalizeSearchText(catalogSearchHaystack(item, language, t));

  if (primary === needle || code === needle) return 0;
  if (primary.startsWith(needle) || code.startsWith(needle)) return 1;
  if (haystack.includes(needle)) return 2;

  const tokens = needle.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token)) ? 2 : 3;
}

function typeBadgeForCatalogItem(item: CatalogSearchItem): string {
  switch (item.type) {
    case "MEDICATION":
      return "💊";
    case "LAB_TEST":
      return "🧪";
    case "IMAGING_STUDY":
      return "🖼";
    default:
      return "📦";
  }
}

function catalogListDisplayLine(
  item: CatalogSearchItem,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  const badge = typeBadgeForCatalogItem(item);
  const primary = catalogListPrimaryLine(item, language, t);
  const route =
    item.type === "MEDICATION"
      ? compactMedicationRoute({
          route: item.metadata?.route,
          administrationType: item.metadata?.administrationType,
        })
      : "";
  return route ? `${badge} ${primary} — ${route}` : `${badge} ${primary}`;
}

function fillTemplate(s: string, vars: Record<string, string | number>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 4,
  border: "1px solid #ccc",
  fontSize: 14,
  boxSizing: "border-box",
};

const listContainerStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "100%",
  marginTop: 2,
  maxHeight: 280,
  overflow: "auto",
  backgroundColor: "white",
  border: "1px solid #ccc",
  borderRadius: 4,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  zIndex: 50,
};

function HighlightMatch({ text, needle }: { text: string; needle: string }) {
  const q = needle.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const i = lower.indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ backgroundColor: "#fff59d", padding: 0 }}>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export type SharedCatalogAutocompleteProps = {
  catalogType: CatalogType;
  label: string;
  placeholder: string;
  value?: CatalogSearchItem | null;
  onSelect: (item: CatalogSearchItem) => void;
  disabled?: boolean;
  minChars?: number;
  facilityId: string | null;
  searchAdapter?: CatalogSearchAdapter;
  limit?: number;
  favoritesFirst?: boolean;
  stockBadge?: (item: CatalogSearchItem) => string | null;
};

export function SharedCatalogAutocomplete({
  catalogType,
  label,
  placeholder,
  value: _value,
  onSelect,
  disabled,
  minChars = 2,
  facilityId,
  searchAdapter,
  limit = 20,
  favoritesFirst = false,
  stockBadge,
}: SharedCatalogAutocompleteProps) {
  void _value;
  const { t, language } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const adapter = useMemo(
    () => searchAdapter ?? createOfflineAwareCatalogSearchAdapter() ?? createRemoteCatalogSearchAdapter(),
    [searchAdapter]
  );

  const search = useSharedCatalogSearch(facilityId, catalogType, adapter, {
    limit,
    minChars,
    debounceMs: 250,
    favoritesFirst: catalogType === "MEDICATION" ? favoritesFirst : false,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        search.close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [search.close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!search.isOpen || displayResults.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        search.close();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      search.setSelectedIndex((idx) => Math.min(idx + 1, displayResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      search.setSelectedIndex((idx) => Math.max(idx - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = search.selectedIndex >= 0 && search.selectedIndex < displayResults.length ? search.selectedIndex : 0;
      const selected = displayResults[idx] ?? null;
      if (selected) {
        onSelect(selected);
        search.setQuery("");
        search.close();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      search.close();
    }
  };

  const handlePick = (item: CatalogSearchItem) => {
    onSelect(item);
    search.setQuery("");
    search.close();
  };

  const needle = search.query.trim();
  const displayResults = useMemo(
    () =>
      search.results
        .filter((item) => item.type === catalogType)
        .map((item, originalIndex) => ({
          item,
          originalIndex,
          rank: rankCatalogSearchItem(item, needle, language, t),
        }))
        .sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex)
        .map((entry) => entry.item),
    [catalogType, language, needle, search.results, t]
  );
  const noDisplayResults = !search.loading && search.query.trim().length >= minChars && displayResults.length === 0;
  const showList = search.isOpen && (displayResults.length > 0 || search.loading || noDisplayResults);
  const activeIdx =
    search.selectedIndex >= 0 && search.selectedIndex < displayResults.length ? search.selectedIndex : 0;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {label ? (
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>{label}</label>
      ) : null}
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onFocus={() => search.query.trim().length >= minChars && search.setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={inputStyle}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
      />
      {search.query.trim().length > 0 && search.query.trim().length < minChars && (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
          {fillTemplate(t("sharedCatalogAutocomplete.minCharsHint"), { minChars })}
        </div>
      )}
      {showList && (
        <div style={listContainerStyle} role="listbox">
          {search.loading && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>
              {t("sharedCatalogAutocomplete.searching")}
            </div>
          )}
          {!search.loading && noDisplayResults && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>
              {t("sharedCatalogAutocomplete.noResults")}
            </div>
          )}
          {!search.loading &&
            search.query.trim().length >= minChars &&
            displayResults.map((item, idx) => {
              const isActive = idx === activeIdx;
              const badge = catalogType === "MEDICATION" ? stockBadge?.(item) : null;
              const displayLine = catalogListDisplayLine(item, language, t);
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handlePick(item)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 13,
                    border: "none",
                    borderBottom: "1px solid #eee",
                    backgroundColor: isActive ? "#f0f7ff" : "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    <HighlightMatch text={displayLine} needle={needle} />
                    {item.type === "MEDICATION" && item.isEssential && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#1976d2" }}>
                        {t("pharmacyMedicationSearch.essentialBadge")}
                      </span>
                    )}
                    {item.type === "MEDICATION" && item.isFavorite && (
                      <span style={{ marginLeft: 6, fontSize: 12 }} aria-hidden>
                        ★
                      </span>
                    )}
                  </div>
                  {(() => {
                    const subtitleLine =
                      item.type === "MEDICATION"
                        ? formatCatalogMedicationSubtitleForLocale(item, language)
                        : item.secondaryText;
                    return subtitleLine ? (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                      <HighlightMatch text={subtitleLine} needle={needle} />
                    </div>
                    ) : null;
                  })()}
                  {badge ? (
                    <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>{badge}</div>
                  ) : null}
                  {catalogType === "MEDICATION" ? <MedicationCanonicalBadges item={item} /> : null}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
