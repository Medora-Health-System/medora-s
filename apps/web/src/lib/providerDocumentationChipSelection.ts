import { documentationFragmentPresentInField } from "./providerDocumentationModel";

export type DocumentationChipTone = "warn" | "green" | "default";

export function isDocumentationChipSelected(fieldText: string, fragment: string): boolean {
  return documentationFragmentPresentInField(fieldText, fragment);
}

export function resolveDocumentationChipStyles(input: {
  selected: boolean;
  readOnly: boolean;
  tone?: DocumentationChipTone | "warn" | "green";
}): { background: string; borderColor: string; color: string } {
  if (input.readOnly) {
    return { background: "#f1f5f9", borderColor: "#e2e8f0", color: "#94a3b8" };
  }

  if (input.selected) {
    if (input.tone === "green") {
      return { background: "#166534", borderColor: "#14532d", color: "#ffffff" };
    }
    if (input.tone === "warn") {
      return { background: "#92400e", borderColor: "#78350f", color: "#ffffff" };
    }
    return { background: "#1e40af", borderColor: "#1e3a8a", color: "#ffffff" };
  }

  if (input.tone === "warn") {
    return { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" };
  }
  if (input.tone === "green") {
    return { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" };
  }
  return { background: "#eff6ff", borderColor: "#dbeafe", color: "#1e40af" };
}
