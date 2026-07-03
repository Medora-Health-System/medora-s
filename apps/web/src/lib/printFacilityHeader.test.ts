import { describe, expect, it } from "vitest";
import {
  buildPrintFacilityHeaderHtml,
  buildPrintDocumentFooterHtml,
  formatPrintFacilityAddress,
  resolvePrintFacilityInfo,
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
    expect(html).toContain("123 Healthcare Blvd, Wayne, NJ 07470");
    expect(html).toContain("(973) 555-0100");
  });

  it("omits address and phone lines when missing", () => {
    const html = buildPrintFacilityHeaderHtml({ name: "Clinic Test" }, esc);
    expect(html).toContain("Clinic Test");
    expect(html).not.toContain("undefined");
  });

  it("formats multi-line address parts", () => {
    expect(
      formatPrintFacilityAddress({
        name: "X",
        addressLine1: "123 Healthcare Blvd",
        city: "Wayne",
        stateProvince: "NJ",
        postalCode: "07470",
      })
    ).toBe("123 Healthcare Blvd, Wayne, NJ 07470");
  });

  it("resolves facility from legacy facilityName", () => {
    expect(resolvePrintFacilityInfo(null, "Medora Clinic")?.name).toBe("Medora Clinic");
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
