"use client";

/**
 * INP.HIST.1A — Active Patients | All Encounters mode switch on inpatient landing.
 */

import Link from "next/link";
import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import {
  inpatientActivePatientsPath,
  inpatientAllEncountersPath,
} from "./inpatientEncounterHistoryApi";

export type InpatientLandingPatientMode = "active" | "allEncounters";

export function parseInpatientLandingPatientMode(
  raw: string | null | undefined
): InpatientLandingPatientMode {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "allencounters" || v === "all-encounters" || v === "archive") {
    return "allEncounters";
  }
  return "active";
}

type Props = {
  mode: InpatientLandingPatientMode;
};

export function InpatientLandingPatientModeTabs({ mode }: Props) {
  const { t } = useI18n();
  return (
    <div
      role="tablist"
      aria-label={t("inpatientEncounterHistoryInpHist1a.modeAria")}
      data-testid="inp-hist-1a-landing-mode"
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
    >
      <Link
        href={inpatientActivePatientsPath()}
        role="tab"
        aria-selected={mode === "active"}
        data-testid="inp-hist-1a-mode-active"
        style={tabStyle(mode === "active")}
      >
        {t("inpatientEncounterHistoryInpHist1a.modeActive")}
      </Link>
      <Link
        href={inpatientAllEncountersPath()}
        role="tab"
        aria-selected={mode === "allEncounters"}
        data-testid="inp-hist-1a-mode-all"
        style={tabStyle(mode === "allEncounters")}
      >
        {t("inpatientEncounterHistoryInpHist1a.modeAllEncounters")}
      </Link>
    </div>
  );
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 9999,
    border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1e40af" : "#334155",
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
  };
}
