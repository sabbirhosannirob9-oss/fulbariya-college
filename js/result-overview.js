/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC RESULT OVERVIEW
 * Location: js/result-overview.js
 * Version: v2.0 — Board Final Exam Only + Bar Charts
 * 
 * Features:
 *   • Summary cards (Total / Passed / Failed / Rate / Absent)
 *   • Filter: Level + Year
 *   • Year-wise stacked bar chart (Pass+Fail)
 *   • Level-wise bar charts:
 *     - HSC group-wise
 *     - Degree subject-wise
 *     - Honours dept-wise (৭টা)
 *   • Full results table
 *   • Smart animations: count-up, staggered bars, scroll reveal
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allResults = [];
    let filteredResults = [];
    const charts = {
        yearWise: null,
        hsc: null,
        degree: null,
        honours: null
    };
    const animatedCharts = new Set();
    const countedValues = new Set();

    // =========================================================
    // CONSTANTS
    // =========================================================
    const COLORS = {
        pass: { bg: 'rgba(16, 185, 129, 0.9)', border: '#059669' },
        fail: { bg: 'rgba(239, 68, 68, 0.9)', border: '#dc2626' },
        navy: '#0a1655',
        navy2: '#1a237e',
        gold: '#d4af37'
    };

    const HSC_GROUPS = [
        { key: 'Science', label: 'বিজ্ঞান', color: '#3b82f6' },
        { key: 'Business', label: 'ব্যবসায় শিক্ষা', color: '#10b981' },
        { key: 'Humanities', label: 'মানবিক', color: '#f59e0b' },
        { key: 'BM', label: 'বিএম', color: '#8b5cf6' }
    ];

    const DEGREE_SUBJECTS = [
        { key: 'B.A (Pass)', label: 'বি.এ (পাস)', color: '#3b82f6' },
        { key: 'B.S.S (Pass)', label: 'বি.এস.এস (পাস)', color: '#10b981' },
        { key: 'B.B.S (Pass)', label: 'বি.বি.এস (পাস)', color: '#f59e0b' },
        { key: 'B.Sc (Pass)', label: 'বি.এস.সি (পাস)', color: '#8b5cf6' }
    ];

    const HONOURS_DEPTS = [
        { key: 'Bangla', label: 'বাংলা', color: '#ef4444' },
        { key: 'English', label: 'ইংরেজি', color: '#3b82f6' },
        { key: 'History', label: 'ইতিহাস', color: '#f59e0b' },
        { key: 'Political Science', label: 'রাষ্ট্রবিজ্ঞান', color: '#10b981' },
        { key: 'Philosophy', label: 'দর্শন', color: '#8b5cf6' },
        { key: 'Islamic History', label: 'ইসলামের ইতিহাস', color: '#14b8a6' },
        { key: 'Economics', label: 'অর্থনীতি', color: '#f97316' }
    ];

    // DB key aliases (multiple possible names)
    const DB_ALIASES = {
        'Business': ['Business', 'Business Studies'],
        'BM': ['BM', 'BM-General']
    };

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

    function calcRate(passed, total) {
        if (!total || total <= 0) return 0;
        return Math.round((passed / total) * 1000) / 10;
    }

    function destroyChart(key) {
        if (charts[key]) {
            try { charts[key].destroy(); } catch (e) {}
            charts[key] = null;
            animatedCharts.delete(key);
        }
    }

    function matchKeys(entityKey, dbKeys) {
        if (DB_ALIASES[entityKey]) return DB_ALIASES[entityKey];
        return [entityKey];
    }

    // =========================================================
    // CHART.JS DEFAULTS
    // =========================================================
    function setChartDefaults() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.font.family = "'Hind Siliguri', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.font.weight = '600';
        Chart.defaults.color = '#374151';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.boxWidth = 10;
        Chart.defaults.plugins.legend.labels.padding = 14;
        Chart.defaults.plugins.legend.labels.font = {
            family: "'Hind Siliguri', sans-serif", size: 11.5, weight: '600'
        };
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 22, 85, 0.95)';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 10;
        Chart.defaults.plugins.tooltip.titleFont = {
            family: "'Hind Siliguri', sans-serif", size: 13, weight: '700'
        };
        Chart.defaults.plugins.tooltip.bodyFont = {
            family: "'Hind Siliguri', sans-serif", size: 12, weight: '600'
        };
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.animation.duration = 1200;
        Chart.defaults.animation.easing = 'easeOutQuart';
    }

    // =========================================================
    // SCROLL REVEAL
    // =========================================================
    function setupScrollReveal() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('in-view'));
            document.querySelectorAll('.summary-card').forEach(el => el.classList.add('revealed'));
            return;
        }

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

        document.querySelectorAll('.reveal-on-scroll').forEach(el => obs.observe(el));
    }

    // =========================================================
    // COUNT-UP ANIMATION
    // =========================================================
    function countUp(el, target, duration) {
        if (!el) return;
        if (countedValues.has(el.id)) {
            el.textContent = target;
            return;
        }
        countedValues.add(el.id);

        const start = 0;
        const startTime = performance.now();
        const diff = target - start;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(start + diff * eased);
            el.textContent = val.toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString();
        }
        requestAnimationFrame(step);
    }

    // =========================================================
    // CHART SCROLL ANIMATION
    // =========================================================
    function setupChartScrollAnimation() {
        if (!('IntersectionObserver' in window)) return;

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const canvas = entry.target;
                    const key = canvas.dataset.chartKey;
                    if (key) {
                        animateChart(key);
                        obs.unobserve(canvas);
                    }
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('canvas[data-chart-key]').forEach(c => obs.observe(c));
    }

    function animateChart(key) {
        const chart = charts[key];
        if (!chart || animatedCharts.has(key)) return;
        animatedCharts.add(key);

        const targets = chart.data.datasets.map(ds => ds.data.slice());

        // Set to 0
        chart.data.datasets.forEach(ds => {
            ds.data = ds.data.map(() => 0);
        });
        chart.update('none');

        // Animate back
        setTimeout(() => {
            chart.data.datasets.forEach((ds, i) => {
                ds.data = targets[i];
            });
            chart.update();
        }, 200);
    }

    // =========================================================
    // LOAD DATA FROM SUPABASE
    // =========================================================
    async function loadData() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('board_final_result')
                .select('*')
                .order('year', { ascending: false })
                .order('exam_name')
                .order('group_or_dept');

            if (error) throw error;
            allResults = data || [];
            console.log('✅ Loaded board results:', allResults.length);

            populateYearFilter();
            applyFilterAndRender();

        } catch (e) {
            console.error('Load error:', e);
            $('tableBody').innerHTML = `
                <tr><td colspan="8" style="text-align:center; color:#dc2626; padding:30px;">
                    <i class="fas fa-exclamation-triangle"></i> লোড করা যায়নি: ${escapeHtml(e.message)}
                </td></tr>
            `;
        }
    }

    function populateYearFilter() {
        const years = [...new Set(allResults.map(r => r.year))].sort((a, b) => b - a);
        const sel = $('filterYear');
        if (!sel) return;
        sel.innerHTML = '<option value="">All Years</option>' +
            years.map(y => `<option value="${y}">${y}</option>`).join('');
    }

    // =========================================================
    // FILTER
    // =========================================================
    function applyFilterAndRender() {
        const level = $('filterLevel')?.value || '';
        const year = $('filterYear')?.value || '';

        filteredResults = allResults.filter(r => {
            if (level && r.exam_name !== level) return false;
            if (year && String(r.year) !== String(year)) return false;
            return true;
        });

        renderSummary();
        renderTable();
        renderAllCharts();
    }

    // =========================================================
    // RENDER SUMMARY
    // =========================================================
    function renderSummary() {
        const total = filteredResults.reduce((s, r) => s + (r.total_student || 0), 0);
        const passed = filteredResults.reduce((s, r) => s + (r.passed || 0), 0);
        const failed = filteredResults.reduce((s, r) => s + (r.failed || 0), 0);
        const absent = filteredResults.reduce((s, r) => s + (r.absentee || 0), 0);
        const appeared = passed + failed;
        const rate = calcRate(passed, appeared);

        countUp($('statTotal'), total, 1400);
        countUp($('statPassed'), passed, 1400);
        countUp($('statFailed'), failed, 1400);
        countUp($('statAbsent'), absent, 1400);

        // Rate is %
        const rateEl = $('statRate');
        if (rateEl) {
            if (countedValues.has('statRate')) {
                rateEl.textContent = rate.toFixed(1) + '%';
            } else {
                countedValues.add('statRate');
                const startTime = performance.now();
                function step(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / 1400, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    rateEl.textContent = (rate * eased).toFixed(1) + '%';
                    if (progress < 1) requestAnimationFrame(step);
                    else rateEl.textContent = rate.toFixed(1) + '%';
                }
                requestAnimationFrame(step);
            }
        }

        // Reveal cards
        document.querySelectorAll('.summary-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('revealed'), i * 80);
        });
    }

    // =========================================================
    // RENDER TABLE
    // =========================================================
    function renderTable() {
        const tbody = $('tableBody');
        if (!tbody) return;

        if (filteredResults.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-state">
                        <div class="es-icon"><i class="fas fa-inbox"></i></div>
                        <h6>কোনো result পাওয়া যায়নি</h6>
                        <p>Filter পরিবর্তন করুন</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        let html = '';
        filteredResults.forEach(r => {
            const appeared = (r.passed || 0) + (r.failed || 0);
            const rate = calcRate(r.passed, appeared);
            const lowClass = rate < 50 ? 'low' : '';

            html += `
                <tr>
                    <td><span class="level-badge ${escapeHtml(r.exam_name)}">${escapeHtml(r.exam_name)}</span></td>
                    <td>${escapeHtml(r.year)}</td>
                    <td>${escapeHtml(r.group_or_dept)}</td>
                    <td>${(r.total_student || 0).toLocaleString()}</td>
                    <td class="pass-col">${(r.passed || 0).toLocaleString()}</td>
                    <td class="fail-col">${(r.failed || 0).toLocaleString()}</td>
                    <td class="absent-col">${(r.absentee || 0).toLocaleString()}</td>
                    <td>
                        <div class="pass-rate-bar">
                            <div class="track">
                                <div class="fill ${lowClass}" data-width="${rate}"></div>
                            </div>
                            <span class="text">${rate.toFixed(1)}%</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Animate pass-rate bars
        setTimeout(() => {
            tbody.querySelectorAll('.fill').forEach((el, i) => {
                const w = el.dataset.width;
                setTimeout(() => { el.style.width = w + '%'; }, i * 30);
            });
        }, 100);
    }

    // =========================================================
    // CHART 1: Year-wise stacked bar
    // =========================================================
    function renderYearWiseChart() {
        destroyChart('yearWise');
        const canvas = $('chartYearWise');
        if (!canvas) return;
        canvas.dataset.chartKey = 'yearWise';

        const yearMap = new Map();
        filteredResults.forEach(r => {
            const y = r.year;
            if (!yearMap.has(y)) yearMap.set(y, { passed: 0, failed: 0 });
            const obj = yearMap.get(y);
            obj.passed += r.passed || 0;
            obj.failed += r.failed || 0;
        });

        const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
        const passedData = years.map(y => yearMap.get(y).passed);
        const failedData = years.map(y => yearMap.get(y).failed);

        if (years.length === 0) {
            charts.yearWise = emptyChart(canvas, 'কোনো data নেই');
            return;
        }

        charts.yearWise = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: years.map(String),
                datasets: [
                    {
                        label: 'Passed',
                        data: passedData,
                        backgroundColor: COLORS.pass.bg,
                        borderColor: COLORS.pass.border,
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.75
                    },
                    {
                        label: 'Failed',
                        data: failedData,
                        backgroundColor: COLORS.fail.bg,
                        borderColor: COLORS.fail.border,
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6,
                        categoryPercentage: 0.75
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1400, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterBody: (items) => {
                                if (!items.length) return '';
                                const idx = items[0].dataIndex;
                                const total = passedData[idx] + failedData[idx];
                                const rate = calcRate(passedData[idx], total);
                                return `\nTotal: ${total}\nPass Rate: ${rate}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '700' }, color: '#0a1655' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    }
                }
            }
        });
    }

    // =========================================================
    // CHART 2-4: Level-wise bar (% pass rate)
    // =========================================================
    function renderLevelChart(chartKey, canvasId, entities, levelName) {
        destroyChart(chartKey);
        const canvas = $(canvasId);
        if (!canvas) return;
        canvas.dataset.chartKey = chartKey;

        const levelData = filteredResults.filter(r => r.exam_name === levelName);

        if (levelData.length === 0) {
            charts[chartKey] = emptyChart(canvas, `${levelName} data নেই`);
            return;
        }

        const labels = [];
        const rates = [];
        const colors = [];
        const tooltips = [];

        entities.forEach(ent => {
            const keys = matchKeys(ent.key, DB_ALIASES);
            let passed = 0, failed = 0, total = 0;
            keys.forEach(k => {
                levelData.forEach(r => {
                    if (r.group_or_dept === k) {
                        passed += r.passed || 0;
                        failed += r.failed || 0;
                        total += r.total_student || 0;
                    }
                });
            });
            const appeared = passed + failed;
            const rate = calcRate(passed, appeared);
            labels.push(ent.label);
            rates.push(rate);
            colors.push(ent.color + 'dd');
            tooltips.push({ passed, failed, total, rate });
        });

        charts[chartKey] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Pass Rate %',
                    data: rates,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('dd', '')),
                    borderWidth: 1.5,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1400, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` Pass Rate: ${ctx.parsed.x}%`,
                            afterLabel: (ctx) => {
                                const t = tooltips[ctx.dataIndex];
                                return [
                                    `Total: ${t.total}`,
                                    `Passed: ${t.passed}`,
                                    `Failed: ${t.failed}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { callback: v => v + '%', font: { size: 11 }, color: '#6b7280' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 11.5, weight: '700' }, color: '#0a1655' }
                    }
                }
            }
        });
    }

    function emptyChart(canvas, msg) {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: msg,
                        color: '#9ca3af',
                        font: { family: "'Hind Siliguri', sans-serif", size: 13, weight: '600' }
                    }
                },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }

    function renderAllCharts() {
        renderYearWiseChart();
        renderLevelChart('hsc', 'chartHSC', HSC_GROUPS, 'HSC');
        renderLevelChart('degree', 'chartDegree', DEGREE_SUBJECTS, 'Degree');
        renderLevelChart('honours', 'chartHonours', HONOURS_DEPTS, 'Honours');

        setTimeout(setupChartScrollAnimation, 100);
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('filterLevel')?.addEventListener('change', applyFilterAndRender);
        $('filterYear')?.addEventListener('change', applyFilterAndRender);
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Result Overview v2.0 initializing...');
        setChartDefaults();
        setupScrollReveal();
        attachEvents();

        waitForSupabase(async function () {
            await loadData();
            console.log('✅ Result Overview v2.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();