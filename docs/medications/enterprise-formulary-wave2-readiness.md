# M1.6D — Enterprise Formulary Wave 2 readiness

## Readiness model (manifest / post-seed target)

| Metric | Target | Notes |
|--------|--------|-------|
| **Canonical coverage** | **100%** | Every manifest row → inactive product + package + legacy link |
| **Billing readiness** | **100%** | MedicationBillingProfile + HCPCS + NDC on every row |
| **Governance readiness** | **100%** | Safety profile + controlled/high-alert flags from manifest |
| **Search readiness** | **≥ 95%** | M1.6C rules + Wave 2 required pairs |
| **Activation readiness** | **100%** | Inactive + REVIEW_REQUIRED; gate blocks incomplete billing |

## Before / after (platform)

| | Before M1.6D | After seed (target) |
|--|------------|---------------------|
| Enterprise Wave manifest meds | 45 (Wave 1) | **134** (45 + 89) |
| Wave 2 marker products | 0 | **89** |
| Wave 2 billing profiles | 0 | **89** |
| Combined enterprise formulary breadth | Anticoag + vaccines + chronic core | + cardiology, diabetes, pulm, ER, psych, GI, women's health |

## Performance / safety

- Same seed pattern as Wave 1 — bounded per-row upserts; no search architecture change.
- Wave 2 billing gate composes with Wave 1 gate at activation (no provider search cutover).
- Products remain **inactive** until explicit governance activation.

## Verdict

| State | Verdict |
|-------|---------|
| Code merged; seed not run | **SAFE (conditional)** — manifests + gates ready |
| Staging seed complete (89 markers, 89 profiles) | **SAFE (conditional)** for Wave 2 breadth pilot; activation still gated |
| Provider search cutover | **Out of scope** — NOT SAFE until M1.5F |
