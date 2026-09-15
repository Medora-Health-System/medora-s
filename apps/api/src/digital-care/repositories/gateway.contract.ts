export interface DigitalCareGatewayContext {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
  correlationId?: string;
}

export interface DigitalCareGateway<TRequest, TResponse> {
  invoke(request: TRequest, context: DigitalCareGatewayContext): Promise<TResponse>;
}
