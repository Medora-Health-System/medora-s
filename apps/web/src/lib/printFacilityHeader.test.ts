import { describe, expect, it } from "vitest";
import {
  buildPrintFacilityHeaderHtml,
  buildPrintDocumentFooterHtml,
  formatPrintFacilityAddress,
  resolvePrintFacilityInfo,
  resolvePrintFacilityForDocument,
  resolveEnterprisePrintFacilityFromCatalog,
} from "./printFacilityHeader";

const esc = (s: string) => s;

describe("printFacilityHeader", () => {
  it("centers facility name address and phone when provided", () => {
    const html = buildPrintFacilityHeaderHtml(
      {
        name: "Wayne Urgent Care Emergency Room",
        addressLine1: "123 Healthcare Blvd",
        city: "Wayne",
        stateProvince: "NJ",
        postalCode: "07470",
        phone: "(973) 555-0100",
      },
      esc
    );
    expect(html).toContain("text-align:center");
    expect(html).toContain("Wayne Urgent Care Emergency Room");
    expect(html).toContain("123 Healthcare Blvd");
    expect(html).toContain("Wayne, NJ, 07470");
    expect(html).toContain("(973) 555-0100");
  });

  it("omits address and phone lines when missing", () => {
    const html = buildPrintFacilityHeaderHtml({ name: "Clinic Test" }, esc);
    expect(html).toContain("Clinic Test");
    expect(html).not.toContain("undefined");
  });

  it("formats multi-line address parts internationally", () => {
    expect(
      formatPrintFacilityAddress({
        name: "X",
        addressLine1: "123 Healthcare Blvd",
        city: "Wayne",
        stateProvince: "NJ",
        postalCode: "07470",
      })
    ).toBe("123 Healthcare Blvd, Wayne, NJ, 07470");
  });

  it("formats Haiti address without requiring postal code", () => {
    expect(
      formatPrintFacilityAddress({
        name: "Clinique",
        addressLine1: "12 Rue Principale",
        city: "Port-au-Prince",
        stateProvince: "Ouest",
        country: "Haiti",
      })
    ).toBe("12 Rue Principale, Port-au-Prince, Ouest, Haiti");
  });

  it("resolves facility from legacy facilityName", () => {
    expect(resolvePrintFacilityInfo(null, "Medora Clinic")?.name).toBe("Medora Clinic");
  });

  it("prefers document facility over unrelated selected facility", () => {
    const result = resolvePrintFacilityForDocument({
      documentFacilityId: "fac-doc",
      selectedFacilityId: "fac-other",
      documentFacility: { name: "Document Clinic", phone: "509-111" },
      selectedFacility: { name: "Other Clinic", phone: "509-222" },
      selectedFacilityName: "Other Clinic",
    });
    expect(result.mismatch).toBe(true);
    expect(result.usedDocumentFacility).toBe(true);
    expect(result.facility?.name).toBe("Document Clinic");

    const fromCatalog = resolveEnterprisePrintFacilityFromCatalog({
      documentFacilityId: "fac-doc",
      selectedFacilityId: "fac-other",
      facilities: [
        {
          id: "fac-doc",
          name: "Document Clinic",
          country: "Haiti",
          careProfileJson: {
            schemaVersion: 1,
            address: { line1: "12 Rue", city: "PAP", country: "Haiti", phone: "509-111" },
          },
        },
        {
          id: "fac-other",
          name: "Other Clinic",
          careProfileJson: {
            schemaVersion: 1,
            address: { line1: "99 Other", city: "Other", phone: "509-222" },
          },
        },
      ],
    });
    expect(fromCatalog.mismatch).toBe(true);
    expect(fromCatalog.usedDocumentFacility).toBe(true);
    expect(fromCatalog.facility?.name).toBe("Document Clinic");
    expect(fromCatalog.facility?.phone).toBe("509-111");
  });

  it("builds localized footer without raw i18n keys", () => {
    const html = buildPrintDocumentFooterHtml("en", "7/2/2026, 11:19:48 PM", esc, (lang, key) => {
      if (lang === "en" && key === "printOutput.common.documentFooter") {
        return "Document generated on {date} — Medora-S";
      }
      return key;
    });
    expect(html).toContain("Document generated on 7/2/2026, 11:19:48 PM");
    expect(html).not.toContain("printOutput.common");
  });
});
