import * as fs from "node:fs";
import * as path from "node:path";
import { mapImagingToBillingCode } from "../billing/billing-map-from-event.util";

describe("terminology billing/reporting guard", () => {
  it("mapImagingToBillingCode source uses externalCode from study code only", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../billing/billing-map-from-event.util.ts"),
      "utf8"
    );
    expect(src).toContain('findMapping(prisma, "IMAGING", studyCode)');
    expect(src).not.toContain("Classifier");
    expect(src).not.toContain("bodyRegionClassifier");
  });

  it("reports.service medication labels do not reference TermClassifier", () => {
    const src = fs.readFileSync(path.join(__dirname, "../reports/reports.service.ts"), "utf8");
    expect(src).not.toContain("TermClassifier");
    expect(src).not.toContain("bodyRegionClassifier");
  });

  it("mapImagingToBillingCode returns null without prisma row for unknown code", async () => {
    const prisma = {
      billingCatalog: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const result = await mapImagingToBillingCode(prisma as never, "CT_HEAD_WO_CONTRAST");
    expect(result).toBeNull();
    expect(prisma.billingCatalog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ triggerSource: "IMAGING", externalCode: "CT_HEAD_WO_CONTRAST" }),
      })
    );
  });
});
