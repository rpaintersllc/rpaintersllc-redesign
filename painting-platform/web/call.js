// Attribution stays with the online request; a phone tap is not a verified call.
const query = new URLSearchParams(location.search);
const target = new URL('request.html', location.href);
for (const key of ['utm_source', 'utm_campaign']) {
  const value = query.get(key);
  if (value) target.searchParams.set(key, value.slice(0, 200));
}
document.getElementById('estimate-link').href = target.href;
