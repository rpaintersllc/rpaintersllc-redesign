const CONFIG = {
  notificationEmail: 'rpaintersinsc@gmail.com',
  websiteUrl: 'https://rpaintersllc.com',
  maxPhotoBytes: 5 * 1024 * 1024,
  maxPhotos: 3,
  allowedPhotoTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
  allowedProjectTypes: ['Residential', 'Commercial', 'Rental / property management'],
  allowedServices: ['Interior painting', 'Exterior painting', 'Cabinet painting or refinishing', 'Drywall repair', 'Commercial painting', 'Rental turnover painting', 'Deck or fence staining', 'Accent wall or specialty work', 'Other']
};

function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const multi = e && e.parameters ? e.parameters : {};
    // The public form clears _honey before a legitimate browser submission.
    // Direct spam posts that populate it are rejected.
    if (clean(p._honey)) return responsePage(false, 'Submission rejected.');

    const services = (multi.service_type || []).map(clean).filter(Boolean);
    const preferredTimes = (multi.preferred_time || []).map(clean).filter(Boolean);
    const required = ['first_name','last_name','email','phone','address','city','state','postal_code','project_type','project_size','project_condition','colors_selected','project_timeline','project_details','referral_source','preferred_date','contact_method','contact_consent','terms_accepted'];
    const missing = required.filter(name => !clean(p[name]));
    if (missing.length || !services.length || !preferredTimes.length || clean(p.project_details).length < 10) {
      return responsePage(false, 'Please complete all required fields and try again.');
    }
    if (!CONFIG.allowedProjectTypes.includes(clean(p.project_type))) return responsePage(false, 'Please select a valid project type.');
    if (services.some(service => !CONFIG.allowedServices.includes(service))) return responsePage(false, 'Please select a valid service.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(p.email))) return responsePage(false, 'Please enter a valid email address.');
    if (!/^[0-9()+.\-\s]{10,20}$/.test(clean(p.phone))) return responsePage(false, 'Please enter a valid phone number.');
    if (!/^\d{5}(-\d{4})?$/.test(clean(p.postal_code))) return responsePage(false, 'Please enter a valid ZIP code.');
    if (clean(p.project_details).length > 2000) return responsePage(false, 'Project details are too long.');

    const conditionalError = validateConditionalDetails(services, p);
    if (conditionalError) return responsePage(false, conditionalError);

    const cache = CacheService.getScriptCache();
    const contactKey = 'rate_' + hash([p.email, p.phone].join('|'));
    const recentCount = Number(cache.get(contactKey) || 0);
    if (recentCount >= 3) return responsePage(false, 'Too many requests were received. Please wait 10 minutes or call 843-475-9927.');
    cache.put(contactKey, String(recentCount + 1), 600);
    const duplicateKey = 'duplicate_' + hash([p.email, p.phone, services.join(','), p.project_details].join('|'));
    if (cache.get(duplicateKey)) return responsePage(false, 'This request was already received. Please wait before submitting again.');
    cache.put(duplicateKey, '1', 300);

    const photoAttachments = parsePhotos(clean(p.photo_manifest));
    const serverSubmittedAt = new Date().toISOString();
    const fields = [
      ['Name', clean(p.first_name) + ' ' + clean(p.last_name)],
      ['Email', clean(p.email)], ['Phone', clean(p.phone)], ['Preferred contact method', clean(p.contact_method)],
      ['Project address', [p.address, p.city, p.state, p.postal_code].map(clean).filter(Boolean).join(', ')],
      ['Project type', clean(p.project_type)], ['Services', services.join(', ')], ['Approximate size', clean(p.project_size)],
      ['Current condition', clean(p.project_condition)], ['Colors selected', clean(p.colors_selected)], ['Desired timeline', clean(p.project_timeline)],
      ['Interior areas', clean(p.interior_areas) || 'Not applicable'], ['Exterior surfaces', clean(p.exterior_surfaces) || 'Not applicable'],
      ['Cabinet count', clean(p.cabinet_count) || 'Not applicable'], ['Cabinet finish', clean(p.cabinet_condition) || 'Not applicable'],
      ['Drywall details', clean(p.drywall_details) || 'Not applicable'], ['Property/business details', clean(p.property_details) || 'Not applicable'],
      ['Deck/fence details', clean(p.deck_fence_details) || 'Not applicable'], ['Specialty/other details', clean(p.specialty_details) || 'Not applicable'],
      ['Project details', clean(p.project_details)], ['Project photos', photoAttachments.length ? photoAttachments.map(blob => blob.getName()).join('\n') + ' (attached)' : 'None'],
      ['Referral source', clean(p.referral_source)], ['Preferred date', clean(p.preferred_date)], ['Alternate date', clean(p.alternate_date) || 'None'],
      ['Preferred time', preferredTimes.join(', ')], ['SMS consent', clean(p.sms_consent) || 'No'], ['Contact consent', clean(p.contact_consent)],
      ['Terms accepted', clean(p.terms_accepted)], ['Landing page', clean(p.landing_page)], ['Referrer', clean(p.referrer)],
      ['UTM source', clean(p.utm_source)], ['UTM medium', clean(p.utm_medium)], ['UTM campaign', clean(p.utm_campaign)],
      ['UTM term', clean(p.utm_term)], ['UTM content', clean(p.utm_content)], ['GCLID', clean(p.gclid)],
      ['Customer device time', clean(p.submitted_at)], ['Server submission time', serverSubmittedAt]
    ];
    const subject = ['New Estimate Request', clean(p.first_name) + ' ' + clean(p.last_name), services[0], clean(p.city)].join(' — ');
    const textBody = fields.map(row => row[0] + ': ' + row[1]).join('\n\n');
    const htmlBody = '<h2 style="color:#184D70">New R Painters estimate request</h2><table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:760px">' +
      fields.map(row => '<tr><th align="left" valign="top" style="border-bottom:1px solid #dce5ea;color:#184D70;width:180px">' + escapeHtml(row[0]) + '</th><td style="border-bottom:1px solid #dce5ea;white-space:pre-wrap">' + linkify(row[1]) + '</td></tr>').join('') + '</table>';

    MailApp.sendEmail({ to: CONFIG.notificationEmail, subject: subject, body: textBody, htmlBody: htmlBody, replyTo: clean(p.email), name: 'R Painters Website', attachments: photoAttachments });
    return responsePage(true);
  } catch (error) {
    console.error(error);
    return responsePage(false, 'We could not send your request. Please call 843-475-9927 or use the backup form.');
  }
}

function validateConditionalDetails(services, p) {
  if (services.includes('Interior painting') && !clean(p.interior_areas)) return 'Please describe the interior areas or rooms.';
  if (services.includes('Exterior painting') && !clean(p.exterior_surfaces)) return 'Please describe the exterior surfaces.';
  if (services.includes('Cabinet painting or refinishing') && !clean(p.cabinet_count)) return 'Please enter the approximate cabinet count.';
  if (services.includes('Drywall repair') && !clean(p.drywall_details)) return 'Please describe the drywall repair.';
  if ((services.includes('Commercial painting') || services.includes('Rental turnover painting')) && !clean(p.property_details)) return 'Please provide the property or business details.';
  if (services.includes('Deck or fence staining') && !clean(p.deck_fence_details)) return 'Please describe the deck or fence.';
  if ((services.includes('Accent wall or specialty work') || services.includes('Other')) && !clean(p.specialty_details)) return 'Please describe the specialty or other work.';
  return '';
}

function parsePhotos(manifestText) {
  if (!manifestText) return [];
  let photos;
  try { photos = JSON.parse(manifestText); } catch (error) { throw new Error('Invalid photo data.'); }
  if (!Array.isArray(photos) || photos.length > CONFIG.maxPhotos) throw new Error('Too many photos.');
  if (!photos.length) return [];
  return photos.map(photo => {
    const type = clean(photo.type);
    if (!CONFIG.allowedPhotoTypes.includes(type) || typeof photo.data !== 'string') throw new Error('Unsupported photo.');
    const bytes = Utilities.base64Decode(photo.data);
    if (bytes.length > CONFIG.maxPhotoBytes) throw new Error('Photo too large.');
    const safeName = clean(photo.name || 'project-photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    return Utilities.newBlob(bytes, type, Date.now() + '-' + safeName);
  });
}

function clean(value) { return String(value || '').trim().slice(0, 5000); }
function hash(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(byte => ('0' + (byte & 255).toString(16)).slice(-2)).join(''); }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function linkify(value) { const safe = escapeHtml(value); return /^https:\/\/drive\.google\.com\//.test(String(value || '')) ? '<a href="' + safe + '">' + safe + '</a>' : safe; }

function responsePage(success, message) {
  const destination = success ? CONFIG.websiteUrl + '/thank-you.html?submitted=1' : CONFIG.websiteUrl + '/request-estimate.html?form_error=' + encodeURIComponent(message || 'Please try again.');
  return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>R Painters LLC</title><body style="font-family:Arial,sans-serif;padding:40px;color:#184D70"><p>Redirecting…</p><script>window.top.location.replace(' + JSON.stringify(destination) + ');<\/script></body>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
