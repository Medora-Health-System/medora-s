"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { GraphicalHospitalUnitTreeV1 } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { HOSPITAL_UNIT_MAP_CARD } from "./hospitalUnitMapConfig";
import { HospitalRootNode } from "./HospitalRootNode";
import { ServiceLineNode } from "./ServiceLineNode";
import { filterHospitalUnitMap, projectHospitalUnitMap } from "./projectHospitalUnitMap";

type Props = {
  tree: GraphicalHospitalUnitTreeV1;
};

/**
 * MEDUI.D4A.3.1 — Config-driven Hospital Unit Map (graphical service-line tree).
 * Root stays centered; branches use flex-wrap (no hardcoded row width for N lines).
 */
export function HospitalUnitMapTree({ tree }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});
  const [expandAllUnits, setExpandAllUnits] = useState(false);

  const model = useMemo(() => projectHospitalUnitMap(tree), [tree]);
  const filtered = useMemo(() => filterHospitalUnitMap(model, query), [model, query]);

  return (
    <section
      data-testid="hospital-service-line-tree"
      data-certification="MEDUI.D4A.3.1"
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

      {/* Centered tree body: fit-content so the connector spans branches, not a fixed N-width */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            width: "fit-content",
            maxWidth: "100%",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 0 }}>
            <HospitalRootNode
              route={model.root.route}
              totalPatients={model.root.totalPatients}
              alerts={model.root.alerts}
            />
          </div>

          <div aria-hidden style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: 2, height: 18, background: "#94a3b8" }} />
          </div>
          <div
            aria-hidden
            style={{
              height: 2,
              background: "#94a3b8",
              borderRadius: 2,
              width: "100%",
              marginBottom: 0,
            }}
          />

          <div
            role="tree"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: HOSPITAL_UNIT_MAP_CARD.gapPx,
              alignItems: "flex-start",
            }}
            data-testid="service-tree-branches"
          >
            {filtered.map((sl) => (
              <ServiceLineNode
                key={sl.id}
                line={sl}
                expandAll={expandAllUnits}
                expanded={Boolean(expandedLines[sl.id]) || expandAllUnits}
                onToggleExpand={() =>
                  setExpandedLines((prev) => ({ ...prev, [sl.id]: !prev[sl.id] }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      <p style={{ margin: "14px 0 0", fontSize: 11, color: "#94a3b8" }}>
        {t("hospitalCareD3e6c.tree.legend")}
      </p>
    </section>
  );
}

const MEDORA_SHELL: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
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
