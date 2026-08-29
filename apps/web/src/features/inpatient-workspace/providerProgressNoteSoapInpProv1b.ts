/**
 * INP.PROV.1B — Progress-note SOAP sections encoded in durable `text`
 * (zero Prisma migration; round-trips with D4A.26 progress note store).
 */

export const PROGRESS_SOAP_SECTION_KEYS = [
  "SUBJECTIVE",
  "OBJECTIVE",
  "ASSESSMENT",
  "PLAN",
] as const;

export type ProgressSoapSectionKey = (typeof PROGRESS_SOAP_SECTION_KEYS)[number];

export type ProgressSoapSections = Record<ProgressSoapSectionKey, string>;

const HEADERS: Record<ProgressSoapSectionKey, string> = {
  SUBJECTIVE: "Subjective",
  OBJECTIVE: "Objective",
  ASSESSMENT: "Assessment",
  PLAN: "Plan",
};

export function emptyProgressSoapSections(): ProgressSoapSections {
  return { SUBJECTIVE: "", OBJECTIVE: "", ASSESSMENT: "", PLAN: "" };
}

/** Parse durable progress note text into SOAP sections (legacy free-text → Subjective). */
export function parseProgressNoteSoapText(text: string | null | undefined): ProgressSoapSections {
  const raw = String(text ?? "");
  const out = emptyProgressSoapSections();
  if (!raw.trim()) return out;

  const hasAnyHeader = PROGRESS_SOAP_SECTION_KEYS.some((k) =>
    new RegExp(`^##\\s*${HEADERS[k]}\\s*$`, "im").test(raw)
  );
  if (!hasAnyHeader) {
    out.SUBJECTIVE = raw;
    return out;
  }

  let current: ProgressSoapSectionKey | null = null;
  const buckets: Record<ProgressSoapSectionKey, string[]> = {
    SUBJECTIVE: [],
    OBJECTIVE: [],
    ASSESSMENT: [],
    PLAN: [],
  };
  for (const line of raw.split(/\r?\n/)) {
    const headerMatch = line.match(/^##\s*(Subjective|Objective|Assessment|Plan)\s*$/i);
    if (headerMatch) {
      const label = headerMatch[1]!.toLowerCase();
      current =
        label === "subjective"
          ? "SUBJECTIVE"
          : label === "objective"
            ? "OBJECTIVE"
            : label === "assessment"
              ? "ASSESSMENT"
              : "PLAN";
      continue;
    }
    if (current) buckets[current].push(line);
  }
  for (const key of PROGRESS_SOAP_SECTION_KEYS) {
    out[key] = buckets[key].join("\n").replace(/^\n+|\n+$/g, "");
  }
  return out;
}

export function serializeProgressNoteSoapText(sections: ProgressSoapSections): string {
  return PROGRESS_SOAP_SECTION_KEYS.map(
    (key) => `## ${HEADERS[key]}\n${(sections[key] ?? "").trimEnd()}`
  )
    .join("\n\n")
    .trim();
}

export function countProgressSoapCharacters(sections: ProgressSoapSections): number {
  return PROGRESS_SOAP_SECTION_KEYS.reduce((n, k) => n + (sections[k] ?? "").length, 0);
}

/** Append transcript without overwriting existing section text. */
export function appendDictationToSection(
  existing: string,
  transcript: string
): string {
  const t = transcript.trim();
  if (!t) return existing;
  const base = existing.trimEnd();
  if (!base) return t;
  const needsSpace = !/\s$/.test(base);
  return `${base}${needsSpace ? " " : ""}${t}`;
}
