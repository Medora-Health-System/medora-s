/**
 * D4A.2.7C — Rapid clinical documentation primitives.
 * Structured codes + localized labels via i18n. No silent confirmation defaults.
 */

"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  applyMutuallyExclusiveSelection,
  type ClinicalRapidOptionV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveNursingAdmissionOptionLabel } from "../nursingAdmissionOptionI18n";

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

const chipDisabled: CSSProperties = {
  ...chipBase,
  opacity: 0.55,
  cursor: "not-allowed",
};

export type ClinicalOption = { code: string; label: string };

function optionLabel(
  opt: ClinicalRapidOptionV1 | ClinicalOption,
  language: string,
  t: (key: string) => string
): string {
  const catalog = resolveNursingAdmissionOptionLabel(t, opt.code);
  if (catalog !== opt.code) return catalog;
  if ("displayFr" in opt && "display" in opt) {
    return String(language ?? "").toLowerCase().startsWith("fr") ? opt.displayFr : opt.display;
  }
  return opt.label;
}

function toClinicalOptions(
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[],
  language: string,
  t: (key: string) => string
): ClinicalOption[] {
  return options.map((o) => ({ code: o.code, label: optionLabel(o, language, t) }));
}

export function ClinicalSingleSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  readOnly,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { language, t } = useI18n();
  const opts = toClinicalOptions(options, language, t);
  const locked = disabled || readOnly;
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={locked}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {opts.map((opt) => {
          const on = value === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => onChange(on ? null : opt.code)}
              style={locked ? chipDisabled : on ? chipSelected : chipBase}
            >
              {opt.label}
            </button>
          );
        })}
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
  readOnly,
  respectMutualExclusion = true,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  respectMutualExclusion?: boolean;
}) {
  const { language, t } = useI18n();
  const opts = toClinicalOptions(options, language, t);
  const locked = disabled || readOnly;
  const selected = new Set(value);
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</div>
      <div role="group" aria-label={label} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {opts.map((opt) => {
          const on = selected.has(opt.code);
          return (
            <button
              key={opt.code}
              type="button"
              disabled={locked}
              aria-pressed={on}
              onClick={() => {
                if (locked) return;
                if (respectMutualExclusion && options.some((o) => "mutuallyExclusiveWith" in o)) {
                  onChange(
                    applyMutuallyExclusiveSelection(
                      options as readonly ClinicalRapidOptionV1[],
                      value,
                      opt.code
                    )
                  );
                } else if (on) {
                  onChange(value.filter((c) => c !== opt.code));
                } else {
                  onChange([...value, opt.code]);
                }
              }}
              style={locked ? chipDisabled : on ? chipSelected : chipBase}
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
  readOnly,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  if (multi) {
    return (
      <ClinicalMultiSelectChips
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  }
  return (
    <ClinicalSingleSelect
      label={label}
      options={options}
      value={value[0] ?? null}
      onChange={(code) => onChange(code ? [code] : [])}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export function ClinicalYesNoUnknown({
  label,
  value,
  onChange,
  disabled,
  readOnly,
  name,
}: {
  label: string;
  value: "YES" | "NO" | "UNKNOWN" | null;
  onChange: (next: "YES" | "NO" | "UNKNOWN") => void;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
}) {
  const { t } = useI18n();
  const locked = disabled || readOnly;
  const opts: Array<"YES" | "NO" | "UNKNOWN"> = ["YES", "NO", "UNKNOWN"];
  const labels = {
    YES: t("inpatientRapidConvergenceD4a27c.yes"),
    NO: t("inpatientRapidConvergenceD4a27c.no"),
    UNKNOWN: t("inpatientRapidConvergenceD4a27c.unknown"),
  };
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={locked}>
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
            disabled={locked}
            onClick={() => onChange(o)}
            style={locked ? chipDisabled : value === o ? chipSelected : chipBase}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ClinicalNormalExceptionSelector({
  label,
  value,
  onChange,
  exceptionText,
  onExceptionTextChange,
  disabled,
  readOnly,
}: {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  exceptionText?: string;
  onExceptionTextChange?: (text: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const codes = [
    "WITHIN_EXPECTED_LIMITS",
    "NO_ACUTE_CONCERN",
    "DENIES",
    "NOT_PRESENT",
    "NO_CHANGE_FROM_PRIOR",
    "EXCEPTION",
    "UNABLE_TO_ASSESS",
    "NOT_APPLICABLE",
  ] as const;
  return (
    <div>
      <ClinicalSingleSelect
        label={label}
        options={codes.map((code) => ({
          code,
          label: t(`inpatientRapidConvergenceD4a27c.normalException.${code}`),
        }))}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
      />
      {value === "EXCEPTION" && onExceptionTextChange ? (
        <ClinicalConditionalText
          label={t("inpatientRapidConvergenceD4a27c.exceptionDetail")}
          value={exceptionText ?? ""}
          onChange={onExceptionTextChange}
          disabled={disabled || readOnly}
          visible
        />
      ) : null}
    </div>
  );
}

export function ClinicalStatusSelector({
  label,
  options,
  value,
  onChange,
  disabled,
  readOnly,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <ClinicalSingleSelect
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export function ClinicalDateTimeField({
  label,
  value,
  onChange,
  disabled,
  readOnly,
  mode = "datetime",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: "date" | "datetime";
}) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155" }}>
      {label}
      <input
        type={mode === "date" ? "date" : "datetime-local"}
        value={value}
        disabled={disabled || readOnly}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          marginTop: 6,
          maxWidth: 280,
          fontSize: 13,
          padding: "7px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
        }}
      />
    </label>
  );
}

export function ClinicalNumericField({
  label,
  value,
  onChange,
  disabled,
  readOnly,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155" }}>
      {label}
      {unit ? <span style={{ fontWeight: 500, color: "#64748b" }}> ({unit})</span> : null}
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled || readOnly}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        style={{
          display: "block",
          marginTop: 6,
          maxWidth: 160,
          fontSize: 13,
          padding: "7px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
        }}
      />
    </label>
  );
}

export function ClinicalSearchSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  readOnly,
  placeholder,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  const { language, t } = useI18n();
  const [q, setQ] = useState("");
  const opts = toClinicalOptions(options, language, t);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return opts.slice(0, 40);
    return opts.filter(
      (o) => o.label.toLowerCase().includes(needle) || o.code.toLowerCase().includes(needle)
    );
  }, [opts, q]);
  const selected = opts.find((o) => o.code === value);
  const locked = disabled || readOnly;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</div>
      {selected ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <span style={chipSelected}>{selected.label}</span>
          {!locked ? (
            <button type="button" style={chipBase} onClick={() => onChange(null)}>
              {t("inpatientRapidConvergenceD4a27c.clear")}
            </button>
          ) : null}
        </div>
      ) : null}
      {!locked ? (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder ?? t("inpatientRapidConvergenceD4a27c.search")}
            style={{
              width: "100%",
              maxWidth: 420,
              fontSize: 13,
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              marginBottom: 6,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflow: "auto" }}>
            {filtered.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  onChange(opt.code);
                  setQ("");
                }}
                style={chipBase}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ClinicalQuickPhrasePicker({
  label,
  phrases,
  onInsert,
  disabled,
  readOnly,
}: {
  label: string;
  phrases: readonly { code: string; label: string }[];
  onInsert: (phrase: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const locked = disabled || readOnly;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {phrases.map((p) => (
          <button
            key={p.code}
            type="button"
            disabled={locked}
            onClick={() => onInsert(p.label)}
            style={locked ? chipDisabled : chipBase}
          >
            {p.label}
          </button>
        ))}
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
  readOnly,
}: {
  label: string;
  active: boolean;
  reason: string;
  onToggle: (next: boolean) => void;
  onReasonChange: (reason: string) => void;
  reasonRequired?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const locked = disabled || readOnly;
  return (
    <div>
      <button
        type="button"
        disabled={locked}
        aria-pressed={active}
        onClick={() => onToggle(!active)}
        style={locked ? chipDisabled : active ? chipSelected : chipBase}
      >
        {label || t("inpatientRapidConvergenceD4a27c.unableToAssess")}
      </button>
      {active ? (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, color: "#64748b", display: "block" }}>
            {reasonRequired ? "* " : ""}
            {t("inpatientRapidConvergenceD4a27c.unableReason")}
            <input
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={locked}
              style={{
                display: "block",
                width: "100%",
                maxWidth: 420,
                marginTop: 4,
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
  readOnly,
}: {
  label: string;
  active: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const locked = disabled || readOnly;
  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={active}
      onClick={() => onToggle(!active)}
      style={locked ? chipDisabled : active ? chipSelected : chipBase}
    >
      {label || t("inpatientRapidConvergenceD4a27c.notApplicable")}
    </button>
  );
}

export function ClinicalConditionalText({
  label,
  value,
  onChange,
  visible,
  disabled,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  visible: boolean;
  disabled?: boolean;
  rows?: number;
}) {
  if (!visible) return null;
  return (
    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 8 }}>
      {label}
      <textarea
        value={value}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          maxWidth: 520,
          marginTop: 6,
          fontSize: 13,
          padding: "7px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
        }}
      />
    </label>
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
      data-testid="clinical-completion-footer"
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
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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

export function ClinicalSectionSummary({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; value: string }[];
}) {
  return (
    <div
      data-testid="clinical-section-summary"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "10px 12px",
        background: "#fff",
        marginBottom: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155" }}>
        {items.map((it) => (
          <li key={it.label}>
            <strong>{it.label}</strong>: {it.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClinicalCarryForwardReview({
  priorLabel,
  priorValue,
  currentLabel,
  currentValue,
  confirmed,
  onConfirm,
  disabled,
  readOnly,
}: {
  priorLabel: string;
  priorValue: string;
  currentLabel: string;
  currentValue: string;
  confirmed: boolean;
  onConfirm: (next: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const locked = disabled || readOnly;
  return (
    <div
      data-testid="clinical-carry-forward-review"
      style={{
        border: "1px solid #fde68a",
        background: "#fffbeb",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 10,
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#92400e" }}>
        {t("inpatientRapidConvergenceD4a27c.carryForward.noSilent")}
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 12 }}>
        <strong>{priorLabel}</strong>: {priorValue}
      </p>
      <p style={{ margin: "0 0 8px", fontSize: 12 }}>
        <strong>{currentLabel}</strong>: {currentValue}
      </p>
      <label style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={locked}
          onChange={(e) => onConfirm(e.target.checked)}
        />
        {t("inpatientRapidConvergenceD4a27c.carryForward.confirm")}
      </label>
    </div>
  );
}

export function ClinicalExceptionList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: readonly string[];
  emptyLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div data-testid="clinical-exception-list">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {emptyLabel ?? t("inpatientRapidConvergenceD4a27c.noExceptions")}
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      )}
    </div>
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

export function ClinicalSaveStatus({
  code,
  savedAt,
  language,
}: {
  code: string;
  savedAt?: string | null;
  language?: string;
}) {
  const { t } = useI18n();
  const time =
    savedAt &&
    new Date(savedAt).toLocaleTimeString(language?.startsWith("fr") ? "fr-FR" : "en-US");
  const label =
    code === "SAVED" && time
      ? t("inpatientRapidConvergenceD4a27c.saveStatus.SAVED_AT").replace("{time}", time)
      : t(`inpatientRapidConvergenceD4a27c.saveStatus.${code}`);
  return (
    <span data-testid="clinical-save-status" style={{ fontSize: 12, color: "#64748b" }}>
      {label}
    </span>
  );
}

const iconCardBase: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  minWidth: 88,
  minHeight: 72,
  maxWidth: 145,
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
  textAlign: "center",
  lineHeight: 1.2,
};

const iconCardSource: CSSProperties = {
  ...iconCardBase,
  minWidth: 118,
  maxWidth: 145,
  minHeight: 76,
};

const iconCardArrival: CSSProperties = {
  ...iconCardBase,
  minWidth: 88,
  maxWidth: 108,
  minHeight: 72,
};

export function ClinicalIconCardSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  readOnly,
  renderIcon,
  testId,
  allowDeselect = false,
  density = "arrival",
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  renderIcon: (code: string) => ReactNode;
  testId?: string;
  allowDeselect?: boolean;
  density?: "source" | "arrival";
}) {
  const { language, t } = useI18n();
  const opts = toClinicalOptions(options, language, t);
  const locked = disabled || readOnly;
  const base = density === "source" ? iconCardSource : iconCardArrival;
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={locked}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        data-testid={testId}
        style={{
          display: "grid",
          gridTemplateColumns:
            density === "source"
              ? "repeat(auto-fill, minmax(118px, 1fr))"
              : "repeat(auto-fill, minmax(88px, 1fr))",
          gap: 8,
        }}
      >
        {opts.map((opt) => {
          const on = value === opt.code;
          const style: CSSProperties = locked
            ? { ...base, opacity: 0.55, cursor: "not-allowed" }
            : on
              ? {
                  ...base,
                  borderColor: "#0f766e",
                  background: "#ccfbf1",
                  color: "#115e59",
                  fontWeight: 700,
                  boxShadow: "inset 0 0 0 1px #0f766e",
                }
              : {
                  ...base,
                  cursor: "pointer",
                };
          return (
            <button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={on}
              aria-pressed={on}
              aria-label={opt.label}
              disabled={locked}
              data-testid={testId ? `${testId}-${opt.code}` : undefined}
              onClick={() => onChange(on && allowDeselect ? null : opt.code)}
              onMouseEnter={(e) => {
                if (locked || on) return;
                e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (locked || on) return;
                e.currentTarget.style.background = "#fff";
              }}
              style={style}
            >
              {renderIcon(opt.code)}
              <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const CONDITION_SEMANTIC: Record<string, { bg: string; border: string; color: string }> = {
  STABLE: { bg: "#ecfdf5", border: "#86efac", color: "#065f46" },
  GUARDED: { bg: "#fefce8", border: "#fde047", color: "#854d0e" },
  SERIOUS: { bg: "#fff7ed", border: "#fdba74", color: "#9a3412" },
  CRITICAL: { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b" },
  UNABLE_TO_DETERMINE: { bg: "#f8fafc", border: "#cbd5e1", color: "#475569" },
};

export function ClinicalSemanticSingleSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  readOnly,
}: {
  label: string;
  options: readonly (ClinicalRapidOptionV1 | ClinicalOption)[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const { language, t } = useI18n();
  const opts = toClinicalOptions(options, language, t);
  const locked = disabled || readOnly;
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={locked}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        data-testid="clinical-semantic-condition"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
      >
        {opts.map((opt) => {
          const on = value === opt.code;
          const sem = CONDITION_SEMANTIC[opt.code] ?? CONDITION_SEMANTIC.UNABLE_TO_DETERMINE;
          const style: CSSProperties = locked
            ? chipDisabled
            : on
              ? {
                  ...chipBase,
                  borderColor: sem.border,
                  background: sem.bg,
                  color: sem.color,
                  fontWeight: 700,
                }
              : {
                  ...chipBase,
                  borderColor: sem.border,
                  background: "#fff",
                  color: sem.color,
                };
          return (
            <button
              key={opt.code}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => onChange(on ? null : opt.code)}
              style={style}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ClinicalPainScoreSelector({
  label,
  value,
  onChange,
  disabled,
  readOnly,
  visible = true,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  disabled?: boolean;
  readOnly?: boolean;
  visible?: boolean;
}) {
  const locked = disabled || readOnly;
  if (!visible) return null;
  const scores = Array.from({ length: 11 }, (_, i) => i);
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }} disabled={locked}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        data-testid="clinical-pain-score-selector"
        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
      >
        {scores.map((n) => {
          const on = value === n;
          const hot = n >= 7;
          const warm = n >= 4 && n < 7;
          const tone = hot ? "#991b1b" : warm ? "#9a3412" : "#334155";
          const bg = on ? (hot ? "#fef2f2" : warm ? "#fff7ed" : "#ccfbf1") : "#fff";
          const border = on ? (hot ? "#fca5a5" : warm ? "#fdba74" : "#0f766e") : "#cbd5e1";
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              data-testid={`pain-score-${n}`}
              onClick={() => onChange(on ? null : n)}
              style={{
                ...chipBase,
                minWidth: 36,
                justifyContent: "center",
                borderColor: border,
                background: bg,
                color: tone,
                fontWeight: on ? 700 : 500,
                opacity: locked ? 0.55 : 1,
                cursor: locked ? "not-allowed" : "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
