/**
 * Demo mode: intercept Supabase fetch, fake Sign In, read-only UI.
 */
(function () {
  const SUPABASE_HOST = 'uzbsuyknfnzqwdpzspfs.supabase.co';
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function (url, opts) {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    if (u.includes(SUPABASE_HOST)) {
      if (typeof MockStore === 'undefined' || !MockStore.handleRequest) {
        return Promise.reject(
          new Error('Demo data did not load — hard refresh (Ctrl+Shift+R) or check /js/mock-store.js')
        );
      }
      return MockStore.handleRequest(u, opts || {});
    }
    return nativeFetch(url, opts);
  };

  let _dashboardInitialised = false;
  let _entering = false;

  function showDemoError(err) {
    console.error('[Demo]', err);
    const msg = err && err.message ? err.message : String(err);
    const mc = document.getElementById('main-content');
    if (mc) {
      mc.innerHTML =
        '<div class="no-data" style="padding:24px;max-width:520px">' +
        '<div style="margin-bottom:12px">Demo failed to load: ' + msg + '</div>' +
        '<button type="button" onclick="location.reload()" style="font-family:var(--font-mono);font-size:10px;padding:8px 16px;background:var(--green);border:none;color:#000;cursor:pointer;border-radius:4px;margin-right:8px">Reload page</button>' +
        '<button type="button" onclick="document.getElementById(\'auth-overlay\').style.display=\'flex\';if(typeof resetSignInButton===\'function\')resetSignInButton();" style="font-family:var(--font-mono);font-size:10px;padding:8px 16px;background:none;border:1px solid var(--border);color:var(--text);cursor:pointer;border-radius:4px">Back to sign-in</button>' +
        '</div>';
    }
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
    _entering = false;
    resetSignInButton();
  }

  function initDashboard() {
    if (_dashboardInitialised) return;
    _dashboardInitialised = true;

    if (typeof loadAccounts === 'function') loadAccounts();
    if (typeof renderAccountChips === 'function') renderAccountChips();

    if (typeof setRange === 'function') {
      return setRange('all');
    }
    if (typeof loadAndRender === 'function') {
      return loadAndRender();
    }
    if (typeof loadToday === 'function') loadToday();
  }

  function waitForAppScripts(cb, attempt) {
    const n = attempt || 0;
    if (typeof setRange === 'function' && typeof loadAndRender === 'function') {
      cb();
      return;
    }
    if (n > 200) {
      showDemoError(new Error('Page still loading — refresh, then try again'));
      _entering = false;
      resetSignInButton();
      return;
    }
    setTimeout(() => waitForAppScripts(cb, n + 1), 50);
  }

  window.resetSignInButton = function resetSignInButton() {
    const btn = document.getElementById('google-signin-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign in to Demo';
    }
  }

  window.enterDemo = function enterDemo() {
    if (_entering) return;
    _entering = true;

    const btn = document.getElementById('google-signin-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading demo…';
    }

    waitForAppScripts(() => {
      try {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'none';
        const p = initDashboard();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            _entering = false;
            resetSignInButton();
          }).catch((err) => {
            showDemoError(err);
            _entering = false;
            resetSignInButton();
          });
        } else {
          _entering = false;
          resetSignInButton();
        }
      } catch (err) {
        showDemoError(err);
        _entering = false;
        resetSignInButton();
      }
    });
  };

  window.signInWithGoogle = function () {
    enterDemo();
  };

  window.signOut = function () {
    _dashboardInitialised = false;
    _entering = false;
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
  };

  window.syncData = async function () {
    const el = document.getElementById('last-sync');
    if (el) {
      el.textContent = 'Demo — sync disabled';
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; }, 2500);
    }
  };

  function disableImport() {
    const importBtn = document.querySelector('.upload-btn');
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.style.opacity = '0.45';
      importBtn.style.cursor = 'not-allowed';
      importBtn.title = 'Import disabled in demo mode';
      importBtn.onclick = null;
    }
    const fileInput = document.getElementById('rtrader-file-input');
    if (fileInput) fileInput.disabled = true;
    const confirmBtn = document.getElementById('confirm-import-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.title = 'Import disabled in demo mode';
    }
    const backfill = document.getElementById('backfill-btn');
    if (backfill) {
      backfill.disabled = true;
      backfill.style.opacity = '0.45';
      backfill.title = 'Backfill disabled in demo mode (read-only sample data)';
    }
  }

  function patchAuthBlock() {
    const btn = document.getElementById('google-signin-btn');
    if (!btn) return;
    btn.textContent = 'Sign in to Demo';
    btn.onclick = function (e) {
      e.preventDefault();
      enterDemo();
    };
  }

  window.normalizeJournalEmotions = function (emotions) {
    if (!emotions) return [];
    if (Array.isArray(emotions)) return emotions.filter(Boolean);
    if (typeof emotions === 'string') {
      try {
        const parsed = JSON.parse(emotions);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) { /* ignore */ }
      return emotions.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  function weekRangeFromFriday(weekEnding) {
    const fri = new Date(weekEnding + 'T12:00:00');
    const mon = new Date(fri);
    mon.setDate(mon.getDate() - 4);
    const pad = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: pad(mon), end: weekEnding };
  }

  function patchReportsSidebar() {
    const orig = window.initReportsPage;
    if (typeof orig !== 'function') return;
    if (typeof MockStore === 'undefined' || !MockStore.store || !MockStore.store.agentWeeks) return;

    window.initReportsPage = async function demoInitReportsPage() {
      const sidebar = document.getElementById('reports-sidebar-weeks');
      if (!sidebar) return orig();

      const weeks = MockStore.store.agentWeeks
        .slice()
        .reverse()
        .map(weekRangeFromFriday);

      const earliest = weeks[weeks.length - 1].start;
      const headers =
        typeof HEADERS !== 'undefined'
          ? HEADERS
          : { apikey: '', Authorization: '' };
      const base =
        typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';

      const [daysRes, tradesRes] = await Promise.all([
        fetch(`${base}/rest/v1/trading_days?select=date&date=gte.${earliest}&order=date.desc`, {
          headers,
        }),
        fetch(`${base}/rest/v1/trades?select=date,net_pnl&date=gte.${earliest}`, { headers }),
      ]);
      const days = await daysRes.json();
      const trades = await tradesRes.json();
      const pnlByDate = {};
      trades.forEach((t) => {
        pnlByDate[t.date] = (pnlByDate[t.date] || 0) + (t.net_pnl || 0);
      });

      sidebar.innerHTML = weeks
        .map((w, i) => {
          const weekPnl = Object.keys(pnlByDate)
            .filter((d) => d >= w.start && d <= w.end)
            .reduce((sum, d) => sum + pnlByDate[d], 0);
          const hasTrades =
            weekPnl !== 0 || days.some((d) => d.date >= w.start && d.date <= w.end);
          const label =
            typeof fmtWeekLabel === 'function'
              ? fmtWeekLabel(w.start, w.end)
              : `${w.start} – ${w.end}`;
          const pnlStr =
            weekPnl >= 0 ? `+$${weekPnl.toFixed(0)}` : `-$${Math.abs(weekPnl).toFixed(0)}`;
          const pnlCol =
            weekPnl > 0 ? 'var(--green)' : weekPnl < 0 ? 'var(--red)' : 'var(--muted)';
          return `<div class="sidebar-week-item ${i === 0 ? 'active' : ''}" onclick="loadWeekReport('${w.start}','${w.end}',this)">
      <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.04em;color:var(--text)">${label}</span>
      <span style="font-family:var(--font-num);font-size:11px;font-weight:300;color:${pnlCol}">${hasTrades ? pnlStr : '—'}</span>
    </div>`;
        })
        .join('');

      if (typeof loadWeekReport === 'function') {
        loadWeekReport(weeks[0].start, weeks[0].end, null);
      }
    };
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (typeof MockStore !== 'undefined' && MockStore.store && MockStore.store.agentWeeks) {
      window.AGENT_WEEKS = MockStore.store.agentWeeks;
    }
    patchReportsSidebar();
    patchAuthBlock();
    disableImport();
    const signout = document.getElementById('signout-btn');
    if (signout) signout.style.display = 'none';

    if (typeof emotionChipsHtml === 'function' && !emotionChipsHtml._demoPatched) {
      const orig = emotionChipsHtml;
      window.emotionChipsHtml = function (emotions) {
        return orig(window.normalizeJournalEmotions(emotions));
      };
      window.emotionChipsHtml._demoPatched = true;
    }
  });
})();
