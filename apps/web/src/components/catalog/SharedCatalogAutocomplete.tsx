"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useSharedCatalogSearch } from "@/hooks/useSharedCatalogSearch";
import {
  createRemoteCatalogSearchAdapter,
  type CatalogSearchAdapter,
} from "@/lib/catalogSearchAdapter";
import { createOfflineAwareCatalogSearchAdapter } from "@/lib/offline/catalogSearchOfflineAdapter";
import type { CatalogSearchItem, CatalogType } from "@/lib/catalogSearchTypes";

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
    if (!search.isOpen || search.results.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        search.close();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      search.moveSelection(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      search.moveSelection(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = search.selectCurrent();
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

  const showList =
    search.isOpen && (search.results.length > 0 || search.loading || search.noResults);
  const needle = search.query.trim();
  const activeIdx = search.selectedIndex >= 0 ? search.selectedIndex : 0;

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
          Tapez au moins {minChars} caractères
        </div>
      )}
      {showList && (
        <div style={listContainerStyle} role="listbox">
          {search.loading && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>Recherche…</div>
          )}
          {!search.loading && search.noResults && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>Aucun résultat</div>
          )}
          {!search.loading &&
            search.query.trim().length >= minChars &&
            search.results.map((item, idx) => {
              const isActive = idx === activeIdx;
              const badge = catalogType === "MEDICATION" ? stockBadge?.(item) : null;
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
                    <HighlightMatch text={item.displayNameFr} needle={needle} />
                    {item.type === "MEDICATION" && item.isEssential && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#1976d2" }}>Essentiel</span>
                    )}
                    {item.type === "MEDICATION" && item.isFavorite && (
                      <span style={{ marginLeft: 6, fontSize: 12 }} aria-hidden>
                        ★
                      </span>
                    )}
                  </div>
                  {item.secondaryText ? (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                      <HighlightMatch text={item.secondaryText} needle={needle} />
                    </div>
                  ) : null}
                  {badge ? (
                    <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>{badge}</div>
                  ) : null}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
