# BUZZIE: call acquisition pilot — November 19, 2026

## Status

Implementation ready for private review: `web/call.html`. No campaign created, no ad spend activated, no public access enabled. Painter Choice and R Painters' public website were not modified. Telephone links open the dialer; no live call was placed during testing. No new customer or delivered lead is claimed.

## First acquisition test

Use one service and one geographic cluster to make the first results interpretable: interior painting in Charleston, Summerville and North Charleston. Confirm actual crew capacity before activating. Expand only after qualified calls and estimates justify it. Do not split a small budget among every service and city.

Google Search draft (not imported; Google Ads account not connected through Windsor):

- Phrase / exact keywords: "interior painters near me", "interior painting charleston", "house painters summerville", [interior painters charleston], [painting company north charleston].
- Initial negatives to review: jobs, employment, salary, apprenticeship, diy, tutorial, classes, supplies, wholesale, automotive, car painting, face painting, free paint.
- Review negative search terms during the test; never exclude the phrase "free estimate".
- Headlines (each under 30 characters): `Charleston Interior Painting`; `Request A Free Estimate`; `Talk About Your Project`; `No Obligation To Hire`; `BUZZIE Local Painting`.
- Descriptions (each under 90 characters): `Planning an interior refresh? Call to discuss your project and a free estimate.` / `Tell a local painting team what you need. No account needed. No obligation to hire.`
- Destination after separate public approval: isolated call landing, not the private contractor dashboard.
- URL parameters: `utm_source=google&utm_campaign=buzzie_interior_charleston`.
- Presence-based local targeting and staffed call hours must be confirmed in the actual account. No claim that these settings are already configured.

Meta creative draft (not created):

- Primary text: `Ready to refresh your space? Start with a conversation about your interior painting project. Buzzie connects Charleston-area homeowners with a local painting team to discuss a free estimate. No obligation to hire.`
- Headline: `A Fresh Start For Your Home`.
- Description: `Discuss a free painting estimate.`
- Call to action: `Call Now` where supported and verified in the account; otherwise the call landing. Number: +1 843-475-9927.
- Creative: use real, permission-cleared R Painters work photos; do not substitute fictional before/after work.
- Windsor confirms a connected Meta account, but native call-ad setup, page identity, geo IDs and review eligibility remain unverified. No advanced creative payload is assumed valid.

## Reviewable investment proposal — not authorization

Suggested initial test ceiling: $150 over 10 days, one acquisition channel. The platform's total/lifetime cap and end date must be configured and verified before enabling. If Google Search cannot support this test or local costs exceed the budget, reassess rather than promise a call volume. User approval of amount, channel and public destination is still required. Do not treat a suggested daily average as a guaranteed billing cap.

## Routing and measurement

- All call links use `tel:+18434759927`, the existing R Painters number. No new paid tracking number.
- The dialer can be opened without signing in or running JavaScript.
- The optional online route uses the existing estimate flow; allowlisted source/campaign parameters survive navigation.
- A phone tap is not a connected call. This page does not manufacture a call conversion or send an analytics event to an unverified destination.
- Record actual answered calls, service area, project scope, qualified prospects, estimates scheduled, estimates attended, jobs won, revenue and gross margin in the contractor workflow/CRM. Separate spam, duplicates and missed calls.
- Cost per qualified call = actual ad spend / qualified calls. Cost per acquired job = actual ad spend / won jobs. Only calculate when denominators are nonzero.
- Test a real authorized call and online request after publication; verify phone reception and the contractor inbox. A DOM test cannot prove either.

## Publication boundary

The existing BUZZIE Site is owner-private. Its `call.html` path is a review link, not a usable public ad destination. Before any ad launches, authorize an isolated public landing containing the call assets and privacy information. Do not expose the private Site's other routes or change its audience. If the online form is included on another origin, validate API CORS and end-to-end receipt first. Alternatively launch phone-only and omit the online route until that is verified.

## Remaining owner inputs

1. Confirm 843-475-9927 is the desired inbound number and hours someone can answer.
2. Approve or change the $150 total test ceiling and acquisition channel.
3. Authorize the isolated public landing; the contractor workspace stays private.
4. Provide permission-cleared completed-project photos for image advertising if Meta is chosen.
