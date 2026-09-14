/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN STUDENTS MANAGEMENT
 * Location: js/admin-students.js
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * Updated: Optional subject query fixed (group_name filter)
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
    let selectedTradeSubject = null;

    let currentGroupSubjects = [];
    let currentOptionalSubjects = [];
    let currentTradeSubjects = [];
    let currentCompulsorySubjects = [];

    let bulkPreviewRows = [];

    let bsSelectedGroup = [];
    let bsSelectedOptional = null;
    let bsMatchedStudents = [];

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

    // =========================================================
    // SESSION → auto session from year
    // =========================================================
    function getSessionFromYear(year) {
        if (!year) return '';
        const y = parseInt(year);
        if (isNaN(y)) return '';
        return y + '-' + (y + 1);
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
    // LOAD ADMIN INFO
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
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try {
                    if (window.FDCAuth) await window.FDCAuth.logout();
                } catch (e) { console.warn(e); }
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
    // LOAD YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -2; i <= 2; i++) years.push(currentYear + i);

        const filterYear = $('filterYear');
        const studentYear = $('studentYear');
        const bulkYear = $('bulkYear');
        const copyFromYear = $('copyFromYear');
        const copyToYear = $('copyToYear');

        years.forEach(y => {
            if (filterYear) filterYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            if (studentYear) studentYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            if (bulkYear) bulkYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            if (copyFromYear) copyFromYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            if (copyToYear) copyToYear.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
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
            window.fdcError('Student load failed: ' + e.message);
        }
    }

    // =========================================================
    // STATS
    // =========================================================
    function updateStats() {
        const total = allStudents.length;
        const hsc = allStudents.filter(s => s.branch === 'HSC').length;
        const bm = allStudents.filter(s => s.branch === 'BM').length;
        const active = allStudents.filter(s => s.is_active).length;

        $('totalStudents').textContent = total;
        $('statTotal').textContent = total;
        $('statHSC').textContent = hsc;
        $('statBM').textContent = bm;
        $('statActive').textContent = active;
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
                    <p>"Add Student" বাটনে ক্লিক করে নতুন যোগ করুন</p>
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
                        <button class="action-btn view" data-action="view" data-id="${s.id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-action="edit" data-id="${s.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn subject" data-action="subject" data-id="${s.id}" title="Subjects">
                            <i class="fas fa-book"></i>
                        </button>
                        <button class="action-btn toggle off" data-action="toggle" data-id="${s.id}" title="Deactivate">
                            <i class="fas fa-user-slash"></i>
                        </button>
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
    // LOAD SUBJECTS FOR GROUP
    // ⭐ Updated: Optional query-তে group_name filter যোগ
    // =========================================================
    async function loadSubjectsForGroup(branch, className, groupName) {
        try {
            // Compulsory — group_name ছাড়া (কারণ compulsory-তে group_name = NULL)
            const { data: compulsory, error: compErr } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('branch', branch)
                .eq('class_name', className)
                .eq('subject_type', 'compulsory')
                .eq('is_active', true)
                .order('sort_order');

            if (compErr) console.error('Compulsory error:', compErr);

            // Group subjects — নির্দিষ্ট group-এর
            const { data: group, error: grpErr } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('branch', branch)
                .eq('class_name', className)
                .eq('group_name', groupName)
                .eq('subject_type', 'group')
                .eq('is_active', true)
                .order('sort_order');

            if (grpErr) console.error('Group error:', grpErr);

            // ⭐ Optional — নির্দিষ্ট group-এর জন্য (group_name filter যোগ)
            const { data: optional, error: optErr } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('branch', branch)
                .eq('class_name', className)
                .eq('group_name', groupName)      // ← এটাই নতুন
                .eq('subject_type', 'optional')
                .eq('is_active', true)
                .order('sort_order');

            if (optErr) console.error('Optional error:', optErr);

            console.log('📚 Loaded subjects:', {
                branch, className, groupName,
                compulsory: compulsory?.length || 0,
                group: group?.length || 0,
                optional: optional?.length || 0
            });

            return {
                compulsory: compulsory || [],
                group: group || [],
                optional: optional || []
            };
        } catch (e) {
            console.error('Load subjects error:', e);
            return { compulsory: [], group: [], optional: [] };
        }
    }

    // =========================================================
    // GROUP SUBJECTS BY NAME (১ম + ২য় পত্র একসাথে)
    // =========================================================
    function groupSubjectsByName(subjects) {
        const map = new Map();
        subjects.forEach(s => {
            const key = s.subject_name;
            if (!map.has(key)) {
                map.set(key, {
                    name: s.subject_name,
                    code: s.subject_code,
                    type: s.subject_type,
                    group: s.group_name,
                    papers: []
                });
            }
            map.get(key).papers.push(s);
        });
        return Array.from(map.values());
    }

    // =========================================================
    // RENDER SUBJECT SELECTION (Modal)
    // =========================================================
    async function renderSubjectSelection(branch, className, groupName, existingSubjects = []) {
        const subjectsData = await loadSubjectsForGroup(branch, className, groupName);
        currentCompulsorySubjects = groupSubjectsByName(subjectsData.compulsory);
        currentGroupSubjects = groupSubjectsByName(subjectsData.group);
        currentOptionalSubjects = groupSubjectsByName(subjectsData.optional);

        // Reset selection
        if (existingSubjects.length === 0) {
            selectedGroupSubjects = [];
            selectedOptionalSubject = null;
            selectedTradeSubject = null;
        } else {
            const existingIds = existingSubjects.map(e => e.subject_id);
            selectedGroupSubjects = [];
            selectedOptionalSubject = null;

            currentGroupSubjects.forEach(gs => {
                const allPapersSelected = gs.papers.every(p => existingIds.includes(p.id));
                if (allPapersSelected) selectedGroupSubjects.push(gs.name);
            });

            currentOptionalSubjects.forEach(os => {
                const anyPaperSelected = os.papers.some(p => existingIds.includes(p.id));
                if (anyPaperSelected) selectedOptionalSubject = os.name;
            });
        }

        // Compulsory (locked)
        renderCompulsoryLocked(currentCompulsorySubjects);

        // Group subjects
        renderGroupSubjectList(currentGroupSubjects, selectedGroupSubjects);

        // Optional subjects
        renderOptionalSubjectList(currentOptionalSubjects, selectedOptionalSubject);

        // Show/hide sections
        $('compulsoryBox').style.display = currentCompulsorySubjects.length > 0 ? 'block' : 'none';
        $('groupBox').style.display = currentGroupSubjects.length > 0 ? 'block' : 'none';
        $('optionalBox').style.display = currentOptionalSubjects.length > 0 ? 'block' : 'none';

        // Info message
        const info = $('subjectInfo');
        if (branch === 'BM') {
            info.innerHTML = '<i class="fas fa-info-circle"></i> BM শাখায় trade subject আলাদা করে দেখানো হবে।';
            info.style.display = 'flex';
        } else {
            info.innerHTML = '<i class="fas fa-info-circle"></i> গ্রুপ থেকে ৩টি বিষয় এবং ঐচ্ছিক থেকে ১টি সিলেক্ট করুন।';
            info.style.display = 'flex';
        }

        updateSubjectBadge();
    }

    function renderCompulsoryLocked(list) {
        const el = $('compulsoryList');
        el.innerHTML = list.map(g => {
            const codes = g.papers.map(p => p.subject_code).filter(Boolean).join(', ');
            return `<div class="subject-item checked disabled">
                <div class="si-check"><i class="fas fa-check"></i></div>
                <div class="si-content">
                    <div class="si-name">${escapeHtml(g.name)}</div>
                    <div class="si-meta">
                        ${codes ? `<span class="code">${escapeHtml(codes)}</span>` : ''}
                        ${g.papers.length} paper
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function renderGroupSubjectList(list, selectedNames) {
        const el = $('groupList');
        if (list.length === 0) {
            el.innerHTML = '<div style="grid-column:1/-1;color:var(--grey);font-size:12px;padding:8px;">No group subjects available</div>';
            return;
        }
        el.innerHTML = list.map(g => {
            const isChecked = selectedNames.includes(g.name);
            const codes = g.papers.map(p => p.subject_code).filter(Boolean).join(', ');
            return `<div class="subject-item ${isChecked ? 'checked' : ''}" data-group-subject="${escapeHtml(g.name)}">
                <div class="si-check">${isChecked ? '<i class="fas fa-check"></i>' : ''}</div>
                <div class="si-content">
                    <div class="si-name">${escapeHtml(g.name)}</div>
                    <div class="si-meta">
                        ${codes ? `<span class="code">${escapeHtml(codes)}</span>` : ''}
                        ${g.papers.length} paper
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function renderOptionalSubjectList(list, selectedName) {
        const el = $('optionalList');
        if (list.length === 0) {
            el.innerHTML = '<div style="grid-column:1/-1;color:var(--grey);font-size:12px;padding:8px;">No optional subjects available</div>';
            return;
        }
        el.innerHTML = list.map(g => {
            const isChecked = selectedName === g.name;
            const codes = g.papers.map(p => p.subject_code).filter(Boolean).join(', ');
            return `<div class="subject-item ${isChecked ? 'checked' : ''}" data-optional-subject="${escapeHtml(g.name)}">
                <div class="si-radio"></div>
                <div class="si-content">
                    <div class="si-name">${escapeHtml(g.name)}</div>
                    <div class="si-meta">
                        ${codes ? `<span class="code">${escapeHtml(codes)}</span>` : ''}
                        ${g.papers.length} paper
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function updateSubjectBadge() {
        $('subjectBadge').textContent = `${selectedGroupSubjects.length} / 3`;
    }

    // =========================================================
    // SUBJECT SELECTION EVENTS (delegated)
    // =========================================================
    document.addEventListener('click', function (e) {
        const groupItem = e.target.closest('[data-group-subject]');
        if (groupItem) {
            const name = groupItem.dataset.groupSubject;
            const idx = selectedGroupSubjects.indexOf(name);
            if (idx > -1) {
                selectedGroupSubjects.splice(idx, 1);
                groupItem.classList.remove('checked');
                const check = groupItem.querySelector('.si-check');
                if (check) check.innerHTML = '';
            } else {
                if (selectedGroupSubjects.length >= 3) {
                    window.fdcWarning('সর্বোচ্চ ৩টি group subject select করা যাবে।');
                    return;
                }
                selectedGroupSubjects.push(name);
                groupItem.classList.add('checked');
                const check = groupItem.querySelector('.si-check');
                if (check) check.innerHTML = '<i class="fas fa-check"></i>';
            }
            updateSubjectBadge();
            return;
        }

        const optItem = e.target.closest('[data-optional-subject]');
        if (optItem) {
            const name = optItem.dataset.optionalSubject;
            document.querySelectorAll('[data-optional-subject]').forEach(el => {
                el.classList.remove('checked');
            });
            if (selectedOptionalSubject === name) {
                selectedOptionalSubject = null;
            } else {
                selectedOptionalSubject = name;
                optItem.classList.add('checked');
            }
            return;
        }

        const tradeItem = e.target.closest('[data-trade-subject]');
        if (tradeItem) {
            const name = tradeItem.dataset.tradeSubject;
            document.querySelectorAll('[data-trade-subject]').forEach(el => {
                el.classList.remove('checked');
            });
            if (selectedTradeSubject === name) {
                selectedTradeSubject = null;
            } else {
                selectedTradeSubject = name;
                tradeItem.classList.add('checked');
            }
            return;
        }
    });

    // =========================================================
    // MODAL: OPEN / CLOSE
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
        selectedGroupSubjects = [];
        selectedOptionalSubject = null;
        selectedTradeSubject = null;

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

    // =========================================================
    // EDIT STUDENT
    // =========================================================
    async function openEditStudentModal(id) {
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
            selectedGroupSubjects = [];
            selectedOptionalSubject = null;
            selectedTradeSubject = null;

            $('editStudentId').value = id;
            $('studentModalTitle').textContent = 'Edit Student';
            $('studentModalSub').textContent = student.name;
            $('studentModalIcon').className = 'fas fa-user-edit';
            $('saveStudentBtn').innerHTML = '<i class="fas fa-save"></i> Update Student';

            $('studentName').value = student.name || '';
            $('studentRoll').value = student.roll || '';
            $('studentClass').value = student.class_name || '';
            $('studentYear').value = student.year || '';
            $('studentSession').value = student.session || '';
            $('studentBranch').value = student.branch || '';

            if (student.branch === 'HSC') {
                await loadGroupsByBranch('HSC', 'studentGroup');
                $('groupFieldWrap').style.display = 'block';
                $('studentGroup').value = student.group_name || '';
            } else {
                $('groupFieldWrap').style.display = 'none';
            }

            if (student.class_name && student.branch) {
                await renderSubjectSelection(
                    student.branch,
                    student.class_name,
                    student.group_name || 'BM-General',
                    selectedSubs || []
                );
                $('subjectsSection').style.display = 'block';
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

        if (!name) return window.fdcWarning('নাম দিতে হবে।');
        if (!roll) return window.fdcWarning('Roll দিতে হবে।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!year) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName) return window.fdcWarning('Group সিলেক্ট করুন।');

        if (branch === 'HSC') {
            if (selectedGroupSubjects.length !== 3) {
                return window.fdcWarning(`গ্রুপ থেকে ঠিক ৩টি বিষয় select করতে হবে। (এখন ${selectedGroupSubjects.length}টি)`);
            }
            if (!selectedOptionalSubject) {
                return window.fdcWarning('একটি ঐচ্ছিক বিষয় select করুন।');
            }
        }

        const session = getSessionFromYear(year);
        const btn = $('saveStudentBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const studentData = {
                name, roll,
                class_name: className,
                year,
                session,
                branch,
                group_name: branch === 'HSC' ? groupName : 'BM-General'
            };

            let studentId = editingStudentId;
            if (editingStudentId) {
                const { error } = await window.FDC_SUPABASE
                    .from('students').update(studentData).eq('id', editingStudentId);
                if (error) throw error;
            } else {
                const { data: inserted, error } = await window.FDC_SUPABASE
                    .from('students').insert([studentData]).select().single();
                if (error) throw error;
                studentId = inserted.id;
            }

            await saveStudentSubjects(studentId, branch, className, groupName);

            window.fdcSuccess(editingStudentId ? 'Student updated successfully!' : 'Student created successfully!');
            closeModal('studentModal');
            await loadAllStudents();
        } catch (e) {
            console.error('Save student error:', e);
            if (e.message && e.message.includes('duplicate')) {
                window.fdcError('এই Roll + Class + Year + Session + Group আগেই আছে।');
            } else {
                window.fdcError('Save failed: ' + e.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function saveStudentSubjects(studentId, branch, className, groupName) {
        await window.FDC_SUPABASE.from('student_subjects').delete().eq('student_id', studentId);

        const records = [];
        const addedIds = new Set();

        function addSubject(subjectId, subjectType) {
            if (addedIds.has(subjectId)) return;
            addedIds.add(subjectId);
            records.push({ student_id: studentId, subject_id: subjectId, subject_type: subjectType });
        }

        currentCompulsorySubjects.forEach(g => {
            g.papers.forEach(p => addSubject(p.id, 'compulsory'));
        });

        if (branch === 'HSC') {
            currentGroupSubjects.forEach(g => {
                if (selectedGroupSubjects.includes(g.name)) {
                    g.papers.forEach(p => addSubject(p.id, 'group'));
                }
            });

            if (selectedOptionalSubject) {
                const opt = currentOptionalSubjects.find(g => g.name === selectedOptionalSubject);
                if (opt) {
                    opt.papers.forEach(p => addSubject(p.id, 'optional'));
                }
            }
        }

        if (records.length > 0) {
            const { error } = await window.FDC_SUPABASE.from('student_subjects').insert(records);
            if (error) throw error;
        }
    }

    // =========================================================
    // TOGGLE ACTIVE
    // =========================================================
    async function toggleStudent(id) {
        const s = allStudents.find(x => x.id === id);
        if (!s) return;

        window.fdcConfirm(
            `"${s.name}" কে deactivate করতে চান? সে আর result-এ দেখা যাবে না।`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('students')
                        .update({ is_active: false })
                        .eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Student deactivated');
                    await loadAllStudents();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            },
            {
                title: 'Deactivate Student',
                confirmText: 'Yes, Deactivate',
                confirmType: 'danger'
            }
        );
    }

    // =========================================================
    // VIEW STUDENT
    // =========================================================
    async function viewStudent(id) {
        try {
            const student = allStudents.find(s => s.id === id);
            if (!student) return;

            const { data: subs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_type, subject_id, subjects(subject_name, subject_code, paper_number)')
                .eq('student_id', id)
                .eq('is_active', true);

            const compSubs = (subs || []).filter(s => s.subject_type === 'compulsory');
            const grpSubs = (subs || []).filter(s => s.subject_type === 'group');
            const optSubs = (subs || []).filter(s => s.subject_type === 'optional');

            function renderList(list) {
                if (list.length === 0) return '<div style="color:var(--grey);font-size:12px;">কিছু নেই</div>';
                return list.map(s => {
                    const sn = s.subjects?.subject_name || '—';
                    const sc = s.subjects?.subject_code || '';
                    return `<div style="padding:6px 0;font-size:12.5px;">
                        <strong>${escapeHtml(sn)}</strong>
                        ${sc ? `<span class="code" style="background:rgba(10,22,85,0.06);color:var(--navy);padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">${escapeHtml(sc)}</span>` : ''}
                    </div>`;
                }).join('');
            }

            const html = `
                <div style="margin-bottom:16px;">
                    <div style="font-size:11px;color:var(--grey);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Student Info</div>
                    <div style="margin-top:8px;font-size:14px;color:var(--dark);">
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
                    <div style="font-size:11px;color:var(--grey);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;">Subjects (${(subs || []).length})</div>
                    <div style="margin-bottom:12px;">
                        <div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">📌 আবশ্যিক</div>
                        ${renderList(compSubs)}
                    </div>
                    <div style="margin-bottom:12px;">
                        <div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">📚 গ্রুপের</div>
                        ${renderList(grpSubs)}
                    </div>
                    <div>
                        <div style="font-size:12px;color:var(--navy);font-weight:700;margin-bottom:4px;">🎯 ঐচ্ছিক</div>
                        ${renderList(optSubs)}
                    </div>
                </div>
            `;

            $('viewStudentBody').innerHTML = html;
            openModal('viewStudentModal');
        } catch (e) {
            console.error('View student error:', e);
            window.fdcError('Load failed: ' + e.message);
        }
    }

    // =========================================================
    // BULK IMPORT
    // =========================================================
    function parseBulkData() {
        const raw = $('bulkData').value.trim();
        if (!raw) return [];

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        const rows = [];
        lines.forEach(line => {
            const parts = line.split(/\t|,| {2,}/).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
                rows.push({ roll: parts[0], name: parts[1] });
            }
        });
        return rows;
    }

    function previewBulk() {
        const rows = parseBulkData();
        bulkPreviewRows = rows;

        if (rows.length === 0) {
            window.fdcWarning('কোনো valid data পাওয়া যায়নি। Roll, Name format ব্যবহার করুন।');
            $('bulkPreview').style.display = 'none';
            return;
        }

        $('bulkCount').textContent = `(${rows.length} rows)`;
        $('bulkPreviewBody').innerHTML = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.roll)}</td>
                <td>${escapeHtml(r.name)}</td>
            </tr>
        `).join('');

        $('bulkPreview').style.display = 'block';
    }

    async function saveBulk() {
        const className = $('bulkClass').value;
        const year = $('bulkYear').value;
        const branch = $('bulkBranch').value;

        if (!className || !year || !branch) {
            return window.fdcWarning('Class, Year, Branch সব সিলেক্ট করুন।');
        }

        const rows = bulkPreviewRows.length > 0 ? bulkPreviewRows : parseBulkData();
        if (rows.length === 0) {
            return window.fdcWarning('কোনো valid data নেই।');
        }

        window.fdcConfirm(
            `${rows.length} জন student যোগ করা হবে। নিশ্চিত?`,
            async function () {
                const session = getSessionFromYear(year);
                const records = rows.map(r => ({
                    name: r.name,
                    roll: r.roll,
                    class_name: className,
                    year,
                    session,
                    branch,
                    group_name: branch === 'HSC' ? null : 'BM-General'
                }));

                try {
                    const { data, error } = await window.FDC_SUPABASE
                        .from('students').insert(records).select();
                    if (error) {
                        if (error.message.includes('duplicate')) {
                            window.fdcWarning('কিছু student duplicate ছিল, বাদ পড়েছে।');
                        } else throw error;
                    }
                    window.fdcSuccess(`${(data || []).length} জন student যোগ হয়েছে।`);
                    closeModal('bulkImportModal');
                    $('bulkData').value = '';
                    $('bulkPreview').style.display = 'none';
                    bulkPreviewRows = [];
                    await loadAllStudents();
                } catch (e) {
                    window.fdcError('Bulk save failed: ' + e.message);
                }
            },
            { title: 'Confirm Bulk Import', confirmText: 'Yes, Import' }
        );
    }

    // =========================================================
    // BULK SUBJECT ASSIGNMENT
    // =========================================================
    async function bsLoadStudents() {
        const cls = $('bsClass').value;
        const branch = $('bsBranch').value;
        const group = $('bsGroup').value;

        if (!cls || !branch) {
            $('bsInfo').style.display = 'none';
            $('bsSubjectsArea').style.display = 'none';
            $('applyBsBtn').disabled = true;
            return;
        }

        let query = window.FDC_SUPABASE.from('students').select('*')
            .eq('class_name', cls).eq('branch', branch).eq('is_active', true);

        if (branch === 'HSC' && group) query = query.eq('group_name', group);

        const { data } = await query;
        bsMatchedStudents = data || [];

        $('bsInfoText').textContent = `${bsMatchedStudents.length} জন student পাওয়া গেছে`;
        $('bsInfo').style.display = 'flex';

        if (bsMatchedStudents.length === 0) {
            $('bsSubjectsArea').style.display = 'none';
            $('applyBsBtn').disabled = true;
            return;
        }

        const subjectsData = await loadSubjectsForGroup(branch, cls, group || 'BM-General');
        const compGrouped = groupSubjectsByName(subjectsData.compulsory);
        const grpGrouped = groupSubjectsByName(subjectsData.group);
        const optGrouped = groupSubjectsByName(subjectsData.optional);

        $('bsCompulsoryList').innerHTML = compGrouped.map(g =>
            `<div class="subject-item checked disabled">
                <div class="si-check"><i class="fas fa-check"></i></div>
                <div class="si-content"><div class="si-name">${escapeHtml(g.name)}</div></div>
            </div>`
        ).join('');

        bsSelectedGroup = [];
        bsSelectedOptional = null;

        $('bsGroupList').innerHTML = grpGrouped.map(g =>
            `<div class="subject-item" data-bs-group="${escapeHtml(g.name)}">
                <div class="si-check"></div>
                <div class="si-content"><div class="si-name">${escapeHtml(g.name)}</div></div>
            </div>`
        ).join('');

        $('bsOptionalList').innerHTML = optGrouped.map(g =>
            `<div class="subject-item" data-bs-opt="${escapeHtml(g.name)}">
                <div class="si-radio"></div>
                <div class="si-content"><div class="si-name">${escapeHtml(g.name)}</div></div>
            </div>`
        ).join('');

        $('bsSubjectsArea').style.display = 'block';
        $('applyBsBtn').disabled = true;

        window._bsData = { compGrouped, grpGrouped, optGrouped };
    }

    function bsUpdateApplyBtn() {
        if ($('bsBranch').value === 'HSC') {
            $('applyBsBtn').disabled = (bsSelectedGroup.length !== 3 || !bsSelectedOptional);
        } else {
            $('applyBsBtn').disabled = false;
        }
    }

    document.addEventListener('click', function (e) {
        const g = e.target.closest('[data-bs-group]');
        if (g) {
            const name = g.dataset.bsGroup;
            const i = bsSelectedGroup.indexOf(name);
            if (i > -1) {
                bsSelectedGroup.splice(i, 1);
                g.classList.remove('checked');
                g.querySelector('.si-check').innerHTML = '';
            } else {
                if (bsSelectedGroup.length >= 3) {
                    window.fdcWarning('সর্বোচ্চ ৩টি group subject।');
                    return;
                }
                bsSelectedGroup.push(name);
                g.classList.add('checked');
                g.querySelector('.si-check').innerHTML = '<i class="fas fa-check"></i>';
            }
            bsUpdateApplyBtn();
            return;
        }

        const o = e.target.closest('[data-bs-opt]');
        if (o) {
            const name = o.dataset.bsOpt;
            document.querySelectorAll('[data-bs-opt]').forEach(el => el.classList.remove('checked'));
            if (bsSelectedOptional === name) {
                bsSelectedOptional = null;
            } else {
                bsSelectedOptional = name;
                o.classList.add('checked');
            }
            bsUpdateApplyBtn();
            return;
        }
    });

    async function bsApply() {
        if (!window._bsData) return;

        const { compGrouped, grpGrouped, optGrouped } = window._bsData;

        window.fdcConfirm(
            `${bsMatchedStudents.length} জন student-কে subject assign করা হবে। নিশ্চিত?`,
            async function () {
                try {
                    let totalRecords = 0;

                    for (const s of bsMatchedStudents) {
                        await window.FDC_SUPABASE.from('student_subjects').delete().eq('student_id', s.id);

                        const records = [];
                        const addedIds = new Set();

                        function addSub(subjectId, subjectType) {
                            if (addedIds.has(subjectId)) return;
                            addedIds.add(subjectId);
                            records.push({ student_id: s.id, subject_id: subjectId, subject_type: subjectType });
                        }

                        compGrouped.forEach(g => {
                            g.papers.forEach(p => addSub(p.id, 'compulsory'));
                        });

                        grpGrouped.forEach(g => {
                            if (bsSelectedGroup.includes(g.name)) {
                                g.papers.forEach(p => addSub(p.id, 'group'));
                            }
                        });

                        if (bsSelectedOptional) {
                            const opt = optGrouped.find(g => g.name === bsSelectedOptional);
                            if (opt) {
                                opt.papers.forEach(p => addSub(p.id, 'optional'));
                            }
                        }

                        if (records.length > 0) {
                            await window.FDC_SUPABASE.from('student_subjects').insert(records);
                            totalRecords += records.length;
                        }
                    }

                    window.fdcSuccess(`${bsMatchedStudents.length} জন student-কে সফলভাবে assign করা হয়েছে!`);
                    closeModal('bulkSubjectModal');
                } catch (e) {
                    window.fdcError('Bulk assign failed: ' + e.message);
                }
            },
            { title: 'Confirm Bulk Assign', confirmText: 'Yes, Assign' }
        );
    }

    // =========================================================
    // COPY FROM PREVIOUS YEAR
    // =========================================================
    async function copyCheck() {
        const fromCls = $('copyFromClass').value;
        const fromYear = $('copyFromYear').value;
        const toCls = $('copyToClass').value;
        const toYear = $('copyToYear').value;
        const branch = $('copyFromBranch').value;

        if (!fromCls || !fromYear || !toCls || !toYear) {
            $('copyInfo').style.display = 'none';
            $('applyCopyBtn').disabled = true;
            return;
        }

        let query = window.FDC_SUPABASE.from('students').select('*')
            .eq('class_name', fromCls).eq('year', fromYear).eq('is_active', true);
        if (branch) query = query.eq('branch', branch);

        const { data } = await query;
        const count = (data || []).length;

        $('copyInfoText').textContent = `${count} জন student copy হবে (Class ${fromCls} → ${toCls}, Year ${fromYear} → ${toYear})।`;
        $('copyInfo').style.display = 'flex';
        $('applyCopyBtn').disabled = count === 0;

        $('copyToSession').value = getSessionFromYear(toYear);

        window._copyData = { fromCls, fromYear, toCls, toYear, branch, students: data || [] };
    }

    async function copyApply() {
        if (!window._copyData || window._copyData.students.length === 0) return;

        const { toCls, toYear, students } = window._copyData;
        const session = getSessionFromYear(toYear);

        window.fdcConfirm(
            `${students.length} জন student copy করা হবে। নিশ্চিত?`,
            async function () {
                try {
                    const records = students.map(s => ({
                        name: s.name,
                        roll: s.roll,
                        class_name: toCls,
                        year: toYear,
                        session,
                        branch: s.branch,
                        group_name: s.group_name
                    }));

                    const { data, error } = await window.FDC_SUPABASE
                        .from('students').insert(records).select();

                    if (error) {
                        if (error.message.includes('duplicate')) {
                            window.fdcWarning('কিছু student duplicate ছিল।');
                        } else throw error;
                    }

                    for (let i = 0; i < (data || []).length; i++) {
                        const newStu = data[i];
                        const oldStu = students[i];
                        const { data: oldSubs } = await window.FDC_SUPABASE
                            .from('student_subjects')
                            .select('subject_id, subject_type')
                            .eq('student_id', oldStu.id);

                        if (oldSubs && oldSubs.length > 0) {
                            const newSubs = oldSubs.map(s => ({
                                student_id: newStu.id,
                                subject_id: s.subject_id,
                                subject_type: s.subject_type
                            }));
                            await window.FDC_SUPABASE.from('student_subjects').insert(newSubs);
                        }
                    }

                    window.fdcSuccess(`${(data || []).length} জন student copy হয়েছে!`);
                    closeModal('copyYearModal');
                    await loadAllStudents();
                } catch (e) {
                    window.fdcError('Copy failed: ' + e.message);
                }
            },
            { title: 'Confirm Copy', confirmText: 'Yes, Copy' }
        );
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
                $('studentGroup').value = '';
                $('subjectsSection').style.display = 'none';
            } else if (branch === 'BM') {
                $('groupFieldWrap').style.display = 'none';
                const cls = $('studentClass').value;
                if (cls) {
                    await renderSubjectSelection('BM', cls, 'BM-General', []);
                    $('subjectsSection').style.display = 'block';
                }
            } else {
                $('groupFieldWrap').style.display = 'none';
                $('subjectsSection').style.display = 'none';
            }
        });

        $('studentClass').addEventListener('change', async function () {
            const branch = $('studentBranch').value;
            const cls = this.value;
            if (branch === 'BM' && cls) {
                await renderSubjectSelection('BM', cls, 'BM-General', []);
                $('subjectsSection').style.display = 'block';
            } else if (branch === 'HSC' && cls && $('studentGroup').value) {
                await renderSubjectSelection('HSC', cls, $('studentGroup').value, []);
                $('subjectsSection').style.display = 'block';
            }
        });

        $('studentYear').addEventListener('change', function () {
            $('studentSession').value = getSessionFromYear(this.value);
        });

        $('studentGroup').addEventListener('change', async function () {
            const group = this.value;
            const cls = $('studentClass').value;
            const branch = $('studentBranch').value;
            if (!group || !cls || branch !== 'HSC') return;
            await renderSubjectSelection('HSC', cls, group, []);
            $('subjectsSection').style.display = 'block';
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

            if (action === 'view') viewStudent(id);
            else if (action === 'edit') openEditStudentModal(id);
            else if (action === 'subject') openEditStudentModal(id);
            else if (action === 'toggle') toggleStudent(id);
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

        $('btnBulkImport').addEventListener('click', () => openModal('bulkImportModal'));
        $('closeBulkModal').addEventListener('click', () => closeModal('bulkImportModal'));
        $('cancelBulkBtn').addEventListener('click', () => closeModal('bulkImportModal'));
        $('previewBulkBtn').addEventListener('click', previewBulk);
        $('saveBulkBtn').addEventListener('click', saveBulk);

        $('btnCopyYear').addEventListener('click', () => {
            openModal('copyYearModal');
            copyCheck();
        });
        $('closeCopyModal').addEventListener('click', () => closeModal('copyYearModal'));
        $('cancelCopyBtn').addEventListener('click', () => closeModal('copyYearModal'));
        ['copyFromClass', 'copyFromYear', 'copyToClass', 'copyToYear', 'copyFromBranch'].forEach(id => {
            $(id).addEventListener('change', copyCheck);
        });
        $('applyCopyBtn').addEventListener('click', copyApply);

        $('closeBulkSubjectModal').addEventListener('click', () => closeModal('bulkSubjectModal'));
        $('cancelBsBtn').addEventListener('click', () => closeModal('bulkSubjectModal'));
        $('bsClass').addEventListener('change', bsLoadStudents);
        $('bsBranch').addEventListener('change', async function () {
            if (this.value) await loadGroupsByBranch(this.value, 'bsGroup');
            bsLoadStudents();
        });
        $('bsGroup').addEventListener('change', bsLoadStudents);
        $('applyBsBtn').addEventListener('click', bsApply);

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
        console.log('🚀 Admin Students initializing...');

        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllStudents();

            console.log('✅ Admin Students ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();