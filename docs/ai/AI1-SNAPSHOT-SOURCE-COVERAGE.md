# AI-1 snapshot source coverage audit

## Purpose

Medora Assist must not equate a successfully built snapshot with a complete clinical/legal encounter record. This audit compares the AI snapshot builder with Medora's existing encounter-scoped closed/legal chart composition.

## Already projected

The AI snapshot currently projects encounter/patient context, triage and bounded vitals, nursingAssessment JSON, current provider note/treatment plan and provider-documentation status, orders/order items, result text and critical/acknowledgement metadata, diagnoses, medication administrations, order-derived procedures, discharge summary, follow-ups, and appointments.

## Persisted sources not yet projected

The legal/closed-chart composition contains additional encounter-scoped sources that are not yet represented in the AI snapshot:

- provider documentation version history / signed snapshots
- provider addenda
- append-only encounter notes, including nursing narrative notes
- structured clinical-documentation entries
- nursing discharge execution
- procedure clinical events beyond order-derived procedure rows
- IV-access clinical events
- structured resultData / attachment metadata beyond resultText

Until these sources are deliberately projected and validated, snapshot completeness MUST remain false and the missing domains MUST remain machine-readable in completeness.missingSourceDomains.

## Safety rule

Do not remove a missingSourceDomains entry merely because another field appears similar. Remove it only after the authoritative persisted source is encounter/facility scoped, bounded with explicit truncation semantics, mapped into the shared AI contract, included in snapshotVersion, and covered by tests.

Consultations remain excluded as a distinct domain because the existing closed-chart audit states that Medora cannot prove a separate consultation entity; consultation content may exist inside provider MDM/free text and must not be invented as an authoritative section.

This phase does not enable external AI, change the legal chart, or write clinical data.
