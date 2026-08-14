"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  D5A3_CERTIFICATION_ID,
  D5A3_DENTAL_WORKSPACE_SECTIONS,
  D5A3_PLACEHOLDER_MILESTONE,
  isDentalEncounterProjection,
  isEnterpriseEncounterClosed,
  isD5a3DentalSectionActive,
  parseD5a3DentalWorkspaceSection,
  type D5a3DentalWorkspaceSection,
} from "@medora/shared";
import { EnterpriseClosedEncounterViewer } from "@/components/encounters/EnterpriseClosedEncounterViewer";
import { ClinicCareAmbulatoryMedicalEvaluationPanel } from "@/features/clinic-care/ClinicCareAmbulatoryMedicalEvaluationPanel";
import { ClinicCareAmbulatoryPrescriptionPanel } from "@/features/clinic-care/ClinicCareAmbulatoryPrescriptionPanel";
import { EncounterDiagnosticsPanel } from "@/components/encounters/EncounterDiagnosticsPanel";
import { EmergencyErOrdersPanel } from "@/features/emergency/EmergencyErOrdersPanel";
import { EmergencyResultsPanel } from "@/features/emergency/EmergencyResultsPanel";
import { EmergencyErNotesPanel } from "@/features/emergency/EmergencyErNotesPanel";
import { PatientClinicalHistoryProfileBlock } from "@/components/patient-chart/PatientClinicalHistoryProfileBlock";
import { patientClinicalHistoryProfileFromJson } from "@/features/emergency/patientClinicalHistoryProfile";
import { RegistrationDocumentCenter } from "@/components/documents/RegistrationDocumentCenter";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  formatEncounterChromeDateTime,
  formatPatientAgeSexLine,
  tEncounterStatus,
} from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { isEncounterLocked } from "@/lib/encounterLock";

type EncounterShell = {
  id: string;
  status?: string | null;
  type?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
  closedByDisplayFr?: string | null;
  closedByUserId?: string | null;
  reopenCount?: number | null;
  version?: number | null;
  roomLabel?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  followUpDate?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
  admissionSummaryJson?: unknown;
  dischargeSummaryJson?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
  physicianAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  nurseAssigned?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | null;
    sexAtBirth?: string | null;
    sex?: string | null;
    mrn?: string | null;
    nationalId?: string | null;
  } | null;
};

function personName(
  p: { firstName?: string | null; lastName?: string | null } | null | undefined,
  dash: string
): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || dash;
}

function PlaceholderCard({ title, milestone }: { title: string; milestone: string }) {
  const { t } = useI18n();
  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: 16 }} data-testid="dental-workspace-placeholder">
      <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#64748b" }}>
        {t("dentalCareD5a3.placeholder.body").replace("{milestone}", milestone)}
      </p>
    </div>
  );
}

function SectionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>{title}</h3>
      {children}
    </section>
  );
}

/**
 * MEDUI.D5A.3 — Enterprise Dental Encounter Workspace.
 * Reuses enterprise Encounter and clinical engines. Service-line projection only.
 */
export function EnterpriseDentalEncounterWorkspace({ encounterId }: { encounterId: string }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    facilityId,
    roles,
    ready,
    facilities,
    userId,
    facilityCountry,
    careProfileJson,
  } = useFacilityAndRoles();
  const dash = t("common.dash");
  const notDocumented = t("dentalCareD5a3.notDocumented");

  const section = parseD5a3DentalWorkspaceSection(searchParams.get("section"));
  const [encounter, setEncounter] = useState<EncounterShell | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyProfile, setHistoryProfile] = useState<ReturnType<
    typeof patientClinicalHistoryProfileFromJson
  > | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [closePending, setClosePending] = useState(false);

  const facilityName = facilities.find((f) => f.id === facilityId)?.name ?? null;
  const canPrescribe = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canAuthorClinical =
    roles.includes("PROVIDER") || roles.includes("RN") || roles.includes("ADMIN");
  const canFrontDeskOnly =
    roles.includes("FRONT_DESK") &&
    !roles.includes("PROVIDER") &&
    !roles.includes("RN") &&
    !roles.includes("ADMIN");
  const canBillingOnly =
    roles.includes("BILLING") &&
    !roles.includes("PROVIDER") &&
    !roles.includes("RN") &&
    !roles.includes("ADMIN");
  void userId;

  const loadEncounter = async () => {
    if (!facilityId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, { facilityId });
      setEncounter(data as EncounterShell);
      const fu = (data as EncounterShell)?.followUpDate;
      setFollowUpDraft(fu ? String(fu).slice(0, 10) : "");
    } catch (err) {
      setEncounter(null);
      setLoadError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("dentalCareD5a3.errors.loadEncounter")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadEncounter();
  }, [ready, facilityId, encounterId]);

  useEffect(() => {
    if (!facilityId || !encounter?.patient?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await apiFetch(
          `/patients/${encodeURIComponent(encounter.patient!.id!)}/clinical-history-profile`,
          { facilityId }
        );
        if (!cancelled) {
          setHistoryProfile(patientClinicalHistoryProfileFromJson(profile));
        }
      } catch {
        if (!cancelled) setHistoryProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, encounter?.patient?.id]);

  const isDental = useMemo(
    () =>
      encounter
        ? isDentalEncounterProjection({
            type: encounter.type,
            nursingAssessment: encounter.nursingAssessment,
            admissionSummaryJson: encounter.admissionSummaryJson,
          })
        : false,
    [encounter]
  );

  const setSection = (next: D5a3DentalWorkspaceSection) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (next === "overview") qs.delete("section");
    else qs.set("section", next);
    const q = qs.toString();
    router.replace(q ? `?${q}` : "?", { scroll: false });
  };

  const saveFollowUp = async () => {
    if (!facilityId || !encounter || encounter.status !== "OPEN") return;
    setFollowUpSaving(true);
    try {
      await apiFetch(`/encounters/${encodeURIComponent(encounter.id)}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpDate: followUpDraft.trim() ? followUpDraft.trim() : null,
        }),
      });
      await loadEncounter();
    } catch (err) {
      setLoadError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("dentalCareD5a3.errors.saveFollowUp")
      );
    } finally {
      setFollowUpSaving(false);
    }
  };

  const closeEncounter = async () => {
    if (!facilityId || !encounter || !canAuthorClinical) return;
    setClosePending(true);
    try {
      await apiFetch(`/encounters/${encodeURIComponent(encounter.id)}/close`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: encounter.version,
        }),
      });
      await loadEncounter();
    } catch (err) {
      setLoadError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("dentalCareD5a3.errors.close")
      );
    } finally {
      setClosePending(false);
    }
  };

  if (!ready || loading) {
    return <p style={{ padding: 16 }}>{t("common.loading")}</p>;
  }

  if (loadError && !encounter) {
    return (
      <div style={{ padding: 16 }} role="alert">
        <p>{loadError}</p>
        <Link href="/app/dental">{t("dentalCareD5a3.backToDental")}</Link>
      </div>
    );
  }

  if (!encounter || !facilityId) {
    return <p style={{ padding: 16 }}>{t("dentalCareD5a3.errors.notFound")}</p>;
  }

  if (!isDental) {
    return (
      <div style={{ ...MEDORA_CARD_SHELL, padding: 16 }} data-testid="dental-workspace-not-dental">
        <h2 style={{ margin: 0, fontSize: 16 }}>{t("dentalCareD5a3.errors.notDentalTitle")}</h2>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
          {t("dentalCareD5a3.errors.notDentalBody")}
        </p>
        <p style={{ margin: "12px 0 0" }}>
          <Link href={`/app/encounters/${encodeURIComponent(encounter.id)}`}>
            {t("dentalCareD5a3.openGenericEncounter")}
          </Link>
        </p>
      </div>
    );
  }

  if (isEnterpriseEncounterClosed(encounter.status)) {
    return (
      <EnterpriseClosedEncounterViewer
        facilityId={facilityId}
        facilityName={facilityName}
        encounter={encounter}
        roleCodes={roles}
        backHref="/app/dental"
        backLabel={t("dentalCareD5a3.backToDental")}
        careSettingLabel={t("dentalCareD5a3.careSettingLabel")}
        onReopened={async () => {
          await loadEncounter();
        }}
      />
    );
  }

  const patient = encounter.patient;
  const patientName = personName(patient, dash);
  const locked = isEncounterLocked(encounter) || encounter.status !== "OPEN";
  const clinicalAuthorBlocked = canFrontDeskOnly || canBillingOnly || locked;

  const historyParsed = historyProfile;

  return (
    <div
      data-testid="enterprise-dental-encounter-workspace"
      data-certification-id={D5A3_CERTIFICATION_ID}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{patientName}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {t("dentalCareD5a3.header.mrn")}: {(patient?.mrn ?? patient?.nationalId ?? "").trim() || notDocumented}
              {" · "}
              {formatPatientAgeSexLine(
                patient?.dob ?? null,
                patient?.sexAtBirth ?? null,
                patient?.sex ?? null,
                t
              )}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div>
              <strong>{tEncounterStatus(t, encounter.status ?? "OPEN")}</strong>
            </div>
            <div style={{ color: "#64748b" }}>
              {encounter.createdAt
                ? formatEncounterChromeDateTime(encounter.createdAt, language)
                : notDocumented}
            </div>
          </div>
        </div>
        <dl
          style={{
            margin: "12px 0 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "8px 14px",
            fontSize: 13,
          }}
        >
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.facility")}</dt>
            <dd style={{ margin: 0 }}>{(facilityName ?? "").trim() || notDocumented}</dd>
          </div>
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.provider")}</dt>
            <dd style={{ margin: 0 }}>{personName(encounter.physicianAssigned, notDocumented)}</dd>
          </div>
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.assistant")}</dt>
            <dd style={{ margin: 0 }}>{personName(encounter.nurseAssigned, notDocumented)}</dd>
          </div>
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.chair")}</dt>
            <dd style={{ margin: 0 }}>{(encounter.roomLabel ?? "").trim() || notDocumented}</dd>
          </div>
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.reason")}</dt>
            <dd style={{ margin: 0 }}>
              {(encounter.chiefComplaint ?? encounter.visitReason ?? "").trim() || notDocumented}
            </dd>
          </div>
          <div>
            <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{t("dentalCareD5a3.header.followUp")}</dt>
            <dd style={{ margin: 0 }}>
              {encounter.followUpDate
                ? formatEncounterChromeDateTime(String(encounter.followUpDate), language)
                : notDocumented}
            </dd>
          </div>
        </dl>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Link href="/app/dental" style={{ fontSize: 13, fontWeight: 600 }}>
            {t("dentalCareD5a3.backToDental")}
          </Link>
          {patient?.id ? (
            <Link href={`/app/patients/${encodeURIComponent(patient.id)}`} style={{ fontSize: 13, fontWeight: 600 }}>
              {t("dentalCareD5a3.openPatientRecord")}
            </Link>
          ) : null}
          {canAuthorClinical && encounter.status === "OPEN" ? (
            <button
              type="button"
              disabled={closePending}
              onClick={() => void closeEncounter()}
              style={{
                marginLeft: "auto",
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: closePending ? "wait" : "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {closePending ? t("common.loading") : t("dentalCareD5a3.actions.closeEncounter")}
            </button>
          ) : null}
        </div>
        {loadError ? (
          <p role="alert" style={{ margin: "10px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {loadError}
          </p>
        ) : null}
      </header>

      <nav
        aria-label={t("dentalCareD5a3.sectionNavLabel")}
        data-testid="dental-workspace-section-nav"
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
      >
        {D5A3_DENTAL_WORKSPACE_SECTIONS.map((id) => {
          const active = id === section;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
                background: active ? "#0f172a" : "#fff",
                color: active ? "#fff" : "#334155",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t(`dentalCareD5a3.sections.${id}`)}
              {!isD5a3DentalSectionActive(id) ? " · …" : ""}
            </button>
          );
        })}
      </nav>

      <div data-testid={`dental-workspace-section-${section}`}>
        {section === "overview" ? (
          <SectionShell title={t("dentalCareD5a3.sections.overview")}>
            <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
              {t("dentalCareD5a3.overview.body")}
            </p>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              <li>
                {t("dentalCareD5a3.header.reason")}:{" "}
                {(encounter.chiefComplaint ?? encounter.visitReason ?? "").trim() || notDocumented}
              </li>
              <li>
                {t("dentalCareD5a3.overview.docStatus")}:{" "}
                {(encounter.providerDocumentationStatus ?? "").trim() || notDocumented}
              </li>
            </ul>
          </SectionShell>
        ) : null}

        {section === "history" ? (
          <SectionShell title={t("dentalCareD5a3.sections.history")}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a3.history.reuseNote")}
            </p>
            <PatientClinicalHistoryProfileBlock profile={historyParsed} />
          </SectionShell>
        ) : null}

        {section === "assessment" ? (
          <SectionShell title={t("dentalCareD5a3.sections.assessment")}>
            {clinicalAuthorBlocked && !canAuthorClinical ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("dentalCareD5a3.errors.noClinicalAuthor")}</p>
            ) : (
              <ClinicCareAmbulatoryMedicalEvaluationPanel
                encounter={encounter}
                facilityId={facilityId}
                facilityCountry={facilityCountry}
                roles={roles}
                onUpdate={loadEncounter}
              />
            )}
          </SectionShell>
        ) : null}

        {section === "diagnoses" ? (
          <SectionShell title={t("dentalCareD5a3.sections.diagnoses")}>
            <EncounterDiagnosticsPanel
              encounterId={encounter.id}
              patientId={patient?.id ?? ""}
              facilityId={facilityId}
              canDocumentDiagnoses={canAuthorClinical && !clinicalAuthorBlocked}
              isLocked={locked || clinicalAuthorBlocked}
            />
          </SectionShell>
        ) : null}

        {section === "imaging" ? (
          <SectionShell title={t("dentalCareD5a3.sections.imaging")}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a3.imaging.reuseNote")}
            </p>
            <EmergencyErOrdersPanel
              encounterId={encounter.id}
              facilityId={facilityId}
              canPrescribe={canPrescribe && !clinicalAuthorBlocked}
              encounterSigned={encounter.providerDocumentationStatus === "SIGNED" || locked}
              encounterForOrderModal={{ patient: encounter.patient }}
              medicationOrderMode="OUTPATIENT_RX_ONLY"
              hideTraumaProtocolAssist
              onRefetchEncounter={async () => {
                await loadEncounter();
              }}
              roles={roles}
            />
            <div style={{ marginTop: 14 }}>
              <EmergencyResultsPanel
                encounterId={encounter.id}
                facilityId={facilityId}
                refreshToken={0}
                canAcknowledgeResults={canAuthorClinical}
                patient={
                  encounter.patient
                    ? {
                        firstName: encounter.patient.firstName ?? null,
                        lastName: encounter.patient.lastName ?? null,
                        mrn: encounter.patient.mrn ?? null,
                      }
                    : null
                }
                encounterMeta={{
                  id: encounter.id,
                  createdAt: encounter.createdAt ?? new Date().toISOString(),
                  physicianAssigned: null,
                }}
                facilityName={facilityName}
              />
            </div>
          </SectionShell>
        ) : null}

        {section === "prescriptions" ? (
          <SectionShell title={t("dentalCareD5a3.sections.prescriptions")}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a3.prescriptions.reuseNote")}
            </p>
            <ClinicCareAmbulatoryPrescriptionPanel
              encounterId={encounter.id}
              facilityId={facilityId}
              facilityDisplayName={facilityName}
              facilityCareProfileJson={careProfileJson}
              canPrescribe={canPrescribe && !clinicalAuthorBlocked}
              encounter={encounter}
              isLocked={locked}
              onUpdate={loadEncounter}
            />
          </SectionShell>
        ) : null}

        {section === "clinicalNotes" ? (
          <SectionShell title={t("dentalCareD5a3.sections.clinicalNotes")}>
            <EmergencyErNotesPanel
              encounterId={encounter.id}
              facilityId={facilityId}
              status={encounter.status}
              isLocked={locked || clinicalAuthorBlocked}
              roleCodes={roles}
              onSaved={loadEncounter}
            />
          </SectionShell>
        ) : null}

        {section === "consents" ? (
          <SectionShell title={t("dentalCareD5a3.sections.consents")}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a3.consents.reuseNote")}
            </p>
            {patient?.id ? (
              <RegistrationDocumentCenter
                patientId={patient.id}
                facilityId={facilityId}
                canEdit={!locked && !canBillingOnly && (canAuthorClinical || roles.includes("FRONT_DESK"))}
              />
            ) : (
              <p style={{ margin: 0, color: "#64748b" }}>{notDocumented}</p>
            )}
          </SectionShell>
        ) : null}

        {section === "followUp" ? (
          <SectionShell title={t("dentalCareD5a3.sections.followUp")}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
              {t("dentalCareD5a3.followUp.dateLabel")}
              <input
                type="date"
                value={followUpDraft}
                disabled={locked || !canAuthorClinical || clinicalAuthorBlocked}
                onChange={(e) => setFollowUpDraft(e.target.value)}
                style={{ display: "block", marginTop: 6, padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
              />
            </label>
            <button
              type="button"
              disabled={locked || !canAuthorClinical || clinicalAuthorBlocked || followUpSaving}
              onClick={() => void saveFollowUp()}
              style={{
                marginTop: 10,
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {followUpSaving ? t("common.loading") : t("dentalCareD5a3.followUp.save")}
            </button>
          </SectionShell>
        ) : null}

        {section === "summary" ? (
          <SectionShell title={t("dentalCareD5a3.sections.summary")}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a3.summary.reuseNote")}
            </p>
            <dl style={{ margin: 0, display: "grid", gap: 8, fontSize: 14 }}>
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>{t("dentalCareD5a3.header.reason")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>
                  {(encounter.chiefComplaint ?? encounter.visitReason ?? "").trim() || notDocumented}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>{t("dentalCareD5a3.summary.plan")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>
                  {(encounter.treatmentPlan ?? "").trim() || notDocumented}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>{t("dentalCareD5a3.summary.note")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>
                  {(encounter.providerNote ?? "").trim() || notDocumented}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 12 }}>{t("dentalCareD5a3.overview.docStatus")}</dt>
                <dd style={{ margin: "2px 0 0" }}>
                  {(encounter.providerDocumentationStatus ?? "").trim() || notDocumented}
                  {encounter.providerDocumentationSignedByDisplayFr
                    ? ` · ${encounter.providerDocumentationSignedByDisplayFr}`
                    : ""}
                </dd>
              </div>
            </dl>
          </SectionShell>
        ) : null}

        {(section === "odontogram" ||
          section === "periodontal" ||
          section === "treatmentPlan" ||
          section === "procedures") &&
        !isD5a3DentalSectionActive(section) ? (
          <PlaceholderCard
            title={t(`dentalCareD5a3.sections.${section}`)}
            milestone={D5A3_PLACEHOLDER_MILESTONE[section]}
          />
        ) : null}
      </div>
    </div>
  );
}
