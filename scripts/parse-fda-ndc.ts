import * as fs from "fs"
import * as path from "path"
import { execFileSync } from "child_process"

const zipPath = path.resolve(
  process.env.HOME!,
  "medora-data/raw/fda-ndc/2026-04/drug-ndc-0001-of-0001.json.zip"
)

const raw = execFileSync("unzip", ["-p", zipPath], {
  maxBuffer: 512 * 1024 * 1024,
}).toString("utf-8")

const data = JSON.parse(raw)

const products = (data.results || []).map((r: any) => ({
  productNdc: r.product_ndc,
  genericName: r.generic_name,
  brandName: r.brand_name,
  dosageForm: r.dosage_form,
  route: Array.isArray(r.route) ? r.route : [],
  activeIngredients: r.active_ingredients || [],
  pharmClass: r.pharm_class || [],
  productType: r.product_type,
  marketingStatus: r.marketing_status,
  listingExpirationDate: r.listing_expiration_date,
  packages: (r.packaging || []).map((p: any) => ({
    packageNdc: p.package_ndc,
    description: p.description,
  })),
}))

const outPath = path.resolve(process.env.HOME!, "medora-data/processed/fda-ndc.json")
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(products, null, 2))

console.log(`Parsed ${products.length} FDA NDC products`)
