export interface DigitalCareRepositoryScope {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
}

export interface DigitalCareRepository<TEntity, TId = string> {
  findById(id: TId, scope: DigitalCareRepositoryScope): Promise<TEntity | null>;
  save(entity: TEntity, scope: DigitalCareRepositoryScope): Promise<void>;
}
