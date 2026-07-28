"use client";

/**
 * MEDUI.D4B.2 — Enterprise Nursing Clinical Workspace shell.
 * Composes existing nursing engines + EDOC hub; consumes D4B.1 primitives.
 * Does not redesign global inpatient/ED shells or MAR ownership.
 */

import React, { useMemo, useState } from "react";
import type { EnterpriseClinicalDocument } from "@medora/shared";
import {
  buildEnterpriseNursingWorkspaceSummary,
  nursingWorkspaceSectionsForCareSetting,
  resolveNursingWorkspaceSection,
  toClinicalDocumentationHubCareSetting,
  type EnterpriseNursingWorkspaceSectionId,
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

export type EnterpriseNursingClinicalWorkspaceProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT" | "AMBULATORY";
  isLocked?: boolean;
  /** Optional already-projected documents (notes/EDOC/admission/handoff/reassessment). */
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  /** Live reassessment / systems / GI-GU host (existing engines). */
  liveEngineSlot?: React.ReactNode;
  /** Handoff host. */
  handoffSlot?: React.ReactNode;
  /** Discharge nursing host (ED or inpatient discharge tab link content). */
  dischargeSlot?: React.ReactNode;
  /** Admission host — inpatient/observation only. */
  admissionSlot?: React.ReactNode;
  /** Optional initial section. */
  initialSection?: EnterpriseNursingWorkspaceSectionId;
  onNavigateStickySection?: (section: "admission" | "nursing" | "notes" | "dischargePlanning" | "carePlan") => void;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  const { t } = useI18n();
  return (
    <div
      data-testid={`encw-doc-${doc.documentTypeId}`}
      style={{
        ...MEDORA_CARD_SHELL,
        padding: "10px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>
          {t(`enterpriseNursingClinicalWorkspaceD4b2.documentTypes.${docTypeKey(doc.documentTypeId)}`)}
        </strong>
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

function docTypeKey(documentTypeId: string): string {
  const map: Record<string, string> = {
    "nursing.admission_assessment": "admission",
    "nursing.reassessment": "reassessment",
    "nursing.systems_assessment": "systems",
    "nursing.pain_assessment": "pain",
    "nursing.neurological_assessment": "neurological",
    "nursing.respiratory_assessment": "respiratory",
    "nursing.cardiovascular_assessment": "cardiovascular",
    "nursing.skin_wound_assessment": "skinWound",
    "nursing.fall_mobility_assessment": "fallMobility",
    "nursing.device_assessment": "device",
    "nursing.safety_precautions": "safety",
    "nursing.restraint_assessment": "restraint",
    "nursing.intake_output": "intakeOutput",
    "nursing.education_note": "education",
    "nursing.care_plan_update": "carePlan",
    "nursing.handoff": "handoff",
    "nursing.discharge_note": "discharge",
    "encounter_note.nursing": "encounterNote",
    "edoc.structured_entry": "pain",
  };
  return map[documentTypeId] ?? "encounterNote";
}

export function EnterpriseNursingClinicalWorkspaceD4b2(
  props: EnterpriseNursingClinicalWorkspaceProps
) {
  const { t } = useI18n();
  const sections = useMemo(
    () => nursingWorkspaceSectionsForCareSetting(props.careSetting),
    [props.careSetting]
  );
  const [active, setActive] = useState<EnterpriseNursingWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );

  const summary = useMemo(
    () =>
      buildEnterpriseNursingWorkspaceSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        notes: [],
        edocEntries: [],
      }),
    [props.encounterId, props.patientId, props.facilityId, props.careSetting]
  );

  const documents = props.documents ?? summary.documents;
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];
  const hubCareSetting = toClinicalDocumentationHubCareSetting(props.careSetting);

  const selectSection = (id: string) => {
    const resolved = resolveNursingWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  return (
    <div data-testid="enterprise-nursing-clinical-workspace-d4b2" style={{ display: "grid", gap: 12 }}>
      <header style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t("enterpriseNursingClinicalWorkspaceD4b2.title")}
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t(`enterpriseNursingClinicalWorkspaceD4b2.careSetting.${props.careSetting}`)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("enterpriseNursingClinicalWorkspaceD4b2.subtitle")}
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
          {t("enterpriseNursingClinicalWorkspaceD4b2.foundationBanner")}
        </p>
      </header>

      <nav
        aria-label={t("enterpriseNursingClinicalWorkspaceD4b2.title")}
        data-testid="encw-section-nav"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {sections.map((section) => {
          const selected = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              data-testid={`encw-nav-${section.id}`}
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

      <section data-testid={`encw-panel-${activeDef.id}`} style={{ display: "grid", gap: 12 }}>
        {activeDef.id === "overview" ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              {t("enterpriseNursingClinicalWorkspaceD4b2.overview.sectionsHint")}
            </p>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseNursingClinicalWorkspaceD4b2.overview.documentsHeading")}
            </h3>
            {documents.length === 0 ? (
              <p data-testid="encw-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseNursingClinicalWorkspaceD4b2.empty")}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {documents.map((doc) => (
                  <DocumentStatusRow key={doc.documentId} doc={doc} />
                ))}
              </div>
            )}
          </>
        ) : null}

        {activeDef.mode === "DEFERRED" ? (
          <p data-testid="encw-deferred" style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            {t("enterpriseNursingClinicalWorkspaceD4b2.deferred")}
          </p>
        ) : null}

        {activeDef.id === "admission" ? (
          props.admissionSlot ?? (
            <p style={{ margin: 0, fontSize: 13 }}>
              <button
                type="button"
                onClick={() => props.onNavigateStickySection?.("admission")}
                style={linkButtonStyle}
              >
                {t("enterpriseNursingClinicalWorkspaceD4b2.overview.openLiveEngine")}
              </button>
            </p>
          )
        ) : null}

        {activeDef.id === "reassessment" ||
        activeDef.id === "systems" ||
        activeDef.id === "gastrointestinal" ||
        activeDef.id === "genitourinary" ? (
          props.liveEngineSlot ?? null
        ) : null}

        {activeDef.id === "handoff" ? props.handoffSlot ?? null : null}

        {activeDef.id === "discharge" ? (
          props.dischargeSlot ?? (
            <button
              type="button"
              onClick={() => props.onNavigateStickySection?.("dischargePlanning")}
              style={linkButtonStyle}
            >
              {t("enterpriseNursingClinicalWorkspaceD4b2.overview.openLiveEngine")}
            </button>
          )
        ) : null}

        {activeDef.mode === "EDOC_HUB" && props.encounterId && props.facilityId ? (
          <div data-testid={`encw-edoc-${activeDef.id}`}>
            <ClinicalDocumentationHub
              careSetting={hubCareSetting}
              encounterId={props.encounterId}
              facilityId={props.facilityId}
              accessMode={props.isLocked ? "review" : "edit"}
              showHeader
              focusedCardId={activeDef.focusedEdocCardId ?? null}
            />
          </div>
        ) : null}

        {activeDef.id === "documentationHistory" ? (
          <div data-testid="encw-history" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseNursingClinicalWorkspaceD4b2.history.heading")}
            </h3>
            {documents.filter(
              (d) =>
                d.documentTypeId === "encounter_note.nursing" ||
                d.sourceArchitecture === "EDOC_ENTRY"
            ).length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseNursingClinicalWorkspaceD4b2.history.empty")}
              </p>
            ) : (
              documents
                .filter(
                  (d) =>
                    d.documentTypeId === "encounter_note.nursing" ||
                    d.sourceArchitecture === "EDOC_ENTRY"
                )
                .map((doc) => <DocumentStatusRow key={doc.documentId} doc={doc} />)
            )}
            <button
              type="button"
              onClick={() => props.onNavigateStickySection?.("notes")}
              style={linkButtonStyle}
            >
              {t("enterpriseNursingClinicalWorkspaceD4b2.overview.openLiveEngine")}
            </button>
          </div>
        ) : null}

        {activeDef.id === "carePlan" && activeDef.mode !== "EDOC_HUB" ? (
          <button
            type="button"
            onClick={() => props.onNavigateStickySection?.("carePlan")}
            style={linkButtonStyle}
          >
            {t("enterpriseNursingClinicalWorkspaceD4b2.overview.openLiveEngine")}
          </button>
        ) : null}
      </section>
    </div>
  );
}

const linkButtonStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  color: "#0f766e",
};
