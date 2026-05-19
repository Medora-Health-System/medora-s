import { BadRequestException } from "@nestjs/common";
import { createStructuredLogger } from "../common/logging/structured-logger";

const log = createStructuredLogger("PriorityErInventoryImport");

export type PriorityErInventoryImportErrorCode =
  | "MISSING_FILE"
  | "INVALID_MIMETYPE"
  | "INVALID_EXTENSION"
  | "EMPTY_FILE"
  | "PARSER_FAILURE"
  | "MISSING_WORKSHEET"
  | "MISSING_REQUIRED_COLUMNS"
  | "NO_DATA_ROWS"
  | "FACILITY_NOT_FOUND"
  | "INVALID_QUERY";

export type PriorityErInventoryImportErrorBody = {
  code: PriorityErInventoryImportErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export class PriorityErInventoryImportException extends BadRequestException {
  constructor(body: PriorityErInventoryImportErrorBody) {
    super(body);
    if (process.env.NODE_ENV !== "production") {
      log.warn("inventory_import_validation", body);
    }
  }
}

export function throwInventoryImportError(body: PriorityErInventoryImportErrorBody): never {
  throw new PriorityErInventoryImportException(body);
}
