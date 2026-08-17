"use client";

import type { ReactNode } from "react";

export type NursingBoardValue = string | number | boolean | string[] | undefined;
export type NursingBoardColumn = {
  id: string;
  occurredAt: string;
  status: string;
  author?: string;
  values: Readonly<Record<string, NursingBoardValue>>;
};
export type NursingBoardRow = {
  id: string;
  label: string;
  group: string;
  options?: readonly { value: string; label: string }[];
  kind?: "text" | "number" | "textarea";
};

function isSignificantFinding(row: NursingBoardRow, value: NursingBoardValue): boolean {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return false;
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  if (row.id === "painScore" && typeof value === "number" && value >= 4) return true;
  if (row.id === "fallRisk" && (raw === "HIGH" || raw === "MODERATE")) return true;
  return /CONCERN|HIGH|SEVERE|WORSENED|ABSENT|UNRESPONSIVE|CRITICAL|AIRWAY_CONCERN|SEVERELY_LABORED/.test(
    raw,
  );
}

/**
 * Care-setting-neutral bedside flowsheet. Layout/interaction only.
 * INP.1B.6 — sticky Clinical Finding column + sticky header row; horizontal scroll for assessments.
 * MEDUI.INP.2C.1 — restore compact dropdown documentation; full-width board (no competing rail).
 */
export function NursingDocumentationBoard({
  title,
  context,
  rows,
  columns,
  draft,
  draftTime,
  clinicalTimeValue,
  onClinicalTimeChange,
  clinicalTimeLabel,
  copiedFieldIds = new Set(),
  readOnly,
  busy,
  onChange,
  onNew,
  onCopyPrevious,
  onSave,
  onDiscard,
  summary,
  labels,
  copiedVerifyLabel,
}: {
  title: string;
  context?: ReactNode;
  rows: readonly NursingBoardRow[];
  columns: readonly NursingBoardColumn[];
  draft: Readonly<Record<string, NursingBoardValue>> | null;
  draftTime?: string;
  clinicalTimeValue?: string;
  onClinicalTimeChange?: (localValue: string) => void;
  clinicalTimeLabel?: string;
  copiedFieldIds?: ReadonlySet<string>;
  readOnly: boolean;
  busy?: boolean;
  onChange: (id: string, value: NursingBoardValue) => void;
  onNew: () => void;
  onCopyPrevious: () => void;
  onSave: () => void;
  onDiscard?: () => void;
  summary?: ReactNode;
  copiedVerifyLabel?: string;
  labels?: Partial<{
    clinicalFinding: string;
    noSaved: string;
    addColumn: string;
    copyPrevious: string;
    save: string;
    discard: string;
    notCharted: string;
    currentSaved: string;
    saved: string;
    draft: string;
    historical: string;
    summary: string;
  }>;
}) {
  const l = {
    clinicalFinding: "Clinical finding",
    noSaved: "No saved assessments",
    addColumn: "+ Add column",
    copyPrevious: "Copy previous",
    save: "Save assessment",
    discard: "Discard draft",
    notCharted: "Not charted",
    currentSaved: "CURRENT · SAVED",
    saved: "SAVED",
    draft: "ACTIVE DRAFT",
    historical: "HISTORICAL",
    summary: "Nursing Summary",
    ...labels,
  };
  const groups = [...new Set(rows.map((row) => row.group))];
  const allColumns = draft
    ? [...columns, { id: "draft", occurredAt: draftTime ?? new Date().toISOString(), status: "DRAFT", values: draft }]
    : columns;
  const columnCount = Math.max(allColumns.length, 1);
  const columnMinPx = 180;
  const gridTemplate = `minmax(200px, 220px) repeat(${columnCount}, minmax(${columnMinPx}px, ${columnMinPx}px))`;

  return (
    <section data-testid="nursing-documentation-board" style={{ display: "grid", gap: 14, width: "100%", minWidth: 0 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {context ? <div data-testid="nursing-board-context" style={{ color: "#475569", fontSize: 13 }}>{context}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {draft && !readOnly && onClinicalTimeChange ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
              <span>{clinicalTimeLabel ?? "Assessment date/time"}</span>
              <input
                data-testid="nursing-clinical-documented-at"
                type="datetime-local"
                value={clinicalTimeValue ?? ""}
                onChange={(event) => onClinicalTimeChange(event.target.value)}
              />
            </label>
          ) : null}
          {!readOnly && <button type="button" onClick={onNew}>{l.addColumn}</button>}
          {!readOnly && columns.length > 0 && <button type="button" onClick={onCopyPrevious}>{l.copyPrevious}</button>}
          {!readOnly && draft && onDiscard ? (
            <button type="button" data-testid="nursing-discard-draft" onClick={onDiscard} disabled={busy}>
              {l.discard}
            </button>
          ) : null}
          {!readOnly && draft && <button type="button" disabled={busy} onClick={onSave}>{l.save}</button>}
        </div>
      </header>
      {summary ? (
        <aside
          aria-label={l.summary}
          data-testid="nursing-summary-sidebar"
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "10px 14px",
            background: "#f8fafc",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{l.summary}</h3>
          {summary}
        </aside>
      ) : null}
      <div style={{ minWidth: 0, width: "100%" }}>
        <div data-testid="nursing-board-scroll" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: 8, WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "grid", gridTemplateColumns: gridTemplate, minWidth: 220 + columnCount * columnMinPx }}>
            <div style={{ ...headerCell, ...stickyLabel, ...stickyHeader, zIndex: 4 }} data-testid="nursing-clinical-finding-header">
              <strong>{l.clinicalFinding}</strong>
            </div>
            {allColumns.length === 0 ? (
              <div style={{ ...headerCell, ...stickyHeader, zIndex: 3 }}>{l.noSaved}</div>
            ) : (
              allColumns.map((column, index) => {
                const isDraft = column.id === "draft";
                const isCurrentSaved = !isDraft && index === columns.length - 1;
                return (
                  <div
                    key={column.id}
                    data-testid={isDraft ? "nursing-column-draft" : "nursing-column-historical"}
                    aria-readonly={!isDraft}
                    style={{
                      ...headerCell,
                      ...stickyHeader,
                      zIndex: 3,
                      background: isDraft ? "#e0f2fe" : "#f1f5f9",
                      borderTop: isDraft ? "3px solid #0284c7" : "3px solid transparent",
                      opacity: isDraft ? 1 : 0.92,
                    }}
                  >
                    <strong>{new Date(column.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                    <span>{new Date(column.occurredAt).toLocaleDateString()}</span>
                    <span style={{ color: isDraft ? "#0369a1" : "#64748b", fontWeight: 700 }}>
                      {isDraft ? l.draft : isCurrentSaved ? l.currentSaved : l.saved}
                    </span>
                    {!isDraft ? (
                      <span style={{ fontSize: 11, color: "#64748b" }}>{l.historical}</span>
                    ) : null}
                    {column.author && <span>{column.author}</span>}
                  </div>
                );
              })
            )}
            {groups.flatMap((group) => {
              const groupRows = rows.filter((row) => row.group === group);
              return [
                <div key={`${group}-heading`} style={{ ...groupCell, gridColumn: `1 / span ${Math.max(allColumns.length + 1, 2)}` }}>
                  {group}
                </div>,
                ...groupRows.flatMap((row) => [
                  <div key={`${row.id}-label`} data-testid={`nursing-finding-label-${row.id}`} style={{ ...labelCell, ...stickyLabel }}>
                    {row.label}
                  </div>,
                  ...(allColumns.length === 0
                    ? [<div key={`${row.id}-empty`} style={valueCell}>—</div>]
                    : allColumns.map((column) => {
                        const editable = column.id === "draft" && !readOnly;
                        const value = column.values[row.id];
                        const significant = isSignificantFinding(row, value);
                        const copied = editable && copiedFieldIds.has(row.id);
                        return (
                          <div
                            key={`${row.id}-${column.id}`}
                            data-significant={significant ? "true" : undefined}
                            style={{
                              ...valueCell,
                              background: editable ? "#f0f9ff" : "#fff",
                              borderLeft: significant ? "3px solid #c2410c" : undefined,
                              alignItems: "center",
                              flexDirection: "column",
                              padding: editable ? "6px 8px" : "0 8px",
                            }}
                          >
                            {editable ? (
                              <>
                                <BoardInput
                                  row={row}
                                  value={value}
                                  copied={copied}
                                  notCharted={l.notCharted}
                                  onChange={(next) => onChange(row.id, next)}
                                />
                                {copied && copiedVerifyLabel ? (
                                  <span
                                    data-testid={`nursing-copied-verify-${row.id}`}
                                    style={{ fontSize: 10, color: "#92400e", marginTop: 4, fontWeight: 600 }}
                                  >
                                    {copiedVerifyLabel}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span>
                                {displayValue(value, row)}
                                {significant ? (
                                  <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: "#c2410c" }}>●</span>
                                ) : null}
                              </span>
                            )}
                          </div>
                        );
                      })),
                ]),
              ];
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function BoardInput({
  row,
  value,
  copied,
  notCharted,
  onChange,
}: {
  row: NursingBoardRow;
  value: NursingBoardValue;
  copied: boolean;
  notCharted: string;
  onChange: (value: NursingBoardValue) => void;
}) {
  const style = {
    width: "100%",
    border: 0,
    padding: 8,
    background: copied ? "#fef3c7" : "transparent",
    boxSizing: "border-box" as const,
  };
  if (row.options) {
    return (
      <select
        data-testid={`nursing-select-${row.id}`}
        aria-label={row.label}
        style={style}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{notCharted}</option>
        {row.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (row.kind === "textarea") {
    return <textarea aria-label={row.label} style={{ ...style, minHeight: 70 }} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }
  return (
    <input
      aria-label={row.label}
      style={style}
      type={row.kind === "number" ? "number" : "text"}
      min={row.kind === "number" ? 0 : undefined}
      max={row.kind === "number" ? 10 : undefined}
      value={String(value ?? "")}
      onChange={(event) => onChange(row.kind === "number" && event.target.value ? Number(event.target.value) : event.target.value)}
    />
  );
}

function displayValue(value: NursingBoardValue, row: NursingBoardRow): string {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  const raw = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    row.options?.find((option) => option.value === raw)?.label ??
    raw.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
  );
}

const stickyLabel = {
  position: "sticky" as const,
  left: 0,
  zIndex: 2,
  background: "#fff",
  boxShadow: "2px 0 0 #e2e8f0",
};
const stickyHeader = {
  position: "sticky" as const,
  top: 0,
};
const headerCell = {
  padding: 10,
  borderRight: "1px solid #cbd5e1",
  borderBottom: "1px solid #cbd5e1",
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  fontSize: 12,
  background: "#f8fafc",
};
const groupCell = {
  padding: "7px 10px",
  background: "#e2e8f0",
  fontWeight: 800,
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: ".04em",
};
const labelCell = {
  padding: 8,
  borderRight: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 600,
  fontSize: 12,
};
const valueCell = {
  minHeight: 34,
  borderRight: "1px solid #e2e8f0",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  padding: "0 8px",
  fontSize: 12,
};
