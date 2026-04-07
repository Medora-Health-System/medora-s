"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  getEncounterStatusBoardLabelFr,
  getEncounterTypeLabelFr,
  ui,
} from "@/lib/uiLabels";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import {
  esiDisplayChar,
  esiLevelFromUnknown,
  EMERGENCY_AVATAR_CIRCLE_STYLE,
  esiUnderAvatarNumberStyle,
} from "@/features/emergency/emergencyEsiDisplay";
import {
  buildAllergyStripSummary,
  buildErWorkspaceVitalPairs,
  triagePreviewSliceFromTriageGet,
} from "@/features/emergency/emergencyTriageDocPreview";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import {
  EmergencyWorkspaceAllergiesCard,
  EmergencyWorkspaceVitalsCard,
} from "@/features/emergency/EmergencyWorkspaceClinicalStrip";
import { MedicationAdministrationTab } from "@/components/encounters/MedicationAdministrationTab";
import { EmergencyNursingReassessmentPanel } from "@/features/emergency/EmergencyNursingReassessmentPanel";
import { EmergencyProviderMsePanel } from "@/features/emergency/EmergencyProviderMsePanel";
import { EmergencyDispositionPanel } from "@/features/emergency/EmergencyDispositionPanel";
import { EmergencyVisitSummaryPanel } from "@/features/emergency/EmergencyVisitSummaryPanel";
import { EmergencyTriagePanel } from "@/features/emergency/EmergencyTriagePanel";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyErNursingHandoffPanel } from "@/features/emergency/EmergencyErNursingHandoffPanel";
import { emergencyChartPath, genericEncounterPath } from "@/features/emergency/emergencyRoutes";
import {
  MEDORA_CARD_SHELL,
  MedoraCard,
  MedoraCardActions,
  MedoraCardActionsMediaStyle,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

const EMERGENCY_TYPE = "EMERGENCY" as const;

const STATUS_BADGE_SOFT: Record<string, PriorityBadgeSoft> = {
  OPEN: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  CLOSED: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  CANCELLED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
};

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
};

type EncounterShell = {
  id: string;
  type?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  roomLabel?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  admittedAt?: string | null;
  patient?: PatientLite | null;
  /** Required by `NursingAssessmentTab` (same payload as GET /encounters/:id). */
  nursingAssessment?: unknown;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  physicianAssigned?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  providerDocumentationStatus?: string | null;
};

function patientInitials(p: PatientLite | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: PatientLite | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return ui.common.dash;
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ui.common.dash;
  }
}

function statusSoft(status: string): PriorityBadgeSoft {
  return STATUS_BADGE_SOFT[status] ?? { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" };
}

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};

const shellBox: React.CSSProperties = {
  backgroundColor: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  padding: "14px 16px",
};

/** Zones du tableau de bord urgences (navigation locale + zone active). */
export type ErWorkspaceSection =
  | "triage"
  | "visitSummary"
  | "results"
  | "mar"
  | "orders"
  | "notes"
  | "nursing"
  | "providerMse"
  | "disposition";

type ErDashboardTile =
  | {
      kind: "section";
      id: ErWorkspaceSection;
      accent: string;
      initials: string;
      ariaLabel: string;
      disabled: boolean;
    }
  | {
      kind: "link";
      id: string;
      accent: string;
      initials: string;
      ariaLabel: string;
      href: string;
    };

export function EmergencyActiveWorkspaceView() {
  const params = useParams();
  const encounterId = params.id as string;
  const { facilityId: facilityIdFromHook, facilities, roles, ready: rolesReady, canPrescribe } =
    useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  /** Bumped after embedded saves so les résultats embarqués se rechargent (même idée que l’onglet consultation). */
  const [resultsRefresh, setResultsRefresh] = useState(0);
  /** Recharge le GET triage pour le bandeau clinique partagé (après enregistrement triage, etc.). */
  const [triageRefresh, setTriageRefresh] = useState(0);
  const [triageSnapshot, setTriageSnapshot] = useState<Record<string, unknown> | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<ErWorkspaceSection>("triage");

  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fid = facilityId || facilityIdFromHook;
  const facilityName = facilities.find((x) => x.id === fid)?.name ?? null;

  const canViewEncounterDetail =
    roles.includes("FRONT_DESK") ||
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN") ||
    roles.includes("BILLING");

  const canFetchEncounterTriage =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

  const showNursingTab =
    roles.includes("RN") || roles.includes("ADMIN") || roles.includes("PROVIDER");

  const canFetchMarTab =
    roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");

  const canEditNursingDischarge = roles.includes("RN") || roles.includes("ADMIN");
  const canEditMedicalDischarge = roles.includes("PROVIDER") || roles.includes("ADMIN");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  const genericEncounterHref = genericEncounterPath(encounterId);
  const erChartHref = emergencyChartPath(encounterId);
  const tabHref = (tab: string) => `${genericEncounterHref}?tab=${encodeURIComponent(tab)}`;

  const load = useCallback(async () => {
    if (!encounterId || !fid || !rolesReady || !canViewEncounterDetail) {
      if (rolesReady && !canViewEncounterDetail) {
        setEncounter(null);
        setLoading(false);
        setError("Accès non autorisé à cette consultation.");
      }
      return;
    }
    setLoading(true);
    setError(null);
    const cacheKey = `encounter:${fid}:${encounterId}`;
    try {
      const raw = await apiFetch(`/encounters/${encounterId}`, { facilityId: fid });
      const enc = asApiObject<EncounterShell>(raw);
      if (enc) {
        setEncounter(enc);
        void setCachedRecord("encounter_summaries", cacheKey, enc, {
          facilityId: fid,
          encounterId,
          patientId: enc.patient?.id ?? undefined,
        });
      } else {
        setEncounter(null);
        setError("Consultation indisponible (hors ligne ou synchronisation en cours).");
      }

    } catch (e) {
      console.error(e);
      const msg = normalizeUserFacingError(e instanceof Error ? e.message : null);
      setError(msg || "Impossible de charger la consultation.");
      const cached = await getCachedRecord<EncounterShell>("encounter_summaries", cacheKey);
      if (cached?.data) {
        setEncounter(cached.data);
        setError(
          (msg || "Données en cache.") + " Certaines informations peuvent être obsolètes."
        );
      } else {
        setEncounter(null);
      }
    } finally {
      setLoading(false);
    }
  }, [encounterId, fid, rolesReady, canViewEncounterDetail]);

  useEffect(() => {
    void load();
  }, [load]);

  const onEmbeddedEncounterUpdate = useCallback(async () => {
    await load();
    setResultsRefresh((r) => r + 1);
    setTriageRefresh((r) => r + 1);
  }, [load]);

  const loadTriageForStrip = useCallback(async () => {
    if (!encounterId || !fid) return;
    setTriageLoading(true);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/triage`, { facilityId: fid });
      setTriageSnapshot(
        data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null
      );
    } catch {
      setTriageSnapshot(null);
    } finally {
      setTriageLoading(false);
    }
  }, [encounterId, fid, triageRefresh]);

  useEffect(() => {
    if (!encounterId || !fid) return;
    void loadTriageForStrip();
  }, [encounterId, fid, loadTriageForStrip]);

  const clinicalStripModel = useMemo(() => {
    const parsed = triagePreviewSliceFromTriageGet(triageSnapshot);
    if (!parsed) {
      const emptySlice = {
        chiefComplaint: "",
        onsetAt: "",
        esi: "",
        tempC: "",
        hr: "",
        rr: "",
        bpSys: "",
        bpDia: "",
        spo2: "",
        weightKg: "",
        heightCm: "",
        allergyNote: "",
        triageCompleteAt: "",
      };
      return {
        esi: "",
        allergyText: "",
        pairs: buildErWorkspaceVitalPairs(emptySlice),
      };
    }
    return {
      esi: parsed.slice.esi,
      allergyText: buildAllergyStripSummary(parsed.slice, parsed.er),
      pairs: buildErWorkspaceVitalPairs(parsed.slice),
    };
  }, [triageSnapshot]);

  const complaintLine = useMemo(() => {
    if (!encounter) return ui.common.dash;
    const raw =
      (encounter.visitReason || "").trim() || (encounter.chiefComplaint || "").trim();
    return raw || ui.common.dash;
  }, [encounter]);

  useEffect(() => {
    if (!canFetchEncounterTriage && activeSection === "triage") {
      setActiveSection("results");
    }
  }, [canFetchEncounterTriage, activeSection]);

  useEffect(() => {
    if (!showNursingTab && activeSection === "providerMse") {
      setActiveSection("results");
    }
  }, [showNursingTab, activeSection]);

  const sectionTitleFr: Record<ErWorkspaceSection, string> = {
    triage: "Triage urgences",
    visitSummary: "Synthèse de visite (urgences)",
    results: "Résultats et examens (urgences)",
    mar: "Administration médicamenteuse",
    orders: "Ordres",
    notes: "Notes",
    nursing: "Réévaluation infirmière (urgences)",
    providerMse: "Évaluation médicale (urgences)",
    disposition: "Disposition",
  };

  if (!rolesReady || !fid) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{ui.common.loading}</div>
    );
  }

  if (!canViewEncounterDetail) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? "Accès non autorisé."}</p>
      </div>
    );
  }

  if (loading && !encounter) {
    return (
      <div style={{ padding: 24, fontSize: 14, color: "#64748b" }}>{ui.common.loading}</div>
    );
  }

  if (!encounter) {
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#b91c1c" }}>{error ?? "Consultation introuvable."}</p>
        <p style={{ margin: "16px 0 0 0" }}>
          <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600 }}>
            ← Tableau des urgences
          </Link>
        </p>
      </div>
    );
  }

  const patient = encounter.patient;
  const statusKey = (encounter.status ?? "").trim() || "OPEN";
  const typeKey = (encounter.type ?? "").trim() || "—";
  const roomDisplay = encounter.roomLabel?.trim() || ui.common.dash;
  const isEmergencyType = encounter.type === EMERGENCY_TYPE;
  const isLocked = encounter.providerDocumentationStatus === "SIGNED";

  const headerEsiLevel = esiLevelFromUnknown(clinicalStripModel.esi.trim());

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <MedoraCardActionsMediaStyle />

        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px 0", fontSize: 13 }}>
            <Link href="/app/emergency/trackboard" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              ← Urgences
            </Link>
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Espace urgence actif
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.5 }}>
            Choisissez une zone du tableau de bord, puis travaillez dans la zone active. La charte urgence complète est le
            parcours principal ; le dossier consultation Medora reste disponible en référence.
          </p>
        </header>

        {!isEmergencyType && (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
              Cette consultation n&apos;est pas de type urgence. Vous pouvez ouvrir le dossier complet ci-dessous.
            </p>
          </div>
        )}

        {error && (
          <div style={{ ...shellBox, marginBottom: 16, borderColor: "#fecaca", backgroundColor: "#fef2f2" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#991b1b" }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
        <MedoraCard leftAccentColor="#2563eb" variant="default">
          <MedoraCardInner>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: "10px 12px",
                width: "100%",
              }}
            >
              {/* Gauche : initiales + ESI sous le cercle (pas de gros badge séparé) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                  width: 48,
                }}
              >
                <div style={EMERGENCY_AVATAR_CIRCLE_STYLE} aria-hidden>
                  {patientInitials(patient ?? undefined)}
                </div>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  ESI
                </span>
                <span style={esiUnderAvatarNumberStyle(triageLoading ? null : headerEsiLevel)}>
                  {triageLoading ? "…" : esiDisplayChar(headerEsiLevel)}
                </span>
              </div>

              {/* Centre : identité patient */}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <MedoraCardTitle
                  title={fullPatientName(patient ?? undefined)}
                  subline={
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span>{" "}
                      {(patient?.mrn ?? patient?.nationalId ?? "").trim() || ui.common.dash}
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.ageSex}</span>{" "}
                      {formatAgeYearsSexFr(patient?.dob ?? null, patient?.sexAtBirth ?? null, patient?.sex ?? null)}
                    </p>
                  }
                />
                <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#334155", lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600, color: "#64748b", fontSize: 12 }}>{ui.common.chiefComplaintShort}</span>
                  {" — "}
                  {complaintLine}
                </p>
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b" }}>
                  <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.arrival}</span>{" "}
                  {formatDateTimeFr(encounter.createdAt ?? null)}
                  {encounter.admittedAt ? (
                    <>
                      {" · "}
                      <span style={{ fontWeight: 600, color: "#475569" }}>Admission</span>{" "}
                      {formatDateTimeFr(encounter.admittedAt)}
                    </>
                  ) : null}
                </p>
              </div>

              {/* SV + allergies : cartes compactes */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  flex: "1 1 260px",
                  alignItems: "stretch",
                  minWidth: 0,
                }}
              >
                <EmergencyWorkspaceVitalsCard vitalPairs={clinicalStripModel.pairs} loading={triageLoading} />
                <EmergencyWorkspaceAllergiesCard
                  allergySummary={clinicalStripModel.allergyText}
                  loading={triageLoading}
                />
              </div>

              {/* Droite : salle (haut) + statut + lien — style salle distinct d’ESI (bleu, pas rouge) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                  flex: "0 1 auto",
                  marginLeft: "auto",
                  minWidth: 140,
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid #bae6fd",
                    backgroundColor: "#f0f9ff",
                    textAlign: "center",
                    minWidth: 88,
                    maxWidth: 132,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#0369a1",
                    }}
                  >
                    {ui.common.room}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 16,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: "#0c4a6e",
                      fontVariantNumeric: "tabular-nums",
                      wordBreak: "break-word",
                    }}
                  >
                    {roomDisplay}
                  </div>
                </div>
                <MedoraCardBadgeRow marginTop={0}>
                  <MedoraCardBadge soft={statusSoft(statusKey)}>{getEncounterStatusBoardLabelFr(statusKey)}</MedoraCardBadge>
                  <MedoraCardBadge soft={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}>
                    {getEncounterTypeLabelFr(typeKey)}
                  </MedoraCardBadge>
                </MedoraCardBadgeRow>
                <Link href={erChartHref} style={{ ...linkPill, alignSelf: "flex-end", fontSize: 13, padding: "7px 12px" }}>
                  Consultation complète
                </Link>
                <Link
                  href={genericEncounterHref}
                  style={{
                    alignSelf: "flex-end",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#64748b",
                    textDecoration: "none",
                  }}
                >
                  Dossier Medora (référence)
                </Link>
              </div>
            </div>
          </MedoraCardInner>
        </MedoraCard>
        </div>

        <section aria-label="Tableau de bord urgences" style={{ marginBottom: 20 }}>
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: 13,
              fontWeight: 600,
              color: "#64748b",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Tableau de bord
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
              gap: 6,
              width: "100%",
            }}
          >
            {(
              [
                {
                  kind: "section" as const,
                  id: "triage" as const,
                  accent: "#b91c1c",
                  initials: "T",
                  ariaLabel: "Triage",
                  disabled: !canFetchEncounterTriage,
                },
                {
                  kind: "section" as const,
                  id: "results" as const,
                  accent: "#6366f1",
                  initials: "R",
                  ariaLabel: "Résultats",
                  disabled: false,
                },
                {
                  kind: "section" as const,
                  id: "mar" as const,
                  accent: "#059669",
                  initials: "M",
                  ariaLabel: "MAR",
                  disabled: !canFetchMarTab,
                },
                {
                  kind: "section" as const,
                  id: "orders" as const,
                  accent: "#7c3aed",
                  initials: "O",
                  ariaLabel: "Ordres",
                  disabled: false,
                },
                {
                  kind: "section" as const,
                  id: "notes" as const,
                  accent: "#475569",
                  initials: "N",
                  ariaLabel: "Notes",
                  disabled: false,
                },
                {
                  kind: "section" as const,
                  id: "nursing" as const,
                  accent: "#0ea5e9",
                  initials: "SI",
                  ariaLabel: "Soins infirmiers",
                  disabled: !showNursingTab,
                },
                {
                  kind: "section" as const,
                  id: "providerMse" as const,
                  accent: "#4f46e5",
                  initials: "EM",
                  ariaLabel: "Évaluation médicale",
                  disabled: !showNursingTab,
                },
                {
                  kind: "section" as const,
                  id: "disposition" as const,
                  accent: "#94a3b8",
                  initials: "D",
                  ariaLabel: "Disposition",
                  disabled: false,
                },
                {
                  kind: "link" as const,
                  id: "shortcut-diagnostics",
                  accent: "#9333ea",
                  initials: "Dx",
                  ariaLabel: "Diagnostics",
                  href: tabHref("diagnostics"),
                },
                {
                  kind: "section" as const,
                  id: "visitSummary" as const,
                  accent: "#0f172a",
                  initials: "S",
                  ariaLabel: "Synthèse",
                  disabled: false,
                },
              ] satisfies ErDashboardTile[]
            ).map((q) => {
              if (q.kind === "link") {
                return (
                  <div key={q.id} style={{ minWidth: 0, borderRadius: 16, outline: "1px solid transparent", outlineOffset: 0 }}>
                    <Link
                      href={q.href}
                      aria-label={q.ariaLabel}
                      style={{
                        display: "block",
                        textDecoration: "none",
                        color: "inherit",
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      <MedoraCard leftAccentColor={q.accent} variant="default">
                        <MedoraCardInner>
                          <MedoraCardIdentity initials={q.initials}>{null}</MedoraCardIdentity>
                        </MedoraCardInner>
                      </MedoraCard>
                    </Link>
                  </div>
                );
              }
              const selected = activeSection === q.id;
              return (
                <div
                  key={q.id}
                  style={{
                    minWidth: 0,
                    borderRadius: 16,
                    outline: selected ? "2px solid #2563eb" : "1px solid transparent",
                    outlineOffset: 0,
                    transition: "outline-color 0.12s ease",
                  }}
                >
                  <button
                    type="button"
                    disabled={q.disabled}
                    aria-label={q.ariaLabel}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      if (!q.disabled) setActiveSection(q.id);
                    }}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      margin: 0,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: q.disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: q.disabled ? 0.55 : 1,
                    }}
                  >
                    <MedoraCard leftAccentColor={q.accent} variant="default">
                      <MedoraCardInner>
                        <MedoraCardIdentity initials={q.initials}>{null}</MedoraCardIdentity>
                      </MedoraCardInner>
                    </MedoraCard>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="Zone active" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>{sectionTitleFr[activeSection]}</h2>

          {activeSection === "visitSummary" ? (
            <EmergencyVisitSummaryPanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              triageSnapshot={triageSnapshot}
              resultsRefresh={resultsRefresh}
              resultsTabHref={tabHref("results")}
              diagnosticsTabHref={tabHref("diagnostics")}
            />
          ) : null}

          {activeSection === "triage" && canFetchEncounterTriage ? (
            <EmergencyTriagePanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              isLocked={isLocked}
              encounterTriageTabHref={tabHref("triage")}
              patientChartHref={
                encounter.patient?.id ? `/app/patients/${encodeURIComponent(encounter.patient.id)}` : undefined
              }
              onSaved={onEmbeddedEncounterUpdate}
            />
          ) : null}

          {activeSection === "triage" && !canFetchEncounterTriage ? (
            <MedoraCard leftAccentColor="#64748b" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="T">
                  <MedoraCardTitle
                    title="Triage"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Réservé à certains rôles sur cette page. Utilisez le dossier complet.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("triage")} style={linkPill}>
                    Ouvrir le triage (dossier)
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "results" ? (
            <EmergencyResultsPanel
              encounterId={encounterId}
              facilityId={fid}
              refreshToken={resultsRefresh}
              resultsTabHref={tabHref("results")}
              diagnosticsTabHref={tabHref("diagnostics")}
            />
          ) : null}

          {activeSection === "mar" && canFetchMarTab ? (
            <MedoraCard leftAccentColor="#059669" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title="Administration médicamenteuse (MAR)"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Même outil que l&apos;onglet MAR du dossier.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <div style={{ width: "100%", marginTop: 12 }}>
                  <MedicationAdministrationTab
                    encounterId={encounterId}
                    facilityId={fid}
                    encounterStatus={encounter.status ?? "OPEN"}
                  />
                </div>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "mar" && !canFetchMarTab ? (
            <MedoraCard leftAccentColor="#059669" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title="MAR"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Non disponible pour ce rôle sur cette page.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("mar")} style={linkPill}>
                    Onglet MAR (dossier)
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "orders" ? (
            <EmergencyErOrdersPanel
              encounterId={encounterId}
              facilityId={fid}
              canPrescribe={canPrescribe}
              encounterForOrderModal={encounter ? { patient: encounter.patient } : null}
              onRefetchEncounter={load}
              onOrdersCreated={async () => {
                setResultsRefresh((r) => r + 1);
              }}
            />
          ) : null}

          {activeSection === "notes" ? (
            <MedoraCard leftAccentColor="#475569" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="N">
                  <MedoraCardTitle
                    title="Notes"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                        Notes infirmières et court texte — dossier complet.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("notes")} style={linkPill}>
                    Onglet notes
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "nursing" && showNursingTab ? (
            <>
              <EmergencyErNursingHandoffPanel
                encounter={encounter}
                genericEncounterHref={genericEncounterHref}
                summaryTabHref={tabHref("summary")}
                hospitalisationBoardHref="/app/hospitalisation"
                marTabHref={tabHref("mar")}
                ordersTabHref={tabHref("orders")}
                resultsTabHref={tabHref("results")}
                facilityName={facilityName}
              />
              <EmergencyNursingReassessmentPanel
                encounterId={encounterId}
                facilityId={fid}
                encounter={encounter}
                isLocked={isLocked}
                onSaved={onEmbeddedEncounterUpdate}
                nursingTabHref={tabHref("nursing")}
              />
            </>
          ) : null}

          {activeSection === "nursing" && !showNursingTab ? (
            <MedoraCard leftAccentColor="#0ea5e9" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="I">
                  <MedoraCardTitle
                    title="Soins infirmiers"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Évaluation réservée à certains rôles. Ouvrez le dossier complet.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("nursing")} style={linkPill}>
                    Onglet soins infirmiers
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "providerMse" && showNursingTab ? (
            <EmergencyProviderMsePanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              isLocked={isLocked}
              onSaved={onEmbeddedEncounterUpdate}
              clinicTabHref={tabHref("clinic")}
              erChartHref={erChartHref}
              genericEncounterHref={genericEncounterHref}
            />
          ) : null}

          {activeSection === "providerMse" && !showNursingTab ? (
            <MedoraCard leftAccentColor="#4f46e5" variant="default">
              <MedoraCardInner>
                <MedoraCardIdentity initials="M">
                  <MedoraCardTitle
                    title="Évaluation médicale"
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        Zone réservée à certains rôles. Ouvrez le dossier complet.
                      </p>
                    }
                  />
                </MedoraCardIdentity>
                <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0}>
                  <Link href={tabHref("clinic")} style={linkPill}>
                    Onglet évaluation clinique
                  </Link>
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          ) : null}

          {activeSection === "disposition" ? (
            <EmergencyDispositionPanel
              encounterId={encounterId}
              facilityId={fid}
              encounter={encounter}
              isLocked={isLocked}
              onSaved={onEmbeddedEncounterUpdate}
              summaryTabHref={tabHref("summary")}
              erChartHref={erChartHref}
              genericEncounterHref={genericEncounterHref}
              hospitalisationBoardHref="/app/hospitalisation"
              canPrescribe={canPrescribe}
              canEditNursingDischarge={canEditNursingDischarge}
              canEditMedicalDischarge={canEditMedicalDischarge}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
