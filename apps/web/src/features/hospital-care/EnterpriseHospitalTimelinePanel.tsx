"use client";

/**
 * D4A.2.8 — Hospital workflow timeline panel (consumable from inpatient workspace).
 * Calls timeline API only.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  ENTERPRISE_WORKFLOW_DEPARTMENTS,
  type EnterpriseWorkflowDepartment,
  type HospitalTimelineEntryV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { fetchEncounterWorkflowTimeline } from "./enterpriseWorkflowApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";

const selectStyle: CSSProperties = {
  fontSize: 12,
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

export function EnterpriseHospitalTimelinePanel({
  encounterId,
}: {
  encounterId: string;
}) {
  const { t } = useI18n();
  const [department, setDepartment] = useState<string>("");
  const [entries, setEntries] = useState<HospitalTimelineEntryV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!encounterId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEncounterWorkflowTimeline(encounterId, {
        department: department || undefined,
      });
      setEntries(res.entries);
    } catch (e) {
      setEntries([]);
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseWorkflowD4a28.timeline.error")
      );
    } finally {
      setLoading(false);
    }
  }, [encounterId, department, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section data-testid="enterprise-hospital-timeline-panel">
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#0f172a" }}>
        {t("enterpriseWorkflowD4a28.timeline.title")}
      </h3>
      <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8 }}>
        {t("enterpriseWorkflowD4a28.timeline.filterDepartment")}
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          style={{ ...selectStyle, marginLeft: 8 }}
        >
          <option value="">{t("enterpriseWorkflowD4a28.timeline.all")}</option>
          {ENTERPRISE_WORKFLOW_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {t(`enterpriseWorkflowD4a28.departments.${d as EnterpriseWorkflowDepartment}`)}
            </option>
          ))}
        </select>
      </label>
      {loading ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          {t("enterpriseWorkflowD4a28.timeline.loading")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {!loading && !error && entries.length === 0 ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          {t("enterpriseWorkflowD4a28.timeline.empty")}
        </p>
      ) : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((e) => (
          <li
            key={e.entryId}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "8px 10px",
              background: "#fff",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, color: "#0f172a" }}>{e.title}</div>
            <div style={{ color: "#64748b", marginTop: 2 }}>
              {e.at} · {e.kind}
              {e.department ? ` · ${e.department}` : ""}
            </div>
            {e.summary ? (
              <div style={{ color: "#475569", marginTop: 2 }}>{e.summary}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
