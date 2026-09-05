import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  applySurgicalHistoryCatalogSelection,
  searchSurgicalHistoryCatalog,
  surgicalHistoryById,
  SURGICAL_HISTORY_SEARCH_MIN_CHARS,
} from "@medora/shared";
import {
  ER_CHIEF_COMPLAINT_QUICK_PICK_IDS,
  ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS,
  getErChiefComplaintQuickPicks,
  searchErChiefComplaintTemplates,
} from "./erChiefComplaintTemplates";
import {
  appendDiagnosisToPmh,
  applySurgicalHistoryPick,
  ER_TRIAGE_PPE_NONE_CODE,
  safetyAssessmentHasDocumentedConcern,
  shouldShowSafetyAssessment,
  shouldShowTravelDetails,
  togglePpeSelection,
  travelDetailsHasContent,
} from "./edTriageEfficiencyGovernance";
import {
  emptyErTriageV1Form,
  erTriageV1FormFromVitalsJson,
  mergeMedoraErTriageV1Blob,
  type ErTriageV1Form,
} from "./medoraErTriageV1";
import { buildTriageDocumentationPreviewModel } from "./emergencyTriageDocPreview";
import type { Icd10SearchHit } from "@/lib/chartApi";

function baseEr(): ErTriageV1Form {
  return emptyErTriageV1Form();
}

describe("TRIAGE.2 QA checklist (TRIAGE.2A audit)", () => {
  it("chief complaint search works with 2+ chars; chip overload reduced by default", () => {
    expect(getErChiefComplaintQuickPicks("fr").length).toBe(ER_CHIEF_COMPLAINT_QUICK_PICK_IDS.length);
    expect(searchErChiefComplaintTemplates("", "fr")).toEqual([]);
    expect(searchErChiefComplaintTemplates("thorac", "fr").some((h) => h.id === "chest_pain")).toBe(true);
    const panel = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriagePanel.tsx"),
      "utf8"
    );
    expect(panel.includes("getErChiefComplaintQuickPicks")).toBe(true);
    expect(panel.includes("filterErChiefComplaintTemplates")).toBe(false);
  });

  it("PPE includes None with mutual exclusion", () => {
    const cleared = togglePpeSelection(
      { ...baseEr(), ppeSelections: ["MASK"], ppeNote: "Mask" },
      ER_TRIAGE_PPE_NONE_CODE,
      "None"
    );
    expect(cleared.ppeSelections).toEqual([ER_TRIAGE_PPE_NONE_CODE]);
    const sections = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
      "utf8"
    );
    expect(sections.includes("togglePpeSelection")).toBe(true);
    const ppeDefs = readFileSync(
      resolve(process.cwd(), "src/features/emergency/medoraErTriageV1.ts"),
      "utf8"
    );
    expect(ppeDefs.includes('"NONE"')).toBe(true);
    expect(ppeDefs.includes("chipsPpeNone")).toBe(true);
  });

  it("travel Yes opens details; details persist save/reopen", () => {
    expect(shouldShowTravelDetails("yes")).toBe(true);
    expect(shouldShowTravelDetails("no")).toBe(false);
    const form: ErTriageV1Form = {
      ...baseEr(),
      travelOutsideCountry14d: "yes",
      travelDestinationCountry: "Jamaica",
      travelDateOrReturn: "2026-05-01",
      travelExposureConcern: "Cough",
      travelScreeningNotes: "Flight from KIN",
    };
    const merged = mergeMedoraErTriageV1Blob({}, form);
    const loaded = erTriageV1FormFromVitalsJson({ medoraErTriageV1: merged });
    expect(loaded.travelDestinationCountry).toBe("Jamaica");
    expect(travelDetailsHasContent(loaded)).toBe(true);
  });

  it("safe at home No opens assessment; safety details persist save/reopen", () => {
    expect(shouldShowSafetyAssessment("no")).toBe(true);
    expect(shouldShowSafetyAssessment("yes")).toBe(false);
    const form: ErTriageV1Form = {
      ...baseEr(),
      feelsSafeAtHome: "no",
      safetyAbuseNeglect: "yes",
      safetyAssessmentNotes: "Social work notified",
    };
    const merged = mergeMedoraErTriageV1Blob({}, form);
    const loaded = erTriageV1FormFromVitalsJson({ medoraErTriageV1: merged });
    expect(loaded.safetyAbuseNeglect).toBe("yes");
    expect(loaded.safetyAssessmentNotes).toBe("Social work notified");
    expect(safetyAssessmentHasDocumentedConcern(loaded)).toBe(true);
  });

  it("additional allergy info removed from UI; drug search and NKDA remain", () => {
    const sections = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
      "utf8"
    );
    expect(sections.includes('t("erTriage.v1.allergyExtra")')).toBe(false);
    expect(sections.includes("DrugAllergySearchPanel")).toBe(true);
    expect(sections.includes("ER_TRIAGE_ALLERGY_CHIP_DEFS")).toBe(true);
  });

  it("PMH uses ICD-10 search governance wiring", () => {
    const sections = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
      "utf8"
    );
    expect(sections.includes("searchIcd10Catalog")).toBe(true);
    expect(sections.includes("resolveLocalizedDiagnosisSearchQueries")).toBe(true);
    expect(sections.includes("appendDiagnosisToPmh")).toBe(true);
  });

  it("surgical history uses shared governed catalog (not local web registry)", () => {
    const sections = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
      "utf8"
    );
    expect(sections.includes("searchSurgicalHistoryCatalog")).toBe(true);
    expect(sections.includes("edTriageSurgicalHistoryTemplates")).toBe(false);
    expect(searchSurgicalHistoryCatalog("append", "en").some((h) => h.id === "appendectomy")).toBe(true);
  });

  it("existing triage JSON loads/saves without migration", () => {
    const legacy = {
      medoraErTriageV1: {
        pastSurgicalHistory: "Appendicectomie 2010",
        pastMedicalHistory: "HTA",
        ppeSelections: ["MASK"],
      },
    };
    const form = erTriageV1FormFromVitalsJson(legacy);
    expect(form.pastSurgicalHistory).toBe("Appendicectomie 2010");
    const merged = mergeMedoraErTriageV1Blob(legacy, form);
    expect(merged?.pastSurgicalHistory).toBe("Appendicectomie 2010");
  });

  it("does not create active procedure orders from surgical history picks", () => {
    const sections = readFileSync(
      resolve(process.cwd(), "src/features/emergency/EmergencyTriageV1Sections.tsx"),
      "utf8"
    );
    expect(sections.includes("enterpriseProcedureId")).toBe(false);
    expect(sections.includes("pastSurgicalHistory")).toBe(true);
  });
});

describe("chief complaint template picker (TRIAGE.2)", () => {
  it("shows only quick picks by default (not full catalog chip overflow)", () => {
    const quick = getErChiefComplaintQuickPicks("fr");
    expect(quick.length).toBe(ER_CHIEF_COMPLAINT_QUICK_PICK_IDS.length);
    expect(searchErChiefComplaintTemplates("", "fr")).toEqual([]);
    expect(searchErChiefComplaintTemplates("c", "fr")).toEqual([]);
  });

  it("returns matching templates when search has 2+ characters", () => {
    const hits = searchErChiefComplaintTemplates("thorac", "fr");
    expect(hits.some((h) => h.id === "chest_pain")).toBe(true);
    expect(hits.length).toBeLessThan(ER_CHIEF_COMPLAINT_QUICK_PICK_IDS.length + 5);
  });
});

describe("PPE None mutual exclusion", () => {
  it("selecting None clears other PPE selections and sets note", () => {
    let er = {
      ...baseEr(),
      ppeSelections: ["MASK", "GLOVES"],
      ppeNote: "Masque; Gants",
    };
    const next = togglePpeSelection(er, ER_TRIAGE_PPE_NONE_CODE, "Aucun");
    er = { ...er, ...next };
    expect(er.ppeSelections).toEqual([ER_TRIAGE_PPE_NONE_CODE]);
    expect(er.ppeNote).toBe("Aucun");
  });

  it("selecting another PPE option removes None", () => {
    let er = {
      ...baseEr(),
      ppeSelections: [ER_TRIAGE_PPE_NONE_CODE],
      ppeNote: "Aucun",
    };
    const next = togglePpeSelection(er, "MASK", "Masque");
    er = { ...er, ...next };
    expect(er.ppeSelections).toEqual(["MASK"]);
    expect(er.ppeNote).toBe("Masque");
  });
});

describe("travel screening conditional", () => {
  it("shows details only when travel is yes", () => {
    expect(shouldShowTravelDetails("yes")).toBe(true);
    expect(shouldShowTravelDetails("no")).toBe(false);
    expect(shouldShowTravelDetails("unknown")).toBe(false);
    expect(shouldShowTravelDetails("")).toBe(false);
  });

  it("persists travel details in medoraErTriageV1 blob", () => {
    const form: ErTriageV1Form = {
      ...baseEr(),
      travelOutsideCountry14d: "yes",
      travelDestinationCountry: "République dominicaine",
      travelDateOrReturn: "2026-05-01",
      travelExposureConcern: "Fièvre",
      travelScreeningNotes: "Contact malade",
    };
    const merged = mergeMedoraErTriageV1Blob({}, form);
    expect(merged?.travelDestinationCountry).toBe("République dominicaine");
    expect(merged?.travelExposureConcern).toBe("Fièvre");
    const loaded = erTriageV1FormFromVitalsJson({ medoraErTriageV1: merged });
    expect(loaded.travelDestinationCountry).toBe("République dominicaine");
    expect(travelDetailsHasContent(loaded)).toBe(true);
  });
});

describe("safety-at-home conditional assessment", () => {
  it("opens assessment for no and unknown", () => {
    expect(shouldShowSafetyAssessment("no")).toBe(true);
    expect(shouldShowSafetyAssessment("unknown")).toBe(true);
    expect(shouldShowSafetyAssessment("yes")).toBe(false);
  });

  it("detects documented safety concerns", () => {
    const er: ErTriageV1Form = {
      ...baseEr(),
      feelsSafeAtHome: "no",
      safetySelfHarm: "yes",
      safetyAssessmentNotes: "Plan de sécurité discuté",
    };
    expect(safetyAssessmentHasDocumentedConcern(er)).toBe(true);
  });

  it("includes safety concern in preview when unsafe", () => {
    const er: ErTriageV1Form = {
      ...baseEr(),
      feelsSafeAtHome: "no",
      safetyAbuseNeglect: "yes",
    };
    const model = buildTriageDocumentationPreviewModel(
      {
        chiefComplaint: "Céphalée",
        esi: "3",
        onsetAt: "",
        triageCompleteAt: "",
        tempC: "",
        tempInputUnit: "C",
        hr: "",
        rr: "",
        bpSys: "",
        bpDia: "",
        spo2: "",
        weightKg: "",
        heightCm: "",
        allergyNote: "",
      },
      {
        strokeScreen: null,
        sepsisScreen: null,
        erV1: er,
        locale: "fr",
      }
    );
    const securite = model.sections.find((s) => s.id === "securite");
    expect(securite?.lines.some((l) => l.includes("maltraitance") || l.includes("Maltraitance"))).toBe(true);
  });
});

describe("allergy field removal (UI only)", () => {
  it("does not wipe legacy additionalAllergyInfo on merge when unchanged", () => {
    const prev = {
      medoraErTriageV1: {
        additionalAllergyInfo: "Legacy latex note",
        medicationAllergiesDetail: "Pénicilline",
      },
    };
    const form = erTriageV1FormFromVitalsJson(prev);
    const merged = mergeMedoraErTriageV1Blob(prev, form);
    expect(merged?.additionalAllergyInfo).toBe("Legacy latex note");
  });
});

describe("PMH diagnosis search append", () => {
  const hit: Icd10SearchHit = {
    id: "icd:test",
    code: "I10",
    shortDescription: "Essential (primary) hypertension",
    longDescription: null,
    isBillable: true,
    displayLabel: "I10",
    displayResolution: "UNLOCALIZED_CODE",
  };

  it("appends governed diagnosis label to PMH text", () => {
    const next = appendDiagnosisToPmh("", hit, "fr");
    expect(next.toLowerCase()).toContain("hypertension");
    const again = appendDiagnosisToPmh(next, hit, "fr");
    expect(again).toBe(next);
  });
});

describe("surgical history shared catalog governance (TRIAGE.2A)", () => {
  it("finds entries with 2+ character search", () => {
    expect(SURGICAL_HISTORY_SEARCH_MIN_CHARS).toBe(2);
    const hits = searchSurgicalHistoryCatalog("append", "en");
    expect(hits.some((h) => h.id === "appendectomy")).toBe(true);
  });

  it("no_prior_surgery clears conflicting surgical history", () => {
    const entry = surgicalHistoryById("no_prior_surgery")!;
    expect(applySurgicalHistoryCatalogSelection("Appendectomy; Cholecystectomy", entry, "en")).toBe(
      "No prior surgery"
    );
  });

  it("selection appends non-exclusive surgical history via web helper", () => {
    const entry = surgicalHistoryById("appendectomy")!;
    const line = applySurgicalHistoryPick("", entry, "fr");
    expect(line.toLowerCase()).toContain("appendic");
  });

  it("existing saved pastSurgicalHistory rehydrates unchanged", () => {
    const prev = { medoraErTriageV1: { pastSurgicalHistory: "Césarienne 2018" } };
    expect(erTriageV1FormFromVitalsJson(prev).pastSurgicalHistory).toBe("Césarienne 2018");
  });

  it("manual surgical history text still works (free-text field unchanged)", () => {
    const form = { ...baseEr(), pastSurgicalHistory: "Custom operative note" };
    const merged = mergeMedoraErTriageV1Blob({}, form);
    expect(merged?.pastSurgicalHistory).toBe("Custom operative note");
  });
});

describe("save payload compatibility", () => {
  it("loads old fixture without new TRIAGE.2 fields", () => {
    const legacy = {
      medoraErTriageV1: {
        feelsSafeAtHome: "yes",
        travelOutsideCountry14d: "no",
        pastMedicalHistory: "HTA",
        ppeSelections: ["MASK"],
      },
    };
    const form = erTriageV1FormFromVitalsJson(legacy);
    expect(form.ppeSelections).toEqual(["MASK"]);
    expect(form.travelDestinationCountry).toBe("");
    expect(form.safetyAssessmentNotes).toBe("");
  });

  it("hidden travel details are preserved when travel toggled to no in form but fields still populated", () => {
    const prev = {
      medoraErTriageV1: {
        travelOutsideCountry14d: "yes",
        travelDestinationCountry: "Jamaica",
        travelExposureConcern: "Cough",
      },
    };
    const form = erTriageV1FormFromVitalsJson(prev);
    form.travelOutsideCountry14d = "no";
    const merged = mergeMedoraErTriageV1Blob(prev, form);
    expect(merged?.travelDestinationCountry).toBe("Jamaica");
    expect(merged?.travelExposureConcern).toBe("Cough");
  });
});

describe("chief complaint search min chars constant", () => {
  it("requires at least 2 characters", () => {
    expect(ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS).toBe(2);
  });
});
