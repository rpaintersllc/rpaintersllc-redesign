"""Bounded public-source discovery. Python 3.11+, standard library only.

Never follows result links, logs credentials, contacts prospects or fabricates contacts.
Run with --output for a local dry run; --save requires configured Supabase env.
"""
import argparse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import sys
from urllib import error, parse, request, robotparser
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

UTC = timezone.utc
AGENT = 'RPaintersDiscovery/1.0 (+https://rpaintersllc.com)'
LIMIT = 2_000_000
LOCATIONS = ('charleston', 'summerville', 'mount pleasant', 'north charleston',
             'west ashley', 'goose creek', 'ladson', 'hanahan', 'james island',
             'johns island', 'daniel island', 'cane bay', 'isle of palms',
             "sullivan's island", 'folly beach', 'moncks corner', 'kiawah', 'seabrook')
SERVICE = re.compile(r'\b(paint(?:er|ers|ing|ed|s)?|repaint(?:ing|ed)?|drywall|sheetrock|'
                     r'cabinet refinishing|popcorn (?:ceiling|removal)|(?:deck|fence) stain(?:ing)?)\b', re.I)
INTENT = re.compile(r'\b(looking for|need(?:ing)?|seeking|recommend(?:ation|ations)?|'
                    r'can anyone|iso|in search of|request(?:ing)? (?:a )?(?:quote|estimate)|'
                    r'who (?:can|does)|wanted|solicit(?:ing)?)\b', re.I)
ADVERTISEMENT = re.compile(r'\b(we (?:offer|provide|specialize)|our (?:painting|services|company)|'
                            r'call (?:us|today)|free estimates|now hiring|painters? wanted|'
                            r'jobs? available|join our (?:team|crew))\b', re.I)
NEGATIVE = re.compile(r'\b(no longer (?:need|looking)|found (?:a|our) painter|'
                       r'position filled|bid (?:closed|cancelled|canceled)|already hired)\b', re.I)


def now_iso():
    return datetime.now(UTC).isoformat()


class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []; self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip: self.skip -= 1

    def handle_data(self, data):
        if not self.skip: self.parts.append(data)


def plain(value):
    parser = Text(); parser.feed(value or '')
    return ' '.join(' '.join(parser.parts).split())


def canonical_url(value):
    url = parse.urlsplit(unescape(value.strip()))
    # Google Alerts wraps the original URL. Unwrap without visiting the target.
    if url.hostname in ('www.google.com', 'google.com') and url.path == '/url':
        query = parse.parse_qs(url.query)
        return canonical_url((query.get('url') or query.get('q') or [''])[0])
    if url.scheme != 'https' or not url.hostname or url.username or url.password:
        raise ValueError('Invalid HTTPS URL')
    host = url.hostname.lower()
    if url.port not in (None, 443) or host == 'localhost' or '.' not in host:
        raise ValueError('Invalid public URL')
    try:
        if not ipaddress.ip_address(host).is_global: raise ValueError('Private URL')
    except ValueError as exc:
        if str(exc) == 'Private URL': raise
    query = [(k, v) for k, v in parse.parse_qsl(url.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid', 'gclid')]
    return parse.urlunsplit(('https', host, url.path or '/', parse.urlencode(sorted(query)), ''))


def date_value(value):
    if not value: return None
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        try: result = parsedate_to_datetime(value)
        except (TypeError, ValueError, OverflowError): return None
    # A missing zone is not a trustworthy publication time.
    return result.astimezone(UTC) if result.tzinfo else None


def qualify(item, kind, clock=None):
    clock = clock or datetime.now(UTC)
    text = item['title'] + ' ' + item.get('summary', '')
    if re.search(r'\b(?:Charleston[, ]+(?:WV|West Virginia)|Summerville[, ]+(?:GA|Georgia))\b', text, re.I):
        return None, 'outside_service_area'
    if not SERVICE.search(text): return None, 'unrelated_service'
    if NEGATIVE.search(text): return None, 'closed_or_filled'
    if kind == 'homeowner_request' and ADVERTISEMENT.search(text): return None, 'advertisement_or_employment'
    city = next((v.title() for v in LOCATIONS if re.search(r'\b'+re.escape(v)+r'\b', text, re.I)), None)
    if kind == 'homeowner_request' and not city: return None, 'location_unconfirmed'
    if kind == 'homeowner_request' and not INTENT.search(text): return None, 'request_intent_unconfirmed'
    published = date_value(item.get('published_at'))
    deadline = date_value(item.get('deadline'))
    if published and published > clock + timedelta(minutes=5): return None, 'future_timestamp'
    if deadline and deadline <= clock: return None, 'expired'
    if kind == 'homeowner_request':
        if not published: return None, 'publication_time_unconfirmed'
        if published < clock - timedelta(hours=24): return None, 'older_than_24_hours'
    elif item.get('open') is not True:
        return None, 'open_status_unconfirmed'
    try: url = canonical_url(item['source_url'])
    except (ValueError, RecursionError): return None, 'invalid_original_url'
    service = SERVICE.search(text).group(0)
    reasons = [f'Service mentioned: {service}', f'Area: {city or "Charleston public authority"}']
    if kind == 'homeowner_request':
        reasons += ['Request language found', 'Feed timestamp within 24 hours; original post time still requires verification']
    else: reasons += ['Source lists notice as open; verify scope, addenda and qualifications']
    return {
        'title': item['title'][:200], 'source_url': url,
        'summary': item.get('summary', '')[:2000], 'city': city or 'Charleston',
        'opportunity_kind': kind, 'published_at': published.isoformat() if published else None,
        'deadline': deadline.isoformat() if deadline else None,
        'match_reasons': reasons, 'verification_status': 'needs_original_review',
        'suggested_response': ('Hi! I’m Francisco with R Painters LLC. We work in the Charleston area. '
                               'Would a free site visit work for you, or would you prefer to share pictures '
                               'and which walls, ceilings or trim you’d like painted?')
                              if kind == 'homeowner_request' else None,
    }, None


def parse_feed(payload):
    if re.search(r'<!\s*(?:DOCTYPE|ENTITY)', payload, re.I): raise ValueError('DTD not accepted')
    root = ET.fromstring(payload)
    if root.tag.split('}')[-1] not in ('rss', 'feed', 'RDF'): raise ValueError('Not an RSS or Atom feed')
    def value(entry, *names):
        for child in entry:
            if child.tag.split('}')[-1] in names:
                return ''.join(child.itertext()).strip()
        return ''
    items = []
    for entry in root.iter():
        if entry.tag.split('}')[-1] not in ('item', 'entry'): continue
        link = value(entry, 'link')
        for child in entry:
            if child.tag.split('}')[-1] == 'link' and child.attrib.get('rel', 'alternate') == 'alternate':
                link = child.attrib.get('href') or link
        items.append({'title': plain(value(entry, 'title')), 'summary': plain(value(entry, 'description', 'summary', 'content')),
                      'source_url': link, 'published_at': value(entry, 'published', 'pubDate', 'date')})
        if len(items) >= 100: break
    return items


class CivicBids(HTMLParser):
    """Parse the source's bid-row boundaries; never blend unrelated listings."""
    def __init__(self, url):
        super().__init__(); self.url = url; self.depth = 0; self.row = None
        self.items = []; self.anchor = False; self.anchor_text = []; self.href = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            if self.row is None and 'bid' in attrs.get('class', '').split():
                self.row = {'parts': [], 'title': '', 'source_url': ''}; self.depth = 1
            elif self.row is not None: self.depth += 1
        if self.row is not None and tag == 'a' and not self.row['title']:
            self.anchor = True; self.anchor_text = []; self.href = attrs.get('href', '')

    def handle_data(self, data):
        if self.row is not None:
            self.row['parts'].append(data)
            if self.anchor: self.anchor_text.append(data)

    def handle_endtag(self, tag):
        if self.row is None: return
        if tag == 'a' and self.anchor:
            self.row['title'] = ' '.join(' '.join(self.anchor_text).split())
            self.row['source_url'] = parse.urljoin(self.url, self.href); self.anchor = False
        if tag == 'div':
            self.depth -= 1
            if self.depth == 0:
                text = ' '.join(' '.join(self.row.pop('parts')).split())
                self.row['summary'] = text
                self.row['open'] = bool(re.search(r'\bOpen\b', text)) and not bool(re.search(r'\b(?:Closed|Awarded|Cancelled)\b', text, re.I))
                match = re.search(r'\b(\d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2} [AP]M)\b', text)
                if match:
                    self.row['deadline'] = datetime.strptime(match[1], '%m/%d/%Y %I:%M %p').replace(tzinfo=ZoneInfo('America/New_York')).isoformat()
                self.items.append(self.row); self.row = None


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): raise ValueError('Redirect requires source review')


def public_get(url):
    url = canonical_url(url)
    # Network destinations are fixed by the operator's exact-host allowlist in collect().
    # Do not separately resolve DNS: hosted runners may require the configured HTTPS proxy.
    opener = request.build_opener(NoRedirect)
    with opener.open(request.Request(url, headers={'User-Agent': AGENT}), timeout=20) as response:
        data = response.read(LIMIT + 1)
        if len(data) > LIMIT: raise ValueError('Source exceeds size limit')
        return data.decode('utf-8-sig')


def collect(config, fetch=public_get, clock=None):
    rows, scans, seen = [], [], set()
    for source in config['sources'][:20]:
        scan = {'source_id': source['id'], 'source_name': source['name'], 'checked_at': now_iso(),
                'status': 'disabled', 'items_seen': 0, 'matches': 0, 'rejected': {}}
        scans.append(scan)
        if not source.get('enabled'): continue
        try:
            url = canonical_url(source['url'])
            # Only explicitly configured source hosts can be fetched; result links are never fetched.
            if parse.urlsplit(url).hostname not in config['allowed_hosts']: raise ValueError('Host not authorized')
            if source['adapter'] == 'civic_bids':
                robots_url = parse.urlunsplit(('https', parse.urlsplit(url).netloc, '/robots.txt', '', ''))
                rules = robotparser.RobotFileParser(); rules.parse(fetch(robots_url).splitlines())
                if not rules.can_fetch(AGENT, url): raise ValueError('Source disallows automated retrieval')
                parser = CivicBids(url); parser.feed(fetch(url)); items = parser.items
                if not items: raise ValueError('No recognized bid rows; source may have changed')
            elif source['adapter'] == 'rss': items = parse_feed(fetch(url))
            else: raise ValueError('Unsupported source adapter')
            scan['status'] = 'ok'; scan['items_seen'] = len(items)
            for item in items:
                row, reason = qualify(item, source['kind'], clock)
                if not row:
                    scan['rejected'][reason] = scan['rejected'].get(reason, 0) + 1; continue
                if row['source_url'] in seen: continue
                seen.add(row['source_url']); row['source_name'] = source['name']
                row['discovery_source_id'] = source['id']; rows.append(row); scan['matches'] += 1
        except Exception:
            # URLs may contain private feed identifiers; never include exceptions or URLs in logs.
            scan['status'] = 'error'; scan['error'] = 'Source unavailable, blocked or format changed. Review source configuration.'
    return {'checked_at': now_iso(), 'opportunities': rows, 'sources': scans,
            'homeowner_monitoring_configured': any(s.get('enabled') and s['kind'] == 'homeowner_request' for s in config['sources'])}


def save_supabase(result):
    base = os.environ['SUPABASE_URL'].rstrip('/')
    if not re.fullmatch(r'https://[a-z0-9]+\.supabase\.co', base): raise ValueError('Invalid Supabase project URL')
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers = {'apikey': key, 'Authorization': 'Bearer '+key, 'Content-Type': 'application/json',
               'Prefer': 'resolution=ignore-duplicates,return=representation'}
    def send(table, rows):
        if not rows: return []
        req = request.Request(base+'/rest/v1/'+table, method='POST', headers=headers, data=json.dumps(rows).encode())
        with request.urlopen(req, timeout=20) as response: return json.load(response)
    inserted = send('opportunities?on_conflict=source_url', result['opportunities'])
    send('discovery_scans', [{k: v for k, v in scan.items() if k != 'error'} for scan in result['sources']])
    return len(inserted)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', default=str(Path(__file__).with_name('sources.json')))
    parser.add_argument('--output', required=True, help='Private local JSON report; do not commit real prospect data')
    parser.add_argument('--save', action='store_true', help='Save to Supabase using configured server environment')
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    # Private feed URLs are supplied in runner secrets/environment, never repository source.
    for i, url in enumerate(json.loads(os.environ.get('DISCOVERY_FEED_URLS', '[]'))):
        config['sources'].append({'id': f'homeowner-feed-{i+1}', 'name': f'Homeowner request feed {i+1}',
                                  'adapter': 'rss', 'kind': 'homeowner_request', 'url': url, 'enabled': True})
    result = collect(config)
    Path(args.output).write_text(json.dumps(result, indent=2))
    if args.save: result['new_saved'] = save_supabase(result)
    Path(args.output).write_text(json.dumps(result, indent=2))
    print(json.dumps({'sources_checked': len(result['sources']), 'source_errors': sum(s['status']=='error' for s in result['sources']),
                      'matches': len(result['opportunities']), 'saved': result.get('new_saved'),
                      'homeowner_monitoring_configured': result['homeowner_monitoring_configured']}))
    return 1 if any(s['status']=='error' for s in result['sources']) else 0


if __name__ == '__main__':
    try: sys.exit(main())
    except Exception:
        print('Discovery failed. Check source configuration and server credentials; no secrets are logged.', file=sys.stderr)
        sys.exit(1)
