"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import { HospitalCarePatientCard } from "./HospitalCarePatientCard";
import {
  fetchFacilityPlacementQueue,
  isArrivedPlacement,
  isForbiddenApiError,
  type HospitalCarePlacementQueueRow,
  type PlacementQueueAvailability,
} from "./hospitalCarePlacementApi";
import type { HospitalCareSectionId } from "./hospitalCarePaths";

function formatDurationHours(
  fromIso: string | null | undefined,
  t: (k: string) => string
): string | null {
  if (!fromIso) return null;
  const ms = Date.now() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return t("hospitalCareD3ca.card.durationHours").replace("{hours}", String(hours));
}

export function HospitalCareCensusLaneView({
  lane,
  requestedType,
}: {
  lane: Extract<HospitalCareSectionId, "observation" | "inpatient">;
  requestedType: "OBSERVATION" | "INPATIENT";
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [availability, setAvailability] = useState<PlacementQueueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [placeholderOpen, setPlaceholderOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFacilityPlacementQueue();
        if (!cancelled) {
          setRows(data.items);
          setAvailability(data.availability);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setAvailability(null);
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

  const census = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => r.requestedEncounterType === requestedType)
      .filter((r) => isArrivedPlacement(r))
      .filter((r) => {
        if (!q) return true;
        const name = `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.toLowerCase();
        const mrn = (r.patient.mrn ?? "").toLowerCase();
        return name.includes(q) || mrn.includes(q);
      });
  }, [rows, requestedType, query]);

  const title =
    lane === "observation"
      ? t("hospitalCareD3ca.observation.title")
      : t("hospitalCareD3ca.inpatient.title");
  const subtitle =
    lane === "observation"
      ? t("hospitalCareD3ca.observation.subtitle")
      : t("hospitalCareD3ca.inpatient.subtitle");
  const empty =
    lane === "observation"
      ? t("hospitalCareD3ca.observation.empty")
      : t("hospitalCareD3ca.inpatient.empty");
  const comingSoon =
    lane === "observation"
      ? t("hospitalCareD3ca.observation.comingSoon")
      : t("hospitalCareD3ca.inpatient.comingSoon");

  return (
    <HospitalCareShell active={lane} title={title} subtitle={subtitle}>
      <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("common.search")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hospitalCareD3ca.searchPlaceholder")}
            style={{
              display: "block",
              width: "100%",
              minWidth: 220,
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
      ) : availability === "FEATURE_DISABLED" ? (
        <p
          style={{ fontSize: 13, color: "#64748b" }}
          data-testid={`hospital-care-${lane}-feature-off`}
        >
          {t("hospitalCareD3ca.featureUnavailable")}
        </p>
      ) : census.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid={`hospital-care-${lane}-empty`}>
          {empty}
        </p>
      ) : (
        <div>
          {census.map((row) => (
            <HospitalCarePatientCard
              key={row.id}
              row={row}
              durationLabel={formatDurationHours(
                row.arrivedDestinationAt ?? row.departedEdAt,
                t
              )}
              onActivate={() => setPlaceholderOpen(true)}
            />
          ))}
        </div>
      )}

      {placeholderOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hospital-care-d3d-placeholder-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setPlaceholderOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: 20,
              maxWidth: 420,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="hospital-care-d3d-placeholder-title"
              style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}
            >
              {comingSoon}
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
              {t("hospitalCareD3ca.noClinicalWorkflows")}
            </p>
            <button
              type="button"
              onClick={() => setPlaceholderOpen(false)}
              style={{
                marginTop: 16,
                minHeight: 40,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </HospitalCareShell>
  );
}
