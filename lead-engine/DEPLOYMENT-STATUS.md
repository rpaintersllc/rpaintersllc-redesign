# Development deployment status — October 16, 2026

Private preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Admin panel: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin

- Schema, atomic intake RPC, submit-lead and admin-leads deployed to isolated Supabase project.
- Owner administrator ID configured and verified; live authenticated reads succeeded for both empty collections.
- Dashboard and estimate form use English. Production website and main are unchanged.
- Managed Turnstile widget created, restricted to the private preview hostname, with no pre-clearance. Public site key deployed to the preview; secret stored only in Supabase Edge Function settings.
- Submission enable flag is true for private-preview testing, but submit-lead's legacy JWT gateway is still enabled. An unsaved gateway configuration change is prepared in the dashboard, awaiting owner confirmation.
- Turnstile script and widget container loaded in browser; no success callback observed and the submit button remains disabled. CAPTCHA completion and live end-to-end submission have NOT been verified.
- Notification provider remains unconfigured. No email/SMS delivery is claimed.
- Ten handler tests and rollback-only database integration test passed previously.
- Remaining release gates: CAPTCHA success, live submission and dashboard status change, notification delivery, mobile test and customer-traffic release approval.
