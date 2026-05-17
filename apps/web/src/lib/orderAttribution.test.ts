import { describe, expect, it } from "vitest";
import { formatErOrderEventAttributionCell, formatOrderAttributionLines } from "./orderAttribution";

const t = (key: string) => {
  const map: Record<string, string> = {
    "attribution.orderedBy": "Ordered by {name}{role} · {datetime}",
    "attribution.performedBy": "Performed by {name}{role} · {datetime}",
    "attribution.resultedBy": "Resulted by {name}{role} · {datetime}",
    "attribution.completedBy": "Performed by {name}{role} · {datetime}",
    "attribution.acknowledgedBy": "Acknowledged by {name}{role} · {datetime}",
    "attribution.cancelledBy": "Cancelled by {name}{role} · {datetime}",
    "attribution.performedByUnset": "Performed by: —",
    "attribution.unknownUser": "unknown",
    "common.dash": "—",
  };
  return map[key] ?? key;
};

describe("formatOrderAttributionLines", () => {
  it("shows ordered by only when last action is CREATED fallback removed", () => {
    const lines = formatOrderAttributionLines(
      {
        createdByDisplay: { name: "Dr A", role: "PROVIDER", at: "2026-05-16T10:00:00Z" },
        lastActionDisplay: null,
      },
      t,
      "en"
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Dr A");
    expect(lines[0]).not.toContain("Performed by");
  });

  it("shows resulted by for lab completion when actor differs from order creator", () => {
    const lines = formatOrderAttributionLines(
      {
        type: "LAB",
        createdByDisplay: { name: "Dr A", role: "PROVIDER", at: "2026-05-16T10:00:00Z" },
        lastActionDisplay: {
          action: "COMPLETED",
          name: "Tech B",
          role: "LAB",
          at: "2026-05-16T11:00:00Z",
        },
      },
      t,
      "en",
      "LAB"
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Resulted by");
    expect(lines[1]).toContain("Tech B");
  });
});

describe("formatErOrderEventAttributionCell", () => {
  it("does not label provider order creator as performer on completed lab order", () => {
    const cell = formatErOrderEventAttributionCell(
      {
        createdByDisplay: { name: "Audain Tranchant", role: "PROVIDER", at: "2026-05-16T10:00:00Z" },
        lastActionDisplay: null,
      },
      {
        eventType: "COMPLETED",
        performedByDisplayName: "Audain Tranchant",
        roleSnapshot: "PROVIDER",
        performedAt: "2026-05-16T10:00:00Z",
      },
      t,
      "en"
    );
    expect(cell).toBe("Performed by: —");
  });
});
