"use client";

import React, { useCallback, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
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
  patient?: { id?: string | null; firstName?: string | null; lastName?: string | null } | null;
};

function encounterIdFromHref(href: string): string | null {
  const match = href.match(/\/app\/encounters\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function ClinicCareNursingSinglePageWorkspace() {
  const { t, language } = useI18n();
  const { facilityId, roles } = useFacilityAndRoles();
  const [tool, setTool] = useState<InlineTool>(null);
  const [toolLabel, setToolLabel] = useState("");
  const [encounter, setEncounter] = useState<EncounterLite | null>(null);
  const [loadingTool, setLoadingTool] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);

  const closeTool = useCallback(() => {
    setTool(null);
    setToolLabel("");
    setEncounter(null);
    setToolError(null);
  }, []);

  const openInlineTool = useCallback(async (nextTool: Exclude<InlineTool, null>, href: string, label: string) => {
    if (!facilityId) return;
    const encounterId = encounterIdFromHref(href);
    if (!encounterId) return;

    setTool(nextTool);
    setToolLabel(label);
    setToolError(null);
    setLoadingTool(true);
    try {
      const result = (await apiFetch(`/encounters/${encounterId}`, { facilityId })) as EncounterLite;
      setEncounter(result);
    } catch (error) {
      setEncounter(null);
      setToolError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingTool(false);
    }
  }, [facilityId]);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href") ?? "";
    if (!href.startsWith("/app/")) return;

    // Nursing documentation stays on this board. Never navigate away for chart/intake actions.
    event.preventDefault();
    event.stopPropagation();

    const label = (anchor.textContent ?? "").trim();
    const isMedicationReconciliation = anchor.dataset.testid === "clinic-care-nursing-medrec-link";
    const isIntakeDestination = href.includes("section=intake") || href.includes("section=history");
    const isNotesAction = label === t("clinicCareD4c4.notesChartHint");

    if (isMedicationReconciliation || isIntakeDestination) {
      void openInlineTool("intake", href, label || t("clinicCareD4c4.medRec"));
      return;
    }

    if (isNotesAction) {
      void openInlineTool("notes", href, label);
    }
    // Patient-name / "open visit" links are intentionally non-navigating on the nursing board.
  }, [openInlineTool, t]);

  const drawerTitle = toolLabel || (tool === "notes" ? t("clinicCareD4c4.notesChartHint") : t("clinicCareD4c4.medRec"));
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

      <ClinicCareNursingWorkspaceView />

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
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 750, color: "#0f172a" }}>{drawerTitle}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>
                  {language === "es"
                    ? "La documentación permanece en esta página y se guarda en el expediente para Resumen."
                    : language === "fr"
                      ? "La documentation reste sur cette page et est enregistrée dans le dossier pour le Résumé."
                      : "Documentation stays on this page and saves to the encounter for Summary."}
                </div>
              </div>
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
                <p role="alert" style={{ margin: 0, color: "#b91c1c" }}>{toolError}</p>
              ) : encounter && facilityId ? (
                tool === "notes" ? (
                  <EmergencyErNotesPanel
                    encounterId={encounter.id}
                    facilityId={facilityId}
                    status={encounter.status}
                    isLocked={encounter.status !== "OPEN"}
                    roleCodes={roles}
                    onSaved={() => undefined}
                  />
                ) : (
                  <EmergencyTriagePanel
                    encounterId={encounter.id}
                    facilityId={facilityId}
                    encounter={encounter}
                    isLocked={encounter.status !== "OPEN"}
                    encounterTriageTabHref={nursingPageHref}
                    onSaved={() => undefined}
                    presentationMode="SIMPLE_CLINIC_INTAKE"
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
