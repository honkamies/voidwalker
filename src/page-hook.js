/**
 * Voidwalker - MAIN World Page Hook (src/page-hook.js)
 * Runs at document_start in the page's MAIN execution world across all frames.
 *
 * Stages:
 *  1. Encoding-Universal Consent Trap Sniffer & Spoofer (IAB TCF v2.2, Sourcepoint/hs.fi, OneTrust, Cookiebot, Didomi, Pay-or-Okay walls)
 *  2. Stateful Cookie Shadow Ledger & Storage Mutator (follows manipulated cookies across overwrites, deletions, version bumps, CookieStore API, and HTTP headers)
 *  3. Outgoing Telemetry Poisoner (hooks sendBeacon, fetch, XHR to feed noisy decoy data to analytics)
 *  4. Hardware & Canvas Fingerprint Spoofer (Canvas, WebGL, AudioContext, Navigator metrics)
 *  5. Background Chaff Generator (injects contradictory interest signals to ruin ad profiles)
 */

(function () {
  'use strict';

  const GUARD_SYMBOL = Symbol.for('__cm_main_guard__');
  if (window[GUARD_SYMBOL]) return;
  try {
    Object.defineProperty(window, GUARD_SYMBOL, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  } catch (_) {
    return;
  }

  // ============================================================================
  // 0. CONFIGURATION & STEALTH BRIDGE TO ISOLATED CONTENT SCRIPT
  // ============================================================================
  const EVENT_TO_ISOLATED = '__cm_evt_bridge__';
  const EVENT_FROM_ISOLATED = '__cm_cfg_bridge__';

  const config = {
    enabled: true,
    consentSpoofer: true,
    cookieMutator: true,
    telemetryPoisoner: true,
    fingerprintSpoofer: true,
    chaffGenerator: true
  };

  // Generate a disposable per-page-load fake persona
  const FAKE_PERSONA = generateFakePersona();

  function generateFakePersona() {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const uuid = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    const screens = [
      { w: 1920, h: 1080 },
      { w: 2560, h: 1440 },
      { w: 1536, h: 864 },
      { w: 1440, h: 900 },
      { w: 1680, h: 1050 },
      { w: 1366, h: 768 }
    ];
    const gpus = [
      { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
      { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
      { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
      { vendor: 'Google Inc. (Apple)', renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)' }
    ];
    const decoyTopics = [
      'industrial-hydraulic-excavators',
      'organic-beekeeping-supplies',
      'enterprise-mainframe-cobol',
      'luxury-catamaran-charters',
      'neonatal-strollers-comparison',
      'commercial-concrete-mixers',
      'vintage-accordion-restoration',
      'deep-sea-welding-certification',
      'alpine-goat-cheese-fermentation'
    ];
    const decoyReferrers = [
      'https://www.google.com/',
      'https://duckduckgo.com/',
      'https://news.ycombinator.com/',
      'https://en.wikipedia.org/',
      'https://www.bing.com/'
    ];

    const pickedScreen = screens[randInt(0, screens.length - 1)];
    const pickedGpu = gpus[randInt(0, gpus.length - 1)];
    const tsSec = Math.floor(Date.now() / 1000) - randInt(3600, 86400 * 30);

    return {
      uuid: uuid(),
      gaClientId: `${randInt(100000000, 999999999)}.${tsSec}`,
      gaSessionPrefix: `GS1.1.${tsSec}.1.1.${tsSec + randInt(5, 300)}.0.0.0`,
      fbpId: `fb.1.${Date.now() - randInt(10000, 900000)}.${randInt(1000000000, 9999999999)}`,
      screen: pickedScreen,
      gpu: pickedGpu,
      cores: [4, 8, 12, 16][randInt(0, 3)],
      memory: [4, 8, 16, 32][randInt(0, 3)],
      canvasNoiseSeed: randInt(1, 254),
      topic: decoyTopics[randInt(0, decoyTopics.length - 1)],
      referrer: decoyReferrers[randInt(0, decoyReferrers.length - 1)]
    };
  }

  function emitEvent(type, detail) {
    try {
      const payload = {
        type,
        detail: {
          ...detail,
          timestamp: Date.now(),
          frameUrl: location.href,
          domain: location.hostname || 'local'
        }
      };
      window.dispatchEvent(new CustomEvent(EVENT_TO_ISOLATED, { detail: payload }));
    } catch (_) {}
  }

  window.addEventListener(EVENT_FROM_ISOLATED, (event) => {
    const data = event && event.detail;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'CONFIG_UPDATE' && data.config) {
      Object.assign(config, data.config);
      if (config.enabled && config.cookieMutator) {
        enforceCookieLedgerWatchdog();
      }
    } else if (data.type === 'ROTATE_PERSONA') {
      Object.assign(FAKE_PERSONA, generateFakePersona());
      rotateAllLedgerCookiesToNewPersona();
      emitEvent('PERSONA_ROTATED', {
        summary: `New Fake ID: ${FAKE_PERSONA.uuid.slice(0, 8)}... (${FAKE_PERSONA.screen.w}x${FAKE_PERSONA.screen.h})`
      });
    } else if (data.type === 'GET_LEDGER_SNAPSHOT') {
      emitLedgerSnapshot();
    }
  });

  // ============================================================================
  // 0B. ENCODING-UNIVERSAL TEXT NORMALIZER (UTF-8, Latin-1, Windows-1252, Mojibake, HTML Entities)
  // ============================================================================
  const MOJIBAKE_MAP = [
    [/\u00c3\u00a4|\u00c3\u0084|\u00c3\u0192\u00c2\u00a4|&auml;|&#228;|&#xE4;/gi, 'a'],
    [/\u00c3\u00b6|\u00c3\u0096|\u00c3\u0192\u00c2\u00b6|&ouml;|&#246;|&#xF6;/gi, 'o'],
    [/\u00c3\u00a5|\u00c3\u0085|\u00c3\u0192\u00c2\u00a5|&aring;|&#229;|&#xE5;/gi, 'a'],
    [/\u00c3\u00bc|\u00c3\u009c|&uuml;|&#252;|&#xFC;/gi, 'u'],
    [/\u00c3\u00a9|\u00c3\u0089|\u00c3\u00a8|\u00c3\u00aa|&eacute;|&#233;/gi, 'e'],
    [/\u00c3\u009f|&szlig;/gi, 'ss'],
    [/\u00e2\u0080\u0093|\u00e2\u0080\u0094|&ndash;|&mdash;/g, '-'],
    [/\u00c2\u00a0|&nbsp;/g, ' ']
  ];

  /**
   * Normalizes any string regardless of whether the page is UTF-8, ISO-8859-1,
   * Windows-1252, double-encoded Mojibake, or HTML-entity encoded into a clean
   * ASCII-folded lowercase string for rock-solid matching.
   */
  function normalizeEncodingToAscii(input) {
    if (!input || typeof input !== 'string') return '';
    let str = input;
    for (let i = 0; i < MOJIBAKE_MAP.length; i++) {
      str = str.replace(MOJIBAKE_MAP[i][0], MOJIBAKE_MAP[i][1]);
    }
    try {
      str = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    } catch (_) {}
    // Also map any remaining Nordic/European chars directly
    str = str
      .replace(/[\u00e4\u00e5\u00e0\u00e1\u00e2\u00e3\u00c4\u00c5\u00c0\u00c1\u00c2\u00c3]/g, 'a')
      .replace(/[\u00f6\u00f2\u00f3\u00f4\u00f5\u00f8\u00d6\u00d2\u00d3\u00d4\u00d5\u00d8]/g, 'o')
      .replace(/[\u00fc\u00f9\u00fa\u00fb\u00dc\u00d9\u00da\u00db]/g, 'u')
      .replace(/[\u00eb\u00e8\u00e9\u00ea\u00cb\u00c8\u00c9\u00ca]/g, 'e')
      .replace(/[\u00df]/g, 'ss')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return str;
  }

  // ============================================================================
  // 1. STAGE 1: HEURISTIC CONSENT TRAP SNIFFER & SPOOFER
  // ============================================================================
  const detectedCMPs = new Set();

  function reportCMP(name, action) {
    const key = `${name}:${action}`;
    if (detectedCMPs.has(key)) return;
    detectedCMPs.add(key);
    emitEvent('CMP_DETECTED', {
      cmp: name,
      action,
      summary: `${name} \u2014 ${action}`
    });
  }

  // 1A. Synthetic IAB TCF v2.2 & USPrivacy (USP) API Spoofer
  function buildFakeTCData(listenerId) {
    const allTrue = {};
    for (let i = 1; i <= 24; i++) allTrue[i] = true;
    const vendorConsents = {};
    for (let i = 1; i <= 1000; i++) vendorConsents[i] = true;

    return {
      tcString: 'CP1a2bAP1a2bAAHABBENArCgAP_AAH_AAAqIHPN_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g',
      tcfPolicyVersion: 4,
      cmpId: 6,
      cmpVersion: 1,
      gdprApplies: true,
      eventStatus: 'useractioncomplete',
      cmpStatus: 'loaded',
      listenerId: listenerId || 1,
      isServiceSpecific: true,
      useNonStandardTexts: false,
      publisherCC: 'FI',
      purposeOneTreatment: false,
      purpose: {
        consents: allTrue,
        legitimateInterests: allTrue
      },
      vendor: {
        consents: vendorConsents,
        legitimateInterests: vendorConsents
      },
      specialFeatureOptins: { 1: true, 2: true },
      publisher: {
        consents: allTrue,
        legitimateInterests: allTrue,
        customPurpose: { consents: allTrue, legitimateInterests: allTrue }
      }
    };
  }

  function setupTCFSpoofer() {
    let realTcfApi = window.__tcfapi;

    const fakeTcfHandler = function (command, version, callback, parameter) {
      if (!config.enabled || !config.consentSpoofer) {
        if (typeof realTcfApi === 'function') {
          return realTcfApi(command, version, callback, parameter);
        }
        return;
      }

      reportCMP('IAB TCF v2.2 (__tcfapi)', `Spoofed '${command}' with Fake Full Consent`);

      if (typeof realTcfApi === 'function') {
        try {
          realTcfApi(command, version, (data, success) => {
            if (data && (data.eventStatus === 'cmpuishown' || !success)) {
              if (typeof callback === 'function') {
                callback(buildFakeTCData(data.listenerId), true);
              }
            } else if (typeof callback === 'function') {
              callback(data || buildFakeTCData(), true);
            }
          }, parameter);
          return;
        } catch (_) {}
      }

      if (typeof callback === 'function') {
        if (command === 'ping') {
          callback({
            gdprApplies: true,
            cmpLoaded: true,
            cmpStatus: 'loaded',
            displayStatus: 'hidden',
            apiVersion: '2.2',
            cmpVersion: 1,
            cmpId: 6,
            gvlVersion: 35,
            tcfPolicyVersion: 4
          }, true);
        } else {
          callback(buildFakeTCData(1), true);
        }
      }
    };

    try {
      Object.defineProperty(window, '__tcfapi', {
        configurable: true,
        get() {
          return fakeTcfHandler;
        },
        set(fn) {
          realTcfApi = fn;
          reportCMP('IAB TCF v2.2', 'Intercepted site __tcfapi registration');
        }
      });
    } catch (_) {
      window.__tcfapi = fakeTcfHandler;
    }

    if (!window.__uspapi) {
      window.__uspapi = function (command, version, callback) {
        if (typeof callback === 'function') {
          callback({ version: 1, uspString: '1YNN' }, true);
        }
      };
    }
  }

  setupTCFSpoofer();

  // 1B. Known CMP & "Pay or Okay" Auto-Acceptor + Wall Unlocker
  const CMP_ACCEPT_SELECTORS = [
    // Sourcepoint (hs.fi, is.fi, aamulehti.fi, Guardian, etc.)
    'button.sp_choice_type_11',
    '.message-component.message-button.no-children.focusable.sp_choice_type_11',
    'button[title="Hyv\u00e4ksy kaikki"]',
    'button[title="Hyv\u00e4ksy"]',
    'button[title="Hyvaksy kaikki"]',
    'button[title="Accept all"]',
    'button[title="Accept All"]',
    'button[title="Allow all"]',
    'button[aria-label="Hyv\u00e4ksy kaikki"]',
    'button[aria-label="Accept all"]',
    // OneTrust
    '#onetrust-accept-btn-handler',
    // Cookiebot
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    // Didomi
    '#didomi-notice-agree-button',
    // Quantcast
    '.qc-cmp2-summary-buttons button[mode="primary"]',
    '#qc-cmp2-ui button[mode="primary"]',
    // Gravito / Finnish media CMPs
    '.gravitoCMP-modal-btn-accept-all',
    '#gravitoCMP-accept-all',
    // TrustArc / Usercentrics / Complianz / Osano
    '#truste-consent-button',
    'button[data-testid="uc-accept-all-button"]',
    '.cmplz-accept',
    '.osano-cm-accept-all',
    // Explicit test-lab & generic data attributes
    '[data-cookie-guardian-accept]',
    '[data-testid="accept-all-cookies"]',
    'button[data-action="accept-all"]'
  ];

  // Encoding-normalized (ASCII-folded) accept button patterns:
  // Matches UTF-8, ISO-8859-1, Windows-1252, and Mojibake variants of Finnish, Swedish, English, German, French, Spanish
  const NORMALIZED_ACCEPT_PATTERNS = [
    /^hyvaksy kaikki(\s+evasteet)?$/,
    /^hyvaksy(\s+evasteet)?$/,
    /^salli kaikki(\s+evasteet)?$/,
    /^ok,?\s*hyvaksyn$/,
    /^jatka ja hyvaksy$/,
    /^accept all(\s+cookies)?$/,
    /^allow all(\s+cookies)?$/,
    /^accept(\s+cookies)?$/,
    /^i agree$/,
    /^agree and continue$/,
    /^agree to all$/,
    /^godkann alla(\s+kakor|\s+cookies)?$/,
    /^acceptera alla(\s+kakor|\s+cookies)?$/,
    /^alle akzeptieren$/,
    /^alles akzeptieren$/,
    /^allen zustimmen$/,
    /^tout accepter$/,
    /^aceptar todo(s)?$/
  ];

  // Normalized forbidden words (Subscribe / Pay / Settings / Reject / Manage) — NEVER CLICK
  const NORMALIZED_FORBIDDEN_TEXT =
    /tilaa|subscribe|kirjaudu|log\s*in|sign\s*in|pay|maksa|osto|kassalle|asetukset|settings|manage|hallitse|read more|lue lisaa|customize|muokkaa|valitse|reject|hylkaa/;

  const clickedButtons = new WeakSet();

  function unlockBodyScroll() {
    if (!document.documentElement || !document.body) return;
    if (document.documentElement.classList.contains('sp-message-open')) {
      document.documentElement.classList.remove('sp-message-open');
      reportCMP('Sourcepoint CMP', 'Removed sp-message-open scroll lock');
    }
    const checkEls = [document.documentElement, document.body];
    for (const el of checkEls) {
      if (!el) continue;
      const computed = window.getComputedStyle(el);
      if (computed.overflow === 'hidden' || computed.overflowY === 'hidden' || el.style.overflow === 'hidden') {
        el.style.setProperty('overflow', 'auto', 'important');
        el.style.setProperty('overflow-y', 'auto', 'important');
      }
      if (el.style.position === 'fixed') {
        el.style.setProperty('position', 'static', 'important');
      }
    }
  }

  function scanAndDefeatConsentWalls() {
    if (!config.enabled || !config.consentSpoofer) return;

    // 1. Check programmatic CMP APIs first
    try {
      if (window.OneTrust && typeof window.OneTrust.AllowAll === 'function' && !detectedCMPs.has('OneTrust:API')) {
        detectedCMPs.add('OneTrust:API');
        window.OneTrust.AllowAll();
        reportCMP('OneTrust', 'Triggered OneTrust.AllowAll() + Poisoning');
      }
      if (window.Cookiebot && typeof window.Cookiebot.submitCustomConsent === 'function' && !window.Cookiebot.consented) {
        window.Cookiebot.submitCustomConsent(true, true, true);
        reportCMP('Cookiebot', 'Submitted fake full consent via Cookiebot API');
      }
      if (window.Didomi && typeof window.Didomi.setUserAgreeToAll === 'function' && !detectedCMPs.has('Didomi:API')) {
        detectedCMPs.add('Didomi:API');
        window.Didomi.setUserAgreeToAll();
        reportCMP('Didomi', 'Triggered Didomi.setUserAgreeToAll()');
      }
    } catch (_) {}

    // 2. Check known CMP button selectors
    for (const selector of CMP_ACCEPT_SELECTORS) {
      let btn = null;
      try {
        btn = document.querySelector(selector);
      } catch (_) {}
      if (btn && !clickedButtons.has(btn)) {
        const rawText = (btn.innerText || btn.textContent || btn.title || btn.getAttribute('aria-label') || '').trim();
        const normText = normalizeEncodingToAscii(rawText);
        if (!NORMALIZED_FORBIDDEN_TEXT.test(normText)) {
          clickedButtons.add(btn);
          reportCMP('CMP Consent Wall', `Auto-accepted via selector (${selector})`);
          btn.click();
          setTimeout(() => {
            unlockBodyScroll();
            enforceCookieLedgerWatchdog();
          }, 150);
          return;
        }
      }
    }

    // 3. Encoding-resilient heuristic scan inside CMP iframes or modal overlays
    const isCmpFrame = /privacy-mgmt\.com|sourcepoint|sp\.hs\.fi|sp\.is\.fi|consent|cmp|cookie/i.test(location.href);
    const modalContainers = isCmpFrame
      ? [document.body]
      : document.querySelectorAll(
          '[id*="sp_message"], [class*="sp_message"], [id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"], [id*="cmp"], [class*="cmp"], [role="dialog"], [aria-modal="true"]'
        );

    for (const container of modalContainers) {
      if (!container) continue;
      const buttons = container.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
      for (const btn of buttons) {
        if (clickedButtons.has(btn)) continue;
        const rawLabel = (
          btn.innerText ||
          btn.textContent ||
          btn.value ||
          btn.getAttribute('aria-label') ||
          btn.getAttribute('title') ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim();
        if (!rawLabel || rawLabel.length > 50) continue;

        const normLabel = normalizeEncodingToAscii(rawLabel);
        if (!normLabel || NORMALIZED_FORBIDDEN_TEXT.test(normLabel)) continue;

        const matchesAccept = NORMALIZED_ACCEPT_PATTERNS.some((rx) => rx.test(normLabel));
        if (matchesAccept) {
          clickedButtons.add(btn);
          const cmpName = isCmpFrame ? `CMP Frame (${location.hostname})` : 'Heuristic Pay-or-Okay Sniffer';
          reportCMP(cmpName, `Auto-triggered "${rawLabel}" & locked tracking IDs`);
          btn.click();

          if (!isCmpFrame && container !== document.body && container !== document.documentElement) {
            setTimeout(() => {
              if (container && container.parentNode) {
                container.style.setProperty('display', 'none', 'important');
              }
              unlockBodyScroll();
              enforceCookieLedgerWatchdog();
            }, 120);
          }
          return;
        }
      }
    }

    // 4. Clean up lingering Sourcepoint backdrop if consent cookies already exist
    const spContainer = document.querySelector('div[id^="sp_message_container"]');
    if (spContainer && rawCookieGet().includes('euconsent-v2')) {
      spContainer.style.setProperty('display', 'none', 'important');
      unlockBodyScroll();
    }
  }

  const startConsentObserver = () => {
    scanAndDefeatConsentWalls();
    const obs = new MutationObserver(() => {
      scanAndDefeatConsentWalls();
    });
    obs.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    setInterval(scanAndDefeatConsentWalls, 1200);
  };

  if (document.documentElement) {
    startConsentObserver();
  } else {
    window.addEventListener('DOMContentLoaded', startConsentObserver, { once: true });
  }

  // ============================================================================
  // 2. STAGE 2: STATEFUL COOKIE SHADOW LEDGER & STORAGE MUTATOR
  //    Follows every manipulated cookie across overwrites, deletions, version bumps,
  //    CookieStore API calls, and background HTTP Set-Cookie headers.
  // ============================================================================

  // Functional & consent-unlock cookies that MUST remain intact so walls stay unlocked & logins work
  const SAFE_KEY_PATTERNS =
    /^(euconsent-v2|OptanonAlertBoxClosed|OptanonConsent|CookieConsent|_sp_v1_data|_sp_v1_ss|_sp_v1_opt|_sp_su|sp_tcfv2|didomi_token|didomi_dcs|PHPSESSID|JSESSIONID|ASP\.NET_SessionId|connect\.sid|__Host-|__Secure-|csrf|xsrf|auth|session|login|cart|theme|lang|locale|cf_clearance|__cf_bm)/i;

  // Tracker cookie name patterns (matches versioned suffixes like _ga_ABC123, _sp_v2_uid, consentUUID_v2, AMCV_xxx, etc.)
  const TRACKER_KEY_PATTERNS =
    /^(_ga($|_)|_gid($|_)|_gat($|_)|_gcl_|_fbp($|_)|_fbc($|_)|_uetsid|_uetvid|consentUUID|_sp_v\d+_uid|_sp_v\d+_p|s_ecid|AMCV_|AMCVS_|s_cc$|s_sq$|s_vi|demdex|IDE$|muid|uuid2|anj$|_ym_|hubspotutk|ajs_anonymous_id|ajs_user_id|mp_.*_mixpanel|amplitude_id|_pin_unauth|_ttp|criteo|cto_|outbrain|taboola|lotame|panoramaId|__gads|__gpi|utag_main|_parsely|_chartbeat|_cx_|permutive)/i;

  /**
   * Canonical family name for version-bump detection.
   * Example: '_sp_v1_uid' and '_sp_v2_uid' -> '_sp_v*_uid'
   *          'consentUUID_2' -> 'consentuuid'
   */
  function getCanonicalCookieFamily(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/_v\d+/g, '_v*')
      .replace(/[-_.]v?\d+$/g, '');
  }

  /**
   * Stateful Shadow Ledger of all cookies we have manipulated on this page:
   * cookieName -> {
   *   name: string,
   *   family: string,
   *   originalFirstSeen: string,
   *   lastSiteAttemptedVal: string,
   *   poisonedVal: string,
   *   versionCount: number,
   *   reInjectionsBlocked: number,
   *   wasClearedBySite: boolean,
   *   attrs: string,
   *   updatedAt: number
   * }
   */
  const cookieLedger = new Map();
  // Also index by canonical family so if the site injects a version-bumped cookie name
  // (e.g., consentUUID_v2), we link its lineage!
  const familyLedger = new Map();
  // Set of all active poisoned values we generated so we NEVER double-mutate our own values
  const ourPoisonedValues = new Set();

  function calculateShannonEntropy(str) {
    if (!str || str.length === 0) return 0;
    const freq = {};
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      freq[ch] = (freq[ch] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const ch in freq) {
      const p = freq[ch] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  function decodeCookieValSafe(val) {
    if (!val) return '';
    try {
      return decodeURIComponent(val);
    } catch (_) {
      return val;
    }
  }

  function isTrackingKeyOrValue(key, val) {
    if (!key || SAFE_KEY_PATTERNS.test(key)) return false;
    if (cookieLedger.has(key)) return true; // Once tracked in our ledger, we ALWAYS follow it!
    if (TRACKER_KEY_PATTERNS.test(key)) return true;
    const family = getCanonicalCookieFamily(key);
    if (familyLedger.has(family)) return true; // Version-bumped successor of a tracked cookie!

    // Heuristic: high-entropy random ID (UUID, hex hash, or long token)
    const decoded = decodeCookieValSafe(val);
    if (decoded && decoded.length >= 16 && decoded.length <= 160) {
      const entropy = calculateShannonEntropy(decoded);
      if (entropy >= 3.6 && /^[a-zA-Z0-9_\-.:|%+]+$/.test(val)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a format-preserving fake value tied deterministically to FAKE_PERSONA
   * and the cookie's canonical family, so even if the site re-injects or bumps versions,
   * the tracker receives a consistent fake persona without our software losing track.
   */
  function computePoisonedValue(key, rawVal) {
    if (!rawVal) return rawVal;
    if (ourPoisonedValues.has(rawVal)) return rawVal;

    // 1. Google Analytics 4 Session Cookie: GS1.1.<ts>.<count>.<eng>.<ts2>.0.0.0
    if (/^GS1\.\d+\.\d+/.test(rawVal)) {
      return FAKE_PERSONA.gaSessionPrefix;
    }
    // 2. Google Analytics Universal / GA4 Client ID: GA1.1.123456789.1700000000
    if (/^GA1\.\d+\.\d+\.\d+/.test(rawVal)) {
      return `GA1.1.${FAKE_PERSONA.gaClientId}`;
    }
    // 3. Meta Pixel: fb.1.1700000000.123456789
    if (/^fb\.\d+\.\d+\.\d+/.test(rawVal)) {
      return FAKE_PERSONA.fbpId;
    }
    // 4. Standard UUID v4 (e.g., Sourcepoint consentUUID on hs.fi)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVal)) {
      return FAKE_PERSONA.uuid;
    }

    // 5. Format-preserving character-class mutation seeded by FAKE_PERSONA.uuid + canonical key family
    //    Because this is seeded by (FAKE_PERSONA.uuid + family), it is deterministic for the persona
    //    and preserves exact delimiters (|, ., -, %, :) and character classes (digits, hex, upper/lower alpha).
    const family = getCanonicalCookieFamily(key);
    const seedStr = FAKE_PERSONA.uuid.replace(/-/g, '') + family;
    let out = '';
    for (let i = 0; i < rawVal.length; i++) {
      const ch = rawVal[i];
      // Preserve URL-encoded %XX sequences intact
      if (ch === '%' && i + 2 < rawVal.length && /^[0-9a-fA-F]{2}$/.test(rawVal.slice(i + 1, i + 3))) {
        out += rawVal.slice(i, i + 3);
        i += 2;
        continue;
      }
      const code = (seedStr.charCodeAt(i % seedStr.length) + i * 7) % 29 + 1;
      if (ch >= '0' && ch <= '9') {
        out += String(((i + code) % 9) + 1);
      } else if (ch >= 'a' && ch <= 'f') {
        out += ((i + code) % 15 + 1).toString(16);
      } else if (ch >= 'A' && ch <= 'F') {
        out += ((i + code) % 15 + 1).toString(16).toUpperCase();
      } else if (ch >= 'a' && ch <= 'z') {
        out += String.fromCharCode(97 + ((i + code) % 26));
      } else if (ch >= 'A' && ch <= 'Z') {
        out += String.fromCharCode(65 + ((i + code) % 26));
      } else {
        out += ch;
      }
    }
    if (out === rawVal && rawVal.length > 0) {
      out = out.slice(0, -1) + (out.endsWith('1') ? '2' : '1');
    }
    return out;
  }

  /**
   * Registers or updates a cookie in the Stateful Shadow Ledger and returns the authoritative poisoned value.
   */
  function trackAndMutateInLedger(key, incomingVal, rawAttrTail, sourceLabel) {
    const cleanKey = String(key || '').trim();
    const cleanVal = String(incomingVal || '').trim();
    const family = getCanonicalCookieFamily(cleanKey);

    let entry = cookieLedger.get(cleanKey);

    // Check if the site is trying to delete/expire a cookie we are following
    const isExpiryDelete =
      cleanVal === '' ||
      /max-age\s*=\s*-?0\b/i.test(rawAttrTail || '') ||
      /expires\s*=\s*[^;]*1970/i.test(rawAttrTail || '');

    if (isExpiryDelete) {
      if (entry) {
        entry.wasClearedBySite = true;
        entry.reInjectionsBlocked++;
        entry.updatedAt = Date.now();
        emitEvent('COOKIE_REINJECTION_BLOCKED', {
          name: cleanKey,
          cookieName: cleanKey,
          lockedValue: entry.poisonedVal,
          poisoned: entry.poisonedVal,
          source: 'JS',
          summary: `Blocked cookie deletion on '${cleanKey}' \u2014 restored fake ID ${entry.poisonedVal.slice(0, 12)}...`
        });
        return { poisonedVal: entry.poisonedVal, isDeletion: false, restoredFromDelete: true, entry };
      }
      return { poisonedVal: cleanVal, isDeletion: true, entry: null };
    }

    // If incomingVal is ALREADY our poisoned value, do not re-mutate!
    if (entry && cleanVal === entry.poisonedVal) {
      return { poisonedVal: entry.poisonedVal, isReInjection: false, alreadyOurs: true, entry };
    }
    if (ourPoisonedValues.has(cleanVal) && entry) {
      return { poisonedVal: entry.poisonedVal, isReInjection: false, alreadyOurs: true, entry };
    }

    // Check if this is a version-bumped cookie name from an existing family (e.g. consentUUID -> consentUUID_v2)
    const familyEntry = familyLedger.get(family);

    // Compute the authoritative poisoned value for this cookie:
    // If we already locked a poisonedVal for this cookie (or its canonical family), keep it stable!
    let poisonedVal;
    if (entry && entry.poisonedVal) {
      poisonedVal = entry.poisonedVal;
    } else if (familyEntry && familyEntry.poisonedVal) {
      poisonedVal = familyEntry.poisonedVal;
    } else {
      poisonedVal = computePoisonedValue(cleanKey, cleanVal);
    }

    ourPoisonedValues.add(poisonedVal);

    if (!entry) {
      const inheritedVersion = familyEntry ? familyEntry.versionCount + 1 : 1;
      const isVersionBump = Boolean(familyEntry && familyEntry.name !== cleanKey);
      entry = {
        name: cleanKey,
        family,
        originalFirstSeen: cleanVal,
        lastSiteAttemptedVal: cleanVal,
        poisonedVal,
        versionCount: inheritedVersion,
        reInjectionsBlocked: isVersionBump ? 1 : 0,
        wasClearedBySite: false,
        attrs: rawAttrTail || '; path=/',
        updatedAt: Date.now()
      };
      cookieLedger.set(cleanKey, entry);
      familyLedger.set(family, entry);

      emitEvent(isVersionBump ? 'COOKIE_REINJECTION_BLOCKED' : 'COOKIE_MUTATED', {
        name: cleanKey,
        cookieName: cleanKey,
        poisoned: poisonedVal,
        lockedValue: poisonedVal,
        source: 'JS',
        originalPreview: cleanVal.slice(0, 18),
        mutatedPreview: poisonedVal.slice(0, 18),
        version: entry.versionCount,
        summary: isVersionBump
          ? `Followed version-bumped cookie '${cleanKey}' (from '${familyEntry.name}') \u2192 ${poisonedVal.slice(0, 12)}...`
          : `Cookie '${cleanKey}' (${sourceLabel}): ${cleanVal.slice(0, 10)}... \u2192 ${poisonedVal.slice(0, 10)}...`
      });
    } else {
      // We are ALREADY following this cookie! Check if the page tried to inject a new value/version
      const isNewAttempt = cleanVal !== entry.lastSiteAttemptedVal || entry.wasClearedBySite;
      entry.lastSiteAttemptedVal = cleanVal;
      entry.poisonedVal = poisonedVal;
      if (rawAttrTail && !/max-age\s*=\s*-?0\b/i.test(rawAttrTail) && !/expires\s*=\s*[^;]*1970/i.test(rawAttrTail)) {
        entry.attrs = rawAttrTail;
      }
      entry.updatedAt = Date.now();

      if (isNewAttempt) {
        entry.versionCount++;
        entry.reInjectionsBlocked++;
        const reason = entry.wasClearedBySite ? 'delete+reinject' : `v${entry.versionCount} overwrite`;
        entry.wasClearedBySite = false;

        emitEvent('COOKIE_REINJECTION_BLOCKED', {
          name: cleanKey,
          cookieName: cleanKey,
          poisoned: poisonedVal,
          lockedValue: poisonedVal,
          source: 'JS',
          originalPreview: cleanVal.slice(0, 18),
          mutatedPreview: poisonedVal.slice(0, 18),
          version: entry.versionCount,
          reInjection: true,
          summary: `Blocked ${reason} on '${cleanKey}' \u2014 kept fake ID ${poisonedVal.slice(0, 12)}...`
        });
      }
    }

    return { poisonedVal, isReInjection: entry.reInjectionsBlocked > 0, alreadyOurs: false, entry };
  }

  // Raw native cookie getter/setter references
  const nativeCookieDesc =
    Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

  function rawCookieGet() {
    if (nativeCookieDesc && nativeCookieDesc.get) {
      try {
        return nativeCookieDesc.get.call(document) || '';
      } catch (_) {}
    }
    return '';
  }

  function rawCookieSet(cookieStr) {
    if (nativeCookieDesc && nativeCookieDesc.set) {
      try {
        nativeCookieDesc.set.call(document, cookieStr);
      } catch (_) {}
    }
  }

  function rotateAllLedgerCookiesToNewPersona() {
    ourPoisonedValues.clear();
    for (const [key, entry] of cookieLedger.entries()) {
      const newPoison = computePoisonedValue(key, entry.lastSiteAttemptedVal || entry.originalFirstSeen);
      ourPoisonedValues.add(newPoison);
      entry.poisonedVal = newPoison;
      entry.versionCount++;
      entry.updatedAt = Date.now();
      rawCookieSet(`${key}=${newPoison}${entry.attrs || '; path=/'}`);
    }
  }

  function emitLedgerSnapshot() {
    const items = [];
    for (const entry of cookieLedger.values()) {
      items.push({
        name: entry.name,
        originalPreview: entry.lastSiteAttemptedVal.slice(0, 16),
        poisonedPreview: entry.poisonedVal.slice(0, 16),
        versionCount: entry.versionCount,
        reInjectionsBlocked: entry.reInjectionsBlocked
      });
    }
    emitEvent('LEDGER_SNAPSHOT', {
      trackedCount: items.length,
      items
    });
  }

  /**
   * Self-healing Watchdog:
   * Inspects the real browser cookie jar (`rawCookieGet()`).
   * 1. If any cookie in `cookieLedger` was overwritten by an HTTP Set-Cookie header or sub-frame
   *    with a value != `entry.poisonedVal`, immediately snap it back to `entry.poisonedVal`.
   * 2. If any cookie in `cookieLedger` was deleted from the jar, restore it.
   * 3. If any new unmutated tracker cookie appeared in `document.cookie` (e.g., set by HTTP header),
   *    enroll it into `cookieLedger` and overwrite it in the jar.
   */
  function enforceCookieLedgerWatchdog() {
    if (!config.enabled || !config.cookieMutator) return;
    const raw = rawCookieGet();
    const seenInJar = new Map();

    if (raw) {
      const pairs = raw.split(';');
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) continue;
        const k = pair.slice(0, eqIdx).trim();
        const v = pair.slice(eqIdx + 1).trim();
        if (!k) continue;
        seenInJar.set(k, v);

        if (isTrackingKeyOrValue(k, v)) {
          const existing = cookieLedger.get(k);
          if (!existing || v !== existing.poisonedVal) {
            const { poisonedVal, isDeletion } = trackAndMutateInLedger(k, v, '; path=/', 'Watchdog');
            if (!isDeletion && poisonedVal !== v) {
              rawCookieSet(`${k}=${poisonedVal}; path=/`);
            }
          }
        }
      }
    }

    // Restore any tracked cookies that were wiped from the jar
    for (const [k, entry] of cookieLedger.entries()) {
      if (!seenInJar.has(k) && entry.poisonedVal) {
        rawCookieSet(`${k}=${entry.poisonedVal}${entry.attrs || '; path=/'}`);
      }
    }
  }

  function setupStorageGuard() {
    try {
      // 2A. Hook document.cookie getter & setter backed by the Stateful Cookie Shadow Ledger
      if (nativeCookieDesc && nativeCookieDesc.get && nativeCookieDesc.set) {
        Object.defineProperty(document, 'cookie', {
          configurable: true,
          get() {
            const raw = nativeCookieDesc.get.call(this);
            if (!config.enabled || !config.cookieMutator || !raw) return raw;

            return raw
              .split(';')
              .map((pair) => {
                const eqIdx = pair.indexOf('=');
                if (eqIdx === -1) return pair;
                const k = pair.slice(0, eqIdx).trim();
                const v = pair.slice(eqIdx + 1).trim();

                // If already tracked in ledger, return the locked poisoned value without re-mutating!
                if (cookieLedger.has(k)) {
                  const entry = cookieLedger.get(k);
                  if (v !== entry.poisonedVal) {
                    // Site or HTTP header slipped a new version into the jar! Catch and re-lock it.
                    trackAndMutateInLedger(k, v, entry.attrs, 'HTTP/Jar Drift');
                    rawCookieSet(`${k}=${entry.poisonedVal}${entry.attrs || '; path=/'}`);
                  }
                  return `${k}=${entry.poisonedVal}`;
                }

                if (isTrackingKeyOrValue(k, v)) {
                  const { poisonedVal } = trackAndMutateInLedger(k, v, '; path=/', 'Getter');
                  rawCookieSet(`${k}=${poisonedVal}; path=/`);
                  return `${k}=${poisonedVal}`;
                }
                return pair;
              })
              .join('; ');
          },
          set(val) {
            if (!config.enabled || !config.cookieMutator || typeof val !== 'string') {
              return nativeCookieDesc.set.call(this, val);
            }
            const semiIdx = val.indexOf(';');
            const firstPart = semiIdx === -1 ? val : val.slice(0, semiIdx);
            const attrTail = semiIdx === -1 ? '' : val.slice(semiIdx);
            const eqIdx = firstPart.indexOf('=');

            if (eqIdx !== -1) {
              const k = firstPart.slice(0, eqIdx).trim();
              const v = firstPart.slice(eqIdx + 1).trim();
              if (isTrackingKeyOrValue(k, v)) {
                const { poisonedVal, isDeletion, restoredFromDelete, entry } = trackAndMutateInLedger(k, v, attrTail, 'JS Set');
                if (restoredFromDelete && entry) {
                  return nativeCookieDesc.set.call(this, `${k}=${entry.poisonedVal}${entry.attrs || '; path=/'}`);
                }
                if (isDeletion) {
                  return nativeCookieDesc.set.call(this, val);
                }
                return nativeCookieDesc.set.call(this, `${k}=${poisonedVal}${attrTail}`);
              }
            }
            return nativeCookieDesc.set.call(this, val);
          }
        });
      }

      // 2B. Hook Modern Async CookieStore API (window.cookieStore)
      if (window.cookieStore && typeof window.cookieStore === 'object') {
        const cs = window.cookieStore;
        if (typeof cs.set === 'function') {
          const origCsSet = cs.set.bind(cs);
          cs.set = function (nameOrObj, maybeVal) {
            if (!config.enabled || !config.cookieMutator) {
              return origCsSet(nameOrObj, maybeVal);
            }
            if (typeof nameOrObj === 'string') {
              const k = nameOrObj;
              const v = String(maybeVal ?? '');
              if (isTrackingKeyOrValue(k, v)) {
                const { poisonedVal } = trackAndMutateInLedger(k, v, '; path=/', 'CookieStore.set');
                return origCsSet(k, poisonedVal);
              }
            } else if (nameOrObj && typeof nameOrObj === 'object' && nameOrObj.name) {
              const k = nameOrObj.name;
              const v = String(nameOrObj.value ?? '');
              if (isTrackingKeyOrValue(k, v)) {
                const { poisonedVal } = trackAndMutateInLedger(k, v, '; path=/', 'CookieStore.set');
                return origCsSet({ ...nameOrObj, value: poisonedVal });
              }
            }
            return origCsSet(nameOrObj, maybeVal);
          };
        }

        if (typeof cs.get === 'function') {
          const origCsGet = cs.get.bind(cs);
          cs.get = async function (...args) {
            const res = await origCsGet(...args);
            if (!res || !config.enabled || !config.cookieMutator) return res;
            if (res.name && isTrackingKeyOrValue(res.name, res.value)) {
              const { poisonedVal } = trackAndMutateInLedger(res.name, res.value, '; path=/', 'CookieStore.get');
              return { ...res, value: poisonedVal };
            }
            return res;
          };
        }

        if (typeof cs.getAll === 'function') {
          const origCsGetAll = cs.getAll.bind(cs);
          cs.getAll = async function (...args) {
            const list = await origCsGetAll(...args);
            if (!Array.isArray(list) || !config.enabled || !config.cookieMutator) return list;
            return list.map((item) => {
              if (item && item.name && isTrackingKeyOrValue(item.name, item.value)) {
                const { poisonedVal } = trackAndMutateInLedger(item.name, item.value, '; path=/', 'CookieStore.getAll');
                return { ...item, value: poisonedVal };
              }
              return item;
            });
          };
        }
      }

      // 2C. Hook localStorage & sessionStorage (getItem + setItem) with Ledger consistency
      const storageLedger = new Map();
      const origSetItem = Storage.prototype.setItem;
      const origGetItem = Storage.prototype.getItem;

      Storage.prototype.setItem = function (key, value) {
        if (config.enabled && config.cookieMutator) {
          const strVal = String(value);
          if (isTrackingKeyOrValue(key, strVal)) {
            const prev = storageLedger.get(key);
            if (prev && strVal === prev.poisonedVal) {
              return origSetItem.call(this, key, strVal);
            }
            const poisonedVal =
              prev && prev.poisonedVal && prev.poisonedVal.length === strVal.length
                ? prev.poisonedVal
                : computePoisonedValue(key, strVal);
            ourPoisonedValues.add(poisonedVal);

            const version = prev ? prev.version + 1 : 1;
            storageLedger.set(key, {
              originalVal: strVal,
              poisonedVal,
              version
            });

            if (!prev || prev.originalVal !== strVal) {
              emitEvent('COOKIE_MUTATED', {
                cookieName: `storage.${key}`,
                originalPreview: strVal.slice(0, 18),
                mutatedPreview: poisonedVal.slice(0, 18),
                version,
                summary:
                  version > 1
                    ? `Blocked storage overwrite v${version} on '${key}' \u2192 kept fake ID`
                    : `Storage '${key}': poisoned with fake ID ${poisonedVal.slice(0, 12)}...`
              });
            }
            return origSetItem.call(this, key, poisonedVal);
          }
        }
        return origSetItem.call(this, key, value);
      };

      Storage.prototype.getItem = function (key) {
        const raw = origGetItem.call(this, key);
        if (raw && config.enabled && config.cookieMutator && isTrackingKeyOrValue(key, raw)) {
          const prev = storageLedger.get(key);
          if (prev) {
            if (raw !== prev.poisonedVal) {
              origSetItem.call(this, key, prev.poisonedVal);
            }
            return prev.poisonedVal;
          }
          const poisonedVal = computePoisonedValue(key, raw);
          ourPoisonedValues.add(poisonedVal);
          storageLedger.set(key, { originalVal: raw, poisonedVal, version: 1 });
          origSetItem.call(this, key, poisonedVal);
          return poisonedVal;
        }
        return raw;
      };
    } catch (_) {}

    // Initial scan & periodic self-healing watchdog
    enforceCookieLedgerWatchdog();
    setInterval(enforceCookieLedgerWatchdog, 1500);
    window.addEventListener('focus', enforceCookieLedgerWatchdog);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) enforceCookieLedgerWatchdog();
    });
  }

  setupStorageGuard();

  // ============================================================================
  // 3. STAGE 3: OUTGOING TELEMETRY & ANALYTICS POISONER
  // ============================================================================
  const TRACKER_URL_REGEX =
    /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net|facebook\.com\/tr|connect\.facebook\.net|omtrdc\.net|2o7\.net|demdex\.net|adobedtm\.com|scorecardresearch\.com|chartbeat\.com|criteo\.com|criteo\.net|hotjar\.com|clarity\.ms|segment\.io|segment\.com|mixpanel\.com|amplitude\.com|bat\.bing\.com|analytics\.tiktok\.com|ads-twitter\.com|adnxs\.com|rubiconproject\.com|pubmatic\.com|smartadserver\.com|sanoma.*\/(analytics|track|telemetry|collector)|\/g\/collect|\/j\/collect|\/b\/ss\/|\/pixel|\/beacon|\/telemetry|\/track\b/i;

  function isTrackerEndpoint(urlStr) {
    if (!urlStr) return false;
    return TRACKER_URL_REGEX.test(String(urlStr));
  }

  function poisonUrlParams(urlStr) {
    try {
      const url = new URL(urlStr, location.origin);
      const paramPoisonMap = {
        cid: FAKE_PERSONA.gaClientId,
        uid: FAKE_PERSONA.uuid,
        _p: String(Math.floor(Math.random() * 999999999)),
        sr: `${FAKE_PERSONA.screen.w}x${FAKE_PERSONA.screen.h}`,
        vp: `${FAKE_PERSONA.screen.w}x${FAKE_PERSONA.screen.h - 120}`,
        dr: FAKE_PERSONA.referrer,
        dl: `${location.origin}/?topic=${FAKE_PERSONA.topic}`,
        dt: `Article - ${FAKE_PERSONA.topic.replace(/-/g, ' ')}`,
        ul: 'en-us',
        u: FAKE_PERSONA.uuid,
        mcorgid: FAKE_PERSONA.uuid.replace(/-/g, '').slice(0, 24) + '@AdobeOrg',
        mid: FAKE_PERSONA.uuid.replace(/-/g, '')
      };

      let mutatedCount = 0;
      for (const [k, fakeVal] of Object.entries(paramPoisonMap)) {
        if (url.searchParams.has(k)) {
          url.searchParams.set(k, fakeVal);
          mutatedCount++;
        }
      }
      if (mutatedCount === 0) {
        url.searchParams.set('_cg_noise', FAKE_PERSONA.topic);
      }
      return url.toString();
    } catch (_) {
      return urlStr;
    }
  }

  function poisonPayloadBody(body) {
    if (!body) return body;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        const poisonObj = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          for (const k of Object.keys(obj)) {
            const lower = k.toLowerCase();
            if (
              lower.includes('userid') ||
              lower.includes('clientid') ||
              lower.includes('anonymousid') ||
              lower.includes('deviceid') ||
              lower.includes('uuid') ||
              lower.includes('consentid')
            ) {
              obj[k] = FAKE_PERSONA.uuid;
            } else if (lower.includes('referrer')) {
              obj[k] = FAKE_PERSONA.referrer;
            } else if (lower.includes('title') || lower.includes('topic')) {
              obj[k] = FAKE_PERSONA.topic;
            } else if (typeof obj[k] === 'object') {
              poisonObj(obj[k]);
            }
          }
        };
        poisonObj(parsed);
        return JSON.stringify(parsed);
      } catch (_) {
        return body + `&_cg_noise=${encodeURIComponent(FAKE_PERSONA.topic)}`;
      }
    }
    return body;
  }

  function setupTelemetryPoisoner() {
    if (navigator.sendBeacon) {
      const origSendBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        if (config.enabled && config.telemetryPoisoner && isTrackerEndpoint(url)) {
          const poisonedUrl = poisonUrlParams(url);
          const poisonedData = poisonPayloadBody(data);
          let host = 'tracker';
          try {
            host = new URL(url, location.origin).hostname;
          } catch (_) {}
          emitEvent('TELEMETRY_POISONED', {
            method: 'sendBeacon',
            target: host,
            summary: `Poisoned sendBeacon \u2192 ${host} (fed topic: ${FAKE_PERSONA.topic})`
          });
          try {
            return origSendBeacon(poisonedUrl, poisonedData);
          } catch (_) {
            return true;
          }
        }
        return origSendBeacon(url, data);
      };
    }

    if (window.fetch) {
      const origFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        const urlStr = typeof input === 'string' ? input : input && input.url ? input.url : '';
        if (config.enabled && config.telemetryPoisoner && isTrackerEndpoint(urlStr)) {
          const poisonedUrl = poisonUrlParams(urlStr);
          const newInit = init ? { ...init } : {};
          if (newInit.body) {
            newInit.body = poisonPayloadBody(newInit.body);
          }
          let host = 'tracker';
          try {
            host = new URL(urlStr, location.origin).hostname;
          } catch (_) {}
          emitEvent('TELEMETRY_POISONED', {
            method: 'fetch',
            target: host,
            summary: `Poisoned fetch \u2192 ${host} (fake ID: ${FAKE_PERSONA.uuid.slice(0, 8)})`
          });
          return origFetch(poisonedUrl, newInit).then((res) => {
            // After fetch completes, ensure any Set-Cookie response headers didn't overwrite our ledger
            setTimeout(enforceCookieLedgerWatchdog, 20);
            return res;
          }).catch(() => {
            return new Response(JSON.stringify({ status: 'ok' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        }
        return origFetch(input, init).then((res) => {
          setTimeout(enforceCookieLedgerWatchdog, 20);
          return res;
        });
      };
    }

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__cgUrl = url;
      if (config.enabled && config.telemetryPoisoner && isTrackerEndpoint(url)) {
        this.__cgIsTracker = true;
        const poisonedUrl = poisonUrlParams(url);
        return origOpen.call(this, method, poisonedUrl, ...rest);
      }
      return origOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
      this.addEventListener('readystatechange', () => {
        if (this.readyState === 2 || this.readyState === 4) {
          enforceCookieLedgerWatchdog();
        }
      });
      if (config.enabled && config.telemetryPoisoner && this.__cgIsTracker) {
        let host = 'tracker';
        try {
          host = new URL(this.__cgUrl, location.origin).hostname;
        } catch (_) {}
        emitEvent('TELEMETRY_POISONED', {
          method: 'XHR',
          target: host,
          summary: `Poisoned XHR \u2192 ${host} (injected decoy metrics)`
        });
        return origSend.call(this, poisonPayloadBody(body));
      }
      return origSend.call(this, body);
    };
  }

  setupTelemetryPoisoner();

  // ============================================================================
  // 4. STAGE 4: HARDWARE & CANVAS FINGERPRINT SPOOFER
  // ============================================================================
  let fpReported = false;
  function reportFingerprint(surface) {
    if (fpReported) return;
    fpReported = true;
    emitEvent('FINGERPRINT_SPOOFED', {
      surface,
      summary: `Spoofed ${surface} fingerprint (GPU: ${FAKE_PERSONA.gpu.vendor}, Screen: ${FAKE_PERSONA.screen.w}x${FAKE_PERSONA.screen.h})`
    });
  }

  function setupFingerprintSpoofer() {
    try {
      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        if (config.enabled && config.fingerprintSpoofer) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const imgData = ctx.getImageData(0, 0, Math.min(4, this.width), Math.min(4, this.height));
              imgData.data[0] = (imgData.data[0] + FAKE_PERSONA.canvasNoiseSeed) % 256;
              ctx.putImageData(imgData, 0, 0);
              reportFingerprint('Canvas 2D');
            }
          } catch (_) {}
        }
        return origToDataURL.apply(this, args);
      };

      const origGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (param) {
        if (config.enabled && config.fingerprintSpoofer) {
          if (param === 37445) {
            reportFingerprint('WebGL GPU');
            return FAKE_PERSONA.gpu.vendor;
          }
          if (param === 37446) {
            reportFingerprint('WebGL GPU');
            return FAKE_PERSONA.gpu.renderer;
          }
        }
        return origGetParameter.call(this, param);
      };

      Object.defineProperty(navigator, 'hardwareConcurrency', {
        configurable: true,
        get: () => (config.enabled && config.fingerprintSpoofer ? FAKE_PERSONA.cores : 8)
      });
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          configurable: true,
          get: () => (config.enabled && config.fingerprintSpoofer ? FAKE_PERSONA.memory : 8)
        });
      }
    } catch (_) {}
  }

  setupFingerprintSpoofer();

  // ============================================================================
  // 5. STAGE 5: BACKGROUND CHAFF GENERATOR (POLLUTES AD PROFILES)
  // ============================================================================
  const CHAFF_TOPICS = [
    'hydraulic-mining-shovels',
    'medieval-lute-strings',
    'industrial-poultry-incubators',
    'luxury-superyacht-brokerage',
    'commercial-asphalt-pavers',
    'bonsai-soil-ph-meters',
    'cryogenic-valve-gaskets',
    'professional-accordion-straps'
  ];

  function startChaffLoop() {
    if (window !== window.top) return;
    setInterval(() => {
      if (!config.enabled || !config.chaffGenerator || document.hidden) return;
      const randomTopic = CHAFF_TOPICS[Math.floor(Math.random() * CHAFF_TOPICS.length)];
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: 'page_interest_signal',
          interest_category: randomTopic,
          client_id: FAKE_PERSONA.uuid,
          screen_resolution: `${FAKE_PERSONA.screen.w}x${FAKE_PERSONA.screen.h}`
        });
        emitEvent('CHAFF_SENT', {
          topic: randomTopic,
          summary: `Injected decoy interest '${randomTopic}' into site dataLayer`
        });
      }
    }, 18000);
  }

  startChaffLoop();
})();
