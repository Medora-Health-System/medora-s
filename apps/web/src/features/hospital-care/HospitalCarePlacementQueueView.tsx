"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import { HospitalCarePatientCard } from "./HospitalCarePatientCard";
import {
  fetchFacilityPlacementQueue,
  PLACEMENT_QUEUE_STATUS_SET,
  type HospitalCarePlacementQueueRow,
} from "./hospitalCarePlacementApi";

export function HospitalCarePlacementQueueView() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFacilityPlacementQueue();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError(t("hospitalCareD3ca.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const queueRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => PLACEMENT_QUEUE_STATUS_SET.has(r.status))
      .filter((r) => {
        if (!q) return true;
        const name = `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.toLowerCase();
        const mrn = (r.patient.mrn ?? "").toLowerCase();
        return name.includes(q) || mrn.includes(q) || r.status.toLowerCase().includes(q);
      });
  }, [rows, query]);

  return (
    <HospitalCareShell
      active="placementQueue"
      title={t("hospitalCareD3ca.placementQueue.title")}
      subtitle={t("hospitalCareD3ca.placementQueue.subtitle")}
    >
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("common.search")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hospitalCareD3ca.searchPlaceholder")}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 360,
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
            }}
          />
        </label>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : queueRows.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="hospital-care-placement-empty">
          {t("hospitalCareD3ca.placementQueue.empty")}
        </p>
      ) : (
        <div>
          {queueRows.map((row) => (
            <HospitalCarePatientCard
              key={row.id}
              row={row}
              href={`/app/encounters/${row.originatingEncounterId}`}
            />
          ))}
        </div>
      )}
    </HospitalCareShell>
  );
}
