"use client";

import React, { useRef, useEffect } from "react";
import { useMedicationSearch } from "@/hooks/useMedicationSearch";
import { MedicationSuggestionList } from "./MedicationSuggestionList";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { medicationSearchLabel } from "@/lib/pharmacyApi";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";

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

/**
 * Saisie médicament : mode contrôlé (stock / formulaires) ou autocomplétion partagée `/catalog/medications/search`.
 */
export function MedicationAutocomplete({
  facilityId,
  placeholder = "Rechercher un médicament",
  onSelect,
  mode = "inventory",
  favoritesFirst = true,
  autoFocus = false,
  stockBadge,
  value,
  onChange,
  disabled,
}: {
  facilityId: string | null;
  placeholder?: string;
  onSelect: (med: MedicationSearchItem) => void;
  mode?: "inventory" | "dispense" | "prescribe";
  favoritesFirst?: boolean;
  autoFocus?: boolean;
  stockBadge?: (med: MedicationSearchItem) => string | null;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  void mode;
  const controlled = value !== undefined && onChange !== undefined;

  if (!controlled) {
    return (
      <SharedCatalogAutocomplete
        catalogType="MEDICATION"
        label=""
        placeholder={placeholder}
        facilityId={facilityId}
        onSelect={onSelect}
        disabled={disabled}
        favoritesFirst={favoritesFirst}
        stockBadge={stockBadge}
      />
    );
  }

  return (
    <MedicationAutocompleteControlled
      facilityId={facilityId}
      placeholder={placeholder}
      onSelect={onSelect}
      favoritesFirst={favoritesFirst}
      autoFocus={autoFocus}
      stockBadge={stockBadge}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

function MedicationAutocompleteControlled({
  facilityId,
  placeholder,
  onSelect,
  favoritesFirst,
  autoFocus,
  stockBadge,
  value,
  onChange,
  disabled,
}: {
  facilityId: string | null;
  placeholder: string;
  onSelect: (med: MedicationSearchItem) => void;
  favoritesFirst: boolean;
  autoFocus: boolean;
  stockBadge?: (med: MedicationSearchItem) => string | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useMedicationSearch(facilityId, { favoritesFirst, limit: 20 });

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    search.setQuery(value ?? "");
  }, [value]);

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
      if (e.key === "Escape") search.close();
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
        onChange(medicationSearchLabel(selected));
        search.close();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      search.close();
    }
  };

  const handleSelect = (med: MedicationSearchItem) => {
    onSelect(med);
    onChange(medicationSearchLabel(med));
    search.close();
  };

  const showList = search.isOpen && (search.results.length > 0 || search.loading || search.noResults);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value.trim().length >= 2 && search.setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={inputStyle}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
      />
      {value.trim().length > 0 && value.trim().length < 2 && (
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Tapez au moins 2 caractères</div>
      )}
      {showList && (
        <div style={listContainerStyle}>
          {search.loading && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>Recherche…</div>
          )}
          {!search.loading && search.noResults && (
            <div style={{ padding: 12, fontSize: 13, color: "#666" }}>Aucun résultat</div>
          )}
          {!search.loading && search.results.length > 0 && (
            <MedicationSuggestionList
              items={search.results}
              selectedIndex={search.selectedIndex >= 0 ? search.selectedIndex : 0}
              onSelect={handleSelect}
              stockBadge={stockBadge}
            />
          )}
        </div>
      )}
    </div>
  );
}
