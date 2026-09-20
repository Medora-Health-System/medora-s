"use client";

import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { patchEncounterWorkflowState } from "@/lib/clinicalWorklistApi";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { EmergencyTriagePanel } from "@/features/emergency/EmergencyTriagePanel";
import { ClinicCareNursingWorkspaceView } from "./ClinicCareNursingWorkspaceView";

type InlineTool = "intake" | "notes" | null;

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
};

type EncounterApiShape = Omit<EncounterLite, "patient"> & {
  patient?: { id?: string | null; firstName?: string | null; lastName?: string | null } | null;
};

function normalizeEncounterLite(value: EncounterApiShape): EncounterLite {
  return {
    ...value,
    patient: value.patient
      ? {
          ...value.patient,
          id: value.patient.id ?? undefined,
        }
      : value.patient,
  };
}

function encounterIdFromHref(href: string): string | null {
  const match = href.match(/\/app\/encounters\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function nursingRowEncounterId(target: HTMLElement | null): string | null {
  const row = target?.closest('[data-testid^="clinic-care-nursing-row-"]') as HTMLElement | null;
  const testId = row?.dataset.testid ?? "";
  const prefix = "clinic-care-nursing-row-";
  return testId.startsWith(prefix) ? testId.slice(prefix.length) || null : null;
}

function isTriageOrHistoryHref(href: string): boolean {
  try {
    const url = new URL(href, "https://medora.local");
    const tab = url.searchParams.get("tab");
    return tab === "triage" || tab === "history";
  } catch {
    return false;
  }
}

export function ClinicCareNursingSinglePageWorkspace() {
  const { t, language } = useI18n();
  const nursingEvaluationLabel =
    language === "es" ? "Evaluación de enfermería" : language === "fr" ? "Évaluation infirmière" : "Nursing evaluation";
  const notesLabel = language === "es" ? "Notas" : "Notes";
  const { facilityId, roles } = useFacilityAndRoles();
  const searchParams = useSearchParams();
  const initialEncounterId = searchParams?.get("encounterId") ?? null;
  const [tool, setTool] = useState<InlineTool>(null);
  const [toolLabel, setToolLabel] = useState("");
  const [encounter, setEncounter] = useState<EncounterLite | null>(null);
  const [loadingTool, setLoadingTool] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardRevision, setBoardRevision] = useState(0);
  const selectedEncounterIdRef = useRef<string | null>(initialEncounterId);
  const requestSequenceRef = useRef(0);

  const rememberSelectedEncounter = useCallback((encounterId: string) => {
    selectedEncounterIdRef.current = encounterId;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("encounterId", encounterId);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const refreshBoard = useCallback(() => {
    setBoardRevision((value) => value + 1);
  }, []);

  const closeTool = useCallback(() => {
    requestSequenceRef.current += 1;
    setTool(null);
    setToolLabel("");
    setEncounter(null);
    setToolError(null);
    setLoadingTool(false);
  }, []);

  const openInlineTool = useCallback(
    async (nextTool: Exclude<InlineTool, null>, href: string, label: string) => {
      if (!facilityId) return;
      const encounterId = encounterIdFromHref(href);
      if (!encounterId) return;

      rememberSelectedEncounter(encounterId);
      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      setTool(nextTool);
      setToolLabel(label);
      setToolError(null);
      setEncounter(null);
      setLoadingTool(true);
      try {
        const raw = (await apiFetch(`/encounters/${encounterId}`, { facilityId })) as EncounterApiShape;
        if (requestSequenceRef.current !== requestSequence) return;
        setEncounter(normalizeEncounterLite(raw));
      } catch (error) {
        if (requestSequenceRef.current !== requestSequence) return;
        setEncounter(null);
        setToolError(error instanceof Error ? error.message : String(error));
      } finally {
        if (requestSequenceRef.current === requestSequence) setLoadingTool(false);
      }
    },
    [facilityId, rememberSelectedEncounter]
  );

  const startIntakeOnBoard = useCallback(async () => {
    const encounterId = selectedEncounterIdRef.current;
    if (!facilityId || !encounterId) return;
    setBoardError(null);
    try {
      await patchEncounterWorkflowState(facilityId, encounterId, "TRIAGE");
      refreshBoard();
      await openInlineTool(
        "intake",
        `/app/encounters/${encodeURIComponent(encounterId)}?tab=triage`,
        t("clinicCareD4c4.openIntakeChart")
      );
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : String(error));
    }
  }, [facilityId, openInlineTool, refreshBoard, t]);

  const handleDrawerSaved = useCallback(async () => {
    refreshBoard();
  }, [refreshBoard]);

  const handleClickCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const selectedFromRow = nursingRowEncounterId(target);
      if (selectedFromRow) rememberSelectedEncounter(selectedFromRow);

      const button = target?.closest("button") as HTMLButtonElement | null;
      if (button?.dataset.testid === "clinic-care-nursing-start-intake") {
        event.preventDefault();
        event.stopPropagation();
        void startIntakeOnBoard();
        return;
      }

      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";
      const encounterId = encounterIdFromHref(href);
      if (!encounterId) return;

      const label = (anchor.textContent ?? "").trim();
      const isNursingEvaluation = anchor.dataset.testid === "clinic-care-nursing-evaluation-link";
      const isOpenIntake = anchor.dataset.testid === "clinic-care-nursing-open-intake-chart";
      const isIntakeDestination = isTriageOrHistoryHref(href);
      const isNotesAction = anchor.dataset.testid === "clinic-care-nursing-notes-link";

      if (isNursingEvaluation || isOpenIntake || isIntakeDestination || isNotesAction) {
        event.preventDefault();
        event.stopPropagation();
        if (isNotesAction) {
          void openInlineTool("notes", href, label);
        } else {
          void openInlineTool("intake", href, label || nursingEvaluationLabel);
        }
        return;
      }

      // Encounter/chart links inside the Nursing board intentionally stay on the board.
      // Scope this guard to encounter links only; do not suppress unrelated /app links.
      event.preventDefault();
      event.stopPropagation();
      rememberSelectedEncounter(encounterId);
    },
    [nursingEvaluationLabel, openInlineTool, rememberSelectedEncounter, startIntakeOnBoard]
  );

  const drawerTitle =
    toolLabel || (tool === "notes" ? notesLabel : nursingEvaluationLabel);
  const nursingPageHref = encounter?.id
    ? `/app/clinic-care/nursing?encounterId=${encodeURIComponent(encounter.id)}`
    : "/app/clinic-care/nursing";

  return (
    <div onClickCapture={handleClickCapture} data-testid="clinic-care-nursing-single-page-guard">
      <style>{`
        [data-testid="clinic-care-nursing-workspace"] h2 + p {
          display: none !important;
        }
      `}</style>

      {boardError ? (
        <p role="alert" style={{ margin: "0 0 8px", color: "#b91c1c", fontSize: 12 }}>
          {boardError}
        </p>
      ) : null}

      <ClinicCareNursingWorkspaceView key={boardRevision} />

      {tool ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={drawerTitle}
          data-testid="clinic-care-nursing-inline-documentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(15, 23, 42, 0.38)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "min(920px, 96vw)",
              height: "100%",
              overflowY: "auto",
              background: "#fff",
              boxShadow: "-12px 0 30px rgba(15, 23, 42, 0.18)",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                display: "flex",
                justifyContent: "flex-end",
                padding: "8px 16px 0",
                background: "#fff",
              }}
            >
              <button
                type="button"
                onClick={closeTool}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 18,
                }}
                aria-label={language === "es" ? "Cerrar" : language === "fr" ? "Fermer" : "Close"}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {loadingTool ? (
                <p style={{ margin: 0, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
              ) : toolError ? (
                <p role="alert" style={{ margin: 0, color: "#b91c1c" }}>
                  {toolError}
                </p>
              ) : encounter && facilityId ? (
                tool === "notes" ? (
                  <EmergencyErNotesPanel
                    encounterId={encounter.id}
                    facilityId={facilityId}
                    status={encounter.status}
                    isLocked={encounter.status !== "OPEN"}
                    roleCodes={roles}
                    onSaved={handleDrawerSaved}
                  />
                ) : (
                  <EmergencyTriagePanel
                    encounterId={encounter.id}
                    facilityId={facilityId}
                    encounter={encounter}
                    isLocked={encounter.status !== "OPEN"}
                    encounterTriageTabHref={nursingPageHref}
                    onSaved={handleDrawerSaved}
                    presentationMode="CLINIC_NURSING_MINIMAL"
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
