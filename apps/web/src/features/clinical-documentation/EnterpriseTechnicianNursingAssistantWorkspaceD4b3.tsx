"use client";

/**
 * MEDUI.D4B.3 — Enterprise Technician and Nursing-Assistant Workspace shell.
 * Composes existing vitals / tasks / notes / I&O engines; consumes D4B.1 primitives.
 * Does not redesign ownership, MAR, or invent barcode/POCT/device platforms.
 */

import React, { useMemo, useState } from "react";
import type { EnterpriseClinicalDocument, TechnicianTaskV1 } from "@medora/shared";
import {
  buildEnterpriseTechnicianWorkspaceSummary,
  filterTasksBySection,
  resolveTechnicianRoleProfile,
  resolveTechnicianWorkspaceSection,
  technicianWorkspaceSectionsForCareSetting,
  toClinicalDocumentationHubCareSettingFromTechnician,
  type EnterpriseTechnicianWorkspaceSectionId,
  type TechnicianRoleProfile,
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

export type EnterpriseTechnicianNursingAssistantWorkspaceProps = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  careSetting: "EMERGENCY" | "OBSERVATION" | "INPATIENT";
  roleCodes?: readonly string[];
  roleProfile?: TechnicianRoleProfile;
  isLocked?: boolean;
  documents?: ReadonlyArray<EnterpriseClinicalDocument>;
  tasks?: ReadonlyArray<TechnicianTaskV1>;
  /** Live vitals engine host. */
  vitalsSlot?: React.ReactNode;
  /** Technician tasks panel host. */
  tasksSlot?: React.ReactNode;
  /** Notes / documentation host. */
  notesSlot?: React.ReactNode;
  /** Optional initial section. */
  initialSection?: EnterpriseTechnicianWorkspaceSectionId;
};

function DocumentStatusRow({ doc }: { doc: EnterpriseClinicalDocument }) {
  const { t } = useI18n();
  return (
    <div
      data-testid={`etnaw-doc-${doc.documentId}`}
      style={{
        ...MEDORA_CARD_SHELL,
        padding: "10px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <strong style={{ fontSize: 13 }}>
          {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.activities.encounterNote")}
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

function TaskListPreview({
  tasks,
  sectionId,
}: {
  tasks: ReadonlyArray<TechnicianTaskV1>;
  sectionId: EnterpriseTechnicianWorkspaceSectionId;
}) {
  const { t } = useI18n();
  const filtered = filterTasksBySection(tasks, sectionId);
  if (filtered.length === 0) {
    return (
      <p data-testid="etnaw-empty-tasks" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.emptyTasks")}
      </p>
    );
  }
  return (
    <ul
      data-testid={`etnaw-task-list-${sectionId}`}
      style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}
    >
      {filtered.map((task) => (
        <li key={task.taskId}>
          <strong>{task.title}</strong> — {task.type} — {task.status}
          {task.performerUserId ? ` · performer:${task.performerUserId}` : ""}
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

export function EnterpriseTechnicianNursingAssistantWorkspaceD4b3(
  props: EnterpriseTechnicianNursingAssistantWorkspaceProps
) {
  const { t } = useI18n();
  const roleProfile =
    props.roleProfile ?? resolveTechnicianRoleProfile(props.roleCodes ?? ["PATIENT_CARE_TECH"]);
  const sections = useMemo(
    () =>
      technicianWorkspaceSectionsForCareSetting(props.careSetting, {
        roleProfile,
        includeDeferred: true,
      }),
    [props.careSetting, roleProfile]
  );
  const [active, setActive] = useState<EnterpriseTechnicianWorkspaceSectionId>(
    props.initialSection && sections.some((s) => s.id === props.initialSection)
      ? props.initialSection
      : "overview"
  );

  const summary = useMemo(
    () =>
      buildEnterpriseTechnicianWorkspaceSummary({
        encounterId: props.encounterId,
        patientId: props.patientId,
        facilityId: props.facilityId,
        careSetting: props.careSetting,
        roleProfile,
        notes: [],
        tasks: props.tasks ?? [],
      }),
    [
      props.encounterId,
      props.patientId,
      props.facilityId,
      props.careSetting,
      roleProfile,
      props.tasks,
    ]
  );

  const documents = props.documents ?? summary.documents;
  const tasks = props.tasks ?? [];
  const activeDef = sections.find((s) => s.id === active) ?? sections[0];
  const hubCareSetting = toClinicalDocumentationHubCareSettingFromTechnician(props.careSetting);

  const selectSection = (id: string) => {
    const resolved = resolveTechnicianWorkspaceSection(id);
    if (!resolved) return;
    if (!sections.some((s) => s.id === resolved)) return;
    setActive(resolved);
  };

  const showTaskPreview =
    activeDef.mode === "TASK_ADAPTER" ||
    activeDef.id === "dueOverdue" ||
    activeDef.id === "completedWork" ||
    activeDef.id === "escalations";

  return (
    <div
      data-testid="enterprise-technician-nursing-assistant-workspace-d4b3"
      style={{ display: "grid", gap: 12 }}
    >
      <header style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.title")}
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t(`enterpriseTechnicianNursingAssistantWorkspaceD4b3.careSetting.${props.careSetting}`)}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.subtitle")}
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
          {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.foundationBanner")}
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
          {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.nursingBoundary")}
        </p>
      </header>

      <nav
        aria-label={t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.title")}
        data-testid="etnaw-section-nav"
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
              data-testid={`etnaw-nav-${section.id}`}
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

      <section data-testid={`etnaw-panel-${activeDef.id}`} style={{ display: "grid", gap: 12 }}>
        {activeDef.id === "overview" ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.overview.sectionsHint")}
            </p>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.overview.documentsHeading")}
            </h3>
            {documents.length === 0 ? (
              <p data-testid="etnaw-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.empty")}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {documents.map((doc) => (
                  <DocumentStatusRow key={doc.documentId} doc={doc} />
                ))}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.overview.tasksHeading")}
            </h3>
            <TaskListPreview tasks={tasks} sectionId="assignedTasks" />
          </>
        ) : null}

        {activeDef.mode === "DEFERRED" ? (
          <p data-testid="etnaw-deferred" style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.deferred")}
          </p>
        ) : null}

        {activeDef.id === "vitalSigns" || activeDef.id === "measurements" ? (
          props.vitalsSlot ?? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.overview.openLiveEngine")}
            </p>
          )
        ) : null}

        {activeDef.id === "assignedTasks" ? props.tasksSlot ?? null : null}

        {showTaskPreview && activeDef.id !== "assignedTasks" ? (
          <>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.ops.taskFilterHint")}
            </p>
            <TaskListPreview tasks={tasks} sectionId={activeDef.id} />
            {props.tasksSlot ? (
              <div data-testid="etnaw-tasks-slot-secondary">{props.tasksSlot}</div>
            ) : null}
          </>
        ) : null}

        {activeDef.id === "specimenCollection" ? (
          <p data-testid="etnaw-specimen-hint" style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.ops.specimenHint")}
          </p>
        ) : null}

        {activeDef.id === "ecgAcquisition" ? (
          <p data-testid="etnaw-ecg-hint" style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.ops.ecgHint")}
          </p>
        ) : null}

        {activeDef.mode === "EDOC_HUB" && props.encounterId && props.facilityId ? (
          <div data-testid={`etnaw-edoc-${activeDef.id}`}>
            <ClinicalDocumentationHub
              careSetting={hubCareSetting}
              encounterId={props.encounterId}
              facilityId={props.facilityId}
              accessMode={props.isLocked ? "review" : "edit"}
              showHeader
            />
          </div>
        ) : null}

        {activeDef.id === "documentationHistory" ? (
          <div data-testid="etnaw-history" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>
              {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.history.heading")}
            </h3>
            {documents.filter((d) => d.documentTypeId === "encounter_note.technician").length ===
            0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.history.empty")}
              </p>
            ) : (
              documents
                .filter((d) => d.documentTypeId === "encounter_note.technician")
                .map((doc) => <DocumentStatusRow key={doc.documentId} doc={doc} />)
            )}
            {props.notesSlot ?? (
              <button type="button" style={linkButtonStyle}>
                {t("enterpriseTechnicianNursingAssistantWorkspaceD4b3.overview.openLiveEngine")}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
