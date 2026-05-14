# ER pilot — clinical UX checklist (Medora-S)

Controlled pilot validation after Clinical UX Phase 2/4. Use **synthetic or de-identified** scenarios; do not record real PHI in this document.

**Observation / short stay (Phase 13D):** after ER scenarios, run the pilot table in `docs/OBSERVATION_PRODUCT_READINESS.md` §8 (billing JSON, chart export, ROI).

## 1. Chest pain

- [ ] RN completes triage / vitals path as designed.
- [ ] Provider opens encounter and applies **Chest Pain** order set.
- [ ] If catalog skips items: **yellow count warning** + **helper** + **red error** (if any) are understood; no silent “done.”
- [ ] **Staged counts** and **next-step** line match expectations across LAB → IMAGING → …
- [ ] LAB and IMAGING orders submitted without losing remaining staged domains.
- [ ] Medications added when appropriate; directions / safety prompts acceptable.
- [ ] RN administers on **MAR**; **high-risk** line visible; **safety details** expandable (open by default if advanced warnings present).
- [ ] Provider documents and dispositions per local policy.

## 2. Sepsis

- [ ] Rapid vitals captured.
- [ ] Labs / meds placed; time to order and time to MAR recorded (pilot metrics).
- [ ] Validation friction (directions, allergy, IV/qty) acceptable under stress.
- [ ] Reassessment documented.

## 3. Simple discharge

- [ ] Minimal documentation path to **disposition / close**.
- [ ] If **documentation deficiency** modal appears: each line is clear; **Go to / Open** actions lead to the right tab or modal.
- [ ] Clicks to disposition counted; modal sequence acceptable.

## 4. Multi-role (RN / provider)

- [ ] RN uses allowed order entry; **RN authority** copy if MED/CARE tabs hidden (role-dependent).
- [ ] Provider completes provider-only steps.
- [ ] RN completes MAR; blocked actions show clear messages (unchanged authority rules).

## Sign-off

| Role | Name | Date |
|------|------|------|
| Clinical lead | | |
| Nursing lead | | |
