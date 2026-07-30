"use client";

/**
 * MEDUI.D4C.7I — shared Facility ADDRESS AND CONTACT fields (onboarding + edit).
 * Uses enterprise operational address on facilityCareProfileJson — not a Clinic* fork.
 */

import type { CSSProperties } from "react";
import {
  facilityIdentityCityLabelKey,
  facilityIdentityRegionLabelKey,
  type FacilityOperationalAddress,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type FacilityOperationalIdentityFormState = {
  printDisplayName: string;
  legalName: string;
  line1: string;
  line2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  phoneSecondary: string;
  fax: string;
  email: string;
  website: string;
};

export function emptyFacilityOperationalIdentityForm(
  defaults?: Partial<FacilityOperationalIdentityFormState>
): FacilityOperationalIdentityFormState {
  return {
    printDisplayName: "",
    legalName: "",
    line1: "",
    line2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "Haiti",
    phone: "",
    phoneSecondary: "",
    fax: "",
    email: "",
    website: "",
    ...defaults,
  };
}

export function facilityOperationalIdentityFormFromCareProfile(input: {
  facilityName?: string | null;
  careProfileJson?: unknown;
}): FacilityOperationalIdentityFormState {
  const raw =
    input.careProfileJson && typeof input.careProfileJson === "object" && !Array.isArray(input.careProfileJson)
      ? (input.careProfileJson as Record<string, unknown>)
      : null;
  const address =
    raw?.address && typeof raw.address === "object" && !Array.isArray(raw.address)
      ? (raw.address as Partial<FacilityOperationalAddress>)
      : {};
  return emptyFacilityOperationalIdentityForm({
    printDisplayName:
      (typeof raw?.printDisplayName === "string" ? raw.printDisplayName : "") ||
      (input.facilityName ?? ""),
    legalName: typeof raw?.legalName === "string" ? raw.legalName : "",
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    stateProvince: address.stateProvince ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country ?? "Haiti",
    phone: address.phone ?? "",
    phoneSecondary: address.phoneSecondary ?? "",
    fax: address.fax ?? "",
    email: address.email ?? "",
    website: address.website ?? "",
  });
}

export function facilityOperationalIdentityFormToDto(form: FacilityOperationalIdentityFormState): {
  printDisplayName?: string;
  legalName?: string | null;
  operationalAddress: Partial<FacilityOperationalAddress>;
  country?: string;
} {
  const trim = (s: string) => s.trim();
  return {
    printDisplayName: trim(form.printDisplayName) || undefined,
    legalName: trim(form.legalName) || null,
    country: trim(form.country) || undefined,
    operationalAddress: {
      line1: trim(form.line1) || null,
      line2: trim(form.line2) || null,
      city: trim(form.city) || null,
      stateProvince: trim(form.stateProvince) || null,
      postalCode: trim(form.postalCode) || null,
      country: trim(form.country) || null,
      phone: trim(form.phone) || null,
      phoneSecondary: trim(form.phoneSecondary) || null,
      fax: trim(form.fax) || null,
      email: trim(form.email) || null,
      website: trim(form.website) || null,
    },
  };
}

const fieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  border: "1px solid #ccc",
  borderRadius: 4,
  boxSizing: "border-box",
};

export function FacilityOperationalIdentityFields({
  value,
  onChange,
  disabled = false,
  requireCoreFields = true,
}: {
  value: FacilityOperationalIdentityFormState;
  onChange: (next: FacilityOperationalIdentityFormState) => void;
  disabled?: boolean;
  requireCoreFields?: boolean;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<FacilityOperationalIdentityFormState>) => onChange({ ...value, ...patch });
  const cityKey = facilityIdentityCityLabelKey(value.country);
  const regionKey = facilityIdentityRegionLabelKey(value.country);

  return (
    <div
      data-testid="facility-operational-identity-fields"
      style={{
        marginBottom: 16,
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {t("facilityIdentityD4c7i.sectionTitle")}
      </h3>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("facilityIdentityD4c7i.sectionHint")}</p>

      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.printDisplayName")}
        <input
          value={value.printDisplayName}
          disabled={disabled}
          onChange={(e) => set({ printDisplayName: e.target.value })}
          style={fieldStyle}
          autoComplete="organization"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.legalName")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.legalName}
          disabled={disabled}
          onChange={(e) => set({ legalName: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.country")}
        {requireCoreFields ? " *" : ""}
        <input
          value={value.country}
          disabled={disabled}
          required={requireCoreFields}
          onChange={(e) => set({ country: e.target.value })}
          style={fieldStyle}
          data-testid="facility-identity-country"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.line1")}
        {requireCoreFields ? " *" : ""}
        <input
          value={value.line1}
          disabled={disabled}
          required={requireCoreFields}
          onChange={(e) => set({ line1: e.target.value })}
          style={fieldStyle}
          data-testid="facility-identity-line1"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.line2")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.line2}
          disabled={disabled}
          onChange={(e) => set({ line2: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t(cityKey)}
        {requireCoreFields ? " *" : ""}
        <input
          value={value.city}
          disabled={disabled}
          required={requireCoreFields}
          onChange={(e) => set({ city: e.target.value })}
          style={fieldStyle}
          data-testid="facility-identity-city"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t(regionKey)}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.stateProvince}
          disabled={disabled}
          onChange={(e) => set({ stateProvince: e.target.value })}
          style={fieldStyle}
          data-testid="facility-identity-region"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.postalCode")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.postalCode}
          disabled={disabled}
          onChange={(e) => set({ postalCode: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.phone")}
        {requireCoreFields ? " *" : ""}
        <input
          value={value.phone}
          disabled={disabled}
          required={requireCoreFields}
          onChange={(e) => set({ phone: e.target.value })}
          style={fieldStyle}
          data-testid="facility-identity-phone"
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.phoneSecondary")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.phoneSecondary}
          disabled={disabled}
          onChange={(e) => set({ phoneSecondary: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.fax")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.fax}
          disabled={disabled}
          onChange={(e) => set({ fax: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.email")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          type="email"
          value={value.email}
          disabled={disabled}
          onChange={(e) => set({ email: e.target.value })}
          style={fieldStyle}
        />
      </label>
      <label style={{ fontSize: 13, fontWeight: 600 }}>
        {t("facilityIdentityD4c7i.website")}
        <span style={{ fontWeight: 400, color: "#64748b" }}> ({t("facilityIdentityD4c7i.optional")})</span>
        <input
          value={value.website}
          disabled={disabled}
          onChange={(e) => set({ website: e.target.value })}
          style={fieldStyle}
        />
      </label>
    </div>
  );
}
