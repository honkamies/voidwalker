/**
 * Voidwalker - ISOLATED World Content Script (src/content.js)
 * Bridges the MAIN world page-hook.js with the Extension Background Service Worker
 * via stealth events, syncs live toggle settings, and relays persona rotation triggers.
 */

(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    enabled: true,
    consentSpoofer: true,
    cookieMutator: true,
    telemetryPoisoner: true,
    fingerprintSpoofer: true,
    fpCanvas: true,
    fpWebGL: true,
    fpAudio: true,
    fpScreen: true,
    fpHardware: true,
    chaffGenerator: true,
    disabledDomains: []
  };

  function pushConfigToPage(cfg) {
    try {
      window.postMessage(
        {
          __vw_cmd__: true,
          type: 'CONFIG',
          config: cfg
        },
        '*'
      );
    } catch (_) {}
  }

  // Listen for telemetry/sniffer events from MAIN world (page-hook.js)
  let mainWorldConfirmed = false;
  const seenEventSigs = new Set();
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.__vw_ack__) {
      mainWorldConfirmed = true;
      return;
    }
    if (!event.data.__cookieGuardianEvent) return;
    mainWorldConfirmed = true;
    const data = event.data;
    const sig = `${data.type}|${data.detail && data.detail.summary}|${data.detail && data.detail.timestamp}`;
    if (seenEventSigs.has(sig)) return;
    seenEventSigs.add(sig);
    try {
      chrome.runtime.sendMessage({
        action: 'LOG_GUARDIAN_EVENT',
        eventType: data.type,
        detail: data.detail
      });
    } catch (_) {}
  });

  // Immediately signal BRIDGE_READY so page-hook.js flushes any document_start events
  try {
    window.postMessage({ __vw_cmd__: true, type: 'BRIDGE_READY' }, '*');
  } catch (_) {}

  // Universal Mobile / WebKit / Legacy Browser Fallback:
  // If a browser (e.g., Orion on iOS, older Firefox <128, or mobile WebKit) ignores `"world": "MAIN"`
  // in manifest.json, inject src/page-hook.js directly into the page DOM at document_start.
  setTimeout(() => {
    if (mainWorldConfirmed) return;
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('src/page-hook.js');
      s.onload = () => {
        s.remove();
        window.postMessage({ __vw_cmd__: true, type: 'BRIDGE_READY' }, '*');
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (_) {}
  }, 15);

  // Load initial config and sync to MAIN world
  try {
    chrome.storage.local.get(['cgConfig'], (res) => {
      const cfg = Object.assign({}, DEFAULT_CONFIG, res && res.cgConfig ? res.cgConfig : {});
      pushConfigToPage(cfg);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.cgConfig) {
        pushConfigToPage(changes.cgConfig.newValue);
      }
    });
  } catch (_) {}

  // Listen for commands from Popup / Background (only handle UI actions in top frame)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (window !== window.top) return;

    if (msg.action === 'ROTATE_PERSONA') {
      try {
        window.postMessage({ __vw_cmd__: true, type: 'ROTATE_PERSONA' }, '*');
      } catch (_) {}
      sendResponse({ ok: true });
      return true;
    }
  });
})();
