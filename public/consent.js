/* Cookie consent for the public pages (enquiry.html, calculator.html).
 * Opt-in: nothing but the strictly necessary "wc_consent" cookie (which stores your choice) is set until you accept analytics.
 * "Accept analytics" sets wc_vid (random visitor ID, 13 months) and records page views on our server: page, referring site,
 * campaign tags, phone/desktop. No IP address, no ads, nothing sold or shared. Global Privacy Control is treated as "reject".
 * Must match VISITOR_CONSENT_VERSION in scraper/acquisition/visitors.js. */
(function () {
  var VERSION = 'c1', API = '/api/acq', CK = 'wc_consent', VID = 'wc_vid';
  var secure = location.protocol === 'https:' ? '; Secure' : '';
  function getCookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function setCookie(n, v, days) { document.cookie = n + '=' + encodeURIComponent(v) + '; Max-Age=' + days * 86400 + '; Path=/; SameSite=Lax' + secure; }
  function delCookie(n) { document.cookie = n + '=; Max-Age=0; Path=/; SameSite=Lax' + secure; }
  function saved() { try { var o = JSON.parse(getCookie(CK)); return o && o.v === VERSION ? o : null; } catch (e) { return null; } }
  var gpc = navigator.globalPrivacyControl === true;
  var state = saved();
  var box;

  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'failed'); return d; }); });
  }

  function track() {
    var vid = getCookie(VID);
    if (!state || !state.a || !vid) return;
    var q = new URLSearchParams(location.search);
    post('/visitor/event', {
      visitor_id: vid, path: location.pathname, referrer: document.referrer, language: (navigator.language || '').slice(0, 12),
      utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '',
    }).catch(function () {});
  }

  /** Records the choice server-side first; analytics is only switched on once the server confirms it holds the proof. */
  function decide(analytics) {
    return post('/visitor/consent', { version: VERSION, analytics: analytics, gpc: gpc, visitor_id: getCookie(VID) || undefined })
      .then(function (d) {
        var on = analytics && !gpc && !!d.visitor_id;
        state = { v: VERSION, a: on };
        setCookie(CK, JSON.stringify(state), 180);
        if (on) setCookie(VID, d.visitor_id, 395); else delCookie(VID);
        hide();
        if (on) track();
      }, function (e) {
        if (analytics) throw e; // never enable tracking without a recorded choice
        state = { v: VERSION, a: false }; setCookie(CK, JSON.stringify(state), 180); delCookie(VID); hide(); // rejecting always works offline
      });
  }

  function hide() { if (box) { box.remove(); box = null; } }

  function open() {
    hide();
    box = document.createElement('div');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-labelledby', 'wc-title'); box.setAttribute('aria-modal', 'false');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;max-width:560px;margin:0 auto;z-index:9999;background:#fff;color:#1b1b22;border:1px solid #d9d9e3;border-radius:12px;padding:16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.2);max-height:80vh;overflow:auto';
    box.innerHTML =
      '<strong id="wc-title">Cookies and analytics</strong>' +
      '<p style="margin:6px 0">We use one necessary cookie to remember this choice. With your permission we also set an analytics cookie with a random visitor ID and record which pages you view, the site or campaign that sent you, and whether you use a phone or computer. We do not record your IP address, show ads, or sell or share this data. If you later send us an enquiry, it can be linked to those visits so we know which page brought you here. You can change your mind at any time with “Cookie settings”.</p>' +
      (gpc ? '<p style="margin:6px 0"><em>Your browser sends Global Privacy Control, so analytics stay off.</em></p>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<button type="button" data-a="0">Reject analytics</button>' +
      '<button type="button" data-a="1"' + (gpc ? ' disabled' : '') + '>Accept analytics</button></div>' +
      '<p role="status" id="wc-err" style="margin:8px 0 0;color:#b00020"></p>';
    box.querySelectorAll('button').forEach(function (b) {
      // Equal prominence for both choices
      b.style.cssText = 'font:inherit;padding:9px 14px;border-radius:8px;border:1px solid #3b3bd6;background:#3b3bd6;color:#fff;cursor:pointer';
      b.addEventListener('click', function () {
        decide(b.getAttribute('data-a') === '1').catch(function () { box.querySelector('#wc-err').textContent = 'Could not save your choice. Please try again.'; });
      });
    });
    document.body.appendChild(box);
    box.querySelector('button').focus();
  }

  function footer() {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Cookie settings';
    b.style.cssText = 'position:fixed;left:12px;bottom:4px;font:12px system-ui,sans-serif;background:none;border:0;color:inherit;opacity:.7;text-decoration:underline;cursor:pointer;padding:4px';
    b.addEventListener('click', open);
    document.body.appendChild(b);
  }

  function start() {
    footer();
    if (gpc && (!state || state.a)) { decide(false).catch(function () {}); return; } // honour the browser signal without asking
    if (!state) open(); else track();
  }

  window.WCConsent = { open: open, analytics: function () { return !!(state && state.a); }, visitorId: function () { return state && state.a ? getCookie(VID) : null; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
