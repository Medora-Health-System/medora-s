import type { ChartExportManifest } from "./chart-export.service";
import { ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION } from "./chart-export.service";
import { escapeHtml, renderEncounterChartExportHtml } from "./chart-export-html.util";
import { computeObservationStaySummaryForExport } from "@medora/shared";

function baseManifest(overrides: Partial<ChartExportManifest> = {}): ChartExportManifest {
  const defaults: ChartExportManifest = {
    manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
    generatedAt: "2026-01-01T12:00:00.000Z",
    livePreview: false,
    caps: {
      clinicalTimeline: 100,
      auditTimeline: 200,
      diagnoses: 200,
      followUps: 100,
    },
    facility: { id: "fac-1", name: "Test Facility" },
    encounter: {
      id: "enc-1",
      type: "EMERGENCY",
      billingClassification: "EMERGENCY_DEPARTMENT",
      status: "CLOSED",
      workflowState: "DISCHARGED",
      visitReason: null,
      chiefComplaint: "Test complaint",
      roomLabel: "1",
      physicianAssigned: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T01:00:00.000Z",
      admittedAt: null,
      dischargedAt: "2026-01-01T02:00:00.000Z",
      dischargeStatus: "HOME",
      closedByDisplayFr: "Dr Test",
      closedAt: "2026-01-01T02:00:00.000Z",
      nursingAssessment: null,
      dischargeSummaryJson: null,
      admissionSummaryJson: null,
      treatmentPlan: null,
      clinicianImpression: null,
      providerNote: null,
      providerDocumentation: {
        status: "SIGNED",
        signedAt: null,
        signedByDisplayFr: null,
        workspaceNote: null,
      },
      nursingDocumentation: null,
      providerAddenda: [],
      encounterNotes: [],
      clinicalDocumentationEntries: [],
      observationStay: computeObservationStaySummaryForExport({
        encounterType: "EMERGENCY",
        admittedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        dischargedAt: "2026-01-01T02:00:00.000Z",
      }),
    },
    patient: {
      id: "pat-1",
      mrn: "MRN-1",
      globalMrn: "GM-1",
      nationalId: null,
      firstName: "Jane",
      lastName: "Roe",
      dob: "1980-01-01T00:00:00.000Z",
      sex: "FEMALE",
      sexAtBirth: "FEMALE",
    },
    triage: null,
    vitalsHistory: { entries: [] },
    diagnoses: { items: [], total: 0 },
    documentationHistory: { entries: [] },
    orders: [],
    results: [],
    medicationAdministrations: [],
    procedures: { entries: [] },
    ivAccess: { entries: [] },
    clinicalTimeline: { items: [], capped: false },
    unifiedTimeline: null,
    auditTimelineSummary: { items: [], capped: false },
    followUps: { items: [] },
      deferredDomains: [{ domain: "pathways", reason: "deferred_to_phase_5f" }],
      edClinicalTimeline: null,
    };
  return { ...defaults, ...overrides };
}

describe("chart-export-html.util", () => {
  it("includes observation stay operational block for applicable INPATIENT manifest", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          type: "INPATIENT",
          admittedAt: "2026-01-01T08:00:00.000Z",
          dischargedAt: "2026-01-01T20:00:00.000Z",
          observationStay: computeObservationStaySummaryForExport({
            encounterType: "INPATIENT",
            admittedAt: "2026-01-01T08:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            dischargedAt: "2026-01-01T20:00:00.000Z",
          }),
        },
      })
    );
    expect(html).toContain("Observation stay (operational)");
    expect(html).toContain("observation_short_stay");
    expect(html).toContain("Duration (hours, rounded)");
    expect(html).toContain("12");
  });

  it("renders legacy manifests that omit observationStay without throwing", () => {
    const m = baseManifest();
    const { observationStay: _drop, ...encWithoutObs } = m.encounter;
    expect(() =>
      renderEncounterChartExportHtml({ ...m, encounter: encWithoutObs as ChartExportManifest["encounter"] })
    ).not.toThrow();
    const html = renderEncounterChartExportHtml({
      ...m,
      encounter: encWithoutObs as ChartExportManifest["encounter"],
    });
    expect(html).not.toContain("Observation stay (operational)");
  });

  it("escapeHtml neutralizes angle brackets and quotes", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("includes live preview disclaimer when livePreview is true", () => {
    const html = renderEncounterChartExportHtml(baseManifest({ livePreview: true }));
    expect(html).toContain("Live preview — not a finalized legal record export");
    expect(html).toContain("Encounter chart export (live preview)");
  });

  it("includes generated (closed) notice when livePreview is false", () => {
    const html = renderEncounterChartExportHtml(baseManifest({ livePreview: false }));
    expect(html).toContain("Generated encounter chart export");
    expect(html).toContain("not an immutable legal snapshot");
  });

  it("lists deferred domains", () => {
    const html = renderEncounterChartExportHtml(baseManifest());
    expect(html).toContain("pathways");
    expect(html).toContain("deferred_to_phase_5f");
  });

  it("does not embed raw unescaped script from clinical strings", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          chiefComplaint: '<img src=x onerror=alert(1)>',
        },
      })
    );
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("does not include dataBase64 in HTML for result attachments (manifest has none)", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        results: [
          {
            orderItemId: "oi-1",
            catalogItemType: "LAB_TEST",
            resultText: "OK",
            criticalValue: false,
            verifiedAt: null,
            acknowledgedByProviderAt: null,
            acknowledgedByDisplayFr: null,
            enteredByDisplayFr: null,
            attachmentCount: 1,
            attachmentMetadata: [{ fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10 }],
            resultDataKeys: ["structured"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      })
    );
    expect(html).toContain("a.pdf");
    expect(html).not.toMatch(/dataBase64/i);
  });

  it("embeds JSON only inside escaped pre blocks", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          nursingAssessment: { evil: "</pre><script>bad</script>" },
        },
      })
    );
    expect(html).not.toContain("</pre><script>");
    expect(html).toContain("&lt;/pre&gt;");
  });

  it("renders initial nursing documentation from structured manifest field", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          nursingDocumentation: {
            initialAssessment: {
              title: "Initial nursing assessment",
              documentedBy: "Marie Infirmière",
              documentedAt: "2026-05-18T09:30:00.000Z",
              sections: [
                {
                  id: "etatGeneral",
                  label: "General appearance",
                  text: "Patient calme, peau chaude et sèche.",
                },
              ],
            },
            dischargeExecution: {
              documentedBy: "Marie Infirmière",
              documentedAt: "2026-05-18T14:00:00.000Z",
              executionNote: "Consignes de sortie revues avec le patient.",
            },
          },
        },
      })
    );
    expect(html).toContain("Initial nursing documentation");
    expect(html).toContain("Initial nursing assessment");
    expect(html).toContain("Patient calme, peau chaude et sèche.");
    expect(html).toContain("Nursing discharge documentation");
    expect(html).toContain("Consignes de sortie revues avec le patient.");
  });

  it("renders documented procedures with locale-aware summary fields and full payload", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        procedures: {
          entries: [
            {
              id: "proc-1",
              createdAt: "2026-05-18T10:05:00.000Z",
              eventType: "PROCEDURE_DOCUMENTED",
              payloadJson: {
                procedureType: "LACERATION_REPAIR",
                performedAt: "2026-05-18T10:00:00.000Z",
                site: "Main gauche",
              },
              createdByDisplayFr: "Dr Alice Test",
              procedureNameFr: "Suture de lacération (documentée)",
              procedureNameEn: "Laceration repair (documented)",
              performedAtIso: "2026-05-18T10:00:00.000Z",
              documentedAtIso: "2026-05-18T10:05:00.000Z",
              performedByDisplayFr: "Dr Alice Test",
              documentedByDisplayFr: "Dr Alice Test",
              status: "COMPLETED",
              clinicalSummaryFr: "Suture de lacération (documentée) — Site : Main gauche",
              clinicalSummaryEn: "Laceration repair (documented) — Site : Main gauche",
              documentationRole: "PROVIDER",
              documentationRoleFr: "Documentation médicale",
            },
          ],
        },
      })
    );
    expect(html).toContain("Section");
    expect(html).toContain("Provider documentation");
    expect(html).toContain("Procedure");
    expect(html).toContain("Laceration repair (documented)");
    expect(html).toContain("Performed at");
    expect(html).toContain("2026-05-18T10:00:00.000Z");
    expect(html).toContain("Documented by");
    expect(html).toContain("Dr Alice Test");
    expect(html).toContain("Status");
    expect(html).toContain("Completed");
    expect(html).not.toContain("Volet");
    expect(html).not.toContain("Réalisée le");
    expect(html).toContain("LACERATION_REPAIR");
  });

  it("renders French procedure labels when locale is fr", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        procedures: {
          entries: [
            {
              id: "proc-fr",
              createdAt: "2026-05-18T10:05:00.000Z",
              eventType: "PROCEDURE_DOCUMENTED",
              payloadJson: { procedureType: "REDUCTION" },
              createdByDisplayFr: "Dr Alice Test",
              procedureNameFr: "Réduction (documentée)",
              procedureNameEn: "Reduction (documented)",
              performedAtIso: "2026-05-18T10:00:00.000Z",
              documentedAtIso: "2026-05-18T10:05:00.000Z",
              performedByDisplayFr: "Dr Alice Test",
              documentedByDisplayFr: "Dr Alice Test",
              status: "COMPLETED",
              clinicalSummaryFr: "Réduction (documentée) — Statut : terminée",
              clinicalSummaryEn: "Reduction (documented) — Status: completed",
              documentationRole: "PROVIDER",
              documentationRoleFr: "Documentation médicale",
            },
          ],
        },
      }),
      { locale: "fr" }
    );
    expect(html).toContain("Volet");
    expect(html).toContain("Réalisée le");
  });

  it("renders full encounter note body in legal export HTML (MEDNOTE.1A)", () => {
    const fullBody =
      "Patient reassessed. Vitals stable. Full legal narrative must appear in export without truncation.";
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          encounterNotes: [
            {
              id: "note-legal-1",
              noteType: "NURSING",
              body: fullBody,
              authorDisplayName: "Marie Infirmière",
              authorRoleTitle: "Infirmier(ère)",
              createdAt: "2026-05-28T14:30:00.000Z",
            },
          ],
        },
      })
    );
    expect(html).toContain("Encounter notes");
    expect(html).toContain(fullBody);
    expect(html).toContain("Marie Infirmière");
    expect(html).toContain("Infirmier(ère)");
    expect(html).toContain("NURSING");
  });

  it("renders voided and amended encounter notes in legal export HTML (MEDNOTE.2)", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          encounterNotes: [
            {
              id: "note-original",
              noteType: "PROVIDER",
              body: "Chest pain improved.",
              authorDisplayName: "Dr A",
              authorRoleTitle: "Provider",
              createdAt: "2026-05-28T08:15:00.000Z",
              voidedAt: "2026-05-28T09:00:00.000Z",
              voidReasonCode: "ENTERED_IN_ERROR",
            },
            {
              id: "note-amend",
              noteType: "PROVIDER",
              body: "Correction: chest pain persisted after nitroglycerin.",
              authorDisplayName: "Dr A",
              authorRoleTitle: "Provider",
              createdAt: "2026-05-28T08:42:00.000Z",
              isAmendment: true,
              amendmentReason: "Correction after reassessment",
              amendedFromNoteId: "note-original",
            },
          ],
        },
      })
    );
    expect(html).toContain("[VOIDED]");
    expect(html).toContain("ENTERED_IN_ERROR");
    expect(html).toContain("[AMENDMENT]");
    expect(html).toContain("Chest pain improved.");
    expect(html).toContain("Correction: chest pain persisted after nitroglycerin.");
  });

  it("renders structured clinical documentation key/value summary (EDOC.2)", () => {
    const html = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          clinicalDocumentationEntries: [
            {
              id: "edoc-1",
              encounterId: "enc-1",
              category: "OBSERVATION_DOCUMENTATION",
              cardId: "edoc_basic_structured_v1",
              cardTitleEn: "Structured Entry — Basic",
              cardTitleFr: "Saisie structurée — de base",
              authorUserId: "user-rn-1",
              authorDisplayName: "Marie Infirmière",
              authorRoleTitle: "Infirmier(ère)",
              createdAt: "2026-05-28T15:00:00.000Z",
              payloadJson: { items: [{ key: "Pain", value: "2/10" }] },
              payloadSummary: [{ key: "Pain", value: "2/10" }],
              payloadSummaryEn: [{ key: "Pain", value: "2/10" }],
              payloadSummaryFr: [{ key: "Pain", value: "2/10" }],
              voidedAt: null,
              requiresWitnessSignature: false,
              witnessStatus: "NOT_REQUIRED",
              witnessedAt: null,
              witnessedByUserId: null,
              witnessDisplayName: null,
              witnessRoleTitle: null,
            },
          ],
        },
      })
    );
    expect(html).toContain("Clinical documentation (structured)");
    expect(html).toContain("Pain");
    expect(html).toContain("2/10");
    expect(html).toContain("Marie Infirmière");
  });

  it("default clinical documentation HTML export uses English, not French (EDOC.I18N.1)", () => {
    const nihssPayload = {
      assessedAt: "2026-05-28T17:00:00.000Z",
      levelOfConsciousness: 0,
      locQuestions: 1,
      locCommands: 0,
      bestGaze: 0,
      visualFields: 0,
      facialPalsy: 1,
      motorArmLeft: 2,
      motorArmRight: 0,
      motorLegLeft: 1,
      motorLegRight: 0,
      limbAtaxia: 0,
      sensory: 0,
      bestLanguage: 0,
      dysarthria: 0,
      extinctionInattention: 0,
      totalScore: 5,
    };
    const legacyEntry = {
      id: "edoc-legacy-fr",
      encounterId: "enc-1",
      category: "STROKE_DOCUMENTATION",
      cardId: "stroke_nihss",
      cardTitleEn: "NIHSS",
      cardTitleFr: "NIHSS",
      authorUserId: "user-rn-1",
      authorDisplayName: "Marie Infirmière",
      authorRoleTitle: "RN",
      createdAt: "2026-05-28T15:00:00.000Z",
      payloadJson: nihssPayload,
      payloadSummary: [{ key: "Score NIHSS total", value: "5" }],
      voidedAt: null,
      requiresWitnessSignature: false,
      witnessStatus: "NOT_REQUIRED",
      witnessedAt: null,
      witnessedByUserId: null,
      witnessDisplayName: null,
      witnessRoleTitle: null,
    };
    const htmlDefault = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          clinicalDocumentationEntries: [legacyEntry],
        },
      })
    );
    expect(htmlDefault).toContain("NIHSS total score");
    expect(htmlDefault).not.toContain("Score NIHSS total");
    const htmlFr = renderEncounterChartExportHtml(
      baseManifest({
        encounter: {
          ...baseManifest().encounter,
          clinicalDocumentationEntries: [legacyEntry],
        },
      }),
      { locale: "fr" }
    );
    expect(htmlFr).toContain("Score NIHSS total");
  });
});
