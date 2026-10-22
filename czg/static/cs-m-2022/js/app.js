// CS-Math 2022 Static App Logic

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  initStageFilters();
  initModals();
  initNavigationTracking();
  checkLastViewedSection();
  initStickyLocationIndicator();
});

// 1. Theme Management (Dark / Light)
function initTheme() {
  const toggleBtn = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const saved = localStorage.getItem('cs_math_theme') || 'dark';
  
  applyTheme(saved);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const target = current === 'dark' ? 'light' : 'dark';
      applyTheme(target);
      localStorage.setItem('cs_math_theme', target);
    });
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeIcon) {
      themeIcon.textContent = t === 'dark' ? '🌓' : '☀️';
    }
  }
}

// 2. Real-time Search & Filter
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const cards = document.querySelectorAll('.standard-card');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    
    cards.forEach(card => {
      if (!val) {
        card.style.display = '';
        return;
      }
      const text = card.textContent.toLowerCase();
      const id = card.getAttribute('data-item-id').toLowerCase();
      if (text.includes(val) || id.includes(val)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// 3. Stage Switcher
function initStageFilters() {
  const pills = document.querySelectorAll('#stageFilter .stage-pill');
  const sections = document.querySelectorAll('.stage-section-block');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const stage = pill.getAttribute('data-stage');
      sections.forEach(sec => {
        if (stage === 'ALL' || sec.getAttribute('data-stage') === stage) {
          sec.style.display = '';
        } else {
          sec.style.display = 'none';
        }
      });
    });
  });
}

// 4. Copy Item ID to clipboard
window.copyId = function(itemId) {
  navigator.clipboard.writeText(itemId).then(() => {
    showToast(`已复制: ${itemId}`);
    // Record clicked item as active reading progress
    recordSection({
      type: 'item',
      title: itemId,
      url: window.location.pathname.split('/').pop() + '#' + itemId
    });
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = itemId;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`已复制: ${itemId}`);
  });
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// 5. Track and record user's opened/visited section
function recordSection(info) {
  try {
    localStorage.setItem('cs_math_last_section', JSON.stringify({
      ...info,
      time: new Date().getTime()
    }));
  } catch (e) {}
}

function initNavigationTracking() {
  // 5.1 Nav Tree Click Delegation: Clicking headers or titles toggles open/close
  document.addEventListener('click', (e) => {
    // 1. Stage header or stage title click
    const stageHdr = e.target.closest('.nav-stage-header');
    if (stageHdr) {
      // Never trigger page navigation or reload on stage header click
      e.preventDefault();
      const stageGroup = stageHdr.closest('.nav-stage-group');
      if (stageGroup) {
        stageGroup.classList.toggle('open');
      }
      return;
    }

    // 2. Domain header or domain title click
    const domainHdr = e.target.closest('.nav-domain-header');
    if (domainHdr) {
      const domainItem = domainHdr.closest('.nav-domain-item');
      if (domainItem) {
        domainItem.classList.toggle('open');
      }
      // If clicking domain arrow, badge, or tag, prevent jump
      if (e.target.closest('.domain-arrow') || e.target.closest('.domain-cnt')) {
        e.preventDefault();
      }
      return;
    }

    // 3. Topic header or topic title click
    const topicHdr = e.target.closest('.nav-topic-header');
    if (topicHdr) {
      const topicItem = topicHdr.closest('.nav-topic-item');
      if (topicItem && topicItem.querySelector('.nav-subtopic-list')) {
        topicItem.classList.toggle('open');
      }
      if (e.target.closest('.topic-arrow') || e.target.closest('.topic-cnt')) {
        e.preventDefault();
      }
      return;
    }
  });


  // Smooth scroll with offset taking header and sticky indicator bar into account
  function scrollToTargetWithOffset(hash) {
    if (!hash || hash === '#') return;
    const targetElem = document.getElementById(hash.replace('#', ''));
    if (!targetElem) return;

    const offset = 114; // 64px header + 38px indicator bar + 12px breathing room
    const elementPosition = targetElem.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth'
    });
  }

  // Track clicking on subtopic links
  document.querySelectorAll('.nav-subtopic-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const stage = link.getAttribute('data-stage');
      const domain = link.getAttribute('data-domain');
      const topic = link.getAttribute('data-topic');
      const subtopic = link.getAttribute('data-subtopic');

      recordSection({
        type: 'subtopic',
        title: `${stage} · ${domain} · ${topic} · ${subtopic}`,
        url: href
      });

      if (href && href.startsWith('#')) {
        e.preventDefault();
        scrollToTargetWithOffset(href);
        history.pushState(null, '', href);
      }
    });
  });

  // Track clicking on topic links
  document.querySelectorAll('.nav-topic-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const stage = link.getAttribute('data-stage');
      const domain = link.getAttribute('data-domain');
      const topic = link.getAttribute('data-topic');
      const href = link.getAttribute('href');
      
      recordSection({
        type: 'topic',
        title: `${stage} · ${domain} · ${topic}`,
        url: href
      });

      if (href && href.startsWith('#')) {
        e.preventDefault();
        scrollToTargetWithOffset(href);
        history.pushState(null, '', href);
      }
    });
  });

  // Track clicking on domain links
  document.querySelectorAll('.nav-domain-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const stage = link.getAttribute('data-stage');
      const domain = link.getAttribute('data-domain');
      const href = link.getAttribute('href');
      
      recordSection({
        type: 'domain',
        title: `${stage} · ${domain}`,
        url: href
      });

      if (href && href.startsWith('#')) {
        e.preventDefault();
        scrollToTargetWithOffset(href);
        history.pushState(null, '', href);
      }
    });
  });

  // Scroll spy tracking active visible topic or card
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const topicBlocks = document.querySelectorAll('.topic-block');
      const scrollPos = window.scrollY + 120;
      
      for (let i = topicBlocks.length - 1; i >= 0; i--) {
        const blk = topicBlocks[i];
        if (blk.offsetTop <= scrollPos) {
          const header = blk.querySelector('.topic-header span, .stage-header span');
          const title = header ? header.textContent : '';
          const blkId = blk.id;
          const currPage = window.location.pathname.split('/').pop() || 'index.html';
          
          recordSection({
            type: 'scroll',
            title: title,
            url: `${currPage}#${blkId}`
          });
          break;
        }
      }
    }, 400);
  }, { passive: true });
}

// 6. Check last viewed section on load and prompt user (only on index.html)
function checkLastViewedSection() {
  try {
    const raw = localStorage.getItem('cs_math_last_section');
    if (!raw) return;
    const last = JSON.parse(raw);
    
    const currPage = window.location.pathname.split('/').pop() || 'index.html';
    const isIndex = (currPage === '' || currPage === 'index.html');
    const currHash = window.location.hash;
    const currFull = currPage + currHash;

    // If currently on specific stage page matching the target, expand tree
    if (currFull === last.url || (last.url && last.url.endsWith(currHash) && currHash !== '')) {
      expandNavToTarget(last.url);
      return;
    }

    // Only trigger the "continue from last viewed" prompt when opening index.html
    if (isIndex && last.url && last.url !== 'index.html') {
      showResumeBanner(last);
    }
  } catch (e) {}
}

function showResumeBanner(last) {
  let banner = document.getElementById('resumeBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'resumeBanner';
    banner.className = 'resume-banner';
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="resume-text">
      发现上次阅读进度：<strong>${last.title || '上次浏览章节'}</strong><br>
      <span style="font-size:12px; color:var(--text-muted);">是否继续研读该章节？</span>
    </div>
    <div class="resume-actions">
      <button class="btn-resume" id="btnResumeContinue">继续阅读</button>
      <button class="btn-dismiss" id="btnResumeDismiss">忽略</button>
    </div>
  `;

  requestAnimationFrame(() => {
    banner.classList.add('show');
  });

  document.getElementById('btnResumeContinue').addEventListener('click', () => {
    banner.classList.remove('show');
    if (last.url) {
      window.location.href = last.url;
    }
  });

  document.getElementById('btnResumeDismiss').addEventListener('click', () => {
    banner.classList.remove('show');
  });
}

function expandNavToTarget(targetUrl) {
  // If targetUrl contains an anchor like #top-S4-NA-NS, expand stage and domain
  const hash = targetUrl.includes('#') ? targetUrl.split('#')[1] : '';
  if (!hash) return;

  const targetElem = document.getElementById(hash);
  if (targetElem) {
    const offset = 114;
    const elementPosition = targetElem.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'smooth'
    });
  }

  // Find corresponding link in nav tree
  const navLink = document.querySelector(`.nav-tree-3level a[href*="${hash}"]`);
  if (navLink) {
    // Open parent domain item
    const domainItem = navLink.closest('.nav-domain-item');
    if (domainItem) domainItem.classList.add('open');

    // Open parent stage group
    const stageGroup = navLink.closest('.nav-stage-group');
    if (stageGroup) stageGroup.classList.add('open');
  }
}

// 7. Modals
function initModals() {
  const btnStats = document.getElementById('btnStats');
  if (btnStats) {
    btnStats.addEventListener('click', () => {
      const data = window.CS_DATA;
      if (!data) return;
      const modal = document.getElementById('detailModal');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.textContent = "课标体系概览统计";
      body.innerHTML = `
        <div style="margin-bottom:12px;"><strong>标准全称：</strong>${data.metadata.standard_name}</div>
        <div style="margin-bottom:12px;"><strong>学制模式：</strong>${data.metadata.system}</div>
        <div style="margin-bottom:12px;"><strong>条目总数：</strong>${data.items.length} 个标准细目</div>
        <div style="margin-bottom:16px;"><strong>核心素养维度：</strong>${data.metadata.core_competencies.length} 项（涵盖小学经验与初中进阶）</div>
        <hr style="border:none; border-top:1px solid var(--border-subtle); margin:12px 0;">
        <p style="color:var(--text-muted); font-size:13px;">每个条目挂载唯一索引 ID（例如 <code>cs-m-2022:S4.NA.NS.010</code>），支持在各类测评题库、学情诊断系统中原子级精准引用。</p>
      `;
      modal.classList.add('open');
    });
  }

  // Click on competency badges
  document.addEventListener('click', (e) => {
    const compBadge = e.target.closest('.tag-badge.competency');
    if (compBadge && window.CS_DATA) {
      const code = compBadge.getAttribute('data-code');
      const cInfo = window.CS_DATA.cc_dict[code];
      if (cInfo) {
        const modal = document.getElementById('detailModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');

        title.textContent = `核心素养：${cInfo.name} (${cInfo.en})`;
        body.innerHTML = `
          <div style="margin-bottom:10px;"><strong>素养代号：</strong><code>${cInfo.code}</code></div>
          <div style="margin-bottom:10px;"><strong>适用学段：</strong>${cInfo.stages.join(', ')}</div>
          <div style="margin-top:12px; font-size:13px; color:var(--text-muted);">在新课标体系中贯通学习过程，最终指向核心素养的达成。</div>
        `;
        modal.classList.add('open');
      }
    }
  });
}

window.closeModal = function() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('open');
};

// 8. Sticky Location Indicator (domain > topic > sub-topic of top item)
function initStickyLocationIndicator() {
  const docSubtitle = document.querySelector('.doc-subtitle');
  if (!docSubtitle) return;

  // Create sticky location bar element if not exists
  let bar = document.getElementById('stickyLocationBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'stickyLocationBar';
    bar.className = 'sticky-location-bar';
    document.body.appendChild(bar);
  }

  const cards = Array.from(document.querySelectorAll('.standard-card[data-item-id]'));
  if (cards.length === 0) return;

  let ticking = false;

  function updateLocationBar() {
    ticking = false;

    // Check if doc-subtitle is scrolled out of view (64px header)
    const subtitleRect = docSubtitle.getBoundingClientRect();
    const isSubtitleOutOfView = subtitleRect.bottom < 64;

    if (!isSubtitleOutOfView) {
      bar.classList.remove('visible');
      return;
    }

    // Header threshold line below sticky bar (64px header + 38px bar = 102px)
    const threshold = 104;
    let topCard = null;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.style.display === 'none') continue;
      const rect = card.getBoundingClientRect();
      if (rect.bottom >= threshold) {
        topCard = card;
        break;
      }
    }

    if (!topCard) {
      topCard = cards[cards.length - 1];
    }

    if (topCard) {
      const domain = topCard.getAttribute('data-domain') || '';
      const topic = topCard.getAttribute('data-topic') || '';
      const subtopic = topCard.getAttribute('data-subtopic') || '';
      const itemId = topCard.getAttribute('data-item-id') || '';

      let crumbHtml = `<div class="sticky-loc-crumb">`;
      if (domain) {
        crumbHtml += `<span class="loc-domain">${domain}</span>`;
      }
      if (topic) {
        crumbHtml += `<span class="loc-sep">/</span><span class="loc-topic">${topic}</span>`;
      }
      if (subtopic) {
        crumbHtml += `<span class="loc-sep">/</span><span class="loc-subtopic">${subtopic}</span>`;
      }
      if (itemId) {
        crumbHtml += `<span class="loc-item-id">${itemId}</span>`;
      }
      crumbHtml += `</div>`;

      bar.innerHTML = crumbHtml;
      bar.classList.add('visible');
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateLocationBar);
      ticking = true;
    }
  }, { passive: true });

  // Initial check
  updateLocationBar();
}
