"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { SignatureCapturePad } from "./SignatureCapturePad";
import { SignatureVectorRenderer } from "./SignatureVectorRenderer";
import { type SignatureValue } from "./signatureVectorModel";
import {
  listAvailableHardwareSignatureAdapters,
  type ExternalSignatureDeviceAdapter,
} from "./externalSignatureAdapters";

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

type SectionStatus = "not_started" | "reviewed" | "signed";

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
  const { facilities } = useFacilityAndRoles();
  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name?.trim() || facilityId;

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
  const [patientSigData, setPatientSigData] = useState<SignatureValue | null>(null);
  const [staffSigData, setStaffSigData] = useState<SignatureValue | null>(null);
  const [patientAttestation, setPatientAttestation] = useState(false);
  const [staffAttestation, setStaffAttestation] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [returnDevice, setReturnDevice] = useState(false);
  const [hardwareAdapters, setHardwareAdapters] = useState<ExternalSignatureDeviceAdapter[]>([]);
  const [hardwareError, setHardwareError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setHardwareAdapters(await listAvailableHardwareSignatureAdapters());
      } catch {
        setHardwareAdapters([]);
      }
    })();
  }, []);

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
  const patientSigValid = isRefused ? !!refusalReason.trim() : (!!signerName.trim() && !!patientSigData && patientAttestation);
  const staffSigValid = !!staffName.trim() && !!staffSigData && staffAttestation;
  const canFinalize = allReviewed && patientSigValid && staffSigValid;

  const packetSubtypeLabel = useCallback(
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
      const statusLabel = isRefused ? t("packetWizard.refused") : t("packetWizard.signed");
      const documentTitle = `${facilityName} ${t("packetWizard.registrationPackage")} — ${statusLabel}`;

      const structuredModel = {
        packetType: template,
        packetVersion: "1.0",
        locale: language || "fr",
        facility: { id: facilityId, name: facilityName },
        patient: patient ? { ...patient, id: patientId } : { id: patientId },
        encounter: null,
        insurance: insurance.map((ins) => ({
          rank: ins.rank,
          payerName: ins.payer?.name || ins.payerNameFreeText || null,
          memberId: ins.memberId || null,
          groupNumber: ins.groupNumber || null,
        })),
        sections: sectionKeys.map((key) => ({
          id: key,
          title: t(SECTION_I18N[key] || key),
          body: getSectionText(key, patient, insurance, t),
          reviewed: sectionStatus[key] === "reviewed",
          reviewedAt: sectionStatus[key] === "reviewed" ? now : null,
          reviewedBy: null,
          required: true,
        })),
        signatures: [
          {
            signerType: isRefused ? "PATIENT" : (signerRelationship === "self" ? "PATIENT" : "REPRESENTATIVE"),
            signerName: isRefused ? (signerName.trim() || "Patient") : signerName.trim(),
            relationship: signerRelationship,
            signedAt: now,
            attestation: t("esignature.patientAttestation"),
            refusalReason: isRefused ? refusalReason.trim() : undefined,
            patientStrokes: isRefused ? undefined : patientSigData,
          },
          {
            signerType: "STAFF",
            signerName: staffName.trim(),
            relationship: "witness",
            signedAt: now,
            attestation: t("esignature.staffAttestation"),
            staffStrokes: staffSigData,
          },
        ],
        attestations: [
          t("esignature.patientAttestation"),
          t("esignature.staffAttestation"),
        ],
        generatedAt: now,
        finalizedAt: null,
      };

      const resp = await fetch(
        `${API_BASE}/documents/registration-packets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-facility-id": facilityId,
          },
          credentials: "include",
          body: JSON.stringify({
            patientId,
            title: documentTitle,
            structuredModel,
          }),
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
      const result = await resp.json() as { documentId: string };
      const documentId = result.documentId;

      await apiFetch(`/documents/${documentId}/signatures`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({
          signerType: isRefused ? "PATIENT" : (signerRelationship === "self" ? "PATIENT" : "REPRESENTATIVE"),
          signerName: isRefused ? signerName.trim() || "Patient" : signerName.trim(),
          relationship: signerRelationship,
          signatureData: isRefused ? null : patientSigData,
          attestation: t("esignature.patientAttestation"),
          refusalReason: isRefused ? refusalReason.trim() : undefined,
        }),
      });

      await apiFetch(`/documents/${documentId}/signatures`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({
          signerType: "STAFF",
          signerName: staffName.trim(),
          signerRole: "WITNESS",
          signatureData: staffSigData,
          attestation: t("esignature.staffAttestation"),
        }),
      });

      await apiFetch(`/documents/${documentId}/finalize-packet`, {
        method: "POST",
        facilityId,
      });

      setReturnDevice(true);
      window.setTimeout(onComplete, 800);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "";
      setSaveError(
        detail
          ? t("packetWizard.saveErrorWithMessage").replace("{message}", detail)
          : t("packetWizard.saveError"),
      );
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
        {/* Header — facility name + Registration Package centered; subtype as small subtitle */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{facilityName}</h2>
            <div style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {t("packetWizard.registrationPackage")}
            </div>
            <div style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 500, color: "#64748b" }}>
              {packetSubtypeLabel(template)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              {t("packetWizard.progress")}: {reviewedCount}/{sectionKeys.length} {t("packetWizard.sectionsReviewed")}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b", flexShrink: 0 }} aria-label={t("packetWizard.cancel")}>✕</button>
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
              <input type="checkbox" checked={isRefused} onChange={(e) => setIsRefused(e.target.checked)} disabled={!allReviewed} />
              {t("packetWizard.unableRefused")}
            </label>
          </div>

          {/* Patient/Rep signature */}
          {!isRefused ? (
            <div style={{ marginBottom: 12 }}>
              {hardwareAdapters.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>{t("esignature.useTouchScreen")}</span>
                  {hardwareAdapters.map((adapter) => (
                    <button
                      key={adapter.id}
                      type="button"
                      disabled={!allReviewed}
                      onClick={() => {
                        void (async () => {
                          setHardwareError(null);
                          try {
                            await adapter.connect();
                            const captured = await adapter.capture();
                            setPatientSigData(captured);
                          } catch {
                            setHardwareError(t("esignature.useConnectedPad"));
                          } finally {
                            try {
                              await adapter.disconnect();
                            } catch { /* ignore */ }
                          }
                        })();
                      }}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: allReviewed ? "pointer" : "not-allowed",
                      }}
                    >
                      {t(adapter.labelKey)}
                    </button>
                  ))}
                </div>
              )}
              {hardwareError && (
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#b91c1c" }}>{hardwareError}</p>
              )}
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
              <SignatureCapturePad
                value={patientSigData}
                onChange={setPatientSigData}
                disabled={!allReviewed}
                label={t("esignature.patientSignatureLabel")}
              />
              {patientSigData && <SignatureVectorRenderer value={patientSigData} signerName={signerName} relationship={signerRelationship} />}
              {patientSigData && <p style={{ margin: "4px 0", fontSize: 11, color: "#15803d" }}>{t("esignature.captured")}</p>}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6, fontSize: 12, color: "#334155", cursor: "pointer" }}>
                <input type="checkbox" checked={patientAttestation} onChange={(e) => setPatientAttestation(e.target.checked)} disabled={!allReviewed} style={{ marginTop: 2 }} />
                <span>{t("esignature.patientAttestation")}</span>
              </label>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
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

          {/* Staff/Witness signature */}
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
          <SignatureCapturePad
            value={staffSigData}
            onChange={setStaffSigData}
            disabled={!allReviewed}
            label={t("esignature.staffSignatureLabel")}
          />
          {staffSigData && <SignatureVectorRenderer value={staffSigData} signerName={staffName} relationship="witness" />}
          {staffSigData && <p style={{ margin: "4px 0", fontSize: 11, color: "#15803d" }}>{t("esignature.captured")}</p>}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6, fontSize: 12, color: "#334155", cursor: "pointer" }}>
            <input type="checkbox" checked={staffAttestation} onChange={(e) => setStaffAttestation(e.target.checked)} disabled={!allReviewed} style={{ marginTop: 2 }} />
            <span>{t("esignature.staffAttestation")}</span>
          </label>

          {saveError && (
            <div style={{ marginBottom: 8, padding: "6px 10px", background: "#ffebee", color: "#b71c1c", borderRadius: 4, fontSize: 12 }} role="alert">
              {saveError}
            </div>
          )}
          {returnDevice && <div style={{ marginBottom: 8, fontSize: 12, color: "#15803d" }}>{t("esignature.returnDevice")}</div>}

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

/* ── section text helper ─────────────────────────────── */

function getSectionText(
  key: string,
  patient: PatientData | null,
  insurance: InsuranceRow[],
  t: (key: string) => string,
): string {
  const priIns = insurance.find((r) => r.rank === "PRIMARY");
  const secIns = insurance.find((r) => r.rank === "SECONDARY");

  switch (key) {
    case "demographics":
      return [
        `${t("packetWizard.fieldName")}: ${patient?.firstName || ""} ${patient?.lastName || ""}`,
        `${t("packetWizard.fieldDob")}: ${patient?.dob || "—"}`,
        `${t("packetWizard.fieldPhone")}: ${patient?.phone || "—"}`,
        `${t("packetWizard.fieldAddress")}: ${[patient?.addressLine1, patient?.city, patient?.stateProvince, patient?.postalCode].filter(Boolean).join(", ") || "—"}`,
      ].join("\n");
    case "insurance":
      return [
        `${t("packetWizard.fieldPrimary")}: ${priIns?.payer?.name || priIns?.payerNameFreeText || "—"} ${priIns?.memberId ? `(${priIns.memberId})` : ""}`,
        `${t("packetWizard.fieldSecondary")}: ${secIns?.payer?.name || secIns?.payerNameFreeText || "—"} ${secIns?.memberId ? `(${secIns.memberId})` : ""}`,
      ].join("\n");
    case "medicareMedicaid":
      return t("documentCenter.packetMedicareMedicaidWarning");
    default:
      return t(`packetWizard.${key}Text`);
  }
}
