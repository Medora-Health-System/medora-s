"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  graphicalHospitalUnitTreeEnabledInRuntime,
  graphicalHospitalUnitTreeFlagsFromProcessEnv,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { HospitalCareShell } from "@/features/hospital-care/HospitalCareShell";
import { HospitalServiceLineTree } from "@/features/hospital-care/HospitalServiceLineTree";
import { fetchHospitalServiceLineTree } from "@/features/hospital-care/hospitalServiceLineTreeApi";
import type { GraphicalHospitalUnitTreeResponse } from "@/features/hospital-care/hospitalServiceLineTreeApi";
import { HOSPITAL_CARE_FLOOR_BOARD } from "@/features/hospital-care/hospitalCarePaths";
import { isForbiddenApiError } from "@/features/hospital-care/hospitalCarePlacementApi";
import { InpatientCensusViewLegacy } from "./InpatientCensusViewLegacy";
import { INPATIENT_ALL_UNITS_BOARD_PATH } from "./inpatientUnitBoardPaths";

/**
 * D3E.6C — Graphical service-line hub (primary).
 * Falls back to D3E.6B vertical tree when graphical flag is OFF in production.
 */
export function InpatientGraphicalHubView() {
  const { t } = useI18n();
  const flags = graphicalHospitalUnitTreeFlagsFromProcessEnv(
    typeof process !== "undefined" ? process.env : undefined
  );
  const graphicalOn = graphicalHospitalUnitTreeEnabledInRuntime(flags);

  if (!graphicalOn) {
    return <InpatientCensusViewLegacy />;
  }

  return <GraphicalHubBody />;
}

function GraphicalHubBody() {
  const { t } = useI18n();
  const [tree, setTree] = useState<GraphicalHospitalUnitTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHospitalServiceLineTree();
        if (!cancelled) setTree(data);
      } catch (err) {
        if (!cancelled) {
          setTree(null);
          setError(
            isForbiddenApiError(err)
              ? t("hospitalCareD3ca.accessDenied")
              : t("hospitalCareD3ca.loadError")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <HospitalCareShell
      active="inpatient"
      title={t("inpatientD3e.census.title")}
      subtitle={t("hospitalCareD3e6c.hub.subtitle")}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : tree ? (
        <>
          <div
            style={{
              ...MEDORA_CARD_SHELL,
              padding: "10px 12px",
              marginBottom: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "center",
            }}
            data-testid="inpatient-hub-summary"
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {t("hospitalCareD3e6c.hub.summaryTitle")}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {tree.root.totalPatients} {t("hospitalCareD3e6c.tree.patients")}
                {" · "}
                {tree.root.alerts} {t("hospitalCareD3e6c.tree.alerts")}
                {" · "}
                {tree.serviceLines.length} {t("hospitalCareD3e6c.hub.serviceLines")}
              </div>
            </div>
            <Link
              href={INPATIENT_ALL_UNITS_BOARD_PATH}
              style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}
            >
              {t("hospitalCareD3e6c.hub.openAllCensus")}
            </Link>
          </div>

          {tree.serviceLines.length === 0 ? (
            <div style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{t("hospitalCareD3e6b.empty.noUnits")}</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                {t("hospitalCareD3e6b.empty.configureUnits")}
              </p>
            </div>
          ) : (
            <HospitalServiceLineTree tree={tree} />
          )}

          <div
            style={{
              ...MEDORA_CARD_SHELL,
              marginTop: 16,
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
              {t("hospitalCareD3e6c.hub.bedHint")}
            </p>
            <Link
              href={HOSPITAL_CARE_FLOOR_BOARD}
              style={{ fontSize: 13, fontWeight: 600, color: "#2563eb" }}
            >
              {t("hospitalCareD3e6b.bedManagement.open")}
            </Link>
          </div>
        </>
      ) : null}
    </HospitalCareShell>
  );
}
