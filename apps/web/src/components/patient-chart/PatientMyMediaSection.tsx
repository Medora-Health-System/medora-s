"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";

type DocumentRow = {
  id: string;
  documentType: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string } | null;
};

const DOCUMENT_TYPES = [
  "INSURANCE_CARD_FRONT",
  "INSURANCE_CARD_BACK",
  "PATIENT_ID",
  "CONSENT_FORM",
  "REFERRAL_PAPER",
  "OTHER_REGISTRATION",
] as const;

const DOC_TYPE_I18N: Record<string, string> = {
  INSURANCE_CARD_FRONT: "myMedia.typeInsuranceCardFront",
  INSURANCE_CARD_BACK: "myMedia.typeInsuranceCardBack",
  PATIENT_ID: "myMedia.typePatientId",
  CONSENT_FORM: "myMedia.typeConsentForm",
  REFERRAL_PAPER: "myMedia.typeReferralPaper",
  OTHER_REGISTRATION: "myMedia.typeOtherRegistration",
};

export function PatientMyMediaSection({
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [docType, setDocType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch(`/patients/${patientId}/documents`, { facilityId });
      setDocs(Array.isArray(data) ? (data as DocumentRow[]) : []);
    } catch (e) {
      setLoadError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("myMedia.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, facilityId, language, t]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !docType) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentType", docType);
      if (notes.trim()) form.append("notes", notes.trim());

      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/patients/${patientId}/documents`,
        {
          method: "POST",
          body: form,
          headers: {
            "x-facility-id": facilityId,
          },
          credentials: "include",
        },
      );
      if (!resp.ok) throw new Error(await resp.text());
      setUploadSuccess(true);
      setDocType("");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      window.setTimeout(() => setUploadSuccess(false), 3500);
      await loadDocs();
    } catch (e) {
      setUploadError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("myMedia.uploadError"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm(t("myMedia.deleteConfirm"))) return;
    try {
      await apiFetch(`/patients/${patientId}/documents/${docId}`, {
        method: "DELETE",
        facilityId,
      });
      await loadDocs();
    } catch {
      alert(t("myMedia.deleteError"));
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

  return (
    <div>
      {canEdit && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: "#0f172a" }}>
            {t("myMedia.uploadHeading")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {t("myMedia.documentTypeLabel")}
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 13,
                  background: "#fff",
                }}
              >
                <option value="">{t("myMedia.documentTypePlaceholder")}</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {t(DOC_TYPE_I18N[dt])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {t("myMedia.fileLabel")}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {t("myMedia.notesLabel")}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("myMedia.notesPlaceholder")}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
          </div>
          {uploadError && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                background: "#ffebee",
                color: "#b71c1c",
                borderRadius: 4,
                fontSize: 13,
              }}
              role="alert"
            >
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                background: "#e8f5e9",
                color: "#1b5e20",
                borderRadius: 4,
                fontSize: 13,
              }}
              role="status"
            >
              {t("myMedia.uploadSuccess")}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={uploading || !docType || !fileRef.current?.files?.length}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              background: "#1a1a1a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor:
                uploading || !docType ? "not-allowed" : "pointer",
              opacity: uploading || !docType ? 0.65 : 1,
            }}
          >
            {uploading ? t("myMedia.uploading") : t("myMedia.upload")}
          </button>
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#0f172a" }}>
        {t("myMedia.listHeading")}
      </div>

      {loading && <div style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</div>}
      {loadError && (
        <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }} role="alert">
          {loadError}
        </div>
      )}
      {!loading && docs.length === 0 && (
        <div style={{ fontSize: 13, color: "#64748b" }}>{t("myMedia.emptyList")}</div>
      )}
      {!loading && docs.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("myMedia.colType")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("myMedia.colFileName")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("myMedia.colUploadedBy")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("myMedia.colUploadedAt")}</th>
              <th style={{ padding: "6px 8px", fontWeight: 600 }}>{t("myMedia.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px" }}>
                  {t(DOC_TYPE_I18N[d.documentType] || d.documentType)}
                </td>
                <td style={{ padding: "6px 8px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.fileName}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {d.uploadedBy
                    ? `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`
                    : "—"}
                </td>
                <td style={{ padding: "6px 8px" }}>{formatDate(d.createdAt)}</td>
                <td style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ""}/patients/documents/${d.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#1565c0", fontSize: 12, fontWeight: 600 }}
                  >
                    {t("myMedia.download")}
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(d.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#b91c1c",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
