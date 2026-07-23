"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ADMISSION_SIMULATION_STAGES,
  buildAdmissionPackagePreview,
  buildAdmissionWorkflowVisibilityModel,
  internalPlacementWorkflowEnabled,
  isAdmissionSimulationAllowed,
  type AdmissionSimulationStage,
  type AdmissionTimelineNode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { emergencyActiveWorkspacePath } from "@/features/emergency/emergencyRoutes";
import { HospitalCareShell } from "./HospitalCareShell";
import { hospitalAdmissionCommandCenterPath } from "./hospitalCarePaths";

type EncounterPayload = {
  id: string;
  type?: string | null;
  status?: string | null;
  chiefComplaint?: string | null;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  patient?: { id?: string; firstName?: string; lastName?: string } | null;
};

type PlacementPayload = {
  status?: string | null;
  requestedAt?: string | null;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  departedEdAt?: string | null;
  arrivedDestinationAt?: string | null;
  receivingEncounterId?: string | null;
  assignedUnitCode?: string | null;
  assignedRoomKey?: string | null;
  assignedBedKey?: string | null;
} | null;

const sectionStyle: CSSProperties = {
  marginTop: 16,
  paddingTop: 12,
  borderTop: "1px solid #e2e8f0",
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: 4,
};

const valueStyle: CSSProperties = {
  fontSize: 14,
  color: "#0f172a",
  lineHeight: 1.45,
  margin: 0,
};

function Field({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={labelStyle}>{label}</div>
      <p style={valueStyle}>{value?.trim() ? value : emptyLabel ?? DISPLAY_DASH}</p>
    </div>
  );
}

function TimelineNodeView({
  node,
  label,
  stateLabel,
}: {
  node: AdmissionTimelineNode;
  label: string;
  stateLabel: string;
}) {
  const done = node.state === "COMPLETED";
  const bad = node.state === "CANCELLED" || node.state === "FAILED";
  return (
    <div
      data-testid={`admission-timeline-node-${node.id}`}
      data-state={node.state}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 10,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 9999,
          marginTop: 2,
          flexShrink: 0,
          background: done ? "#0f766e" : bad ? "#b91c1c" : "#cbd5e1",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          display: "grid",
          placeItems: "center",
        }}
      >
        {done ? "✓" : bad ? "!" : "·"}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {stateLabel}
          {node.at ? ` · ${new Date(node.at).toLocaleString()}` : ""}
        </div>
      </div>
    </div>
  );
}

export function AdmissionReviewWorkspaceView() {
  const { t } = useI18n();
  const params = useParams();
  const encounterId = String(params?.encounterId ?? "").trim();
  const { facilityId, ready } = useFacilityAndRoles();
  const [encounter, setEncounter] = useState<EncounterPayload | null>(null);
  const [placement, setPlacement] = useState<PlacementPayload>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulationStage, setSimulationStage] =
    useState<AdmissionSimulationStage>("NONE");

  const placementEnabled = internalPlacementWorkflowEnabled({
    INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
    NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED:
      process.env.NEXT_PUBLIC_INTERNAL_PLACEMENT_WORKFLOW_ENABLED,
  });

  const simulationAllowed = isAdmissionSimulationAllowed({
    NODE_ENV: process.env.NODE_ENV,
    ADMISSION_WORKFLOW_SIMULATION_ENABLED:
      process.env.NEXT_PUBLIC_ADMISSION_WORKFLOW_SIMULATION_ENABLED,
  });

  useEffect(() => {
    if (!ready || !facilityId || !encounterId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const enc = (await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
          facilityId,
        })) as EncounterPayload;
        if (cancelled) return;
        setEncounter(enc);
        try {
          const pl = (await apiFetch(
            `/encounters/${encodeURIComponent(encounterId)}/internal-placement`,
            { facilityId }
          )) as PlacementPayload;
          if (!cancelled) setPlacement(pl);
        } catch {
          if (!cancelled) setPlacement(null);
        }
      } catch {
        if (!cancelled) {
          setEncounter(null);
          setError(t("admissionWorkflowVisibility.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, facilityId, encounterId, t]);

  const workflow = useMemo(() => {
    if (!encounter) return null;
    return buildAdmissionWorkflowVisibilityModel({
      admissionSummaryJson: encounter.admissionSummaryJson,
      nursingAssessment: encounter.nursingAssessment,
      placementWorkflowEnabled: placementEnabled,
      placementStatus: placement?.status ?? null,
      placementRequestedAt: placement?.requestedAt ?? null,
      placementAssignedAt: placement?.assignedAt ?? null,
      placementAcceptedAt: placement?.acceptedAt ?? null,
      placementDepartedEdAt: placement?.departedEdAt ?? null,
      placementArrivedAt: placement?.arrivedDestinationAt ?? null,
      receivingEncounterId: placement?.receivingEncounterId ?? null,
      simulationStage: simulationAllowed ? simulationStage : "NONE",
    });
  }, [encounter, placement, placementEnabled, simulationStage, simulationAllowed]);

  const preview = useMemo(() => {
    if (!encounter) return null;
    return buildAdmissionPackagePreview({
      admissionSummaryJson: encounter.admissionSummaryJson,
      nursingAssessment: encounter.nursingAssessment,
    });
  }, [encounter]);

  const patientName = encounter?.patient
    ? [encounter.patient.lastName, encounter.patient.firstName].filter(Boolean).join(", ")
    : "";

  const statusKey = workflow?.statusCode ?? "NO_ADMISSION_DECISION";
  const statusTitle = t(`admissionWorkflowVisibility.status.${statusKey}.title`);

  return (
    <HospitalCareShell
      active="admissions"
      title={t("admissionWorkflowVisibility.title")}
      subtitle={t("admissionWorkflowVisibility.subtitle")}
      actions={
        encounterId ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link
              href={hospitalAdmissionCommandCenterPath(encounterId)}
              data-testid="admission-review-open-command-center"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0f766e",
                textDecoration: "none",
                border: "1px solid #99f6e4",
                background: "#f0fdfa",
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              {t("admissionCommandCenter.openCommandCenter")}
            </Link>
            <Link
              href={emergencyActiveWorkspacePath(encounterId)}
              data-testid="admission-review-edit-decision"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0f766e",
                textDecoration: "none",
                border: "1px solid #99f6e4",
                background: "#f0fdfa",
                borderRadius: 10,
                padding: "8px 12px",
              }}
            >
              {t("admissionWorkflowVisibility.editDecision")}
            </Link>
          </div>
        ) : null
      }
    >
      <div data-testid="admission-review-workspace">
        {loading ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>
            {t("admissionWorkflowVisibility.loading")}
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ fontSize: 13, color: "#b91c1c" }}>
            {error}
          </p>
        ) : null}

        {!loading && !error && encounter && workflow && preview ? (
          <>
            {patientName ? (
              <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                {patientName}
              </p>
            ) : null}

            <div
              data-testid="admission-workflow-status"
              data-status={workflow.statusCode}
              data-simulation={workflow.simulationActive ? "1" : "0"}
              style={{
                border: "1px solid #99f6e4",
                background: "#f0fdfa",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "#115e59" }}>
                {workflow.statusCode === "DECISION_SIGNED_NO_PLACEMENT" ||
                workflow.statusCode === "PLACEMENT_REQUESTED_WAITING_BED" ||
                workflow.statusCode === "BED_ASSIGNED_WAITING_RECEIVING" ||
                workflow.statusCode === "ARRIVED_INPATIENT_CREATED"
                  ? `✓ ${statusTitle}`
                  : statusTitle}
              </div>
              {workflow.statusCode === "ADMISSION_CANCELLED" ? (
                <div style={{ marginTop: 8, fontSize: 13, color: "#334155" }}>
                  <div>
                    {t("admissionWorkflowVisibility.status.ADMISSION_CANCELLED.reason")}:{" "}
                    {workflow.cancellation?.reason || DISPLAY_DASH}
                  </div>
                  <div>
                    {t("admissionWorkflowVisibility.status.ADMISSION_CANCELLED.timestamp")}:{" "}
                    {workflow.cancellation?.at
                      ? new Date(workflow.cancellation.at).toLocaleString()
                      : DISPLAY_DASH}
                  </div>
                  <div>
                    {t("admissionWorkflowVisibility.status.ADMISSION_CANCELLED.provider")}:{" "}
                    {workflow.cancellation?.byDisplay || DISPLAY_DASH}
                  </div>
                </div>
              ) : (
                <ul
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.5,
                  }}
                >
                  {(["line1", "line2", "line3", "line4"] as const).map((lineKey) => {
                    const key = `admissionWorkflowVisibility.status.${statusKey}.${lineKey}`;
                    const line = t(key);
                    if (!line || line === key) return null;
                    return <li key={lineKey}>{line}</li>;
                  })}
                  {statusKey === "DECISION_SIGNED_NO_PLACEMENT" && !placementEnabled ? (
                    <>
                      <li>
                        {t(
                          "admissionWorkflowVisibility.status.DECISION_SIGNED_NO_PLACEMENT.reasonUnavailable"
                        )}
                      </li>
                      <li>
                        {t(
                          "admissionWorkflowVisibility.status.DECISION_SIGNED_NO_PLACEMENT.packageSaved"
                        )}
                      </li>
                    </>
                  ) : null}
                </ul>
              )}
              {workflow.simulationActive ? (
                <p
                  data-testid="admission-simulation-banner"
                  style={{ margin: "10px 0 0", fontSize: 12, color: "#b45309" }}
                >
                  {t("admissionWorkflowVisibility.simulation.banner")}
                </p>
              ) : null}
            </div>

            {simulationAllowed ? (
              <div style={sectionStyle} data-testid="admission-simulation-controls">
                <div style={labelStyle}>{t("admissionWorkflowVisibility.simulation.title")}</div>
                <p style={{ ...valueStyle, fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                  {t("admissionWorkflowVisibility.simulation.hint")}
                </p>
                <select
                  value={simulationStage}
                  onChange={(e) =>
                    setSimulationStage(e.target.value as AdmissionSimulationStage)
                  }
                  aria-label={t("admissionWorkflowVisibility.simulation.title")}
                  style={{
                    fontSize: 13,
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    maxWidth: 360,
                  }}
                >
                  {ADMISSION_SIMULATION_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {t(`admissionWorkflowVisibility.simulation.stage.${stage}`)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div style={sectionStyle} data-testid="admission-workflow-timeline">
              <div style={{ ...labelStyle, marginBottom: 10 }}>
                {t("admissionWorkflowVisibility.timeline.title")}
              </div>
              {workflow.timeline.map((node) => (
                <TimelineNodeView
                  key={node.id}
                  node={node}
                  label={t(`admissionWorkflowVisibility.timeline.nodes.${node.id}`)}
                  stateLabel={t(`admissionWorkflowVisibility.timeline.states.${node.state}`)}
                />
              ))}
            </div>

            <div style={sectionStyle} data-testid="admission-package-preview">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>
                  {t("admissionWorkflowVisibility.package.title")}
                </div>
                <span style={{ fontSize: 12, color: "#0f766e", fontWeight: 600 }}>
                  {preview.signed
                    ? t("admissionWorkflowVisibility.package.signedLabel")
                    : t("admissionWorkflowVisibility.package.draftLabel")}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
                {t("admissionWorkflowVisibility.readOnlyNote")}
              </p>

              <h3 style={{ fontSize: 14, margin: "12px 0 8px", color: "#0f172a" }}>
                {t("admissionWorkflowVisibility.package.sections.summary")}
              </h3>
              <Field
                label={t("admissionWorkflowVisibility.package.sections.reason")}
                value={preview.reasonForAdmission}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.primaryDx")}
                value={preview.primaryDiagnosis}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.secondaryDx")}
                value={
                  preview.secondaryDiagnoses.length
                    ? preview.secondaryDiagnoses.join("; ")
                    : null
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.chiefComplaint")}
                value={encounter.chiefComplaint}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.condition")}
                value={
                  [preview.conditionStatus, preview.conditionNarrative]
                    .filter(Boolean)
                    .join(" — ") || null
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.service")}
                value={preview.service}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.levelOfCare")}
                value={preview.levelOfCare}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.initialPlan")}
                value={preview.initialPlanNarrative}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.structuredPlan")}
                value={
                  preview.structuredPlanItems.length
                    ? preview.structuredPlanItems
                        .map((i) => `${i.display} (${i.status})`)
                        .join("; ")
                    : null
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.nursingStatus")}
                value={
                  preview.nursingCompleted
                    ? t("admissionWorkflowVisibility.package.nursingComplete")
                    : t("admissionWorkflowVisibility.package.nursingIncomplete")
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.placementStatus")}
                value={workflow.placementStatus}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.destinationUnit")}
                value={placement?.assignedUnitCode}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.bedStatus")}
                value={
                  [placement?.assignedRoomKey, placement?.assignedBedKey]
                    .filter(Boolean)
                    .join(" / ") || null
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.inpatientStatus")}
                value={
                  workflow.inpatientEncounterExists
                    ? workflow.receivingEncounterId
                    : t("admissionWorkflowVisibility.package.inpatientNotCreated")
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.providerSignature")}
                value={preview.responsiblePhysician}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.decisionTimestamp")}
                value={
                  preview.decisionAt
                    ? new Date(preview.decisionAt).toLocaleString()
                    : null
                }
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.proposalSources")}
                value={Object.entries(preview.provenanceByField)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("; ")}
              />
              <Field
                label={t("admissionWorkflowVisibility.package.sections.clinicalAudit")}
                value={
                  workflow.decisionByUserId
                    ? `decisionBy=${workflow.decisionByUserId}`
                    : null
                }
              />
              {/* Companion clinical sections — package may not yet carry structured values. */}
              {(
                [
                  "assessment",
                  "activeOrders",
                  "consults",
                  "outstandingLabs",
                  "outstandingImaging",
                  "allergies",
                  "medRec",
                  "fallRisk",
                  "codeStatus",
                  "isolation",
                  "precautions",
                  "pendingTasks",
                  "nursingHandoff",
                ] as const
              ).map((key) => (
                <Field
                  key={key}
                  label={t(`admissionWorkflowVisibility.package.sections.${key}`)}
                  value={null}
                  emptyLabel={t("admissionWorkflowVisibility.package.notInPackage")}
                />
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <Link
                href={emergencyActiveWorkspacePath(encounterId)}
                style={{ fontSize: 13, color: "#0f766e" }}
              >
                {t("admissionWorkflowVisibility.backToEd")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </HospitalCareShell>
  );
}
