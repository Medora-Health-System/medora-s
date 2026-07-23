"use client";

/**
 * D4A.2.8 — Department worklist UI. Calls APIs only.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ENTERPRISE_WORKFLOW_DEPARTMENTS,
  type DepartmentWorklistPageV1,
  type EnterpriseWorkflowDepartment,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  NEUTRAL_BADGE,
} from "@/components/medora-card";
import { HospitalCareShell } from "./HospitalCareShell";
import {
  completeEncounterTask,
  fetchDepartmentWorklist,
  fetchEncounterWorkflowDoc,
} from "./enterpriseWorkflowApi";
import { isForbiddenApiError } from "./hospitalCarePlacementApi";
import {
  HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN,
} from "./hospitalCarePaths";

const selectStyle: CSSProperties = {
  fontSize: 13,
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

function defaultDepartment(roles: string[]): EnterpriseWorkflowDepartment {
  if (roles.includes("RN")) return "RN";
  if (roles.includes("PROVIDER")) return "PROVIDER";
  if (roles.includes("LAB")) return "LAB";
  if (roles.includes("RADIOLOGY")) return "RADIOLOGY";
  if (roles.includes("PHARMACY")) return "PHARMACY";
  if (roles.includes("ADMIN")) return "ADMIN";
  return "RN";
}

export function EnterpriseWorkflowWorklistView() {
  const { t } = useI18n();
  const { ready, roles } = useFacilityAndRoles();
  const [department, setDepartment] = useState<EnterpriseWorkflowDepartment>("RN");
  const [page, setPage] = useState<DepartmentWorklistPageV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setDepartment(defaultDepartment(roles));
  }, [ready, roles]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDepartmentWorklist(department, { limit: 50, offset: 0 });
      setPage(res);
    } catch (e) {
      setPage(null);
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseWorkflowD4a28.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [department, t]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const onComplete = async (encounterId: string, taskId: string) => {
    setBusyTaskId(taskId);
    setError(null);
    try {
      const docRes = await fetchEncounterWorkflowDoc(encounterId);
      await completeEncounterTask(encounterId, taskId, {
        expectedVersion: docRes.doc.expectedVersion,
      });
      await load();
    } catch (e) {
      setError(
        isForbiddenApiError(e)
          ? t("common.unauthorizedRedirect")
          : t("enterpriseWorkflowD4a28.loadError")
      );
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <HospitalCareShell
      active="home"
      title={t("enterpriseWorkflowD4a28.worklist.title")}
      subtitle={t("enterpriseWorkflowD4a28.subtitle")}
      actions={
        <Link
          href={HOSPITAL_CARE_ENTERPRISE_WORKFLOW_ADMIN}
          style={{ fontSize: 13, fontWeight: 600, color: "#0f766e" }}
        >
          {t("enterpriseWorkflowD4a28.adminLink")}
        </Link>
      }
    >
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
        {t("enterpriseWorkflowD4a28.definitionDriven")} ·{" "}
        {t("enterpriseWorkflowD4a28.rulesOff")} ·{" "}
        {t("enterpriseWorkflowD4a28.placementOff")}
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: "#334155" }}>
          {t("enterpriseWorkflowD4a28.worklist.department")}
          <select
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value as EnterpriseWorkflowDepartment)
            }
            style={{ ...selectStyle, marginLeft: 8 }}
            data-testid="workflow-department-select"
          >
            {ENTERPRISE_WORKFLOW_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {t(`enterpriseWorkflowD4a28.departments.${d}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            fontSize: 13,
            padding: "7px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {t("enterpriseWorkflowD4a28.refresh")}
        </button>
      </div>

      {loading ? <p style={{ fontSize: 13 }}>{t("enterpriseWorkflowD4a28.loading")}</p> : null}
      {error ? (
        <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {page ? (
        <>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            {t("enterpriseWorkflowD4a28.worklist.total").replace(
              "{count}",
              String(page.total)
            )}
          </p>
          {page.items.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              {t("enterpriseWorkflowD4a28.worklist.empty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {page.items.map((item) => (
                <div key={item.taskId} data-testid={`workflow-task-${item.taskId}`}>
                  <MedoraCard leftAccentColor="#0f766e">
                    <MedoraCardInner>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {t("enterpriseWorkflowD4a28.worklist.patient")}:{" "}
                            {item.patientId.slice(0, 8)}… · {item.type}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <MedoraCardBadge soft={NEUTRAL_BADGE}>{item.priority}</MedoraCardBadge>
                          <MedoraCardBadge soft={NEUTRAL_BADGE}>{item.status}</MedoraCardBadge>
                          <button
                            type="button"
                            disabled={busyTaskId === item.taskId}
                            onClick={() => void onComplete(item.encounterId, item.taskId)}
                            style={{
                              fontSize: 12,
                              padding: "6px 10px",
                              borderRadius: 9999,
                              border: "1px solid #0f766e",
                              background: "#ccfbf1",
                              color: "#115e59",
                              cursor: "pointer",
                            }}
                          >
                            {t("enterpriseWorkflowD4a28.worklist.complete")}
                          </button>
                        </div>
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </HospitalCareShell>
  );
}
