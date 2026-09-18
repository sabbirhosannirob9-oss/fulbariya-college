/**
 * =========================================================
 * FULBARIYA COLLEGE — UNIVERSAL NOTIFICATION HELPER
 * Location: js/notification-helper.js
 * Purpose: সব Admin পেজ থেকে notification পাঠানো
 * =========================================================
 */

(function () {
    "use strict";

    var SUPABASE_URL = 'https://dpbbsfppjmgvzsopmdww.supabase.co';

    function getAnonKey() {
        if (window.FDC_CONFIG && window.FDC_CONFIG.SUPABASE_PUBLISHABLE_KEY) {
            return window.FDC_CONFIG.SUPABASE_PUBLISHABLE_KEY;
        }
        return 'sb_publishable_O0gApiitS1P9graqe1cjKA_f8KJRUD5';
    }

    // =========================================================
    // SEND NOTIFICATION (Universal)
    // =========================================================
    window.FDC_NOTIFY = async function (options) {
        if (!options || !options.title || !options.body) {
            console.error('❌ FDC_NOTIFY: title and body required');
            return { success: false, error: 'title and body required' };
        }

        var payload = {
            title: options.title,
            body: options.body,
            url: options.url || '/',
            icon: options.icon || '/assets/images/web-app-manifest-192x192.png',
            target_type: options.target_type || 'all',
            target_value: options.target_value || null
        };

        console.log('📤 Sending notification:', payload);

        try {
            var res = await fetch(
                SUPABASE_URL + '/functions/v1/send-notification',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getAnonKey(),
                        'apikey': getAnonKey()
                    },
                    body: JSON.stringify(payload)
                }
            );

            var data = await res.json();
            console.log('📥 Response:', data);

            return data;

        } catch (e) {
            console.error('❌ FDC_NOTIFY error:', e);
            return { success: false, error: e.message };
        }
    };

    // =========================================================
    // SHORTCUT FUNCTIONS
    // =========================================================

    window.FDC_NOTIFY_NOTICE = function (title, description) {
        return window.FDC_NOTIFY({
            title: '📢 নতুন নোটিশ',
            body: title + (description ? '\n' + description.substring(0, 100) : ''),
            url: '/public-pages/notices.html'
        });
    };

    window.FDC_NOTIFY_NEWS = function (title, description) {
        return window.FDC_NOTIFY({
            title: '📰 নতুন সংবাদ',
            body: title + (description ? '\n' + description.substring(0, 100) : ''),
            url: '/public-pages/news.html'
        });
    };

    window.FDC_NOTIFY_GREETING = function (title) {
        return window.FDC_NOTIFY({
            title: '🎊 ' + title,
            body: 'অধ্যক্ষের নতুন বার্তা প্রকাশিত হয়েছে',
            url: '/'
        });
    };

    window.FDC_NOTIFY_RESULT = function (title) {
        return window.FDC_NOTIFY({
            title: '🎓 নতুন ফলাফল',
            body: title,
            url: '/public-pages/results.html'
        });
    };

    window.FDC_NOTIFY_GALLERY = function (title) {
        return window.FDC_NOTIFY({
            title: '🖼️ নতুন ছবি',
            body: title,
            url: '/public-pages/gallery.html'
        });
    };

    window.FDC_NOTIFY_EVENT = function (title, description) {
        return window.FDC_NOTIFY({
            title: '📅 নতুন ইভেন্ট',
            body: title + (description ? '\n' + description.substring(0, 100) : ''),
            url: '/public-pages/academic-hub.html'
        });
    };

    window.FDC_NOTIFY_CUSTOM = function (title, body, url) {
        return window.FDC_NOTIFY({
            title: title,
            body: body,
            url: url || '/'
        });
    };

    // =========================================================
    // TEST FUNCTION
    // =========================================================
    window.FDC_TEST_NOTIFICATION = async function () {
        console.log('🧪 Testing notification system...');
        var result = await window.FDC_NOTIFY({
            title: '🧪 Test Notification',
            body: 'এটি একটি পরীক্ষামূলক notification — ' + new Date().toLocaleTimeString('bn-BD'),
            url: '/'
        });
        console.log('Result:', result);
        return result;
    };

    console.log('✅ FDC Notification Helper loaded');
    console.log('   Available: FDC_NOTIFY, FDC_NOTIFY_NOTICE, FDC_NOTIFY_NEWS,');
    console.log('              FDC_NOTIFY_GREETING, FDC_NOTIFY_RESULT, FDC_NOTIFY_GALLERY,');
    console.log('              FDC_NOTIFY_EVENT, FDC_NOTIFY_CUSTOM, FDC_TEST_NOTIFICATION');

})();