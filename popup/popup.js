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
  const btnToggleExclude = document.getElementById('btnToggleExclude');
  const exclusionHeaderToggle = document.getElementById('exclusionHeaderToggle');
  const exclusionCountBadge = document.getElementById('exclusionCountBadge');
  const btnToggleExclusionDrawer = document.getElementById('btnToggleExclusionDrawer');
  const exclusionDrawer = document.getElementById('exclusionDrawer');
  const inputExcludeDomain = document.getElementById('inputExcludeDomain');
  const btnAddExcludeDomain = document.getElementById('btnAddExcludeDomain');
  const exclusionListItems = document.getElementById('exclusionListItems');

  const updateDot = document.getElementById('updateDot');
  const updateBanner = document.getElementById('updateBanner');
  const newVersionTag = document.getElementById('newVersionTag');
  const btnGetUpdate = document.getElementById('btnGetUpdate');
  const currentVersionBadge = document.getElementById('currentVersionBadge');

  try {
    const manifest = chrome.runtime.getManifest();
    if (currentVersionBadge && manifest && manifest.version) {
      currentVersionBadge.textContent = 'v' + manifest.version;
      currentVersionBadge.style.cursor = 'pointer';
      currentVersionBadge.title = 'Click to check GitHub for updates now';
      currentVersionBadge.addEventListener('click', () => {
        const origText = currentVersionBadge.textContent;
        currentVersionBadge.textContent = 'Checking...';
        chrome.runtime.sendMessage({ action: 'CHECK_UPDATE_NOW' }, (res) => {
          setTimeout(() => {
            currentVersionBadge.textContent = origText;
            if (res && res.updateInfo) {
              refreshState();
            }
          }, 400);
        });
      });
    }
  } catch (_) {}

  function openReleaseUrl() {
    const targetUrl = (btnGetUpdate && btnGetUpdate.getAttribute('href')) || 'https://github.com/honkamies/voidwalker/releases/latest';
    chrome.tabs.create({ url: targetUrl });
  }

  if (btnGetUpdate) {
    btnGetUpdate.addEventListener('click', (e) => {
      e.preventDefault();
      openReleaseUrl();
    });
  }

  if (updateDot) {
    updateDot.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openReleaseUrl();
    });
  }

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
  const btnClearLog = document.getElementById('btnClearLog');

  let activeTab = null;
  let activeHost = '';
  let disabledDomains = [];
  let isLedgerExpanded = false;
  let isLogExpanded = false;
  let isFpDrawerOpen = false;
  let isExclusionDrawerOpen = false;
  const openCookieDetails = new Set(); // Tracks which cookie rows the user clicked to inspect

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let candidate = tabs && tabs[0] ? tabs[0] : null;
    // On mobile browsers (Firefox Android, Kiwi, Lemur, Orion iOS), the popup opens as a full tab,
    // so tabs[0] is the extension popup itself. Find the active/most recent web tab instead:
    if (!candidate || !candidate.url || /^(chrome-extension|moz-extension|safari-web-extension):/i.test(candidate.url)) {
      const allTabs = await chrome.tabs.query({});
      const webTabs = (allTabs || []).filter((t) => t.url && /^https?:/i.test(t.url));
      if (webTabs.length > 0) {
        candidate = webTabs.sort((a, b) => (b.lastAccessed || b.index || 0) - (a.lastAccessed || a.index || 0))[0];
      }
    }
    activeTab = candidate;
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

  function normalizeDomainInput(str) {
    if (!str) return '';
    let cleaned = str.trim().toLowerCase();
    cleaned = cleaned.replace(/^[a-zA-Z]+:\/\//, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split(':')[0];
    cleaned = cleaned.replace(/^www\./, '');
    return cleaned;
  }

  function isCurrentSiteExcluded() {
    if (!activeHost || !Array.isArray(disabledDomains)) return false;
    return disabledDomains.some((d) => {
      const cleanD = normalizeDomainInput(d);
      return cleanD && (activeHost === cleanD || activeHost.endsWith('.' + cleanD));
    });
  }

  function updateExclusionUI() {
    const isExcluded = isCurrentSiteExcluded();
    if (btnToggleExclude) {
      if (!activeHost) {
        btnToggleExclude.style.display = 'none';
      } else {
        btnToggleExclude.style.display = 'inline-block';
        btnToggleExclude.classList.toggle('excluded', isExcluded);
        btnToggleExclude.textContent = isExcluded ? '\u2713 Excluded' : '+ Exclude Site';
        btnToggleExclude.title = isExcluded
          ? 'Site is excluded from Voidwalker. Click to re-enable protection.'
          : `Click to exclude ${activeHost} so history, preferences & logins work untouched.`;
      }
    }
    if (activeDomainEl) {
      activeDomainEl.classList.toggle('paused', isExcluded);
    }
    if (exclusionCountBadge) {
      const count = (disabledDomains || []).length;
      exclusionCountBadge.textContent = `${count} excluded`;
    }
    if (exclusionListItems) {
      if (!disabledDomains || disabledDomains.length === 0) {
        exclusionListItems.innerHTML = '<div class="log-empty">No domains excluded yet.</div>';
      } else {
        exclusionListItems.innerHTML = '';
        disabledDomains.forEach((domain) => {
          const chip = document.createElement('div');
          chip.className = 'exclusion-chip';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = domain;
          chip.appendChild(nameSpan);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'exclusion-remove-btn';
          removeBtn.textContent = '\u2715';
          removeBtn.title = `Remove ${domain} from exclusion list`;
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeExcludedDomain(domain);
          });
          chip.appendChild(removeBtn);

          exclusionListItems.appendChild(chip);
        });
      }
    }
  }

  function addExcludedDomain(domainStr) {
    const clean = normalizeDomainInput(domainStr);
    if (!clean) return;
    if (!disabledDomains.includes(clean)) {
      disabledDomains.push(clean);
      updateExclusionUI();
      saveConfig(() => {
        refreshState();
      });
    }
  }

  function removeExcludedDomain(domainStr) {
    const clean = normalizeDomainInput(domainStr);
    disabledDomains = disabledDomains.filter((d) => normalizeDomainInput(d) !== clean);
    updateExclusionUI();
    saveConfig(() => {
      refreshState();
    });
  }

  function toggleExclusionDrawer(e) {
    if (e) e.stopPropagation();
    isExclusionDrawerOpen = !isExclusionDrawerOpen;
    if (exclusionDrawer) {
      exclusionDrawer.style.display = isExclusionDrawerOpen ? 'flex' : 'none';
    }
    if (btnToggleExclusionDrawer) {
      btnToggleExclusionDrawer.textContent = isExclusionDrawerOpen ? 'Close \u25B4' : 'Manage \u25BE';
    }
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
    const { config, tabStats, updateInfo } = state;

    if (updateInfo) {
      const hasUpdate = Boolean(updateInfo.hasUpdate);
      if (updateDot) updateDot.style.display = hasUpdate ? 'flex' : 'none';
      if (updateBanner) updateBanner.style.display = hasUpdate ? 'flex' : 'none';
      if (newVersionTag && updateInfo.latestVersion) {
        newVersionTag.textContent = updateInfo.latestVersion;
      }
      if (btnGetUpdate && updateInfo.releaseUrl) {
        btnGetUpdate.href = updateInfo.releaseUrl;
      }
    }

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
      updateExclusionUI();
    }

    if (tabStats) {
      if (!config || !config.enabled) {
        detectedCmpText.textContent = 'Protection Disabled';
        detectedCmpText.style.color = '#94a3b8';
        detectedCmpText.title = 'Voidwalker master toggle is disabled';
      } else if (isCurrentSiteExcluded()) {
        detectedCmpText.textContent = 'Site Excluded (All Protection Bypassed)';
        detectedCmpText.style.color = '#38bdf8';
        detectedCmpText.title = 'Voidwalker is completely disabled on this domain (Native behavior preserved)';
      } else if (tabStats.wallsDefeated > 0 || (tabStats.detectedCmp && tabStats.detectedCmp !== 'Scanning...' && tabStats.detectedCmp !== 'Active & Monitoring')) {
        detectedCmpText.textContent = 'Consent Wall Bypassed (Active)';
        detectedCmpText.style.color = '#10b981';
        detectedCmpText.title = tabStats.detectedCmp ? `Framework intercepted: ${tabStats.detectedCmp}` : 'Consent wall bypassed';
      } else {
        detectedCmpText.textContent = 'Active & Guarding';
        detectedCmpText.style.color = '#10b981';
        detectedCmpText.title = 'Sniffer active & monitoring page';
      }
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

  let hasRequestedUpdateCheck = false;
  function refreshState() {
    chrome.runtime.sendMessage(
      {
        action: 'GET_TAB_STATE',
        tabId: activeTab ? activeTab.id : null
      },
      (res) => {
        if (res) {
          renderUI(res);
          if (!hasRequestedUpdateCheck && (!res.updateInfo || !res.updateInfo.lastChecked)) {
            hasRequestedUpdateCheck = true;
            chrome.runtime.sendMessage({ action: 'CHECK_UPDATE_NOW' }, (checkRes) => {
              if (checkRes && checkRes.updateInfo) {
                renderUI({ ...res, updateInfo: checkRes.updateInfo });
              }
            });
          }
        }
      }
    );
  }

  function saveConfig(cb) {
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
      disabledDomains: [...disabledDomains],
      whitelistSeeded: true
    };
    chrome.storage.local.set({ cgConfig: newConfig }, () => {
      if (typeof cb === 'function') cb();
    });
  }

  if (btnToggleExclude) {
    btnToggleExclude.addEventListener('click', () => {
      if (!activeHost) return;
      if (isCurrentSiteExcluded()) {
        removeExcludedDomain(activeHost);
      } else {
        addExcludedDomain(activeHost);
      }
    });
  }

  if (exclusionHeaderToggle) {
    exclusionHeaderToggle.addEventListener('click', toggleExclusionDrawer);
  }

  if (btnToggleExclusionDrawer) {
    btnToggleExclusionDrawer.addEventListener('click', toggleExclusionDrawer);
  }

  if (btnAddExcludeDomain && inputExcludeDomain) {
    btnAddExcludeDomain.addEventListener('click', () => {
      const val = inputExcludeDomain.value;
      if (val) {
        addExcludedDomain(val);
        inputExcludeDomain.value = '';
      }
    });

    inputExcludeDomain.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = inputExcludeDomain.value;
        if (val) {
          addExcludedDomain(val);
          inputExcludeDomain.value = '';
        }
      }
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
          btnRotatePoison.textContent = '\uD83D\uDD04 Rotate Fake ID Now (Auto: 2h)';
          refreshState();
        }, 350);
      }
    );
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
