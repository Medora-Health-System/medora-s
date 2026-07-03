"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/backend";

/* ── types ──────────────────────────────────────────────── */

type PatientData = {
  firstName?: string;
  lastName?: string;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
};

type InsuranceRow = {
  rank: string;
  payerNameFreeText?: string | null;
  planName?: string | null;
  memberId?: string | null;
  groupNumber?: string | null;
  payer?: { name?: string | null } | null;
};

type SignatureData = {
  signerName: string;
  signerRelationship: string;
  signedAt: string;
  staffName?: string;
  staffSignedAt?: string;
  refusalReason?: string;
};

type SectionStatus = "not_started" | "reviewed" | "signed";

type PacketState = {
  template: string;
  sectionStatus: Record<string, SectionStatus>;
  signatures: SignatureData | null;
  completedAt: string | null;
};

/* ── section keys ───────────────────────────────────────── */

const FREESTANDING_ER_SECTION_KEYS = [
  "demographics",
  "insurance",
  "consent",
  "aob",
  "privacy",
  "rights",
  "facilityNotice",
  "medicareMedicaid",
] as const;

const STANDARD_SECTION_KEYS = [
  "demographics",
  "insurance",
  "consent",
  "aob",
  "privacy",
  "rights",
  "facilityNotice",
] as const;

const SECTION_I18N: Record<string, string> = {
  demographics: "packetWizard.sectionDemographics",
  insurance: "packetWizard.sectionInsurance",
  consent: "packetWizard.sectionConsent",
  aob: "packetWizard.sectionAob",
  privacy: "packetWizard.sectionPrivacy",
  rights: "packetWizard.sectionRights",
  facilityNotice: "packetWizard.sectionFacilityNotice",
  medicareMedicaid: "packetWizard.sectionMedicareMedicaid",
};

/* ── component ──────────────────────────────────────────── */

export function RegistrationPacketWizard({
  patientId,
  facilityId,
  template,
  onClose,
  onComplete,
}: {
  patientId: string;
  facilityId: string;
  template: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);

  const sectionKeys =
    template === "FREESTANDING_ER" ? FREESTANDING_ER_SECTION_KEYS : STANDARD_SECTION_KEYS;

  const initStatus: Record<string, SectionStatus> = {};
  for (const k of sectionKeys) initStatus[k] = "not_started";

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [insurance, setInsurance] = useState<InsuranceRow[]>([]);
  const [openSection, setOpenSection] = useState<string>(sectionKeys[0]);
  const [sectionStatus, setSectionStatus] = useState<Record<string, SectionStatus>>(initStatus);

  const [signerName, setSignerName] = useState("");
  const [signerRelationship, setSignerRelationship] = useState("self");
  const [staffName, setStaffName] = useState("");
  const [refusalReason, setRefusalReason] = useState("");
  const [isRefused, setIsRefused] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const p = await apiFetch(`/patients/${patientId}`, { facilityId });
        setPatient(p as PatientData);
      } catch { /* noop */ }
      try {
        const ins = await apiFetch(`/patients/${patientId}/insurance`, { facilityId });
        setInsurance(Array.isArray(ins) ? (ins as InsuranceRow[]) : []);
      } catch { /* noop */ }
    })();
  }, [patientId, facilityId]);

  const markReviewed = (key: string) => {
    setSectionStatus((prev) => ({ ...prev, [key]: "reviewed" }));
    const arr = sectionKeys as readonly string[];
    const idx = arr.indexOf(key);
    if (idx >= 0 && idx < arr.length - 1) setOpenSection(arr[idx + 1]);
  };

  const allReviewed = sectionKeys.every((k) => sectionStatus[k] === "reviewed");
  const canSign = allReviewed && (signerName.trim() || isRefused);
  const canFinalize = canSign && staffName.trim();

  const templateLabel = useCallback(
    (tmpl: string) => {
      const key = `documentCenter.packetTemplate${tmpl.charAt(0)}${tmpl.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`;
      return t(key);
    },
    [t],
  );

  const handleFinalize = async () => {
    if (!canFinalize) return;
    setSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      const signatures: SignatureData = {
        signerName: isRefused ? "" : signerName.trim(),
        signerRelationship: isRefused ? "refused" : signerRelationship,
        signedAt: now,
        staffName: staffName.trim(),
        staffSignedAt: now,
        refusalReason: isRefused ? refusalReason.trim() : undefined,
      };

      const packetContent = buildPacketHtml(
        template,
        templateLabel(template),
        patient,
        insurance,
        sectionKeys,
        signatures,
        t,
        dateLocale,
      );

      const blob = new Blob([packetContent], { type: "text/html" });
      const packetMeta: PacketState = {
        template,
        sectionStatus,
        signatures,
        completedAt: now,
      };

      const form = new FormData();
      form.append("file", blob, `${template.toLowerCase()}_signed_packet.html`);
      form.append("category", "REGISTRATION");
      form.append("type", "REGISTRATION_PACKET");
      form.append("patientId", patientId);
      form.append("title", `${templateLabel(template)} — ${isRefused ? t("packetWizard.refused") : t("packetWizard.signed")}`);
      form.append("source", "SYSTEM");
      form.append("notes", JSON.stringify(packetMeta));

      const resp = await fetch(
        `${API_BASE}/documents/upload`,
        {
          method: "POST",
          body: form,
          headers: { "x-facility-id": facilityId },
          credentials: "include",
        },
      );
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        let msg = `${resp.status}`;
        try {
          const j = JSON.parse(errText);
          if (j?.message) msg = typeof j.message === "string" ? j.message : JSON.stringify(j.message);
        } catch { if (errText) msg = errText.slice(0, 200); }
        throw new Error(msg);
      }
      onComplete();
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "";
      setSaveError(detail ? `${t("packetWizard.saveError")} — ${detail}` : t("packetWizard.saveError"));
      if (process.env.NODE_ENV !== "production") {
        console.error("[PacketWizard] finalize failed:", detail);
      }
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s: SectionStatus) => {
    const colors: Record<SectionStatus, { bg: string; fg: string; label: string }> = {
      not_started: { bg: "#f1f5f9", fg: "#64748b", label: t("packetWizard.statusNotStarted") },
      reviewed: { bg: "#e8f5e9", fg: "#1b5e20", label: t("packetWizard.statusReviewed") },
      signed: { bg: "#e3f2fd", fg: "#0d47a1", label: t("packetWizard.statusSigned") },
    };
    const c = colors[s];
    return (
      <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.fg, padding: "2px 6px", borderRadius: 3 }}>
        {c.label}
      </span>
    );
  };

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(dateLocale) : "—";

  const priIns = insurance.find((r) => r.rank === "PRIMARY");
  const secIns = insurance.find((r) => r.rank === "SECONDARY");

  const sectionContent = (key: string) => {
    switch (key) {
      case "demographics":
        return (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <div><strong>{t("packetWizard.fieldName")}:</strong> {patient?.firstName} {patient?.lastName}</div>
            <div><strong>{t("packetWizard.fieldDob")}:</strong> {formatDate(patient?.dob)}</div>
            <div><strong>{t("packetWizard.fieldPhone")}:</strong> {patient?.phone || "—"}</div>
            <div><strong>{t("packetWizard.fieldEmail")}:</strong> {patient?.email || "—"}</div>
            <div><strong>{t("packetWizard.fieldAddress")}:</strong> {[patient?.addressLine1, patient?.city, patient?.stateProvince, patient?.postalCode].filter(Boolean).join(", ") || "—"}</div>
          </div>
        );
      case "insurance":
        return (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            <div><strong>{t("packetWizard.fieldPrimary")}:</strong> {priIns?.payer?.name || priIns?.payerNameFreeText || "—"} {priIns?.memberId ? `· ${priIns.memberId}` : ""}</div>
            <div><strong>{t("packetWizard.fieldSecondary")}:</strong> {secIns?.payer?.name || secIns?.payerNameFreeText || "—"} {secIns?.memberId ? `· ${secIns.memberId}` : ""}</div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#475569" }}>{t("packetWizard.insuranceAcknowledge")}</p>
          </div>
        );
      case "consent":
        return <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{t("packetWizard.consentText")}</p>;
      case "aob":
        return <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{t("packetWizard.aobText")}</p>;
      case "privacy":
        return <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{t("packetWizard.privacyText")}</p>;
      case "rights":
        return <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{t("packetWizard.rightsText")}</p>;
      case "facilityNotice":
        return <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>{t("packetWizard.facilityNoticeText")}</p>;
      case "medicareMedicaid":
        return (
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
            <div style={{ padding: "6px 10px", background: "#fff3e0", borderRadius: 4, marginBottom: 6, color: "#e65100", fontSize: 12, fontWeight: 600 }}>
              {t("documentCenter.packetMedicareMedicaidWarning")}
            </div>
            <p>{t("packetWizard.medicareMedicaidText")}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const reviewedCount = sectionKeys.filter((k) => sectionStatus[k] === "reviewed").length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: "40px 16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          maxWidth: 720,
          width: "100%",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{templateLabel(template)}</h2>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {t("packetWizard.progress")}: {reviewedCount}/{sectionKeys.length} {t("packetWizard.sectionsReviewed")}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>

        {/* Accordion */}
        <div style={{ padding: "12px 20px", maxHeight: "50vh", overflowY: "auto" }}>
          {sectionKeys.map((key) => {
            const isOpen = openSection === key;
            return (
              <div key={key} style={{ marginBottom: 8, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? "" : key)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: isOpen ? "#f8fafc" : "#fff",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                    {t(SECTION_I18N[key])}
                  </span>
                  {statusBadge(sectionStatus[key])}
                </button>
                {isOpen && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid #f1f5f9" }}>
                    {sectionContent(key)}
                    {sectionStatus[key] !== "reviewed" && (
                      <button
                        type="button"
                        onClick={() => markReviewed(key)}
                        style={{
                          marginTop: 10,
                          padding: "6px 14px",
                          fontSize: 12,
                          fontWeight: 600,
                          border: "1px solid #16a34a",
                          borderRadius: 5,
                          background: "#f0fdf4",
                          color: "#16a34a",
                          cursor: "pointer",
                        }}
                      >
                        {t("packetWizard.markReviewed")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signature Section */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t("packetWizard.signatureHeading")}</h3>

          {!allReviewed && (
            <p style={{ fontSize: 12, color: "#b45309", marginBottom: 10 }}>{t("packetWizard.reviewAllFirst")}</p>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={isRefused} onChange={(e) => setIsRefused(e.target.checked)} />
              {t("packetWizard.unableRefused")}
            </label>
          </div>

          {!isRefused ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>{t("packetWizard.signerNameLabel")}</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder={t("packetWizard.signerNamePlaceholder")}
                  disabled={!allReviewed}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>{t("packetWizard.signerRelationshipLabel")}</label>
                <select
                  value={signerRelationship}
                  onChange={(e) => setSignerRelationship(e.target.value)}
                  disabled={!allReviewed}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
                >
                  <option value="self">{t("packetWizard.relationSelf")}</option>
                  <option value="parent">{t("packetWizard.relationParent")}</option>
                  <option value="guardian">{t("packetWizard.relationGuardian")}</option>
                  <option value="spouse">{t("packetWizard.relationSpouse")}</option>
                  <option value="poa">{t("packetWizard.relationPoa")}</option>
                  <option value="other">{t("packetWizard.relationOther")}</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>{t("packetWizard.refusalReasonLabel")}</label>
              <input
                type="text"
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder={t("packetWizard.refusalReasonPlaceholder")}
                disabled={!allReviewed}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
              />
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 3 }}>{t("packetWizard.staffNameLabel")}</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder={t("packetWizard.staffNamePlaceholder")}
              disabled={!allReviewed}
              style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
            />
          </div>

          {saveError && (
            <div style={{ marginBottom: 8, padding: "6px 10px", background: "#ffebee", color: "#b71c1c", borderRadius: 4, fontSize: 12 }} role="alert">
              {saveError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleFinalize()}
              disabled={!canFinalize || saving}
              style={{
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                background: canFinalize ? "#1b5e20" : "#94a3b8",
                color: "#fff",
                cursor: canFinalize ? "pointer" : "not-allowed",
              }}
            >
              {saving ? t("packetWizard.saving") : isRefused ? t("packetWizard.finalizeRefused") : t("packetWizard.finalizeSign")}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer" }}
            >
              {t("packetWizard.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── HTML builder ───────────────────────────────────────── */

function buildPacketHtml(
  template: string,
  templateLabel: string,
  patient: PatientData | null,
  insurance: InsuranceRow[],
  sectionKeys: readonly string[],
  signatures: SignatureData,
  t: (key: string) => string,
  dateLocale: string,
): string {
  const now = new Date();
  const date = now.toLocaleDateString(dateLocale);
  const time = now.toLocaleTimeString(dateLocale);
  const priIns = insurance.find((r) => r.rank === "PRIMARY");
  const secIns = insurance.find((r) => r.rank === "SECONDARY");

  const rows = sectionKeys.map((key) => {
    const label = t(SECTION_I18N[key] || key);
    let content = "";
    switch (key) {
      case "demographics":
        content = `${t("packetWizard.fieldName")}: ${patient?.firstName || ""} ${patient?.lastName || ""}<br/>` +
          `${t("packetWizard.fieldDob")}: ${patient?.dob ? new Date(patient.dob).toLocaleDateString(dateLocale) : "—"}<br/>` +
          `${t("packetWizard.fieldPhone")}: ${patient?.phone || "—"}<br/>` +
          `${t("packetWizard.fieldAddress")}: ${[patient?.addressLine1, patient?.city, patient?.stateProvince, patient?.postalCode].filter(Boolean).join(", ") || "—"}`;
        break;
      case "insurance":
        content = `${t("packetWizard.fieldPrimary")}: ${priIns?.payer?.name || priIns?.payerNameFreeText || "—"} ${priIns?.memberId ? `(${priIns.memberId})` : ""}<br/>` +
          `${t("packetWizard.fieldSecondary")}: ${secIns?.payer?.name || secIns?.payerNameFreeText || "—"} ${secIns?.memberId ? `(${secIns.memberId})` : ""}`;
        break;
      case "medicareMedicaid":
        content = t("documentCenter.packetMedicareMedicaidWarning");
        break;
      default:
        content = t(`packetWizard.${key}Text`);
    }
    return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;vertical-align:top;width:30%">${label}</td><td style="padding:8px;border:1px solid #ddd">${content}</td></tr>`;
  });

  const sigLine = signatures.refusalReason
    ? `<p><strong>${t("packetWizard.unableRefused")}:</strong> ${signatures.refusalReason}</p>`
    : `<p><strong>${t("packetWizard.signerNameLabel")}:</strong> ${signatures.signerName}<br/>
       <strong>${t("packetWizard.signerRelationshipLabel")}:</strong> ${signatures.signerRelationship}</p>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${templateLabel}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;padding:24px;max-width:700px;margin:0 auto}
h1{font-size:18px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:16px 0}
.sig{margin-top:24px;padding-top:16px;border-top:2px solid #333}</style></head><body>
<h1>${templateLabel}</h1>
<p>${date} ${time}</p>
<table>${rows.join("")}</table>
<div class="sig">
<h3>${t("packetWizard.signatureHeading")}</h3>
${sigLine}
<p><strong>${t("packetWizard.staffNameLabel")}:</strong> ${signatures.staffName || "—"}<br/>
<strong>${t("packetWizard.signedAtLabel")}:</strong> ${new Date(signatures.signedAt).toLocaleString(dateLocale)}</p>
</div></body></html>`;
}
