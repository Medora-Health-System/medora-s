"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { formatPatientAgeOnlyLine, formatAgeYearsSexForLocale } from "@/lib/patientDisplay";
import { encounterBcp47, tEnumKey, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { getCachedRecord } from "@/lib/offline/offlineCache";
import {
  DEFAULT_ENCOUNTER_ROOM_LABEL,
  ENCOUNTER_ROOM_OPTIONS,
  formatEncounterRoomDisplay,
} from "@/lib/encounterRoomDisplay";

export interface RegistrationPatient {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone: string | null;
  nationalId?: string | null;
}

type UiLanguage = "en" | "fr" | "es";

type AddressSelection = {
  addressLine1: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
};

const relationshipOptions = [
  ["Spouse", { en: "Spouse", fr: "Conjoint(e)", es: "Cónyuge" }],
  ["Mother", { en: "Mother", fr: "Mère", es: "Madre" }],
  ["Father", { en: "Father", fr: "Père", es: "Padre" }],
  ["Son", { en: "Son", fr: "Fils", es: "Hijo" }],
  ["Daughter", { en: "Daughter", fr: "Fille", es: "Hija" }],
  ["Brother", { en: "Brother", fr: "Frère", es: "Hermano" }],
  ["Sister", { en: "Sister", fr: "Sœur", es: "Hermana" }],
  ["Sibling", { en: "Sibling", fr: "Frère / sœur", es: "Hermano/a" }],
  ["Grandmother", { en: "Grandmother", fr: "Grand-mère", es: "Abuela" }],
  ["Grandfather", { en: "Grandfather", fr: "Grand-père", es: "Abuelo" }],
  ["Grandparent", { en: "Grandparent", fr: "Grand-parent", es: "Abuelo/a" }],
  ["Mother-in-law", { en: "Mother-in-law", fr: "Belle-mère", es: "Suegra" }],
  ["Father-in-law", { en: "Father-in-law", fr: "Beau-père", es: "Suegro" }],
  ["Son-in-law", { en: "Son-in-law", fr: "Gendre", es: "Yerno" }],
  ["Daughter-in-law", { en: "Daughter-in-law", fr: "Belle-fille", es: "Nuera" }],
  ["Partner", { en: "Partner", fr: "Partenaire", es: "Pareja" }],
  ["Guardian", { en: "Guardian", fr: "Tuteur / tutrice", es: "Tutor/a" }],
  ["Caregiver", { en: "Caregiver", fr: "Aidant(e)", es: "Cuidador/a" }],
  ["Friend", { en: "Friend", fr: "Ami(e)", es: "Amigo/a" }],
  ["Other", { en: "Other", fr: "Autre", es: "Otro" }],
] as const;

const arrivalOptions = [
  ["SELF", { en: "Ambulatory / walk-in", fr: "Ambulatoire / par ses propres moyens", es: "Ambulatorio / por sus medios" }],
  ["AMBULANCE", { en: "Ambulance", fr: "Ambulance", es: "Ambulancia" }],
  ["PRIVATE_VEHICLE", { en: "Private vehicle", fr: "Véhicule privé", es: "Vehículo privado" }],
  ["TRANSFER", { en: "Transfer", fr: "Transfert", es: "Traslado" }],
  ["LAW_ENFORCEMENT", { en: "Law enforcement", fr: "Forces de l’ordre", es: "Fuerzas del orden" }],
  ["WHEELCHAIR", { en: "Wheelchair", fr: "Fauteuil roulant", es: "Silla de ruedas" }],
  ["OTHER", { en: "Other", fr: "Autre", es: "Otro" }],
] as const;

function uiLanguage(language: string): UiLanguage {
  return language === "fr" ? "fr" : language === "es" ? "es" : "en";
}

function normalizeCountry(country: string): "US" | "DO" | "HT" | "OTHER" {
  const c = country.trim().toLowerCase();
  if (["us", "usa", "united states", "united states of america", "estados unidos", "états-unis", "etats-unis"].includes(c)) return "US";
  if (["do", "dr", "dominican republic", "república dominicana", "republica dominicana", "république dominicaine", "republique dominicaine"].includes(c)) return "DO";
  if (["ht", "haiti", "haïti"].includes(c)) return "HT";
  return "OTHER";
}

export function formatRegistrationPhone(raw: string, country: string): string {
  const kind = normalizeCountry(country);
  let digits = raw.replace(/\D/g, "");
  if (kind === "HT") {
    if (digits.startsWith("509")) digits = digits.slice(3);
    digits = digits.slice(0, 8);
    if (!digits) return "+509 ";
    if (digits.length <= 2) return `+509 ${digits}`;
    if (digits.length <= 4) return `+509 ${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `+509 ${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  }
  if (kind === "US" || kind === "DO") {
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function phonePlaceholder(country: string): string {
  const kind = normalizeCountry(country);
  if (kind === "HT") return "+509 33-78-8974";
  if (kind === "DO") return "809-745-8778";
  if (kind === "US") return "512-369-8987";
  return "";
}

function patientSearchList(data: unknown): RegistrationPatient[] {
  if (Array.isArray(data)) return data as RegistrationPatient[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: RegistrationPatient[] }).items;
  }
  return [];
}

declare global {
  interface Window {
    google?: any;
    __medoraGooglePlacesPromise?: Promise<void>;
  }
}

function loadGooglePlaces(): Promise<void> | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || typeof window === "undefined") return null;
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__medoraGooglePlacesPromise) return window.__medoraGooglePlacesPromise;
  window.__medoraGooglePlacesPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-medora-google-places="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Places failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.medoraGooglePlaces = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Places failed to load"));
    document.head.appendChild(script);
  });
  return window.__medoraGooglePlacesPromise;
}

function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressSelection) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loader = loadGooglePlaces();
    if (!loader) return;
    let autocomplete: any;
    let listener: any;
    let cancelled = false;
    void loader
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places?.Autocomplete) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace?.();
          const components: any[] = place?.address_components ?? [];
          const pick = (type: string, short = false) => {
            const c = components.find((entry) => entry.types?.includes(type));
            return c ? (short ? c.short_name : c.long_name) : "";
          };
          const streetNumber = pick("street_number");
          const route = pick("route");
          const addressLine1 = [streetNumber, route].filter(Boolean).join(" ") || place?.formatted_address || value;
          onSelect({
            addressLine1,
            city: pick("locality") || pick("postal_town") || pick("administrative_area_level_2"),
            stateProvince: pick("administrative_area_level_1", true) || pick("administrative_area_level_1"),
            postalCode: pick("postal_code"),
            country: pick("country"),
          });
        });
      })
      .catch(() => {
        // Manual address entry remains available when Places is unavailable.
      });
    return () => {
      cancelled = true;
      if (listener?.remove) listener.remove();
      if (autocomplete && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [onSelect, value]);

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="street-address"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
    />
  );
}

export function NewPatientModal({
  facilityId,
  canCreateConsultation,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  canCreateConsultation: boolean;
  onClose: () => void;
  onSuccess: (patient?: RegistrationPatient | null) => void;
}) {
  const { t, language } = useI18n();
  const lang = uiLanguage(language);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "" as "" | "HOMME" | "FEMME" | "AUTRE" | "INCONNU",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    nationalId: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    adminNotes: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
    language: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [similarPatients, setSimilarPatients] = useState<RegistrationPatient[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState("");
  const dupeDateLocale = encounterBcp47(language);
  const addressSelectionHandler = React.useCallback((address: AddressSelection) => {
    setFormData((current) => ({
      ...current,
      ...address,
      phone: formatRegistrationPhone(current.phone, address.country),
      emergencyContactPhone: formatRegistrationPhone(current.emergencyContactPhone, address.country),
    }));
  }, []);

  useEffect(() => {
    if (normalizeCountry(formData.country) === "HT" && !formData.phone) {
      setFormData((current) => ({ ...current, phone: "+509 " }));
    }
  }, [formData.country, formData.phone]);

  useEffect(() => {
    const first = formData.firstName.trim();
    const last = formData.lastName.trim();
    const dob = formData.dateOfBirth.trim();
    const phone = formData.phone.trim();
    const canCheck = first.length >= 2 && last.length >= 2 && (Boolean(dob) || phone.length >= 6);
    if (!canCheck || !facilityId) {
      setSimilarPatients([]);
      setDuplicateHint("");
      return;
    }
    const run = async () => {
      setCheckingDuplicates(true);
      setDuplicateHint("");
      try {
        const query = `${first} ${last} ${phone}`.trim();
        const raw = await apiFetch(`/patients/search?q=${encodeURIComponent(query)}`, { facilityId });
        const list = patientSearchList(raw);
        const matches = list.filter((p) => {
          const sameDob = dob && p.dob ? new Date(p.dob).toISOString().slice(0, 10) === dob : false;
          const samePhone = phone && p.phone ? p.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") : false;
          const sameName = p.firstName?.trim().toLowerCase() === first.toLowerCase() && p.lastName?.trim().toLowerCase() === last.toLowerCase();
          return sameName && (sameDob || samePhone);
        });
        setSimilarPatients(matches.slice(0, 5));
      } catch {
        const cached = await getCachedRecord<RegistrationPatient[]>("patient_summaries", `patient-search-index:${facilityId}`);
        setSimilarPatients((cached?.data ?? []).filter((p) => p.firstName?.trim().toLowerCase() === first.toLowerCase() && p.lastName?.trim().toLowerCase() === last.toLowerCase()).slice(0, 5));
        setDuplicateHint(t("patientsListPage.duplicateCheckOffline"));
      } finally {
        setCheckingDuplicates(false);
      }
    };
    const timeoutId = window.setTimeout(() => void run(), 350);
    return () => window.clearTimeout(timeoutId);
  }, [facilityId, formData.firstName, formData.lastName, formData.dateOfBirth, formData.phone, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) return setError(t("patientsListPage.errFacilityIdRequired"));
    const hasContact = formData.phone.replace(/\D/g, "").length >= 5 || formData.email.trim().length > 0;
    if (!hasContact) return setError(t("patientsListPage.errContactRequired"));
    const birth = new Date(formData.dateOfBirth);
    if (Number.isNaN(birth.getTime())) return setError(t("patientsListPage.errDobInvalid"));
    if (birth.getTime() > Date.now()) return setError(t("patientsListPage.errDobFuture"));

    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.nationalId.trim()) payload.nationalId = formData.nationalId.trim();
      if (formData.addressLine1.trim()) payload.addressLine1 = formData.addressLine1.trim();
      if (formData.addressLine2.trim()) payload.addressLine2 = formData.addressLine2.trim();
      if (formData.city.trim()) payload.city = formData.city.trim();
      if (formData.stateProvince.trim()) payload.stateProvince = formData.stateProvince.trim();
      if (formData.postalCode.trim()) payload.postalCode = formData.postalCode.trim();
      if (formData.country.trim()) payload.country = formData.country.trim();
      if (formData.language.trim()) payload.language = formData.language.trim();
      if (formData.emergencyContactName.trim()) payload.emergencyContactName = formData.emergencyContactName.trim();
      if (formData.emergencyContactRelationship.trim()) payload.emergencyContactRelationship = formData.emergencyContactRelationship.trim();
      if (formData.emergencyContactPhone.replace(/\D/g, "").length >= 5) payload.emergencyContactPhone = formData.emergencyContactPhone.trim();
      if (formData.adminNotes.trim()) payload.adminNotes = formData.adminNotes.trim();
      const res = await apiFetch("/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), facilityId });
      if (res?.queued) {
        setInfo(t("patientsListPage.queuedCreateBody"));
        onSuccess(null);
        return;
      }
      onSuccess((res as RegistrationPatient) ?? null);
    } catch (err) {
      setError(normalizeUserFacingError(err instanceof Error ? err.message : null, language) || t("patientsListPage.errCreatePatient"));
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, maxWidth: 600, width: "90%", maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{t("patientsListPage.titleNewPatient")}</h2>
        <p style={{ fontSize: 14, color: "#444", marginTop: -8, marginBottom: 16 }}>
          {formData.dateOfBirth && formData.sex ? formatAgeYearsSexForLocale(formData.dateOfBirth, formData.sex, null, language) : t("patientsListPage.hintDobSex")}
        </p>
        <form onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{t("patientsListPage.sectionIdentity")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelFirstName")}</label><input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={fieldStyle} /></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelLastName")}</label><input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={fieldStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelDob")}</label><input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} style={fieldStyle} /></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelSex")}</label><select required value={formData.sex} onChange={(e) => setFormData({ ...formData, sex: e.target.value as typeof formData.sex })} style={fieldStyle}><option value="">—</option>{(["HOMME", "FEMME", "AUTRE", "INCONNU"] as const).map((code) => <option key={code} value={code}>{tEnumKey(t, "encounterChrome.sexAtBirth", code)}</option>)}</select></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAge")}</label><input readOnly value={formatPatientAgeOnlyLine(formData.dateOfBirth, t)} style={{ ...fieldStyle, backgroundColor: "#f7f7f7" }} /></div>
          </div>

          <h3 style={{ margin: "6px 0 12px", fontSize: 16 }}>{t("patientsListPage.sectionContact")}</h3>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelPhone")}</label><input type="tel" inputMode="tel" placeholder={phonePlaceholder(formData.country)} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: formatRegistrationPhone(e.target.value, formData.country) })} style={fieldStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmail")}</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={fieldStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAddressLine1")}</label><AddressAutocompleteInput value={formData.addressLine1} onChange={(addressLine1) => setFormData({ ...formData, addressLine1 })} onSelect={addressSelectionHandler} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAddressLine2")}</label><input value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} style={fieldStyle} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelCity")}</label><input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={fieldStyle} /></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelPostalCode")}</label><input value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} style={fieldStyle} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelStateProvince")}</label><input value={formData.stateProvince} onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })} style={fieldStyle} /></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelCountry")}</label><input value={formData.country} onChange={(e) => { const country = e.target.value; setFormData({ ...formData, country, phone: formatRegistrationPhone(formData.phone, country), emergencyContactPhone: formatRegistrationPhone(formData.emergencyContactPhone, country) }); }} style={fieldStyle} /></div>
          </div>

          <h3 style={{ margin: "6px 0 12px", fontSize: 16 }}>{t("patientsListPage.sectionIdentifiers")}</h3>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelNationalId")}</label><input value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} style={fieldStyle} /></div>

          <h3 style={{ margin: "6px 0 12px", fontSize: 16 }}>{t("patientsListPage.sectionMore")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyName")}</label><input value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} style={fieldStyle} /></div>
            <div><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyRelationship")}</label><select value={formData.emergencyContactRelationship} onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })} style={fieldStyle}><option value="">—</option>{relationshipOptions.map(([value, labels]) => <option key={value} value={value}>{labels[lang]}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyPhone")}</label><input type="tel" inputMode="tel" placeholder={phonePlaceholder(formData.country)} value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: formatRegistrationPhone(e.target.value, formData.country) })} style={fieldStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAdminNotes")}</label><textarea value={formData.adminNotes} onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })} rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>

          {(checkingDuplicates || similarPatients.length > 0 || duplicateHint) && <div style={{ marginBottom: 16, border: "1px solid #ffe082", background: "#fffde7", borderRadius: 6, padding: 12 }}><div style={{ fontWeight: 600, marginBottom: 4 }}>{t("patientsListPage.similarPatientsTitle")}</div><div style={{ fontSize: 13, color: "#6d4c41", marginBottom: 8 }}>{t("patientsListPage.similarPatientsHint")}</div>{checkingDuplicates && <div style={{ fontSize: 13 }}>{t("patientsListPage.checkingDuplicates")}</div>}{!checkingDuplicates && duplicateHint && <div style={{ fontSize: 13, marginBottom: 6 }}>{duplicateHint}</div>}{!checkingDuplicates && similarPatients.map((p) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13 }}>{p.firstName} {p.lastName} · {p.dob ? new Date(p.dob).toLocaleDateString(dupeDateLocale) : t("common.dash")}</span><a href={`/app/patients/${p.id}`} style={{ fontSize: 12 }}>{t("patientsListPage.openExistingChart")}</a></div>)}{!checkingDuplicates && <div style={{ marginTop: 8, fontSize: 12 }}>{t("patientsListPage.continueAnyway")}</div>}</div>}
          {info && <div style={{ padding: 12, backgroundColor: "#e8f5e9", color: "#1b5e20", borderRadius: 4, marginBottom: 16 }}>{info}</div>}
          {error && <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}><button type="button" onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 4, background: "white" }}>{t("common.cancel")}</button><button type="submit" disabled={loading} style={{ padding: "10px 20px", backgroundColor: "#1a1a1a", color: "white", border: "none", borderRadius: 4, opacity: loading ? 0.6 : 1 }}>{loading ? t("patientsListPage.btnSubmitCreating") : canCreateConsultation ? t("patientsListPage.btnCreatePatient") : t("patientsListPage.btnSavePatient")}</button></div>
        </form>
      </div>
    </div>
  );
}

export function CreateConsultationModal({
  facilityId,
  patient,
  canOpenEncounterDetail,
  onClose,
}: {
  facilityId: string;
  patient: RegistrationPatient;
  canOpenEncounterDetail: boolean;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const lang = uiLanguage(language);
  const [type, setType] = useState<"OUTPATIENT" | "URGENT_CARE" | "EMERGENCY">("OUTPATIENT");
  const [visitReason, setVisitReason] = useState("");
  const [roomLabel, setRoomLabel] = useState(DEFAULT_ENCOUNTER_ROOM_LABEL);
  const [arrivalAtLocal, setArrivalAtLocal] = useState("");
  const [modeOfArrival, setModeOfArrival] = useState("");
  const [initialAcuity, setInitialAcuity] = useState("");
  const [physicianAssignedUserId, setPhysicianAssignedUserId] = useState("");
  const [providers, setProviders] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; queued?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch("/roster/providers", { facilityId }).then((data) => { if (!cancelled && Array.isArray(data)) setProviders(data); }).catch(() => { if (!cancelled) setProviders([]); });
    return () => { cancelled = true; };
  }, [facilityId]);

  const createEncounter = async () => {
    if (!facilityId || !patient.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/patients/${patient.id}/encounters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, visitReason: visitReason.trim() || undefined, roomLabel: roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL, physicianAssignedUserId: physicianAssignedUserId.trim() || undefined }), facilityId });
      if (res?.queued) return setCreated({ id: "", queued: true });
      const encId = (res as { id: string }).id;
      const intakeBody: Record<string, unknown> = { initialChiefComplaint: visitReason.trim() || undefined, initialRoom: roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL };
      if (arrivalAtLocal.trim()) { const d = new Date(arrivalAtLocal); if (!Number.isNaN(d.getTime())) intakeBody.arrivalAt = d.toISOString(); }
      if (modeOfArrival) intakeBody.modeOfArrival = modeOfArrival;
      if (initialAcuity) intakeBody.initialAcuity = Number(initialAcuity);
      try { await apiFetch(`/encounters/${encId}/intake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intakeBody), facilityId }); } catch { /* best effort */ }
      setCreated({ id: encId });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("patientConsultationsTab.create.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle: React.CSSProperties = { width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 };
  return <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }} onClick={onClose}><div style={{ width: "92%", maxWidth: 520, backgroundColor: "#fff", borderRadius: 8, padding: 20 }} onClick={(e) => e.stopPropagation()}><h2 style={{ margin: "0 0 8px" }}>{t("patientConsultationsTab.create.title")}</h2><p style={{ margin: "0 0 14px", color: "#555", fontSize: 14 }}>{patient.firstName} {patient.lastName}</p>{!created ? <><label>{t("patientConsultationsTab.create.typeLabel")}</label><select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={fieldStyle}><option value="OUTPATIENT">{tEncounterType(t, "OUTPATIENT")}</option><option value="URGENT_CARE">{tEncounterType(t, "URGENT_CARE")}</option><option value="EMERGENCY">{tEncounterType(t, "EMERGENCY")}</option></select><label>{t("patientConsultationsTab.create.roomLabel")}</label><select value={roomLabel} onChange={(e) => setRoomLabel(e.target.value)} style={fieldStyle}>{ENCOUNTER_ROOM_OPTIONS.map((r) => <option key={r} value={r}>{formatEncounterRoomDisplay(r, t)}</option>)}</select><label>{t("patientConsultationsTab.create.physicianOptional")}</label><select value={physicianAssignedUserId} onChange={(e) => setPhysicianAssignedUserId(e.target.value)} style={fieldStyle}><option value="">—</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>)}</select><label>{t("patientConsultationsTab.create.visitReason")}</label><textarea value={visitReason} onChange={(e) => setVisitReason(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} /><p style={{ margin: "14px 0 6px", fontSize: 13, fontWeight: 600 }}>{t("patientConsultationsTab.create.intakeSectionTitle")}</p><label>{t("patientConsultationsTab.create.intakeArrival")}</label><input type="datetime-local" value={arrivalAtLocal} onChange={(e) => setArrivalAtLocal(e.target.value)} style={fieldStyle} /><label>{t("patientConsultationsTab.create.intakeMode")}</label><select value={modeOfArrival} onChange={(e) => setModeOfArrival(e.target.value)} style={fieldStyle}><option value="">—</option>{arrivalOptions.map(([value, labels]) => <option key={value} value={value}>{labels[lang]}</option>)}</select><label>{t("patientConsultationsTab.create.intakeAcuity")}</label><select value={initialAcuity} onChange={(e) => setInitialAcuity(e.target.value)} style={fieldStyle}><option value="">—</option>{[1,2,3,4,5].map((n) => <option key={n} value={String(n)}>{n}</option>)}</select>{error && <div style={{ color: "#c62828", fontSize: 13 }}>{error}</div>}<div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" onClick={onClose}>{t("orderDetail.backToList")}</button><button type="button" onClick={() => void createEncounter()} disabled={submitting}>{submitting ? t("patientConsultationsTab.create.creating") : t("patientConsultationsTab.create.submit")}</button></div></> : <div><div style={{ color: "#1b5e20", marginBottom: 14, fontWeight: 600 }}>{created.queued ? t("patientConsultationsTab.create.successOffline") : t("patientConsultationsTab.create.successCreated")}</div><div style={{ display: "flex", gap: 10 }}>{!created.queued && created.id && (canOpenEncounterDetail ? <Link href={`/app/encounters/${created.id}`}>{t("openEncountersTable.openEncounter")}</Link> : <Link href={`/app/patients/${patient.id}`}>{t("openEncountersTable.openPatientChart")}</Link>)}<button type="button" onClick={onClose}>{t("orderDetail.backToList")}</button></div></div>}</div></div>;
}
