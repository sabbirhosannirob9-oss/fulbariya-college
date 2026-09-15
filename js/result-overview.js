/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC RESULT OVERVIEW
 * Location: js/result-overview.js
 * 
 * Features:
 *   • HSC Internal (4 exams, group pies)
 *   • HSC Board (year filter, group pies)
 *   • Degree Board (year filter, course pies)
 *   • Honours Board (year filter, dept pies — scrollable)
 *   • Scroll-triggered animation: charts fill 0 → actual
 *   • Enhanced animations: pulse, glow, fade-slide
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let internalData = {
        '1st Terminal': { overall: null, groups: {}, year: null },
        '2nd Terminal': { overall: null, groups: {}, year: null },
        'Test': { overall: null, groups: {}, year: null },
        'Final': { overall: null, groups: {}, year: null }
    };
    let currentInternalExam = '1st Terminal';
    const charts = {};
    const animatedCharts = new Set();

    // =========================================================
    // CONSTANTS
    // =========================================================
    const COLORS = {
        pass: '#10b981',
        fail: '#ef4444',
        absent: '#f59e0b',
        navy: '#0a1655'
    };

    const HSC_GROUPS = [
        { key: 'Science',    label: 'বিজ্ঞান',       icon: 'fas fa-flask',     cssClass: 'science' },
        { key: 'Humanities', label: 'মানবিক',         icon: 'fas fa-book',      cssClass: 'humanities' },
        { key: 'Business',   label: 'ব্যবসায় শিক্ষা', icon: 'fas fa-briefcase', cssClass: 'business' },
        { key: 'BM-General', label: 'বিএম',           icon: 'fas fa-industry',  cssClass: 'bm' }
    ];

    const DEGREE_COURSES = [
        { key: 'B.A (Pass)',   label: 'বি.এ (পাস)',    icon: 'fas fa-book',      cssClass: 'humanities' },
        { key: 'B.S.S (Pass)', label: 'বি.এস.এস (পাস)', icon: 'fas fa-users',     cssClass: 'science' },
        { key: 'B.B.S (Pass)', label: 'বি.বি.এস (পাস)', icon: 'fas fa-briefcase', cssClass: 'business' },
        { key: 'B.Sc (Pass)',  label: 'বি.এস.সি (পাস)', icon: 'fas fa-flask',     cssClass: 'science' }
    ];

    // Honours — 7 subjects (Fulbariya College)
    const HONOURS_DEPTS = [
        { key: 'Accounting',        label: 'হিসাববিজ্ঞান',   icon: 'fas fa-calculator', cssClass: 'business' },
        { key: 'Management',        label: 'ব্যবস্থাপনা',     icon: 'fas fa-user-tie',   cssClass: 'business' },
        { key: 'Political Science', label: 'রাষ্ট্রবিজ্ঞান',  icon: 'fas fa-gavel',      cssClass: 'humanities' },
        { key: 'Bangla',            label: 'বাংলা',          icon: 'fas fa-language',   cssClass: 'humanities' },
        { key: 'Philosophy',        label: 'দর্শন',           icon: 'fas fa-brain',      cssClass: 'humanities' },
        { key: 'Zoology',           label: 'প্রাণিবিদ্যা',    icon: 'fas fa-paw',        cssClass: 'science' },
        { key: 'English',           label: 'ইংরেজি',         icon: 'fas fa-book-open',  cssClass: 'humanities' }
    ];

    const DB_GROUP_KEYS = {
        'Science':    ['Science'],
        'Humanities': ['Humanities'],
        'Business':   ['Business', 'Business Studies'],
        'BM-General': ['BM-General', 'BM']
    };

    // =========================================================
    // HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

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

    function calcPassRate(passed, total) {
        if (!total || total <= 0) return 0;
        return Math.round((passed / total) * 1000) / 10;
    }

    function destroyChart(key) {
        if (charts[key]) {
            try { charts[key].destroy(); } catch (e) {}
            delete charts[key];
            animatedCharts.delete(key);
        }
    }

    // =========================================================
    // ENHANCED CHART.JS DEFAULTS
    // =========================================================
    function setChartDefaults() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.font.family = "'Hind Siliguri', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.font.weight = '600';
        Chart.defaults.color = '#374151';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.boxWidth = 10;
        Chart.defaults.plugins.legend.labels.padding = 12;
        Chart.defaults.plugins.legend.labels.font = {
            family: "'Hind Siliguri', sans-serif", size: 11, weight: '600'
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

        // Enhanced animations
        Chart.defaults.animation.duration = 1400;
        Chart.defaults.animation.easing = 'easeOutQuart';
        Chart.defaults.animations.colors.duration = 1000;
        Chart.defaults.animations.numbers.duration = 1400;
    }

    // =========================================================
    // SCROLL REVEAL
    // =========================================================
    function setupScrollReveal() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('in-view'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -60px 0px' });

        document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    }

    // =========================================================
    // CHART ANIMATION ON SCROLL
    // =========================================================
    function setupChartScrollAnimation() {
        if (!('IntersectionObserver' in window)) {
            Object.keys(charts).forEach(key => animateChart(key));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const canvas = entry.target;
                    const chartKey = canvas.dataset.chartKey;
                    if (chartKey) {
                        animateChart(chartKey);
                        observer.unobserve(canvas);
                    }
                }
            });
        }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('canvas[data-chart-key]').forEach(canvas => {
            observer.observe(canvas);
        });
    }

    function animateChart(key) {
        const chart = charts[key];
        if (!chart || animatedCharts.has(key)) return;

        const targetData = chart.options.plugins?.fdc?.targetData;
        if (!targetData) return;

        animatedCharts.add(key);

        // Pulse animation on canvas parent
        const canvas = document.getElementById(key);
        if (canvas && canvas.parentElement) {
            canvas.parentElement.classList.add('chart-pulse');
            setTimeout(() => {
                canvas.parentElement.classList.remove('chart-pulse');
            }, 1500);
        }

        // Start from 0 and animate to target
        chart.data.datasets[0].data = targetData.map(() => 0);
        chart.update('none');

        setTimeout(() => {
            chart.data.datasets[0].data = targetData;
            chart.update();
        }, 150);
    }

    // =========================================================
    // DRAW: Pie Chart with enhanced animation
    // =========================================================
    function drawPie(canvasId, stats, options) {
        options = options || {};
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        destroyChart(canvasId);

        const hasFail = stats.failed > 0;
        const hasAbsent = stats.absent > 0;

        let labels = ['Pass'];
        let values = [stats.passed];
        let colors = [COLORS.pass];

        if (hasFail) { labels.push('Fail'); values.push(stats.failed); colors.push(COLORS.fail); }
        if (hasAbsent) { labels.push('Absent'); values.push(stats.absent); colors.push(COLORS.absent); }

        const passRate = calcPassRate(stats.passed, stats.total);
        const isLarge = options.isLarge || false;
        const centerFontSize = isLarge ? 38 : 22;

        canvas.dataset.chartKey = canvasId;

        charts[canvasId] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values.map(() => 0),
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: isLarge ? 6 : 3,
                    hoverBorderColor: '#fff',
                    hoverOffset: isLarge ? 18 : 10,
                    spacing: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: isLarge ? '72%' : '68%',
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1600,
                    easing: 'easeOutQuart'
                },
                transitions: {
                    active: {
                        animation: {
                            duration: 400
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = values.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((ctx.parsed / total) * 1000) / 10 : 0;
                                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                            }
                        }
                    },
                    fdc: { targetData: values }
                }
            },
            plugins: [{
                id: 'centerText_' + canvasId,
                afterDraw: (chart) => {
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return;
                    const cx = (chartArea.left + chartArea.right) / 2;
                    const cy = (chartArea.top + chartArea.bottom) / 2;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Glowing effect for large chart
                    if (isLarge) {
                        ctx.shadowColor = 'rgba(10, 22, 85, 0.15)';
                        ctx.shadowBlur = 8;
                    }

                    ctx.font = `700 ${centerFontSize}px 'Playfair Display', serif`;
                    ctx.fillStyle = COLORS.navy;
                    ctx.fillText(passRate + '%', cx, cy - (isLarge ? 6 : 0));

                    if (isLarge) {
                        ctx.shadowBlur = 0;
                        ctx.font = "700 11px 'Hind Siliguri', sans-serif";
                        ctx.fillStyle = '#6b7280';
                        ctx.fillText('PASS RATE', cx, cy + 24);
                    }
                    ctx.restore();
                }
            }]
        });
    }

    // =========================================================
    // RENDER: Group Charts Grid (with stagger animation)
    // =========================================================
    function renderGroupCharts(containerId, entities, groupsData, dbKeysMap, prefix) {
        const container = $(containerId);
        if (!container) return;
        container.innerHTML = '';

        entities.forEach((entity, idx) => {
            let stats = { total: 0, passed: 0, failed: 0, absent: 0 };
            const keys = (dbKeysMap && dbKeysMap[entity.key]) || [entity.key];

            keys.forEach(k => {
                if (groupsData[k]) {
                    stats.total += groupsData[k].total || 0;
                    stats.passed += groupsData[k].passed || 0;
                    stats.failed += groupsData[k].failed || 0;
                    stats.absent += groupsData[k].absent || 0;
                }
            });

            const hasData = stats.total > 0;
            const item = document.createElement('div');
            item.className = 'group-pie-item' + (hasData ? '' : ' empty');
            item.style.animationDelay = (idx * 80) + 'ms';

            if (!hasData) {
                item.innerHTML = `
                    <div class="gp-title">
                        <i class="${entity.icon} ${entity.cssClass}"></i> ${entity.label}
                    </div>
                    <div class="gp-pie"><i class="fas fa-inbox"></i></div>
                    <div class="gp-sub">Data নেই</div>
                `;
                container.appendChild(item);
                return;
            }

            const passRate = calcPassRate(stats.passed, stats.total);
            item.innerHTML = `
                <div class="gp-title">
                    <i class="${entity.icon} ${entity.cssClass}"></i> ${entity.label}
                </div>
                <div class="gp-pie">
                    <canvas id="${prefix}_${idx}"></canvas>
                </div>
                <div class="gp-sub">${stats.passed}/${stats.total} • ${passRate}%</div>
            `;
            container.appendChild(item);

            requestAnimationFrame(() => {
                drawPie(`${prefix}_${idx}`, stats, { isLarge: false });
            });
        });
    }

    // =========================================================
    // RENDER: Bar Compare (with enhanced animation)
    // =========================================================
    function renderBarCompare(containerId, entities, groupsData, dbKeysMap) {
        const container = $(containerId);
        if (!container) return;

        const items = entities.map(entity => {
            const keys = (dbKeysMap && dbKeysMap[entity.key]) || [entity.key];
            let stats = { total: 0, passed: 0, failed: 0, absent: 0 };
            keys.forEach(k => {
                if (groupsData[k]) {
                    stats.total += groupsData[k].total || 0;
                    stats.passed += groupsData[k].passed || 0;
                    stats.failed += groupsData[k].failed || 0;
                    stats.absent += groupsData[k].absent || 0;
                }
            });
            return { entity, stats };
        }).filter(i => i.stats.total > 0);

        if (!items.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--grey);padding:20px;">কোনো data নেই</p>';
            return;
        }

        const maxVal = Math.max(...items.map(i => i.stats.total));

        container.innerHTML = items.map(({ entity, stats }, idx) => {
            const pct = maxVal > 0 ? Math.round((stats.total / maxVal) * 100) : 0;
            const passRate = calcPassRate(stats.passed, stats.total);
            return `
                <div class="bar-compare-item" style="animation-delay:${idx * 100}ms;">
                    <div class="bc-label">
                        <i class="${entity.icon} ${entity.cssClass}"></i> ${entity.label}
                    </div>
                    <div class="bc-bar">
                        <div class="bc-bar-fill" data-width="${pct}"></div>
                    </div>
                    <div class="bc-value">
                        ${stats.total}
                        <small>${passRate}% pass</small>
                    </div>
                </div>
            `;
        }).join('');

        const barObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    container.querySelectorAll('.bc-bar-fill').forEach((el, i) => {
                        const w = el.dataset.width;
                        setTimeout(() => {
                            el.style.width = w + '%';
                        }, i * 120);
                    });
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        barObserver.observe(container);
    }

    // =========================================================
    // RENDER: Table
    // =========================================================
    function renderTable(tbodyId, entities, groupsData, dbKeysMap) {
        const tbody = $(tbodyId);
        if (!tbody) return;

        const rows = entities.map(entity => {
            const keys = (dbKeysMap && dbKeysMap[entity.key]) || [entity.key];
            let stats = { total: 0, passed: 0, failed: 0, absent: 0 };
            keys.forEach(k => {
                if (groupsData[k]) {
                    stats.total += groupsData[k].total || 0;
                    stats.passed += groupsData[k].passed || 0;
                    stats.failed += groupsData[k].failed || 0;
                    stats.absent += groupsData[k].absent || 0;
                }
            });
            if (stats.total === 0) return '';
            const rate = calcPassRate(stats.passed, stats.total);
            return `
                <tr>
                    <td>${entity.label}</td>
                    <td>${stats.total}</td>
                    <td class="pass-col">${stats.passed}</td>
                    <td class="fail-col">${stats.failed}</td>
                    <td class="absent-col">${stats.absent}</td>
                    <td>${rate}%</td>
                </tr>
            `;
        }).filter(Boolean);

        tbody.innerHTML = rows.length
            ? rows.join('')
            : '<tr><td colspan="6" style="text-align:center;color:var(--grey);padding:20px;">কোনো data নেই</td></tr>';
    }

    // =========================================================
    // SECTION 1: HSC INTERNAL
    // =========================================================
    async function loadInternalData() {
        try {
            const supabase = window.FDC_SUPABASE;

            const { data: exams } = await supabase
                .from('exams')
                .select('id, exam_name, display_name, exam_order')
                .eq('is_active', true)
                .order('exam_order');

            const { data: yearRows } = await supabase
                .from('results')
                .select('exam_id, year, students!inner(branch)')
                .eq('is_published', true)
                .eq('students.branch', 'HSC');

            const latestYear = {};
            (yearRows || []).forEach(r => {
                if (!latestYear[r.exam_id] || r.year > latestYear[r.exam_id]) {
                    latestYear[r.exam_id] = r.year;
                }
            });

            const promises = (exams || []).map(async (exam) => {
                const latest = latestYear[exam.id];
                if (!latest) {
                    internalData[exam.exam_name] = { overall: null, groups: {}, year: null };
                    return;
                }

                const { data: results } = await supabase
                    .from('results')
                    .select('id, student_id, gpa, students!inner(group_name, branch)')
                    .eq('is_published', true)
                    .eq('exam_id', exam.id)
                    .eq('year', latest)
                    .eq('students.branch', 'HSC');

                const resultIds = (results || []).map(r => r.id);
                const absentMap = {};

                if (resultIds.length > 0) {
                    const { data: details } = await supabase
                        .from('result_details')
                        .select('result_id, status')
                        .in('result_id', resultIds);

                    (details || []).forEach(d => {
                        if (d.status === 'absent') {
                            absentMap[d.result_id] = (absentMap[d.result_id] || 0) + 1;
                        }
                    });
                }

                const overall = { total: 0, passed: 0, failed: 0, absent: 0 };
                const groups = {};
                HSC_GROUPS.forEach(g => groups[g.key] = { total: 0, passed: 0, failed: 0, absent: 0 });

                (results || []).forEach(r => {
                    const groupName = r.students?.group_name;
                    const gpa = Number(r.gpa) || 0;
                    const absentCnt = absentMap[r.id] || 0;

                    let status;
                    if (absentCnt >= 1) status = 'absent';
                    else if (gpa >= 2.00) status = 'passed';
                    else status = 'failed';

                    overall.total++;
                    overall[status]++;
                    if (groupName && groups[groupName]) {
                        groups[groupName].total++;
                        groups[groupName][status]++;
                    }
                });

                internalData[exam.exam_name] = { overall, groups, year: latest };
            });

            await Promise.all(promises);
            renderInternalExam(currentInternalExam);

        } catch (e) {
            console.error('Load internal error:', e);
            $('internalLoading').style.display = 'none';
            $('internalEmpty').style.display = 'block';
        }
    }

    function renderInternalExam(examName) {
        currentInternalExam = examName;
        document.querySelectorAll('.exam-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.exam === examName);
        });

        const data = internalData[examName];
        $('internalLoading').style.display = 'none';

        if (!data || !data.overall || data.overall.total === 0) {
            $('internalContent').style.display = 'none';
            $('internalEmpty').style.display = 'block';
            return;
        }

        $('internalEmpty').style.display = 'none';
        $('internalContent').style.display = 'block';

        requestAnimationFrame(() => {
            drawPie('internalOverallChart', data.overall, { isLarge: true });
        });

        renderInternalStats(data.overall);
        renderGroupCharts('internalGroupCharts', HSC_GROUPS, data.groups, DB_GROUP_KEYS, 'internalGroup');
        renderTable('internalTableBody', HSC_GROUPS, data.groups, DB_GROUP_KEYS);

        setTimeout(setupChartScrollAnimation, 100);
    }

    function renderInternalStats(overall) {
        const list = $('internalStatList');
        if (!list) return;

        const max = overall.total || 1;
        const items = [
            { key: 'total',  label: 'Total',  value: overall.total,  cls: 'total' },
            { key: 'passed', label: 'Pass',   value: overall.passed, cls: 'pass' },
            { key: 'failed', label: 'Fail',   value: overall.failed, cls: 'fail' },
            { key: 'absent', label: 'Absent', value: overall.absent, cls: 'absent' }
        ];

        list.innerHTML = items.map(it => {
            const pct = Math.round((it.value / max) * 100);
            return `
                <div class="stat-row ${it.cls}">
                    <span class="stat-label">${it.label}</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill ${it.cls}" data-width="${pct}"></div>
                    </div>
                    <span class="stat-value">${it.value}</span>
                </div>
            `;
        }).join('');

        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    list.querySelectorAll('.stat-bar-fill').forEach((el, i) => {
                        const w = el.dataset.width;
                        setTimeout(() => { el.style.width = w + '%'; }, i * 100);
                    });
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        statObserver.observe(list);
    }

    // =========================================================
    // SECTION 2/3/4: BOARD FINAL (Generic)
    // =========================================================
    async function loadBoardYears(examName, selectId, emptyId) {
        try {
            const { data } = await window.FDC_SUPABASE
                .from('board_final_result')
                .select('year')
                .eq('exam_name', examName)
                .order('year', { ascending: false });

            const years = [...new Set((data || []).map(r => r.year))];
            const sel = $(selectId);
            if (!sel) return;

            sel.innerHTML = '';

            if (years.length === 0) {
                sel.innerHTML = '<option value="">কোনো data নেই</option>';
                $(emptyId).style.display = 'block';
                return;
            }

            years.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                sel.appendChild(opt);
            });

            return sel.value;
        } catch (e) {
            console.error('Load years error:', examName, e);
        }
    }

    async function loadBoardData(examName, year, entities, dbKeysMap, prefix) {
        const loadingId = prefix + 'Loading';
        const contentId = prefix + 'Content';
        const emptyId = prefix + 'Empty';
        const chartsId = prefix + 'GroupCharts';
        const barId = prefix + 'BarCompare';
        const tableId = prefix + 'TableBody';

        $(loadingId).style.display = 'block';
        $(contentId).style.display = 'none';
        $(emptyId).style.display = 'none';

        try {
            if (!year) {
                $(loadingId).style.display = 'none';
                $(emptyId).style.display = 'block';
                return;
            }

            const { data } = await window.FDC_SUPABASE
                .from('board_final_result')
                .select('*')
                .eq('year', year)
                .eq('exam_name', examName)
                .order('group_or_dept');

            $(loadingId).style.display = 'none';

            if (!data || data.length === 0) {
                $(emptyId).style.display = 'block';
                return;
            }

            const byGroup = {};
            data.forEach(r => {
                byGroup[r.group_or_dept] = {
                    total: r.total_student || 0,
                    passed: r.passed || 0,
                    failed: r.failed || 0,
                    absent: r.absentee || 0
                };
            });

            $(contentId).style.display = 'block';

            renderGroupCharts(chartsId, entities, byGroup, dbKeysMap, prefix + 'Group');
            renderBarCompare(barId, entities, byGroup, dbKeysMap);
            renderTable(tableId, entities, byGroup, dbKeysMap);

            setTimeout(setupChartScrollAnimation, 100);

        } catch (e) {
            console.error('Load board error:', e);
            $(loadingId).style.display = 'none';
            $(emptyId).style.display = 'block';
        }
    }

    // =========================================================
    // SETUP EVENT LISTENERS
    // =========================================================
    function setupExamTabs() {
        document.querySelectorAll('.exam-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const exam = this.dataset.exam;
                if (exam === currentInternalExam) return;
                Object.keys(charts).forEach(k => {
                    if (k.startsWith('internalGroup') || k === 'internalOverallChart') {
                        animatedCharts.delete(k);
                    }
                });
                renderInternalExam(exam);
            });
        });

        const first = document.querySelector('.exam-tab[data-exam="1st Terminal"]');
        if (first) first.classList.add('active');
    }

    function setupBoardListeners() {
        const hscSel = $('hscBoardYear');
        if (hscSel) {
            hscSel.addEventListener('change', function () {
                Object.keys(charts).forEach(k => {
                    if (k.startsWith('hscBoard')) animatedCharts.delete(k);
                });
                loadBoardData('HSC', this.value, HSC_GROUPS, DB_GROUP_KEYS, 'hscBoard');
            });
        }

        const degSel = $('degreeBoardYear');
        if (degSel) {
            degSel.addEventListener('change', function () {
                Object.keys(charts).forEach(k => {
                    if (k.startsWith('degreeBoard')) animatedCharts.delete(k);
                });
                loadBoardData('Degree', this.value, DEGREE_COURSES, null, 'degreeBoard');
            });
        }

        const honSel = $('honoursBoardYear');
        if (honSel) {
            honSel.addEventListener('change', function () {
                Object.keys(charts).forEach(k => {
                    if (k.startsWith('honoursBoard')) animatedCharts.delete(k);
                });
                loadBoardData('Honours', this.value, HONOURS_DEPTS, null, 'honoursBoard');
            });
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Result Overview initializing...');

        setChartDefaults();
        setupScrollReveal();
        setupExamTabs();
        setupBoardListeners();

        waitForSupabase(async function () {
            await loadInternalData();

            const hscYear = await loadBoardYears('HSC', 'hscBoardYear', 'hscBoardEmpty');
            if (hscYear) await loadBoardData('HSC', hscYear, HSC_GROUPS, DB_GROUP_KEYS, 'hscBoard');

            const degYear = await loadBoardYears('Degree', 'degreeBoardYear', 'degreeBoardEmpty');
            if (degYear) await loadBoardData('Degree', degYear, DEGREE_COURSES, null, 'degreeBoard');

            const honYear = await loadBoardYears('Honours', 'honoursBoardYear', 'honoursBoardEmpty');
            if (honYear) await loadBoardData('Honours', honYear, HONOURS_DEPTS, null, 'honoursBoard');

            console.log('✅ Result Overview ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();