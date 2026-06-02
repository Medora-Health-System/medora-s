# MAR UI governance foundation (M1.3F.3)

**Phase:** M1.3F.3 — read-only MAR UI  
**Authority:** M1.3C–E governance, M1.3F design, M1.3F.1 schema  
**Migration / seed:** None

## UI additions

| Surface | Change |
|---------|--------|
| `MedicationAdministrationTab` | Governance badges + safety summary on open-order rows and MAR record modal |
| `MedicationMarSafetyGovernanceBadges` | Lightweight badge row (MedoraCardBadge) |
| `MedicationMarSafetySummaryPanel` | Informational summary list (French via `marGovernance.*` i18n) |

## Badges (informational)

- **Contrôlé** — `isControlled`
- **Haut risque** — profile `isHighAlert` / `highAlertClass`, or legacy name heuristic when profile absent
- **LASA** — `lasaGroupId` / LASA payload in `highAlertCategories`
- **Témoin requis** — `requiresWitness` (catalog or profile)
- **Double signature** — `requiresDoubleSign`
- **Vérif. pharmacie** — latest `PharmacyVerification` row status `PENDING` / `REJECTED` / `OVERRIDDEN`
- **Perte à documenter** — `allowsWasteDocumentation` on linked product administration profile when controlled

## API (read-only)

`GET` order payloads enriched via `OrdersService.enrichOrderItemsForDisplay`:

- `catalogMedication.requiresWitness`, `requiresDoubleSign` (existing catalog columns)
- `medicationSafetyGovernance` — merged snapshot from catalog + `MedicationSafetyProfile` (via legacy product link) + optional pharmacy verification

No new endpoints. No write-path changes.

## Intentionally not enforced

- No administration blocking
- No witness / cosign capture
- No verification record creation
- No waste workflow
- No pharmacy queue UI
- No barcode / eMAR scheduling

Existing soft-safety and high-risk acknowledgement flows are unchanged.

## Performance guardrails

- Pure helpers in `@medora/shared` (tree-shakeable)
- No governance manifest imports in web bundle
- No new npm dependencies
- One batched profile query per order list (catalog ids) + one pharmacy verification query per medication order lines
- Reuses `MedoraCardBadge` (no new chart/heavy UI)

## Accessibility

- Badge text is visible (not color-only)
- `role="list"` / `listitem` for badge groups
- `aria-label` on each badge (includes “information seulement”)
- Summary uses `role="region"` with titled list
- Keyboard navigation unchanged (badges are not interactive)

## Future phases

- M1.3F.x — enforce witness/double-check at MAR save
- Pharmacy queue UI on `PharmacyVerification`
- Controlled waste on `MedicationWasteDocumentation`
- EDOC / audit event linkage

## Verification

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api run build
pnpm verify:web
```

Web unit tests: `apps/web/src/features/mar/medicationMarSafetyGovernance.test.ts`
