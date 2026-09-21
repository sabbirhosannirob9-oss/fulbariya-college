/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN RESULT OVERVIEW
 * Location: js/admin-result-overview.js
 * Version: v1.0 — Board Result CRUD + Chart
 * =========================================================
 */

(function () {
    "use strict";

    let allResults = [];
    let filteredResults = [];
    let yearWiseChart = null;

    const COLORS = {
        pass: { bg: 'rgba(16, 185, 129, 0.9)', border: '#059669' },
        fail: { bg: 'rgba(239, 68, 68, 0.9)', border: '#dc2626' }
    };

    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function calcRate(passed, total) {
        if (!total || total <= 0) return 0;
        return Math.round((passed / total) * 1000) / 10;
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) clearInterval(i);
        }, 500);
    }

    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const avatar = document.querySelector('[data-admin-avatar]');
                if (avatar) {
                    if (result.admin.image_url) avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    else avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = function () {
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try { if (window.FDCAuth) await window.FDCAuth.logout(); } catch (e) { console.warn(e); }
                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            { title: 'লগআউট নিশ্চিত করুন', confirmText: 'হ্যাঁ, লগআউট', cancelText: 'বাতিল', confirmType: 'danger' }
        );
    };

    async function loadAllResults() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('board_final_result')
                .select('*')
                .order('year', { ascending: false })
                .order('exam_name')
                .order('group_or_dept');

            if (error) throw error;

            allResults = data || [];
            console.log('✅ Loaded results:', allResults.length);

            populateFilters();
            applyFiltersAndRender();

        } catch (e) {
            console.error('Load error:', e);
            $('resultsTableBody').innerHTML = `
                <tr><td colspan="10" style="text-align:center; padding:40px; color:var(--danger);">
                    <i class="fas fa-exclamation-triangle"></i> লোড করা যায়নি: ${escapeHtml(e.message)}
                </td></tr>
            `;
        }
    }

    function populateFilters() {
        const years = [...new Set(allResults.map(r => r.year))].sort((a, b) => b - a);
        const groups = [...new Set(allResults.map(r => r.group_or_dept))].sort();

        $('filterYear').innerHTML = '<option value="">All Years</option>' +
            years.map(y => `<option value="${y}">${y}</option>`).join('');

        $('filterGroup').innerHTML = '<option value="">All Groups</option>' +
            groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    }

    function applyFiltersAndRender() {
        const level = $('filterLevel').value;
        const year = $('filterYear').value;
        const group = $('filterGroup').value;

        filteredResults = allResults.filter(r => {
            if (level && r.exam_name !== level) return false;
            if (year && String(r.year) !== String(year)) return false;
            if (group && r.group_or_dept !== group) return false;
            return true;
        });

        updateStats();
        renderTable();
        renderChart();
    }

    function updateStats() {
        const total = filteredResults.reduce((s, r) => s + (r.total_student || 0), 0);
        const passed = filteredResults.reduce((s, r) => s + (r.passed || 0), 0);
        const failed = filteredResults.reduce((s, r) => s + (r.failed || 0), 0);
        const absent = filteredResults.reduce((s, r) => s + (r.absentee || 0), 0);
        const appeared = passed + failed;
        const rate = calcRate(passed, appeared);

        $('statTotal').textContent = total.toLocaleString();
        $('statPassed').textContent = passed.toLocaleString();
        $('statFailed').textContent = failed.toLocaleString();
        $('statRate').textContent = rate.toFixed(1) + '%';
        $('statAbsent').textContent = absent.toLocaleString();
    }

    function renderTable() {
        const tbody = $('resultsTableBody');
        $('tableCount').textContent = filteredResults.length;

        if (filteredResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10">
                        <div class="empty-state">
                            <div class="es-icon"><i class="fas fa-inbox"></i></div>
                            <h6>কোনো result নেই</h6>
                            <p>"Add Result" দিয়ে নতুন যোগ করুন</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filteredResults.forEach((r, i) => {
            const appeared = (r.passed || 0) + (r.failed || 0);
            const rate = calcRate(r.passed, appeared);
            const lowClass = rate < 50 ? 'low' : '';

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td><span class="level-badge ${escapeHtml(r.exam_name)}">${escapeHtml(r.exam_name)}</span></td>
                    <td><strong>${escapeHtml(r.year)}</strong></td>
                    <td>${escapeHtml(r.group_or_dept)}</td>
                    <td>${(r.total_student || 0).toLocaleString()}</td>
                    <td style="color:var(--success); font-weight:700;">${(r.passed || 0).toLocaleString()}</td>
                    <td style="color:var(--danger); font-weight:700;">${(r.failed || 0).toLocaleString()}</td>
                    <td>${(r.absentee || 0).toLocaleString()}</td>
                    <td>
                        <div class="pass-rate-bar">
                            <div class="prb-track">
                                <div class="prb-fill ${lowClass}" style="width:${rate}%;"></div>
                            </div>
                            <span class="prb-text">${rate.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="row-action-btn edit" data-action="edit" data-id="${r.id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="row-action-btn delete" data-action="delete" data-id="${r.id}" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    function renderChart() {
        if (yearWiseChart) {
            yearWiseChart.destroy();
            yearWiseChart = null;
        }

        const canvas = $('chartYearWise');
        if (!canvas) return;

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
            yearWiseChart = new Chart(canvas, {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'কোনো data নেই',
                            color: '#9ca3af',
                            font: { family: "'Hind Siliguri', sans-serif", size: 13, weight: '600' }
                        }
                    },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
            return;
        }

        yearWiseChart = new Chart(canvas, {
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
                animation: { duration: 1200, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        backgroundColor: 'rgba(10, 22, 85, 0.95)',
                        padding: 12,
                        cornerRadius: 10
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { family: "'Hind Siliguri', sans-serif", size: 12, weight: '700' }, color: '#0a1655' }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: "'Hind Siliguri', sans-serif", size: 11 }, color: '#6b7280' }
                    }
                }
            }
        });
    }

    // MODAL
    function openModal(id) {
        const el = $(id);
        if (el) el.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(id) {
        const el = $(id);
        if (el) el.classList.remove('show');
        document.body.style.overflow = '';
    }

    function openAddModal() {
        $('editResultId').value = '';
        $('resultModalTitle').textContent = 'Add Board Result';
        $('resultModalSub').textContent = 'Board exam-এর result যোগ করুন';
        $('resultModalIcon').className = 'fas fa-plus-circle';
        $('saveResultBtn').innerHTML = '<i class="fas fa-save"></i> Save Result';

        $('resultExamName').value = '';
        $('resultYear').value = new Date().getFullYear();
        $('resultGroup').value = '';
        $('resultTotal').value = '';
        $('resultPassed').value = '';
        $('resultFailed').value = '';
        $('resultAbsent').value = '';

        openModal('resultModal');
    }

    function openEditModal(id) {
        const r = allResults.find(x => String(x.id) === String(id));
        if (!r) return window.fdcError('Result পাওয়া যায়নি।');

        $('editResultId').value = r.id;
        $('resultModalTitle').textContent = 'Edit Board Result';
        $('resultModalSub').textContent = `${r.exam_name} · ${r.year} · ${r.group_or_dept}`;
        $('resultModalIcon').className = 'fas fa-edit';
        $('saveResultBtn').innerHTML = '<i class="fas fa-save"></i> Update Result';

        $('resultExamName').value = r.exam_name || '';
        $('resultYear').value = r.year || '';
        $('resultGroup').value = r.group_or_dept || '';
        $('resultTotal').value = r.total_student || '';
        $('resultPassed').value = r.passed || '';
        $('resultFailed').value = r.failed || '';
        $('resultAbsent').value = r.absentee || '';

        openModal('resultModal');
    }

    async function saveResult() {
        const id = $('editResultId').value;
        const examName = $('resultExamName').value;
        const year = parseInt($('resultYear').value);
        const group = $('resultGroup').value.trim();
        const total = parseInt($('resultTotal').value) || 0;
        const passed = parseInt($('resultPassed').value) || 0;
        const failed = parseInt($('resultFailed').value) || 0;
        const absent = parseInt($('resultAbsent').value) || 0;

        if (!examName) return window.fdcWarning('Exam Name সিলেক্ট করুন।');
        if (!year || year < 2000 || year > 2100) return window.fdcWarning('সঠিক Year দিন (2000-2100)।');
        if (!group) return window.fdcWarning('Group / Department দিন।');
        if (total <= 0) return window.fdcWarning('Total Students 0-এর বেশি দিন।');
        if (passed < 0 || failed < 0 || absent < 0) return window.fdcWarning('Negative number গ্রহণযোগ্য নয়।');

        const sum = passed + failed + absent;
        if (sum !== total) {
            return window.fdcWarning(
                `Passed (${passed}) + Failed (${failed}) + Absent (${absent}) = ${sum}<br>` +
                `কিন্তু Total = ${total}<br><br>সংখ্যাগুলো মিলতে হবে।`
            );
        }

        const btn = $('saveResultBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const payload = {
                exam_name: examName,
                year: year,
                group_or_dept: group,
                total_student: total,
                passed: passed,
                failed: failed,
                absentee: absent,
                updated_at: new Date().toISOString()
            };

            if (id) {
                const { error } = await window.FDC_SUPABASE
                    .from('board_final_result')
                    .update(payload)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.FDC_SUPABASE
                    .from('board_final_result')
                    .insert([payload]);
                if (error) throw error;
            }

            closeModal('resultModal');
            window.fdcSuccess(id ? 'Result update হয়েছে!' : 'Result যোগ হয়েছে!');
            await loadAllResults();

        } catch (e) {
            console.error('Save error:', e);
            window.fdcError('Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function deleteResult(id) {
        const r = allResults.find(x => String(x.id) === String(id));
        if (!r) return window.fdcError('Result পাওয়া যায়নি।');

        window.fdcConfirm(
            `<strong>${escapeHtml(r.exam_name)} · ${escapeHtml(r.year)} · ${escapeHtml(r.group_or_dept)}</strong><br><br>এই result delete করতে চান?`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('board_final_result')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Result delete হয়েছে।');
                    await loadAllResults();
                } catch (e) {
                    console.error('Delete error:', e);
                    window.fdcError('Delete failed: ' + e.message);
                }
            },
            { title: 'Delete Result', confirmText: 'হ্যাঁ, Delete', cancelText: 'বাতিল', confirmType: 'danger' }
        );
    }

    function attachEvents() {
        $('btnAddResult').addEventListener('click', openAddModal);
        $('btnRefresh').addEventListener('click', async function () {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            await loadAllResults();
            this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            window.fdcSuccess('Data refresh হয়েছে।');
        });

        $('closeResultModal').addEventListener('click', () => closeModal('resultModal'));
        $('cancelResultBtn').addEventListener('click', () => closeModal('resultModal'));
        $('saveResultBtn').addEventListener('click', saveResult);

        ['filterLevel', 'filterYear', 'filterGroup'].forEach(id => {
            $(id).addEventListener('change', applyFiltersAndRender);
        });

        $('resultsTableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'edit') openEditModal(id);
            else if (action === 'delete') deleteResult(id);
        });

        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
                document.body.style.overflow = '';
            }
        });
    }

    async function init() {
        console.log('🚀 Admin Result Overview v1.0 initializing...');

        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Hind Siliguri', sans-serif";
            Chart.defaults.font.weight = '600';
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;
        }

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllResults();

            console.log('✅ Admin Result Overview v1.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();