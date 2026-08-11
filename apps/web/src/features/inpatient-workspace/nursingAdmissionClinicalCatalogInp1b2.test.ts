import { describe, expect, it } from "vitest";
import { allNursingSectionSchemas } from "@medora/shared";
import { hospitalAdmissionD4a25En } from "@/i18n/messages/hospitalAdmissionD4a25.en";
import { hospitalAdmissionD4a25Fr } from "@/i18n/messages/hospitalAdmissionD4a25.fr";
import { isAdmissionChipEditorField } from "./NursingAdmissionStructuredSectionForm";

describe("INP.1B.2 admission labels and editors", () => {
  it("has explicit readable EN/FR labels for every catalog field", () => {
    for (const section of allNursingSectionSchemas()) {
      for (const field of section.fields) {
        const en = hospitalAdmissionD4a25En.fields[field.key as keyof typeof hospitalAdmissionD4a25En.fields];
        const fr = hospitalAdmissionD4a25Fr.fields[field.key as keyof typeof hospitalAdmissionD4a25Fr.fields];
        expect(en, `${field.key} EN label`).toBeTruthy();
        expect(fr, `${field.key} FR label`).toBeTruthy();
        if (/[A-Z]/.test(field.key)) expect(en, `${field.key} is not glued`).toContain(" ");
      }
    }
  });

  it("uses one canonical editor for each immediate-assessment chip concept", () => {
    for (const key of ["generalAppearance", "levelOfConsciousness", "orientation", "immediateConcerns"]) {
      expect(isAdmissionChipEditorField("NURSING_ADMISSION_ASSESSMENT", key)).toBe(true);
    }
  });
});
