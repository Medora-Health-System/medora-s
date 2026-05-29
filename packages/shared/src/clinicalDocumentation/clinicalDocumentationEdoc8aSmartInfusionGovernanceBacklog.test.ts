import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDOC_8A_SMART_INFUSION_GOVERNANCE_BACKLOG_ID,
  EDOC_8A_SMART_INFUSION_GOVERNANCE_FUTURE_FIELD_NAMES,
  highAlertInfusionInitiationPayloadSchema,
  highAlertInfusionVerificationPayloadSchema,
  validateHighAlertInfusionPayloadForCard,
  HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
} from "./highAlertInfusionDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";

const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");
const payloadsSource = readFileSync(
  join(import.meta.dirname, "highAlertInfusionDocumentationPayloads.ts"),
  "utf8"
);
const registrySource = readFileSync(join(import.meta.dirname, "clinicalDocumentationRegistry.ts"), "utf8");
const backlogDoc = readFileSync(
  join(repoRoot, "docs/operations/edoc-8a-smart-infusion-governance-backlog.md"),
  "utf8"
);

const VERIFICATION_VALID = {
  verificationTime: "2026-05-28T14:00:00.000Z",
  medicationType: "HEPARIN",
  medicationName: "Heparin drip",
  concentration: "25k/500mL",
  orderedRate: "18 u/kg/hr",
  orderedDose: "1300 u/hr",
  weightBasedCalculationVerified: true,
  pumpProgrammingVerified: true,
  lineTracingVerified: true,
  patientVerified: true,
  providerOrderVerified: true,
  independentDoubleCheckPerformed: true,
};

const INITIATION_VALID_NO_PUMP = {
  startTime: "2026-05-28T14:30:00.000Z",
  medicationType: "INSULIN",
  medicationName: "Insulin drip",
  orderedRate: "2 u/hr",
  programmedRate: "2 u/hr",
  route: "IV",
  baselineHeartRate: 80,
  baselineBloodPressure: "120/80",
  baselineRespRate: 16,
  baselineSpo2: 98,
  providerOrderVerified: true,
  administrationStarted: true,
};

describe("EDOC.8A Smart Infusion Governance backlog (documentation only)", () => {
  it("high-alert infusion schemas pass without EDOC.8A smart pump governance fields", () => {
    expect(highAlertInfusionVerificationPayloadSchema.safeParse(VERIFICATION_VALID).success).toBe(
      true
    );
    expect(
      highAlertInfusionInitiationPayloadSchema.safeParse(INITIATION_VALID_NO_PUMP).success
    ).toBe(true);
    const withUndocumentedFields = {
      ...VERIFICATION_VALID,
      smartPumpLibraryVerified: true,
      drugLibraryVersion: "v9",
      guardrailOverrideUsed: false,
      overrideReason: "n/a",
    };
    expect(highAlertInfusionVerificationPayloadSchema.safeParse(withUndocumentedFields).success).toBe(
      true
    );
    const parsed = highAlertInfusionVerificationPayloadSchema.parse(withUndocumentedFields);
    for (const field of EDOC_8A_SMART_INFUSION_GOVERNANCE_FUTURE_FIELD_NAMES) {
      expect(parsed).not.toHaveProperty(field);
    }
  });

  it("pumpIdentifier is optional on initiation — not required in EDOC.8", () => {
    const shape = highAlertInfusionInitiationPayloadSchema.shape;
    expect(shape.pumpIdentifier.isOptional()).toBe(true);
    const result = validateHighAlertInfusionPayloadForCard(
      HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
      INITIATION_VALID_NO_PUMP
    );
    expect(result.ok).toBe(true);
  });

  it("EDOC.8A future field names are documented and not in current Zod shapes", () => {
    expect(EDOC_8A_SMART_INFUSION_GOVERNANCE_FUTURE_FIELD_NAMES).toEqual([
      "smartPumpLibraryVerified",
      "drugLibraryVersion",
      "guardrailOverrideUsed",
      "overrideReason",
    ]);
    const verificationKeys = Object.keys(highAlertInfusionVerificationPayloadSchema.shape);
    const initiationKeys = Object.keys(highAlertInfusionInitiationPayloadSchema.shape);
    for (const field of EDOC_8A_SMART_INFUSION_GOVERNANCE_FUTURE_FIELD_NAMES) {
      expect(verificationKeys).not.toContain(field);
      expect(initiationKeys).not.toContain(field);
    }
  });

  it("source contains EDOC.8A backlog markers", () => {
    expect(payloadsSource).toContain(EDOC_8A_SMART_INFUSION_GOVERNANCE_BACKLOG_ID);
    expect(payloadsSource).toContain("Smart Infusion Governance");
    expect(payloadsSource).toContain("smartPumpLibraryVerified");
    expect(registrySource).toContain("smart_pump_future");
    expect(registrySource).toContain("pump_governance_future");
    expect(backlogDoc).toContain("EDOC.8A");
    expect(backlogDoc).toContain("guardrailOverrideUsed");
  });

  it("registry tags are informational only — cards remain AVAILABLE", () => {
    const verification = getClinicalDocumentationCardById(HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID);
    const initiation = getClinicalDocumentationCardById(HIGH_ALERT_INFUSION_INITIATION_CARD_ID);
    expect(verification?.implementationStatus).toBe("AVAILABLE");
    expect(initiation?.implementationStatus).toBe("AVAILABLE");
    expect(verification?.tags).toContain("smart_pump_future");
    expect(initiation?.tags).toContain("pump_governance_future");
  });

  it("no Prisma migration added for EDOC.8A", () => {
    const migrationsDir = join(repoRoot, "apps/api/prisma/migrations");
    const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    const edoc8aMigrations = migrationFolders.filter((name) =>
      /edoc.?8a|smart.?infusion|pump.?governance/i.test(name)
    );
    expect(edoc8aMigrations).toEqual([]);
    expect(payloadsSource).not.toMatch(/prisma\.schema/i);
    expect(backlogDoc.toLowerCase()).toContain("no migration");
  });
});
