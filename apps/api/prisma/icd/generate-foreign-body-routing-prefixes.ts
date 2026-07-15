/**
 * Regenerate FY2026 foreign-body discharge routing prefixes from the official ZIP.
 *
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/icd/generate-foreign-body-routing-prefixes.ts \
 *     --file=prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip
 *
 * Writes:
 *   - prisma/icd/icd10-foreign-body-routing-prefixes.ts
 *   - apps/web/.../icd10ForeignBodyRoutingPrefixes.ts (mirror for discharge families)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function n(code: string): string {
  return code.toUpperCase().replace(/\./g, "");
}

function undot(nc: string): string {
  if (nc.length <= 3) return nc;
  return `${nc.slice(0, 3)}.${nc.slice(3)}`;
}

function main() {
  const file = getArg("file");
  if (!file) {
    console.error("Missing --file");
    process.exit(1);
  }
  const validation = validateIcd10CmRelease({ file, release: getArg("release") ?? "2026" });
  if (!validation.ok || !validation.parse) {
    console.error("Validation failed");
    process.exit(1);
  }
  const rows = validation.parse.rows.filter((r) => r.isBillable);
  const text = (r: (typeof rows)[number]) =>
    `${r.shortDescription} ${r.longDescription}`.toLowerCase();
  const isOpenFb = (r: (typeof rows)[number]) =>
    /with foreign body|w fb |w foreign body|penetrating wound w foreign body|penetrating wound with foreign body/i.test(
      text(r),
    ) && !/superficial foreign body|superficial fb /i.test(text(r));
  const isSuper = (r: (typeof rows)[number]) =>
    /superficial foreign body|superficial fb /i.test(text(r));

  const openFb = rows.filter((r) => isOpenFb(r) && n(r.code).startsWith("S"));
  const superFb = rows.filter((r) => isSuper(r));
  const prefsFor = (list: typeof rows, len: number) =>
    [...new Set(list.map((r) => undot(n(r.code).slice(0, len))))].sort();

  const hand = openFb.filter((r) => r.code.startsWith("S61"));
  const foot = openFb.filter((r) => r.code.startsWith("S91"));
  const eyePen = openFb.filter((r) => r.code.startsWith("S05.5"));
  const otherOpen = openFb.filter(
    (r) => !r.code.startsWith("S61") && !r.code.startsWith("S91") && !r.code.startsWith("S05.5"),
  );
  const handSuper = superFb.filter((r) => r.code.startsWith("S60"));
  const footSuper = superFb.filter((r) => r.code.startsWith("S90"));
  const otherSuper = superFb.filter((r) => !r.code.startsWith("S60") && !r.code.startsWith("S90"));

  const handFinger = [...prefsFor(hand, 6), ...prefsFor(handSuper, 5)];
  const footToe = [...prefsFor(foot, 6), ...prefsFor(footSuper, 5)];
  const eyePenetrating = prefsFor(eyePen, 5);
  const skinOpen = prefsFor(otherOpen, 6);
  const skinSuper = prefsFor(otherSuper, 5);

  const ts = `/**
 * Auto-derived FY2026 ICD-10-CM foreign-body discharge routing prefixes.
 * Generated from official Code Descriptions (billable rows only).
 * N6 open-wound-with-FB prefixes uniquely identify FB codes (no non-FB collisions).
 * DO NOT hand-edit counts — regenerate via prisma/icd/generate-foreign-body-routing-prefixes.ts
 */
export const FOREIGN_BODY_HAND_FINGER_ICD_PREFIXES = ${JSON.stringify(handFinger, null, 2)} as const;

export const FOREIGN_BODY_FOOT_TOE_ICD_PREFIXES = ${JSON.stringify(footToe, null, 2)} as const;

export const FOREIGN_BODY_EYE_PENETRATING_ICD_PREFIXES = ${JSON.stringify(eyePenetrating, null, 2)} as const;

export const FOREIGN_BODY_SKIN_SOFT_TISSUE_OPEN_ICD_PREFIXES = ${JSON.stringify(skinOpen, null, 2)} as const;

export const FOREIGN_BODY_SKIN_SOFT_TISSUE_SUPERFICIAL_ICD_PREFIXES = ${JSON.stringify(skinSuper, null, 2)} as const;

export const FOREIGN_BODY_SOFT_TISSUE_ALL_ICD_PREFIXES = [
  ...FOREIGN_BODY_HAND_FINGER_ICD_PREFIXES,
  ...FOREIGN_BODY_FOOT_TOE_ICD_PREFIXES,
  ...FOREIGN_BODY_EYE_PENETRATING_ICD_PREFIXES,
  ...FOREIGN_BODY_SKIN_SOFT_TISSUE_OPEN_ICD_PREFIXES,
  ...FOREIGN_BODY_SKIN_SOFT_TISSUE_SUPERFICIAL_ICD_PREFIXES,
] as const;
`;

  const apiOut = resolve(__dirname, "icd10-foreign-body-routing-prefixes.ts");
  const webOut = resolve(
    __dirname,
    "../../../web/src/features/emergency/icd10ForeignBodyRoutingPrefixes.ts",
  );
  writeFileSync(apiOut, ts);
  writeFileSync(webOut, ts);
  console.log(
    JSON.stringify(
      {
        wrote: [apiOut, webOut],
        counts: {
          handFinger: handFinger.length,
          footToe: footToe.length,
          eyePenetrating: eyePenetrating.length,
          skinOpen: skinOpen.length,
          skinSuper: skinSuper.length,
        },
      },
      null,
      2,
    ),
  );
}

main();
