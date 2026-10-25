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

## 📦 Quick Install (Drag & Drop `.zip`)

1. Download **[`releases/voidwalker-v1.0.0.zip`](releases/voidwalker-v1.0.0.zip)** from this repository (click the link → click **Download raw file**).
2. Open your browser's Extensions page:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
   - **Edge:** `edge://extensions`
3. Toggle **Developer mode** ON (top-right corner).
4. **Drag and drop `voidwalker-v1.0.0.zip`** directly onto the extensions page (or unzip it and click **Load unpacked**).
5. Pin **🛡️ Voidwalker** to your toolbar!

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
| **4. Cloud Identity Graph & Beacon Syncing** | **Outgoing Telemetry Poisoner:** Hooks `navigator.sendBeacon`, `window.fetch`, and `XMLHttpRequest` calls to analytics collectors and rewrites query parameters (`cid`, `uid`, `mid`, `sr`, `dl`, `dt`) and JSON bodies with decoy screen resolutions, fake referrers, and randomized interest topics. |
| **5. Canvas, WebGL & Hardware Fingerprinting** | **Deterministic Per-Tab Noise Injection:** Injects sub-pixel noise into HTML5 Canvas 2D (`toDataURL`, `getImageData`) and spoofs WebGL GPU vendor/renderer strings (`getParameter(37445/37446)`), CPU core counts, and device memory so every tab looks like a completely different physical machine. |
| **6. Behavioral Ad Profiling (`dataLayer`)** | **Background Chaff Generator:** Periodically injects contradictory commercial interest signals (e.g., *industrial hydraulic excavators*, *alpine goat cheese fermentation*, *enterprise mainframe COBOL*) into `window.dataLayer` to poison behavioral ad segments. |

---

## 📖 Built-in Clean News Reader View

Click **📖 Clean News Reader View** in the Voidwalker popup to strip any cluttered news page down to a distraction-free dark reader view. Voidwalker extracts structured article content and front-page headlines directly from JSON-LD (`NewsArticle`), Next.js `__NEXT_DATA__` trees, and semantic `<article>` tags while automatically repairing character-encoding mojibake.

---

## 🧪 Local Interactive Test Lab

Open [`test-lab.html`](test-lab.html) in your browser to run a live simulation of a *"Pay or Okay"* news portal and inspect side-by-side:
1. What IAB TCF v2.2 status the site receives.
2. What tracking IDs the site *tries* to set vs. the **Locked Fake IDs** Voidwalker forces into `document.cookie`.
3. A live **Cookie Overwrite & `_v2` Version-Bump Attack Simulator** showing Voidwalker's Stateful Cookie Ledger defeating re-injection attempts in real time.
