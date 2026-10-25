<p align="center">
  <img src="icons/logo.png" width="190" alt="Voidwalker Logo" />
</p>

# 🛡️ Voidwalker

Walk through "Allow Cookies or Pay" walls leaving only a ghost. Spoofs consent, locks tracking cookies to fake personas, and poisons ad-tech telemetry in real time.

> **Walk Through the Wall. Leave Only a Ghost.**  
> Websites now hold the web hostage with *"Allow Cookies or Pay"* walls—so **Voidwalker** shows them compliance on the surface while feeding them a hollow phantom underneath.  
> It automatically tells consent walls *"Yes, I accept everything"* across all character encodings to unlock the page in milliseconds, then immediately locks every tracking cookie to a rotating, format-preserving fake persona.  
> If a site tries to overwrite, delete-and-recreate, or bump cookie versions (`_v2`), Voidwalker's **Stateful Cookie Ledger** stalks the cookie and locks the fake ID back in place.  
> Every analytics beacon, hardware fingerprint, and behavioral tracker is intercepted in real time and fed randomized decoy noise instead of your real life.

---

## 📦 Download & Quick Install

Grab the latest ready-to-install package from **[GitHub Releases](https://github.com/honkamies/voidwalker/releases/latest)** or directly from the [`releases/`](releases/) folder:

| Browser Family | Supported Browsers | Download Package | How to Install |
| :--- | :--- | :--- | :--- |
| **Chromium (Desktop)** | **Chrome**, **Brave**, **Edge**, **Vivaldi**, **Opera**, **Arc** | **[`voidwalker-chromium.zip`](https://github.com/honkamies/voidwalker/releases/latest/download/voidwalker-chromium.zip)** | Open `chrome://extensions` (or `brave://extensions` / `edge://extensions`), toggle **Developer mode** ON, and **drag & drop the `.zip`** onto the page (or unzip and click **Load unpacked**). |
| **Firefox / Gecko (Desktop)** | **Firefox** (v115+), **Zen Browser**, **LibreWolf**, **Waterfox**, **Mullvad** | **[`voidwalker-firefox.zip`](https://github.com/honkamies/voidwalker/releases/latest/download/voidwalker-firefox.zip)** | Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select `voidwalker-firefox.zip` (or `manifest.json` on Developer/Nightly/LibreWolf). |
| **Mobile (Android & iOS)** | **Kiwi Browser**, **Lemur Browser**, **Firefox Nightly/Android**, **Orion Browser (iOS)** | **[`voidwalker-chromium.zip`](https://github.com/honkamies/voidwalker/releases/latest/download/voidwalker-chromium.zip)** *(or [`voidwalker-firefox.zip`](https://github.com/honkamies/voidwalker/releases/latest/download/voidwalker-firefox.zip) on Gecko)* | Open the browser's **Extensions** menu → tap **+ (from `.zip` / `.crx` / `.xpi`)** and select the downloaded `.zip` file. |

---

## 🕵️ How Modern Cookie Tracking Actually Works (The First 500ms)

A common question is: *"Can Website A directly read the cookies of Website B?"*  
Technically, **no**—browsers enforce the **Same-Origin Policy**, meaning `news-site.com` cannot directly open your cookie jar and read cookies belonging to `webshop.com`.

Yet websites still know what you looked at on another site ten minutes ago. Instead of reading each other's cookies directly, **websites invite the same ad-tech brokers onto their pages and link your first-party cookies together in the cloud.**

Here is what happens behind the scenes in the first **500 milliseconds** when you open a modern website:

### Step 1: The "Pay or Okay" Consent Trap (`0ms – 200ms`)
Before you can read a single paragraph, a **Consent Management Platform (CMP)** script (such as Sourcepoint, OneTrust, Cookiebot, or Didomi) locks page scrolling (`overflow: hidden`) and demands that you either click **"Accept All"** or pay for a subscription.
When you click **Accept All**, the CMP writes two things to your browser:
1. **The Legal Consent Receipt (`euconsent-v2` / `consentDate`):** A cryptographic IAB TCF v2.2 string signaling to 140+ ad-tech vendors that they have permission to profile you.
2. **The Master Publisher ID (`consentUUID` / `_sp_v1_uid`):** A permanent UUID that identifies you across every website owned by that media conglomerate.

### Step 2: The First-Party Cookie Drop (`200ms – 400ms`)
Once the consent receipt is present, dozens of tracking scripts wake up and stamp their own first-party tracking IDs directly into the website's cookie jar and `localStorage`:
* **Google Analytics (`_ga`, `_ga_*`):** Assigns a persistent client ID (`GA1.1.123456789.1700000000`) and session heartbeat counter.
* **Meta / Facebook Pixel (`_fbp`, `_fbc`):** Stamps a Meta browser ID (`fb.1.1700000000.987654321`) to link your reading habits to your social graph.
* **Behavioral & Scroll Trackers (`_cb`, `_chartbeat2`, `cX_P`, `_pcid`):** Chartbeat, Cxense, and Piano scripts track how many seconds you linger on each paragraph and classify your political, financial, and commercial interests.

### Step 3: Cross-Site "Cookie Syncing" & Fingerprinting (`400ms – 1000ms`)
To bypass the browser's Same-Origin Policy, `news-site.com` and `webshop.com` both load invisible beacons (`fetch`, `XMLHttpRequest`, or `navigator.sendBeacon`) pointing to the same ad brokers (Google DoubleClick, Criteo, Adform, Adobe `omtrdc.net`):
1. On `news-site.com`, the script transmits: *"User with `consentUUID = 15a4405b` has GPU `RTX 3060`, Screen `2560x1440`, and Canvas Hash `#8f92a`."*
2. Ten minutes later on `webshop.com`, the same broker's script transmits: *"User with `shop_id = 998877` also has GPU `RTX 3060`, Screen `2560x1440`, and Canvas Hash `#8f92a`."*
3. In the cloud, the broker merges `15a4405b` and `998877` into a single **Cross-Site Identity Graph**. Even if you delete a cookie, the site's scripts detect the missing value or re-inject a new version (`consentUUID_v2`) and re-link you via your hardware fingerprint.

---

## ⚔️ How Voidwalker Counters Every Step

Instead of blocking scripts (which triggers anti-adblock walls and breaks page layouts), **Voidwalker** operates as an active deception layer inside the browser's `MAIN` and `ISOLATED` execution worlds:

| Surveillance Mechanism | How Voidwalker Defeats It |
| :--- | :--- |
| **1. "Pay or Okay" Consent Walls** | **Universal-Encoding Spoofer:** Intercepts `window.__tcfapi` (IAB TCF v2.2) and `window.__uspapi` to return a synthetic `"useractioncomplete"` full-consent payload, auto-triggers the accept button across UTF-8, ISO-8859-1, Windows-1252, and mojibake encodings, and strips CSS scroll locks (`overflow: hidden`) while strictly avoiding *"Subscribe / Pay"* buttons. |
| **2. First-Party Tracking Cookies** | **Format-Preserving Mutation + Shannon Entropy Detection:** Leaves functional & consent-receipt cookies (`euconsent-v2`, `consentDate`, `PHPSESSID`, login/cart tokens) untouched so the wall stays unlocked, while mutating known tracker cookies (`consentUUID`, `_sp_v1_uid`, `_ga`, `_fbp`, `_cb`, `cX_P`, `_pcid`) AND unknown high-entropy tokens ($\text{Entropy} \ge 3.6$) into format-valid fake IDs. |
| **3. Cookie Re-Injection & `_v2` Version Bumps** | **Stateful Shadow Cookie Ledger:** Every manipulated cookie is pinned (`Locked`) in an in-memory ledger across both host-only (`www.domain.com`) and parent-domain (`.domain.com`) scopes. If a page tries to overwrite a cookie, wipe-and-recreate it (`Max-Age=0`), or bump its version (`consentUUID_v2`), Voidwalker intercepts the write and forces the locked fake ID back into the jar. |
| **4. In-Memory JS Variable Leaks (`0.00ms` Window)** | **Ledger-Linked Outgoing Network Scrubber:** If a script generates `const id = "real-uuid"` in RAM, writes `document.cookie = "consentUUID=" + id` (which Voidwalker mutates in the jar), and immediately fires `fetch(".../collect?tok=" + id)` using its local RAM variable, Voidwalker scans every outgoing `fetch`, `XHR`, and `sendBeacon` URL and body against the Cookie & Storage Ledgers and swaps `real-uuid` with the locked fake ID before the packet leaves the browser. |
| **5. Cloud Identity Graph & Beacon Syncing** | **Outgoing Telemetry Poisoner:** Hooks `navigator.sendBeacon`, `window.fetch`, and `XMLHttpRequest` calls to analytics collectors and rewrites query parameters (`cid`, `uid`, `mid`, `sr`, `dl`, `dt`) and JSON bodies with decoy screen resolutions, fake referrers, and randomized interest topics. |
| **6. Canvas, WebGL 1/2, Audio & Hardware Fingerprinting** | **6-Surface Randomized Hardware Privacy Layer (`0.00ms`):** Intercepts Canvas 2D (`toDataURL`, `toBlob`, `getImageData`), Font `measureText`, WebGL 1 & 2 GPU queries, `AudioBuffer` DSP waveforms, `window.screen` geometry, High-Entropy UA Client Hints, `enumerateDevices` USB/peripheral hashes, and `navigator.getBattery()`. |
| **7. Behavioral Ad Profiling (`dataLayer`)** | **Background Chaff Generator:** Periodically injects contradictory commercial interest signals (e.g., *industrial hydraulic excavators*, *alpine goat cheese fermentation*, *enterprise mainframe COBOL*) into `window.dataLayer` to poison behavioral ad segments. |

---

## ⚡ Zero-Millisecond (`0.00ms`) Interception & Closing the "In-Memory Variable" Trick

Because [`src/page-hook.js`](src/page-hook.js) is injected with `"run_at": "document_start"` in `"world": "MAIN"`, Voidwalker overrides `Object.defineProperty(document, 'cookie', ...)` and `Storage.prototype` **before the HTML parser even reads the `<head>` tag**.
* **Zero Cookie Jar Exposure (`0.00ms`):** When a tracker executes `document.cookie = "consentUUID=15a4405b-..."`, the real value is intercepted in RAM and replaced with a fake persona ID before Chrome's native C++ cookie engine is ever called. The original tracking ID never exists in the browser's cookie store even for a microsecond.
* **Closing the Local RAM Variable Loophole:** Some tracking scripts generate a tracking ID in a local JavaScript variable (`const myId = "15a4405b-..."`), assign it to `document.cookie`, and 1ms later transmit `fetch("/collect?custom_param=" + myId)` directly from the local `myId` variable in RAM rather than reading `document.cookie` back. Voidwalker's [`scrubLedgerValuesFromString()`](src/page-hook.js) links the **Followed Cookie & Storage Ledgers** directly into `window.fetch`, `XMLHttpRequest`, and `navigator.sendBeacon`: any raw string (or URL-encoded string) that a script attempted to write to a cookie or `localStorage` is automatically hunted down inside outgoing URLs and request payloads and replaced with the locked fake ID in flight.

---

## 🖥️ The 6-Surface Randomized Hardware Privacy Layer

Webpages cannot access your physical CPU, GPU, sound card, or monitor directly—they must query browser JavaScript APIs. Voidwalker sits between the webpage and those APIs at `0.00ms`, presenting a **randomized virtual hardware machine** on every page load across 6 distinct fingerprinting surfaces:

1. **Canvas 2D & Sub-Pixel Font Rendering (`fpCanvas`)**
   * Hooks `HTMLCanvasElement.prototype.toDataURL`, `toBlob`, and `CanvasRenderingContext2D.prototype.getImageData` to inject deterministic per-session pixel noise (`canvasNoiseSeed`), and wraps `measureText()` with a Proxy that adds microscopic (`~0.00015px`) sub-pixel width jitter so OS font-rendering hashes change on every visit without visibly altering text layout.
2. **WebGL 1 & WebGL 2 Graphics Card Cloaking (`fpWebGL`)**
   * Hooks `getParameter(37445)` (`UNMASKED_VENDOR_WEBGL`) and `getParameter(37446)` (`UNMASKED_RENDERER_WEBGL`) on **both** `WebGLRenderingContext` (WebGL 1) and `WebGL2RenderingContext` (WebGL 2), rotating between synthetic GPU profiles (*NVIDIA GeForce RTX 3060*, *Intel Iris Xe*, *AMD Radeon RX 6700 XT*, and *Apple M2*).
3. **AudioContext / OfflineAudioContext DSP Waveform Jitter (`fpAudio`)**
   * Hooks `AudioBuffer.prototype.getChannelData` and `AnalyserNode.prototype.getFloatFrequencyData` to inject imperceptible (`1e-7`) floating-point noise across audio oscillator buffers. This defeats `OfflineAudioContext` sound-card/FPU fingerprinting while remaining 100% inaudible during media playback.
4. **Monitor & Display Geometry Cloaking (`fpScreen`)**
   * Overrides `Screen.prototype` getters (`width`, `height`, `availWidth`, `availHeight`, `colorDepth`, `pixelDepth`) to report randomized standard monitor dimensions (`1920x1080`, `2560x1440`, `1536x864`, `1440x900`, etc.) matching the active fake persona, without affecting CSS `@media` responsive layouts (which rely on `window.innerWidth`).
5. **CPU Cores, System RAM & High-Entropy Client Hints (`fpHardware`)**
   * Spoofs `navigator.hardwareConcurrency` (`4`, `8`, `12`, or `16` cores), `navigator.deviceMemory` (`4`, `8`, `16`, or `32` GB), and intercepts Chrome's `navigator.userAgentData.getHighEntropyValues()` to return randomized OS build versions and architectures (`x86` / `arm`).
6. **Hardware Peripheral IDs & Battery Status (`fpHardware`)**
   * Hooks `navigator.mediaDevices.enumerateDevices()` to salt and randomize hardware `deviceId` and `groupId` hashes (preventing trackers from fingerprinting how many webcams/microphones are plugged into your PC), and intercepts `navigator.getBattery()` to return a decoy battery state instead of your real battery charge level and discharge rate.

---

## ⚙️ Granular Controls & When to Switch Specific Layers Off

While all defense modules and hardware layers are enabled by default for maximum protection, Voidwalker includes **one-click per-site bypass** and **granular hardware sub-layer toggles** in the extension popup for specialized web applications:

* **One-Click Site Exclusion (Per-Domain Whitelist):** Located right next to the active domain name in the popup header (`+ Exclude Site` / `✓ Excluded`), plus an expandable **Exclusion List (Whitelist)** management drawer. Click to immediately exclude media- or account-heavy sites (pre-seeded with `youtube.com`) so that video watch history, playback progress, account preferences, and login sessions run 100% natively without cookie mutation or telemetry poisoning, while keeping full protection active everywhere else.
* **Hardware Layers (`Layers ▾` Drawer):** Click **Layers ▾** next to *Hardware Fingerprint Privacy Layer* in the popup to individually toggle any of the 5 hardware sub-shields:
  * **Canvas 2D & Font Sub-Pixel Jitter:** Switch off only on browser-based photo/pixel editors (e.g., *Photopea*) if you need 100% unmodified RGB eyedropper pixel exports.
  * **WebGL 1 & 2 GPU Vendor/Renderer:** Switch off only on 3D hardware benchmarks or cloud-gaming portals that auto-tune graphics shaders based on your physical GPU model.
  * **AudioContext DSP Waveform Jitter:** Switch off only on browser-based music DAWs or lossless audio mastering tools.
  * **Screen & Display Geometry Cloaking:** Switch off if a multi-monitor web application sizes native popup windows using `window.screen`.
  * **CPU, RAM, Client Hints, Mic/Cam IDs & Battery:** Switch off on browser video-conferencing apps (*Google Meet*, *Zoom*, *Microsoft Teams*) if you want the site to remember your preferred hardware microphone or webcam `deviceId` across browser restarts.

---

## 🧪 Local Interactive Test Lab

Open [`test-lab.html`](test-lab.html) in your browser to run a live simulation of a *"Pay or Okay"* news portal and inspect side-by-side:
1. What IAB TCF v2.2 status the site receives.
2. What tracking IDs the site *tries* to set vs. the **Locked Fake IDs** Voidwalker forces into `document.cookie`.
3. A live **Cookie Overwrite & `_v2` Version-Bump Attack Simulator** showing Voidwalker's Stateful Cookie Ledger defeating re-injection attempts in real time.

