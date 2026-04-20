/**
 * Phase 4.9 — Deterministic BillingCatalog lookup key expansion (no clinical guessing).
 * Produces variant strings for the same human-entered or catalog-pasted key (spacing, hyphens, unicode).
 * Narrow synonym additions are last-resort, regex-bounded, and only for known drift patterns.
 */

function pushUnique(out: string[], v: string): void {
  const t = v.trim();
  if (t && !out.includes(t)) out.push(t);
}

/** Lowercase ASCII-ish for bounded synonym tests (accents stripped). */
function asciiLowerFold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .toLowerCase();
}

/**
 * Lab-only: add a few canonical BillingCatalog keys when text clearly refers to the same common panels.
 * Does not fuzzy-match arbitrary analytes.
 */
function appendLabNarrowSynonyms(fragment: string, out: string[]): void {
  const n = asciiLowerFold(fragment);

  if (
    /\bcbc\b/.test(n) ||
    /\bnfs\b/.test(n) ||
    /numeration\s+formule\s+sanguine/.test(n) ||
    /numération\s+formule\s+sanguine/.test(fragment.toLowerCase()) ||
    /complete\s+blood\s+count/.test(n)
  ) {
    pushUnique(out, "CBC");
    pushUnique(out, "NFS");
  }

  if (/\bcmp\b/.test(n) || /comprehensive\s+metabolic/.test(n) || (/\bmetabolic\b/.test(n) && /\bpanel\b/.test(n))) {
    pushUnique(out, "CMP");
  }

  if (/troponin/.test(n)) {
    pushUnique(out, "TROPONIN");
    pushUnique(out, "TROPONIN I");
  }
}

/**
 * Imaging-only: structural + narrow phrase variants (no contrast inference).
 */
function appendImagingNarrowSynonyms(fragment: string, out: string[]): void {
  const n = asciiLowerFold(fragment);

  if (/\bscanner\b/.test(n)) {
    const replaced = fragment.replace(/\bscanner\b/gi, "CT").replace(/\s+/g, " ").trim();
    pushUnique(out, replaced);
  }

  if (
    /\bchest\b/.test(n) &&
    (/\bx[\s\-]?ray\b/.test(n) || /\bcxr\b/.test(n) || /\brx\b/.test(n) || /\bradiographie\b/.test(n) || /\bthorax\b/.test(n))
  ) {
    pushUnique(out, "CHEST X-RAY");
    pushUnique(out, "CXR");
  }

  if (
    (/abdomen/.test(n) && /pelvis|pelvic|bassin/.test(n) && (/\bct\b/.test(n) || /\bscanner\b/.test(n))) ||
    /\bct\s+abdomen\s+pelvis\b/.test(n) ||
    /\bct\s+abdomen\s*\/\s*pelvis\b/.test(n)
  ) {
    pushUnique(out, "CT ABDOMEN PELVIS");
    pushUnique(out, "CT ABDOMEN/PELVIS");
  }
}

/**
 * Returns ordered unique candidate `externalCode` values to try against BillingCatalog.
 * Does not invent new clinical meanings — structural normalization first, then narrow synonyms.
 */
export function expandBillingCatalogLookupCandidates(triggerSource: string, raw: string): string[] {
  const ts = triggerSource.trim().toUpperCase();
  const s = raw.trim();
  if (!s) return [];

  const structural: string[] = [];
  const push = (x: string) => {
    const t = x.trim();
    if (t && !structural.includes(t)) structural.push(t);
  };

  push(s);

  const nfkc = s.normalize("NFKC");
  push(nfkc);

  const noNbsp = nfkc.replace(/\u00A0/g, " ");
  push(noNbsp);

  const singleSpace = noNbsp.replace(/\s+/g, " ").trim();
  push(singleSpace);

  const softDelim = singleSpace
    .replace(/[\u2010-\u2015\u2212\-/\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  push(softDelim);

  if (softDelim.length >= 3 && softDelim.length <= 96) {
    const compact = softDelim.replace(/\s+/g, "");
    if (compact !== softDelim) push(compact);
  }

  if (ts === "LAB" || ts === "IMAGING") {
    const stripped = softDelim.replace(/[.,;:]+$/g, "").replace(/^[,;:.\s]+/g, "").trim();
    if (stripped !== softDelim) push(stripped);
  }

  if (ts === "MEDICATION" || ts === "LAB") {
    const snake = softDelim
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    if (snake && snake !== softDelim && !structural.includes(snake)) push(snake);
  }

  const out: string[] = [];
  for (const c of structural) {
    pushUnique(out, c);
    if (ts === "LAB") appendLabNarrowSynonyms(c, out);
    if (ts === "IMAGING") appendImagingNarrowSynonyms(c, out);
  }

  return out;
}
