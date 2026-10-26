/**
 * Voidwalker - Welcome Onboarding Controller (welcome/welcome.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const PRESET_PACKS = {
    google: ['google.com', 'googleusercontent.com', 'gstatic.com'],
    microsoft: ['microsoft.com', 'office.com', 'live.com', 'microsoftonline.com', 'sharepoint.com', 'office365.com'],
    media: ['youtube.com', 'twitch.tv', 'netflix.com', 'spotify.com'],
    work: ['teams.microsoft.com', 'zoom.us', 'slack.com', 'meet.google.com', 'webex.com']
  };

  // 1. Browser Detection & Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function activateBrowserTab(browserKey) {
    tabButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-browser') === browserKey);
    });
    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === `tab-${browserKey}`);
    });
  }

  // Auto-detect browser for the best first impression
  const ua = (navigator.userAgent || '').toLowerCase();
  let defaultBrowser = 'chrome';
  if (ua.includes('edg/')) {
    defaultBrowser = 'edge';
  } else if (ua.includes('firefox')) {
    defaultBrowser = 'firefox';
  }
  activateBrowserTab(defaultBrowser);

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-browser');
      if (target) activateBrowserTab(target);
    });
  });

  // 2. Preset Whitelist Packs Management
  function updatePackButtons(disabledDomains) {
    const list = Array.isArray(disabledDomains) ? disabledDomains.map((d) => String(d).toLowerCase().trim()) : [];

    Object.keys(PRESET_PACKS).forEach((packKey) => {
      const box = document.getElementById(`pack${packKey.charAt(0).toUpperCase() + packKey.slice(1)}Box`);
      const btn = document.querySelector(`.btn-pack-toggle[data-pack="${packKey}"]`);
      const isActive = PRESET_PACKS[packKey].every((d) => list.includes(d));

      if (box) box.classList.toggle('active', isActive);
      if (btn) {
        btn.classList.toggle('active', isActive);
        btn.textContent = isActive ? '✓ Pack Active' : '+ Add Pack';
        btn.title = isActive ? `Click to remove ${packKey} pack from whitelist` : `Add ${packKey} pack to whitelist`;
      }
    });
  }

  function togglePresetPack(packKey) {
    const packDomains = PRESET_PACKS[packKey];
    if (!packDomains) return;

    chrome.storage.local.get(['cgConfig'], (res) => {
      const cfg = res && res.cgConfig ? { ...res.cgConfig } : {};
      let domains = Array.isArray(cfg.disabledDomains) ? [...cfg.disabledDomains] : ['youtube.com'];

      const allPresent = packDomains.every((d) => domains.includes(d));
      if (allPresent) {
        // Remove domains in pack
        domains = domains.filter((d) => !packDomains.includes(d));
      } else {
        // Add domains in pack
        packDomains.forEach((d) => {
          if (!domains.includes(d)) domains.push(d);
        });
      }

      cfg.disabledDomains = domains;
      chrome.storage.local.set({ cgConfig: cfg }, () => {
        updatePackButtons(domains);
      });
    });
  }

  document.querySelectorAll('.btn-pack-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const packKey = btn.getAttribute('data-pack');
      if (packKey) togglePresetPack(packKey);
    });
  });

  // Load initial config
  try {
    chrome.storage.local.get(['cgConfig'], (res) => {
      const domains = res && res.cgConfig && Array.isArray(res.cgConfig.disabledDomains)
        ? res.cgConfig.disabledDomains
        : ['youtube.com'];
      updatePackButtons(domains);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.cgConfig && changes.cgConfig.newValue) {
        updatePackButtons(changes.cgConfig.newValue.disabledDomains);
      }
    });
  } catch (_) {}

  // 3. Close / Finish Button
  const btnCloseWelcome = document.getElementById('btnCloseWelcome');
  if (btnCloseWelcome) {
    btnCloseWelcome.addEventListener('click', () => {
      try {
        chrome.tabs.getCurrent((tab) => {
          if (tab && tab.id) {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } catch (_) {
        window.close();
      }
    });
  }
});
