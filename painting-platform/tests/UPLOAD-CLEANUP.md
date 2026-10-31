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

Deployed October 22 to isolated project `ocmgrgvzhuhyigaddhue` as ACTIVE
**platform-api version 8**. Version 7 was first compared byte-for-byte with the
preceding API source at `bcad3e3ddc45bf060b65b2013c617522aa04f3f4`.
An immediate pre-deploy source/version check and PR-head check detected no
intervening change. Version 8 was read back and matched the tested API source
at `d4a895d5a723e6fa9539f36ae1fa11816c5ddd9d` byte-for-byte. The runtime bundle
fingerprint returned by Supabase is
`e18025400de846e1f747f938c871f448a79222ad07320148bd3135e292b3ed24`.

Existing `verify_jwt=false` is preserved; the handler continues its own capability,
confirmed-user and contractor-membership checks. No credentials/settings, grants,
schema, migration or other function changed. The existing Site's source and
audience were not changed and no Site version was published.

The fresh checkout verifier linked 12 browser modules and passed 227 mocked tests.
`git diff --check` passed. The following live paths passed before AND after the
Edge publication, using only the approved Site origin and no credential:

| Smoke request | Expected / observed |
| --- | --- |
| GET providers from approved origin | 200; only r-painters-llc; existing intake challenge remains disabled |
| GET providers from example.invalid origin | 403 before database access |
| POST upload with no project ID and no body | 401 before project lookup/reservation/Storage |
| OPTIONS from approved origin | 204 |

No successful upload action, mutation RPC, Auth API write or notification worker
was invoked. No real object was uploaded/deleted. These are read/early-rejection
smoke checks, not evidence of genuine Storage failure recovery.

If a runtime regression requires rollback, the prior single-file API source is
preserved in GitHub at the baseline commit above; preserve the same JWT setting
and isolated project. No rollback was needed or performed during this release.

Mocks establish orchestration and response wording, not genuine timeout timing,
image decoding, Storage deletion, eventual consistency, orphan reconciliation,
signed URL expiry or concurrent live uploads. Genuine provider failure/recovery
verification remains a separate authorized exercise. No new background cleanup
worker, bucket-wide deletion or customer-photo sweep is introduced.
