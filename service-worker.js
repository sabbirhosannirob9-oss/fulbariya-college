/**
 * =========================================================
 * FULBARIYA COLLEGE — SERVICE WORKER
 * Location: /service-worker.js
 * Version: v2.2.0
 * Purpose: PWA Install + Offline Caching
 * Changes v2.2.0:
 *   - Class Routine + Exam Routine system added
 *   - Academic Hub cleanup (Routine tab removed)
 *   - Old unused files removed from cache
 * =========================================================
 */

const CACHE_VERSION = 'fdc-v2.2.0';
const STATIC_CACHE = 'fdc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fdc-dynamic-' + CACHE_VERSION;

// =========================================================
// STATIC ASSETS — Pre-cache on install
// =========================================================
const STATIC_ASSETS = [
    // Core
    '/',
    '/index.html',
    '/manifest.json',

    // Icons / Images
    '/assets/images/logo1.png',
    '/assets/images/web-app-manifest-192x192.png',
    '/assets/images/web-app-manifest-512x512.png',
    '/assets/images/apple-touch-icon.png',
    '/assets/images/favicon-96x96.png',
    '/assets/images/favicon.ico',

    // CSS
    '/css/style.css',
    '/css/responsive.css',
    '/css/admin.css',
    '/css/student.css',
    '/css/notice-board.css',

    // JS — Core
    '/js/config.js',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/app.js',
    '/js/scroll-restore.js',

    // JS — Public
    '/js/notice-board.js',
    '/js/gallery.js',
    '/js/results.js?v=2',
    '/js/result-details.js?v=2',

    // JS — Student
    '/js/student.js',
    '/js/student-login.js',
    '/js/student-dashboard.js',

    // JS — Admin Core
    '/js/admin-guard.js',
    '/js/admin-popup.js',
    '/js/admin-login.js',

    // JS — Admin Pages
    '/js/admin-dashboard.js',
    '/js/admin-students.js?v=9',
    '/js/admin-subjects.js?v=2',
    '/js/admin-results.js?v=2',
    '/js/admin-notices.js',
    '/js/admin-news.js',
    '/js/admin-gallery.js',
    '/js/admin-calendar.js',
    '/js/admin-bncc.js',
    '/js/admin-scouts.js',
    '/js/admin-greeting.js',
    '/js/admin-department-heads.js',
    '/js/admin-settings.js',
    '/js/admin-profile.js',
    '/js/admin-board-final.js',

    // ⭐ JS — Class Routine (NEW v2.2.0)
    '/js/admin-class-routine.js?v=2',

    // ⭐ JS — Exam Routine (NEW v2.2.0)
    '/js/admin-exam-routine.js?v=1',

    // JS — Promote System
    '/js/promote-utils.js?v=2',
    '/js/promote-engine.js?v=2',
    '/js/promote-restore.js',
    '/js/promote-rules.js',
    '/js/admin-promote.js?v=2',
    '/js/admin-promote-history.js',
    '/js/admin-promote-settings.js',

    // JS — GPA Calculator
    '/js/gpa-calculator.js',

    // ⭐ JS — Public Routine (NEW v2.2.0)
    '/js/class-routine.js?v=2',
    '/js/exam-routine.js?v=2',
    '/js/academic-hub.js?v=2',

    // Public Pages
    '/public-pages/results.html',
    '/public-pages/result-details.html',
    '/public-pages/result-overview.html',
    '/public-pages/notices.html',
    '/public-pages/notice-details.html',
    '/public-pages/news.html',
    '/public-pages/news-details.html',
    '/public-pages/gallery.html',
    '/public-pages/bncc.html',
    '/public-pages/scouts.html',
    '/public-pages/contact.html',
    '/public-pages/about.html',
    '/public-pages/admission.html',
    '/public-pages/academics.html',

    // ⭐ Academic Hub (updated — Calendar only)
    '/public-pages/academic-hub.html',

    // ⭐ Class Routine Board (NEW v2.2.0)
    '/public-pages/class-routine.html',

    // ⭐ Exam Routine Board (NEW v2.2.0)
    '/public-pages/exam-routine.html',

    // Admin Pages
    '/admin-pages/admin-dashboard.html',
    '/admin-pages/admin-login.html',
    '/admin-pages/admin-students.html',
    '/admin-pages/admin-subjects.html',
    '/admin-pages/admin-results.html',
    '/admin-pages/admin-notices.html',
    '/admin-pages/admin-news.html',
    '/admin-pages/admin-gallery.html',
    '/admin-pages/admin-calendar.html',
    '/admin-pages/admin-bncc.html',
    '/admin-pages/admin-scouts.html',
    '/admin-pages/admin-greeting.html',
    '/admin-pages/admin-department-heads.html',
    '/admin-pages/admin-settings.html',
    '/admin-pages/admin-profile.html',
    '/admin-pages/admin-board-final.html',

    // ⭐ Admin Class Routine (NEW v2.2.0)
    '/admin-pages/admin-class-routine.html',

    // ⭐ Admin Exam Routine (NEW v2.2.0)
    '/admin-pages/admin-exam-routine.html'
];

// =========================================================
// INSTALL — Pre-cache static assets
// =========================================================
self.addEventListener('install', function (event) {
    console.log('[SW] Installing v' + CACHE_VERSION + '...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            console.log('[SW] Caching ' + STATIC_ASSETS.length + ' static assets');

            // Cache individually so one failure doesn't break all
            return Promise.all(
                STATIC_ASSETS.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] Failed to cache:', url, err.message || err);
                    });
                })
            );
        }).then(function () {
            console.log('[SW] Install complete');
            return self.skipWaiting();
        })
    );
});

// =========================================================
// ACTIVATE — Clean old caches
// =========================================================
self.addEventListener('activate', function (event) {
    console.log('[SW] Activating v' + CACHE_VERSION + '...');

    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function () {
            console.log('[SW] Activate complete');
            return self.clients.claim();
        })
    );
});

// =========================================================
// FETCH — Smart caching strategy
// =========================================================
self.addEventListener('fetch', function (event) {
    const request = event.request;
    const url = new URL(request.url);

    // =====================================================
    // Skip non-GET requests
    // =====================================================
    if (request.method !== 'GET') return;

    // =====================================================
    // Skip external APIs (Supabase, Cloudinary, CDN)
    // Network-first with cache fallback
    // =====================================================
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('cloudinary.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('wikipedia.org') ||
        url.hostname.includes('api.wikimedia.org') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(
            fetch(request).catch(function () {
                return caches.match(request);
            })
        );
        return;
    }

    // =====================================================
    // Same-origin requests
    // =====================================================
    if (url.origin === location.origin) {

        // Admin pages — Network-first (always fresh data)
        if (url.pathname.startsWith('/admin-pages/')) {
            event.respondWith(
                fetch(request).then(function (response) {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(function () {
                    return caches.match(request).then(function (cached) {
                        if (cached) return cached;
                        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
                            return caches.match('/admin-pages/admin-login.html');
                        }
                    });
                })
            );
            return;
        }

        // Public pages — Cache-first (fast, offline-friendly)
        event.respondWith(
            caches.match(request).then(function (cached) {
                if (cached) return cached;

                return fetch(request).then(function (response) {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(function () {
                    // Offline fallback
                    if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
                        return caches.match('/index.html');
                    }
                });
            })
        );
    }
});

// =========================================================
// MESSAGE — For manual cache update
// =========================================================
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skipping waiting');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[SW] Clearing cache per request');
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                return caches.delete(key);
            }));
        });
    }
});

console.log('[SW] Service Worker loaded — Version ' + CACHE_VERSION);