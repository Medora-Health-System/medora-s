"use client";

import { useEffect, useState } from "react";
import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";
import {
  clinicalWritingSuggestionLabel,
  replaceClinicalWritingSuggestion,
  suggestClinicalWritingTerm,
  type ClinicalWritingSuggestion,
} from "./ClinicalWritingLexicon";

const TEXT_INPUT_TYPES = new Set(["", "text"]);

type ActiveClinicalSuggestion = ClinicalWritingSuggestion & {
  element: HTMLTextAreaElement;
  left: number;
  top: number;
};

/**
 * Medora clinical writing assistance is deliberately suggestion-only.
 * We enable the user agent's language-aware spelling UI, but explicitly disable
 * silent autocorrection so chart meaning is never changed without a clinician action.
 * No Medora network request is made by this guard and no field value is mutated
 * unless the clinician explicitly accepts a Medora lexicon suggestion.
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

function setTextareaValue(element: HTMLTextAreaElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * System-wide authenticated writing corrector.
 *
 * Triage, Medical Evaluation, Nursing, Notes, Discharge, Registration and other
 * free-text surfaces inherit the active Medora locale automatically, including
 * dynamically-mounted modals/drawers. Search, email, phone, numeric/date and other
 * non-prose controls are not touched.
 *
 * Phase 2 adds a small Medora-owned, in-browser clinical vocabulary layer for
 * textarea prose. It never sends text off-device and never changes a chart silently.
 */
export function ClinicalWritingGuard({ language }: { language: SupportedLanguage }) {
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveClinicalSuggestion | null>(null);

  useEffect(() => {
    applyWritingSupport(document, language);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) applyWritingSupport(node, language);
        }
      }
    });

    const updateSuggestion = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLTextAreaElement)) return;
      if (element.hasAttribute("data-medora-clinical-lexicon-off")) {
        setActiveSuggestion(null);
        return;
      }

      const caret = element.selectionStart ?? element.value.length;
      const suggestion = suggestClinicalWritingTerm(element.value, caret, language);
      if (!suggestion) {
        setActiveSuggestion(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setActiveSuggestion({
        ...suggestion,
        element,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 48),
      });
    };

    const clearForOtherFocus = (event: Event) => {
      const element = event.target;
      if (element instanceof HTMLTextAreaElement) return;
      setActiveSuggestion(null);
    };

    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", updateSuggestion, true);
    document.addEventListener("keyup", updateSuggestion, true);
    document.addEventListener("focusin", clearForOtherFocus, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", updateSuggestion, true);
      document.removeEventListener("keyup", updateSuggestion, true);
      document.removeEventListener("focusin", clearForOtherFocus, true);
    };
  }, [language]);

  if (!activeSuggestion) return null;

  const acceptSuggestion = () => {
    const { element, start, replacement } = activeSuggestion;
    if (!element.isConnected) {
      setActiveSuggestion(null);
      return;
    }

    const nextValue = replaceClinicalWritingSuggestion(element.value, activeSuggestion);
    setTextareaValue(element, nextValue);
    const nextCaret = start + replacement.length;
    element.focus();
    element.setSelectionRange(nextCaret, nextCaret);
    setActiveSuggestion(null);
  };

  return (
    <button
      type="button"
      data-testid="clinical-writing-lexicon-suggestion"
      aria-label={clinicalWritingSuggestionLabel(language, activeSuggestion.replacement)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={acceptSuggestion}
      style={{
        position: "fixed",
        left: activeSuggestion.left,
        top: activeSuggestion.top,
        zIndex: 10000,
        maxWidth: 292,
        padding: "7px 10px",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        background: "#fff",
        color: "#0f172a",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)",
        cursor: "pointer",
      }}
    >
      {clinicalWritingSuggestionLabel(language, activeSuggestion.replacement)}
    </button>
  );
}
