/**
 * D4A.2.7B — Rapid clinical documentation primitives.
 * Structured codes + localized labels. No uncontrolled free-text as primary UX.
 */

"use client";

import type { CSSProperties, ReactNode } from "react";

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  minHeight: 36,
};

const chipSelected: CSSProperties = {
  ...chipBase,
  borderColor: "#0f766e",
  background: "#ccfbf1",
  color: "#115e59",
  fontWeight: 600,
};

export type ClinicalOption = { code: string; label: string };

export function ClinicalYesNoUnknown({
  label,
  value,
  onChange,
  disabled,
  name,
}: {
  label: string;
  value: "YES" | "NO" | "UNKNOWN" | null;
  onChange: (next: "YES" | "NO" | "UNKNOWN") => void;
  disabled?: boolean;
  name?: string;
}) {
  const opts: Array<"YES" | "NO" | "UNKNOWN"> = ["YES", "NO", "UNKNOWN"];
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={disabled}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            name={name}
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            style={value === o ? chipSelected : chipBase}
          >
            {o === "YES" ? "Oui / Yes" : o === "NO" ? "Non / No" : "Inconnu / Unknown"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ClinicalMultiSelectChips({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly ClinicalOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</div>
      <div role="group" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const on = selected.has(opt.code);
          return (
            <button
              key={opt.code}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => {
                if (on) onChange(value.filter((c) => c !== opt.code));
                else onChange([...value, opt.code]);
              }}
              style={on ? chipSelected : chipBase}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClinicalStickyNotePicker({
  label,
  options,
  value,
  onChange,
  multi = true,
  disabled,
}: {
  label: string;
  options: readonly ClinicalOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  disabled?: boolean;
}) {
  if (multi) {
    return (
      <ClinicalMultiSelectChips
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</div>
      <div role="radiogroup" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const on = value[0] === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={on}
              onClick={() => onChange([opt.code])}
              style={on ? chipSelected : chipBase}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ClinicalUnableToAssess({
  label,
  active,
  reason,
  onToggle,
  onReasonChange,
  reasonRequired,
  disabled,
}: {
  label: string;
  active: boolean;
  reason: string;
  onToggle: (next: boolean) => void;
  onReasonChange: (reason: string) => void;
  reasonRequired?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={active}
        onClick={() => onToggle(!active)}
        style={active ? chipSelected : chipBase}
      >
        {label}
      </button>
      {active ? (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block" }}>
            {reasonRequired ? "* " : ""}
            <input
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={disabled}
              style={{
                width: "100%",
                maxWidth: 420,
                fontSize: 13,
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function ClinicalNotApplicable({
  label,
  active,
  onToggle,
  disabled,
}: {
  label: string;
  active: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={() => onToggle(!active)}
      style={active ? chipSelected : chipBase}
    >
      {label}
    </button>
  );
}

export function ClinicalCompletionFooter({
  statusLabel,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  disabled,
  children,
}: {
  statusLabel: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <footer
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        marginTop: 16,
        padding: "10px 12px",
        borderTop: "1px solid #e2e8f0",
        background: "rgba(248,250,252,0.96)",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 12, color: "#64748b" }}>{statusLabel}</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {children}
        {secondaryLabel && onSecondary ? (
          <button
            type="button"
            onClick={onSecondary}
            disabled={disabled}
            style={{ ...chipBase, borderRadius: 10 }}
          >
            {secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimary}
          disabled={disabled}
          style={{ ...chipSelected, borderRadius: 10 }}
        >
          {primaryLabel}
        </button>
      </div>
    </footer>
  );
}

export function ClinicalAvailabilityBanner({
  state,
  message,
}: {
  state: string;
  message: string;
}) {
  const color =
    state === "AVAILABLE"
      ? "#065f46"
      : state === "LOADING"
        ? "#64748b"
        : state === "NO_DATA_DOCUMENTED" || state === "NOT_APPLICABLE"
          ? "#475569"
          : "#b91c1c";
  return (
    <p role="status" style={{ fontSize: 13, color, margin: "8px 0" }}>
      {message}
    </p>
  );
}
