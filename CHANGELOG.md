# 📜 Voidwalker Changelog

All notable changes to the Voidwalker browser extension are documented in this file.

---

## [v1.0.5] - 2026-10-25

### 🚀 Added
- **One-Click Site Exclusion List (Whitelist):**
  - Added a one-click `+ Exclude Site` / `✓ Excluded` button in the popup header next to the active domain.
  - Added an expandable **`EXCLUSION LIST (WHITELIST)`** drawer showing live count badges, interactive domain chips, manual domain input (`+ Add`), and `✕` removal buttons.
  - Automatically cleans domain inputs, handling URLs (`https://`), trailing slashes, and `www.` prefixes.
- **Pre-Seeded `youtube.com` Protection Out-of-the-Box:**
  - `youtube.com` is automatically whitelisted by default (and auto-migrated for existing users), ensuring that video playback progress, watch history, account playlists, and resume points work 100% natively without cookie mutation or telemetry interception.
- **Synchronous `0.00ms` Execution Guard:**
  - Persists exclusion state in origin `localStorage` (`__vw_is_excluded__`), allowing `page-hook.js` to initialize in complete passthrough mode at `0.00ms` before any page scripts load.
- **Background Event Filtering:**
  - Background Service Worker now skips HTTP cookie mutations, clears toolbar badges, and ignores beacon telemetry on excluded domains.

---

## [v1.0.4] - 2026-10-25

### 🚀 Added
- **Automated 2-Hour Persona Rotation (Hands-Off Defense):**
  - Identities and fake UUIDs now refresh automatically every 2 hours without requiring manual button clicks.
  - Added background lifecycle watchdog on tab visibility changes and periodic alarms.
  - Automatically purges expired tracking ledger entries from browser memory.
- **On-Demand Update Check Button:**
  - Clicking the version badge in the popup header now instantly queries GitHub for releases, bypassing the network cooldown.
- **UI Clarifications:**
  - Added visual subtitle in the popup explaining the 2-hour automated rotation cycle.

---

## [v1.0.3] - 2026-10-25

### 🧹 Removed
- **Dead Code Cleanup:**
  - Removed unused experimental clean news reader view and 312 lines of legacy DOM parsing code from `content.js` to keep the extension lean, fast, and focused purely on anti-tracking and consent defense.
- **UI Refinement:**
  - Simplified sniffer status banner to clean human-readable messaging (`Active & Guarding` vs technical IAB TCF strings).

---

## [v1.0.2] - 2026-10-25

### 🚀 Added
- **In-Extension GitHub Update Notification System:**
  - Background service worker polls GitHub Releases API on a configurable cooldown.
  - Added animated glowing amber alert dot (`!`) over the shield icon and a banner linking directly to the latest release assets when a newer version is available.
- **Toolbar Badge Indicator:**
  - Displays a subtle `!` badge when an update is available.

---

## [v1.0.1] - 2026-10-25

### 🛡️ Optimized
- **Advanced Publisher & CMP Countermeasures:**
  - Added targeted defenses for Alma Media / il.fi tracking stacks (Sammio, Gravito, ISO timestamp formats).
  - Filtered diagnostic probes and refined Shannon entropy cookie categorization.

---

## [v1.0.0] - 2026-10-25

### 🎉 Initial Release
- **Universal-Encoding Consent Wall Spoofer (`0.00ms`):** Spoofs IAB TCF v2.2 (`__tcfapi`), Sourcepoint, OneTrust, Cookiebot, and Didomi across UTF-8, Latin-1, Windows-1252, and mojibake encodings.
- **Stateful Shadow Cookie Ledger:** Pins fake IDs into cookies and blocks overwrite/re-injection attempts across parent and host-only domains.
- **In-Memory Variable Network Scrubber:** Replaces raw tracking IDs in outgoing `fetch`, `XHR`, and `sendBeacon` calls before packets leave the browser.
- **6-Surface Hardware Privacy Layer:** Spoofs Canvas 2D, WebGL GPU vendor/renderer, AudioContext waveforms, screen dimensions, CPU/RAM specs, and battery status.
- **Cross-Browser Support:** Chromium (Chrome, Brave, Edge, Kiwi, Lemur, Orion) and Firefox (Desktop, Android, LibreWolf, Zen, Waterfox).
