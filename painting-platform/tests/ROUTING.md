# Coverage and assignment verification

Reviewed October 22, 2026 against branch baseline `394a691` and isolated project
`ocmgrgvzhuhyigaddhue`. This follow-up changes tests/documentation only.

## Assignment boundaries

The public gateway requires the pilot slug `r-painters-llc`, South Carolina,
a five-digit ZIP and explicit contact permission. It constructs the RPC payload;
submitted business/account IDs, contact-verification flags and discovery source
cannot select a company, claim ownership or mark the contact verified.

The server-only create RPC matches the requested slug against an active company
that is accepting requests, with matching state, configured ZIP prefix and
case-insensitive configured city. It does not fall back to another company.
Coverage is a city-list/prefix rule, not address geocoding or a guarantee that a
city and ZIP belong together. R Painters remains the sole real pilot participant.

A retry with the original request key and private-key hash returns its existing
project before checking current coverage/availability. Pausing, deactivating or
editing a company's coverage therefore does not reassign an existing project.
A different hash cannot replay that receipt. These checks do not verify the
homeowner's contact details, assign an account owner or guarantee a booking.

## Repeatable checks

`npm run verify --prefix painting-platform` includes ten new `routing.test.mjs`
cases using injected synthetic fetch responses only. They cover four early
validation denials, normalized/server-controlled payload fields, coverage/rate/
key-conflict errors without a fallback call, duplicate receipts and the catalog's
active/accepting filters and public field selection. Notification dispatch and
challenge enforcement are disabled in these fixtures; neither is proven here.
The full local suite passes **263 tests** and links **12 browser modules**.

`routing.sql` is a separate authorized-operator test for the isolated project.
Run the entire file in one SQL invocation; never remove or replace `ROLLBACK`.
Do not run it against another project or a public production database. Review
RPC and trigger implementations first. The preflight guard refuses unexpected
fixture-table triggers or changed normalized hashes of the reviewed create RPC
and two allowed lead trigger bodies. New triggers/functions require review,
not simply updating the guard to pass. Existing rate-limit headroom is required;
if the guard fails, stop rather than changing live limits.

The file uses fresh random synthetic companies, request keys and example.invalid
contacts. One alternate company is active and the selected company is temporarily
active only inside the transaction, so fallback can be disproven. These are not
real contractor enrollments and no real company is updated. There is one
uncommitted synthetic lead/project and a transactional, unclaimed notification
row; no public intake, Auth, Storage or worker endpoint is called. Other sessions
cannot claim the uncommitted row. All fixture data is rolled back.

All **16 SQL assertions passed** in the live isolated database: missing/inactive/
paused provider, state/ZIP-prefix/city rejection, denial without inserts,
case-insensitive selected-company assignment, unverified/unowned contact,
unclaimed transactional outbox, no fallback after pause, original-key retries
after pause/deactivation/coverage edits, conflicting private keys, and exactly
one fixture lead/project/event. Any failed assertion raises before the final
report. The connector returned only the last SELECT, after ROLLBACK:

| Post-rollback fixture count | Result |
| --- | --- |
| Leads | 0 |
| Companies | 0 |
| Projects | 0 |

The preceding assertion-count SELECT reports 16 in clients that expose all
statement results. A SQL error is a failed run: issue ROLLBACK and verify fixture
counts before investigating; never treat absent earlier result sets as a pass
when the connector reports an error.

## Limits and next check

This is operator RPC and mocked gateway evidence, not a full browser/JWT journey,
parallel-race proof, genuine email delivery or actual CAPTCHA verification.
No application code, migration, runtime setting, real provider or Site source/
audience changed, so no deployment was needed. Discovery stays a separate channel.

Next: exercise request receipt and photo failure/retry transitions in the
local-only browser fixture, then record narrow-frame and keyboard evidence.
Genuine sender/redirect/delivery, native abuse enforcement, full authenticated
cross-account journeys and physical-device/screen-reader checks remain launch
gates in LAUNCH.md.
