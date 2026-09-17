/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC EXAM COUNTDOWN
 * Location: js/exam-countdown.js
 * Depends: config.js, supabase.js
 * Features: Countdown + Reminder + Routine + Notice
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let countdownData = [];
    let routineData = [];
    let noticeData = [];
    let currentNoticeFilter = 'all';

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // HELPERS
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function daysBetween(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 40) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // COUNTDOWN — Load
    // =========================================================
    async function loadCountdowns() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_countdown')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            countdownData = data || [];
            renderCountdowns();
            updateReminder();
        } catch (e) {
            console.error('Countdown error:', e);
            $('countdownList').innerHTML = `
                <div class="routine-preview" style="padding:40px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;margin-bottom:12px;display:block;"></i>
                    <p style="color:#6b7280;margin:0;">লোড করা যায়নি</p>
                </div>
            `;
        }
    }

    // =========================================================
    // COUNTDOWN — Render
    // =========================================================
    function renderCountdowns() {
        const list = $('countdownList');
        if (!list) return;

        if (countdownData.length === 0) {
            list.innerHTML = `
                <div class="routine-preview" style="padding:40px 20px;">
                    <i class="fas fa-hourglass-half" style="font-size:32px;color:#9ca3af;margin-bottom:12px;display:block;"></i>
                    <p style="color:#6b7280;margin:0;">কোনো কাউন্টডাউন নেই</p>
                </div>
            `;
            return;
        }

        const MAX_DAYS = 365;

        let html = '';
        countdownData.forEach((item, idx) => {
            const days = daysBetween(item.exam_date);
            const cls = item.exam_name === 'HSC' ? 'exam-hsc' : item.exam_name === 'Honours' ? 'exam-honours' : 'exam-degree';
            const icon = item.exam_name === 'HSC' ? 'fa-graduation-cap' : item.exam_name === 'Honours' ? 'fa-award' : 'fa-user-graduate';

            let percent = Math.round((days / MAX_DAYS) * 100);
            if (percent > 100) percent = 100;
            if (percent < 0) percent = 0;

            let battClass = 'high';
            if (percent < 75 && percent >= 50) battClass = 'medium';
            else if (percent < 50 && percent >= 25) battClass = 'low';
            else if (percent < 25) battClass = 'critical';

            html += `
                <div class="countdown-item ${cls}" style="animation-delay:${idx * 100}ms;">
                    <div class="ci-head">
                        <div class="ci-title">
                            <div class="ci-icon"><i class="fas ${icon}"></i></div>
                            <div class="ci-info">
                                <h3>${escapeHtml(item.exam_title)}</h3>
                                <span class="ci-badge">${escapeHtml(item.exam_name)}</span>
                            </div>
                        </div>
                        <div class="ci-days">
                            <div class="num">${days >= 0 ? days : '✓'}</div>
                            <div class="unit">${days > 0 ? 'দিন বাকি' : days === 0 ? 'আজ' : 'সম্পন্ন'}</div>
                        </div>
                    </div>

                    <div class="battery-wrap">
                        <div class="battery-bar">
                            <div class="battery-fill ${battClass}" data-width="${percent}"></div>
                        </div>
                        <div class="battery-info">
                            <span class="bi-percent">🔋 ${percent}%</span>
                            <span class="bi-date"><i class="fas fa-calendar"></i> ${formatDate(item.exam_date)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;

        // Animate battery bars
        setTimeout(() => {
            list.querySelectorAll('.battery-fill').forEach((el, i) => {
                setTimeout(() => {
                    el.style.width = el.dataset.width + '%';
                }, i * 120);
            });
        }, 100);
    }

    // =========================================================
    // REMINDER — Update
    // =========================================================
    function updateReminder() {
        const banner = $('reminderBanner');
        if (!banner) return;

        if (countdownData.length === 0) {
            banner.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <div class="rb-text">
                    <h4>কোনো পরীক্ষার তথ্য নেই</h4>
                    <p>পরীক্ষার তারিখ আপডেট করা হয়নি</p>
                </div>
            `;
            return;
        }

        let nearest = null;
        let minDays = Infinity;
        countdownData.forEach(c => {
            const d = daysBetween(c.exam_date);
            if (d >= 0 && d < minDays) {
                minDays = d;
                nearest = c;
            }
        });

        if (!nearest) {
            banner.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <div class="rb-text">
                    <h4>সব পরীক্ষা সম্পন্ন</h4>
                    <p>সব পরীক্ষার তারিখ পার হয়েছে</p>
                </div>
            `;
            return;
        }

        let icon = 'fa-exclamation-circle';
        if (minDays <= 7) icon = 'fa-fire';
        else if (minDays <= 30) icon = 'fa-exclamation-triangle';

        banner.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="rb-text">
                <h4>⏰ ${escapeHtml(nearest.exam_title)} — মাত্র ${minDays} দিন বাকি!</h4>
                <p>${formatDate(nearest.exam_date)} • প্রস্তুতি নিন এবং সময় ব্যবস্থাপনা করুন</p>
            </div>
        `;
    }

    // =========================================================
    // ROUTINE — Load
    // =========================================================
    async function loadRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_routine')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            routineData = data || [];

            const dropdown = $('routineDropdown');
            if (!dropdown) return;

            // Keep the first option
            dropdown.innerHTML = '<option value="">-- পরীক্ষা নির্বাচন করুন --</option>';

            routineData.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.exam_name;
                dropdown.appendChild(opt);
            });

        } catch (e) {
            console.error('Routine error:', e);
        }
    }

    // =========================================================
    // ROUTINE — Dropdown Change
    // =========================================================
    function setupRoutineDropdown() {
        const dropdown = $('routineDropdown');
        if (!dropdown) return;

        dropdown.addEventListener('change', function () {
            const id = this.value;
            const container = $('routineContainer');
            if (!container) return;

            if (!id) {
                container.innerHTML = `
                    <div class="routine-preview" style="background:#fff;border:2px dashed #e5e7eb;padding:60px 20px;">
                        <i class="fas fa-calendar-alt" style="font-size:44px;color:#9ca3af;margin-bottom:12px;display:block;"></i>
                        <p style="color:#6b7280;font-size:14px;margin:0;">উপরে পরীক্ষা সিলেক্ট করুন</p>
                    </div>
                `;
                return;
            }

            const routine = routineData.find(r => String(r.id) === String(id));
            if (!routine) return;

            container.innerHTML = `
                <div class="routine-preview">
                    <img src="${escapeHtml(routine.routine_image)}" 
                         alt="${escapeHtml(routine.exam_name)}" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22300%22%3E%3Crect fill=%22%23f0f4ff%22 width=%22500%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%230a1655%22 font-size=%2224%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📋 রুটিন%3C/text%3E%3C/svg%3E'">
                    <div class="routine-actions">
                        <a href="${escapeHtml(routine.routine_image)}" target="_blank" class="btn-outline">
                            <i class="fas fa-eye"></i> বিস্তারিত দেখুন
                        </a>
                        <a href="${escapeHtml(routine.routine_image)}" download="${escapeHtml(routine.exam_name)}.jpg" target="_blank" class="btn-download">
                            <i class="fas fa-download"></i> ডাউনলোড
                        </a>
                    </div>
                </div>
            `;
        });
    }

    // =========================================================
    // NOTICE — Load
    // =========================================================
    async function loadNotices() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_notice')
                .select('*')
                .eq('is_published', true)
                .order('notice_date', { ascending: false });

            if (error) throw error;
            noticeData = data || [];
            renderNotices();
        } catch (e) {
            console.error('Notice error:', e);
            const list = $('noticeList');
            if (list) {
                list.innerHTML = `
                    <div class="routine-preview" style="padding:40px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;margin-bottom:12px;display:block;"></i>
                        <p style="color:#6b7280;margin:0;">লোড করা যায়নি</p>
                    </div>
                `;
            }
        }
    }

    // =========================================================
    // NOTICE — Render
    // =========================================================
    function renderNotices() {
        const list = $('noticeList');
        if (!list) return;

        let items = noticeData;
        if (currentNoticeFilter !== 'all') {
            items = items.filter(n => n.exam_category === currentNoticeFilter);
        }

        if (items.length === 0) {
            list.innerHTML = `
                <div class="routine-preview" style="padding:40px 20px;">
                    <i class="fas fa-bullhorn" style="font-size:32px;color:#9ca3af;margin-bottom:12px;display:block;"></i>
                    <p style="color:#6b7280;margin:0;">কোনো নোটিশ নেই</p>
                </div>
            `;
            return;
        }

        let html = '';
        items.forEach((n, idx) => {
            const cls = n.exam_category === 'HSC' ? 'notice-hsc' : n.exam_category === 'Honours' ? 'notice-honours' : 'notice-degree';
            html += `
                <div class="notice-item ${cls}" style="animation-delay:${idx * 80}ms;">
                    <div class="ni-icon"><i class="fas fa-bullhorn"></i></div>
                    <div class="ni-body">
                        <h4 class="ni-title">
                            ${escapeHtml(n.title)}
                            <span class="ni-badge">${escapeHtml(n.exam_category)}</span>
                        </h4>
                        ${n.description ? `<p class="ni-desc">${escapeHtml(n.description)}</p>` : ''}
                        <div class="ni-meta">
                            <span><i class="fas fa-calendar"></i> ${formatDate(n.notice_date)}</span>
                            ${n.file_url ? '<span><i class="fas fa-file"></i> ফাইল সংযুক্ত</span>' : ''}
                        </div>
                    </div>
                    <div class="ni-actions">
                        ${n.file_url ? `
                            <a href="${escapeHtml(n.file_url)}" target="_blank" class="btn-mini view">
                                <i class="fas fa-eye"></i> দেখুন
                            </a>
                            <a href="${escapeHtml(n.file_url)}" download target="_blank" class="btn-mini download">
                                <i class="fas fa-download"></i> ডাউনলোড
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    }

    // =========================================================
    // NOTICE — Filters
    // =========================================================
    function setupNoticeFilters() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', function () {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentNoticeFilter = this.dataset.filter;
                renderNotices();
            });
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Exam Countdown page initializing...');

        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        setupRoutineDropdown();
        setupNoticeFilters();

        waitForSupabase(async function () {
            await Promise.all([
                loadCountdowns(),
                loadRoutines(),
                loadNotices()
            ]);
            console.log('✅ Exam Countdown page ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();