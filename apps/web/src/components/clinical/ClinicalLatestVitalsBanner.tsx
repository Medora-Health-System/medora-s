"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  classifyVitalsAbnormalKeys,
  fetchLatestVitalsHistoryEntry,
  formatLatestVitalsLine,
  type VitalsHistoryEntry,
} from "@/lib/encounterClinicalSafetyUi";

export function ClinicalLatestVitalsBanner({
  encounterId,
  facilityId,
  latestEntry,
  fetchEnabled = true,
}: {
  encounterId: string;
  facilityId: string;
  /** Same vitals-history engine; skip GET when the parent already loaded the latest entry. */
  latestEntry?: VitalsHistoryEntry | null;
  /** When false, do not fetch (timeline-first MAR can enable after first paint). */
  fetchEnabled?: boolean;
}) {
  const { t, language } = useI18n();
  const [fetchedEntry, setFetchedEntry] = useState<VitalsHistoryEntry | null | undefined>(undefined);
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const usePrefetch = latestEntry !== undefined;
  const entry = usePrefetch ? latestEntry : fetchedEntry;

  useEffect(() => {
    if (usePrefetch || !fetchEnabled) return;
    let cancelled = false;
    setFetchedEntry(undefined);
    void fetchLatestVitalsHistoryEntry(encounterId, facilityId).then((e) => {
      if (!cancelled) setFetchedEntry(e);
    });
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, fetchEnabled, usePrefetch]);

  if (!usePrefetch && !fetchEnabled) {
    return null;
  }

  if (entry === undefined) {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        {t("common.loading")}
      </div>
    );
  }

  if (!entry) {
    return (
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px dashed #cbd5e1",
          backgroundColor: "#f8fafc",
          fontSize: 12,
          color: "#64748b",
        }}
        role="status"
      >
        <span style={{ fontWeight: 700, color: "#334155" }}>{t("clinicalSafetyGuardrails.latestVitalsTitle")}</span>
        {" — "}
        {t("clinicalSafetyGuardrails.latestVitalsEmpty")}
      </div>
    );
  }

  const line = formatLatestVitalsLine(entry, language);
  const abnormal = classifyVitalsAbnormalKeys(entry.vitals);
  const when = new Date(entry.recordedAt).toLocaleString(dateLocale);

  return (
    <div
      role="status"
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        borderRadius: 8,
        border: abnormal.length ? "1px solid #fecaca" : "1px solid #e2e8f0",
        backgroundColor: abnormal.length ? "#fff1f2" : "#f8fafc",
        fontSize: 12,
        color: "#0f172a",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 4, color: "#334155" }}>
        {t("clinicalSafetyGuardrails.latestVitalsTitle")}
        {abnormal.length ? (
          <span style={{ marginLeft: 8, fontWeight: 700, color: "#b91c1c" }}>
            ({t("clinicalSafetyGuardrails.vitalsAbnormalHint")})
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
        {t("clinicalSafetyGuardrails.latestVitalsRecorded").replace("{datetime}", when)}
      </div>
      <div style={{ fontWeight: 600 }}>{line || "—"}</div>
    </div>
  );
}
