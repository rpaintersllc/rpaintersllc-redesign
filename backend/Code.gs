const CONFIG = {
  notificationEmail: 'rpaintersinsc@gmail.com',
  websiteUrl: 'https://rpaintersllc.com',
  photoFolderName: 'R Painters Website Estimate Photos',
  maxPhotoBytes: 5 * 1024 * 1024,
  allowedPhotoTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
};

function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    if (p.company_website) return responsePage(false, 'Submission rejected.');

    const required = ['first_name','last_name','email','phone','address','city','state','postal_code','project_type','service_type','project_details','referral_source','preferred_date','terms_accepted'];
    const missing = required.filter(name => !String(p[name] || '').trim());
    if (missing.length || String(p.project_details || '').trim().length < 10) {
      return responsePage(false, 'Please complete all required fields and try again.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email))) return responsePage(false, 'Please enter a valid email address.');
    if (!/^[0-9()+.\-\s]{10,20}$/.test(String(p.phone))) return responsePage(false, 'Please enter a valid phone number.');
    if (!/^\d{5}(-\d{4})?$/.test(String(p.postal_code))) return responsePage(false, 'Please enter a valid ZIP code.');

    const digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      [p.email, p.phone, p.project_details].join('|'),
      Utilities.Charset.UTF_8
    ).map(byte => ('0' + (byte & 255).toString(16)).slice(-2)).join('');
    const cache = CacheService.getScriptCache();
    if (cache.get(digest)) return responsePage(false, 'This request was already received. Please wait before submitting again.');
    cache.put(digest, '1', 300);

    let photoUrl = '';
    if (p.photo_data) {
      const bytes = Utilities.base64Decode(String(p.photo_data));
      const type = String(p.photo_type || '');
      if (!CONFIG.allowedPhotoTypes.includes(type) || bytes.length > CONFIG.maxPhotoBytes) {
        return responsePage(false, 'The project photo must be a supported image no larger than 5 MB.');
      }
      const folder = getOrCreateFolder(CONFIG.photoFolderName);
      const safeName = String(p.photo_name || 'project-photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const blob = Utilities.newBlob(bytes, type, Date.now() + '-' + safeName);
      photoUrl = folder.createFile(blob).getUrl();
    }

    const preferredTimes = e.parameters && e.parameters.preferred_time ? e.parameters.preferred_time.join(', ') : '';
    const fields = [
      ['Name', p.first_name + ' ' + p.last_name],
      ['Email', p.email], ['Phone', p.phone],
      ['Project address', [p.address, p.city, p.state, p.postal_code].filter(Boolean).join(', ')],
      ['Project type', p.project_type], ['Service', p.service_type],
      ['Project details', p.project_details], ['Project photo', photoUrl || 'None'],
      ['Referral source', p.referral_source], ['Preferred date', p.preferred_date],
      ['Alternate date', p.alternate_date || 'None'], ['Preferred time', preferredTimes],
      ['SMS consent', p.sms_consent || 'No'], ['Terms accepted', p.terms_accepted],
      ['Landing page', p.landing_page || ''], ['Referrer', p.referrer || ''],
      ['UTM source', p.utm_source || ''], ['UTM medium', p.utm_medium || ''],
      ['UTM campaign', p.utm_campaign || ''], ['UTM term', p.utm_term || ''],
      ['UTM content', p.utm_content || ''], ['GCLID', p.gclid || ''],
      ['Submitted at', p.submitted_at || new Date().toISOString()]
    ];
    const subject = ['New Estimate Request', p.first_name + ' ' + p.last_name, p.service_type, p.city].join(' — ');
    const textBody = fields.map(row => row[0] + ': ' + row[1]).join('\n\n');
    const htmlBody = '<h2 style="color:#184D70">New R Painters estimate request</h2><table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:760px">' +
      fields.map(row => '<tr><th align="left" valign="top" style="border-bottom:1px solid #dce5ea;color:#184D70;width:170px">' + escapeHtml(row[0]) + '</th><td style="border-bottom:1px solid #dce5ea;white-space:pre-wrap">' + escapeHtml(String(row[1] || '')) + '</td></tr>').join('') +
      '</table>';

    MailApp.sendEmail({ to: CONFIG.notificationEmail, subject, body: textBody, htmlBody, replyTo: String(p.email) });
    return responsePage(true);
  } catch (error) {
    console.error(error);
    return responsePage(false, 'We could not send your request. Please call 843-475-9927 or use the backup form.');
  }
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function responsePage(success, message) {
  const destination = success
    ? CONFIG.websiteUrl + '/thank-you.html?submitted=1'
    : CONFIG.websiteUrl + '/request-estimate.html?form_error=' + encodeURIComponent(message || 'Please try again.');
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>R Painters LLC</title>' +
    '<body style="font-family:Arial,sans-serif;padding:40px;color:#184D70"><p>Redirecting…</p>' +
    '<script>window.top.location.replace(' + JSON.stringify(destination) + ');<\/script></body>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}