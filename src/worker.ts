import { neon, neonConfig } from '@neondatabase/serverless';

// Force Neon to use HTTP fetch instead of WebSockets (fixes many connection errors in Workers)
neonConfig.fetchConnection = true;

export interface Env {
  DATABASE_URL: string;
}

type Sql = ReturnType<typeof neon>;

// ─── URL validation ────────────────────────────────────────────────────────────
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']);
const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function parseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (BLOCKED_HOSTS.has(u.hostname) || PRIVATE_IP.test(u.hostname)) return null;
    return u;
  } catch { return null; }
}

function validUsername(s: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(s);
}

// ─── Response helpers ──────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
function jsonR(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── DB helpers ────────────────────────────────────────────────────────────────
async function getOrCreateUser(sql: Sql, username: string): Promise<number> {
  const rows = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1` as { id: number }[];
  if (rows[0]) return rows[0].id;
  const [row] = await sql`INSERT INTO users (username) VALUES (${username}) RETURNING id` as { id: number }[];
  return row.id;
}

// ─── HTML ──────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script>document.documentElement.setAttribute('data-theme',localStorage.getItem('pa_theme')||(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'));</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Primary SEO -->
<title>WakeBot — Keep Your Free Server Awake</title>
<meta name="description" content="Keep your Render, Railway, Fly.io free servers awake with automatic pings every minute. No signup, no password — free forever.">
<meta name="keywords" content="keep server awake, prevent server sleep, render ping, railway ping, fly.io uptime, free server monitoring, uptime monitor, server keep-alive, cloudflare workers">
<meta name="author" content="WakeBot">
<meta name="robots" content="index, follow">
<link rel="canonical" href="__ORIGIN__">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:url" content="__ORIGIN__">
<meta property="og:title" content="WakeBot — Keep Your Free Server Awake">
<meta property="og:description" content="Automatic pings for Render, Railway, Fly.io free servers. No signup, no password — free forever.">
<meta property="og:image" content="__ORIGIN__/og">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="WakeBot — Keep Your Free Server Awake, Forever">
<meta property="og:site_name" content="WakeBot">
<meta property="og:locale" content="en_US">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="WakeBot — Keep Your Free Server Awake">
<meta name="twitter:description" content="Automatic pings for Render, Railway, Fly.io free servers. No signup, no password — free forever.">
<meta name="twitter:image" content="__ORIGIN__/og">
<meta name="twitter:image:alt" content="WakeBot — Keep Your Free Server Awake, Forever">

<!-- Favicon -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090f;--surface:rgba(255,255,255,.03);--surface2:rgba(255,255,255,.06);
  --border:rgba(255,255,255,.07);--border-g:rgba(74,222,128,.35);
  --green:#4ade80;--green-dim:rgba(74,222,128,.08);
  --text:#f1f5f9;--muted:#64748b;--danger:#f87171;--danger-dim:rgba(248,113,113,.09);
}
[data-theme="light"]{
  --bg:#f8fafc;--surface:rgba(0,0,0,.04);--surface2:rgba(0,0,0,.07);
  --border:rgba(0,0,0,.09);--border-g:rgba(22,163,74,.4);
  --green:#16a34a;--green-dim:rgba(22,163,74,.08);
  --text:#0f172a;--muted:#64748b;--danger:#dc2626;--danger-dim:rgba(220,38,38,.08);
}
[data-theme="light"] nav{background:rgba(248,250,252,.92)}
[data-theme="light"] input[type=text],[data-theme="light"] select{background:rgba(0,0,0,.04)}
[data-theme="light"] select option{background:#f8fafc;color:#0f172a}
[data-theme="light"] h1{background:linear-gradient(155deg,#0f172a 0%,#475569 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
[data-theme="light"] .btn:hover:not(:disabled){background:#15803d;box-shadow:0 6px 24px rgba(22,163,74,.25)}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh;line-height:1.6;-webkit-font-smoothing:antialiased;transition:background-color .2s,color .2s}

/* NAV */
nav{padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);position:sticky;top:0;backdrop-filter:blur(16px);background:rgba(7,9,15,.88);z-index:100}
.logo{display:flex;align-items:center;gap:.55rem;font-weight:700;font-size:1.05rem;letter-spacing:-.02em;color:var(--text);text-decoration:none}
.logo-pulse{width:9px;height:9px;background:var(--green);border-radius:50%;animation:dot-pulse 2s ease-in-out infinite;flex-shrink:0}
@keyframes dot-pulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)}50%{box-shadow:0 0 0 8px rgba(74,222,128,0)}}
.nav-right{display:flex;align-items:center;gap:.75rem}
.nav-badge{font-size:.72rem;font-weight:500;color:var(--green);background:var(--green-dim);border:1px solid rgba(74,222,128,.18);padding:.2rem .65rem;border-radius:999px}
.user-pill{display:flex;align-items:center;gap:.5rem;background:var(--surface);border:1px solid var(--border);padding:.25rem .25rem .25rem .75rem;border-radius:999px;transition:all .2s}
.user-pill:hover{border-color:var(--border-g);background:var(--surface2)}
.user-avatar{width:22px;height:22px;background:var(--green);color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;text-transform:uppercase;flex-shrink:0}
.user-name{font-size:.82rem;font-weight:600;color:var(--text);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.user-name::before{content:'@';color:var(--muted);font-weight:400;margin-right:1px}
.btn-logout{background:none;border:none;color:var(--muted);cursor:pointer;padding:.3rem;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:all .18s;flex-shrink:0}
.btn-logout:hover{background:var(--danger-dim);color:var(--danger)}
.btn-theme{background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .18s;flex-shrink:0}
.btn-theme:hover{border-color:var(--border-g);color:var(--green)}

/* HERO */
.hero{text-align:center;padding:4.5rem 1rem 2rem;max-width:680px;margin:0 auto}
.hero-chip{display:inline-flex;align-items:center;gap:.45rem;background:var(--green-dim);border:1px solid rgba(74,222,128,.2);color:var(--green);padding:.3rem .8rem;border-radius:999px;font-size:.76rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;margin-bottom:1.6rem}
.chip-dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:dot-pulse 1.5s ease-in-out infinite}
h1{font-size:clamp(2.2rem,6.5vw,3.6rem);font-weight:800;letter-spacing:-.05em;line-height:1.08;margin-bottom:1.1rem;background:linear-gradient(155deg,#f1f5f9 0%,#94a3b8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:1rem;color:var(--muted);max-width:440px;margin:0 auto 2.25rem;line-height:1.75}

/* EKG */
.ekg-wrap{margin:0 auto 2.25rem;width:200px;height:48px}
.ekg-bg{fill:var(--green-dim);stroke:rgba(74,222,128,.18);stroke-width:1}
.ekg-path{fill:none;stroke:var(--green);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:300;stroke-dashoffset:300;animation:ekg-draw 1.6s ease forwards .2s,ekg-loop 3.5s ease 1.8s infinite}
@keyframes ekg-draw{to{stroke-dashoffset:0}}
@keyframes ekg-loop{0%,45%{stroke-dashoffset:0;opacity:1}55%,95%{stroke-dashoffset:-300;opacity:0}96%{stroke-dashoffset:300;opacity:0}100%{stroke-dashoffset:0;opacity:1}}

/* STATS */
.stats-row{display:flex;justify-content:center;align-items:stretch;max-width:360px;margin:0 auto 3rem;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.stat{flex:1;text-align:center;padding:.85rem 1rem}
.stat+.stat{border-left:1px solid var(--border)}
.stat-val{font-size:1.5rem;font-weight:700;color:var(--green);font-variant-numeric:tabular-nums;line-height:1.2}
.stat-lbl{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-top:.1rem}

/* MAIN */
.main-wrap{max-width:480px;margin:0 auto;padding:0 1rem 4rem}

/* CARD */
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.75rem;margin-bottom:1.25rem}
.card-title{font-weight:700;font-size:.95rem;letter-spacing:-.01em;margin-bottom:1.4rem;display:flex;align-items:center;gap:.45rem;color:var(--text)}
.card-tabs{display:flex;background:var(--surface2);padding:.3rem;border-radius:12px;margin-bottom:1.75rem;position:relative;border:1px solid var(--border)}
.tab-btn{flex:1;border:none;background:none;padding:.65rem;font-size:.82rem;font-weight:600;color:var(--muted);cursor:pointer;border-radius:9px;transition:all .2s;z-index:1;display:flex;align-items:center;justify-content:center;gap:.4rem}
.tab-btn.active{color:var(--green);background:var(--bg);box-shadow:0 4px 12px rgba(0,0,0,.3), 0 0 0 1px var(--border)}
[data-theme="light"] .tab-btn.active{background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.06), 0 0 0 1px var(--border)}
.tab-btn svg{opacity:.7}
.tab-btn.active svg{opacity:1}
.form-group{margin-bottom:1rem}
label{display:block;font-size:.8rem;font-weight:500;color:#cbd5e1;margin-bottom:.4rem}
.input-wrap{position:relative}
.input-prefix{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:var(--muted);font-size:.83rem;pointer-events:none;user-select:none}
input[type=text]{width:100%;background:rgba(255,255,255,.045);border:1px solid var(--border);border-radius:8px;padding:.7rem .9rem;color:var(--text);font-size:.9rem;font-family:inherit;transition:border-color .18s,box-shadow .18s;outline:none}
input.has-pfx{padding-left:2.6rem}
input[type=text]:focus{border-color:var(--border-g);box-shadow:0 0 0 3px rgba(74,222,128,.09)}
input::placeholder{color:var(--muted)}
select{width:100%;background:rgba(255,255,255,.045);border:1px solid var(--border);border-radius:8px;padding:.7rem .9rem;color:var(--text);font-size:.9rem;font-family:inherit;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .85rem center;padding-right:2.5rem;cursor:pointer;transition:border-color .18s,box-shadow .18s}
select:focus{border-color:var(--border-g);box-shadow:0 0 0 3px rgba(74,222,128,.09)}
select option{background:#111622;color:var(--text)}
.form-hint{font-size:.73rem;color:var(--muted);margin-top:.3rem}
.err{color:var(--danger);font-size:.78rem;margin-top:.4rem;display:none}
.err.show{display:block}

/* BTN */
.btn{width:100%;padding:.8rem;background:var(--green);color:#000;border:none;border-radius:8px;font-size:.95rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .18s,transform .15s,box-shadow .18s;display:flex;align-items:center;justify-content:center;gap:.45rem;letter-spacing:-.01em;margin-top:1.1rem}
.btn:hover:not(:disabled){background:#22c55e;transform:translateY(-1px);box-shadow:0 6px 24px rgba(74,222,128,.25)}
.btn:active:not(:disabled){transform:translateY(0)}
.btn:disabled{opacity:.55;cursor:not-allowed}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:14px;height:14px;border:2px solid rgba(0,0,0,.2);border-top-color:#000;border-radius:50%;animation:spin .5s linear infinite}
.free-note{text-align:center;font-size:.73rem;color:var(--muted);margin-top:.75rem}
.free-note span{margin:0 .3rem}

/* DASHBOARD */
.dash-intro{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.85rem}

/* MONITORS */
.monitors-list{display:flex;flex-direction:column;gap:.55rem}
.monitor-item{display:flex;align-items:center;gap:.8rem;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;transition:border-color .18s}
.monitor-item:hover{border-color:rgba(255,255,255,.12)}
.mon-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.mon-dot.ok{background:var(--green);box-shadow:0 0 0 3px rgba(74,222,128,.2)}
.mon-dot.idle{background:var(--muted)}
.mon-info{flex:1;min-width:0}
.mon-url{font-size:.875rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mon-meta{font-size:.72rem;color:var(--muted);margin-top:.1rem}
.mon-remove{background:none;border:1px solid rgba(248,113,113,.2);color:var(--danger);border-radius:6px;padding:.26rem .6rem;font-size:.72rem;font-family:inherit;cursor:pointer;flex-shrink:0;transition:background .18s}
.mon-remove:hover{background:var(--danger-dim)}
.empty-state{text-align:center;padding:2rem 1rem;color:var(--muted);font-size:.875rem;background:var(--surface);border:1px dashed var(--border);border-radius:10px;line-height:1.7}
.loading-row{text-align:center;padding:1.25rem;color:var(--muted);font-size:.83rem}

/* SECTIONS */
.section{max-width:700px;margin:3.5rem auto;padding:0 1.25rem}
.divider{height:1px;background:var(--border);max-width:480px;margin:0 auto 3rem}
.sec-title{text-align:center;font-size:1.45rem;font-weight:700;letter-spacing:-.04em;margin-bottom:.35rem}
.sec-sub{text-align:center;color:var(--muted);font-size:.85rem;margin-bottom:1.75rem}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.85rem}
.step{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.3rem}
.step-num{width:32px;height:32px;background:var(--green-dim);border:1px solid rgba(74,222,128,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--green);font-weight:700;font-size:.82rem;margin-bottom:.85rem}
.step-t{font-weight:600;font-size:.88rem;margin-bottom:.25rem}
.step-d{color:var(--muted);font-size:.8rem;line-height:1.65}
.platforms{text-align:center;max-width:580px;margin:0 auto 1.5rem;padding:0 1rem}
.plat-lbl{color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.85rem}
.plat-list{display:flex;flex-wrap:wrap;justify-content:center;gap:.55rem}
.plat-tag{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:.32rem .95rem;font-size:.8rem;font-weight:500;color:#94a3b8;transition:border-color .18s,color .18s}
.plat-tag:hover{border-color:var(--border-g);color:var(--green)}
footer{border-top:1px solid var(--border);padding:1.25rem;text-align:center;color:var(--muted);font-size:.76rem}

@media(max-width:480px){
  nav{padding:.85rem 1.1rem}
  .hero{padding:3rem .9rem 1.5rem}
  .card{padding:1.35rem}
  .steps{grid-template-columns:1fr}
}
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "WakeBot",
  "url": "__ORIGIN__",
  "description": "Keep your Render, Railway, Fly.io free servers awake with automatic pings every minute. No signup, no password — free forever.",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": [
    "Automatic scheduled pings",
    "No signup or password required",
    "Up to 20 monitors per user",
    "1 to 60 minute ping intervals",
    "Works with Render, Railway, Fly.io, Koyeb, Glitch, Replit"
  ]
}
</script>
</head>
<body>

<nav>
  <a class="logo" href="/"><span class="logo-pulse"></span>WakeBot</a>
  <div class="nav-right">
    <span id="navBadge" class="nav-badge">No signup needed</span>
    <div id="userPill" class="user-pill" style="display:none">
      <span class="user-name" id="navUsername"></span>
      <div class="user-avatar" id="userAvatar"></div>
      <button class="btn-logout" onclick="switchAccount()" title="Switch account">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
    <button id="themeBtn" class="btn-theme" onclick="toggleTheme()" aria-label="Toggle theme"></button>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-chip"><span class="chip-dot"></span>Automatic ping service</div>
  <h1>Keep Your Free Server Awake, Forever.</h1>
  <p class="hero-sub">Free hosting platforms sleep your server after 15 minutes of inactivity. WakeBot pings it on schedule — no more cold starts, no password.</p>
  <div class="ekg-wrap">
    <svg viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
      <rect class="ekg-bg" x="0" y="0" width="200" height="48" rx="9"/>
      <path class="ekg-path" d="M8,24 L48,24 L58,11 L66,37 L74,5 L82,43 L90,24 L192,24"/>
    </svg>
  </div>
  <div class="stats-row">
    <div class="stat"><div class="stat-val" id="statCount">—</div><div class="stat-lbl">Servers monitored</div></div>
    <div class="stat"><div class="stat-val" id="statPings">—</div><div class="stat-lbl">Total pings sent</div></div>
  </div>
</section>

<!-- MAIN -->
<div class="main-wrap">

  <!-- FORM STATE (no username saved) -->
  <div id="formState" style="display:none">
    <div class="card">
      <div class="card-tabs">
        <button class="tab-btn active" id="tabNew" onclick="setAuthMode('new')">New User</button>
        <button class="tab-btn" id="tabExisting" onclick="setAuthMode('login')">Returning User</button>
      </div>

      <!-- Sign Up Form (Default) -->
      <form id="mainForm" onsubmit="handleMain(event)" novalidate>
        <div class="form-group">
          <label for="fUsername">Your username</label>
          <div class="input-wrap">
            <span class="input-prefix">@</span>
            <input type="text" id="fUsername" class="has-pfx" placeholder="your_username" autocomplete="username" spellcheck="false" required>
          </div>
          <div class="form-hint">3–30 characters. No password needed.</div>
        </div>
        <div id="urlFields">
          <div class="form-group">
            <label for="fUrl">Server URL</label>
            <input type="text" id="fUrl" placeholder="https://your-app.onrender.com" autocomplete="off" spellcheck="false" required>
          </div>
          <div class="form-group">
            <label for="fInterval">Ping interval</label>
            <select id="fInterval">
              <option value="1">Every 1 minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="10">Every 10 minutes</option>
              <option value="14" selected>Every 14 minutes — Render / Railway</option>
              <option value="20">Every 20 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 1 hour</option>
            </select>
          </div>
        </div>
        <div class="err" id="mainErr"></div>
        <button type="submit" class="btn" id="mainBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span id="mainBtnText">Start Monitoring</span>
        </button>
      </form>
      <p class="free-note">
        <span>✓ Free forever</span><span>·</span><span>✓ No password</span>
      </p>
    </div>
  </div>

  <!-- DASHBOARD STATE (username in localStorage) -->
  <div id="dashState" style="display:none">
    <!-- Add monitor -->
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add a monitor
      </div>
      <form id="addForm" onsubmit="addMonitor(event)" novalidate>
        <div class="form-group">
          <label for="aUrl">Server URL</label>
          <input type="text" id="aUrl" placeholder="https://your-app.onrender.com" autocomplete="off" spellcheck="false" required>
          <div class="err" id="addErr"></div>
        </div>
        <div class="form-group">
          <label for="aInterval">Ping interval</label>
          <select id="aInterval">
            <option value="1">Every 1 minute</option>
            <option value="5">Every 5 minutes</option>
            <option value="10">Every 10 minutes</option>
            <option value="14" selected>Every 14 minutes — Render / Railway</option>
            <option value="20">Every 20 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every 1 hour</option>
          </select>
        </div>
        <button type="submit" class="btn" id="addBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Monitor
        </button>
      </form>
    </div>

    <!-- Monitors list -->
    <div>
      <div class="dash-intro" id="monHd">Your monitors</div>
      <div id="monitorsList"><div class="loading-row">Loading…</div></div>
    </div>
  </div>

</div>

<!-- HOW IT WORKS -->
<div class="section">
  <h2 class="sec-title">How it works</h2>
  <p class="sec-sub">Three steps, zero config, zero password.</p>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-t">Pick a username</div>
      <div class="step-d">Just a handle to identify your monitors. No password, no email required.</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-t">Add your server</div>
      <div class="step-d">Enter your server URL and choose how often you want it pinged.</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-t">Stay awake forever</div>
      <div class="step-d">We send automatic GET requests on your schedule — no cold starts, ever.</div>
    </div>
  </div>
</div>

<div class="divider"></div>

<div class="platforms">
  <div class="plat-lbl">Works great with</div>
  <div class="plat-list">
    <span class="plat-tag">Render</span>
    <span class="plat-tag">Railway</span>
    <span class="plat-tag">Fly.io</span>
    <span class="plat-tag">Koyeb</span>
    <span class="plat-tag">Glitch</span>
    <span class="plat-tag">Replit</span>
    <span class="plat-tag">Any free tier</span>
  </div>
</div>

<footer>Built on Cloudflare Workers &nbsp;·&nbsp; Powered by Neon PostgreSQL &nbsp;·&nbsp; Free forever</footer>

<script>
(function () {
  var USERNAME = localStorage.getItem('pa_username');

  // ── Theme ──────────────────────────────────────────────
  var SUN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  function updateThemeIcon() {
    document.getElementById('themeBtn').innerHTML = document.documentElement.getAttribute('data-theme') === 'light' ? MOON : SUN;
  }
  window.toggleTheme = function() {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pa_theme', next);
    updateThemeIcon();
  };
  updateThemeIcon();

  // ── Init ───────────────────────────────────────────────
  loadStats();
  if (USERNAME) {
    showDashboard(false);
  } else {
    showForm();
  }

  // ── UI helpers ─────────────────────────────────────────
  var AUTH_MODE = 'new'; 
  window.setAuthMode = function(mode) {
    AUTH_MODE = mode;
    document.getElementById('tabNew').classList.toggle('active', mode === 'new');
    document.getElementById('tabExisting').classList.toggle('active', mode === 'login');
    document.getElementById('urlFields').style.display = mode === 'new' ? '' : 'none';
    document.getElementById('mainBtnText').textContent = mode === 'new' ? 'Start Monitoring' : 'Sign In';
    document.getElementById('mainErr').classList.remove('show');
  };

  function showForm() {
    document.getElementById('formState').style.display = '';
    document.getElementById('dashState').style.display = 'none';
    document.getElementById('navBadge').style.display = '';
    document.getElementById('userPill').style.display = 'none';
  }

  function showDashboard(scroll) {
    document.getElementById('formState').style.display = 'none';
    document.getElementById('dashState').style.display = '';
    document.getElementById('navBadge').style.display = 'none';
    document.getElementById('userPill').style.display = 'flex';
    document.getElementById('navUsername').textContent = USERNAME;
    document.getElementById('userAvatar').textContent = (USERNAME || '?').charAt(0);
    loadMonitors();
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.switchAccount = function () {
    if (confirm('Switch account? You will need to enter your username to get back.')) {
      USERNAME = null;
      localStorage.removeItem('pa_username');
      showForm();
    }
  };

  // ── Main form (first time or login) ─────────────────────
  window.handleMain = async function (e) {
    e.preventDefault();
    var username = document.getElementById('fUsername').value.trim().toLowerCase();
    var url = document.getElementById('fUrl').value.trim();
    var interval = parseInt(document.getElementById('fInterval').value);
    var errEl = document.getElementById('mainErr');
    errEl.classList.remove('show');

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      showErr(errEl, 'Username: 3–30 chars, letters/numbers/underscore only.'); return;
    }

    if (AUTH_MODE === 'new') {
      if (!url) { showErr(errEl, 'Please enter a server URL.'); return; }
      if (!url.startsWith('http')) url = 'https://' + url;
    }

    var btn = document.getElementById('mainBtn');
    setLoading(btn, true);
    try {
      if (AUTH_MODE === 'login') {
        var r = await fetch('/api/monitors?username=' + encodeURIComponent(username));
        if (!r.ok) { showErr(errEl, 'Login failed. Check username.'); return; }
        USERNAME = username;
      } else {
        var r = await fetch('/api/monitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, url, interval }),
        });
        var d = await r.json();
        if (!r.ok || d.error) { showErr(errEl, d.error || 'Something went wrong.'); return; }
        USERNAME = username;
      }
      localStorage.setItem('pa_username', USERNAME);
      document.getElementById('mainForm').reset();
      showDashboard(true);
      loadStats();
    } catch (_) { showErr(errEl, 'Network error. Try again.'); }
    finally { setLoading(btn, false); }
  };

  // ── Add monitor (dashboard) ────────────────────────────
  window.addMonitor = async function (e) {
    e.preventDefault();
    var url = document.getElementById('aUrl').value.trim();
    var interval = parseInt(document.getElementById('aInterval').value);
    var errEl = document.getElementById('addErr');
    errEl.classList.remove('show');

    if (!url) { showErr(errEl, 'Please enter a URL.'); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    var btn = document.getElementById('addBtn');
    setLoading(btn, true);
    try {
      var r = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: USERNAME, url, interval }),
      });
      var d = await r.json();
      if (!r.ok || d.error) { showErr(errEl, d.error || 'Failed to add monitor.'); return; }
      document.getElementById('addForm').reset();
      loadMonitors();
      loadStats();
    } catch (_) { showErr(errEl, 'Network error. Try again.'); }
    finally { setLoading(btn, false); }
  };

  // ── Remove monitor ─────────────────────────────────────
  window.removeMonitor = async function (id) {
    if (!confirm('Remove this monitor?')) return;
    try {
      await fetch('/api/monitors/' + id + '?username=' + encodeURIComponent(USERNAME), { method: 'DELETE' });
      loadMonitors();
      loadStats();
    } catch (_) {}
  };

  window.pingNow = async function (id, btn) {
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '...';
    try {
      var r = await fetch('/api/monitors/' + id + '/ping?username=' + encodeURIComponent(USERNAME), { method: 'POST' });
      var d = await r.json();
      if (d.ok) {
        btn.textContent = '✅';
        setTimeout(function() { btn.textContent = originalText; btn.disabled = false; }, 2000);
        loadMonitors();
      } else {
        alert('Ping failed: ' + (d.error || 'Unknown error'));
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (_) {
      alert('Network error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  // ── Load monitors ──────────────────────────────────────
  async function loadMonitors() {
    document.getElementById('monitorsList').innerHTML = '<div class="loading-row">Loading…</div>';
    try {
      var r = await fetch('/api/monitors?username=' + encodeURIComponent(USERNAME));
      var d = await r.json();
      renderMonitors(d.monitors || []);
    } catch (_) { renderMonitors([]); }
  }

  function renderMonitors(list) {
    var hd = document.getElementById('monHd');
    var el = document.getElementById('monitorsList');
    hd.textContent = 'Your monitors (' + list.length + ')';
    if (!list.length) {
      el.innerHTML = '<div class="empty-state">No monitors yet.<br>Add your first server URL above to get started.</div>';
      return;
    }
    el.innerHTML = '<div class="monitors-list">' + list.map(function (m) {
      var healthy = m.last_ping && (Date.now() - new Date(m.last_ping).getTime()) < m.interval_minutes * 60000 * 1.8;
      return '<div class="monitor-item">' +
        '<span class="mon-dot ' + (healthy ? 'ok' : 'idle') + '"></span>' +
        '<div class="mon-info">' +
          '<div class="mon-url">' + esc(m.url) + '</div>' +
          '<div class="mon-meta">Every ' + m.interval_minutes + 'm &nbsp;&middot;&nbsp; ' +
            Number(m.ping_count).toLocaleString() + ' pings &nbsp;&middot;&nbsp; ' + ago(m.last_ping) +
          '</div>' +
        '</div>' +
        '<button class="mon-remove" data-id="' + esc(m.id) + '" onclick="removeMonitor(this.dataset.id)">Remove</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  // ── Stats ──────────────────────────────────────────────
  async function loadStats() {
    try {
      var r = await fetch('/api/stats');
      var d = await r.json();
      animNum(document.getElementById('statCount'), d.count || 0);
      animNum(document.getElementById('statPings'), d.totalPings || 0);
    } catch (_) {
      document.getElementById('statCount').textContent = '0';
      document.getElementById('statPings').textContent = '0';
    }
  }

  // ── Helpers ────────────────────────────────────────────
  function ago(iso) {
    if (!iso) return 'Never pinged';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showErr(el, msg) { el.textContent = msg; el.classList.add('show'); }

  function setLoading(btn, on) {
    btn.disabled = on;
    if (on) {
      btn.innerHTML = '<span class="spinner"></span> Please wait…';
    } else {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> ' + (btn.id === 'addBtn' ? 'Add Monitor' : 'Start Monitoring');
    }
  }

  function animNum(el, target) {
    var dur = 800, step = 16, t = 0;
    var timer = setInterval(function () {
      t += step;
      el.textContent = Math.round(Math.min(t / dur, 1) * target).toLocaleString();
      if (t >= dur) clearInterval(timer);
    }, step);
  }
})();
</script>
</body>
</html>`;

// ─── Icon ──────────────────────────────────────────────────────────────────────
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="bg" cx="40%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#0e1420"/>
      <stop offset="100%" stop-color="#07090f"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#bg)"/>
  <circle cx="50" cy="50" r="40" fill="none" stroke="#4ade80" stroke-width="1.5" opacity="0.08"/>
  <circle cx="50" cy="50" r="28" fill="none" stroke="#4ade80" stroke-width="2"   opacity="0.22"/>
  <circle cx="50" cy="50" r="16" fill="none" stroke="#4ade80" stroke-width="3"   opacity="0.45"/>
  <circle cx="50" cy="50" r="7"  fill="#4ade80" opacity="0.18"/>
  <circle cx="50" cy="50" r="5"  fill="#4ade80" filter="url(#glow)"/>
  <circle cx="50" cy="50" r="3"  fill="#bbf7d0"/>
</svg>`;

// ─── OG Image (1200×630) ──────────────────────────────────────────────────────
const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif">
  <defs>
    <radialGradient id="rg" cx="78%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4ade80" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#07090f" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#07090f"/>
  <rect width="1200" height="630" fill="url(#rg)"/>
  <rect width="1200" height="2" fill="#4ade80" opacity="0.12"/>
  <circle cx="920" cy="315" r="260" fill="none" stroke="#4ade80" stroke-width="1"   opacity="0.05"/>
  <circle cx="920" cy="315" r="200" fill="none" stroke="#4ade80" stroke-width="1.5" opacity="0.1"/>
  <circle cx="920" cy="315" r="140" fill="none" stroke="#4ade80" stroke-width="2"   opacity="0.2"/>
  <circle cx="920" cy="315" r="85"  fill="none" stroke="#4ade80" stroke-width="3"   opacity="0.36"/>
  <circle cx="920" cy="315" r="40"  fill="none" stroke="#4ade80" stroke-width="4"   opacity="0.55"/>
  <circle cx="920" cy="315" r="20"  fill="#4ade80" opacity="0.14"/>
  <circle cx="920" cy="315" r="13"  fill="#4ade80" filter="url(#glow)"/>
  <circle cx="920" cy="315" r="8"   fill="#bbf7d0"/>
  <circle cx="72" cy="74" r="8" fill="#4ade80"/>
  <text x="92" y="82" font-size="26" font-weight="700" fill="#f1f5f9" letter-spacing="-0.5">WakeBot</text>
  <rect x="66" y="128" width="200" height="34" rx="17" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.25)" stroke-width="1.5"/>
  <circle cx="91" cy="145" r="5" fill="#4ade80"/>
  <text x="104" y="151" font-size="13" font-weight="600" fill="#4ade80" letter-spacing="1">AUTOMATIC PING</text>
  <text x="66" y="265" font-size="76" font-weight="800" fill="#f1f5f9"  letter-spacing="-3">Keep Your Free</text>
  <text x="66" y="355" font-size="76" font-weight="800" fill="#4ade80" letter-spacing="-3">Server Awake.</text>
  <text x="66" y="416" font-size="23" fill="#475569" letter-spacing="-0.3">Render · Railway · Fly.io · Koyeb · Any free tier</text>
  <circle cx="76"  cy="481" r="4" fill="#4ade80"/>
  <text x="91"  y="487" font-size="20" fill="#94a3b8">No signup</text>
  <circle cx="228" cy="481" r="4" fill="#4ade80"/>
  <text x="243" y="487" font-size="20" fill="#94a3b8">No password</text>
  <circle cx="400" cy="481" r="4" fill="#4ade80"/>
  <text x="415" y="487" font-size="20" fill="#94a3b8">Free forever</text>
  <text x="66" y="578" font-size="16" fill="#334155">wakebot.workers.dev</text>
</svg>`;

// ─── Worker ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (pathname === '/favicon.svg' || pathname === '/icon.svg')
      return new Response(ICON_SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' } });

    if (pathname === '/og')
      return new Response(OG_SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });

    if (pathname === '/robots.txt')
      return new Response('User-agent: *\nAllow: /\nSitemap: ' + url.origin + '/sitemap.xml\n', {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' },
      });

    if (pathname === '/sitemap.xml')
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url.origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>`,
        { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' } },
      );

    if (pathname === '/')
      return new Response(HTML.replace(/__ORIGIN__/g, url.origin), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

    if (!env.DATABASE_URL) {
      return jsonR({ error: 'DATABASE_URL is not defined. Check your .dev.vars or Cloudflare secrets.' }, 500);
    }

    const sql = neon(env.DATABASE_URL);

    // Wrap DB calls in try-catch to provide better error messages
    const query = async <T>(promise: Promise<T>): Promise<T | Response> => {
      try {
        return await promise;
      } catch (err) {
        console.error('📡 Database Connection Error:', err);
        const msg = err instanceof Error ? err.message : 'Unknown database error';
        return jsonR({ error: 'Database connection failed', details: msg }, 500);
      }
    };

    // ── DB init — call once after deploy: GET /api/init ───────────────────────
    if (pathname === '/api/init' && method === 'GET') {
      const res = await query(sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      if (res instanceof Response) return res;

      await query(sql`CREATE TABLE IF NOT EXISTS monitors (
        id VARCHAR(20) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        interval_minutes INTEGER NOT NULL DEFAULT 14,
        last_ping TIMESTAMPTZ,
        ping_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        active BOOLEAN DEFAULT TRUE
      )`);
      return jsonR({ ok: true, message: 'Tables ready' });
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    if (pathname === '/api/stats' && method === 'GET') {
      const stats = await query(Promise.all([
        sql`SELECT COUNT(*) AS count FROM monitors WHERE active = true`,
        sql`SELECT SUM(ping_count) AS total FROM monitors`
      ]));
      if (stats instanceof Response) return stats;

      console.log('📊 Raw Stats from DB:', JSON.stringify(stats));

      const countRow = (stats[0] as any[])[0];
      const totalRow = (stats[1] as any[])[0];

      return jsonR({ 
        count: Number(countRow?.count ?? 0), 
        totalPings: Number(totalRow?.total ?? 0) 
      });
    }

    // ── List monitors by username ─────────────────────────────────────────────
    if (pathname === '/api/monitors' && method === 'GET') {
      const username = url.searchParams.get('username')?.trim().toLowerCase() ?? '';
      if (!validUsername(username)) return jsonR({ error: 'Invalid username' }, 400);

      const monitors = await sql`
        SELECT m.id, m.url, m.interval_minutes, m.last_ping, m.ping_count
        FROM monitors m
        JOIN users u ON u.id = m.user_id
        WHERE u.username = ${username} AND m.active = true
        ORDER BY m.created_at DESC
      `;
      return jsonR({ monitors });
    }

    // ── Add monitor ───────────────────────────────────────────────────────────
    if (pathname === '/api/monitors' && method === 'POST') {
      let body: { username?: string; url?: string; interval?: number };
      try { body = await request.json(); } catch { return jsonR({ error: 'Invalid JSON' }, 400); }

      const username = (body.username ?? '').trim().toLowerCase();
      if (!validUsername(username)) return jsonR({ error: 'Username: 3–30 chars, letters/numbers/underscore only.' }, 400);

      const parsedUrl = parseUrl(body.url ?? '');
      if (!parsedUrl) return jsonR({ error: 'Invalid or disallowed URL.' }, 400);

      const interval = Number(body.interval);
      if (!Number.isInteger(interval) || interval < 1 || interval > 60)
        return jsonR({ error: 'Interval must be 1–60 minutes.' }, 400);

      const userId = await getOrCreateUser(sql, username);

      const [{ cnt }] = await sql`SELECT COUNT(*) AS cnt FROM monitors WHERE user_id = ${userId} AND active = true` as { cnt: string }[];
      if (Number(cnt) >= 20) return jsonR({ error: 'Maximum 20 monitors per username.' }, 429);

      const dup = await sql`SELECT id FROM monitors WHERE user_id = ${userId} AND url = ${parsedUrl.href} AND active = true LIMIT 1`;
      if (dup.length) return jsonR({ error: 'This URL is already being monitored.' }, 409);

      const id = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
      await sql`INSERT INTO monitors (id, user_id, url, interval_minutes) VALUES (${id}, ${userId}, ${parsedUrl.href}, ${interval})`;
      return jsonR({ ok: true, id });
    }

    // ── Remove monitor ────────────────────────────────────────────────────────
    if (pathname.startsWith('/api/monitors/') && method === 'DELETE') {
      const username = url.searchParams.get('username')?.trim().toLowerCase() ?? '';
      if (!validUsername(username)) return jsonR({ error: 'Invalid username' }, 400);

      const id = pathname.slice('/api/monitors/'.length);
      await sql`
        UPDATE monitors SET active = false
        WHERE id = ${id}
        AND user_id = (SELECT id FROM users WHERE username = ${username} LIMIT 1)
      `;
      return jsonR({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      console.log('⏰ Scheduled tick started...');
      const sql = neon(env.DATABASE_URL);
      
      try {
        const monitors = await sql`
          SELECT id, url, interval_minutes FROM monitors
          WHERE active = true
          AND (last_ping IS NULL OR last_ping < NOW() - (interval_minutes::text || ' minutes')::INTERVAL)
        ` as { id: string; url: string; interval_minutes: number }[];

        console.log(`🔍 Found ${monitors.length} monitors due for pinging.`);

        await Promise.allSettled(monitors.map(async m => {
          try {
            console.log(`📡 Pinging: ${m.url}`);
            const res = await fetch(m.url, {
              method: 'GET',
              headers: { 'User-Agent': 'WakeBot/1.0 (+https://wakebot.workers.dev)' },
              signal: AbortSignal.timeout(12_000),
            });
            
            console.log(`✅ ${m.url} responded with ${res.status}`);
            
            await sql`UPDATE monitors SET last_ping = NOW(), ping_count = ping_count + 1 WHERE id = ${m.id}`;
            console.log(`💾 Updated stats for ${m.url}`);
          } catch (err) {
            console.error(`❌ Failed to ping ${m.url}:`, err instanceof Error ? err.message : err);
          }
        }));
      } catch (err) {
        console.error('❌ Database error in scheduled task:', err);
      }
      console.log('🏁 Scheduled tick finished.');
    })());
  },
};
