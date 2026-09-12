import { z } from "zod";

/**
 * A bounded free-text value with explicit truncation metadata.
 *
 * Consumers must be able to distinguish COMPLETE_TEXT from TRUNCATED_TEXT
 * without inspecting string length. originalLength is included when the
 * source text exceeded the configured maximum.
 */
export const aiBoundedTextSchema = z
  .object({
    text: z.string(),
    truncated: z.boolean(),
    originalLength: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AiBoundedText = z.infer<typeof aiBoundedTextSchema>;

/**
 * Helper to build an AiBoundedText from a raw string and a max length.
 * Returns null when the input is null/undefined/empty.
 */
export function toAiBoundedText(
  raw: string | null | undefined,
  maxChars: number
): AiBoundedText | null {
  if (!raw) return null;
  if (raw.length <= maxChars) {
    return { text: raw, truncated: false };
  }
  return {
    text: raw.slice(0, maxChars),
    truncated: true,
    originalLength: raw.length,
  };
}
