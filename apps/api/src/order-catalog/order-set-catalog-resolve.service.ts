import { Injectable } from "@nestjs/common";
import { LabCatalogService } from "./lab-catalog.service";
import { ImagingCatalogService } from "./imaging-catalog.service";
import type {
  OrderSetCatalogResolveRequest,
  OrderSetCatalogResolveResponse,
  OrderSetCatalogResolveResultItem,
} from "./dto/order-set-catalog-resolve.dto";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";

@Injectable()
export class OrderSetCatalogResolveService {
  constructor(
    private readonly labCatalog: LabCatalogService,
    private readonly imagingCatalog: ImagingCatalogService
  ) {}

  async resolveBatch(request: OrderSetCatalogResolveRequest): Promise<OrderSetCatalogResolveResponse> {
    const results: OrderSetCatalogResolveResultItem[] = [];

    for (const item of request.items) {
      const acceptableCodes = new Set(item.referenceCodes.map((code) => code.toUpperCase()));
      let matches: CatalogSearchItemDto[] = [];

      if (item.catalogType === "LAB_TEST") {
        matches = await this.labCatalog.resolveByReferenceCodes({
          referenceCodes: [...acceptableCodes],
          fallbackSearchQuery: item.fallbackSearchQuery,
        });
      } else {
        matches = await this.imagingCatalog.resolveByReferenceCodes({
          referenceCodes: [...acceptableCodes],
          fallbackSearchQuery: item.fallbackSearchQuery,
        });
      }

      const exactMatches = matches.filter((row) => acceptableCodes.has(row.code.toUpperCase()));

      if (exactMatches.length === 1) {
        results.push({ requestId: item.requestId, item: exactMatches[0]!, ambiguous: false });
        continue;
      }
      if (exactMatches.length > 1) {
        results.push({ requestId: item.requestId, item: null, ambiguous: true });
        continue;
      }
      if (matches.length === 1) {
        results.push({ requestId: item.requestId, item: matches[0]!, ambiguous: false });
        continue;
      }
      if (matches.length > 1) {
        results.push({ requestId: item.requestId, item: null, ambiguous: true });
        continue;
      }
      results.push({ requestId: item.requestId, item: null, ambiguous: false });
    }

    return { results };
  }
}
