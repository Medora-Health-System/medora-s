import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import fr from "./fr";
import en from "./en";
import {
  APPROVED_FR_UI_ABBREVIATIONS,
  COMPLAINT_INTELLIGENCE_SUBGROUP_CANON,
  DISPOSITION_TERMINOLOGY_ANCHOR_KEYS,
  ENTERPRISE_WORKFLOW_LABEL_KEYS,
  FORBIDDEN_MIXED_LANGUAGE_UI_PATTERNS,
  MIXED_LANGUAGE_SCAN_PREFIXES,
  MOBILE_NAV_LABEL_KEYS,
  MBOOK_FR1_CANON_VERSION,
} from "./frenchTerminologyCanonManifest";

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") {
    return prefix ? [{ path: prefix, value: obj }] : [];
  }
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return [];
  }
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectStringLeaves(val, next));
  }
  return out;
}

function isApprovedAbbreviationToken(value: string, token: string): boolean {
  if (!APPROVED_FR_UI_ABBREVIATIONS.includes(token as (typeof APPROVED_FR_UI_ABBREVIATIONS)[number])) {
    return false;
  }
  return value.includes(token);
}

/** Phase M-BOOK.FR.1 — French enterprise terminology source-level validation. */
describe("French terminology canon (M-BOOK.FR.1)", () => {
  it("manifest version is defined for handbook traceability", () => {
    expect(MBOOK_FR1_CANON_VERSION).toBe("M-BOOK.FR.1");
  });

  it("canonical complaint-intelligence subgroup labels exist in FR and EN catalogs", () => {
    for (const [key, frCanon] of Object.entries(COMPLAINT_INTELLIGENCE_SUBGROUP_CANON)) {
      const frVal = getByPath(fr, key);
      const enVal = getByPath(en, key);
      expect(typeof frVal, `${key} missing in fr.ts`).toBe("string");
      expect(typeof enVal, `${key} missing in en.ts`).toBe("string");
      expect(frVal).toBe(frCanon);
      expect(String(enVal).length).toBeGreaterThan(0);
    }
  });

  it("does not use duplicate conflicting French complaint-intelligence subgroup names", () => {
    const values = Object.values(COMPLAINT_INTELLIGENCE_SUBGROUP_CANON);
    expect(new Set(values).size).toBe(values.length);
  });

  it("enterprise workflow label keys remain localized in French", () => {
    for (const key of ENTERPRISE_WORKFLOW_LABEL_KEYS) {
      const frVal = getByPath(fr, key);
      expect(typeof frVal, `${key} missing in fr.ts`).toBe("string");
      expect(String(frVal).trim().length).toBeGreaterThan(0);
      expect(String(frVal)).not.toMatch(/^[a-z]+\.[a-z]/);
    }
  });

  it("mobile navigation labels remain localized in French", () => {
    for (const key of MOBILE_NAV_LABEL_KEYS) {
      const frVal = getByPath(fr, key);
      expect(typeof frVal, `${key} missing in fr.ts`).toBe("string");
      expect(String(frVal).trim().length).toBeGreaterThan(0);
    }
  });

  it("disposition terminology anchor keys remain present and French", () => {
    for (const key of Object.values(DISPOSITION_TERMINOLOGY_ANCHOR_KEYS)) {
      const frVal = getByPath(fr, key);
      expect(typeof frVal, `${key} missing in fr.ts`).toBe("string");
      expect(String(frVal).trim().length).toBeGreaterThan(0);
    }
    expect(getByPath(fr, DISPOSITION_TERMINOLOGY_ANCHOR_KEYS.panelTitle)).toContain("Disposition");
    expect(getByPath(fr, DISPOSITION_TERMINOLOGY_ANCHOR_KEYS.saveDecision)).toMatch(/orientation/i);
    expect(getByPath(fr, DISPOSITION_TERMINOLOGY_ANCHOR_KEYS.outcomeLabel)).toMatch(/orientation/i);
  });

  it("complaint-intelligence subgroup keys remain wired in template catalog", () => {
    const catalogPath = join(import.meta.dirname, "../../lib/providerDocumentationTemplateCatalog.ts");
    const source = readFileSync(catalogPath, "utf8");
    const subgroupKeys = [
      "gi_abdominal",
      "respiratory_ent",
      "cardiac_vascular",
      "gu_renal",
      "msk_trauma",
      "infectious_ent",
      "endocrine_metabolic",
      "neurology_expansion",
    ];
    for (const key of subgroupKeys) {
      expect(source, `missing subgroup ${key} in template catalog`).toContain(`"${key}"`);
    }
  });

  it("forbidden mixed-language UI patterns are absent from scanned French workflow prefixes", () => {
    const scanned = collectStringLeaves(fr).filter(({ path }) =>
      MIXED_LANGUAGE_SCAN_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}.`)
      )
    );
    expect(scanned.length).toBeGreaterThan(20);
    for (const { path, value } of scanned) {
      for (const pattern of FORBIDDEN_MIXED_LANGUAGE_UI_PATTERNS) {
        if (pattern.test(value)) {
          const matched = value.match(pattern)?.[0] ?? "";
          if (matched && isApprovedAbbreviationToken(value, matched)) continue;
          expect(value, `Mixed-language UI leak at ${path}: ${value}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("operations handbook documentation scaffolding exists", () => {
    const repoRoot = join(import.meta.dirname, "../../../../..");
    const docs = [
      "docs/operations/french-terminology-canon.md",
      "docs/operations/french-terminology-risks.md",
      "docs/operations/french-handbook-style-guide.md",
      "docs/operations/french-workflow-inventory.md",
    ];
    for (const doc of docs) {
      const content = readFileSync(join(repoRoot, doc), "utf8");
      expect(content.length).toBeGreaterThan(500);
      expect(content).toContain("M-BOOK.FR.1");
    }
  });

  it("French catalog retains complaint-intelligence section labels", () => {
    const keys = [
      "providerDocumentationWorkspace.complaintIntelSectionHpi",
      "providerDocumentationWorkspace.complaintIntelSectionRosRedFlags",
      "providerDocumentationWorkspace.complaintIntelSectionMdmDisposition",
      "providerDocumentationWorkspace.complaintIntelSectionReassessment",
      "providerDocumentationWorkspace.complaintIntelSectionDisposition",
    ];
    for (const key of keys) {
      const frVal = getByPath(fr, key);
      expect(typeof frVal, `${key} removed from fr.ts`).toBe("string");
      expect(String(frVal).length).toBeGreaterThan(10);
    }
  });
});
