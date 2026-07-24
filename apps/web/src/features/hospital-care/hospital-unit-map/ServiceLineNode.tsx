"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { HOSPITAL_SERVICE_LINE_COLOR_CSS } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { HOSPITAL_UNIT_MAP_CARD } from "./hospitalUnitMapConfig";
import { HospitalUnitNode } from "./HospitalUnitNode";
import type { HospitalUnitMapServiceLineNode } from "./projectHospitalUnitMap";

const MAX_UNITS_COLLAPSED = 4;

type Props = {
  line: HospitalUnitMapServiceLineNode;
  expanded: boolean;
  expandAll: boolean;
  onToggleExpand: () => void;
};

export function ServiceLineNode({ line, expanded, expandAll, onToggleExpand }: Props) {
  const { t } = useI18n();
  const colors = HOSPITAL_SERVICE_LINE_COLOR_CSS[line.config.colorToken];
  const showAll = expanded || expandAll;
  const visibleUnits = showAll ? line.units : line.units.slice(0, MAX_UNITS_COLLAPSED);
  const hiddenCount = line.units.length - visibleUnits.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        width: HOSPITAL_UNIT_MAP_CARD.widthPx,
        minWidth: HOSPITAL_UNIT_MAP_CARD.minWidthPx,
        maxWidth: HOSPITAL_UNIT_MAP_CARD.maxWidthPx,
        flex: "0 0 auto",
      }}
    >
      <div aria-hidden style={{ width: 2, height: 12, background: colors.border }} />
      <Link
        href={line.route}
        role="treeitem"
        aria-level={2}
        data-testid={`service-line-${line.config.testId}`}
        style={{
          ...serviceLineCardStyle(colors),
          width: "100%",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1, flex: "0 0 auto" }} aria-hidden>
            {line.config.emoji}
          </span>
          <strong
            style={{
              fontSize: 12,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t(line.config.titleKey)}
          </strong>
        </span>
        <span style={{ fontSize: 11, color: colors.text, opacity: 0.9 }}>
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
            <HospitalUnitNode unit={unit} colors={colors} />
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

function serviceLineCardStyle(colors: {
  bg: string;
  border: string;
  text: string;
}): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    alignItems: "flex-start",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    background: colors.bg,
    color: colors.text,
    padding: "10px 12px",
    minHeight: HOSPITAL_UNIT_MAP_CARD.minHeightPx,
    maxHeight: HOSPITAL_UNIT_MAP_CARD.maxHeightPx,
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
  };
}

const linkBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2563eb",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
};
