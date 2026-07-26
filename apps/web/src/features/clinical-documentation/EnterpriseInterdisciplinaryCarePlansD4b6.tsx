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

  const onActivate = (templateId: string) => {
    if (!canActivate) return;
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
      <header style={{ display: "grid", gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          {t("enterpriseInterdisciplinaryCarePlansD4b6.title")}
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("enterpriseInterdisciplinaryCarePlansD4b6.subtitle")} ·{" "}
          {t(`enterpriseInterdisciplinaryCarePlansD4b6.careSetting.${props.careSetting}`)}
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
          localPlans.length === 0 ? (
            <p data-testid="eicp-empty-plans" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseInterdisciplinaryCarePlansD4b6.empty")}
            </p>
          ) : (
            <ul data-testid="eicp-active-plans" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
              {localPlans.map((plan) => (
                <li
                  key={plan.planId}
                  data-testid={`eicp-plan-${plan.planId}`}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 10px" }}
                >
                  <strong style={{ fontSize: 13 }}>
                    {t(TEMPLATE_TITLE_KEYS[plan.sourceTemplateId ?? ""] ?? plan.title)}
                  </strong>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {t(`enterpriseInterdisciplinaryCarePlansD4b6.lifecycle.${plan.lifecycleState}`)}
                  </div>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                    {plan.components
                      .filter((c) => {
                        if (active === "goalsOutcomes") return c.kind === "GOAL" || c.kind === "OUTCOME" || c.kind === "FOCUS";
                        if (active === "interventions") return c.kind === "INTERVENTION";
                        if (active === "monitoring") return c.kind === "MONITORING";
                        if (active === "education") return c.kind === "EDUCATION";
                        if (active === "safety") return c.kind === "SAFETY";
                        return true;
                      })
                      .map((c) => (
                        <li key={c.componentId}>
                          {c.kind}: {t(c.title)} — {c.status}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          )
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
