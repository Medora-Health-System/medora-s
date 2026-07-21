"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  HOSPITAL_SERVICE_LINE_COLOR_CSS,
  type GraphicalHospitalUnitTreeV1,
  type GraphicalTreeServiceLineNode,
  type GraphicalTreeUnitNode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

const MAX_UNITS_COLLAPSED = 4;

type Props = {
  tree: GraphicalHospitalUnitTreeV1;
};

export function HospitalServiceLineTree({ tree }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [expandAllUnits, setExpandAllUnits] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree.serviceLines;
    return tree.serviceLines
      .map((sl) => ({
        ...sl,
        units: sl.units.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.code.toLowerCase().includes(q) ||
            sl.name.toLowerCase().includes(q)
        ),
      }))
      .filter((sl) => sl.units.length > 0 || sl.name.toLowerCase().includes(q));
  }, [tree.serviceLines, query]);

  return (
    <section
      data-testid="hospital-service-line-tree"
      aria-label={t("hospitalCareD3e6c.tree.aria")}
      style={{ ...MEDORA_SHELL, padding: 16 }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "space-between",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {t("hospitalCareD3e6c.tree.title")}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hospitalCareD3e6c.tree.search")}
            aria-label={t("hospitalCareD3e6c.tree.search")}
            style={fieldStyle}
          />
          <button type="button" style={linkBtn} onClick={() => setExpandAllUnits(true)}>
            {t("hospitalCareD3e6c.tree.expandAll")}
          </button>
          <button
            type="button"
            style={linkBtn}
            onClick={() => {
              setExpandAllUnits(false);
              setExpandedLines({});
            }}
          >
            {t("hospitalCareD3e6c.tree.collapseAll")}
          </button>
        </div>
      </div>

      {/* Root */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}>
        <Link
          href={tree.root.route}
          role="treeitem"
          aria-level={1}
          data-testid="service-tree-root"
          style={rootNodeStyle}
        >
          <span aria-hidden style={{ fontSize: 22 }}>
            🏥
          </span>
          <strong style={{ fontSize: 15 }}>{tree.root.label}</strong>
          <span style={{ fontSize: 12, opacity: 0.9 }}>{tree.root.subtitle}</span>
          <span style={{ fontSize: 12 }}>
            {tree.root.totalPatients} {t("hospitalCareD3e6c.tree.patients")}
            {" · "}
            {tree.root.alerts} {t("hospitalCareD3e6c.tree.alerts")}
          </span>
        </Link>
      </div>

      {/* Trunk */}
      <div aria-hidden style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: 2, height: 18, background: "#94a3b8" }} />
      </div>
      <div aria-hidden style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <div
          style={{
            width: "min(100%, 960px)",
            height: 2,
            background: "#94a3b8",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Service lines — horizontal wrap, not vertical accordion of rooms */}
      <div
        role="tree"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
        data-testid="service-tree-branches"
      >
        {filtered.map((sl) => (
          <ServiceLineBranch
            key={sl.id}
            line={sl}
            expandAll={expandAllUnits}
            expanded={Boolean(expandedLines[sl.id]) || expandAllUnits}
            onToggleExpand={() =>
              setExpandedLines((prev) => ({ ...prev, [sl.id]: !prev[sl.id] }))
            }
            t={t}
          />
        ))}
      </div>

      <p style={{ margin: "14px 0 0", fontSize: 11, color: "#94a3b8" }}>
        {t("hospitalCareD3e6c.tree.legend")}
      </p>
    </section>
  );
}

function ServiceLineBranch({
  line,
  expanded,
  expandAll,
  onToggleExpand,
  t,
}: {
  line: GraphicalTreeServiceLineNode;
  expanded: boolean;
  expandAll: boolean;
  onToggleExpand: () => void;
  t: (k: string) => string;
}) {
  const colors = HOSPITAL_SERVICE_LINE_COLOR_CSS[line.colorToken];
  const showAll = expanded || expandAll;
  const visibleUnits = showAll ? line.units : line.units.slice(0, MAX_UNITS_COLLAPSED);
  const hiddenCount = line.units.length - visibleUnits.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div aria-hidden style={{ width: 2, height: 12, background: colors.border }} />
      <Link
        href={line.route}
        role="treeitem"
        aria-level={2}
        data-testid={`service-line-${line.code}`}
        style={{
          ...nodeCard(colors),
          width: "100%",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: 14 }} aria-hidden>
          {iconGlyph(line.icon)}
        </span>
        <strong style={{ fontSize: 13 }}>{line.name}</strong>
        <span style={{ fontSize: 11 }}>
          {line.patientCount} {t("hospitalCareD3e6c.tree.patients")}
          {" · "}
          {line.alertCount} {t("hospitalCareD3e6c.tree.alerts")}
        </span>
      </Link>
      <div aria-hidden style={{ width: 2, height: 10, background: colors.border }} />
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
        role="group"
      >
        {visibleUnits.map((unit) => (
          <li key={unit.id}>
            <UnitNodeCard unit={unit} colors={colors} t={t} />
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={onToggleExpand}
          style={{ ...linkBtn, marginTop: 6, fontSize: 11 }}
          aria-expanded={showAll}
        >
          {t("hospitalCareD3e6c.tree.viewAllUnits").replace("{count}", String(line.units.length))}
        </button>
      ) : null}
    </div>
  );
}

function UnitNodeCard({
  unit,
  colors,
  t,
}: {
  unit: GraphicalTreeUnitNode;
  colors: { bg: string; border: string; text: string; accent: string };
  t: (k: string) => string;
}) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      window.location.href = unit.route;
    }
  };
  const beds =
    unit.availableBeds == null
      ? t("hospitalCareD3e6c.counts.unavailable")
      : String(unit.availableBeds);

  return (
    <Link
      href={unit.route}
      role="treeitem"
      aria-level={3}
      onKeyDown={onKey}
      data-testid={`unit-node-${unit.code}`}
      style={{
        display: "block",
        textDecoration: "none",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        background: "#fff",
        padding: "8px 10px",
        color: colors.text,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12 }}>{unit.name}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
        {unit.patientCount} {t("hospitalCareD3e6c.tree.patients")}
        {" · "}
        {beds} {t("hospitalCareD3e6c.tree.bedsAvailable")}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.accent, marginTop: 4 }}>
        {t("hospitalCareD3e6c.tree.openBoard")}
      </div>
    </Link>
  );
}

function iconGlyph(icon: string): string {
  switch (icon) {
    case "pulse":
      return "♥";
    case "scalpel":
      return "✚";
    case "mother":
      return "♀";
    case "child":
      return "☺";
    case "brain":
      return "◉";
    case "ribbon":
      return "❀";
    case "person":
      return "👤";
    case "mobility":
      return "↕";
    case "ellipsis":
      return "…";
    default:
      return "▢";
  }
}

function nodeCard(colors: { bg: string; border: string; text: string }): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    alignItems: "flex-start",
    border: `2px solid ${colors.border}`,
    borderRadius: 12,
    background: colors.bg,
    color: colors.text,
    padding: "10px 12px",
  };
}

const rootNodeStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  textDecoration: "none",
  background: "#1e3a5f",
  color: "#f8fafc",
  borderRadius: 14,
  padding: "14px 28px",
  border: "2px solid #0f172a",
  minWidth: 220,
  textAlign: "center",
};

const MEDORA_SHELL: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
};

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 13,
  minWidth: 160,
};

const linkBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
};
