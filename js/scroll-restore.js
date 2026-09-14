/**
 * =========================================================
 * FULBARIYA COLLEGE — SMART SCROLL RESTORE
 * Location: js/scroll-restore.js
 * 
 * Behavior:
 *  - Back/Forward navigation → আগের scroll position-এ ফিরবে
 *  - New visit → page উপরে থাকবে
 *  - Reload → উপরে থাকবে
 * =========================================================
 */

(function () {
    "use strict";

    const SCROLL_KEY_PREFIX = 'fdc_scroll_';
    const SCROLL_POSITION_PREFIX = 'fdc_pos_';

    // =========================================================
    // Get unique key per page (URL path)
    // =========================================================
    function getPageKey() {
        try {
            return SCROLL_KEY_PREFIX + window.location.pathname;
        } catch (e) {
            return SCROLL_KEY_PREFIX + 'default';
        }
    }

    // =========================================================
    // Set history mode to 'auto' so browser's native restore works
    // =========================================================
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
    }

    // =========================================================
    // Detect navigation type
    // =========================================================
    function getNavigationType() {
        try {
            const navEntries = performance.getEntriesByType('navigation');
            if (navEntries && navEntries.length > 0) {
                return navEntries[0].type; // 'navigate', 'reload', 'back_forward'
            }
        } catch (e) { /* ignore */ }
        return 'navigate';
    }

    // =========================================================
    // Save scroll position
    // =========================================================
    function saveScrollPosition() {
        try {
            const y = window.scrollY || window.pageYOffset || 0;
            // Only save if user has scrolled meaningfully
            if (y > 10) {
                sessionStorage.setItem(getPageKey(), y.toString());
                // console.log('📍 Saved scroll:', y, 'for', window.location.pathname);
            }
        } catch (e) { /* ignore */ }
    }

    // Save on multiple events to be safe
    window.addEventListener('beforeunload', saveScrollPosition);
    window.addEventListener('pagehide', saveScrollPosition);

    // =========================================================
    // Restore scroll position
    // =========================================================
    function restoreScrollPosition() {
        try {
            const savedY = sessionStorage.getItem(getPageKey());
            if (!savedY) return;

            const targetY = parseInt(savedY);
            if (targetY < 10) {
                sessionStorage.removeItem(getPageKey());
                return;
            }

            // Try to restore with retries (content may still be loading)
            let attempts = 0;
            const maxAttempts = 15;

            function tryRestore() {
                attempts++;
                const maxScroll = Math.max(
                    document.documentElement.scrollHeight,
                    document.body.scrollHeight
                ) - window.innerHeight;

                if (maxScroll >= targetY || attempts >= maxAttempts) {
                    window.scrollTo({
                        top: Math.min(targetY, maxScroll),
                        behavior: 'instant'
                    });
                    // console.log('📍 Restored scroll:', targetY, 'for', window.location.pathname);
                    // Clear after successful restore (next visit will start at top)
                    setTimeout(() => {
                        sessionStorage.removeItem(getPageKey());
                    }, 500);
                } else {
                    // Content not ready yet, retry
                    setTimeout(tryRestore, 100);
                }
            }

            // First attempt after small delay
            setTimeout(tryRestore, 50);

        } catch (e) { /* ignore */ }
    }

    // =========================================================
    // Decide: restore or not?
    // =========================================================
    function handlePageShow(e) {
        const navType = getNavigationType();

        // Restore when:
        //  - Back/forward cache (e.persisted = true) → definitely restore
        //  - Navigation type is 'back_forward' → restore
        const shouldRestore = e.persisted || navType === 'back_forward';

        if (shouldRestore) {
            // console.log('🔄 Back/Forward detected — restoring scroll');
            restoreScrollPosition();
        } else {
            // New visit / reload — start at top
            // console.log('🆕 New visit — starting at top');
            sessionStorage.removeItem(getPageKey());

            // Force scroll to top if browser tries to keep old position
            if (window.scrollY > 10) {
                window.scrollTo(0, 0);
            }
        }
    }

    window.addEventListener('pageshow', handlePageShow);

    // =========================================================
    // Also handle popstate (back/forward without BFCache)
    // =========================================================
    window.addEventListener('popstate', function () {
        // Small delay to let page settle
        setTimeout(() => {
            const savedY = sessionStorage.getItem(getPageKey());
            if (savedY && parseInt(savedY) > 10) {
                restoreScrollPosition();
            }
        }, 100);
    });

    // =========================================================
    // Save scroll position before clicking any link
    // =========================================================
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;
        if (!link.href) return;
        if (link.target === '_blank') return;
        if (link.href.startsWith('javascript:')) return;
        if (link.href.startsWith('#')) return;
        if (link.hasAttribute('download')) return;

        saveScrollPosition();
    }, true);

    // =========================================================
    // Save scroll position on form submissions too
    // =========================================================
    document.addEventListener('submit', function () {
        saveScrollPosition();
    }, true);

    // console.log('✅ scroll-restore.js loaded for:', window.location.pathname);

})();