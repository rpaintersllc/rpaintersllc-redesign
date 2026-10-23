# Contractor conversation summaries — October 23, 2026

## Implemented

Each loaded contractor project now identifies who sent the latest message and
when, or shows **No messages yet**. The **Conversation** filter selects all
projects, latest-from-homeowner, latest-from-team or no-message projects.
It composes with the existing search/status/review filters and does not alter
the loaded-project metrics. The default view retains projects without messages.

This is a latest-author summary, **not unread tracking** or proof that a response
is required. It updates on explicit workspace Refresh. A reply within an open
conversation is reflected in the project summary after that refresh. There is
no polling, outbound notification or delivery claim.

## Scoped read

Only pro-list adds the existing platform_messages relation to its already
business-scoped project read. PostgREST embedded limit/order return at most one
author/timestamp row per project, with created_at desc/id desc ordering and the
existing 100-project parent limit. No message body is selected. The API converts
this into a narrow message_activity object and removes the raw embedded field;
unknown/invalid metadata yields null. Homeowner lookup/account queries were
not changed to fetch these summaries. Authentication, membership, private
photo access and the contractor-access retirement guards are unchanged.

No schema migration, grant, RLS policy, index or provider change was needed.

## Verification

- **13 linked browser modules; 431 mocked Node/DOM/API tests passed** via
  npm run verify. Added six UI and six API cases.
- UI cases cover all three summary states, each filter, composition with status,
  unchanged totals and one mocked team reply becoming visible on explicit refresh.
- API cases assert membership before project access, business scope,
  parent limit 100, embedded limit 1, deterministic ordering, metadata-only
  selection, raw/body removal, invalid/empty metadata and unchanged homeowner lookup.
- Actual read-only database checks confirmed the message → project foreign key
  and existing project_id/created_at index. A lateral latest-message aggregate
  found **3 projects; 1 with message metadata**. No bodies or private contact
  details were selected or exported by those checks.
- Supabase/PostgREST primary docs were consulted for embedded alias/order/limit:
  https://docs.postgrest.org/en/stable/references/api/resource_embedding.html#embedded-filters
  https://supabase.com/docs/guides/database/joins-and-nesting
  The current Supabase changelog was fetched; no related breaking API convention
  requires a schema or client change here.
- Live platform-api v12 source matched the branch baseline before replacement.
  Deployed **v13** source read-back exactly equals the tested file.
  Existing verify_jwt=false/manual authorization and runtime environment values
  were preserved.

## Publication

Only pro.html/pro.js changed in the newly opened hosted source; all other
web assets matched the branch baseline apart from trailing newlines.
Published the same owner-private Site, preserving identity and audience:

- Site source: f8b9cb95f8d2b2853497841e457b126cb8629269
- Deployment: appgdep_6adbbdd025608191bc5a0f28ee24793d
- Completed: October 23, 2026, **20:04:44 UTC**
- URL: https://r-painters-projects.jessicuriel27.chatgpt.site

## Remaining acceptance and runtime limit

A genuine authenticated pro-list HTTP/browser read of the new embedded relation
has **not** been completed. The Browser plugin's bootstrap call returned
**Unknown tool (browser.js)** before a connection could be established. No
connected local session was inspected, no sign-in was attempted and no substitute
browser/session was used. Restore the Browser connection in an interactive Work
session, then verify the existing signed-in contractor view and Refresh behavior.

No real message, visit, lead, account, estimate or email write occurred. No
new browser/mobile/screen-reader walkthrough is claimed. Mocked transport and
the SQL aggregate do not establish authenticated HTTP serialization, delivery
or cross-account browser isolation.

Next: read-only authenticated dashboard acceptance, followed by authorized
cross-account/browser and estimate save/reload checks. SMTP/external homeowner
delivery and actual Turnstile enforcement remain separate release gates.
