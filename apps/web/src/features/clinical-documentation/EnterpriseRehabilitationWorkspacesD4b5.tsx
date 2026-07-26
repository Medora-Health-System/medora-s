"use client";

/**
 * MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces shell (PT / OT / SLP).
 * Shared shell with distinct discipline modes. Consumes D4B.1 primitives.
 * Projects nursing / tech / RT overlaps without overwrite. Recommendation ≠ authority.
 */

import React, { useMemo, useState } from "react";
import type { EnterpriseClinicalDocument, RehabilitationRelatedOrderProjection } from "@medora/shared";
import {
  buildEnterpriseRehabilitationWorkspaceSummary,
  resolveRehabilitationRoleProfile,
  resolveRehabilitationWorkspaceSection,
  rehabilitationWorkspaceSectionsForCareSetting,
  type EnterpriseRehabilitationWorkspaceSectionId,
  type NursingMobilityFallProjection,
  type NursingSwallowScreenProjection,
  type RehabilitationDisciplineMode,
  type RehabilitationRoleProfile,
  type TechMobilityAdlProjection,
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

export type EnterpriseRehabilitationWorkspacesProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: RehabilitationRoleProfile;
  initialDisciplineMode?: RehabilitationDisciplineMode;
  isLocked?: boolean;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  relatedOrders?: ReadonlyArray<RehabilitationRelatedOrderProjection>;
  nursingMobilityFall?: ReadonlyArray<NursingMobilityFallProjection>;
  nursingSwallowScreen?: ReadonlyArray<NursingSwallowScreenProjection>;
  techMobilityAdl?: ReadonlyArray<TechMobilityAdlProjection>;
  ordersSlot?: React.ReactNode;
  notesSlot?: React.ReactNode;
  initialSection?: EnterpriseRehabilitationWorkspaceSectionId;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  return (
    <div
      data-testid={`erw-doc-${doc.documentId}`}
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

function OrderListPreview({ orders }: { orders: ReadonlyArray<RehabilitationRelatedOrderProjection> }) {
  const { t } = useI18n();
  if (orders.length === 0) {
    return (
      <p data-testid="erw-empty-orders" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {t("enterpriseRehabilitationWorkspacesD4b5.emptyOrders")}
      </p>
    );
  }
  return (
    <ul
      data-testid="erw-order-list"
      style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}
    >
      {orders.map((order) => (
        <li key={order.orderId}>
          <strong>{order.displayLabel}</strong> — {order.status}
        </li>
      ))}
    </ul>
  );
}

const DISCIPLINE_MODES: RehabilitationDisciplineMode[] = [
  "PHYSICAL_THERAPY",
  "OCCUPATIONAL_THERAPY",
  "SPEECH_LANGUAGE_PATHOLOGY",
];

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

export function EnterpriseRehabilitationWorkspacesD4b5(
  props: EnterpriseRehabilitationWorkspacesProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveRehabilitationRoleProfile(props.roleCodes ?? ["RN"]);
  const [disciplineMode, setDisciplineMode] = useState<RehabilitationDisciplineMode>(
    props.initialDisciplineMode ?? "PHYSICAL_THERAPY"
  );

  const sections = useMemo(
    () =>
      rehabilitationWorkspaceSectionsForCareSetting(props.careSetting, {
        disciplineMode,
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, disciplineMode, roleProfile]
  );

  const [active, setActive] = useState<EnterpriseRehabilitationWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );

  // When discipline changes, keep section if still valid else fall back to overview.
  React.useEffect(() => {
    if (!sections.some((s) => s.id === active)) {
      setActive("overview");
    }
  }, [sections, active]);

  const summary = useMemo(
    () =>
      buildEnterpriseRehabilitationWorkspaceSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        disciplineMode,
        roleProfile,
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      disciplineMode,
      roleProfile,
    ]
  );

  const documents = props.documents ?? summary.documents;
  const orders = props.relatedOrders ?? summary.relatedOrders;
  const nursingMobility = props.nursingMobilityFall ?? summary.nursingMobilityFall;
  const nursingSwallow = props.nursingSwallowScreen ?? summary.nursingSwallowScreen;
  const techTasks = props.techMobilityAdl ?? summary.techMobilityAdl;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];

  const selectSection = (id: string) => {
    const resolved = resolveRehabilitationWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  return (
    <div
      data-testid="enterprise-rehabilitation-workspaces-d4b5"
      data-discipline={disciplineMode}
      style={{ display: "grid", gap: 12 }}
    >
      <header style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t("enterpriseRehabilitationWorkspacesD4b5.title")}
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t(`enterpriseRehabilitationWorkspacesD4b5.careSetting.${props.careSetting}`)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("enterpriseRehabilitationWorkspacesD4b5.subtitle")}
        </p>
        <p
          role="note"
          style={{
            margin: 0,
            fontSize: 12,
            color: "#334155",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "8px 10px",
          }}
        >
          {t("enterpriseRehabilitationWorkspacesD4b5.foundationBanner")}
        </p>
        <p
          role="note"
          style={{
            margin: 0,
            fontSize: 12,
            color: "#0f766e",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: "8px 10px",
          }}
        >
          {t("enterpriseRehabilitationWorkspacesD4b5.nursingBoundary")}
        </p>
        <p
          role="note"
          style={{
            margin: 0,
            fontSize: 12,
            color: "#1d4ed8",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 10,
            padding: "8px 10px",
          }}
        >
          {t("enterpriseRehabilitationWorkspacesD4b5.swallowBoundary")}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t("enterpriseRehabilitationWorkspacesD4b5.title")}
        data-testid="erw-discipline-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
      >
        {DISCIPLINE_MODES.map((mode) => {
          const selected = mode === disciplineMode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`erw-discipline-${mode}`}
              onClick={() => setDisciplineMode(mode)}
              style={{
                border: selected ? "1px solid #0369a1" : "1px solid #e2e8f0",
                background: selected ? "#e0f2fe" : "#fff",
                color: selected ? "#0369a1" : "#334155",
                borderRadius: 9999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t(`enterpriseRehabilitationWorkspacesD4b5.discipline.${mode}`)}
            </button>
          );
        })}
      </div>

      <nav
        aria-label={t(`enterpriseRehabilitationWorkspacesD4b5.discipline.${disciplineMode}`)}
        data-testid="erw-section-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
      >
        {sections.map((section) => {
          const selected = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              data-testid={`erw-nav-${section.id}`}
              aria-pressed={selected}
              onClick={() => selectSection(section.id)}
              style={{
                border: selected ? "1px solid #0f766e" : "1px solid #e2e8f0",
                background: selected ? "#ecfdf5" : "#fff",
                color: selected ? "#0f766e" : "#334155",
                borderRadius: 9999,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t(section.titleKey)}
            </button>
          );
        })}
      </nav>

      <section data-testid={`erw-panel-${activeDef.id}`} style={{ display: "grid", gap: 12 }}>
        {activeDef.id === "overview" ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.overview.sectionsHint")}
            </p>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.overview.documentsHeading")}
            </h3>
            {documents.length === 0 ? (
              <p data-testid="erw-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.empty")}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {documents.map((doc) => (
                  <DocumentStatusRow key={doc.documentId} doc={doc} />
                ))}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.overview.ordersHeading")}
            </h3>
            <OrderListPreview orders={orders} />
          </>
        ) : null}

        {activeDef.mode === "DEFERRED" ? (
          <p data-testid="erw-deferred" style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            {t("enterpriseRehabilitationWorkspacesD4b5.deferred")}
          </p>
        ) : null}

        {activeDef.id === "relatedCareOrders" || activeDef.mode === "ORDER_PROJECTION" ? (
          <>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.ops.orderHint")}
            </p>
            <OrderListPreview orders={orders} />
            {props.ordersSlot ? <div data-testid="erw-orders-slot">{props.ordersSlot}</div> : null}
          </>
        ) : null}

        {activeDef.mode === "STRUCTURED_CONTRACT" && activeDef.id !== "overview" ? (
          <div
            data-testid={`erw-contract-${activeDef.id}`}
            style={{
              ...MEDORA_CARD_SHELL,
              padding: "10px 12px",
              fontSize: 13,
              color: "#334155",
            }}
          >
            <strong>{t(activeDef.titleKey)}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
              {t(`enterpriseRehabilitationWorkspacesD4b5.discipline.${disciplineMode}`)}
              {" · "}
              {t("enterpriseRehabilitationWorkspacesD4b5.ops.recommendationHint")}
            </p>
            {activeDef.id === "dietRecommendation" ? (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#92400e" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.ops.dietHint")}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeDef.mode === "NURSING_PROJECTION" && activeDef.id === "nursingMobilityFall" ? (
          <div data-testid="erw-nursing-mobility" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#0f766e" }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.nursingBoundary")}
            </p>
            {nursingMobility.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.emptyNursing")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {nursingMobility.map((m, idx) => (
                  <li key={`${m.authorUserId ?? "rn"}-${m.recordedAt}-${idx}`}>
                    {m.summaryText ?? m.sourceCardId ?? "—"}
                    {m.authorDisplayName ? ` · ${m.authorDisplayName}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {activeDef.mode === "NURSING_PROJECTION" && activeDef.id === "nursingSwallowScreen" ? (
          <div data-testid="erw-nursing-swallow" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.swallowBoundary")}
            </p>
            {nursingSwallow.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.emptySwallow")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {nursingSwallow.map((s, idx) => (
                  <li key={`${s.authorUserId ?? "rn"}-${s.recordedAt}-${idx}`}>
                    {s.result ?? "—"}
                    {s.recordedAt ? ` · ${s.recordedAt}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {activeDef.mode === "TECH_PROJECTION" ? (
          <div data-testid="erw-tech-adl" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.techBoundary")}
            </p>
            {techTasks.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.emptyTech")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {techTasks.map((task, idx) => (
                  <li key={`${task.performerUserId ?? "tech"}-${task.completedAt}-${idx}`}>
                    {task.activityId ?? "task"}
                    {task.performerDisplayName ? ` · ${task.performerDisplayName}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {activeDef.mode === "RT_PROJECTION" ? (
          <p data-testid="erw-rt-overlap" style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            {t("enterpriseRehabilitationWorkspacesD4b5.rtBoundary")}
          </p>
        ) : null}

        {activeDef.id === "dischargeRecommendations" ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            {t("enterpriseRehabilitationWorkspacesD4b5.ops.recommendationHint")}
          </p>
        ) : null}

        {activeDef.id === "documentationHistory" ? (
          <div data-testid="erw-history" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRehabilitationWorkspacesD4b5.history.heading")}
            </h3>
            {documents.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRehabilitationWorkspacesD4b5.history.empty")}
              </p>
            ) : (
              documents.map((doc) => <DocumentStatusRow key={doc.documentId} doc={doc} />)
            )}
            {props.notesSlot ?? (
              <button type="button" style={linkButtonStyle}>
                {t("enterpriseRehabilitationWorkspacesD4b5.overview.openLiveEngine")}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
