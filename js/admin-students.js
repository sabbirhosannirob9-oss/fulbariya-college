/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN STUDENTS MANAGEMENT
 * Location: js/admin-students.js
 * Version: v10 — Correct Subject Handling
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * 
 * ⚠️ SESSION POLICY (Bangladesh HSC):
 *    Session = ভর্তির বছর — কখনো বদলায় না।
 * 
 * ✅ SUBJECT STRUCTURE:
 *    HSC Compulsory (সব): বাংলা, English, ICT
 *    Science: পদার্থ+রসায়ন fixed, 3rd choice (জীব/গণিত), 4th = বাকি
 *    Business: 3 select from 8, 4th = বাকি
 *    Humanities: 3 select from 7, 4th = বাকি
 *    BMT: 8 fixed compulsory
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // SUBJECT STRUCTURE — Bangladesh HSC Standard
    // =========================================================
    const SUBJECT_STRUCTURE = {
        HSC: {
            // সব HSC group-এ same compulsory
            globalCompulsory: ['বাংলা', 'English', 'ICT'],

            Science: {
                type: 'fixed_choice',  // Fixed 2 + Choice 1
                fixedMain: ['পদার্থবিজ্ঞান', 'রসায়ন'],
                choiceMain: ['জীববিজ্ঞান', 'উচ্চতর গণিত'],
                mainCount: 3,
                fourthPool: [
                    'জীববিজ্ঞান', 'উচ্চতর গণিত', 'কৃষিশিক্ষা',
                    'পরিসংখ্যান', 'প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস',
                    'ভূগোল', 'মনোবিজ্ঞান'
                ],
                hasFourth: true
            },

            Business: {
                type: 'select_3',  // 3 select from pool
                mainPool: [
                    'হিসাববিজ্ঞান',
                    'ব্যবসায় সংগঠন ও ব্যবস্থাপনা',
                    'উৎপাদন ব্যবস্থাপনা ও বিপণন',
                    'অর্থনীতি',
                    'ফিন্যান্স, ব্যাংকিং ও বিমা',
                    'পরিসংখ্যান',
                    'কৃষিশিক্ষা',
                    'ভূগোল'
                ],
                mainCount: 3,
                fourthPool: [
                    'অর্থনীতি', 'কৃষিশিক্ষা', 'পরিসংখ্যান',
                    'ফিন্যান্স, ব্যাংকিং ও বিমা', 'ভূগোল',
                    'হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা',
                    'উৎপাদন ব্যবস্থাপনা ও বিপণন'
                ],
                hasFourth: true
            },

            Humanities: {
                type: 'select_3',
                mainPool: [
                    'পৌরনীতি ও সুশাসন',
                    'অর্থনীতি',
                    'যুক্তিবিদ্যা',
                    'ইসলামের ইতিহাস ও সংস্কৃতি',
                    'ইসলাম শিক্ষা',
                    'ইতিহাস',
                    'সমাজবিজ্ঞান',
                    'সমাজকর্ম'
                ],
                mainCount: 3,
                fourthPool: [
                    'পৌরনীতি ও সুশাসন', 'অর্থনীতি', 'যুক্তিবিদ্যা',
                    'ইসলামের ইতিহাস ও সংস্কৃতি', 'ইসলাম শিক্ষা', 'ইতিহাস',
                    'সমাজবিজ্ঞান', 'সমাজকর্ম', 'কৃষিশিক্ষা',
                    'পরিসংখ্যান', 'ভূগোল'
                ],
                hasFourth: true
            }
        },

        BM: {
            'BM-General': {
                type: 'all_fixed',
                mainFixed: [
                    'বাংলা-১', 'ইংরেজি-১', 'কম্পিউটার অফিস অ্যাপ্লিকেশন-১',
                    'বিজনেস ম্যাথমেটিক্স অ্যান্ড স্ট্যাটিস্টিকস',
                    'হিসাববিজ্ঞান নীতি ও প্রয়োগ-১',
                    'অর্থনীতি ও বাণিজ্যিক ভূগোল',
                    'ব্যবসায় সংগঠন ও ব্যবস্থাপনা-১',
                    'মার্কেটিং নীতি ও প্রয়োগ-১'
                ],
                mainCount: 8,
                hasFourth: false
            }
        }
    };

    // =========================================================
    // STATE
    // =========================================================
    let allStudents = [];
    let filteredStudents = [];
    let currentPage = 1;
    const PAGE_SIZE = 20;

    let editingStudentId = null;

    // Bulk import state
    let bulkState = {
        config: {
            class_name: '',
            year: '',
            session: '',
            branch: '',
            group: '',
            mainSelected: [],       // Main subject names
            fourthSubject: ''       // Default 4th
        },
        allSubjects: [],            // All subjects from DB for this class/branch/group
        compulsorySubjects: [],     // Compulsory subjects (বাংলা, English, ICT)
        mainSubjects: [],           // Main subjects available
        fourthSubjects: [],         // 4th subject options
        students: [],               // Parsed students
        previewValid: false
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

        ['filterYear', 'studentYear', 'bulkYear'].forEach(id => {
            const el = $(id);
            if (!el) return;
            el.innerHTML = '';
            if (id === 'filterYear') {
                el.insertAdjacentHTML('beforeend', '<option value="">All Years</option>');
            } else {
                el.insertAdjacentHTML('beforeend', '<option value="">Select Year</option>');
            }
            years.forEach(y => {
                el.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
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
        $('paginationInfo').textContent = `Showing ${start + 1}–${end} of ${filteredStudents.length}`;
        const btns = $('paginationBtns');
        let html = '';
        html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

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
        html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
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
    // SINGLE STUDENT ADD
    // =========================================================
    function openAddStudentModal() {
        editingStudentId = null;
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

        openModal('studentModal');
    }

    // =========================================================
    // EDIT STUDENT
    // =========================================================
    window.openEditStudentModal = async function (id) {
        try {
            const { data: student, error } = await window.FDC_SUPABASE
                .from('students').select('*').eq('id', id).single();
            if (error) throw error;

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

            openModal('studentModal');
        } catch (e) {
            console.error('Edit student error:', e);
            alert('Failed to load student: ' + e.message);
        }
    };

    // =========================================================
    // SAVE STUDENT
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
    // TOGGLE / DELETE / VIEW
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
                    <div style="font-size:11px;color:var(--grey);text-transform:uppercase;font-weight:700;margin-bottom:8px;">Subjects (${(subs || []).length})</div>
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
    // =========================================================
    // ★★★ BULK IMPORT — SMART SYSTEM ★★★
    // =========================================================
    // =========================================================

    function resetBulkModal() {
        bulkState = {
            config: {
                class_name: '', year: '', session: '', branch: '', group: '',
                mainSelected: [], fourthSubject: ''
            },
            allSubjects: [],
            compulsorySubjects: [],
            mainSubjects: [],
            fourthSubjects: [],
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

        $('bulkCompulsoryStep').style.display = 'none';
        $('bulkMainStep').style.display = 'none';
        $('bulkFourthStep').style.display = 'none';
        $('bulkStudentsStep').style.display = 'none';
        $('bulkSummary').style.display = 'none';
        $('bulkPreview').style.display = 'none';
        $('saveBulkBtn').disabled = true;
    }

    function onBulkYearChange() {
        const year = $('bulkYear').value;
        bulkState.config.year = year;
        bulkState.config.session = getSessionFromYear(year);
        $('bulkSession').value = bulkState.config.session;
        updateBulkSummary();
    }

    function onBulkClassChange() {
        bulkState.config.class_name = $('bulkClass').value;
        updateBulkSummary();
    }

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

    // =========================================================
    // ON GROUP CHANGE — Render Subject UI
    // =========================================================
    async function onBulkGroupChange() {
        const branch = $('bulkBranch').value;
        const group = $('bulkGroup').value;
        const className = $('bulkClass').value;

        bulkState.config.group = group;

        if (!branch || !group || !className) {
            resetBulkSubjectsUI();
            return;
        }

        // Load ALL subjects for this class+branch+group
        try {
            const { data: subjects, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('branch', branch)
                .eq('class_name', className)
                .eq('is_active', true)
                .order('subject_name')
                .order('paper_number');

            if (error) throw error;

            bulkState.allSubjects = subjects || [];

            // Categorize
            categorizeSubjects(branch, group);

            // Render UI
            renderBulkCompulsory();
            renderBulkMainSelection(branch, group);
            renderBulkFourthSubject(branch, group);

            // Show steps
            $('bulkCompulsoryStep').style.display = 'block';
            $('bulkMainStep').style.display = 'block';
            if (bulkState.config.hasFourth !== false) {
                $('bulkFourthStep').style.display = 'block';
            }
            $('bulkStudentsStep').style.display = 'block';

            updateBulkSummary();
        } catch (e) {
            console.error('Load subjects error:', e);
            alert('Subject load failed: ' + e.message);
        }
    }

    function resetBulkSubjectsUI() {
        $('bulkCompulsoryStep').style.display = 'none';
        $('bulkMainStep').style.display = 'none';
        $('bulkFourthStep').style.display = 'none';
        $('bulkStudentsStep').style.display = 'none';
        $('bulkSummary').style.display = 'none';
        $('bulkPreview').style.display = 'none';
        $('saveBulkBtn').disabled = true;

        bulkState.config.mainSelected = [];
        bulkState.config.fourthSubject = '';
        bulkState.compulsorySubjects = [];
        bulkState.mainSubjects = [];
        bulkState.fourthSubjects = [];
    }

    // =========================================================
    // CATEGORIZE SUBJECTS (by book name)
    // =========================================================
    function categorizeSubjects(branch, group) {
        const all = bulkState.allSubjects;
        const structure = SUBJECT_STRUCTURE[branch]?.[group];

        if (!structure) {
            console.warn('No structure for:', branch, group);
            return;
        }

        // Group by book name
        const bookMap = new Map();
        all.forEach(s => {
            if (!bookMap.has(s.subject_name)) {
                bookMap.set(s.subject_name, {
                    subject_name: s.subject_name,
                    subject_code: s.subject_code,
                    subject_type: s.subject_type,
                    group_name: s.group_name,
                    papers: []
                });
            }
            bookMap.get(s.subject_name).papers.push(s);
        });

        const books = Array.from(bookMap.values());

        // Compulsory (বাংলা, English, ICT) — type=compulsory & group_name=null
        bulkState.compulsorySubjects = books.filter(b =>
            b.subject_type === 'compulsory' && !b.group_name
        );

        // For BMT — সব compulsory
        if (branch === 'BM') {
            bulkState.mainSubjects = books.filter(b => b.subject_type === 'compulsory');
            bulkState.fourthSubjects = [];
            bulkState.config.hasFourth = false;
            return;
        }

        // HSC — Compulsory = বাংলা, English, ICT
        // Main subjects = structure অনুযায়ী

        if (branch === 'HSC' && group === 'Science') {
            // Science: fixed 2 + choice 1
            const fixedNames = structure.fixedMain;
            const choiceNames = structure.choiceMain;

            bulkState.mainSubjects = books.filter(b =>
                fixedNames.includes(b.subject_name) || choiceNames.includes(b.subject_name)
            );

            // 4th pool — main-এ যা নেই
            bulkState.fourthSubjects = books.filter(b =>
                structure.fourthPool.includes(b.subject_name) &&
                !fixedNames.includes(b.subject_name)  // Fixed 2 always main
            );

            bulkState.config.hasFourth = true;
        } else if (branch === 'HSC' && (group === 'Business' || group === 'Humanities')) {
            // Business/Humanities: 3 select from pool
            bulkState.mainSubjects = books.filter(b =>
                structure.mainPool.includes(b.subject_name)
            );

            bulkState.fourthSubjects = books.filter(b =>
                structure.fourthPool.includes(b.subject_name)
            );

            bulkState.config.hasFourth = true;
        }
    }

    // =========================================================
    // RENDER BULK COMPULSORY
    // =========================================================
    function renderBulkCompulsory() {
        const list = $('bulkCompulsoryList');
        const books = bulkState.compulsorySubjects;

        if (books.length === 0) {
            list.innerHTML = '<div style="color:var(--grey);font-size:12px;">কোনো compulsory subject নেই।</div>';
            return;
        }

        list.innerHTML = books.map(b => {
            const paperInfo = b.papers.length > 1
                ? `${b.papers.length} papers`
                : '1 paper';
            return `<div class="bcb-item">
                <i class="fas fa-check-circle"></i>
                <span>${escapeHtml(b.subject_name)} <small style="opacity:0.7;">(${paperInfo})</small></span>
            </div>`;
        }).join('');
    }

    // =========================================================
    // RENDER BULK MAIN SELECTION
    // =========================================================
    function renderBulkMainSelection(branch, group) {
        const structure = SUBJECT_STRUCTURE[branch][group];
        const list = $('bulkMainList');
        const title = $('bulkMainTitle');
        const counter = $('bulkMainCounter');

        bulkState.config.mainSelected = [];

        if (structure.type === 'fixed_choice') {
            // Science: Fixed 2 + Choice 1
            title.textContent = 'Main Subjects (পদার্থ + রসায়ন fixed, ৩য়টি select করুন)';

            let html = '';

            // Fixed main
            structure.fixedMain.forEach(name => {
                html += `<div class="bulk-subject-item fixed checked" data-subject="${escapeHtml(name)}">
                    <input type="checkbox" checked disabled>
                    <span class="bsi-name">${escapeHtml(name)}</span>
                    <span class="bsi-badge fixed">Fixed</span>
                </div>`;
            });

            // Choice main (radio)
            structure.choiceMain.forEach((name, idx) => {
                html += `<label class="bulk-subject-item" data-subject="${escapeHtml(name)}">
                    <input type="radio" name="bulkMainRadio" value="${escapeHtml(name)}">
                    <span class="bsi-name">${escapeHtml(name)}</span>
                    <span class="bsi-badge choice">Choice</span>
                </label>`;
            });

            list.innerHTML = html;

            // Attach events
            list.querySelectorAll('input[name="bulkMainRadio"]').forEach(radio => {
                radio.addEventListener('change', function () {
                    bulkState.config.mainSelected = [...structure.fixedMain, this.value];

                    // Visual
                    list.querySelectorAll('.bulk-subject-item').forEach(item => {
                        if (item.classList.contains('fixed')) return;
                        const inp = item.querySelector('input');
                        item.classList.toggle('checked', inp.checked);
                    });

                    // Re-render 4th subject
                    renderBulkFourthSubject(branch, group);
                    updateBulkMainCounter(structure.mainCount);
                    updateBulkSummary();
                });
            });

            updateBulkMainCounter(structure.mainCount);

        } else if (structure.type === 'select_3') {
            // Business/Humanities: 3 select
            title.textContent = `Main Subjects (৩টি select করুন)`;

            list.innerHTML = structure.mainPool.map(name => {
                const book = bulkState.mainSubjects.find(b => b.subject_name === name);
                if (!book) return '';
                return `<label class="bulk-subject-item" data-subject="${escapeHtml(name)}">
                    <input type="checkbox" name="bulkMainCheck" value="${escapeHtml(name)}">
                    <span class="bsi-name">${escapeHtml(name)}</span>
                </label>`;
            }).join('');

            list.querySelectorAll('input[name="bulkMainCheck"]').forEach(cb => {
                cb.addEventListener('change', function () {
                    const checked = Array.from(list.querySelectorAll('input[name="bulkMainCheck"]:checked'));

                    if (checked.length > structure.mainCount) {
                        this.checked = false;
                        alert(`সর্বোচ্চ ${structure.mainCount}টি select করা যাবে।`);
                        return;
                    }

                    bulkState.config.mainSelected = checked.map(c => c.value);

                    // Visual
                    list.querySelectorAll('.bulk-subject-item').forEach(item => {
                        const inp = item.querySelector('input');
                        item.classList.toggle('checked', inp.checked);
                    });

                    // Re-render 4th subject
                    renderBulkFourthSubject(branch, group);
                    updateBulkMainCounter(structure.mainCount);
                    updateBulkSummary();
                });
            });

            updateBulkMainCounter(structure.mainCount);

        } else if (structure.type === 'all_fixed') {
            // BMT: সব fixed
            title.textContent = 'Main Subjects (সব fixed compulsory)';

            list.innerHTML = structure.mainFixed.map(name => {
                return `<div class="bulk-subject-item fixed checked" data-subject="${escapeHtml(name)}">
                    <input type="checkbox" checked disabled>
                    <span class="bsi-name">${escapeHtml(name)}</span>
                    <span class="bsi-badge fixed">Fixed</span>
                </div>`;
            }).join('');

            bulkState.config.mainSelected = [...structure.mainFixed];
            updateBulkMainCounter(structure.mainCount);
        }
    }

    function updateBulkMainCounter(required) {
        const counter = $('bulkMainCounter');
        const current = bulkState.config.mainSelected.length;

        counter.textContent = `${current} / ${required}`;
        counter.classList.toggle('complete', current === required);
    }

    // =========================================================
    // RENDER 4TH SUBJECT DROPDOWN
    // =========================================================
    function renderBulkFourthSubject(branch, group) {
        const select = $('bulkFourthSubject');
        const structure = SUBJECT_STRUCTURE[branch][group];

        if (!structure.hasFourth || structure.type === 'all_fixed') {
            $('bulkFourthStep').style.display = 'none';
            bulkState.config.fourthSubject = '';
            return;
        }

        // Main-এ যেগুলো select হয়েছে, সেগুলো বাদ
        const mainSelected = bulkState.config.mainSelected;
        const fixedMain = structure.fixedMain || [];

        const available = bulkState.fourthSubjects.filter(b =>
            !mainSelected.includes(b.subject_name)
        );

        select.innerHTML = '<option value="">Select 4th Subject</option>';
        available.forEach(b => {
            select.insertAdjacentHTML('beforeend',
                `<option value="${escapeHtml(b.subject_name)}">${escapeHtml(b.subject_name)}</option>`);
        });

        // Clear selection if previously selected was removed
        const current = select.value;
        if (current && !available.find(b => b.subject_name === current)) {
            select.value = '';
            bulkState.config.fourthSubject = '';
        }

        $('bulkFourthStep').style.display = 'block';
    }

    function onBulkFourthChange() {
        bulkState.config.fourthSubject = $('bulkFourthSubject').value;
        updateBulkSummary();
    }

    // =========================================================
    // SUMMARY
    // =========================================================
    function updateBulkSummary() {
        const cfg = bulkState.config;

        if (!cfg.group || !cfg.branch) {
            $('bulkSummary').style.display = 'none';
            return;
        }

        const structure = SUBJECT_STRUCTURE[cfg.branch]?.[cfg.group];
        if (!structure) return;

        const mainTotal = cfg.mainSelected.length;
        const needsFourth = structure.hasFourth !== false;

        const isComplete = mainTotal === structure.mainCount &&
                          (!needsFourth || cfg.fourthSubject);

        let html = `
            <div><strong>Class:</strong> ${escapeHtml(cfg.class_name || '—')} / <strong>Year:</strong> ${escapeHtml(cfg.year || '—')} / <strong>Session:</strong> ${escapeHtml(cfg.session || '—')}</div>
            <div><strong>Branch:</strong> ${escapeHtml(cfg.branch || '—')} / <strong>Group:</strong> ${escapeHtml(cfg.group || '—')}</div>
            <div><strong>📌 Compulsory:</strong> ${bulkState.compulsorySubjects.map(b => escapeHtml(b.subject_name)).join(', ') || '—'}</div>
            <div><strong>📚 Main Subjects (${mainTotal}):</strong> ${cfg.mainSelected.map(escapeHtml).join(', ') || '—'}</div>
            ${needsFourth ? `<div><strong>🎯 4th Subject:</strong> ${escapeHtml(cfg.fourthSubject || '—')}</div>` : ''}
        `;

        if (!isComplete) {
            html += `<div style="color:#b45309;font-weight:700;margin-top:6px;">⚠️ কিছু তথ্য বাকি</div>`;
        } else {
            html += `<div style="color:#166534;font-weight:700;margin-top:6px;">✅ সব তথ্য পূর্ণ</div>`;
        }

        $('bulkSummaryBody').innerHTML = html;
        $('bulkSummary').style.display = 'block';
    }

    // =========================================================
    // ROLL RANGE GENERATE
    // =========================================================
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

    // =========================================================
    // PARSE STUDENTS
    // =========================================================
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

    // =========================================================
    // PREVIEW
    // =========================================================
    async function previewBulkImport() {
        const cfg = bulkState.config;
        const structure = SUBJECT_STRUCTURE[cfg.branch]?.[cfg.group];

        if (!cfg.class_name || !cfg.year || !cfg.branch || !cfg.group) {
            return alert('Common settings পূরণ করুন।');
        }
        if (!structure) return alert('Subject structure পাওয়া যায়নি।');

        if (cfg.mainSelected.length !== structure.mainCount) {
            return alert(`Main-এ ${structure.mainCount}টি subject select করুন। এখন ${cfg.mainSelected.length}টি।`);
        }
        if (structure.hasFourth && !cfg.fourthSubject) {
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

        // Validate 4th override
        if (structure.hasFourth) {
            students.forEach(s => {
                if (s.fourth_override) {
                    if (cfg.mainSelected.includes(s.fourth_override)) {
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

    // =========================================================
    // SAVE BULK IMPORT
    // =========================================================
    async function saveBulkImport() {
        const cfg = bulkState.config;
        const structure = SUBJECT_STRUCTURE[cfg.branch][cfg.group];
        const students = bulkState.students.filter(s => s.row_status !== 'error' && s.row_status !== 'warn');

        if (students.length === 0) return alert('কোনো valid student নেই।');
        if (!confirm(`${students.length} জন student যোগ করা হবে। নিশ্চিত?`)) return;

        const btn = $('saveBulkBtn');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Prepare student records
            const studentRecords = students.map(s => ({
                name: s.name || 'Student ' + s.roll,
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
                .insert(studentRecords)
                .select();

            if (insErr) throw insErr;

            // Assign subjects to each student
            for (const stu of (inserted || [])) {
                const matched = students.find(s => s.roll === stu.roll);
                if (!matched) continue;

                const subjectRecords = buildSubjectRecords(
                    stu.id,
                    cfg,
                    structure,
                    matched.fourth_override || cfg.fourthSubject
                );

                if (subjectRecords.length > 0) {
                    const { error: subErr } = await window.FDC_SUPABASE
                        .from('student_subjects')
                        .insert(subjectRecords);
                    if (subErr) console.error('Subject insert error:', subErr);
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

    // =========================================================
    // BUILD SUBJECT RECORDS FOR A STUDENT
    // =========================================================
    function buildSubjectRecords(studentId, cfg, structure, fourthSubject) {
        const records = [];
        const addedIds = new Set();

        function addPapers(book, type) {
            book.papers.forEach(p => {
                if (addedIds.has(p.id)) return;
                addedIds.add(p.id);
                records.push({
                    student_id: studentId,
                    subject_id: p.id,
                    subject_type: type
                });
            });
        }

        // 1. Compulsory (বাংলা, English, ICT)
        bulkState.compulsorySubjects.forEach(book => {
            addPapers(book, 'compulsory');
        });

        // 2. Main subjects
        bulkState.mainSubjects.forEach(book => {
            if (cfg.mainSelected.includes(book.subject_name)) {
                const type = (cfg.branch === 'BM') ? 'compulsory' : 'group';
                addPapers(book, type);
            }
        });

        // 3. 4th subject
        if (fourthSubject && structure.hasFourth) {
            const fourthBook = bulkState.fourthSubjects.find(b => b.subject_name === fourthSubject);
            if (fourthBook) {
                addPapers(fourthBook, 'optional');
            }
        }

        return records;
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Student CRUD
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

        $('studentYear').addEventListener('change', function () {
            if (!editingStudentId) {
                $('studentSession').value = getSessionFromYear(this.value);
            }
        });

        // Filters
        ['filterClass', 'filterYear', 'filterBranch', 'filterGroup'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        // Table actions
        $('studentTableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'view') window.viewStudent(id);
            else if (action === 'edit') window.openEditStudentModal(id);
            else if (action === 'subject') window.openEditStudentModal(id);
            else if (action === 'toggle') window.toggleStudent(id);
            else if (action === 'delete') window.deleteStudent(id);
        });

        // Pagination
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

        // =========================================================
        // BULK IMPORT EVENTS
        // =========================================================
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
        $('bulkFourthSubject').addEventListener('change', onBulkFourthChange);

        $('btnGenerateRange').addEventListener('click', generateBulkRange);
        $('previewBulkBtn').addEventListener('click', previewBulkImport);
        $('saveBulkBtn').addEventListener('click', saveBulkImport);

        // View modal
        $('closeViewModal').addEventListener('click', () => closeModal('viewStudentModal'));
        $('closeViewBtn').addEventListener('click', () => closeModal('viewStudentModal'));

        // Modal backdrop
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
        console.log('🚀 Admin Students v10 initializing...');

        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllStudents();

            console.log('✅ Admin Students v10 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();