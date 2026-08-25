/**
 * MEDUI.CP.1C — Clinician Care Plan workflow panel (durable EncounterCarePlan*).
 * Progress / review / author-owned edit / lifecycle. No second Care Plan store.
 * Does not place Orders / MAR / diagnosis mutations.
 */

"use client";

import React, { useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export type CarePlanWorkflowUserLite = {
  firstName?: string | null;
  lastName?: string | null;
} | null;

export type CarePlanWorkflowComponent = {
  id: string;
  componentType: string;
  kind: "GOAL" | "OUTCOME" | "INTERVENTION" | "MONITORING" | "EDUCATION" | "SAFETY";
  title: string;
  text: string;
  targetOutcome?: string | null;
  discipline?: string | null;
  status?: string | null;
  createdByUserId?: string | null;
  createdBy?: CarePlanWorkflowUserLite;
  createdAt?: string | null;
};

export type CarePlanWorkflowProgress = {
  id?: string;
  narrative: string;
  status?: string | null;
  discipline?: string | null;
  createdAt?: string | null;
  authorUserId?: string | null;
  authorRoleSnapshot?: string | null;
  author?: CarePlanWorkflowUserLite;
};

export type CarePlanWorkflowReview = {
  id?: string;
  reviewStatus?: string | null;
  narrative?: string | null;
  createdAt?: string | null;
  reviewerUserId?: string | null;
  reviewerRoleSnapshot?: string | null;
  reviewer?: CarePlanWorkflowUserLite;
};

export type CarePlanWorkflowTransition = {
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  createdAt?: string | null;
  actorUserId?: string | null;
  actorRoleSnapshot?: string | null;
  actor?: CarePlanWorkflowUserLite;
};

export type CarePlanWorkflowPlan = {
  id: string;
  title: string;
  templateId?: string | null;
  status: string;
  revision: number;
  activatedAt?: string | null;
  activatedByUserId?: string | null;
  activatedBy?: CarePlanWorkflowUserLite;
  completedAt?: string | null;
  discontinuedAt?: string | null;
  components: CarePlanWorkflowComponent[];
  progress: CarePlanWorkflowProgress[];
  reviews: CarePlanWorkflowReview[];
  transitions: CarePlanWorkflowTransition[];
};

type Section = "activePlans" | "goalsOutcomes" | "interventions" | "progress" | "history";

type Props = {
  encounterId: string;
  section: Section;
  plans: CarePlanWorkflowPlan[];
  currentUserId: string;
  roleCodes: readonly string[];
  locked?: boolean;
  onPlansChanged: (plans: CarePlanWorkflowPlan[]) => void;
  /** Optional full list refresh (plans + suggestions). Prefer when CP.1D suggestions are present. */
  onListPayload?: (payload: { plans?: Array<Record<string, any>>; suggestions?: unknown[] }) => void;
  onMessage: (message: string | null) => void;
  resolvePlanTitle: (plan: CarePlanWorkflowPlan) => string;
  resolveComponentTitle: (title: string) => string;
  clinicalError: (error: unknown) => string;
};

const btn: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f766e",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

function displayName(user: CarePlanWorkflowUserLite | undefined): string | null {
  const first = typeof user?.firstName === "string" ? user.firstName.trim() : "";
  const last = typeof user?.lastName === "string" ? user.lastName.trim() : "";
  const joined = [first, last].filter(Boolean).join(" ").trim();
  return joined || null;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function formatDt(iso: string | null | undefined, language: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(language === "fr" ? "fr-HT" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

function roleCredential(
  roleSnapshot: string | null | undefined,
  t: (k: string) => string
): string | null {
  const r = String(roleSnapshot ?? "").toUpperCase();
  if (r === "RN") return t("inpatientMedicalRecordSummaryInp2f.carePlan.credentials.rn");
  if (r === "PROVIDER") return t("inpatientMedicalRecordSummaryInp2f.carePlan.credentials.provider");
  if (r === "PATIENT_CARE_TECH") return t("inpatientMedicalRecordSummaryInp2f.carePlan.credentials.pct");
  if (r === "ADMIN") return t("inpatientMedicalRecordSummaryInp2f.carePlan.credentials.admin");
  return null;
}

function disciplineLabel(discipline: string | null | undefined, t: (k: string) => string): string {
  const d = String(discipline ?? "").toUpperCase();
  const map: Record<string, string> = {
    NURSING: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineNursing",
    PROVIDER: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineProvider",
    RESPIRATORY: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineRespiratory",
    TECHNICIAN: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineTechnician",
    PHYSICAL_THERAPY: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplinePt",
    OCCUPATIONAL_THERAPY: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineOt",
    SPEECH_LANGUAGE: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineSlp",
    PT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplinePt",
    OT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineOt",
    SLP: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineSlp",
  };
  const key = map[d];
  if (key) {
    const localized = t(key);
    if (localized !== key) return localized;
  }
  return discipline?.trim() || "—";
}

function statusLabel(status: string | null | undefined, t: (k: string) => string): string {
  const s = String(status ?? "").toUpperCase();
  const map: Record<string, string> = {
    DRAFT: "inpatientMedicalRecordSummaryInp2f.carePlan.status.draft",
    ACTIVE: "inpatientMedicalRecordSummaryInp2f.carePlan.status.active",
    ON_HOLD: "inpatientMedicalRecordSummaryInp2f.carePlan.status.onHold",
    UNDER_REVIEW: "inpatientMedicalRecordSummaryInp2f.carePlan.status.underReview",
    IN_REVIEW: "inpatientMedicalRecordSummaryInp2f.carePlan.status.underReview",
    COMPLETED: "inpatientMedicalRecordSummaryInp2f.carePlan.status.completed",
    DISCONTINUED: "inpatientMedicalRecordSummaryInp2f.carePlan.status.discontinued",
    NOT_STARTED: "inpatientNursingAdmissionInp2g.carePlanWorkspace.componentNotStarted",
    IN_PROGRESS: "inpatientNursingAdmissionInp2g.carePlanWorkspace.progressProgressing",
    MET: "inpatientNursingAdmissionInp2g.carePlanWorkspace.progressMet",
    PARTIALLY_MET: "inpatientNursingAdmissionInp2g.carePlanWorkspace.progressPartial",
    NOT_MET: "inpatientNursingAdmissionInp2g.carePlanWorkspace.progressNotProgressing",
  };
  const key = map[s];
  if (key) {
    const localized = t(key);
    if (localized !== key) return localized;
  }
  return status ?? "—";
}

function isCurrent(status: string): boolean {
  const s = status.toUpperCase();
  return s === "ACTIVE" || s === "ON_HOLD" || s === "UNDER_REVIEW" || s === "DRAFT";
}

function isHistorical(status: string): boolean {
  const s = status.toUpperCase();
  return s === "COMPLETED" || s === "DISCONTINUED";
}

export function resolveWorkflowComponentKind(raw: {
  componentType?: string;
  monitoringJson?: unknown;
  educationJson?: unknown;
  sourceTemplateComponentId?: string | null;
  targetOutcome?: string | null;
}): CarePlanWorkflowComponent["kind"] {
  const type = String(raw.componentType ?? "").toUpperCase();
  const source = String(raw.sourceTemplateComponentId ?? "").toLowerCase();
  if ((raw.monitoringJson != null && typeof raw.monitoringJson === "object") || source.includes("monitor")) {
    return "MONITORING";
  }
  if ((raw.educationJson != null && typeof raw.educationJson === "object") || source.includes("educat")) {
    return "EDUCATION";
  }
  if (source.includes("safety") || source.includes("precaution")) return "SAFETY";
  if (type === "GOAL") {
    if (source.includes("outcome") || (typeof raw.targetOutcome === "string" && raw.targetOutcome.trim())) {
      return "OUTCOME";
    }
    return "GOAL";
  }
  return "INTERVENTION";
}

export function mapDurableCarePlans(payloadPlans: Array<Record<string, any>>): CarePlanWorkflowPlan[] {
  return (payloadPlans ?? []).map((plan) => ({
    id: String(plan.id),
    title: String(plan.title ?? ""),
    templateId: typeof plan.templateId === "string" ? plan.templateId : null,
    status: String(plan.status ?? "ACTIVE"),
    revision: Number(plan.revision ?? 1),
    activatedAt: plan.activatedAt ?? null,
    activatedByUserId: plan.activatedByUserId ?? null,
    activatedBy: plan.activatedBy ?? null,
    completedAt: plan.completedAt ?? null,
    discontinuedAt: plan.discontinuedAt ?? null,
    components: (plan.components ?? []).map((c: any) => ({
      id: String(c.id),
      componentType: String(c.componentType ?? ""),
      kind: resolveWorkflowComponentKind(c),
      title: String(c.title ?? ""),
      text: String(c.text ?? ""),
      targetOutcome: c.targetOutcome ?? null,
      discipline: c.discipline ?? null,
      status: c.status ?? null,
      createdByUserId: c.createdByUserId ?? null,
      createdBy: c.createdBy ?? null,
      createdAt: c.createdAt ?? null,
    })),
    progress: Array.isArray(plan.progress) ? plan.progress : [],
    reviews: Array.isArray(plan.reviews) ? plan.reviews : [],
    transitions: Array.isArray(plan.transitions) ? plan.transitions : [],
  }));
}

export function CarePlanClinicianWorkflowCp1c(props: Props) {
  const { t, language } = useI18n();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [progressNarrative, setProgressNarrative] = useState("");
  const [progressStatus, setProgressStatus] = useState("IN_PROGRESS");
  const [reviewNarrative, setReviewNarrative] = useState("");
  const [reviewStatus, setReviewStatus] = useState("CONTINUE");
  const [transitionReason, setTransitionReason] = useState("");

  const isRn = props.roleCodes.includes("RN");
  const isProvider = props.roleCodes.includes("PROVIDER");
  const canClinicalWrite = !props.locked && (isRn || isProvider);

  const visiblePlans = useMemo(() => {
    if (props.section === "history") {
      return props.plans.filter((p) => isHistorical(p.status) || p.transitions.length > 0 || p.progress.length > 0);
    }
    if (props.section === "activePlans") {
      return props.plans.filter((p) => isCurrent(p.status));
    }
    // Goals / Interventions / Progress: current plans first, keep completed readable at bottom
    const current = props.plans.filter((p) => isCurrent(p.status));
    return current.length ? current : props.plans;
  }, [props.plans, props.section]);

  const selected =
    visiblePlans.find((p) => p.id === selectedPlanId) ??
    visiblePlans[0] ??
    null;

  React.useEffect(() => {
    if (selected && selectedPlanId !== selected.id) setSelectedPlanId(selected.id);
  }, [selected, selectedPlanId]);

  const refresh = async () => {
    const payload = await apiFetch(`/encounters/${props.encounterId}/care-plans`);
    if (props.onListPayload) {
      props.onListPayload(payload);
    } else {
      props.onPlansChanged(mapDurableCarePlans(payload?.plans ?? []));
    }
  };

  const documentedLine = (
    name: string | null,
    roleSnapshot: string | null | undefined,
    at: string | null | undefined
  ) => {
    const safeName = name && !looksLikeUuid(name) ? name : null;
    const cred = roleCredential(roleSnapshot, t);
    const who = [safeName, cred].filter(Boolean).join(", ");
    const when = formatDt(at, language);
    if (!who && !when) return null;
    return [who ? `${t("inpatientMedicalRecordSummaryInp2f.carePlan.documentedBy")} ${who}` : null, when]
      .filter(Boolean)
      .join(" · ");
  };

  const reviewedLine = (
    name: string | null,
    roleSnapshot: string | null | undefined,
    at: string | null | undefined
  ) => {
    const safeName = name && !looksLikeUuid(name) ? name : null;
    const cred = roleCredential(roleSnapshot, t);
    const who = [safeName, cred].filter(Boolean).join(", ");
    const when = formatDt(at, language);
    if (!who && !when) return null;
    return [who ? `${t("inpatientMedicalRecordSummaryInp2f.carePlan.reviewedBy")} ${who}` : null, when]
      .filter(Boolean)
      .join(" · ");
  };

  const runTransition = async (plan: CarePlanWorkflowPlan, toStatus: string) => {
    if (!canClinicalWrite) return;
    if ((toStatus === "ON_HOLD" || toStatus === "DISCONTINUED") && !transitionReason.trim()) {
      props.onMessage(t("inpatientNursingAdmissionInp2g.carePlanWorkspace.transitionReasonRequired"));
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/encounters/${props.encounterId}/care-plans/${plan.id}/transitions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toStatus,
          expectedRevision: plan.revision,
          reason: transitionReason.trim() || undefined,
        }),
      });
      setTransitionReason("");
      props.onMessage(null);
      await refresh();
    } catch (error) {
      props.onMessage(props.clinicalError(error));
    } finally {
      setBusy(false);
    }
  };

  const saveComponentEdit = async (plan: CarePlanWorkflowPlan, component: CarePlanWorkflowComponent) => {
    if (!canClinicalWrite) return;
    setBusy(true);
    try {
      await apiFetch(
        `/encounters/${props.encounterId}/care-plans/${plan.id}/components/${component.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: plan.revision,
            title: component.title,
            text: editText,
            status: component.status,
            targetOutcome: component.targetOutcome,
          }),
        }
      );
      setEditComponentId(null);
      props.onMessage(null);
      await refresh();
    } catch (error) {
      props.onMessage(props.clinicalError(error));
    } finally {
      setBusy(false);
    }
  };

  const appendProgress = async (plan: CarePlanWorkflowPlan) => {
    if (!canClinicalWrite || !progressNarrative.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/encounters/${props.encounterId}/care-plans/${plan.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: plan.revision,
          narrative: progressNarrative.trim(),
          status: progressStatus,
          discipline: isRn ? "NURSING" : "PROVIDER",
        }),
      });
      setProgressNarrative("");
      props.onMessage(null);
      await refresh();
    } catch (error) {
      props.onMessage(props.clinicalError(error));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async (plan: CarePlanWorkflowPlan) => {
    if (!canClinicalWrite) return;
    setBusy(true);
    try {
      await apiFetch(`/encounters/${props.encounterId}/care-plans/${plan.id}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: plan.revision,
          reviewStatus,
          narrative: reviewNarrative.trim() || undefined,
        }),
      });
      setReviewNarrative("");
      props.onMessage(null);
      await refresh();
    } catch (error) {
      props.onMessage(props.clinicalError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!visiblePlans.length) {
    return (
      <p data-testid="eicp-empty-plans" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
      </p>
    );
  }

  return (
    <div data-testid="eicp-clinician-workflow-cp1c" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {visiblePlans.map((plan) => {
          const activeChip = selected?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              data-testid={`eicp-select-plan-${plan.id}`}
              onClick={() => setSelectedPlanId(plan.id)}
              style={{
                ...btn,
                background: activeChip ? "#ecfdf5" : "#fff",
                borderColor: activeChip ? "#0f766e" : "#e2e8f0",
              }}
            >
              {props.resolvePlanTitle(plan)} · {statusLabel(plan.status, t)}
            </button>
          );
        })}
      </div>

      {selected ? (
        <article
          data-testid={`eicp-plan-detail-${selected.id}`}
          style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px", display: "grid", gap: 10 }}
        >
          <header>
            <strong style={{ fontSize: 14 }}>{props.resolvePlanTitle(selected)}</strong>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {t("inpatientMedicalRecordSummaryInp2f.carePlan.statusLabel")}: {statusLabel(selected.status, t)}
              {selected.activatedAt
                ? ` · ${t("inpatientMedicalRecordSummaryInp2f.carePlan.activated")}: ${formatDt(selected.activatedAt, language)}`
                : ""}
              {displayName(selected.activatedBy)
                ? ` · ${displayName(selected.activatedBy)}`
                : ""}
            </div>
          </header>

          {(props.section === "activePlans" ||
            props.section === "goalsOutcomes" ||
            props.section === "interventions") && (
            <div style={{ display: "grid", gap: 8 }}>
              {(props.section === "activePlans" || props.section === "goalsOutcomes"
                ? selected.components.filter((c) => c.kind === "GOAL" || c.kind === "OUTCOME")
                : []
              ).map((c) => {
                const own = Boolean(props.currentUserId && c.createdByUserId === props.currentUserId);
                const editing = editComponentId === c.id;
                return (
                  <div key={c.id} data-testid={`eicp-component-${c.id}`} style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {c.kind === "OUTCOME"
                        ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.outcomeLabel")
                        : t("inpatientNursingAdmissionInp2g.carePlanWorkspace.goalLabel")}
                    </div>
                    <div>{props.resolveComponentTitle(c.text || c.title)}</div>
                    <div style={{ color: "#64748b" }}>
                      {statusLabel(c.status, t)}
                      {c.discipline ? ` · ${disciplineLabel(c.discipline, t)}` : ""}
                    </div>
                    <div style={{ color: "#64748b" }}>
                      {documentedLine(displayName(c.createdBy), null, c.createdAt)}
                    </div>
                    {own && canClinicalWrite && isCurrent(selected.status) ? (
                      editing ? (
                        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            style={{ width: "100%", fontSize: 12, padding: 8, borderRadius: 8 }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" style={btn} disabled={busy} onClick={() => void saveComponentEdit(selected, c)}>
                              {t("common.save")}
                            </button>
                            <button type="button" style={btn} onClick={() => setEditComponentId(null)}>
                              {t("common.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          style={{ ...btn, marginTop: 6 }}
                          data-testid={`eicp-edit-component-${c.id}`}
                          onClick={() => {
                            setEditComponentId(c.id);
                            setEditText(c.text || props.resolveComponentTitle(c.title));
                          }}
                        >
                          {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.editOwn")}
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}

              {(props.section === "activePlans" || props.section === "interventions"
                ? selected.components.filter(
                    (c) =>
                      c.kind === "INTERVENTION" ||
                      c.kind === "MONITORING" ||
                      c.kind === "EDUCATION" ||
                      c.kind === "SAFETY"
                  )
                : []
              ).map((c) => {
                const own = Boolean(props.currentUserId && c.createdByUserId === props.currentUserId);
                const editing = editComponentId === c.id;
                const kindLabel =
                  c.kind === "MONITORING"
                    ? t("inpatientMedicalRecordSummaryInp2f.carePlan.monitoring")
                    : c.kind === "EDUCATION"
                      ? t("inpatientMedicalRecordSummaryInp2f.carePlan.education")
                      : t("inpatientMedicalRecordSummaryInp2f.carePlan.interventions");
                return (
                  <div key={c.id} data-testid={`eicp-component-${c.id}`} style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 700 }}>{kindLabel}</div>
                    <div>{props.resolveComponentTitle(c.text || c.title)}</div>
                    <div style={{ color: "#64748b" }}>
                      {statusLabel(c.status, t)}
                      {c.discipline ? ` · ${disciplineLabel(c.discipline, t)}` : ""}
                    </div>
                    <div style={{ color: "#64748b" }}>
                      {documentedLine(displayName(c.createdBy), null, c.createdAt)}
                    </div>
                    {own && canClinicalWrite && isCurrent(selected.status) ? (
                      editing ? (
                        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            style={{ width: "100%", fontSize: 12, padding: 8, borderRadius: 8 }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" style={btn} disabled={busy} onClick={() => void saveComponentEdit(selected, c)}>
                              {t("common.save")}
                            </button>
                            <button type="button" style={btn} onClick={() => setEditComponentId(null)}>
                              {t("common.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          style={{ ...btn, marginTop: 6 }}
                          data-testid={`eicp-edit-component-${c.id}`}
                          onClick={() => {
                            setEditComponentId(c.id);
                            setEditText(c.text || props.resolveComponentTitle(c.title));
                          }}
                        >
                          {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.editOwn")}
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {(props.section === "activePlans" || props.section === "progress") && (
            <div data-testid="eicp-progress-block" style={{ display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>
                {t("inpatientMedicalRecordSummaryInp2f.carePlan.progress")}
              </strong>
              {selected.progress.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                  {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.noProgressYet")}
                </p>
              ) : (
                selected.progress.map((p, idx) => (
                  <div key={p.id ?? `p-${idx}`} style={{ fontSize: 12 }}>
                    <div>{p.narrative}</div>
                    <div style={{ color: "#64748b" }}>
                      {statusLabel(p.status, t)}
                      {p.discipline ? ` · ${disciplineLabel(p.discipline, t)}` : ""}
                    </div>
                    <div style={{ color: "#64748b" }}>
                      {documentedLine(displayName(p.author), p.authorRoleSnapshot, p.createdAt)}
                    </div>
                  </div>
                ))
              )}
              {canClinicalWrite && isCurrent(selected.status) ? (
                <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.addProgress")}
                  </label>
                  <select
                    value={progressStatus}
                    onChange={(e) => setProgressStatus(e.target.value)}
                    style={{ fontSize: 12, padding: 6, borderRadius: 8, maxWidth: 240 }}
                  >
                    <option value="IN_PROGRESS">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.progressProgressing")}</option>
                    <option value="MET">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.progressMet")}</option>
                    <option value="PARTIALLY_MET">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.progressPartial")}</option>
                    <option value="NOT_MET">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.progressNotProgressing")}</option>
                  </select>
                  <textarea
                    value={progressNarrative}
                    onChange={(e) => setProgressNarrative(e.target.value)}
                    rows={3}
                    data-testid="eicp-progress-narrative"
                    style={{ width: "100%", fontSize: 12, padding: 8, borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    style={btn}
                    disabled={busy || !progressNarrative.trim()}
                    data-testid="eicp-progress-submit"
                    onClick={() => void appendProgress(selected)}
                  >
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.saveProgress")}
                  </button>
                </div>
              ) : null}

              {canClinicalWrite && isCurrent(selected.status) ? (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <strong style={{ fontSize: 13 }}>
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.reviewUpdate")}
                  </strong>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    style={{ fontSize: 12, padding: 6, borderRadius: 8, maxWidth: 240 }}
                  >
                    <option value="CONTINUE">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.reviewContinue")}</option>
                    <option value="MODIFY">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.reviewModify")}</option>
                    <option value="READY_TO_COMPLETE">{t("inpatientNursingAdmissionInp2g.carePlanWorkspace.reviewReadyComplete")}</option>
                  </select>
                  <textarea
                    value={reviewNarrative}
                    onChange={(e) => setReviewNarrative(e.target.value)}
                    rows={2}
                    data-testid="eicp-review-narrative"
                    style={{ width: "100%", fontSize: 12, padding: 8, borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    style={btn}
                    disabled={busy}
                    data-testid="eicp-review-submit"
                    onClick={() => void submitReview(selected)}
                  >
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.saveReview")}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {(props.section === "activePlans" || props.section === "history") && (
            <div data-testid="eicp-history-block" style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: 13 }}>
                {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.navHistory")}
              </strong>
              {selected.reviews.map((r, idx) => (
                <div key={r.id ?? `r-${idx}`} style={{ fontSize: 12 }}>
                  <div>{r.narrative || r.reviewStatus || t("inpatientMedicalRecordSummaryInp2f.carePlan.reviews")}</div>
                  <div style={{ color: "#64748b" }}>
                    {reviewedLine(displayName(r.reviewer), r.reviewerRoleSnapshot, r.createdAt)}
                  </div>
                </div>
              ))}
              {selected.transitions.map((tr, idx) => (
                <div key={`t-${idx}`} style={{ fontSize: 12, color: "#334155" }}>
                  {statusLabel(tr.fromStatus, t)} → {statusLabel(tr.toStatus, t)}
                  {tr.reason ? ` · ${tr.reason}` : ""}
                  <div style={{ color: "#64748b" }}>
                    {documentedLine(displayName(tr.actor), tr.actorRoleSnapshot, tr.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canClinicalWrite && isCurrent(selected.status) && props.section === "activePlans" ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.status === "ACTIVE" || selected.status === "UNDER_REVIEW" ? (
                  <button type="button" style={btn} disabled={busy} data-testid={`eicp-complete-${selected.id}`} onClick={() => void runTransition(selected, "COMPLETED")}>
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.complete")}
                  </button>
                ) : null}
                {selected.status === "ACTIVE" ? (
                  <button type="button" style={btn} disabled={busy} data-testid={`eicp-hold-${selected.id}`} onClick={() => void runTransition(selected, "ON_HOLD")}>
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.hold")}
                  </button>
                ) : null}
                {selected.status === "ON_HOLD" ? (
                  <button type="button" style={btn} disabled={busy} data-testid={`eicp-reactivate-${selected.id}`} onClick={() => void runTransition(selected, "ACTIVE")}>
                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.reactivate")}
                  </button>
                ) : null}
                <button type="button" style={btn} disabled={busy} data-testid={`eicp-discontinue-${selected.id}`} onClick={() => void runTransition(selected, "DISCONTINUED")}>
                  {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.discontinue")}
                </button>
              </div>
              <input
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder={t("inpatientNursingAdmissionInp2g.carePlanWorkspace.transitionReasonPlaceholder")}
                data-testid="eicp-transition-reason"
                style={{ fontSize: 12, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
            </div>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
