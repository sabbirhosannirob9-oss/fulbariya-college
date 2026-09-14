/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC ACADEMIC HUB
 * Location: js/academic-hub.js
 * Depends: config.js, supabase.js
 * Features: Calendar Tab + Routine Tab
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allEvents = [];
    let filteredEvents = [];
    let allRoutines = [];
    let filteredRoutines = [];

    const EVENT_TYPES = {
        exam: { label: 'পরীক্ষা', icon: 'fa-file-alt' },
        holiday: { label: 'ছুটি', icon: 'fa-umbrella-beach' },
        event: { label: 'ইভেন্ট', icon: 'fa-glass-cheers' },
        result: { label: 'ফলাফল', icon: 'fa-trophy' },
        admission: { label: 'ভর্তি', icon: 'fa-user-plus' },
        general: { label: 'সাধারণ', icon: 'fa-info-circle' }
    };

    const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    // =========================================================
    // DOM HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getTodayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 30) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // TAB SWITCHING
    // =========================================================
    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.dataset.tab;

                // Update buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                $('tab-' + tab).classList.add('active');

                // URL hash update
                window.history.replaceState(null, '', '#' + tab);
            });
        });

        // Check URL hash on load
        const hash = window.location.hash.substring(1);
        if (hash === 'routine' || hash === 'calendar') {
            const btn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
            if (btn) btn.click();
        }
    }

    // =========================================================
    // YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -1; i <= 2; i++) years.push(currentYear + i);

        const filterYear = $('calFilterYear');
        filterYear.innerHTML = '<option value="">All Years</option>';
        years.forEach(y => {
            filterYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
        });
    }

    // =========================================================
    // LOAD CALENDAR EVENTS
    // =========================================================
    async function loadEvents() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('calendar_events')
                .select('*')
                .eq('is_published', true)
                .order('start_date', { ascending: true });

            if (error) throw error;

            allEvents = data || [];
            console.log('✅ Loaded events:', allEvents.length);

            $('calendarCount').textContent = allEvents.length;
            updateCalendarStats();
            applyCalendarFilters();
        } catch (e) {
            console.error('Load events error:', e);
            $('eventsList').innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-exclamation-circle"></i></div>
                <h6>লোড করা যায়নি</h6>
                <p>${escapeHtml(e.message)}</p>
            </div>`;
        }
    }

    // =========================================================
    // CALENDAR STATS
    // =========================================================
    function updateCalendarStats() {
        const total = allEvents.length;
        const exam = allEvents.filter(e => e.event_type === 'exam').length;
        const holiday = allEvents.filter(e => e.event_type === 'holiday').length;
        const event = allEvents.filter(e => e.event_type === 'event').length;

        $('calStatTotal').textContent = total;
        $('calStatExam').textContent = exam;
        $('calStatHoliday').textContent = holiday;
        $('calStatEvent').textContent = event;
    }

    // =========================================================
    // CALENDAR FILTERS
    // =========================================================
    function applyCalendarFilters() {
        const fYear = $('calFilterYear').value;
        const fType = $('calFilterType').value;
        const fTime = $('calFilterTime').value;
        const today = getTodayStr();

        filteredEvents = allEvents.filter(ev => {
            if (fYear && ev.year !== fYear) return false;
            if (fType && ev.event_type !== fType) return false;

            if (fTime === 'upcoming') {
                const endDate = ev.end_date || ev.start_date;
                if (endDate < today) return false;
            } else if (fTime === 'past') {
                const endDate = ev.end_date || ev.start_date;
                if (endDate >= today) return false;
            }

            return true;
        });

        renderEvents();
    }

    // =========================================================
    // RENDER EVENTS
    // =========================================================
    function renderEvents() {
        const list = $('eventsList');

        if (filteredEvents.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-calendar-times"></i></div>
                <h6>কোনো event পাওয়া যায়নি</h6>
                <p>Filter পরিবর্তন করে দেখুন</p>
            </div>`;
            return;
        }

        const today = getTodayStr();
        let html = '';

        filteredEvents.forEach(ev => {
            const d = new Date(ev.start_date);
            const day = d.getDate();
            const month = MONTHS_BN[d.getMonth()];
            const yearShort = d.getFullYear();
            const typeInfo = EVENT_TYPES[ev.event_type] || EVENT_TYPES.general;

            const endDate = ev.end_date || ev.start_date;
            let statusBadge = '';
            let isPast = false;

            if (ev.start_date === today) {
                statusBadge = '<span class="event-status-badge today"><i class="fas fa-bolt"></i> আজ</span>';
            } else if (endDate < today) {
                statusBadge = '<span class="event-status-badge past">সম্পন্ন</span>';
                isPast = true;
            } else {
                const startD = new Date(ev.start_date);
                const todayD = new Date(today);
                const diffDays = Math.ceil((startD - todayD) / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) {
                    statusBadge = `<span class="event-status-badge upcoming"><i class="fas fa-clock"></i> ${diffDays} দিন পরে</span>`;
                } else {
                    statusBadge = '<span class="event-status-badge upcoming"><i class="fas fa-star"></i> আসন্ন</span>';
                }
            }

            const dateRange = ev.end_date && ev.end_date !== ev.start_date
                ? `${formatDate(ev.start_date)} — ${formatDate(ev.end_date)}`
                : formatDate(ev.start_date);

            const description = ev.description
                ? `<p>${escapeHtml(ev.description)}</p>`
                : '';

            html += `<div class="event-card ${ev.event_type} ${isPast ? 'past' : ''}">
                ${statusBadge}
                <div class="event-date-box">
                    <div class="day">${day}</div>
                    <div class="month">${month}</div>
                    <div class="year">${yearShort}</div>
                </div>

                <div class="event-body">
                    <h4>
                        ${escapeHtml(ev.title)}
                        <span class="event-type-badge ${ev.event_type}">
                            <i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}
                        </span>
                    </h4>
                    ${description}
                    <div class="event-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
                        <span><i class="fas fa-calendar-check"></i> ${ev.year} শিক্ষাবর্ষ</span>
                    </div>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    }

    // =========================================================
    // LOAD ROUTINES
    // =========================================================
    async function loadRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('class_routines')
                .select('*')
                .eq('is_published', true)
                .order('branch', { ascending: true })
                .order('class_name', { ascending: true })
                .order('display_order', { ascending: true });

            if (error) throw error;

            allRoutines = data || [];
            console.log('✅ Loaded routines:', allRoutines.length);

            $('routineCount').textContent = allRoutines.length;
            applyRoutineFilters();
        } catch (e) {
            console.error('Load routines error:', e);
            $('routineGrid').innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-exclamation-circle"></i></div>
                <h6>লোড করা যায়নি</h6>
                <p>${escapeHtml(e.message)}</p>
            </div>`;
        }
    }

    // =========================================================
    // ROUTINE FILTERS
    // =========================================================
    function applyRoutineFilters() {
        const fBranch = $('rtFilterBranch').value;
        const fClass = $('rtFilterClass').value;
        const fGroup = $('rtFilterGroup').value;

        filteredRoutines = allRoutines.filter(r => {
            if (fBranch && r.branch !== fBranch) return false;
            if (fClass && r.class_name !== fClass) return false;
            if (fGroup && r.group_name !== fGroup) return false;
            return true;
        });

        renderRoutines();
    }

    // =========================================================
    // RENDER ROUTINES
    // =========================================================
    function renderRoutines() {
        const grid = $('routineGrid');

        if (filteredRoutines.length === 0) {
            grid.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-calendar-week"></i></div>
                <h6>কোনো রুটিন পাওয়া যায়নি</h6>
                <p>Filter পরিবর্তন করে দেখুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchShort = r.branch || 'HSC';
            const groupTag = r.group_name
                ? `<span class="rc-tag group"><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`
                : '';

            const titleText = r.title || 'Routine';

            html += `<div class="routine-card">
                <div class="rc-img-wrap" data-action="preview" data-id="${r.id}">
                    <span class="rc-branch">${escapeHtml(branchShort)}</span>
                    <img src="${escapeHtml(r.image_url)}" alt="${escapeHtml(titleText)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22240%22%3E%3Crect fill=%22%23f0f4ff%22 width=%22300%22 height=%22240%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%230a1655%22 font-size=%2240%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📋%3C/text%3E%3C/svg%3E'">
                    <div class="rc-overlay-btn">
                        <i class="fas fa-expand"></i>
                    </div>
                </div>

                <div class="rc-body">
                    <div class="rc-title">${escapeHtml(titleText)}</div>
                    <div class="rc-meta">
                        <span class="rc-tag class"><i class="fas fa-graduation-cap"></i> Class ${escapeHtml(r.class_name)}</span>
                        ${groupTag}
                    </div>

                    <div class="rc-actions">
                        <button class="rc-btn" data-action="preview" data-id="${r.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <a href="${escapeHtml(r.image_url)}" target="_blank" download class="rc-btn outline">
                            <i class="fas fa-download"></i> Save
                        </a>
                    </div>
                </div>
            </div>`;
        });

        grid.innerHTML = html;
    }

    // =========================================================
    // PREVIEW MODAL
    // =========================================================
    function openPreview(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        $('previewImg').src = r.image_url;
        $('previewDownload').href = r.image_url;
        $('previewOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('previewOverlay').classList.remove('show');
        document.body.style.overflow = '';
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Calendar filters
        ['calFilterYear', 'calFilterType', 'calFilterTime'].forEach(id => {
            $(id).addEventListener('change', applyCalendarFilters);
        });

        // Routine filters
        ['rtFilterBranch', 'rtFilterClass', 'rtFilterGroup'].forEach(id => {
            $(id).addEventListener('change', applyRoutineFilters);
        });

        // Routine card actions (delegated)
        $('routineGrid').addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="preview"]');
            if (!target) return;
            const id = parseInt(target.dataset.id);
            openPreview(id);
        });

        // Preview modal close
        $('previewClose').addEventListener('click', closePreview);
        $('previewOverlay').addEventListener('click', function (e) {
            if (e.target === this) closePreview();
        });

        // ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if ($('previewOverlay').classList.contains('show')) closePreview();
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Academic Hub initializing...');

        initTabs();
        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            await Promise.all([
                loadEvents(),
                loadRoutines()
            ]);
            console.log('✅ Academic Hub ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();