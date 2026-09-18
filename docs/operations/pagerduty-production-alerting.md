# PagerDuty production alert transport

## Purpose

Medora can deliver PHI-minimized operational incidents to PagerDuty Events API v2 without exposing the PagerDuty routing key in URLs, logs, health APIs, or browser responses.

## Production configuration

Set on the Railway API service:

- `MEDORA_ALERT_ENABLED=true`
- `MEDORA_ALERT_TRANSPORT=pagerduty`
- `MEDORA_PAGERDUTY_ROUTING_KEY=<secret Events API v2 integration key>`

Do not set `MEDORA_ALERT_WEBHOOK_URL` to PagerDuty. PagerDuty Events API v2 requires its own JSON envelope and routing key.

The transport posts only to the fixed US endpoint:

`https://events.pagerduty.com/v2/enqueue`

## External data minimization

The PagerDuty payload contains only:

- Medora service identifier;
- deployment environment;
- hard-coded operational event code;
- severity;
- event timestamp;
- opaque request correlation ID when present;
- HTTP status when present.

The PagerDuty projection deliberately excludes facility IDs, encounter IDs, user IDs, patient identifiers, clinical text, medication/order details, and arbitrary route values.

## Delivery behavior

- HTTPS POST with JSON content type.
- 8-second timeout per attempt.
- Up to three attempts with backoff.
- Stable SHA-256-derived deduplication key for retries of the same event payload.
- Delivery success/failure is logged without the routing key or request body.
- Invalid `MEDORA_ALERT_TRANSPORT` values fail closed and are reported as an unconfigured destination.
- Generic JSON/Slack webhook delivery remains available for existing deployments through `MEDORA_ALERT_TRANSPORT=webhook`.

## Validation

After deployment:

1. Rotate any PagerDuty integration key that has been exposed in a screenshot, chat, ticket, or log.
2. Store only the replacement key in Railway.
3. Redeploy the `medora-s` API.
4. Open Administration → System health.
5. Confirm the alert destination is configured.
6. Use **Send test alert**.
7. Confirm PagerDuty receives the test incident.
8. Resolve the test incident in PagerDuty.
9. Confirm Railway logs show delivery success without the routing key.

A configured key proves only configuration presence. The test alert proves end-to-end delivery.
