import { z } from "zod";

const externalEvidenceSchema = z.object({
  sourceType: z.enum([
    "ENCOUNTER",
    "PATIENT",
    "TRIAGE",
    "VITAL",
    "ORDER",
    "RESULT",
    "MEDICATION",
    "DIAGNOSIS",
    "NOTE",
    "MDM",
    "DISPOSITION",
    "FOLLOW_UP",
    "PROCEDURE",
  ]),
  label: z.string().max(500),
  value: z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
});

const externalActionSchema = z.object({
  actionType: z.enum(["REVIEW", "NAVIGATE"]),
  targetSection: z.enum([
    "intake",
    "medical-evaluation",
    "orders",
    "medications",
    "results",
    "diagnoses",
    "clinical-data",
    "nursing",
    "notes",
    "prescriptions",
    "follow-up",
    "summary",
  ]),
  label: z.string().max(500),
});

export const externalClinicalSuggestionSchema = z.object({
  category: z.enum([
    "CLINICAL_SAFETY",
    "DIAGNOSTIC_GAP",
    "RESULT_FOLLOWUP",
    "MEDICATION_CONSIDERATION",
    "ORDER_CONSIDERATION",
    "REASSESSMENT_GAP",
    "DOCUMENTATION_GAP",
    "MDM_GAP",
    "DISPOSITION_GAP",
    "DISCHARGE_SAFETY",
    "FOLLOW_UP_GAP",
    "CONTRADICTION",
    "DUPLICATION",
    "PENDING_ACTION",
  ]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  title: z.string().max(200),
  summary: z.string().max(2000),
  reasoningSummary: z.string().max(2000),
  evidence: z.array(externalEvidenceSchema).max(20),
  recommendedActions: z.array(externalActionSchema).max(5),
  clinicalDisclaimer: z.string().max(1000),
});

export const externalClinicalReviewSchema = z.object({
  suggestions: z.array(externalClinicalSuggestionSchema).max(50),
});

export type ExternalClinicalReview = z.infer<typeof externalClinicalReviewSchema>;

export const EXTERNAL_CLINICAL_REVIEW_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "category",
          "priority",
          "title",
          "summary",
          "reasoningSummary",
          "evidence",
          "recommendedActions",
          "clinicalDisclaimer",
        ],
        properties: {
          category: {
            type: "string",
            enum: [
              "CLINICAL_SAFETY",
              "DIAGNOSTIC_GAP",
              "RESULT_FOLLOWUP",
              "MEDICATION_CONSIDERATION",
              "ORDER_CONSIDERATION",
              "REASSESSMENT_GAP",
              "DOCUMENTATION_GAP",
              "MDM_GAP",
              "DISPOSITION_GAP",
              "DISCHARGE_SAFETY",
              "FOLLOW_UP_GAP",
              "CONTRADICTION",
              "DUPLICATION",
              "PENDING_ACTION",
            ],
          },
          priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          title: { type: "string" },
          summary: { type: "string" },
          reasoningSummary: { type: "string" },
          evidence: {
            type: "array",
            maxItems: 20,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["sourceType", "label", "value"],
              properties: {
                sourceType: {
                  type: "string",
                  enum: [
                    "ENCOUNTER",
                    "PATIENT",
                    "TRIAGE",
                    "VITAL",
                    "ORDER",
                    "RESULT",
                    "MEDICATION",
                    "DIAGNOSIS",
                    "NOTE",
                    "MDM",
                    "DISPOSITION",
                    "FOLLOW_UP",
                    "PROCEDURE",
                  ],
                },
                label: { type: "string" },
                value: { type: ["string", "number", "boolean", "null"] },
              },
            },
          },
          recommendedActions: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["actionType", "targetSection", "label"],
              properties: {
                actionType: { type: "string", enum: ["REVIEW", "NAVIGATE"] },
                targetSection: {
                  type: "string",
                  enum: [
                    "intake",
                    "medical-evaluation",
                    "orders",
                    "medications",
                    "results",
                    "diagnoses",
                    "clinical-data",
                    "nursing",
                    "notes",
                    "prescriptions",
                    "follow-up",
                    "summary",
                  ],
                },
                label: { type: "string" },
              },
            },
          },
          clinicalDisclaimer: { type: "string" },
        },
      },
    },
  },
} as const;
