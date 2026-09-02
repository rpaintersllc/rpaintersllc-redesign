const toggle=document.querySelector('.menu-toggle');
const menu=document.querySelector('.nav-menu');
if(toggle&&menu){toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');}));}
document.querySelectorAll('[data-year]').forEach(node=>{node.textContent=String(new Date().getFullYear());});

/*
 * Lead-intent tracking shared by every page.
 * Event names intentionally distinguish clicks from completed bookings/forms.
 * No names, phone numbers, email addresses, or other personal data are collected.
 */
function trackLeadIntent(eventName, link, leadType) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, {
    lead_type: leadType,
    link_url: link.href,
    link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
    page_location: window.location.href,
    transport_type: 'beacon'
  });
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.href;
  const protocol = link.protocol.toLowerCase();
  const hostname = link.hostname.toLowerCase();

  if (protocol === 'tel:') {
    trackLeadIntent('phone_click', link, 'phone');
  } else if (protocol === 'mailto:') {
    trackLeadIntent('email_click', link, 'email');
  } else if (hostname === 'rpaintersllc.dripjobs.com') {
    trackLeadIntent('estimate_click', link, 'estimate');
  } else if (hostname === 'wa.me' || hostname.endsWith('.whatsapp.com')) {
    trackLeadIntent('whatsapp_click', link, 'whatsapp');
  }
});
