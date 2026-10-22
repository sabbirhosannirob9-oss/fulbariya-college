/* Fulbaria College — lightweight premium site shell. No framework or external request. */
(function () {
  'use strict';
  if (window.__FDC_PREMIUM_SHELL__) return;
  window.__FDC_PREMIUM_SHELL__ = true;

  function normalizeBranding() {
    var brand = 'Fulbaria College';
    document.querySelectorAll('[data-college-name]').forEach(function (node) {
      if (node.textContent.trim() !== brand) node.textContent = brand;
    });
    if (/ফুলবাড়ীয়া কলেজ|ফুলবাড়ীয়া কলেজ|Fulbariya(?: Degree)? College/i.test(document.title)) {
      document.title = document.title.replace(/ফুলবাড়ীয়া কলেজ|ফুলবাড়ীয়া কলেজ|Fulbariya(?: Degree)? College/gi, brand);
    }
  }
  function observeBranding() {
    normalizeBranding();
    if (!('MutationObserver' in window)) return;
    document.querySelectorAll('[data-college-name]').forEach(function (node) {
      var observer = new MutationObserver(function () {
        if (node.textContent.trim() !== 'Fulbaria College') node.textContent = 'Fulbaria College';
      });
      observer.observe(node, { childList: true, characterData: true, subtree: true });
    });
    var title = document.querySelector('head title');
    if (title) new MutationObserver(normalizeBranding).observe(title, { childList: true, characterData: true, subtree: true });
  }

  var links = [
    ['Home', '/', 'fa-house'],
    ['About the College', '/public-pages/about.html', 'fa-building-columns'],
    ['Academic Information', '/public-pages/academics.html', 'fa-graduation-cap'],
    ['Notices', '/public-pages/notices.html', 'fa-bullhorn'],
    ['News & Updates', '/public-pages/news.html', 'fa-newspaper'],
    ['Results', '/public-pages/results.html', 'fa-square-poll-vertical'],
    ['Class Routine', '/public-pages/class-routine.html', 'fa-calendar-days'],
    ['Exam Routine', '/public-pages/exam-routine.html', 'fa-calendar-check'],
    ['Admission Information', '/public-pages/admission.html', 'fa-user-plus'],
    ['Academic Hub', '/public-pages/academic-hub.html', 'fa-layer-group'],
    ['Photo Gallery', '/public-pages/gallery.html', 'fa-images'],
    ['BNCC', '/public-pages/bncc.html', 'fa-shield-halved'],
    ['Scouts', '/public-pages/scouts.html', 'fa-compass'],
    ['Contact', '/public-pages/contact.html', 'fa-envelope'],
    ['Student Portal', '/public-pages/results.html', 'fa-user-graduate']
  ];
  var current = (location.pathname.replace(/\/$/, '') || '/');
  var activePath = current === '/index.html' ? '/' : current;
  function isActive(href) {
    if (href === '/') return activePath === '/';
    return activePath === href || activePath.indexOf(href.replace(/\.html$/, '-')) === 0;
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function init() {
    observeBranding();
    var header = document.querySelector('.main-header') || document.querySelector('.public-header, .pub-header') || document.querySelector('.college-header') || document.querySelector('.top-bar');
    if (!header || document.querySelector('.fdc-premium-drawer')) return;
    var headerContainer = header.querySelector('.container-custom') || header.querySelector('.container') || header;
    var brandLogo = document.querySelector('.logo-box img');
    var logoSrc = brandLogo ? brandLogo.getAttribute('src') : '/assets/images/fulbaria-college-mark.svg';
    if (logoSrc && !/^https?:/.test(logoSrc) && logoSrc.charAt(0) !== '/') {
      logoSrc = new URL(logoSrc, document.baseURI).pathname;
    }
    var button = el('button', 'fdc-premium-menu-button');
    button.type = 'button'; button.setAttribute('aria-label', 'Open navigation menu');
    button.setAttribute('aria-controls', 'fdcPremiumDrawer'); button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    headerContainer.appendChild(button);

    var backdrop = el('div', 'fdc-premium-drawer-backdrop');
    backdrop.setAttribute('aria-hidden', 'true');
    var drawer = el('aside', 'fdc-premium-drawer'); drawer.id = 'fdcPremiumDrawer';
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Fulbaria College navigation'); drawer.setAttribute('aria-hidden', 'true');
    var head = el('div', 'fdc-premium-drawer-head');
    var logo = el('img', 'fdc-premium-drawer-logo'); logo.src = logoSrc || '/assets/images/fulbaria-college-mark.svg'; logo.alt = 'Fulbaria College';
    logo.onerror = function () { this.style.display = 'none'; };
    var brand = el('div', 'fdc-premium-drawer-brand');
    var brandName = el('strong', '', 'Fulbaria College'); var brandSub = el('span', '', 'Official College Portal');
    brand.appendChild(brandName); brand.appendChild(brandSub);
    var close = el('button', 'fdc-premium-drawer-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close navigation menu');
    head.appendChild(logo); head.appendChild(brand); head.appendChild(close);
    drawer.appendChild(head);
    drawer.appendChild(el('p', 'fdc-premium-drawer-label', 'Explore the website'));
    var list = el('nav', 'fdc-premium-drawer-links'); list.setAttribute('aria-label', 'Website pages');
    links.forEach(function (item) {
      var a = el('a'); a.href = item[1];
      var icon = el('i'); icon.className = 'fa-solid ' + item[2]; icon.setAttribute('aria-hidden', 'true');
      var label = el('span', '', item[0]); a.appendChild(icon); a.appendChild(label);
      if (isActive(item[1])) a.setAttribute('aria-current', 'page');
      list.appendChild(a);
    });
    drawer.appendChild(list);
    var footer = el('div', 'fdc-premium-drawer-footer');
    footer.appendChild(el('span', '', 'A premium digital experience for'));
    footer.appendChild(el('strong', '', 'Fulbaria College'));
    footer.appendChild(el('span', '', 'Developed by Sabbir Hosan Nirob'));
    drawer.appendChild(footer);
    document.body.appendChild(backdrop); document.body.appendChild(drawer);

    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      backdrop.classList.add('is-open'); drawer.classList.add('is-open');
      document.body.classList.add('fdc-drawer-open'); button.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false'); button.setAttribute('aria-label', 'Close navigation menu');
      window.setTimeout(function () { close.focus(); }, 40);
    }
    function shut() {
      backdrop.classList.remove('is-open'); drawer.classList.remove('is-open');
      document.body.classList.remove('fdc-drawer-open'); button.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true'); button.setAttribute('aria-label', 'Open navigation menu');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }
    button.addEventListener('click', function () { drawer.classList.contains('is-open') ? shut() : open(); });
    close.addEventListener('click', shut); backdrop.addEventListener('click', shut);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) shut();
      if (event.key === 'Tab' && drawer.classList.contains('is-open')) {
        var focusables = drawer.querySelectorAll('a[href],button:not([disabled])');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    // Add a restrained developer credit on pages that already have a footer but no credit.
    var footerHost = document.querySelector('.footer-bottom, footer .container-custom, footer .container, .main-footer');
    if (footerHost && !footerHost.querySelector('.fdc-premium-developer-credit') && !footerHost.querySelector('.footer-credit')) {
      var credit = el('div', 'fdc-premium-developer-credit');
      credit.textContent = 'Developed by Sabbir Hosan Nirob';
      credit.style.cssText = 'margin:18px auto 0;text-align:center;font:500 11px/1.6 system-ui,sans-serif;letter-spacing:.25px;color:rgba(255,255,255,.72)';
      footerHost.appendChild(credit);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
