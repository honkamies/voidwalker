/**
 * Voidwalker - Popup Dashboard Controller (popup/popup.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleMaster = document.getElementById('toggleMaster');
  const modConsent = document.getElementById('modConsent');
  const modCookie = document.getElementById('modCookie');
  const modTelemetry = document.getElementById('modTelemetry');
  const modFingerprint = document.getElementById('modFingerprint');
  const modFpCanvas = document.getElementById('modFpCanvas');
  const modFpWebGL = document.getElementById('modFpWebGL');
  const modFpAudio = document.getElementById('modFpAudio');
  const modFpScreen = document.getElementById('modFpScreen');
  const modFpHardware = document.getElementById('modFpHardware');
  const modChaff = document.getElementById('modChaff');

  const btnToggleFpDrawer = document.getElementById('btnToggleFpDrawer');
  const fpSubDrawer = document.getElementById('fpSubDrawer');
  const btnSitePause = document.getElementById('btnSitePause');

  const activeDomainEl = document.getElementById('activeDomain');
  const detectedCmpText = document.getElementById('detectedCmpText');
  const statWalls = document.getElementById('statWalls');
  const statCookies = document.getElementById('statCookies');
  const statTelemetry = document.getElementById('statTelemetry');
  const statFingerprints = document.getElementById('statFingerprints');
  const reinjectCountBadge = document.getElementById('reinjectCountBadge');
  const cookieLedgerList = document.getElementById('cookieLedgerList');
  const ledgerHeaderToggle = document.getElementById('ledgerHeaderToggle');
  const btnToggleLedger = document.getElementById('btnToggleLedger');
  const btnToggleLog = document.getElementById('btnToggleLog');
  const logFeed = document.getElementById('logFeed');

  const btnRotatePoison = document.getElementById('btnRotatePoison');
  const btnCleanReader = document.getElementById('btnCleanReader');
  const btnClearLog = document.getElementById('btnClearLog');

  let activeTab = null;
  let activeHost = '';
  let disabledDomains = [];
  let isLedgerExpanded = false;
  let isLogExpanded = false;
  let isFpDrawerOpen = false;
  const openCookieDetails = new Set(); // Tracks which cookie rows the user clicked to inspect

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs && tabs[0] ? tabs[0] : null;
  } catch (_) {}

  if (activeTab && activeTab.url) {
    try {
      const u = new URL(activeTab.url);
      activeHost = (u.hostname || '').toLowerCase().replace(/^www\./, '');
      activeDomainEl.textContent = u.hostname || u.protocol;
    } catch (_) {
      activeDomainEl.textContent = 'Local / System Tab';
    }
  }

  if (btnToggleFpDrawer && fpSubDrawer) {
    btnToggleFpDrawer.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isFpDrawerOpen = !isFpDrawerOpen;
      fpSubDrawer.classList.toggle('open', isFpDrawerOpen);
      btnToggleFpDrawer.textContent = isFpDrawerOpen ? 'Layers \u25B4' : 'Layers \u25BE';
    });
  }

  function isCurrentSitePaused() {
    if (!activeHost || !Array.isArray(disabledDomains)) return false;
    return disabledDomains.some((d) => {
      const cleanD = String(d || '').toLowerCase().replace(/^www\./, '');
      return cleanD && (activeHost === cleanD || activeHost.endsWith('.' + cleanD));
    });
  }

  function updateSitePauseUI() {
    if (!btnSitePause) return;
    if (!activeHost) {
      btnSitePause.style.display = 'none';
      return;
    }
    btnSitePause.style.display = 'inline-block';
    const paused = isCurrentSitePaused();
    btnSitePause.classList.toggle('paused', paused);
    activeDomainEl.classList.toggle('paused', paused);
    btnSitePause.textContent = paused ? 'Paused (Resume)' : 'Pause Site';
  }

  function toggleLedgerExpand(e) {
    if (e) e.stopPropagation();
    isLedgerExpanded = !isLedgerExpanded;
    cookieLedgerList.classList.toggle('expanded', isLedgerExpanded);
    refreshState();
  }

  if (ledgerHeaderToggle) {
    ledgerHeaderToggle.addEventListener('click', toggleLedgerExpand);
  }

  if (btnToggleLog) {
    btnToggleLog.addEventListener('click', () => {
      isLogExpanded = !isLogExpanded;
      logFeed.classList.toggle('expanded', isLogExpanded);
      btnToggleLog.textContent = isLogExpanded ? 'Collapse \u25B4' : 'Expand \u25BE';
    });
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
      if (modFpCanvas) modFpCanvas.checked = config.fpCanvas !== false;
      if (modFpWebGL) modFpWebGL.checked = config.fpWebGL !== false;
      if (modFpAudio) modFpAudio.checked = config.fpAudio !== false;
      if (modFpScreen) modFpScreen.checked = config.fpScreen !== false;
      if (modFpHardware) modFpHardware.checked = config.fpHardware !== false;
      modChaff.checked = Boolean(config.chaffGenerator);
      disabledDomains = Array.isArray(config.disabledDomains) ? [...config.disabledDomains] : [];
      updateSitePauseUI();
    }

    if (tabStats) {
      detectedCmpText.textContent = isCurrentSitePaused()
        ? 'Paused on this domain (Whitelisted)'
        : tabStats.detectedCmp || 'Active & Monitoring';
      statWalls.textContent = tabStats.wallsDefeated || 0;
      const totalCookieActions = (tabStats.cookiesMutated || 0) + (tabStats.reInjectionsBlocked || 0);
      statCookies.textContent = totalCookieActions;
      statTelemetry.textContent = tabStats.telemetryPoisoned || 0;
      statFingerprints.textContent = (tabStats.fingerprintsSpoofed || 0) + (tabStats.chaffSent || 0);

      if (reinjectCountBadge) {
        reinjectCountBadge.textContent = `${tabStats.reInjectionsBlocked || 0} blocked`;
      }

      if (cookieLedgerList) {
        const trackedMap = tabStats.trackedCookies || {};
        const trackedEntries = Object.values(trackedMap);
        const totalTracked = trackedEntries.length;

        if (btnToggleLedger) {
          btnToggleLedger.textContent = isLedgerExpanded
            ? 'Collapse \u25B4'
            : totalTracked > 2
              ? `All (${totalTracked}) \u25BE`
              : 'Expand \u25BE';
        }

        if (totalTracked > 0) {
          cookieLedgerList.innerHTML = '';
          const visibleItems = isLedgerExpanded ? trackedEntries : trackedEntries.slice(0, 2);

          for (const item of visibleItems) {
            const wrap = document.createElement('div');
            const isOpen = openCookieDetails.has(item.name);
            wrap.className = `ledger-item-wrap${isOpen ? ' open' : ''}`;

            const row = document.createElement('div');
            row.className = 'ledger-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ledger-name';
            const chevron = document.createElement('span');
            chevron.className = 'ledger-chevron';
            chevron.textContent = '\u25B8';
            const nameText = document.createElement('span');
            nameText.textContent = item.name;
            nameSpan.appendChild(chevron);
            nameSpan.appendChild(nameText);

            const valSpan = document.createElement('span');
            valSpan.className = 'ledger-val';
            valSpan.textContent = String(item.poisonedValue || '').slice(0, 16);

            const statusSpan = document.createElement('span');
            statusSpan.className = 'ledger-status';
            statusSpan.textContent =
              item.reInjectionsBlocked > 0 ? `Locked (${item.reInjectionsBlocked}x)` : 'Locked';

            row.appendChild(nameSpan);
            row.appendChild(valSpan);
            row.appendChild(statusSpan);

            const details = document.createElement('div');
            details.className = 'ledger-details';
            const blockedCount = item.reInjectionsBlocked || 0;
            details.innerHTML =
              `<div class="detail-line"><span class="detail-label">Locked Fake ID:</span><span class="detail-code">${item.poisonedValue || ''}</span></div>` +
              `<div class="detail-line"><span class="detail-label">Intercept Layer:</span><span>${item.source || 'JS'} Shadow Ledger</span></div>` +
              `<div class="detail-line"><span class="detail-label">Protection:</span><span>${blockedCount > 0 ? `Blocked ${blockedCount} overwrite/version-bump attempt(s)` : 'Pinned & monitoring for overwrite attempts'}</span></div>`;

            row.addEventListener('click', () => {
              if (openCookieDetails.has(item.name)) {
                openCookieDetails.delete(item.name);
                wrap.classList.remove('open');
              } else {
                openCookieDetails.add(item.name);
                wrap.classList.add('open');
              }
            });

            wrap.appendChild(row);
            wrap.appendChild(details);
            cookieLedgerList.appendChild(wrap);
          }

          if (!isLedgerExpanded && totalTracked > 2) {
            const moreBtn = document.createElement('div');
            moreBtn.className = 'more-pill';
            moreBtn.textContent = `+ ${totalTracked - 2} more locked cookie(s) \u2014 click to show all`;
            moreBtn.addEventListener('click', toggleLedgerExpand);
            cookieLedgerList.appendChild(moreBtn);
          }
        } else {
          cookieLedgerList.innerHTML =
            '<div class="log-empty">No manipulated cookies tracked on this tab yet.</div>';
        }
      }

      if (Array.isArray(tabStats.logs) && tabStats.logs.length > 0) {
        logFeed.innerHTML = '';
        const visibleLogs = isLogExpanded ? tabStats.logs : tabStats.logs.slice(0, 3);
        for (const item of visibleLogs) {
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
      fpCanvas: modFpCanvas ? modFpCanvas.checked : true,
      fpWebGL: modFpWebGL ? modFpWebGL.checked : true,
      fpAudio: modFpAudio ? modFpAudio.checked : true,
      fpScreen: modFpScreen ? modFpScreen.checked : true,
      fpHardware: modFpHardware ? modFpHardware.checked : true,
      chaffGenerator: modChaff.checked,
      disabledDomains
    };
    chrome.storage.local.set({ cgConfig: newConfig });
  }

  if (btnSitePause) {
    btnSitePause.addEventListener('click', () => {
      if (!activeHost) return;
      if (isCurrentSitePaused()) {
        disabledDomains = disabledDomains.filter((d) => {
          const cleanD = String(d || '').toLowerCase().replace(/^www\./, '');
          return cleanD !== activeHost && !activeHost.endsWith('.' + cleanD);
        });
      } else {
        disabledDomains.push(activeHost);
      }
      updateSitePauseUI();
      saveConfig();
      refreshState();
    });
  }

  [
    toggleMaster,
    modConsent,
    modCookie,
    modTelemetry,
    modFingerprint,
    modFpCanvas,
    modFpWebGL,
    modFpAudio,
    modFpScreen,
    modFpHardware,
    modChaff
  ]
    .filter(Boolean)
    .forEach((el) => {
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
