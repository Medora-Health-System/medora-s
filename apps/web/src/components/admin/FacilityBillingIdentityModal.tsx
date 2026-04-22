"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminFacilityBillingIdentity,
  patchAdminFacilityBillingIdentity,
  type FacilityBillingIdentityPayload,
} from "@/lib/adminUsersApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

type Props = {
  headerFacilityId: string;
  targetFacilityId: string;
  facilityDisplayName: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
};

function emptyBillingForm() {
  return {
    billingLegalName: "",
    billingNpi: "",
    taxIdEin: "",
    billingAddressLine1: "",
    billingAddressLine2: "",
    billingCity: "",
    billingStateProvince: "",
    billingPostalCode: "",
    billingCountry: "",
    billingFacilityTypeLabel: "",
  };
}

function payloadToForm(p: FacilityBillingIdentityPayload) {
  return {
    billingLegalName: p.billingLegalName ?? "",
    billingNpi: p.billingNpi ?? "",
    taxIdEin: p.taxIdEin ?? "",
    billingAddressLine1: p.billingAddressLine1 ?? "",
    billingAddressLine2: p.billingAddressLine2 ?? "",
    billingCity: p.billingCity ?? "",
    billingStateProvince: p.billingStateProvince ?? "",
    billingPostalCode: p.billingPostalCode ?? "",
    billingCountry: p.billingCountry ?? "",
    billingFacilityTypeLabel: p.billingFacilityTypeLabel ?? "",
  };
}

export function FacilityBillingIdentityModal({
  headerFacilityId,
  targetFacilityId,
  facilityDisplayName,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyBillingForm);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAdminFacilityBillingIdentity(headerFacilityId, targetFacilityId)
      .then((p) => {
        if (!cancelled) setForm(payloadToForm(p));
      })
      .catch((e: unknown) => {
        onError(
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
            t("adminUsers.errLoadFacilityBilling")
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [headerFacilityId, targetFacilityId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const trim = (s: string) => (s.trim() === "" ? null : s.trim());
      const digits = form.billingNpi.replace(/\D/g, "").slice(0, 10);
      if (form.billingNpi.trim() && digits.length !== 10) {
        onError(t("adminUsers.valBillingNpiDigits"));
        setSubmitting(false);
        return;
      }
      await patchAdminFacilityBillingIdentity(headerFacilityId, targetFacilityId, {
        billingLegalName: trim(form.billingLegalName),
        billingNpi: form.billingNpi.trim() ? digits : null,
        taxIdEin: trim(form.taxIdEin),
        billingAddressLine1: trim(form.billingAddressLine1),
        billingAddressLine2: trim(form.billingAddressLine2),
        billingCity: trim(form.billingCity),
        billingStateProvince: trim(form.billingStateProvince),
        billingPostalCode: trim(form.billingPostalCode),
        billingCountry: trim(form.billingCountry),
        billingFacilityTypeLabel: trim(form.billingFacilityTypeLabel),
      });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errSaveFacilityBilling")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="facility-billing-title"
      >
        <h2 id="facility-billing-title" style={{ marginTop: 0 }}>
          {t("adminUsers.facilityBillingModalTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>{facilityDisplayName}</p>
        {loading ? (
          <p style={{ fontSize: 14, color: "#555" }}>{t("adminUsers.loading")}</p>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>{t("adminUsers.facilityBillingIntro")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingLegalNameLabel")}
                <input
                  value={form.billingLegalName}
                  onChange={(e) => setForm((f) => ({ ...f, billingLegalName: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingNpiLabel")}
                <input
                  inputMode="numeric"
                  value={form.billingNpi}
                  onChange={(e) => setForm((f) => ({ ...f, billingNpi: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{t("adminUsers.billingNpiHint")}</p>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.taxIdEinLabel")}
                <input
                  value={form.taxIdEin}
                  onChange={(e) => setForm((f) => ({ ...f, taxIdEin: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingAddressLine1Label")}
                <input
                  value={form.billingAddressLine1}
                  onChange={(e) => setForm((f) => ({ ...f, billingAddressLine1: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingAddressLine2Label")}
                <input
                  value={form.billingAddressLine2}
                  onChange={(e) => setForm((f) => ({ ...f, billingAddressLine2: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("adminUsers.billingCityLabel")}
                  <input
                    value={form.billingCity}
                    onChange={(e) => setForm((f) => ({ ...f, billingCity: e.target.value }))}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                  />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("adminUsers.billingStateProvinceLabel")}
                  <input
                    value={form.billingStateProvince}
                    onChange={(e) => setForm((f) => ({ ...f, billingStateProvince: e.target.value }))}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                  />
                </label>
              </div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingPostalCodeLabel")}
                <input
                  value={form.billingPostalCode}
                  onChange={(e) => setForm((f) => ({ ...f, billingPostalCode: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingCountryLabel")}
                <input
                  value={form.billingCountry}
                  onChange={(e) => setForm((f) => ({ ...f, billingCountry: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingFacilityTypeLabel")}
                <input
                  value={form.billingFacilityTypeLabel}
                  onChange={(e) => setForm((f) => ({ ...f, billingFacilityTypeLabel: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#fff",
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 4,
                  background: "#1a1a1a",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? t("adminUsers.saving") : t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
