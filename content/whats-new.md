# Dekubi Ally v3.0.3

### 🆕 Recent updates
- **3.0.3 — Safer video and frame presenting:** Frames are now always presented on the GPU thread to prevent corruption or crashes in games that play videos, such as Ocarina of Time's title screen. Found by the new log analysis.
- **3.0.2 — Smoother Ocarina of Time, clearer logs, a website:** Ocarina of Time zeroes unused GPU memory on the GPU instead of copying zeros from the CPU, reducing work in busy scenes. Logs now show only real errors as errors. An anonymous summary (game, GPU, FPS) may appear on the new website dekubi.github.io, and only a yes to that publishes one.
- **3.0.1 — Logs for every game, smoother Settings:** Log sharing now covers every game, not just Ocarina of Time. Dekubi asks once more and sends nothing without a yes; until you answer, an earlier yes covers Ocarina of Time only. The log names the game. In Settings, you can swipe to scroll on a touch screen, and with a controller Right / A goes straight to the first option.
- **3 (3.0.0) — Back to the pop-up windows:** the PS5-style full-window screens from 2.0.7 were buggy, so they are gone. Settings opens as its own window with its tabs again, sized to your screen with big touch-friendly rows, minimise / maximise / close, and an optional full screen (F11) that is remembered. Help and Menu are pop-up menus again (also in the in-game bar), and Saves opens in its own window. Everything else from 2.0.7–2.0.9 stays: the shader recipe, the battery saver and less GPU memory on handhelds.
- **2.0.9 — Ocarina of Time's shaders ready ahead of time:** Dekubi now comes with Fritchii's shader precompile recipe for Ocarina of Time, so about 120,000 shaders and pipelines are prepared in the background before you need them, instead of compiling (and stuttering) the first time each effect appears. This works on Windows with NVIDIA, AMD (including the ROG Ally) or Intel graphics; on Linux the Mesa drivers keep no shader cache for it, so it is skipped there. The first start after installing takes a while to prepare them; later starts reuse them. Shader precompile recipe by Frizti (Fritchii), shipped with his permission. Help → About now credits Frizti (Fritchii) and Zortos (Lichii).
- **2.0.8 — Less GPU memory on handhelds, easier menus:** on the ROG Ally, Steam Deck and other handhelds, Dekubi now packs GPU memory tighter, so new areas in Ocarina of Time fill the shared RAM less and the 6–18 second freezes should be rarer (this uses Fritchii's memory packing for small graphics cards, by Fritz). The PS5-style screens get Close and Back buttons, a Close row you can pick with the controller, Enter works on every row, and the screens shrink to fit smaller windows such as the Ally at 1080p. On Linux the screens open inside Dekubi's window, so they show up correctly under Wayland (Bazzite, SteamOS).
- **2.0.7 — PS5-style menus and a battery saver:** Settings is now a screen inside Dekubi like on the PS5: pick a category, then its sections and options, with big rows and a green highlight that follows your controller, touch or mouse. Saves, Help and Menu open inside Dekubi too, also from the bar at the top while you play. On a handheld, Ocarina of Time switches to 30 FPS when you unplug, and back to your mode when you plug in (you can still pick any mode on battery, or turn it off in Settings). A frozen GPU on a handheld now closes after 45 seconds instead of locking up the device (from Lichii, with thanks to Zortos). SCSKiller now works fully in the background, so it no longer has its own button.
- **2.0.6 — Faster, clean closing:** stopping a game no longer waits 5 seconds first. Games that don't save on exit (like Ocarina of Time) now close after 1 second; games that save on exit still get 5 seconds. On Linux, closing Ocarina of Time no longer crashes Dekubi: a GPU work buffer could write past its end, which damaged memory and crashed at exit. Because the close is clean now, the shader cache is saved properly, so you don't get the "previous session ended without a clean stop" warning and fewer shaders compile again on the next start.
- **2.0.5 — No more out-of-memory closes on handhelds:** on the ROG Ally, Steam Deck and Legion Go the GPU shares the RAM with the game, so it now gets at most 4 GB, even with "Aggressive" VRAM use. The ROG Ally's texture cache is 2 GB. On Linux, a leftover `FRITCHII_HOST_ZSTD=0` test line is turned off by itself.
- **2.0.4 — Faster Linux version:** built with Clang like the Windows version, with Fritchii's JIT speed-ups (block chaining and one shared code cache) back on, and tuned for the AMD handhelds.
- **2.0.3 — Mod Menu fixed:** the F2 cheats work again even if Add-Ons were turned off with "Disable All". On Linux, crashes are logged with where they happened, and memory trimming hitches less.
- **2.0.2 — Linux fixes:** games no longer crash or freeze a few seconds after starting, and memory trimming uses far less CPU and battery.

### ⚡ Accurate Physics at Any Frame Rate (30 FPS, 60 FPS & Uncapped)
- **Live Frame Rate Mode Switcher (In-Game Strip & Status Bar):**
  - Switch seamlessly between **30 FPS (Battery Saver)**, **60 FPS (Smooth Standard)**, and **UNCAPPED (Max Performance)** on the fly via the top in-game floating strip or bottom status bar.
  - Left-click or tap to cycle instantly through `30 FPS -> 60 FPS -> UNCAPPED -> 30 FPS`.
  - Right-click or long-press to open a direct selection menu with active mode checks.
- **Accurate Physics & 1.0x Real-Time Game Speed:**
  - Games run at authentic normal 1.0x speed regardless of frame rate—no more 2x fast-forwarding, time of day freezing, song note desyncs, or galloping through fences.
  - High refresh dynamic tick scaling calculates elapsed frame delta in real time, so jumping on webs, moving platforms, cloth physics, and water ripples remain 100% accurate even past 260+ FPS.
- **30 FPS Battery Saver Mode:**
  - Employs two vblanks per frame matched with dynamic time measurements, cutting power consumption and thermal load on handhelds (ROG Ally, Steam Deck, Legion Go) while preserving smooth 1x character speed.
- **Flexible 3D Render & Upscaling Resolution Controls:**
  - Configure internal 3D draw resolution and upscaled output separately in Graphics Settings:
    - **`oot_render_height` (Base 3D Render Resolution):** `0` = Auto/Default, `720` = 720p performance, `1080` = 1080p, `1440` = native 1440p.
    - **`oot_upscale_output` (Target Upscaled Output):** `0` = Auto/Match Display, `1080` = 1080p, `1440` = 1440p, `2160` = 4K.
    - Render internally at 720p and upscale to 1080p/1440p with DLSS or FSR for maximum framerates on ROG Ally, handhelds, and laptops!

---

### 🎮 PS5-Inspired Emerald Green Touch & Handheld UI
- **Full-Bleed Dynamic Hero Backdrop & Automatic Online Artwork:**
  - Switching games smoothly crossfades (`260 ms`) the selected game's artwork across the entire Home background with obsidian-emerald readability vignettes and **0% in-game performance impact**.
  - Automatically fetches missing game icons (`switchiconshowdown.com` + optional SteamGridDB) and sharp 1080p/4K widescreen hero backdrops (Steam `library_hero.jpg` + optional SteamGridDB Heroes), caching them permanently offline; low-res `256×256` icon fallbacks use a silky Gaussian blur so backgrounds never look pixelated.
  - Enlarged PS5-style game tiles (`116×116` / `156×156` active with emerald glow), circular `•••` Options button, floating bottom-right cover card, and the new minimalist emerald **D** Dekubi app icon.
- **Slideable In-Game Sidebar & Floating Edge Toggle (`>`):**
  - While playing in windowed mode, a sleek floating emerald green pill handle (`>`) stays pinned to the left edge of the screen.
  - Tapping or clicking it triggers a smooth sliding animation that expands the sidebar rail (`<`), giving instant access to Home, Library, Settings, Saves, and Menus without closing your game.
  - Clicking `<` or pressing `Esc` / `B` slides the sidebar closed cleanly.
- **100% Immersive Fullscreen Auto-Hide:**
  - In fullscreen mode (exclusive or borderless), the edge button and all sidebar rails automatically vanish completely, leaving your entire screen dedicated to pure gameplay.
- **In-Game Overlay Close & Resume Controls:**
  - Added prominent **▶ RESUME GAME** and **✕ RESUME GAME** buttons in both the Home overlay and All Games Library so you can return to your running game with a single tap.
- **Accidental Launch & Double-Click Protection:**
  - Double-clicking, rapid tapping, or joystick navigation spam while selecting game cards will never accidentally launch or restart a game.
- **Handheld & Touch Navigation:**
  - Enhanced all touch targets to 44px–56px for effortless finger taps on ROG Ally and Legion Go screens.
  - Added controller guide bar with button prompts: `(A) Play`, `(X) Options`, `(Y) Saves`, `(B) Back`, `(D-Pad) Navigate`, `(LB/RB) Page`, and `(Touch) Tap & Swipe`.

---

### 🚀 Complete Fritchii v6.5 Core Upgrade & Credits
- **Powered by Fritchii v6.5 Core:** Full core engine upgrade (`video_core`, `core`, `shader_recompiler`, `common`) with full credit to the **Fritchii** project for the v6.5 OneFollower / E-Split GPU pipeline, Vulkan renderer, shared Dynarmic JIT, buffer/texture cache, and scheduler breakthroughs.
- **Full `OneFollower` / E-Split & Non-Blocking Fence Acquire (`EXP12=4/5`):** Removes the old `memory_stage_stubs.cpp` bypass and activates Fritchii v6.5's real decoupled `OneFollower` / `MemStage` pipeline, eliminating hundreds of ms/s of synchronous GPU front-thread drains.
- **Cross-Platform Target Device Auto-Tuning (`DeviceTier`):** Automatically tunes texture cache ceilings and memory pools for Steam Deck (Windows & Linux/SteamOS), ROG Ally, Legion Go, 4 GB VRAM / 8 GB RAM systems, and 8 GB+ discrete GPUs, paired with continuous Windows + Linux (`madvise`/`fallocate`) zero-page trimming to prevent post-cutscene OOM crashes.
- **Small Graphics Card Memory Retention (`FRITCHII_SMALL_CARD=2`):**
  - Prevents severe texture churn on 4 GB–6 GB cards and handheld unified memory by retaining frequently accessed game textures across frames instead of continuously recreating them over PCIe.
- **Host RAM & Zero-Page Trimming (`EDEN_NX2_ZERO_TRIM=1`, `EDEN_NX2_ZERO_TRIM_IDLE=1`):**
  - Automatically reclaims zero-filled guest memory pages during idle gameplay on both Windows and Linux, eliminating out-of-memory crashes.
- **Automatic Max Resolution Protection:**
  - Built-in detection automatically switches off heavy 1440p/4K internal render bloat on 4 GB–6 GB GPUs, curing extreme PCIe memory thrashing.
- **Intel 12th–14th Gen P-Core / Hybrid Thread Placement:**
  - Replaces rigid P-core thread affinity with dynamic Windows scheduler placement, restoring full frame rates on hybrid CPUs.
- **Native Compressed Asset Unpacking:**
  - Game world assets and area transitions unpack natively instead of routing through the emulated CPU, resulting in faster loading screens.

---

### ⚡ Multi-Vendor Upscaling & Frame Generation Suite
- **Direct DLSS in Upscaler & Window Filter Lists:**
  - **NVIDIA DLSS (Deep Learning Super Sampling)** is now a first-class choice right inside the **Upscaler:** combobox alongside AMD FSR 3.1, AMD FSR 4, Intel XeSS, and Game.
  - Selecting DLSS automatically enables RTX Tensor Core neural upscaling and displays the Streamline DLSS configuration panel directly underneath.
- **Complete Upscaling Trio & DLSS Visual Overhaul:**
  - **AMD FSR 4 / Redstone:** FidelityFX SDK machine learning reconstruction tuned for RDNA 2, RDNA 3 / 3.5 (ROG Ally Radeon 780M), and RDNA 4.
  - **Intel XeSS:** Neural reconstruction and tensor anti-aliasing (`libxess.dll` in `user/xess/`).
  - **NVIDIA DLSS & DLSS 5:** NVIDIA Streamline integration (`v2.14.16`) with DLSS 5 neural enhancer support, DLSS 4 (Preset K), and DLSS 3.10.
  - **Crisp Foliage, Sub-Pixel Jitter & Anti-Ghosting Particle Mask for DLSS:** Enabled Halton(2,3) sub-pixel camera jitter and `-0.58` negative mipmap LOD bias by default for DLSS (`EDEN_NX2_DLSS_JITTER=1`), plus full `sl::kBufferTypeBiasCurrentColorHint` reactive mask tagging for Navi's glow, fireflies, and dust particles, and full 1080p / 3/4-scale pass replacement.
  - **Zero Dropped HDR Render Targets (`FRITCHII_LOST_WRITEBACK=1`):** Preserves all GPU-modified lighting, bloom, shadow, and exposure targets across cold sweeps without size caps (`Lost contents sampled = 0`), eliminating flickering lighting and dark/corrupted post-processing.
- **Multi-Vendor Frame Generation Backends (with 2x, 3x, 4x Multipliers):**
  - **AMD FSR 3.1 Frame Gen**, **NVIDIA DLSS-G**, **Intel XeSS-FG**, and **Lossless Scaling (LSFG)**.
  - Generates up to 3 interpolated frames per real frame (30 -> 60/90/120 FPS, 60 -> 120/180/240 FPS).
- **Rock-Solid Frame Generation Stability & Crash Prevention:**
  - **Zero Dangling Captures:** Fixed access violation (`0xc0000005`) that occurred when toggling frame generation in Graphics Settings due to stack reference lifetime desync.
  - **Vulkan Null-Descriptor Defense:** Hardened `GenerateInto` and `Fsr3FrameGen::Generate` with null-handle guards so storage view recreation failures or missing descriptor bounds never fault the GPU pipeline.
  - **Automatic Shader Fallback:** Automatically switches to universal FSR 3.1 optical flow if LSFG modules are missing or unsupported on the active device, ensuring seamless frame generation on any GPU.

---

### 📊 Performance Overlay with Live 1% / 0.1% Lows & Frame Times (Dekubi Green)
- **Live Rolling `1% Low` & `0.1% Low` FPS:** Tracks a 1024-frame rolling window right in the Performance Overlay so you can monitor real-time smoothness and stutter lows while playing.
- **AVX2 / FMA / BMI2 (`x86-64-v3`), Multi-Threaded Texture Decoding & Zero Collector Stalls:** Compiled globally with `-march=x86-64-v3`, paired with `2–4` Efficiency-core async texture decode workers, `16 MiB/frame` upload pacing, and raised per-tier async collector download caps (`0` sync eviction stalls) for dramatically smoother zone transitions.
- **Live Vulkan GPU Queue Timestamps:** Real-time GPU execution time in milliseconds (`GPU ms`) and utilization percentage (`% busy`).
- **Real-Time Bottleneck Identification:** Highlights whether the system is limited by GPU, CPU Front, Back, Render, or Game logic, or hitting the target frame cap in **Dekubi Green (`#22c55e`)**.
- **Per-Thread Breakdown:** Real-time millisecond monitors for submission, worker translation, game CPU, and presentation.

---

### 🛡️ Automated Diagnostics & OoT Telemetry
- **Silent Background Telemetry for OoT (`0400486024DEC000`):**
  - When playing *The Legend of Zelda: Ocarina of Time*, ending a session automatically and silently packages the session log, previous session's log, and a hardware summary into a zip archive and uploads it to Discord.
  - Automatically anonymizes and strips Windows usernames, computer names, and home directory paths before transmission.
  - Runs completely silent in the background with zero popups, alerts, or gameplay interruptions.

---

### ⚡ Native SCSKiller (Shader Compilation Stutter Killer & Cache Manager)
- **NVIDIA Driver Shader Cache Size Unlocker (`NVAPI DRS`):**
  - Inspects and unlocks your NVIDIA driver shader cache size directly from Dekubi (`4 GB Default` -> `10 GB`, `32 GB`, `64 GB`, `128 GB`, or `Unlimited`) so OoT's ~132,000 compiled pipelines never get evicted.
- **Windows Disk Cleanup Protection (`D3DSCache`):**
  - Protects compiled shader caches from being silently deleted by Windows Storage Sense and Disk Cleanup.
- **AMD Careful Multi-Pass Mode & Cross-Vendor Recipe Adaptation:**
  - Compiles Vulkan pipelines in low-contention passes on AMD Windows drivers with persistent `VkPipelineCache` retention across restarts, and adapts NVIDIA-recorded pipeline recipes so AMD (ROG Ally Radeon 780M, RX 7000) and Intel GPUs pre-warm 100% of compatible shaders.
- **Auto-Rewarm on GPU Driver Update & Dedicated SCSKiller Manager UI:**
  - Automatically detects GPU driver updates and re-warms kept `NX2KEPT5` SPIR-V pipelines without re-translating guest shaders. Open **⚡ SCSKiller** anytime from the left sidebar rail, top Home bar, or `Tools` menu.
