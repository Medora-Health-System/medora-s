/**
 * Inserts text into a textarea value at the selection [selStart, selEnd).
 * - Replacing a non-empty selection: raw concatenation (no automatic newlines).
 * - Inserting at a caret: adds paragraph breaks so phrases do not run into existing text.
 */

export function insertTextAtTextareaSelection(
  value: string,
  selStart: number,
  selEnd: number,
  insert: string,
  options?: { maxLength?: number }
): { value: string; caret: number } {
  const normalized = insert.replace(/\r\n/g, "\n").trim();
  if (normalized === "") {
    return { value, caret: Math.min(selStart, value.length) };
  }

  const start = Math.max(0, Math.min(selStart, value.length));
  const end = Math.max(start, Math.min(selEnd, value.length));
  const left = value.slice(0, start);
  const right = value.slice(end);
  const isReplacement = start !== end;

  let mid = normalized;
  if (!isReplacement) {
    if (left.length > 0 && !/\n$/.test(left)) {
      mid = "\n\n" + mid;
    }
    if (right.length > 0 && !/^\n/.test(right)) {
      mid = mid + "\n\n";
    }
  }

  let next = left + mid + right;
  let caret = (left + mid).length;

  const max = options?.maxLength;
  if (typeof max === "number" && Number.isFinite(max) && next.length > max) {
    next = next.slice(0, max);
    caret = Math.min(caret, max);
  }

  return { value: next, caret };
}
