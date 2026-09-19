/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN STUDENTS MANAGEMENT
 * Location: js/admin-students.js
 * Version: v9 — Smart Bulk Import + Session Copy Fix
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * 
 * ⚠️ SESSION POLICY (Bangladesh HSC):
 *    Session = ভর্তির বছর (Admission Year) — কখনো বদলায় না।
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allStudents = [];
    let filteredStudents = [];
    let currentPage = 1;
    const PAGE_SIZE = 20;

    let editingStudentId = null;
    let selectedGroupSubjects = [];
    let selectedOptionalSubject = null;

    let currentGroupSubjects = [];
    let currentOptionalSubjects = [];
    let currentCompulsorySubjects = [];

    // Bulk import state
    let bulkState = {
        config: {
            class_name: '',
            year: '',
            session: '',
            branch: '',
            group: '',
            compulsory: [],
            mainChoices: [],
            fourthSubject: ''
        },
        students: [],
        previewValid: false
    };

    // =========================================================
    // SUBJECT MAP — Group-wise rules
    // =========================================================
    const BULK_SUBJECT_MAP = {
        HSC: {
            Science: {
                compulsory: ['পদার্থবিজ্ঞান', 'রসায়ন'],
                choices: [
                    'জীববিজ্ঞান',
                    'উচ্চতর গণিত',
                    'কৃষিশিক্ষা',
                    'পরিসংখ্যান',
                    'প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস',
                    'ভূগোল',
                    'মনোবিজ্ঞান'
                ],
                rules: { mainCount: 3, optionalCount: 1, minCompulsory: 2, choiceType: 'radio' }
            },
            Business: {
                compulsory: ['হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'উৎপাদন ব্যবস্থাপনা ও বিপণন'],
                choices: ['ফিন্যান্স, ব্যাংকিং ও বিমা', 'অর্থনীতি', 'কৃষিশিক্ষা', 'পরিসংখ্যান', 'ভূগোল'],
                rules: { mainCount: 3, optionalCount: 1, minCompulsory: 3, choiceType: 'none' }
            },
            Humanities: {
                compulsory: [],
                choices: [
                    'পৌরনীতি ও সুশাসন',
                    'অর্থনীতি',
                    'যুক্তিবিদ্যা',
                    'ইসলামের ইতিহাস ও সংস্কৃতি',
                    'ইসলাম শিক্ষা',
                    'ইতিহাস',
                    'সমাজবিজ্ঞান',
                    'সমাজকর্ম',
                    'ভূগোল',
                    'কৃষিশিক্ষা',
                    'পরিসংখ্যান'
                ],
                rules: { mainCount: 3, optionalCount: 1, minCompulsory: 0, choiceType: 'checkbox' }
            }
        },
        BM: {
            'BM-General': {
                compulsory: [
                    'বাংলা-১', 'ইংরেজি-১', 'কম্পিউটার অফিস অ্যাপ্লিকেশন-১',
                    'বিজনেস ম্যাথমেটিক্স অ্যান্ড স্ট্যাটিস্টিকস',
                    'হিসাববিজ্ঞান নীতি ও প্রয়োগ-১',
                    'অর্থনীতি ও বাণিজ্যিক ভূগোল',
                    'ব্যবসায় সংগঠন ও ব্যবস্থাপনা-১',
                    'মার্কেটিং নীতি ও প্রয়োগ-১'
                ],
                choices: [],
                rules: { mainCount: 8, optionalCount: 0, minCompulsory: 8, choiceType: 'none' }
            }
        }
    };

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

    function getSessionFromYear(year) {
        if (!year) return '';
        const y = parseInt(year);
        if (isNaN(y)) return '';
        return y + '-' + (y + 1);
    }

    function getStudentSession(student) {
        if (!student) return '';
        if (student.session && String(student.session).trim() !== '') {
            return String(student.session).trim();
        }
        if (student.year) return getSessionFromYear(student.year);
        return '';
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
            if (++n > 20) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const avatar = document.querySelector('[data-admin-avatar]');
                if (avatar) {
                    if (result.admin.image_url) {
                        avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    } else {
                        avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                    }
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    // =========================================================
    // LOGOUT
    // =========================================================
    window.handleLogout = function () {
        if (!confirm('আপনি কি লগআউট করতে চান?')) return;
        (async function () {
            try {
                if (window.FDCAuth) await window.FDCAuth.logout();
            } catch (e) { console.warn(e); }
            sessionStorage.clear();
            window.location.replace('admin-login.html');
        })();
    };

    // =========================================================
    // LOAD YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -2; i <= 2; i++) years.push(currentYear + i);

        ['filterYear', 'studentYear', 'bulkYear', 'copyFromYear', 'copyToYear'].forEach(id => {
            const el = $(id);
            if (el) {
                el.innerHTML = '';
                if (id === 'filterYear') {
                    el.insertAdjacentHTML('beforeend', '<option value="">All Years</option>');
                } else if (id === 'studentYear' || id === 'bulkYear') {
                    // No default option
                } else {
                    el.insertAdjacentHTML('beforeend', '<option value="">Select</option>');
                }
                years.forEach(y => {
                    el.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
                });
            }
        });
    }

    // =========================================================
    // LOAD GROUPS BY BRANCH
    // =========================================================
    async function loadGroupsByBranch(branch, targetSelectId) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('groups')
                .select('*')
                .eq('branch', branch)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            const select = $(targetSelectId);
            if (!select) return;
            select.innerHTML = '<option value="">Select Group</option>';
            (data || []).forEach(g => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(g.group_name)}">${escapeHtml(g.display_name)}</option>`);
            });
        } catch (e) {
            console.error('Load groups error:', e);
        }
    }

    // =========================================================
    // LOAD ALL STUDENTS
    // =========================================================
    async function loadAllStudents() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('is_active', true)
                .order('class_name', { ascending: false })
                .order('roll', { ascending: true });

            if (error) throw error;
            allStudents = data || [];
            console.log('✅ Loaded students:', allStudents.length);

            updateStats();
            applyFilters();
        } catch (e) {
            console.error('Load students error:', e);
            alert('Student load failed: ' + e.message);
        }
    }

    // =========================================================
    // STATS
    // =========================================================
    function updateStats() {
        const total = allStudents.length;
        const hsc = allStudents.filter(s => s.branch === 'HSC').length;
        const bm = allStudents.filter(s => s.branch === 'BM').length;

        $('totalStudents').textContent = total;
        $('statTotal').textContent = total;
        $('statHSC').textContent = hsc;
        $('statBM').textContent = bm;
        $('statActive').textContent = total;
    }

    // =========================================================
    // FILTERS
    // =========================================================
    function applyFilters() {
        const fClass = $('filterClass').value;
        const fYear = $('filterYear').value;
        const fBranch = $('filterBranch').value;
        const fGroup = $('filterGroup').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredStudents = allStudents.filter(s => {
            if (fClass && s.class_name !== fClass) return false;
            if (fYear && s.year !== fYear) return false;
            if (fBranch && s.branch !== fBranch) return false;
            if (fGroup && s.group_name !== fGroup) return false;
            if (search) {
                const text = (s.name + ' ' + s.roll).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        currentPage = 1;
        renderStudents();
    }

    // =========================================================
    // RENDER STUDENT TABLE
    // =========================================================
    function renderStudents() {
        const tbody = $('studentTableBody');
        const pagWrap = $('paginationWrap');

        if (filteredStudents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding:0;">
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-user-graduate"></i></div>
                    <h6>কোনো student পাওয়া যায়নি</h6>
                    <p>"Add Student" বা "Bulk Import" দিয়ে নতুন যোগ করুন</p>
                </div>
            </td></tr>`;
            pagWrap.style.display = 'none';
            return;
        }

        const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, filteredStudents.length);
        const pageItems = filteredStudents.slice(start, end);

        let html = '';
        pageItems.forEach(s => {
            const groupClass = s.group_name || 'BM';
            const branchShort = s.branch === 'BM' ? 'BM' : 'HSC';

            html += `<tr data-id="${s.id}">
                <td><input type="checkbox" class="row-checkbox row-select" data-id="${s.id}"></td>
                <td><span class="cell-roll">${escapeHtml(s.roll)}</span></td>
                <td>
                    <div class="cell-name">${escapeHtml(s.name)}</div>
                    <small>Year: ${escapeHtml(s.year)} · Session: ${escapeHtml(s.session || '—')}</small>
                </td>
                <td>${escapeHtml(s.class_name)}</td>
                <td><span class="branch-tag ${branchShort}">${branchShort}</span></td>
                <td><span class="group-tag ${groupClass}">${escapeHtml(s.group_name || '—')}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" data-action="view" data-id="${s.id}" title="View"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" data-action="edit" data-id="${s.id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn subject" data-action="subject" data-id="${s.id}" title="Subjects"><i class="fas fa-book"></i></button>
                        <button class="action-btn toggle off" data-action="toggle" data-id="${s.id}" title="Deactivate"><i class="fas fa-user-slash"></i></button>
                        <button class="action-btn delete" data-action="delete" data-id="${s.id}" title="Delete Permanently"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html;
        renderPagination(totalPages, start, end);
        pagWrap.style.display = 'flex';
    }

    // =========================================================
    // PAGINATION
    // =========================================================
    function renderPagination(totalPages, start, end) {
        $('paginationInfo').textContent =
            `Showing ${start + 1}–${end} of ${filteredStudents.length}`;

        const btns = $('paginationBtns');
        let html = '';
        html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>`;

        const maxBtns = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxBtns - 1);
        if (endPage - startPage < maxBtns - 1) startPage = Math.max(1, endPage - maxBtns + 1);

        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += `<button class="page-btn" disabled>...</button>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<button class="page-btn" disabled>...</button>`;
            html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>`;

        btns.innerHTML = html;
    }

    // =========================================================
    // MODAL HELPERS
    // =========================================================
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

    // =========================================================
    // SINGLE STUDENT ADD/EDIT — (Simplified for brevity, uses same as before)
    // =========================================================
    function openAddStudentModal() {
        editingStudentId = null;
        selectedGroupSubjects = [];
        selectedOptionalSubject = null;

        $('editStudentId').value = '';
        $('studentModalTitle').textContent = 'Add New Student';
        $('studentModalSub').textContent = 'ছাত্র-ছাত্রীর তথ্য পূরণ করুন';
        $('studentModalIcon').className = 'fas fa-user-plus';
        $('saveStudentBtn').innerHTML = '<i class="fas fa-save"></i> Save Student';

        $('studentName').value = '';
        $('studentRoll').value = '';
        $('studentClass').value = '';
        $('studentYear').value = new Date().getFullYear();
        $('studentSession').value = getSessionFromYear(new Date().getFullYear());
        $('studentBranch').value = '';
        $('studentGroup').innerHTML = '<option value="">Select Group</option>';
        $('groupFieldWrap').style.display = 'none';
        $('subjectsSection').style.display = 'none';

        openModal('studentModal');
    }

    // Edit student - keep existing logic
    window.openEditStudentModal = async function (id) {
        try {
            const { data: student, error } = await window.FDC_SUPABASE
                .from('students').select('*').eq('id', id).single();
            if (error) throw error;

            const { data: selectedSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type')
                .eq('student_id', id)
                .eq('is_active', true);

            editingStudentId = id;

            $('editStudentId').value = id;
            $('studentModalTitle').textContent = 'Edit Student';
            $('studentModalSub').textContent = student.name;
            $('studentModalIcon').className = 'fas fa-user-edit';
            $('saveStudentBtn').innerHTML = '<i class="fas fa-save"></i> Update Student';

            $('studentName').value = student.name || '';
            $('studentRoll').value = student.roll || '';
            $('studentClass').value = student.class_name || '';
            $('studentYear').value = student.year || '';
            $('studentSession').value = getStudentSession(student);
            $('studentBranch').value = student.branch || '';

            if (student.branch === 'HSC') {
                await loadGroupsByBranch('HSC', 'studentGroup');
                $('groupFieldWrap').style.display = 'block';
                $('studentGroup').value = student.group_name || '';
            } else {
                $('groupFieldWrap').style.display = 'none';
            }

            $('subjectsSection').style.display = 'none'; // Disable subject editing from here

            openModal('studentModal');
        } catch (e) {
            console.error('Edit student error:', e);
            alert('Failed to load student: ' + e.message);
        }
    };

    // =========================================================
    // SAVE STUDENT — (Session fix applied)
    // =========================================================
    async function saveStudent() {
        const name = $('studentName').value.trim();
        const roll = $('studentRoll').value.trim();
        const className = $('studentClass').value;
        const year = $('studentYear').value;
        const branch = $('studentBranch').value;
        const groupName = $('studentGroup').value;

        const formSession = ($('studentSession').value || '').trim();

        if (!name) return alert('নাম দিতে হবে।');
        if (!roll) return alert('Roll দিতে হবে।');
        if (!className) return alert('Class সিলেক্ট করুন।');
        if (!year) return alert('Year সিলেক্ট করুন।');
        if (!branch) return alert('Branch সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName) return alert('Group সিলেক্ট করুন।');

        let session = formSession;
        if (!session && editingStudentId) {
            const existing = allStudents.find(s => String(s.id) === String(editingStudentId));
            if (existing) session = getStudentSession(existing);
        }
        if (!session) session = getSessionFromYear(year);

        const btn = $('saveStudentBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const studentData = {
                name, roll,
                class_name: className,
                year, session, branch,
                group_name: branch === 'HSC' ? groupName : 'BM-General'
            };

            if (editingStudentId) {
                const { error } = await window.FDC_SUPABASE
                    .from('students').update(studentData).eq('id', editingStudentId);
                if (error) throw error;
            } else {
                const { error } = await window.FDC_SUPABASE
                    .from('students').insert([studentData]).select().single();
                if (error) throw error;
            }

            alert(editingStudentId ? '✅ Student updated!' : '✅ Student created!');
            closeModal('studentModal');
            await loadAllStudents();
        } catch (e) {
            console.error('Save student error:', e);
            alert('❌ Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // TOGGLE / DELETE / VIEW — (Keep existing)
    // =========================================================
    window.toggleStudent = async function (id) {
        const s = allStudents.find(x => String(x.id) === String(id));
        if (!s) return alert('Student পাওয়া যায়নি।');
        if (!confirm(`"${s.name}" কে Deactivate করতে চান?`)) return;
        try {
            await window.FDC_SUPABASE.from('students').update({ is_active: false }).eq('id', id);
            alert('✅ Deactivated!');
            await loadAllStudents();
        } catch (e) { alert('❌ Failed: ' + e.message); }
    };

    window.deleteStudent = async function (id) {
        const s = allStudents.find(x => String(x.id) === String(id));
        if (!s) return alert('Student পাওয়া যায়নি।');
        if (!confirm(`⚠️ PERMANENT DELETE "${s.name}"?`)) return;
        const typed = prompt('Type DELETE to confirm:');
        if (!typed || typed.trim().toUpperCase() !== 'DELETE') return alert('Cancelled.');

        try {
            await window.FDC_SUPABASE.from('student_subjects').delete().eq('student_id', id);
            const { data: results } = await window.FDC_SUPABASE.from('results').select('id').eq('student_id', id);
            if (results && results.length > 0) {
                await window.FDC_SUPABASE.from('result_details').delete().in('result_id', results.map(r => r.id));
            }
            await window.FDC_SUPABASE.from('results').delete().eq('student_id', id);
            await window.FDC_SUPABASE.from('students').delete().eq('id', id);
            alert('✅ Deleted!');
            await loadAllStudents();
        } catch (e) { alert('❌ Delete failed: ' + e.message); }
    };

    window.viewStudent = async function (id) {
        const student = allStudents.find(s => String(s.id) === String(id));
        if (!student) return alert('Student পাওয়া যায়নি।');

        try {
            const { data: subs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_type, subject_id, subjects(subject_name, subject_code)')
                .eq('student_id', id);

            const compSubs = (subs || []).filter(s => s.subject_type === 'compulsory');
            const grpSubs = (subs || []).filter(s => s.subject_type === 'group');
            const optSubs = (subs || []).filter(s => s.subject_type === 'optional');

            function renderList(list) {
                if (list.length === 0) return '<div style="color:var(--grey);font-size:12px;">কিছু নেই</div>';
                return list.map(s => `<div style="padding:4px 0;font-size:12.5px;">• ${escapeHtml(s.subjects?.subject_name || '—')}</div>`).join('');
            }

            const html = `
                <div style="margin-bottom:16px;">
                    <div style="font-size:11px;color:var(--grey);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Student Info</div>
                    <div style="margin-top:8px;font-size:14px;line-height:1.8;">
                        <div><strong>Name:</strong> ${escapeHtml(student.name)}</div>
                        <div><strong>Roll:</strong> ${escapeHtml(student.roll)}</div>
                        <div><strong>Class:</strong> ${escapeHtml(student.class_name)}</div>
                        <div><strong>Branch:</strong> ${escapeHtml(student.branch)}</div>
                        <div><strong>Group:</strong> ${escapeHtml(student.group_name || '—')}</div>
                        <div><strong>Year:</strong> ${escapeHtml(student.year)}</div>
                        <div><strong>Session:</strong> ${escapeHtml(student.session || '—')}</div>
                    </div>
                </div>
                <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-light);">
                    <div style="font-size:11px;color:var(--grey);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Subjects</div>
                    <div style="margin-bottom:12px;"><div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">📌 আবশ্যিক</div>${renderList(compSubs)}</div>
                    <div style="margin-bottom:12px;"><div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">📚 গ্রুপের</div>${renderList(grpSubs)}</div>
                    <div><div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">🎯 ঐচ্ছিক</div>${renderList(optSubs)}</div>
                </div>
            `;
            $('viewStudentBody').innerHTML = html;
            openModal('viewStudentModal');
        } catch (e) { alert('Load failed: ' + e.message); }
    };

    // =========================================================
    // ★★★ BULK IMPORT SYSTEM ★★★
    // =========================================================

    // Reset Modal
    function resetBulkModal() {
        bulkState = {
            config: {
                class_name: '', year: '', session: '', branch: '', group: '',
                compulsory: [], mainChoices: [], fourthSubject: ''
            },
            students: [],
            previewValid: false
        };

        $('bulkClass').value = '';
        $('bulkYear').value = new Date().getFullYear();
        $('bulkSession').value = getSessionFromYear(new Date().getFullYear());
        $('bulkBranch').value = '';
        $('bulkGroup').innerHTML = '<option value="">Select Group</option>';
        $('bulkGroupFieldWrap').style.display = 'none';
        $('bulkData').value = '';
        $('bulkRangeStart').value = '';
        $('bulkRangeEnd').value = '';

        $('bulkMainSubjectsStep').style.display = 'none';
        $('bulk4thSubjectStep').style.display = 'none';
        $('bulkStudentsStep').style.display = 'none';
        $('bulkSummary').style.display = 'none';
        $('bulkPreview').style.display = 'none';
        $('saveBulkBtn').disabled = true;
    }

    // Year change
    function onBulkYearChange() {
        const year = $('bulkYear').value;
        $('bulkSession').value = getSessionFromYear(year);
        bulkState.config.year = year;
        bulkState.config.session = getSessionFromYear(year);
        updateBulkSummary();
    }

    // Class change
    function onBulkClassChange() {
        bulkState.config.class_name = $('bulkClass').value;
        updateBulkSummary();
    }

    // Branch change
    async function onBulkBranchChange() {
        const branch = $('bulkBranch').value;
        bulkState.config.branch = branch;

        if (branch === 'HSC') {
            $('bulkGroupFieldWrap').style.display = 'block';
            await loadBulkGroups('HSC');
        } else if (branch === 'BM') {
            $('bulkGroupFieldWrap').style.display = 'block';
            $('bulkGroup').innerHTML = '<option value="BM-General">BM-General</option>';
        } else {
            $('bulkGroupFieldWrap').style.display = 'none';
            $('bulkGroup').innerHTML = '<option value="">Select Group</option>';
        }

        resetBulkSubjectsUI();
    }

    async function loadBulkGroups(branch) {
        try {
            const { data } = await window.FDC_SUPABASE
                .from('groups')
                .select('*')
                .eq('branch', branch)
                .eq('is_active', true)
                .order('sort_order');

            const select = $('bulkGroup');
            select.innerHTML = '<option value="">Select Group</option>';
            (data || []).forEach(g => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(g.group_name)}">${escapeHtml(g.display_name)}</option>`);
            });
        } catch (e) { console.error('Load groups error:', e); }
    }

    // Group change — Render subjects
    async function onBulkGroupChange() {
        const branch = $('bulkBranch').value;
        const group = $('bulkGroup').value;
        bulkState.config.group = group;

        if (!branch || !group) {
            resetBulkSubjectsUI();
            return;
        }

        const config = BULK_SUBJECT_MAP[branch]?.[group];
        if (!config) {
            alert('এই group-এর config পাওয়া যায়নি।');
            return;
        }

        bulkState.config.compulsory = [...config.compulsory];
        bulkState.config.mainChoices = [];

        renderBulkCompulsory(config.compulsory);
        renderBulkMainChoices(config, group);

        $('bulkMainSubjectsStep').style.display = 'block';
        $('bulkStudentsStep').style.display = 'block';

        updateBulkSummary();
    }

    function resetBulkSubjectsUI() {
        $('bulkMainSubjectsStep').style.display = 'none';
        $('bulk4thSubjectStep').style.display = 'none';
        $('bulkSummary').style.display = 'none';
        $('bulkPreview').style.display = 'none';
        $('saveBulkBtn').disabled = true;
        bulkState.config.compulsory = [];
        bulkState.config.mainChoices = [];
        bulkState.config.fourthSubject = '';
    }

    function renderBulkCompulsory(compulsory) {
        const el = $('bulkCompulsoryChips');
        if (compulsory.length === 0) {
            el.innerHTML = '<div style="color:var(--grey);font-size:12px;">কোনো compulsory subject নেই — নিজে select করুন।</div>';
            return;
        }
        el.innerHTML = compulsory.map(s =>
            `<span class="chip"><i class="fas fa-check-circle"></i> ${escapeHtml(s)}</span>`
        ).join('');
    }

    function renderBulkMainChoices(config, group) {
        const container = $('bulkMainChoiceList');
        const title = $('bulkMainChoiceTitle');
        const remaining = config.rules.mainCount - config.compulsory.length;

        if (group === 'Humanities') {
            title.innerHTML = `<i class="fas fa-layer-group"></i> Main Subjects (৩টি select করুন)`;
        } else if (group === 'Science') {
            title.innerHTML = `<i class="fas fa-layer-group"></i> 3rd Main Subject (১টি select করুন)`;
        } else if (group === 'Business') {
            title.innerHTML = `<i class="fas fa-layer-group"></i> সব compulsory — কিছু করতে হবে না`;
        }

        if (remaining <= 0) {
            container.innerHTML = '';
            $('bulkMainChoiceSection').style.display = 'none';
            prepareBulk4thSubject(config, group);
            return;
        }

        $('bulkMainChoiceSection').style.display = 'block';

        const inputType = (group === 'Humanities') ? 'checkbox' : 'radio';
        const inputName = (group === 'Humanities') ? 'bulkMainCheck' : 'bulkMainRadio';

        container.innerHTML = config.choices.map(s => `
            <label class="bulk-subject-item" data-subject="${escapeHtml(s)}">
                <input type="${inputType}" name="${inputName}" value="${escapeHtml(s)}">
                <span class="bsi-name">${escapeHtml(s)}</span>
            </label>
        `).join('');

        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', onBulkMainChoiceChange);
        });
    }

    function onBulkMainChoiceChange(e) {
        const config = BULK_SUBJECT_MAP[bulkState.config.branch][bulkState.config.group];
        const group = bulkState.config.group;
        const remaining = config.rules.mainCount - config.compulsory.length;

        if (group === 'Humanities') {
            const checked = Array.from(document.querySelectorAll('input[name="bulkMainCheck"]:checked')).map(i => i.value);
            if (checked.length > remaining) {
                e.target.checked = false;
                alert(`সর্বোচ্চ ${remaining}টি select করা যাবে।`);
                return;
            }
            bulkState.config.mainChoices = checked;
        } else {
            bulkState.config.mainChoices = [e.target.value];
        }

        document.querySelectorAll('#bulkMainChoiceList .bulk-subject-item').forEach(item => {
            const inp = item.querySelector('input');
            item.classList.toggle('checked', inp.checked);
        });

        if (bulkState.config.mainChoices.length === remaining) {
            prepareBulk4thSubject(config, group);
        } else {
            $('bulk4thSubjectStep').style.display = 'none';
        }

        updateBulkSummary();
    }

    function prepareBulk4thSubject(config, group) {
        if (config.rules.optionalCount === 0) {
            $('bulk4thSubjectStep').style.display = 'none';
            bulkState.config.fourthSubject = '';
            return;
        }

        const used = [...config.compulsory, ...bulkState.config.mainChoices];
        const available = config.choices.filter(s => !used.includes(s));

        const select = $('bulk4thSubject');
        select.innerHTML = '<option value="">Select 4th Subject</option>';
        available.forEach(s => {
            select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`);
        });

        bulkState.config.fourthSubject = '';
        $('bulk4thSubjectStep').style.display = 'block';
    }

    function onBulk4thSubjectChange() {
        bulkState.config.fourthSubject = $('bulk4thSubject').value;
        updateBulkSummary();
    }

    function updateBulkSummary() {
        const cfg = bulkState.config;

        if (!cfg.group) {
            $('bulkSummary').style.display = 'none';
            $('saveBulkBtn').disabled = true;
            return;
        }

        const rules = BULK_SUBJECT_MAP[cfg.branch]?.[cfg.group]?.rules;
        if (!rules) return;

        const mainTotal = cfg.compulsory.length + cfg.mainChoices.length;
        const isComplete = mainTotal === rules.mainCount &&
                          (rules.optionalCount === 0 || cfg.fourthSubject);

        let html = `
            <div><strong>Class:</strong> ${escapeHtml(cfg.class_name || '—')} / <strong>Year:</strong> ${escapeHtml(cfg.year || '—')} / <strong>Session:</strong> ${escapeHtml(cfg.session || '—')}</div>
            <div><strong>Branch:</strong> ${escapeHtml(cfg.branch || '—')} / <strong>Group:</strong> ${escapeHtml(cfg.group || '—')}</div>
            <div><strong>Compulsory:</strong> ${cfg.compulsory.length > 0 ? cfg.compulsory.map(escapeHtml).join(', ') : '—'}</div>
            <div><strong>Main Choices:</strong> ${cfg.mainChoices.length > 0 ? cfg.mainChoices.map(escapeHtml).join(', ') : '—'}</div>
            <div><strong>4th Subject:</strong> ${escapeHtml(cfg.fourthSubject || '—')}</div>
        `;

        if (!isComplete) {
            html += `<div style="color:#b45309;font-weight:700;margin-top:6px;">⚠️ কিছু তথ্য বাকি</div>`;
        } else {
            html += `<div style="color:#166534;font-weight:700;margin-top:6px;">✅ সব তথ্য পূর্ণ</div>`;
        }

        $('bulkSummaryBody').innerHTML = html;
        $('bulkSummary').style.display = 'block';
    }

    function generateBulkRange() {
        const start = parseInt($('bulkRangeStart').value);
        const end = parseInt($('bulkRangeEnd').value);

        if (!start || !end || end < start) return alert('সঠিক roll range দিন।');
        if (end - start > 500) return alert('সর্বোচ্চ ৫০০ roll।');

        const lines = [];
        for (let i = start; i <= end; i++) lines.push(`${i}, `);

        const current = $('bulkData').value.trim();
        $('bulkData').value = current ? current + '\n' + lines.join('\n') : lines.join('\n');
        alert(`${end - start + 1}টি roll generate হয়েছে।`);
    }

    function parseBulkStudents() {
        const raw = $('bulkData').value.trim();
        if (!raw) return [];

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = [];

        lines.forEach((line, idx) => {
            const parts = line.split(/\t|,| {2,}/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 1) {
                rows.push({
                    line_no: idx + 1,
                    roll: parts[0] || '',
                    name: parts[1] || '',
                    fourth_override: parts[2] || '',
                    row_status: 'pending'
                });
            }
        });

        return rows;
    }

    async function previewBulkImport() {
        const cfg = bulkState.config;

        if (!cfg.class_name || !cfg.year || !cfg.branch || !cfg.group) {
            return alert('Common settings পূরণ করুন।');
        }

        const rules = BULK_SUBJECT_MAP[cfg.branch]?.[cfg.group]?.rules;
        const mainTotal = cfg.compulsory.length + cfg.mainChoices.length;

        if (mainTotal !== rules.mainCount) {
            return alert(`Main-এ ${rules.mainCount}টি subject থাকতে হবে। এখন ${mainTotal}টি।`);
        }
        if (rules.optionalCount > 0 && !cfg.fourthSubject) {
            return alert('৪র্থ Subject select করুন।');
        }

        const students = parseBulkStudents();
        if (students.length === 0) return alert('কোনো student নেই।');

        // Internal duplicates
        const rollMap = new Map();
        students.forEach(s => {
            if (!s.roll) { s.row_status = 'error'; s.error_msg = 'No roll'; return; }
            if (rollMap.has(s.roll)) {
                s.row_status = 'error';
                s.error_msg = 'Duplicate roll';
                rollMap.get(s.roll).row_status = 'error';
                rollMap.get(s.roll).error_msg = 'Duplicate roll';
            } else {
                rollMap.set(s.roll, s);
            }
        });

        // DB duplicates
        const rolls = students.map(s => s.roll).filter(r => r);
        if (rolls.length > 0) {
            const { data: existing } = await window.FDC_SUPABASE
                .from('students')
                .select('roll')
                .eq('class_name', cfg.class_name)
                .eq('year', cfg.year)
                .eq('branch', cfg.branch)
                .in('roll', rolls);

            const existingRolls = new Set((existing || []).map(e => e.roll));
            students.forEach(s => {
                if (existingRolls.has(s.roll) && s.row_status !== 'error') {
                    s.row_status = 'warn';
                    s.warn_msg = 'DB-তে আছে';
                }
            });
        }

        // Validate 4th subject override
        if (rules.optionalCount > 0) {
            const usedMain = [...cfg.compulsory, ...cfg.mainChoices];
            students.forEach(s => {
                if (s.fourth_override) {
                    if (usedMain.includes(s.fourth_override)) {
                        s.row_status = 'error';
                        s.error_msg = `4th subject main-এ আছে`;
                    }
                } else {
                    s.fourth_override = cfg.fourthSubject;
                }
            });
        }

        bulkState.students = students;
        renderBulkPreview(students);

        const hasErrors = students.some(s => s.row_status === 'error');
        $('saveBulkBtn').disabled = hasErrors;

        if (!hasErrors) {
            const warnings = students.filter(s => s.row_status === 'warn').length;
            if (warnings > 0) {
                alert(`⚠️ ${warnings}টি student DB-তে আগেই আছে — skip হবে।`);
            }
        }
    }

    function renderBulkPreview(students) {
        const cfg = bulkState.config;
        const tbody = $('bulkPreviewBody');

        tbody.innerHTML = students.map((s, i) => {
            let statusBadge = '<span class="preview-status-badge ok">OK</span>';
            let rowClass = '';

            if (s.row_status === 'error') {
                statusBadge = `<span class="preview-status-badge error" title="${escapeHtml(s.error_msg || '')}">Error</span>`;
                rowClass = 'error';
            } else if (s.row_status === 'warn') {
                statusBadge = `<span class="preview-status-badge warn" title="${escapeHtml(s.warn_msg || '')}">Skip</span>`;
                rowClass = 'warn';
            }

            return `<tr class="${rowClass}">
                <td>${i + 1}</td>
                <td>${escapeHtml(s.roll || '—')}</td>
                <td>${escapeHtml(s.name || '—')}</td>
                <td>${escapeHtml(s.fourth_override || cfg.fourthSubject || '—')}</td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');

        $('bulkPreviewCount').textContent = `(${students.length} students)`;
        $('bulkPreview').style.display = 'block';
    }

    async function saveBulkImport() {
        const cfg = bulkState.config;
        const students = bulkState.students.filter(s => s.row_status !== 'error' && s.row_status !== 'warn');

        if (students.length === 0) {
            return alert('কোনো valid student নেই।');
        }

        if (!confirm(`${students.length} জন student যোগ করা হবে। নিশ্চিত?`)) return;

        const btn = $('saveBulkBtn');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // 1. Insert students
            const records = students.map(s => ({
                name: s.name,
                roll: s.roll,
                class_name: cfg.class_name,
                year: cfg.year,
                session: cfg.session,
                branch: cfg.branch,
                group_name: cfg.branch === 'HSC' ? cfg.group : 'BM-General',
                is_active: true
            }));

            const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                .from('students')
                .insert(records)
                .select();

            if (insErr) throw insErr;

            // 2. Assign subjects to each student
            const allSubjects = await loadAllSubjectsForBulk(cfg);

            for (const stu of (inserted || [])) {
                const matched = students.find(s => s.roll === stu.roll);
                if (!matched) continue;

                const subjectRecords = [];
                const used = new Set();

                // Compulsory
                allSubjects.compulsory.forEach(sub => {
                    if (!used.has(sub.id)) {
                        used.add(sub.id);
                        subjectRecords.push({
                            student_id: stu.id,
                            subject_id: sub.id,
                            subject_type: 'compulsory'
                        });
                    }
                });

                // Main choices (group subjects)
                allSubjects.group.forEach(sub => {
                    if (cfg.mainChoices.includes(sub.subject_name) && !used.has(sub.id)) {
                        used.add(sub.id);
                        subjectRecords.push({
                            student_id: stu.id,
                            subject_id: sub.id,
                            subject_type: 'group'
                        });
                    }
                });

                // 4th subject
                const fourthName = matched.fourth_override || cfg.fourthSubject;
                if (fourthName) {
                    const fourthSubjects = allSubjects.optional.filter(s => s.subject_name === fourthName);
                    fourthSubjects.forEach(sub => {
                        if (!used.has(sub.id)) {
                            used.add(sub.id);
                            subjectRecords.push({
                                student_id: stu.id,
                                subject_id: sub.id,
                                subject_type: 'optional'
                            });
                        }
                    });
                }

                if (subjectRecords.length > 0) {
                    await window.FDC_SUPABASE.from('student_subjects').insert(subjectRecords);
                }
            }

            alert(`✅ ${inserted.length} জন student সফলভাবে যোগ হয়েছে!`);
            closeModal('bulkImportModal');
            await loadAllStudents();

        } catch (e) {
            console.error('Bulk save error:', e);
            alert('❌ Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function loadAllSubjectsForBulk(cfg) {
        const { data, error } = await window.FDC_SUPABASE
            .from('subjects')
            .select('*')
            .eq('branch', cfg.branch)
            .eq('class_name', cfg.class_name)
            .eq('is_active', true);

        if (error) throw error;

        const subjects = data || [];
        const isHSC = cfg.branch === 'HSC';

        return {
            compulsory: subjects.filter(s => {
                if (s.subject_type !== 'compulsory') return false;
                if (isHSC) return !s.group_name;
                return true;
            }),
            group: subjects.filter(s => s.subject_type === 'group' && s.group_name === cfg.group),
            optional: subjects.filter(s => s.subject_type === 'optional' && s.group_name === cfg.group)
        };
    }

    // =========================================================
    // COPY / MOVE YEAR
    // =========================================================
    function getCopyMode() {
        const radios = document.querySelectorAll('input[name="copyMode"]');
        for (const r of radios) if (r.checked) return r.value;
        return 'copy';
    }

    function updateCopyModeUI(mode) {
        const copyLabel = $('modeCopyLabel');
        const moveLabel = $('modeMoveLabel');
        const replaceLabel = $('modeReplaceLabel');
        const moveWarning = $('moveWarning');
        const replaceWarning = $('replaceWarning');
        const replaceBox = $('replaceConfirmBox');
        const btnText = $('applyCopyBtnText');
        const btnIcon = $('applyCopyIcon');
        const btn = $('applyCopyBtn');
        const modalIcon = $('copyModalIcon');
        const modalTitle = $('copyModalTitle');
        const modalSub = $('copyModalSub');

        [copyLabel, moveLabel, replaceLabel].forEach(l => {
            if (l) l.classList.remove('selected', 'move', 'replace');
        });
        if (moveWarning) moveWarning.classList.remove('show');
        if (replaceWarning) replaceWarning.classList.remove('show');
        if (replaceBox) replaceBox.style.display = 'none';

        if (mode === 'replace') {
            if (replaceLabel) replaceLabel.classList.add('selected', 'replace');
            if (replaceWarning) replaceWarning.classList.add('show');
            if (replaceBox) replaceBox.style.display = 'block';
            if (btnText) btnText.textContent = 'Move & Replace';
            if (btnIcon) btnIcon.className = 'fas fa-sync-alt';
            if (modalTitle) modalTitle.textContent = 'Move & Replace';
            if (modalSub) modalSub.textContent = 'Target-এর পুরোনো সব delete হবে';
        } else if (mode === 'move') {
            if (moveLabel) moveLabel.classList.add('selected', 'move');
            if (moveWarning) moveWarning.classList.add('show');
            if (btnText) btnText.textContent = 'Move Students';
            if (btnIcon) btnIcon.className = 'fas fa-exchange-alt';
            if (modalTitle) modalTitle.textContent = 'Move Year';
            if (modalSub) modalSub.textContent = 'Source থেকে delete হবে';
        } else {
            if (copyLabel) copyLabel.classList.add('selected');
            if (btnText) btnText.textContent = 'Copy Students';
            if (btnIcon) btnIcon.className = 'fas fa-copy';
            if (modalTitle) modalTitle.textContent = 'Copy Year';
            if (modalSub) modalSub.textContent = 'Source-এ থাকবে, target-এ যোগ';
        }
    }

    async function copyCheck() {
        const fromCls = $('copyFromClass').value;
        const fromYear = $('copyFromYear').value;
        const toCls = $('copyToClass').value;
        const toYear = $('copyToYear').value;
        const branch = $('copyFromBranch').value;
        const mode = getCopyMode();

        updateCopyModeUI(mode);

        if (!fromCls || !fromYear || !toCls || !toYear) {
            $('copyInfo').style.display = 'none';
            $('applyCopyBtn').disabled = true;
            return;
        }

        let query = window.FDC_SUPABASE.from('students').select('*')
            .eq('class_name', fromCls).eq('year', fromYear).eq('is_active', true);
        if (branch) query = query.eq('branch', branch);

        const { data: sourceStudents } = await query;
        const sourceCount = (sourceStudents || []).length;

        let targetCount = 0;
        if (mode === 'replace') {
            let tq = window.FDC_SUPABASE.from('students').select('id', { count: 'exact', head: true })
                .eq('class_name', toCls).eq('year', toYear).eq('is_active', true);
            if (branch) tq = tq.eq('branch', branch);
            const { count } = await tq;
            targetCount = count || 0;
        }

        if (sourceCount === 0) {
            $('copyInfoText').innerHTML = `⚠️ Source-এ কোনো student নেই।`;
            $('copyInfo').className = 'fdc-alert danger';
            $('copyInfo').style.display = 'flex';
            $('applyCopyBtn').disabled = true;
        } else {
            const sampleSession = sourceStudents?.[0] ? getStudentSession(sourceStudents[0]) : getSessionFromYear(fromYear);
            let infoHtml = `<strong>${sourceCount} জন</strong> student`;
            infoHtml += `<br><span style="color:var(--navy);font-weight:700;">🎓 Session থাকবে: ${escapeHtml(sampleSession)}</span>`;
            if (mode === 'replace' && targetCount > 0) {
                infoHtml += `<br><span style="color:#7f1d1d;font-weight:700;">⚠️ Target-এ ${targetCount} জন delete হবে।</span>`;
            }
            $('copyInfoText').innerHTML = infoHtml;
            $('copyInfo').className = 'fdc-alert warn';
            $('copyInfo').style.display = 'flex';
            $('applyCopyBtn').disabled = false;
        }

        const sourceSessionDisplay = sourceStudents?.[0] ? getStudentSession(sourceStudents[0]) : getSessionFromYear(fromYear);
        $('copyToSession').value = sourceSessionDisplay;

        if (mode === 'replace') {
            const confirmText = 'DELETE ' + toYear;
            $('replaceConfirmText').textContent = confirmText;
            $('replaceConfirmInput').value = '';
            $('replaceConfirmInput').placeholder = 'টাইপ করুন: ' + confirmText;
        }

        window._copyData = {
            fromCls, fromYear, toCls, toYear, branch,
            students: sourceStudents || [],
            mode, targetCount
        };
    }

    async function assignSubjectsToNewStudent(newStudent, oldStudent, targetClass) {
        try {
            const { data: oldSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type')
                .eq('student_id', oldStudent.id);

            if (!oldSubs || oldSubs.length === 0) return;

            const records = [];
            for (const os of oldSubs) {
                records.push({
                    student_id: newStudent.id,
                    subject_id: os.subject_id,
                    subject_type: os.subject_type
                });
            }

            if (records.length > 0) {
                await window.FDC_SUPABASE.from('student_subjects').insert(records);
            }
        } catch (e) { console.error('Assign subjects error:', e); }
    }

    async function copyApply() {
        if (!window._copyData || window._copyData.students.length === 0) return;

        const { toCls, toYear, students, mode, branch } = window._copyData;
        const isMove = (mode === 'move');
        const isReplace = (mode === 'replace');

        if (isReplace) {
            const confirmText = 'DELETE ' + toYear;
            const typed = $('replaceConfirmInput').value.trim().toUpperCase();
            if (typed !== confirmText) return alert(`"${confirmText}" টাইপ করুন।`);
        }

        const confirmed = confirm(`${students.length} জন ${mode === 'copy' ? 'COPY' : 'MOVE'} হবে। নিশ্চিত?`);
        if (!confirmed) return;

        try {
            if (isReplace) {
                let tq = window.FDC_SUPABASE.from('students').select('id')
                    .eq('class_name', toCls).eq('year', toYear).eq('is_active', true);
                if (branch) tq = tq.eq('branch', branch);
                const { data: targetStudents } = await tq;

                if (targetStudents && targetStudents.length > 0) {
                    const targetIds = targetStudents.map(s => s.id);
                    await window.FDC_SUPABASE.from('student_subjects').delete().in('student_id', targetIds);
                    await window.FDC_SUPABASE.from('students').delete().in('id', targetIds);
                }
            }

            const records = students.map(s => ({
                name: s.name, roll: s.roll,
                class_name: toCls, year: toYear,
                session: getStudentSession(s),
                branch: s.branch, group_name: s.group_name
            }));

            const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                .from('students').insert(records).select();

            if (insErr) throw insErr;

            const insertedList = inserted || [];
            for (let i = 0; i < insertedList.length; i++) {
                if (students[i]) await assignSubjectsToNewStudent(insertedList[i], students[i], toCls);
            }

            if (isMove || isReplace) {
                const sourceIds = students.map(s => s.id);
                await window.FDC_SUPABASE.from('student_subjects').delete().in('student_id', sourceIds);
                await window.FDC_SUPABASE.from('students').delete().in('id', sourceIds);
            }

            alert(`✅ ${insertedList.length} জন ${mode === 'copy' ? 'copy' : 'move'} হয়েছে!`);
            closeModal('copyYearModal');
            await loadAllStudents();
        } catch (e) {
            console.error('Copy/Move error:', e);
            alert('❌ Failed: ' + e.message);
        }
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('btnAddStudent').addEventListener('click', openAddStudentModal);
        $('closeStudentModal').addEventListener('click', () => closeModal('studentModal'));
        $('cancelStudentBtn').addEventListener('click', () => closeModal('studentModal'));
        $('saveStudentBtn').addEventListener('click', saveStudent);

        $('studentBranch').addEventListener('change', async function () {
            const branch = this.value;
            if (branch === 'HSC') {
                await loadGroupsByBranch('HSC', 'studentGroup');
                $('groupFieldWrap').style.display = 'block';
            } else {
                $('groupFieldWrap').style.display = 'none';
            }
        });

        ['filterClass', 'filterYear', 'filterBranch', 'filterGroup'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        $('studentTableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'view') window.viewStudent(id);
            else if (action === 'edit') window.openEditStudentModal(id);
            else if (action === 'toggle') window.toggleStudent(id);
            else if (action === 'delete') window.deleteStudent(id);
        });

        $('paginationBtns').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            currentPage = parseInt(btn.dataset.page);
            renderStudents();
            window.scrollTo({ top: 200, behavior: 'smooth' });
        });

        $('selectAll').addEventListener('change', function () {
            document.querySelectorAll('.row-select').forEach(cb => cb.checked = this.checked);
        });

        // ★ BULK IMPORT EVENTS ★
        $('btnBulkImport').addEventListener('click', () => {
            resetBulkModal();
            openModal('bulkImportModal');
        });

        $('closeBulkModal').addEventListener('click', () => closeModal('bulkImportModal'));
        $('cancelBulkBtn').addEventListener('click', () => closeModal('bulkImportModal'));

        $('bulkClass').addEventListener('change', onBulkClassChange);
        $('bulkYear').addEventListener('change', onBulkYearChange);
        $('bulkBranch').addEventListener('change', onBulkBranchChange);
        $('bulkGroup').addEventListener('change', onBulkGroupChange);
        $('bulk4thSubject').addEventListener('change', onBulk4thSubjectChange);

        $('btnGenerateRange').addEventListener('click', generateBulkRange);
        $('previewBulkBtn').addEventListener('click', previewBulkImport);
        $('saveBulkBtn').addEventListener('click', saveBulkImport);

        // COPY / MOVE
        $('btnCopyYear').addEventListener('click', () => {
            openModal('copyYearModal');
            const copyRadio = document.querySelector('input[name="copyMode"][value="copy"]');
            if (copyRadio) copyRadio.checked = true;
            updateCopyModeUI('copy');
            copyCheck();
        });
        $('closeCopyModal').addEventListener('click', () => closeModal('copyYearModal'));
        $('cancelCopyBtn').addEventListener('click', () => closeModal('copyYearModal'));

        ['copyFromClass', 'copyFromYear', 'copyToClass', 'copyToYear', 'copyFromBranch'].forEach(id => {
            $(id).addEventListener('change', copyCheck);
        });

        document.querySelectorAll('input[name="copyMode"]').forEach(radio => {
            radio.addEventListener('change', function () {
                updateCopyModeUI(this.value);
                if (window._copyData) copyCheck();
            });
        });

        $('applyCopyBtn').addEventListener('click', copyApply);

        $('closeViewModal').addEventListener('click', () => closeModal('viewStudentModal'));
        $('closeViewBtn').addEventListener('click', () => closeModal('viewStudentModal'));

        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Students v9 initializing...');

        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllStudents();

            console.log('✅ Admin Students v9 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();