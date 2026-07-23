"use client";

import { useMemo, useState } from "react";
import {
  nursingSectionIntegration,
  type InpatientAdmissionClinicalSection,
  type NursingAdmissionDomainReferenceV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import { linkNursingAdmissionDomainReference } from "@/features/hospital-care/inpatientOperationsApi";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

type PatientLite = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
  dob?: string | null;
  sexAtBirth?: string | null;
  preferredName?: string | null;
};

const EDOC_SECTIONS = new Set<InpatientAdmissionClinicalSection>([
  "PAIN",
  "FALL_SAFETY",
  "SKIN_WOUND",
  "LINES_DRAINS_DEVICES",
  "BELONGINGS_VALUABLES",
  "EDUCATION_COMMUNICATION",
  "FUNCTIONAL_MOBILITY",
]);

export function NursingAdmissionDomainIntegrationPanel({
  sectionId,
  encounterId,
  expectedVersion,
  domainReferences,
  patient,
  signed,
  canLink,
  onLinked,
}: {
  sectionId: InpatientAdmissionClinicalSection;
  encounterId: string;
  expectedVersion: number;
  domainReferences: NursingAdmissionDomainReferenceV1[];
  patient?: PatientLite | null;
  signed: boolean;
  canLink: boolean;
  onLinked: (documentation: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const { facilityId } = useFacilityAndRoles();
  const integration = useMemo(() => nursingSectionIntegration(sectionId), [sectionId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sectionRefs = domainReferences.filter(
    (r) =>
      r.sectionId === sectionId ||
      (integration.authoritativeDomain !== "ADMISSION_OWNED" &&
        r.domain === integration.authoritativeDomain)
  );

  const badgeLabel = t(`hospitalAdmissionD4a25a.badges.${integration.badgeKey}`);

  const help =
    sectionId === "ALLERGIES"
      ? t("hospitalAdmissionD4a25a.domain.helpAllergy")
      : sectionId === "PAIN"
        ? t("hospitalAdmissionD4a25a.domain.helpPain")
        : sectionId === "MEDICAL_HISTORY" ||
            sectionId === "SURGICAL_HISTORY" ||
            sectionId === "SOCIAL_HISTORY"
          ? t("hospitalAdmissionD4a25a.domain.helpHistory")
          : t("hospitalAdmissionD4a25a.domain.helpAddendum");

  const linkDomain = async (recordId: string) => {
    if (!canLink || signed) return;
    if (integration.authoritativeDomain === "ADMISSION_OWNED") return;
    setBusy(true);
    setError(null);
    try {
      const res = await linkNursingAdmissionDomainReference(encounterId, {
        expectedVersion,
        reference: {
          domain: integration.authoritativeDomain,
          recordId,
          status: "LINKED",
          sectionId,
          source: "NURSING_ADMISSION",
        },
      });
      onLinked(res.documentation);
    } catch {
      setError(t("common.loadError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid={`nursing-domain-panel-${sectionId}`}
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#0f766e",
            background: "#ecfdf5",
            border: "1px solid #99f6e4",
            borderRadius: 9999,
            padding: "2px 8px",
          }}
          data-testid="nursing-domain-badge"
        >
          {t("hospitalAdmissionD4a25a.domain.sharedEnterprise")} · {badgeLabel}
        </span>
        <span
          title={help}
          aria-label={help}
          style={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: 9999,
            border: "1px solid #94a3b8",
            fontSize: 11,
            alignItems: "center",
            justifyContent: "center",
            cursor: "help",
          }}
        >
          ?
        </span>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {t("hospitalAdmissionD4a25a.domain.linkedCount").replace(
            "{count}",
            String(sectionRefs.length)
          )}
        </span>
      </div>

      {sectionId === "IDENTITY_DEMOGRAPHICS" ? (
        <div data-testid="nursing-demographics-readonly" style={{ marginTop: 10, fontSize: 13 }}>
          <strong>{t("hospitalAdmissionD4a25a.demographics.title")}</strong>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: "4px 10px",
              margin: "8px 0 0",
            }}
          >
            <dt>{t("hospitalAdmissionD4a25a.demographics.legalName")}</dt>
            <dd style={{ margin: 0 }}>
              {`${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || DISPLAY_DASH}
            </dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.mrn")}</dt>
            <dd style={{ margin: 0 }}>{patient?.mrn?.trim() || DISPLAY_DASH}</dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.dob")}</dt>
            <dd style={{ margin: 0 }}>{patient?.dob?.trim() || DISPLAY_DASH}</dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.sex")}</dt>
            <dd style={{ margin: 0 }}>{patient?.sexAtBirth?.trim() || DISPLAY_DASH}</dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.preferredName")}</dt>
            <dd style={{ margin: 0 }}>{patient?.preferredName?.trim() || DISPLAY_DASH}</dd>
          </dl>
        </div>
      ) : null}

      {EDOC_SECTIONS.has(sectionId) && facilityId ? (
        <div style={{ marginTop: 10 }} data-testid={`nursing-edoc-embed-${sectionId}`}>
          <ClinicalDocumentationHub
            careSetting="INPATIENT"
            encounterId={encounterId}
            facilityId={facilityId}
            showHeader={false}
            accessMode={signed ? "review" : "edit"}
            focusedCardId={integration.edocFocusedCardId ?? null}
            onEntriesChanged={() => {
              if (!signed && canLink && integration.edocFocusedCardId) {
                void linkDomain(`edoc-${integration.edocFocusedCardId}-${Date.now()}`);
              }
            }}
          />
        </div>
      ) : null}

      {!EDOC_SECTIONS.has(sectionId) &&
      integration.authoritativeDomain !== "ADMISSION_OWNED" &&
      canLink &&
      !signed ? (
        <button
          type="button"
          disabled={busy}
          style={{ marginTop: 8 }}
          onClick={() =>
            void linkDomain(
              `ref-${String(integration.authoritativeDomain).toLowerCase()}-${Date.now()}`
            )
          }
        >
          {t("hospitalAdmissionD4a25a.domain.linkRecord")}
        </button>
      ) : null}

      {sectionRefs.length ? (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#334155" }}>
          {sectionRefs.map((r) => (
            <li key={`${r.domain}-${r.recordId}`}>
              {r.domain} · {r.recordId} ·{" "}
              {t(`hospitalAdmissionD4a25a.statuses.${r.status}`)}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
