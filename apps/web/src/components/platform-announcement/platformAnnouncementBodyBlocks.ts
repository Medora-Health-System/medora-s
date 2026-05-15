/**
 * Plain-text release notes layout for platform announcements.
 * No HTML — output is structured blocks rendered as React text nodes only.
 */

export type AnnouncementBodyBlock =
  | { type: "spacer" }
  | { type: "header"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "bulletList"; items: string[] };

/** Max length (trimmed) for a single line to qualify as a section header before a bullet list. */
export const SECTION_HEADER_MAX_LENGTH = 72;

export function getBulletLineContent(line: string): string | null {
  const t = line.trimStart();
  if (t.startsWith("• ")) return t.slice(2).trimEnd();
  if (t.startsWith("- ")) return t.slice(2).trimEnd();
  if (t.startsWith("* ")) return t.slice(2).trimEnd();
  return null;
}

function isEmptyLine(line: string): boolean {
  return line.trim() === "";
}

function peekNextMeaningfulKind(lines: string[], startIdx: number): "bullet" | "other" | "eof" {
  for (let j = startIdx; j < lines.length; j++) {
    const raw = lines[j];
    if (isEmptyLine(raw)) continue;
    if (getBulletLineContent(raw) !== null) return "bullet";
    return "other";
  }
  return "eof";
}

function qualifiesAsSectionHeaderLine(trimmedLine: string): boolean {
  if (trimmedLine.length === 0) return false;
  return trimmedLine.length <= SECTION_HEADER_MAX_LENGTH;
}

/**
 * Split body on newlines; empty lines → spacers; bullet prefixes → lists;
 * a single short non-bullet line immediately before a bullet list (empty lines
 * between are ignored) becomes a header block.
 */
export function parsePlatformAnnouncementBody(body: string): AnnouncementBodyBlock[] {
  if (body.trim() === "") {
    return [];
  }
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: AnnouncementBodyBlock[] = [];
  const textBuffer: string[] = [];
  let i = 0;

  function flushTextBuffer(followedByBullets: boolean) {
    if (textBuffer.length === 0) return;
    const singleShort =
      textBuffer.length === 1 && qualifiesAsSectionHeaderLine(textBuffer[0].trim());
    if (singleShort && followedByBullets) {
      blocks.push({ type: "header", text: textBuffer[0].trim() });
    } else {
      blocks.push({ type: "paragraph", lines: [...textBuffer] });
    }
    textBuffer.length = 0;
  }

  while (i < lines.length) {
    const line = lines[i]!;

    if (isEmptyLine(line)) {
      const followedByBullets = peekNextMeaningfulKind(lines, i + 1) === "bullet";
      flushTextBuffer(followedByBullets);
      blocks.push({ type: "spacer" });
      i += 1;
      continue;
    }

    const bulletText = getBulletLineContent(line);
    if (bulletText !== null) {
      flushTextBuffer(true);
      const items: string[] = [];
      while (i < lines.length) {
        const L = lines[i]!;
        if (isEmptyLine(L)) break;
        const bt = getBulletLineContent(L);
        if (bt === null) break;
        items.push(bt);
        i += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: "bulletList", items });
      }
      continue;
    }

    textBuffer.push(line);
    i += 1;
  }

  flushTextBuffer(false);
  return blocks;
}
