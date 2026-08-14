/**
 * MEDUI.D5A.4 — Interactive odontogram & tooth-finding clinical domain.
 * ToothFinding events are clinical authority; odontogram UI is a projection.
 */

import { D5A1_TOOTH_NUMBERING_SYSTEMS, type D5a1ToothNumberingSystem } from "./enterpriseDentalOrthodonticsArchitectureD5a1.js";

export const D5A4_CERTIFICATION_ID = "MEDUI.D5A.4" as const;

export const D5A4_DENTITION_TYPES = ["PRIMARY", "MIXED", "PERMANENT"] as const;
export type D5a4DentitionType = (typeof D5A4_DENTITION_TYPES)[number];

export const D5A4_TOOTH_NUMBERING_SYSTEMS = D5A1_TOOTH_NUMBERING_SYSTEMS;
export type D5a4ToothNumberingSystem = D5a1ToothNumberingSystem;

export const D5A4_TOOTH_SURFACES = [
  "MESIAL",
  "DISTAL",
  "OCCLUSAL",
  "INCISAL",
  "BUCCAL",
  "FACIAL",
  "LINGUAL",
  "PALATAL",
] as const;
export type D5a4ToothSurface = (typeof D5A4_TOOTH_SURFACES)[number];

export const D5A4_FINDING_SCOPES = ["WHOLE_TOOTH", "SURFACE_SPECIFIC"] as const;
export type D5a4FindingScope = (typeof D5A4_FINDING_SCOPES)[number];

export const D5A4_CLINICAL_STATES = [
  "OBSERVED",
  "EXISTING",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "RESOLVED",
  "AMENDED",
  "VOIDED",
] as const;
export type D5a4ClinicalState = (typeof D5A4_CLINICAL_STATES)[number];

/** High-value catalog — not a licensed CDT import. */
export const D5A4_FINDING_CATALOG = [
  "CARIES",
  "EXISTING_RESTORATION",
  "FRACTURE",
  "MISSING",
  "IMPACTED",
  "UNERUPTED",
  "PARTIALLY_ERUPTED",
  "RETAINED_PRIMARY",
  "CROWN",
  "BRIDGE_ABUTMENT",
  "PONTIC",
  "IMPLANT",
  "ROOT_CANAL_TREATED",
  "PERIAPICAL_CONCERN",
  "WEAR",
  "EROSION",
  "ATTRITION",
  "ABRASION",
  "MOBILITY",
  "SENSITIVITY",
  "OTHER",
] as const;
export type D5a4FindingType = (typeof D5A4_FINDING_CATALOG)[number];

export type D5a4ToothMorphology = "INCISOR" | "CANINE" | "PREMOLAR" | "MOLAR";
export type D5a4Arch = "MAXILLARY" | "MANDIBULAR";
export type D5a4Side = "RIGHT" | "LEFT";

export type D5a4CanonicalTooth = {
  code: string;
  dentition: "PRIMARY" | "PERMANENT";
  arch: D5a4Arch;
  side: D5a4Side;
  morphology: D5a4ToothMorphology;
  fdi: string;
  universal: string;
  /** Palmer notation readiness (e.g. UR6). */
  palmer: string;
  nameKey: string;
};

function morphFromFdiDigit(d: number): D5a4ToothMorphology {
  if (d === 1 || d === 2) return "INCISOR";
  if (d === 3) return "CANINE";
  if (d === 4 || d === 5) return "PREMOLAR";
  return "MOLAR";
}

function primaryMorphFromFdiDigit(d: number): D5a4ToothMorphology {
  if (d === 1 || d === 2) return "INCISOR";
  if (d === 3) return "CANINE";
  return "MOLAR";
}

/** FDI permanent → Universal ADA mapping. */
const FDI_PERM_TO_UNIVERSAL: Record<string, string> = {
  "18": "1",
  "17": "2",
  "16": "3",
  "15": "4",
  "14": "5",
  "13": "6",
  "12": "7",
  "11": "8",
  "21": "9",
  "22": "10",
  "23": "11",
  "24": "12",
  "25": "13",
  "26": "14",
  "27": "15",
  "28": "16",
  "38": "17",
  "37": "18",
  "36": "19",
  "35": "20",
  "34": "21",
  "33": "22",
  "32": "23",
  "31": "24",
  "41": "25",
  "42": "26",
  "43": "27",
  "44": "28",
  "45": "29",
  "46": "30",
  "47": "31",
  "48": "32",
};

const FDI_PRIM_TO_UNIVERSAL: Record<string, string> = {
  "55": "A",
  "54": "B",
  "53": "C",
  "52": "D",
  "51": "E",
  "61": "F",
  "62": "G",
  "63": "H",
  "64": "I",
  "65": "J",
  "75": "K",
  "74": "L",
  "73": "M",
  "72": "N",
  "71": "O",
  "81": "P",
  "82": "Q",
  "83": "R",
  "84": "S",
  "85": "T",
};

function palmerFromFdi(fdi: string): string {
  const q = fdi[0]!;
  const n = fdi[1]!;
  const map: Record<string, string> = {
    "1": "UR",
    "2": "UL",
    "3": "LL",
    "4": "LR",
    "5": "UR",
    "6": "UL",
    "7": "LL",
    "8": "LR",
  };
  return `${map[q] ?? "??"}${n}`;
}

function buildPermanentCatalog(): D5a4CanonicalTooth[] {
  const out: D5a4CanonicalTooth[] = [];
  for (const [fdi, universal] of Object.entries(FDI_PERM_TO_UNIVERSAL)) {
    const q = Number(fdi[0]);
    const d = Number(fdi[1]);
    const arch: D5a4Arch = q === 1 || q === 2 ? "MAXILLARY" : "MANDIBULAR";
    const side: D5a4Side = q === 1 || q === 4 ? "RIGHT" : "LEFT";
    out.push({
      code: `PERM_${fdi}`,
      dentition: "PERMANENT",
      arch,
      side,
      morphology: morphFromFdiDigit(d),
      fdi,
      universal,
      palmer: palmerFromFdi(fdi),
      nameKey: `dentalCareD5a4.tooth.perm.${fdi}`,
    });
  }
  return out;
}

function buildPrimaryCatalog(): D5a4CanonicalTooth[] {
  const out: D5a4CanonicalTooth[] = [];
  for (const [fdi, universal] of Object.entries(FDI_PRIM_TO_UNIVERSAL)) {
    const q = Number(fdi[0]);
    const d = Number(fdi[1]);
    const arch: D5a4Arch = q === 5 || q === 6 ? "MAXILLARY" : "MANDIBULAR";
    const side: D5a4Side = q === 5 || q === 8 ? "RIGHT" : "LEFT";
    out.push({
      code: `PRIM_${fdi}`,
      dentition: "PRIMARY",
      arch,
      side,
      morphology: primaryMorphFromFdiDigit(d),
      fdi,
      universal,
      palmer: palmerFromFdi(fdi),
      nameKey: `dentalCareD5a4.tooth.prim.${fdi}`,
    });
  }
  return out;
}

export const D5A4_PERMANENT_TEETH: readonly D5a4CanonicalTooth[] = buildPermanentCatalog();
export const D5A4_PRIMARY_TEETH: readonly D5a4CanonicalTooth[] = buildPrimaryCatalog();
export const D5A4_ALL_TEETH: readonly D5a4CanonicalTooth[] = [
  ...D5A4_PERMANENT_TEETH,
  ...D5A4_PRIMARY_TEETH,
];

const TOOTH_BY_CODE = new Map(D5A4_ALL_TEETH.map((t) => [t.code, t]));

export function getCanonicalTooth(code: string): D5a4CanonicalTooth | null {
  return TOOTH_BY_CODE.get(String(code ?? "").trim().toUpperCase()) ?? null;
}

export function isCanonicalToothCode(code: string): boolean {
  return getCanonicalTooth(code) != null;
}

export function isD5a4FindingType(value: string): value is D5a4FindingType {
  return (D5A4_FINDING_CATALOG as readonly string[]).includes(value);
}

export function isD5a4ToothSurface(value: string): value is D5a4ToothSurface {
  return (D5A4_TOOTH_SURFACES as readonly string[]).includes(value);
}

export function normalizeSurfaceCodes(surfaces: readonly string[] | null | undefined): D5a4ToothSurface[] {
  const out: D5a4ToothSurface[] = [];
  const seen = new Set<string>();
  for (const raw of surfaces ?? []) {
    const s = String(raw ?? "")
      .trim()
      .toUpperCase();
    if (!isD5a4ToothSurface(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function formatToothDisplayLabel(
  tooth: D5a4CanonicalTooth,
  system: D5a4ToothNumberingSystem
): string {
  if (system === "UNIVERSAL") return tooth.universal;
  if (system === "PALMER") return tooth.palmer;
  return tooth.fdi;
}

/** Arch order for odontogram (patient's right → left). */
export function listTeethForDentition(
  dentition: D5a4DentitionType,
  arch: D5a4Arch
): D5a4CanonicalTooth[] {
  const pool =
    dentition === "PRIMARY"
      ? D5A4_PRIMARY_TEETH
      : dentition === "PERMANENT"
        ? D5A4_PERMANENT_TEETH
        : D5A4_ALL_TEETH.filter((t) =>
            arch === "MAXILLARY"
              ? t.arch === "MAXILLARY"
              : t.arch === "MANDIBULAR"
          );

  const teeth =
    dentition === "MIXED"
      ? D5A4_ALL_TEETH.filter((t) => t.arch === arch)
      : pool.filter((t) => t.arch === arch);

  const right = teeth.filter((t) => t.side === "RIGHT").sort((a, b) => b.fdi.localeCompare(a.fdi));
  const left = teeth.filter((t) => t.side === "LEFT").sort((a, b) => a.fdi.localeCompare(b.fdi));
  return [...right, ...left];
}

export type D5a4FindingEventLike = {
  id: string;
  toothCode: string;
  scope: string;
  surfaces?: readonly string[] | null;
  findingType: string;
  clinicalState: string;
  notes?: string | null;
  documentedAt: string | Date;
  encounterId: string;
  supersedesFindingId?: string | null;
  voidedAt?: string | Date | null;
};

/** Active findings for chart projection (latest per tooth+type+surfaces key). */
export function projectCurrentToothFindings(
  events: readonly D5a4FindingEventLike[]
): D5a4FindingEventLike[] {
  const superseded = new Set(
    events.map((e) => e.supersedesFindingId).filter((id): id is string => Boolean(id))
  );
  const active = events.filter((e) => {
    if (e.voidedAt) return false;
    if (e.clinicalState === "VOIDED" || e.clinicalState === "AMENDED") return false;
    if (superseded.has(e.id)) return false;
    if (e.clinicalState === "RESOLVED") return false;
    return true;
  });
  const byKey = new Map<string, D5a4FindingEventLike>();
  for (const e of active) {
    const surfaces = normalizeSurfaceCodes(e.surfaces ?? [])
      .slice()
      .sort()
      .join("+");
    const key = `${e.toothCode}|${e.findingType}|${e.scope}|${surfaces}`;
    const prev = byKey.get(key);
    const t = new Date(e.documentedAt).getTime();
    const pt = prev ? new Date(prev.documentedAt).getTime() : -1;
    if (!prev || t >= pt) byKey.set(key, e);
  }
  return [...byKey.values()];
}

export function projectEncounterDentalFindingsSummary(
  events: readonly D5a4FindingEventLike[],
  encounterId: string,
  numbering: D5a4ToothNumberingSystem = "FDI"
): Array<{ toothLabel: string; findingType: string; surfaces: string[]; clinicalState: string }> {
  const rows = events.filter(
    (e) =>
      e.encounterId === encounterId &&
      !e.voidedAt &&
      e.clinicalState !== "VOIDED" &&
      e.clinicalState !== "AMENDED"
  );
  return rows.map((e) => {
    const tooth = getCanonicalTooth(e.toothCode);
    return {
      toothLabel: tooth ? formatToothDisplayLabel(tooth, numbering) : e.toothCode,
      findingType: e.findingType,
      surfaces: normalizeSurfaceCodes(e.surfaces ?? []),
      clinicalState: e.clinicalState,
    };
  });
}

/** Visual priority for odontogram fill (higher wins). */
export const D5A4_FINDING_VISUAL_PRIORITY: Record<string, number> = {
  MISSING: 100,
  IMPLANT: 90,
  PONTIC: 85,
  CROWN: 80,
  BRIDGE_ABUTMENT: 75,
  ROOT_CANAL_TREATED: 70,
  IMPACTED: 65,
  UNERUPTED: 60,
  PARTIALLY_ERUPTED: 55,
  FRACTURE: 50,
  CARIES: 45,
  EXISTING_RESTORATION: 40,
  PERIAPICAL_CONCERN: 35,
  MOBILITY: 30,
  SENSITIVITY: 25,
  WEAR: 20,
  EROSION: 20,
  ATTRITION: 20,
  ABRASION: 20,
  RETAINED_PRIMARY: 15,
  OTHER: 10,
};

export function pickDominantFindingForTooth(
  findings: readonly D5a4FindingEventLike[],
  toothCode: string
): D5a4FindingEventLike | null {
  const forTooth = findings.filter((f) => f.toothCode === toothCode);
  if (forTooth.length === 0) return null;
  return forTooth.slice().sort((a, b) => {
    const pa = D5A4_FINDING_VISUAL_PRIORITY[a.findingType] ?? 0;
    const pb = D5A4_FINDING_VISUAL_PRIORITY[b.findingType] ?? 0;
    if (pb !== pa) return pb - pa;
    return new Date(b.documentedAt).getTime() - new Date(a.documentedAt).getTime();
  })[0]!;
}

export function assertNoDentalPatientForkInSource(source: string): boolean {
  return !/\b(class|model|interface|type)\s+DentalPatient\b/.test(source);
}

export function assertNoDentalEncounterForkInSource(source: string): boolean {
  return !/\b(class|model|interface|type)\s+DentalEncounter\b/.test(source);
}
