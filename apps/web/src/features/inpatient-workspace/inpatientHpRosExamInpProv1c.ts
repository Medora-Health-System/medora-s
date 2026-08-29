/**
 * INP.PROV.1C — Deterministic ROS / Physical Exam projection for inpatient H&P.
 *
 * Canonical legal record: hpDraft.sections.ROS|PHYSICAL_EXAM.text (human-readable).
 * Optional structured (INP_HP_SYSTEMS_V1) is editor metadata only — already allowed by
 * ProviderHpDraftV1; never a second legal truth.
 *
 * Normal findings derive from ED complete-normal catalogs.
 * No second documentation engine / no Prisma migration.
 */

import {
  EXAM_SYSTEM_CODES,
  ROS_SYSTEM_CODES,
} from "@medora/shared";
import {
  PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_PHYSICAL_EXAM_FRAGMENTS,
  PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT,
  PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS,
  type ProviderDocumentationExamSectionId,
} from "@/lib/providerDocumentationModel";

type RosSystemCode = (typeof ROS_SYSTEM_CODES)[number];
type ExamSystemCode = (typeof EXAM_SYSTEM_CODES)[number];

export const INP_HP_SYSTEMS_STRUCTURED_KIND = "INP_HP_SYSTEMS_V1" as const;

export type InpatientHpSystemStatus =
  | "NEGATIVE"
  | "NORMAL"
  | "POSITIVE"
  | "ABNORMAL"
  | "NOT_ASSESSED"
  | "UNDOCUMENTED";

export type InpatientHpSystemFinding = {
  systemCode: string;
  status: InpatientHpSystemStatus;
  text: string;
};

export type InpatientHpSystemsDocument = {
  systems: InpatientHpSystemFinding[];
  additionalNotes: string;
};

export type InpatientHpSystemsKind = "ROS" | "PHYSICAL_EXAM";

const ROS_CODES = ROS_SYSTEM_CODES as readonly string[];
const EXAM_CODES = EXAM_SYSTEM_CODES as readonly string[];

/** Clinical display labels — never expose raw snake_case codes in legal text. */
export const INPATIENT_HP_SYSTEM_LABELS: Record<string, string> = {
  CONSTITUTIONAL: "Constitutional",
  CARDIOVASCULAR: "Cardiovascular",
  RESPIRATORY: "Respiratory",
  GASTROINTESTINAL: "Gastrointestinal",
  GENITOURINARY: "Genitourinary",
  MUSCULOSKELETAL: "Musculoskeletal",
  NEUROLOGIC: "Neurologic",
  PSYCHIATRIC: "Psychiatric",
  SKIN: "Skin",
  HEMATOLOGIC: "Hematologic/Lymphatic",
  ENDOCRINE: "Endocrine",
  OTHER: "Other",
  GENERAL: "General",
  HEENT: "HEENT",
  ABDOMEN: "Abdomen",
};

const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(INPATIENT_HP_SYSTEM_LABELS).map(([code, label]) => [
    label.toLowerCase(),
    code,
  ])
);

/** ED ROS block lines → inpatient ROS_SYSTEM_CODES. Eyes/ENT/Allergic fold into OTHER (catalog has no Eyes/ENT keys). */
const ED_ROS_LINE_TO_CODE: Array<{ match: RegExp; code: RosSystemCode }> = [
  { match: /^Constitutional:/i, code: "CONSTITUTIONAL" },
  { match: /^Cardiovascular:/i, code: "CARDIOVASCULAR" },
  { match: /^Respiratory:/i, code: "RESPIRATORY" },
  { match: /^Gastrointestinal:/i, code: "GASTROINTESTINAL" },
  { match: /^Genitourinary:/i, code: "GENITOURINARY" },
  { match: /^Musculoskeletal:/i, code: "MUSCULOSKELETAL" },
  { match: /^Skin:/i, code: "SKIN" },
  { match: /^Neurologic:/i, code: "NEUROLOGIC" },
  { match: /^Psychiatric:/i, code: "PSYCHIATRIC" },
  { match: /^Endocrine:/i, code: "ENDOCRINE" },
  { match: /^Hematologic/i, code: "HEMATOLOGIC" },
];

/** ED exam section ids → inpatient EXAM_SYSTEM_CODES. Reassessment stays out of admission H&P. */
const ED_EXAM_TO_INPATIENT: Partial<
  Record<ProviderDocumentationExamSectionId, ExamSystemCode>
> = {
  general: "GENERAL",
  heent: "HEENT",
  cardiovascular: "CARDIOVASCULAR",
  respiratory: "RESPIRATORY",
  abdomen: "ABDOMEN",
  musculoskeletal: "MUSCULOSKELETAL",
  skin: "SKIN",
  neuroPsych: "NEUROLOGIC",
};

const DEFAULT_EN_EXAM_FRAGMENTS: Record<string, string> = {
  "erMseExamChips.genAlert": "alert",
  "erMseExamChips.genNoAcuteDistress": "no acute distress",
  "erMseExamChips.heentHeadAtraumatic": "head atraumatic",
  "erMseExamChips.heentPerrla": "PERRLA",
  "erMseExamChips.heentOropharynxClear": "oropharynx clear",
  "erMseExamChips.cardioRrr": "regular rate and rhythm",
  "erMseExamChips.cardioNoMurmur": "no murmur",
  "erMseExamChips.cardioPeripheralPulsesPresent": "peripheral pulses present",
  "erMseExamChips.respNoDistress": "no respiratory distress",
  "erMseExamChips.respClearBs": "clear breath sounds bilaterally",
  "erMseExamChips.abdSoft": "soft",
  "erMseExamChips.abdNonTender": "non-tender",
  "erMseExamChips.abdNoGuarding": "no guarding",
  "erMseExamChips.neuroAlertOriented": "alert and oriented",
  "erMseExamChips.neuroFollowsCommands": "follows commands",
  "erMseExamChips.neuroSpeechClear": "speech clear",
  "erMseExamChips.mskRomNormal": "full range of motion",
  "erMseExamChips.mskNoDeformityNoted": "no deformity noted",
  "erMseExamChips.skinWarmDry": "warm and dry",
  "erMseExamChips.skinNoRash": "no rash",
};

function codesFor(kind: InpatientHpSystemsKind): readonly string[] {
  return kind === "ROS" ? ROS_CODES : EXAM_CODES;
}

function emptyFinding(systemCode: string): InpatientHpSystemFinding {
  return { systemCode, status: "UNDOCUMENTED", text: "" };
}

export function inpatientHpSystemLabel(systemCode: string): string {
  return (
    INPATIENT_HP_SYSTEM_LABELS[systemCode] ??
    systemCode
      .split("_")
      .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
      .join(" ")
  );
}

export function emptyInpatientHpSystemsDocument(
  kind: InpatientHpSystemsKind
): InpatientHpSystemsDocument {
  return {
    systems: codesFor(kind).map((systemCode) => emptyFinding(systemCode)),
    additionalNotes: "",
  };
}

/** Parse ED complete-normal ROS block into inpatient system negatives. */
export function buildInpatientRosNegativeFindingsFromEdCatalog(): Record<
  string,
  string
> {
  const out: Record<string, string> = {};
  const otherParts: string[] = [];
  for (const rawLine of PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^Review of Systems/i.test(line)) continue;
    const mapped = ED_ROS_LINE_TO_CODE.find((row) => row.match.test(line));
    const body = line.replace(/^[^:]+:\s*/, "").trim();
    if (!body) continue;
    if (mapped) {
      out[mapped.code] = body;
      continue;
    }
    if (/^(Eyes|ENT|Allergic)/i.test(line)) {
      otherParts.push(body);
    }
  }
  if (otherParts.length) {
    out.OTHER = otherParts.join(" ");
  }
  return out;
}

/** Resolve ED normal exam fragments to inpatient exam system text. */
export function buildInpatientExamNormalFindingsFromEdCatalog(
  resolveFragment?: (key: string) => string
): Record<string, string> {
  const resolve =
    resolveFragment ?? ((key: string) => DEFAULT_EN_EXAM_FRAGMENTS[key] ?? key);
  const out: Record<string, string> = {};
  for (const sectionId of PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS) {
    const inpatientCode = ED_EXAM_TO_INPATIENT[sectionId];
    if (!inpatientCode) continue;
    const keys = PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_PHYSICAL_EXAM_FRAGMENTS[sectionId] ?? [];
    const parts = keys.map((k) => resolve(k).trim()).filter(Boolean);
    if (!parts.length) continue;
    const joined = parts.join("; ");
    if (inpatientCode === "NEUROLOGIC") {
      out.NEUROLOGIC = joined;
      out.PSYCHIATRIC = joined;
      continue;
    }
    out[inpatientCode] = joined;
  }
  return out;
}

/**
 * Fill only UNDOCUMENTED systems with negatives (default clinical-safe bulk).
 * Authored positives/abnormals/normals/not-assessed and additionalNotes are preserved
 * unless replaceAll is true.
 */
export function applyAllSystemsNegative(
  current: InpatientHpSystemsDocument,
  options?: { replaceAll?: boolean; negatives?: Record<string, string> }
): InpatientHpSystemsDocument {
  const negatives = options?.negatives ?? buildInpatientRosNegativeFindingsFromEdCatalog();
  const replaceAll = options?.replaceAll === true;
  return {
    additionalNotes: replaceAll ? "" : current.additionalNotes,
    systems: codesFor("ROS").map((systemCode) => {
      const existing = current.systems.find((s) => s.systemCode === systemCode);
      if (!replaceAll && existing && existing.status !== "UNDOCUMENTED") {
        return existing;
      }
      const text = negatives[systemCode] ?? "Denies acute symptoms for this system.";
      return { systemCode, status: "NEGATIVE" as const, text };
    }),
  };
}

/**
 * Fill only UNDOCUMENTED systems with ED-derived normals.
 * Explicit abnormalities and other documented systems are preserved unless replaceAll.
 */
export function applyNormalExam(
  current: InpatientHpSystemsDocument,
  options?: {
    replaceAll?: boolean;
    normals?: Record<string, string>;
    resolveFragment?: (key: string) => string;
  }
): InpatientHpSystemsDocument {
  const normals =
    options?.normals ?? buildInpatientExamNormalFindingsFromEdCatalog(options?.resolveFragment);
  const replaceAll = options?.replaceAll === true;
  return {
    additionalNotes: replaceAll ? "" : current.additionalNotes,
    systems: codesFor("PHYSICAL_EXAM").map((systemCode) => {
      const existing = current.systems.find((s) => s.systemCode === systemCode);
      if (!replaceAll && existing && existing.status !== "UNDOCUMENTED") {
        return existing;
      }
      const text = normals[systemCode];
      if (!text) {
        return existing ?? emptyFinding(systemCode);
      }
      return { systemCode, status: "NORMAL" as const, text };
    }),
  };
}

function sentenceCaseStatus(status: InpatientHpSystemStatus): string {
  switch (status) {
    case "NEGATIVE":
      return "Negative";
    case "NORMAL":
      return "Normal";
    case "POSITIVE":
      return "Positive";
    case "ABNORMAL":
      return "Abnormal";
    case "NOT_ASSESSED":
      return "Not assessed";
    default:
      return "Undocumented";
  }
}

function formatRosLine(row: InpatientHpSystemFinding): string {
  const label = inpatientHpSystemLabel(row.systemCode);
  const body = row.text.trim();
  if (row.status === "NEGATIVE") {
    return body ? `${label}: Negative — ${body}` : `${label}: Negative.`;
  }
  if (row.status === "POSITIVE") {
    return body ? `${label}: Positive — ${body}` : `${label}: Positive.`;
  }
  if (row.status === "NOT_ASSESSED") {
    return body ? `${label}: Not assessed — ${body}` : `${label}: Not assessed.`;
  }
  return body ? `${label}: ${body}` : `${label}: Undocumented.`;
}

function formatExamLine(row: InpatientHpSystemFinding): string {
  const label = inpatientHpSystemLabel(row.systemCode);
  const body = row.text.trim();
  if (row.status === "NORMAL") {
    return body ? `${label}: ${body}` : `${label}: Normal.`;
  }
  if (row.status === "ABNORMAL") {
    return body ? `${label}: Abnormal — ${body}` : `${label}: Abnormal.`;
  }
  if (row.status === "NOT_ASSESSED") {
    return body ? `${label}: Not assessed — ${body}` : `${label}: Not assessed.`;
  }
  return body ? `${label}: ${body}` : `${label}: Undocumented.`;
}

/** Human-readable legal projection — Summary / signed / closed / print consume this text. */
export function serializeInpatientHpSystemsDocument(
  doc: InpatientHpSystemsDocument,
  kind: InpatientHpSystemsKind = "ROS"
): { text: string; structured: Record<string, unknown> } {
  const lines: string[] = [];
  const header = kind === "ROS" ? "REVIEW OF SYSTEMS" : "PHYSICAL EXAMINATION";
  const documented = doc.systems.filter(
    (row) => !(row.status === "UNDOCUMENTED" && !row.text.trim())
  );
  if (documented.length) {
    lines.push(header);
    lines.push("");
    for (const row of documented) {
      lines.push(kind === "ROS" ? formatRosLine(row) : formatExamLine(row));
    }
  }
  const additional = doc.additionalNotes.trim();
  if (additional) {
    if (lines.length) lines.push("");
    lines.push(kind === "ROS" ? "Additional ROS notes:" : "Additional examination notes:");
    lines.push(additional);
  }
  const structured = {
    kind: INP_HP_SYSTEMS_STRUCTURED_KIND,
    systems: Object.fromEntries(
      doc.systems.map((s) => [s.systemCode, { status: s.status, text: s.text }])
    ),
    additionalNotes: doc.additionalNotes,
  };
  return { text: lines.join("\n").trim(), structured };
}

export function parseInpatientHpSystemsDocument(input: {
  kind: InpatientHpSystemsKind;
  text?: string | null;
  structured?: Record<string, unknown> | null;
}): InpatientHpSystemsDocument {
  const base = emptyInpatientHpSystemsDocument(input.kind);
  const structured = input.structured;
  if (
    structured &&
    typeof structured === "object" &&
    !Array.isArray(structured) &&
    structured.kind === INP_HP_SYSTEMS_STRUCTURED_KIND
  ) {
    const systemsRaw = structured.systems;
    const map =
      systemsRaw && typeof systemsRaw === "object" && !Array.isArray(systemsRaw)
        ? (systemsRaw as Record<string, unknown>)
        : {};
    const systems = codesFor(input.kind).map((systemCode) => {
      const raw = map[systemCode];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyFinding(systemCode);
      const row = raw as Record<string, unknown>;
      return {
        systemCode,
        status: normalizeStatus(String(row.status ?? "UNDOCUMENTED")),
        text: String(row.text ?? ""),
      };
    });
    return {
      systems,
      additionalNotes: String(structured.additionalNotes ?? ""),
    };
  }

  const text = String(input.text ?? "").trim();
  if (!text) return base;

  const parsed = tryParseProjectionText(input.kind, text);
  if (parsed) return parsed;
  return { ...base, additionalNotes: text };
}

function resolveSystemCode(token: string, kind: InpatientHpSystemsKind): string | null {
  const codes = new Set(codesFor(kind));
  const upper = token.trim().toUpperCase().replace(/\s+/g, "_");
  if (codes.has(upper)) return upper;
  const byLabel = LABEL_TO_CODE[token.trim().toLowerCase()];
  if (byLabel && codes.has(byLabel)) return byLabel;
  // Soft aliases
  if (/^heent$/i.test(token) && codes.has("HEENT")) return "HEENT";
  if (/^hematologic/i.test(token) && codes.has("HEMATOLOGIC")) return "HEMATOLOGIC";
  return null;
}

function tryParseProjectionText(
  kind: InpatientHpSystemsKind,
  text: string
): InpatientHpSystemsDocument | null {
  const systems = emptyInpatientHpSystemsDocument(kind).systems.map((s) => ({ ...s }));
  const byCode = new Map(systems.map((s) => [s.systemCode, s]));

  const additionalMatch = text.match(
    /\n\s*(Additional (?:ROS|examination) notes:|Additional notes:)\s*\n([\s\S]*)$/i
  );
  const main = additionalMatch ? text.slice(0, additionalMatch.index).trim() : text;
  const additional = additionalMatch ? additionalMatch[2]!.trim() : "";

  // Also support prior 1C delimiter
  const legacyParts = main.split(/\n---\n/);
  const body = legacyParts[0] ?? "";
  if (!additional && legacyParts.length > 1) {
    // handled below via additional from match; keep for old "---"
  }
  const oldAdditional = legacyParts
    .slice(1)
    .join("\n---\n")
    .replace(/^Additional notes:\s*/i, "")
    .trim();

  let matched = 0;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(REVIEW OF SYSTEMS|PHYSICAL EXAMINATION)$/i.test(line)) continue;

    // Human format: "Respiratory: Positive — SOB" or "General: alert; no distress"
    const human = line.match(/^([^:]+):\s*(.+)$/);
    if (human) {
      const code = resolveSystemCode(human[1]!, kind);
      if (!code) continue;
      const finding = byCode.get(code);
      if (!finding) continue;
      const rest = human[2]!.trim();
      const statusLead = rest.match(
        /^(Negative|Positive|Normal|Abnormal|Not assessed|Undocumented)\s*(?:[—-]\s*)?(.*)$/i
      );
      if (statusLead) {
        finding.status = normalizeStatus(statusLead[1]!);
        finding.text = (statusLead[2] ?? "").trim();
        if (!finding.text && (finding.status === "NORMAL" || finding.status === "NEGATIVE")) {
          // status-only line is fine
        }
      } else if (kind === "PHYSICAL_EXAM") {
        finding.status = "NORMAL";
        finding.text = rest.replace(/\.$/, "");
      } else {
        finding.status = "NEGATIVE";
        finding.text = rest.replace(/\.$/, "");
      }
      matched += 1;
      continue;
    }

    // Legacy machine format: "RESPIRATORY — Positive"
    const machine = line.match(/^([A-Z_]+)\s+[—-]\s+(.+)$/);
    if (machine) {
      const code = resolveSystemCode(machine[1]!, kind);
      if (!code) continue;
      const finding = byCode.get(code);
      if (!finding) continue;
      finding.status = normalizeStatus(machine[2]!);
      matched += 1;
    }
  }

  if (matched === 0) return null;
  return {
    systems: Array.from(byCode.values()),
    additionalNotes: additional || oldAdditional,
  };
}

function normalizeStatus(raw: string): InpatientHpSystemStatus {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (s === "NEGATIVE" || s.startsWith("NEGATIVE")) return "NEGATIVE";
  if (s === "NORMAL" || s.startsWith("NORMAL")) return "NORMAL";
  if (s === "POSITIVE" || s.startsWith("POSITIVE")) return "POSITIVE";
  if (s === "ABNORMAL" || s.startsWith("ABNORMAL")) return "ABNORMAL";
  if (s.includes("NOT_ASSESSED") || s.includes("UNABLE")) return "NOT_ASSESSED";
  if (s === "UNDOCUMENTED") return "UNDOCUMENTED";
  return "UNDOCUMENTED";
}

export function inpatientHpSystemsHasAuthoredAbnormal(
  doc: InpatientHpSystemsDocument
): boolean {
  return doc.systems.some(
    (s) =>
      (s.status === "POSITIVE" || s.status === "ABNORMAL") && Boolean(s.text.trim())
  );
}

export function inpatientHpSystemsHasAnyContent(doc: InpatientHpSystemsDocument): boolean {
  if (doc.additionalNotes.trim()) return true;
  return doc.systems.some((s) => s.status !== "UNDOCUMENTED" || Boolean(s.text.trim()));
}

export function inpatientHpSystemsHasDocumentedSystems(
  doc: InpatientHpSystemsDocument
): boolean {
  return doc.systems.some((s) => s.status !== "UNDOCUMENTED");
}

export function updateInpatientHpSystemFinding(
  doc: InpatientHpSystemsDocument,
  systemCode: string,
  patch: Partial<Pick<InpatientHpSystemFinding, "status" | "text">>
): InpatientHpSystemsDocument {
  return {
    ...doc,
    systems: doc.systems.map((s) =>
      s.systemCode === systemCode ? { ...s, ...patch } : s
    ),
  };
}

export function clearInpatientHpSystems(
  kind: InpatientHpSystemsKind,
  keepAdditionalNotes = true,
  current?: InpatientHpSystemsDocument
): InpatientHpSystemsDocument {
  const empty = emptyInpatientHpSystemsDocument(kind);
  if (keepAdditionalNotes && current?.additionalNotes) {
    return { ...empty, additionalNotes: current.additionalNotes };
  }
  return empty;
}

/** Exported for tests: ED catalog still referenced (no ED behavioral change). */
export const INP_PROV_1C_ED_ROS_SOURCE = PROVIDER_DOCUMENTATION_COMPLETE_NORMAL_ROS_TEXT;
export const INP_PROV_1C_ED_EXAM_SECTION_IDS = PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS;
