/**
 * Authenticated i18n smoke — catalog + rendered-text contract.
 *
 * Live browser navigation is still required for FINAL_VERDICT. This test fails
 * the build if public or platform catalogs contain sentinel / raw-key chrome,
 * and optionally scans a live session when MEDORA_I18N_SMOKE_BASE_URL is set.
 */
import { describe, expect, it } from "vitest";
import { collectMessageLeaves, auditPublicCatalogParity } from "./messages/publicCatalogParity";
import en from "./messages/en";
import fr from "./messages/fr";
import es from "./messages/es";
import { en as platformEn, es as platformEs, fr as platformFr } from "./messages";
import { platformText } from "./platformText";

const SENTINEL = /UNLOCALIZED_ES::|UNLOCALIZED_SOURCE/;
const RAW_KEY = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;

describe("authenticated i18n smoke contract", () => {
  it("public catalogs contain no sentinels or raw keys", () => {
    const report = auditPublicCatalogParity(en, fr, es);
    expect(report.VERDICT).toBe("PASS");
    expect(report.ES_SENTINELS).toBe(0);
    expect(report.RAW_KEYS).toBe(0);
    for (const [path, value] of collectMessageLeaves(es)) {
      expect(value, path).not.toMatch(SENTINEL);
      if (RAW_KEY.test(value) && value === path) {
        expect.fail(`raw key ${path}`);
      }
    }
  });

  it("platform catalogs contain no sentinels and preserve a known dynamic token pattern", () => {
    for (const [key, value] of Object.entries(platformEs)) {
      expect(value, key).not.toMatch(SENTINEL);
      expect(value, key).not.toBe(key);
    }
    for (const [key, value] of Object.entries(platformText.es)) {
      expect(value, `literal:${key}`).not.toMatch(SENTINEL);
    }
    expect(platformEn["staff.title"]).toBe("Medora Staff");
    expect(platformFr["staff.title"]).toBe("Personnel Medora");
    expect(platformEs["staff.title"]).toBe("Personal Medora");
  });

  it("optional live HTML scan fails on sentinels when MEDORA_I18N_SMOKE_BASE_URL is set", async () => {
    const base = process.env.MEDORA_I18N_SMOKE_BASE_URL?.replace(/\/$/, "");
    if (!base) {
      expect(true).toBe(true);
      return;
    }
    const cookie = process.env.MEDORA_I18N_SMOKE_COOKIE ?? "";
    const routes = [
      "/app/admin",
      "/app/admin/go-live",
      "/app/admin/medical-exam-analytics",
      "/app/reports",
      "/platform",
    ];
    for (const route of routes) {
      const res = await fetch(`${base}${route}`, {
        headers: cookie ? { cookie } : {},
        redirect: "manual",
      });
      const html = await res.text();
      expect(html, route).not.toMatch(SENTINEL);
      expect(html, route).not.toContain("UNLOCALIZED_ES::");
    }
  });
});
