"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import { HOSPITAL_CARE_FLOOR_BOARD } from "./hospitalCarePaths";
import {
  fetchHospitalCensus,
  type HospitalCensusResponse,
} from "./hospitalCareCensusApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";

/**
 * D3E.6A — Bed Management tab points at the same Floor Board inventory.
 * Shows real Floor Board-derived counts when available (never invents zeros).
 */
export function HospitalCareBedsShellView() {
  const { t } = useI18n();
  const [census, setCensus] = useState<HospitalCensusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchHospitalCensus();
        if (!cancelled) setCensus(data);
      } catch (err) {
        if (!cancelled) {
          setCensus(null);
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3ca.loadError")
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const s = census?.summary;
  const tiles: Array<[string, string, number | null]> = [
    ["total", "hospitalCareD3e6a.beds.total", s?.bedsTotal ?? null],
    ["available", "hospitalCareD3e6a.beds.available", s?.bedsAvailable ?? null],
    ["occupied", "hospitalCareD3e6a.beds.occupied", s?.bedsOccupied ?? null],
    ["cleaning", "hospitalCareD3e6a.beds.cleaning", s?.bedsCleaning ?? null],
    ["blocked", "hospitalCareD3e6a.beds.blocked", s?.bedsBlocked ?? null],
  ];

  return (
    <HospitalCareShell
      active="beds"
      title={t("hospitalCareD3e6a.beds.title")}
      subtitle={t("hospitalCareD3e6a.beds.subtitle")}
    >
      {error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {tiles.map(([id, labelKey, value]) => (
          <div
            key={id}
            data-testid={`hospital-care-beds-tile-${id}`}
            style={{
              padding: 14,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t(labelKey)}</div>
            <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700, color: "#0f766e" }}>
              {value == null ? "—" : value}
            </p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#64748b" }}>{t("hospitalCareD3e6a.beds.body")}</p>
      <p style={{ marginTop: 12, fontSize: 12 }}>
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={{ color: "#0f766e", fontWeight: 600 }}>
          {t("hospitalCareD3e6a.floorOverview.openFull")}
        </Link>
      </p>
    </HospitalCareShell>
  );
}
