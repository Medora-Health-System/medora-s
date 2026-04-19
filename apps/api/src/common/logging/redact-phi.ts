/**
 * Deep-redacts values likely to contain PHI / credentials from objects before logging.
 * Prefer omitting sensitive fields at the call site; this is a safety net.
 */
const SENSITIVE_KEY = new Set(
  [
    "email",
    "mail",
    "username",
    "password",
    "currentpassword",
    "newpassword",
    "token",
    "refreshtoken",
    "authorization",
    "patientid",
    "patient_id",
    "encounterid",
    "encounter_id",
    "mrn",
    "firstname",
    "lastname",
    "fullname",
    "displayname",
    "dob",
    "dateofbirth",
    "birthdate",
    "ssn",
    "phone",
    "phonenumber",
    "mobile",
    "address",
    "street",
    "zip",
    "vitals",
    "nursingassessment",
    "chiefcomplaint",
    "notes",
    "clinical",
    "diagnosis",
    "prescribername",
    "prescribercontact",
    "manuallabel",
    "manualsecondarytext",
    "message",
    "stack",
  ].map((k) => k.toLowerCase())
);

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const n = normalizeKey(key);
  if (SENSITIVE_KEY.has(n)) return true;
  if (n.endsWith("email") || n.includes("password") || n.includes("token")) return true;
  return false;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

const MAX_DEPTH = 14;

/**
 * Returns a JSON-serializable clone with sensitive keys and email-shaped strings redacted.
 */
export function redactPHI(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    return looksLikeEmail(value) ? "[REDACTED]" : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return "[REDACTED]";

  if (Array.isArray(value)) {
    return value.map((v) => redactPHI(v, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redactPHI(v, depth + 1);
    }
  }
  return out;
}
