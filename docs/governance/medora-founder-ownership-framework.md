# Medora Founder Ownership Framework

**Program:** GOV.1  
**Version:** 1.0 (draft)  
**Status:** Framework for counsel to formalize — not executed

---

## Purpose

Define how Medora founding members hold equity, make decisions, and protect the company during fundraising, enterprise sales, and potential exit.

---

## 1. Recommended entity type

| Stage | Recommendation |
|-------|----------------|
| Pre-seed / founder-owned | **Delaware or home-state LLC** (taxed as partnership) or **Delaware C-Corp** if VC path likely |
| Hospital enterprise sales | LLC acceptable if members are US persons; C-Corp often preferred for institutional investment |
| Haiti + US operations | Counsel to advise on subsidiary structure if Haiti entity needed separately |

**Action:** Founders select entity with tax counsel before first priced round or hospital MSA.

---

## 2. Ownership principles

1. **Equity reflects economic risk and contribution** — cash, IP, full-time effort, domain expertise.
2. **Vesting protects the company** — unvested interests forfeited on departure.
3. **IP is assigned to the entity** — no personal retention of product code (see IP framework).
4. **Decision rights are explicit** — avoid silent deadlock on BAA signing, fundraising, or sale.

---

## 3. Standard founder vesting (template defaults)

| Term | Default |
|------|---------|
| Vesting period | 4 years |
| Cliff | 1 year (25% vests at cliff) |
| Acceleration | Single-trigger on acquisition (negotiable); no acceleration by default |
| Repurchase right | Company may repurchase unvested interests at cost or fair market value per agreement |

Founders who contributed IP/code **before** entity formation should receive **credit for time served** (e.g., 12-month cliff credit) — counsel to document.

---

## 4. Decision rights matrix (recommended)

| Decision | Threshold |
|----------|-----------|
| Day-to-day product/engineering | CEO / designated founder |
| Hiring contractors | Majority of members |
| Signing customer MSAs < $[THRESHOLD] | Designated signatory |
| Signing BAA / HIPAA obligations | **Unanimous** or supermajority (recommended) |
| Fundraising / new members | Supermajority (66.7%+) |
| Sale of company / asset sale | Supermajority or unanimous |
| Dissolution | Unanimous |

---

## 5. Founder roles (fill in)

| Founder | Role | Ownership % (target) | Vesting start | Full-time? |
|---------|------|----------------------|---------------|------------|
| [FOUNDER 1] | [CEO / CTO] | [__]% | [DATE] | [Y/N] |
| [FOUNDER 2] | [COO / CPO] | [__]% | [DATE] | [Y/N] |
| [FOUNDER 3] | [__] | [__]% | [DATE] | [Y/N] |

**Total:** 100%

---

## 6. Reserved matters (require member consent)

- Incurring debt > $[AMOUNT]
- Granting security interests in IP
- Changing primary business (e.g., pivot away from healthcare)
- Entering exclusive partnership restricting hospital sales
- Settling litigation > $[AMOUNT]
- Adopting privacy/security policies binding all customers

---

## 7. Deadlock resolution

1. **Good-faith negotiation** (30 days)
2. **Mediation** (optional)
3. **Buy-sell provision** (Texas shoot-out or fair market value appraisal) — counsel to draft in Operating Agreement

---

## 8. Leaver provisions

| Type | Treatment |
|------|-----------|
| **Good leaver** (death, disability, termination without cause, mutual) | Vesting accelerates pro rata or vested portion retained |
| **Bad leaver** (cause, voluntary quit without notice, IP breach) | Unvested forfeited; company repurchase vested at discount per agreement |

---

## 9. Documentation checklist

- [ ] LLC Operating Agreement or Certificate of Incorporation + Bylaws
- [ ] Founder Ownership / Restricted Interest Agreement
- [ ] Founder IP Assignment (each founder)
- [ ] Cap table (initial)
- [ ] 83(b) elections if restricted units issued
- [ ] Signatory resolution authorizing [NAME] to execute BAAs and MSAs

---

## 10. Relationship to product

Medora-S platform roles (`ADMIN`, `MEDORA_SUPER_ADMIN`) are **operational**, not corporate. Map:

- **Corporate signatory** → executes BAA with customer
- **MEDORA_SUPER_ADMIN** → platform ops (backup, system health) — not a substitute for legal authority

---

**Next step:** Counsel drafts binding agreements from `docs/legal/founder-ownership-agreement-template.md` and `llc-operating-agreement-template.md`.
