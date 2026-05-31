/**
 * Phase 2C.3.4B — CT head alias ownership (seed + governance post-migration).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { HAITI_IMAGING_CATALOG } from "../../prisma/data/haiti-imaging-studies";
import {
  buildImagingAliasGovernanceReport,
} from "./imaging-alias-governance.readiness";
import { scanSharedAliasCollisions } from "./imaging-catalog-retirement.scan";
import type { ImagingAliasGovernanceInput } from "./imaging-alias-governance.types";
import { KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } from "./imaging-catalog-retirement.constants";

function ctHeadPostAliasMigrationSnapshot(): ImagingAliasGovernanceInput {
  return {
    catalogRows: [
      { code: "US_ABD", isActive: true, aliases: ["echo abdomen"] },
      {
        code: "US_ABDOMEN",
        isActive: true,
        aliases: ["ultrasound abdomen", "us abdomen", "echo abdomen"],
      },
      { code: "DOPPLER_VEIN", isActive: true, aliases: ["doppler"] },
      {
        code: "US_VENOUS_DOPPLER_LE",
        isActive: true,
        aliases: ["doppler leg", "venous doppler leg", "dvt ultrasound"],
      },
      { code: "CT_HEAD", isActive: true, aliases: [] },
      {
        code: "CT_HEAD_WO_CONTRAST",
        isActive: true,
        aliases: ["ct head", "head ct non contrast", "ct brain without contrast", "stroke bleed"],
      },
      { code: "CT_ABD", isActive: true, aliases: ["ct abdomen"] },
      {
        code: "CT_ABDOMEN_PELVIS",
        isActive: true,
        aliases: ["ct abdomen", "ct abdomen pelvis", "ct abd pelvis"],
      },
      {
        code: "CT_CHEST_CTA",
        isActive: true,
        aliases: ["cta thorax", "ct angio chest", "pe protocol"],
      },
      {
        code: "CTA_CHEST",
        isActive: true,
        aliases: ["cta chest", "ct angio chest", "pe protocol"],
      },
    ],
    searchAliasShortcutMap: { ...KNOWN_IMAGING_SEARCH_ALIAS_SHORTCUTS } as Record<string, string[]>,
  };
}

describe("CT head alias seed ownership (2C.3.4B)", () => {
  it("assigns ct head only to CT_HEAD_WO_CONTRAST in Haiti imaging seed", () => {
    const ctHead = HAITI_IMAGING_CATALOG.find((row) => row.code === "CT_HEAD");
    const ctHeadWo = HAITI_IMAGING_CATALOG.find((row) => row.code === "CT_HEAD_WO_CONTRAST");

    expect(ctHead?.aliases).toEqual([]);
    expect(ctHeadWo?.aliases.map((alias) => alias.trim().toLowerCase())).toEqual([
      "ct head",
      "head ct non contrast",
      "ct brain without contrast",
      "stroke bleed",
    ]);
  });

  it("documents idempotent transfer script entrypoint", () => {
    const scriptPath = path.join(
      __dirname,
      "../../prisma/scripts/transfer-ct-head-alias.ts"
    );
    const src = fs.readFileSync(scriptPath, "utf8");
    expect(src).toContain("transferCtHeadAliasOwnership");
    expect(src).toContain("[transfer-ct-head-alias]");
  });
});

describe("CT head alias governance post-migration (2C.3.4B)", () => {
  const input = ctHeadPostAliasMigrationSnapshot();

  it("has no ct head alias on predecessor and holds it on successor", () => {
    const ctHead = input.catalogRows.find((row) => row.code === "CT_HEAD");
    const ctHeadWo = input.catalogRows.find((row) => row.code === "CT_HEAD_WO_CONTRAST");

    expect(ctHead?.aliases).toEqual([]);
    expect(ctHeadWo?.aliases).toEqual(
      expect.arrayContaining(["ct head", "stroke bleed"])
    );
  });

  it("does not create a shared ct head alias collision between duplicate pair rows", () => {
    const collisions = scanSharedAliasCollisions(input.catalogRows);
    expect(collisions.some((collision) => collision.alias === "ct head")).toBe(false);
  });

  it("keeps dual shortcut while alias ownership moves to successor", () => {
    const report = buildImagingAliasGovernanceReport(input);
    const ctHead = report.pairs.find((pair) => pair.predecessorCode === "CT_HEAD");

    expect(input.searchAliasShortcutMap["ct head"]).toEqual(["CT_HEAD_WO_CONTRAST", "CT_HEAD"]);
    expect(ctHead?.searchSafe.ready).toBe(false);
    expect(ctHead?.searchSafe.blockers.some((blocker) => blocker.includes("dual-active shortcuts"))).toBe(
      true
    );
    expect(
      ctHead?.dualActiveSafe.blockers.some((blocker) => blocker.includes("shared aliases during dual-active"))
    ).toBe(false);
    expect(ctHead?.manualReviewRequired).toBe(true);
  });
});
