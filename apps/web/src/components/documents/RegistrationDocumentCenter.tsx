"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { RegistrationPacketWizard } from "./RegistrationPacketWizard";

const API_BASE = "/api/backend";

type DocumentRow = {
  id: string;
  category: string;
  type: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  source: string | null;
  notes: string | null;
  signatureStatus: string | null;
  lockedAt: string | null;
  uploadedAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string } | null;
};

const DOC_TYPE_I18N: Record<string, string> = {
  INSURANCE_CARD_FRONT: "documentCenter.typeInsuranceCardFront",
  INSURANCE_CARD_BACK: "documentCenter.typeInsuranceCardBack",
  PATIENT_ID_FRONT: "documentCenter.typePatientIdFront",
  PATIENT_ID_BACK: "documentCenter.typePatientIdBack",
  CONSENT_FORM: "documentCenter.typeConsentForm",
  REFERRAL: "documentCenter.typeReferral",
  OTHER_REGISTRATION_DOCUMENT: "documentCenter.typeOtherRegistration",
  REGISTRATION_PACKET: "documentCenter.typeRegistrationPacket",
};

const PACKET_TEMPLATES = [
  "FREESTANDING_ER",
  "URGENT_CARE",
  "CLINIC",
  "HOSPITAL",
] as const;

const FREESTANDING_ER_SECTIONS = [
  "packetSectionAob",
  "packetSectionCoordination",
  "packetSectionDemographics",
  "packetSectionDisclosure",
  "packetSectionConsent",
  "packetSectionPrivacy",
  "packetSectionBillOfRights",
  "packetSectionMedicareMedicaidNotice",
] as const;

const STANDARD_PACKET_SECTIONS = [
  "packetSectionDemographics",
  "packetSectionDisclosure",
  "packetSectionConsent",
  "packetSectionPrivacy",
  "packetSectionBillOfRights",
] as const;

export function RegistrationDocumentCenter({
  patientId,
  facilityId,
  canEdit,
}: {
  patientId: string;
  facilityId: string;
  canEdit: boolean;
}) {
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);

  const insuranceFrontRef = useRef<HTMLInputElement>(null);
  const insuranceBackRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const otherFileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [otherTitle, setOtherTitle] = useState("");
  const [otherNotes, setOtherNotes] = useState("");

  const [packetPreview, setPacketPreview] = useState<string | null>(null);
  const [activeWizard, setActiveWizard] = useState<string | null>(null);

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [missingDocs, setMissingDocs] = useState<Set<string>>(new Set());

  const handleDownload = async (docId: string, fileName: string) => {
    setDownloadError(null);
    try {
      const resp = await fetch(
        `${API_BASE}/documents/${docId}/download`,
        { headers: { "x-facility-id": facilityId }, credentials: "include" },
      );
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        let msg = "";
        try {
          const j = JSON.parse(errText);
          if (j?.message) msg = typeof j.message === "string" ? j.message : "";
        } catch { /* ignore */ }
        if (resp.status === 404) {
          setMissingDocs((prev) => new Set(prev).add(docId));
        }
        setDownloadError(msg || t("documentCenter.downloadUnavailable"));
        return;
      }
      setMissingDocs((prev) => { const next = new Set(prev); next.delete(docId); return next; });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t("documentCenter.downloadUnavailable"));
    }
  };

  const getStorageLabel = (docId: string): { label: string; color: string } | null => {
    if (missingDocs.has(docId)) {
      return { label: t("documentCenter.storageMissing"), color: "#e65100" };
    }
    return null;
  };

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const resp = await fetch(
        `${API_BASE}/documents?patientId=${patientId}&category=REGISTRATION`,
        { headers: { "x-facility-id": facilityId }, credentials: "include" },
      );
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setDocs(Array.isArray(data) ? (data as DocumentRow[]) : []);
    } catch {
      setLoadError(t("documentCenter.loadError"));
    } finally {
      setLoading(false);
    }
  }, [patientId, facilityId, t]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const uploadFile = async (
    ref: React.RefObject<HTMLInputElement | null>,
    type: string,
    title?: string,
    notes?: string,
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    setUploading(type);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "REGISTRATION");
      form.append("type", type);
      form.append("patientId", patientId);
      if (title?.trim()) form.append("title", title.trim());
      if (notes?.trim()) form.append("notes", notes.trim());

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
      setUploadSuccess(type);
      if (ref.current) ref.current.value = "";
      if (type === "OTHER_REGISTRATION_DOCUMENT") {
        setOtherTitle("");
        setOtherNotes("");
      }
      window.setTimeout(() => setUploadSuccess(null), 3500);
      await loadDocs();
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "";
      setUploadError(detail ? `${t("documentCenter.uploadError")} — ${detail}` : t("documentCenter.uploadError"));
      if (process.env.NODE_ENV !== "production") {
        console.error("[DocumentCenter] upload failed:", detail);
      }
    } finally {
      setUploading(null);
    }
  };

  const handleArchive = async (docId: string) => {
    if (!window.confirm(t("documentCenter.archiveConfirm"))) return;
    try {
      const resp = await fetch(
        `${API_BASE}/documents/${docId}`,
        {
          method: "DELETE",
          headers: { "x-facility-id": facilityId },
          credentials: "include",
        },
      );
      if (!resp.ok) throw new Error();
      await loadDocs();
    } catch {
      alert(t("documentCenter.archiveError"));
    }
  };

  const handleOpenWizard = (template: string) => {
    setActiveWizard(template);
  };

  const handleWizardComplete = () => {
    setActiveWizard(null);
    setUploadSuccess("REGISTRATION_PACKET");
    window.setTimeout(() => setUploadSuccess(null), 3500);
    void loadDocs();
  };

  const handlePreview = (template: string) => {
    setPacketPreview(packetPreview === template ? null : template);
  };

  const getPacketStatus = (doc: DocumentRow): string => {
    if (doc.lockedAt && doc.signatureStatus === "SIGNED") return t("esignature.statusSignedLocked");
    if (doc.lockedAt && doc.signatureStatus === "REFUSED") return t("esignature.statusRefused");
    if (doc.signatureStatus === "COMPLETED") return t("esignature.statusCompleted");
    if (doc.signatureStatus === "PATIENT_SIGNED") return t("esignature.statusNeedsStaff");
    if (doc.signatureStatus === "STAFF_SIGNED") return t("esignature.statusNeedsPatient");
    if (doc.signatureStatus === "IN_PROGRESS") return t("documentCenter.packetStatusInProgress");
    if (doc.signatureStatus === "UNSIGNED") return t("esignature.statusUnsigned");
    // Legacy fallback
    try {
      const meta = JSON.parse(doc.notes || "{}");
      if (meta.completedAt) {
        if (meta.signatures?.refusalReason) return t("documentCenter.packetStatusRefused");
        return t("documentCenter.packetStatusSigned");
      }
      return t("documentCenter.packetStatusInProgress");
    } catch {
      return t("documentCenter.packetGenerated");
    }
  };

  const getPacketStatusColor = (doc: DocumentRow): string => {
    if (doc.lockedAt && doc.signatureStatus === "SIGNED") return "#1b5e20";
    if (doc.lockedAt && doc.signatureStatus === "REFUSED") return "#e65100";
    if (doc.signatureStatus === "COMPLETED") return "#1b5e20";
    if (doc.signatureStatus === "PATIENT_SIGNED" || doc.signatureStatus === "STAFF_SIGNED") return "#0277bd";
    if (doc.signatureStatus === "UNSIGNED") return "#64748b";
    // Legacy fallback
    try {
      const meta = JSON.parse(doc.notes || "{}");
      if (meta.completedAt) {
        if (meta.signatures?.refusalReason) return "#e65100";
        return "#1b5e20";
      }
      return "#0277bd";
    } catch {
      return "#64748b";
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const uploadSlot = (
    label: string,
    ref: React.RefObject<HTMLInputElement | null>,
    type: string,
    existingDoc?: DocumentRow,
  ) => (
    <div
      style={{
        padding: "10px 14px",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        background: existingDoc ? "#f0fdf4" : "#fff",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{label}</div>
        {existingDoc && (
          <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
            ✓ {existingDoc.fileName} — {formatDate(existingDoc.uploadedAt)}
          </div>
        )}
      </div>
      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            ref={ref}
            type="file"
            accept="image/*,.pdf"
            style={{ fontSize: 12, maxWidth: 160 }}
          />
          <button
            type="button"
            onClick={() => void uploadFile(ref, type)}
            disabled={uploading === type}
            style={{
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              borderRadius: 5,
              background: "#1a1a1a",
              color: "#fff",
              cursor: uploading === type ? "not-allowed" : "pointer",
              opacity: uploading === type ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {uploading === type ? t("documentCenter.uploading") : t("documentCenter.upload")}
          </button>
        </div>
      )}
      {uploadSuccess === type && (
        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓</span>
      )}
    </div>
  );

  const insuranceFrontDoc = docs.find((d) => d.type === "INSURANCE_CARD_FRONT");
  const insuranceBackDoc = docs.find((d) => d.type === "INSURANCE_CARD_BACK");
  const idFrontDoc = docs.find((d) => d.type === "PATIENT_ID_FRONT");
  const idBackDoc = docs.find((d) => d.type === "PATIENT_ID_BACK");
  const packets = docs.filter((d) => d.type === "REGISTRATION_PACKET");
  const otherDocs = docs.filter(
    (d) =>
      !["INSURANCE_CARD_FRONT", "INSURANCE_CARD_BACK", "PATIENT_ID_FRONT", "PATIENT_ID_BACK", "REGISTRATION_PACKET"].includes(d.type),
  );

  return (
    <div>
      {uploadError && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#ffebee", color: "#b71c1c", borderRadius: 6, fontSize: 13 }} role="alert">
          {uploadError}
        </div>
      )}
      {downloadError && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fff3e0", color: "#e65100", borderRadius: 6, fontSize: 13 }} role="alert">
          {downloadError}
          <button type="button" onClick={() => setDownloadError(null)} style={{ marginLeft: 12, fontSize: 12, border: "none", background: "transparent", color: "#e65100", fontWeight: 700, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── Insurance Card Section ─────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>
          {t("documentCenter.sectionInsuranceCard")}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {uploadSlot(t("documentCenter.slotFront"), insuranceFrontRef, "INSURANCE_CARD_FRONT", insuranceFrontDoc)}
          {uploadSlot(t("documentCenter.slotBack"), insuranceBackRef, "INSURANCE_CARD_BACK", insuranceBackDoc)}
        </div>
      </div>

      {/* ── ID Card Section ────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>
          {t("documentCenter.sectionIdCard")}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {uploadSlot(t("documentCenter.slotFront"), idFrontRef, "PATIENT_ID_FRONT", idFrontDoc)}
          {uploadSlot(t("documentCenter.slotBack"), idBackRef, "PATIENT_ID_BACK", idBackDoc)}
        </div>
      </div>

      {/* ── Storage Guidance ───────────────────────────────── */}
      <div style={{ marginBottom: 16, padding: "8px 12px", background: "#fffde7", borderRadius: 6, border: "1px solid #fff9c4", fontSize: 12, color: "#6d4c00" }}>
        {t("documentCenter.storageGuidance")}
      </div>

      {/* ── Electronic Registration Packets ────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#0f172a" }}>
          {t("documentCenter.sectionPackets")}
        </div>
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#475569" }}>
          {t("documentCenter.packetsIntro")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {PACKET_TEMPLATES.map((tmpl) => {
            const key = `packetTemplate${tmpl.charAt(0)}${tmpl.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`;
            const label = t(`documentCenter.${key}`);
            const existing = packets.find((d) => d.notes?.includes(tmpl));
            const sections =
              tmpl === "FREESTANDING_ER" ? FREESTANDING_ER_SECTIONS : STANDARD_PACKET_SECTIONS;

            return (
              <div
                key={tmpl}
                style={{
                  padding: 12,
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: existing ? "#f0fdf4" : "#fafafa",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: "#0f172a" }}>{label}</div>
                {existing && (
                  <div style={{ fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, color: getPacketStatusColor(existing) }}>{getPacketStatus(existing)}</span>
                    <span style={{ color: "#64748b" }}>— {formatDate(existing.uploadedAt)}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenWizard(tmpl)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {existing ? t("documentCenter.newPacketVersion") : t("documentCenter.generatePacket")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePreview(tmpl)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      background: packetPreview === tmpl ? "#e3f2fd" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {t("documentCenter.previewPacket")}
                  </button>
                  {existing && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleDownload(existing.id, existing.fileName)}
                        style={{ padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "#1565c0", background: "none", border: "none", cursor: "pointer" }}
                      >
                        {t("documentCenter.printPacket")}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => void handleArchive(existing.id)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            border: "none",
                            borderRadius: 4,
                            background: "transparent",
                            color: "#b91c1c",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
                {packetPreview === tmpl && (
                  <div style={{ marginTop: 8, padding: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("documentCenter.packetSections")}:</div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {sections.map((s) => (
                        <li key={s} style={{ marginBottom: 2 }}>{t(`documentCenter.${s}`)}</li>
                      ))}
                    </ul>
                    {tmpl === "FREESTANDING_ER" && (
                      <div style={{ marginTop: 6, padding: "4px 8px", background: "#fff3e0", borderRadius: 4, fontSize: 11, color: "#e65100" }}>
                        ⚠ {t("documentCenter.packetMedicareMedicaidWarning")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Other Document Upload ──────────────────────────── */}
      {canEdit && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fafafa" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#0f172a" }}>
            {t("documentCenter.sectionOtherUpload")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
                {t("documentCenter.otherTitleLabel")}
              </label>
              <input
                type="text"
                value={otherTitle}
                onChange={(e) => setOtherTitle(e.target.value)}
                placeholder={t("documentCenter.otherTitlePlaceholder")}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
                {t("documentCenter.fileLabel")}
              </label>
              <input ref={otherFileRef} type="file" accept="image/*,.pdf,.doc,.docx" style={{ fontSize: 12 }} />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
              {t("documentCenter.notesLabel")}
            </label>
            <input
              type="text"
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              placeholder={t("documentCenter.notesPlaceholder")}
              style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              void uploadFile(otherFileRef, "OTHER_REGISTRATION_DOCUMENT", otherTitle, otherNotes)
            }
            disabled={uploading === "OTHER_REGISTRATION_DOCUMENT" || !otherTitle.trim()}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              background: "#1a1a1a",
              color: "#fff",
              cursor: !otherTitle.trim() ? "not-allowed" : "pointer",
              opacity: !otherTitle.trim() ? 0.6 : 1,
            }}
          >
            {uploading === "OTHER_REGISTRATION_DOCUMENT" ? t("documentCenter.uploading") : t("documentCenter.upload")}
          </button>
        </div>
      )}

      {/* ── Documents Table ────────────────────────────────── */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>
        {t("documentCenter.listHeading")}
      </div>

      {loading && <div style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</div>}
      {loadError && (
        <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }} role="alert">{loadError}</div>
      )}
      {!loading && docs.length === 0 && (
        <div style={{ fontSize: 13, color: "#64748b" }}>{t("documentCenter.emptyList")}</div>
      )}
      {!loading && docs.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("documentCenter.colType")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("documentCenter.colFileName")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("documentCenter.colUploadedBy")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("documentCenter.colUploadedAt")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("documentCenter.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px" }}>
                  {d.source === "SYSTEM" && (
                    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#6a1b9a", background: "#f3e5f5", padding: "1px 5px", borderRadius: 3, marginRight: 4 }}>
                      {t("documentCenter.badgeGenerated")}
                    </span>
                  )}
                  {t(DOC_TYPE_I18N[d.type] || d.type)}
                </td>
                <td style={{ padding: "6px 8px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.title || d.fileName}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {d.uploadedBy ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}` : "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>{formatDate(d.uploadedAt)}</td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {(() => {
                      const status = getStorageLabel(d.id);
                      if (status) return (
                        <span style={{ fontSize: 10, fontWeight: 600, color: status.color, whiteSpace: "nowrap" }}>
                          {status.label}
                        </span>
                      );
                      return null;
                    })()}
                    <button
                      type="button"
                      onClick={() => void handleDownload(d.id, d.fileName)}
                      style={{ background: "transparent", border: "none", color: missingDocs.has(d.id) ? "#9e9e9e" : "#1565c0", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
                    >
                      {t("documentCenter.download")}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void handleArchive(d.id)}
                        style={{ background: "transparent", border: "none", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeWizard && (
        <RegistrationPacketWizard
          patientId={patientId}
          facilityId={facilityId}
          template={activeWizard}
          onClose={() => setActiveWizard(null)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}
