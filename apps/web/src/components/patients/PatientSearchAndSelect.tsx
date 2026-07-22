"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  calculateAgeYearsFromDob,
  formatPatientLegalName,
  normalizePatientSearchList,
  patientSearchQueryIsEligible,
  type PatientSearchHitV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

export type PatientSearchAndSelectProps = {
  facilityId: string | null | undefined;
  /** Debounced auto-search (admission). Registration may set false and use searchOnSubmit. */
  autoSearch?: boolean;
  debounceMs?: number;
  limit?: number;
  selectedPatientId?: string | null;
  onSelect: (patient: PatientSearchHitV1) => void;
  onClearSelection?: () => void;
  /** When true, editing the query after a selection clears selection. */
  clearSelectionOnQueryChange?: boolean;
  placeholder?: string;
  label?: string;
  showSearchButton?: boolean;
  testIdPrefix?: string;
  /** Optional encounter advisories keyed by patient id. */
  advisoriesByPatientId?: Record<
    string,
    Array<"OPEN_ED" | "OPEN_INPATIENT" | "ACTIVE_ADMISSION_INTENT" | "PENDING_PLACEMENT">
  >;
};

/**
 * Shared authoritative patient search + explicit selection.
 * Used by Registration and Hospital Admission Intake (D4A.0).
 * Typed text is never patient identity.
 */
export function PatientSearchAndSelect({
  facilityId,
  autoSearch = true,
  debounceMs = 300,
  limit = 12,
  selectedPatientId = null,
  onSelect,
  onClearSelection,
  clearSelectionOnQueryChange = true,
  placeholder,
  label,
  showSearchButton = false,
  testIdPrefix = "patient-search",
  advisoriesByPatientId,
}: PatientSearchAndSelectProps) {
  const { t } = useI18n();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientSearchHitV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const requestSeq = useRef(0);
  const selectedAtQueryRef = useRef<string | null>(null);
  const dash = t("common.dash") || DISPLAY_DASH;

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!patientSearchQueryIsEligible(q) || !facilityId) {
      setHits([]);
      setSearched(false);
      setError(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(
        `/patients/search?q=${encodeURIComponent(q)}&limit=${limit}`,
        { facilityId }
      );
      if (seq !== requestSeq.current) return;
      setHits(normalizePatientSearchList(data).slice(0, limit));
      setSearched(true);
    } catch {
      if (seq !== requestSeq.current) return;
      setHits([]);
      setSearched(true);
      setError(t("hospitalAdmissionD4a0.search.error"));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoSearch) return;
    if (!patientSearchQueryIsEligible(query)) {
      setHits([]);
      setSearched(false);
      return;
    }
    const handle = window.setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounce on query/facility
  }, [query, facilityId, autoSearch, debounceMs, limit]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    if (
      clearSelectionOnQueryChange &&
      selectedPatientId &&
      selectedAtQueryRef.current != null &&
      next.trim() !== selectedAtQueryRef.current
    ) {
      onClearSelection?.();
    }
  };

  const pick = (p: PatientSearchHitV1) => {
    selectedAtQueryRef.current = formatPatientLegalName(p);
    setQuery(formatPatientLegalName(p));
    setHits([]);
    setSearched(false);
    onSelect(p);
  };

  const eligible = patientSearchQueryIsEligible(query);

  return (
    <div data-testid={`${testIdPrefix}-root`}>
      <label style={labelStyle} htmlFor={inputId}>
        {label ?? t("hospitalAdmissionD4a0.search.label")}
        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showSearchButton) {
                e.preventDefault();
                void runSearch(query);
              }
            }}
            placeholder={placeholder ?? t("hospitalAdmissionD4a0.search.placeholder")}
            style={{ ...fieldStyle, flex: "1 1 200px", marginTop: 0 }}
            data-testid={`${testIdPrefix}-input`}
            autoComplete="off"
          />
          {showSearchButton ? (
            <button
              type="button"
              onClick={() => void runSearch(query)}
              disabled={loading || !eligible}
              style={buttonStyle}
              data-testid={`${testIdPrefix}-submit`}
            >
              {loading
                ? t("hospitalAdmissionD4a0.search.searching")
                : t("hospitalAdmissionD4a0.search.search")}
            </button>
          ) : null}
        </div>
      </label>

      {!eligible && query.trim().length > 0 ? (
        <p style={hintStyle} data-testid={`${testIdPrefix}-min-chars`}>
          {t("hospitalAdmissionD4a0.search.minChars")}
        </p>
      ) : null}

      {loading && autoSearch ? (
        <p style={hintStyle} data-testid={`${testIdPrefix}-loading`}>
          {t("common.loading")}
        </p>
      ) : null}

      {error ? (
        <p style={{ ...hintStyle, color: "#b91c1c" }} role="alert" data-testid={`${testIdPrefix}-error`}>
          {error}
        </p>
      ) : null}

      {searched && !loading && !error && hits.length === 0 ? (
        <div style={emptyBox} data-testid={`${testIdPrefix}-empty`}>
          <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
            {t("hospitalAdmissionD4a0.search.noResults")}
          </p>
        </div>
      ) : null}

      {hits.length > 0 ? (
        <ul
          style={{ listStyle: "none", margin: "0 0 10px", padding: 0 }}
          data-testid={`${testIdPrefix}-results`}
        >
          {hits.map((p) => {
            const age = calculateAgeYearsFromDob(p.dob ?? null);
            const sex = String(p.sexAtBirth ?? p.sex ?? "").trim();
            const advisories = advisoriesByPatientId?.[p.id] ?? [];
            const loc = [p.city, p.stateProvince].filter(Boolean).join(", ");
            return (
              <li key={p.id} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  data-testid={`${testIdPrefix}-hit-${p.id}`}
                  style={{
                    ...fieldStyle,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    background: selectedPatientId === p.id ? "#ecfeff" : "#fff",
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {formatPatientLegalName(p) || dash}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t("hospitalAdmissionD4a0.search.dob")}:{" "}
                    {p.dob ? String(p.dob).slice(0, 10) : dash}
                    {age != null
                      ? ` · ${age}-${t("hospitalAdmissionD4a0.search.yearOld")} ${sex || dash}`
                      : sex
                        ? ` · ${sex}`
                        : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t("hospitalAdmissionD4a0.search.mrn")}: {p.mrn ?? dash}
                  </div>
                  {p.phone ? (
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {t("hospitalAdmissionD4a0.search.phone")}: {p.phone}
                    </div>
                  ) : null}
                  {loc ? (
                    <div style={{ fontSize: 12, color: "#64748b" }}>{loc}</div>
                  ) : null}
                  {advisories.length > 0 ? (
                    <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {advisories.map((a) => (
                        <span key={a} style={badgeStyle}>
                          {t(`hospitalAdmissionD4a0.advisory.${a}`)}
                        </span>
                      ))}
                    </div>
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

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 10,
};

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  backgroundColor: "#1565c0",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const hintStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  color: "#64748b",
};

const emptyBox: CSSProperties = {
  marginBottom: 10,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 9999,
  background: "#fffbeb",
  color: "#92400e",
  border: "1px solid #fcd34d",
};
