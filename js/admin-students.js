/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN STUDENTS MANAGEMENT
 * Location: js/admin-students.js
 * Version: v13.0 — Grouped List + Smart Search + Editable Preview
 * Depends: config.js, supabase.js, auth.js, admin-popup.js, session-helper.js
 * 
 * ✅ Features:
 *    - Grouped list (Session + Class + Branch + Group)
 *    - Smart search (session/roll/name auto-detect)
 *    - Section accordion
 *    - Section promote button
 *    - Bulk import (. separator)
 *    - Editable preview (4th subject dropdown)
 *    - Subject edit modal
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allStudents = [];
    let expandedSections = new Set();
    let editingStudentId = null;
    let currentSubjectEditStudentId = null;
    let allSubjectsData = [];
    let currentBulkSubjects = {
        compulsory: [],
        main: [],
        fourth: []
    };

    // =========================================================
    // SUBJECT STRUCTURE (Document-based)
    // =========================================================
    const SUBJECT_STRUCTURE = {
        HSC: {
            Science: {
                type: 'fixed_choice',
                fixedMain: ['পদার্থবিজ্ঞান', 'রসায়ন'],
                choiceMain: ['জীববিজ্ঞান', 'উচ্চতর গণিত'],
                mainCount: 3,
                fourthPool: ['জীববিজ্ঞান', 'উচ্চতর গণিত', 'কৃষিশিক্ষা', 'পরিসংখ্যান', 'প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', 'ভূগোল', 'মনোবিজ্ঞান'],
                hasFourth: true
            },
            Humanities: {
                type: 'select_3',
                mainPool: ['পৌরনীতি ও সুশাসন', 'অর্থনীতি', 'যুক্তিবিদ্যা', 'ইসলামের ইতিহাস ও সংস্কৃতি', 'ইসলাম শিক্ষা', 'ইতিহাস', 'সমাজবিজ্ঞান', 'সমাজকর্ম'],
                mainCount: 3,
                fourthPool: ['পৌরনীতি ও সুশাসন', 'অর্থনীতি', 'যুক্তিবিদ্যা', 'ইসলামের ইতিহাস ও সংস্কৃতি', 'ইসলাম শিক্ষা', 'ইতিহাস', 'সমাজবিজ্ঞান', 'সমাজকর্ম', 'কৃষিশিক্ষা', 'পরিসংখ্যান', 'ভূগোল'],
                hasFourth: true
            },
            Business: {
                type: 'select_3',
                mainPool: ['হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'উৎপাদন ব্যবস্থাপনা ও বিপণন', 'অর্থনীতি', 'ফিন্যান্স, ব্যাংকিং ও বিমা', 'পরিসংখ্যান', 'কৃষিশিক্ষা', 'ভূগোল'],
                mainCount: 3,
                fourthPool: ['হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'উৎপাদন ব্যবস্থাপনা ও বিপণন', 'অর্থনীতি', 'ফিন্যান্স, ব্যাংকিং ও বিমা', 'পরিসংখ্যান', 'কৃষিশিক্ষা', 'ভূগোল'],
                hasFourth: true
            }
        },
        BM: {
            'BM-General': {
                type: 'all_fixed',
                mainFixed: [],   // BM-এ সব compulsory
                mainCount: 0,
                hasFourth: false
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
        if (student.session && String(student.session).trim() !== '') return String(student.session).trim();
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
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) { clearInterval(i); cb(); }
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
                    if (result.admin.image_url) avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    else avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    // =========================================================
    // LOGOUT
    // =========================================================
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

    // =========================================================
    // LOAD ALL STUDENTS
    // =========================================================
    async function loadAllStudents() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('is_active', true)
                .order('session', { ascending: false })
                .order('class_name', { ascending: false })
                .order('roll', { ascending: true });

            if (error) throw error;

            allStudents = data || [];
            console.log('✅ Loaded students:', allStudents.length);

            updateStats();
            applyFiltersAndRender();

        } catch (e) {
            console.error('Load students error:', e);
            $('sectionsContainer').innerHTML = `
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-exclamation-triangle"></i></div>
                    <h6>লোড করা যায়নি</h6>
                    <p>${escapeHtml(e.message)}</p>
                </div>
            `;
        }
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        const total = allStudents.length;
        const hsc = allStudents.filter(s => s.branch === 'HSC').length;
        const bm = allStudents.filter(s => s.branch === 'BM').length;
        const sections = buildSections(allStudents).length;

        $('totalStudents').textContent = total;
        $('statTotal').textContent = total;
        $('statHSC').textContent = hsc;
        $('statBM').textContent = bm;
        $('statSections').textContent = sections;
    }

    // =========================================================
    // BUILD SECTIONS (Session + Class + Branch + Group)
    // =========================================================
    function buildSections(students) {
        const map = new Map();

        students.forEach(s => {
            const session = getStudentSession(s);
            const key = [
                session,
                s.class_name,
                s.branch,
                s.group_name || 'NO-GROUP'
            ].join('|');

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    session,
                    class_name: s.class_name,
                    branch: s.branch,
                    group_name: s.group_name,
                    students: []
                });
            }

            map.get(key).students.push(s);
        });

        return Array.from(map.values());
    }

    // =========================================================
    // SMART SEARCH PARSER
    // =========================================================
    function parseSearch(query) {
        const q = (query || '').trim();
        if (!q) return { session: null, roll: null, name: null };

        const terms = q.split(/\s+/).filter(Boolean);
        const result = { session: null, roll: null, name: null };

        terms.forEach(term => {
            // Session pattern: 2024-25 or 2024-2025
            if (/^\d{4}-\d{2,4}$/.test(term)) {
                result.session = term;
            }
            // Pure number → Roll
            else if (/^\d+$/.test(term)) {
                result.roll = term;
            }
            // Otherwise → Name
            else {
                if (!result.name) result.name = term;
                else result.name += ' ' + term;
            }
        });

        return result;
    }

    // =========================================================
    // FILTER & RENDER
    // =========================================================
    function applyFiltersAndRender() {
        const fClass = $('filterClass').value;
        const fBranch = $('filterBranch').value;
        const fGroup = $('filterGroup').value;
        const fSort = $('filterSort').value;
        const searchQuery = $('searchInput').value;

        const search = parseSearch(searchQuery);

        // Filter students
        let filtered = allStudents.filter(s => {
            if (fClass && s.class_name !== fClass) return false;
            if (fBranch && s.branch !== fBranch) return false;
            if (fGroup && s.group_name !== fGroup) return false;

            const studentSession = getStudentSession(s);

            if (search.session) {
                if (!studentSession.includes(search.session)) return false;
            }
            if (search.roll) {
                if (!String(s.roll).includes(search.roll)) return false;
            }
            if (search.name) {
                if (!s.name.toLowerCase().includes(search.name.toLowerCase())) return false;
            }

            return true;
        });

        // Sort
        const sections = buildSections(filtered);

        sections.sort((a, b) => {
            // Session sort
            if (fSort === 'session_desc') {
                if (b.session !== a.session) return (b.session || '').localeCompare(a.session || '');
            } else {
                if (a.session !== b.session) return (a.session || '').localeCompare(b.session || '');
            }

            // Class sort (12 first)
            if (b.class_name !== a.class_name) {
                return String(b.class_name).localeCompare(String(a.class_name));
            }

            // Branch sort (HSC first)
            if (a.branch !== b.branch) {
                return a.branch === 'HSC' ? -1 : 1;
            }

            // Group sort
            return (a.group_name || '').localeCompare(b.group_name || '');
        });

        renderSections(sections, searchQuery);
    }

    // =========================================================
    // RENDER SECTIONS
    // =========================================================
    function renderSections(sections, searchQuery) {
        const container = $('sectionsContainer');

        if (sections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-search"></i></div>
                    <h6>কোনো student পাওয়া যায়নি</h6>
                    <p>${searchQuery ? 'Search / Filter পরিবর্তন করুন' : '"Add Student" বা "Bulk Import" দিয়ে যোগ করুন'}</p>
                </div>
            `;
            return;
        }

        const hasSearch = (searchQuery || '').trim().length > 0;

        let html = '';
        sections.forEach(section => {
            const isExpanded = hasSearch || expandedSections.has(section.key);
            html += renderSection(section, isExpanded);
        });

        container.innerHTML = html;
    }

    // =========================================================
    // RENDER ONE SECTION
    // =========================================================
    function renderSection(section, isExpanded) {
        const studentCount = section.students.length;
        const groupDisplay = getGroupDisplayName(section.group_name);
        const iconClass = section.branch === 'HSC' ? 'HSC' : 'BM';
        const iconFa = section.branch === 'HSC' ? 'fa-flask' : 'fa-briefcase';

        const title = `${section.session || '—'} — Class ${section.class_name} — ${section.branch} ${groupDisplay}`;
        const promoteUrl = `admin-promote.html?class=${encodeURIComponent(section.class_name)}&year=${encodeURIComponent(section.session.split('-')[0] || '')}&branch=${encodeURIComponent(section.branch)}&group=${encodeURIComponent(section.group_name || '')}`;

        let studentsHtml = '';
        section.students.forEach(s => {
            studentsHtml += `
                <div class="student-row" data-student-id="${s.id}">
                    <span class="student-roll">${escapeHtml(s.roll)}</span>
                    <span class="student-name">${escapeHtml(s.name)}</span>
                    <span class="student-actions">
                        <button class="action-btn view" data-action="view" data-id="${s.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-action="edit" data-id="${s.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn subject" data-action="subject" data-id="${s.id}" title="Subjects">
                            <i class="fas fa-book"></i>
                        </button>
                        <button class="action-btn toggle" data-action="toggle" data-id="${s.id}" title="Deactivate">
                            <i class="fas fa-user-slash"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" data-id="${s.id}" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </span>
                </div>
            `;
        });

        return `
            <div class="student-section ${isExpanded ? 'expanded' : ''}" data-branch="${escapeHtml(section.branch)}" data-section-key="${escapeHtml(section.key)}">
                <div class="section-header" data-action="toggle-section">
                    <div class="section-expand">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="section-icon ${iconClass}">
                        <i class="fas ${iconFa}"></i>
                    </div>
                    <div class="section-info">
                        <div class="section-title">
                            ${escapeHtml(title)}
                            <span class="count">${studentCount}</span>
                        </div>
                        <div class="section-meta">
                            <span><i class="fas fa-layer-group"></i> Class ${escapeHtml(section.class_name)}</span>
                            <span><i class="fas fa-users"></i> ${escapeHtml(groupDisplay)}</span>
                            <span><i class="fas fa-calendar"></i> ${escapeHtml(section.session || '—')}</span>
                        </div>
                    </div>
                    <div class="section-actions">
                        <a href="${promoteUrl}" class="btn-section-promote" onclick="event.stopPropagation()">
                            <i class="fas fa-graduation-cap"></i> <span>Promote</span>
                        </a>
                    </div>
                </div>
                <div class="section-body">
                    ${studentsHtml}
                </div>
            </div>
        `;
    }

    // =========================================================
    // GROUP DISPLAY NAME
    // =========================================================
    function getGroupDisplayName(groupName) {
        const map = {
            'Science': 'Science',
            'Humanities': 'Humanities',
            'Business': 'Business',
            'BM-General': 'BM General'
        };
        return map[groupName] || groupName || '—';
    }

    // =========================================================
    // TOGGLE SECTION
    // =========================================================
    function toggleSection(sectionKey) {
        if (expandedSections.has(sectionKey)) {
            expandedSections.delete(sectionKey);
        } else {
            expandedSections.add(sectionKey);
        }
        applyFiltersAndRender();
    }

    // =========================================================
    // LOAD GROUPS BY BRANCH
    // =========================================================
    async function loadGroupsByBranch(branch, targetSelectId) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('groups').select('*').eq('branch', branch).eq('is_active', true).order('sort_order');
            if (error) throw error;

            const select = $(targetSelectId);
            if (!select) return;

            select.innerHTML = '<option value="">Select Group</option>';
            (data || []).forEach(g => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(g.group_name)}">${escapeHtml(g.display_name)}</option>`);
            });
        } catch (e) { console.error('Load groups error:', e); }
    }

    // =========================================================
    // LOAD YEAR OPTIONS (via Session Helper)
    // =========================================================
    async function loadYearOptions() {
        await window.FDCSession.fillYearDropdown('studentYear', { autoSelectCurrent: false });
        await window.FDCSession.fillYearDropdown('bulkYear', { autoSelectCurrent: false });

        const currentYear = window.FDCSession.getCurrentYear();
        if ($('studentYear')) $('studentYear').value = currentYear;
        if ($('bulkYear')) $('bulkYear').value = currentYear;
        if ($('studentSession')) $('studentSession').value = getSessionFromYear(currentYear);
        if ($('bulkSession')) $('bulkSession').value = getSessionFromYear(currentYear);
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
    // ADD STUDENT
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
        const cy = window.FDCSession.getCurrentYear();
        $('studentYear').value = cy;
        $('studentSession').value = getSessionFromYear(cy);
        $('studentBranch').value = '';
        $('studentGroup').innerHTML = '<option value="">Select Group</option>';
        $('groupFieldWrap').style.display = 'none';

        openModal('studentModal');
    }

    // =========================================================
    // EDIT STUDENT
    // =========================================================
    async function openEditStudentModal(id) {
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

            const yearStr = String(student.year || '');
            const yearSelect = $('studentYear');
            const hasYear = Array.from(yearSelect.options).some(o => o.value === yearStr);
            if (!hasYear && yearStr) {
                yearSelect.insertAdjacentHTML('beforeend', `<option value="${yearStr}">${yearStr}</option>`);
            }
            yearSelect.value = yearStr;

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
            window.fdcError('Failed to load student: ' + e.message);
        }
    }

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

        if (!name) return window.fdcWarning('নাম দিতে হবে।');
        if (!roll) return window.fdcWarning('Roll দিতে হবে।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!year) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName) return window.fdcWarning('Group সিলেক্ট করুন।');

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
                const { error } = await window.FDC_SUPABASE.from('students').update(studentData).eq('id', editingStudentId);
                if (error) throw error;
            } else {
                const { error } = await window.FDC_SUPABASE.from('students').insert([studentData]).select().single();
                if (error) throw error;
            }

            closeModal('studentModal');
            window.fdcSuccess(editingStudentId ? 'Student update হয়েছে!' : 'Student যোগ হয়েছে!');
            await loadAllStudents();
        } catch (e) {
            console.error('Save student error:', e);
            if (e.message && e.message.includes('duplicate')) {
                window.fdcError('এই Roll + Class + Year + Branch আগেই আছে।');
            } else {
                window.fdcError('Save failed: ' + e.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // TOGGLE STUDENT (Deactivate)
    // =========================================================
    async function toggleStudent(id) {
        const s = allStudents.find(x => String(x.id) === String(id));
        if (!s) return window.fdcError('Student পাওয়া যায়নি।');

        window.fdcConfirm(
            `"${escapeHtml(s.name)}" (Roll: ${escapeHtml(s.roll)}) কে Deactivate করতে চান?`,
            async function () {
                try {
                    await window.FDC_SUPABASE.from('students').update({ is_active: false }).eq('id', id);
                    window.fdcSuccess('Student deactivate হয়েছে।');
                    await loadAllStudents();
                } catch (e) { window.fdcError('Deactivate failed: ' + e.message); }
            },
            { title: 'Deactivate Student', confirmText: 'হ্যাঁ, Deactivate', cancelText: 'বাতিল', confirmType: 'danger' }
        );
    }

    // =========================================================
    // DELETE STUDENT
    // =========================================================
    async function deleteStudent(id) {
        const s = allStudents.find(x => String(x.id) === String(id));
        if (!s) return window.fdcError('Student পাওয়া যায়নি।');

        window.fdcPromptInput({
            title: '⚠️ PERMANENT DELETE',
            subtitle: `${escapeHtml(s.name)} (Roll: ${escapeHtml(s.roll)})`,
            message: `এই student এবং তার সব data <strong>চিরতরে</strong> মুছে যাবে।<p style="margin-top:12px;color:#7f1d1d;font-weight:700;">এটি undo করা যাবে না!</p>`,
            expectedValue: 'DELETE',
            placeholder: 'টাইপ করুন: DELETE',
            confirmText: 'হ্যাঁ, Delete করুন',
            cancelText: 'বাতিল',
            confirmType: 'danger',
            onConfirm: async function () {
                window.fdcAlert('<i class="fas fa-spinner fa-spin"></i> Delete করা হচ্ছে...', 'অপেক্ষা করুন', 'info');
                try {
                    await window.FDC_SUPABASE.from('student_subjects').delete().eq('student_id', id);
                    const { data: results } = await window.FDC_SUPABASE.from('results').select('id').eq('student_id', id);
                    if (results && results.length > 0) {
                        const resultIds = results.map(r => r.id);
                        await window.FDC_SUPABASE.from('result_details').delete().in('result_id', resultIds);
                    }
                    await window.FDC_SUPABASE.from('results').delete().eq('student_id', id);
                    const { error } = await window.FDC_SUPABASE.from('students').delete().eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess(`"${escapeHtml(s.name)}" delete হয়েছে।`);
                    await loadAllStudents();
                } catch (e) {
                    console.error('Delete error:', e);
                    window.fdcError('Delete failed: ' + e.message);
                }
            }
        });
    }

    // =========================================================
    // VIEW STUDENT
    // =========================================================
    async function viewStudent(id) {
        const student = allStudents.find(s => String(s.id) === String(id));
        if (!student) return window.fdcError('Student পাওয়া যায়নি।');

        try {
            const { data: subs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_type, subject_id, subjects(subject_name, subject_code)')
                .eq('student_id', id);

            const compSubs = (subs || []).filter(s => s.subject_type === 'compulsory');
            const grpSubs = (subs || []).filter(s => s.subject_type === 'group');
            const optSubs = (subs || []).filter(s => s.subject_type === 'optional');

            function renderList(list) {
                if (list.length === 0) return '<div style="color:#6b7280;font-size:12px;">কিছু নেই</div>';
                return list.map(s => `<div style="padding:4px 0;font-size:12.5px;">• ${escapeHtml(s.subjects?.subject_name || '—')}</div>`).join('');
            }

            const html = `
                <div style="margin-bottom:16px;">
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;">Student Info</div>
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
                <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(0,0,0,0.06);">
                    <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:8px;">Subjects (${(subs || []).length})</div>
                    <div style="margin-bottom:12px;"><div style="font-size:12px;color:#0a1655;font-weight:700;">📌 আবশ্যিক</div>${renderList(compSubs)}</div>
                    <div style="margin-bottom:12px;"><div style="font-size:12px;color:#0a1655;font-weight:700;">📚 গ্রুপের</div>${renderList(grpSubs)}</div>
                    <div><div style="font-size:12px;color:#0a1655;font-weight:700;">🎯 ঐচ্ছিক</div>${renderList(optSubs)}</div>
                </div>
            `;

            window.fdcPopup({
                type: 'info',
                title: 'Student Details',
                subtitle: student.name,
                body: html,
                buttons: [{ text: 'বন্ধ করুন', type: 'primary', icon: 'fa-times', action: 'close' }]
            });
        } catch (e) { window.fdcError('Load failed: ' + e.message); }
    }

    // =========================================================
    // SUBJECT EDIT MODAL
    // =========================================================
    async function openSubjectEditModal(id) {
        const student = allStudents.find(s => String(s.id) === String(id));
        if (!student) return window.fdcError('Student পাওয়া যায়নি।');

        currentSubjectEditStudentId = id;
        $('subjectModalTitle').textContent = 'Subject Management';
        $('subjectModalSub').textContent = `${student.name} · Roll ${student.roll}`;
        $('subjectEditBody').innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--navy);"></i></div>';

        openModal('subjectEditModal');

        try {
            // Load subjects for this student's class + branch + group
            const { data: subjects, error } = await window.FDC_SUPABASE
                .from('subjects').select('*')
                .eq('branch', student.branch)
                .eq('class_name', student.class_name)
                .eq('is_active', true)
                .order('subject_type')
                .order('subject_name')
                .order('paper_number');

            if (error) throw error;

            // Load student's current subjects
            const { data: currentSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type')
                .eq('student_id', id);

            const currentIds = new Set((currentSubs || []).map(s => s.subject_id));

            renderSubjectEditUI(student, subjects || [], currentIds);

        } catch (e) {
            console.error('Load subjects error:', e);
            $('subjectEditBody').innerHTML = `<div class="fdc-alert danger">লোড করা যায়নি: ${escapeHtml(e.message)}</div>`;
        }
    }

    function renderSubjectEditUI(student, subjects, currentIds) {
        // Group subjects by book (subject_name)
        const bookMap = new Map();
        subjects.forEach(s => {
            const key = s.subject_name + '|' + (s.group_name || '') + '|' + s.subject_type;
            if (!bookMap.has(key)) {
                bookMap.set(key, {
                    subject_name: s.subject_name,
                    subject_type: s.subject_type,
                    group_name: s.group_name,
                    papers: []
                });
            }
            bookMap.get(key).papers.push(s);
        });

        const books = Array.from(bookMap.values());

        const compulsory = books.filter(b => b.subject_type === 'compulsory' && !b.group_name);
        const group = books.filter(b => b.subject_type === 'group');
        const optional = books.filter(b => b.subject_type === 'optional');

        // Helper: check if book is selected
        function isBookSelected(book) {
            return book.papers.some(p => currentIds.has(p.id));
        }

        let html = '';

        // Compulsory (locked)
        if (compulsory.length > 0) {
            html += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px;">
                        <i class="fas fa-lock"></i> আবশ্যিক বিষয় (Auto)
                    </div>
                    <div style="display:grid;gap:6px;">
                        ${compulsory.map(b => `
                            <div style="padding:8px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;font-size:12.5px;font-weight:600;color:#166534;">
                                ✅ ${escapeHtml(b.subject_name)} (${b.papers.length} paper)
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Group subjects
        if (group.length > 0) {
            html += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:700;color:#0a1655;margin-bottom:8px;">
                        <i class="fas fa-layer-group"></i> গ্রুপের বিষয়
                    </div>
                    <div style="display:grid;gap:6px;">
                        ${group.map((b, i) => {
                            const selected = isBookSelected(b);
                            return `
                                <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${selected ? '#eff6ff' : '#fafbff'};border:1.5px solid ${selected ? '#3b82f6' : '#e5e7eb'};border-radius:8px;cursor:pointer;transition:0.2s;">
                                    <input type="checkbox" class="subject-checkbox" data-subject-name="${escapeHtml(b.subject_name)}" data-type="group" ${selected ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0a1655;">
                                    <span style="font-size:13px;font-weight:600;color:#1f2937;">${escapeHtml(b.subject_name)}</span>
                                    <span style="font-size:10.5px;color:#6b7280;margin-left:auto;">${b.papers.length} paper</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Optional (4th)
        if (optional.length > 0) {
            html += `
                <div style="margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;">
                        <i class="fas fa-star"></i> ৪র্থ Subject (একটি)
                    </div>
                    <select id="subjectOptionalSelect" style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fafbff;font-size:13.5px;font-family:inherit;font-weight:600;color:#0a1655;">
                        <option value="">— Select 4th Subject —</option>
                        ${optional.map(b => {
                            const selected = isBookSelected(b);
                            return `<option value="${escapeHtml(b.subject_name)}" ${selected ? 'selected' : ''}>${escapeHtml(b.subject_name)}</option>`;
                        }).join('')}
                    </select>
                </div>
            `;
        }

        $('subjectEditBody').innerHTML = html;
    }

    async function saveSubjectEdit() {
        if (!currentSubjectEditStudentId) return;

        const student = allStudents.find(s => String(s.id) === String(currentSubjectEditStudentId));
        if (!student) return;

        const btn = $('saveSubjectBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Get all checked group subjects
            const checkedGroups = Array.from(document.querySelectorAll('.subject-checkbox[data-type="group"]:checked'))
                .map(cb => cb.dataset.subjectName);
            const optional = $('subjectOptionalSelect')?.value || '';

            // Reload subjects to get subject IDs
            const { data: subjects } = await window.FDC_SUPABASE
                .from('subjects').select('*')
                .eq('branch', student.branch)
                .eq('class_name', student.class_name)
                .eq('is_active', true);

            // Delete old
            await window.FDC_SUPABASE.from('student_subjects').delete().eq('student_id', currentSubjectEditStudentId);

            // Build new records
            const records = [];
            const addedIds = new Set();

            (subjects || []).forEach(s => {
                // Compulsory — always
                if (s.subject_type === 'compulsory' && !s.group_name) {
                    if (!addedIds.has(s.id)) {
                        addedIds.add(s.id);
                        records.push({ student_id: currentSubjectEditStudentId, subject_id: s.id, subject_type: 'compulsory' });
                    }
                }
                // Group
                else if (s.subject_type === 'group' && checkedGroups.includes(s.subject_name)) {
                    if (!addedIds.has(s.id)) {
                        addedIds.add(s.id);
                        records.push({ student_id: currentSubjectEditStudentId, subject_id: s.id, subject_type: 'group' });
                    }
                }
                // Optional
                else if (s.subject_type === 'optional' && s.subject_name === optional) {
                    if (!addedIds.has(s.id)) {
                        addedIds.add(s.id);
                        records.push({ student_id: currentSubjectEditStudentId, subject_id: s.id, subject_type: 'optional' });
                    }
                }
            });

            if (records.length > 0) {
                const { error } = await window.FDC_SUPABASE.from('student_subjects').insert(records);
                if (error) throw error;
            }

            closeModal('subjectEditModal');
            window.fdcSuccess('Subjects update হয়েছে!');
            await loadAllStudents();

        } catch (e) {
            console.error('Save subjects error:', e);
            window.fdcError('Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // BULK IMPORT
    // =========================================================
    function resetBulkModal() {
        $('bulkClass').value = '';
        const cy = window.FDCSession.getCurrentYear();
        $('bulkYear').value = cy;
        $('bulkSession').value = getSessionFromYear(cy);
        $('bulkBranch').value = '';
        $('bulkGroup').innerHTML = '<option value="">Select Group</option>';
        $('bulkGroupFieldWrap').style.display = 'none';
        $('bulkData').value = '';

        $('bulkCompulsoryStep').style.display = 'none';
        $('bulkMainStep').style.display = 'none';
        $('bulkFourthStep').style.display = 'none';
        $('bulkStudentsStep').style.display = 'none';
        $('bulkSummary').style.display = 'none';
        $('bulkPreview').style.display = 'none';
        $('saveBulkBtn').disabled = true;

        currentBulkSubjects = { compulsory: [], main: [], fourth: [] };
    }

    async function onBulkBranchChange() {
        const branch = $('bulkBranch').value;
        if (branch === 'HSC') {
            $('bulkGroupFieldWrap').style.display = 'block';
            await loadGroupsByBranch('HSC', 'bulkGroup');
            $('bulkGroup').value = '';
        } else if (branch === 'BM') {
            $('bulkGroupFieldWrap').style.display = 'block';
            $('bulkGroup').innerHTML = '<option value="BM-General" selected>BM-General</option>';
            setTimeout(onBulkGroupChange, 100);
        } else {
            $('bulkGroupFieldWrap').style.display = 'none';
        }
        resetBulkUI();
    }

    function resetBulkUI() {
        $('bulkCompulsoryStep').style.display = 'none';
        $('bulkMainStep').style.display = 'none';
        $('bulkFourthStep').style.display = 'none';
        $('bulkStudentsStep').style.display = 'none';
        $('bulkPreview').style.display = 'none';
    }

    async function onBulkGroupChange() {
        const branch = $('bulkBranch').value;
        const group = $('bulkGroup').value;
        const className = $('bulkClass').value;

        if (!branch || !group || !className) { resetBulkUI(); return; }

        try {
            const { data: subjects, error } = await window.FDC_SUPABASE
                .from('subjects').select('*')
                .eq('branch', branch).eq('class_name', className).eq('is_active', true)
                .order('subject_name').order('paper_number');

            if (error) throw error;

            allSubjectsData = subjects || [];

            // Group by book
            const bookMap = new Map();
            allSubjectsData.forEach(s => {
                const key = s.subject_name + '|' + (s.group_name || '') + '|' + s.subject_type;
                if (!bookMap.has(key)) {
                    bookMap.set(key, {
                        subject_name: s.subject_name,
                        subject_type: s.subject_type,
                        group_name: s.group_name,
                        papers: []
                    });
                }
                bookMap.get(key).papers.push(s);
            });

            const books = Array.from(bookMap.values());
            const structure = SUBJECT_STRUCTURE[branch]?.[group];

            currentBulkSubjects.compulsory = books.filter(b => b.subject_type === 'compulsory' && !b.group_name);
            currentBulkSubjects.main = books.filter(b => b.subject_type === 'group');
            currentBulkSubjects.fourth = books.filter(b => b.subject_type === 'optional');

            // Render compulsory
            $('bulkCompulsoryList').innerHTML = currentBulkSubjects.compulsory.map(b =>
                `<div class="bcb-item"><i class="fas fa-check-circle"></i><span>${escapeHtml(b.subject_name)} (${b.papers.length} paper)</span></div>`
            ).join('') || '<div style="color:#6b7280;font-size:12px;">কোনো compulsory নেই</div>';

            $('bulkCompulsoryStep').style.display = 'block';

            // Render main subjects
            if (structure && structure.type === 'fixed_choice') {
                $('bulkMainTitle').textContent = 'Main Subjects (Fixed + Choice)';
                let html = '';
                structure.fixedMain.forEach(name => {
                    html += `
                        <div class="bulk-subject-item fixed">
                            <input type="checkbox" checked disabled>
                            <span class="bsi-name">${escapeHtml(name)}</span>
                            <span class="bsi-badge fixed">Fixed</span>
                        </div>
                    `;
                });
                structure.choiceMain.forEach(name => {
                    html += `
                        <label class="bulk-subject-item" data-subject="${escapeHtml(name)}">
                            <input type="radio" name="bulkMainRadio" value="${escapeHtml(name)}">
                            <span class="bsi-name">${escapeHtml(name)}</span>
                            <span class="bsi-badge choice">Choice</span>
                        </label>
                    `;
                });
                $('bulkMainList').innerHTML = html;
                $('bulkMainCounter').textContent = `2 / ${structure.mainCount}`;
                $('bulkMainStep').style.display = 'block';
            } else if (structure && structure.type === 'select_3') {
                $('bulkMainTitle').textContent = 'Main Subjects (৩টি select করুন)';
                $('bulkMainList').innerHTML = structure.mainPool.map(name => {
                    const book = currentBulkSubjects.main.find(b => b.subject_name === name);
                    if (!book) return '';
                    return `
                        <label class="bulk-subject-item" data-subject="${escapeHtml(name)}">
                            <input type="checkbox" name="bulkMainCheck" value="${escapeHtml(name)}">
                            <span class="bsi-name">${escapeHtml(name)}</span>
                        </label>
                    `;
                }).join('');
                $('bulkMainCounter').textContent = `0 / ${structure.mainCount}`;
                $('bulkMainStep').style.display = 'block';
            } else {
                $('bulkMainStep').style.display = 'none';
            }

            // 4th subject
            if (structure && structure.hasFourth && currentBulkSubjects.fourth.length > 0) {
                $('bulkFourthSubject').innerHTML = '<option value="">Select 4th Subject</option>' +
                    currentBulkSubjects.fourth.map(b => `<option value="${escapeHtml(b.subject_name)}">${escapeHtml(b.subject_name)}</option>`).join('');
                $('bulkFourthStep').style.display = 'block';
            } else {
                $('bulkFourthStep').style.display = 'none';
            }

            $('bulkStudentsStep').style.display = 'block';

        } catch (e) {
            console.error('Bulk group change error:', e);
            window.fdcError('Load failed: ' + e.message);
        }
    }

    // =========================================================
    // PARSE BULK STUDENTS (`.` separator)
    // =========================================================
    function parseBulkStudents() {
        const raw = $('bulkData').value.trim();
        if (!raw) return [];

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = [];

        lines.forEach((line, idx) => {
            let parts = [];

            // Priority: | > . > , (fallback)
            if (line.includes('|')) {
                parts = line.split('|').map(p => p.trim());
            } else if (line.includes('.')) {
                // Smart dot split — Roll.Name বা Roll.Name.4th
                // But don't split inside numbers like 12.5 — assume roll/name don't have dots
                parts = line.split('.').map(p => p.trim()).filter(Boolean);
            } else {
                parts = line.split(',').map(p => p.trim()).filter(Boolean);
            }

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
    // PREVIEW BULK IMPORT
    // =========================================================
    async function previewBulkImport() {
        const cfg = {
            class_name: $('bulkClass').value,
            year: $('bulkYear').value,
            session: $('bulkSession').value,
            branch: $('bulkBranch').value,
            group: $('bulkGroup').value
        };

        if (!cfg.class_name || !cfg.year || !cfg.branch) {
            return window.fdcWarning('Common settings পূরণ করুন।');
        }
        if (cfg.branch === 'HSC' && !cfg.group) {
            return window.fdcWarning('Group সিলেক্ট করুন।');
        }

        const students = parseBulkStudents();
        if (students.length === 0) return window.fdcWarning('কোনো student নেই।');

        // Duplicate check within list
        const rollMap = new Map();
        students.forEach(s => {
            if (!s.roll) { s.row_status = 'error'; s.error_msg = 'No roll'; return; }
            if (rollMap.has(s.roll)) {
                s.row_status = 'error'; s.error_msg = 'Duplicate';
                rollMap.get(s.roll).row_status = 'error'; rollMap.get(s.roll).error_msg = 'Duplicate';
            } else rollMap.set(s.roll, s);
        });

        // Check existing in DB
        const rolls = students.map(s => s.roll).filter(r => r);
        if (rolls.length > 0) {
            const { data: existing } = await window.FDC_SUPABASE
                .from('students').select('roll')
                .eq('class_name', cfg.class_name).eq('year', cfg.year).eq('branch', cfg.branch).in('roll', rolls);
            const existingRolls = new Set((existing || []).map(e => e.roll));
            students.forEach(s => {
                if (existingRolls.has(s.roll) && s.row_status !== 'error') {
                    s.row_status = 'warn'; s.warn_msg = 'DB-তে আছে';
                }
            });
        }

        // Store globally for save
        window._bulkPreviewStudents = students;
        renderBulkPreview(students, cfg);

        const hasErrors = students.some(s => s.row_status === 'error');
        $('saveBulkBtn').disabled = hasErrors;

        if (!hasErrors) {
            const warnings = students.filter(s => s.row_status === 'warn').length;
            if (warnings > 0) window.fdcWarning(`${warnings}টি student DB-তে আগেই আছে — skip হবে।`);
            else window.fdcSuccess(`${students.length}টি student ready — Save All চাপুন।`);
        } else window.fdcError('কিছু student-এ error আছে।');
    }

    // =========================================================
    // RENDER BULK PREVIEW (Editable 4th Subject)
    // =========================================================
    function renderBulkPreview(students, cfg) {
        const tbody = $('bulkPreviewBody');
        const structure = SUBJECT_STRUCTURE[cfg.branch]?.[cfg.group];
        const hasFourth = structure?.hasFourth && currentBulkSubjects.fourth.length > 0;

        let html = '';
        students.forEach((s, i) => {
            let statusBadge = '<span class="preview-status-badge ok">OK</span>';
            let rowClass = '';

            if (s.row_status === 'error') {
                statusBadge = `<span class="preview-status-badge error" title="${escapeHtml(s.error_msg || '')}">Error</span>`;
                rowClass = 'error';
            } else if (s.row_status === 'warn') {
                statusBadge = `<span class="preview-status-badge warn" title="${escapeHtml(s.warn_msg || '')}">Skip</span>`;
                rowClass = 'warn';
            }

            let fourthCell = '';
            if (hasFourth) {
                const currentValue = s.fourth_override || '';
                fourthCell = `
                    <select class="preview-select" data-line-no="${s.line_no}">
                        <option value="">— Select —</option>
                        ${currentBulkSubjects.fourth.map(b => 
                            `<option value="${escapeHtml(b.subject_name)}" ${currentValue === b.subject_name ? 'selected' : ''}>${escapeHtml(b.subject_name)}</option>`
                        ).join('')}
                    </select>
                `;
            } else {
                fourthCell = `<span style="color:#9ca3af;font-size:11.5px;">—</span>`;
            }

            html += `
                <tr class="${rowClass}">
                    <td>${i + 1}</td>
                    <td>${escapeHtml(s.roll || '—')}</td>
                    <td>${escapeHtml(s.name || '—')}</td>
                    <td>${fourthCell}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Attach change events to preview selects
        tbody.querySelectorAll('.preview-select').forEach(sel => {
            sel.addEventListener('change', function () {
                const lineNo = parseInt(this.dataset.lineNo);
                const student = window._bulkPreviewStudents.find(s => s.line_no === lineNo);
                if (student) {
                    student.fourth_override = this.value;
                }
            });
        });

        $('bulkPreviewCount').textContent = `(${students.length} students)`;
        $('bulkPreview').style.display = 'block';
    }

    // =========================================================
    // SAVE BULK IMPORT
    // =========================================================
    async function saveBulkImport() {
        const cfg = {
            class_name: $('bulkClass').value,
            year: $('bulkYear').value,
            session: $('bulkSession').value,
            branch: $('bulkBranch').value,
            group: $('bulkGroup').value
        };

        const students = (window._bulkPreviewStudents || []).filter(s => s.row_status !== 'error' && s.row_status !== 'warn');
        if (students.length === 0) return window.fdcWarning('কোনো valid student নেই।');

        // Get selected main subjects
        const selectedMain = Array.from(document.querySelectorAll('input[name="bulkMainCheck"]:checked')).map(cb => cb.value);
        const radioChoice = document.querySelector('input[name="bulkMainRadio"]:checked')?.value || '';
        const defaultFourth = $('bulkFourthSubject').value || '';

        window.fdcConfirm(
            `${students.length} জন student যোগ করা হবে। নিশ্চিত?`,
            async function () {
                const btn = $('saveBulkBtn');
                const original = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                try {
                    // 1. Insert students
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
                        .from('students').insert(studentRecords).select();

                    if (insErr) throw insErr;

                    // 2. Assign subjects
                    const structure = SUBJECT_STRUCTURE[cfg.branch]?.[cfg.group];

                    for (const stu of (inserted || [])) {
                        const matched = students.find(s => s.roll === stu.roll);
                        if (!matched) continue;

                        const records = [];
                        const addedIds = new Set();

                        // Compulsory — all
                        currentBulkSubjects.compulsory.forEach(b => {
                            b.papers.forEach(p => {
                                if (!addedIds.has(p.id)) {
                                    addedIds.add(p.id);
                                    records.push({ student_id: stu.id, subject_id: p.id, subject_type: 'compulsory' });
                                }
                            });
                        });

                        // Main subjects
                        if (structure?.type === 'fixed_choice') {
                            // Fixed
                            structure.fixedMain.forEach(name => {
                                const book = currentBulkSubjects.main.find(b => b.subject_name === name);
                                if (book) {
                                    book.papers.forEach(p => {
                                        if (!addedIds.has(p.id)) {
                                            addedIds.add(p.id);
                                            records.push({ student_id: stu.id, subject_id: p.id, subject_type: 'group' });
                                        }
                                    });
                                }
                            });
                            // Choice
                            if (radioChoice) {
                                const book = currentBulkSubjects.main.find(b => b.subject_name === radioChoice);
                                if (book) {
                                    book.papers.forEach(p => {
                                        if (!addedIds.has(p.id)) {
                                            addedIds.add(p.id);
                                            records.push({ student_id: stu.id, subject_id: p.id, subject_type: 'group' });
                                        }
                                    });
                                }
                            }
                        } else if (structure?.type === 'select_3') {
                            selectedMain.forEach(name => {
                                const book = currentBulkSubjects.main.find(b => b.subject_name === name);
                                if (book) {
                                    book.papers.forEach(p => {
                                        if (!addedIds.has(p.id)) {
                                            addedIds.add(p.id);
                                            records.push({ student_id: stu.id, subject_id: p.id, subject_type: 'group' });
                                        }
                                    });
                                }
                            });
                        } else if (structure?.type === 'all_fixed') {
                            // BM — all compulsory already covered above
                        }

                        // 4th subject (optional)
                        const fourthName = matched.fourth_override || defaultFourth;
                        if (fourthName && structure?.hasFourth) {
                            const book = currentBulkSubjects.fourth.find(b => b.subject_name === fourthName);
                            if (book) {
                                book.papers.forEach(p => {
                                    if (!addedIds.has(p.id)) {
                                        addedIds.add(p.id);
                                        records.push({ student_id: stu.id, subject_id: p.id, subject_type: 'optional' });
                                    }
                                });
                            }
                        }

                        if (records.length > 0) {
                            await window.FDC_SUPABASE.from('student_subjects').insert(records);
                        }
                    }

                    closeModal('bulkImportModal');
                    window.fdcSuccess(`${inserted.length} জন student সফলভাবে যোগ হয়েছে!`);
                    await loadAllStudents();

                } catch (e) {
                    console.error('Bulk save error:', e);
                    window.fdcError('Save failed: ' + e.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
            },
            { title: 'Bulk Import নিশ্চিত করুন', confirmText: 'হ্যাঁ, Save করুন', cancelText: 'বাতিল', confirmType: 'primary' }
        );
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Add student
        $('btnAddStudent').addEventListener('click', openAddStudentModal);

        // Modal: student
        $('closeStudentModal').addEventListener('click', () => closeModal('studentModal'));
        $('cancelStudentBtn').addEventListener('click', () => closeModal('studentModal'));
        $('saveStudentBtn').addEventListener('click', saveStudent);

        // Branch change in student modal
        $('studentBranch').addEventListener('change', async function () {
            const branch = this.value;
            if (branch === 'HSC') {
                await loadGroupsByBranch('HSC', 'studentGroup');
                $('groupFieldWrap').style.display = 'block';
            } else {
                $('groupFieldWrap').style.display = 'none';
            }
        });

        // Year change → session auto
        $('studentYear').addEventListener('change', function () {
            if (!editingStudentId) $('studentSession').value = getSessionFromYear(this.value);
        });

        // Smart search
        $('searchInput').addEventListener('input', function () {
            $('searchClear').classList.toggle('show', this.value.length > 0);
            applyFiltersAndRender();
        });

        $('searchClear').addEventListener('click', function () {
            $('searchInput').value = '';
            this.classList.remove('show');
            applyFiltersAndRender();
        });

        // Filters
        ['filterClass', 'filterBranch', 'filterGroup', 'filterSort'].forEach(id => {
            $(id).addEventListener('change', applyFiltersAndRender);
        });

        // Section + student actions (delegated)
        $('sectionsContainer').addEventListener('click', function (e) {
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                const action = actionEl.dataset.action;

                if (action === 'toggle-section') {
                    const section = actionEl.closest('[data-section-key]');
                    if (section) toggleSection(section.dataset.sectionKey);
                    return;
                }

                const id = actionEl.dataset.id;
                if (!id) return;

                if (action === 'view') viewStudent(id);
                else if (action === 'edit') openEditStudentModal(id);
                else if (action === 'subject') openSubjectEditModal(id);
                else if (action === 'toggle') toggleStudent(id);
                else if (action === 'delete') deleteStudent(id);
            }
        });

        // Bulk import
        $('btnBulkImport').addEventListener('click', () => {
            resetBulkModal();
            openModal('bulkImportModal');
        });

        $('closeBulkModal').addEventListener('click', () => closeModal('bulkImportModal'));
        $('cancelBulkBtn').addEventListener('click', () => closeModal('bulkImportModal'));

        $('bulkClass').addEventListener('change', onBulkGroupChange);
        $('bulkYear').addEventListener('change', function () {
            $('bulkSession').value = getSessionFromYear(this.value);
        });
        $('bulkBranch').addEventListener('change', onBulkBranchChange);
        $('bulkGroup').addEventListener('change', onBulkGroupChange);

        $('previewBulkBtn').addEventListener('click', previewBulkImport);
        $('saveBulkBtn').addEventListener('click', saveBulkImport);

        // Subject edit modal
        $('closeSubjectModal').addEventListener('click', () => closeModal('subjectEditModal'));
        $('cancelSubjectBtn').addEventListener('click', () => closeModal('subjectEditModal'));
        $('saveSubjectBtn').addEventListener('click', saveSubjectEdit);

        // View modal
        $('closeViewModal').addEventListener('click', () => closeModal('viewStudentModal'));
        $('closeViewBtn').addEventListener('click', () => closeModal('viewStudentModal'));

        // Backdrop
        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });

        // ESC
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
                document.body.style.overflow = '';
            }
        });
    }

    // =========================================================
    // LOAD GROUPS FOR FILTER
    // =========================================================
    async function loadGroupsForFilter() {
        try {
            const { data } = await window.FDC_SUPABASE
                .from('groups').select('*').eq('is_active', true).order('sort_order');

            const select = $('filterGroup');
            select.innerHTML = '<option value="">All Groups</option>';
            (data || []).forEach(g => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(g.group_name)}">${escapeHtml(g.display_name)}</option>`);
            });
        } catch (e) { console.warn('Load groups for filter:', e); }
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Students v13.0 initializing...');

        if (!window.FDCSession) {
            console.warn('⚠️ Session helper not loaded, retrying...');
            setTimeout(init, 300);
            return;
        }

        await loadYearOptions();
        await loadGroupsForFilter();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllStudents();

            console.log('✅ Admin Students v13.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();