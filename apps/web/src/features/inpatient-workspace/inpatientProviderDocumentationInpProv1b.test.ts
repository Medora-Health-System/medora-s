/**
 * INP.PROV.1B — Provider Documentation workspace redesign: source-level guards.
 * Protects layout contract, PROVIDER authorship, append-only assistance, and engine reuse.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canAuthorInpatientProviderDocumentation } from "@medora/shared";
import { inpatientProviderDocumentationInpProv1bEn } from "@/i18n/messages/inpatientProviderDocumentationInpProv1b.en";
import { inpatientProviderDocumentationInpProv1bFr } from "@/i18n/messages/inpatientProviderDocumentationInpProv1b.fr";
import {
  buildProviderSmartAssistReview,
  buildProviderSmartAssistSuggestions,
  projectRecentLabsFromSynthesis,
} from "./providerDocumentationSmartAssistInpProv1b";
import {
  emptyProgressSoapSections,
  parseProgressNoteSoapText,
  serializeProgressNoteSoapText,
} from "./providerProgressNoteSoapInpProv1b";

const featureDir = import.meta.dirname;
const webSrc = join(featureDir, "../..");

function read(rel: string): string {
  return readFileSync(join(featureDir, rel), "utf8");
}

const workspace = read("InpatientProviderDocumentationWorkspaceInpProv1b.tsx");
/** Source without the leading documentation block, for "must not render X" guards. */
const workspaceBody = workspace.replace(/^[\s\S]*?\*\/\n/, "");

function keyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("INP.PROV.1B workspace layout", () => {
  it("renders one workspace root with the three-column grid", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-workspace"');
    expect(workspace).toContain(
      '"minmax(180px, 0.2fr) minmax(0, 1.15fr) minmax(220px, 0.55fr)"'
    );
  });

  it("mounts notes navigator, editor and right rail cards", () => {
    // Right-rail / orders panels go through the local PanelCard shell, which forwards testId.
    expect(workspace).toContain("<section ref={panelRef} data-testid={testId} style={CARD}>");
    for (const testId of [
      "inp-prov-1b-notes-navigator",
      "inp-prov-1b-new-note",
      "inp-prov-1b-show-all-notes",
      "inp-prov-1b-editor",
      "inp-prov-1b-smart-assist",
      "inp-prov-1b-patient-context",
      "inp-prov-1b-recent-labs",
      "inp-prov-1b-recent-notes",
      "inp-prov-1b-encounter-orders",
    ]) {
      expect(workspace).toContain(`"${testId}"`);
    }
  });

  it("keeps the H&P as a synthetic navigator row instead of a second note store", () => {
    expect(workspace).toContain('const HP_LIST_ID = "__hp__"');
    expect(workspace).toContain("doc?.hpDraft");
  });

  it("exposes the note-type selector and both header actions", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-note-type"');
    expect(workspace).toContain('data-testid="inp-prov-1b-datetime"');
    expect(workspace).toContain('data-testid="inp-prov-1b-sign-save"');
    expect(workspace).toContain('data-testid="inp-prov-1b-save-draft"');
  });

  it("offers only the two durable authoring note types", () => {
    expect(workspace).toContain('type NoteType = "PROGRESS" | "HP"');
    expect(workspace).toContain('const NOTE_TYPES: NoteType[] = ["PROGRESS", "HP"]');
    expect(workspaceBody).not.toContain("ASSESSMENT_PLAN");
    expect(workspaceBody).not.toContain("CONSULT");
    expect(workspaceBody).not.toContain("inp-prov-1b-assessment-plan-host");
    expect(workspaceBody).not.toContain("inp-prov-1b-consult-host");
    expect(Object.keys(inpatientProviderDocumentationInpProv1bEn.noteTypes)).toEqual([
      "PROGRESS",
      "HP",
    ]);
  });

  it("exposes the five center tabs and the six toolbar actions", () => {
    expect(workspace).toContain(
      'const CENTER_TABS: CenterTab[] = ["note", "templates", "smartPhrases", "flowsheets", "dictate"]'
    );
    expect(workspace).toContain("data-testid={`inp-prov-1b-tab-${tab}`}");
    for (const action of ["attach", "smart-assist", "insert", "orders", "undo", "redo"]) {
      expect(workspace).toContain(`data-testid="inp-prov-1b-toolbar-${action}"`);
    }
  });

  it("does not duplicate the patient identity / MRN / live vitals header", () => {
    expect(workspaceBody).not.toMatch(/firstName|lastName|dateOfBirth/);
    expect(workspaceBody).not.toMatch(/\bmrn\b/i);
    // Flowsheets projects synthesis vitals read-only; the live header stays in the chrome above.
    expect(workspaceBody).not.toMatch(/latestVitals|VitalsHistoryEntry|EnterpriseHospitalPatientHeader/);
    expect(workspaceBody).not.toContain("InpatientClinicalContextRail");
  });
});

describe("INP.PROV.1B authorship", () => {
  it("derives canAuthor from PROVIDER authority, writers flag and lock", () => {
    expect(workspace).toContain(
      "canAuthorInpatientProviderDocumentation(roles) && writersEnabled && !isLocked"
    );
    expect(workspace).toContain('data-testid="inp-prov-1b-view-only"');
    expect(canAuthorInpatientProviderDocumentation(["PROVIDER"])).toBe(true);
    expect(canAuthorInpatientProviderDocumentation(["RN"])).toBe(false);
    expect(canAuthorInpatientProviderDocumentation(["ADMIN"])).toBe(false);
  });

  it("blocks editing of signed notes and view-only sessions", () => {
    expect(workspace).toContain(
      'canAuthor && noteType === "PROGRESS" && Boolean(activeNote) && !isSignedStatus(activeNote?.status)'
    );
    expect(workspace).toContain("disabled={!canEditNote}");
    expect(workspace).toContain("disabled={!canSign || busy}");
  });

  it("writes only through the durable provider-workspace endpoints", () => {
    expect(workspace).toContain("saveProviderProgressNote");
    expect(workspace).toContain("signProviderProgressNote");
    expect(workspace).toContain("signProviderHp");
    expect(workspace).toContain("expectedVersion");
    expect(workspace).not.toContain("apiFetch(");
    expect(workspace).not.toMatch(/method:\s*"POST"/);
  });
});

describe("INP.PROV.1B SOAP + save behavior", () => {
  it("stores SOAP sections through the shared encoder, not a bespoke format", () => {
    expect(workspace).toContain('from "./providerProgressNoteSoapInpProv1b"');
    expect(workspace).toContain("parseProgressNoteSoapText");
    expect(workspace).toContain("text: serializeProgressNoteSoapText(sectionsRef.current)");
    expect(workspace).toContain("countProgressSoapCharacters");
    expect(workspace).not.toContain("## Subjective");
  });

  it("autosaves on a debounce and keeps an undo history bounded to 40 states", () => {
    expect(workspace).toContain("const HISTORY_LIMIT = 40");
    expect(workspace).toContain("slice(-HISTORY_LIMIT)");
    expect(workspace).toContain("persistProgressDraft(), 900");
  });

  it("round-trips an authored note through the encoder used by the workspace", () => {
    const sections = { ...emptyProgressSoapSections(), PLAN: "Continue current management." };
    expect(parseProgressNoteSoapText(serializeProgressNoteSoapText(sections))).toEqual(sections);
  });
});

describe("INP.PROV.1B assistance is append-only and never automatic", () => {
  it("dictation is Dragon-only: no browser speech recognition session", () => {
    expect(workspace).not.toMatch(/SpeechRecognition|webkitSpeechRecognition/);
    expect(workspace).not.toMatch(/dictate\.(listening|start|stop|unsupported)/);
    expect(workspace).not.toContain('data-testid="inp-prov-1b-dictate-start"');
    expect(workspace).not.toContain('data-testid="inp-prov-1b-dictate-stop"');
    for (const key of ["listening", "start", "stop", "unsupported"]) {
      expect(inpatientProviderDocumentationInpProv1bEn.dictate).not.toHaveProperty(key);
      expect(inpatientProviderDocumentationInpProv1bFr.dictate).not.toHaveProperty(key);
    }
  });

  it("keeps the Dragon focus affordance on every SOAP section", () => {
    expect(workspace).toContain("DictationFieldLabel");
    expect(workspace).toContain("dictationTargetId={`inp-prov-1b-soap-${key}`}");
    expect(workspace).toContain("id={`inp-prov-1b-soap-${key}`}");
    expect(workspace).toContain('data-dictation-ready={canEditNote ? "true" : undefined}');
  });

  it("the Dictate tab only focuses the currently focused SOAP section", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-dictate-focus"');
    expect(workspace).toContain("focusDictationTarget(`inp-prov-1b-soap-${focusedRef.current}`)");
    expect(workspace).toContain("document.getElementById(elementId)");
    expect(workspace).toContain("dictate.focusCopy");
    expect(workspace).toContain("dictate.focusAction");
  });

  it("appends dictated and assisted text without overwriting authored sections", () => {
    expect(workspace).toContain("appendDictationToSection");
    expect(workspace).not.toMatch(/\[focusedRef\.current\]:\s*transcript/);
  });

  it("has no decorative rich-text formatting toolbar", () => {
    expect(workspaceBody).not.toMatch(/toolbar-(bold|italic|underline)/);
    expect(workspaceBody).not.toMatch(/execCommand|contentEditable/);
    expect(Object.keys(inpatientProviderDocumentationInpProv1bEn.toolbar)).toEqual([
      "attach",
      "smartAssist",
      "insert",
      "orders",
      "undo",
      "redo",
    ]);
  });

  it("Smart Assist inserts only from an explicit click", () => {
    expect(workspace).toContain("onClick={() => insertSuggestion(suggestion)}");
    expect(workspace.match(/insertSuggestion/g)?.length).toBe(2);
    expect(workspace).toContain("setPreviewText(suggestion.insertText)");
  });

  it("suggestion builder is pure: it proposes text without mutating the note", () => {
    const sections = emptyProgressSoapSections();
    const suggestions = buildProviderSmartAssistSuggestions({
      sections,
      synthesis: {
        laboratories: {
          trending: [{ label: "K", current: "3.1", previous: "3.6", direction: "DOWN" }],
        },
      },
      orders: [],
      noteStatus: "DRAFT",
    });
    expect(suggestions.some((s) => s.kind === "lab")).toBe(true);
    expect(sections).toEqual(emptyProgressSoapSections());
  });

  it("only proposes suggestions that carry insertable text", () => {
    const suggestions = buildProviderSmartAssistSuggestions({
      sections: emptyProgressSoapSections(),
      synthesis: {
        overview: { primaryDiagnosis: "Community-acquired pneumonia" },
        laboratories: {
          trending: [{ label: "K", current: "3.1", previous: "3.6", direction: "DOWN" }],
        },
      },
      orders: [
        { id: "o1", status: "ACTIVE", items: [{ id: "i1", status: "ACTIVE", displayLabel: "CBC" }] },
      ],
      noteStatus: "DRAFT",
    });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(suggestion.insertText.trim()).not.toBe("");
    }
    // Empty-section completeness hints belong to Review, not to Suggestions.
    expect(suggestions.some((s) => s.id.startsWith("section-"))).toBe(false);
  });

  it("keeps empty-section completeness hints in the Review tab", () => {
    const review = buildProviderSmartAssistReview({
      sections: emptyProgressSoapSections(),
      noteStatus: "DRAFT",
      noteType: "PROGRESS",
    });
    expect(review.map((r) => r.code)).toContain("OBJECTIVE_EMPTY");
    expect(review.map((r) => r.code)).toContain("PLAN_EMPTY");
  });

  it("recent labs projection stays empty without chart data (no seeded examples)", () => {
    expect(projectRecentLabsFromSynthesis(null)).toEqual([]);
    expect(workspace).not.toMatch(/Dupont|Jean |Doe|123456/);
  });
});

describe("INP.PROV.1B engine reuse", () => {
  it("reuses the enterprise order composer instead of a local order form", () => {
    expect(workspace).toContain('import { CreateOrderModal } from "@/components/orders"');
    expect(workspace).toContain("fetchOrdersForEncounter");
    expect(workspace).toContain("inpatientFacilityMedicationOrderMode()");
    expect(workspace).toContain('data-testid="inp-prov-1b-add-order"');
  });

  it("delegates the H&P to the existing provider panel and hosts nothing else", () => {
    expect(workspace).toContain("InpatientProviderWorkspacePanel");
    expect(workspace).toContain('mode="historyPhysical"');
    expect(workspace).not.toContain("InpatientClinicalOpsPanel");
    expect(workspace).not.toContain('mode="consults"');
    expect(workspace).not.toContain('mode="problemsPlan"');
  });

  it("labels the order strip as encounter-scoped, not note-associated", () => {
    expect(workspace).toContain('testId="inp-prov-1b-encounter-orders"');
    expect(workspace).toContain("encounterOrders.title");
    expect(workspace).not.toContain("associatedOrders");
    expect(inpatientProviderDocumentationInpProv1bEn.encounterOrders.title).toBe("Encounter Orders");
    expect(inpatientProviderDocumentationInpProv1bFr.encounterOrders.title).not.toMatch(/associé/i);
    // Creating an order through the enterprise composer refreshes the strip.
    expect(workspace).toContain("setOrdersRefresh((n) => n + 1)");
  });

  it("reads allergies from the enterprise workspace bootstrap header, preferring it over the prop", () => {
    expect(workspace).toContain("fetchInpatientWorkspaceBootstrap");
    expect(workspace).toContain("bootstrapSettled.value.header?.allergiesSummary");
    expect(workspace).toContain(
      '(bootstrapAllergies ?? "").trim() || (allergiesSummary ?? "").trim() || null'
    );
    expect(workspace).toContain("patientContext.allergies`, allergiesLine");
  });

  it("projects Flowsheets from real synthesis vitals and intake/output", () => {
    expect(workspace).toContain('data-testid="inp-prov-1b-flowsheets"');
    expect(workspace).toContain("const flowsheetVitals = synthesis?.vitals ?? []");
    expect(workspace).toContain("const flowsheetIo = synthesis?.intakeOutput ?? null");
    for (const field of ["intake24hMl", "output24hMl", "balance24hMl"]) {
      expect(workspace).toContain(`flowsheetIo?.${field}`);
    }
    expect(workspace).toContain('data-testid="inp-prov-1b-flowsheets-vitals"');
    expect(workspace).toContain('data-testid="inp-prov-1b-flowsheets-io"');
    // Empty data keeps the real surface with an empty state instead of removing the tab.
    expect(workspace).toContain(
      "const flowsheetsEmpty = flowsheetVitals.length === 0 && flowsheetIoRows.length === 0"
    );
    expect(inpatientProviderDocumentationInpProv1bEn.flowsheets.empty).toBe(
      "No vitals or intake/output on this encounter."
    );
  });

  it("documents the closed-record projection boundary and never rewrites it", () => {
    expect(workspace).toContain("admissionSummaryJson");
    expect(workspace).not.toMatch(/admissionSummaryJson\s*[:=]/);
  });
});

describe("INP.PROV.1B i18n", () => {
  it("renders user-facing copy through t() only", () => {
    expect(workspace).toContain('const I18N = "inpatientProviderDocumentationInpProv1b"');
    expect(workspaceBody).not.toContain("Sign & Save");
    expect(workspaceBody).not.toContain("Enregistrer le brouillon");
    expect(workspaceBody).not.toContain("Smart Assist<");
  });

  it("mirrors every key between the English and French bundles", () => {
    const en = keyPaths(inpatientProviderDocumentationInpProv1bEn).sort();
    const fr = keyPaths(inpatientProviderDocumentationInpProv1bFr).sort();
    expect(fr).toEqual(en);
    expect(en.length).toBeGreaterThan(40);
  });

  it("registers both bundles in the locale catalogs", () => {
    const enCatalog = readFileSync(join(webSrc, "i18n/messages/en.ts"), "utf8");
    const frCatalog = readFileSync(join(webSrc, "i18n/messages/fr.ts"), "utf8");
    expect(enCatalog).toContain(
      "inpatientProviderDocumentationInpProv1b: inpatientProviderDocumentationInpProv1bEn"
    );
    expect(frCatalog).toContain(
      "inpatientProviderDocumentationInpProv1b: inpatientProviderDocumentationInpProv1bFr"
    );
  });
});
