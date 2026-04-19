import { HttpException, HttpStatus } from "@nestjs/common";

export const ENCOUNTER_CONCURRENT_MODIFICATION_CODE = "ENCOUNTER_CONCURRENT_MODIFICATION";

export function throwEncounterConcurrentModification(): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.CONFLICT,
      code: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
      message: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
    },
    HttpStatus.CONFLICT
  );
}
