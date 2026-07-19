#!/usr/bin/env python3
"""Regenerate the universal common-medication benchmark from approved local sources.

Sources (read-only):
  - Medora-curated Wave2 / Wave3 / Wave4 candidate JSON manifests in-repo
  - Optional local FDA NDC Directory export for brand enrichment only
    (~/medora-data/processed/fda-ndc.json) — never invents RxCUI/NDC identities

Usage:
  python3 generate-universal-benchmark.py
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]  # apps/api
MED_ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / "data" / "medora-universal-common-medication-benchmark.json"
FDA_NDC = Path.home() / "medora-data" / "processed" / "fda-ndc.json"

WAVE_CANDIDATES = [
    MED_ROOT / "wave2" / "data" / "medora-curated-wave2-candidates.json",
    MED_ROOT / "wave3" / "data" / "medora-curated-wave3-candidates.json",
    MED_ROOT / "wave4" / "data" / "medora-curated-wave4-candidates.json",
]


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def family_id(generic: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", norm(generic)).strip("-")
    return slug or "unknown"


def load_json(path: Path):
    if not path.exists():
        return None
    with path.open(encoding="utf8") as f:
        return json.load(f)


def main() -> None:
    families: dict[str, dict] = {}
    sources_used = []

    for path in WAVE_CANDIDATES:
        data = load_json(path)
        if not data:
            continue
        sources_used.append(path.name)
        rows = data if isinstance(data, list) else data.get("candidates") or data.get("families") or []
        for row in rows:
            generic = (
                row.get("genericName")
                or row.get("generic")
                or row.get("preferredGeneric")
                or ""
            ).strip()
            if not generic:
                continue
            fid = row.get("familyId") or family_id(generic)
            entry = families.get(fid) or {
                "familyId": fid,
                "genericName": generic,
                "domain": row.get("domain") or row.get("clinicalDomain") or "INTERNAL_MEDICINE",
                "brandQueries": [],
                "genericQueries": [generic],
                "aliases": [],
                "expectedStrengthSubstrings": [],
                "expectedForms": [],
                "expectedRoutes": [],
                "sources": [],
                "variantHints": [],
            }
            for b in row.get("brandNames") or row.get("brands") or row.get("brandQueries") or []:
                if b and b not in entry["brandQueries"]:
                    entry["brandQueries"].append(str(b))
            for s in row.get("strengths") or row.get("expectedStrengthSubstrings") or []:
                if s and s not in entry["expectedStrengthSubstrings"]:
                    entry["expectedStrengthSubstrings"].append(str(s))
            src = path.stem.upper().replace("-", "_")
            if src not in entry["sources"]:
                entry["sources"].append(f"MEDORA_CURATED_{src.split('_')[-1].upper()}" if "wave" in path.name.lower() else src)
            # Prefer wave label
            wave = "WAVE2" if "wave2" in path.name else "WAVE3" if "wave3" in path.name else "WAVE4" if "wave4" in path.name else "CURATED"
            label = f"MEDORA_CURATED_{wave}"
            if label not in entry["sources"]:
                entry["sources"].append(label)
            families[fid] = entry

    brand_index: dict[str, set[str]] = defaultdict(set)
    if FDA_NDC.exists():
        sources_used.append(str(FDA_NDC))
        ndc = load_json(FDA_NDC) or []
        products = ndc if isinstance(ndc, list) else ndc.get("results") or ndc.get("products") or []
        for p in products:
            g = norm(p.get("generic_name") or p.get("genericName") or "")
            b = (p.get("brand_name") or p.get("brandName") or "").strip()
            if g and b and b.lower() not in ("", "n/a", "none"):
                brand_index[g].add(b)
        for entry in families.values():
            for b in sorted(brand_index.get(norm(entry["genericName"]), []))[:8]:
                if b not in entry["brandQueries"]:
                    entry["brandQueries"].append(b)
            if brand_index.get(norm(entry["genericName"])):
                if "FDA_NDC_LOCAL" not in entry["sources"]:
                    entry["sources"].append("FDA_NDC_LOCAL")

    family_list = sorted(families.values(), key=lambda f: f["familyId"])
    domains = Counter(f["domain"] for f in family_list)
    payload = {
        "version": "universal-common-medication-benchmark-1.0.0",
        "brandBearingFamilyCount": sum(1 for f in family_list if f["brandQueries"]),
        "domainDistribution": dict(sorted(domains.items(), key=lambda kv: (-kv[1], kv[0]))),
        "sources": sources_used,
        "families": family_list,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    OUT.write_text(text, encoding="utf8")
    digest = hashlib.sha256(text.encode("utf8")).hexdigest()
    print(f"Wrote {OUT} families={len(family_list)} sha256={digest}")


if __name__ == "__main__":
    main()
