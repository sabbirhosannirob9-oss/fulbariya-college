/**
 * =========================================================
 * FULBARIYA COLLEGE — SERVICE WORKER
 * Location: /service-worker.js
 * Version: v2.2.1
 * Purpose: PWA Install + Offline Caching
 *
 * Changes v2.2.1:
 *   - FIXED: net::ERR_FAILED issue (cache.add → fetch+put)
 *   - FIXED: Partial cache install (non-200 response skip)
 *   - IMPROVED: Better fetch fallback for stale cache
 *   - IMPROVED: Network-first for HTML pages
 *   - Class Routine + Exam Routine system added
 *   - Academic Hub cleanup (Routine tab removed)
 * =========================================================
 */

const CACHE_VERSION = 'fdc-v2.2.1';
const STATIC_CACHE = 'fdc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fdc-dynamic-' + CACHE_VERSION;

// Max items in dynamic cache
const DYNAMIC_CACHE_LIMIT = 60;

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

    // JS — Class Routine (v2.2.0+)
    '/js/admin-class-routine.js?v=2',

    // JS — Exam Routine (v2.2.0+)
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

    // JS — Public Routine (v2.2.0+)
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

    // Academic Hub (Calendar only)
    '/public-pages/academic-hub.html',

    // Class Routine Board
    '/public-pages/class-routine.html',

    // Exam Routine Board
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

    // Admin Class Routine
    '/admin-pages/admin-class-routine.html',

    // Admin Exam Routine
    '/admin-pages/admin-exam-routine.html'
];

// =========================================================
// INSTALL — Pre-cache static assets (SAFE version)
// =========================================================
self.addEventListener('install', function (event) {
    console.log('[SW] Installing v' + CACHE_VERSION + '...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            console.log('[SW] Caching ' + STATIC_ASSETS.length + ' static assets');

            // ✅ SAFE: fetch + put instead of cache.add
            // Non-200 responses are skipped, failures don't break install
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
// HELPER — Trim dynamic cache (keep latest N items)
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
// HELPER — Check if request is HTML page
// =========================================================
function isHtmlRequest(request) {
    const accept = request.headers.get('accept') || '';
    return accept.includes('text/html');
}

// =========================================================
// FETCH — Smart caching strategy (FIXED)
// =========================================================
self.addEventListener('fetch', function (event) {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension, etc.
    if (!url.protocol.startsWith('http')) return;

    // =====================================================
    // External APIs (Supabase, Cloudinary, CDN, Fonts)
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
    // Same-origin requests only
    // =====================================================
    if (url.origin !== location.origin) return;

    // =====================================================
    // HTML pages — NETWORK-FIRST (always fresh, fallback to cache)
    // This FIXES net::ERR_FAILED
    // =====================================================
    if (isHtmlRequest(request)) {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    // Cache successful responses
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
                    // Network failed — try cache
                    return caches.match(request).then(function (cached) {
                        if (cached) return cached;

                        // Fallback to homepage for offline
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

            // Return cached immediately if available, else wait for fetch
            return cached || fetchPromise;
        })
    );
});

// =========================================================
// MESSAGE — For manual cache update
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