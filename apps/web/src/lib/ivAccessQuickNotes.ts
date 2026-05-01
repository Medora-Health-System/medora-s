/**
 * Append a structured IV quick-note fragment without duplicating an identical segment.
 * Segments are split on "; " or newlines (trimmed).
 */
export function appendIvQuickNoteUnique(current: string, fragment: string): string {
  const f = fragment.trim();
  if (!f) return current;
  const c = current.trim();
  if (!c) return f;
  const segs = c.split(/\s*;\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  if (segs.some((s) => s === f)) return current;
  return `${c}; ${f}`;
}
