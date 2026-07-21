"use client";

import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import { HOSPITAL_CARE_FLOOR_BOARD } from "./hospitalCarePaths";
import Link from "next/link";

export function HospitalCareBedsShellView() {
  const { t } = useI18n();

  return (
    <HospitalCareShell
      active="beds"
      title={t("hospitalCareD3ca.beds.title")}
      subtitle={t("hospitalCareD3ca.beds.subtitle")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {(
          [
            ["units", "hospitalCareD3ca.beds.units"],
            ["rooms", "hospitalCareD3ca.beds.rooms"],
            ["beds", "hospitalCareD3ca.beds.beds"],
            ["occupancy", "hospitalCareD3ca.beds.occupancy"],
          ] as const
        ).map(([id, labelKey]) => (
          <div
            key={id}
            data-testid={`hospital-care-beds-tile-${id}`}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px dashed #cbd5e1",
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t(labelKey)}</div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("hospitalCareD3ca.beds.emptyTile")}
            </p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#64748b" }}>{t("hospitalCareD3ca.beds.empty")}</p>
      <p style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
        {t("hospitalCareD3ca.beds.floorBoardHint")}{" "}
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={{ color: "#0f766e" }}>
          {t("hospitalCareD3ca.home.floorBoardLink")}
        </Link>
      </p>
    </HospitalCareShell>
  );
}
