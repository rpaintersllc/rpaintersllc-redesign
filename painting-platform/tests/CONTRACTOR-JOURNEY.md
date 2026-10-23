# Contractor acceptance journey — October 23, 2026

## New review evidence

The operator-only [contractor-journey.sql](contractor-journey.sql) was executed
against the isolated pilot database `ocmgrgvzhuhyigaddhue`, using the deployed
functions, not mocked replies. Baseline branch: `8f4cbd6`.

Result: **22 database checks passed**, followed by a complete ROLLBACK.
Post-rollback result: **0 fixture leads, 0 fixture projects, 0 fixture outbox rows**.
No application feature or database schema was changed by this run.

| Checks | Verified behavior |
| --- | --- |
| 1–3 | Unsupported coverage rejects without a lead; covered request maps to the existing active R Painters provider and a pending transactional outbox row |
| 4–6 | Identical create retry keeps one project; another capability cannot claim the retry; a second project remains independent |
| 7–9 | Wrong business and invalid status reject; assigned business can mark contacted |
| 10–11 | Qualification persists; stale review revision rejects |
| 12–13 | Private-capability visit request becomes confirmed and advances the early pipeline |
| 14–17 | Quoted and won persist; a repeated quoted update adds no history event; cancelling the old visit preserves won |
| 18–20 | Separate contacted → quoted → lost path; independent exact status histories; exactly two unclaimed outbox rows |
| 21–22 | Anonymous and authenticated roles lack direct EXECUTE on the privileged status RPC |

Status history is checked as a multiset, not chronological ordering. PostgreSQL
transaction timestamps can tie; this test does not claim the UI timeline orders
same-timestamp events deterministically.

## Safety and reproduction

Run the **entire SQL file**, including ROLLBACK and final cleanup query, only
through an authorized operator connection to the isolated pilot. Do not run pieces
or replace ROLLBACK with COMMIT. The script is deliberately not part of the Node
test command and needs no browser secret or sending credential.

Before executing, this run inspected the deployed create, status, review, visit,
outbox and history functions and the row triggers. The only user triggers on the
affected tables were the reviewed transactional outbox/status triggers; neither
dispatches external I/O. The script refuses additional user triggers and requires
the current pilot provider and an existing owner membership. It changes neither
provider availability nor membership. Local statement/lock timeouts bound its work.

Synthetic requests use unique `example.invalid` emails and test phone numbers,
and exist only inside the reverted transaction. A background worker cannot see
the uncommitted outbox rows. No HTTP intake, Auth operation, Storage write,
notification dispatcher, email, message, purchase or real project change occurred.
No synthetic account or extra contractor was created/activated.

The first draft of the test combined a write function with a subquery in one
boolean expression; PostgreSQL evaluated the read using the old statement
snapshot and the test failed at contacted. That transaction aborted. The saved
test separates each write from its subsequent read and then passed all checks.
This was an acceptance-harness correction, not a discovered application defect.

## What remains unverified

These checks prove database workflow and RPC scoping, not end-to-end API/JWT
authorization or a real homeowner/contractor browser session. They also do not
prove CAPTCHA enforcement, email delivery, photo transport, physical mobile or
screen-reader behavior. An existing `quoted` stage is tested; a structured monetary
estimate record was not added and is not implied by this report.

Next: finish authenticated API/browser acceptance without real writes, reconcile
Turnstile activation in the owner's separate flow, and verify the approved SMTP
sender and external homeowner confirmation/recovery. Owner-only Site hosting and
all costs are unchanged. No deployment is needed for these SQL/evidence files.

Supabase's testing guidance was checked:
https://supabase.com/docs/guides/local-development/testing/overview
The changelog was fetched on October 23; no database transaction API change
affects this fixture. Existing RLS-without-policy information is expected for the
server-only data model; no permissive client policies were added.
