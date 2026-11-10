import importlib.util
from datetime import datetime, timezone
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('scanner', Path(__file__).parents[1]/'discovery/scanner.py')
s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
CLOCK = datetime(2026, 10, 17, 13, tzinfo=timezone.utc)


class DiscoveryTests(unittest.TestCase):
    def item(self, **changes):
        return dict(title='Looking for a painter in Summerville', summary='Need living room painted.',
                    source_url='https://example.org/post/1?utm_source=google',
                    published_at='2026-10-17T12:00:00Z', **changes)

    def test_local_request_keeps_evidence_and_does_not_claim_verification(self):
        row, reason = s.qualify(self.item(), 'homeowner_request', CLOCK)
        self.assertIsNone(reason)
        self.assertEqual(row['source_url'], 'https://example.org/post/1')
        self.assertEqual(row['verification_status'], 'needs_original_review')
        self.assertIn('Feed timestamp', row['match_reasons'][-1])
        self.assertNotIn('email', row)

    def test_rejects_advertisements_employment_and_filled_requests(self):
        for text in ('Looking for painters? We offer painting in Summerville. Free estimates!',
                     'Painters wanted in Charleston. Join our crew.',
                     'Looking for a painter in Charleston. Already hired someone.'):
            item = self.item(); item['title'] = text
            self.assertIsNone(s.qualify(item, 'homeowner_request', CLOCK)[0])

    def test_requires_location_request_and_trustworthy_fresh_timestamp(self):
        for patch in ({'title': 'Looking for a painter in Boston'},
                      {'title': 'Painting in Summerville', 'summary': 'A completed project.'},
                      {'published_at': '2026-10-15T12:00:00Z'},
                      {'published_at': ''}, {'published_at': '2026-10-17T12:00:00'},
                      {'published_at': '2026-10-18T12:00:00Z'}):
            item = self.item(); item.update(patch)
            self.assertIsNone(s.qualify(item, 'homeowner_request', CLOCK)[0], patch)

    def test_civic_row_boundaries_prevent_neighboring_painting_false_matches(self):
        html = '''<div class="listItemsRow bid"><div class="bidTitle"><a href="bids.aspx?bidID=1">Vending</a></div>
        <div class="bidStatus"><span>Open</span><span>10/22/2026 12:30 PM</span></div></div>
        <div class="listItemsRow bid alt"><div class="bidTitle"><a href="bids.aspx?bidID=2">Painting guardrails</a></div>
        <div class="bidStatus"><span>Closed</span><span>10/01/2026 12:30 PM</span></div></div>'''
        parser = s.CivicBids('https://www.charleston-sc.gov/Bids.aspx'); parser.feed(html)
        self.assertEqual(len(parser.items), 2)
        self.assertEqual(s.qualify(parser.items[0], 'commercial_bid', CLOCK)[1], 'unrelated_service')
        self.assertIsNone(s.qualify(parser.items[1], 'commercial_bid', CLOCK)[0])
        self.assertEqual(parser.items[0]['deadline'], '2026-10-22T12:30:00-04:00')

    def test_atom_and_rss_unwrap_urls_and_ignore_update_time_as_publication(self):
        atom = '''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Looking for painter Summerville</title>
        <link href="https://www.google.com/url?url=https%3A%2F%2Fexample.org%2Fpost%2F1"/>
        <content type="html">Need &lt;b&gt;painting&lt;/b&gt;.</content>
        <published>2026-10-17T12:00:00Z</published><updated>2026-10-18T12:00:00Z</updated></entry></feed>'''
        item = s.parse_feed(atom)[0]
        self.assertEqual(item['summary'], 'Need painting .')
        self.assertIsNotNone(s.qualify(item, 'homeowner_request', CLOCK)[0])
        rss = '<rss><channel><item><title>Painter</title><link>https://example.org/a</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>'
        self.assertIsNotNone(s.date_value(s.parse_feed(rss)[0]['published_at']))
        with self.assertRaises(ValueError): s.parse_feed('<!DOCTYPE rss><rss/>')
        with self.assertRaises(ValueError): s.parse_feed('<html/>')

    def test_failed_sources_are_visible_and_duplicates_dont_double_count(self):
        feed = '<rss><channel><item><title>Looking for painter Charleston</title><link>https://example.org/a</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>'
        config = {'allowed_hosts': ['example.org'], 'sources': [dict(id=str(i), name='test',
                  adapter='rss', kind='homeowner_request', enabled=True, url='https://example.org/'+str(i)) for i in range(3)]}
        def fetch(url):
            if url.endswith('/2'): raise RuntimeError('private-feed-token')
            return feed
        result = s.collect(config, fetch, CLOCK)
        self.assertEqual(len(result['opportunities']), 1)
        self.assertEqual([x['status'] for x in result['sources']], ['ok','ok','error'])
        self.assertNotIn('private-feed-token', str(result))

    def test_only_approved_source_hosts_and_https_results(self):
        config = {'allowed_hosts': [], 'sources': [dict(id='x', name='test', adapter='rss',
                  kind='homeowner_request', enabled=True, url='https://example.org/') ]}
        result = s.collect(config, lambda _: self.fail('Must not fetch'), CLOCK)
        self.assertEqual(result['sources'][0]['status'], 'error')
        for url in ('http://example.org/a', 'https://127.0.0.1/a', 'https://user:pass@example.org/a', 'https://localhost/a'):
            with self.assertRaises(ValueError): s.canonical_url(url)


if __name__ == '__main__': unittest.main()
