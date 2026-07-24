"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Props = {
  route: string;
  totalPatients: number;
  alerts: number;
};

export function HospitalRootNode({ route, totalPatients, alerts }: Props) {
  const { t } = useI18n();

  return (
    <Link
      href={route}
      role="treeitem"
      aria-level={1}
      data-testid="service-tree-root"
      style={rootNodeStyle}
    >
      <span aria-hidden style={{ fontSize: 20 }}>
        🏥
      </span>
      <strong style={{ fontSize: 15 }}>{t("hospitalCareD3e6c.board.allTitle")}</strong>
      <span style={{ fontSize: 12, opacity: 0.9 }}>
        {t("hospitalCareD3e6c.map.rootSubtitle")}
      </span>
      <span style={{ fontSize: 12 }}>
        {totalPatients} {t("hospitalCareD3e6c.tree.patients")}
        {" · "}
        {alerts} {t("hospitalCareD3e6c.tree.alerts")}
      </span>
    </Link>
  );
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
  padding: "12px 24px",
  border: "1px solid #0f172a",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  minWidth: 220,
  textAlign: "center",
};
