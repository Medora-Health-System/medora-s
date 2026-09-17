export const PATIENT_PORTAL_ACTIVATION_CHANNEL = {
  MANUAL_CODE: "MANUAL_CODE",
  EMAIL_INVITATION: "EMAIL_INVITATION",
} as const;

export type PatientPortalActivationChannel =
  (typeof PATIENT_PORTAL_ACTIVATION_CHANNEL)[keyof typeof PATIENT_PORTAL_ACTIVATION_CHANNEL];

export const MANUAL_ACTIVATION_TTL_MS = 15 * 60 * 1000;
export const EMAIL_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

export const PATIENT_EMAIL_REQUIRED_MESSAGE = "Patient does not have an email address on file.";
export const INVITATION_SEND_FAILED_MESSAGE =
  "couldn't send invitation. Try again or use an activation code.";

export function maskPatientEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***";
  return `${trimmed.slice(0, 1)}***@${trimmed.slice(at + 1)}`;
}

export function buildPatientInvitationUrl(baseUrl: string, activationCode: string): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}/activate?code=${encodeURIComponent(activationCode)}`;
}


export function canonicalizeEmail(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized.includes("@") ? normalized : null;
}

export function invitationEmailsMatch(
  patientEmail: string | null | undefined,
  accountEmail: string | null | undefined,
): boolean {
  const left = canonicalizeEmail(patientEmail);
  const right = canonicalizeEmail(accountEmail);
  return Boolean(left && right && left === right);
}
