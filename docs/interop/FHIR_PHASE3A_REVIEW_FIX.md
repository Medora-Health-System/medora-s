# Phase 3A replay namespace hardening

Inbound diagnostic replay suppression is namespaced by the stable Medora integration identity, facility, FHIR resource type, and partner message/logical identifier. This prevents two different FHIR partners from suppressing one another when they legitimately reuse the same external identifier.
