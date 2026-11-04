# Account photo-upload session boundaries

Reviewed October 23, 2026 against baseline `b5e4895`.

Account-backed workspace photo uploads now require the loaded gallery's account
snapshot to still be current. The batch acquires its own sessionSnapshot before
sending files and uses that fixed bearer token for every photo. The helper may
renew the original token before acquiring this snapshot. A session revision change
before dispatch, after an upload reply or during the final gallery read stops
the operation instead of switching the remaining photos to another account.

On a detected change, the code clears the selection, retires cached private
project/photos/conversation, hides the workspace and asks the homeowner to sign
in and reopen it. Photo guidance says an upload already sent may have completed:
check saved photos and select only missing ones. This does not abort, cancel,
delete or roll back an already-dispatched upload. No full batch is replayed.

Private capability-key links remain independently authorized and retain their
existing behavior across homeowner login changes. Same-account renewal before
snapshot acquisition is covered by a positive test. A later revision change,
including renewal during final gallery refresh, is conservatively treated as
requiring reopening. Tokens are not automatically replaced mid-batch; ordinary
upload failures still use the existing unconfirmed-photo/refresh guidance.

Ten new deferred-response/DOM tests pass. Seven fail against prior project.js:
logout/new-login during the first file, failed old upload after new login, both
token/snapshot acquisition boundaries, a new account using the old gallery, and
changed-session final gallery feedback. Positive controls cover independent
capability access, unchanged-account bearer pinning and renewal before acquiring
the batch snapshot. Full `npm run verify`: **323 mocked tests, 12 modules linked**;
`git diff --check` passes. Existing partial-upload/retry and lookup checks pass.

Only production project.js was published after hosted baseline equality, to the
existing owner-private Site. Source `b00f42812cd22165b2d01ce0f6649b505a55b1fd`;
successful deployment `appgdep_6adb05bf58a88191af8ac54da8e65bed`. Tests remain in
GitHub. No live upload/Auth/Storage/intake/message/email, backend migration/Auth
setting, real contractor or audience change was performed by the tests. No new
browser/device/JWT walkthrough or genuine Storage behavior is established here.

Next: review conversation read/send/visit operations across account-session
changes using synthetic deferred replies, keeping capability access independent.
Idle global logout and cross-tab propagation remain separate concerns. Genuine
delivery, actual abuse enforcement, full authenticated browser isolation and
physical-device/screen-reader checks remain December 1 review gates.
