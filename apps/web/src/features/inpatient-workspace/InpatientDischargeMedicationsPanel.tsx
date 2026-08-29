"use client";

/**
 * INP.DIS.1G — Provider discharge medication panel.
 * Reuses MedicationAutocomplete / catalog search. Not eRx transmission.
 */

import { useState, type CSSProperties } from "react";
import {
  INPATIENT_DISCHARGE_MED_RELATIONSHIPS,
  type InpatientDischargeMedicationLine1C,
  type InpatientDischargeMedRelationship,
} from "@medora/shared";
import { MedicationAutocomplete } from "@/components/pharmacy/MedicationAutocomplete";
import { medicationSearchLabel, type MedicationSearchItem } from "@/lib/pharmacyApi";
import { useI18n } from "@/lib/i18n";
import { fieldStyle, neutralBtn, dangerBtn } from "./dischargeBoardStyles";

const PREFIX = "inpatientDischargeBoardInpDis1f";

type Props = {
  facilityId: string | null;
  lines: InpatientDischargeMedicationLine1C[];
  disabled: boolean;
  onChange: (next: InpatientDischargeMedicationLine1C[]) => void;
};

function newId(): string {
  return `dmed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function InpatientDischargeMedicationsPanel({
  facilityId,
  lines,
  disabled,
  onChange,
}: Props) {
  const { t, language } = useI18n();
  const tp = (key: string) => t(`${PREFIX}.${key}`);
  const [draft, setDraft] = useState<Partial<InpatientDischargeMedicationLine1C>>({
    relationship: "NEW",
  });
  const [searchKey, setSearchKey] = useState(0);

  const onPick = (med: MedicationSearchItem) => {
    const displayName = medicationSearchLabel(med, language, t);
    const strength =
      typeof med.metadata?.strength === "string" ? med.metadata.strength : null;
    setDraft((prev) => ({
      ...prev,
      catalogMedicationId: med.id,
      displayName,
      dose: prev.dose || strength || "",
    }));
  };

  const addLine = () => {
    const name = (draft.displayName ?? "").trim();
    if (!name) return;
    const line: InpatientDischargeMedicationLine1C = {
      id: newId(),
      catalogMedicationId: draft.catalogMedicationId ?? null,
      displayName: name,
      dose: draft.dose?.trim() || null,
      unit: draft.unit?.trim() || null,
      route: draft.route?.trim() || null,
      frequency: draft.frequency?.trim() || null,
      duration: draft.duration?.trim() || null,
      quantity: draft.quantity?.trim() || null,
      refills:
        typeof draft.refills === "number" && Number.isFinite(draft.refills)
          ? draft.refills
          : null,
      instructions: draft.instructions?.trim() || null,
      relationship: (draft.relationship as InpatientDischargeMedRelationship) || "NEW",
    };
    onChange([...(lines ?? []), line]);
    setDraft({ relationship: "NEW" });
    setSearchKey((k) => k + 1);
  };

  const patchLine = (id: string, patch: Partial<InpatientDischargeMedicationLine1C>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <div data-testid="inp-dis-1g-discharge-meds" style={{ display: "grid", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14 }}>{tp("dischargeMeds.title")}</h3>
      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
        {tp("dischargeMeds.notTransmitted")}
      </p>
      {!disabled ? (
        <div style={addBox}>
          <MedicationAutocomplete
            key={searchKey}
            facilityId={facilityId}
            placeholder={tp("dischargeMeds.search")}
            onSelect={onPick}
            mode="prescribe"
            disabled={disabled}
          />
          <input
            style={fieldStyle}
            placeholder={tp("dischargeMeds.dose")}
            value={draft.dose ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, dose: e.target.value }))}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input
              style={fieldStyle}
              placeholder={tp("dischargeMeds.unit")}
              value={draft.unit ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
            />
            <input
              style={fieldStyle}
              placeholder={tp("dischargeMeds.route")}
              value={draft.route ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, route: e.target.value }))}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input
              style={fieldStyle}
              placeholder={tp("dischargeMeds.frequency")}
              value={draft.frequency ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, frequency: e.target.value }))}
            />
            <input
              style={fieldStyle}
              placeholder={tp("dischargeMeds.duration")}
              value={draft.duration ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <input
              style={fieldStyle}
              placeholder={tp("dischargeMeds.quantity")}
              value={draft.quantity ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
            />
            <input
              style={fieldStyle}
              type="number"
              min={0}
              placeholder={tp("dischargeMeds.refills")}
              value={draft.refills ?? ""}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  refills: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <input
            style={fieldStyle}
            placeholder={tp("dischargeMeds.instructions")}
            value={draft.instructions ?? ""}
            onChange={(e) => setDraft((p) => ({ ...p, instructions: e.target.value }))}
          />
          <select
            style={fieldStyle}
            value={draft.relationship ?? "NEW"}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                relationship: e.target.value as InpatientDischargeMedRelationship,
              }))
            }
          >
            {INPATIENT_DISCHARGE_MED_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {tp(`dischargeMeds.${r}`)}
              </option>
            ))}
          </select>
          <button type="button" style={neutralBtn} disabled={!draft.displayName?.trim()} onClick={addLine}>
            {tp("dischargeMeds.add")}
          </button>
        </div>
      ) : null}

      {(lines ?? []).length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{tp("dischargeMeds.empty")}</p>
      ) : (
        (lines ?? []).map((line) => (
          <div key={line.id} style={lineBox} data-testid="inp-dis-1g-discharge-med-line">
            <strong style={{ fontSize: 13 }}>{line.displayName}</strong>
            <span style={{ fontSize: 12, color: "#475569" }}>
              {[line.dose, line.unit, line.route, line.frequency].filter(Boolean).join(" · ")}
            </span>
            <select
              style={fieldStyle}
              disabled={disabled}
              value={line.relationship ?? "NEW"}
              onChange={(e) =>
                patchLine(line.id, {
                  relationship: e.target.value as InpatientDischargeMedRelationship,
                })
              }
            >
              {INPATIENT_DISCHARGE_MED_RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {tp(`dischargeMeds.${r}`)}
                </option>
              ))}
            </select>
            <input
              style={fieldStyle}
              disabled={disabled}
              placeholder={tp("dischargeMeds.instructions")}
              value={line.instructions ?? ""}
              onChange={(e) => patchLine(line.id, { instructions: e.target.value })}
            />
            {!disabled ? (
              <button
                type="button"
                style={dangerBtn}
                onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
              >
                {tp("dischargeMeds.remove")}
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

const addBox: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#f8fafc",
};
const lineBox: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: 8,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
};
