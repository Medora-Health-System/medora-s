/**
 * Normalisation affichage résultats labo / imagerie (consultation + dossier).
 * Données brutes inchangées côté stockage ; uniquement mapping UI.
 */

export type ResultAttachmentRow = {
  fileName?: string | null;
  mimeType?: string | null;
  dataBase64?: string | null;
};

/** Pièces jointes : toutes les entrées (y compris sans base64) pour message FR explicite. */
export function attachmentsFromResultDataAll(resultData: unknown): ResultAttachmentRow[] {
  if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return [];
  const att = (resultData as Record<string, unknown>).attachments;
  if (!Array.isArray(att)) return [];
  return att
    .filter((a) => a && typeof a === "object")
    .map((a) => {
      const o = a as Record<string, unknown>;
      return {
        fileName: typeof o.fileName === "string" ? o.fileName : null,
        mimeType: typeof o.mimeType === "string" ? o.mimeType : null,
        dataBase64: typeof o.dataBase64 === "string" ? o.dataBase64 : null,
      };
    });
}

export type ClinicalResultViewerInput = {
  title: string;
  itemStatus?: string | null;
  verifiedAt?: string | null;
  criticalValue?: boolean | null;
  resultText?: string | null;
  attachments?: ResultAttachmentRow[] | null;
  /** Nom affichage du professionnel ayant saisi / validé le résultat */
  enteredByDisplayFr?: string | null;
  /** Pour mise en page labo vs imagerie */
  catalogItemType?: "LAB_TEST" | "IMAGING_STUDY";
};

/** Ligne commande enrichie (GET encounter orders ou résumé dossier). */
export function clinicalResultFromOrderItemLike(item: {
  displayLabelFr?: string;
  displayLabel?: string;
  status?: string;
  catalogItemType?: string;
  result?: {
    resultText?: string | null;
    verifiedAt?: string | null;
    criticalValue?: boolean | null;
    resultData?: unknown;
    enteredByDisplayFr?: string | null;
  } | null;
}): ClinicalResultViewerInput {
  const title =
    (item.displayLabelFr ?? item.displayLabel ?? "").trim() || "Examen";
  const r = item.result;
  return {
    title,
    itemStatus: item.status ?? null,
    verifiedAt: r?.verifiedAt ?? null,
    criticalValue: r?.criticalValue ?? null,
    resultText: r?.resultText ?? null,
    attachments: attachmentsFromResultDataAll(r?.resultData ?? null),
    enteredByDisplayFr: r?.enteredByDisplayFr ?? null,
    catalogItemType:
      item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY"
        ? item.catalogItemType
        : undefined,
  };
}

/** Résumé dossier patient : pièces déjà aplanies par l’API (`attachments`). */
export function clinicalResultFromChartOrderItem(item: {
  displayLabel: string;
  status: string;
  catalogItemType?: string;
  result: {
    resultText: string | null;
    verifiedAt: string | null;
    criticalValue: boolean;
    enteredByDisplayFr?: string | null;
    attachments?: ResultAttachmentRow[] | null;
  } | null;
}): ClinicalResultViewerInput {
  const title = item.displayLabel.trim() || "Examen";
  const r = item.result;
  return {
    title,
    itemStatus: item.status,
    verifiedAt: r?.verifiedAt ?? null,
    criticalValue: r?.criticalValue ?? null,
    resultText: r?.resultText ?? null,
    attachments: r?.attachments?.length ? r.attachments : [],
    enteredByDisplayFr: r?.enteredByDisplayFr ?? null,
    catalogItemType:
      item.catalogItemType === "LAB_TEST" || item.catalogItemType === "IMAGING_STUDY"
        ? item.catalogItemType
        : undefined,
  };
}

export type LabParsedRow = {
  label: string;
  value: string;
  ref?: string;
  /** Indication visuelle (H/L/C) si détectée dans le texte */
  flag?: "H" | "L" | "HH" | "LL" | "C" | null;
};

const CONCLUSION_START =
  /^(conclusion|interprétation|commentaire|synthèse|interprétation\s+biologique)\b/i;

/** Ligne « titre de section » labo (non traitée comme analyte). */
function isLabSectionHeader(line: string): boolean {
  const t = line.trim();
  if (t.length > 60) return false;
  return /^(résultats?|hémogramme|biochimie|ionogramme|hémostase|urines?|nfs|numération|bilan)\b/i.test(t);
}

/** Détecte H / L / critique dans la valeur. */
function extractFlag(value: string): { clean: string; flag: LabParsedRow["flag"] } {
  let v = value.trim();
  let flag: LabParsedRow["flag"] = null;
  const m = v.match(/\s*\b(HH|LL|H|L|C)\b\s*$/i);
  if (m) {
    const g = m[1].toUpperCase();
    if (g === "HH") flag = "HH";
    else if (g === "LL") flag = "LL";
    else if (g === "H") flag = "H";
    else if (g === "L") flag = "L";
    else if (g === "C") flag = "C";
    v = v.slice(0, m.index).trim();
  }
  if (/\bcritique\b/i.test(value)) flag = "C";
  return { clean: v, flag };
}

function parsePipeOrTabLine(line: string): LabParsedRow | null {
  if (line.includes("|")) {
    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length >= 4) {
      return { label: parts[0], value: parts[1], ref: parts.slice(2).join(" ") };
    }
    if (parts.length === 3) {
      const last = parts[2];
      if (/^[\d.,\s\-–—]+(\s*(g|mg|%|U\/L|\/µL|mmol|mEq))?$/i.test(last) || last.length < 30) {
        return { label: parts[0], value: parts[1], ref: parts[2] };
      }
      return { label: parts[0], value: `${parts[1]} ${parts[2]}` };
    }
    if (parts.length === 2) {
      const { clean, flag } = extractFlag(parts[1]);
      return { label: parts[0], value: clean, flag };
    }
  }
  if (line.includes("\t")) {
    const parts = line.split(/\t/).map((p) => p.trim());
    if (parts.length >= 2) {
      const { clean, flag } = extractFlag(parts[1]);
      return {
        label: parts[0],
        value: clean,
        ref: parts[2],
        flag,
      };
    }
  }
  return null;
}

/**
 * Extrait lignes labo : puces, « libellé : valeur », séparateurs | ou tab,
 * références (réf., VR, N:, plage entre parenthèses).
 */
export function parseLabObservationLines(raw: string): {
  rows: LabParsedRow[];
  preamble: string;
  conclusion: string;
  sectionNotes: string[];
} {
  const text = (raw ?? "").trim();
  if (!text) return { rows: [], preamble: "", conclusion: "", sectionNotes: [] };

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let conclusion = "";
  let bodyLines = [...lines];
  const concIdx = lines.findIndex((l) => CONCLUSION_START.test(l));
  if (concIdx >= 0) {
    const afterHeader = lines[concIdx].replace(CONCLUSION_START, "").trim();
    const rest = lines.slice(concIdx + 1);
    conclusion = [afterHeader, ...rest].filter(Boolean).join("\n").trim();
    bodyLines = lines.slice(0, concIdx);
  }

  const rows: LabParsedRow[] = [];
  const preambleParts: string[] = [];
  const sectionNotes: string[] = [];

  const tryPushRow = (r: LabParsedRow) => {
    const { clean, flag } = extractFlag(r.value);
    rows.push({ ...r, value: clean, flag: flag ?? r.flag });
  };

  for (const line of bodyLines) {
    if (!line) continue;
    if (isLabSectionHeader(line)) {
      sectionNotes.push(line);
      continue;
    }

    const pipe = parsePipeOrTabLine(line);
    if (pipe) {
      tryPushRow(pipe);
      continue;
    }

    const refParen = line.match(
      /^[-•*]?\s*(.+?)\s*:\s*(.+?)\s*\(\s*(?:réf|ref|vr|n)\s*[.:]?\s*([^)]+)\)\s*$/i
    );
    if (refParen) {
      tryPushRow({ label: refParen[1].trim(), value: refParen[2].trim(), ref: refParen[3].trim() });
      continue;
    }

    const refMatch = line.match(/^[-•*]?\s*(.+?)\s*:\s*(.+?)\s*\(\s*ref\s*[.:]\s*([^)]+)\)\s*$/i);
    if (refMatch) {
      tryPushRow({ label: refMatch[1].trim(), value: refMatch[2].trim(), ref: refMatch[3].trim() });
      continue;
    }

    const bullet = line.match(/^[-•*]\s*(.+?)\s*:\s*(.+)$/);
    const plain = line.match(/^([^:{]+?)\s*:\s*(.+)$/);
    if (bullet && bullet[1].length < 100) {
      tryPushRow({ label: bullet[1].trim(), value: bullet[2].trim() });
      continue;
    }
    if (plain && plain[1].length < 140 && !plain[1].includes("  ") && plain[1].split(/\s+/).length <= 12) {
      tryPushRow({ label: plain[1].trim(), value: plain[2].trim() });
      continue;
    }

    const valueFirst = line.match(
      /^(.+?)\s+([\d]+[.,]?[\d]*\s*(?:x10\^?\d+)?\s*(?:g\/dL|g\/L|mg\/dL|%|\/µL|10\^3\/µL|UI\/L|mEq\/L|mmol\/L)?)\s*$/i
    );
    if (valueFirst && valueFirst[1].length < 80) {
      tryPushRow({ label: valueFirst[1].trim(), value: valueFirst[2].trim() });
      continue;
    }

    preambleParts.push(line);
  }

  return {
    rows,
    preamble: preambleParts.join("\n").trim(),
    conclusion,
    sectionNotes,
  };
}

/** Paragraphes structurés si le texte labo ne donne aucune ligne tableau (repli lisible). */
export function splitLabFallbackParagraphs(raw: string): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [];
  const blocks = t.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.length ? blocks : [t];
}

export type RadiologySection = { heading: string; body: string };

/**
 * Libellés d’examen FR pour l’affichage (données catalogue parfois en anglais).
 */
export function normalizeExamTitleFr(title: string): string {
  const t = (title ?? "").trim();
  if (!t) return t;
  const rules: { re: RegExp; fr: string }[] = [
    { re: /\bcomplete\s*blood\s*count\b|\bCBC\b/i, fr: "Numération formule sanguine (NFS)" },
    { re: /\bcomprehensive\s*metabolic(\s*panel)?\b|\bCMP\b/i, fr: "Bilan métabolique complet (CMP)" },
    { re: /\bbasic\s*metabolic\s*panel\b|\bBMP\b/i, fr: "Bilan métabolique de base (BMP)" },
    { re: /\burinalysis\b|\burine\s*analysis\b/i, fr: "Analyse d’urines" },
    { re: /\burine\s*culture\b|\bUCS\b|\bECBU\b/i, fr: "ECBU" },
    { re: /\bchest\s*x[- ]?ray\b|\bCXR\b|\bthoracic\s*radiograph/i, fr: "Radiographie thoracique" },
    { re: /\babdominal\s*ultrasound\b|\bUS\s+abdomen\b/i, fr: "Échographie abdominale" },
    { re: /\bCT\b\s*(?:scan\s*)?(?:of\s*)?(?:the\s*)?chest\b|\bchest\s*CT\b/i, fr: "Tomodensitométrie thoracique" },
    { re: /\bMRI\b\s*(?:of\s*)?(?:the\s*)?abdomen\b|\babdominal\s*MRI\b/i, fr: "IRM abdominale" },
  ];
  for (const { re, fr } of rules) {
    if (re.test(t)) return fr;
  }
  return t;
}

/** Libellés FR canoniques pour les sections de rapport d’imagerie. */
const RAD_HEADING_MAP: Record<string, string> = {
  indication: "Indication",
  technique: "Technique",
  constatation: "Constatations",
  constatations: "Constatations",
  resultat: "Résultats",
  résultats: "Résultats",
  résultat: "Résultats",
  resultats: "Résultats",
  findings: "Constatations",
  observation: "Constatations",
  observations: "Constatations",
  examen: "Examen",
  impression: "Impression",
  conclusion: "Conclusion",
  recommandation: "Recommandation",
  recommandations: "Recommandation",
  compterendu: "Compte rendu",
  discussion: "Discussion",
  clinique: "Données cliniques",
  indicationclinique: "Indication clinique",
  clinical: "Indication clinique",
};

const RAD_LINE_HEADING = new RegExp(
  "^\\s*(Indication(?:\\s+clinique)?|Technique|Constatations?|Résultats?|Examen|Impression|Conclusion|Recommandation(?:s)?|Discussion|Observations?|Findings?|Compte\\s+rendu)\\s*:\\s*(.*)$",
  "i"
);

const RAD_STANDALONE_HEADING = new RegExp(
  "^\\s*(Indication(?:\\s+clinique)?|Technique|Constatations?|Résultats?|Examen|Impression|Conclusion|Recommandation(?:s)?|Discussion|Observations?|Findings?|Compte\\s+rendu)\\s*$",
  "i"
);

function normalizeRadHeading(key: string): string {
  const k = key.toLowerCase().replace(/\s+/g, " ").trim();
  if (k.startsWith("compte rendu")) return "Compte rendu";
  const compact = k.replace(/\s/g, "");
  if (compact === "indicationclinique" || k.startsWith("indication")) return "Indication";
  return RAD_HEADING_MAP[compact] ?? RAD_HEADING_MAP[k.replace(/\s/g, "")] ?? key.trim();
}

/**
 * Découpe un compte rendu imagerie : lignes « Titre : » ou titre seul, mots-clés FR/EN.
 */
export function parseRadiologySections(raw: string): { sections: RadiologySection[]; remainder: string } {
  const text = (raw ?? "").trim();
  if (!text) return { sections: [], remainder: "" };

  const lines = text.split(/\r?\n/);
  const sections: RadiologySection[] = [];
  const loose: string[] = [];
  let current: { heading: string; lines: string[] } | null = null;

  const flush = () => {
    if (current && current.lines.length) {
      const body = current.lines.join("\n").trim();
      if (body) sections.push({ heading: current.heading, body });
    }
    current = null;
  };

  for (const line of lines) {
    const m1 = line.match(RAD_LINE_HEADING);
    if (m1) {
      flush();
      current = {
        heading: normalizeRadHeading(m1[1]),
        lines: m1[2] ? [m1[2]] : [],
      };
      continue;
    }
    const m2 = line.match(RAD_STANDALONE_HEADING);
    if (m2) {
      flush();
      current = { heading: normalizeRadHeading(m2[1]), lines: [] };
      continue;
    }
    if (/^#{1,3}\s+(.+)$/.test(line)) {
      flush();
      const ht = line.replace(/^#{1,3}\s+/, "").trim();
      current = { heading: normalizeRadHeading(ht), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
    else loose.push(line);
  }
  flush();

  let remainder = loose.join("\n").trim();
  if (sections.length === 0 && remainder.length > 40) {
    const para = remainder.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (para.length >= 1) {
      return {
        sections: [{ heading: "Compte rendu", body: para.join("\n\n") }],
        remainder: "",
      };
    }
  }

  return { sections, remainder };
}

/** Paragraphes pour affichage « document » si aucune section structurée. */
export function splitRadiologyNarrativeParagraphs(raw: string): string[] {
  const t = (raw ?? "").trim();
  if (!t) return [];
  return t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}
