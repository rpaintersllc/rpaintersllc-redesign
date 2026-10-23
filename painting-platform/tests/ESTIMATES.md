# Private estimate amounts — October 23, 2026

## Implemented and published

Contractor project cards now include **Private estimate**. An approved business
team member can save the latest USD amount for an assigned project and revise it
later. The amount is stored as integer cents ($0.01–$9,999,999.99), with actor,
timestamp and optimistic revision. The existing homeowner-visible status control
continues to manage quoted/won/lost separately.

Saving an amount does not send a quote, collect a payment, change project status
or notify the homeowner. This is internal tracking, not an invoice, homeowner
quote acceptance or estimate version history. Homeowner lookup/account endpoints
do not fetch the new table. Only the contractor list receives its scoped estimate.

The new invoker RPC rechecks actor membership and project/business scope, locks the
project row, validates bounds and rejects stale revisions. The table has RLS,
no public/anon/authenticated grants and server-only privileges. Team members cannot
supply a different actor through the API. No user-editable metadata authorizes access.
The editor blocks duplicate submits, preserves amounts edited during a save,
ignores detached/session-retired results and requires workspace refresh after an
uncertain save or conflict.

## Verification

- **13 browser modules linked; 406 mocked Node/DOM/API tests passed** via
  `npm run verify`. Added 11 editor tests, seven estimate API tests and one
  access-matrix case; extended the strict list fixture for the new scoped read.
- **20 live-database rollback checks passed** in [estimates.sql](estimates.sql):
  membership and project isolation, invalid/boundary amounts, exact cents,
  owner/staff saves, stale revision rejection, RLS, direct-client privilege denial,
  unchanged status and no duplicate record/outbox dispatch.
- Rollback left **0 fixture leads, businesses and users**. The new table has
  **0 persisted estimates**; no real customer project was updated.
- Read-only privilege checks confirmed the server role can read/write the estimate
  table, read project/membership records and execute the new RPC.
- Deployed platform-api **v12** source read-back equals the tested file exactly.
  Its prior v11 source matched the GitHub baseline; existing manual authorization,
  `verify_jwt=false`, environment values and Turnstile separation were preserved.
- Actual unauthenticated `pro-estimate` request returned **403 Workspace access required**.
  No successful authenticated live HTTP save was attempted.
- Desktop Chromium in a **390 px iframe** saved a synthetic **$2,500.01** with
  the production editor and a mocked transport. A simulated conflict kept **3000**
  in the input, disabled retry and asked for workspace refresh. Document/scroll
  widths were both 390 px. An intermediate malformed value was rejected locally
  without an extra mock write. This is not a physical-device or sign-in check.
- [Local UI capture](evidence/private-estimate-390.jpg) is synthetic-only.
  [estimates-browser-preview.mjs](estimates-browser-preview.mjs) reproduces the
  isolated fixture in a NEW absolute directory. It copies production assets,
  uses a mock callback and sets connect-src/form-action to none. Never deploy it.
  The generator was run successfully; only production pro.js/estimates.js were
  copied to the hosted Site.
- Security advisors retain the prior leaked-password warning and server-only
  RLS-without-policy information (one new informational table). No permissive
  policy was added to suppress those findings.

Migration: `20261023180143_contractor_estimate_amounts.sql`, aligned with the
version read from the remote migration history. The file was initially generated
by Supabase CLI 2.122.0 and renamed to the actual applied version.

Private Site source `88c233fde08945a0a1ebaf82fa69c509918c405d`; deployment
`appgdep_6adba2ad1c848191923f25f657c37c7c` succeeded at **18:08:53 UTC**.
Existing Site identity, owner-only audience and all other hosted assets were
preserved after comparison. No main/rpaintersllc.com, provider activation,
membership, spending, messaging, Auth or secret/configuration change.

## Review and remaining acceptance

Open the existing private pilot, sign into the contractor workspace, expand an
assigned project's **Private estimate**, and review the controls. The pilot does
not contain a saved demonstration amount from this run.

Next: authenticated contractor save → reload acceptance and homeowner privacy
confirmation using authorized test identities without customer data, plus full
mobile/screen-reader journeys. SMTP/external homeowner delivery and Turnstile
activation remain separate gates; neither was claimed complete here.
