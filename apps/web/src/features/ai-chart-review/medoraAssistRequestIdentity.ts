export function medoraAssistRequestIdentity(input: {
  facilityId: string;
  encounterId: string;
}): string {
  return `${input.facilityId.trim()}::${input.encounterId.trim()}`;
}

export function shouldAcceptMedoraAssistResponse(input: {
  requestIdentity: string;
  activeIdentity: string;
  requestSequence: number;
  activeSequence: number;
}): boolean {
  return input.requestIdentity === input.activeIdentity && input.requestSequence === input.activeSequence;
}
