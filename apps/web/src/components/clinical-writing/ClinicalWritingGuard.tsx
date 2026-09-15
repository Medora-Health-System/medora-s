"use client";

import { useEffect } from "react";
import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";

const TEXT_INPUT_TYPES = new Set(["", "text"]);

/**
 * Medora clinical writing assistance is deliberately suggestion-only.
 * We enable the user agent's language-aware spelling UI, but explicitly disable
 * silent autocorrection so chart meaning is never changed without a clinician action.
 * No Medora network request is made by this guard and no field value is mutated.
 */
export function shouldEnableClinicalWritingSupport(element: Element): boolean {
  if (element.hasAttribute("data-medora-writing-corrector-off")) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

export function clinicalWritingLanguageTag(language: SupportedLanguage): string {
  return productUiBcp47Tag(language);
}

function applyWritingSupport(root: ParentNode, language: SupportedLanguage): void {
  const lang = clinicalWritingLanguageTag(language);
  const candidates: Element[] = [];

  if (root instanceof Element && shouldEnableClinicalWritingSupport(root)) {
    candidates.push(root);
  }

  root
    .querySelectorAll("textarea, input, [contenteditable='true']")
    .forEach((element) => {
      if (shouldEnableClinicalWritingSupport(element)) candidates.push(element);
    });

  for (const element of candidates) {
    element.setAttribute("lang", lang);
    element.setAttribute("spellcheck", "true");
    element.setAttribute("data-medora-writing-corrector", language);

    // Safari/iOS can silently replace words when autocorrect is enabled. Clinical
    // documentation must remain user-approved, so keep correction suggestions only.
    element.setAttribute("autocorrect", "off");

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.setAttribute("autocapitalize", "sentences");
    }
  }
}

/**
 * System-wide authenticated writing corrector.
 *
 * Triage, Medical Evaluation, Nursing, Notes, Discharge, Registration and other
 * free-text surfaces inherit the active Medora locale automatically, including
 * dynamically-mounted modals/drawers. Search, email, phone, numeric/date and other
 * non-prose controls are not touched.
 */
export function ClinicalWritingGuard({ language }: { language: SupportedLanguage }) {
  useEffect(() => {
    applyWritingSupport(document, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) applyWritingSupport(node, language);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
