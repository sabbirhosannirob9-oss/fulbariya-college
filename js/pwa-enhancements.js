/* Fulbariya College PWA enhancements. Additive only: no existing app APIs are replaced. */
(function () {
  'use strict';
  var html = document.documentElement;
  var standalone = false;
  try {
    standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true;
  } catch (_) {}

  // Register the existing service worker on public sub-pages too. Re-registering the same
  // script/scope is safe and keeps direct PWA deep-links under the same offline controller.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .catch(function (error) { console.warn('[FDC PWA] Service worker registration failed:', error); });
    }, { once: true });
  }

  if (!standalone || document.querySelector('.fdc-pwa-bottom-nav')) return;
  html.classList.add('fdc-pwa-standalone');

  var paths = {
    home: '/', notices: '/public-pages/notices.html', results: '/public-pages/results.html',
    services: '/public-pages/academic-hub.html'
  };
  var currentPath = location.pathname.replace(/\/$/, '') || '/';
  var isActive = function (key) {
    if (key === 'home') return currentPath === '/' || currentPath === '/index.html';
    return currentPath === paths[key] || currentPath.indexOf(paths[key].replace('.html','-')) === 0;
  };
  var svg = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></svg>',
    notices: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    results: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h5M8 16h3"/></svg>',
    services: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    about: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    admission: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6"/></svg>',
    routine: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M7 17h7"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 5-9 11-9 11S3 15 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
  };
  function navItem(key, label, href) {
    var a = document.createElement('a');
    a.className = 'fdc-pwa-nav-item'; a.href = href; a.innerHTML = svg[key] + '<span>' + label + '</span>';
    if (isActive(key)) a.setAttribute('aria-current', 'page');
    return a;
  }
  var menu = document.createElement('div');
  menu.className = 'fdc-pwa-more-menu'; menu.id = 'fdcPwaMoreMenu'; menu.setAttribute('aria-label', 'আরও পেজ');
  var menuLinks = [
    ['about','কলেজ পরিচিতি','/public-pages/about.html'],
    ['admission','ভর্তি তথ্য','/public-pages/admission.html'],
    ['routine','ক্লাস রুটিন','/public-pages/class-routine.html'],
    ['gallery','ফটো গ্যালারি','/public-pages/gallery.html'],
    ['contact','যোগাযোগ','/public-pages/contact.html']
  ];
  menuLinks.forEach(function (item) {
    var a = document.createElement('a'); a.href = item[2]; a.innerHTML = svg[item[0]] + '<span>' + item[1] + '</span>'; menu.appendChild(a);
  });

  var nav = document.createElement('nav'); nav.className = 'fdc-pwa-bottom-nav'; nav.setAttribute('aria-label', 'প্রধান নেভিগেশন');
  nav.appendChild(navItem('home','হোম',paths.home));
  nav.appendChild(navItem('notices','নোটিশ',paths.notices));
  nav.appendChild(navItem('results','ফলাফল',paths.results));
  nav.appendChild(navItem('services','সেবা',paths.services));
  var more = document.createElement('button'); more.type = 'button'; more.className = 'fdc-pwa-nav-item'; more.setAttribute('aria-expanded','false'); more.setAttribute('aria-controls',menu.id); more.innerHTML = svg.more + '<span>আরও</span>';
  if (menuLinks.some(function (item) { return currentPath === item[2]; })) more.classList.add('is-open');
  function closeMenu() { menu.classList.remove('is-open'); more.classList.remove('is-open'); more.setAttribute('aria-expanded','false'); }
  more.addEventListener('click', function () {
    var open = !menu.classList.contains('is-open'); menu.classList.toggle('is-open',open); more.classList.toggle('is-open',open); more.setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('click', function (event) { if (!menu.contains(event.target) && !more.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
  nav.appendChild(more);
  document.body.appendChild(menu); document.body.appendChild(nav);

  // Small connectivity hint; does not intercept or change any existing app behavior.
  var toast = document.createElement('div'); toast.className = 'fdc-pwa-status-toast'; toast.setAttribute('role','status'); toast.setAttribute('aria-live','polite'); document.body.appendChild(toast);
  var toastTimer;
  function showStatus(message) { toast.textContent = message; toast.classList.add('is-visible'); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(function(){toast.classList.remove('is-visible');}, 3200); }
  window.addEventListener('offline', function(){ showStatus('ইন্টারনেট সংযোগ নেই। আগে ক্যাশ করা কিছু পেজ দেখা যেতে পারে।'); });
  window.addEventListener('online', function(){ showStatus('ইন্টারনেট সংযোগ ফিরে এসেছে।'); });
})();
