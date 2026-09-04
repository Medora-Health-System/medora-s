"use client";

/**
 * MEDUI.CP.1A / CP.1C — Enterprise Interdisciplinary Care Plans clinician workspace.
 * Canonical authority: EncounterCarePlan* (activate + document progress/review/lifecycle).
 * Obs + IP: durable API. ED: limited projection only (no redesign this phase).
 */

import React, { useMemo, useState } from "react";
import type { CarePlanPatientPlan, EnterpriseClinicalDocument } from "@medora/shared";
import {
  activateCarePlanFromTemplate,
  buildEnterpriseInterdisciplinaryCarePlansSummary,
  CARE_PLAN_TEMPLATE_CATEGORIES,
  CARE_PLAN_TEMPLATE_CATEGORY_LABEL_KEYS,
  carePlanWorkspaceSectionsForCareSetting,
  CLINICIAN_CARE_PLAN_PRIMARY_SECTION_IDS,
  getCarePlanTemplate,
  previewCarePlanTemplate,
  isCanonicalCarePlanTemplateI18nKey,
  coerceCarePlanClinicalLocale,
  resolveCarePlanClinicalNarrativeForClinician,
  resolveCarePlanRoleProfile,
  resolveCarePlanWorkspaceSection,
  searchCarePlanTemplates,
  type CarePlanRoleProfile,
  type CarePlanTemplateCategory,
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
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { adaptProductUiToBilingualStorageLocale, resolveProductUiLanguageOrDefault } from "@/i18n/config";

import {
  CarePlanClinicianWorkflowCp1c,
  mapDurableCarePlans,
  type CarePlanWorkflowPlan,
} from "@/features/clinical-documentation/CarePlanClinicianWorkflowCp1c";

function carePlanBilingualStorageLocale(language: string): "en" | "fr" {
  const adapted = adaptProductUiToBilingualStorageLocale(language);
  return adapted.kind === "localized" ? adapted.locale : "en";
}

type CarePlanSuggestionDto = {
  templateId: string;
  kind: "SUGGEST_ACTIVATE" | "SUGGEST_REVIEW";
  reasonKey: string;
  sourceKind?: string;
};

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

const CATALOG_FILTER_IDS: Array<"ALL" | CarePlanTemplateCategory> = [
  "ALL",
  ...CARE_PLAN_TEMPLATE_CATEGORIES,
];

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function clinicalCarePlanErrorMessage(error: unknown, t: (key: string) => string): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const upper = raw.toUpperCase();
  if (upper.includes("CARE_PLAN_REVISION_CONFLICT") || upper.includes("409")) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.revisionConflict");
  }
  if (upper.includes("CARE_PLAN_COMPONENT_NOT_AUTHOR")) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.notAuthor");
  }
  if (upper.includes("CARE_PLAN_LEGACY_OPS_WRITE_FROZEN")) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.legacyOpsReadOnly");
  }
  if (upper.includes("CARE_PLAN_TRANSITION_REASON_REQUIRED")) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.transitionReasonRequired");
  }
  if (upper.includes("CARE_PLAN_TRANSITION_INVALID")) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.transitionInvalid");
  }
  if (/^[A-Z0-9_]+$/.test(raw.trim()) || /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw)) {
    return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.genericError");
  }
  return raw || t("inpatientNursingAdmissionInp2g.carePlanWorkspace.genericError");
}

function toSummaryPlans(plans: CarePlanWorkflowPlan[]): CarePlanPatientPlan[] {
  return plans.map((plan) => ({
    planId: plan.id,
    encounterId: "",
    patientId: "",
    facilityId: "",
    sourceTemplateId: plan.templateId ?? undefined,
    title: plan.title,
    lifecycleState:
      plan.status === "UNDER_REVIEW"
        ? "IN_REVIEW"
        : (plan.status as CarePlanPatientPlan["lifecycleState"]),
    components: plan.components.map((component) => ({
      componentId: component.id,
      kind: component.kind as CarePlanPatientPlan["components"][number]["kind"],
      title: component.title,
      body: component.text,
      custom: false,
      disciplineHint: component.discipline ?? undefined,
      status:
        component.status === "NOT_STARTED"
          ? "PENDING"
          : ((component.status as CarePlanPatientPlan["components"][number]["status"]) ?? "PENDING"),
      isRecommendationNotOrder: true,
      safetyDoesNotAuthorizePrecaution: true,
      authorUserId: component.createdByUserId ?? undefined,
      lastUpdatedAt: component.createdAt ?? undefined,
    })),
    activatedAt: plan.activatedAt ?? undefined,
    activatedByUserId: plan.activatedByUserId ?? undefined,
    completedAt: plan.completedAt ?? undefined,
    discontinuedAt: plan.discontinuedAt ?? undefined,
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
  })) as CarePlanPatientPlan[];
}

function componentKindLabel(kind: string, t: (key: string) => string): string {
  const k = kind.toUpperCase();
  if (k === "GOAL") return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.goalLabel");
  if (k === "OUTCOME") return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.outcomeLabel");
  if (k === "INTERVENTION") return t("inpatientMedicalRecordSummaryInp2f.carePlan.interventions");
  if (k === "MONITORING") return t("inpatientMedicalRecordSummaryInp2f.carePlan.monitoring");
  if (k === "EDUCATION") return t("inpatientMedicalRecordSummaryInp2f.carePlan.education");
  if (k === "SAFETY") return t("inpatientMedicalRecordSummaryInp2f.carePlan.safety");
  return t("inpatientNursingAdmissionInp2g.carePlanWorkspace.goalLabel");
}

function disciplineFilterLabel(
  id: string,
  t: (key: string) => string
): string {
  const map: Record<string, string> = {
    ALL: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineAll",
    NURSING: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineNursing",
    PROVIDER: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineProvider",
    RESPIRATORY: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineRespiratory",
    PT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplinePt",
    OT: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineOt",
    SLP: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineSlp",
    TECHNICIAN: "inpatientNursingAdmissionInp2g.carePlanWorkspace.disciplineTechnician",
  };
  return t(map[id] ?? map.ALL);
}

export function EnterpriseInterdisciplinaryCarePlansD4b6(
  props: EnterpriseInterdisciplinaryCarePlansProps
) {
  const { t, language } = useI18n();
  const { userId } = useFacilityAndRoles();
  const roleProfile =
    props.roleProfile ?? resolveCarePlanRoleProfile(props.roleCodes ?? ["RN"]);
  const isEd = props.careSetting === "EMERGENCY";
  const canActivate = !isEd && !props.isLocked && roleProfile === "NURSE_CARE_PLAN_AUTHOR";

  const sections = useMemo(
    () =>
      carePlanWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: false,
        clinicianPrimaryNav: true,
      }),
    [props.careSetting, roleProfile]
  );

  const primaryNavSections = useMemo(() => {
    const primary = new Set<string>(CLINICIAN_CARE_PLAN_PRIMARY_SECTION_IDS as readonly string[]);
    if (props.careSetting === "EMERGENCY") {
      return sections.filter((s) => s.id === "overview" || s.id === "activePlans");
    }
    return sections.filter((s) => primary.has(s.id));
  }, [sections, props.careSetting]);

  const [active, setActive] = useState<EnterpriseCarePlanWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : props.careSetting === "EMERGENCY"
        ? "overview"
        : "activePlans"
  );
  const [disciplineFilter, setDisciplineFilter] = useState<
    "ALL" | "NURSING" | "PROVIDER" | "RESPIRATORY" | "PT" | "OT" | "SLP" | "TECHNICIAN"
  >("ALL");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | CarePlanTemplateCategory>("ALL");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [durablePlans, setDurablePlans] = useState<CarePlanWorkflowPlan[]>([]);
  const [suggestions, setSuggestions] = useState<CarePlanSuggestionDto[]>([]);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [activationMessage, setActivationMessage] = useState<string | null>(null);

  const applyCarePlanListPayload = (payload: {
    plans?: Array<Record<string, any>>;
    suggestions?: unknown;
  }) => {
    setDurablePlans(mapDurableCarePlans(payload?.plans ?? []));
    const raw = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
    setSuggestions(
      raw.filter(
        (row): row is CarePlanSuggestionDto =>
          !!row &&
          typeof row === "object" &&
          typeof (row as CarePlanSuggestionDto).templateId === "string" &&
          typeof (row as CarePlanSuggestionDto).kind === "string" &&
          typeof (row as CarePlanSuggestionDto).reasonKey === "string"
      )
    );
  };

  React.useEffect(() => {
    if (props.careSetting !== "INPATIENT" && props.careSetting !== "OBSERVATION") return;
    let cancelled = false;
    apiFetch(`/encounters/${props.encounterId}/care-plans`)
      .then((payload: { plans?: Array<Record<string, any>>; suggestions?: CarePlanSuggestionDto[] }) => {
        if (!cancelled) applyCarePlanListPayload(payload);
      })
      .catch((error) => {
        if (!cancelled) setActivationMessage(clinicalCarePlanErrorMessage(error, t));
      });
    return () => {
      cancelled = true;
    };
  }, [props.careSetting, props.encounterId, t]);

  React.useEffect(() => {
    if (!sections.some((s) => s.id === active)) {
      setActive(props.careSetting === "EMERGENCY" ? "overview" : "activePlans");
    }
  }, [sections, active, props.careSetting]);

  const summaryPlans = useMemo(() => toSummaryPlans(durablePlans), [durablePlans]);

  const summary = useMemo(
    () =>
      buildEnterpriseInterdisciplinaryCarePlansSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
        plans: summaryPlans,
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      roleProfile,
      summaryPlans,
    ]
  );

  const nursing = props.nursingContributions ?? summary.nursingContributions;
  const rt = props.rtContributions ?? summary.rtContributions;
  const rehab = props.rehabContributions ?? summary.rehabContributions;
  const tech = props.techProgress ?? summary.techProgress;
  const templates = searchCarePlanTemplates(query, categoryFilter);
  const preview = previewId ? previewCarePlanTemplate(previewId) : null;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];

  const resolveTemplateTitle = (templateId: string | null | undefined, fallback?: string) => {
    const tpl = templateId ? getCarePlanTemplate(templateId) : null;
    if (tpl) return t(tpl.titleKey);
    return fallback && fallback.trim() ? fallback : templateId ?? "—";
  };

  const resolvePlanTitle = (plan: CarePlanWorkflowPlan) =>
    resolveTemplateTitle(plan.templateId, plan.title);
  const resolveComponentTitle = (value: string) => {
    const locale = resolveProductUiLanguageOrDefault(language);
    // CP.1F.1 / CP.1F.2 — never show raw canonical template keys as clinical text.
    if (isCanonicalCarePlanTemplateI18nKey(value)) {
      return resolveCarePlanClinicalNarrativeForClinician(
        value,
        coerceCarePlanClinicalLocale(locale)
      );
    }
    const localized = t(value);
    return localized === value ? value : localized;
  };

  const selectSection = (id: string) => {
    const resolved = resolveCarePlanWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  const onActivate = async (templateId: string) => {
    if (!canActivate) return;
    if (props.careSetting === "INPATIENT" || props.careSetting === "OBSERVATION") {
      try {
        const plan = await apiFetch(`/encounters/${props.encounterId}/care-plans`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId,
            clinicalLocale: carePlanBilingualStorageLocale(language),
          }),
        });
        setActivationMessage(t("inpatientNursingAdmissionInp2g.carePlanWorkspace.activatedOk"));
        window.dispatchEvent(
          new CustomEvent("medora:care-plan-persisted", { detail: { carePlanId: plan.id } })
        );
        const payload = await apiFetch(`/encounters/${props.encounterId}/care-plans`);
        applyCarePlanListPayload(payload);
        setActive("activePlans");
      } catch (error) {
        setActivationMessage(clinicalCarePlanErrorMessage(error, t));
      }
      return;
    }
    const result = activateCarePlanFromTemplate({
      planId: `plan-${templateId}-${Date.now()}`,
      encounterId: props.encounterId,
      patientId: props.patientId,
      facilityId: props.facilityId,
      templateId,
      clinicalLocale: carePlanBilingualStorageLocale(language),
      activatedByUserId: "session-nurse",
      activatedAt: new Date().toISOString(),
      careSetting: props.careSetting,
      roleProfile,
      existingActivePlans: summaryPlans,
    });
    if (result.accepted && result.plan) {
      setActivationMessage(t("inpatientNursingAdmissionInp2g.carePlanWorkspace.activatedOk"));
      setActive("activePlans");
    } else {
      setActivationMessage(result.reason ?? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.genericError"));
    }
  };

  const workflowSection =
    active === "goalsOutcomes"
      ? "goalsOutcomes"
      : active === "interventions" || active === "monitoring" || active === "education" || active === "safety"
        ? "interventions"
        : active === "progress" || active === "review"
          ? "progress"
          : active === "history"
            ? "history"
            : "activePlans";

  const showWorkflow =
    active === "activePlans" ||
    active === "goalsOutcomes" ||
    active === "interventions" ||
    active === "monitoring" ||
    active === "education" ||
    active === "safety" ||
    active === "progress" ||
    active === "review" ||
    active === "history";

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedSuggestionIds.includes(`${s.kind}:${s.templateId}`)
  );

  const suggestionReason = (reasonKey: string) => {
    const key = `inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionReasons.${reasonKey}`;
    const localized = t(key);
    return localized === key
      ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionSuggested")
      : localized;
  };

  const reviewSuggestion = (templateId: string) => {
    setPreviewId(templateId);
    setActive("templatePreview");
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

      {!isEd && visibleSuggestions.length > 0 ? (
        <section
          data-testid="eicp-suggestions"
          style={{
            ...MEDORA_CARD_SHELL,
            padding: "10px 12px",
            display: "grid",
            gap: 8,
            borderColor: "#bae6fd",
            background: "#f0f9ff",
          }}
        >
          <strong style={{ fontSize: 13, color: "#0c4a6e" }}>
            {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionsHeading")}
          </strong>
          {visibleSuggestions.map((s) => (
            <div
              key={`${s.kind}-${s.templateId}`}
              data-testid={`eicp-suggestion-${s.templateId}`}
              data-suggestion-kind={s.kind}
              style={{
                display: "grid",
                gap: 6,
                border: "1px solid #e0f2fe",
                borderRadius: 10,
                padding: "8px 10px",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                {resolveTemplateTitle(s.templateId)}
                <span style={{ marginLeft: 8, fontWeight: 600, color: "#0369a1", fontSize: 12 }}>
                  {s.kind === "SUGGEST_REVIEW"
                    ? t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionReviewRecommended")
                    : t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionSuggested")}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#334155" }}>
                {suggestionReason(s.reasonKey)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button
                  type="button"
                  data-testid={`eicp-suggestion-review-${s.templateId}`}
                  style={linkButtonStyle}
                  onClick={() => reviewSuggestion(s.templateId)}
                >
                  {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionReview")}
                </button>
                <button
                  type="button"
                  data-testid={`eicp-suggestion-dismiss-${s.templateId}`}
                  style={linkButtonStyle}
                  onClick={() =>
                    setDismissedSuggestionIds((prev) =>
                      prev.includes(`${s.kind}:${s.templateId}`)
                        ? prev
                        : [...prev, `${s.kind}:${s.templateId}`]
                    )
                  }
                >
                  {t("inpatientNursingAdmissionInp2g.carePlanWorkspace.suggestionNotNow")}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

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
        {primaryNavSections.map((section) => (
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
            {t(
              (
                {
                  activePlans: "inpatientNursingAdmissionInp2g.carePlanWorkspace.navActivePlans",
                  goalsOutcomes: "inpatientNursingAdmissionInp2g.carePlanWorkspace.navGoalsOutcomes",
                  interventions: "inpatientNursingAdmissionInp2g.carePlanWorkspace.navInterventions",
                  progress: "inpatientNursingAdmissionInp2g.carePlanWorkspace.navProgress",
                  history: "inpatientNursingAdmissionInp2g.carePlanWorkspace.navHistory",
                  overview: "enterpriseInterdisciplinaryCarePlansD4b6.sections.overview",
                } as Record<string, string>
              )[section.id] ?? section.titleKey
            )}
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
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                {summary.activeTemplates.length}{" "}
                {t("enterpriseInterdisciplinaryCarePlansD4b6.overview.templatesHint")}
              </p>
              <button
                type="button"
                data-testid="eicp-overview-open-catalog"
                style={{ ...linkButtonStyle, marginTop: 6 }}
                onClick={() => {
                  setActive("templateCatalog");
                  setQuery("");
                  setCategoryFilter("ALL");
                }}
              >
                {t("enterpriseInterdisciplinaryCarePlansD4b6.sections.templateCatalog")}
              </button>
            </div>
            <div>
              <strong style={{ fontSize: 13 }}>
                {t("enterpriseInterdisciplinaryCarePlansD4b6.overview.plansHeading")}
              </strong>
              {durablePlans.length === 0 ? (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
                </p>
              ) : (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {durablePlans.map((p) => (
                    <li key={p.id}>
                      {resolvePlanTitle(p)} —{" "}
                      {t(
                        `enterpriseInterdisciplinaryCarePlansD4b6.lifecycle.${
                          p.status === "UNDER_REVIEW" ? "IN_REVIEW" : p.status
                        }`
                      )}
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
            <div
              data-testid="eicp-template-category-filters"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {CATALOG_FILTER_IDS.map((id) => {
                const selected = categoryFilter === id;
                const labelKey =
                  id === "ALL"
                    ? "enterpriseInterdisciplinaryCarePlansD4b6.categories.ALL"
                    : CARE_PLAN_TEMPLATE_CATEGORY_LABEL_KEYS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    data-testid={`eicp-category-${id}`}
                    data-active={selected ? "true" : "false"}
                    onClick={() => setCategoryFilter(id)}
                    style={{
                      ...linkButtonStyle,
                      padding: "4px 10px",
                      fontSize: 11,
                      background: selected ? "#ecfdf5" : "#fff",
                      borderColor: selected ? "#0f766e" : "#e2e8f0",
                    }}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
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
                    <strong style={{ fontSize: 13 }}>{t(tpl.titleKey)}</strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{t(tpl.descriptionKey)}</span>
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
                          onClick={() => void onActivate(tpl.templateId)}
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
              <strong style={{ fontSize: 14 }}>{t(preview.template.titleKey)}</strong>
              <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
                {t(preview.template.descriptionKey)}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {preview.template.components.map((c) => (
                  <li key={c.componentId}>
                    {componentKindLabel(c.kind, t)}: {t(c.bodyKey)}
                  </li>
                ))}
              </ul>
              {canActivate ? (
                <button
                  type="button"
                  style={linkButtonStyle}
                  data-testid="eicp-activate-from-preview"
                  onClick={() => void onActivate(preview.template!.templateId)}
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

        {showWorkflow ? (
          <>
            {/* MEDUI.CP.1C — duplicate secondary plan-filter row removed; primary nav is sole section driver. */}
            <div
              data-testid="eicp-discipline-filter"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {(
                ["ALL", "NURSING", "PROVIDER", "RESPIRATORY", "PT", "OT", "SLP", "TECHNICIAN"] as const
              ).map((id) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`eicp-discipline-${id}`}
                  data-active={disciplineFilter === id ? "true" : "false"}
                  onClick={() => setDisciplineFilter(id)}
                  style={{
                    ...linkButtonStyle,
                    background: disciplineFilter === id ? "#f0f9ff" : "#fff",
                    borderColor: disciplineFilter === id ? "#0284c7" : "#e2e8f0",
                    color: "#0c4a6e",
                  }}
                >
                  {disciplineFilterLabel(id, t)}
                </button>
              ))}
            </div>

            <div data-testid="eicp-interdisciplinary-contributions" style={{ display: "grid", gap: 6 }}>
              {[
                ...((disciplineFilter === "ALL" || disciplineFilter === "NURSING")
                  ? nursing.map((c, idx) => ({
                      id: `nursing-${(c as { sourceCardId?: string }).sourceCardId ?? idx}`,
                      disciplineLabel: disciplineFilterLabel("NURSING", t),
                      text: (c as { summaryText?: string | null }).summaryText ?? "",
                      author: (c as { authorDisplayName?: string | null }).authorDisplayName,
                    }))
                  : []),
                ...((disciplineFilter === "ALL" || disciplineFilter === "RESPIRATORY")
                  ? rt.map((c, idx) => ({
                      id: `rt-${idx}`,
                      disciplineLabel: disciplineFilterLabel("RESPIRATORY", t),
                      text: (c as { summaryText?: string | null }).summaryText ?? "",
                      author: (() => {
                        const name = (c as { authorDisplayName?: string | null }).authorDisplayName;
                        if (name && !looksLikeUuid(name)) return name;
                        return null;
                      })(),
                    }))
                  : []),
                ...((disciplineFilter === "ALL" ||
                disciplineFilter === "PT" ||
                disciplineFilter === "OT" ||
                disciplineFilter === "SLP")
                  ? rehab
                      .filter((c) => {
                        if (disciplineFilter === "ALL") return true;
                        const d = String((c as { discipline?: string }).discipline ?? "").toUpperCase();
                        if (disciplineFilter === "PT") return d.includes("PHYSICAL");
                        if (disciplineFilter === "OT") return d.includes("OCCUPATIONAL");
                        if (disciplineFilter === "SLP") return d.includes("SPEECH");
                        return true;
                      })
                      .map((c, idx) => ({
                        id: `rehab-${idx}`,
                        disciplineLabel: disciplineFilterLabel(
                          disciplineFilter === "ALL" ? "PT" : disciplineFilter,
                          t
                        ),
                        text: (c as { summaryText?: string | null }).summaryText ?? "",
                        author: (() => {
                          const name = (c as { authorDisplayName?: string | null }).authorDisplayName;
                          if (name && !looksLikeUuid(name)) return name;
                          return null;
                        })(),
                      }))
                  : []),
                ...((disciplineFilter === "ALL" || disciplineFilter === "TECHNICIAN")
                  ? tech.map((c, idx) => ({
                      id: `tech-${c.activityId ?? idx}`,
                      disciplineLabel: disciplineFilterLabel("TECHNICIAN", t),
                      text: t("inpatientNursingAdmissionInp2g.carePlanWorkspace.technicianProgress"),
                      author: c.performerDisplayName,
                    }))
                  : []),
              ]
                .filter((row) => row.text)
                .map((row) => (
                  <div
                    key={row.id}
                    data-testid={`eicp-contribution-${row.id}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: "#334155",
                    }}
                  >
                    <strong>{row.disciplineLabel}</strong>
                    {row.author && !looksLikeUuid(String(row.author)) ? ` · ${row.author}` : ""}
                    <div>{row.text}</div>
                  </div>
                ))}
            </div>

            {activationMessage ? (
              <p data-testid="eicp-workflow-message" style={{ margin: 0, fontSize: 12, color: "#0f766e" }}>
                {activationMessage}
              </p>
            ) : null}

            <CarePlanClinicianWorkflowCp1c
              encounterId={props.encounterId}
              section={workflowSection}
              plans={durablePlans}
              currentUserId={userId}
              roleCodes={props.roleCodes ?? []}
              locked={Boolean(props.isLocked)}
              onPlansChanged={setDurablePlans}
              onListPayload={applyCarePlanListPayload}
              onMessage={setActivationMessage}
              resolvePlanTitle={resolvePlanTitle}
              resolveComponentTitle={resolveComponentTitle}
              clinicalError={(error) => clinicalCarePlanErrorMessage(error, t)}
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
