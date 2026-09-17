/**
 * =========================================================
 * FULBARIYA COLLEGE — SERVICE WORKER
 * Location: /service-worker.js
 * Purpose: PWA install + Offline caching
 * =========================================================
 */

const CACHE_VERSION = 'fdc-v1.0.0';
const STATIC_CACHE = 'fdc-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'fdc-dynamic-' + CACHE_VERSION;

// Files to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/images/logo1.png',
    '/assets/images/web-app-manifest-192x192.png',
    '/assets/images/web-app-manifest-512x512.png',
    '/assets/images/apple-touch-icon.png',
    '/css/style.css',
    '/js/config.js',
    '/js/supabase.js',
    '/js/scroll-restore.js'
];

// =========================================================
// INSTALL — Pre-cache static assets
// =========================================================
self.addEventListener('install', function (event) {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            console.log('[SW] Caching static assets');
            return Promise.all(
                STATIC_ASSETS.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] Failed to cache:', url, err);
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
    console.log('[SW] Activating...');

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
// FETCH — Cache strategy
// =========================================================
self.addEventListener('fetch', function (event) {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Supabase, Cloudinary, external APIs
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('cloudinary.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('wikipedia.org') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        // Network-first for API calls
        event.respondWith(
            fetch(request).catch(function () {
                return caches.match(request);
            })
        );
        return;
    }

    // Cache-first for same-origin assets
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then(function (cached) {
                if (cached) return cached;

                return fetch(request).then(function (response) {
                    // Cache successful responses
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then(function (cache) {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(function () {
                    // Offline fallback for HTML pages
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
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');