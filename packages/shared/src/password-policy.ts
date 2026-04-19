/** Minimum length for all new passwords (login, reset, change). */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_POLICY_HINT_FR =
  "Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un symbole.";

/**
 * Strong password: min 12 chars, at least one upper, lower, digit, and non-alphanumeric symbol.
 */
export function passwordMeetsPolicy(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
