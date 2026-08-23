"use client";

/**
 * MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans shell.
 * Obs + IP: full activation workflow. ED: limited projection.
 * Consumes D4B.1 primitives. Composes D4B.2–5 contributions without overwrite.
 */

import React, { useMemo, useState } from "react";
import type { CarePlanPatientPlan, EnterpriseClinicalDocument } from "@medora/shared";
import {
  activateCarePlanFromTemplate,
  buildEnterpriseInterdisciplinaryCarePlansSummary,
  carePlanWorkspaceSectionsForCareSetting,
  listActiveCarePlanTemplates,
  previewCarePlanTemplate,
  resolveCarePlanRoleProfile,
  resolveCarePlanWorkspaceSection,
  searchCarePlanTemplates,
  type CarePlanRoleProfile,
  type EnterpriseCarePlanWorkspaceSectionId,
  type LegacyD3eCarePlanStubProjection,
  type NursingCarePlanContributionProjection,
  type RehabCarePlanContributionProjection,
  type RtCarePlanContributionProjection,
  type TechCarePlanProgressProjection,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";
import {
  EnterpriseClinicalDocumentAmendmentBanner,
  EnterpriseClinicalDocumentCompletenessSummary,
  EnterpriseClinicalDocumentSignatureMeta,
  EnterpriseClinicalDocumentStatusBadge,
  EnterpriseClinicalDocumentUnsignedDraftWarning,
} from "@/features/clinical-documentation/EnterpriseClinicalDocumentPrimitivesD4b1";

export type EnterpriseInterdisciplinaryCarePlansProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: CarePlanRoleProfile;
  isLocked?: boolean;
  plans?: ReadonlyArray<CarePlanPatientPlan>;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingContributions?: ReadonlyArray<NursingCarePlanContributionProjection>;
  rtContributions?: ReadonlyArray<RtCarePlanContributionProjection>;
  rehabContributions?: ReadonlyArray<RehabCarePlanContributionProjection>;
  techProgress?: ReadonlyArray<TechCarePlanProgressProjection>;
  legacyD3eStub?: ReadonlyArray<LegacyD3eCarePlanStubProjection>;
  initialSection?: EnterpriseCarePlanWorkspaceSectionId;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  return (
    <div
      data-testid={`eicp-doc-${doc.documentId}`}
      style={{
        ...MEDORA_CARD_SHELL,
        padding: "10px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>{doc.documentTypeId}</strong>
        <EnterpriseClinicalDocumentStatusBadge state={doc.lifecycleState} compact />
      </div>
      {doc.lifecycleState === "DRAFT" || doc.lifecycleState === "IN_PROGRESS" ? (
        <EnterpriseClinicalDocumentUnsignedDraftWarning />
      ) : null}
      {doc.lifecycleState === "AMENDED" || doc.lifecycleState === "ENTERED_IN_ERROR" ? (
        <EnterpriseClinicalDocumentAmendmentBanner
          kind={doc.enteredInError ? "enteredInError" : "amended"}
          reason={doc.lineage.amendmentReason}
        />
      ) : null}
      <EnterpriseClinicalDocumentSignatureMeta
        authorDisplay={doc.author.displayName}
        signerDisplay={doc.responsibleSigner?.displayName}
        signedAt={doc.signedAt}
        templateVersion={doc.templateVersion}
      />
      <EnterpriseClinicalDocumentCompletenessSummary completeness={doc.completeness} />
    </div>
  );
}

const linkButtonStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#0f766e",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const TEMPLATE_TITLE_KEYS: Record<string, string> = {
  fall_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.title",
  aspiration_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.title",
  acute_pain: "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.title",
  pneumonia: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.title",
  chf: "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.title",
  impaired_mobility: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.title",
  pressure_injury_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.title",
  discharge_readiness: "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.title",
};

const TEMPLATE_DESC_KEYS: Record<string, string> = {
  fall_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.fallRisk.description",
  aspiration_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.aspirationRisk.description",
  acute_pain: "enterpriseInterdisciplinaryCarePlansD4b6.templates.acutePain.description",
  pneumonia: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pneumonia.description",
  chf: "enterpriseInterdisciplinaryCarePlansD4b6.templates.chf.description",
  impaired_mobility: "enterpriseInterdisciplinaryCarePlansD4b6.templates.impairedMobility.description",
  pressure_injury_risk: "enterpriseInterdisciplinaryCarePlansD4b6.templates.pressureInjuryRisk.description",
  discharge_readiness: "enterpriseInterdisciplinaryCarePlansD4b6.templates.dischargeReadiness.description",
};

export function EnterpriseInterdisciplinaryCarePlansD4b6(
  props: EnterpriseInterdisciplinaryCarePlansProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveCarePlanRoleProfile(props.roleCodes ?? ["RN"]);
  const isEd = props.careSetting === "EMERGENCY";
  const canActivate = !isEd && !props.isLocked && roleProfile === "NURSE_CARE_PLAN_AUTHOR";

  const sections = useMemo(
    () =>
      carePlanWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, roleProfile]
  );

  const [active, setActive] = useState<EnterpriseCarePlanWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [localPlans, setLocalPlans] = useState<CarePlanPatientPlan[]>(() => [
    ...(props.plans ?? []),
  ]);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<
    "ACTIVE" | "GOALS" | "INTERVENTIONS" | "PROGRESS" | "COMPLETED" | "HISTORY"
  >("ACTIVE");
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);

  const mapServerPlans = (plans: Array<Record<string, any>>): CarePlanPatientPlan[] =>
    (plans ?? []).map((plan) => ({
      planId: plan.id,
      encounterId: plan.encounterId,
      patientId: plan.patientId,
      facilityId: plan.facilityId,
      sourceTemplateId: plan.templateId,
      sourceTemplateVersion: plan.templateVersion,
      title: plan.title,
      lifecycleState: plan.status === "UNDER_REVIEW" ? "IN_REVIEW" : plan.status,
      components: (plan.components ?? []).map((component: any) => ({
        componentId: component.id,
        sourceTemplateComponentId: component.sourceTemplateComponentId,
        kind: component.componentType,
        title: component.title,
        body: component.text,
        custom: !component.sourceTemplateComponentId,
        disciplineHint: component.discipline,
        status: component.status === "NOT_STARTED" ? "PENDING" : component.status,
        isRecommendationNotOrder: true,
        safetyDoesNotAuthorizePrecaution: true,
        authorUserId: component.createdByUserId,
        lastUpdatedAt: component.updatedAt,
      })),
      activatedAt: plan.activatedAt,
      activatedByUserId: plan.activatedByUserId,
      completedAt: plan.completedAt,
      discontinuedAt: plan.discontinuedAt,
      enteredInError: false,
      isNotDiagnosis: true,
      doesNotMutateProblemList: true,
      doesNotCreateProviderOrders: true,
      doesNotAlterMar: true,
      doesNotFinalizeDiet: true,
      doesNotAlterOxygenVent: true,
      doesNotAuthorizeDischarge: true,
      doesNotProcureDme: true,
      doesNotAuthorizeRestraintsOrIsolation: true,
      sourceTemplateNotMutated: true,
      usesD4b1DocumentLifecycle: true,
      // Preserve server review/progress for dense workspace (non-schema extension via cast)
      ...(plan.reviews ? { reviews: plan.reviews } : {}),
      ...(plan.progress ? { progress: plan.progress } : {}),
      ...(plan.revision != null ? { revision: plan.revision } : {}),
    })) as CarePlanPatientPlan[];

  React.useEffect(() => {
    if (props.careSetting !== "INPATIENT") return;
    let cancelled = false;
    apiFetch(`/encounters/${props.encounterId}/care-plans`)
      .then((payload: { plans?: Array<Record<string, any>> }) => {
        if (!cancelled) setLocalPlans(mapServerPlans(payload?.plans ?? []));
      })
      .catch((error) => {
        if (!cancelled)
          setActivationMessage(error instanceof Error ? error.message : "Care plan load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [props.careSetting, props.encounterId]);

  React.useEffect(() => {
    if (!sections.some((s) => s.id === active)) {
      setActive("overview");
    }
  }, [sections, active]);

  const summary = useMemo(
    () =>
      buildEnterpriseInterdisciplinaryCarePlansSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
        plans: localPlans,
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      roleProfile,
      localPlans,
    ]
  );

  const documents = props.documents ?? summary.documents;
  const nursing = props.nursingContributions ?? summary.nursingContributions;
  const rt = props.rtContributions ?? summary.rtContributions;
  const rehab = props.rehabContributions ?? summary.rehabContributions;
  const tech = props.techProgress ?? summary.techProgress;
  const legacy = props.legacyD3eStub ?? summary.legacyD3eStub;
  const templates = query.trim() ? searchCarePlanTemplates(query) : listActiveCarePlanTemplates();
  const preview = previewId ? previewCarePlanTemplate(previewId) : null;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];

  const selectSection = (id: string) => {
    const resolved = resolveCarePlanWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  const onActivate = async (templateId: string) => {
    if (!canActivate) return;
    if (props.careSetting === "INPATIENT") {
      try {
        const plan = await apiFetch(`/encounters/${props.encounterId}/care-plans`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        setActivationMessage("OK");
        window.dispatchEvent(
          new CustomEvent("medora:care-plan-persisted", { detail: { carePlanId: plan.id } })
        );
        const payload = await apiFetch(`/encounters/${props.encounterId}/care-plans`);
        setLocalPlans(mapServerPlans(payload?.plans ?? []));
        setActive("activePlans");
        setPlanFilter("ACTIVE");
      } catch (error) {
        setActivationMessage(error instanceof Error ? error.message : "Activation denied");
      }
      return;
    }
    const result = activateCarePlanFromTemplate({
      planId: `plan-${templateId}-${Date.now()}`,
      encounterId: props.encounterId,
      patientId: props.patientId,
      facilityId: props.facilityId,
      templateId,
      activatedByUserId: "session-nurse",
      activatedAt: new Date().toISOString(),
      careSetting: props.careSetting,
      roleProfile,
      existingActivePlans: localPlans,
    });
    if (result.accepted && result.plan) {
      setLocalPlans((prev) => [...prev, result.plan!]);
      setActivationMessage(result.reason);
      setActive("activePlans");
    } else {
      setActivationMessage(result.reason);
    }
  };

  return (
    <div
      data-testid="enterprise-interdisciplinary-care-plans-d4b6"
      data-care-setting={props.careSetting}
      style={{ display: "grid", gap: 12 }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "grid", gap: 2 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.title")}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.headerMeta")} ·{" "}
              {t(`enterpriseInterdisciplinaryCarePlansD4b6.careSetting.${props.careSetting}`)}
            </p>
          </div>
          {canActivate ? (
            <button
              type="button"
              data-testid="eicp-add-care-plan"
              style={linkButtonStyle}
              onClick={() => {
                setActive("templateCatalog");
                setQuery("");
              }}
            >
              {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.addCarePlan")}
            </button>
          ) : null}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
          {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.singleSurfaceNote")}
        </p>
      </header>

      <p
        data-testid="eicp-foundation-banner"
        style={{
          margin: 0,
          fontSize: 12,
          color: "#334155",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "8px 10px",
        }}
      >
        {t("enterpriseInterdisciplinaryCarePlansD4b6.foundationBanner")}
      </p>

      {isEd ? (
        <p
          data-testid="eicp-ed-limited-banner"
          style={{
            margin: 0,
            fontSize: 12,
            color: "#92400e",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 12,
            padding: "8px 10px",
          }}
        >
          {t("enterpriseInterdisciplinaryCarePlansD4b6.edLimitedBanner")}
        </p>
      ) : null}

      <nav
        data-testid="eicp-section-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        aria-label={t("enterpriseInterdisciplinaryCarePlansD4b6.title")}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            data-testid={`eicp-section-${section.id}`}
            data-active={active === section.id ? "true" : "false"}
            onClick={() => selectSection(section.id)}
            style={{
              ...linkButtonStyle,
              background: active === section.id ? "#ecfdf5" : "#fff",
              borderColor: active === section.id ? "#0f766e" : "#e2e8f0",
            }}
          >
            {t(section.titleKey)}
          </button>
        ))}
      </nav>

      <section
        data-testid={`eicp-panel-${activeDef?.id ?? "overview"}`}
        style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 10 }}
      >
        {active === "overview" ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.overview.sectionsHint")}
            </p>
            <div>
              <strong style={{ fontSize: 13 }}>
                {t("enterpriseInterdisciplinaryCarePlansD4b6.overview.templatesHeading")}
              </strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {summary.activeTemplates.map((tpl) => (
                  <li key={tpl.templateId}>
                    {t(TEMPLATE_TITLE_KEYS[tpl.templateId] ?? tpl.titleKey)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: 13 }}>
                {t("enterpriseInterdisciplinaryCarePlansD4b6.overview.plansHeading")}
              </strong>
              {localPlans.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
                </p>
              ) : (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {localPlans.map((p) => (
                    <li key={p.planId}>
                      {t(TEMPLATE_TITLE_KEYS[p.sourceTemplateId ?? ""] ?? p.title)} —{" "}
                      {t(`enterpriseInterdisciplinaryCarePlansD4b6.lifecycle.${p.lifecycleState}`)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {active === "templateCatalog" ? (
          <>
            <input
              data-testid="eicp-template-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("enterpriseInterdisciplinaryCarePlansD4b6.searchPlaceholder")}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
            {templates.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyTemplates")}
              </p>
            ) : (
              <ul data-testid="eicp-template-list" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {templates.map((tpl) => (
                  <li
                    key={tpl.templateId}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "8px 10px",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>
                      {t(TEMPLATE_TITLE_KEYS[tpl.templateId] ?? tpl.titleKey)}
                    </strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {t(TEMPLATE_DESC_KEYS[tpl.templateId] ?? tpl.descriptionKey)}
                    </span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={linkButtonStyle}
                        data-testid={`eicp-preview-${tpl.templateId}`}
                        onClick={() => {
                          setPreviewId(tpl.templateId);
                          setActive("templatePreview");
                        }}
                      >
                        {t("enterpriseInterdisciplinaryCarePlansD4b6.previewAction")}
                      </button>
                      {canActivate ? (
                        <button
                          type="button"
                          style={linkButtonStyle}
                          data-testid={`eicp-activate-${tpl.templateId}`}
                          onClick={() => onActivate(tpl.templateId)}
                        >
                          {t("enterpriseInterdisciplinaryCarePlansD4b6.activateAction")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.customizeHint")}
            </p>
            {activationMessage ? (
              <p data-testid="eicp-activation-message" style={{ margin: 0, fontSize: 12, color: "#0f766e" }}>
                {activationMessage}
              </p>
            ) : null}
          </>
        ) : null}

        {active === "templatePreview" ? (
          preview?.template ? (
            <div data-testid="eicp-template-preview" style={{ display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 14 }}>
                {t(TEMPLATE_TITLE_KEYS[preview.template.templateId] ?? preview.template.titleKey)}
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
                {t(
                  TEMPLATE_DESC_KEYS[preview.template.templateId] ??
                    preview.template.descriptionKey
                )}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {preview.template.components.map((c) => (
                  <li key={c.componentId}>
                    {c.kind}: {t(c.titleKey)}
                  </li>
                ))}
              </ul>
              {canActivate ? (
                <button
                  type="button"
                  style={linkButtonStyle}
                  data-testid="eicp-activate-from-preview"
                  onClick={() => onActivate(preview.template!.templateId)}
                >
                  {t("enterpriseInterdisciplinaryCarePlansD4b6.activateAction")}
                </button>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyTemplates")}
            </p>
          )
        ) : null}

        {active === "activePlans" ||
        active === "goalsOutcomes" ||
        active === "interventions" ||
        active === "monitoring" ||
        active === "education" ||
        active === "safety" ||
        active === "progress" ||
        active === "review" ? (
          <>
            <div
              data-testid="eicp-plan-filters"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {(
                [
                  ["ACTIVE", "filterActive"],
                  ["GOALS", "filterGoals"],
                  ["INTERVENTIONS", "filterInterventions"],
                  ["PROGRESS", "filterProgress"],
                  ["COMPLETED", "filterCompleted"],
                  ["HISTORY", "filterHistory"],
                ] as const
              ).map(([id, key]) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`eicp-filter-${id}`}
                  data-active={planFilter === id ? "true" : "false"}
                  onClick={() => setPlanFilter(id)}
                  style={{
                    ...linkButtonStyle,
                    background: planFilter === id ? "#ecfdf5" : "#fff",
                    borderColor: planFilter === id ? "#0f766e" : "#e2e8f0",
                  }}
                >
                  {t(`inpatientNursingAdmissionInp2g.carePlanWorkspace.${key}`)}
                </button>
              ))}
            </div>
            {localPlans.length === 0 ? (
              <p data-testid="eicp-empty-plans" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
              </p>
            ) : (
              <div data-testid="eicp-active-plans" style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    minWidth: 720,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colProblem")}
                      </th>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colGoal")}
                      </th>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colInterventions")}
                      </th>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colOwner")}
                      </th>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colStatus")}
                      </th>
                      <th style={{ padding: "6px 8px" }}>
                        {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPlans
                      .filter((plan) => {
                        if (planFilter === "COMPLETED")
                          return plan.lifecycleState === "COMPLETED" || plan.lifecycleState === "DISCONTINUED";
                        if (planFilter === "HISTORY") return true;
                        if (planFilter === "ACTIVE")
                          return (
                            plan.lifecycleState === "ACTIVE" ||
                            plan.lifecycleState === "IN_PROGRESS" ||
                            plan.lifecycleState === "IN_REVIEW" ||
                            plan.lifecycleState === "DRAFT_CUSTOMIZATION"
                          );
                        return (
                          plan.lifecycleState !== "COMPLETED" &&
                          plan.lifecycleState !== "DISCONTINUED"
                        );
                      })
                      .map((plan) => {
                        const goals = plan.components.filter(
                          (c) => c.kind === "GOAL" || c.kind === "OUTCOME" || c.kind === "FOCUS"
                        );
                        const interventions = plan.components.filter((c) => c.kind === "INTERVENTION");
                        const showGoals =
                          planFilter === "GOALS" ||
                          planFilter === "ACTIVE" ||
                          planFilter === "HISTORY" ||
                          planFilter === "COMPLETED";
                        const showInterventions =
                          planFilter === "INTERVENTIONS" ||
                          planFilter === "ACTIVE" ||
                          planFilter === "HISTORY" ||
                          planFilter === "COMPLETED";
                        const owners = [
                          ...new Set(
                            plan.components
                              .map((c) => (c.disciplineHint ? String(c.disciplineHint) : ""))
                              .filter((d) => d.trim().length > 0)
                          ),
                        ];
                        const revision = (plan as { revision?: number }).revision ?? 1;
                        return (
                          <tr
                            key={plan.planId}
                            data-testid={`eicp-plan-${plan.planId}`}
                            style={{ borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}
                          >
                            <td style={{ padding: "8px" }}>
                              <strong>
                                {t(TEMPLATE_TITLE_KEYS[plan.sourceTemplateId ?? ""] ?? plan.title)}
                              </strong>
                              <div style={{ color: "#64748b", marginTop: 2 }}>
                                {plan.activatedAt
                                  ? String(plan.activatedAt).slice(0, 10)
                                  : "—"}
                              </div>
                            </td>
                            <td style={{ padding: "8px" }}>
                              {showGoals
                                ? goals.map((g) => t(g.title)).join("; ") || "—"
                                : "—"}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {showInterventions
                                ? interventions.map((g) => t(g.title)).join("; ") || "—"
                                : "—"}
                            </td>
                            <td style={{ padding: "8px" }}>{owners.join(", ") || "—"}</td>
                            <td style={{ padding: "8px" }}>
                              {t(
                                `enterpriseInterdisciplinaryCarePlansD4b6.lifecycle.${plan.lifecycleState}`
                              )}
                            </td>
                            <td style={{ padding: "8px" }}>
                              {canActivate &&
                              (plan.lifecycleState === "ACTIVE" ||
                                plan.lifecycleState === "IN_PROGRESS" ||
                                plan.lifecycleState === "IN_REVIEW") ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  <button
                                    type="button"
                                    style={linkButtonStyle}
                                    disabled={busyPlanId === plan.planId}
                                    data-testid={`eicp-complete-${plan.planId}`}
                                    onClick={() => {
                                      void (async () => {
                                        setBusyPlanId(plan.planId);
                                        try {
                                          await apiFetch(
                                            `/encounters/${props.encounterId}/care-plans/${plan.planId}/transitions`,
                                            {
                                              method: "POST",
                                              headers: { "content-type": "application/json" },
                                              body: JSON.stringify({
                                                toStatus: "COMPLETED",
                                                expectedRevision: revision,
                                              }),
                                            }
                                          );
                                          const payload = await apiFetch(
                                            `/encounters/${props.encounterId}/care-plans`
                                          );
                                          setLocalPlans(mapServerPlans(payload?.plans ?? []));
                                        } catch (error) {
                                          setActivationMessage(
                                            error instanceof Error
                                              ? error.message
                                              : "Complete denied"
                                          );
                                        } finally {
                                          setBusyPlanId(null);
                                        }
                                      })();
                                    }}
                                  >
                                    {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.complete")}
                                  </button>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {active === "nursingContributions" ? (
          nursing.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyContributions")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {nursing.map((n, i) => (
                <li key={`${n.sourceCardId ?? "n"}-${i}`}>{n.summaryText ?? n.sourceCardId}</li>
              ))}
            </ul>
          )
        ) : null}

        {active === "rtContributions" ? (
          rt.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyContributions")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {rt.map((r, i) => (
                <li key={`${r.documentTypeId ?? "rt"}-${i}`}>{r.summaryText ?? r.documentTypeId}</li>
              ))}
            </ul>
          )
        ) : null}

        {active === "rehabContributions" ? (
          rehab.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyContributions")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {rehab.map((r, i) => (
                <li key={`${r.discipline}-${i}`}>
                  {r.discipline}: {r.summaryText ?? r.documentTypeId}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "techProgress" ? (
          tech.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyContributions")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {tech.map((x, i) => (
                <li key={`${x.activityId ?? "t"}-${i}`}>
                  {x.activityId} — {x.performerDisplayName ?? x.performerUserId}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "legacyD3eStub" ? (
          legacy.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.emptyLegacy")}
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {legacy.map((item) => (
                <li key={item.itemId}>
                  [{item.discipline}] {item.goalText} — {item.status}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "history" ? (
          documents.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {documents.map((doc) => (
                <DocumentStatusRow key={doc.documentId} doc={doc} />
              ))}
            </div>
          )
        ) : null}

        {active === "deferredBoundaries" ? (
          <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#334155" }}>
            <p style={{ margin: 0 }}>{t("enterpriseInterdisciplinaryCarePlansD4b6.nursingBoundary")}</p>
            <p style={{ margin: 0 }}>{t("enterpriseInterdisciplinaryCarePlansD4b6.rtBoundary")}</p>
            <p style={{ margin: 0 }}>{t("enterpriseInterdisciplinaryCarePlansD4b6.rehabBoundary")}</p>
            <p style={{ margin: 0 }}>{t("enterpriseInterdisciplinaryCarePlansD4b6.techBoundary")}</p>
            <p style={{ margin: 0 }}>{t("enterpriseInterdisciplinaryCarePlansD4b6.deferred")}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
