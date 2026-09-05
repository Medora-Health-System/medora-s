"use client";

import React, { useEffect, useState } from "react";
import { searchIcd10Catalog, type Icd10SearchHit } from "@/lib/chartApi";
import type { SupportedLanguage } from "@/i18n/config";
import { formatIcd10ServerResolvedOneLineDisplay } from "@medora/shared";
import {
  diagnosisMatchesLocalizedSearch,
  resolveLocalizedDiagnosisSearchQueries,
} from "@/features/emergency/diagnosisFrenchSearchAliases";
import {
  icd10HitDescription,
  interpretIcd10SearchKeyDown,
  isDuplicateDischargeDiagnosis,
  type DiagnosisDuplicateRef,
} from "./icd10DiagnosisSearchHelpers";

export type Icd10DiagnosisSearchAutocompleteProps = {
  language: SupportedLanguage;
  disabled?: boolean;
  label: string;
  placeholder: string;
  searchingLabel: string;
  noResultsLabel: string;
  searchFailedLabel: string;
  alreadyAddedLabel: string;
  nonBillableLabel?: string;
  selectedDiagnoses?: DiagnosisDuplicateRef[];
  onSelect: (hit: Icd10SearchHit, description: string) => void;
  testId?: string;
};

export function Icd10DiagnosisSearchAutocomplete({
  language,
  disabled,
  label,
  placeholder,
  searchingLabel,
  noResultsLabel,
  searchFailedLabel,
  alreadyAddedLabel,
  nonBillableLabel,
  selectedDiagnoses = [],
  onSelect,
  testId = "icd10-diagnosis-search-autocomplete",
}: Icd10DiagnosisSearchAutocompleteProps) {
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<Icd10SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFetchFailed, setSearchFetchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchFetchFailed(false);
      setActiveIndex(-1);
      setListOpen(false);
      return;
    }
    let cancelled = false;
    const tmr = window.setTimeout(() => {
      setSearching(true);
      setSearchFetchFailed(false);
      const apiQueries = resolveLocalizedDiagnosisSearchQueries(q, language);
      const runSearch = async (): Promise<Icd10SearchHit[]> => {
        const merged: Icd10SearchHit[] = [];
        const seen = new Set<string>();
        for (const apiQ of apiQueries) {
          const res = await searchIcd10Catalog(apiQ, 25, language);
          for (const hit of Array.isArray(res.items) ? res.items : []) {
            if (seen.has(hit.id)) continue;
            seen.add(hit.id);
            merged.push(hit);
          }
          if (merged.length >= 25) break;
        }
        if (language === "fr") {
          return merged
            .filter((hit) => diagnosisMatchesLocalizedSearch(hit, q, language))
            .slice(0, 25);
        }
        return merged.slice(0, 25);
      };
      void runSearch()
        .then((items) => {
          if (!cancelled) {
            setSearchHits(items);
            setSearchFetchFailed(false);
            setActiveIndex(-1);
            setListOpen(true);
          }
        })
        .catch((err: unknown) => {
          console.error("ICD search failed", err);
          if (!cancelled) {
            setSearchHits([]);
            setSearchFetchFailed(true);
            setActiveIndex(-1);
            setListOpen(true);
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [language, searchQ]);

  const pick = (hit: Icd10SearchHit) => {
    if (disabled) return;
    const description = icd10HitDescription(hit);
    if (
      isDuplicateDischargeDiagnosis(
        { code: hit.code, description },
        selectedDiagnoses
      )
    ) {
      return;
    }
    onSelect(hit, description);
    setSearchQ("");
    setSearchHits([]);
    setActiveIndex(-1);
    setListOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const action = interpretIcd10SearchKeyDown({
      key: e.key,
      activeIndex,
      hitCount: searchHits.length,
      listOpen: listOpen && searchHits.length > 0,
    });
    if (action.type === "none") return;
    e.preventDefault();
    if (action.type === "close") {
      setListOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (action.type === "move") {
      setActiveIndex(action.nextIndex);
      setListOpen(true);
      return;
    }
    if (action.type === "select") {
      const hit = searchHits[action.index];
      if (hit) pick(hit);
    }
  };

  const showList = listOpen && (searchHits.length > 0 || searchFetchFailed || (!searching && searchQ.trim().length >= 2));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 240, flex: 1 }} data-testid={testId}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block" }}>
        {label}
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          disabled={!!disabled}
          aria-autocomplete="list"
          aria-expanded={showList}
          style={{
            display: "block",
            marginTop: 6,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
          }}
        />
      </label>
      {searching ? <div style={{ fontSize: 13, color: "#64748b" }}>{searchingLabel}</div> : null}
      {showList ? (
        <ul
          role="listbox"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          {searchFetchFailed ? (
            <li style={{ padding: "10px 12px", fontSize: 13, color: "#b45309" }}>{searchFailedLabel}</li>
          ) : null}
          {!searching && !searchFetchFailed && searchQ.trim().length >= 2 && searchHits.length === 0 ? (
            <li style={{ padding: "10px 12px", fontSize: 13, color: "#64748b" }}>{noResultsLabel}</li>
          ) : null}
          {searchHits.map((h, index) => {
            const oneLine = formatIcd10ServerResolvedOneLineDisplay({
              code: h.code,
              displayLabel: h.displayLabel,
              displayResolution: h.displayResolution,
            });
            const already = isDuplicateDischargeDiagnosis(
              { code: h.code, description: icd10HitDescription(h) },
              selectedDiagnoses
            );
            const active = index === activeIndex;
            return (
              <li key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={!!disabled || already}
                  onClick={() => pick(h)}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: active ? "#f1f5f9" : "transparent",
                    cursor: disabled || already ? "not-allowed" : "pointer",
                    fontSize: 13,
                    opacity: already ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#0f172a",
                      fontSize: 14,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {oneLine.primary}
                  </div>
                  {oneLine.metadata || already ? (
                    <div style={{ color: "#475569", marginTop: 2, fontSize: 12, fontWeight: 400 }}>
                      {[oneLine.metadata, already ? alreadyAddedLabel : null].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  {nonBillableLabel && !h.isBillable ? (
                    <div style={{ fontSize: 11, color: "#b45309", marginTop: 4 }}>{nonBillableLabel}</div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
