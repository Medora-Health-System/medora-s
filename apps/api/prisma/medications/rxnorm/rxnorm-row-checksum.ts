import { createHash } from "node:crypto";
import {
  buildRxNormRowChecksumKey,
  type RxNormRowChecksumFields,
} from "@medora/shared";

export function computeRxNormRowChecksum(fields: RxNormRowChecksumFields): string {
  return createHash("sha256").update(buildRxNormRowChecksumKey(fields), "utf8").digest("hex");
}

export function computeFileChecksumSha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}
