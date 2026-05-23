/**
 * Phase 19L — Emergency Department procedure subset classification.
 * Filters national HCPCS/CPT files to an ER/urgent-care operational subset only.
 */

export type ErProcedureClassification =
  | "ER_INCLUDED"
  | "NON_ER_EXCLUDED"
  | "HIGH_COMPLEXITY_MANUAL_REVIEW"
  | "DUPLICATE_OR_CONFLICT"
  | "MISSING_REQUIRED_FIELDS";

export type ErProcedureCategory =
  | "ED_VISIT"
  | "CRITICAL_CARE"
  | "OBSERVATION"
  | "BEDSIDE_PROCEDURE"
  | "MED_ADMIN_PROCEDURE"
  | "RESPIRATORY"
  | "IMAGING"
  | "LABORATORY"
  | "NURSING_PROCEDURE"
  | "CPR_STABILIZATION"
  | "UNCLASSIFIED_ER";

export type ErProcedureClassifyInput = {
  code: string;
  codeSystem: "CPT" | "HCPCS";
  shortDescription: string;
  longDescription?: string | null;
};

export type ErProcedureClassifyResult = {
  classification: ErProcedureClassification;
  category: ErProcedureCategory | null;
  reasonCodes: string[];
};

const NON_ER_KEYWORD_PATTERNS: RegExp[] = [
  /\bhome health\b/i,
  /\bhospice\b/i,
  /\bsnf\b/i,
  /\bskilled nursing facility\b/i,
  /\brehabilitation\b/i,
  /\bphysical therapy\b/i,
  /\boccupational therapy\b/i,
  /\bspeech therapy\b/i,
  /\bwheelchair\b/i,
  /\bhospital bed\b/i,
  /\boxygen concentrator\b/i,
  /\bprosthetic\b/i,
  /\borthotic\b/i,
  /\bdiabetic shoe\b/i,
  /\bdialysis\b/i,
  /\bhemodialysis\b/i,
  /\bperitoneal dialysis\b/i,
  /\bdme\b/i,
  /\bdurable medical equipment\b/i,
  /\bnursing facility\b/i,
  /\blong.?term care\b/i,
  /\bchronic care\b/i,
  /\benteral nutrition\b/i,
  /\bparenteral nutrition\b/i,
];

const HIGH_COMPLEXITY_KEYWORD_PATTERNS: RegExp[] = [
  /\bventilator management\b/i,
  /\bmechanical ventilation\b/i,
  /\bprocedural sedation\b/i,
  /\bmoderate sedation\b/i,
  /\bdeep sedation\b/i,
  /\bcentral venous\b/i,
  /\bcentral line\b/i,
  /\bthoracentesis\b/i,
  /\bchest tube\b/i,
  /\btracheostomy\b/i,
  /\bintubation\b/i,
  /\bendotracheal\b/i,
  /\badvanced trauma\b/i,
  /\bcardioversion\b/i,
  /\bdefibrillation\b/i,
];

/** HCPCS Level II ranges commonly non-ER (DME, supplies, home care). */
const NON_ER_HCPCS_PREFIXES = ["E", "K", "L"] as const;

/** Drug/supply J-codes belong in medication catalog — not ER procedure subset. */
function isHcpcsDrugOrSupplyCode(code: string): boolean {
  return /^J\d{4}$/i.test(code.trim());
}

function numericCpt(code: string): number | null {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 5) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function inRange(n: number, min: number, max: number): boolean {
  return n >= min && n <= max;
}

function textBlob(input: ErProcedureClassifyInput): string {
  return [input.code, input.shortDescription, input.longDescription ?? ""].join(" ");
}

function matchCategoryFromCpt(n: number, blob: string): ErProcedureCategory | null {
  if (inRange(n, 99281, 99285)) return "ED_VISIT";
  if (inRange(n, 99291, 99292)) return "CRITICAL_CARE";
  if (inRange(n, 99218, 99220) || inRange(n, 99224, 99226)) return "OBSERVATION";
  if (n === 92950) return "CPR_STABILIZATION";
  if (inRange(n, 10060, 10180) || inRange(n, 12001, 13160)) return "BEDSIDE_PROCEDURE";
  if (inRange(n, 29000, 29799)) return "BEDSIDE_PROCEDURE";
  if (inRange(n, 36000, 36000) || inRange(n, 36410, 36415) || inRange(n, 36600, 36600)) {
    return "NURSING_PROCEDURE";
  }
  if (inRange(n, 96360, 96379) || n === 96372 || inRange(n, 96401, 96450)) return "MED_ADMIN_PROCEDURE";
  if (inRange(n, 94640, 94667) || inRange(n, 94760, 94762) || inRange(n, 94002, 94005)) {
    return "RESPIRATORY";
  }
  if (inRange(n, 93000, 93010) || n === 93042) return "RESPIRATORY";
  if (inRange(n, 70010, 79999)) return "IMAGING";
  if (inRange(n, 80047, 89398) || inRange(n, 81000, 81099) || inRange(n, 85025, 85027)) {
    return "LABORATORY";
  }
  if (inRange(n, 51701, 51703) || inRange(n, 43752, 43762)) return "BEDSIDE_PROCEDURE";
  if (/\blaceration\b|\bsuture\b|\bsplint\b|\bforeign body\b|\bwound\b|\babscess\b/i.test(blob)) {
    return "BEDSIDE_PROCEDURE";
  }
  if (/\bchest x.?ray\b|\bct\b|\bultrasound\b|\bx.?ray\b|\bmri\b/i.test(blob)) return "IMAGING";
  if (/\bcbc\b|\bcmp\b|\bbmp\b|\btroponin\b|\burinalysis\b|\bpregnancy test\b|\brapid strep\b|\bcovid\b|\bflu\b/i.test(blob)) {
    return "LABORATORY";
  }
  if (/\biv\b|\binjection\b|\bnebulizer\b|\bmedication administration\b/i.test(blob)) {
    return "MED_ADMIN_PROCEDURE";
  }
  if (/\boxygen\b|\bpulse ox\b|\bekg\b|\becg\b|\bventilatory\b/i.test(blob)) return "RESPIRATORY";
  if (/\bcpr\b|\bcritical care\b|\bemergency\b|\bstabilization\b/i.test(blob)) return "CRITICAL_CARE";
  return null;
}

function matchCategoryFromHcpcs(code: string, blob: string): ErProcedureCategory | null {
  const upper = code.trim().toUpperCase();
  if (upper === "G0378" || /^G038[0-4]$/i.test(upper)) return "OBSERVATION";
  if (/^A042[0-9]$/i.test(upper) && /\bambulance\b|\bemergency\b/i.test(blob)) return "CRITICAL_CARE";
  if (/\bchest x.?ray\b|\bct\b|\bultrasound\b/i.test(blob)) return "IMAGING";
  if (/\blab\b|\bblood\b|\burinalysis\b/i.test(blob)) return "LABORATORY";
  return null;
}

function isHighComplexityCpt(n: number, blob: string): boolean {
  if (inRange(n, 99151, 99157)) return true;
  if (inRange(n, 31500, 31500) || inRange(n, 32551, 32557) || inRange(n, 36555, 36558)) return true;
  if (inRange(n, 92960, 92960)) return true;
  if (inRange(n, 94003, 94005)) return true;
  return HIGH_COMPLEXITY_KEYWORD_PATTERNS.some((re) => re.test(blob));
}

function isNonErCpt(n: number, blob: string): boolean {
  if (inRange(n, 97010, 97799)) return true;
  if (inRange(n, 90837, 90899)) return true;
  if (inRange(n, 97110, 97546)) return true;
  return NON_ER_KEYWORD_PATTERNS.some((re) => re.test(blob));
}

export function classifyErProcedureRow(input: ErProcedureClassifyInput): ErProcedureClassifyResult {
  const code = input.code.trim();
  const shortDescription = input.shortDescription.trim();
  const reasonCodes: string[] = [];

  if (!code || !shortDescription) {
    return {
      classification: "MISSING_REQUIRED_FIELDS",
      category: null,
      reasonCodes: ["MISSING_CODE_OR_DESCRIPTION"],
    };
  }

  const blob = textBlob(input);

  if (NON_ER_KEYWORD_PATTERNS.some((re) => re.test(blob))) {
    return {
      classification: "NON_ER_EXCLUDED",
      category: null,
      reasonCodes: ["NON_ER_KEYWORD"],
    };
  }

  if (input.codeSystem === "HCPCS") {
    const prefix = code.trim().toUpperCase().charAt(0);
    if (NON_ER_HCPCS_PREFIXES.includes(prefix as (typeof NON_ER_HCPCS_PREFIXES)[number])) {
      return {
        classification: "NON_ER_EXCLUDED",
        category: null,
        reasonCodes: ["NON_ER_HCPCS_PREFIX"],
      };
    }
    if (isHcpcsDrugOrSupplyCode(code)) {
      return {
        classification: "NON_ER_EXCLUDED",
        category: null,
        reasonCodes: ["HCPCS_DRUG_CODE"],
      };
    }
  }

  if (HIGH_COMPLEXITY_KEYWORD_PATTERNS.some((re) => re.test(blob))) {
    reasonCodes.push("HIGH_COMPLEXITY_KEYWORD");
  }

  const cptNum = input.codeSystem === "CPT" ? numericCpt(code) : numericCpt(code);
  if (cptNum != null) {
    if (isNonErCpt(cptNum, blob)) {
      return {
        classification: "NON_ER_EXCLUDED",
        category: null,
        reasonCodes: ["NON_ER_CPT_RANGE"],
      };
    }
    if (isHighComplexityCpt(cptNum, blob)) {
      reasonCodes.push("HIGH_COMPLEXITY_CPT");
    }
    const category = matchCategoryFromCpt(cptNum, blob);
    if (category) {
      if (reasonCodes.length > 0) {
        return { classification: "HIGH_COMPLEXITY_MANUAL_REVIEW", category, reasonCodes };
      }
      return { classification: "ER_INCLUDED", category, reasonCodes: [category] };
    }
  }

  if (input.codeSystem === "HCPCS") {
    const hcpcsCategory = matchCategoryFromHcpcs(code, blob);
    if (hcpcsCategory) {
      if (reasonCodes.length > 0) {
        return {
          classification: "HIGH_COMPLEXITY_MANUAL_REVIEW",
          category: hcpcsCategory,
          reasonCodes,
        };
      }
      return { classification: "ER_INCLUDED", category: hcpcsCategory, reasonCodes: [hcpcsCategory] };
    }
  }

  if (reasonCodes.length > 0) {
    return {
      classification: "HIGH_COMPLEXITY_MANUAL_REVIEW",
      category: "UNCLASSIFIED_ER",
      reasonCodes,
    };
  }

  return {
    classification: "NON_ER_EXCLUDED",
    category: null,
    reasonCodes: ["NOT_ER_OPERATIONAL_SUBSET"],
  };
}

export const ER_PROCEDURE_CODE_SET_VERSION = "ER_SUBSET_19L";
export const ER_PROCEDURE_PENDING_CODE_SET_VERSION = "ER_SUBSET_19L_PENDING";
