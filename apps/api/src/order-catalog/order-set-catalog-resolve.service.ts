import { Injectable, Logger } from "@nestjs/common";
import { LabCatalogService } from "./lab-catalog.service";
import { ImagingCatalogService } from "./imaging-catalog.service";
import { pickOrderSetCatalogMatch } from "./order-set-catalog-match.util";
import type {
  OrderSetCatalogResolveRequest,
  OrderSetCatalogResolveResponse,
  OrderSetCatalogResolveResultItem,
} from "./dto/order-set-catalog-resolve.dto";

@Injectable()
export class OrderSetCatalogResolveService {
  private readonly logger = new Logger(OrderSetCatalogResolveService.name);

  constructor(
    private readonly labCatalog: LabCatalogService,
    private readonly imagingCatalog: ImagingCatalogService
  ) {}

  async resolveBatch(request: OrderSetCatalogResolveRequest): Promise<OrderSetCatalogResolveResponse> {
    const results: OrderSetCatalogResolveResultItem[] = [];

    for (const item of request.items) {
      const referenceCodes = item.referenceCodes.map((code) => code.trim()).filter(Boolean);
      let matches =
        item.catalogType === "LAB_TEST"
          ? await this.labCatalog.resolveByReferenceCodes({
              referenceCodes,
              fallbackSearchQuery: item.fallbackSearchQuery,
            })
          : await this.imagingCatalog.resolveByReferenceCodes({
              referenceCodes,
              fallbackSearchQuery: item.fallbackSearchQuery,
            });

      const picked = pickOrderSetCatalogMatch({ referenceCodes, matches });
      results.push({
        requestId: item.requestId,
        item: picked.item,
        ambiguous: picked.ambiguous,
      });

      if (process.env.NODE_ENV !== "production") {
        this.logger.debug(
          JSON.stringify({
            event: "orderSetCatalogResolve.item",
            requestId: item.requestId,
            catalogType: item.catalogType,
            referenceCodes,
            matchCount: matches.length,
            matchedCode: picked.item?.code ?? null,
            ambiguous: picked.ambiguous,
          })
        );
      }
    }

    return { results };
  }
}
