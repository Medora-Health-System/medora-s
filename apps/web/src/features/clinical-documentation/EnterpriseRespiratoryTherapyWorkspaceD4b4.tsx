"use client";

/**
 * MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace shell.
 * Composes EDOC.12 / MAR response / order projection / D4B.3 tech measurements.
 * Consumes D4B.1 primitives. Does not redesign ownership, MAR, or invent vent telemetry.
 */

import React, { useMemo, useState } from "react";
import type { EnterpriseClinicalDocument, RespiratoryActiveOrderProjection } from "@medora/shared";
import {
  buildEnterpriseRespiratoryTherapyWorkspaceSummary,
  resolveRespiratoryTherapyRoleProfile,
  resolveRespiratoryTherapyWorkspaceSection,
  respiratoryTherapyWorkspaceSectionsForCareSetting,
  toClinicalDocumentationHubCareSettingFromRespiratoryTherapy,
  type EnterpriseRespiratoryTherapyWorkspaceSectionId,
  type RespiratoryTherapyRoleProfile,
  type TechnicianVitalsContributionProjection,
} from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import {
  EnterpriseClinicalDocumentAmendmentBanner,
  EnterpriseClinicalDocumentCompletenessSummary,
  EnterpriseClinicalDocumentSignatureMeta,
  EnterpriseClinicalDocumentStatusBadge,
  EnterpriseClinicalDocumentUnsignedDraftWarning,
} from "@/features/clinical-documentation/EnterpriseClinicalDocumentPrimitivesD4b1";

export type EnterpriseRespiratoryTherapyWorkspaceProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: RespiratoryTherapyRoleProfile;
  isLocked?: boolean;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  activeOrders?: ReadonlyArray<RespiratoryActiveOrderProjection>;
  techMeasurements?: ReadonlyArray<TechnicianVitalsContributionProjection>;
  /** Live MAR respiratory-response host. */
  marResponseSlot?: React.ReactNode;
  /** Optional oxygen / procedure order display host. */
  ordersSlot?: React.ReactNode;
  /** Optional notes / recommendation host. */
  notesSlot?: React.ReactNode;
  initialSection?: EnterpriseRespiratoryTherapyWorkspaceSectionId;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  return (
    <div
      data-testid={`ertw-doc-${doc.documentId}`}
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

function OrderListPreview({ orders }: { orders: ReadonlyArray<RespiratoryActiveOrderProjection> }) {
  const { t } = useI18n();
  if (orders.length === 0) {
    return (
      <p data-testid="ertw-empty-orders" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {t("enterpriseRespiratoryTherapyWorkspaceD4b4.emptyOrders")}
      </p>
    );
  }
  return (
    <ul
      data-testid="ertw-order-list"
      style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}
    >
      {orders.map((order) => (
        <li key={order.orderId}>
          <strong>{order.displayLabel}</strong> — {order.status}
          {order.rtInvolvement ? ` · ${order.rtInvolvement}` : ""}
        </li>
      ))}
    </ul>
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

export function EnterpriseRespiratoryTherapyWorkspaceD4b4(
  props: EnterpriseRespiratoryTherapyWorkspaceProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveRespiratoryTherapyRoleProfile(props.roleCodes ?? ["RN"]);
  const sections = useMemo(
    () =>
      respiratoryTherapyWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, roleProfile]
  );
  const [active, setActive] = useState<EnterpriseRespiratoryTherapyWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );

  const summary = useMemo(
    () =>
      buildEnterpriseRespiratoryTherapyWorkspaceSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
      }),
    [props.encounterId, props.patientId, props.facilityId, props.careSetting, roleProfile]
  );

  const documents = props.documents ?? summary.documents;
  const orders = props.activeOrders ?? summary.activeOrders;
  const techMeasurements = props.techMeasurements ?? summary.techMeasurements;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];
  const hubCareSetting = toClinicalDocumentationHubCareSettingFromRespiratoryTherapy(
    props.careSetting
  );

  const selectSection = (id: string) => {
    const resolved = resolveRespiratoryTherapyWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  return (
    <div
      data-testid="enterprise-respiratory-therapy-workspace-d4b4"
      style={{ display: "grid", gap: 12 }}
    >
      <header style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t("enterpriseRespiratoryTherapyWorkspaceD4b4.title")}
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t(`enterpriseRespiratoryTherapyWorkspaceD4b4.careSetting.${props.careSetting}`)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("enterpriseRespiratoryTherapyWorkspaceD4b4.subtitle")}
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
          {t("enterpriseRespiratoryTherapyWorkspaceD4b4.foundationBanner")}
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
          {t("enterpriseRespiratoryTherapyWorkspaceD4b4.nursingBoundary")}
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
          {t("enterpriseRespiratoryTherapyWorkspaceD4b4.marBoundary")}
        </p>
      </header>

      <nav
        aria-label={t("enterpriseRespiratoryTherapyWorkspaceD4b4.title")}
        data-testid="ertw-section-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
      >
        {sections.map((section) => {
          const selected = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              data-testid={`ertw-nav-${section.id}`}
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

      <section data-testid={`ertw-panel-${activeDef.id}`} style={{ display: "grid", gap: 12 }}>
        {activeDef.id === "overview" ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.overview.sectionsHint")}
            </p>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.overview.documentsHeading")}
            </h3>
            {documents.length === 0 ? (
              <p data-testid="ertw-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRespiratoryTherapyWorkspaceD4b4.empty")}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {documents.map((doc) => (
                  <DocumentStatusRow key={doc.documentId} doc={doc} />
                ))}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.overview.ordersHeading")}
            </h3>
            <OrderListPreview orders={orders} />
          </>
        ) : null}

        {activeDef.mode === "DEFERRED" ? (
          <p data-testid="ertw-deferred" style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            {t("enterpriseRespiratoryTherapyWorkspaceD4b4.deferred")}
          </p>
        ) : null}

        {activeDef.id === "activeRespiratoryOrders" || activeDef.mode === "ORDER_PROJECTION" ? (
          <>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.ops.orderHint")}
            </p>
            <OrderListPreview orders={orders} />
            {props.ordersSlot ? <div data-testid="ertw-orders-slot">{props.ordersSlot}</div> : null}
          </>
        ) : null}

        {activeDef.id === "aerosolInhaledTreatments" ? (
          <p data-testid="ertw-aerosol-hint" style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            {t("enterpriseRespiratoryTherapyWorkspaceD4b4.ops.aerosolHint")}
          </p>
        ) : null}

        {activeDef.mode === "MAR_ADAPTER" ? (
          props.marResponseSlot ?? (
            <p data-testid="ertw-empty-mar" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.emptyMar")}
            </p>
          )
        ) : null}

        {activeDef.id === "mechanicalVentilation" ? (
          <p data-testid="ertw-vent-manual" style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
            {t("enterpriseRespiratoryTherapyWorkspaceD4b4.ventManualEntry")}
          </p>
        ) : null}

        {activeDef.mode === "EDOC_HUB" && props.encounterId && props.facilityId ? (
          <div data-testid={`ertw-edoc-${activeDef.id}`}>
            <ClinicalDocumentationHub
              careSetting={hubCareSetting}
              encounterId={props.encounterId}
              facilityId={props.facilityId}
              accessMode={props.isLocked ? "review" : "edit"}
              showHeader
            />
          </div>
        ) : null}

        {activeDef.mode === "TECH_MEASUREMENT_PROJECTION" ? (
          <div data-testid="ertw-tech-measurements" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.techBoundary")}
            </p>
            {techMeasurements.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRespiratoryTherapyWorkspaceD4b4.emptyTech")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {techMeasurements.map((m, idx) => (
                  <li key={`${m.performerUserId ?? "tech"}-${m.recordedAt}-${idx}`}>
                    {m.recordedAt}
                    {m.performerDisplayName ? ` · ${m.performerDisplayName}` : ""}
                    {m.performerUserId ? ` · performer:${m.performerUserId}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {activeDef.id === "dischargeRecommendations" ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            {t("enterpriseRespiratoryTherapyWorkspaceD4b4.ops.recommendationHint")}
          </p>
        ) : null}

        {activeDef.id === "documentationHistory" ? (
          <div data-testid="ertw-history" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseRespiratoryTherapyWorkspaceD4b4.history.heading")}
            </h3>
            {documents.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseRespiratoryTherapyWorkspaceD4b4.history.empty")}
              </p>
            ) : (
              documents.map((doc) => <DocumentStatusRow key={doc.documentId} doc={doc} />)
            )}
            {props.notesSlot ?? (
              <button type="button" style={linkButtonStyle}>
                {t("enterpriseRespiratoryTherapyWorkspaceD4b4.overview.openLiveEngine")}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
