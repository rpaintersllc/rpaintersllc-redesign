# Private-pilot notification diagnostics

Run these reports only as an authorized operator in the isolated Supabase project
`ocmgrgvzhuhyigaddhue`, through the SQL editor or the configured SQL connector.
They are not migrations, API endpoints, browser code or scheduled jobs. Execute
one complete file at a time: each uses a read-only transaction, a five-second
statement timeout and ROLLBACK. No extra package, credentials export or deployment
is needed. Do not add them to a browser bundle or relax client permissions.

- `notification-health.sql`: aggregate queue state, separated into Buzzie projects,
  other direct intake, and external discovery. The first split uses the existing
  platform-project relation; it does not read contact details or infer consent.
- `notification-schedules.sql`: the two existing retry jobs, including missing or
  disabled jobs, starts and SQL successes/failures in the last 24 hours. It reads
  only job identity/active state and run status/timestamps, never commands,
  return messages, headers, bodies, Vault values or provider references.

The queue report reads only lifecycle fields and the lead/project relation. It
never claims, retries, enqueues or dispatches work. No individual IDs, contacts,
message/photo contents, raw errors or secrets are returned. Existing test records
are included: totals are operational queue counts, not customers or conversions.

## Interpret and respond

| Signal | Meaning / next step |
| --- | --- |
| `due_retryable` > 0 | Due pending work or an expired processing lease, below the eight-attempt and twelve-hour limits. Compare `oldest_due_created_at` with the five-minute schedule; repeated growth merits worker investigation. Creation time is not the time it first became due. |
| `exhausted_unsettled` > 0 | Unlocked pending/processing work has eight attempts or a first attempt older than twelve hours. It is excluded from retryable totals; the worker normally settles it as failed. Investigate without resetting attempts or replaying it. |
| `expired_leases` > 0 | Processing lease expired; may overlap retryable or exhausted work. A short transient count alone does not prove failure. |
| `missing_leases` > 0 | Processing row has no expiry, so the normal claim predicate cannot reclaim it unless exhaustion cleanup applies. Investigate before any repair. |
| `failed` > 0 | Terminal queue failures; inspect through an authorized server-side process. Do not paste raw errors/customer content into documentation. |
| Missing/inactive schedule, stale `last_start`, SQL failures | Investigate scheduler configuration/history. This report changes nothing and does not register or reactivate jobs. |
| `provider_accepted` / SQL success | Provider acceptance and successful dispatcher SQL are separate from inbox delivery. With no due work the dispatcher can succeed without an HTTP call. Neither proves homeowner confirmation/recovery, message/visit notification or acquisition readiness. |

Counts overlap where documented; do not add diagnostic counts to status totals.
An empty queue still returns all three channels with zero totals. Discovery is
never combined with consented project requests. The direct-intake channel is the
legacy/non-platform lead queue, not a claim about customer identity.

Before taking any delivery action, review the worker with safe aggregated logs.
Do not invoke `run_*`, `claim_*`, `finish_*`, admin retry actions or notification
workers merely to test these reports. Do not send test messages or create fake
customer requests. An authorized genuine delivery flow is a separate launch gate.

## Repeatable synthetic regression

From the repository root:

```sh
node painting-platform/operations/notification-fixtures.mjs
```

This only prints SQL. Review/run the output through the same isolated-project SQL
connector/editor. It embeds the exact report SELECTs, replacing relation names
with synthetic CTEs. There are no inserts, temporary tables, functions or worker
calls. All five returned booleans must be true. Cases cover retry timing, eight
attempts, exactly/past twelve hours, expired/current/missing leases, accepted and
failed states, channel isolation, entirely empty queues, a missing scheduler and
exclusion of runs older than 24 hours. Fixture timestamps share transaction `now()`.
This is separate from `npm run verify`, which never connects to the database.

## Evidence — October 22, 2026, 09:59 UTC

Both committed reports executed successfully as read-only transactions against
the isolated pilot. Queue totals: Buzzie projects 2 provider-accepted, other direct
intake 4 provider-accepted, discovery 1 provider-accepted; all pending, processing,
failed, due, exhausted and missing/expired-lease counts were zero. These are
existing records, not new leads or verified customers.

Both existing retry schedules were configured and active, with 288 SQL successes
and zero SQL failures each in the preceding 24 hours; latest starts were at
09:55 UTC. No worker was manually invoked and no delivery was verified.
Synthetic regression returned all five booleans true. The local verifier still
links 12 browser modules and passes 142 mocked tests.

No schema, permission, Auth, worker configuration, Site source or audience changed.
These diagnostic tools and their evidence are saved in code only. Review account-link recovery and remaining cross-account
launch evidence next; keep genuine email delivery and abuse enforcement gates
open until independently verified.

Reference checked: https://supabase.com/docs/guides/cron/quickstart

## Selected access posture report

`access-posture.sql` is a separate metadata-only read-only report for selected
private table RLS/client CRUD and server-function client EXECUTE grants. It does
not invoke application functions. Run its complete transaction independently;
interpret both returned arrays using [the access evidence runbook](../tests/ACCESS-BOUNDARIES.md).
