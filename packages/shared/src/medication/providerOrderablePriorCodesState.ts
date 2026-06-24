/**
 * Shared prior/active code state for enterprise provider-ordering registry.
 * Kept separate from domain modules to avoid circular imports during registry build.
 */

export type ProviderOrderingDomainId =
  | "tranche2"
  | "anticoagulation"
  | "insulinDiabetes"
  | "vaccine"
  | "criticalCare"
  | "neurology"
  | "infectiousDisease"
  | "cardiology"
  | "ivFluids"
  | "obgyn"
  | "psychiatry"
  | "gastroenterology"
  | "pediatrics"
  | "surgery"
  | "painManagement";

const EMPTY_SET: ReadonlySet<string> = new Set();

const activeCodesByDomain = new Map<ProviderOrderingDomainId, ReadonlySet<string>>();
const priorCodesByDomain = new Map<ProviderOrderingDomainId, ReadonlySet<string>>();

type PrewarmFn = () => ReadonlySet<string>;
let prewarmFn: PrewarmFn | null = null;
let prewarmComplete = false;

export function bindProviderOrderablePrewarm(fn: PrewarmFn): void {
  prewarmFn = fn;
}

export function markProviderOrderablePrewarmComplete(): void {
  prewarmComplete = true;
}

export function isProviderOrderablePrewarmComplete(): boolean {
  return prewarmComplete;
}

export function setActiveCodesForDomain(domain: ProviderOrderingDomainId, codes: ReadonlySet<string>): void {
  activeCodesByDomain.set(domain, codes);
}

export function setPriorCodesForDomain(domain: ProviderOrderingDomainId, codes: ReadonlySet<string>): void {
  priorCodesByDomain.set(domain, codes);
}

export function getActiveCodesForDomain(domain: ProviderOrderingDomainId): ReadonlySet<string> {
  return activeCodesByDomain.get(domain) ?? EMPTY_SET;
}

export function getPriorProviderOrderableCatalogCodesForDomain(
  domain: ProviderOrderingDomainId
): ReadonlySet<string> {
  if (!priorCodesByDomain.has(domain) && prewarmFn && !prewarmComplete) {
    prewarmFn();
  }
  return priorCodesByDomain.get(domain) ?? EMPTY_SET;
}

export function resetProviderOrderablePriorCodesStateForTests(): void {
  activeCodesByDomain.clear();
  priorCodesByDomain.clear();
  prewarmComplete = false;
}
