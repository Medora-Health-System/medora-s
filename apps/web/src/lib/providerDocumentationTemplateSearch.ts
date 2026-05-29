import {
  PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS,
} from "./providerDocumentationTemplateCatalog";
import type { ProviderDocumentationTemplateDefinition } from "./providerDocumentationModel";

/** Centered search bar max width — does not expand parent board (MEDUI.4). */
export const PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX = 520;

export function normalizeProviderDocumentationSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function providerDocumentationTemplateSearchTerms(query: string): string[] {
  const normalized = normalizeProviderDocumentationSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

export function providerDocumentationTemplateSearchableText(
  template: ProviderDocumentationTemplateDefinition,
  resolveLabel: (key: string) => string
): string {
  const parts = [
    template.id.replace(/_/g, " "),
    resolveLabel(template.labelKey),
    resolveLabel(template.helperKey),
    resolveLabel(PROVIDER_DOCUMENTATION_MAJOR_GROUP_LABEL_KEYS[template.majorGroup]),
  ];
  if (template.pickerSubgroupKey) {
    parts.push(resolveLabel(PROVIDER_DOCUMENTATION_TEMPLATE_PICKER_SUBGROUP_LABEL_KEYS[template.pickerSubgroupKey]));
  }
  if (template.categoryKey) {
    parts.push(resolveLabel(template.categoryKey));
  }
  return normalizeProviderDocumentationSearchText(parts.join(" "));
}

export function filterProviderDocumentationTemplates(
  query: string,
  resolveLabel: (key: string) => string,
  catalog: readonly ProviderDocumentationTemplateDefinition[] = PROVIDER_DOCUMENTATION_TEMPLATES
): ProviderDocumentationTemplateDefinition[] {
  const terms = providerDocumentationTemplateSearchTerms(query);
  if (terms.length === 0) return [...catalog];
  return catalog.filter((template) => {
    const haystack = providerDocumentationTemplateSearchableText(template, resolveLabel);
    return terms.every((term) => haystack.includes(term));
  });
}

export function countProviderDocumentationTemplateSearchMatches(
  query: string,
  resolveLabel: (key: string) => string,
  catalog: readonly ProviderDocumentationTemplateDefinition[] = PROVIDER_DOCUMENTATION_TEMPLATES
): number {
  return filterProviderDocumentationTemplates(query, resolveLabel, catalog).length;
}
