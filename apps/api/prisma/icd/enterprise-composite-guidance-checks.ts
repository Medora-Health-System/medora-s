/**
 * Pure composite guidance checks duplicated for API-side enterprise certification.
 */
export function flattenCompositeKeys(sections: Record<string, string[] | undefined>): string[] {
  return Object.values(sections)
    .filter(Boolean)
    .flat() as string[];
}

export function compositeSectionsHaveDuplicateKeys(sections: Record<string, string[] | undefined>): boolean {
  const keys = flattenCompositeKeys(sections);
  return new Set(keys).size !== keys.length;
}

export function assertCompositeModuleShape(moduleExports: string[], required: string[]): string[] {
  return required.filter((name) => !moduleExports.includes(name));
}
