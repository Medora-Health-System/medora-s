/**
 * Phase 2C.4B — trauma order set CT head successor migration (static guard).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const modalSource = readFileSync(join(import.meta.dirname, "CreateOrderModal.tsx"), "utf8");

describe("CreateOrderModal trauma CT head order set (2C.4B)", () => {
  it("uses CT_HEAD_WO_CONTRAST as primary trauma ctHead catalogCode", () => {
    expect(modalSource).toContain('key: "ctHead"');
    expect(modalSource).toContain('catalogCode: "CT_HEAD_WO_CONTRAST"');
    expect(modalSource).not.toMatch(
      /key:\s*"ctHead"[\s\S]*?catalogCode:\s*"CT_HEAD"/
    );
  });

  it("keeps CT_HEAD as transition fallback in trauma ctHead catalogCodes", () => {
    expect(modalSource).toMatch(
      /key:\s*"ctHead"[\s\S]*?catalogCodes:\s*\["CT_HEAD"\]/
    );
  });
});
