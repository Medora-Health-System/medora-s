# INP.1B.4 Nursing Admission Simplification — Audit

## Verdict

The existing admission document, section PATCH endpoint, signature, amendment stream, enterprise-domain links, and print endpoint are reusable. No database change or second engine is required. The defect was presentation: six stage metadata existed, but the screen still exposed a nested twenty-section navigator and the print modal rendered transport/debug fields.

## Duplicate matrix

| Current section | Data collected | Authority | Duplicate | Disposition |
|---|---|---|---|---|
| Overview | reason, diagnosis, arrival condition | admission document | identity/source | Merge: Arrival & Identity |
| Identity/demographics | registration identity/language | Registration | overview/education | Read-only project |
| Source encounter summary | origin/transfer | Encounter/admission | overview | Merge/project |
| Nursing admission assessment | rapid arrival findings | admission document | pain/safety | Keep rapid findings; project downstream |
| Medical history | PMH verification | longitudinal history | none | Merge/history verification |
| Surgical history | PSH verification | longitudinal history | none | Merge/history verification |
| Home medications | medication verification | medication reconciliation | none | Merge/project |
| Allergies | allergy verification | allergy authority | none | Merge/project |
| Social history | tobacco/alcohol/substances | longitudinal history | psychosocial | Merge; do not copy |
| Belongings/valuables | inventory status | belongings documentation | none | Merge/project |
| Skin/wound | skin concern | wound documentation | assessment | Merge/project |
| Lines/drains/devices | device presence | device documentation | assessment | Merge/project |
| Fall/safety | risk and precautions | fall/safety documentation | mobility/dizziness | Merge/project |
| Pain | pain assessment | pain documentation | rapid pain | Project rapid answer; canonical workflow owns detail |
| Functional/mobility | mobility/assistance | admission document | fall/safety | Merge once |
| Nutrition | diet/swallowing | admission document | assessment | Merge |
| Elimination | bowel/bladder | admission document | I&O | Merge; I&O remains separate authority |
| Psychosocial | coping/social screening | admission document | social history | Merge, no diagnosis inference |
| Education/communication | language, learner, teach-back | education documentation/registration | identity | Merge/project language |
| Provider admission | order review/handoff | provider/handoff authorities | none | Review & Complete |

## Authority and isolation audit

* Persistence remains the admission JSON document in the encounter summary; the existing optimistic section PATCH is unchanged.
* Patient history, allergy, medication reconciliation, pain, fall, wound, device, belongings, and education integrations remain the only mapped authorities.
* INP.1B.3 nursing assessment, I&O, Timeline, Patient Chart, ED, Observation, and INP.2 care-plan persistence were not modified.
* Signature previously represented authorship after any progress, even while workflow completion was false. INP.1B.4 now gates signing on explicit completion/unable/not-applicable disposition of every durable section, preserving separate completion and signature facts without schema changes.
