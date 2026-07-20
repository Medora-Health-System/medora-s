import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

function flatten(obj: unknown, prefix = "", out = new Map<string, string>()) {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else flatten(v, key, out);
  }
  return out;
}

function harvestStableCodes(dir: string, out = new Set<string>()) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      harvestStableCodes(p, out);
      continue;
    }
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
    const src = fs.readFileSync(p, "utf8");
    for (const m of src.matchAll(/stableCode:\s*["']([A-Z0-9_]+)["']/g)) {
      out.add(m[1]);
    }
  }
  return out;
}

describe("chart certification i18n parity", () => {
  const enCert = flatten((en as any).edLifecycle?.certification, "edLifecycle.certification");
  const frCert = flatten((fr as any).edLifecycle?.certification, "edLifecycle.certification");

  it("has EN/FR key parity for certification namespace", () => {
    const missingFr: string[] = [];
    const missingEn: string[] = [];
    const empty: string[] = [];
    for (const [k, v] of enCert) {
      if (!v.trim()) empty.push(`EN:${k}`);
      if (!frCert.has(k)) missingFr.push(k);
    }
    for (const [k, v] of frCert) {
      if (!v.trim()) empty.push(`FR:${k}`);
      if (!enCert.has(k)) missingEn.push(k);
    }
    expect({ missingFr, missingEn, empty }).toEqual({
      missingFr: [],
      missingEn: [],
      empty: [],
    });
  });

  it("has no French leakage in English certification strings", () => {
    const leaked = [...enCert.entries()]
      .filter(([, v]) =>
        /\b(Documentez|manquante|consignes de sortie|Suivi de sortie|non signée)\b/.test(v)
      )
      .map(([k]) => k);
    expect(leaked).toEqual([]);
  });

  it("covers required discharge / Stage A / B3 keys used by the screenshot defect path", () => {
    for (const key of [
      "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.title",
      "edLifecycle.certification.b1.codes.DISCHARGE_FOLLOW_UP_MISSING.description",
      "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_CONTENT_MISSING.title",
      "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_CONTENT_MISSING.description",
      "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.title",
      "edLifecycle.certification.b1.codes.DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED.description",
      "edLifecycle.certification.stageA.codes.PROVIDER_NOTE_UNSIGNED.title",
      "edLifecycle.certification.stageA.codes.PROVIDER_NOTE_UNSIGNED.description",
      "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.title",
      "edLifecycle.certification.b3.codes.MAR_DOSE_UNRESOLVED.description",
    ]) {
      expect(enCert.has(key), `missing EN ${key}`).toBe(true);
      expect(frCert.has(key), `missing FR ${key}`).toBe(true);
    }
  });

  it("covers B3 evaluator stable codes in both locales", () => {
    const repoRoot = path.resolve(__dirname, "../../../../..");
    const codes = harvestStableCodes(
      path.join(repoRoot, "packages/shared/src/encounters/chartCertificationB3")
    );
    const skip = new Set([
      "INFUSION_HANDOFF_DOCUMENTED", // informational
    ]);
    const missing: string[] = [];
    for (const code of codes) {
      if (skip.has(code)) continue;
      for (const leaf of ["title", "description"]) {
        const key = `edLifecycle.certification.b3.codes.${code}.${leaf}`;
        if (!enCert.has(key) || !frCert.has(key)) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });

  it("Stage A review/panel resolve findings through locale helper (no raw d.title/d.description)", () => {
    const review = fs.readFileSync(
      path.join(__dirname, "EdEncounterCertificationReview.tsx"),
      "utf8"
    );
    const panel = fs.readFileSync(
      path.join(__dirname, "EdClosedEncounterCertificationPanel.tsx"),
      "utf8"
    );
    expect(review).toContain("resolveCertificationDeficiencyDisplay");
    expect(panel).toContain("resolveCertificationDeficiencyDisplay");
    expect(review).not.toMatch(/\{d\.description\}/);
    expect(review).not.toMatch(/\{d\.title\}/);
    expect(panel).not.toMatch(/\{d\.description\}/);
    expect(panel).not.toMatch(/\{d\.title\}/);
  });
});
