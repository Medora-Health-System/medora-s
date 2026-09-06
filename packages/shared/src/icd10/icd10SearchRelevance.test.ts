/**
 * MEDUI.TRILANG.DX.SEARCH.1 ranking model tests.
 * Ranking may use multilingual aliases; display identity is out of scope here.
 */
import { describe, expect, it } from "vitest";
import {
  classifyIcd10SearchIntent,
  evaluateIcd10SearchBenchmarkCase,
  foldIcd10SearchText,
  ICD10_SEARCH_ADVERSARIAL_BENCHMARK,
  ICD10_SEARCH_RANK,
  ICD10_SEARCH_RELEVANCE_BENCHMARK,
  rankIcd10SearchCandidates,
  resolveIcd10SearchPreferredCodePrefixes,
  resolveIcd10SearchSynonymPhrases,
  tokenizeIcd10SearchQuery,
  type Icd10SearchCandidate,
} from "./icd10SearchRelevance.js";

const abdominalPainEs: Icd10SearchCandidate[] = [
  {
    code: "S30.811A",
    normalizedCode: "S30811A",
    shortDescription: "Abrasion of abdominal wall, initial encounter",
    localeLabel: "Abrasión de pared abdominal, contacto inicial",
    isBillable: true,
  },
  {
    code: "S35.09XA",
    normalizedCode: "S3509XA",
    shortDescription: "Other injury of abdominal aorta, initial encounter",
    localeLabel: "Otro traumatismo de aorta abdominal, contacto inicial",
    isBillable: true,
  },
  {
    code: "R10.84",
    normalizedCode: "R1084",
    shortDescription: "Generalized abdominal pain",
    localeLabel: "Dolor abdominal generalizado",
    aliases: ["dolor abdominal"],
    isBillable: true,
  },
  {
    code: "R10.85",
    normalizedCode: "R1085",
    shortDescription: "Abdominal pain of multiple sites",
    localeLabel: "Dolor abdominal en varios sitios",
    aliases: ["dolor abdominal"],
    isBillable: true,
  },
  {
    code: "R10.9",
    normalizedCode: "R109",
    shortDescription: "Unspecified abdominal pain",
    localeLabel: "Dolor abdominal no especificado",
    aliases: ["dolor abdominal"],
    isBillable: true,
  },
];

const giBleedEs: Icd10SearchCandidate[] = [
  {
    code: "A04.7",
    normalizedCode: "A047",
    shortDescription: "Enterocolitis due to Clostridium difficile",
    localeLabel: "Enterocolitis por Clostridioides difficile",
    isBillable: true,
  },
  {
    code: "K52.9",
    normalizedCode: "K529",
    shortDescription: "Noninfective gastroenteritis and colitis, unspecified",
    localeLabel: "Gastroenteritis y colitis no infecciosas, no especificadas",
    isBillable: true,
  },
  {
    code: "K92.2",
    normalizedCode: "K922",
    shortDescription: "Gastrointestinal hemorrhage, unspecified",
    localeLabel: "Hemorragia gastrointestinal, no especificada",
    isBillable: true,
  },
  {
    code: "K92.0",
    normalizedCode: "K920",
    shortDescription: "Hematemesis",
    localeLabel: "Hematemesis",
    isBillable: true,
  },
];

describe("ICD-10 search relevance ranking", () => {
  it("folds diacritics without changing clinical identity strings used as display", () => {
    expect(foldIcd10SearchText("Náuseas")).toBe("nauseas");
    expect(foldIcd10SearchText("torácico")).toBe("toracico");
    expect(foldIcd10SearchText("Dolor abdominal")).toBe("dolor abdominal");
  });

  it("expands multi-word clinician phrases without letting a lone dolor token dominate", () => {
    expect(resolveIcd10SearchSynonymPhrases("dolor abdominal")).toContain("abdominal pain");
    expect(resolveIcd10SearchSynonymPhrases("sangrado gastrointestinal")).toContain("gastrointestinal hemorrhage");
    expect(resolveIcd10SearchSynonymPhrases("dolor")).not.toContain("abdominal pain");
  });

  it("classifies symptom vs trauma vs code", () => {
    expect(classifyIcd10SearchIntent("Dolor abdominal")).toBe("SYMPTOM");
    expect(classifyIcd10SearchIntent("Sangrado gastrointestinal")).toBe("SYMPTOM");
    expect(classifyIcd10SearchIntent("cervical strain")).toBe("TRAUMA");
    expect(classifyIcd10SearchIntent("retained bullet")).toBe("TRAUMA");
    expect(classifyIcd10SearchIntent("R11.0")).toBe("CODE");
  });

  it("does not let abdominal injuries outrank R10 pain for dolor abdominal", () => {
    const ranked = rankIcd10SearchCandidates("Dolor abdominal", abdominalPainEs);
    expect(ranked.slice(0, 3).every((row) => row.code.startsWith("R10"))).toBe(true);
    expect(ranked.findIndex((row) => row.code.startsWith("S"))).toBeGreaterThan(2);
  });

  it("does not let generic gastrointestinal labels outrank GI bleeding", () => {
    const ranked = rankIcd10SearchCandidates("Sangrado gastrointestinal", giBleedEs);
    expect(ranked[0]!.code).toBe("K92.2");
    expect(ranked.map((row) => row.code).slice(0, 2)).toContain("K92.2");
    expect(ranked.findIndex((row) => row.code === "K92.2")).toBeLessThan(ranked.findIndex((row) => row.code === "K52.9"));
  });

  it("keeps nausea near the top and treats unaccented nauseas as the same query", () => {
    const rows: Icd10SearchCandidate[] = [
      { code: "R11.0", normalizedCode: "R110", shortDescription: "Nausea", localeLabel: "Náuseas", isBillable: true },
      { code: "R11.11", normalizedCode: "R1111", shortDescription: "Vomiting without nausea", localeLabel: "Vómitos sin náuseas", isBillable: true },
      { code: "K52.9", normalizedCode: "K529", shortDescription: "Noninfective gastroenteritis and colitis, unspecified", localeLabel: "Gastroenteritis y colitis no infecciosas, no especificadas", isBillable: true },
    ];
    expect(rankIcd10SearchCandidates("Náuseas", rows)[0]!.code).toBe("R11.0");
    expect(rankIcd10SearchCandidates("nauseas", rows)[0]!.code).toBe("R11.0");
  });

  it("ranks exact ICD-10-CM code #1", () => {
    const rows: Icd10SearchCandidate[] = [
      { code: "R10.9", normalizedCode: "R109", shortDescription: "Unspecified abdominal pain", localeLabel: "Dolor abdominal no especificado", isBillable: true },
      { code: "R11.0", normalizedCode: "R110", shortDescription: "Nausea", localeLabel: "Náuseas", isBillable: true },
    ];
    expect(rankIcd10SearchCandidates("R11.0", rows)[0]!.code).toBe("R11.0");
  });

  it("finds R10 via English abdominal pain while scoring Spanish locale labels higher than injuries", () => {
    const ranked = rankIcd10SearchCandidates("abdominal pain", abdominalPainEs);
    expect(ranked[0]!.code.startsWith("R10")).toBe(true);
    expect(tokenizeIcd10SearchQuery("abdominal pain")).toEqual(["abdominal", "pain"]);
  });

  it("benchmark corpus has required Spanish and English clinician queries", () => {
    const ids = ICD10_SEARCH_RELEVANCE_BENCHMARK.map((row) => row.id);
    expect(ids).toContain("es-dolor-abdominal");
    expect(ids).toContain("es-sangrado-gi");
    expect(ids).toContain("es-dolor-toracico");
    expect(ids).toContain("en-abdominal-pain");
    expect(ids).toContain("es-en-abdominal-pain");
    expect(ICD10_SEARCH_RANK.CODE_EXACT).toBe(1);
  });

  it("uses chapter priors rather than exact family codes for pneumonia/asthma/UTI/diabetes/hypertension", () => {
    expect(resolveIcd10SearchPreferredCodePrefixes("neumonía")).toEqual(["J"]);
    expect(resolveIcd10SearchPreferredCodePrefixes("asma")).toEqual(["J"]);
    expect(resolveIcd10SearchPreferredCodePrefixes("UTI")).toEqual(["N3"]);
    expect(resolveIcd10SearchPreferredCodePrefixes("diabetes tipo 2")).toEqual(["E1"]);
    expect(resolveIcd10SearchPreferredCodePrefixes("hipertensión")).toEqual(["I1"]);
  });

  it("holds out an adversarial corpus that was not the original 35", () => {
    const original = new Set(ICD10_SEARCH_RELEVANCE_BENCHMARK.map((row) => row.query.toLowerCase()));
    expect(ICD10_SEARCH_ADVERSARIAL_BENCHMARK.length).toBeGreaterThanOrEqual(50);
    for (const spec of ICD10_SEARCH_ADVERSARIAL_BENCHMARK) {
      expect(original.has(spec.query.toLowerCase())).toBe(false);
    }
    expect(ICD10_SEARCH_ADVERSARIAL_BENCHMARK.map((row) => row.query)).toEqual(
      expect.arrayContaining(["dolor de pecho", "hematemesis", "chest pressure", "syncope"]),
    );
  });

  it("scores a perfect first-rank hit as TOP1 / MRR 1", () => {
    const spec = ICD10_SEARCH_RELEVANCE_BENCHMARK.find((row) => row.id === "es-nauseas")!;
    const metrics = evaluateIcd10SearchBenchmarkCase(spec, ["R11.0", "R11.2"]);
    expect(metrics).toEqual({ top1: true, top3: true, top5: true, reciprocalRank: 1 });
  });
});
