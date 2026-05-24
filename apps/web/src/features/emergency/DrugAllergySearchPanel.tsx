"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatMedicationOptionForLocale } from "@/lib/localizedMedicationDisplay";
import { searchCatalog } from "@/lib/catalogSearchApi";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import {
  DRUG_ALLERGY_REACTION_CODES,
  appendDrugAllergyLinesIfAbsent,
  formatDrugAllergyLine,
  selectedDrugAllergyFromCatalog,
  stripNkdaFromAllergyText,
  type DrugAllergyReactionCode,
  type SelectedDrugAllergy,
} from "./drugAllergyEntry";

const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 320;
const SEARCH_LIMIT = 12;

function ChipButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 9999,
        border: active ? "1px solid #166534" : "1px solid #cbd5e1",
        backgroundColor: active ? "#dcfce7" : "#fff",
        color: active ? "#166534" : "#334155",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function DrugAllergySearchPanel({
  facilityId,
  disabled,
  medicationAllergiesDetail,
  additionalAllergyInfo,
  allergyDetailSelections,
  onSaveAllergies,
}: {
  facilityId: string;
  disabled?: boolean;
  medicationAllergiesDetail: string;
  additionalAllergyInfo: string;
  allergyDetailSelections: string[];
  onSaveAllergies: (patch: {
    medicationAllergiesDetail: string;
    additionalAllergyInfo: string;
    allergyDetailSelections: string[];
  }) => void;
}) {
  const { t, language } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedDrugAllergy[]>([]);
  const [reactions, setReactions] = useState<DrugAllergyReactionCode[]>([]);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!facilityId.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const q = searchInput.trim();
    if (q.length < SEARCH_MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const reqId = ++reqRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const items = await searchCatalog(facilityId.trim(), "MEDICATION", {
            q,
            limit: SEARCH_LIMIT,
            purpose: "documentation",
          });
          if (reqRef.current === reqId) setResults(items);
        } catch {
          if (reqRef.current === reqId) setResults([]);
        } finally {
          if (reqRef.current === reqId) setLoading(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, facilityId]);

  const addSelection = useCallback(
    (item: CatalogSearchItem) => {
      const entry = selectedDrugAllergyFromCatalog(item, language, t);
      setSelected((prev) => {
        if (prev.some((p) => p.catalogId === entry.catalogId)) return prev;
        return [...prev, entry];
      });
      setSearchInput("");
      setResults([]);
    },
    [language, t]
  );

  const removeSelection = (catalogId: string) => {
    setSelected((prev) => prev.filter((p) => p.catalogId !== catalogId));
  };

  const toggleReaction = (code: DrugAllergyReactionCode) => {
    setReactions((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleSave = () => {
    if (selected.length === 0) return;
    const reactionCodes = reactions.length > 0 ? reactions : (["unknown"] as DrugAllergyReactionCode[]);
    const lines = selected.map((s) => formatDrugAllergyLine(s, reactionCodes, t));
    const nkdaLabel = t("erTriage.v1.chipsAllergyNkda");
    const cleanedAdditional = stripNkdaFromAllergyText(additionalAllergyInfo, nkdaLabel);
    const cleanedMedDetail = stripNkdaFromAllergyText(medicationAllergiesDetail, nkdaLabel);
    onSaveAllergies({
      medicationAllergiesDetail: appendDrugAllergyLinesIfAbsent(cleanedMedDetail, lines),
      additionalAllergyInfo: cleanedAdditional,
      allergyDetailSelections: allergyDetailSelections.filter((c) => c !== "NKDA"),
    });
    setSelected([]);
    setReactions([]);
    setSearchInput("");
    setResults([]);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
        {t("erTriage.drugAllergy.searchLabel")}
      </p>
      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        disabled={disabled}
        placeholder={t("erTriage.drugAllergy.searchPlaceholder")}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          fontSize: 14,
          boxSizing: "border-box",
          backgroundColor: disabled ? "#f8fafc" : "#fff",
        }}
      />
      {loading ? (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#94a3b8" }}>{t("erTriage.v1.medsCatalogSearching")}</p>
      ) : null}
      {results.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: "8px 0 0",
            padding: 0,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            maxHeight: 160,
            overflowY: "auto",
            backgroundColor: "#fff",
          }}
        >
          {results.map((item) => {
            const { primary, subtitle } = formatMedicationOptionForLocale(item, language, t);
            return (
              <li key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => addSelection(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    background: "transparent",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>{primary}</div>
                  {subtitle ? (
                    <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>{subtitle}</div>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {t("erTriage.drugAllergy.selectedLabel")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.map((s) => (
              <span
                key={s.catalogId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 9999,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  fontSize: 12,
                  color: "#1e3a8a",
                }}
              >
                {s.displayName}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSelection(s.catalogId)}
                  aria-label={t("erTriage.drugAllergy.removeSelected")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    color: "#1d4ed8",
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <p style={{ margin: "10px 0 6px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
            {t("erTriage.drugAllergy.reactionsLabel")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DRUG_ALLERGY_REACTION_CODES.map((code) => (
              <ChipButton
                key={code}
                label={t(`erTriage.drugAllergy.reactions.${code}`)}
                active={reactions.includes(code)}
                disabled={disabled}
                onClick={() => toggleReaction(code)}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleSave}
            style={{
              marginTop: 10,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#1a1a1a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {t("erTriage.drugAllergy.saveSelected")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
