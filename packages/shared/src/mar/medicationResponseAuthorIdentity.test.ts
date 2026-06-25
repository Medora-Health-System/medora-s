import { describe, expect, it } from "vitest";
import {
  collectMedicationResponseAuthorUserIds,
  enrichParsedMarMedicationResponseAuthor,
  resolveMedicationResponseAuthorIdentity,
} from "./medicationResponseAuthorIdentity.js";
import {
  buildMarMedicationResponseNotes,
  parseMarMedicationResponseNotes,
} from "./marMedicationResponseGovernance.js";
import {
  resolveMedicationResponseDocumentedByLabel,
} from "./medicationResponseDocumentedByDisplay.js";
import {
  buildMedicationResponseSummaryFieldsFromParsed,
} from "./medicationResponseSummaryFormat.js";

describe("medicationResponseAuthorIdentity", () => {
  it("persists documentedByUserId on submit", () => {
    const identity = resolveMedicationResponseAuthorIdentity({
      id: "user-ep",
      firstName: "Elizabeth",
      lastName: "Posada",
      email: "eposada@clinic.test",
    });
    const built = buildMarMedicationResponseNotes(null, {
      responseCode: "PAIN_REDUCED",
      documentedAt: "2026-06-25T17:14:00.000Z",
      documentedByUserId: identity.documentedByUserId,
      documentedByName: identity.documentedByName,
      documentedByDisplayName: identity.documentedByDisplayName,
      documentedByInitials: identity.documentedByInitials,
      documentedBy: identity.documentedByDisplayName,
    });
    expect(built.ok).toBe(true);
    const parsed = parseMarMedicationResponseNotes(built.ok ? built.notes : "")[0];
    expect(parsed?.documentedByUserId).toBe("user-ep");
  });

  it("persists documentedByDisplayName on submit", () => {
    const identity = resolveMedicationResponseAuthorIdentity({
      id: "user-ep",
      firstName: "Elizabeth",
      lastName: "Posada RN",
    });
    expect(identity.documentedByDisplayName).toBe("Elizabeth Posada RN");
  });

  it("persists documentedByInitials as EP from first and last name", () => {
    const identity = resolveMedicationResponseAuthorIdentity({
      id: "user-ep",
      firstName: "Elizabeth",
      lastName: "Posada",
    });
    expect(identity.documentedByInitials).toBe("EP");
  });

  it("derives identity from email when name parts are missing", () => {
    const identity = resolveMedicationResponseAuthorIdentity({
      id: "user-email",
      firstName: null,
      lastName: null,
      email: "elizabeth.posada@clinic.test",
    });
    expect(identity.documentedByDisplayName).toBe("elizabeth posada");
    expect(identity.documentedByInitials).toBe("EP");
  });

  it("enriches legacy responses from documentedByUserId", () => {
    const response = {
      responseCode: "PAIN_REDUCED" as const,
      responseDetail: null,
      responseTime: "2026-06-25T16:01:00.000Z",
      documentedAt: "2026-06-25T17:14:00.000Z",
      painBefore: 8,
      painAfter: 3,
      painResponseTrend: "IMPROVED" as const,
      noAdverseReaction: true,
      nausea: null,
      vomiting: null,
      itching: null,
      sedation: null,
      dizziness: null,
      constipation: null,
      respiratoryDepression: null,
      documentedBy: null,
      documentedByInitials: null,
      documentedByDisplayName: null,
      documentedByUserId: "user-ep",
      documentedByName: null,
    };
    const enriched = enrichParsedMarMedicationResponseAuthor(response, new Map([
      ["user-ep", { id: "user-ep", firstName: "Elizabeth", lastName: "Posada" }],
    ]));
    expect(resolveMedicationResponseDocumentedByLabel(enriched)).toBe("EP");
  });

  it("collects author user ids from parsed responses", () => {
    expect(
      collectMedicationResponseAuthorUserIds([
        { documentedByUserId: "a" },
        { documentedByUserId: "b" },
        { documentedByUserId: "a" },
      ])
    ).toEqual(["a", "b"]);
  });
});

describe("medicationResponseRecordIntegrity summary formatting", () => {
  const ketorolacResponse = {
    responseCode: "PAIN_REDUCED" as const,
    responseDetail: "Well tolerated by patient",
    responseTime: "2026-06-25T16:01:00.000Z",
    documentedAt: "2026-06-25T17:14:00.000Z",
    painBefore: 8,
    painAfter: 3,
    painResponseTrend: "IMPROVED" as const,
    noAdverseReaction: true,
    nausea: null,
    vomiting: null,
    itching: null,
    sedation: null,
    dizziness: null,
    constipation: null,
    respiratoryDepression: null,
    documentedBy: "Elizabeth Posada RN",
    documentedByInitials: "EP",
    documentedByDisplayName: "Elizabeth Posada RN",
    documentedByUserId: "user-ep",
    documentedByName: "Elizabeth Posada RN",
  };

  it("summary card shows initials instead of Unknown", () => {
    const fields = buildMedicationResponseSummaryFieldsFromParsed({
      response: ketorolacResponse,
      outcomeLabel: "Response: Pain reduced",
      responseTimePrefix: "Response time",
      documentedAtPrefix: "Documented",
      documentedByPrefix: "By",
      documentedByUnknownLabel: "By: Unknown",
      painPrefix: "Pain",
      painTrendPrefix: "Pain trend",
      sideEffectsPrefix: "Side effects",
      commentPrefix: "Comment",
      painTrendLabel: "Improved",
      sideEffectLabels: ["No adverse reaction"],
      formatInstant: (iso) => iso ?? null,
    });
    expect(fields.some((field) => field.text === "By: EP")).toBe(true);
    expect(fields.some((field) => field.text.includes("Unknown"))).toBe(false);
  });

  it("Unknown only appears when no identity exists", () => {
    const fields = buildMedicationResponseSummaryFieldsFromParsed({
      response: {
        ...ketorolacResponse,
        documentedBy: null,
        documentedByInitials: null,
        documentedByDisplayName: null,
        documentedByName: null,
        documentedByUserId: null,
      },
      outcomeLabel: "Response: Pain reduced",
      responseTimePrefix: "Response time",
      documentedAtPrefix: "Documented",
      documentedByPrefix: "By",
      documentedByUnknownLabel: "By: Unknown",
      painPrefix: "Pain",
      painTrendPrefix: "Pain trend",
      sideEffectsPrefix: "Side effects",
      commentPrefix: "Comment",
      painTrendLabel: null,
      sideEffectLabels: [],
      formatInstant: (iso) => iso ?? null,
    });
    expect(fields.some((field) => field.text === "By: Unknown")).toBe(true);
  });

  it("includes pain, side effects, comment, and times in summary", () => {
    const fields = buildMedicationResponseSummaryFieldsFromParsed({
      response: ketorolacResponse,
      outcomeLabel: "Response: Pain reduced",
      responseTimePrefix: "Response time",
      documentedAtPrefix: "Documented",
      documentedByPrefix: "By",
      documentedByUnknownLabel: "By: Unknown",
      painPrefix: "Pain",
      painTrendPrefix: "Pain trend",
      sideEffectsPrefix: "Side effects",
      commentPrefix: "Comment",
      painTrendLabel: "Improved",
      sideEffectLabels: ["No adverse reaction"],
      formatInstant: (iso) => iso ?? null,
    });
    const text = fields.map((field) => field.text).join("\n");
    expect(text).toContain("Pain: 8/10 → 3/10");
    expect(text).toContain("Side effects: No adverse reaction");
    expect(text).toContain("Comment: Well tolerated by patient");
    expect(text).toContain("Response time:");
    expect(text).toContain("Documented:");
  });
});
