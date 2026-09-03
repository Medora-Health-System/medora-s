/**
 * MEDUI.ES.1F — Emergency Department governed Spanish overlay.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  productUiLanguageSelectOptions,
} from "@/i18n/config";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import {
  MEDUI_ES_1F_EMPTY_OVERLAY_PATHS,
  MEDUI_ES_1F_OVERLAY,
} from "./meduiEs1fEmergencyDepartmentOverlay";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function collectLeaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    if (prefix) out.set(prefix, obj);
    return out;
  }
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      for (const [p, s] of collectLeaves(v, next)) out.set(p, s);
    }
  }
  return out;
}

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

const IN_SCOPE_PREFIXES = [
  "emergencyTrackboard.",
  "emergencyErClosure.",
  "emergencyClosedChart.",
  "emergencyErNursingHandoff.",
  "emergencyWorkspace.",
  "emergencyChartView.",
  "emergencyClinicalData.",
  "emergencyVisitSummaryPanel.",
  "emergencyTriageIntake.",
  "erTriage.",
  "erMseProviderPanel.",
  "erEmtalaPanel.",
  "erMseAssist.",
  "erProtocolAssist.",
  "encounterTriageTab.",
  "nursingAssessmentTab.",
  "clinicalTrackboardPage.",
  "emergencyWorkspaceClinicalStrip.",
  "emergencyResultsPanel.",
  "emergencyDisposition.",
  "emergencyNursingReassessment.",
  "dispositionReadiness.",
  "erIvAccess.",
  "erQuickVitals.",
  "erCds.",
  "encounterNotes.",
  "edHosp1fNursingDocumentation.",
  "emergencyAdaptiveNursing.",
] as const;

const OUT_OF_SCOPE_PREFIXES = [
  "edHosp1gHospitalBoard.",
  "edHosp1g2PlacementWorkspace.",
  "erEmergencyOrders.",
  "edHosp1dObservationOrders.",
  "edHosp1eAdmissionOrders.",
  "erProcedureLauncher.",
  "erMseHpiChips.",
  "erMseRosChips.",
  "erMseExamChips.",
  "erMseMdmChips.",
  "erMseHpiChipsTrauma.",
  "erMseHpiChipsPediatric.",
  "erMseMdmGuidance.",
  "erMseExamTemplatePresets.",
  "erMseExamTemplates.",
  "erTriageComplaintTemplates.",
  "erMseSmartAssist.",
] as const;

function isInScopePath(path: string): boolean {
  return IN_SCOPE_PREFIXES.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

function classify1fPath(path: string): string {
  if (!isInScopePath(path)) return "OUT_OF_SCOPE";
  if (
    path.startsWith("emergencyTrackboard.") ||
    path.startsWith("clinicalTrackboardPage.") ||
    path.startsWith("emergencyWorkspace.") ||
    path.startsWith("emergencyChartView.") ||
    path.startsWith("emergencyClosedChart.") ||
    path.startsWith("emergencyErClosure.") ||
    path.startsWith("emergencyVisitSummaryPanel.") ||
    path.startsWith("emergencyClinicalData.")
  ) {
    return "ED_TRACKBOARD";
  }
  if (
    path.startsWith("emergencyTriageIntake.") ||
    path.startsWith("erTriage.") ||
    path.startsWith("encounterTriageTab.") ||
    path.startsWith("erQuickVitals.")
  ) {
    return "ED_TRIAGE";
  }
  if (
    path.startsWith("erMseProviderPanel.") ||
    path.startsWith("erMseAssist.") ||
    path.startsWith("erProtocolAssist.") ||
    path.startsWith("erCds.")
  ) {
    return "ED_PROVIDER";
  }
  if (
    path.startsWith("emergencyNursingReassessment.") ||
    path.startsWith("nursingAssessmentTab.") ||
    path.startsWith("edHosp1fNursingDocumentation.") ||
    path.startsWith("emergencyAdaptiveNursing.") ||
    path.startsWith("erIvAccess.") ||
    path.startsWith("encounterNotes.")
  ) {
    return "ED_NURSING";
  }
  if (path.startsWith("emergencyErNursingHandoff.")) return "ED_TRANSFER_HANDOFF";
  if (path.startsWith("emergencyDisposition.") || path.startsWith("dispositionReadiness.")) {
    const lower = path.toLowerCase();
    if (lower.includes("home") || lower.includes("discharge")) return "ED_HOME_DISCHARGE_CHROME";
    if (lower.includes("transfer") || lower.includes("handoff")) return "ED_TRANSFER_HANDOFF";
    return "ED_DISPOSITION";
  }
  if (path.startsWith("erEmtalaPanel.")) return "ED_DISPOSITION";
  return "ED_GENERIC_DEPENDENCY";
}

describe("MEDUI.ES.1F ED trackboard / navigation ES coverage", () => {
  const paths = [
    "emergencyTrackboard.title",
    "emergencyTrackboard.disposition.admit",
    "emergencyTrackboard.disposition.observe",
    "emergencyTrackboard.disposition.transfer",
    "emergencyTrackboard.disposition.discharged",
    "emergencyTrackboard.disposition.ama",
    "emergencyTrackboard.disposition.lwbs",
    "emergencyTrackboard.disposition.elopement",
    "emergencyTrackboard.disposition.deceased",
    "clinicalTrackboardPage.title",
    "clinicalTrackboardPage.searchPlaceholder",
    "emergencyWorkspace.admissionLabel",
  ];

  it("ED trackboard keys are translated (not placeholders)", () => {
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(v, `ES missing: ${p}`).toBeDefined();
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), `ES placeholder: ${p}`).toBe(false);
      expect(v).toBe(MEDUI_ES_1F_OVERLAY[p]);
    }
  });

  it("patient-row / status chrome uses canon ED terms", () => {
    expect(getByPath(es, "emergencyTrackboard.title")).toBe("Servicio de urgencias");
    expect(getByPath(es, "emergencyTrackboard.disposition.observe")).toBe("Observación");
    expect(getByPath(es, "emergencyTrackboard.disposition.admit")).toBe("Admisión");
    expect(getByPath(es, "emergencyTrackboard.disposition.transfer")).toBe("Traslado");
    expect(getByPath(es, "emergencyTrackboard.disposition.discharged")).toBe("Alta a domicilio");
  });
});

describe("MEDUI.ES.1F triage ES coverage", () => {
  const paths = [
    "erTriage.panel.title",
    "emergencyTriageIntake.pageTitle",
    "erTriage.panel.esiLabel",
    "erTriage.v1.gcsVerbal",
  ];

  it("triage chrome is translated", () => {
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
    expect(getByPath(es, "erTriage.panel.title")).toBe("Triaje de urgencias");
  });
});

describe("MEDUI.ES.1F provider / nursing / handoff ES coverage", () => {
  it("provider workspace chrome is translated", () => {
    const v = getByPath(es, "erMseProviderPanel.title");
    expect(v).toBe("Documentación del médico (urgencias)");
    expect(isHiddenSpanishPlaceholder(v as string)).toBe(false);
  });

  it("nursing documentation chrome is translated", () => {
    expect(getByPath(es, "edHosp1fNursingDocumentation.addNursingNote")).toBe("+ Nota de enfermería");
    expect(getByPath(es, "edHosp1fNursingDocumentation.addHandoffNote")).toBe("+ Nota de pase de guardia");
    expect(getByPath(es, "edHosp1fNursingDocumentation.signNote")).toBeDefined();
    expect(isHiddenSpanishPlaceholder(getByPath(es, "edHosp1fNursingDocumentation.addNursingNote") as string)).toBe(
      false
    );
  });

  it("handoff chrome is translated and keeps external-receiver wording as labels only", () => {
    expect(getByPath(es, "emergencyErNursingHandoff.panelTitle")).toBe(
      "Ejecución del equipo (después de la decisión)"
    );
    expect(isHiddenSpanishPlaceholder(getByPath(es, "emergencyErNursingHandoff.panelTitle") as string)).toBe(false);
  });
});

describe("MEDUI.ES.1F disposition distinctness", () => {
  const labels = {
    HOME: "emergencyDisposition.choiceHOME",
    OBSERVATION: "emergencyDisposition.choiceOBSERVATION",
    ADMISSION: "emergencyDisposition.choiceADMISSION",
    TRANSFER: "emergencyDisposition.choiceTRANSFER",
    AMA: "emergencyDisposition.choiceAMA",
    LWBS: "emergencyDisposition.choiceLWBS",
    ELOPEMENT: "emergencyDisposition.choiceELOPEMENT",
    DECEASED: "emergencyDisposition.choiceDECEASED",
  } as const;

  it("eight ED dispositions remain clinically distinct in Spanish", () => {
    const values = Object.values(labels).map((p) => getByPath(es, p) as string);
    for (const v of values) {
      expect(typeof v).toBe("string");
      expect(isHiddenSpanishPlaceholder(v)).toBe(false);
    }
    expect(new Set(values).size).toBe(8);
    expect(getByPath(es, labels.HOME)).toBe("Alta a domicilio");
    expect(getByPath(es, labels.OBSERVATION)).toBe("Observación");
    expect(getByPath(es, labels.ADMISSION)).toBe("Admisión");
    expect(getByPath(es, labels.TRANSFER)).toBe("Traslado");
    expect(getByPath(es, labels.AMA)).toBe("AMA");
    expect(getByPath(es, labels.LWBS)).toBe("LWBS");
    expect(getByPath(es, labels.ELOPEMENT)).toBe("Abandono (fuga)");
    expect(getByPath(es, labels.DECEASED)).toBe("Fallecido");
  });

  it("AMA / LWBS / elopement expanded EMTALA labels stay distinct", () => {
    const ama = getByPath(es, "erEmtalaPanel.disp_AMA") as string;
    const lwbs = getByPath(es, "erEmtalaPanel.disp_LWBS") as string;
    const deceased = getByPath(es, "erEmtalaPanel.disp_DECEASED") as string;
    expect(ama).toContain("AMA");
    expect(lwbs).toContain("LWBS");
    expect(ama).not.toBe(lwbs);
    expect(deceased).toBe("Fallecido");
    expect(ama).not.toBe(deceased);
    expect(lwbs).not.toBe(deceased);
  });
});

describe("MEDUI.ES.1F EMTALA locale-independence", () => {
  it("EMTALA identifier remains in EN/FR/ES chrome", () => {
    expect(getByPath(en, "erEmtalaPanel.title")).toMatch(/EMTALA/);
    expect(String(getByPath(fr, "erEmtalaPanel.title"))).toMatch(/EMTALA/);
    expect(getByPath(es, "erEmtalaPanel.title")).toBe("EMTALA (registro de cumplimiento)");
    expect(getByPath(es, "emergencyTrackboard.emtalaPrefix")).toBe("EMTALA:");
    expect(getByPath(es, "erEmtalaPanel.disp_AMA")).toContain("AMA");
    expect(getByPath(es, "erEmtalaPanel.disp_LWBS")).toContain("LWBS");
  });

  it("does not auto-attest: EMTALA copy remains documentation-status language", () => {
    const disclaimer = getByPath(es, "erEmtalaPanel.disclaimer") as string;
    expect(disclaimer).toContain("No determina el cumplimiento");
    expect(isHiddenSpanishPlaceholder(disclaimer)).toBe(false);
  });
});

describe("MEDUI.ES.1F authored narrative / templates / 1G / 1H stay unlocalized", () => {
  it("Medora-authored MSE/template bodies remain placeholders", () => {
    for (const prefix of [
      "erMseHpiChips",
      "erMseRosChips",
      "erMseExamChips",
      "erMseMdmChips",
      "erTriageComplaintTemplates",
      "erMseExamTemplates",
    ]) {
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      for (const [path, value] of leaves) {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(true);
        expect(MEDUI_ES_1F_OVERLAY[path]).toBeUndefined();
      }
    }
  });

  it("1G hospital/placement and 1H order/catalog sections remain placeholders", () => {
    for (const prefix of [
      "edHosp1gHospitalBoard",
      "edHosp1g2PlacementWorkspace",
      "erEmergencyOrders",
      "edHosp1dObservationOrders",
      "edHosp1eAdmissionOrders",
      "erProcedureLauncher",
    ]) {
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      for (const [path, value] of leaves) {
        expect(isHiddenSpanishPlaceholder(value), path).toBe(true);
        expect(MEDUI_ES_1F_OVERLAY[path]).toBeUndefined();
      }
    }
  });
});

describe("MEDUI.ES.1F six-direction isolation for ED surfaces", () => {
  const scoped = [
    "emergencyTrackboard.title",
    "erTriage.panel.title",
    "erMseProviderPanel.title",
    "emergencyDisposition.choiceHOME",
    "emergencyErNursingHandoff.panelTitle",
  ];

  it("EN/FR/ES ED chrome do not leak across languages", () => {
    for (const key of scoped) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(esVal).not.toBe(enVal);
      expect(esVal).not.toBe(frVal);
      expect(enVal).not.toBe(frVal);
      expect(isHiddenSpanishPlaceholder(esVal)).toBe(false);
      expect(resolveClinicalUiMessage("en", key)).toBe(enVal);
      expect(resolveClinicalUiMessage("fr", key)).toBe(frVal);
      expect(resolveClinicalUiMessage("es", key)).toBe(esVal);
    }
  });

  it("missing ES keys never fall back to EN or FR", () => {
    const missing = "meduiEs1f.missing.ed.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
    expect(resolveClinicalUiMessage("es", missing)).not.toBe(resolveClinicalUiMessage("en", "emergencyTrackboard.title"));
    expect(resolveClinicalUiMessage("es", missing)).not.toBe(resolveClinicalUiMessage("fr", "emergencyTrackboard.title"));
  });
});

describe("MEDUI.ES.1F public exposure", () => {
  it("Español remains hidden from public product UI selectors", () => {
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(false);
  });
});

describe("MEDUI.ES.1F overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1F_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    const uniqueOverlayPaths = new Set(overlayPaths);
    expect(uniqueOverlayPaths.size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const hidden = createHiddenSpanishCatalog(en);
    const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
    const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const before1f = countPlaceholders(after1e);

    const reviewRequiredUiKeys = new Set<string>();
    for (const entry of ES_MEDICAL_TERMINOLOGY) {
      if (entry.status === "REVIEW_REQUIRED") {
        for (const key of entry.uiMessageKeys ?? []) reviewRequiredUiKeys.add(key);
      }
    }

    let replacedBy1f = 0;
    const didNotReplace: Array<{ path: string; reason: string }> = [];
    for (const [path] of overlayEntries) {
      const current = getByPath(after1e, path);
      if (typeof current !== "string") {
        didNotReplace.push({ path, reason: "path missing or not a string in ES tree" });
        continue;
      }
      if (!isHiddenSpanishPlaceholder(current)) {
        didNotReplace.push({ path, reason: "already a non-placeholder before 1F" });
        continue;
      }
      replacedBy1f += 1;
    }

    const { tree: after1fTree } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
    const after1f = countPlaceholders(after1fTree);
    const live = countPlaceholders(es);

    const nonEmptyOverlayEntries = overlayEntries.filter(([, v]) => v !== "").length;
    const emptyOverlayEntries = overlayEntries.filter(([, v]) => v === "").map(([p]) => p);
    const outOfScope = overlayPaths.filter((p) => classify1fPath(p) === "OUT_OF_SCOPE");
    const reviewRequiredOverlays = overlayPaths.filter((p) => reviewRequiredUiKeys.has(p));

    const byClass: Record<string, number> = {};
    for (const p of overlayPaths) {
      const c = classify1fPath(p);
      byClass[c] = (byClass[c] ?? 0) + 1;
    }

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          totalEsStringLeaves: live.totalLeaves,
          placeholdersBefore1f: before1f.placeholders,
          placeholdersAfter1f: after1f.placeholders,
          placeholdersReplacedBy1f: before1f.placeholders - after1f.placeholders,
          overlayEntriesTotal: overlayEntries.length,
          uniqueOverlayPaths: uniqueOverlayPaths.size,
          nonEmptyOverlayEntries,
          emptyOverlayEntries,
          overlaysActuallyReplacingPlaceholders: replacedBy1f,
          overlaysNotReplacingPlaceholders: didNotReplace,
          byClass,
          outOfScope,
          reviewRequiredOverlays,
        },
        null,
        2
      )
    );

    expect(live.totalLeaves).toBe(44266);
    expect(after1f.totalLeaves).toBe(44266);
    expect(uniqueOverlayPaths.size).toBe(overlayEntries.length);
    expect(outOfScope, outOfScope.join(", ")).toEqual([]);
    expect(reviewRequiredOverlays, reviewRequiredOverlays.join(", ")).toEqual([]);
    expect(didNotReplace, JSON.stringify(didNotReplace)).toEqual([]);
    expect(replacedBy1f).toBe(overlayEntries.length);
    expect(overlayEntries.length).toBe(2737);
    expect(nonEmptyOverlayEntries).toBe(2737 - 43);
    expect(emptyOverlayEntries).toEqual([...MEDUI_ES_1F_EMPTY_OVERLAY_PATHS].sort());
    expect(emptyOverlayEntries).toHaveLength(43);
    expect(before1f.placeholders).toBe(43682);
    expect(after1f.placeholders).toBe(43682 - 2737);
    expect(live.placeholders).toBe(after1f.placeholders);
    expect(before1f.placeholders - after1f.placeholders).toBe(2737);

    for (const path of overlayPaths) {
      expect(isInScopePath(path), `out of scope overlay: ${path}`).toBe(true);
      const enVal = getByPath(en, path);
      expect(enVal, `1F overlay key not in EN: ${path}`).toBeDefined();
      expect(typeof enVal).toBe("string");
      const esVal = getByPath(es, path);
      expect(esVal).toBe(MEDUI_ES_1F_OVERLAY[path]);
      if (MEDUI_ES_1F_OVERLAY[path] === "") {
        expect(enVal).toBe("");
      }
    }

    for (const prefix of OUT_OF_SCOPE_PREFIXES) {
      expect(overlayPaths.some((p) => p.startsWith(prefix))).toBe(false);
    }
  });
});

describe("MEDUI.ES.1F no ungoverned Spanish component literals", () => {
  it("ED production files do not hardcode Spanish clinical chrome", () => {
    const files = [
      "src/features/emergency/EmergencyTrackboardView.tsx",
      "src/features/emergency/EdAdmissionOrderComposer.tsx",
    ];
    const forbidden = /\b(Servicio de urgencias|Triaje|Disposición|Pase de guardia|Alta a domicilio)\b/;
    let hits = 0;
    for (const rel of files) {
      try {
        const src = readFileSync(join(webRoot, rel), "utf8");
        hits += src.match(forbidden)?.length ?? 0;
      } catch {
        // file may live under a slightly different path; skip missing
      }
    }
    expect(hits).toBe(0);
  });
});
