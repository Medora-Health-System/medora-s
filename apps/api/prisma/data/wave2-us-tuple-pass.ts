/**
 * Phase 2E.6B — US-1 tuple pass (15 legacy → existing Haiti US codes).
 * Protocol FK set only when a single canonical protocol applies; variants use aliases.
 */
export type Wave2UsTupleMapping = {
  catalogCode: string;
  /** When true, set protocolClassifierId on the existing catalog row (idempotent). */
  applyProtocol: boolean;
  protocol: string | null;
  aliases: readonly string[];
};

export const WAVE2_US_TUPLE_PASS: readonly Wave2UsTupleMapping[] = [
  {
    catalogCode: "US_ABDOMEN",
    applyProtocol: true,
    protocol: "PROTOCOL_US_ABDOMEN_LIMITED",
    aliases: ["US Abdomen Limited", "abdomen limited"],
  },
  {
    catalogCode: "US_PELVIS",
    applyProtocol: false,
    protocol: null,
    aliases: ["US Pelvis Limited", "pelvis limited"],
  },
  {
    catalogCode: "US_PELVIS",
    applyProtocol: false,
    protocol: null,
    aliases: ["US Pelvic Doppler", "pelvic doppler"],
  },
  {
    catalogCode: "US_PELVIS",
    applyProtocol: false,
    protocol: null,
    aliases: ["US Pelvis with Trans/Endo", "US Trans/Endo", "pelvis transvaginal"],
  },
  {
    catalogCode: "US_SCROTUM_TESTICULAR",
    applyProtocol: false,
    protocol: null,
    aliases: ["US Duplex Limited Abdomen/Pelvis/Scrotal", "duplex limited scrotal"],
  },
  {
    catalogCode: "US_SOFT",
    applyProtocol: true,
    protocol: "PROTOCOL_US_NECK_THYROID",
    aliases: ["US Neck / Head Soft Tissue", "neck head soft tissue"],
  },
  {
    catalogCode: "US_OB_FIRST",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB <14 Weeks Limited", "ob first trimester limited"],
  },
  {
    catalogCode: "US_OB_FIRST",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB <14 Weeks Single Gestation", "ob <14 weeks single"],
  },
  {
    catalogCode: "US_OB_FIRST",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB <14 Weeks Transvaginal", "ob first trimester tv"],
  },
  {
    catalogCode: "US_OB_GROWTH",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB >14 Weeks Limited", "ob late trimester limited"],
  },
  {
    catalogCode: "US_OB_GROWTH",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB >14 Weeks Limited Portable", "ob late portable"],
  },
  {
    catalogCode: "US_OB_GROWTH",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB >14 Weeks Single Gestation", "ob >14 weeks single"],
  },
  {
    catalogCode: "US_OB_GROWTH",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB >14 Weeks Transvaginal", "ob late trimester tv"],
  },
  {
    catalogCode: "US_OB_GROWTH",
    applyProtocol: false,
    protocol: null,
    aliases: ["US OB Biophysical Profile without NST", "ob bpp"],
  },
  {
    catalogCode: "US_PELVIS",
    applyProtocol: false,
    protocol: null,
    aliases: ["US Duplex Limited Abdomen/Pelvis/Scrotal", "duplex limited pelvis"],
  },
] as const;

export const WAVE2_US_TUPLE_PASS_COUNT = WAVE2_US_TUPLE_PASS.length;
