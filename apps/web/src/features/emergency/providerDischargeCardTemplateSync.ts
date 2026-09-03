/**
 * Phase 19Y.5A / 19Y.5B — synchronous diagnosis-card template sync + identity immutability guard.
 */

import { cardTextViolatesExpectedTemplateIntegrity } from "./providerDischargeTemplateContentIntegrity";
import { computeProviderDischargeTemplateAppliedHash } from "./providerDischargeTemplateAppliedHash";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  requireProviderDischargeTemplateLocale,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateLocale,
} from "./providerDischargeTemplateRegistry";
import {
  evaluateProviderDischargeCardIdentitySync,
  findDiagnosisDocForRef,
  hasProviderDischargeCardCreationIdentity,
  PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
  stampProviderDischargeCardCreationIdentity,
  type ProviderDischargeDiagnosisCard,
  type ProviderDischargeDiagnosisRef,
  type ProviderDischargeDocumentationForm,
} from "./providerDischargeDocumentationModel";
import type { DischargeInstructionCareSettingContext } from "@medora/shared";

export { PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION };

export function expectedProviderDischargeTemplateIdForDiagnosis(
  code: string,
  displayName: string
): string | null {
  const resolved = resolveProviderDischargeTemplateForDiagnosis({ code, displayName });
  return resolved.matchLevel === "generic" ? null : resolved.template.id;
}

export function providerDischargeCardDiagnosisIdentityChanged(
  card: ProviderDischargeDiagnosisCard,
  ref: ProviderDischargeDiagnosisRef
): boolean {
  return evaluateProviderDischargeCardIdentitySync(card, ref).diagnosisIdentityDrifted;
}

function backfillProviderDischargeCardCreationIdentity(
  card: ProviderDischargeDiagnosisCard,
  ref: ProviderDischargeDiagnosisRef
): ProviderDischargeDiagnosisCard {
  if (hasProviderDischargeCardCreationIdentity(card)) return card;
  const templateId =
    card.templateMeta?.templateId ??
    card.sourceTemplateId ??
    expectedProviderDischargeTemplateIdForDiagnosis(card.code, card.displayName);
  return stampProviderDischargeCardCreationIdentity(card, {
    code: card.code,
    label: card.displayName,
    templateId,
  });
}

function stampNewProviderDischargeCardCreationIdentity(
  card: ProviderDischargeDiagnosisCard,
  ref: ProviderDischargeDiagnosisRef
): ProviderDischargeDiagnosisCard {
  const templateId =
    card.templateMeta?.templateId ??
    card.sourceTemplateId ??
    expectedProviderDischargeTemplateIdForDiagnosis(ref.code, ref.label);
  return stampProviderDischargeCardCreationIdentity(card, {
    code: ref.code,
    label: ref.label,
    templateId,
  });
}

export function providerDischargeCardNeedsLocaleReapply(
  card: ProviderDischargeDiagnosisCard,
  activeLocale: ProviderDischargeTemplateLocale
): boolean {
  if (card.templateMeta?.providerConfirmed === true) return false;

  const appliedLocale = card.templateMeta?.appliedLocale;
  if (appliedLocale && appliedLocale !== activeLocale) return true;

  const templateId = card.templateMeta?.templateId ?? card.sourceTemplateId;
  const appliedHash = card.templateMeta?.templateAppliedHash;
  if (!templateId || !appliedHash) return false;

  const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === templateId);
  if (!template) return false;

  const activeHash = computeProviderDischargeTemplateAppliedHash(template, activeLocale);
  if (appliedHash === activeHash) return false;

  // SAFE NON-DISPLAY MULTILINGUAL LOGIC: compare the other stored bilingual
  // template hash only. A match means reapply in `activeLocale` — never render
  // the other language as the current locale.
  const otherLocale: ProviderDischargeTemplateLocale = activeLocale === "fr" ? "en" : "fr";
  const otherHash = computeProviderDischargeTemplateAppliedHash(template, otherLocale);
  return appliedHash === otherHash;
}

export function isProviderDischargeCardTemplateStale(
  card: ProviderDischargeDiagnosisCard,
  activeLocale?: ProviderDischargeTemplateLocale
): boolean {
  const expected = expectedProviderDischargeTemplateIdForDiagnosis(card.code, card.displayName);
  if (!expected) return false;
  if (card.templateMeta?.providerConfirmed === true) return false;

  if (activeLocale && providerDischargeCardNeedsLocaleReapply(card, activeLocale)) return true;

  const applied = card.templateMeta?.templateId ?? card.sourceTemplateId;
  if (applied && applied !== expected) return true;

  const creationTemplate = card.resolvedTemplateIdAtCreation?.trim();
  if (creationTemplate && creationTemplate !== expected) return true;

  const hasCardText =
    Boolean(card.description.trim()) ||
    Boolean(card.diagnosisInstructions.trim()) ||
    Boolean(card.medicationTreatment.trim());

  if (!applied && hasCardText && cardTextViolatesExpectedTemplateIntegrity(card, expected)) {
    return true;
  }

  return false;
}

export function shouldReapplyProviderDischargeTemplateToCard(
  card: ProviderDischargeDiagnosisCard,
  ref: ProviderDischargeDiagnosisRef,
  activeLocale?: ProviderDischargeTemplateLocale
): boolean {
  const identity = evaluateProviderDischargeCardIdentitySync(card, ref);
  if (identity.staleDiagnosisIdentityWarning) return false;
  if (identity.allowAutoSync) return true;
  if (card.templateMeta?.providerConfirmed === true) return false;
  return isProviderDischargeCardTemplateStale(card, activeLocale);
}

export type SyncProviderDischargeCardOptions = {
  applyTemplate?: boolean;
  locale?: ProviderDischargeTemplateLocale;
  isPrimary?: boolean;
  displayOrder?: number;
  actor?: { displayName?: string; appliedAt?: string };
  /** Explicit refresh from UI — still respects providerConfirmed unless forceOverwrite. */
  forceOverwrite?: boolean;
  /** MEDUI.D4C.7 — Clinic / UC care-setting narrative context. */
  careSettingContext?: DischargeInstructionCareSettingContext | null;
};

function resolveSyncLocale(options: SyncProviderDischargeCardOptions): ProviderDischargeTemplateLocale {
  return requireProviderDischargeTemplateLocale(
    options.locale,
    "syncProviderDischargeCardWithRef"
  );
}

export function syncProviderDischargeCardWithRef(
  card: ProviderDischargeDiagnosisCard,
  ref: ProviderDischargeDiagnosisRef,
  options: SyncProviderDischargeCardOptions
): ProviderDischargeDiagnosisCard {
  const withCreationIdentity = backfillProviderDischargeCardCreationIdentity(card, ref);
  const identity = evaluateProviderDischargeCardIdentitySync(withCreationIdentity, ref);

  let synced: ProviderDischargeDiagnosisCard = {
    ...withCreationIdentity,
    sourceEncounterDiagnosisId: ref.encounterDiagnosisId ?? withCreationIdentity.sourceEncounterDiagnosisId,
    encounterDiagnosisId: ref.encounterDiagnosisId ?? withCreationIdentity.encounterDiagnosisId,
    code: ref.code,
    displayName: ref.label,
    isPrimaryDiagnosis: options.isPrimary ?? withCreationIdentity.isPrimaryDiagnosis,
    displayOrder: options.displayOrder ?? withCreationIdentity.displayOrder,
    cardTemplateSyncVersion:
      withCreationIdentity.cardTemplateSyncVersion ?? PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
    staleDiagnosisIdentityWarning: identity.staleDiagnosisIdentityWarning,
  };

  if (!options.applyTemplate || identity.staleDiagnosisIdentityWarning) return synced;

  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: ref.code,
    displayName: ref.label,
  });

  const activeLocale = resolveSyncLocale(options);
  const localeMismatch = providerDischargeCardNeedsLocaleReapply(withCreationIdentity, activeLocale);
  const overwrite =
    options.forceOverwrite === true ||
    localeMismatch ||
    shouldReapplyProviderDischargeTemplateToCard(withCreationIdentity, ref, activeLocale);

  return applyProviderDischargeTemplateToCard(synced, resolved, {
    locale: activeLocale,
    overwriteExisting: overwrite,
    providerConfirmed: withCreationIdentity.templateMeta?.providerConfirmed ?? false,
    actor: options.actor,
    careSettingContext: options.careSettingContext,
  });
}

export function ensureProviderDischargeCardForRef(
  form: ProviderDischargeDocumentationForm,
  ref: ProviderDischargeDiagnosisRef,
  options: SyncProviderDischargeCardOptions & {
    displayOrder: number;
    isPrimary: boolean;
  }
): ProviderDischargeDiagnosisCard {
  const existing = findDiagnosisDocForRef(form, ref);
  if (existing) {
    return syncProviderDischargeCardWithRef(existing, ref, {
      ...options,
      isPrimary: options.isPrimary,
      displayOrder: options.displayOrder,
    });
  }

  const created = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: ref.encounterDiagnosisId ?? `ref-${ref.code}`,
    code: ref.code,
    displayName: ref.label,
    displayOrder: options.displayOrder,
    isPrimaryDiagnosis: options.isPrimary,
    ...(options.applyTemplate ?
      {
        applyTemplateSuggestion: true as const,
        locale: resolveSyncLocale(options),
      }
    : { applyTemplateSuggestion: false as const }),
    actor: options.actor,
    careSettingContext: options.careSettingContext,
  });

  return stampNewProviderDischargeCardCreationIdentity(created, ref);
}

export function applyProviderDischargeTemplateToCardByDiagnosis(
  card: ProviderDischargeDiagnosisCard,
  options: {
    locale: ProviderDischargeTemplateLocale;
    overwriteExisting?: boolean;
    forceOverwrite?: boolean;
    providerConfirmed?: boolean;
    ref?: ProviderDischargeDiagnosisRef;
    actor?: { displayName?: string; appliedAt?: string };
    careSettingContext?: DischargeInstructionCareSettingContext | null;
  }
): ProviderDischargeDiagnosisCard {
  const withIdentity = options.ref ?
    backfillProviderDischargeCardCreationIdentity(card, options.ref)
  : card;

  if (options.ref) {
    const identity = evaluateProviderDischargeCardIdentitySync(withIdentity, options.ref);
    if (identity.staleDiagnosisIdentityWarning && !options.forceOverwrite) {
      return {
        ...withIdentity,
        staleDiagnosisIdentityWarning: true,
        cardTemplateSyncVersion:
          withIdentity.cardTemplateSyncVersion ?? PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
      };
    }
  }

  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: withIdentity.code,
    displayName: withIdentity.displayName,
  });
  if (resolved.matchLevel === "generic" && !options.overwriteExisting && !options.forceOverwrite) {
    return withIdentity;
  }

  const localeMismatch = providerDischargeCardNeedsLocaleReapply(withIdentity, options.locale);
  const overwrite =
    options.forceOverwrite === true ||
    options.overwriteExisting === true ||
    localeMismatch ||
    (options.ref ?
      shouldReapplyProviderDischargeTemplateToCard(withIdentity, options.ref, options.locale)
    : isProviderDischargeCardTemplateStale(withIdentity, options.locale));

  const next = applyProviderDischargeTemplateToCard(withIdentity, resolved, {
    locale: options.locale,
    overwriteExisting: overwrite,
    providerConfirmed: options.providerConfirmed ?? withIdentity.templateMeta?.providerConfirmed ?? false,
    actor: options.actor,
    careSettingContext: options.careSettingContext,
  });

  return {
    ...next,
    cardTemplateSyncVersion: withIdentity.cardTemplateSyncVersion ?? PROVIDER_DISCHARGE_CARD_TEMPLATE_SYNC_VERSION,
    staleDiagnosisIdentityWarning: false,
  };
}
