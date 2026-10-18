(() => {
  'use strict';
  const id = window.SZATECH_ANALYTICS && window.SZATECH_ANALYTICS.measurementId;
  // Without a verified GA4 stream, this file makes no network request or UI change.
  if (!/^G-[A-Z0-9]{6,}$/.test(id || '')) return;

  const zh = document.documentElement.lang.toLowerCase().startsWith('zh');
  const key = 'szatech-analytics-consent-v1';
  const permittedPages = new Set(['/', '/index.html', '/zh.html', '/zh/', '/zh/index.html',
    '/case-supporting.html', '/case-supporting-zh.html', '/privacy.html', '/privacy-zh.html']);
  if (!permittedPages.has(location.pathname)) return;
  const cases = new Set(['p03', 'p04', 'p05', 'p07', 'p08', 'p09',
    'installation', 'manufacturing', 'repeat']);
  const denied = { analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied' };
  let choice = null;
  try { choice = localStorage.getItem(key); } catch { /* Ask again next visit. */ }
  let active = false;
  let banner;

  function save(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch { /* This visit only. */ }
  }
  function safeReferrer() {
    try {
      const url = new URL(document.referrer);
      return /^https?:$/.test(url.protocol) ? url.origin + '/' : '';
    } catch { return ''; }
  }
  function gtag() { window.dataLayer.push(arguments); }
  function event(name, fields) {
    if (choice !== 'accept' || !active) return;
    gtag('event', name, Object.assign({ send_to: id }, fields));
  }
  function caseView() {
    if (!location.pathname.includes('case-supporting')) return;
    const caseId = location.hash.slice(1);
    if (cases.has(caseId)) event('case_view', { case_id: caseId });
  }
  function start() {
    if (active || choice !== 'accept') return;
    active = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag('consent', 'default', denied);
    gtag('consent', 'update', Object.assign({}, denied, { analytics_storage: 'granted' }));
    gtag('js', new Date());
    const cleanPage = location.origin + location.pathname;
    const config = { send_page_view: false, page_location: cleanPage,
      page_referrer: safeReferrer(), allow_google_signals: false,
      allow_ad_personalization_signals: false, cookie_expires: 60 * 60 * 24 * 90 };
    // Recognize only company-controlled campaign tags; never forward arbitrary URL queries.
    const query = new URLSearchParams(location.search);
    if (query.get('utm_source') === 'outreach' && query.get('utm_medium') === 'email') {
      config.campaign_source = 'outreach';
      config.campaign_medium = 'email';
      config.campaign_name = 'outreach';
    }
    gtag('config', id, config);
    event('page_view', { page_location: cleanPage,
      page_referrer: safeReferrer(), page_title: document.title });
    caseView();
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
  }
  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      for (const domain of ['', location.hostname, '.szatech.com']) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax'
          + (domain ? '; domain=' + domain : '');
      }
    });
  }
  function setChoice(value) {
    save(value);
    banner.hidden = true;
    if (value === 'accept') start();
    else if (active) {
      gtag('consent', 'update', denied);
      clearAnalyticsCookies();
      location.reload(); // Remove the already loaded tag on consent withdrawal.
    }
  }
  function showBanner() { banner.hidden = false; }
  function render() {
    const style = document.createElement('style');
    style.textContent = '#sza-analytics-choice{position:fixed;z-index:9999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:18px;background:#10252f;color:#fff;border:1px solid #9bb6c2;box-shadow:0 8px 28px #0006;border-radius:10px;font:15px/1.5 system-ui,sans-serif}#sza-analytics-choice[hidden]{display:none}#sza-analytics-choice p{margin:0 0 12px}#sza-analytics-choice a{color:#d9f0ff}#sza-analytics-choice button,#sza-privacy-control{margin:4px 8px 0 0;padding:8px 13px;border-radius:6px;cursor:pointer}#sza-privacy-control{background:transparent;color:inherit;border:1px solid currentColor}';
    document.head.appendChild(style);
    banner = document.createElement('aside');
    banner.id = 'sza-analytics-choice';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', zh ? '访问统计选择' : 'Analytics choice');
    const note = document.createElement('p');
    note.textContent = zh
      ? '我们希望使用 Google Analytics 了解访问来源、案例浏览和联系操作。只有你同意后才会加载统计；拒绝不影响询盘。'
      : 'May we use Google Analytics to understand visit sources, case views and contact actions? It loads only if you agree. Your inquiry works either way.';
    banner.appendChild(note);
    const link = document.createElement('a');
    link.href = zh ? 'privacy-zh.html' : 'privacy.html';
    link.textContent = zh ? '隐私说明' : 'Privacy details';
    banner.appendChild(link);
    const actions = document.createElement('div');
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.textContent = zh ? '同意统计' : 'Allow analytics';
    accept.addEventListener('click', () => setChoice('accept'));
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.textContent = zh ? '拒绝统计' : 'Decline analytics';
    reject.addEventListener('click', () => setChoice('reject'));
    actions.append(accept, reject);
    banner.appendChild(actions);
    document.body.appendChild(banner);
    const footer = document.querySelector('footer');
    if (footer) {
      const control = document.createElement('button');
      control.id = 'sza-privacy-control';
      control.type = 'button';
      control.textContent = zh ? '统计设置' : 'Analytics settings';
      control.addEventListener('click', showBanner);
      footer.appendChild(control);
    }
    banner.hidden = choice === 'accept' || choice === 'reject';
    if (choice === 'accept') start();
  }
  document.addEventListener('click', e => {
    const target = e.target.closest('a,button');
    if (!target) return;
    const href = target.getAttribute('href') || '';
    if (href.startsWith('mailto:')) event('contact_action', { method: 'email_link' });
    else if (target.matches('[data-copy-email],#copy-email'))
      event('contact_action', { method: 'copy_email' });
    else if (href === '#contact-email-options')
      event('contact_action', { method: 'contact_section' });
    else if (href === '#case-contact')
      event('contact_action', { method: 'case_contact' });
  });
  document.addEventListener('szatech:inquiry-success', () => {
    event('generate_lead', { form_name: 'website_inquiry' });
  });
  window.addEventListener('hashchange', caseView);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
