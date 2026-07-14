/**
 * Plain-language clinical synonyms for ICD-10-CM catalog search.
 * Does not invent codes — only expands queries to official description phrases.
 */

export type Icd10QueryExpansion = {
  /** Normalized lowercase query key (trimmed). */
  query: string;
  /** Additional description phrases OR'd into search (any match). */
  anyOf?: string[];
  /** Phrases that must all appear in short/long/searchText (AND). */
  allOf?: string[];
};

/** Exact-phrase expansions for common ED tendon/ligament searches. */
export const ICD10_CLINICAL_QUERY_EXPANSIONS: Icd10QueryExpansion[] = [
  { query: "achilles tendon rupture", anyOf: ["achilles tendon", "injury of achilles"] },
  { query: "achilles laceration", anyOf: ["laceration of achilles", "achilles tendon"] },
  { query: "rotator cuff tear", anyOf: ["rotator cuff", "rotatr-cuff", "rotatr cuff"] },
  { query: "biceps tendon rupture", anyOf: ["biceps tendon", "long head of biceps"] },
  { query: "triceps tendon rupture", anyOf: ["triceps", "musc/fasc/tend triceps"] },
  { query: "quadriceps tendon rupture", anyOf: ["quadriceps musc/fasc/tend", "quadriceps"] },
  // Official FY2026 text uses quadriceps musc/fasc/tend for traumatic patellar-tendon-region injuries.
  { query: "patellar tendon rupture", anyOf: ["quadriceps musc/fasc/tend", "patellar tendinitis"] },
  { query: "hamstring tendon injury", anyOf: ["post grp at thi lev", "msl/fasc/tnd post grp"] },
  { query: "flexor tendon laceration", anyOf: ["laceration of flexor"] },
  { query: "extensor tendon laceration", anyOf: ["laceration of extensor"] },
  { query: "mallet finger", anyOf: ["mallet finger"] },
  { query: "acl tear", anyOf: ["anterior cruciate ligament"] },
  { query: "acl", anyOf: ["anterior cruciate ligament"] },
  { query: "pcl tear", anyOf: ["posterior cruciate ligament"] },
  { query: "pcl", anyOf: ["posterior cruciate ligament"] },
  { query: "mcl tear", anyOf: ["medial collateral ligament"] },
  { query: "mcl", anyOf: ["medial collateral ligament"] },
  { query: "lcl tear", anyOf: ["lateral collateral ligament"] },
  { query: "lcl", anyOf: ["lateral collateral ligament"] },
  { query: "high ankle sprain", anyOf: ["tibiofibular ligament"] },
  { query: "syndesmotic ligament injury", anyOf: ["tibiofibular ligament"] },
  { query: "syndesmosis", anyOf: ["tibiofibular ligament"] },
  { query: "thumb ucl tear", allOf: ["metacarpophalangeal joint of", "thumb"] },
  { query: "thumb ucl", allOf: ["metacarpophalangeal joint of", "thumb"] },
  { query: "skier's thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "skiers thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "gamekeeper's thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  { query: "gamekeepers thumb", allOf: ["sprain of metacarpophalangeal joint of", "thumb"] },
  // Official FY2026 order file does not name “scapholunate”; map to wrist ligament / carpal sprain families.
  {
    query: "scapholunate ligament injury",
    anyOf: ["sprain of carpal joint", "traumatic rupture of unsp ligament of right wrist", "traumatic rupture of unsp ligament of left wrist"],
  },
  { query: "elbow ucl injury", allOf: ["ulnar collateral ligament", "elbow"] },
  { query: "elbow ucl", allOf: ["ulnar collateral ligament", "elbow"] },
  { query: "crush injury", anyOf: ["crushing injury", "crushed"] },
  { query: "crushing injury", anyOf: ["crushing injury", "crushed"] },
  { query: "crushed hand", anyOf: ["crushing injury of", "hand"] },
  { query: "crushed finger", anyOf: ["crushing injury of", "finger"] },
  { query: "crushed foot", anyOf: ["crushing injury of", "foot"] },
  { query: "prolonged compression", anyOf: ["traumatic ischemia of muscle"] },
  { query: "traumatic amputation", anyOf: ["traumatic amputation", "traumatic mcp amputation"] },
  { query: "severed finger", anyOf: ["traumatic amputation", "finger"] },
  { query: "severed toe", anyOf: ["traumatic amputation", "toe"] },
  { query: "finger cut off", anyOf: ["traumatic amputation", "finger"] },
  { query: "toe cut off", anyOf: ["traumatic amputation", "toe"] },
  { query: "foreign body", anyOf: ["foreign body"] },
  { query: "foreign body eye", anyOf: ["foreign body in cornea", "foreign body in"] },
  { query: "foreign body ear", anyOf: ["foreign body in", "ear"] },
  { query: "foreign body nose", anyOf: ["foreign body in", "nose"] },
  { query: "foreign body hand", anyOf: ["puncture wound with foreign body", "hand"] },
  { query: "foreign body foot", anyOf: ["puncture wound with foreign body", "foot"] },
  { query: "splinter in foot", anyOf: ["puncture wound with foreign body", "foot"] },
  { query: "splinter", anyOf: ["puncture wound with foreign body", "foreign body"] },
  { query: "fishhook", anyOf: ["puncture wound with foreign body"] },
  { query: "swallowed foreign body", anyOf: ["foreign body in esophagus", "foreign body in"] },
  { query: "aspirated foreign body", anyOf: ["foreign body in pharynx", "foreign body in"] },
];

export function normalizeIcd10SearchQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ");
}

export function resolveIcd10ClinicalQueryExpansion(q: string): Icd10QueryExpansion | null {
  const key = normalizeIcd10SearchQuery(q);
  if (!key) return null;
  return (
    ICD10_CLINICAL_QUERY_EXPANSIONS.find((e) => normalizeIcd10SearchQuery(e.query) === key) ?? null
  );
}
