# Development deployment status — October 16, 2026

Private preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Admin panel: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin

- Supabase schema and atomic intake migration applied to isolated project.
- submit-lead and admin-leads deployed.
- Administrator account created by owner; ADMIN_USER_IDS saved and digest matched to the verified user ID.
- ALLOWED_ORIGINS is restricted to the private preview origin.
- admin-leads verifies user JWT through Supabase Auth and enforces the administrator UUID allowlist before database access; obsolete legacy gateway verification is disabled.
- Owner completed both sign-ins. Live authenticated customer-request and public-opportunity reads succeeded in the browser; both collections are currently empty.
- Entire dashboard and customer form are in English.
- Public submissions remain disabled. Turnstile keys are not configured.
- Notification provider is not configured. No email/SMS delivery is claimed.
- Automated handler tests passed (10); transactional database integration test passed and rolled back all test inserts.
- Real form submission, owner status update, CAPTCHA, notification delivery and mobile end-to-end tests remain release gates.

Production website and main branch have not been modified. Do not switch customer traffic to this preview.
