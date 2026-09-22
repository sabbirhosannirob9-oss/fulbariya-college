/**
 * =========================================================
 * FULBARIYA COLLEGE — SERVICE WORKER
 * Location: /service-worker.js
 * Version: v2.9.2
 * Purpose: PWA Install + Offline Caching
 *
 * Changes v2.9.2:
 *   - Admin Admissions v2.1 (PDF button conditional)
 *   - Legacy: v2.9.1 Subject Pools, v2.8.0 Admission System, v2.7.0 Result Overview
 * =========================================================
 */

const CACHE_VERSION = 'fdc-v2.9.2';
const STATIC_CACHE = 'fdc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fdc-dynamic-' + CACHE_VERSION;

const DYNAMIC_CACHE_LIMIT = 60;

// =========================================================
// STATIC ASSETS — Pre-cache on install
// =========================================================
const STATIC_ASSETS = [
    // ==================== Core ====================
    '/',
    '/index.html',
    '/manifest.json',

    // ==================== Icons / Images ====================
    '/assets/images/logo1.png',
    '/assets/images/web-app-manifest-192x192.png',
    '/assets/images/web-app-manifest-512x512.png',
    '/assets/images/apple-touch-icon.png',
    '/assets/images/favicon-96x96.png',
    '/assets/images/favicon.ico',

    // ==================== CSS ====================
    '/css/style.css',
    '/css/responsive.css',
    '/css/admin.css',
    '/css/student.css',
    '/css/notice-board.css',

    // ==================== JS — Core ====================
    '/js/config.js',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/app.js',
    '/js/scroll-restore.js',

    // ✅ Session Helper (central year system)
    '/js/session-helper.js',

    // ==================== JS — Public ====================
    '/js/notice-board.js',
    '/js/gallery.js',
    '/js/results.js?v=2',
    '/js/result-details.js?v=4',
    '/js/result-overview.js?v=2',

    // ==================== JS — Student ====================
    '/js/student.js',
    '/js/student-login.js',
    '/js/student-dashboard.js',

    // ==================== JS — Admin Core ====================
    '/js/admin-guard.js',
    '/js/admin-popup.js?v=2',
    '/js/admin-login.js',

    // ==================== JS — Admin Pages ====================
    '/js/admin-dashboard.js',
    '/js/admin-students.js?v=13',
    '/js/admin-subjects.js?v=4',
    '/js/admin-results.js?v=3',
    '/js/admin-notices.js',
    '/js/admin-news.js',
    '/js/admin-gallery.js',
    '/js/admin-calendar.js?v=2',
    '/js/admin-bncc.js',
    '/js/admin-scouts.js',
    '/js/admin-greeting.js',
    '/js/admin-department-heads.js',
    '/js/admin-settings.js',
    '/js/admin-profile.js',
    '/js/admin-board-final.js',
    '/js/admin-result-overview.js?v=1',

    // ==================== JS — Class / Exam Routine ====================
    '/js/admin-class-routine.js?v=4',
    '/js/admin-exam-routine.js?v=3',

    // ==================== JS — Promote System ====================
    '/js/promote-utils.js?v=4',
    '/js/promote-engine.js?v=3',
    '/js/promote-restore.js?v=3',
    '/js/promote-rules.js?v=3',
    '/js/admin-promote.js?v=3.1',
    '/js/admin-promote-history.js?v=3',
    '/js/admin-promote-settings.js?v=3',

    // ==================== JS — GPA Calculator ====================
    '/js/gpa-calculator.js?v=2',

    // ==================== JS — Public Routine ====================
    '/js/class-routine.js?v=2',
    '/js/exam-routine.js?v=2',
    '/js/academic-hub.js?v=3',

    // ==================== JS — Admission System ====================
    '/js/bd-locations.js?v=1',
    '/js/subject-pools.js?v=1',
    '/js/admission.js?v=7.1',
    '/js/admission-status.js?v=3',
    '/js/admin-admissions.js?v=2.1',

    // ==================== Public Pages ====================
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

    // Admission Pages
    '/public-pages/admission-hsc.html',
    '/public-pages/admission-bm.html',
    '/public-pages/admission-status.html',

    // Academic Hub (Calendar only)
    '/public-pages/academic-hub.html',

    // Class Routine Board
    '/public-pages/class-routine.html',

    // Exam Routine Board
    '/public-pages/exam-routine.html',

    // ==================== Admin Pages ====================
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
    '/admin-pages/admin-result-overview.html',

    // Admission Admin
    '/admin-pages/admin-admissions.html',

    // Class Routine
    '/admin-pages/admin-class-routine.html',

    // Exam Routine
    '/admin-pages/admin-exam-routine.html',

    // Promote Pages
    '/admin-pages/admin-promote.html',
    '/admin-pages/admin-promote-history.html',
    '/admin-pages/admin-promote-settings.html'
];

// =========================================================
// INSTALL — Pre-cache static assets
// =========================================================
self.addEventListener('install', function (event) {
    console.log('[SW] Installing v' + CACHE_VERSION + '...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            console.log('[SW] Caching ' + STATIC_ASSETS.length + ' static assets');

            return Promise.all(
                STATIC_ASSETS.map(function (url) {
                    return fetch(url, { cache: 'no-cache' })
                        .then(function (response) {
                            if (response && response.status === 200) {
                                return cache.put(url, response);
                            }
                            console.warn('[SW] Skipped (status ' + (response ? response.status : '?') + '):', url);
                        })
                        .catch(function (err) {
                            console.warn('[SW] Failed to cache:', url, err.message || err);
                        });
                })
            );
        }).then(function () {
            console.log('[SW] Install complete — skipping waiting');
            return self.skipWaiting();
        }).catch(function (err) {
            console.error('[SW] Install error:', err);
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
            console.log('[SW] Activate complete — claiming clients');
            return self.clients.claim();
        }).catch(function (err) {
            console.error('[SW] Activate error:', err);
        })
    );
});

// =========================================================
// HELPER — Trim dynamic cache
// =========================================================
function trimCache(cacheName, maxItems) {
    caches.open(cacheName).then(function (cache) {
        cache.keys().then(function (keys) {
            if (keys.length > maxItems) {
                cache.delete(keys[0]).then(function () {
                    trimCache(cacheName, maxItems);
                });
            }
        });
    });
}

// =========================================================
// HELPER — Check if HTML request
// =========================================================
function isHtmlRequest(request) {
    const accept = request.headers.get('accept') || '';
    return accept.includes('text/html');
}

// =========================================================
// FETCH — Smart caching strategy
// =========================================================
self.addEventListener('fetch', function (event) {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // =====================================================
    // External APIs — Network first
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
            fetch(request)
                .then(function (response) {
                    return response;
                })
                .catch(function () {
                    return caches.match(request);
                })
        );
        return;
    }

    // =====================================================
    // Same-origin only
    // =====================================================
    if (url.origin !== location.origin) return;

    // =====================================================
    // HTML pages — NETWORK-FIRST
    // =====================================================
    if (isHtmlRequest(request)) {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, responseClone);
                            trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return caches.match(request).then(function (cached) {
                        if (cached) return cached;
                        return caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // =====================================================
    // JS / CSS / Images — STALE-WHILE-REVALIDATE
    // =====================================================
    event.respondWith(
        caches.match(request).then(function (cached) {
            const fetchPromise = fetch(request)
                .then(function (response) {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, responseClone);
                            trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return cached;
                });

            return cached || fetchPromise;
        })
    );
});

// =========================================================
// MESSAGE — Manual cache control
// =========================================================
self.addEventListener('message', function (event) {
    if (!event.data) return;

    if (event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skipping waiting');
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        console.log('[SW] Clearing all caches per request');
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                return caches.delete(key);
            }));
        }).then(function () {
            console.log('[SW] All caches cleared');
            if (event.source) {
                event.source.postMessage({ type: 'CACHE_CLEARED' });
            }
        });
    }

    if (event.data.type === 'CHECK_VERSION') {
        if (event.source) {
            event.source.postMessage({
                type: 'VERSION',
                version: CACHE_VERSION
            });
        }
    }
});

console.log('[SW] Service Worker loaded — Version ' + CACHE_VERSION);