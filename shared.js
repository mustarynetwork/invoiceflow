/* ═══════════════════════════════════════════════════
   BizFlow — Shared Utilities  v1.1
   Changes:
   - Auth: passwords verified against Sheet-sourced config
   - API: syncAllData() pulls everything from Sheet on login
   - BF.config loaded from Sheet, cached in localStorage
═══════════════════════════════════════════════════ */

/* ── CONFIG ── */
const BF = {
  version: '1.1.0',
  appName: 'BizFlow',
  // Sheet URL stored locally (bootstrapped by super on first setup)
  sheetUrl: localStorage.getItem('bf_sheet_url') || '',
  appUrl:   'https://mustarynetwork.github.io/invoiceflow/',

  // Passwords: loaded from localStorage cache (set by Sheet sync or local default)
  roles: {
    super: localStorage.getItem('bf_pw_super') || 'super123',
    admin: localStorage.getItem('bf_pw_admin') || 'admin123',
  },

  // Current session (tab-scoped)
  session: JSON.parse(sessionStorage.getItem('bf_session') || 'null'),
};

/* ── AUTH ── */
const Auth = {
  login(password) {
    if (password === BF.roles.super) {
      const s = { role: 'super', loginTime: Date.now() };
      sessionStorage.setItem('bf_session', JSON.stringify(s));
      BF.session = s;
      return 'super';
    }
    if (password === BF.roles.admin) {
      const s = { role: 'admin', loginTime: Date.now() };
      sessionStorage.setItem('bf_session', JSON.stringify(s));
      BF.session = s;
      return 'admin';
    }
    return null;
  },
  logout() {
    sessionStorage.removeItem('bf_session');
    BF.session = null;
    window.location.href = 'index.html';
  },
  require(page) {
    if (!BF.session) {
      window.location.href = 'index.html?redirect=' + encodeURIComponent(page);
      return false;
    }
    return true;
  },
  isSuper() { return BF.session && BF.session.role === 'super'; },
};

/* ── API — Google Apps Script ── */
const API = {
  async post(payload) {
    if (!BF.sheetUrl) throw new Error('Sheet URL সেট নেই।');
    await fetch(BF.sheetUrl, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true; // no-cors = opaque, assume success
  },

  async get(action, params = {}) {
    if (!BF.sheetUrl) throw new Error('Sheet URL সেট নেই।');
    // Use POST instead of GET to avoid CORS issues from GitHub Pages
    // Apps Script accepts action in the JSON body
    try {
      const res  = await fetch(BF.sheetUrl, {
        method: 'POST',
        mode:   'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      const data = await res.json();
      return data;
    } catch(e) {
      // Fallback: try direct GET (works when opened directly in browser)
      const url = new URL(BF.sheetUrl);
      url.searchParams.set('action', action);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res  = await fetch(url.toString());
      return await res.json();
    }
  },

  /* ════════════════════════════════════════════
     syncAllData — called after every login.
     Pulls config + all master data from Sheet
     and replaces localStorage cache.
     Sheet is the single source of truth.
  ════════════════════════════════════════════ */
  async syncAllData(onProgress) {
    if (!BF.sheetUrl) return false;
    try {
      onProgress && onProgress('কনফিগ লোড হচ্ছে…');

      // 1. Config (passwords, company info) — super-saved to Sheet
      const config = await API.get('getConfig');
      if (config && !config.error) {
        if (config.pw_super) { localStorage.setItem('bf_pw_super', config.pw_super); BF.roles.super = config.pw_super; }
        if (config.pw_admin) { localStorage.setItem('bf_pw_admin', config.pw_admin); BF.roles.admin = config.pw_admin; }
        if (config.biz_name)    localStorage.setItem('bf_biz_name',    config.biz_name);
        if (config.biz_phone)   localStorage.setItem('bf_biz_phone',   config.biz_phone);
        if (config.biz_address) localStorage.setItem('bf_biz_address', config.biz_address);
      }

      onProgress && onProgress('পার্টি লিস্ট লোড হচ্ছে…');
      const parties = await API.get('getParties');
      if (Array.isArray(parties)) localStorage.setItem('bf_parties', JSON.stringify(parties));

      onProgress && onProgress('পণ্য তালিকা লোড হচ্ছে…');
      const products = await API.get('getProducts');
      if (Array.isArray(products)) localStorage.setItem('bf_products', JSON.stringify(
        products.map(p => ({ ...p, hasOffer: p.hasOffer === 'true' || p.hasOffer === true }))
      ));

      onProgress && onProgress('অর্ডার লোড হচ্ছে…');
      const orders = await API.get('getOrders');
      if (Array.isArray(orders)) localStorage.setItem('bf_orders', JSON.stringify(orders));

      // Update stat counters
      localStorage.setItem('bf_count_parties',  Array.isArray(parties)  ? parties.length  : 0);
      localStorage.setItem('bf_count_products', Array.isArray(products) ? products.length : 0);
      localStorage.setItem('bf_count_sales',    Array.isArray(orders)   ? orders.filter(o=>o.orderType==='sales').length    : 0);
      localStorage.setItem('bf_last_sync',      new Date().toISOString());

      return true;
    } catch(e) {
      console.warn('Sync failed:', e.message);
      return false;
    }
  },
};

/* ── TOAST ── */
function toast(msg, type = '') {
  let t = document.getElementById('bf-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'bf-toast';
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#1a1a2e;color:#fff;padding:12px 26px;border-radius:30px;font-size:14px;font-weight:500;
      opacity:0;pointer-events:none;transition:all .3s;z-index:9999;white-space:nowrap;font-family:'Inter',sans-serif`;
    document.body.appendChild(t);
  }
  const colors = { success:'#059669', error:'#dc2626', info:'#4f46e5' };
  t.style.background = colors[type] || '#1a1a2e';
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3200);
}

/* ── FORMAT ── */
const fmt = {
  currency:  n => '৳' + parseFloat(n || 0).toLocaleString('en-BD', { minimumFractionDigits:2, maximumFractionDigits:2 }),
  date:      d => d ? new Date(d).toLocaleDateString('en-BD') : '—',
  dateInput: () => new Date().toISOString().split('T')[0],
};

/* ── SPINNER BUTTON ── */
function spinBtn(btn, loading) {
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:bf-spin .6s linear infinite"></span> অপেক্ষা করুন…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
    btn.disabled  = false;
  }
}

/* ── LOADING OVERLAY ── */
function showLoader(msg) {
  let el = document.getElementById('bf-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bf-loader';
    el.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:9998;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px`;
    el.innerHTML = `
      <div style="width:44px;height:44px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;
        border-radius:50%;animation:bf-spin .7s linear infinite"></div>
      <div id="bf-loader-msg" style="color:#fff;font-size:14px;font-weight:500;font-family:'Inter',sans-serif"></div>`;
    document.body.appendChild(el);
  }
  document.getElementById('bf-loader-msg').textContent = msg || 'লোড হচ্ছে…';
  el.style.display = 'flex';
}

function hideLoader() {
  const el = document.getElementById('bf-loader');
  if (el) el.style.display = 'none';
}

/* ── INJECT KEYFRAME ── */
(function() {
  const s = document.createElement('style');
  s.textContent = '@keyframes bf-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
})();
