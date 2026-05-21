const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../Trade Desk/public/analytics.html');
const dest = path.join(__dirname, '../public/index.html');

if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}

let html = fs.readFileSync(src, 'utf8');

html = html.replace(
  /<title>Libertrade — Analytics<\/title>/,
  '<title>Libertrade — Analytics (Demo)</title>'
);

html = html.replace(
  /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>\s*\n/,
  ''
);

html = html.replace(
  /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/Chart\.js\/4\.4\.1\/chart\.umd\.min\.js"><\/script>/,
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="/js/mock-store.js"></script>
<script src="/js/demo-bootstrap.js"></script>`
);

html = html.replace(
  /(\* \{ margin: 0; padding: 0; box-sizing: border-box; \})/,
  `/* Demo readability: equivalent to 125% browser zoom (UI is px-based) */
  html { zoom: 1.25; }

  $1`
);

html = html.replace(
  /<a href="\/" style="[^"]*">← Trade Desk<\/a>\s*\n/,
  `<span class="demo-badge-top" style="font-family:var(--font-mono);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text);opacity:0.9">DEMO</span>\n`
);

html = html.replace(
  /<div id="auth-card">[\s\S]*?<\/div>\s*\n<\/div>\s*\n\n<div class="app">/,
  `<div id="auth-card">
    <div style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--cyan);margin-bottom:14px;padding:6px 12px;border:1px solid rgba(58,154,170,0.35);border-radius:4px;display:inline-block">Portfolio demo</div>
    <div style="font-family:var(--font-sans);font-size:22px;font-weight:600;color:var(--text);margin-bottom:8px">Libertrade</div>
    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Analytics · Demo</div>
    <p style="font-family:var(--font-sans);font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:28px">Sample trading data only. No Google sign-in, no live account.</p>
    <button type="button" id="google-signin-btn" onclick="enterDemo()">Sign in to Demo</button>
  </div>
</div>

<div class="app">`
);

html = html.replace(
  /function setRange\(range\) \{\s*document\.querySelectorAll\('\.range-btn'\)\.forEach\(b => b\.classList\.remove\('active'\)\);\s*event\.target\.classList\.add\('active'\);/,
  `function setRange(range) {
  document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
  const rangeLabels = { week: 'This Week', lastweek: 'Last Week', month: 'This Month', all: 'All Time' };
  const activeBtn = (typeof event !== 'undefined' && event && event.target)
    ? event.target
    : [...document.querySelectorAll('.range-btn')].find(b => b.textContent.trim() === (rangeLabels[range] || ''));
  if (activeBtn) activeBtn.classList.add('active');`
);

html = html.replace(
  /\s*<button class="range-btn" onclick="setRange\('5d'\)">5D<\/button>\s*\n\s*<button class="range-btn" onclick="setRange\('10d'\)">10D<\/button>\s*\n\s*<button class="range-btn" onclick="setRange\('20d'\)">20D<\/button>/,
  ''
);

html = html.replace(
  /if \(range === '5d'\) \{[\s\S]*?\} else if \(range === '20d'\) \{[\s\S]*?\} else if \(range === 'week'\)/,
  "if (range === 'week')"
);

html = html.replace(
  /const rangeLabels = \{ '5d': '5D', '10d': '10D', '20d': '20D', week:/,
  "const rangeLabels = { week:"
);

html = html.replace(
  /document\.getElementById\('date-to'\)\.value\s*=\s*dateTo\s*\|\|\s*'';\s*\n\s*loadAndRender\(\);/,
  `document.getElementById('date-to').value   = dateTo   || '';
  return loadAndRender();`
);

html = html.replace(
  /<div class="logo"><span class="wordmark">Liber<span>trade<\/span><\/span><span class="sub">Analytics<\/span><\/div>/,
  '<div class="logo"><span class="wordmark">Liber<span>trade</span></span><span class="sub">Analytics · Demo</span></div>'
);

html = html.replace(
  /\/\/ ── Auth ─[\s\S]*?window\.addEventListener\('DOMContentLoaded', \(\) => \{\s*\/\/ Dashboard init is driven by auth state — nothing to do here\s*\}\);\s*\n/,
  '// ── Auth: demo-bootstrap.js (click Sign In) ────────────────────────────────\n\n'
);

html = html.replace(
  /const AGENT_WEEKS = \[/,
  'var AGENT_WEEKS = ['
);

html = html.replace(
  /async function loadToday\(\) \{\s*const today = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];/,
  `async function loadToday() {
  const limaMs = Date.now() - 5 * 3600000;
  const today = new Date(limaMs).toISOString().split('T')[0];`
);

html = html.replace(
  /\.gate-GREEN \{ color: var\(--text\); \}/,
  '.gate-GREEN { color: var(--green); }'
);

html = html.replace(
  /<button class="range-btn" onclick="setRange\('all'\)">All Time<\/button>/,
  `<button class="range-btn active" onclick="setRange('all')">All Time</button>`
);

html = html.replace(
  /await Promise\.all\(\[loadData\(\), loadJournalData\(\)\]\);/,
  'await Promise.all([loadData(), loadJournalData(), loadToday()]);'
);

html = html.replace(
  /sleepEl\.className = `val \$\{sleep < 70 \? 'bad' : sleep < 80 \? 'warn' : 'good'\}`;/,
  "sleepEl.className = `val ${sleep >= 80 ? 'good' : sleep >= 70 ? 'warn' : 'bad'}`;"
);

html = html.replace(
  /recEl\.className = `val \$\{rec < 30 \? 'bad' : rec < 50 \? 'warn' : 'good'\}`;/,
  "recEl.className = `val ${rec < 40 ? 'bad' : rec < 70 ? 'warn' : 'good'}`;"
);

html = html.replace(
  /\s*<button onclick="setReportPeriod\('quarterly'\)"[\s\S]*?<\/button>\s*\n\s*<button onclick="setReportPeriod\('trajectory'\)"/,
  `\n        <button onclick="setReportPeriod('trajectory')"`
);

html = html.replace(
  /\['weekly','monthly','quarterly','trajectory'\]/,
  "['weekly','monthly','trajectory']"
);

html = html.replace(
  /btn\.style\.opacity = \(!active && id === 'quarterly'\) \? '0\.5' : '1';/,
  "btn.style.opacity = '1';"
);

html = html.replace(
  /\n<\/div>\s*\n<script>\s*\n\/\/ ── Config/,
  `
  <footer class="demo-footer" style="margin-top:auto;padding:10px 24px;border-top:1px solid var(--border);font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);text-align:center">
    Libertrade Analytics Demo · Sample data only · No Supabase
  </footer>

</div>

<script>
// ── Config`
);

html = html.replace(/\s*<script src="\/js\/demo-bootstrap\.js"><\/script>\s*(?=<\/body>)/i, '\n');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, html, 'utf8');
console.log('OK:', dest, html.length, 'bytes');
