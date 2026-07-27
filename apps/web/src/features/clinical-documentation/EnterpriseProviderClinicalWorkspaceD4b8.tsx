"use client";

/**
 * MEDUI.D4B.8 — Enterprise Provider Clinical Workspace shell (composition v2).
 *
 * Hosts / projects provider documentation — does NOT replace:
 * - ProviderDocumentationWorkspace (editor)
 * - inpatientProviderWorkspaceD4a26 (Obs/IP workflow)
 * - EncounterNote / Provider Documentation Shell (durable legal record)
 * - Existing sign-provider-documentation / EncounterNote signature paths
 *
 * Obs + IP: composition surface + optional documentation slot.
 * ED: limited projection / compatibility only (existing ED editor preserved).
 */

import React, { useMemo, useState } from "react";
import type { EnterpriseClinicalDocument } from "@medora/shared";
import {
  PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS,
  PROVIDER_CLINICAL_WORKSPACE_COMPOSITION,
  PROVIDER_NOTE_TYPE_IDS,
  buildEnterpriseProviderClinicalWorkspaceSummary,
  distinguishMarProjectionFromAdministration,
  distinguishNoteTextFromOrder,
  distinguishResultInclusionFromAcknowledgment,
  providerWorkspaceSectionsForCareSetting,
  resolveProviderRoleProfile,
  type EnterpriseProviderWorkspaceSectionId,
  type ProviderClinicalWorkspaceRoleProfile,
} from "@medora/shared";
import {
  ProviderDocumentationWorkspace,
  type ProviderDocumentationWorkspaceProps,
} from "@/components/encounters/ProviderDocumentationWorkspace";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";
import {
  EnterpriseClinicalDocumentAmendmentBanner,
  EnterpriseClinicalDocumentCompletenessSummary,
  EnterpriseClinicalDocumentSignatureMeta,
  EnterpriseClinicalDocumentStatusBadge,
  EnterpriseClinicalDocumentUnsignedDraftWarning,
} from "@/features/clinical-documentation/EnterpriseClinicalDocumentPrimitivesD4b1";

export type EnterpriseProviderClinicalWorkspaceProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: ProviderClinicalWorkspaceRoleProfile;
  isLocked?: boolean;
  /** Adapted durable documents only (EncounterNote / shell / D4A.26 projections). */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  initialSection?: EnterpriseProviderWorkspaceSectionId;
  /**
   * Optional host-provided documentation editor slot (preferred when the host
   * already owns ProviderDocumentationWorkspace state). When omitted and
   * `providerDocumentation` is set, D4B.8 composes the shared editor directly.
   */
  documentationSlot?: React.ReactNode;
  /** Optional direct composition of ProviderDocumentationWorkspace props. */
  providerDocumentation?: ProviderDocumentationWorkspaceProps;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  return (
    <div
      data-testid={`epcw-doc-${doc.documentId}`}
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

const AUTHORITY_BOUNDARY_KEYS = [
  "createsProviderOrders",
  "mutatesDiagnosis",
  "mutatesProblemList",
  "mutatesMar",
  "performsMedicationReconciliation",
  "acknowledgesResultsViaNote",
  "authorizesDischarge",
  "rewritesD4b6CarePlans",
  "rewritesD4b7Coordination",
  "attestationReplacesAuthorship",
  "trustsClientControlledIdentity",
  "autoEmCoding",
  "usesAmbientAi",
  "independentSignatureEngine",
] as const;

const DOCUMENTATION_SECTION_IDS: ReadonlySet<EnterpriseProviderWorkspaceSectionId> = new Set([
  "documentation",
  "historyPhysical",
  "progressNotes",
  "consultNotes",
  "assessmentPlan",
  "medicalDecisionMaking",
]);

export function EnterpriseProviderClinicalWorkspaceD4b8(
  props: EnterpriseProviderClinicalWorkspaceProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveProviderRoleProfile(props.roleCodes ?? ["PROVIDER"]);
  const isEd = props.careSetting === "EMERGENCY";

  const sections = useMemo(
    () =>
      providerWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, roleProfile]
  );

  const [active, setActive] = useState<EnterpriseProviderWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );

  React.useEffect(() => {
    if (!sections.some((s) => s.id === active)) {
      setActive("overview");
    }
  }, [sections, active]);

  const summary = useMemo(
    () =>
      buildEnterpriseProviderClinicalWorkspaceSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
        documents: props.documents,
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      roleProfile,
      props.documents,
    ]
  );

  const documents = summary.documents;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];
  const noteOrder = distinguishNoteTextFromOrder({});
  const resultAck = distinguishResultInclusionFromAcknowledgment({});
  const marAdmin = distinguishMarProjectionFromAdministration({});
  const showDocumentationComposer =
    !isEd && DOCUMENTATION_SECTION_IDS.has(active) && (!!props.documentationSlot || !!props.providerDocumentation);

  const selectSection = (id: EnterpriseProviderWorkspaceSectionId) => {
    if (!sections.some((s) => s.id === id)) return;
    setActive(id);
  };

  const ProjectionEmpty = () => (
    <p style={{ margin: 0, fontSize: 13 }}>
      {t("enterpriseProviderClinicalWorkspaceD4b8.projections.empty")}
    </p>
  );

  const compositionBanner = (
    <div
      data-testid="epcw-composition-banner"
      style={{
        ...MEDORA_CARD_SHELL,
        padding: 12,
        display: "grid",
        gap: 6,
        background: "#f8fafc",
      }}
    >
      <strong style={{ fontSize: 12 }}>
        {t("enterpriseProviderClinicalWorkspaceD4b8.composition.heading")}
      </strong>
      <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
        {t("enterpriseProviderClinicalWorkspaceD4b8.composition.body")}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
        <li data-testid="epcw-composition-editor">
          {PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.webEditor}
        </li>
        <li data-testid="epcw-composition-d4a26">
          {PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.inpatientObsWorkflowModule}
        </li>
        <li data-testid="epcw-composition-encounter-note">
          {PROVIDER_CLINICAL_WORKSPACE_COMPOSITION.durableLegalRecord}
        </li>
        <li data-testid="epcw-composition-no-fork">
          {t("enterpriseProviderClinicalWorkspaceD4b8.composition.noFork")}
        </li>
      </ul>
    </div>
  );

  return (
    <div
      data-testid="enterprise-provider-clinical-workspace-d4b8"
      style={{ display: "grid", gap: 12 }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px", display: "grid", gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>
            {t("enterpriseProviderClinicalWorkspaceD4b8.title")}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("enterpriseProviderClinicalWorkspaceD4b8.subtitle")}
          </p>
        </div>
        <p
          data-testid="epcw-foundation-banner"
          style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.45 }}
        >
          {t("enterpriseProviderClinicalWorkspaceD4b8.foundationBanner")}
        </p>
        {isEd ? (
          <>
            <p
              data-testid="epcw-ed-limited-banner"
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
              {t("enterpriseProviderClinicalWorkspaceD4b8.edLimitedBanner")}
            </p>
            <p
              data-testid="epcw-ed-compatibility-banner"
              style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.45 }}
            >
              {t("enterpriseProviderClinicalWorkspaceD4b8.edCompatibilityBanner")}
            </p>
          </>
        ) : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} data-testid="epcw-section-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`epcw-section-${s.id}`}
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

      <div
        data-testid={`epcw-panel-${activeDef?.id ?? "overview"}`}
        style={{ display: "grid", gap: 10 }}
      >
        {active === "overview" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.overview.sectionsHint")}
            </p>
            {compositionBanner}
            <strong style={{ fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.overview.authorityHeading")}
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569" }}>
              {AUTHORITY_BOUNDARY_KEYS.map((k) => (
                <li key={k}>
                  {k}: {String(PROVIDER_CLINICAL_WORKSPACE_AUTHORITY_INVARIANTS[k])}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: "#475569", display: "grid", gap: 4 }}>
              <span>{t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.orders")}</span>
              <span>{t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.diagnosis")}</span>
              <span>{t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.discharge")}</span>
              <span>{t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.attestation")}</span>
            </div>
          </div>
        ) : null}

        {active === "census" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            {summary.censusRows.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13 }}>
                {t("enterpriseProviderClinicalWorkspaceD4b8.census.empty")}
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {summary.censusRows.map((row, i) => (
                  <li key={`${row.encounterId}-${i}`}>
                    {row.encounterId} — {row.locationLabel ?? "—"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {DOCUMENTATION_SECTION_IDS.has(active) ? (
          <div style={{ display: "grid", gap: 8 }}>
            {compositionBanner}
            <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                {t(`enterpriseProviderClinicalWorkspaceD4b8.sections.${active}`)}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#475569" }}>
                {t("enterpriseProviderClinicalWorkspaceD4b8.composition.useExistingEditor")}
              </p>
            </div>
            {showDocumentationComposer ? (
              <div data-testid="epcw-provider-documentation-host">
                {props.documentationSlot ??
                  (props.providerDocumentation ? (
                    <ProviderDocumentationWorkspace {...props.providerDocumentation} />
                  ) : null)}
              </div>
            ) : null}
          </div>
        ) : null}

        {active === "clinicalReview" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <ProjectionEmpty />
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.carePlan")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.careCoord")}
            </p>
          </div>
        ) : null}

        {active === "nursingProjection" ||
        active === "rtProjection" ||
        active === "rehabProjection" ||
        active === "techProjection" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            <ProjectionEmpty />
          </div>
        ) : null}

        {active === "carePlanProjection" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <ProjectionEmpty />
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.carePlan")}
            </p>
          </div>
        ) : null}

        {active === "careCoordinationProjection" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <ProjectionEmpty />
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.careCoord")}
            </p>
          </div>
        ) : null}

        {active === "ordersResultsMeds" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <p
              data-testid="epcw-boundary-orders"
              style={{
                margin: 0,
                fontSize: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.orders")}{" "}
              (note≠order: {String(noteOrder.noteIsNotOrder)})
            </p>
            <p
              data-testid="epcw-boundary-results"
              style={{
                margin: 0,
                fontSize: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.results")}{" "}
              (inclusion≠ack: {String(resultAck.inclusionIsNotAcknowledgment)})
            </p>
            <p
              data-testid="epcw-boundary-mar"
              style={{
                margin: 0,
                fontSize: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.mar")}{" "}
              (MAR≠admin: {String(marAdmin.isNotAdministration)})
            </p>
            <ProjectionEmpty />
          </div>
        ) : null}

        {active === "timeline" || active === "handoff" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t(`enterpriseProviderClinicalWorkspaceD4b8.sections.${active}`)}
            </p>
            {active === "handoff" && !summary.handoff ? <ProjectionEmpty /> : null}
          </div>
        ) : null}

        {active === "deferredBoundaries" ? (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.deferred")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.orders")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.diagnosis")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.mar")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.results")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.discharge")}
            </p>
            <p style={{ margin: 0, fontSize: 12 }}>
              {t("enterpriseProviderClinicalWorkspaceD4b8.boundaries.attestation")}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
              {PROVIDER_NOTE_TYPE_IDS.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {documents.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }} data-testid="epcw-adapted-documents">
            {documents.map((doc) => (
              <DocumentStatusRow key={doc.documentId} doc={doc} />
            ))}
          </div>
        ) : DOCUMENTATION_SECTION_IDS.has(active) ? (
          <p style={{ margin: 0, fontSize: 13 }}>
            {t("enterpriseProviderClinicalWorkspaceD4b8.documents.empty")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
