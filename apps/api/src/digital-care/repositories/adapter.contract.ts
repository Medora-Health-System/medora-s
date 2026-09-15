export interface DigitalCareAdapter<TExternal, TDigitalCare> {
  toDigitalCare(input: TExternal): TDigitalCare;
}
