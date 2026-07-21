"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  HOSPITAL_CARE_ADMISSIONS,
  HOSPITAL_CARE_BEDS,
  HOSPITAL_CARE_FLOOR_BOARD,
  HOSPITAL_CARE_INPATIENT,
  HOSPITAL_CARE_OBSERVATION,
  HOSPITAL_CARE_PLACEMENT_QUEUE,
  HOSPITAL_CARE_TRANSFERS,
} from "./hospitalCarePaths";

const TILES = [
  {
    href: HOSPITAL_CARE_PLACEMENT_QUEUE,
    titleKey: "hospitalCareD3ca.home.placementQueueTitle",
    hintKey: "hospitalCareD3ca.home.placementQueueHint",
  },
  {
    href: HOSPITAL_CARE_OBSERVATION,
    titleKey: "hospitalCareD3ca.home.observationTitle",
    hintKey: "hospitalCareD3ca.home.observationHint",
  },
  {
    href: HOSPITAL_CARE_INPATIENT,
    titleKey: "hospitalCareD3ca.home.inpatientTitle",
    hintKey: "hospitalCareD3ca.home.inpatientHint",
  },
  {
    href: HOSPITAL_CARE_ADMISSIONS,
    titleKey: "hospitalCareD3ca.home.admissionsTitle",
    hintKey: "hospitalCareD3ca.home.admissionsHint",
  },
  {
    href: HOSPITAL_CARE_BEDS,
    titleKey: "hospitalCareD3ca.home.bedsTitle",
    hintKey: "hospitalCareD3ca.home.bedsHint",
  },
  {
    href: HOSPITAL_CARE_TRANSFERS,
    titleKey: "hospitalCareD3ca.home.transfersTitle",
    hintKey: "hospitalCareD3ca.home.transfersHint",
  },
] as const;

export function HospitalCareHomeView() {
  const { t } = useI18n();

  return (
    <HospitalCareShell
      active="home"
      title={t("hospitalCareD3ca.home.title")}
      subtitle={t("hospitalCareD3ca.home.subtitle")}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            data-testid={`hospital-care-tile-${tile.href.split("/").pop()}`}
            style={{
              display: "block",
              padding: 14,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              textDecoration: "none",
              color: "inherit",
              minHeight: 96,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {t(tile.titleKey)}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
              {t(tile.hintKey)}
            </p>
          </Link>
        ))}
      </div>

      <p style={{ margin: "16px 0 0", fontSize: 12, color: "#64748b" }}>
        {t("hospitalCareD3ca.home.edRemainsPrimary")}{" "}
        <Link href="/app/emergency/trackboard" style={{ color: "#0f766e" }}>
          {t("nav.emergency")}
        </Link>
        {" · "}
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={{ color: "#0f766e" }}>
          {t("hospitalCareD3ca.home.floorBoardLink")}
        </Link>
      </p>
    </HospitalCareShell>
  );
}
