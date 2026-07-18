# Phase 17 — Provider Advisory Guide

## Placement

Encounter-adjacent clinical advisory panel on the provider medication recommendations page.

**Do not** place pilot advisories inside:

- medication order modal
- prescription submission
- MAR administration
- pharmacy dispense
- order confirmation
- discharge prescription submission

## Banner (required)

**EN:** CONTROLLED PILOT — INFORMATIONAL ADVISORY ONLY — CLINICIAN JUDGMENT CONTROLS

**FR:** PROJET PILOTE CONTRÔLÉ — AVIS INFORMATIF UNIQUEMENT — LE JUGEMENT CLINIQUE PRÉVAUT

## Displayed fields

Title, therapy/family, kind, concise rationale, alternatives, major contraindication considerations, confidence, evidence level, provenance/reviewer/approval date, recommendation + knowledge versions, controlled-pilot badge.

## Provider actions (nonblocking)

- Acknowledge
- Dismiss
- Disagree (+ optional reason)

Mandatory acknowledgement must never block care progression.

## Forbidden UI actions

Order medication, Add to orders, Accept and order, Prescribe, Add to MAR, Apply recommendation, Auto-select, one-click order.

## Authorization

Server re-evaluates facility, program status, provider cohort, training, time window, pinned versions, qualification, and suspension on every request. Client eligibility is never trusted.
