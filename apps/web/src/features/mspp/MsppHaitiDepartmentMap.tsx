"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import type { MsppGeographyResponse } from "@/lib/msppApi";
import { useI18n } from "@/lib/i18n";
import { MSPP_CHART_WELL, MSPP_EMPTY_STATE } from "@/features/mspp/msppUiChrome";
import { findMsppRegionForHaitiFeature, type HaitiDeptFeatureProps } from "./msppHaitiGeoMatch";

const MAP_W = 720;
const MAP_H = 420;

function fillForCount(count: number, maxCount: number): string {
  const m = Math.max(1, maxCount);
  const t = Math.min(1, count / m);
  const a = 0.12 + 0.88 * t;
  return `rgb(29 78 216 / ${a})`;
}

function fillForPath(matched: boolean, count: number, maxCount: number): string {
  if (!matched) return "#e5e7eb";
  return fillForCount(count, maxCount);
}

type TipState = { x: number; y: number; name: string; count: number } | null;

export function MsppHaitiDepartmentMap({
  regions,
  loading,
}: {
  regions: MsppGeographyResponse["regions"];
  loading: boolean;
}) {
  const { t } = useI18n();
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tip, setTip] = useState<TipState>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/maps/haiti-departments.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeatureCollection>;
      })
      .then((j) => {
        if (!cancelled) {
          setGeojson(j);
          setGeoError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeojson(null);
          setGeoError(t("msppDepartmentMap.geoLoadError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const maxCount = useMemo(() => Math.max(0, ...regions.map((r) => r.approvedCount), 1), [regions]);

  const rendered = useMemo(() => {
    if (!geojson?.features?.length) return null;
    const projection = geoMercator();
    projection.fitSize([MAP_W, MAP_H], geojson);
    const path = geoPath(projection);
    return geojson.features.map((f, idx) => {
      const props = f.properties as HaitiDeptFeatureProps | null;
      if (!props?.code) return null;
      const d = path(f);
      if (!d) return null;
      const matched = findMsppRegionForHaitiFeature(regions, props);
      const count = matched?.approvedCount ?? 0;
      const label = matched?.departmentName ?? props.name_fr ?? props.name_alt ?? props.code;
      return (
        <path
          key={props.code ?? idx}
          d={d}
          fill={fillForPath(!!matched, count, maxCount)}
          stroke="#ffffff"
          strokeWidth={0.75}
          strokeLinejoin="round"
          style={{ cursor: "default" }}
          onMouseMove={(e) => {
            e.preventDefault();
            setTip({
              x: e.clientX,
              y: e.clientY,
              name: label,
              count,
            });
          }}
          onMouseLeave={() => setTip(null)}
        />
      );
    });
  }, [geojson, regions, maxCount]);

  const clearTip = useCallback(() => setTip(null), []);

  if (loading) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{t("msppDepartmentMap.loading")}</p>;
  }

  if (geoError) {
    return (
      <div
        style={{
          ...MSPP_CHART_WELL,
          background: "#fef2f2",
          border: "1px solid #fecaca",
        }}
      >
        <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{geoError}</p>
      </div>
    );
  }

  if (!geojson) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{t("msppDepartmentMap.loadingGeo")}</p>;
  }

  return (
    <div style={{ position: "relative" }} onMouseLeave={clearTip}>
      <div style={MSPP_CHART_WELL}>
        <div
          style={{
            width: "100%",
            maxWidth: MAP_W,
            aspectRatio: `${MAP_W} / ${MAP_H}`,
          }}
        >
          <svg
            role="img"
            aria-label={t("msppDepartmentMap.mapAria")}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            {rendered}
          </svg>
        </div>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, marginBottom: 0, lineHeight: 1.45 }}>
          {t("msppDepartmentMap.footnote")}
        </p>
      </div>
      {tip && (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: tip.x + 12,
            top: tip.y + 12,
            zIndex: 50,
            pointerEvents: "none",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#fff",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            maxWidth: 280,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{tip.name}</div>
          <div>{t("msppDepartmentMap.tooltipApprovedCases").replace("{count}", String(tip.count))}</div>
        </div>
      )}
    </div>
  );
}
