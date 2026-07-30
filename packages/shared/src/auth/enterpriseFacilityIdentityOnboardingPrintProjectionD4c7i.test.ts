import { describe, expect, it } from "vitest";
import { createFacilityDtoSchema } from "../schemas/facilities.js";
import {
  D4C7I_ERROR_CODES,
  D4C7I_FORBIDDEN_CLINIC_AUTHORITIES,
  D5A_FUTURE_DENTAL_SERVICE_LINES,
  ENTERPRISE_FACILITY_IDENTITY_ONBOARDING_PRINT_CERTIFICATION_ID,
  describeD5aDentalServiceLineIntegrationPoint,
  facilityIdentityCityLabelKey,
  facilityIdentityRegionLabelKey,
  formatEnterpriseFacilityAddressLines,
  isPlausibleFacilityEmail,
  isPlausibleFacilityWebsite,
  projectEnterpriseFacilityIdentity,
  resolveDocumentFacilityIdentitySource,
  validateFacilityOperationalIdentityOnboarding,
} from "./enterpriseFacilityIdentityOnboardingPrintProjectionD4c7i.js";

describe("MEDUI.D4C.7I enterprise facility identity", () => {
  it("exports certification id and forbids Clinic* address authorities", () => {
    expect(ENTERPRISE_FACILITY_IDENTITY_ONBOARDING_PRINT_CERTIFICATION_ID).toBe("MEDUI.D4C.7I");
    expect(D4C7I_FORBIDDEN_CLINIC_AUTHORITIES).toContain("ClinicFacilityAddress");
    expect(D4C7I_FORBIDDEN_CLINIC_AUTHORITIES).toContain("PrescriptionFacilityAddress");
    expect(D4C7I_FORBIDDEN_CLINIC_AUTHORITIES).toContain("DentalFacilityAddress");
    expect(D4C7I_FORBIDDEN_CLINIC_AUTHORITIES).toContain("HospitalFacilityPhone");
  });

  it("validates US facility onboarding with state and ZIP optional extras", () => {
    const gate = validateFacilityOperationalIdentityOnboarding({
      facilityName: "Wayne Urgent Care",
      country: "United States",
      line1: "123 Healthcare Blvd",
      city: "Wayne",
      stateProvince: "NJ",
      postalCode: "07470",
      phone: "(973) 555-0100",
      email: "info@wayne-uc.example",
      website: "https://wayne-uc.example",
      fax: "(973) 555-0199",
    });
    expect(gate).toEqual({ ok: true });
  });

  it("validates Haiti facility onboarding without US state or ZIP", () => {
    const gate = validateFacilityOperationalIdentityOnboarding({
      facilityName: "Clinique Medora",
      country: "Haiti",
      line1: "12 Rue Principale",
      city: "Port-au-Prince",
      stateProvince: "Ouest",
      phone: "+509 2222 3333",
    });
    expect(gate).toEqual({ ok: true });
  });

  it("requires country, address line 1, city/commune, and phone", () => {
    expect(
      validateFacilityOperationalIdentityOnboarding({
        facilityName: "X",
        country: "Haiti",
        line1: "12 Rue",
        city: "PAP",
      }).ok
    ).toBe(false);
    expect(
      validateFacilityOperationalIdentityOnboarding({
        facilityName: "X",
        country: "Haiti",
        line1: "12 Rue",
        phone: "509",
      })
    ).toMatchObject({
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_CITY_REQUIRED,
    });
    expect(
      validateFacilityOperationalIdentityOnboarding({
        facilityName: "X",
        line1: "12 Rue",
        city: "PAP",
        phone: "509",
      })
    ).toMatchObject({
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_COUNTRY_REQUIRED,
    });
  });

  it("allows optional fax/email/website and rejects invalid email/website", () => {
    expect(isPlausibleFacilityEmail("a@b.co")).toBe(true);
    expect(isPlausibleFacilityEmail("not-an-email")).toBe(false);
    expect(isPlausibleFacilityWebsite("clinique.ht")).toBe(true);
    expect(isPlausibleFacilityWebsite("bad url")).toBe(false);
    expect(
      validateFacilityOperationalIdentityOnboarding({
        facilityName: "X",
        country: "Haiti",
        line1: "1",
        city: "PAP",
        phone: "509",
        email: "bad",
      })
    ).toMatchObject({ ok: false, code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_EMAIL_INVALID });
  });

  it("uses country-aware city/region label keys", () => {
    expect(facilityIdentityCityLabelKey("Haiti")).toBe("facilityIdentityD4c7i.cityHaiti");
    expect(facilityIdentityCityLabelKey("United States")).toBe("facilityIdentityD4c7i.cityGeneric");
    expect(facilityIdentityRegionLabelKey("Haiti")).toBe("facilityIdentityD4c7i.regionHaiti");
    expect(facilityIdentityRegionLabelKey("United States")).toBe("facilityIdentityD4c7i.regionUs");
  });

  it("formats international address lines without hard-coded facility names", () => {
    const lines = formatEnterpriseFacilityAddressLines({
      line1: "12 Rue Principale",
      city: "Port-au-Prince",
      stateProvince: "Ouest",
      country: "Haiti",
      phone: null,
      phoneSecondary: null,
      fax: null,
      email: null,
      website: null,
      line2: null,
      postalCode: null,
    });
    expect(lines.join(" | ")).toBe("12 Rue Principale | Port-au-Prince, Ouest | Haiti");
    expect(lines.join(" ")).not.toMatch(/Medora Clinic Hardcoded/i);
  });

  it("projects print identity from care profile including contact fields", () => {
    const identity = projectEnterpriseFacilityIdentity({
      facilityName: "Fallback Name",
      facilityCountry: "Haiti",
      careProfileJson: {
        schemaVersion: 1,
        printDisplayName: "Clinique Soleil",
        legalName: "Clinique Soleil S.A.",
        address: {
          line1: "12 Rue Principale",
          city: "Port-au-Prince",
          country: "Haiti",
          phone: "+509 2222 3333",
          phoneSecondary: "+509 4444 5555",
          fax: "+509 2222 0000",
          email: "accueil@soleil.ht",
          website: "soleil.ht",
        },
      },
    });
    expect(identity.displayName).toBe("Clinique Soleil");
    expect(identity.legalName).toBe("Clinique Soleil S.A.");
    expect(identity.contact.phone).toBe("+509 2222 3333");
    expect(identity.contact.fax).toBe("+509 2222 0000");
    expect(identity.contact.email).toBe("accueil@soleil.ht");
    expect(identity.countryCodeOrName).toBe("Haiti");
  });

  it("prefers document facility over unrelated selected facility", () => {
    const link = resolveDocumentFacilityIdentitySource({
      documentFacilityId: "fac-doc",
      selectedFacilityId: "fac-other",
    });
    expect(link.facilityId).toBe("fac-doc");
    expect(link.mismatch).toBe(true);
    expect(link.code).toBe(D4C7I_ERROR_CODES.FACILITY_IDENTITY_DOCUMENT_FACILITY_MISMATCH);
  });

  it("createFacilityDtoSchema accepts Haiti without US ZIP and rejects missing phone", () => {
    const ok = createFacilityDtoSchema.safeParse({
      name: "Clinique Test",
      facilityType: "CLINIC",
      operationalAddress: {
        country: "Haiti",
        line1: "12 Rue",
        city: "Port-au-Prince",
        phone: "+509 1111 2222",
      },
    });
    expect(ok.success).toBe(true);

    const bad = createFacilityDtoSchema.safeParse({
      name: "Clinique Test",
      operationalAddress: {
        country: "Haiti",
        line1: "12 Rue",
        city: "Port-au-Prince",
      },
    });
    expect(bad.success).toBe(false);
  });

  it("reserves D5A dental service-line tokens without implementing Dental chart", () => {
    expect(D5A_FUTURE_DENTAL_SERVICE_LINES).toEqual([
      "DENTAL",
      "GENERAL_DENTISTRY",
      "ORTHODONTICS",
    ]);
    const point = describeD5aDentalServiceLineIntegrationPoint();
    expect(point.milestone).toBe("D5A");
    expect(point.registryFile).toContain("facilityTypeRegistry");
    expect(point.note).toMatch(/DentalFacilityAddress/);
  });
});
