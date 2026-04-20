"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { patientUpdateDtoSchema } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_PATIENT_PROFILE_UPDATED, type MedoraPatientProfileUpdatedDetail } from "@/lib/chartEvents";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

type PatientRecord = {
  id: string;
  mrn?: string | null;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  nationalId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  language?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  adminNotes?: string | null;
};

function initialSexAtBirthForEdit(p: { sexAtBirth?: string | null; sex?: string | null }): string {
  if (p.sexAtBirth) return p.sexAtBirth;
  if (p.sex === "MALE") return "M";
  if (p.sex === "FEMALE") return "F";
  if (p.sex === "OTHER") return "X";
  if (p.sex === "UNKNOWN") return "U";
  return "";
}

function dobInputValue(dob: string | null | undefined): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 4,
  boxSizing: "border-box",
};

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { t, language } = useI18n();
  const { facilityId, roles, ready: rolesReady } = useFacilityAndRoles();

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [dob, setDob] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [languagePref, setLanguagePref] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const path = `/app/patients/${patientId}/profile`;
  const pathAllowed = rolesReady && isAppPathAllowedForRoles(path, roles);
  const apiAlignedRoles =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK"));
  const allowed = pathAllowed && apiAlignedRoles;

  const hydrateForm = useCallback((p: PatientRecord) => {
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setMiddleName(p.middleName ?? "");
    setDob(dobInputValue(p.dob ?? null));
    setSexAtBirth(initialSexAtBirthForEdit(p));
    setPhone(p.phone ?? "");
    setEmail(p.email ?? "");
    setNationalId(p.nationalId ?? "");
    setAddressLine1(p.addressLine1 ?? "");
    setAddressLine2(p.addressLine2 ?? "");
    setCity(p.city ?? "");
    setStateProvince(p.stateProvince ?? "");
    setPostalCode(p.postalCode ?? "");
    setCountry(p.country ?? "");
    setLanguagePref(p.language ?? "");
    setEmergencyContactName(p.emergencyContactName ?? "");
    setEmergencyContactRelationship(p.emergencyContactRelationship ?? "");
    setEmergencyContactPhone(p.emergencyContactPhone ?? "");
    setAdminNotes(p.adminNotes ?? "");
  }, []);

  const load = useCallback(async () => {
    if (!facilityId || !patientId || !allowed) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = (await apiFetch(`/patients/${patientId}`, { facilityId })) as PatientRecord;
      setPatient(data);
      hydrateForm(data);
    } catch (e) {
      setPatient(null);
      setLoadError(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("patientProfile.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [allowed, facilityId, patientId, hydrateForm, language, t]);

  useEffect(() => {
    if (!rolesReady) return;
    if (!allowed) return;
    void load();
  }, [rolesReady, allowed, load]);

  const canEdit = useMemo(
    () =>
      rolesReady &&
      (roles.includes("FRONT_DESK") ||
        roles.includes("RN") ||
        roles.includes("PROVIDER") ||
        roles.includes("ADMIN")),
    [roles, rolesReady]
  );

  const buildPayload = (): Record<string, unknown> => {
    const trim = (s: string) => s.trim();
    const empty = (s: string) => trim(s) === "";
    const ph = trim(phone);
    const em = trim(email);
    const nid = trim(nationalId);
    const ecPh = trim(emergencyContactPhone);

    const out: Record<string, unknown> = {
      firstName: trim(firstName),
      lastName: trim(lastName),
      middleName: empty(middleName) ? null : trim(middleName),
      sexAtBirth: sexAtBirth === "" ? null : sexAtBirth,
      phone: ph === "" ? null : ph,
      email: em === "" ? null : em,
      nationalId: nid === "" ? null : nid,
      addressLine1: empty(addressLine1) ? null : trim(addressLine1),
      addressLine2: empty(addressLine2) ? null : trim(addressLine2),
      city: empty(city) ? null : trim(city),
      stateProvince: empty(stateProvince) ? null : trim(stateProvince),
      postalCode: empty(postalCode) ? null : trim(postalCode),
      country: empty(country) ? null : trim(country),
      language: empty(languagePref) ? null : trim(languagePref),
      emergencyContactName: empty(emergencyContactName) ? null : trim(emergencyContactName),
      emergencyContactRelationship: empty(emergencyContactRelationship)
        ? null
        : trim(emergencyContactRelationship),
      emergencyContactPhone: ecPh === "" ? null : ecPh,
      adminNotes: empty(adminNotes) ? null : trim(adminNotes),
    };

    if (dob.trim()) {
      out.dob = new Date(dob.trim()).toISOString();
    }

    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !canEdit) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const raw = buildPayload();
    const parsed = patientUpdateDtoSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((er) => er.message).filter(Boolean).join(" · ");
      setSaveError(msg || t("patientProfile.validationError"));
      setSaving(false);
      return;
    }

    try {
      const updated = (await apiFetch(`/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        facilityId,
      })) as PatientRecord;

      setPatient(updated);
      hydrateForm(updated);
      setSaveSuccess(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<MedoraPatientProfileUpdatedDetail>(MEDORA_PATIENT_PROFILE_UPDATED, {
            detail: { patientId },
          })
        );
      }
    } catch (err) {
      setSaveError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) || t("patientProfile.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  if (rolesReady && !allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <p style={{ marginBottom: 12 }}>{t("patientProfile.accessDenied")}</p>
        <Link href={getLandingRouteForRoles(roles)}>{t("common.back")}</Link>
      </div>
    );
  }

  const shellCard: React.CSSProperties = {
    padding: "20px 22px",
    borderRadius: 12,
    border: MEDORA_CARD_SHELL.border,
    backgroundColor: MEDORA_CARD_SHELL.background,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 12px 40px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/app/patients/${patientId}`} style={{ color: "#1a1a1a", fontWeight: 600, fontSize: 14 }}>
          ← {t("patientProfile.backToChart")}
        </Link>
      </div>

      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700 }}>{t("patientProfile.pageTitle")}</h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.45 }}>{t("patientProfile.pageSubtitle")}</p>

      {loading && <div style={{ color: "#64748b" }}>{t("common.loading")}</div>}
      {loadError && (
        <div style={{ padding: 12, background: "#ffebee", color: "#b71c1c", borderRadius: 8, marginBottom: 12 }}>{loadError}</div>
      )}

      {!loading && !loadError && patient && (
        <form onSubmit={handleSubmit}>
          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientsListPage.sectionIdentity")}
            </div>
            {patient.mrn != null && patient.mrn !== "" && (
              <div style={{ marginBottom: 12, fontSize: 13, color: "#334155" }}>
                <span style={{ fontWeight: 600 }}>{t("patientProfile.mrnReadOnly")}:</span> {patient.mrn}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelFirstName")}</label>
                <input
                  required
                  disabled={!canEdit}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelLastName")}</label>
                <input
                  required
                  disabled={!canEdit}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientProfile.labelMiddleName")}</label>
              <input disabled={!canEdit} value={middleName} onChange={(e) => setMiddleName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelDob")}</label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientChartUi.editPatientSex")}</label>
                <select
                  disabled={!canEdit}
                  value={sexAtBirth}
                  onChange={(e) => setSexAtBirth(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">{t("patientChartUi.editPatientSexPh")}</option>
                  <option value="M">{t("patientChartUi.editPatientSexM")}</option>
                  <option value="F">{t("patientChartUi.editPatientSexF")}</option>
                  <option value="X">{t("patientChartUi.editPatientSexX")}</option>
                  <option value="U">{t("patientChartUi.editPatientSexU")}</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientsListPage.sectionContact")}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelPhone")}</label>
              <input type="tel" disabled={!canEdit} value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelEmail")}</label>
              <input type="email" disabled={!canEdit} value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientProfile.labelPreferredLanguage")}</label>
              <input disabled={!canEdit} value={languagePref} onChange={(e) => setLanguagePref(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientProfile.sectionAddress")}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelAddressLine1")}</label>
              <input disabled={!canEdit} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelAddressLine2")}</label>
              <input disabled={!canEdit} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelCity")}</label>
                <input disabled={!canEdit} value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelStateProvince")}</label>
                <input disabled={!canEdit} value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelPostalCode")}</label>
                <input disabled={!canEdit} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelCountry")}</label>
                <input disabled={!canEdit} value={country} onChange={(e) => setCountry(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientsListPage.sectionIdentifiers")}
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelNationalId")}</label>
              <input disabled={!canEdit} value={nationalId} onChange={(e) => setNationalId(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientProfile.sectionEmergency")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelEmergencyName")}</label>
                <input disabled={!canEdit} value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelEmergencyRelationship")}</label>
                <input
                  disabled={!canEdit}
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelEmergencyPhone")}</label>
              <input type="tel" disabled={!canEdit} value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ ...shellCard, marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 12 }}>
              {t("patientProfile.sectionAdmin")}
            </div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{t("patientsListPage.labelAdminNotes")}</label>
            <textarea
              disabled={!canEdit}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {saveError && (
            <div style={{ padding: 12, background: "#ffebee", color: "#b71c1c", borderRadius: 8, marginBottom: 12 }}>{saveError}</div>
          )}
          {saveSuccess && (
            <div style={{ padding: 12, background: "#e8f5e9", color: "#1b5e20", borderRadius: 8, marginBottom: 12 }}>{t("patientProfile.saveSuccess")}</div>
          )}

          {canEdit ? (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => router.push(`/app/patients/${patientId}`)}
                style={{
                  padding: "10px 18px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {t("patientProfile.cancelButton")}
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 8,
                  background: "#0f172a",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving ? t("patientProfile.saving") : t("patientProfile.saveButton")}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
