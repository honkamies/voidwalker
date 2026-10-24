# 🛡️ Voidwalker

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

## 🧠 What Voidwalker Does

1. **Universal-Encoding Consent Trap Sniffer & Spoofer (`Pay or Okay` Walls)**
   - Detects Sourcepoint / IAB TCF v2.2 (`__tcfapi`, used on `hs.fi`, `is.fi`, and major European media), OneTrust, Cookiebot, Didomi, Quantcast, and Gravito.
   - Automatically satisfies the consent wall ("Accept All" / "Hyväksy kaikki" / "Godkänn alla" / "Alle akzeptieren") across UTF-8, ISO-8859-1, Windows-1252, HTML entities, and double-encoded mojibake while strictly avoiding "Subscribe / Pay" buttons.
2. **Stateful Cookie Mutator & Follower (Anti-Reinjection Ledger)**
   - Leaves functional & consent-unlock cookies (`euconsent-v2`, `_sp_v1_data`, login sessions) intact so the wall stays gone, while mutating tracking identifiers (`consentUUID`, `_sp_v1_uid`, `_ga`, `_fbp`, `s_ecid`) into disposable fake personas (`GA1.1.<fake>`, `fb.1.<fake>`, random UUIDv4).
   - **Follows Manipulated Cookies:** Tracks every manipulated cookie by name and canonical family (`consentUUID` $\rightarrow$ `consentUUID_v2`, `_sp_v1_uid` $\rightarrow$ `_sp_v2_uid`) across `document.cookie`, `window.cookieStore`, `localStorage`, `sessionStorage`, and HTTP `Set-Cookie` headers so sites cannot overwrite, wipe, or version-bump their way around your fake ID.
3. **Outgoing Telemetry & Beacon Poisoner**
   - Hooks `navigator.sendBeacon`, `window.fetch`, and `XMLHttpRequest` to analytics endpoints (Google Analytics, Adobe Experience Cloud / `omtrdc.net`, Meta Pixel, Criteo, Chartbeat) and injects decoy screen dimensions, fake referrers, and random interest topics while returning `200 OK`.
4. **Hardware & Canvas Fingerprint Spoofer**
   - Injects deterministic sub-pixel noise into Canvas 2D (`toDataURL`) and spoofs WebGL GPU vendor/renderer strings and CPU/memory metrics.
5. **Background Chaff Generator**
   - Periodically injects contradictory commercial interest signals into the site's `dataLayer` to ruin behavioral ad profiles.
6. **Built-in Clean News Reader View**
   - One-click button in the popup (`📖 Clean News Reader View`) that strips any news page down to clean headlines and full article text (parsing JSON-LD, Next.js `__NEXT_DATA__`, and `<article>` tags with automatic mojibake repair).

---

## 🧪 Local Interactive Test Lab

Open `test-lab.html` in your browser to see a live simulation of a *"Pay or Okay"* news portal and inspect side-by-side what tracking IDs the site *tries* to set (including cookie overwrite & `_v2` version-bump attacks) vs. the locked fake IDs it *actually* receives.
