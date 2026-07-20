# Medication Benchmark Maintenance Policy

1. The approved benchmark is the requirement — not a shrinking live baseline.
2. Failures must be fixed in catalog/search code, not by deleting families.
3. Removals require:
   - documented clinical/source reason
   - evidence from approved sources
   - explicit review note in the PR
   - audit trail in docs or certification notes
4. Intentional facility exclusions use `intentionalExclusion` with notes — they are not silent skips.
5. Source upgrades bump `sourceVersion` / benchmark version strings.
