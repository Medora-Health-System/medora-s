"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { HospitalUnitMapUnitNode } from "./projectHospitalUnitMap";

type Props = {
  unit: HospitalUnitMapUnitNode;
  colors: { bg: string; border: string; text: string; accent: string };
};

export function HospitalUnitNode({ unit, colors }: Props) {
  const { t } = useI18n();
  const title = unit.displayNameKey ? t(unit.displayNameKey) : unit.name;

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
      data-map-placeholder={unit.isMapPlaceholder ? "true" : undefined}
      style={{
        display: "block",
        textDecoration: "none",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        background: "#fff",
        padding: "8px 10px",
        color: colors.text,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 12 }}>{title}</div>
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
