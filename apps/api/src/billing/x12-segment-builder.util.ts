import type { X12Segment } from "@medora/shared";

const SEG_TERM = "~";
const EL_SEP = "*";

/**
 * Escape element data for X12: remove characters that would break segment parsing.
 */
export function x12EscapeElement(value: string): string {
  return value.replace(/[\n\r*~^\\|]/g, " ").replace(/\s+/g, " ").trim();
}

export function x12BuildSegment(tag: string, elements: (string | number | null | undefined)[]): X12Segment {
  const els = elements.map((e) => {
    if (e == null || e === "") return "";
    return x12EscapeElement(String(e));
  });
  return { tag, elements: els };
}

export function x12SegmentToString(seg: X12Segment): string {
  const body = [seg.tag, ...seg.elements].join(EL_SEP);
  return `${body}${SEG_TERM}`;
}

export function x12SegmentsToText(segments: X12Segment[]): string {
  return segments.map(x12SegmentToString).join("\n");
}
