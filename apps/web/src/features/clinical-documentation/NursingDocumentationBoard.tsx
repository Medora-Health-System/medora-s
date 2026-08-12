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

/**
 * Care-setting-neutral bedside flowsheet. It owns layout and interaction only: callers provide
 * immutable columns, the active draft and all persistence/authorization callbacks.
 */
export function NursingDocumentationBoard({
  title,
  context,
  rows,
  columns,
  draft,
  draftTime,
  onDraftTimeChange,
  copiedFieldIds = new Set(),
  readOnly,
  busy,
  onChange,
  onNew,
  onCopyPrevious,
  onSave,
  summary,
  labels,
}: {
  title: string;
  context: ReactNode;
  rows: readonly NursingBoardRow[];
  columns: readonly NursingBoardColumn[];
  draft: Readonly<Record<string, NursingBoardValue>> | null;
  draftTime?: string;
  onDraftTimeChange?: (value: string) => void;
  copiedFieldIds?: ReadonlySet<string>;
  readOnly: boolean;
  busy?: boolean;
  onChange: (id: string, value: NursingBoardValue) => void;
  onNew: () => void;
  onCopyPrevious: () => void;
  onSave: () => void;
  summary?: ReactNode;
  labels?: Partial<{ clinicalFinding: string; noSaved: string; addColumn: string; copyPrevious: string; save: string; notCharted: string; currentSaved: string; saved: string; draft: string; summary: string; clinicalTime: string }>;
}) {
  const l = { clinicalFinding: "Clinical finding", noSaved: "No saved assessments", addColumn: "+ Add column", copyPrevious: "Copy previous", save: "Save assessment", notCharted: "Not charted", currentSaved: "CURRENT · SAVED", saved: "SAVED", draft: "DRAFT", summary: "Nursing Summary", clinicalTime: "Clinical date and time", ...labels };
  const groups = [...new Set(rows.map((row) => row.group))];
  const allColumns = draft
    ? [...columns, { id: "draft", occurredAt: draftTime ?? new Date().toISOString(), status: "DRAFT", values: draft }]
    : columns;
  const gridTemplate = `minmax(190px, 1.25fr) repeat(${Math.max(allColumns.length, 1)}, minmax(168px, 1fr))`;

  return (
    <section data-testid="nursing-documentation-board" style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0 }}>{title}</h2><div style={{ color: "#475569", fontSize: 13 }}>{context}</div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!readOnly && <button type="button" onClick={onNew}>{l.addColumn}</button>}
          {!readOnly && columns.length > 0 && <button type="button" onClick={onCopyPrevious}>{l.copyPrevious}</button>}
          {!readOnly && draft && <button type="button" disabled={busy} onClick={onSave}>{l.save}</button>}
        </div>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: summary ? "minmax(0, 1fr) minmax(230px, 290px)" : "1fr", gap: 14, alignItems: "start" }}>
        <div data-testid="nursing-board-scroll-viewport" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "72vh", border: "1px solid #cbd5e1", borderRadius: 8, position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: gridTemplate, minWidth: 190 + Math.max(allColumns.length, 1) * 168 }}>
            <div data-testid="clinical-finding-sticky-column" style={{ ...headerCell, ...stickyHeaderCell }}><strong>{l.clinicalFinding}</strong></div>
            {allColumns.length === 0 ? <div style={headerCell}>{l.noSaved}</div> : allColumns.map((column, index) => (
              <div key={column.id} style={{ ...headerCell, background: column.id === "draft" ? "#e0f2fe" : "#f8fafc" }}>
                {column.id === "draft" && onDraftTimeChange ? <label style={{ display: "grid", gap: 3 }}>{l.clinicalTime}<input aria-label={l.clinicalTime} type="datetime-local" value={toLocalDateTimeInput(column.occurredAt)} onChange={(event) => onDraftTimeChange(event.target.value)} /></label> : <>
                <strong>{new Date(column.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                <span>{new Date(column.occurredAt).toLocaleDateString()}</span>
                </>}
                <span style={{ color: column.id === "draft" ? "#0369a1" : "#475569", fontWeight: 700 }}>{column.id === "draft" ? l.draft : index === columns.length - 1 ? l.currentSaved : l.saved}</span>
                {column.author && <span>{column.author}</span>}
              </div>
            ))}
            {groups.flatMap((group) => {
              const groupRows = rows.filter((row) => row.group === group);
              return [
                <div key={`${group}-heading`} style={{ ...groupCell, gridColumn: `1 / span ${Math.max(allColumns.length + 1, 2)}`, position: "sticky", left: 0, zIndex: 3 }}>{group}</div>,
                ...groupRows.flatMap((row) => [
                  <div key={`${row.id}-label`} style={{ ...labelCell, position: "sticky", left: 0, zIndex: 2, background: "#fff" }}>{row.label}</div>,
                  ...(allColumns.length === 0 ? [<div key={`${row.id}-empty`} style={valueCell}>—</div>] : allColumns.map((column) => {
                    const editable = column.id === "draft" && !readOnly;
                    const value = column.values[row.id];
                    return <div key={`${row.id}-${column.id}`} style={{ ...valueCell, background: editable ? "#f0f9ff" : "#fff" }}>
                      {editable ? <BoardInput row={row} value={value} copied={copiedFieldIds.has(row.id)} notCharted={l.notCharted} onChange={(next) => onChange(row.id, next)} /> : <span>{displayValue(value, row)}</span>}
                    </div>;
                  })),
                ]),
              ];
            })}
          </div>
        </div>
        {summary && <aside aria-label={l.summary} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 14, position: "sticky", top: 12 }}><h3 style={{ marginTop: 0 }}>{l.summary}</h3>{summary}</aside>}
      </div>
    </section>
  );
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function BoardInput({ row, value, copied, notCharted, onChange }: { row: NursingBoardRow; value: NursingBoardValue; copied: boolean; notCharted: string; onChange: (value: NursingBoardValue) => void }) {
  const style = { width: "100%", border: 0, padding: 8, background: copied ? "#fef3c7" : "transparent", boxSizing: "border-box" as const };
  if (row.options) return <select aria-label={row.label} style={style} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}><option value="">{notCharted}</option>{row.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  if (row.kind === "textarea") return <textarea aria-label={row.label} style={{ ...style, minHeight: 70 }} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  return <input aria-label={row.label} style={style} type={row.kind === "number" ? "number" : "text"} min={row.kind === "number" ? 0 : undefined} max={row.kind === "number" ? 10 : undefined} value={String(value ?? "")} onChange={(event) => onChange(row.kind === "number" && event.target.value ? Number(event.target.value) : event.target.value)} />;
}

function displayValue(value: NursingBoardValue, row: NursingBoardRow): string {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  const raw = Array.isArray(value) ? value.join(", ") : String(value);
  return row.options?.find((option) => option.value === raw)?.label ?? raw.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

const headerCell = { padding: 10, borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1", display: "flex", flexDirection: "column" as const, gap: 2, fontSize: 12, background: "#f8fafc", position: "sticky" as const, top: 0, zIndex: 4 };
const stickyHeaderCell = { left: 0, zIndex: 6, boxShadow: "2px 0 0 #cbd5e1" };
const groupCell = { padding: "7px 10px", background: "#e2e8f0", fontWeight: 800, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: ".04em" };
const labelCell = { padding: 8, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", fontWeight: 600, fontSize: 12 };
const valueCell = { minHeight: 34, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 8px", fontSize: 12 };
