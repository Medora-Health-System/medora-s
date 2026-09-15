import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface QuestionnaireRef {
  questionnaireId: string;
  patient: DigitalCarePatientRef;
}

export interface QuestionnaireContract extends DigitalCareContractDescriptor {
  readonly capability: "questionnaires";
  listQuestionnaires(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly QuestionnaireRef[]>;
}
