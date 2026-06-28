import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPrnNextProjectionKey,
  buildPrnTimelineAvailabilityProjections,
  dedupeMarPrnTimelineCells,
  dedupeMarPrnTimelineRowCells,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");
const repoRoot = join(import.meta.dirname, "../../../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("marPrnDuplicateProjection (H9J.1)", () => {
  it("Q6H PRN appears once per order in projection builder", () => {
    const projections = buildPrnTimelineAvailabilityProjections({
      orderItemId: "oi-dup",
      frequencyCode: "Q6H",
      lastAdministeredAt: "2026-06-12T09:54:00.000Z",
      shiftStartAt: "2026-06-12T08:00:00.000Z",
      shiftEndAt: "2026-06-12T20:00:00.000Z",
    });
    expect(projections).toHaveLength(1);
    expect(projections[0]?.eligibleAt).toBe("2026-06-12T15:54:00.000Z");
  });

  it("Q6H PRN does not duplicate across future columns after row dedupe", () => {
    const earlyKey = buildPrnNextProjectionKey("oi-dup", "2026-06-12T15:54:00.000Z");
    const lateKey = buildPrnNextProjectionKey("oi-dup", "2026-06-12T21:54:00.000Z");
    const cells = dedupeMarPrnTimelineRowCells([
      {
        columnKey: "15:00",
        items: [
          {
            orderItemId: "oi-dup",
            isPrnBand: true,
            prnProjectionKey: earlyKey,
            doseStatus: "DUE",
            scheduledAt: "2026-06-12T15:54:00.000Z",
          },
        ],
      },
      {
        columnKey: "21:00",
        items: [
          {
            orderItemId: "oi-dup",
            isPrnBand: true,
            prnProjectionKey: lateKey,
            doseStatus: "DUE",
            scheduledAt: "2026-06-12T21:54:00.000Z",
          },
        ],
      },
    ]);
    const projections = cells.flatMap((c) =>
      c.items.filter((i) => i.prnProjectionKey?.trim())
    );
    expect(projections).toHaveLength(1);
    expect(projections[0]?.scheduledAt).toBe("2026-06-12T15:54:00.000Z");
  });

  it("dedupeMarPrnTimelineCells keeps earliest projection per orderItemId", () => {
    const earlyKey = buildPrnNextProjectionKey("oi-1", "2026-06-12T15:54:00.000Z");
    const lateKey = buildPrnNextProjectionKey("oi-1", "2026-06-12T21:54:00.000Z");
    const items = dedupeMarPrnTimelineCells([
      {
        orderItemId: "oi-1",
        isPrnBand: true,
        prnProjectionKey: lateKey,
        doseStatus: "DUE",
        scheduledAt: "2026-06-12T21:54:00.000Z",
      },
      {
        orderItemId: "oi-1",
        isPrnBand: true,
        prnProjectionKey: earlyKey,
        doseStatus: "DUE",
        scheduledAt: "2026-06-12T15:54:00.000Z",
      },
    ]);
    expect(items).toHaveLength(1);
  });

  it("API PRN util wires dedupeMarPrnTimelineRowCells after projections", () => {
    const util = readRepo("apps/api/src/medication-dose/mar-shift-timeline-prn.util.ts");
    expect(util).toContain("dedupeMarPrnTimelineRowCells");
    expect(util).toContain("buildPrnTimelineAvailabilityProjections");
  });
});
