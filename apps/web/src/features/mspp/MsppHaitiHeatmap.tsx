"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { useI18n } from "@/lib/i18n";
import type { MsppSanitarySignalRow } from "@/lib/msppApi";
import { MSPP_CHART_WELL, MSPP_EMPTY_STATE } from "@/features/mspp/msppUiChrome";
import {
  aggregateSanitarySignalsByDepartment,
  findDeptSignalAggForHaitiFeature,
  type DeptSanitarySignalAgg,
  type HaitiDeptFeatureProps,
} from "./msppHaitiGeoMatch";

const MAP_W = 720;
const MAP_H = 420;

function fillForSignalLevel(matched: boolean, level: DeptSanitarySignalAgg["maxSignalLevel"] | null): string {
  if (!matched || !level) return "#e5e7eb";
  if (level === "LOW") return "rgb(203 213 225)"; /* slate-300 — light */
  if (level === "MEDIUM") return "rgb(96 165 250)"; /* blue-400 — medium */
  return "rgb(234 179 8)"; /* amber-500 — strong */
}

type TipState = {
  x: number;
  y: number;
  name: string;
  levelKey: "LOW" | "MEDIUM" | "HIGH";
  rowCount: number;
} | null;

export function MsppHaitiHeatmap({
  signals,
  loading,
}: {
  signals: MsppSanitarySignalRow[];
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
          setGeoError("Impossible de charger la carte des départements.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aggs = useMemo(() => aggregateSanitarySignalsByDepartment(signals), [signals]);

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
      const matched = findDeptSignalAggForHaitiFeature(aggs, props);
      const level = matched?.maxSignalLevel ?? null;
      const label = matched?.departmentName?.trim() || props.name_fr || props.name_alt || props.code;
      return (
        <path
          key={props.code ?? idx}
          d={d}
          fill={fillForSignalLevel(!!matched, level)}
          stroke="#ffffff"
          strokeWidth={0.75}
          strokeLinejoin="round"
          style={{ cursor: "default" }}
          onMouseMove={(e) => {
            e.preventDefault();
            if (!matched) {
              setTip({
                x: e.clientX,
                y: e.clientY,
                name: label,
                levelKey: "LOW",
                rowCount: 0,
              });
              return;
            }
            setTip({
              x: e.clientX,
              y: e.clientY,
              name: label,
              levelKey: matched.maxSignalLevel,
              rowCount: matched.signalRowCount,
            });
          }}
          onMouseLeave={() => setTip(null)}
        />
      );
    });
  }, [geojson, aggs]);

  const clearTip = useCallback(() => setTip(null), []);

  if (loading) {
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{t("msppSanitarySignals.mapLoading")}</p>;
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
    return <p style={{ ...MSPP_EMPTY_STATE, margin: 0 }}>{t("msppSanitarySignals.mapLoadingGeo")}</p>;
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
            aria-label={t("msppSanitarySignals.mapAria")}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            {rendered}
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginTop: 10,
            fontSize: 12,
            color: "#475569",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "#e5e7eb", border: "1px solid #cbd5e1" }} />
            {t("msppSanitarySignals.mapLegendNone")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "rgb(203 213 225)" }} />
            {t("msppSanitarySignals.mapLegendLow")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "rgb(96 165 250)" }} />
            {t("msppSanitarySignals.mapLegendMedium")}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: "rgb(234 179 8)" }} />
            {t("msppSanitarySignals.mapLegendHigh")}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, marginBottom: 0, lineHeight: 1.45 }}>
          {t("msppSanitarySignals.mapFootnote")}
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
            maxWidth: 300,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{tip.name}</div>
          {tip.rowCount > 0 ? (
            <>
              <div style={{ marginTop: 4 }}>
                {t("msppSanitarySignals.mapTooltipLevel").replace(
                  "{level}",
                  t(`msppSanitarySignals.level.${tip.levelKey}`)
                )}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, opacity: 0.9 }}>
                {t("msppSanitarySignals.mapTooltipRows").replace("{n}", String(tip.rowCount))}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>{t("msppSanitarySignals.mapTooltipNoSignal")}</div>
          )}
        </div>
      )}
    </div>
  );
}
