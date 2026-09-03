"use client";

/**
 * MEDUI.D5A.5 — Dental clinical record overview (read-only projection).
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  D5A5_CERTIFICATION_ID,
  D5A5_OVERVIEW_SECTIONS,
  formatToothDisplayLabel,
  getCanonicalTooth,
  type D5a5OverviewSection,
} from "@medora/shared";
import { apiFetch, apiFetchResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { productUiBcp47Tag, resolveProductUiLanguageOrDefault } from "@/i18n/config";

type ClinicalRecord = {
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
    dateOfBirth?: string | null;
  } | null;
  encounter?: {
    status?: string | null;
    createdAt?: string | null;
    chiefComplaint?: string | null;
    followUpDate?: string | null;
    providerDocumentationStatus?: string | null;
    providerDocumentationSignedAt?: string | null;
    dentistDisplay?: string | null;
  } | null;
  dentalEvaluation?: unknown;
  odontogramFindings?: Array<{
    toothCode: string;
    findingType: string;
    surfaces?: string[];
    clinicalState: string;
  }>;
  periodontalExam?: {
    periodontalStatus?: string;
    periodontitisStage?: string | null;
    periodontitisGrade?: string | null;
    extentDistribution?: string | null;
    narrativeAssessment?: string | null;
    siteCount?: number;
    summary?: {
      bleedingPercent?: number | null;
      deepestProbingDepthMm?: number | null;
    };
  } | null;
  diagnoses?: Array<{ code?: string; description?: string; status?: string }>;
  treatmentPlan?: {
    acceptanceOutcome?: string;
    expectedBenefits?: string | null;
    materialRisks?: string | null;
    reasonableAlternatives?: string | null;
    noTreatmentDiscussed?: boolean;
    patientQuestions?: string | null;
    proposedTreatmentSummary?: string | null;
    items?: Array<{
      proposedTreatment: string;
      toothCodes?: string[];
      phase?: string;
      status?: string;
    }>;
  } | null;
  procedures?: Array<{ clinicalName: string; toothCodes?: string[]; performedAt?: string }>;
  orders?: Array<{ orderType?: string; status?: string; displayName?: string | null }>;
  notes?: Array<{ noteType?: string; body?: string; authorDisplay?: string | null }>;
  addenda?: Array<{ text?: string }>;
  historyReview?: { reviewed?: boolean; reviewedAt?: string | null; notes?: string | null } | null;
  documents?: Array<{
    title?: string | null;
    category?: string;
    type?: string;
    status?: string;
    signatureStatus?: string | null;
    uploadedAt?: string;
    encounterScoped?: boolean;
    signers?: Array<{ signerName?: string; signerType?: string; signedAt?: string }>;
  }>;
  providerNote?: string | null;
  freeTextTreatmentPlan?: string | null;
};

type Props = {
  encounterId: string;
  facilityId: string;
  locked?: boolean;
};

function val(v: string | null | undefined, empty: string): string {
  const s = (v ?? "").trim();
  return s || empty;
}

export function EnterpriseDentalEncounterOverviewPanel({ encounterId, facilityId, locked }: Props) {
  const { t, language } = useI18n();
  const notDocumented = t("dentalCareD5a5.notDocumented");
  const [data, setData] = useState<ClinicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/clinical-record`,
        { facilityId }
      )) as ClinicalRecord;
      setData(res);
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderSection = (section: D5a5OverviewSection): ReactNode => {
    if (!data) return null;
    const p = data.patient;
    const enc = data.encounter;

    switch (section) {
      case "patientIdentity":
        return (
          <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.sections.patient")}</dt>
              <dd style={{ margin: "2px 0 0" }}>
                {val(`${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim(), notDocumented)}
              </dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.sections.mrn")}</dt>
              <dd style={{ margin: "2px 0 0" }}>{val(p?.mrn ?? null, notDocumented)}</dd>
            </div>
          </dl>
        );
      case "encounterMeta":
        return (
          <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.sections.status")}</dt>
              <dd style={{ margin: "2px 0 0" }}>{val(enc?.status ?? null, notDocumented)}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.sections.openedAt")}</dt>
              <dd style={{ margin: "2px 0 0" }}>
                {enc?.createdAt
                  ? new Date(enc.createdAt).toLocaleString(productUiBcp47Tag(language))
                  : notDocumented}
              </dd>
            </div>
          </dl>
        );
      case "careTeam":
        return (
          <p style={{ margin: 0, fontSize: 13 }}>
            {val(enc?.dentistDisplay ?? null, notDocumented)}
          </p>
        );
      case "reasonForVisit":
        return (
          <p style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>
            {val(enc?.chiefComplaint ?? null, notDocumented)}
          </p>
        );
      case "alertsHistory": {
        const hr = data.historyReview;
        return (
          <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>
                {t("dentalCareD5a5.history.reviewTitle")}
              </dt>
              <dd style={{ margin: "2px 0 0" }}>
                {hr?.reviewed
                  ? t("dentalCareD5a5.history.reviewedYes")
                  : t("dentalCareD5a5.history.reviewedNo")}
                {hr?.reviewedAt
                  ? ` · ${new Date(hr.reviewedAt).toLocaleString(productUiBcp47Tag(language))}`
                  : ""}
              </dd>
            </div>
            {hr?.notes ? (
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>
                  {t("dentalCareD5a5.history.reviewNotes")}
                </dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{hr.notes}</dd>
              </div>
            ) : null}
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a5.history.longitudinalNote")}
            </p>
          </dl>
        );
      }
      case "dentalEvaluation": {
        const ev = data.dentalEvaluation as Record<string, unknown> | null | undefined;
        if (!ev || typeof ev !== "object") {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        const lines = Object.entries(ev)
          .filter(([k, v]) => k !== "certificationId" && v != null && String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
        if (lines.length === 0) {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {lines.slice(0, 24).map((line, i) => (
              <li key={i} style={{ whiteSpace: "pre-wrap" }}>
                {line}
              </li>
            ))}
          </ul>
        );
      }
      case "prescriptions":
        return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
      case "lifecycle":
        return (
          <p style={{ margin: 0, fontSize: 13 }}>
            {val(enc?.status ?? null, notDocumented)}
            {enc?.providerDocumentationStatus ? ` · ${enc.providerDocumentationStatus}` : ""}
          </p>
        );
      case "odontogramFindings": {
        const rows = data.odontogramFindings ?? [];
        if (rows.length === 0) {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {rows.map((f, i) => {
              const tooth = getCanonicalTooth(f.toothCode);
              const lbl = tooth ? formatToothDisplayLabel(tooth, "FDI") : f.toothCode;
              return (
                <li key={`${f.toothCode}-${i}`}>
                  #{lbl} — {t(`dentalCareD5a4.findings.${f.findingType}`)}
                  {f.surfaces?.length ? ` (${f.surfaces.join("+")})` : ""} ·{" "}
                  {t(`dentalCareD5a4.states.${f.clinicalState}`)}
                </li>
              );
            })}
          </ul>
        );
      }
      case "periodontalExam": {
        const pe = data.periodontalExam;
        if (!pe) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.periodontal.status")}</dt>
              <dd style={{ margin: "2px 0 0" }}>
                {t(`dentalCareD5a5.periodontal.statuses.${pe.periodontalStatus ?? "NOT_ASSESSED"}`)}
              </dd>
            </div>
            {pe.summary ? (
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.periodontal.summary")}</dt>
                <dd style={{ margin: "2px 0 0" }}>
                  {pe.summary.bleedingPercent != null
                    ? `${t("dentalCareD5a5.periodontal.bleedingPercent")}: ${pe.summary.bleedingPercent}%`
                    : notDocumented}
                  {pe.summary.deepestProbingDepthMm != null
                    ? ` · ${t("dentalCareD5a5.periodontal.deepestPd")}: ${pe.summary.deepestProbingDepthMm} mm`
                    : ""}
                </dd>
              </div>
            ) : null}
            {pe.narrativeAssessment ? (
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.periodontal.narrative")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{pe.narrativeAssessment}</dd>
              </div>
            ) : null}
          </dl>
        );
      }
      case "diagnoses": {
        const dx = data.diagnoses ?? [];
        if (dx.length === 0) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {dx.map((d, i) => (
              <li key={i}>
                {d.code ? `${d.code} — ` : ""}
                {d.description ?? notDocumented}
              </li>
            ))}
          </ul>
        );
      }
      case "imagingOrdersResults": {
        const orders = data.orders ?? [];
        if (orders.length === 0) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {orders.map((o, i) => (
              <li key={i}>
                {o.orderType ?? "—"} · {o.status ?? "—"}
                {o.displayName ? ` · ${o.displayName}` : ""}
              </li>
            ))}
          </ul>
        );
      }
      case "treatmentPlan": {
        const plan = data.treatmentPlan;
        const items = plan?.items ?? [];
        if (!plan && !data.freeTextTreatmentPlan) {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        return (
          <div style={{ fontSize: 13 }}>
            {plan?.proposedTreatmentSummary ? (
              <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{plan.proposedTreatmentSummary}</p>
            ) : null}
            {!plan?.proposedTreatmentSummary && data.freeTextTreatmentPlan ? (
              <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{data.freeTextTreatmentPlan}</p>
            ) : null}
            {items.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {items.map((item, i) => (
                  <li key={i}>
                    {item.proposedTreatment}
                    {item.toothCodes?.length ? ` (${item.toothCodes.join(", ")})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      }
      case "treatmentAcceptance": {
        const plan = data.treatmentPlan;
        if (!plan) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <dl style={{ margin: 0, display: "grid", gap: 6, fontSize: 13 }}>
            <div>
              <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.treatmentPlan.acceptanceOutcome")}</dt>
              <dd style={{ margin: "2px 0 0" }}>
                {t(`dentalCareD5a5.treatmentPlan.acceptance.${plan.acceptanceOutcome ?? "NOT_DISCUSSED"}`)}
              </dd>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("dentalCareD5a5.treatmentPlan.acceptanceNotConsent")}
            </p>
            {plan.expectedBenefits ? (
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.treatmentPlan.benefits")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{plan.expectedBenefits}</dd>
              </div>
            ) : null}
            {plan.materialRisks ? (
              <div>
                <dt style={{ fontWeight: 700, color: "#64748b", fontSize: 11 }}>{t("dentalCareD5a5.treatmentPlan.risks")}</dt>
                <dd style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{plan.materialRisks}</dd>
              </div>
            ) : null}
          </dl>
        );
      }
      case "documents": {
        const docs = data.documents ?? [];
        if (docs.length === 0) {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {docs.map((d, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {(d.title || d.type || d.category || "Document").trim()}
                {d.signatureStatus ? ` · ${d.signatureStatus}` : ""}
                {d.uploadedAt
                  ? ` · ${new Date(d.uploadedAt).toLocaleDateString(productUiBcp47Tag(language))}`
                  : ""}
                {d.signers?.[0]
                  ? ` · ${d.signers[0].signerName ?? ""} (${d.signers[0].signerType ?? ""})`
                  : ""}
              </li>
            ))}
          </ul>
        );
      }
      case "procedures": {
        const procs = data.procedures ?? [];
        if (procs.length === 0) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {procs.map((pr, i) => (
              <li key={i}>
                {pr.clinicalName}
                {pr.toothCodes?.length ? ` · ${pr.toothCodes.join(", ")}` : ""}
                {pr.performedAt
                  ? ` · ${new Date(pr.performedAt).toLocaleDateString(productUiBcp47Tag(language))}`
                  : ""}
              </li>
            ))}
          </ul>
        );
      }
      case "notes": {
        const notes = data.notes ?? [];
        const providerNote = (data.providerNote ?? "").trim();
        if (notes.length === 0 && !providerNote) {
          return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        }
        return (
          <div style={{ fontSize: 13 }}>
            {providerNote ? <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{providerNote}</p> : null}
            {notes.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {notes.map((n, i) => (
                  <li key={i} style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>
                    {n.noteType ? `[${n.noteType}] ` : ""}
                    {n.body ?? notDocumented}
                    {n.authorDisplay ? ` · ${n.authorDisplay}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      }
      case "followUp":
        return (
          <p style={{ margin: 0, fontSize: 13 }}>
            {enc?.followUpDate
              ? new Date(enc.followUpDate).toLocaleDateString(productUiBcp47Tag(language))
              : notDocumented}
          </p>
        );
      case "signatures":
        return (
          <p style={{ margin: 0, fontSize: 13 }}>
            {val(enc?.providerDocumentationStatus ?? null, notDocumented)}
            {enc?.providerDocumentationSignedAt
              ? ` · ${new Date(enc.providerDocumentationSignedAt).toLocaleString(productUiBcp47Tag(language))}`
              : ""}
          </p>
        );
      case "addenda": {
        const addenda = data.addenda ?? [];
        if (addenda.length === 0) return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
        return (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {addenda.map((a, i) => (
              <li key={i} style={{ whiteSpace: "pre-wrap" }}>{a.text ?? notDocumented}</li>
            ))}
          </ul>
        );
      }
      default:
        return <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{notDocumented}</p>;
    }
  };

  // MEDUI.D5A.5A — project all overview domains (empty → Non documenté).
  const visibleSections: D5a5OverviewSection[] = [...D5A5_OVERVIEW_SECTIONS];

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div
      data-testid="dental-clinical-overview"
      data-certification={D5A5_CERTIFICATION_ID}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a5.overview.title")}</h3>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  const res = await apiFetchResponse(
                    `/encounters/${encodeURIComponent(encounterId)}/chart-export?format=html&locale=fr`,
                    { facilityId }
                  );
                  const html = await res.text();
                  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank", "noopener,noreferrer");
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                } catch (e) {
                  setError(
                    normalizeUserFacingError(e instanceof Error ? e.message : null, resolveProductUiLanguageOrDefault(language))
                  );
                }
              })();
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("dentalCareD5a5.printRecord")}
          </button>
        </div>
        {locked ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.overview.readOnly")}</p>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
      </div>

      {visibleSections.map((section) => (
        <section key={section} style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>
            {t(`dentalCareD5a5.sections.${section}`)}
          </h4>
          {renderSection(section)}
        </section>
      ))}
    </div>
  );
}
