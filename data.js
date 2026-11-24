// Dekubi Ally compatibility catalog & proven telemetry reports extracted directly from Fritchii/Logs

export const STATUS_ORDER = ['Perfect', 'Playable', 'Runs', 'Loads', 'Unplayable', 'Untested'];

export const STATUS_META = {
  Perfect: {
    color: '#25a56f',
    rank: 5,
    desc: 'Full speed with no notable visual or audio issues from start to finish.',
  },
  Playable: {
    color: '#77bf63',
    rank: 4,
    desc: 'Playable end-to-end with minor glitches, occasional shader stutter, or tweaks.',
  },
  Runs: {
    color: '#efb638',
    rank: 3,
    desc: 'Gets in-game, but suffers from low performance, heavy glitches, or crashes.',
  },
  Loads: {
    color: '#ef7133',
    rank: 2,
    desc: 'Reaches title screen or menus, but fails to load into gameplay.',
  },
  Unplayable: {
    color: '#b4b4c0',
    rank: 1,
    desc: 'Crashes on boot, black screen, or hangs before menus.',
  },
  Untested: {
    color: '#575761',
    rank: 0,
    desc: 'No community reports submitted yet for Dekubi Ally.',
  },
};

export const PLATFORMS = [
  { id: 'windows', label: 'Windows desktop / laptop', short: 'Windows PC' },
  { id: 'rog-ally', label: 'ROG Ally / Z1 handheld (Windows)', short: 'ROG Ally' },
  { id: 'linux', label: 'Handheld on Linux (Bazzite, SteamOS)', short: 'Linux handheld' },
  { id: 'steam-deck', label: 'Steam Deck', short: 'Steam Deck' },
  { id: 'linux-pc', label: 'Linux desktop / laptop', short: 'Linux PC' },
  { id: 'legion-go', label: 'Legion Go', short: 'Legion Go' },
  { id: 'msi-claw', label: 'MSI Claw', short: 'MSI Claw' },
];

export const BUILDS = [
  'v3.0.1',
  'v3.0.0',
  'v2.0.9',
  'v2.0.8',
  'v2.0.7',
  'v2.0.6',
  'v2.0.3',
  'v2.0.2',
  'v2.0.1',
  'v2.0.0',
  'v1.1.6 beta',
];

export const UPSCALERS = [
  'AMD FSR',
  'DLSS 4/5 NR',
  'XeSS 3.0.2',
  'PSSR (FSR 4 INT8)',
  'Native',
];

export const FRAME_GENS = [
  'None',
  'FSR 3.1 FG',
  'XeSS-FG',
  'DLSS-G',
  'LSFG',
  'ANR-FG',
];

export function makeCoverSvg(title, tag, c1 = '#134e38', c2 = '#091f1a') {
  const initials = title
    .split(/[\s:]+/)
    .filter((w) => w.length > 0 && !['of', 'the', 'and', 'in', 'to'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'DK';

  const xml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTag = xml(tag || 'DEKUBI');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="440" viewBox="0 0 300 440">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="300" height="440" fill="url(#g)"/>
    <rect x="0" y="0" width="300" height="440" fill="rgba(12,12,14,0.28)"/>
    <circle cx="240" cy="86" r="88" fill="rgba(255,255,255,0.08)"/>
    <rect x="22" y="24" width="136" height="28" rx="4" fill="rgba(12,12,14,0.65)"/>
    <text x="34" y="43" fill="#34d399" font-family="monospace" font-size="13" font-weight="700">${safeTag}</text>
    <text x="26" y="280" fill="rgba(255,255,255,0.92)" font-family="sans-serif" font-size="96" font-weight="800" letter-spacing="-4">${xml(initials)}</text>
    <rect x="26" y="388" width="64" height="5" rx="2" fill="#10b981"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, '%27')}`;
}

// Tracked catalog: Ocarina of Time has proven log runs below; other titles remain Untested until logged.
export const INITIAL_GAMES = [
  {
    slug: 'zelda-ocarina-of-time',
    title: 'The Legend of Zelda: Ocarina of Time',
    publisher: 'Nintendo',
    version: '0400486024DEC000',
    genre: 'Action Adventure',
    palette: ['#0f5e44', '#081d17'],
    tag: 'LOG VERIFIED',
    recommended: 'Vulkan · 540p→720p/1080p FSR on ROG Ally Z1E · 1440p on desktop and laptop GPUs (NVIDIA, AMD, Intel) · v2.0.9 adds the 120k shader precompile recipe',
  },
  {
    slug: 'donkey-kong-bananza',
    title: 'Donkey Kong Bananza',
    publisher: 'Nintendo',
    version: '—',
    genre: '3D Platformer',
    palette: ['#6e3f14', '#1f1208'],
    tag: 'UNTESTED',
    recommended: 'No log-verified reports yet. Submit a report after testing on Dekubi Ally.',
  },
  {
    slug: 'mario-kart-world',
    title: 'Mario Kart World',
    publisher: 'Nintendo',
    version: '—',
    genre: 'Arcade Racing',
    palette: ['#7a2334', '#1f1018'],
    tag: 'UNTESTED',
    recommended: 'No log-verified reports yet. Submit a report after testing on Dekubi Ally.',
  },
  {
    slug: 'pokemon-legends-za',
    title: 'Pokémon Legends: Z-A',
    publisher: 'Nintendo / Game Freak',
    version: '—',
    genre: 'Action RPG',
    palette: ['#134e38', '#091f1a'],
    tag: 'UNTESTED',
    recommended: 'No log-verified reports yet. Submit a report after testing on Dekubi Ally.',
  },
].map((g) => ({
  ...g,
  cover: makeCoverSvg(g.title, g.tag, g.palette[0], g.palette[1]),
}));

// 100% proven telemetry runs parsed directly from C:\Users\User\projects\Fritchii\Logs\Dekubi-*.zip
export const INITIAL_REPORTS = [
  {
    id: 'log-2026-11-24-152253',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Playable',
    build: 'v2.0.7',
    gameVersion: '0400486024DEC000',
    platform: 'linux',
    gpu: 'AMD Ryzen Z1 Extreme (RADV PHOENIX)',
    vram: '11.4 GB RAM (4 GB UMA)',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '540p → 720p',
    frameGen: 'None',
    os: 'Linux (RADV · Clang 20.1.2)',
    driver: 'Mesa 26.3.1',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 5,
    summary: '2,966 frames in 126 s — 23.6 fps avg (30 FPS battery saver), 1% low 9.2 fps, 33 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-24-152253.zip` (`HEAD-bd2767f01b`, Clang 20.1.2)\n\n- **Run summary:** `2,966 frames` in `126 s`\n- **Average FPS:** `23.6 fps` (`oot_30fps: true` battery saver active)\n- **1% / 0.1% low:** `9.2 fps` / `1.0 fps`\n- **Frames >100 ms:** `33` (longest frame `9,096.6 ms`)',
    howFar: '126 s Linux handheld gameplay session (720p 120 Hz screen).',
    settings: '`backend: Vulkan`, `oot_30fps: true`, `oot_render_height: 540`, `oot_upscale_output: 720`, `scaling_filter: Fsr`, `memory_layout_mode: Memory_8Gb`, `EDEN_NX2_GPU_WATCHDOG=45`, `EDEN_NX2_TC_CEILING_MIB=2048`.',
  },
  {
    id: 'log-2026-11-24-133740',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Playable',
    build: 'v2.0.6',
    gameVersion: '0400486024DEC000',
    platform: 'rog-ally',
    gpu: 'AMD Radeon Graphics (Z1 Extreme)',
    vram: '11.7 GB RAM (4 GB UMA)',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '540p → 1080p',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.10075)',
    driver: 'AMD 26.20.15.14 (LLPC)',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 6,
    summary: '8,560 frames in 190 s — 45.0 fps avg, 1% low 9.2 fps, 0.1% low 1.9 fps, 97 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-24-133740.zip` (`compute-stalls-10146ee3df`, Clang 22.1.8)\n\n- **Run summary:** `8,560 frames` in `190 s`\n- **Average FPS:** `45.0 fps`\n- **1% / 0.1% low:** `9.2 fps` / `1.9 fps`\n- **Frames >100 ms:** `97` (longest frame `13,462.6 ms`)',
    howFar: '190 s ROG Ally Z1 Extreme Windows 11 gameplay session (1080p 120 Hz).',
    settings: '`backend: Vulkan`, `oot_30fps: false`, `oot_render_height: 540`, `oot_upscale_output: 1080`, `scaling_filter: Fsr`, `Clang 22.1.8`.',
  },
  {
    id: 'log-2026-11-24-131554',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Perfect',
    build: 'v2.0.6',
    gameVersion: '0400486024DEC000',
    platform: 'linux',
    gpu: 'AMD Ryzen Z1 Extreme (RADV PHOENIX)',
    vram: '11.4 GB RAM (4 GB UMA)',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '540p → 720p',
    frameGen: 'None',
    os: 'Linux (RADV · Clang 20.1.2)',
    driver: 'Mesa 26.3.1',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 7,
    summary: '17,361 frames in 262 s — 66.1 fps avg, 1% low 21.7 fps, 0.1% low 7.5 fps, only 22 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-24-131554.zip` (`HEAD-10146ee3df`, Clang 20.1.2)\n\n- **Run summary:** `17,361 frames` in `262 s`\n- **Average FPS:** `66.1 fps`\n- **1% / 0.1% low:** `21.7 fps` / `7.5 fps`\n- **Frames >100 ms:** `22` (longest frame `9,087.5 ms`)',
    howFar: '262 s ROG Ally Z1 Extreme Linux (RADV) gameplay session.',
    settings: '`backend: Vulkan`, `oot_30fps: false`, `oot_render_height: 540`, `oot_upscale_output: 720`, `scaling_filter: Fsr`, `Clang 20.1.2`.',
  },
  {
    id: 'log-2026-11-24-084955',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Playable',
    build: 'v2.0.3',
    gameVersion: '0400486024DEC000',
    platform: 'rog-ally',
    gpu: 'AMD Radeon Graphics (Z1 Extreme)',
    vram: '11.7 GB RAM (4 GB UMA)',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '540p → 1080p',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.10075)',
    driver: 'AMD 26.20.15.14 (LLPC)',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 11,
    summary: '20,825 frames in 438 s — 47.6 fps avg, 1% low 11.4 fps, 0.1% low 2.2 fps, 153 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-24-084955.zip` (`compute-stalls-10dc540d61`, Clang 22.1.8)\n\n- **Run summary:** `20,825 frames` in `438 s`\n- **Average FPS:** `47.6 fps`\n- **1% / 0.1% low:** `11.4 fps` / `2.2 fps`\n- **Frames >100 ms:** `153` (longest frame `13,541.5 ms`)',
    howFar: '438 s (7.3 min) ROG Ally Windows 11 session.',
    settings: '`backend: Vulkan`, `oot_render_height: 540`, `oot_upscale_output: 1080`, `scaling_filter: Fsr`.',
  },
  {
    id: 'log-2026-11-24-075244',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Playable',
    build: 'v2.0.2',
    gameVersion: '0400486024DEC000',
    platform: 'rog-ally',
    gpu: 'AMD Radeon Graphics (Z1 Extreme)',
    vram: '11.7 GB RAM (4 GB UMA)',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '540p → 1080p',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.10075)',
    driver: 'AMD 26.20.15.14 (LLPC)',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 12,
    summary: '14,695 frames in 338 s — 43.5 fps avg, 1% low 11.5 fps, 0.1% low 1.0 fps, 114 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-24-075244.zip` (`compute-stalls-591c25a831`, Clang 22.1.8)\n\n- **Run summary:** `14,695 frames` in `338 s`\n- **Average FPS:** `43.5 fps`\n- **1% / 0.1% low:** `11.5 fps` / `1.0 fps`\n- **Frames >100 ms:** `114` (longest frame `12,304.6 ms`)',
    howFar: '338 s ROG Ally Windows 11 session.',
    settings: '`backend: Vulkan`, `oot_render_height: 540`, `oot_upscale_output: 1080`, `scaling_filter: Fsr`.',
  },
  {
    id: 'log-2026-11-23-215331',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Playable',
    build: 'v2.0.1',
    gameVersion: '0400486024DEC000',
    platform: 'rog-ally',
    gpu: 'AMD Radeon Graphics (Z1 Extreme)',
    vram: '9.7 GB RAM',
    api: 'Vulkan',
    upscaler: 'AMD FSR',
    upscalerQuality: '720p → 1080p',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.10075)',
    driver: 'AMD 26.20.15.14 (LLPC)',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 22,
    summary: '26,243 frames in 665 s — 39.5 fps avg, 1% low 10.2 fps, 0.1% low 1.6 fps, 0 crashes.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-23-215331.zip` (`compute-stalls-1b77f6762e`, Clang 22.1.8)\n\n- **Run summary:** `26,243 frames` in `665 s` (11+ minutes)\n- **Average FPS:** `39.5 fps`\n- **1% / 0.1% low:** `10.2 fps` / `1.6 fps`\n- **Frames >100 ms:** `253` (longest frame `8,805.5 ms`)',
    howFar: '665 s extended ROG Ally Windows 11 playtest.',
    settings: '`backend: Vulkan`, `oot_render_height: 720`, `oot_upscale_output: 1080`, `scaling_filter: Fsr`.',
  },
  {
    id: 'log-2026-11-23-205614',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Perfect',
    build: 'v2.0.1',
    gameVersion: '0400486024DEC000',
    platform: 'windows',
    gpu: 'NVIDIA GeForce RTX 5060',
    vram: '31.6 GB RAM / 8 GB VRAM',
    api: 'Vulkan',
    upscaler: 'DLSS 4/5 NR',
    upscalerQuality: 'Auto → 1440p',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.9974)',
    driver: 'NVIDIA 621.14',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 23,
    summary: '32,023 frames in 302 s — 106.1 fps avg, 1% low 26.0 fps, 0.1% low 8.0 fps, 63 frames >100 ms.',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-23-205614.zip` (`compute-stalls-1b77f6762e`, Clang 22.1.8)\n\n- **Run summary:** `32,023 frames` in `302 s`\n- **Average FPS:** `106.1 fps`\n- **1% / 0.1% low:** `26.0 fps` / `8.0 fps`\n- **Frames >100 ms:** `63` (longest frame `1,305.7 ms`)',
    howFar: '302 s desktop RTX 5060 1440p gameplay session.',
    settings: '`backend: Vulkan`, `oot_upscale_output: 1440`, `NVIDIA 621.14`, `Clang 22.1.8 x86-64-v3`.',
  },
  {
    id: 'log-2026-11-23-121325',
    gameSlug: 'zelda-ocarina-of-time',
    status: 'Perfect',
    build: 'v1.1.6 beta',
    gameVersion: '0400486024DEC000',
    platform: 'windows',
    gpu: 'NVIDIA GeForce RTX 5060',
    vram: '31.6 GB RAM / 8 GB VRAM',
    api: 'Vulkan',
    upscaler: 'DLSS 4/5 NR',
    upscalerQuality: '1440p Quality',
    frameGen: 'None',
    os: 'Windows 11 26H2 (Build 26300.9974)',
    driver: 'NVIDIA 621.14',
    author: 'Dekubi Log Export',
    verified: true,
    hoursAgo: 32,
    summary: '26,623 frames in 207 s — 128.5 fps avg, 1% low 34.8 fps, 0.1% low 12.8 fps, only 14 frames >100 ms (99.95% smooth).',
    whatHappened: '**Source archive:** `Dekubi-OoT-Log-2026-11-23-121325.zip` (`compute-stalls-aad1303229`)\n\n- **Run summary:** `26,623 frames` in `207 s`\n- **Average FPS:** `128.5 fps`\n- **1% / 0.1% low:** `34.8 fps` / `12.8 fps`\n- **Frames >100 ms:** `14` (`99.95%` smooth, `0` freezes, `0` OOMs, `0` collector stalls)',
    howFar: '207 s desktop RTX 5060 1440p benchmark run.',
    settings: '`backend: Vulkan`, `1440p DLSS Quality`, `EDEN_NX2_TC_CEILING_MIB=5120`, `Clang 22.1.8 x86-64-v3`.',
  },
];

// Real release notes from src/yuzu/dekubi/whats-new.md (live GitHub API overrides when reachable)
export const RELEASES_FALLBACK = [
  {
    tag_name: 'V3.0.1',
    name: 'Dekubi Ally v3.0.1 — Logs for Every Game, Smoother Settings',
    published_at: '2026-11-24',
    prerelease: true,
    html_url: 'https://github.com/Dekubi/Dekubi-Ally/releases/tag/V3.0.1',
    highlights: [
      'Log sharing covers every game, not only Ocarina of Time; Dekubi asks once more and sends nothing without a yes',
      'Settings: swipe to scroll on a touch screen; with a controller Right / A goes to the first option, LB / RB switch tabs, Left goes back',
      'Keeps the 3.0.0 pop-up windows and the 2.0.9 shader precompile recipe',
    ],
  },
  {
    tag_name: 'V3',
    name: 'Dekubi Ally v3.0.0 — Back to the Pop-Up Windows',
    published_at: '2026-11-24',
    prerelease: true,
    html_url: 'https://github.com/Dekubi/Dekubi-Ally/releases/tag/V3',
    highlights: [
      'Replaces the buggy PS5-style full-window screens: Settings opens as its own window with tabs again (touch-sized rows, minimise / maximise / close, remembered F11 full screen)',
      'Help and Menu are pop-up menus again; Saves opens in its own window',
      'Keeps everything from v2.0.7–v2.0.9: 120k Ocarina of Time shader precompile recipe, 30 FPS battery saver on unplug, and tighter handheld GPU memory packing',
    ],
  },
  {
    tag_name: 'v2.0.9',
    name: 'Dekubi Ally v2.0.9 — 120k OoT Shader Precompile Recipe',
    published_at: '2026-11-24',
    prerelease: false,
    html_url: 'https://github.com/Dekubi/Dekubi-Ally/releases',
    highlights: [
      'Ships Fritchii’s shader precompile recipe (~120,000 shaders & pipelines) for The Legend of Zelda: Ocarina of Time on Windows (NVIDIA, AMD / ROG Ally, Intel)',
      'Help → About credits Frizti (Fritchii) and Zortos (Lichii)',
    ],
  },
  {
    tag_name: 'v2.0.8',
    name: 'Dekubi Ally v2.0.8 — Tighter Handheld GPU Memory Packing',
    published_at: '2026-11-24',
    prerelease: false,
    html_url: 'https://github.com/Dekubi/Dekubi-Ally/releases',
    highlights: [
      'Packs GPU memory tighter on ROG Ally, Steam Deck & handhelds (Fritchii small-card memory packing by Fritz) to reduce 6–18 s area-transition freezes',
      'Improved Wayland windowing on Bazzite & SteamOS',
    ],
  },
  {
    tag_name: 'v2.0.7',
    name: 'Dekubi Ally v2.0.7 — Handheld Battery Saver & GPU Watchdog',
    published_at: '2026-11-23',
    prerelease: false,
    html_url: 'https://github.com/Dekubi/Dekubi-Ally/releases',
    highlights: [
      'Automatically switches Ocarina of Time to 30 FPS Battery Saver on unplug and restores your mode on AC power',
      '45-second frozen-GPU recovery on handhelds (from Lichii, thanks to Zortos) + silent background SCSKiller',
    ],
  },
];

// hoursAgo above is relative to when this file was written; age them to now.
{
  const writtenAt = Date.parse('2026-11-24T20:04:00+08:00');
  const sinceWritten = Math.max(0, (Date.now() - writtenAt) / 3.6e6);
  for (const report of INITIAL_REPORTS) {
    report.hoursAgo += sinceWritten;
  }
}
