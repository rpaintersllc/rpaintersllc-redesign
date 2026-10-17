# Discovery worker

This is the discovery component, separate from the website intake form. It retrieves
configured public sources, qualifies potential requests, deduplicates canonical
original URLs and optionally saves candidates to the private Supabase dashboard.
It does not contact prospects or turn a public post into an exclusive lead.

## What is operationally verified

On October 17, 2026, the worker retrieved the live Charleston open-bid listing,
parsed eight notices and found zero painting-service matches. The source's
robots.txt permits this listing path. Zero matches is a valid result, not a reason
to invent leads. The homeowner adapter is tested with synthetic RSS/Atom fixtures;
no homeowner feed is connected yet. This worker is not deployed or scheduled yet.

## Run without credentials

Python 3.11 or later; no paid dependencies or packages:

```sh
python lead-engine/discovery/scanner.py --output /tmp/discovery-report.json
python -m unittest discover -s lead-engine/tests -p 'test_*.py'
```

The output contains source checks, rejection reasons and candidates. It must stay
private when real prospect information is present. No credentials or private
feed URLs are printed. A source error exits nonzero and stays visible in the report.

## Connect actual homeowner request sources

Create Google Alerts in the owner's account and choose RSS delivery, if available.
Use separate tightly scoped alerts, for example:

```
("looking for a painter" OR "need a painter" OR "painter recommendation") ("Summerville" OR "Charleston")
("need drywall repair" OR "looking for drywall") ("Summerville" OR "Charleston")
("cabinet painting" OR "cabinet refinishing") ("looking for" OR "recommend") ("Charleston" OR "Summerville")
```

Put feed URLs in `DISCOVERY_FEED_URLS` as a JSON array through the runner's private
environment. Do not commit feed identifiers. The default source allowlist accepts
only google.com and www.google.com feeds plus Charleston's public listing. Other
sources require an explicit reviewed host/config change.

Google Alerts is a coverage-limited discovery input: it may miss posts, index them
late, or timestamp an old post when newly indexed. The software labels the feed
time separately and requires original-post review. It does not promise alerts
within a particular number of minutes. Facebook and Nextdoor account content is
not connected or monitored by this worker.

## Connect dashboard storage and unattended operation

1. Apply `005-discovery.sql` to the isolated project and deploy the updated
   `admin-leads` function and web files. These changes are prepared, not live.
2. Configure `SUPABASE_URL` and server-side authorization through the chosen trusted
   runner's normal secrets settings, then add `--save`. Do not copy a browser key
   or place server authorization in client code. No credentials were extracted or
   transferred into a new runner during implementation.
3. Run one scan, verify the source health and any candidate in the dashboard,
   then schedule the same command at the chosen interval. The prepared GitHub
   workflow is manual-only until activation; no schedule is claimed active.
4. Connect and test discovery-specific email notifications before claiming that
   new opportunities produce alerts. Existing website-request email notifications
   do not apply to discoveries automatically.

The runner uses unique original URLs and ignores existing rows so subsequent
scans preserve the owner's Relevant/Dismissed decisions. Its timestamp checks
reject unzoned, future and older-than-24-hour homeowner feed entries. Generic
contractor ads, crew hiring, filled requests, unrelated services and nonlocal
requests are filtered. Classification is heuristic; each remaining result is a
candidate requiring review. No phone numbers or emails are inferred or revealed
from lead sellers. A single listing can contain misleading language; human review
is necessary before outreach.

## Scope intentionally pending

No live homeowner-source validation, unattended runner, discovery email alerts,
authenticated dashboard E2E test or verified real homeowner lead has been completed.
Do not describe the new component as a deployed lead generator until those gates
pass. The existing production website remains unchanged.
