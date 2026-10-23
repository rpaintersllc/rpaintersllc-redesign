# Manual project account-link verification

Reviewed October 23, 2026 against branch baseline `473182b`.

The private workspace's Save project to my account action now has a per-operation
lock and uses sessionSnapshot. It verifies the snapshot before dispatch, uses
that snapshot's bearer token, and checks it again for success/error feedback.
A new login or logout cannot receive an old ownership assertion or old-account
error. Instead the workspace asks the homeowner to check account projects before
retrying. The button becomes available again when the current operation ends.

The existing helper can renew an expired token for this deliberate action and
then obtain a current snapshot. Normal renewal remains supported. This differs
from automatic request-receipt linking, which conservatively defers on any
revision change. No shared helper or server authorization rule changed.

Eight new isolated Node/DOM cases cover:

- Normal current-account linking with the intended bearer token.
- Duplicate handler events while a claim is pending.
- Late success after logout and after another login.
- Late failure after another login.
- Logout during token acquisition and after snapshot acquisition, before dispatch.
- Normal token renewal before deliberate linking.

All eight pass. Six fail against preceding project.js, while normal current and
renewed-session positive controls pass on both. Full `npm run verify` links 12
browser modules and passes **302 mocked tests**; `git diff --check` passes. The
fixture uses synthetic sessions/responses and makes no live Auth/claim call.
No new browser, real cross-account or physical-device proof is claimed.

Only tested production project.js was copied to the existing owner-private Site
after all hosted web files matched the GitHub baseline byte-for-byte. Site source:
`6c806b850fc90f2293758b7cf8d72cba04ea0e9a`; successful deployment:
`appgdep_6adae94568008191883961978c5a1d5d`. Tests remain in GitHub. No Supabase
schema/function/Auth setting, real account/project/photo/message/email,
contractor activation or audience changed.

An already-dispatched claim may still complete server-side after a session
change. This guard changes dispatch and feedback, not server cancellation or
rollback. A capability-link workspace remains authorized by its private key;
logout does not revoke that independent capability. Cross-tab session propagation
and account-backed lookup races are separate concerns, not proven fixed here.

Next: review account-backed project lookup and photo-refresh results across
session changes with deferred synthetic responses. Retain the genuine email,
abuse enforcement, full browser isolation and device/screen-reader launch gates.
