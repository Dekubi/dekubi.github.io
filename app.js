import {
  STATUS_ORDER,
  STATUS_META,
  PLATFORMS,
  BUILDS,
  UPSCALERS,
  FRAME_GENS,
  INITIAL_GAMES,
  INITIAL_REPORTS,
  RELEASES_FALLBACK,
  makeCoverSvg,
} from './data.js';
import { renderMarkdown } from './markdown.js';

const STORAGE_KEY = 'dekubi_community_reports_v1';
const NOTICE_KEY = 'dekubi_notice_dismissed_v1';
const PAGE_SIZE = 10;

// --- State & Storage ---
function loadUserReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUserReport(report) {
  const existing = loadUserReports();
  existing.unshift(report);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// Live reports: short summaries the log relay reads from players' shared logs (docs/log_relay).
// Anyone can post to the relay, so every field is checked again here and all text is built from
// those checked values (render paths escape it too); nothing from the feed is used as Markdown.
const LIVE_REPORTS_URL = 'https://dekubi-logs.dekubi-ally.workers.dev/api/reports';
const KNOWN_SLUGS = { '0400486024DEC000': 'zelda-ocarina-of-time' };
let liveReports = [];

const SAFE_FEED_TEXT = /^[A-Za-z0-9 ._+\-\/,:'&]{1,90}$/;
function feedText(value) {
  const v = String(value ?? '').trim();
  return SAFE_FEED_TEXT.test(v) ? v : '';
}
function feedNum(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function liveToReport(s) {
  if (!s || typeof s !== 'object') return null;
  const titleId = /^[0-9A-F]{16}$/.test(String(s.titleId)) ? String(s.titleId) : '';
  const title = feedText(s.gameTitle);
  const build = /^v\d{1,2}(\.\d{1,3}){0,2}$/.test(String(s.build)) ? String(s.build) : '';
  const gpu = feedText(s.gpu);
  const nums = {
    frames: feedNum(s.frames, 1, 1e9), seconds: feedNum(s.seconds, 1, 1e7), avg: feedNum(s.avg, 0, 1000),
    low1: feedNum(s.low1, 0, 1000), low01: feedNum(s.low01, 0, 1000),
    longestMs: feedNum(s.longestMs, 0, 1e7), over100: feedNum(s.over100, 0, 1e7),
  };
  const at = Date.parse(String(s.at));
  if (!titleId || !title || !build || !gpu || Object.values(nums).some((v) => v === null) || !Number.isFinite(at)) {
    return null;
  }
  const os = s.platform === 'linux' ? 'linux' : 'windows';
  const handheldApu = /\bZ[12]\b|Z1 Extreme|Z2 (Go|Extreme)|PHOENIX/i.test(gpu);
  const platform = /VANGOGH|Custom GPU 0405|Steam Deck/i.test(gpu) ? 'steam-deck'
                 : handheldApu ? (os === 'linux' ? 'linux' : 'rog-ally')
                 : os === 'linux' ? 'linux-pc' : 'windows';
  const driver = feedText(s.driver);
  const settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
  const settingText = Object.entries(settings)
    .filter(([k, v]) => /^[a-z0-9_]{1,32}$/.test(k) && /^[A-Za-z0-9_.]{1,24}$/.test(String(v)))
    .slice(0, 10)
    .map(([k, v]) => `\`${k}: ${v}\``)
    .join(', ');
  const slug = KNOWN_SLUGS[titleId] ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || titleId.toLowerCase();
  const fps = (n) => n.toFixed(1);
  return {
    id: /^live-[a-z0-9-]{4,40}$/.test(String(s.id)) ? String(s.id) : `live-${titleId}-${at}`,
    gameSlug: slug,
    gameTitle: title,
    status: nums.avg >= 25 ? 'Playable' : 'Runs',
    build,
    gameVersion: titleId,
    platform,
    gpu,
    vram: feedNum(s.ramGb, 1, 512) ? `${feedNum(s.ramGb, 1, 512)} GB RAM` : '—',
    api: 'Vulkan',
    upscaler: '—',
    upscalerQuality: '—',
    frameGen: '—',
    os: os === 'linux' ? 'Linux' : 'Windows',
    driver: driver || '—',
    author: 'Shared log (automatic)',
    verified: false,
    live: true,
    hoursAgo: Math.max(0, (Date.now() - at) / 3.6e6),
    summary: `${nums.frames.toLocaleString('en-US')} frames in ${nums.seconds} s — ${fps(nums.avg)} fps avg, 1% low ${fps(nums.low1)} fps, ${nums.over100} frames >100 ms.`,
    whatHappened: `- **Run summary:** \`${nums.frames} frames\` in \`${nums.seconds} s\`\n` +
      `- **Average FPS:** \`${fps(nums.avg)} fps\`\n` +
      `- **1% / 0.1% low:** \`${fps(nums.low1)} fps\` / \`${fps(nums.low01)} fps\`\n` +
      `- **Frames >100 ms:** \`${nums.over100}\` (longest frame \`${nums.longestMs} ms\`)\n` +
      `- **Source:** a player's shared log, read automatically (not checked by hand)`,
    howFar: `${nums.seconds} s session.`,
    settings: settingText || '—',
  };
}

async function loadLiveReports() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const reply = await fetch(LIVE_REPORTS_URL, { signal: controller.signal, credentials: 'omit' });
    clearTimeout(timer);
    if (!reply.ok) return;
    const data = await reply.json();
    if (!Array.isArray(data)) return;
    liveReports = data.slice(0, 150).map(liveToReport).filter(Boolean);
    if (liveReports.length) render();
  } catch {
    // Offline or the relay is down: the built-in reports still show.
  }
}

function getAllReports() {
  return [...loadUserReports(), ...liveReports, ...INITIAL_REPORTS];
}

function getGamesWithStats() {
  const reports = getAllReports();
  const byGame = new Map();
  for (const r of reports) {
    if (!byGame.has(r.gameSlug)) byGame.set(r.gameSlug, []);
    byGame.get(r.gameSlug).push(r);
  }

  // Include any custom games submitted by users
  const knownSlugs = new Set(INITIAL_GAMES.map((g) => g.slug));
  const customGames = [];
  let liveGames = 0;
  for (const r of reports) {
    if (!knownSlugs.has(r.gameSlug) && (!r.live || liveGames++ < 12)) {
      knownSlugs.add(r.gameSlug);
      const title = r.gameTitle || r.gameSlug;
      customGames.push({
        slug: r.gameSlug,
        title,
        publisher: 'Community submitted',
        version: r.gameVersion || '—',
        genre: 'Game',
        palette: ['#134e38', '#091f1a'],
        tag: r.status.toUpperCase(),
        recommended: r.settings || 'See community reports below.',
        cover: makeCoverSvg(title, r.status.toUpperCase(), '#134e38', '#091f1a'),
      });
    }
  }

  const allBaseGames = [...customGames, ...INITIAL_GAMES];

  return allBaseGames.map((game) => {
    const gameReports = byGame.get(game.slug) || [];
    const status = computeMedianStatus(gameReports, 'Untested');
    const latestReport = gameReports.slice().sort((a, b) => a.hoursAgo - b.hoursAgo)[0] || null;
    const bestReport = gameReports
      .slice()
      .sort((a, b) => STATUS_META[b.status].rank - STATUS_META[a.status].rank)[0] || null;

    // Derive last-8-builds heatmap strictly from real reports for each build
    const buildHistory = BUILDS.map((b) => {
      const bReps = gameReports.filter((r) => r.build === b);
      return computeMedianStatus(bReps, 'Untested');
    });

    return {
      ...game,
      version: latestReport?.gameVersion || game.version,
      buildHistory,
      status,
      reportCount: gameReports.length,
      reports: gameReports,
      latestHoursAgo: latestReport ? latestReport.hoursAgo : Infinity,
      latestPlatform: bestReport ? platformLabel(bestReport.platform) : '—',
      bestSetup: bestReport
        ? `${platformShort(bestReport.platform)} · ${bestReport.upscaler}`
        : '—',
    };
  });
}

function computeMedianStatus(reports, fallback = 'Untested') {
  if (!reports || reports.length === 0) return fallback || 'Untested';
  const sorted = reports
    .map((r) => STATUS_META[r.status]?.rank ?? 0)
    .sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return STATUS_ORDER.find((s) => STATUS_META[s].rank === mid) || 'Playable';
}

function platformLabel(id) {
  return PLATFORMS.find((p) => p.id === id)?.label || id;
}

function platformShort(id) {
  return PLATFORMS.find((p) => p.id === id)?.short || id;
}

function formatAgo(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusPillHtml(status) {
  const color = STATUS_META[status]?.color || '#575761';
  return `<span class="status-pill" style="--tone:${color}"><span class="status-square"></span>${esc(status)}</span>`;
}

function renderStatusTrack(counts, total, compact = false) {
  if (!total) {
    return `<div class="status-track ${compact ? 'compact' : ''}"><div class="status-seg" style="width:100%;background:#575761"></div></div>`;
  }
  const segs = STATUS_ORDER.filter((s) => (counts[s] || 0) > 0)
    .map((s) => {
      const pct = ((counts[s] / total) * 100).toFixed(2);
      return `<div class="status-seg" title="${s}: ${counts[s]}" style="width:${pct}%;background:${STATUS_META[s].color}"></div>`;
    })
    .join('');
  return `<div class="status-track ${compact ? 'compact' : ''}">${segs}</div>`;
}

// --- Routing & Query Helpers ---
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : '/' + pathPart;
  const params = new URLSearchParams(queryPart || '');
  return { path, params };
}

function navigate(path, paramsObj = null) {
  let target = path;
  if (paramsObj) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(paramsObj)) {
      if (v !== '' && v !== null && v !== undefined && v !== 1) p.set(k, String(v));
    }
    const qs = p.toString();
    if (qs) target += '?' + qs;
  }
  location.hash = '#' + target;
}

function updateNavActive(path) {
  const links = document.querySelectorAll('.site-nav a');
  links.forEach((a) => {
    const key = a.dataset.nav;
    const isActive =
      (key === 'home' && (path === '/' || path.startsWith('/games'))) ||
      (key === 'reports' && path.startsWith('/reports')) ||
      (key === 'guide' && path.startsWith('/guide')) ||
      (key === 'changelog' && path.startsWith('/changelog')) ||
      (key === 'downloads' && path.startsWith('/downloads'));
    a.classList.toggle('active', isActive);
  });
}

// --- View: Home / Overview (Original Dekubi Ally layout) ---
function renderHome(params) {
  const games = getGamesWithStats();
  const reports = getAllReports();
  const gameMap = new Map(games.map((g) => [g.slug, g]));

  // Platform breakdown
  const platformStats = PLATFORMS.map((p) => {
    const pReports = reports.filter((r) => r.platform === p.id);
    const good = pReports.filter((r) => r.status === 'Perfect' || r.status === 'Playable').length;
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    for (const r of pReports) counts[r.status]++;
    return {
      ...p,
      total: pReports.length,
      good,
      pct: pReports.length ? Math.round((good / pReports.length) * 100) : null,
      median: computeMedianStatus(pReports, 'Untested'),
      counts,
    };
  });

  // Filters from URL params
  const q = (params.get('q') || '').trim();
  const platformFilter = params.get('platform') || '';
  const statusFilter = params.get('status') || '';
  const upscalerFilter = params.get('upscaler') || '';
  const viewMode = params.get('view') === 'table' ? 'table' : 'cards';

  const filtered = games.filter((g) => {
    if (q) {
      const hay = `${g.title} ${g.publisher} ${g.genre} ${g.tag}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (statusFilter && g.status !== statusFilter) return false;
    if (platformFilter && !g.reports.some((r) => r.platform === platformFilter)) return false;
    if (upscalerFilter && !g.reports.some((r) => r.upscaler === upscalerFilter)) return false;
    return true;
  });

  filtered.sort((a, b) => b.reportCount - a.reportCount || STATUS_META[b.status].rank - STATUS_META[a.status].rank);

  // Proven runs on the home page: hand-checked reports only (live ones are on the Reports page).
  const latestReports = reports.filter((r) => r.verified).sort((a, b) => a.hoursAgo - b.hoursAgo).slice(0, 6);
  const hasActiveFilters = Boolean(q || platformFilter || statusFilter || upscalerFilter);

  return `
    <div class="container">
      <section class="dekubi-hero">
        <div>
          <div class="hero-badge">
            <span class="pulse-dot"></span>
            <span>v3.0.3 OUT &middot; FORK OF LICHII &amp; FRITCHII</span>
          </div>
          <h1 class="hero-title">Handheld-first.<br /><span>Proven</span> in logs.</h1>
          <p class="hero-lead">
            <strong>Dekubi Ally</strong> is an open-source fork of <strong>Lichii</strong> and <strong>Fritchii</strong>
            (v6.5 core), compiled with Clang 22 <code>x86-64-v3</code> and tuned for
            <strong>ROG Ally Z1 Extreme</strong>, Steam Deck, Legion Go and MSI Claw, and it runs just as well on
            <strong>Windows and Linux desktops and laptops</strong> with NVIDIA, AMD or Intel graphics, down to
            4&nbsp;GB VRAM / 8&nbsp;GB RAM.
          </p>
          <div class="hero-cta-row">
            <a href="#/downloads" class="button primary">Downloads &amp; Releases</a>
            <a href="#/changelog" class="button">What's new in v3.0.3</a>
            <a href="#/submit" class="button ghost">Submit a log report</a>
          </div>
        </div>

        <aside class="overlay-card" aria-label="Proven benchmark highlights from Dekubi logs">
          <div class="overlay-head">
            <span class="overlay-title">Dekubi Overlay &middot; Proven Log Runs</span>
            <span class="mono-tag">Ocarina of Time</span>
          </div>
          <div class="overlay-rows">
            <a href="#/reports/log-2026-11-23-121325" class="overlay-row">
              <div>
                <div class="overlay-hw">NVIDIA GeForce RTX 5060</div>
                <div class="overlay-sub">Win 11 &middot; 1440p DLSS Quality &middot; 26,623 frames</div>
              </div>
              <div class="overlay-fps">
                <strong>128.5 FPS</strong>
                <span>1% low 34.8 &middot; 99.95%</span>
              </div>
            </a>
            <a href="#/reports/log-2026-11-24-131554" class="overlay-row">
              <div>
                <div class="overlay-hw">ROG Ally Z1E (Linux RADV)</div>
                <div class="overlay-sub">Mesa 26.3.1 &middot; 540p&rarr;720p FSR &middot; v2.0.6</div>
              </div>
              <div class="overlay-fps">
                <strong>66.1 FPS</strong>
                <span>1% low 21.7 &middot; 4 GB UMA</span>
              </div>
            </a>
            <a href="#/reports/log-2026-11-24-084955" class="overlay-row">
              <div>
                <div class="overlay-hw">ROG Ally Z1E (Windows 11)</div>
                <div class="overlay-sub">AMD LLPC &middot; 540p&rarr;1080p FSR &middot; 438 s run</div>
              </div>
              <div class="overlay-fps">
                <strong>47.6 FPS</strong>
                <span>1% low 11.4 &middot; 0 crashes</span>
              </div>
            </a>
          </div>
          <div class="overlay-foot">
            <span>${reports.length} log-verified runs tracked</span>
            <a href="#/reports">All benchmarks &rarr;</a>
          </div>
        </aside>
      </section>

      <section class="bento-strip">
        <div class="bento-card">
          <span class="eyebrow">CORE ENGINE</span>
          <h3>Fritchii v6.5 + Clang v3</h3>
          <p>Decoupled OneFollower / E-Split GPU pipeline, shared Dynarmic JIT, and AVX2/FMA/BMI2 builds.</p>
        </div>
        <div class="bento-card">
          <span class="eyebrow">UPSCALING &amp; FG</span>
          <h3>Multi-Vendor Suite</h3>
          <p>Native XeSS 3.0.2, PSSR (FSR 4 INT8), AMD FSR 4, DLSS 4/5 NR, plus XeSS-FG, FSR 3.1, DLSS-G &amp; LSFG.</p>
        </div>
        <div class="bento-card">
          <span class="eyebrow">ZERO STUTTER</span>
          <h3>120k Shader Recipe</h3>
          <p>Precompiles ~120,000 Ocarina of Time shaders ahead of time (by Frizti) with background SCSKiller.</p>
        </div>
        <div class="bento-card">
          <span class="eyebrow">HANDHELDS &amp; PCS</span>
          <h3>Tuned per device</h3>
          <p>Handhelds get tighter GPU memory packing, a 30 FPS battery saver on unplug and a 45 s GPU watchdog; desktops and laptops keep full memory and frame rates, with DLSS, FSR and XeSS upscaling.</p>
        </div>
      </section>

      <section class="section-block" id="games-database">
        <div class="section-head">
          <div>
            <span class="eyebrow">COMPATIBILITY CATALOG</span>
            <h2>Tracked titles</h2>
          </div>
          <div class="view-switch" role="group" aria-label="Switch layout view">
            <button type="button" class="view-btn ${viewMode === 'cards' ? 'active' : ''}" data-view="cards">Cards</button>
            <button type="button" class="view-btn ${viewMode === 'table' ? 'active' : ''}" data-view="table">Table</button>
          </div>
        </div>

        <div class="toolbar">
          <div class="search-inline">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="color:var(--text-muted);flex-shrink:0">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.8"/>
              <path d="M14 14l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <input id="catalog-search" type="search" value="${esc(q)}" placeholder="Search titles..." aria-label="Search games" />
            <kbd>/</kbd>
          </div>

          <div class="platform-toggles" role="group" aria-label="Filter by device">
            ${PLATFORMS.slice(0, 4).map((p) => `
              <button type="button" class="chip-toggle" data-chip-platform="${p.id}" aria-pressed="${platformFilter === p.id ? 'true' : 'false'}">
                ${esc(p.short)}
              </button>
            `).join('')}
          </div>

          <select id="filter-status" class="filter-select" aria-label="Filter by status">
            <option value="">Status: All</option>
            ${STATUS_ORDER.map((s) => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <select id="filter-upscaler" class="filter-select" aria-label="Filter by upscaler">
            <option value="">Upscaler: All</option>
            ${UPSCALERS.map((u) => `<option value="${esc(u)}" ${upscalerFilter === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}
          </select>

          ${hasActiveFilters ? `<button type="button" id="clear-filters" class="filter-clear">Reset</button>` : ''}
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <p style="margin:0 0 12px;color:var(--text)">No games match your current filters.</p>
            <button type="button" id="clear-filters-empty" class="button">Clear filters</button>
          </div>
        ` : viewMode === 'cards' ? `
          <div class="game-card-grid">
            ${filtered.map((g) => `
              <a href="#/games/${encodeURIComponent(g.slug)}" class="game-card">
                <div class="game-card-media">
                  <img src="${g.cover}" alt="${esc(g.title)}" loading="lazy" />
                  <div class="game-card-status">${statusPillHtml(g.status)}</div>
                </div>
                <div class="game-card-body">
                  <div class="game-card-title">${esc(g.title)}</div>
                  <div class="game-card-meta">${esc(g.publisher)} &middot; ${esc(g.genre)}</div>
                  <div class="game-card-foot">
                    <span>${g.reportCount} ${g.reportCount === 1 ? 'log run' : 'log runs'}</span>
                    <span>${g.reportCount ? esc(g.bestSetup) : 'Untested'}</span>
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        ` : `
          <div class="table-wrap">
            <table class="game-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Status</th>
                  <th>Last 8 builds</th>
                  <th>Logs</th>
                  <th>Best setup</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map((g) => `
                  <tr>
                    <td>
                      <a href="#/games/${encodeURIComponent(g.slug)}" class="game-cell">
                        <img class="cover-thumb" src="${g.cover}" alt="" loading="lazy" />
                        <div>
                          <div style="font-weight:700">${esc(g.title)}</div>
                          <div style="font-size:12px;color:var(--text-muted)">${esc(g.publisher)}</div>
                        </div>
                      </a>
                    </td>
                    <td>${statusPillHtml(g.status)}</td>
                    <td>
                      <div class="build-strip">
                        ${g.buildHistory.map((st, idx) => {
                          const c = STATUS_META[st]?.color || '#52635d';
                          const filled = st !== 'Untested';
                          return `<span class="strip-cell ${filled ? 'filled' : ''}" title="${BUILDS[idx] || 'Build'}: ${st}" style="${filled ? `background:${c}` : ''}"></span>`;
                        }).join('')}
                      </div>
                    </td>
                    <td class="mono">${g.reportCount}</td>
                    <td class="mono" style="font-size:12px;color:var(--text-body)">${esc(g.bestSetup)}</td>
                    <td style="text-align:right"><a href="#/submit?game=${encodeURIComponent(g.slug)}">Report</a></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <span class="eyebrow">PROVEN TELEMETRY</span>
            <h2>Verified log runs</h2>
          </div>
          <a href="#/reports">View all ${reports.length} runs &rarr;</a>
        </div>

        ${latestReports.length === 0 ? `
          <div class="empty-state">
            <p style="margin:0 0 14px;color:var(--text)">No reports submitted yet.</p>
            <a href="#/submit" class="button primary">Submit the first report</a>
          </div>
        ` : `
          <div class="telemetry-grid">
            ${latestReports.map((r) => {
              const g = gameMap.get(r.gameSlug);
              return `
                <a href="#/reports/${encodeURIComponent(r.id)}" class="telemetry-card">
                  <div class="telemetry-top">
                    <span class="telemetry-title">${esc(g?.title || r.gameSlug)}</span>
                    ${statusPillHtml(r.status)}
                  </div>
                  <p class="telemetry-summary">${esc(r.summary)}</p>
                  <div class="tag-row">
                    <span class="mono-tag" style="color:var(--eyebrow)">${esc(r.build)}</span>
                    <span class="mono-tag">${esc(platformLabel(r.platform))}</span>
                    <span class="mono-tag">${esc(r.upscaler)} &middot; ${esc(r.upscalerQuality)}</span>
                    <span class="mono-tag">${esc(r.driver)}</span>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <span class="eyebrow">HARDWARE COVERAGE</span>
            <h2>Results by device</h2>
          </div>
        </div>
        <div class="device-grid">
          ${platformStats.map((p) => `
            <button type="button" class="device-card" data-filter-platform="${p.id}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <strong style="font-family:var(--font-display);font-size:15.5px">${esc(p.label)}</strong>
                <span class="mono" style="font-size:12px;color:var(--eyebrow)">${p.pct !== null ? `${p.pct}% playable` : 'No logs yet'}</span>
              </div>
              ${renderStatusTrack(p.counts, p.total, true)}
              <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted)">
                <span>Median: ${p.median}</span>
                <span>${p.total} ${p.total === 1 ? 'log' : 'logs'}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="contribute-banner">
        <div>
          <span class="eyebrow">OPEN TELEMETRY</span>
          <h3>Have a Dekubi Ally session log?</h3>
          <p>Drop your local <code>user/log/eden_log.txt</code> into the report form — it parses hardware, driver, and build info right in your browser without uploading your file.</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a href="#/submit" class="button primary">Submit a report</a>
          <a href="#/guide" class="button">Read 6-step guide</a>
        </div>
      </section>
    </div>
  `;
}

// --- View: Recent Reports ---
function renderReports(params) {
  const games = getGamesWithStats();
  const gameMap = new Map(games.map((g) => [g.slug, g]));
  const allReports = getAllReports().slice().sort((a, b) => a.hoursAgo - b.hoursAgo);

  const platformFilter = params.get('platform') || '';
  const statusFilter = params.get('status') || '';
  const q = (params.get('q') || '').trim();

  const filtered = allReports.filter((r) => {
    const g = gameMap.get(r.gameSlug);
    if (platformFilter && r.platform !== platformFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (q) {
      const hay = `${g?.title || ''} ${r.summary} ${r.gpu} ${r.upscaler} ${r.frameGen} ${r.build}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const playablePct = allReports.length
    ? Math.round((allReports.filter((r) => r.status === 'Perfect' || r.status === 'Playable').length / allReports.length) * 100)
    : 0;

  return `
    <div class="container">
      <div class="page-header">
        <span class="eyebrow">COMMUNITY FEED</span>
        <h1>Recent reports</h1>
        <p>Every test submitted for Dekubi Ally: handhelds (ROG Ally Z1 Extreme, Steam Deck, Legion Go, MSI Claw) and Windows and Linux desktops and laptops.</p>
        <div class="inline-stats">
          <div><div class="inline-stat-val">${allReports.length}</div><div class="inline-stat-lbl">Total reports</div></div>
          <div><div class="inline-stat-val">${allReports.length ? `${playablePct}%` : '—'}</div><div class="inline-stat-lbl">Playable or Perfect</div></div>
          <div><div class="inline-stat-val">${BUILDS[0]}</div><div class="inline-stat-lbl">Latest build</div></div>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-inline">
          <input id="reports-search" type="search" value="${esc(q)}" placeholder="Filter benchmarks by game, GPU, driver, or notes..." />
          <span class="mono" style="font-size:12px;color:var(--text-muted)">${filtered.length} shown</span>
        </div>
        <div class="platform-toggles">
          ${PLATFORMS.slice(0, 4).map((p) => `
            <button type="button" class="chip-toggle" data-rep-platform="${p.id}" aria-pressed="${platformFilter === p.id ? 'true' : 'false'}">${esc(p.short)}</button>
          `).join('')}
        </div>
        <select id="rep-status" class="filter-select">
          <option value="">Status: All</option>
          ${STATUS_ORDER.filter((s) => s !== 'Untested').map((s) => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>

      ${filtered.length === 0 ? `
        <div class="empty-state">
          <p style="margin:0 0 14px;color:var(--text)">No reports match your filters.</p>
          <a href="#/submit" class="button primary">Submit a report</a>
        </div>
      ` : `
        <div class="telemetry-grid">
          ${filtered.map((r) => {
            const g = gameMap.get(r.gameSlug);
            return `
              <a href="#/reports/${encodeURIComponent(r.id)}" class="telemetry-card">
                <div class="telemetry-top">
                  <span class="telemetry-title">${esc(g?.title || r.gameSlug)}</span>
                  ${statusPillHtml(r.status)}
                </div>
                <p class="telemetry-summary">${esc(r.summary)}</p>
                <div class="tag-row">
                  <span class="mono-tag" style="color:var(--eyebrow)">${esc(r.build)}</span>
                  <span class="mono-tag">${esc(platformLabel(r.platform))}</span>
                  <span class="mono-tag">${esc(r.upscaler)} (${esc(r.upscalerQuality)})</span>
                  <span class="mono-tag">${esc(r.driver)}</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

// --- View: Report Detail ---
function renderReportDetail(reportId) {
  const reports = getAllReports();
  const r = reports.find((x) => x.id === reportId);
  if (!r) {
    return `<div class="container" style="padding-top:48px"><div class="empty-state">Report not found. <a href="#/reports">Back to reports</a></div></div>`;
  }
  const game = getGamesWithStats().find((g) => g.slug === r.gameSlug);
  const tone = STATUS_META[r.status]?.color || '#575761';

  return `
    <div class="container">
      <div class="breadcrumb">
        <a href="#/">Games</a> <span>/</span>
        <a href="#/games/${encodeURIComponent(r.gameSlug)}">${esc(game?.title || r.gameSlug)}</a> <span>/</span>
        <span>${esc(r.id)}</span>
      </div>

      <div class="page-header" style="padding-top:8px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          ${statusPillHtml(r.status)}
          <span class="mono-tag">${esc(r.build)}</span>
          <span class="mono-tag" style="${r.verified ? 'border-color:var(--safe-border);color:var(--safe-text);background:var(--safe-bg)' : ''}">
            ${r.verified ? 'Community report · verified' : 'Community report · not reviewed'}
          </span>
        </div>
        <h1>${esc(game?.title || r.gameSlug)}</h1>
        <p style="margin-top:8px">
          Reported by <strong style="color:var(--text)">${esc(r.author)}</strong> &middot; ${formatAgo(r.hoursAgo)} &middot; Game ${esc(r.gameVersion)}
        </p>
      </div>

      <div class="detail-grid">
        <div>
          <div class="panel" style="border-left:3px solid ${tone};margin-bottom:24px">
            <div class="eyebrow" style="margin-bottom:6px">SUMMARY</div>
            <p style="margin:0;font-size:18px;font-weight:600;color:var(--text)">${esc(r.summary)}</p>
          </div>

          <div class="prose-section">
            <h3>What happened</h3>
            ${renderMarkdown(r.whatHappened)}
          </div>

          <div class="prose-section">
            <h3>How far they got</h3>
            <p>${esc(r.howFar)}</p>
          </div>

          <div class="prose-section">
            <h3>Dekubi Ally settings &amp; tweaks</h3>
            ${renderMarkdown(r.settings)}
          </div>
        </div>

        <aside class="sticky-col">
          <div class="panel">
            <span class="eyebrow">HARDWARE &amp; CONFIG</span>
            <h3 style="margin:6px 0 16px;font-size:18px">Tested on this setup</h3>
            <dl class="spec-dl">
              <div class="spec-row"><dt>Device</dt><dd>${esc(platformLabel(r.platform))}</dd></div>
              <div class="spec-row"><dt>Dekubi build</dt><dd>${esc(r.build)}</dd></div>
              <div class="spec-row"><dt>GPU</dt><dd>${esc(r.gpu)}</dd></div>
              <div class="spec-row"><dt>VRAM / UMA</dt><dd>${esc(r.vram)}</dd></div>
              <div class="spec-row"><dt>Graphics API</dt><dd>${esc(r.api)}</dd></div>
              <div class="spec-row"><dt>Upscaler</dt><dd>${esc(r.upscaler)}</dd></div>
              <div class="spec-row"><dt>Upscaler quality</dt><dd>${esc(r.upscalerQuality)}</dd></div>
              <div class="spec-row"><dt>Frame Gen</dt><dd>${esc(r.frameGen)}</dd></div>
              <div class="spec-row"><dt>OS</dt><dd>${esc(r.os)}</dd></div>
              <div class="spec-row"><dt>Driver</dt><dd>${esc(r.driver)}</dd></div>
            </dl>
          </div>

          <a href="#/submit?game=${encodeURIComponent(r.gameSlug)}" class="button primary full">Submit your own report for this game</a>
        </aside>
      </div>
    </div>
  `;
}

// --- View: Game Detail ---
function renderGameDetail(slug) {
  const game = getGamesWithStats().find((g) => g.slug === slug);
  if (!game) {
    return `<div class="container" style="padding-top:48px"><div class="empty-state">Game not found. <a href="#/">Back to catalog</a></div></div>`;
  }

  return `
    <div class="container">
      <div class="breadcrumb">
        <a href="#/">Games</a> <span>/</span> <span>${esc(game.title)}</span>
      </div>

      <section class="game-hero">
        <div class="game-hero-bg" style="background-image:url('${game.cover}')"></div>
        <div class="hero-shade"></div>
        <div class="game-hero-inner">
          <img class="cover-large" src="${game.cover}" alt="${esc(game.title)} cover" />
          <div class="game-hero-meta">
            <span class="eyebrow">${esc(game.publisher)} &middot; ${esc(game.genre)}</span>
            <h1>${esc(game.title)}</h1>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
              ${statusPillHtml(game.status)}
              <span class="mono-tag">Version ${esc(game.version)}</span>
              <span class="mono-tag">${game.reportCount} community ${game.reportCount === 1 ? 'report' : 'reports'}</span>
            </div>
            <div class="game-hero-tags">
              <span class="mono-tag" style="color:var(--eyebrow)">${esc(game.tag)}</span>
            </div>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <div>
          <div class="section-head" style="margin-top:0">
            <h2>Build history (last 8 builds)</h2>
            <span class="mono" style="font-size:12px;color:var(--text-muted)">Newest left</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:32px">
            ${game.buildHistory.map((st, idx) => `
              <div style="background:var(--surface-1);border:1px solid var(--border);border-radius:8px;padding:10px 12px;min-width:110px">
                <div class="mono" style="font-size:11.5px;color:var(--text-muted);margin-bottom:4px">${BUILDS[idx] || 'Build'}</div>
                ${statusPillHtml(st)}
              </div>
            `).join('')}
          </div>

          <div class="section-head">
            <h2>Community reports (${game.reports.length})</h2>
            <a href="#/submit?game=${encodeURIComponent(game.slug)}">Add report &rarr;</a>
          </div>

          ${game.reports.length === 0 ? `
            <div class="empty-state">
              No reports yet for ${esc(game.title)}. Be the first to test it on Dekubi Ally!
            </div>
          ` : `
            <div class="report-list">
              ${game.reports.map((r) => `
                <a href="#/reports/${encodeURIComponent(r.id)}" class="telemetry-card">
                  <div class="telemetry-top">
                    ${statusPillHtml(r.status)}
                    <span class="mono" style="font-size:12px;color:var(--text-muted)">${esc(r.author)} &middot; ${formatAgo(r.hoursAgo)}</span>
                  </div>
                  <p class="telemetry-summary">${esc(r.summary)}</p>
                  <div class="tag-row">
                    <span class="mono-tag" style="color:var(--eyebrow)">${esc(r.build)}</span>
                    <span class="mono-tag">${esc(platformLabel(r.platform))}</span>
                    <span class="mono-tag">${esc(r.upscaler)}</span>
                    <span class="mono-tag">${esc(r.driver)}</span>
                  </div>
                </a>
              `).join('')}
            </div>
          `}
        </div>

        <aside class="sticky-col">
          <div class="panel">
            <span class="eyebrow">RECOMMENDED DEKUBI SETUP</span>
            <h3 style="margin:6px 0 10px;font-size:18px">Suggested baseline</h3>
            <p style="margin:0 0 18px;color:var(--text-body);font-size:14.5px">${esc(game.recommended)}</p>
            <a href="#/submit?game=${encodeURIComponent(game.slug)}" class="button primary full">Submit a report</a>
          </div>

          <div class="panel">
            <span class="eyebrow">ABOUT THE GAME</span>
            <dl class="spec-dl" style="margin-top:12px">
              <div class="spec-row"><dt>Publisher</dt><dd>${esc(game.publisher)}</dd></div>
              <div class="spec-row"><dt>Genre</dt><dd>${esc(game.genre)}</dd></div>
              <div class="spec-row"><dt>Latest version</dt><dd>${esc(game.version)}</dd></div>
              <div class="spec-row"><dt>Best result on</dt><dd>${esc(game.bestSetup)}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  `;
}

// --- View: Submit a Report (8-step form matching lichii.zortos.me) ---
function renderSubmit(params) {
  const preselectedSlug = params.get('game') || INITIAL_GAMES[0].slug;

  return `
    <div class="container">
      <div class="page-header">
        <span class="eyebrow">SUBMIT A REPORT</span>
        <h1>How did it run on Dekubi Ally?</h1>
        <p>Drop your local <code>user/log/eden_log.txt</code> to auto-fill hardware details, or enter your setup manually. Submissions appear live in your browser right away.</p>
      </div>

      <div class="detail-grid">
        <form id="submit-report-form" novalidate>
          <div class="form-step">
            <div class="step-num">01</div>
            <div class="step-body">
              <h3>Game &amp; version</h3>
              <p class="step-hint">Pick the title you tested and the game update version.</p>
              <div class="field-grid">
                <div class="field">
                  <label for="f-game">Game</label>
                  <select id="f-game" name="gameSlug">
                    ${INITIAL_GAMES.map((g) => `<option value="${esc(g.slug)}" ${g.slug === preselectedSlug ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}
                    <option value="__custom__">Other (enter custom title below)</option>
                  </select>
                </div>
                <div class="field">
                  <label for="f-gamever">Game version</label>
                  <input id="f-gamever" name="gameVersion" type="text" value="v1.0.0" placeholder="e.g. v1.2.1" required />
                </div>
              </div>
              <div class="field" id="custom-game-wrap" style="display:none;margin-top:12px">
                <label for="f-custom-title">Custom game title</label>
                <input id="f-custom-title" name="customGameTitle" type="text" placeholder="e.g. Metroid Prime Remastered" />
              </div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">02</div>
            <div class="step-body">
              <h3>Parse your Dekubi Ally log (optional)</h3>
              <p class="step-hint">Drop <code>user/log/eden_log.txt</code> here. It is parsed locally in your browser and never uploaded.</p>
              <label class="upload-box" id="log-dropzone" for="f-logfile">
                <input id="f-logfile" type="file" accept=".txt,.log" />
                <div style="font-weight:700;margin-bottom:4px">Drop <code>eden_log.txt</code> here or click to browse</div>
                <div style="font-size:13px;color:var(--text-muted)">Extracts Dekubi build, GPU, Vulkan driver &amp; OS automatically</div>
              </label>
              <div id="log-detected" class="detected-panel" style="display:none;margin-top:14px"></div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">03</div>
            <div class="step-body">
              <h3>Device &amp; hardware</h3>
              <p class="step-hint">Tell other players what you tested on: handheld, desktop or laptop.</p>
              <div class="field-grid">
                <div class="field">
                  <label for="f-platform">Device / Platform</label>
                  <select id="f-platform" name="platform">
                    ${PLATFORMS.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label for="f-build">Dekubi Ally build</label>
                  <select id="f-build" name="build">
                    ${BUILDS.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label for="f-gpu">GPU</label>
                  <input id="f-gpu" name="gpu" type="text" value="AMD Radeon 780M (Z1E)" placeholder="e.g. AMD Radeon 780M, RTX 4060" />
                </div>
                <div class="field">
                  <label for="f-vram">VRAM / UMA</label>
                  <input id="f-vram" name="vram" type="text" value="6 GB UMA" placeholder="e.g. 4 GB UMA, 8 GB GDDR6" />
                </div>
                <div class="field">
                  <label for="f-os">OS</label>
                  <input id="f-os" name="os" type="text" value="Windows 11 24H2" />
                </div>
                <div class="field">
                  <label for="f-driver">GPU Driver</label>
                  <input id="f-driver" name="driver" type="text" value="Adrenalin 25.10.2" />
                </div>
              </div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">04</div>
            <div class="step-body">
              <h3>Graphics API, Upscaler &amp; Frame Gen</h3>
              <p class="step-hint">Select your Dekubi Ally rendering and frame generation settings.</p>
              <div class="pill-radios" style="margin-bottom:14px">
                <label class="pill-radio"><input type="radio" name="api" value="Vulkan" checked /> Vulkan</label>
                <label class="pill-radio"><input type="radio" name="api" value="OpenGL" /> OpenGL</label>
              </div>
              <div class="field-grid">
                <div class="field">
                  <label for="f-upscaler">Upscaler</label>
                  <select id="f-upscaler" name="upscaler">
                    ${UPSCALERS.map((u) => `<option value="${esc(u)}">${esc(u)}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label for="f-quality">Upscaler quality</label>
                  <select id="f-quality" name="upscalerQuality">
                    <option value="Native">Native</option>
                    <option value="Quality" selected>Quality</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Performance">Performance</option>
                    <option value="Ultra Performance">Ultra Performance</option>
                  </select>
                </div>
                <div class="field">
                  <label for="f-fg">Frame Generation</label>
                  <select id="f-fg" name="frameGen">
                    ${FRAME_GENS.map((fg) => `<option value="${esc(fg)}">${esc(fg)}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">05</div>
            <div class="step-body">
              <h3>Dekubi Ally features used</h3>
              <p class="step-hint">Check any built-in Dekubi Ally features enabled during testing.</p>
              <div class="pill-radios">
                <label class="pill-radio"><input type="checkbox" name="feat" value="Device Tier Auto-Tune" checked /> Device Tier Auto-Tune</label>
                <label class="pill-radio"><input type="checkbox" name="feat" value="SCSKiller" checked /> SCSKiller</label>
                <label class="pill-radio"><input type="checkbox" name="feat" value="Mod Menu (F2)" /> Mod Menu (F2)</label>
                <label class="pill-radio"><input type="checkbox" name="feat" value="Borderless F11" /> Borderless F11</label>
                <label class="pill-radio"><input type="checkbox" name="feat" value="Dekubi Perf Overlay" /> Perf Overlay</label>
              </div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">06</div>
            <div class="step-body">
              <h3>Outcome rating</h3>
              <p class="step-hint">Pick the status that best reflects your session.</p>
              <div class="outcome-grid" id="outcome-grid">
                ${STATUS_ORDER.filter((s) => s !== 'Untested').map((s, idx) => `
                  <label class="outcome-card ${idx === 1 ? 'selected' : ''}" style="--tone:${STATUS_META[s].color}">
                    <input type="radio" name="status" value="${s}" ${idx === 1 ? 'checked' : ''} />
                    <span class="outcome-card-title">
                      <span class="status-square" style="background:${STATUS_META[s].color}"></span>
                      ${s}
                    </span>
                    <span class="outcome-card-desc">${esc(STATUS_META[s].desc)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="form-step">
            <div class="step-num">07</div>
            <div class="step-body">
              <h3>Summary &amp; notes</h3>
              <div class="field" style="margin-bottom:14px">
                <label for="f-summary">One-line headline</label>
                <input id="f-summary" name="summary" type="text" required placeholder="e.g. Locked 60 FPS on ROG Ally 18W with PSSR INT8 + FSR 3.1 FG" />
              </div>
              <div class="field" style="margin-bottom:14px">
                <div class="md-tabs">
                  <label for="f-what">What happened <span class="mono" style="font-size:11.5px;color:var(--text-muted)">(Markdown supported)</span></label>
                  <div class="md-tab-group">
                    <button type="button" class="md-tab active" data-md-mode="write">Write</button>
                    <button type="button" class="md-tab" data-md-mode="preview">Preview</button>
                  </div>
                </div>
                <textarea id="f-what" name="whatHappened" placeholder="Supports **bold**, \`code\`, - bullet lists, and [links](https://...)"></textarea>
                <div id="f-what-preview" class="md-preview-box" style="display:none"></div>
              </div>
              <div class="field">
                <label for="f-howfar">How far did you get?</label>
                <input id="f-howfar" name="howFar" type="text" placeholder="e.g. First 2 dungeons, 3 hours of gameplay" />
              </div>
            </div>
          </div>

          <div class="form-step" style="border-bottom:0">
            <div class="step-num">08</div>
            <div class="step-body">
              <h3>Your handle &amp; publish</h3>
              <div class="field-grid" style="align-items:end">
                <div class="field">
                  <label for="f-author">Handle (optional)</label>
                  <input id="f-author" name="author" type="text" placeholder="anonymous_ally" />
                </div>
                <button type="submit" class="button primary full" style="height:42px">Publish report</button>
              </div>
            </div>
          </div>
        </form>

        <aside class="sticky-col">
          <div class="detected-panel">
            <span class="eyebrow" style="color:var(--safe-text)">NEVER UPLOADED</span>
            <h4 style="margin-top:6px">Your report is public. Your log isn't.</h4>
            <p>
              When you drop <code>user/log/eden_log.txt</code>, JavaScript reads only the version, GPU, driver, and OS lines right in your browser. The file is never sent to any server.
            </p>
          </div>

          <div class="panel">
            <span class="eyebrow">BEFORE YOU SUBMIT</span>
            <h3 style="margin:6px 0 10px;font-size:18px">Quick checklist</h3>
            <ul class="checklist" style="margin-bottom:0">
              <li><span>Test on latest build</span><strong>${BUILDS[0]}</strong></li>
              <li><span>Include TDP / wattage</span><strong>e.g. 15W / 18W / 25W</strong></li>
              <li><span>No game files or keys</span><strong>Specs &amp; notes only</strong></li>
              <li><span>Need bug help?</span><a href="https://github.com/Dekubi/Dekubi-Ally/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `;
}

// --- View: How to Report (6-step desktop walkthrough matching /guide/desktop) ---
function renderGuide() {
  return `
    <div class="container">
      <div class="page-header">
        <span class="eyebrow">REPORTING GUIDE</span>
        <h1>Report from Dekubi Ally in six steps</h1>
        <p>How to grab your session log, verify your upscaler and frame gen settings, and submit a clean compatibility report.</p>
      </div>

      <div class="guide-grid">
        <nav class="toc" aria-label="Guide sections">
          <span class="eyebrow" style="margin-bottom:6px">ON THIS PAGE</span>
          <a href="#guide-1" data-scroll="guide-1">01 &middot; Launch &amp; play</a>
          <a href="#guide-2" data-scroll="guide-2">02 &middot; Find eden_log.txt</a>
          <a href="#guide-3" data-scroll="guide-3">03 &middot; Check privacy</a>
          <a href="#guide-4" data-scroll="guide-4">04 &middot; Note upscaler &amp; FG</a>
          <a href="#guide-5" data-scroll="guide-5">05 &middot; Pick a rating</a>
          <a href="#guide-6" data-scroll="guide-6">06 &middot; Submit your report</a>
        </nav>

        <div>
          <div class="detected-panel" style="margin-bottom:24px">
            <h4>Privacy first: never share personal info or game files</h4>
            <p>Only share your Dekubi Ally version, hardware specs, settings, and gameplay notes. Do not upload ROMs, keys, firmware, or account credentials.</p>
          </div>

          <article class="guide-step" id="guide-1">
            <span class="eyebrow">STEP 01</span>
            <h2>Play a representative session</h2>
            <p>Extract the full Dekubi Ally archive and run <code>dekubi.exe</code>. Play past the title screen and into actual gameplay so shader compilation settles and you can observe real frame pacing.</p>
          </article>

          <article class="guide-step" id="guide-2">
            <span class="eyebrow">STEP 02</span>
            <h2>Locate your session log</h2>
            <p>After closing the game, Dekubi Ally writes its latest hardware and Vulkan diagnostics to:</p>
            <code class="code-line">user/log/eden_log.txt</code>
          </article>

          <article class="guide-step" id="guide-3">
            <span class="eyebrow">STEP 03</span>
            <h2>Drop the log locally in the submit form</h2>
            <p>On the <a href="#/submit">Submit a report</a> page, drop <code>eden_log.txt</code> into Step 02. The parser runs 100% client-side in your browser to pre-fill your GPU, driver, OS, and Dekubi build.</p>
          </article>

          <article class="guide-step" id="guide-4">
            <span class="eyebrow">STEP 04</span>
            <h2>Record your Upscaler, Frame Gen &amp; TDP</h2>
            <p>Note whether you used <strong>XeSS 3.0.2</strong>, <strong>PSSR (FSR 4 INT8 Vulkan)</strong>, <strong>AMD FSR 4</strong>, or <strong>DLSS 4/5 NR</strong>, along with your Frame Gen mode (XeSS-FG, FSR 3.1, DLSS-G, LSFG, or ANR-FG) and handheld wattage (e.g., ROG Ally 15W / 18W / 25W).</p>
          </article>

          <article class="guide-step" id="guide-5">
            <span class="eyebrow">STEP 05</span>
            <h2>Choose the right compatibility rating</h2>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
              ${STATUS_ORDER.filter((s) => s !== 'Untested').map((s) => `
                <div style="display:grid;grid-template-columns:130px 1fr;gap:14px;align-items:center;padding:10px 14px;background:var(--surface-1);border:1px solid var(--border);border-radius:8px">
                  ${statusPillHtml(s)}
                  <span style="font-size:14px;color:var(--text-body)">${esc(STATUS_META[s].desc)}</span>
                </div>
              `).join('')}
            </div>
          </article>

          <article class="guide-step" id="guide-6" style="border-bottom:0">
            <span class="eyebrow">STEP 06</span>
            <h2>Publish or file a GitHub issue</h2>
            <p>Submit your report here to help the community catalog, or open an issue on <a href="https://github.com/Dekubi/Dekubi-Ally/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a> if you hit a reproducible crash or regression.</p>
            <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
              <a href="#/submit" class="button primary">Submit a report</a>
              <a href="#/downloads" class="button">Get latest Dekubi Ally</a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

// --- View: Downloads & Features ---
function renderDownloads() {
  return `
    <div class="container">
      <div class="page-header">
        <span class="eyebrow">DEKUBI ALLY RELEASES</span>
        <h1>Download Dekubi Ally</h1>
        <p>Experimental, open-source fork of <strong>Lichii</strong> and <strong>Fritchii</strong> (built on the Fritchii v6.5 core), tuned for handhelds (ROG Ally Z1 Extreme, Steam Deck, Legion Go, MSI Claw) and for Windows and Linux desktops and laptops with NVIDIA, AMD or Intel graphics, from 4&nbsp;GB VRAM / 8&nbsp;GB RAM up. Compiled with Clang 22.1.8 &amp; <code>x86-64-v3</code>.</p>
        <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
          <a href="https://github.com/Dekubi/Dekubi-Ally/releases" target="_blank" rel="noopener noreferrer" class="button primary">Download on GitHub Releases &rarr;</a>
          <a href="https://github.com/Dekubi/Dekubi-Ally" target="_blank" rel="noopener noreferrer" class="button">View source repository</a>
        </div>
      </div>

      <section>
        <div class="section-head">
          <h2>Key Dekubi Ally features</h2>
          <span class="mono" style="font-size:12.5px;color:var(--text-muted)">Built on Fritchii v6.5</span>
        </div>
        <div class="feature-grid">
          <div class="feature-card">
            <span class="eyebrow">UPSCALING</span>
            <h3>XeSS 3.0.2, PSSR &amp; DLSS 4/5 NR</h3>
            <p>Native Intel XeSS 3.0.2 Vulkan, dedicated PSSR (FSR 4 INT8 Vulkan) with <code>present_pssr.frag</code>, normal AMD FSR 4, and custom DLSS 4/5 Neural Rendering with unified quality presets.</p>
          </div>
          <div class="feature-card">
            <span class="eyebrow">FRAME GEN</span>
            <h3>Multi-Vendor Frame Gen Suite</h3>
            <p>Full support for XeSS-FG, FSR 3.1, DLSS-G, LSFG (Lossless Scaling), and Apex Neural Rendering (ANR-FG) to hit smooth 60–120 FPS on handhelds.</p>
          </div>
          <div class="feature-card">
            <span class="eyebrow">DEVICE TUNING</span>
            <h3>Target Device Tier Auto-Tuning</h3>
            <p>Automatic hardware profiling picks a tier for each device: ROG Ally Z1E, Steam Deck, Legion Go and MSI Claw, low-spec PCs (4 GB VRAM / 8 GB RAM), and mid- and high-end desktops and laptops; plus Linux DMI detection &amp; zero-page memory trimming.</p>
          </div>
          <div class="feature-card">
            <span class="eyebrow">COMPILER</span>
            <h3>Clang 22 + x86-64-v3</h3>
            <p>Globally optimized with AVX2, FMA, BMI2, and F16C instructions for lower CPU overhead and tighter frame times on modern x86 handhelds and desktops.</p>
          </div>
          <div class="feature-card">
            <span class="eyebrow">QUALITY OF LIFE</span>
            <h3>Mod Menu (F2) &amp; Borderless (F11)</h3>
            <p>Built-in in-game Mod Menu (<code>F2</code>), automatic SCSKiller on game launch, Borderless Fullscreen taskbar fix (<code>F11</code>), and Dekubi-green Performance Overlay.</p>
          </div>
          <div class="feature-card">
            <span class="eyebrow">OPEN SOURCE</span>
            <h3>GPL-3.0-or-later</h3>
            <p>Independent hobby fork crediting Fritchii v6.5, Lichii, Eglantine, Eden, yuzu, and Sudachi contributors. Extract the full archive and launch <code>dekubi.exe</code>.</p>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-head">
          <h2>Recent builds</h2>
          <a href="https://github.com/Dekubi/Dekubi-Ally/releases" target="_blank" rel="noopener noreferrer">All releases on GitHub &rarr;</a>
        </div>
        <div id="releases-list" class="report-list">
          ${RELEASES_FALLBACK.map(renderReleaseCard).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderReleaseCard(rel) {
  return `
    <div class="panel" style="padding:22px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:20px">${esc(rel.name || rel.tag_name)}</h3>
          <span class="mono-tag" style="color:var(--eyebrow)">${esc(rel.tag_name)}</span>
          ${rel.prerelease ? `<span class="mono-tag">beta</span>` : `<span class="mono-tag">stable</span>`}
        </div>
        <a href="${esc(rel.html_url)}" target="_blank" rel="noopener noreferrer" class="button">Download &rarr;</a>
      </div>
      <div class="mono" style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Published ${esc((rel.published_at || '').slice(0, 10))}</div>
      ${rel.highlights ? `
        <ul style="margin:0;padding-left:18px;color:var(--text-body);font-size:14.5px;display:flex;flex-direction:column;gap:6px">
          ${rel.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
        </ul>
      ` : `<p style="margin:0;color:var(--text-body);font-size:14.5px;white-space:pre-line">${esc((rel.body || '').slice(0, 420))}</p>`}
    </div>
  `;
}

// --- View: What's New (Markdown-powered from /content/whats-new.md) ---
function renderChangelog() {
  return `
    <div class="container" style="max-width:960px">
      <div class="page-header">
        <span class="eyebrow">MARKDOWN CHANGELOG &middot; content/whats-new.md</span>
        <h1>What's new in Dekubi Ally</h1>
        <p>Rendered live from <code>content/whats-new.md</code>. Edit that Markdown file anytime to update this page automatically.</p>
      </div>
      <div id="changelog-body" class="panel" style="padding:32px">
        <p class="mono" style="color:var(--text-muted);margin:0">Loading content/whats-new.md...</p>
      </div>
    </div>
  `;
}

async function hydrateChangelog() {
  const el = document.getElementById('changelog-body');
  if (!el) return;
  try {
    const res = await fetch('/content/whats-new.md', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    el.innerHTML = renderMarkdown(md);
  } catch (err) {
    el.innerHTML = `<p style="color:var(--err-text);margin:0">Could not load <code>content/whats-new.md</code> (${esc(err.message)}).</p>`;
  }
}

// --- View: Privacy & Credits ---
function renderPrivacy() {
  return `
    <div class="container" style="max-width:860px">
      <div class="page-header">
        <span class="eyebrow">PRIVACY &amp; CREDITS</span>
        <h1>Privacy, safety &amp; open-source credits</h1>
      </div>

      <div class="detected-panel" style="margin-bottom:28px">
        <h4>Local-only log parsing</h4>
        <p>When you drop <code>user/log/eden_log.txt</code> into the report form, parsing runs entirely inside your browser. No log file is ever uploaded or stored remotely.</p>
      </div>

      <div class="prose-section">
        <h3>Legal &amp; community policy</h3>
        <p>Dekubi Ally is an independent hobby fork, not affiliated with big red. Bring your own legally obtained files — no games, firmware, or keys are hosted or permitted on this site or in community reports.</p>
      </div>

      <div class="prose-section">
        <h3>Credits</h3>
        <p><strong>Dekubi Ally</strong> is an independent fork of <strong>Lichii</strong> (Zortos) and <strong>Fritchii</strong> (Frizti — Fritchii v6.5 core &amp; OoT shader precompile recipe), building on the work of the <strong>Eglantine, Eden, yuzu, and Sudachi</strong> contributors. Licensed under <strong>GPL-3.0-or-later</strong>.</p>
      </div>
    </div>
  `;
}

// --- Client-Side eden_log.txt Parser ---
function parseEdenLog(text) {
  const result = {};
  const lines = text.split(/\r?\n/).slice(0, 250);
  for (const line of lines) {
    if (!result.build) {
      const m = line.match(/Dekubi(?:\s+Ally)?\s+v?([\d.]+(?:\s*beta)?)/i);
      if (m) result.build = `v${m[1]}`;
    }
    if (!result.gpu) {
      const m = line.match(/(?:GPU|Device|Renderer)\s*[:=]\s*(.+)/i);
      if (m) result.gpu = m[1].trim().slice(0, 60);
    }
    if (!result.driver) {
      const m = line.match(/(?:Driver(?:\s+version)?|Vulkan\s+driver)\s*[:=]\s*(.+)/i);
      if (m) result.driver = m[1].trim().slice(0, 48);
    }
    if (!result.os) {
      const m = line.match(/(?:OS|Host\s+OS|System)\s*[:=]\s*(Windows[^,\r\n]*|Linux[^,\r\n]*|SteamOS[^,\r\n]*)/i);
      if (m) result.os = m[1].trim().slice(0, 48);
    }
  }
  return result;
}

// --- Event Wiring per View ---
function bindHomeEvents(params) {
  const updateQuery = (patch) => {
    const next = {
      q: params.get('q') || '',
      platform: params.get('platform') || '',
      status: params.get('status') || '',
      upscaler: params.get('upscaler') || '',
      view: params.get('view') || 'cards',
      ...patch,
    };
    if (next.view === 'cards') delete next.view;
    navigate('/', next);
  };

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => updateQuery({ view: btn.dataset.view }));
  });

  const search = document.getElementById('catalog-search');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => updateQuery({ q: search.value.trim() }), 140);
    });
  }

  document.querySelectorAll('[data-chip-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.chipPlatform;
      updateQuery({ platform: params.get('platform') === id ? '' : id });
    });
  });

  document.querySelectorAll('[data-filter-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      updateQuery({ platform: btn.dataset.filterPlatform });
      document.getElementById('games-database')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.getElementById('filter-status')?.addEventListener('change', (e) => updateQuery({ status: e.target.value }));
  document.getElementById('filter-upscaler')?.addEventListener('change', (e) => updateQuery({ upscaler: e.target.value }));

  const clearBtn = document.getElementById('clear-filters') || document.getElementById('clear-filters-empty');
  clearBtn?.addEventListener('click', () => navigate('/'));
}

function bindReportsEvents(params) {
  const update = (patch) => {
    navigate('/reports', {
      q: params.get('q') || '',
      platform: params.get('platform') || '',
      status: params.get('status') || '',
      ...patch,
    });
  };

  const search = document.getElementById('reports-search');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => update({ q: search.value.trim() }), 140);
    });
  }

  document.querySelectorAll('[data-rep-platform]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.repPlatform;
      update({ platform: params.get('platform') === id ? '' : id });
    });
  });

  document.getElementById('rep-status')?.addEventListener('change', (e) => update({ status: e.target.value }));
}

function bindSubmitEvents() {
  const dropzone = document.getElementById('log-dropzone');
  const fileInput = document.getElementById('f-logfile');
  const detectedBox = document.getElementById('log-detected');

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseEdenLog(text);
    if (parsed.gpu) document.getElementById('f-gpu').value = parsed.gpu;
    if (parsed.driver) document.getElementById('f-driver').value = parsed.driver;
    if (parsed.os) document.getElementById('f-os').value = parsed.os;

    detectedBox.style.display = 'block';
    detectedBox.innerHTML = `
      <h4>Parsed ${esc(file.name)} locally (never uploaded)</h4>
      <div class="detected-grid">
        <div>Build: ${esc(parsed.build || 'not detected (using selector)')}</div>
        <div>GPU: ${esc(parsed.gpu || 'not detected')}</div>
        <div>Driver: ${esc(parsed.driver || 'not detected')}</div>
        <div>OS: ${esc(parsed.os || 'not detected')}</div>
      </div>
    `;
  };

  fileInput?.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer?.files?.[0]);
  });

  // Outcome cards highlight
  const outcomeGrid = document.getElementById('outcome-grid');
  outcomeGrid?.addEventListener('change', () => {
    outcomeGrid.querySelectorAll('.outcome-card').forEach((card) => {
      const input = card.querySelector('input');
      card.classList.toggle('selected', Boolean(input?.checked));
    });
  });

  // Markdown Write / Preview toggle
  const whatInput = document.getElementById('f-what');
  const whatPreview = document.getElementById('f-what-preview');
  document.querySelectorAll('[data-md-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mdMode;
      document.querySelectorAll('[data-md-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      if (mode === 'preview') {
        whatPreview.innerHTML = whatInput.value.trim()
          ? renderMarkdown(whatInput.value)
          : '<span style="color:var(--text-muted);font-size:13.5px">Nothing to preview yet.</span>';
        whatInput.style.display = 'none';
        whatPreview.style.display = 'block';
      } else {
        whatInput.style.display = 'block';
        whatPreview.style.display = 'none';
      }
    });
  });

  // Custom game title toggle
  const gameSelect = document.getElementById('f-game');
  const customWrap = document.getElementById('custom-game-wrap');
  gameSelect?.addEventListener('change', () => {
    if (customWrap) customWrap.style.display = gameSelect.value === '__custom__' ? 'flex' : 'none';
  });

  // Form submit
  const form = document.getElementById('submit-report-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const summary = String(fd.get('summary') || '').trim();
    if (!summary) {
      document.getElementById('f-summary')?.focus();
      return;
    }

    let gameSlug = String(fd.get('gameSlug'));
    let gameTitle = '';
    if (gameSlug === '__custom__') {
      gameTitle = String(fd.get('customGameTitle') || '').trim();
      if (!gameTitle) {
        document.getElementById('f-custom-title')?.focus();
        return;
      }
      gameSlug = gameTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-game';
    }

    const feats = fd.getAll('feat').map(String);
    const report = {
      id: `rep-${Date.now().toString(36)}`,
      gameSlug,
      gameTitle,
      status: String(fd.get('status') || 'Playable'),
      build: String(fd.get('build') || BUILDS[0]),
      gameVersion: String(fd.get('gameVersion') || 'v1.0.0').trim(),
      platform: String(fd.get('platform') || 'rog-ally'),
      gpu: String(fd.get('gpu') || 'Unknown GPU').trim(),
      vram: String(fd.get('vram') || '4 GB+').trim(),
      api: String(fd.get('api') || 'Vulkan'),
      upscaler: String(fd.get('upscaler') || 'XeSS 3.0.2'),
      upscalerQuality: String(fd.get('upscalerQuality') || 'Quality'),
      frameGen: String(fd.get('frameGen') || 'None'),
      os: String(fd.get('os') || 'Windows 11').trim(),
      driver: String(fd.get('driver') || 'Latest').trim(),
      author: String(fd.get('author') || '').trim() || 'anonymous_ally',
      verified: false,
      hoursAgo: 0,
      summary,
      whatHappened: String(fd.get('whatHappened') || summary).trim(),
      howFar: String(fd.get('howFar') || 'Gameplay tested').trim(),
      settings: `${fd.get('api')}, ${fd.get('upscaler')} (${fd.get('upscalerQuality')}), FG: ${fd.get('frameGen')}${feats.length ? ', ' + feats.join(', ') : ''}.`,
    };

    saveUserReport(report);
    navigate(`/reports/${report.id}`);
  });
}

async function hydrateGithubReleases() {
  const container = document.getElementById('releases-list');
  if (!container) return;
  try {
    const res = await fetch('https://api.github.com/repos/Dekubi/Dekubi-Ally/releases?per_page=5');
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      container.innerHTML = data.map(renderReleaseCard).join('');
    }
  } catch {
    // Keep fallback releases silently
  }
}

// --- Main Render Loop ---
function render() {
  const { path, params } = parseHash();
  updateNavActive(path);
  const app = document.getElementById('app');

  if (path === '/' || path === '') {
    app.innerHTML = renderHome(params);
    bindHomeEvents(params);
  } else if (path === '/reports') {
    app.innerHTML = renderReports(params);
    bindReportsEvents(params);
  } else if (path.startsWith('/reports/')) {
    const id = decodeURIComponent(path.slice('/reports/'.length));
    app.innerHTML = renderReportDetail(id);
  } else if (path.startsWith('/games/')) {
    const slug = decodeURIComponent(path.slice('/games/'.length));
    app.innerHTML = renderGameDetail(slug);
  } else if (path === '/submit') {
    app.innerHTML = renderSubmit(params);
    bindSubmitEvents();
  } else if (path === '/guide') {
    app.innerHTML = renderGuide();
    document.querySelectorAll('[data-scroll]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(a.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  } else if (path === '/changelog') {
    app.innerHTML = renderChangelog();
    hydrateChangelog();
  } else if (path === '/downloads') {
    app.innerHTML = renderDownloads();
    hydrateGithubReleases();
  } else if (path === '/privacy') {
    app.innerHTML = renderPrivacy();
  } else {
    app.innerHTML = renderHome(params);
    bindHomeEvents(params);
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Global keyboard shortcut: '/' focuses catalog search
window.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    const input = document.getElementById('catalog-search') || document.getElementById('reports-search');
    if (input) {
      e.preventDefault();
      input.focus();
    }
  }
});

// Dismissible top notice
const noticeEl = document.getElementById('site-notice');
if (localStorage.getItem(NOTICE_KEY) === '1') {
  noticeEl?.classList.add('hidden');
}
document.getElementById('dismiss-notice')?.addEventListener('click', () => {
  noticeEl?.classList.add('hidden');
  localStorage.setItem(NOTICE_KEY, '1');
});

window.addEventListener('hashchange', render);
render();
loadLiveReports();
