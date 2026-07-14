# ICD-10-CM production releases (Medora)

Official CDC/NCHS ICD-10-CM catalogs are **not** committed to git.

## Development sample (not production)

`apps/api/prisma/data/icd10-cm-sample-dev.csv` remains the local demo catalog loaded by `MEDORA_SEED_MODE=clinical-content`. It is explicitly **not** production-complete.

## Production import (required)

1. Download the official FY2026 Code Descriptions ZIP from CDC/NCHS (see manifest in `apps/api/prisma/icd/icd10-cm-release-manifest.ts`).
2. Validate:

```bash
pnpm --filter @medora/api icd:dry-run -- \
  --file "/path/to/icd10cm-Code-Descriptions-2026.zip" \
  --release 2026
```

3. Import:

```bash
pnpm --filter @medora/api icd:import -- \
  --file "/path/to/icd10cm-Code-Descriptions-2026.zip" \
  --release 2026
```

4. Certify tendon/ligament parity against the same official artifact:

```bash
pnpm --filter @medora/api icd:coverage -- \
  --file "/path/to/icd10cm-Code-Descriptions-2026.zip" \
  --release 2026 \
  --write-reports
```

Place downloaded artifacts under `.cache/` (gitignored) or any secure operator path.
