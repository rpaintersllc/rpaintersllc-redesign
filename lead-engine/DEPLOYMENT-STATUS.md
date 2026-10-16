# Development deployment status — October 16, 2026

Private preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Admin panel: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin.html

- Supabase schema and atomic intake migration applied to isolated project.
- submit-lead and admin-leads deployed.
- Administrator account created by owner; ADMIN_USER_IDS saved and digest matched to the verified user ID.
- ALLOWED_ORIGINS is restricted to the private preview origin.
- admin-leads legacy gateway verification disabled; the function itself verifies user JWT through Supabase Auth and enforces the administrator UUID allowlist before database access.
- Public submissions remain disabled. Turnstile keys are not configured.
- Notification provider is not configured. No email/SMS delivery is claimed.
- Automated handler tests passed (10); transactional database integration test passed and rolled back all test inserts.
- Live owner login and browser end-to-end testing remain pending: the private preview requires the owner's ChatGPT sign-in, followed by the separate application login.

Production website and main branch have not been modified. Do not switch customer traffic to this preview.
