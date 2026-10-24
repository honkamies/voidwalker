/**
 * Voidwalker - ISOLATED World Content Script (src/content.js)
 * Bridges the MAIN world page-hook.js with the Extension Background Service Worker
 * via stealth CustomEvents, syncs live toggle settings, and provides the one-click
 * Clean News Reader mode (including Next.js __NEXT_DATA__, JSON-LD extraction, and
 * automatic encoding/mojibake repair).
 */

(function () {
  'use strict';

  const EVT_TO_CONTENT = '__cm_evt_bridge__';
  const EVT_TO_MAIN = '__cm_cfg_bridge__';

  const DEFAULT_CONFIG = {
    enabled: true,
    consentSpoofer: true,
    cookieMutator: true,
    telemetryPoisoner: true,
    fingerprintSpoofer: true,
    chaffGenerator: true
  };

  function pushConfigToPage(cfg) {
    try {
      window.dispatchEvent(
        new CustomEvent(EVT_TO_MAIN, {
          detail: {
            type: 'CONFIG',
            config: cfg
          }
        })
      );
    } catch (_) {}
  }

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

  // Listen for stealth CustomEvent telemetry/sniffer events from MAIN world (page-hook.js)
  const seenEventSigs = new Set();
  window.addEventListener(EVT_TO_CONTENT, (event) => {
    const data = event && event.detail;
    if (!data || !data.__cookieGuardianEvent) return;
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
    window.dispatchEvent(
      new CustomEvent(EVT_TO_MAIN, {
        detail: { type: 'BRIDGE_READY' }
      })
    );
  } catch (_) {}

  // Listen for commands from Popup / Background (only handle UI actions in top frame)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (window !== window.top) return;

    if (msg.action === 'TOGGLE_CLEAN_READER') {
      const active = toggleCleanReaderMode();
      sendResponse({ ok: true, active });
      return true;
    }

    if (msg.action === 'ROTATE_PERSONA') {
      try {
        window.dispatchEvent(
          new CustomEvent(EVT_TO_MAIN, {
            detail: { type: 'ROTATE_PERSONA' }
          })
        );
      } catch (_) {}
      sendResponse({ ok: true });
      return true;
    }
  });

  // ============================================================================
  // ENCODING & MOJIBAKE REPAIR FOR CLEAN READER
  // ============================================================================
  const CP1252_REVERSE = {
    0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
    0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
    0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
    0x017e: 0x9e, 0x0178: 0x9f
  };

  function repairTextEncoding(str) {
    if (!str || typeof str !== 'string') return '';
    let s = str;
    if (/[\u00c2-\u00df][\u0080-\u00bf\u20ac-\u2122]|[\u00e0-\u00ef][\u0080-\u00bf\u20ac-\u2122]{2}/.test(s)) {
      try {
        const bytes = new Uint8Array(s.length);
        let valid = true;
        for (let i = 0; i < s.length; i++) {
          const code = s.charCodeAt(i);
          if (code <= 0xff) {
            bytes[i] = code;
          } else if (CP1252_REVERSE[code] !== undefined) {
            bytes[i] = CP1252_REVERSE[code];
          } else {
            valid = false;
            break;
          }
        }
        if (valid) {
          const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          if (decoded && !decoded.includes('\ufffd')) {
            s = decoded;
          }
        }
      } catch (_) {}
    }
    return s;
  }

  // ============================================================================
  // BUILT-IN CLEAN NEWS READER (Extracts from __NEXT_DATA__, JSON-LD, or DOM)
  // ============================================================================
  let readerOverlay = null;

  function extractStructuredArticle() {
    const result = {
      title: repairTextEncoding(document.title || 'Clean Reader View'),
      byline: '',
      publishedAt: '',
      lead: '',
      paragraphs: [],
      headlines: []
    };

    // 1. Try JSON-LD (NewsArticle / Article - standard on hs.fi and major news sites)
    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of ldScripts) {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item && /Article|NewsArticle|ReportageNewsArticle/i.test(item['@type'] || '')) {
            if (item.headline) result.title = repairTextEncoding(item.headline);
            if (item.description) result.lead = repairTextEncoding(item.description);
            if (item.datePublished) result.publishedAt = item.datePublished;
            if (item.author) {
              const authors = Array.isArray(item.author) ? item.author : [item.author];
              result.byline = authors
                .map((a) => repairTextEncoding(typeof a === 'string' ? a : a.name || ''))
                .filter(Boolean)
                .join(', ');
            }
            if (item.articleBody && typeof item.articleBody === 'string') {
              result.paragraphs = item.articleBody
                .split(/\n+/)
                .map((p) => repairTextEncoding(p.trim()))
                .filter((p) => p.length > 25);
            }
          }
        }
      }
    } catch (_) {}

    // 2. Try Next.js __NEXT_DATA__ (used by hs.fi / Sanoma for both articles and front page headlines)
    try {
      const nextScript = document.getElementById('__NEXT_DATA__');
      if (nextScript) {
        const nextData = JSON.parse(nextScript.textContent);
        const walkNext = (node) => {
          if (!node || typeof node !== 'object') return;
          if (typeof node.title === 'string' && typeof node.href === 'string' && node.title.length > 12) {
            result.headlines.push({ title: repairTextEncoding(node.title), url: node.href });
          }
          if (Array.isArray(node.splitBody) || Array.isArray(node.body)) {
            const arr = node.splitBody || node.body;
            for (const block of arr) {
              if (block && typeof block.text === 'string' && block.text.length > 20) {
                result.paragraphs.push(repairTextEncoding(block.text));
              }
            }
          }
          for (const k of Object.keys(node)) {
            if (typeof node[k] === 'object') walkNext(node[k]);
          }
        };
        walkNext(nextData.props);
      }
    } catch (_) {}

    // 3. Fallback / Supplement with Semantic DOM extraction (<article>, <main>, paragraphs, headlines)
    if (result.paragraphs.length === 0) {
      const root =
        document.querySelector('article') ||
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.body;

      const h1 = root.querySelector('h1');
      if (h1 && h1.innerText.trim()) {
        result.title = repairTextEncoding(h1.innerText.trim());
      }

      const pNodes = root.querySelectorAll('article p, main p, .article-body p, p');
      const seenP = new Set();
      for (const p of pNodes) {
        // Skip paragraphs inside cookie modals
        if (p.closest('[id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"], [id*="sp_message"]')) {
          continue;
        }
        const txt = repairTextEncoding((p.innerText || p.textContent || '').replace(/\s+/g, ' ').trim());
        if (txt.length >= 40 && !seenP.has(txt)) {
          seenP.add(txt);
          result.paragraphs.push(txt);
        }
      }
    }

    // 4. Collect front-page news headlines if viewing a news portal home page (like https://www.hs.fi/)
    if (result.headlines.length === 0) {
      const linkHeadings = document.querySelectorAll('a h2, a h3, h2 a, h3 a, article h2, article h3');
      const seenTitles = new Set();
      for (const el of linkHeadings) {
        const anchor = el.tagName === 'A' ? el : el.closest('a') || el.querySelector('a');
        const text = repairTextEncoding((el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim());
        if (text.length >= 15 && text.length <= 180 && !seenTitles.has(text)) {
          seenTitles.add(text);
          result.headlines.push({
            title: text,
            url: anchor && anchor.href ? anchor.href : ''
          });
        }
      }
    }

    return result;
  }

  function toggleCleanReaderMode() {
    if (readerOverlay && document.body.contains(readerOverlay)) {
      readerOverlay.remove();
      readerOverlay = null;
      document.documentElement.style.overflow = '';
      return false;
    }

    const article = extractStructuredArticle();
    readerOverlay = document.createElement('div');
    readerOverlay.id = '__cookie-guardian-reader';
    readerOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #0f172a;
      color: #e2e8f0;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif;
      padding: 40px 20px 80px;
      line-height: 1.75;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      max-width: 740px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 36px 42px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65);
    `;

    const topBar = document.createElement('div');
    topBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
      padding-bottom: 16px;
      margin-bottom: 24px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const badge = document.createElement('div');
    badge.style.cssText = 'color: #10b981; font-weight: 700; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;';
    badge.textContent = `\uD83D\uDEE1\uFE0F Voidwalker Clean Reader \u2022 ${location.hostname}`;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715 Exit Clean Reader';
    closeBtn.style.cssText = `
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    `;
    closeBtn.onclick = () => toggleCleanReaderMode();

    topBar.appendChild(badge);
    topBar.appendChild(closeBtn);
    container.appendChild(topBar);

    const h1 = document.createElement('h1');
    h1.style.cssText = 'font-size: 28px; line-height: 1.3; color: #f8fafc; margin: 0 0 12px 0;';
    h1.textContent = article.title;
    container.appendChild(h1);

    if (article.byline || article.publishedAt) {
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size: 14px; color: #94a3b8; margin-bottom: 20px; font-family: system-ui, sans-serif;';
      meta.textContent = [article.byline, article.publishedAt].filter(Boolean).join(' \u2022 ');
      container.appendChild(meta);
    }

    if (article.lead) {
      const lead = document.createElement('p');
      lead.style.cssText = 'font-size: 19px; color: #cbd5e1; font-weight: 500; margin-bottom: 24px;';
      lead.textContent = article.lead;
      container.appendChild(lead);
    }

    if (article.paragraphs.length > 0) {
      for (const pText of article.paragraphs) {
        const p = document.createElement('p');
        p.style.cssText = 'font-size: 17px; color: #e2e8f0; margin: 0 0 18px 0;';
        p.textContent = pText;
        container.appendChild(p);
      }
    }

    if (article.headlines.length > 0) {
      const hSection = document.createElement('div');
      hSection.style.cssText = 'margin-top: 32px; border-top: 1px solid #334155; padding-top: 24px; font-family: system-ui, sans-serif;';
      const hTitle = document.createElement('h2');
      hTitle.style.cssText = 'font-size: 18px; color: #10b981; margin: 0 0 16px 0;';
      hTitle.textContent = `Extracted News Headlines (${article.headlines.length})`;
      hSection.appendChild(hTitle);

      const list = document.createElement('ul');
      list.style.cssText = 'list-style: none; padding: 0; margin: 0; display: grid; gap: 10px;';
      for (const item of article.headlines.slice(0, 40)) {
        const li = document.createElement('li');
        li.style.cssText = 'background: #0f172a; padding: 12px 16px; border-radius: 8px; border: 1px solid #1e293b;';
        if (item.url) {
          const a = document.createElement('a');
          a.href = item.url;
          a.textContent = item.title;
          a.style.cssText = 'color: #f1f5f9; text-decoration: none; font-weight: 500; font-size: 15px; display: block;';
          li.appendChild(a);
        } else {
          li.textContent = item.title;
        }
        list.appendChild(li);
      }
      hSection.appendChild(list);
      container.appendChild(hSection);
    }

    readerOverlay.appendChild(container);
    document.body.appendChild(readerOverlay);
    document.documentElement.style.overflow = 'hidden';

    try {
      chrome.runtime.sendMessage({
        action: 'LOG_GUARDIAN_EVENT',
        eventType: 'CLEAN_READER',
        detail: {
          summary: `Extracted ${article.paragraphs.length} paragraphs & ${article.headlines.length} headlines cleanly`
        }
      });
    } catch (_) {}

    return true;
  }
})();
