"use client";

import { useMemo, useState } from "react";
import {
  domainRequiresPersistedEdocId,
  isPersistedEdocRecordId,
  isSyntheticDomainRecordId,
  nursingSectionIntegration,
  type InpatientAdmissionClinicalSection,
  type NursingAdmissionDomainKey,
  type NursingAdmissionDomainReferenceV1,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { linkNursingAdmissionDomainReference } from "@/features/hospital-care/inpatientOperationsApi";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { AdditionalClinicalDocumentationLauncher } from "./rapid-documentation/AdditionalClinicalDocumentationLauncher";

/** Clinically/legally necessary help only — not routine field labels. */
const CLINICAL_HELP_SECTIONS = new Set<InpatientAdmissionClinicalSection>([
  "ALLERGIES",
  "PAIN",
  "MEDICAL_HISTORY",
  "SURGICAL_HISTORY",
  "SOCIAL_HISTORY",
]);

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
  authoritativeCodeStatus,
  authoritativeIsolation,
  onLinked,
}: {
  sectionId: InpatientAdmissionClinicalSection;
  encounterId: string;
  expectedVersion: number;
  domainReferences: NursingAdmissionDomainReferenceV1[];
  patient?: PatientLite | null;
  signed: boolean;
  canLink: boolean;
  authoritativeCodeStatus?: { value: string | null; documented: boolean } | null;
  authoritativeIsolation?: { value: string | null; documented: boolean } | null;
  onLinked: (documentation: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const { facilityId } = useFacilityAndRoles();
  const integration = useMemo(() => nursingSectionIntegration(sectionId), [sectionId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const sectionRefs = domainReferences.filter(
    (r) =>
      r.sectionId === sectionId ||
      (integration.authoritativeDomain !== "ADMISSION_OWNED" &&
        r.domain === integration.authoritativeDomain)
  );
  const authoritativeCount = sectionRefs.filter(
    (r) => !isSyntheticDomainRecordId(r.recordId) && r.source !== "LEGACY_SYNTHETIC"
  ).length;
  const legacyCount = sectionRefs.filter(
    (r) => isSyntheticDomainRecordId(r.recordId) || r.source === "LEGACY_SYNTHETIC"
  ).length;

  const badgeLabel = t(`hospitalAdmissionD4a25a.badges.${integration.badgeKey}`);

  const showHelp = CLINICAL_HELP_SECTIONS.has(sectionId);
  const help =
    sectionId === "ALLERGIES"
      ? t("hospitalAdmissionD4a25a.domain.helpAllergy")
      : sectionId === "PAIN"
        ? t("hospitalAdmissionD4a25a.domain.helpPain")
        : sectionId === "MEDICAL_HISTORY" ||
            sectionId === "SURGICAL_HISTORY" ||
            sectionId === "SOCIAL_HISTORY"
          ? t("hospitalAdmissionD4a25a.domain.helpHistory")
          : t("hospitalAdmissionD4a26h.help.authoritativeLink");

  const linkAuthoritative = async (input: {
    recordId: string;
    domain: NursingAdmissionDomainKey;
    cardId?: string | null;
  }) => {
    if (!canLink || signed) return;
    if (isSyntheticDomainRecordId(input.recordId)) {
      setError(t("hospitalAdmissionD4a26h.errors.syntheticRejected"));
      return;
    }
    if (domainRequiresPersistedEdocId(input.domain) && !isPersistedEdocRecordId(input.recordId)) {
      setError(t("hospitalAdmissionD4a26h.errors.syntheticRejected"));
      return;
    }
    setBusy(true);
    setError(null);
    setLinkNotice(null);
    try {
      const res = await linkNursingAdmissionDomainReference(encounterId, {
        expectedVersion,
        reference: {
          domain: input.domain,
          recordId: input.recordId,
          status: "LINKED",
          sectionId,
          source: "ENTERPRISE_DOMAIN",
          cardId: input.cardId ?? null,
        },
      });
      onLinked(res.documentation);
      setLinkNotice(t("hospitalAdmissionD4a26h.status.linkedAuthoritative"));
    } catch {
      setError(t("hospitalAdmissionD4a26h.errors.linkFailed"));
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
          {badgeLabel}
        </span>
        {showHelp ? (
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
        ) : null}
        {authoritativeCount > 0 || legacyCount > 0 ? (
          <span style={{ fontSize: 12, color: "#64748b" }} data-testid="nursing-domain-auth-count">
            {t("hospitalAdmissionD4a26h.status.authoritativeCount").replace(
              "{count}",
              String(authoritativeCount)
            )}
          </span>
        ) : null}
        {legacyCount > 0 ? (
          <span
            role="status"
            style={{ fontSize: 12, color: "#9a3412", fontWeight: 600 }}
            data-testid="nursing-domain-legacy-warning"
          >
            ⚠{" "}
            {t("hospitalAdmissionD4a26h.status.legacySyntheticCount").replace(
              "{count}",
              String(legacyCount)
            )}
          </span>
        ) : null}
      </div>

      {sectionId === "OVERVIEW" ? (
        <div data-testid="nursing-ops-code-isolation" style={{ marginTop: 10, fontSize: 13 }}>
          <p style={{ margin: "0 0 4px" }}>
            <strong>{t("hospitalAdmissionD4a26h.codeStatus.label")}</strong>:{" "}
            {authoritativeCodeStatus?.documented
              ? authoritativeCodeStatus.value
              : t("hospitalAdmissionD4a26h.codeStatus.notDocumented")}
            <span style={{ color: "#64748b" }}>
              {" "}
              ({t("hospitalAdmissionD4a26h.codeStatus.source")})
            </span>
          </p>
          <p style={{ margin: 0 }}>
            <strong>{t("hospitalAdmissionD4a26h.isolation.label")}</strong>:{" "}
            {authoritativeIsolation?.documented
              ? authoritativeIsolation.value
              : t("hospitalAdmissionD4a26h.isolation.notDocumented")}
            <span style={{ color: "#64748b" }}>
              {" "}
              ({t("hospitalAdmissionD4a26h.isolation.source")})
            </span>
          </p>
        </div>
      ) : null}

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
            <dd style={{ margin: 0 }} data-testid="nursing-demographics-dob">
              {patient?.dob?.trim()
                ? (() => {
                    const d = new Date(patient.dob!);
                    return Number.isNaN(d.getTime())
                      ? DISPLAY_DASH
                      : d.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                  })()
                : DISPLAY_DASH}
            </dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.sex")}</dt>
            <dd style={{ margin: 0 }}>{patient?.sexAtBirth?.trim() || DISPLAY_DASH}</dd>
            <dt>{t("hospitalAdmissionD4a25a.demographics.preferredName")}</dt>
            <dd style={{ margin: 0 }}>{patient?.preferredName?.trim() || DISPLAY_DASH}</dd>
          </dl>
        </div>
      ) : null}

      {EDOC_SECTIONS.has(sectionId) && facilityId ? (
        <div style={{ marginTop: 10 }} data-testid={`nursing-additional-docs-launcher-${sectionId}`}>
          <AdditionalClinicalDocumentationLauncher
            role="NURSING"
            encounterType="INPATIENT"
            compact
          />
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
            {t("inpatientRapidConvergenceD4a27c.rapid.openAdditionalDocs")}
          </p>
        </div>
      ) : null}

      {sectionRefs.length ? (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#334155" }}>
          {sectionRefs.map((r) => {
            const legacy =
              isSyntheticDomainRecordId(r.recordId) || r.source === "LEGACY_SYNTHETIC";
            return (
              <li key={`${r.domain}-${r.recordId}`}>
                {legacy ? (
                  <span role="status" style={{ color: "#9a3412", fontWeight: 600 }}>
                    ⚠ {t("hospitalAdmissionD4a26h.status.legacySynthetic")}
                  </span>
                ) : (
                  <span>{t("hospitalAdmissionD4a26h.status.authoritativeRecord")}</span>
                )}{" "}
                · {r.domain} · {legacy ? t("hospitalAdmissionD4a26h.status.idHidden") : r.status}
                {legacy && canLink && !signed ? (
                  <span style={{ display: "block", color: "#64748b" }}>
                    {t("hospitalAdmissionD4a26h.status.replaceLegacy")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {linkNotice ? (
        <p role="status" style={{ margin: "8px 0 0", fontSize: 12, color: "#0f766e" }}>
          {linkNotice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {busy ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("common.saving")}</p>
      ) : null}
    </div>
  );
}
