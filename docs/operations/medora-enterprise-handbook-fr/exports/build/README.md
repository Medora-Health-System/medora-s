# Export build — pandoc requis

Assemblage markdown disponible : `../assembled/medora-enterprise-handbook-fr-assembled.md`

Installer pandoc puis exécuter :

```bash
pnpm handbook:export
```

Ou manuellement :

```bash
pandoc ../assembled/medora-enterprise-handbook-fr-assembled.md -o medora-enterprise-handbook-fr.pdf
pandoc ../assembled/medora-enterprise-handbook-fr-assembled.md -o medora-enterprise-handbook-fr.docx
```

Medora-S reste **dépendant du cloud** — ce export est documentation uniquement.
