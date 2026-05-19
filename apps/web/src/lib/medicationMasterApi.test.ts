import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "medicationMasterApi.ts"),
  "utf8"
);

const reviewSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/admin/MedicationMasterValidationReview.tsx"),
  "utf8"
);

describe("medicationMasterApi — read-only explorer", () => {
  it("uses GET only for medication-master fetch helper", () => {
    expect(apiSource).toMatch(/method:\s*["']GET["']/);
    expect(apiSource).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
  });

  it("exposes only search, concept detail, and formulary list endpoints", () => {
    expect(apiSource).toContain('export async function searchMedicationMaster');
    expect(apiSource).toContain('export async function fetchMedicationMasterConcept');
    expect(apiSource).toContain('export async function fetchMedicationMasterFormulary');
    expect(apiSource).not.toMatch(/export async function (create|update|delete|activate|promote)/i);
  });

  it("concept detail type is marked read-only", () => {
    expect(apiSource).toContain("readOnly: true");
    expect(apiSource).toContain("validationWarnings");
  });
});

describe("MedicationMasterValidationReview — no mutations", () => {
  it("does not import order, MAR, billing, or inventory APIs", () => {
    expect(reviewSource).not.toMatch(/apiFetch|placeOrder|administer|captureBilling|inventory/i);
    expect(reviewSource).not.toMatch(/<button[^>]*type=["']submit["']/);
    expect(reviewSource).not.toMatch(/<input|<textarea|<select/i);
  });
});
