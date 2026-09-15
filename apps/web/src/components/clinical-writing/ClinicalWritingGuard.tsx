"use client";

import { useEffect, useRef, useState } from "react";
import { productUiBcp47Tag, type SupportedLanguage } from "@/i18n/config";
import { clinicalWritingSuggestionLabel, replaceClinicalWritingSuggestion, suggestClinicalWritingTerm, type ClinicalWritingSuggestion } from "./ClinicalWritingLexicon";
import { clinicalGrammarSuggestionLabel, replaceClinicalGrammarSuggestion, suggestClinicalGrammar, type ClinicalGrammarSuggestion } from "./ClinicalGrammar";

const TEXT_INPUT_TYPES = new Set(["", "text"]);
type SuggestionPayload = (ClinicalWritingSuggestion & { kind: "spelling" }) | (ClinicalGrammarSuggestion & { kind: "grammar" });
type ActiveClinicalSuggestion = SuggestionPayload & { element: HTMLTextAreaElement; left: number; top: number };

export function shouldEnableClinicalWritingSupport(element: Element): boolean {
  if (element.hasAttribute("data-medora-writing-corrector-off")) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type.toLowerCase());
  return element instanceof HTMLElement && element.isContentEditable;
}

export function clinicalWritingLanguageTag(language: SupportedLanguage): string { return productUiBcp47Tag(language); }

function applyWritingSupport(root: ParentNode, language: SupportedLanguage): void {
  const lang = clinicalWritingLanguageTag(language);
  const candidates: Element[] = [];
  if (root instanceof Element && shouldEnableClinicalWritingSupport(root)) candidates.push(root);
  root.querySelectorAll("textarea, input, [contenteditable='true']").forEach((element) => { if (shouldEnableClinicalWritingSupport(element)) candidates.push(element); });
  for (const element of candidates) {
    element.setAttribute("lang", lang); element.setAttribute("spellcheck", "true");
    element.setAttribute("data-medora-writing-corrector", language); element.setAttribute("autocorrect", "off");
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) element.setAttribute("autocapitalize", "sentences");
  }
}

function setTextareaValue(element: HTMLTextAreaElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Suggestion-only, local clinical writing support. Chart text changes only after explicit clinician acceptance. */
export function ClinicalWritingGuard({ language }: { language: SupportedLanguage }) {
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveClinicalSuggestion | null>(null);
  const suggestionButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    applyWritingSupport(document, language);
    const observer = new MutationObserver((mutations) => { for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof Element) applyWritingSupport(node, language); });
    const updateSuggestion = (event: Event) => {
      const element = event.target;
      if (!(element instanceof HTMLTextAreaElement)) return;
      if (element.hasAttribute("data-medora-clinical-lexicon-off")) { setActiveSuggestion(null); return; }
      const caret = element.selectionStart ?? element.value.length;
      const spelling = suggestClinicalWritingTerm(element.value, caret, language);
      const grammar = spelling ? null : suggestClinicalGrammar(element.value, language);
      const suggestion: SuggestionPayload | null = spelling ? { ...spelling, kind: "spelling" } : grammar ? { ...grammar, kind: "grammar" } : null;
      if (!suggestion) { setActiveSuggestion(null); return; }
      const rect = element.getBoundingClientRect();
      setActiveSuggestion({ ...suggestion, element, left: Math.max(8, Math.min(rect.left, window.innerWidth - 340)), top: Math.min(rect.bottom + 6, window.innerHeight - 48) });
    };
    const clearForFocusChange = (event: Event) => {
      const focused = event.target;
      setActiveSuggestion((current) => current && (current.element === focused || suggestionButtonRef.current === focused) ? current : null);
    };
    const clearOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveSuggestion(null); };
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", updateSuggestion, true); document.addEventListener("keyup", updateSuggestion, true);
    document.addEventListener("focusin", clearForFocusChange, true); document.addEventListener("keydown", clearOnEscape, true);
    return () => { observer.disconnect(); document.removeEventListener("input", updateSuggestion, true); document.removeEventListener("keyup", updateSuggestion, true); document.removeEventListener("focusin", clearForFocusChange, true); document.removeEventListener("keydown", clearOnEscape, true); };
  }, [language]);

  if (!activeSuggestion) return null;
  const label = activeSuggestion.kind === "grammar" ? clinicalGrammarSuggestionLabel(language, activeSuggestion.replacement) : clinicalWritingSuggestionLabel(language, activeSuggestion.replacement);
  const acceptSuggestion = () => {
    const { element, start, replacement } = activeSuggestion;
    const focusOwnerIsValid = document.activeElement === element || document.activeElement === suggestionButtonRef.current;
    if (!element.isConnected || !focusOwnerIsValid) { setActiveSuggestion(null); return; }
    const nextValue = activeSuggestion.kind === "grammar" ? replaceClinicalGrammarSuggestion(element.value, activeSuggestion) : replaceClinicalWritingSuggestion(element.value, activeSuggestion);
    setTextareaValue(element, nextValue);
    const nextCaret = start + replacement.length;
    element.focus(); element.setSelectionRange(nextCaret, nextCaret); setActiveSuggestion(null);
  };

  return (
    <button ref={suggestionButtonRef} type="button" data-medora-clinical-suggestion="true" data-testid={activeSuggestion.kind === "grammar" ? "clinical-writing-grammar-suggestion" : "clinical-writing-lexicon-suggestion"} aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={acceptSuggestion} style={{ position: "fixed", left: activeSuggestion.left, top: activeSuggestion.top, zIndex: 10000, maxWidth: 332, padding: "7px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#0f172a", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)", cursor: "pointer" }}>
      {label}
    </button>
  );
}
