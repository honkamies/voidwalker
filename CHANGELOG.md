# 📜 Voidwalker Changelog

All notable changes to the Voidwalker browser extension are documented in this file.

---

## [v1.1.0] - 2026-10-26

### 🚀 Added
- **One-Click Google Ecosystem Whitelist Preset (`+ Google`):**
  - Added dedicated preset pack targeting Google web properties: `google.com`, `googleusercontent.com`, and `gstatic.com`.
  - Fixes breakage on Google Photos (`photos.google.com`), Google Drive (`drive.google.com`), and Gmail where canvas/WebGL noise or tracking cookie mutation prevented image preview rendering, photo editing, and authentication token validation.
  - Automatically covers all subdomains and Google CDN media hosts (`*.googleusercontent.com`, `*.gstatic.com`).
- **One-Click Microsoft 365 & Corporate Whitelist Preset (`+ Microsoft`):**
  - Added dedicated corporate preset pack: `microsoft.com`, `office.com`, `live.com`, `microsoftonline.com`, `sharepoint.com`, and `office365.com`.
  - Guarantees seamless single sign-on (SSO via Microsoft Entra ID / `microsoftonline.com`), SharePoint document libraries, Outlook on the Web, and Teams/Office suites without authentication redirect loops or enterprise policy friction.
- **Enhanced Whitelist Drawer & Onboarding UI:**
  - Integrated Google and Microsoft quick-add preset buttons directly into the popup exclusion drawer (`popup/popup.html`) with responsive flex-wrapping.
  - Expanded first-install welcome and pinning guide (`welcome/welcome.html`) with a 4-card interactive preset pack matrix and live state toggle synchronization.

---

## [v1.0.9] - 2026-10-25

### 🐛 Fixed
- **Fixed Flexbox Squashing on Followed Cookie Ledger Rows in Constrained Viewports:**
  - Resolved root cause where the extension popup bubble in Microsoft Edge and Chromium (constrained to 600px max height) squeezed flex items. Because `.ledger-item-wrap` had `overflow: hidden`, the CSS flexbox specification defaulted its minimum height to `0` instead of `auto`, causing the entire row to collapse into a tight black sliver with invisible text.
  - Added strict `flex-shrink: 0;` across all `.app` sections, `.ledger-section`, `.ledger-feed`, `.ledger-item-wrap`, and `.ledger-row` so they can never be compressed below their intended dimensions.
  - Added explicit `min-height: 36px;` on `.ledger-item-wrap` and `height: 34px; line-height: 34px;` on `.ledger-row`.
  - Configured `body` with `max-height: 600px; overflow-y: auto; overflow-x: hidden;`, allowing smooth, natural vertical scrolling through all defense modules while guaranteeing every ledger row and detail card opens to full height.

---

## [v1.0.8] - 2026-10-25

### 🐛 Fixed
- **Fixed Broken Row Heights & Text Clipping in Followed Cookie Ledger:**
  - Resolved row layout distortion where table rows in `#cookieLedgerList` collapsed to ~22px height with no explicit `line-height`, causing letters, ascenders/descenders, and status badges to clip vertically ("showing only a little part of the text").
  - Re-engineered `.ledger-row` with a comfortable `min-height: 34px`, `padding: 7px 10px`, and explicit `line-height: 1.4` (18px content bounds) for full vertical breathing room.
  - Added `.ledger-name-text` with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;` ensuring long or hyphenated cookie names never wrap or break rows.
  - Replaced plain text status tags with a styled, non-wrapping emerald micro-pill badge (`padding: 3px 7px; background: rgba(16, 185, 129, 0.12); border-radius: 4px;`) displaying blocked attempt counts cleanly without wrapping.
  - Enhanced `.ledger-details` with 10.5px typography, 1.5 line height, and a divider border when open.
  - Increased `.ledger-feed.expanded` maximum height from 190px to 250px with custom scrollbars for comfortable multi-item inspection.
- **Eliminated UI Layout Shifts & DOM Thrashing:**
  - Added cache-keyed rendering for both the cookie ledger and intercept activity logs (`lastLedgerKey` and `lastLogKey`).
  - Stopped unconditional `innerHTML = ''` DOM destruction every 1.2 seconds, preserving DOM node references, hover states, keyboard focus, and scroll position when viewing expanded items.
- **Enhanced Accessibility:**
  - Added `role="button"`, `tabindex="0"`, `aria-expanded`, and keyboard `Enter`/`Space` listeners to ledger rows.

---

## [v1.0.7] - 2026-10-25

### 🚀 Added
- **Interactive First-Install Welcome & Pinning Guide (`welcome/welcome.html`):**
  - Automatically opens a dedicated cyber-dark onboarding tab upon first installation (`chrome.runtime.onInstalled`).
  - **Browser-Specific Pinning Guidance:** Auto-detects the browser and displays step-by-step instructions for **Microsoft Edge** (Show in toolbar 👁️), **Google Chrome / Brave** (Pin icon 📌), and **Firefox** (Pin to Toolbar).
  - **Live Defense Overview:** Summarizes the 0.00ms consent spoofer, stateful cookie ledger, 6-surface hardware cloaking, and 2-hour automated identity rotation.
- **One-Click Whitelist Presets (Welcome Page & Popup Drawer):**
  - **`+ Media Pack`:** One-click whitelist toggle for YouTube, Twitch, Netflix, and Spotify to protect video watch history and recommendations.
  - **`+ Work Pack`:** One-click whitelist toggle for Google Meet, Microsoft Teams, and Zoom to ensure mic/webcam hardware IDs and SSO logins work smoothly.
  - Integrated directly inside the extension popup's **Exclusion List (Whitelist)** drawer and the new welcome setup tab.

---

## [v1.0.6] - 2026-10-25

### 🐛 Fixed
- **Eliminated Edge & Chromium CSP Extension Error:**
  - Removed the legacy 15ms DOM `<script>` injection fallback in `content.js` that triggered Content Security Policy (CSP) violations on strict sites (e.g., Edge/Chrome flagging an "Error" on the extension card).
  - Modern Chromium and Firefox browsers natively execute `page-hook.js` via `world: MAIN` at `document_start`, making DOM injection obsolete.
- **Enhanced Extension Stealth:**
  - Removed `web_accessible_resources` exposure from `manifest.json`, preventing third-party tracking scripts from fingerprinting the extension's internal file paths via fetch probes.

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
