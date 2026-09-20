/**
 * =========================================================
 * FULBARIYA COLLEGE — CENTRAL SESSION / YEAR HELPER
 * Location: js/session-helper.js
 * Version: v1.0
 * Purpose: সব জায়গায় একই source থেকে year/session load
 * 
 * Usage:
 *   await FDCSession.fillYearDropdown('eventYear');
 *   await FDCSession.fillSessionDropdown('dynamicField2');
 *   await FDCSession.addSession('2024-2025');
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // CONFIG
    // =========================================================
    const CONFIG = {
        YEARS_BACK: 1,        // কত বছর আগে auto-generate
        YEARS_FORWARD: 3,     // কত বছর পরে auto-generate
        CACHE_TTL: 5 * 60 * 1000  // 5 min
    };

    // =========================================================
    // STATE
    // =========================================================
    let cachedYears = null;
    let cachedAt = 0;
    let loadingPromise = null;

    // =========================================================
    // HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getCurrentYear() {
        return new Date().getFullYear();
    }

    // 2024 → "2024-2025"
    function yearToSession(year) {
        const yr = parseInt(year);
        if (!yr) return '';
        return yr + '-' + (yr + 1);
    }

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(timeoutMs) {
        timeoutMs = timeoutMs || 8000;
        return new Promise(function (resolve) {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return resolve(true);

            let done = false;
            const finish = (ok) => { if (!done) { done = true; resolve(ok); } };

            window.addEventListener('fdc:supabase-ready', () => finish(true), { once: true });

            let n = 0;
            const i = setInterval(() => {
                if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                    clearInterval(i);
                    finish(true);
                }
                if (++n > 16) { clearInterval(i); finish(false); }
            }, 500);

            setTimeout(() => finish(false), timeoutMs);
        });
    }

    // =========================================================
    // ✅ ১. GET YEARS — Auto + DB merge
    // =========================================================
    async function getYears(forceRefresh) {
        if (!forceRefresh && cachedYears && (Date.now() - cachedAt < CONFIG.CACHE_TTL)) {
            return cachedYears;
        }

        if (loadingPromise) return loadingPromise;

        loadingPromise = (async function () {
            const currentYear = getCurrentYear();
            const yearsSet = new Set();

            // Auto-generated range
            for (let i = -CONFIG.YEARS_BACK; i <= CONFIG.YEARS_FORWARD; i++) {
                yearsSet.add(currentYear + i);
            }

            // DB থেকে load
            try {
                const ready = await waitForSupabase(5000);
                if (ready && window.FDC_SUPABASE) {
                    const { data, error } = await window.FDC_SUPABASE
                        .from('calendar_events')
                        .select('year');

                    if (!error && data) {
                        data.forEach(d => {
                            const y = parseInt(d.year);
                            if (y && y > 2000) yearsSet.add(y);
                        });
                    }
                }
            } catch (e) {
                console.warn('[FDCSession] DB load failed:', e);
            }

            // DB-তে থাকা batches-এর year-ও যোগ
            try {
                const ready = await waitForSupabase(5000);
                if (ready && window.FDC_SUPABASE) {
                    const { data, error } = await window.FDC_SUPABASE
                        .from('batches')
                        .select('batch_year');

                    if (!error && data) {
                        data.forEach(d => {
                            const y = parseInt(d.batch_year);
                            if (y && y > 2000) yearsSet.add(y);
                        });
                    }
                }
            } catch (e) {
                console.warn('[FDCSession] Batches load failed:', e);
            }

            const years = Array.from(yearsSet).sort((a, b) => b - a);

            cachedYears = years;
            cachedAt = Date.now();
            loadingPromise = null;

            console.log('✅ [FDCSession] Years:', years.join(', '));
            return years;

        })();

        return loadingPromise;
    }

    // =========================================================
    // ✅ ২. FILL YEAR DROPDOWN
    // =========================================================
    async function fillYearDropdown(selectId, options) {
        options = options || {};
        const select = $(selectId);
        if (!select) {
            console.warn('[FDCSession] Select not found:', selectId);
            return;
        }

        const years = await getYears();
        const currentYear = getCurrentYear();

        let html = '';

        if (options.includeAll) {
            html += `<option value="">${options.allLabel || 'All Years'}</option>`;
        }

        years.forEach(y => {
            const label = options.useSessionFormat ? yearToSession(y) : String(y);
            const value = options.useSessionFormat ? yearToSession(y) : String(y);
            html += `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
        });

        select.innerHTML = html;

        // Auto-select
        if (options.selected) {
            select.value = String(options.selected);
        } else if (options.autoSelectCurrent && !options.includeAll) {
            select.value = String(currentYear);
        }

        return years;
    }

    // =========================================================
    // ✅ ৩. GET SESSIONS (batches table)
    // =========================================================
    async function getSessions() {
        try {
            const ready = await waitForSupabase(5000);
            if (!ready || !window.FDC_SUPABASE) return [];

            const { data, error } = await window.FDC_SUPABASE
                .from('batches')
                .select('*')
                .eq('is_active', true)
                .order('batch_year');

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.warn('[FDCSession] Get sessions failed:', e);
            return [];
        }
    }

    // =========================================================
    // ✅ ৪. FILL SESSION DROPDOWN
    // =========================================================
    async function fillSessionDropdown(selectId, options) {
        options = options || {};
        const select = $(selectId);
        if (!select) {
            console.warn('[FDCSession] Select not found:', selectId);
            return;
        }

        const sessions = await getSessions();

        let html = '<option value="">Select</option>';
        sessions.forEach(b => {
            const label = b.session_label || yearToSession(b.batch_year);
            html += `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
        });

        select.innerHTML = html;

        if (options.selected) {
            select.value = options.selected;
        }

        return sessions;
    }

    // =========================================================
    // ✅ ৫. ADD NEW SESSION (to batches table)
    // =========================================================
    async function addSession(sessionLabel) {
        sessionLabel = (sessionLabel || '').trim();

        if (!sessionLabel) {
            throw new Error('Session লিখুন');
        }

        // Format: YYYY-YYYY
        const match = sessionLabel.match(/^(\d{4})\s*-\s*(\d{4})$/);
        if (!match) {
            throw new Error('Format: YYYY-YYYY (যেমন 2024-2025)');
        }

        const y1 = parseInt(match[1]);
        const y2 = parseInt(match[2]);

        if (y2 !== y1 + 1) {
            throw new Error('দ্বিতীয় বছর প্রথম বছরের পরের হতে হবে');
        }

        const batchYear = String(y1);

        const ready = await waitForSupabase(5000);
        if (!ready || !window.FDC_SUPABASE) {
            throw new Error('Supabase not ready');
        }

        // Check duplicate
        const { data: existing } = await window.FDC_SUPABASE
            .from('batches')
            .select('id, batch_year')
            .eq('batch_year', batchYear)
            .limit(1);

        if (existing && existing.length > 0) {
            throw new Error(`Session ${sessionLabel} already exists`);
        }

        // Get max sort_order
        const { data: allBatches } = await window.FDC_SUPABASE
            .from('batches')
            .select('sort_order');

        const maxSort = (allBatches || []).reduce((max, b) => Math.max(max, b.sort_order || 0), 0);

        // Insert
        const { data, error } = await window.FDC_SUPABASE
            .from('batches')
            .insert([{
                batch_year: batchYear,
                display_name: `Batch ${batchYear}`,
                session_label: sessionLabel,
                sort_order: maxSort + 1,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;

        // Clear cache
        clearCache();

        return data;
    }

    // =========================================================
    // CLEAR CACHE
    // =========================================================
    function clearCache() {
        cachedYears = null;
        cachedAt = 0;
        loadingPromise = null;
        console.log('[FDCSession] Cache cleared');
    }

    // =========================================================
    // PUBLIC API
    // =========================================================
    window.FDCSession = {
        getCurrentYear,
        yearToSession,
        getYears,
        fillYearDropdown,
        getSessions,
        fillSessionDropdown,
        addSession,
        clearCache,
        waitForSupabase
    };

    console.log('✅ [FDCSession] v1.0 loaded');
})();