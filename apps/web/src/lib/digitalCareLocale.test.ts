import { describe, expect, it } from "vitest";
import {
  digitalCarePrintLabels,
  localizeDigitalCareResultCategory,
  localizeDigitalCareResultTitle,
} from "./digitalCareLocale";

describe("Digital Care locale consistency", () => {
  it("localizes generic laboratory fallbacks without changing authored test names", () => {
    expect(localizeDigitalCareResultTitle("Laboratory result", "LAB_TEST", "es")).toBe("Resultado de laboratorio");
    expect(localizeDigitalCareResultTitle("Resultado de laboratorio", "LAB_TEST", "en")).toBe("Laboratory result");
    expect(localizeDigitalCareResultTitle("Laboratory result", "LAB_TEST", "fr")).toBe("Résultat de laboratoire");
    expect(localizeDigitalCareResultTitle("Comprehensive metabolic panel", "LAB_TEST", "es")).toBe("Comprehensive metabolic panel");
  });

  it("localizes generic imaging fallbacks in every supported UI language", () => {
    expect(localizeDigitalCareResultTitle("Imaging result", "IMAGING_STUDY", "es")).toBe("Resultado de imagen");
    expect(localizeDigitalCareResultTitle("Resultado de imagen", "IMAGING_STUDY", "fr")).toBe("Résultat d’imagerie");
    expect(localizeDigitalCareResultTitle("Résultat d’imagerie", "IMAGING_STUDY", "en")).toBe("Imaging result");
  });

  it("localizes system result categories instead of leaking English into Spanish or French", () => {
    expect(localizeDigitalCareResultCategory("Lab", "LAB_TEST", "es")).toBe("Laboratorio");
    expect(localizeDigitalCareResultCategory("Laboratorio", "LAB_TEST", "en")).toBe("Lab");
    expect(localizeDigitalCareResultCategory("Imaging", "IMAGING_STUDY", "fr")).toBe("Imagerie");
    expect(localizeDigitalCareResultCategory("Other", "OTHER", "es")).toBe("Otro");
  });

  it("keeps printable result chrome in the selected language", () => {
    expect(digitalCarePrintLabels("es")).toEqual(expect.objectContaining({ test: "Prueba", result: "Resultado", reference: "Referencia", flag: "Marca" }));
    expect(digitalCarePrintLabels("fr")).toEqual(expect.objectContaining({ test: "Analyse", result: "Résultat", reference: "Référence" }));
    expect(digitalCarePrintLabels("en")).toEqual(expect.objectContaining({ test: "Test", result: "Result", reference: "Reference" }));
  });
});
