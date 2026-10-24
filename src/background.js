/**
 * Voidwalker - Background Service Worker (src/background.js)
 *
 * Responsibilities:
 *  1. Browser-level HTTP Set-Cookie Interceptor, Stateful Cookie Ledger & Format-Preserving Mutator
 *  2. Follows manipulated cookies across HTTP overwrites, delete+recreate cycles, and version bumps
 *  3. Per-Tab Sniffer Telemetry, Followed Cookie Ledger & Threat Log Aggregator
 *  4. Toolbar Badge Counter & Popup State Provider
 */

const DEFAULT_CONFIG = {
  enabled: true,
  consentSpoofer: true,
  cookieMutator: true,
  telemetryPoisoner: true,
  fingerprintSpoofer: true,
  chaffGenerator: true
};

let currentConfig = { ...DEFAULT_CONFIG };

// Per-tab stats: tabId -> { wallsDefeated, cookiesMutated, reInjectionsBlocked, telemetryPoisoned, fingerprintsSpoofed, chaffSent, detectedCmp, trackedCookies: {}, logs: [] }
const tabStats = new Map();

// Global lifetime stats
let globalStats = {
  wallsDefeated: 0,
  cookiesMutated: 0,
  reInjectionsBlocked: 0,
  telemetryPoisoned: 0,
  fingerprintsSpoofed: 0,
  chaffSent: 0
};

// Track cookie values we already mutated so chrome.cookies.onChanged doesn't loop
const recentlyMutatedCookieValues = new Set();

// Stateful HTTP Cookie Ledger:
// key: `${cleanDomain}|${cookieName}` -> { name, domain, canonicalFamily, originalValue, poisonedValue, coreFakeId, reInjectionsBlocked, updatedAt }
const httpCookieLedger = new Map();
// Family ledger by domain: `${cleanDomain}|${canonicalFamily}` -> ledgerEntry
const httpFamilyLedger = new Map();

// Initialize storage on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['cgConfig', 'cgGlobalStats'], (res) => {
    if (!res.cgConfig) {
      chrome.storage.local.set({ cgConfig: DEFAULT_CONFIG });
    } else {
      currentConfig = { ...DEFAULT_CONFIG, ...res.cgConfig };
    }
    if (res.cgGlobalStats) {
      globalStats = { ...globalStats, ...res.cgGlobalStats };
    }
  });
});

chrome.storage.local.get(['cgConfig', 'cgGlobalStats'], (res) => {
  if (res && res.cgConfig) {
    currentConfig = { ...DEFAULT_CONFIG, ...res.cgConfig };
  }
  if (res && res.cgGlobalStats) {
    globalStats = { ...globalStats, ...res.cgGlobalStats };
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.cgConfig && changes.cgConfig.newValue) {
    currentConfig = { ...DEFAULT_CONFIG, ...changes.cgConfig.newValue };
  }
});

function getOrCreateTabEntry(tabId) {
  if (!tabStats.has(tabId)) {
    tabStats.set(tabId, {
      wallsDefeated: 0,
      cookiesMutated: 0,
      reInjectionsBlocked: 0,
      telemetryPoisoned: 0,
      fingerprintsSpoofed: 0,
      chaffSent: 0,
      detectedCmp: 'Scanning...',
      trackedCookies: {},
      logs: []
    });
  }
  return tabStats.get(tabId);
}

function updateBadge(tabId) {
  if (!tabId || tabId < 0) return;
  const entry = tabStats.get(tabId);
  if (!currentConfig.enabled) {
    chrome.action.setBadgeText({ tabId, text: 'OFF' }).catch(() => {});
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#64748b' }).catch(() => {});
    return;
  }
  if (!entry) {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    return;
  }
  const total =
    entry.wallsDefeated +
    entry.cookiesMutated +
    (entry.reInjectionsBlocked || 0) +
    entry.telemetryPoisoned +
    entry.fingerprintsSpoofed +
    entry.chaffSent;

  chrome.action.setBadgeText({ tabId, text: total > 0 ? String(total) : '' }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' }).catch(() => {});
}

function upsertTabTrackedCookie(entry, name, poisonedValue, source, isReinjection) {
  if (!entry || !name) return;
  if (!entry.trackedCookies) entry.trackedCookies = {};
  const existing = entry.trackedCookies[name];
  if (existing) {
    if (poisonedValue) existing.poisonedValue = poisonedValue;
    if (isReinjection) existing.reInjectionsBlocked = (existing.reInjectionsBlocked || 0) + 1;
    existing.updatedAt = Date.now();
  } else {
    entry.trackedCookies[name] = {
      name,
      poisonedValue: poisonedValue || 'locked',
      source: source || 'JS',
      reInjectionsBlocked: isReinjection ? 1 : 0,
      updatedAt: Date.now()
    };
  }
}

function recordGuardianEvent(tabId, eventType, detail) {
  const entry = getOrCreateTabEntry(tabId);
  const d = detail || {};

  if (eventType === 'CMP_DETECTED') {
    entry.wallsDefeated++;
    globalStats.wallsDefeated++;
    entry.detectedCmp = d.cmp || 'Detected Consent Wall';
  } else if (eventType === 'COOKIE_MUTATED') {
    entry.cookiesMutated++;
    globalStats.cookiesMutated++;
    if (d.name) {
      upsertTabTrackedCookie(entry, d.name, d.poisoned, d.source || 'JS', false);
    }
  } else if (eventType === 'COOKIE_REINJECTION_BLOCKED') {
    entry.reInjectionsBlocked = (entry.reInjectionsBlocked || 0) + 1;
    globalStats.reInjectionsBlocked = (globalStats.reInjectionsBlocked || 0) + 1;
    if (d.name) {
      upsertTabTrackedCookie(entry, d.name, d.lockedValue, d.source || 'JS', true);
    }
  } else if (eventType === 'TELEMETRY_POISONED') {
    entry.telemetryPoisoned++;
    globalStats.telemetryPoisoned++;
  } else if (eventType === 'FINGERPRINT_SPOOFED') {
    entry.fingerprintsSpoofed++;
    globalStats.fingerprintsSpoofed++;
  } else if (eventType === 'CHAFF_SENT') {
    entry.chaffSent++;
    globalStats.chaffSent++;
  }

  entry.logs.unshift({
    type: eventType,
    summary: d.summary ? d.summary : eventType,
    time: new Date().toLocaleTimeString()
  });

  if (entry.logs.length > 45) {
    entry.logs.length = 45;
  }

  chrome.storage.local.set({ cgGlobalStats: globalStats });
  updateBadge(tabId);
}

// ============================================================================
// BROWSER-LEVEL HTTP COOKIE SNIFFER, STATEFUL LEDGER & FORMAT-PRESERVING MUTATOR
// ============================================================================
const SAFE_COOKIE_NAMES = /^(euconsent-v2|OptanonAlertBoxClosed|OptanonConsent|CookieConsent|_sp_v1_data|_sp_v1_ss|_sp_v1_opt|_sp_su|sp_tcfv2|PHPSESSID|JSESSIONID|ASP\.NET_SessionId|connect\.sid|__Host-|__Secure-|csrf|xsrf|auth|session|login|cart)/i;
const TRACKER_COOKIE_NAMES = /^(_ga|_ga_[A-Z0-9]+|_gid|_gat|_fbp|_fbc|_gcl_au|_uetsid|_uetvid|consentUUID|consentUUID_[a-z0-9]+|_sp_v\d+_uid|_sp_v\d+_p|s_ecid|AMCV_|AMCVS_|s_cc|s_sq|s_vi|demdex|IDE|muid|uuid2|anj|_ym_uid|hubspotutk|ajs_anonymous_id|criteo|cto_bundle|__gads|__gpi)/i;

function canonicalCookieFamily(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/_sp_v\d+_/i, '_sp_v*_')
    .replace(/[_.-]v\d+$/i, '')
    .replace(/^(_ga)_[A-Z0-9]+$/i, '$1_*')
    .toLowerCase();
}

function normalizeDomain(domain) {
  if (!domain) return '';
  return domain.startsWith('.') ? domain.slice(1).toLowerCase() : domain.toLowerCase();
}

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateMutatedCookieValue(name, val, existingEntry) {
  if (!val) return val;

  // If we already have a locked poisoned value for this cookie or its family, adapt to new version format while keeping fake ID
  if (existingEntry && existingEntry.poisonedValue) {
    if (/^GA1\.\d+\.\d+\.\d+/.test(val) && existingEntry.coreFakeId) {
      const parts = val.split('.');
      return `${parts[0]}.${parts[1]}.${existingEntry.coreFakeId}`;
    }
    if (/^GS1\.\d+\./.test(val) && existingEntry.coreFakeId) {
      const parts = val.split('.');
      parts[2] = existingEntry.coreFakeId.split('.')[0] || parts[2];
      return parts.join('.');
    }
    if (existingEntry.poisonedValue.length === val.length) {
      return existingEntry.poisonedValue;
    }
  }

  if (/^GA1\.\d+\.\d+\.\d+/.test(val)) {
    const r1 = Math.floor(100000000 + Math.random() * 900000000);
    const r2 = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400);
    return `GA1.1.${r1}.${r2}`;
  }
  if (/^fb\.\d+\.\d+\.\d+/.test(val)) {
    const r1 = Date.now() - Math.floor(Math.random() * 600000);
    const r2 = Math.floor(1000000000 + Math.random() * 9000000000);
    return `fb.1.${r1}.${r2}`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
    return randomUUID();
  }
  // Format-preserving scramble
  let out = '';
  for (let i = 0; i < val.length; i++) {
    const ch = val[i];
    if (ch >= '0' && ch <= '9') {
      out += String(Math.floor(Math.random() * 10));
    } else if (ch >= 'a' && ch <= 'f') {
      out += Math.floor(Math.random() * 16).toString(16);
    } else if (ch >= 'A' && ch <= 'F') {
      out += Math.floor(Math.random() * 16).toString(16).toUpperCase();
    } else if (ch >= 'a' && ch <= 'z') {
      out += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    } else if (ch >= 'A' && ch <= 'Z') {
      out += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    } else {
      out += ch;
    }
  }
  return out;
}

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (!currentConfig.enabled || !currentConfig.cookieMutator) return;

  const cookie = changeInfo.cookie;
  if (!cookie || !cookie.name || SAFE_COOKIE_NAMES.test(cookie.name)) return;

  const cleanDomain = normalizeDomain(cookie.domain);
  const ledgerKey = `${cleanDomain}|${cookie.name}`;
  const familyKey = `${cleanDomain}|${canonicalCookieFamily(cookie.name)}`;
  const existingEntry = httpCookieLedger.get(ledgerKey) || httpFamilyLedger.get(familyKey);

  // If a tracked cookie was explicitly deleted by the site/server (not by our own overwrite),
  // keep it in the ledger so if the site immediately re-injects it or bumps its version, we catch it!
  if (changeInfo.removed) {
    if (existingEntry && changeInfo.cause === 'explicit') {
      existingEntry.wasDeletedBySite = true;
      existingEntry.updatedAt = Date.now();
    }
    return;
  }

  const isKnownTracker = TRACKER_COOKIE_NAMES.test(cookie.name) || Boolean(existingEntry);
  if (!isKnownTracker) return;

  const sig = `${cookie.domain}|${cookie.name}|${cookie.value}`;
  if (recentlyMutatedCookieValues.has(sig)) return;
  if (existingEntry && cookie.value === existingEntry.poisonedValue) return;

  const isReinjectionOrVersionBump = Boolean(existingEntry);
  const newValue = generateMutatedCookieValue(cookie.name, cookie.value, existingEntry);
  const newSig = `${cookie.domain}|${cookie.name}|${newValue}`;
  recentlyMutatedCookieValues.add(newSig);
  if (recentlyMutatedCookieValues.size > 800) {
    recentlyMutatedCookieValues.clear();
  }

  let coreFakeId = existingEntry ? existingEntry.coreFakeId : null;
  if (!coreFakeId && /^GA1\.\d+\.(\d+\.\d+)/.test(newValue)) {
    coreFakeId = newValue.split('.').slice(2).join('.');
  }

  const updatedEntry = {
    name: cookie.name,
    domain: cleanDomain,
    canonicalFamily: canonicalCookieFamily(cookie.name),
    originalValue: cookie.value,
    poisonedValue: newValue,
    coreFakeId,
    reInjectionsBlocked: existingEntry ? (existingEntry.reInjectionsBlocked || 0) + (isReinjectionOrVersionBump ? 1 : 0) : 0,
    updatedAt: Date.now()
  };
  httpCookieLedger.set(ledgerKey, updatedEntry);
  httpFamilyLedger.set(familyKey, updatedEntry);

  const protocol = cookie.secure ? 'https:' : 'http:';
  const url = `${protocol}//${cleanDomain}${cookie.path || '/'}`;

  const setDetails = {
    url,
    name: cookie.name,
    value: newValue,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite
  };
  if (!cookie.hostOnly && cookie.domain) {
    setDetails.domain = cookie.domain;
  }
  if (cookie.expirationDate) {
    setDetails.expirationDate = cookie.expirationDate;
  }

  chrome.cookies.set(setDetails).catch(() => {});

  // Attribute to any active tab matching this domain
  chrome.tabs.query({ active: true }, (tabs) => {
    if (!Array.isArray(tabs)) return;
    for (const t of tabs) {
      if (t.url && t.url.includes(cleanDomain)) {
        if (isReinjectionOrVersionBump) {
          recordGuardianEvent(t.id, 'COOKIE_REINJECTION_BLOCKED', {
            name: cookie.name,
            lockedValue: newValue,
            source: 'HTTP',
            summary: `Followed HTTP Cookie '${cookie.name}' -> blocked server overwrite (${newValue.slice(0, 12)}...)`
          });
        } else {
          recordGuardianEvent(t.id, 'COOKIE_MUTATED', {
            name: cookie.name,
            poisoned: newValue,
            source: 'HTTP',
            summary: `Poisoned HTTP Cookie '${cookie.name}' -> ${newValue.slice(0, 14)}...`
          });
        }
      }
    }
  });
});

// Active scrub/poison all tracking cookies for a given URL on demand
async function mutateAllCookiesForUrl(urlStr, tabId) {
  if (!urlStr || !urlStr.startsWith('http')) return 0;
  try {
    const cookies = await chrome.cookies.getAll({ url: urlStr });
    let mutatedCount = 0;

    for (const cookie of cookies) {
      if (SAFE_COOKIE_NAMES.test(cookie.name)) continue;
      if (TRACKER_COOKIE_NAMES.test(cookie.name) || cookie.value.length >= 16) {
        // Force a fresh rotation (pass null for existingEntry so a new fake ID is minted)
        const newValue = generateMutatedCookieValue(cookie.name, cookie.value, null);
        const sig = `${cookie.domain}|${cookie.name}|${newValue}`;
        recentlyMutatedCookieValues.add(sig);

        const cleanDomain = normalizeDomain(cookie.domain);
        const ledgerKey = `${cleanDomain}|${cookie.name}`;
        const familyKey = `${cleanDomain}|${canonicalCookieFamily(cookie.name)}`;
        const entryObj = {
          name: cookie.name,
          domain: cleanDomain,
          canonicalFamily: canonicalCookieFamily(cookie.name),
          originalValue: cookie.value,
          poisonedValue: newValue,
          coreFakeId: /^GA1\.\d+\.(\d+\.\d+)/.test(newValue) ? newValue.split('.').slice(2).join('.') : null,
          reInjectionsBlocked: 0,
          updatedAt: Date.now()
        };
        httpCookieLedger.set(ledgerKey, entryObj);
        httpFamilyLedger.set(familyKey, entryObj);

        const protocol = cookie.secure ? 'https:' : 'http:';
        const cookieUrl = `${protocol}//${cleanDomain}${cookie.path || '/'}`;

        const setDetails = {
          url: cookieUrl,
          name: cookie.name,
          value: newValue,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite
        };
        if (!cookie.hostOnly && cookie.domain) setDetails.domain = cookie.domain;
        if (cookie.expirationDate) setDetails.expirationDate = cookie.expirationDate;

        await chrome.cookies.set(setDetails).catch(() => {});
        mutatedCount++;

        if (tabId) {
          recordGuardianEvent(tabId, 'COOKIE_MUTATED', {
            name: cookie.name,
            poisoned: newValue,
            source: 'HTTP',
            summary: `Rotated HTTP Cookie '${cookie.name}' \u2192 ${newValue.slice(0, 14)}...`
          });
        }
      }
    }
    return mutatedCount;
  } catch (_) {
    return 0;
  }
}

// ============================================================================
// MESSAGE ROUTER FOR CONTENT SCRIPTS & POPUP UI
// ============================================================================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'LOG_GUARDIAN_EVENT') {
    const tabId = sender && sender.tab ? sender.tab.id : null;
    if (tabId) {
      recordGuardianEvent(tabId, msg.eventType, msg.detail || {});
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'GET_TAB_STATE') {
    const tabId = msg.tabId;
    const entry = tabId ? getOrCreateTabEntry(tabId) : null;
    sendResponse({
      config: currentConfig,
      tabStats: entry,
      globalStats
    });
    return true;
  }

  if (msg.action === 'SCRUB_AND_POISON_NOW') {
    const { tabId, url } = msg;
    mutateAllCookiesForUrl(url, tabId).then((count) => {
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { action: 'ROTATE_PERSONA' }).catch(() => {});
      }
      sendResponse({ ok: true, mutatedCount: count, tabStats: getOrCreateTabEntry(tabId) });
    });
    return true;
  }

  if (msg.action === 'CLEAR_TAB_LOGS') {
    if (msg.tabId && tabStats.has(msg.tabId)) {
      tabStats.get(msg.tabId).logs = [];
    }
    sendResponse({ ok: true });
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStats.delete(tabId);
});
