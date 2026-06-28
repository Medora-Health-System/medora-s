import { z } from "zod";

export const orderSetCatalogResolveRequestItemSchema = z.object({
  requestId: z.string().min(1).max(128),
  catalogType: z.enum(["LAB_TEST", "IMAGING_STUDY"]),
  referenceCodes: z.array(z.string().min(1).max(64)).min(1).max(12),
  fallbackSearchQuery: z.string().max(200).optional(),
});

export const orderSetCatalogResolveRequestSchema = z.object({
  items: z.array(orderSetCatalogResolveRequestItemSchema).min(1).max(32),
});

export type OrderSetCatalogResolveRequestItem = z.infer<typeof orderSetCatalogResolveRequestItemSchema>;
export type OrderSetCatalogResolveRequest = z.infer<typeof orderSetCatalogResolveRequestSchema>;

export type OrderSetCatalogResolveResultItem = {
  requestId: string;
  item: import("./catalog-search-item.dto").CatalogSearchItemDto | null;
  ambiguous: boolean;
};

export type OrderSetCatalogResolveResponse = {
  results: OrderSetCatalogResolveResultItem[];
};
