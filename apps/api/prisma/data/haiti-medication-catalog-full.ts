/**
 * Full Haiti medication catalog including IVPB runtime metadata remediation rows.
 */
import { HAITI_MEDICATION_CATALOG } from "./haiti-medications";
import { HAITI_IVPB_RUNTIME_METADATA_REMEDIATION_SEEDS } from "./haiti-ivpb-runtime-metadata-remediation";

export const HAITI_MEDICATION_CATALOG_FULL = [
  ...HAITI_MEDICATION_CATALOG,
  ...HAITI_IVPB_RUNTIME_METADATA_REMEDIATION_SEEDS,
];
