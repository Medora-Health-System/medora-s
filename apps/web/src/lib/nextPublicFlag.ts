/**
 * Browser-safe NEXT_PUBLIC_* truthiness.
 * Callers must pass a statically referenced `process.env.NEXT_PUBLIC_*` value
 * so Next.js can inline it at build time (dynamic process.env[name] is not inlined).
 */
export function isTruthyNextPublicFlag(value: string | undefined | null): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
