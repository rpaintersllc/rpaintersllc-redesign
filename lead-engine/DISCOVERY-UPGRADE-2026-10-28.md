# Discovery upgrade — October 28, 2026

## Live source changes

Inspected runtime discovery_sources and latest scan records before changes.
Three Google Alerts homeowner feeds already existed; the older README's
no-homeowner-feed statement is superseded by this live inspection.

Created and connected two additional Google Alerts RSS searches using the
authorized owner account, with As-it-happens delivery and All results:
- Charleston metro painting/drywall request language, covering Mount Pleasant,
  Goose Creek, Ladson, Hanahan, James Island and Johns Island.
- Spanish painting/drywall request language around Charleston, Summerville and
  Goose Creek; Google language set to Spanish.

Five enabled homeowner feeds plus Charleston civic bids now fill the existing
six-source runtime limit. Feed URLs remain in protected database configuration,
not this report. Existing alerts and sources were preserved. The scheduled
scanner remains every 15 minutes; Google publication latency is separate.

## Published behavior

The private dashboard now offers search, source/review/age filters, and priority,
newest or oldest ordering. Priority favors pending homeowner candidates or new
direct requests; it is not verification or a probability score. Feed timestamps
are explicitly distinguished from verified original post dates.

Direct customer cards have bounded US telephone/SMS and email links. These open
the user's chosen application; nothing is sent automatically. Opportunity cards
retain original-source review and gain a deliberate Copy reply draft action.
Evidence renders with its actual card after filtering/sorting, preventing index
mismatches. Source errors are highlighted. Candidates appear above source setup,
which is now collapsed by default. Approved forest/pearl colors are preserved.

The discovery classifier now recognizes selected Spanish request/service terms,
including accent normalization, while retaining locality, freshness, ad/hiring,
closed-work and duplicate checks. These are heuristics, not identity verification.
No social group scraping, hidden contact extraction or outreach was introduced.

## Verification and release

50 mocked Node tests pass, including five pure filter/contact cases, a dashboard
filter/evidence-binding case and bilingual qualification cases. Seven existing
Python reference tests pass. Module syntax and diff whitespace checks passed.
No message, call, SMS, proposal or bid was sent to a prospect.

The source-backed owner-private Site deployment succeeded from final hosted
commit 7c9ae1a753bca2bc9a0fa1965dc067648f8c0b74.
Earlier same-run commit bc447526200d74a07d3f7b8040faf39185e2944c published the initial
filters; the final commit moves candidates ahead of source setup.
Audience was unchanged.

discover-opportunities v9 is ACTIVE. Source read-back exactly matches the tested
three-file deployment, with only core.ts changed from the inspected v8 baseline.
Gateway JWT verification and internal worker authorization remain enabled.

A genuine internal scan (net request 1088) returned HTTP 200:
- All six configured sources completed with status ok.
- Charleston returned seven notices, all rejected as unrelated services.
- All five homeowner feeds returned zero entries.
- Zero new opportunities were saved and zero opportunity alerts dispatched.
The earlier Charleston error did not recur in this run; no permanent reliability
fix is claimed. No real homeowner lead or guaranteed conversion is claimed.

A local isolated browser fixture used two conspicuously labelled DEMO records,
a synthetic session and blocked external networking. Cloud-browser checks
confirmed city search changes 2/2 to 1/2, commercial filtering retains the correct
card/evidence, homeowner priority and results-before-setup layout. Fixture data
never entered Supabase or hosted Site assets. This is not a genuine authenticated
dashboard acceptance, physical mobile test, or real copy/contact action.

## Limits and next work

Google Alerts may miss or delay public posts; new feed publication does not prove
an original request is new. Review each original publication. The private pilot
still needs launch gates before homeowner promotion. Native account CAPTCHA and
branded SMTP/external homeowner email remain separate unfinished work.
No paid acquisition, service purchase, billing activation or public opening.
