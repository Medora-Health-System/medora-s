import { Module } from "@nestjs/common";
import { FhirMapperService } from "./fhir-mapper.service";

@Module({
  providers: [FhirMapperService],
  exports: [FhirMapperService],
})
export class FhirMapperModule {}
