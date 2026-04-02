"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChartSection, tableStyles, btnPrimary, btnSecondary } from "@/components/chart/ChartSection";
import type { ChartSummary } from "@/lib/chartApi";
import { resolveDiagnosis } from "@/lib/chartApi";
import {
  completeFollowUp,
  cancelFollowUp,
  type FollowUpRow,
} from "@/lib/followUpsApi";
import type { PatientTriageVitalsSnapshot } from "@/lib/patientVitals";
import { PatientVitalsHistory } from "./PatientVitalsHistory";
import { diagnosisDisplayFr } from "./patientChartHelpers";
import { getFollowUpStatusLabelFr } from "@/lib/uiLabels";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { EncounterClinicalTimeline } from "./EncounterClinicalTimeline";

const emptyStateStyle: React.CSSProperties = {
  padding: "16px 14px",
  fontSize: 14,
  color: "#555",
  backgroundColor: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 6,
};

function FollowUpStatusBadge({ status }: { status: string }) {
  const style: React.CSSProperties =
    status === "OPEN"
      ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e3f2fd", color: "#1565c0" }
      : status === "COMPLETED"
        ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e8f5e9", color: "#2e7d32" }
        : { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#f5f5f5", color: "#616161" };
  return <span style={style}>{getFollowUpStatusLabelFr(status)}</span>;
}

function FollowUpRowActions({
  facilityId,
  followUpId,
  onDone,
}: {
  facilityId: string;
  followUpId: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await completeFollowUp(facilityId, followUpId);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await cancelFollowUp(facilityId, followUpId);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={btnSecondary} onClick={handleComplete} disabled={loading}>
        {loading ? "…" : "Marquer réalisé"}
      </button>
      <button
        type="button"
        style={{ ...btnSecondary, color: "#c62828", borderColor: "#c62828" }}
        onClick={handleCancel}
        disabled={loading}
      >
        Annuler
      </button>
    </span>
  );
}

function ResolveDiagnosisButton({
  facilityId,
  diagnosisId,
  onResolved,
}: {
  facilityId: string;
  diagnosisId: string;
  onResolved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleResolve = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await resolveDiagnosis(facilityId, diagnosisId);
      onResolved();
    } catch (e: unknown) {
      const msg =
        normalizeUserFacingError(e instanceof Error ? e.message : null) ||
        "Impossible de clôturer le diagnostic.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <span>
      <button type="button" style={btnSecondary} onClick={handleResolve} disabled={loading}>
        {loading ? "…" : "Résoudre"}
      </button>
      {error && <span style={{ marginLeft: 8, fontSize: 12, color: "#c00" }}>{error}</span>}
    </span>
  );
}

export function PatientSummaryTab({
  chartSummary,
  chartLoading,
  chartLastFetchedAt,
  facilityId,
  canPrescribe,
  vitalsFullHistory,
  vitalsHistoryLoading,
  onRefresh,
  onAddDiagnosis,
  onTabResults,
  followUps,
  followUpsLoading,
  onRefreshFollowUps,
  onAddFollowUp,
  onPrintMedicalRecord,
}: {
  chartSummary: ChartSummary | null;
  chartLoading: boolean;
  chartLastFetchedAt: Date | null;
  facilityId: string;
  canPrescribe: boolean;
  vitalsFullHistory: PatientTriageVitalsSnapshot[];
  vitalsHistoryLoading: boolean;
  onRefresh: () => void;
  onAddDiagnosis: () => void;
  onTabResults: () => void;
  followUps: FollowUpRow[];
  followUpsLoading: boolean;
  onRefreshFollowUps: () => void;
  onAddFollowUp: () => void;
  /** Impression dossier (données déjà chargées) — en-tête du fil chronologique */
  onPrintMedicalRecord?: () => void;
}) {
  const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
  const formatDateTime = (d: Date) =>
    d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const formatDateTimeIso = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  if (chartLoading && !chartSummary) {
    return (
      <div style={{ padding: "32px 16px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontSize: 15 }}>Chargement du dossier…</div>
      </div>
    );
  }
  if (!chartSummary) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ marginBottom: 12 }}>Impossible de charger le résumé du dossier.</p>
        <button type="button" style={btnPrimary} onClick={onRefresh}>
          Réessayer
        </button>
      </div>
    );
  }

  const { activeDiagnoses, recentEncounters, recentMedicationDispenses, recentVaccinations } = chartSummary;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingFollowUps = followUps
    .filter((fu) => fu.status === "OPEN" && fu.dueDate && new Date(fu.dueDate) >= todayStart)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button type="button" style={btnSecondary} onClick={() => onRefresh()} disabled={chartLoading}>
          {chartLoading ? "Actualisation…" : "Actualiser"}
        </button>
        {chartLastFetchedAt && (
          <span style={{ fontSize: 12, color: "#9e9e9e" }}>Mise à jour : {formatDateTime(chartLastFetchedAt)}</span>
        )}
      </div>

      <ChartSection
        title="Fil chronologique clinique (par consultation)"
        action={
          onPrintMedicalRecord ? (
            <button
              type="button"
              onClick={onPrintMedicalRecord}
              style={{
                padding: "8px 14px",
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Imprimer le dossier
            </button>
          ) : undefined
        }
      >
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>
          Synthèse par visite : signes vitaux d&apos;accueil, évaluation infirmière, ordres, résultats, dispensation et résumé
          de sortie lorsque disponibles. Du plus récent au plus ancien.
        </p>
        <EncounterClinicalTimeline encounters={recentEncounters} followUps={followUps} />
      </ChartSection>

      <ChartSection title="Signes vitaux récents">
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>
          Historique complet du patient (toutes consultations), du plus récent au plus ancien. Le dernier relevé correspond
          aussi à l&apos;en-tête du dossier.
        </p>
        <PatientVitalsHistory items={vitalsFullHistory} loading={vitalsHistoryLoading} />
      </ChartSection>

      <ChartSection
        title="Diagnostics actifs"
        action={
          canPrescribe ? (
            <button type="button" style={btnPrimary} onClick={onAddDiagnosis}>
              Ajouter un diagnostic
            </button>
          ) : undefined
        }
      >
        {activeDiagnoses.length === 0 ? (
          <div style={emptyStateStyle}>
            {canPrescribe ? "Aucun diagnostic actif." : "Aucun diagnostic actif (lecture seule)."}
          </div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Code</th>
                <th style={tableStyles.th}>Libellé</th>
                <th style={tableStyles.th}>Début</th>
                {canPrescribe ? <th style={tableStyles.th}></th> : null}
              </tr>
            </thead>
            <tbody>
              {activeDiagnoses.map((d) => (
                <tr key={d.id}>
                  <td style={tableStyles.td}>{d.code}</td>
                  <td style={tableStyles.td}>{diagnosisDisplayFr(d.description, d.code)}</td>
                  <td style={tableStyles.td}>{formatDate(d.onsetDate)}</td>
                  {canPrescribe ? (
                    <td style={tableStyles.td}>
                      <ResolveDiagnosisButton facilityId={facilityId} diagnosisId={d.id} onResolved={onRefresh} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection
        title="Résultats récents"
        action={
          <button type="button" style={{ ...btnSecondary, border: "none", background: "none", color: "#1a1a1a", textDecoration: "underline" }} onClick={onTabResults}>
            Voir l&apos;onglet Résultats
          </button>
        }
      >
        <div style={emptyStateStyle}>
          Un aperçu des résultats de laboratoire et d&apos;imagerie est inclus dans le fil chronologique ci-dessus lorsque des
          résultats sont disponibles. Le détail complet se trouve dans l&apos;onglet{" "}
          <button
            type="button"
            onClick={onTabResults}
            style={{ border: "none", background: "none", color: "#1565c0", cursor: "pointer", textDecoration: "underline", padding: 0, font: "inherit" }}
          >
            Résultats
          </button>
          .
        </div>
      </ChartSection>

      <ChartSection title="Dispensations récentes (toutes consultations)">
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>
          Vue globale des dernières dispensations. Le détail par consultation figure aussi dans le fil chronologique.
        </p>
        {recentMedicationDispenses.length === 0 ? (
          <div style={emptyStateStyle}>Aucune dispensation récente.</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Médicament</th>
                <th style={tableStyles.th}>Quantité</th>
                <th style={tableStyles.th}>Date et heure</th>
                <th style={tableStyles.th}>Dispensé par</th>
                <th style={tableStyles.th}>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {recentMedicationDispenses.map((m) => (
                <tr key={m.id}>
                  <td style={tableStyles.td}>
                    {m.catalogMedication?.displayNameFr?.trim() ||
                      m.catalogMedication?.name ||
                      m.catalogMedication?.code ||
                      "—"}
                  </td>
                  <td style={tableStyles.td}>{m.quantityDispensed}</td>
                  <td style={tableStyles.td}>{formatDateTimeIso(m.dispensedAt)}</td>
                  <td style={tableStyles.td}>
                    {m.dispensedBy
                      ? `${m.dispensedBy.firstName} ${m.dispensedBy.lastName}`.trim()
                      : "—"}
                  </td>
                  <td style={tableStyles.td}>{m.dosageInstructions || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection title="Suivis à venir" action={<button type="button" style={btnPrimary} onClick={onAddFollowUp}>Ajouter un suivi</button>}>
        {followUpsLoading ? (
          <div style={emptyStateStyle}>Chargement des suivis…</div>
        ) : upcomingFollowUps.length === 0 ? (
          <div style={emptyStateStyle}>Aucun suivi à venir.</div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Date prévue</th>
                <th style={tableStyles.th}>Motif</th>
                <th style={tableStyles.th}>Notes</th>
                <th style={tableStyles.th}>Statut</th>
                <th style={tableStyles.th}></th>
              </tr>
            </thead>
            <tbody>
              {upcomingFollowUps.map((fu) => (
                <tr key={fu.id}>
                  <td style={tableStyles.td}>{formatDate(fu.dueDate)}</td>
                  <td style={tableStyles.td}>{fu.reason || "—"}</td>
                  <td style={tableStyles.td}>
                    {fu.notes ? (fu.notes.length > 50 ? fu.notes.slice(0, 50) + "…" : fu.notes) : "—"}
                  </td>
                  <td style={tableStyles.td}>
                    <FollowUpStatusBadge status={fu.status} />
                  </td>
                  <td style={tableStyles.td}>
                    {fu.status === "OPEN" && (
                      <FollowUpRowActions facilityId={facilityId} followUpId={fu.id} onDone={onRefreshFollowUps} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>

      <ChartSection title="Vaccinations récentes" action={<Link href="/app/public-health/vaccinations" style={{ fontSize: 13 }}>Saisir une vaccination</Link>}>
        {recentVaccinations.length === 0 ? (
          <div style={emptyStateStyle}>
            Aucune vaccination récente —{" "}
            <Link href="/app/public-health/vaccinations">module santé publique</Link>.
          </div>
        ) : (
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Vaccin</th>
                <th style={tableStyles.th}>Dose</th>
                <th style={tableStyles.th}>Administré le</th>
                <th style={tableStyles.th}>Prochaine dose</th>
              </tr>
            </thead>
            <tbody>
              {recentVaccinations.map((v) => (
                <tr key={v.id}>
                  <td style={tableStyles.td}>{v.vaccineCatalog?.name ?? v.vaccineCatalog?.code ?? "—"}</td>
                  <td style={tableStyles.td}>{v.doseNumber ?? "—"}</td>
                  <td style={tableStyles.td}>{formatDate(v.administeredAt)}</td>
                  <td style={tableStyles.td}>{formatDate(v.nextDueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartSection>
    </div>
  );
}
