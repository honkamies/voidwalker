/**
 * Voidwalker - Popup Dashboard Controller (popup/popup.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleMaster = document.getElementById('toggleMaster');
  const modConsent = document.getElementById('modConsent');
  const modCookie = document.getElementById('modCookie');
  const modTelemetry = document.getElementById('modTelemetry');
  const modFingerprint = document.getElementById('modFingerprint');
  const modChaff = document.getElementById('modChaff');

  const activeDomainEl = document.getElementById('activeDomain');
  const detectedCmpText = document.getElementById('detectedCmpText');
  const statWalls = document.getElementById('statWalls');
  const statCookies = document.getElementById('statCookies');
  const statTelemetry = document.getElementById('statTelemetry');
  const statFingerprints = document.getElementById('statFingerprints');
  const reinjectCountBadge = document.getElementById('reinjectCountBadge');
  const cookieLedgerList = document.getElementById('cookieLedgerList');
  const logFeed = document.getElementById('logFeed');

  const btnRotatePoison = document.getElementById('btnRotatePoison');
  const btnCleanReader = document.getElementById('btnCleanReader');
  const btnClearLog = document.getElementById('btnClearLog');

  let activeTab = null;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs && tabs[0] ? tabs[0] : null;
  } catch (_) {}

  if (activeTab && activeTab.url) {
    try {
      const u = new URL(activeTab.url);
      activeDomainEl.textContent = u.hostname || u.protocol;
    } catch (_) {
      activeDomainEl.textContent = 'Local / System Tab';
    }
  }

  function renderUI(state) {
    if (!state) return;
    const { config, tabStats } = state;

    if (config) {
      toggleMaster.checked = Boolean(config.enabled);
      modConsent.checked = Boolean(config.consentSpoofer);
      modCookie.checked = Boolean(config.cookieMutator);
      modTelemetry.checked = Boolean(config.telemetryPoisoner);
      modFingerprint.checked = Boolean(config.fingerprintSpoofer);
      modChaff.checked = Boolean(config.chaffGenerator);
    }

    if (tabStats) {
      detectedCmpText.textContent = tabStats.detectedCmp || 'Active & Monitoring';
      statWalls.textContent = tabStats.wallsDefeated || 0;
      const totalCookieActions = (tabStats.cookiesMutated || 0) + (tabStats.reInjectionsBlocked || 0);
      statCookies.textContent = totalCookieActions;
      statTelemetry.textContent = tabStats.telemetryPoisoned || 0;
      statFingerprints.textContent = (tabStats.fingerprintsSpoofed || 0) + (tabStats.chaffSent || 0);

      if (reinjectCountBadge) {
        reinjectCountBadge.textContent = `${tabStats.reInjectionsBlocked || 0} re-injections blocked`;
      }

      if (cookieLedgerList) {
        const trackedMap = tabStats.trackedCookies || {};
        const trackedEntries = Object.values(trackedMap);
        if (trackedEntries.length > 0) {
          cookieLedgerList.innerHTML = '';
          for (const item of trackedEntries) {
            const row = document.createElement('div');
            row.className = 'ledger-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ledger-name';
            nameSpan.textContent = item.name;

            const valSpan = document.createElement('span');
            valSpan.className = 'ledger-val';
            valSpan.textContent = String(item.poisonedValue || '').slice(0, 18);

            const statusSpan = document.createElement('span');
            statusSpan.className = 'ledger-status';
            statusSpan.textContent =
              item.reInjectionsBlocked > 0 ? `Locked (${item.reInjectionsBlocked}x)` : 'Locked';

            row.appendChild(nameSpan);
            row.appendChild(valSpan);
            row.appendChild(statusSpan);
            cookieLedgerList.appendChild(row);
          }
        } else {
          cookieLedgerList.innerHTML =
            '<div class="log-empty">No manipulated cookies tracked on this tab yet.</div>';
        }
      }

      if (Array.isArray(tabStats.logs) && tabStats.logs.length > 0) {
        logFeed.innerHTML = '';
        for (const item of tabStats.logs) {
          const div = document.createElement('div');
          div.className = 'log-item';
          const timeSpan = document.createElement('span');
          timeSpan.className = 'log-time';
          timeSpan.textContent = `[${item.time}]`;
          const textSpan = document.createElement('span');
          textSpan.textContent = item.summary;
          div.appendChild(timeSpan);
          div.appendChild(textSpan);
          logFeed.appendChild(div);
        }
      } else {
        logFeed.innerHTML = '<div class="log-empty">No tracking attempts intercepted on this tab yet.</div>';
      }
    }
  }

  function refreshState() {
    chrome.runtime.sendMessage(
      {
        action: 'GET_TAB_STATE',
        tabId: activeTab ? activeTab.id : null
      },
      (res) => {
        if (res) renderUI(res);
      }
    );
  }

  function saveConfig() {
    const newConfig = {
      enabled: toggleMaster.checked,
      consentSpoofer: modConsent.checked,
      cookieMutator: modCookie.checked,
      telemetryPoisoner: modTelemetry.checked,
      fingerprintSpoofer: modFingerprint.checked,
      chaffGenerator: modChaff.checked
    };
    chrome.storage.local.set({ cgConfig: newConfig });
  }

  [toggleMaster, modConsent, modCookie, modTelemetry, modFingerprint, modChaff].forEach((el) => {
    el.addEventListener('change', saveConfig);
  });

  btnRotatePoison.addEventListener('click', () => {
    if (!activeTab) return;
    btnRotatePoison.textContent = '\u26A1 Poisoning IDs...';
    chrome.runtime.sendMessage(
      {
        action: 'SCRUB_AND_POISON_NOW',
        tabId: activeTab.id,
        url: activeTab.url || ''
      },
      () => {
        setTimeout(() => {
          btnRotatePoison.textContent = '\uD83D\uDD04 Rotate Fake ID & Poison Cookies';
          refreshState();
        }, 350);
      }
    );
  });

  btnCleanReader.addEventListener('click', () => {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_CLEAN_READER' }, () => {
      window.close();
    });
  });

  btnClearLog.addEventListener('click', () => {
    if (!activeTab || !activeTab.id) return;
    chrome.runtime.sendMessage({ action: 'CLEAR_TAB_LOGS', tabId: activeTab.id }, () => {
      refreshState();
    });
  });

  refreshState();
  setInterval(refreshState, 1200);
});
