"use client";

import React, { useMemo, useState } from "react";
import {
  buildTdapVaccineAdministrationNote,
  emptyTdapVaccineAdministrationForm,
  serializeTdapVaccineAdministrationPayload,
  TDAP_IM_INJECTION_SITES,
  validateTdapVaccineAdministrationForm,
  VACCINE_MANUFACTURER_CATALOG,
  type TdapEducationReviewedWith,
  type TdapEducationTopic,
  type TdapVaccineAdministrationForm,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  color: "#334155",
};

const TOPIC_KEYS: Record<TdapEducationTopic, string> = {
  reason_for_medication: "topicReason",
  signs_of_allergic_reaction: "topicAllergicReaction",
  precautions: "topicPrecautions",
};

export function TdapVaccineAdministrationForm({
  initialForm,
  onSave,
}: {
  initialForm?: Partial<TdapVaccineAdministrationForm>;
  onSave?: (payload: { note: string; serialized: Record<string, unknown> }) => void;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en" : "fr";
  const [form, setForm] = useState<TdapVaccineAdministrationForm>({
    ...emptyTdapVaccineAdministrationForm(),
    ...initialForm,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const generatedNote = useMemo(() => buildTdapVaccineAdministrationNote(form, locale), [form, locale]);

  const patch = (partial: Partial<TdapVaccineAdministrationForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setValidationError(null);
  };

  const toggleTopic = (topic: TdapEducationTopic) => {
    setForm((prev) => {
      const has = prev.reviewedTopics.includes(topic);
      return {
        ...prev,
        reviewedTopics: has
          ? prev.reviewedTopics.filter((x) => x !== topic)
          : [...prev.reviewedTopics, topic],
      };
    });
  };

  const handleSave = () => {
    const errors = validateTdapVaccineAdministrationForm(form);
    if (errors.length) {
      setValidationError(t("tdapVaccineAdmin.validationRequired"));
      return;
    }
    const serialized = serializeTdapVaccineAdministrationPayload(form);
    onSave?.({ note: generatedNote, serialized });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{t("tdapVaccineAdmin.title")}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.doseLabel")}</span>
          <input style={inputStyle} value={form.doseValue} onChange={(e) => patch({ doseValue: e.target.value })} />
        </label>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.doseUnitLabel")}</span>
          <input style={inputStyle} value={form.doseUnit} onChange={(e) => patch({ doseUnit: e.target.value })} />
        </label>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.routeLabel")}</span>
          <input style={inputStyle} value={form.route} onChange={(e) => patch({ route: e.target.value })} />
        </label>
      </div>

      <label>
        <span style={labelStyle}>{t("tdapVaccineAdmin.siteLabel")}</span>
        <select
          style={inputStyle}
          value={form.injectionSite}
          onChange={(e) => patch({ injectionSite: e.target.value as TdapVaccineAdministrationForm["injectionSite"] })}
        >
          <option value="">{t("tdapVaccineAdmin.sitePlaceholder")}</option>
          {TDAP_IM_INJECTION_SITES.map((siteId) => (
            <option key={siteId} value={siteId}>
              {t(`marTab.injectionSites.${siteId}`)}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={form.allergiesVerified}
            onChange={(e) => patch({ allergiesVerified: e.target.checked })}
          />{" "}
          {t("tdapVaccineAdmin.allergiesVerified")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.confirmedFiveRights}
            onChange={(e) => patch({ confirmedFiveRights: e.target.checked })}
          />{" "}
          {t("tdapVaccineAdmin.fiveRights")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.medicationInformationReviewed}
            onChange={(e) => patch({ medicationInformationReviewed: e.target.checked })}
          />{" "}
          {t("tdapVaccineAdmin.medInfoReviewed")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.verbalizedUnderstanding}
            onChange={(e) => patch({ verbalizedUnderstanding: e.target.checked })}
          />{" "}
          {t("tdapVaccineAdmin.verbalizedUnderstanding")}
        </label>
      </div>

      <label>
        <span style={labelStyle}>{t("tdapVaccineAdmin.reviewedWithLabel")}</span>
        <select
          style={inputStyle}
          value={form.reviewedWith}
          onChange={(e) => patch({ reviewedWith: e.target.value as TdapEducationReviewedWith | "" })}
        >
          <option value="">—</option>
          <option value="patient">{t("tdapVaccineAdmin.reviewedWithPatient")}</option>
          <option value="spouse">{t("tdapVaccineAdmin.reviewedWithSpouse")}</option>
          <option value="parent">{t("tdapVaccineAdmin.reviewedWithParent")}</option>
          <option value="family">{t("tdapVaccineAdmin.reviewedWithFamily")}</option>
        </select>
      </label>

      <div>
        <span style={labelStyle}>{t("tdapVaccineAdmin.reviewedTopicsLabel")}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(Object.keys(TOPIC_KEYS) as TdapEducationTopic[]).map((topic) => (
            <label key={topic}>
              <input
                type="checkbox"
                checked={form.reviewedTopics.includes(topic)}
                onChange={() => toggleTopic(topic)}
              />{" "}
              {t(`tdapVaccineAdmin.${TOPIC_KEYS[topic]}`)}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.lotNumber")}</span>
          <input style={inputStyle} value={form.lotNumber} onChange={(e) => patch({ lotNumber: e.target.value })} />
        </label>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.expirationDate")}</span>
          <input
            type="date"
            style={inputStyle}
            value={form.expirationDate}
            onChange={(e) => patch({ expirationDate: e.target.value })}
          />
        </label>
      </div>

      <label>
        <span style={labelStyle}>{t("tdapVaccineAdmin.manufacturer")}</span>
        <select
          style={inputStyle}
          value={form.manufacturerId}
          onChange={(e) =>
            patch({ manufacturerId: e.target.value as TdapVaccineAdministrationForm["manufacturerId"] })
          }
        >
          <option value="">—</option>
          {VACCINE_MANUFACTURER_CATALOG.map((m) => (
            <option key={m.id} value={m.id}>
              {locale === "fr" ? m.labelFr : m.labelEn}
            </option>
          ))}
        </select>
      </label>

      {form.manufacturerId === "other" ? (
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.manufacturerOther")}</span>
          <input
            style={inputStyle}
            value={form.manufacturerOther}
            onChange={(e) => patch({ manufacturerOther: e.target.value })}
          />
        </label>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <label>
          <input
            type="checkbox"
            checked={form.vis.visGiven}
            onChange={(e) => patch({ vis: { ...form.vis, visGiven: e.target.checked } })}
          />{" "}
          {t("tdapVaccineAdmin.visGiven")}
        </label>
        {form.vis.visGiven ? (
          <>
            <select
              style={{ ...inputStyle, width: "auto", minWidth: 140 }}
              value={form.vis.visRecipient}
              onChange={(e) =>
                patch({
                  vis: {
                    ...form.vis,
                    visRecipient: e.target.value as TdapVaccineAdministrationForm["vis"]["visRecipient"],
                  },
                })
              }
            >
              <option value="none">—</option>
              <option value="patient">{t("tdapVaccineAdmin.visRecipientPatient")}</option>
              <option value="family">{t("tdapVaccineAdmin.visRecipientFamily")}</option>
            </select>
            <input
              type="date"
              style={{ ...inputStyle, width: "auto" }}
              value={form.vis.visDate}
              onChange={(e) => patch({ vis: { ...form.vis, visDate: e.target.value } })}
              aria-label={t("tdapVaccineAdmin.visDate")}
            />
          </>
        ) : null}
      </div>

      <label>
        <span style={labelStyle}>{t("tdapVaccineAdmin.amountWasted")}</span>
        <input style={inputStyle} value={form.amountWasted} onChange={(e) => patch({ amountWasted: e.target.value })} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.administeredAt")}</span>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.administeredAt}
            onChange={(e) => patch({ administeredAt: e.target.value })}
          />
        </label>
        <label>
          <span style={labelStyle}>{t("tdapVaccineAdmin.clinicianName")}</span>
          <input
            style={inputStyle}
            value={form.administeringClinicianName}
            onChange={(e) => patch({ administeringClinicianName: e.target.value })}
          />
        </label>
      </div>

      <label>
        <span style={labelStyle}>{t("tdapVaccineAdmin.clinicianCredentials")}</span>
        <input
          style={inputStyle}
          value={form.administeringClinicianCredentials}
          onChange={(e) => patch({ administeringClinicianCredentials: e.target.value })}
        />
      </label>

      <div>
        <span style={labelStyle}>{t("tdapVaccineAdmin.generatedNoteLabel")}</span>
        <textarea
          readOnly
          value={generatedNote}
          rows={5}
          style={{ ...inputStyle, resize: "vertical", background: "#f8fafc" }}
        />
      </div>

      {validationError ? <p style={{ color: "#b00020", fontSize: 13 }}>{validationError}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        style={{
          alignSelf: "flex-start",
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: "#0f766e",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {t("tdapVaccineAdmin.saveToMar")}
      </button>
    </div>
  );
}
