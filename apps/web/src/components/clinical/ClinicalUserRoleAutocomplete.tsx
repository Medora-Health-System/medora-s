"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 320;

export type ClinicalUserRoleOption = {
  id: string;
  firstName: string;
  lastName: string;
  credentials?: string;
  departmentName?: string;
};

export function formatClinicalUserRoleLabel(u: ClinicalUserRoleOption): string {
  const name = `${u.firstName} ${u.lastName}`.trim();
  const cred = u.credentials?.trim();
  const withCred = cred ? `${name}, ${cred}` : name;
  return withCred || u.id;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type Props = {
  facilityId: string;
  role: "PROVIDER" | "RN";
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  /** Controlled input text (e.g. recipient name). */
  displayValue: string;
  onChangeDisplay: (value: string) => void;
  selectedUserId: string | null;
  onSelectUser: (user: ClinicalUserRoleOption | null) => void;
};

export function ClinicalUserRoleAutocomplete({
  facilityId,
  role,
  disabled,
  placeholder,
  ariaLabel,
  displayValue,
  onChangeDisplay,
  selectedUserId,
  onSelectUser,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ClinicalUserRoleOption[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const term = q.trim();
      if (term.length < MIN_CHARS) {
        setCandidates([]);
        setSearchError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setSearchError(null);
      try {
        const qEnc = encodeURIComponent(term);
        const data = await apiFetch(`/roster/clinical-users?q=${qEnc}&role=${role}`, { facilityId });
        if (Array.isArray(data)) {
          setCandidates(
            data.map((row) => ({
              id: String((row as { id: unknown }).id),
              firstName: String((row as { firstName: unknown }).firstName ?? ""),
              lastName: String((row as { lastName: unknown }).lastName ?? ""),
              credentials: optionalString((row as { credentials?: unknown }).credentials),
              departmentName: optionalString((row as { departmentName?: unknown }).departmentName),
            }))
          );
        } else {
          setCandidates([]);
        }
      } catch {
        setCandidates([]);
        setSearchError(t("clinicalUserRoleAutocomplete.apiError"));
      } finally {
        setLoading(false);
      }
    },
    [facilityId, role]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || !open) return;
      if (ev.target instanceof Node && !el.contains(ev.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChangeDisplay(v);
    setSearchError(null);
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSearch(v);
    }, DEBOUNCE_MS);
  };

  const listStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 80,
    left: 0,
    right: 0,
    marginTop: 4,
    maxHeight: 220,
    overflowY: "auto",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: disabled ? "#f8fafc" : "#fff",
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={displayValue}
        onChange={onInputChange}
        onFocus={() => {
          setOpen(true);
          if (displayValue.trim().length >= MIN_CHARS) void runSearch(displayValue);
        }}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={`clinical-user-suggestions-${role}`}
        data-testid="clinical-user-role-autocomplete-input"
        style={inputStyle}
      />
      {open && !disabled ? (
        <div id={`clinical-user-suggestions-${role}`} role="listbox" style={listStyle}>
          {displayValue.trim().length < MIN_CHARS ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "#64748b" }}>
              {t("clinicalUserRoleAutocomplete.minCharsHint")}
            </div>
          ) : loading ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "#64748b" }}>
              {t("clinicalUserRoleAutocomplete.loading")}
            </div>
          ) : searchError ? (
            <div
              role="alert"
              data-testid="clinical-user-role-autocomplete-api-error"
              style={{ padding: "10px 12px", fontSize: 13, color: "#b91c1c" }}
            >
              {searchError}
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "#64748b" }}>
              {t("clinicalUserRoleAutocomplete.empty")}
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selectedUserId === c.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectUser(c);
                  setOpen(false);
                  setCandidates([]);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  fontSize: 13,
                  border: "none",
                  borderBottom: "1px solid #f1f5f9",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                {formatClinicalUserRoleLabel(c)}
                {c.departmentName ? (
                  <span style={{ display: "block", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                    {c.departmentName}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
