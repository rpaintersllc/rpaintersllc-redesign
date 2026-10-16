# Development deployment status — October 16, 2026

Private preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Admin panel: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin

- Schema, atomic intake RPC and both APIs deployed to isolated Supabase project.
- Owner login, administrator allowlist and both authenticated collection reads verified.
- All UI is English. Production website and main remain unchanged.
- Managed Turnstile widget restricted to preview hostname; secret stored only in Supabase. No pre-clearance.
- Owner saved submit-lead gateway configuration. Public intake API verifies CAPTCHA, fields, consent and atomic database limits. Private preview submissions enabled.
- LIVE TEST PASSED: browser Turnstile approval, sample form submission, confirmed save, dashboard visibility, status change to contacted, and persistence after refresh.
- A clearly labeled sample remains: MVP TEST - Not a customer, using example.invalid and a fictional 555 phone number. Do not count it as a real lead.
- Dashboard checked at 390px width with no horizontal overflow; viewport reset afterward. Full mobile form testing remains pending.
- Ten handler tests and rollback-only database integration test passed previously.
- Notifications remain unconfigured; no email/SMS delivery is claimed. Do not route customer traffic until verified notifications and remaining release checks pass.
