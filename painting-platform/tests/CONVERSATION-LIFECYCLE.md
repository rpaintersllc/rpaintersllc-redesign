# Conversation panel lifecycle — October 23, 2026

## Implemented behavior

`conversation.js` checks that its target is connected and still contains that
mount's status node before starting reads/writes and accepting their responses.
The same check runs after asynchronous bearer acquisition and in caller continuations,
error feedback and cleanup. A replaced panel cannot reload, update its retired
private nodes or invoke its visit-success callback. Visit handlers also require
their originating form/button to remain in the current visit list after refresh.

The panel is considered active by DOM ownership, including when a contractor
merely hides and reopens a still-mounted panel. No global registry/listener or
new backend authorization rule is required.

## Verification

Run `npm ci --prefix painting-platform`, then
`npm run verify --prefix painting-platform` with Node 24. Result: 12 browser
modules linked and 351 mocked Node/DOM tests pass.

The 15 new cases in `conversation-lifecycle.test.mjs` cover:

- Detached and remounted-target retained message/read/visit-request handlers.
- Detached and replaced retained visit-decision buttons.
- Late read success/error after replacement, including unchanged retired nodes.
- Late message, visit-request and visit-update success/error after replacement:
  no reload, retired feedback or old callback.
- Detachment during contractor bearer acquisition: no message dispatch.
- Old visit forms and decision buttons replaced by a fresh list read.

All 15 fail with only conversation.js replaced by the preceding bd59b24 module;
all pass with the correction. Existing session, normal renewal, capability,
contractor, retry/concurrency and saved-write/failed-refresh cases also pass.
Every response, project, token, message and visit is synthetic; no live endpoint
or person was contacted. No new browser/device check was performed.

## Publication and limits

Saved in GitHub only. The latest saved Site version 40 contains the earlier
session correction, not this lifecycle change. Its publishing authorization
failure was already reported. Do not deploy version 40 and claim this fix is live:
reconcile pending GitHub web changes into Site source before a new package.

Checks occur at action/response boundaries. No MutationObserver was added to
permanently retire a detached panel if it is later reattached unchanged; this
scenario is not claimed. Already-dispatched requests and callbacks already
started may still complete. Global idle/cross-tab logout, full authenticated
browser/JWT isolation, genuine delivery, abuse enforcement and physical-device/
screen-reader verification remain separate gates. No migration, runtime, Auth,
contractor or audience change was made.

Next: reconcile and publish pending tested changes after authorization recovery;
repeat request keyboard and full authenticated journeys when browser access permits.
