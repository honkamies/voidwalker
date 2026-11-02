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
    disabledDomains: ['google.com', 'google.fi', 'googleusercontent.com', 'gstatic.com', 'googleapis.com', 'youtube.com']
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
    if (!event.data.__vw_event__) return;
    mainWorldConfirmed = true;
    const data = event.data;
    const sig = `${data.type}|${data.detail && data.detail.summary}|${data.detail && data.detail.timestamp}`;
    if (seenEventSigs.has(sig)) return;
    seenEventSigs.add(sig);
    try {
      chrome.runtime.sendMessage({
        action: 'LOG_VOIDWALKER_EVENT',
        eventType: data.type,
        detail: data.detail
      });
    } catch (_) {}
  });

  // Immediately signal BRIDGE_READY so page-hook.js flushes any document_start events
  try {
    window.postMessage({ __vw_cmd__: true, type: 'BRIDGE_READY' }, '*');
  } catch (_) {}

  // Load initial config and sync to MAIN world
  try {
    chrome.storage.local.get(['vwConfig', 'cgConfig'], (res) => {
      const stored = res && (res.vwConfig || res.cgConfig);
      const cfg = Object.assign({}, DEFAULT_CONFIG, stored ? stored : {});
      pushConfigToPage(cfg);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.vwConfig || changes.cgConfig)) {
        const updated = (changes.vwConfig && changes.vwConfig.newValue) || (changes.cgConfig && changes.cgConfig.newValue);
        if (updated) {
          pushConfigToPage(updated);
        }
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
