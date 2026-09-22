/**
 * =========================================================
 * FULBARIYA COLLEGE — SERVICE WORKER
 * Location: /service-worker.js
 * Version: v3.1.0
 * Purpose: PWA Install + Offline Caching (Network-first strategy)
 *
 * ⚡ Changes v3.1.0:
 *   - HTML: Network-first (was cache-first → caused stale pages)
 *   - JS/CSS: Stale-while-revalidate (fresh in background)
 *   - 404 JS files: silent fail (no page break)
 *   - Old caches: force-purged on activate
 *   - Fallback: only cache when truly offline
 *
 * Changes v3.0.4:
 *   - Removed reactions.js entry
 *   - admin-admissions.js bumped to v3.2
 *
 * Changes v3.0.3:
 *   - reactions.js v1.1 added
 *
 * Changes v3.0.2:
 *   - admission-status.js v3.0 (Print to PDF)
 *   - admission-print.js v1.1 (bulk support)
 * =========================================================
 */

const CACHE_VERSION = 'fdc-v3.1.0';
const STATIC_CACHE = 'fdc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fdc-dynamic-' + CACHE_VERSION;

const DYNAMIC_CACHE_LIMIT = 60;

// ✅ Only cache assets that definitely exist (no version-specific JS)
// Version-specific JS files will be fetched fresh from network
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
    '/assets/images/favicon.ico'
];

// =========================================================
// INSTALL — Precache only static assets
// =========================================================
self.addEventListener('install', function (event) {
    console.log('[SW] Installing v' + CACHE_VERSION + '...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            console.log('[SW] Caching ' + STATIC_ASSETS.length + ' core assets');

            return Promise.all(
                STATIC_ASSETS.map(function (url) {
                    return fetch(url, { cache: 'no-cache' })
                        .then(function (response) {
                            if (response && response.status === 200) {
                                return cache.put(url, response);
                            }
                        })
                        .catch(function (err) {
                            console.warn('[SW] Skip:', url, err.message);
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
// ACTIVATE — Purge all old caches
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
// HELPERS
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

function isHtmlRequest(request) {
    const accept = request.headers.get('accept') || '';
    return accept.includes('text/html');
}

// ✅ Check if request is for a static asset (JS/CSS/font/image)
function isStaticAsset(url) {
    return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)(\?.*)?$/i.test(url.pathname);
}

// =========================================================
// FETCH — Smart routing
// =========================================================
self.addEventListener('fetch', function (event) {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET and non-http
    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // =========================================
    // 1) External services → Network only, no cache
    // =========================================
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('cloudinary.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('wikipedia.org') ||
        url.hostname.includes('api.wikimedia.org') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        // Network first, fallback to cache if offline
        event.respondWith(
            fetch(request).catch(function () {
                return caches.match(request);
            })
        );
        return;
    }

    // Skip cross-origin
    if (url.origin !== location.origin) return;

    // =========================================
    // 2) HTML → Network-first (always fresh)
    // =========================================
    if (isHtmlRequest(request)) {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, clone);
                            trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
                        });
                    }
                    return response;
                })
                .catch(function () {
                    // Offline: serve cached HTML if available
                    return caches.match(request).then(function (cached) {
                        if (cached) return cached;
                        // Final fallback: index.html
                        return caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // =========================================
    // 3) JS/CSS/Assets → Stale-while-revalidate
    //    Serve cache instantly, update in background
    // =========================================
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(request).then(function (cached) {
                const networkFetch = fetch(request)
                    .then(function (response) {
                        if (response && response.status === 200) {
                            const clone = response.clone();
                            caches.open(DYNAMIC_CACHE).then(function (cache) {
                                cache.put(request, clone);
                                trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
                            });
                        }
                        return response;
                    })
                    .catch(function () {
                        // Network fail → return cache (or undefined)
                        return cached;
                    });

                // Return cached immediately if available, else wait for network
                return cached || networkFetch;
            })
        );
        return;
    }

    // =========================================
    // 4) Everything else → Network-first, cache fallback
    // =========================================
    event.respondWith(
        fetch(request)
            .then(function (response) {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(function (cache) {
                        cache.put(request, clone);
                        trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
                    });
                }
                return response;
            })
            .catch(function () {
                return caches.match(request);
            })
    );
});

// =========================================================
// MESSAGE — SW control from page
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