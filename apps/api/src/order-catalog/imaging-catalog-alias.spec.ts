/**
 * Ensures legacy duplicate imaging codes remain reachable via alias map (2B.2 scope).
 */
import * as fs from "node:fs";
import * as path from "node:path";

describe("imaging catalog alias map", () => {
  it("cta chest shortcut includes CTA_CHEST and CT_CHEST_CTA", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "imaging-catalog.service.ts"),
      "utf8"
    );
    expect(src).toContain('"cta chest": ["CTA_CHEST", "CT_CHEST_CTA"]');
    expect(src).toContain("IMAGING_ALIAS_CODE_MAP");
  });

  it("ct head shortcut includes CT_HEAD_WO_CONTRAST only after retirement (2C.5B)", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "imaging-catalog.service.ts"),
      "utf8"
    );
    expect(src).toContain('"ct head": ["CT_HEAD_WO_CONTRAST"]');
  });
});
