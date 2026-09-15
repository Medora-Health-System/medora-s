import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface EducationAssignmentRef {
  assignmentId: string;
  patient: DigitalCarePatientRef;
}

export interface EducationContract extends DigitalCareContractDescriptor {
  readonly capability: "education";
  listAssignments(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly EducationAssignmentRef[]>;
}
