# Contractor access retirement — October 23, 2026

## Corrected behavior

A current workspace API 401/403 rejection now clears the contractor session and
retires the visible private workspace. Project/contact cards, notes, estimates,
photo elements, the company/coverage/workspace selectors, applicant data and the
private project-search text are removed; metrics reset. The sign-in screen asks
the contractor to verify current access again.

The shared call wrapper applies this only to the same generation/token that
issued the request. It covers current project-list, status, private review,
estimate and availability rejections. A stale reply cannot retire a newer login.
Normal network failures without an access rejection preserve the authenticated
workspace. Loading returns an explicit current-success value so old refreshes
cannot overwrite newer sign-in/recovery feedback with “Projects refreshed.”

Applicant-interest access has a separate boundary: each current list load removes
the preceding applicant entries before fetching; current denial removes/hides
only that list. Approved project access stays available. Stale interest errors
are discarded, protecting a newer successfully loaded list.

## Evidence

Baseline: GitHub `a157c70`. The 13-case mocked fixture
[contractor-access-retirement.test.mjs](contractor-access-retirement.test.mjs)
had **12 failures** on the preceding production source; the network-failure
positive control already passed. All 13 pass after the correction.

Fresh full verification: **13 browser modules linked; 419 mocked Node/DOM/API
tests pass** through `npm run verify`. Relevant cases cover:

- Current list 401 and 403 removal of contacts, notes, estimates, photos,
  coverage, company selectors, metrics and applicant data.
- Current status/review/estimate/availability 403 removal.
- A network-only error retaining the authorized view.
- Stale 200/403/503 replies leaving a newer login and its feedback intact.
- Applicant-only denial clearing just its private list.
- A stale applicant-list error leaving a later successful list unchanged.
- A denial followed by a network problem and filter action not reviving cached
  private project data or issuing a new list read without a session.

The first full verification exposed four older DOM fixtures without a select-value
setter. A non-private filter-reset addition was removed; status/review/order filter
preferences keep their prior behavior. Private search text is still cleared.
The final full suite passes without changing those older fixtures.

## Publication and limits

Compared the newly opened Site source against the fresh GitHub baseline; only
production `pro.js` changed. All other assets matched apart from trailing
newlines. The same owner-private Site was published successfully:

- Site source: `acb36590465cdd2d60e47474e24d39eba9610b04`
- Deployment: `appgdep_6adbadd2492481919e328999a148fb35`
- Completed: October 23, 2026, **18:56:25 UTC**
- URL: https://r-painters-projects.jessicuriel27.chatgpt.site

No Supabase schema/API/Auth/Turnstile, real account, membership, project, visit,
message, quote or email operation occurred. No new browser or physical-device
walkthrough is claimed. These are simulated-response UI checks, not a real
membership-revocation or end-to-end JWT proof.

Clearing this view does not cancel an already-dispatched server write, erase a
browser's image cache or invalidate previously minted signed photo URLs. It
prevents current application panels/cache from displaying or reviving the
previous private workspace after the handled access rejection.

Next: controlled authenticated save/reload and cross-account/browser acceptance
with authorized test identities and no real-customer writes. External homeowner
SMTP/delivery and actual Turnstile enforcement remain independent launch gates;
this change does not close them.
