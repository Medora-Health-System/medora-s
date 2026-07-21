"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  ALL_HOSPITAL_UNITS_SELECTION_ID,
  AWAITING_UNIT_ASSIGNMENT_SELECTION_ID,
  type HospitalUnitSelection,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import type { HospitalUnitRegistryUnit } from "./hospitalCareUnitsApi";

type Props = {
  units: HospitalUnitRegistryUnit[];
  awaitingAssignmentCount: number;
  selection: HospitalUnitSelection;
  onSelect: (selection: HospitalUnitSelection) => void;
  /** When true, hide Observation unit (Inpatient tab clinical scope). */
  inpatientScope?: boolean;
};

export function HospitalUnitTree({
  units,
  awaitingAssignmentCount,
  selection,
  onSelect,
  inpatientScope = false,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const visibleUnits = useMemo(() => {
    const scoped = inpatientScope
      ? units.filter((u) => u.acceptsInpatient && u.unitType !== "OBSERVATION")
      : units;
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        u.rooms.some(
          (r) =>
            r.code.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.beds.some((b) => b.name.toLowerCase().includes(q))
        )
    );
  }, [units, inpatientScope, query]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const u of visibleUnits) next[u.id] = true;
    setExpanded(next);
  };

  const collapseAll = () => setExpanded({});

  const isSelected = (sel: HospitalUnitSelection) => {
    if (selection.kind !== sel.kind) return false;
    if (sel.kind === "ALL" || sel.kind === "AWAITING") return true;
    if (sel.kind === "UNIT") return selection.unitCode === sel.unitCode;
    if (sel.kind === "ROOM") {
      return selection.unitCode === sel.unitCode && selection.roomCode === sel.roomCode;
    }
    if (sel.kind === "BED") return selection.bedKey === sel.bedKey;
    return false;
  };

  const onKeyActivate = (e: KeyboardEvent, sel: HospitalUnitSelection) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(sel);
    }
  };

  return (
    <aside
      style={{ ...MEDORA_CARD_SHELL, padding: 12, height: "100%" }}
      data-testid="hospital-unit-tree"
      aria-label={t("hospitalCareD3e6b.tree.aria")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {t("hospitalCareD3e6b.tree.title")}
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={linkBtn} onClick={expandAll}>
            {t("hospitalCareD3e6b.tree.expandAll")}
          </button>
          <button type="button" style={linkBtn} onClick={collapseAll}>
            {t("hospitalCareD3e6b.tree.collapseAll")}
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("hospitalCareD3e6b.tree.search")}
        aria-label={t("hospitalCareD3e6b.tree.search")}
        style={{ ...fieldStyle, width: "100%", marginBottom: 10 }}
      />

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <li>
          <button
            type="button"
            role="treeitem"
            aria-selected={isSelected({ kind: "ALL" })}
            onClick={() => onSelect({ kind: "ALL" })}
            onKeyDown={(e) => onKeyActivate(e, { kind: "ALL" })}
            style={unitCardStyle(isSelected({ kind: "ALL" }))}
            data-testid="unit-tree-all"
          >
            <span style={{ fontWeight: 700 }}>{t("hospitalCareD3e6b.tree.allUnits")}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {t("hospitalCareD3e6b.tree.allUnitsHint")}
            </span>
          </button>
        </li>

        {awaitingAssignmentCount > 0 || selection.kind === "AWAITING" ? (
          <li>
            <button
              type="button"
              role="treeitem"
              aria-selected={isSelected({ kind: "AWAITING" })}
              onClick={() => onSelect({ kind: "AWAITING" })}
              onKeyDown={(e) => onKeyActivate(e, { kind: "AWAITING" })}
              style={unitCardStyle(isSelected({ kind: "AWAITING" }))}
              data-testid="unit-tree-awaiting"
            >
              <span style={{ fontWeight: 700 }}>
                {t("hospitalCareD3e6b.tree.awaitingAssignment")}
              </span>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {awaitingAssignmentCount} {t("hospitalCareD3e6b.tree.patients")}
              </span>
            </button>
          </li>
        ) : null}

        {visibleUnits.map((unit) => {
          const open = Boolean(expanded[unit.id]);
          const unitSel: HospitalUnitSelection = {
            kind: "UNIT",
            unitId: unit.id,
            unitCode: unit.code,
          };
          const selected = isSelected(unitSel);
          return (
            <li key={unit.id}>
              <div style={unitCardStyle(selected)}>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={
                      open
                        ? t("hospitalCareD3e6b.tree.collapseUnit").replace("{name}", unit.name)
                        : t("hospitalCareD3e6b.tree.expandUnit").replace("{name}", unit.name)
                    }
                    onClick={() => setExpanded((prev) => ({ ...prev, [unit.id]: !open }))}
                    style={chevronBtn}
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <button
                    type="button"
                    role="treeitem"
                    aria-selected={selected}
                    onClick={() => onSelect(unitSel)}
                    onKeyDown={(e) => onKeyActivate(e, unitSel)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                    }}
                    data-testid={`unit-tree-${unit.code}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        fontWeight: 700,
                        color: "#0f172a",
                        fontSize: 13,
                      }}
                    >
                      <span>{unit.name}</span>
                      <span aria-label={t("hospitalCareD3e6b.tree.patientCount")}>
                        {unit.patientCount}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {formatBedCounts(unit, t)}
                      {unit.alertCount > 0
                        ? ` · ${unit.alertCount} ${t("hospitalCareD3e6b.tree.alerts")}`
                        : ""}
                    </div>
                  </button>
                </div>

                {open && unit.rooms.length > 0 ? (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: "8px 0 0",
                      padding: "0 0 0 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                    role="group"
                  >
                    {unit.rooms.map((room) => {
                      const roomSel: HospitalUnitSelection = {
                        kind: "ROOM",
                        unitId: unit.id,
                        unitCode: unit.code,
                        roomId: room.id,
                        roomCode: room.code,
                      };
                      return (
                        <li key={room.id}>
                          <button
                            type="button"
                            role="treeitem"
                            aria-selected={isSelected(roomSel)}
                            onClick={() => onSelect(roomSel)}
                            onKeyDown={(e) => onKeyActivate(e, roomSel)}
                            style={roomBtn(isSelected(roomSel))}
                            data-testid={`unit-tree-room-${unit.code}-${room.code}`}
                          >
                            {room.name}
                            {room.beds.some((b) => b.occupied) ? " · ●" : ""}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {open && unit.rooms.length === 0 ? (
                  <p style={{ margin: "8px 0 0 22px", fontSize: 11, color: "#94a3b8" }}>
                    {t("hospitalCareD3e6b.tree.noRooms")}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p style={{ margin: "12px 0 0", fontSize: 11, color: "#94a3b8" }}>
        {t("hospitalCareD3e6b.tree.noFloorHint")}
      </p>
    </aside>
  );
}

function formatBedCounts(
  unit: HospitalUnitRegistryUnit,
  t: (k: string) => string
): string {
  const occ =
    unit.occupiedBedCount == null
      ? t("hospitalCareD3e6b.counts.unavailable")
      : String(unit.occupiedBedCount);
  const avail =
    unit.availableBedCount == null
      ? t("hospitalCareD3e6b.counts.unavailable")
      : String(unit.availableBedCount);
  return `${occ} ${t("hospitalCareD3e6b.tree.occupied")} · ${avail} ${t("hospitalCareD3e6b.tree.available")}`;
}

function unitCardStyle(selected: boolean): CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
    borderRadius: 12,
    background: selected ? "#eff6ff" : "#fff",
    padding: 10,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };
}

function roomBtn(selected: boolean): CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    border: selected ? "1px solid #2563eb" : "1px solid transparent",
    borderRadius: 8,
    background: selected ? "#dbeafe" : "transparent",
    padding: "4px 8px",
    fontSize: 12,
    color: "#334155",
    cursor: "pointer",
  };
}

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 13,
};

const linkBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: 11,
  cursor: "pointer",
  padding: 0,
};

const chevronBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "0 2px",
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.4,
};

export { ALL_HOSPITAL_UNITS_SELECTION_ID, AWAITING_UNIT_ASSIGNMENT_SELECTION_ID };
