"use client";

/**
 * MEDUI.D4B.7 — Enterprise Case Management / Social Work / UR / Discharge Planning shell.
 * Obs + IP: coordination dashboard. ED: limited projection.
 * Consumes D4B.1 primitives. Projects D4B.2–6 without overwrite.
 * Planning ≠ discharge authorization. CM / SW / UR remain distinct.
 */

import React, { useMemo, useState } from "react";
import type { CareCoordinationEpisode, EnterpriseClinicalDocument } from "@medora/shared";
import {
  assessReadmissionRiskRules,
  buildEnterpriseCaseManagementDischargePlanningSummary,
  buildLosAvoidableDelayView,
  careCoordinationWorkspaceSectionsForCareSetting,
  openCareCoordinationEpisode,
  planDestinationOnEpisode,
  projectLegacyDischargeOps,
  resolveCareCoordinationRoleProfile,
  resolveCareCoordinationWorkspaceSection,
  upsertBarrierOnEpisode,
  type CareCoordinationBarrierId,
  type CareCoordinationDestinationId,
  type CareCoordinationRoleProfile,
  type EnterpriseCareCoordinationWorkspaceSectionId,
  type D4b6CarePlanCoordinationProjection,
  type LegacyDischargeOpsProjection,
  type NursingCoordinationProjection,
  type RehabCoordinationProjection,
  type RtCoordinationProjection,
  type TechCoordinationProjection,
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

export type EnterpriseCaseManagementDischargePlanningProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: CareCoordinationRoleProfile;
  isLocked?: boolean;
  episodes?: ReadonlyArray<CareCoordinationEpisode>;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  nursingProjections?: ReadonlyArray<NursingCoordinationProjection>;
  rtProjections?: ReadonlyArray<RtCoordinationProjection>;
  rehabProjections?: ReadonlyArray<RehabCoordinationProjection>;
  techProjections?: ReadonlyArray<TechCoordinationProjection>;
  carePlanProjections?: ReadonlyArray<D4b6CarePlanCoordinationProjection>;
  legacyOpsProjections?: ReadonlyArray<LegacyDischargeOpsProjection>;
  /** INP.DIS.1A — read-only D3E.7 ops feed for legacy projection (does not mutate ops). */
  legacyOps?: Parameters<typeof projectLegacyDischargeOps>[0]["ops"];
  initialSection?: EnterpriseCareCoordinationWorkspaceSectionId;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  return (
    <div
      data-testid={`ecmdp-doc-${doc.documentId}`}
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

export function EnterpriseCaseManagementDischargePlanningD4b7(
  props: EnterpriseCaseManagementDischargePlanningProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveCareCoordinationRoleProfile(props.roleCodes ?? ["CM"]);
  const isEd = props.careSetting === "EMERGENCY";
  const canOpenEpisode =
    !isEd &&
    !props.isLocked &&
    (roleProfile === "CASE_MANAGER" ||
      roleProfile === "SOCIAL_WORKER" ||
      roleProfile === "UTILIZATION_REVIEWER");

  const sections = useMemo(
    () =>
      careCoordinationWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, roleProfile]
  );

  const [active, setActive] = useState<EnterpriseCareCoordinationWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );
  const [localEpisodes, setLocalEpisodes] = useState<CareCoordinationEpisode[]>(() => [
    ...(props.episodes ?? []),
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedBarrier, setSelectedBarrier] =
    useState<CareCoordinationBarrierId>("placement_delay");
  const [selectedDestination, setSelectedDestination] =
    useState<CareCoordinationDestinationId>("home");
  const [riskFactors, setRiskFactors] = useState<string[]>(["incomplete_follow_up_plan"]);

  React.useEffect(() => {
    if (!sections.some((s) => s.id === active)) {
      setActive("overview");
    }
  }, [sections, active]);

  const summary = useMemo(
    () =>
      buildEnterpriseCaseManagementDischargePlanningSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
        episodes: localEpisodes,
        legacyOps: props.legacyOps,
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      roleProfile,
      localEpisodes,
      props.legacyOps,
    ]
  );

  const documents = props.documents ?? summary.documents;
  const nursing = props.nursingProjections ?? summary.nursingProjections;
  const rt = props.rtProjections ?? summary.rtProjections;
  const rehab = props.rehabProjections ?? summary.rehabProjections;
  const tech = props.techProjections ?? summary.techProjections;
  const carePlans = props.carePlanProjections ?? summary.carePlanProjections;
  const legacy = props.legacyOpsProjections ?? summary.legacyOpsProjections;
  const readiness = summary.interdisciplinaryReadiness;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];
  const episode = localEpisodes[0] ?? null;
  const risk = assessReadmissionRiskRules({ activeFactorIds: riskFactors });
  const los = buildLosAvoidableDelayView({
    encounterOpenedAt: episode?.openedAt ?? null,
    nowIso: new Date().toISOString(),
    openBarrierIds: (episode?.barriers ?? [])
      .filter((b) => b.status === "OPEN" || b.status === "IN_PROGRESS")
      .map((b) => b.barrierId),
  });

  const selectSection = (id: string) => {
    const resolved = resolveCareCoordinationWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  const onOpenEpisode = () => {
    if (!canOpenEpisode) return;
    const result = openCareCoordinationEpisode({
      episodeId: `cc-${Date.now()}`,
      encounterId: props.encounterId,
      patientId: props.patientId,
      facilityId: props.facilityId,
      openedByUserId: "local-user",
      openedAt: new Date().toISOString(),
      careSetting: props.careSetting,
      roleProfile,
    });
    if (!result.accepted || !result.episode) {
      setMessage(result.reason);
      return;
    }
    setLocalEpisodes([result.episode, ...localEpisodes]);
    setMessage(null);
    setActive("episode");
  };

  const onAddBarrier = () => {
    if (!episode || props.isLocked) return;
    const result = upsertBarrierOnEpisode({
      episode,
      instanceId: `b-${Date.now()}`,
      barrierId: selectedBarrier,
      status: "OPEN",
      owningDiscipline:
        roleProfile === "SOCIAL_WORKER" ? "SOCIAL_WORK" : "CASE_MANAGEMENT",
      updatedAt: new Date().toISOString(),
      roleProfile,
    });
    if (!result.accepted || !result.episode) {
      setMessage(result.reason);
      return;
    }
    setLocalEpisodes([result.episode, ...localEpisodes.slice(1)]);
    setMessage(null);
  };

  const onPlanDestination = () => {
    if (!episode || props.isLocked) return;
    const result = planDestinationOnEpisode({
      episode,
      destinationId: selectedDestination,
      updatedAt: new Date().toISOString(),
      roleProfile,
    });
    if (!result.accepted || !result.episode) {
      setMessage(result.reason);
      return;
    }
    setLocalEpisodes([result.episode, ...localEpisodes.slice(1)]);
    setMessage(null);
  };

  return (
    <div
      data-testid="enterprise-case-management-discharge-planning-d4b7"
      style={{ display: "grid", gap: 12 }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px", display: "grid", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
            {t("enterpriseCaseManagementDischargePlanningD4b7.title")}
          </h2>
          {t("enterpriseCaseManagementDischargePlanningD4b7.subtitle") ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.subtitle")}
            </p>
          ) : null}
        </div>
        {t("enterpriseCaseManagementDischargePlanningD4b7.foundationBanner") ? (
          <p
            data-testid="ecmdp-foundation-banner"
            style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.45 }}
          >
            {t("enterpriseCaseManagementDischargePlanningD4b7.foundationBanner")}
          </p>
        ) : null}
        {isEd ? (
          <p
            data-testid="ecmdp-ed-limited-banner"
            style={{
              margin: 0,
              fontSize: 12,
              color: "#9a3412",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            {t("enterpriseCaseManagementDischargePlanningD4b7.edLimitedBanner")}
          </p>
        ) : null}
      </div>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        data-testid="ecmdp-section-nav"
      >
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`ecmdp-section-${s.id}`}
            style={{
              ...linkButtonStyle,
              background: active === s.id ? "#f0fdfa" : "#fff",
              borderColor: active === s.id ? "#0f766e" : "#e2e8f0",
            }}
            onClick={() => selectSection(s.id)}
          >
            {t(s.titleKey)}
          </button>
        ))}
      </div>

      {message ? (
        <p style={{ margin: 0, fontSize: 12, color: "#b91c1c" }} data-testid="ecmdp-message">
          {message}
        </p>
      ) : null}

      <div data-testid={`ecmdp-panel-${activeDef?.id ?? "overview"}`} style={{ display: "grid", gap: 10 }}>
        {active === "overview" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.overview.sectionsHint")}
            </p>
            <div style={{ fontSize: 12, color: "#475569", display: "grid", gap: 4 }}>
              <strong>{t("enterpriseCaseManagementDischargePlanningD4b7.overview.readinessHeading")}</strong>
              <span>
                {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.openBarriers")}:{" "}
                {readiness.openBarrierCount}
              </span>
              <span>
                {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.destination")}:{" "}
                {readiness.destinationProposed ? "✔" : "—"}
              </span>
              <span style={{ color: "#0f766e" }}>
                {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.notAuth")}
              </span>
            </div>
            {canOpenEpisode ? (
              <button
                type="button"
                data-testid="ecmdp-open-episode"
                style={linkButtonStyle}
                onClick={onOpenEpisode}
              >
                {t("enterpriseCaseManagementDischargePlanningD4b7.openEpisodeAction")}
              </button>
            ) : null}
          </div>
        ) : null}

        {active === "episode" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            {episode ? (
              <>
                <div style={{ fontSize: 13 }}>
                  <strong>{t("enterpriseCaseManagementDischargePlanningD4b7.episode.status")}:</strong>{" "}
                  {episode.status}
                </div>
                <div style={{ fontSize: 13 }}>
                  <strong>
                    {t("enterpriseCaseManagementDischargePlanningD4b7.episode.primaryDiscipline")}:
                  </strong>{" "}
                  {episode.primaryDiscipline}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {t("enterpriseCaseManagementDischargePlanningD4b7.episode.assignees")} — CM:{" "}
                  {episode.assignedCaseManagerUserId ?? "—"} / SW:{" "}
                  {episode.assignedSocialWorkerUserId ?? "—"} / UR:{" "}
                  {episode.assignedUrReviewerUserId ?? "—"}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>
                {t("enterpriseCaseManagementDischargePlanningD4b7.empty")}
              </p>
            )}
          </div>
        ) : null}

        {active === "caseManagement" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.cmBoundary")}
            </p>
          </div>
        ) : null}

        {active === "socialWork" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.swBoundary")}
            </p>
          </div>
        ) : null}

        {active === "utilizationReview" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 6 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.urBoundary")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
              {summary.urCriteriaSources.map((s) => (
                <li key={s.sourceId}>{t(s.titleKey)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {active === "barriers" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <select
                data-testid="ecmdp-barrier-select"
                value={selectedBarrier}
                onChange={(e) => setSelectedBarrier(e.target.value as CareCoordinationBarrierId)}
                style={{ fontSize: 12, borderRadius: 8, padding: "4px 8px" }}
              >
                {summary.barrierCatalog.map((b) => (
                  <option key={b.barrierId} value={b.barrierId}>
                    {t(b.titleKey)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="ecmdp-add-barrier"
                style={linkButtonStyle}
                disabled={!episode || props.isLocked}
                onClick={onAddBarrier}
              >
                {t("enterpriseCaseManagementDischargePlanningD4b7.capabilities.manageBarriers")}
              </button>
            </div>
            {(episode?.barriers.length ?? 0) === 0 ? (
              <p style={{ margin: 0, fontSize: 13 }}>
                {t("enterpriseCaseManagementDischargePlanningD4b7.emptyBarriers")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {episode!.barriers.map((b) => (
                  <li key={b.instanceId}>
                    {t(`enterpriseCaseManagementDischargePlanningD4b7.barriers.${b.barrierId}`)} —{" "}
                    {b.status} ({b.owningDiscipline})
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {active === "destinationPlanning" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <select
                data-testid="ecmdp-destination-select"
                value={selectedDestination}
                onChange={(e) =>
                  setSelectedDestination(e.target.value as CareCoordinationDestinationId)
                }
                style={{ fontSize: 12, borderRadius: 8, padding: "4px 8px" }}
              >
                {summary.destinationCatalog.map((d) => (
                  <option key={d.destinationId} value={d.destinationId}>
                    {t(d.titleKey)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="ecmdp-plan-destination"
                style={linkButtonStyle}
                disabled={!episode || props.isLocked}
                onClick={onPlanDestination}
              >
                {t("enterpriseCaseManagementDischargePlanningD4b7.capabilities.planDestination")}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#0f766e" }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.notAuth")}
            </p>
            {episode?.destinationPlan ? (
              <p style={{ margin: 0, fontSize: 13 }}>
                {t(
                  `enterpriseCaseManagementDischargePlanningD4b7.destinations.${episode.destinationPlan.destinationId}`
                )}{" "}
                — {episode.destinationPlan.status}
              </p>
            ) : null}
          </div>
        ) : null}

        {active === "losAvoidableDelay" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, fontSize: 13, display: "grid", gap: 4 }}>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.sections.losAvoidableDelay")}
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.los.elapsedHours")}:{" "}
              {los.elapsedHours ?? "—"}
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.los.expectedNotInvented")} (
              {String(los.expectedLosInvented)})
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.los.avoidableBarriers")}:{" "}
              {los.avoidableDelayBarrierIds.join(", ") || "—"}
            </span>
          </div>
        ) : null}

        {active === "readmissionRisk" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {summary.riskFactorCatalog.map((f) => {
                const on = riskFactors.includes(f.factorId);
                return (
                  <button
                    key={f.factorId}
                    type="button"
                    data-testid={`ecmdp-risk-${f.factorId}`}
                    style={{
                      ...linkButtonStyle,
                      background: on ? "#f0fdfa" : "#fff",
                    }}
                    onClick={() =>
                      setRiskFactors((prev) =>
                        on ? prev.filter((x) => x !== f.factorId) : [...prev, f.factorId]
                      )
                    }
                  >
                    {t(f.titleKey)}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t(`enterpriseCaseManagementDischargePlanningD4b7.riskBands.${risk.band}`)} (score{" "}
              {risk.score}) — AI: {String(risk.usesPredictiveAi)}
            </p>
          </div>
        ) : null}

        {active === "interdisciplinaryReadiness" || active === "carePlanProjection" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 6, fontSize: 13 }}>
            <p style={{ margin: 0 }}>{t("enterpriseCaseManagementDischargePlanningD4b7.d4b6Boundary")}</p>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.nursing")}:{" "}
              {readiness.nursingReadyHint ? "✔" : "—"}
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.rt")}:{" "}
              {readiness.rtRecommendationPresent ? "✔" : "—"}
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.rehab")}:{" "}
              {readiness.rehabRecommendationPresent ? "✔" : "—"}
            </span>
            <span>
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.carePlan")}:{" "}
              {readiness.carePlanDischargeReadinessPresent ? "✔" : "—"}
            </span>
            {carePlans.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                {t("enterpriseCaseManagementDischargePlanningD4b7.emptyProjections")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {carePlans.map((p, i) => (
                  <li key={`${p.planId}-${i}`}>
                    {p.templateId ?? "plan"} — {p.lifecycleState ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {active === "nursingProjection" ? (
          <ProjectionList
            empty={t("enterpriseCaseManagementDischargePlanningD4b7.emptyProjections")}
            items={nursing.map((n, i) => `${n.readinessSummary ?? "nursing"} (${n.authorUserId ?? "—"})-${i}`)}
          />
        ) : null}
        {active === "rtProjection" ? (
          <ProjectionList
            empty={t("enterpriseCaseManagementDischargePlanningD4b7.emptyProjections")}
            items={rt.map((n, i) => `${n.documentTypeId ?? "rt"}-${i}`)}
          />
        ) : null}
        {active === "rehabProjection" ? (
          <ProjectionList
            empty={t("enterpriseCaseManagementDischargePlanningD4b7.emptyProjections")}
            items={rehab.map((n, i) => `${n.discipline}-${i}`)}
          />
        ) : null}
        {active === "techProjection" ? (
          <ProjectionList
            empty={t("enterpriseCaseManagementDischargePlanningD4b7.emptyProjections")}
            items={tech.map((n, i) => `${n.activityId ?? "task"}-${i}`)}
          />
        ) : null}
        {active === "legacyOps" ? (
          <ProjectionList
            empty={t("enterpriseCaseManagementDischargePlanningD4b7.emptyLegacy")}
            items={legacy.map(
              (n, i) => `${n.workflowState ?? "—"} / ${n.destination ?? "—"}-${i}`
            )}
          />
        ) : null}

        {active === "referralsPlacement" ||
        active === "transitionPlanning" ||
        active === "followUp" ||
        active === "familyParticipation" ||
        active === "payerAuthorization" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t(`enterpriseCaseManagementDischargePlanningD4b7.sections.${active}`)} —{" "}
              {t("enterpriseCaseManagementDischargePlanningD4b7.readiness.notAuth")}
            </p>
          </div>
        ) : null}

        {active === "deferredBoundaries" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t("enterpriseCaseManagementDischargePlanningD4b7.deferred")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>{t("enterpriseCaseManagementDischargePlanningD4b7.cmBoundary")}</p>
            <p style={{ margin: 0, fontSize: 12 }}>{t("enterpriseCaseManagementDischargePlanningD4b7.swBoundary")}</p>
            <p style={{ margin: 0, fontSize: 12 }}>{t("enterpriseCaseManagementDischargePlanningD4b7.urBoundary")}</p>
            <p style={{ margin: 0, fontSize: 12 }}>{t("enterpriseCaseManagementDischargePlanningD4b7.d4b6Boundary")}</p>
          </div>
        ) : null}

        {documents.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {documents.map((doc) => (
              <DocumentStatusRow key={doc.documentId} doc={doc} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectionList({ empty, items }: { empty: string; items: string[] }) {
  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13 }}>{empty}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
