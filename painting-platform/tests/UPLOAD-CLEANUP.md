# Upload failure cleanup evidence

Reviewed October 22, 2026. `upload-cleanup.test.mjs` exercises the actual
`makePlatformHandler` with an injected synthetic fetch implementation. It makes
no real Auth, PostgREST, Storage or notification request. Tiny JPEG-header bytes
are only test input; no real image is uploaded or deleted.

## Confirmed source defect and fix

The previous catch block put the failed-state metadata PATCH and reserved-object
DELETE in one try block. A rejected or lost metadata response threw before the
DELETE call. The fix gives each operation its own bounded best-effort try block,
keeping the existing 12-second database and eight-second object-delete timeouts.
Both operations target only the server-returned reserved ID/path. Upload remains
non-upserting and no automatic upload retry was added.

The error response now accurately treats the outcome as unconfirmed and directs
refresh/retry only for missing photos. Neither a failed upload response nor failed
metadata writes prove that Storage contains no object. A failed cleanup remains
a 502, never a success; this fix cannot guarantee deletion while Storage is down.

| Synthetic path | Expected result |
| --- | --- |
| Upload and ready PATCH succeed | 201; ready reservation/object retained; no cleanup |
| Upload returns failure or throws after modeled partial storage | 502; failed-state PATCH and exact-object DELETE attempted once; no upload replay |
| Upload succeeds but ready PATCH fails | 502; cleanup attempted for that reservation |
| Failed-state PATCH returns an HTTP error or throws | DELETE still attempted; pending metadata may remain; no success claim |
| DELETE fails or throws while metadata also fails | 502 with unconfirmed guidance; modeled leftover remains; no false cleanup guarantee |
| Five-slot reservation limit | 409 before any Storage request |
| Deliberate retry after a failed upload | New reservation succeeds; only first reservation cleaned up; successful replacement retained |

All ten tests pass. In a disposable fixture with the preceding API source,
six pass and four fail specifically because a failed metadata PATCH prevents the
DELETE attempt. The unchanged successful/retry/capacity paths remain positive
controls. The complete verifier links 12 browser modules and passes 227 tests.
`git diff --check` passes. The separate 65-check live rollback SQL suite was not
rerun: this change alters Edge orchestration only, not SQL functions or schema.

Current route reference:
https://supabase.com/docs/reference/self-hosting-storage/delete-an-object
(`DELETE /object/{bucketName}/{*}`). Existing route/auth headers are preserved.
Security/performance advisors and aggregate-only log availability were inspected;
no permissions were relaxed or runtime settings changed. Existing security
findings remain tracked separately in ACCESS-BOUNDARIES.md.

## Deployment status and remaining evidence

**Code/tests/docs only.** No Edge Function or Site deployment occurred for this
change. The live API still uses the preceding error handler. Before publication,
compare deployed source and JWT settings to the branch baseline, preserve the
existing authentication behavior, publish only to `ocmgrgvzhuhyigaddhue`, and
verify harmless read/early-rejection responses. Do not test by submitting a fake
customer request or by uploading/deleting a real customer object.

Mocks establish orchestration and response wording, not genuine timeout timing,
image decoding, Storage deletion, eventual consistency, orphan reconciliation,
signed URL expiry or concurrent live uploads. Genuine provider failure/recovery
verification remains a separate authorized exercise. No new background cleanup
worker, bucket-wide deletion or customer-photo sweep is introduced.
