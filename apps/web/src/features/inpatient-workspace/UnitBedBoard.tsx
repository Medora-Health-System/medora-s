"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { EncounterBedUnitCode } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { BedBoardGrid } from "@/components/encounters/BedBoardGrid";
import { BedBoardStatusFilterBar } from "@/components/encounters/BedBoardStatusFilterBar";
import {
  fetchFacilityBedBoard,
  type FacilityBedBoardBedRow,
  type FacilityBedBoardUnit,
} from "@/lib/bedBoardApi";
import type { BedBoardStatusFilterId } from "@/lib/bedBoardFilters";
import { hospitalOccupantChartPath } from "./inpatientWorkspacePaths";
import { HOSPITAL_CARE_FLOOR_BOARD } from "@/features/hospital-care/hospitalCarePaths";

const BED_UNITS = new Set<string>(["ED", "OBS", "MS", "ICU"]);

export function resolveBedBoardUnitCode(unitCode: string | null | undefined): EncounterBedUnitCode | null {
  const c = String(unitCode ?? "")
    .trim()
    .toUpperCase();
  if (BED_UNITS.has(c)) return c as EncounterBedUnitCode;
  return null;
}

type Props = {
  facilityId: string | null;
  unitCode: string | null | undefined;
  title?: string;
};

/**
 * D3E.6D — Unit-scoped visual bed board.
 * Projection of FacilityBedBoardService / Floor Board inventory — not a second inventory.
 */
export function UnitBedBoard({ facilityId, unitCode, title }: Props) {
  const { t } = useI18n();
  const bedUnit = resolveBedBoardUnitCode(unitCode);
  const [unitView, setUnitView] = useState<FacilityBedBoardUnit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BedBoardStatusFilterId>("all");

  useEffect(() => {
    if (!facilityId || !bedUnit) {
      setUnitView(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const board = await fetchFacilityBedBoard(facilityId, bedUnit);
        const unit = board.units.find((u) => u.unitCode === bedUnit) ?? null;
        if (!cancelled) setUnitView(unit);
      } catch {
        if (!cancelled) {
          setUnitView(null);
          setError(t("hospitalCareD3e6d.bedBoard.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, bedUnit, t]);

  const summary = useMemo(() => unitView?.summary ?? null, [unitView]);

  if (!bedUnit) {
    return (
      <section style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }} data-testid="unit-bed-board-unavailable">
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          {title ?? t("hospitalCareD3e6d.bedBoard.title")}
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("hospitalCareD3e6d.bedBoard.noPool")}
        </p>
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={linkStyle}>
          {t("hospitalCareD3e6b.bedManagement.open")}
        </Link>
      </section>
    );
  }

  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }}
      data-testid="unit-bed-board"
      data-unit={bedUnit}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {title ?? t("hospitalCareD3e6d.bedBoard.title")}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("hospitalCareD3e6d.bedBoard.subtitle").replace("{unit}", bedUnit)}
          </p>
        </div>
        <Link href={HOSPITAL_CARE_FLOOR_BOARD} style={linkStyle}>
          {t("hospitalCareD3e6b.bedManagement.open")}
        </Link>
      </div>

      {summary ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 10,
            fontSize: 12,
            color: "#334155",
          }}
          data-testid="unit-bed-board-summary"
        >
          <span>
            {summary.occupied} {t("hospitalCareD3e6b.tree.occupied")}
          </span>
          <span>·</span>
          <span>
            {summary.available} {t("hospitalCareD3e6b.tree.available")}
          </span>
          <span>·</span>
          <span>
            {summary.cleaning + summary.dirty} {t("hospitalCareD3e6d.bedBoard.cleaning")}
          </span>
          <span>·</span>
          <span>
            {summary.blocked} {t("hospitalCareD3e6d.bedBoard.blocked")}
          </span>
        </div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        <BedBoardStatusFilterBar value={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : unitView ? (
        <div style={{ marginTop: 10 }} data-testid="unit-bed-board-grid">
          <BedBoardGrid
            unit={bedUnit}
            beds={unitView.beds as FacilityBedBoardBedRow[]}
            statusFilter={statusFilter}
            facilityId={facilityId}
            encounterChartPath={(encounterId) =>
              hospitalOccupantChartPath({
                encounterId,
                unitCode: bedUnit,
              })
            }
          />
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("hospitalCareD3e6d.bedBoard.empty")}</p>
      )}
    </section>
  );
}

const linkStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#2563eb",
  textDecoration: "none",
  alignSelf: "flex-start",
};
