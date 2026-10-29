# Live homeowner and contractor journey — October 28, 2026 (Eastern)

## Authorized test record

Project `92fb1e9e-b490-4025-9ba1-7082fcc1c60d`, labelled **BUZZIE TEST — homeowner journey**, uses the authorized owner's contact. It is not a customer, booking, sale or conversion. It remains available for owner review; no real customer record was modified. Final state is **lost / Project closed**, and the test visit is **cancelled**. The private estimate contains the clearly synthetic $1.00 test value. No payment, actual estimate or real appointment was offered.

## Observed through the live Edge UI

1. The owner signed in to My account. Refresh projects succeeded; the account initially had no linked requests.
2. Completed all three request steps in Summerville, 29483. Turnstile displayed Security check complete automatically; no interactive CAPTCHA was solved or bypassed. Submission displayed Your request is saved and Project linked to your homeowner account.
3. My account showed the new project. Its account-only URL, without a guest capability, opened the workspace and conversation successfully.
4. Sent one explicitly marked homeowner test message. The existing approved contractor session refreshed, located the labelled project, and displayed that exact message.
5. Sent one marked contractor test reply. The homeowner's Refresh conversation displayed both messages.
6. Requested a Flexible test visit for November 4, 2026. Contractor confirmed; homeowner displayed Visit confirmed. Homeowner then cancelled; UI displayed Cancelled by homeowner. No real calendar or outside appointment was created.
7. Saved a private test estimate of $1.00. Contractor displayed Private estimate saved: $1.00. Homeowner saw no $1.00 amount. Saving did not send a quote or collect payment.
8. Changed only the test project's status through Estimate provided, Project booked and Project closed. Refreshed the homeowner page to verify the quoted/booked states; final database verification confirms quoted/won/lost history. A test won event is not an actual sale.
9. Downloaded BUZZIE's existing logo through its displayed image and uploaded that file as an explicitly synthetic test photo. UI displayed 1 photo(s) confirmed and a loaded Private project photo 1. No customer's photograph was used.

## Actual logout and revocation

The existing sign-out implementation calls Supabase logout without a local scope and therefore signs this account out globally. After signing out through My account, the owner's actual auth.sessions count fell from **10 to 0**. The contractor tab still held its previously usable credentials; Refresh returned Contractor access is unavailable and removed its project/quote/contact controls. This is a real previously active contractor-session rejection, not a mocked token or an unauthenticated-only probe. No token was extracted or recorded.

Reopening the account-only homeowner project after logout displayed Sign in and reopen this project from My account and no project details/photos/messages. This homeowner reopening used no local bearer; it is distinct from replaying the revoked homeowner JWT. That exact homeowner-token replay and reauthentication remain untested. The owner must sign in again to both workspaces. No password was changed.

## Independent server/email evidence

Read-only SQL confirmed: account linked; assigned exclusively to r-painters-llc; final lead status lost; one ready photo; one homeowner and one business message; visit cancelled; private estimate 100 cents. Event history is new → visit_scheduled → contacted → quoted → won → lost.

Notification worker accepted on its first attempt. Gmail independently showed the matching project link in New BUZZIE painting request at **October 28, 2026, 9:01:42 PM Eastern** (01:01:42 UTC October 29), message `1a1852d570670b15`. Sender is still the Resend development sender, so branded sender/external homeowner delivery are not established. Conversation and visit updates still have no email/SMS notifications, as disclosed in the UI.

## Limits and next gates

The requested 390 × 844 viewport override did not apply: measured client/page width remained 1513 px. It was reset. This session verifies a desktop journey only, not responsive/mobile acceptance. Desktop/photo rendering and post-logout privacy UI were observed. The screenshot in tests/evidence/homeowner-logout-2026-10-28.png shows the access denial without private project contents.

Native Auth CAPTCHA remains disabled, custom branded SMTP/confirmation/completed recovery remain pending, and genuine company-interest/replay/expiry checks remain open. No public launch, Site/code deployment, appearance/color change, new contractor, provider purchase, billing or data deletion occurred. The previously reported 458 mocked tests and 11 SQL checks belong to the preceding verification run; they were not rerun or counted as new tests here.
