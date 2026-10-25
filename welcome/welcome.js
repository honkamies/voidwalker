/**
 * Voidwalker - Welcome Onboarding Controller (welcome/welcome.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const PRESET_PACKS = {
    media: ['youtube.com', 'twitch.tv', 'netflix.com', 'spotify.com'],
    work: ['meet.google.com', 'teams.microsoft.com', 'zoom.us']
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
  const btnToggleMediaPack = document.getElementById('btnToggleMediaPack');
  const packMediaBox = document.getElementById('packMediaBox');
  const btnToggleWorkPack = document.getElementById('btnToggleWorkPack');
  const packWorkBox = document.getElementById('packWorkBox');

  function updatePackButtons(disabledDomains) {
    const list = Array.isArray(disabledDomains) ? disabledDomains.map((d) => String(d).toLowerCase().trim()) : [];

    // Media Pack
    const mediaActive = PRESET_PACKS.media.every((d) => list.includes(d));
    if (btnToggleMediaPack) {
      btnToggleMediaPack.classList.toggle('active', mediaActive);
      btnToggleMediaPack.textContent = mediaActive ? '✓ Pack Active' : '+ Add Pack';
      btnToggleMediaPack.title = mediaActive ? 'Click to remove Media Pack from whitelist' : 'Add Media Pack to whitelist';
    }
    if (packMediaBox) packMediaBox.classList.toggle('active', mediaActive);

    // Work Pack
    const workActive = PRESET_PACKS.work.every((d) => list.includes(d));
    if (btnToggleWorkPack) {
      btnToggleWorkPack.classList.toggle('active', workActive);
      btnToggleWorkPack.textContent = workActive ? '✓ Pack Active' : '+ Add Pack';
      btnToggleWorkPack.title = workActive ? 'Click to remove Work Pack from whitelist' : 'Add Work Pack to whitelist';
    }
    if (packWorkBox) packWorkBox.classList.toggle('active', workActive);
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

  if (btnToggleMediaPack) {
    btnToggleMediaPack.addEventListener('click', () => togglePresetPack('media'));
  }

  if (btnToggleWorkPack) {
    btnToggleWorkPack.addEventListener('click', () => togglePresetPack('work'));
  }

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
