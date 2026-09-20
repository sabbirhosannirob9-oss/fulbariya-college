/**
 * FULBARIYA COLLEGE — PUBLIC ACADEMIC CALENDAR
 * Location: js/academic-hub.js
 * Version: v3.0 — Dynamic Years (Session Helper)
 */

(function () {
    "use strict";

    let allEvents = [];
    let filteredEvents = [];

    const EVENT_TYPES = {
        exam: { label: 'পরীক্ষা', icon: 'fa-file-alt' },
        holiday: { label: 'ছুটি', icon: 'fa-umbrella-beach' },
        event: { label: 'ইভেন্ট', icon: 'fa-glass-cheers' },
        result: { label: 'ফলাফল', icon: 'fa-trophy' },
        admission: { label: 'ভর্তি', icon: 'fa-user-plus' },
        general: { label: 'সাধারণ', icon: 'fa-info-circle' }
    };

    const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

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
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

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

    async function loadYearOptions() {
        await window.FDCSession.fillYearDropdown('calFilterYear', {
            includeAll: true,
            allLabel: 'All Years'
        });
        console.log('✅ Year options loaded');
    }

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

            const countEl = $('calendarCount');
            if (countEl) countEl.textContent = allEvents.length;

            window.FDCSession.clearCache();
            await loadYearOptions();

            updateCalendarStats();
            applyCalendarFilters();
        } catch (e) {
            console.error('Load error:', e);
            const list = $('eventsList');
            if (list) {
                list.innerHTML = `<div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-exclamation-circle"></i></div>
                    <h6>লোড করা যায়নি</h6>
                    <p>${escapeHtml(e.message)}</p>
                </div>`;
            }
        }
    }

    function updateCalendarStats() {
        if ($('calStatTotal')) $('calStatTotal').textContent = allEvents.length;
        if ($('calStatExam')) $('calStatExam').textContent = allEvents.filter(e => e.event_type === 'exam').length;
        if ($('calStatHoliday')) $('calStatHoliday').textContent = allEvents.filter(e => e.event_type === 'holiday').length;
        if ($('calStatEvent')) $('calStatEvent').textContent = allEvents.filter(e => e.event_type === 'event').length;
    }

    function applyCalendarFilters() {
        const fYear = $('calFilterYear').value;
        const fType = $('calFilterType').value;
        const fTime = $('calFilterTime').value;
        const today = getTodayStr();

        filteredEvents = allEvents.filter(ev => {
            if (fYear && String(ev.year) !== String(fYear)) return false;
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

    function attachEvents() {
        ['calFilterYear', 'calFilterType', 'calFilterTime'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('change', applyCalendarFilters);
        });
    }

    function init() {
        console.log('🚀 Academic Calendar v3.0 initializing...');
        attachEvents();

        waitForSupabase(async function () {
            await loadYearOptions();
            await loadEvents();
            console.log('✅ Academic Calendar ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
 