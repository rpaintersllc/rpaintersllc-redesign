# Development deployment status — October 16, 2026

Private preview: https://rpainters-lead-engine.jessicuriel27.chatgpt.site
Admin panel: https://rpainters-lead-engine.jessicuriel27.chatgpt.site/admin

- Schema, protected intake, owner login, dashboard reads and persisted status change verified previously with a clearly labeled fictional test request.
- Managed Turnstile is restricted to preview hostname. Secrets remain server-only.
- Notification migration 003 applied. New leads now enqueue an alert atomically; older leads were not backfilled.
- All 17 handler tests pass. Rollback-only database integration test passed: enqueue, exclusive claims, stale-worker rejection, retry, accepted status and access restrictions.
- notify-leads deployed. submit-lead background wake and admin-leads notification status query deployed.
- Private English dashboard updated with queue status and Retry next pending alert button.
- RESEND_API_KEY and sender are NOT configured. LEAD_NOTIFICATIONS_ENABLED remains unset/disabled. No email has been sent or delivered by this integration.
- notify-leads still has the legacy gateway enabled; its source configuration and custom authorization are prepared for owner confirmation when activating client retries.
- Resend signup page opened for the owner. Signup accepts provider terms and must be completed by the owner.
- Pending retries run on later submissions or an explicit owner action. A standalone recurring retry schedule is not configured and is a production release gate.
- Remaining: email-provider account, scoped server-only API key, sender setup, live delivery verification, protected periodic retries, mobile form test and explicit release to customer traffic.

Production website and main branch remain unchanged. Never count MVP TEST - Not a customer as a real lead.
