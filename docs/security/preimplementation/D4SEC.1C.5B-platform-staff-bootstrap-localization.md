# D4SEC.1C.5B preimplementation

Threats: self/target approval, forged MFA, incomplete principal identity, client authority, repeat/racing bootstrap, over-grant, audit loss, and locale influencing authorization. Controls: complete D4SEC.1A resolver, database session MFA, distinct target, server constants, transaction advisory lock, historical audit closure, exact grants, transaction-coupled audit, and security-independent locale.

The bootstrap closure invariant is: after any successful completion, `PLATFORM_GOVERNANCE_BOOTSTRAP_COMPLETED` exists and every future transaction denies before mutation. Ordinary later operations remain D4SEC.1C.4C requests with distinct approval.
