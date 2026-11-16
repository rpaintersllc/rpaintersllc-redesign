# BUZZIE exclusive R Painters estimate intake — November 16, 2026

Implemented on a separate branch stacked on PR #30. The homeowner intake now uses two steps: ZIP + service, then scope/location/timing/contact and explicit contact consent. Optional photos and budget are collapsed; photos can also be added through the existing private workspace after submission. Account creation is no longer promoted ahead of intake. Existing idempotency keys, Turnstile checks, contact preferences, exclusive provider slug, private receipt and session ownership checks are preserved.

Contractor navigation now targets homeowner estimate requests first. Public-source research follows underneath and is explicitly labelled as separate. Existing project statuses, private qualification, notes, conversations, estimates and pause/resume controls are retained. No public R Painters website, backend function, schema, payments, audience or CRM automatic-sync settings changed.

## Verified

- 550 mocked Node/DOM tests pass with Node 24; static browser module checks pass. These are simulated, not real homeowner traffic.
- Local Chromium synthetic journey in a 390px iframe: ZIP + project type -> contact/scope -> receipt. One simulated create, zero uploads when skipped; document/scroll widths 375px (no horizontal overflow). Not a physical phone test.
- Read-only live database check: platform_businesses contains one row: R Painters LLC, r-painters-llc, active=true, accepting_requests=true, SC ZIP prefix 294, 18 configured service areas.
- Existing hosting audience inspected as owner-only (custom allowlist containing owner, no other viewers).
- Private publication succeeded: appgdep_6afb4f25b45c8191a06b110286155a22. Hosting source fd216606e4d38c12019b0af5abdca0b2ce08e04b. Saved version appgprj_6ad381533a388191952df8df6da8f1e4~appgver_abde763dfb2081918cacd57931cc3343.

Review: https://r-painters-projects.jessicuriel27.chatgpt.site/request.html and /pro.html. The hosting gate remains private. Requester consent and current business membership remain required.

## Limits / follow-up

No real homeowner request was created, no email delivery or fresh CRM receipt was exercised in this session. Existing notification and CRM implementations are not newly certified by these UI tests. Traffic acquisition, a real authorized end-to-end acceptance test and a deliberate public-launch decision remain pending. No paid advertising was activated. The Cloudflare pages.dev migration remains blocked separately and was not substituted for this private deployment.

## Rollback

Restore previous hosting source 677e37e4b1ddd5aa1b74c94af0283919ef01ac9c / prior saved version using Sites. Only four production static files changed: index.html, pro.html, request.html, request.js. No database rollback is required.
