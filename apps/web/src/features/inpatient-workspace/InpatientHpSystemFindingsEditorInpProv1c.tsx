"use client";

/**
 * INP.PROV.1C — Compact ROS / Physical Exam system findings editor.
 * Replaces the gray ClinicalNormalExceptionSelector wall with editable rows
 * that persist through the canonical H&P section serializer.
 */

import { useState, type CSSProperties } from "react";
import { DictationFieldLabel } from "@/components/clinical/DictationFieldLabel";
import {
  clearInpatientHpSystems,
  inpatientHpSystemLabel,
  inpatientHpSystemsHasAnyContent,
  inpatientHpSystemsHasDocumentedSystems,
  type InpatientHpSystemFinding,
  type InpatientHpSystemStatus,
  type InpatientHpSystemsDocument,
  type InpatientHpSystemsKind,
  updateInpatientHpSystemFinding,
} from "./inpatientHpRosExamInpProv1c";

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 7.5rem) minmax(0, 5.5rem) minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "start",
  padding: "6px 8px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const BTN: CSSProperties = {
  padding: "5px 10px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const PRIMARY: CSSProperties = {
  ...BTN,
  borderColor: "#93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
};

const DANGER: CSSProperties = {
  ...BTN,
  borderColor: "#fcd34d",
  background: "#fffbeb",
  color: "#92400e",
};

function statusTone(status: InpatientHpSystemStatus): CSSProperties {
  if (status === "NEGATIVE" || status === "NORMAL") {
    return { color: "#047857", fontWeight: 700 };
  }
  if (status === "POSITIVE" || status === "ABNORMAL") {
    return { color: "#b45309", fontWeight: 700 };
  }
  return { color: "#64748b", fontWeight: 600 };
}

function statusDisplay(
  kind: InpatientHpSystemsKind,
  status: InpatientHpSystemStatus,
  labels: {
    negative: string;
    positive: string;
    normal: string;
    abnormal: string;
    notAssessed: string;
  }
): string {
  if (kind === "ROS") {
    if (status === "NEGATIVE") return labels.negative;
    if (status === "POSITIVE") return labels.positive;
    if (status === "NOT_ASSESSED") return labels.notAssessed;
    return "—";
  }
  if (status === "NORMAL") return labels.normal;
  if (status === "ABNORMAL") return labels.abnormal;
  if (status === "NOT_ASSESSED") return labels.notAssessed;
  return "—";
}

export function InpatientHpSystemFindingsEditorInpProv1c({
  kind,
  value,
  readOnly,
  labels,
  onChange,
  onApplyBulk,
  onClear,
}: {
  kind: InpatientHpSystemsKind;
  value: InpatientHpSystemsDocument;
  readOnly: boolean;
  labels: {
    /** Primary: fill undocumented only (preserves exceptions). */
    bulkAction: string;
    /** Secondary: destructive replace-all (requires confirm). */
    replaceAllAction: string;
    clear: string;
    replaceConfirm: string;
    additionalNotes: string;
    edit: string;
    negative: string;
    positive: string;
    normal: string;
    abnormal: string;
    notAssessed: string;
  };
  onChange: (next: InpatientHpSystemsDocument) => void;
  onApplyBulk: (replaceAll: boolean) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const testPrefix = kind === "ROS" ? "inp-prov-1c-ros" : "inp-prov-1c-exam";

  const handlePrimaryBulk = () => {
    if (readOnly) return;
    onApplyBulk(false);
  };

  const handleReplaceAll = () => {
    if (readOnly) return;
    if (!window.confirm(labels.replaceConfirm)) return;
    onApplyBulk(true);
  };

  const setFinding = (systemCode: string, patch: Partial<InpatientHpSystemFinding>) => {
    onChange(updateInpatientHpSystemFinding(value, systemCode, patch));
  };

  return (
    <div
      data-testid={testPrefix}
      style={{
        display: "grid",
        gap: 8,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {!readOnly ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            data-testid={`${testPrefix}-bulk`}
            onClick={handlePrimaryBulk}
            style={PRIMARY}
          >
            {labels.bulkAction}
          </button>
          {inpatientHpSystemsHasDocumentedSystems(value) ||
          value.additionalNotes.trim() ? (
            <button
              type="button"
              data-testid={`${testPrefix}-replace-all`}
              onClick={handleReplaceAll}
              style={DANGER}
            >
              {labels.replaceAllAction}
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`${testPrefix}-clear`}
            onClick={() => {
              if (!inpatientHpSystemsHasAnyContent(value)) return;
              if (!window.confirm(labels.replaceConfirm)) return;
              onClear();
            }}
            style={BTN}
          >
            {labels.clear}
          </button>
        </div>
      ) : null}

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {value.systems.map((row) => {
          const open = expanded === row.systemCode;
          const dictationId = `${testPrefix}-field-${row.systemCode}`;
          const label = inpatientHpSystemLabel(row.systemCode);
          return (
            <li key={row.systemCode} data-testid={`${testPrefix}-row-${row.systemCode}`} style={ROW}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0f172a",
                  overflowWrap: "anywhere",
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 12, ...statusTone(row.status) }}>
                {statusDisplay(kind, row.status, labels)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#334155",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  minWidth: 0,
                }}
              >
                {row.text.trim() || "—"}
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  data-testid={`${testPrefix}-edit-${row.systemCode}`}
                  onClick={() => setExpanded(open ? null : row.systemCode)}
                  style={BTN}
                >
                  {labels.edit}
                </button>
              ) : null}
              {open && !readOnly ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "grid",
                    gap: 6,
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: 8,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(kind === "ROS"
                      ? ([
                          ["NEGATIVE", labels.negative],
                          ["POSITIVE", labels.positive],
                          ["NOT_ASSESSED", labels.notAssessed],
                        ] as const)
                      : ([
                          ["NORMAL", labels.normal],
                          ["ABNORMAL", labels.abnormal],
                          ["NOT_ASSESSED", labels.notAssessed],
                        ] as const)
                    ).map(([status, statusLabel]) => (
                      <button
                        key={status}
                        type="button"
                        data-testid={`${testPrefix}-status-${row.systemCode}-${status}`}
                        onClick={() => setFinding(row.systemCode, { status })}
                        style={{
                          ...BTN,
                          ...(row.status === status ? PRIMARY : null),
                        }}
                      >
                        {statusLabel}
                      </button>
                    ))}
                  </div>
                  <DictationFieldLabel
                    label={label}
                    dictationTargetId={dictationId}
                    dictationLabel={label}
                    alignEnd
                    prominent
                  />
                  <textarea
                    id={dictationId}
                    data-testid={dictationId}
                    value={row.text}
                    rows={3}
                    onChange={(e) => setFinding(row.systemCode, { text: e.target.value })}
                    data-dictation-ready="true"
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      padding: "6px 8px",
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#475569", fontWeight: 600 }}>
        {labels.additionalNotes}
        <textarea
          data-testid={`${testPrefix}-additional`}
          value={value.additionalNotes}
          disabled={readOnly}
          rows={3}
          onChange={(e) => onChange({ ...value, additionalNotes: e.target.value })}
          style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            padding: "6px 8px",
            fontSize: 12,
            fontFamily: "inherit",
            fontWeight: 400,
            color: "#0f172a",
          }}
        />
      </label>
    </div>
  );
}

export function clearSystemsDocument(
  kind: InpatientHpSystemsKind,
  current: InpatientHpSystemsDocument
): InpatientHpSystemsDocument {
  return clearInpatientHpSystems(kind, true, current);
}
