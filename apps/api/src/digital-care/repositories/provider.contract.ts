export interface DigitalCareProviderContext {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
  correlationId?: string;
}

export interface DigitalCareProvider<TInput, TOutput> {
  execute(input: TInput, context: DigitalCareProviderContext): Promise<TOutput>;
}
