/**
 * =========================================================
 * FULBARIYA COLLEGE — BOARD FINAL RESULT MANAGEMENT
 * Location: js/admin-board-final.js
 * Depends: config.js, supabase.js, auth.js, admin-guard.js, admin-popup.js
 * Supports: HSC (4 groups), Degree (4 courses), Honours (7 subjects)
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allRecords = [];
    let currentEditId = null;

    // =========================================================
    // DROPDOWN DATA (English)
    // =========================================================
    const GROUP_DATA = {
        HSC: ['Science', 'Humanities', 'Business Studies', 'BM'],
        Degree: ['B.A (Pass)', 'B.S.S (Pass)', 'B.B.S (Pass)', 'B.Sc (Pass)'],
        Honours: [
            'Accounting',
            'Management',
            'Political Science',
            'Bangla',
            'Philosophy',
            'Zoology',
            'English'
        ]
    };

    // =========================================================
    // HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i);
                cb();
            }
            if (++n > 40) clearInterval(i);
        }, 500);
    }

    function calcPassRate(passed, total) {
        if (!total || total <= 0) return 0;
        return Math.round((passed / total) * 1000) / 10;
    }

    // =========================================================
    // VALIDATION (Live)
    // =========================================================
    function validateNumbers() {
        const total = parseInt($('totalStudent').value) || 0;
        const passed = parseInt($('passed').value) || 0;
        const failed = parseInt($('failed').value) || 0;
        const absentee = parseInt($('absentee').value) || 0;

        const box = $('formValidation');
        const sum = passed + failed + absentee;

        if (sum > total) {
            box.style.display = 'block';
            box.style.background = '#fef2f2';
            box.style.color = '#991b1b';
            box.style.borderLeft = '4px solid #dc2626';
            box.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 
                <strong>ভুল:</strong> Passed + Failed + Absentee = <b>${sum}</b>, 
                যা Total (${total}) এর চেয়ে বেশি।`;
            return false;
        }

        if (total === 0 && sum === 0) {
            box.style.display = 'none';
            return true;
        }

        if (sum < total) {
            const missing = total - sum;
            box.style.display = 'block';
            box.style.background = '#fef3c7';
            box.style.color = '#92400e';
            box.style.borderLeft = '4px solid #f59e0b';
            box.innerHTML = `<i class="fas fa-info-circle"></i> 
                <strong>নোট:</strong> ${missing} জন student-এর কোনো status দেওয়া হয়নি 
                (Passed + Failed + Absentee = ${sum} / ${total})। 
                চাইলে এভাবে save করা যাবে।`;
            return true;
        }

        box.style.display = 'block';
        box.style.background = '#f0fdf4';
        box.style.color = '#166534';
        box.style.borderLeft = '4px solid #10b981';
        box.innerHTML = `<i class="fas fa-check-circle"></i> 
            <strong>সঠিক:</strong> Pass Rate = <b>${calcPassRate(passed, total)}%</b>`;
        return true;
    }

    // =========================================================
    // POPULATE GROUP DROPDOWN (based on Exam)
    // =========================================================
    function updateGroupDropdown() {
        const exam = $('examName').value;
        const groupSelect = $('groupDept');
        const hint = $('groupHint');

        groupSelect.innerHTML = '';

        if (!exam) {
            groupSelect.disabled = true;
            groupSelect.innerHTML = '<option value="">আগে Exam সিলেক্ট করুন</option>';
            hint.textContent = '';
            return;
        }

        const groups = GROUP_DATA[exam] || [];
        groupSelect.disabled = false;
        groupSelect.innerHTML = '<option value="">Select Group/Dept</option>';

        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            groupSelect.appendChild(opt);
        });

        hint.textContent = `(${groups.length}টি)`;
    }

    // =========================================================
    // RESET FORM
    // =========================================================
    function resetForm() {
        $('editId').value = '';
        $('examName').value = '';
        $('examYear').value = '';
        $('groupDept').innerHTML = '<option value="">আগে Exam সিলেক্ট করুন</option>';
        $('groupDept').disabled = true;
        $('groupHint').textContent = '';
        $('totalStudent').value = 0;
        $('passed').value = 0;
        $('failed').value = 0;
        $('absentee').value = 0;
        $('formValidation').style.display = 'none';
        $('formTitle').textContent = 'নতুন Result যোগ করুন';
        $('submitBtnText').textContent = 'Save Result';
        $('cancelEditBtn').style.display = 'none';
        currentEditId = null;
    }

    // =========================================================
    // LOAD ALL RECORDS FROM SUPABASE
    // =========================================================
    async function loadRecords() {
        const tbody = $('tableBody');

        try {
            tbody.innerHTML = `
                <tr><td colspan="9" style="padding:20px;text-align:center;color:var(--grey);">
                    <i class="fas fa-spinner fa-spin"></i> লোড হচ্ছে...
                </td></tr>
            `;

            const { data, error } = await window.FDC_SUPABASE
                .from('board_final_result')
                .select('*')
                .order('year', { ascending: false })
                .order('exam_name', { ascending: true })
                .order('group_or_dept', { ascending: true });

            if (error) throw error;
            allRecords = data || [];
            renderTable();
        } catch (e) {
            console.error('Load records error:', e);
            window.fdcError('Data লোড করতে সমস্যা: ' + e.message);
            allRecords = [];
            renderTable();
        }
    }

    // =========================================================
    // RENDER TABLE
    // =========================================================
    function renderTable() {
        const tbody = $('tableBody');
        $('totalRecords').textContent = allRecords.length;

        if (allRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="padding:0;">
                        <div class="empty-state">
                            <div class="icon-wrap"><i class="fas fa-inbox"></i></div>
                            <h6>কোনো data নেই</h6>
                            <p>উপরে form পূরণ করে প্রথম result যোগ করুন</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allRecords.map(r => {
            const passRate = calcPassRate(r.passed, r.total_student);
            const rateColor = passRate >= 75 ? '#059669' : passRate >= 50 ? '#d97706' : '#dc2626';

            return `
                <tr>
                    <td><span class="exam-badge ${escapeHtml(r.exam_name)}">${escapeHtml(r.exam_name)}</span></td>
                    <td><span class="year-badge">${escapeHtml(r.year)}</span></td>
                    <td><span class="dept-name">${escapeHtml(r.group_or_dept)}</span></td>
                    <td class="num-cell">${r.total_student}</td>
                    <td class="num-cell passed">${r.passed}</td>
                    <td class="num-cell failed">${r.failed}</td>
                    <td class="num-cell absentee">${r.absentee}</td>
                    <td style="text-align:center;">
                        <span class="pass-rate" style="color:${rateColor};">${passRate}%</span>
                    </td>
                    <td>
                        <div style="display:inline-flex;gap:5px;">
                            <button class="btn-danger-soft" style="padding:6px 10px;" 
                                    onclick="editRecord(${r.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-danger-soft" style="padding:6px 10px;" 
                                    onclick="deleteRecord(${r.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // =========================================================
    // EDIT RECORD
    // =========================================================
    window.editRecord = function (id) {
        const rec = allRecords.find(r => r.id === id);
        if (!rec) return;

        currentEditId = id;
        $('editId').value = id;
        $('examName').value = rec.exam_name;
        updateGroupDropdown();
        $('groupDept').value = rec.group_or_dept;
        $('examYear').value = rec.year;
        $('totalStudent').value = rec.total_student;
        $('passed').value = rec.passed;
        $('failed').value = rec.failed;
        $('absentee').value = rec.absentee;

        $('formTitle').textContent = `Edit — ${rec.exam_name} ${rec.year} (${rec.group_or_dept})`;
        $('submitBtnText').textContent = 'Update Result';
        $('cancelEditBtn').style.display = 'inline-flex';

        validateNumbers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // =========================================================
    // DELETE RECORD
    // =========================================================
    window.deleteRecord = function (id) {
        const rec = allRecords.find(r => r.id === id);
        if (!rec) return;

        window.fdcConfirm(
            `<strong>${escapeHtml(rec.exam_name)} ${rec.year} — ${escapeHtml(rec.group_or_dept)}</strong><br>এই result ডিলিট করতে চান?`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('board_final_result')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    window.fdcSuccess('সফলভাবে ডিলিট হয়েছে');
                    await loadRecords();

                    if (currentEditId === id) resetForm();
                } catch (e) {
                    console.error('Delete error:', e);
                    window.fdcError('ডিলিট করতে সমস্যা: ' + e.message);
                }
            },
            {
                title: 'Delete Confirmation',
                confirmText: 'হ্যাঁ, ডিলিট',
                cancelText: 'বাতিল',
                confirmType: 'danger'
            }
        );
    };

    // =========================================================
    // SUBMIT FORM (Insert or Update)
    // =========================================================
    async function handleSubmit(e) {
        e.preventDefault();

        const exam = $('examName').value.trim();
        const year = parseInt($('examYear').value);
        const dept = $('groupDept').value.trim();
        const total = parseInt($('totalStudent').value) || 0;
        const passed = parseInt($('passed').value) || 0;
        const failed = parseInt($('failed').value) || 0;
        const absentee = parseInt($('absentee').value) || 0;

        // ============ VALIDATION ============
        if (!exam || !year || !dept) {
            window.fdcError('Exam, Year এবং Group/Dept সব সিলেক্ট করুন।');
            return;
        }
        if (year < 1990 || year > 2100) {
            window.fdcError('Year 1990 থেকে 2100-এর মধ্যে দিন।');
            return;
        }
        if (total <= 0) {
            window.fdcError('Total Students 0-এর বেশি হতে হবে।');
            return;
        }
        if (passed + failed + absentee > total) {
            window.fdcError('Passed + Failed + Absentee, Total-এর বেশি হতে পারে না।');
            return;
        }

        // ============ LOADING STATE ============
        const btn = $('submitBtn');
        btn.disabled = true;
        const originalText = $('submitBtnText').textContent;
        $('submitBtnText').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const payload = {
                exam_name: exam,
                year: year,
                group_or_dept: dept,
                total_student: total,
                passed: passed,
                failed: failed,
                absentee: absentee
            };

            if (currentEditId) {
                const { error } = await window.FDC_SUPABASE
                    .from('board_final_result')
                    .update(payload)
                    .eq('id', currentEditId);

                if (error) throw error;
                window.fdcSuccess('সফলভাবে আপডেট হয়েছে!');
            } else {
                const { error } = await window.FDC_SUPABASE
                    .from('board_final_result')
                    .upsert(payload, {
                        onConflict: 'exam_name,year,group_or_dept'
                    });

                if (error) throw error;
                window.fdcSuccess('সফলভাবে সংরক্ষণ হয়েছে!');
            }

            resetForm();
            await loadRecords();

        } catch (err) {
            console.error('Save error:', err);
            window.fdcError('সংরক্ষণ করতে সমস্যা: ' + err.message);
        } finally {
            btn.disabled = false;
            $('submitBtnText').textContent = originalText;
        }
    }

    // =========================================================
    // LOGOUT
    // =========================================================
    window.handleLogout = function () {
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try {
                    if (window.FDCAuth) {
                        await window.FDCAuth.logout();
                    } else if (window.FDC_SUPABASE) {
                        await window.FDC_SUPABASE.auth.signOut();
                    }
                } catch (e) {
                    console.warn('SignOut error:', e);
                }
                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            {
                title: 'Logout Confirmation',
                confirmText: 'Yes, Logout',
                cancelText: 'Cancel',
                confirmType: 'danger'
            }
        );
    };

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Board Final Result initializing...');

        waitForSupabase(async function () {
            $('examName').addEventListener('change', updateGroupDropdown);
            $('boardForm').addEventListener('submit', handleSubmit);
            $('cancelEditBtn').addEventListener('click', resetForm);

            ['totalStudent', 'passed', 'failed', 'absentee'].forEach(id => {
                $(id).addEventListener('input', validateNumbers);
            });

            await loadRecords();

            console.log('✅ Board Final Result ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();