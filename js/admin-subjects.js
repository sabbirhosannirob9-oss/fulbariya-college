/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN SUBJECT MANAGEMENT
 * Location: js/admin-subjects.js
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allSubjects = [];
    let filteredSubjects = [];
    let currentPage = 1;
    const PAGE_SIZE = 30;
    let editingSubjectId = null;

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
    // LOAD ALL SUBJECTS
    // =========================================================
    async function loadAllSubjects() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .order('branch', { ascending: true })
                .order('class_name', { ascending: true })
                .order('group_name', { ascending: true, nullsFirst: true })
                .order('sort_order', { ascending: true });

            if (error) throw error;

            allSubjects = data || [];
            console.log('✅ Loaded subjects:', allSubjects.length);

            updateStats();
            applyFilters();
        } catch (e) {
            console.error('Load subjects error:', e);
            window.fdcError('Subject load failed: ' + e.message);
        }
    }

    // =========================================================
    // STATS
    // =========================================================
    function updateStats() {
        const total = allSubjects.length;
        const hsc = allSubjects.filter(s => s.branch === 'HSC').length;
        const bm = allSubjects.filter(s => s.branch === 'BM').length;
        const active = allSubjects.filter(s => s.is_active).length;

        $('totalSubjects').textContent = total;
        $('statTotal').textContent = total;
        $('statHSC').textContent = hsc;
        $('statBM').textContent = bm;
        $('statActive').textContent = active;
    }

    // =========================================================
    // FILTERS
    // =========================================================
    function applyFilters() {
        const fBranch = $('filterBranch').value;
        const fClass = $('filterClass').value;
        const fGroup = $('filterGroup').value;
        const fType = $('filterType').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredSubjects = allSubjects.filter(s => {
            if (fBranch && s.branch !== fBranch) return false;
            if (fClass && s.class_name !== fClass) return false;
            if (fGroup && s.group_name !== fGroup) return false;
            if (fType && s.subject_type !== fType) return false;
            if (search) {
                const text = ((s.subject_name || '') + ' ' + (s.subject_code || '')).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        currentPage = 1;
        renderSubjects();
    }

    // =========================================================
    // RENDER SUBJECTS TABLE
    // =========================================================
    function renderSubjects() {
        const tbody = $('subjectTableBody');
        const pagWrap = $('paginationWrap');

        if (filteredSubjects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="padding:0;">
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-book"></i></div>
                    <h6>কোনো subject পাওয়া যায়নি</h6>
                    <p>Filter পরিবর্তন করুন বা নতুন subject যোগ করুন</p>
                </div>
            </td></tr>`;
            pagWrap.style.display = 'none';
            return;
        }

        const totalPages = Math.ceil(filteredSubjects.length / PAGE_SIZE);
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, filteredSubjects.length);
        const pageItems = filteredSubjects.slice(start, end);

        let html = '';
        pageItems.forEach((s, i) => {
            const sl = start + i + 1;
            const branchShort = s.branch || 'HSC';
            const typeClass = s.subject_type || 'group';
            const typeLabel = {
                'compulsory': 'Compulsory',
                'group': 'Group',
                'optional': 'Optional'
            }[s.subject_type] || s.subject_type;

            const paperLabel = s.paper_number === 2 ? '2য় পত্র' : '1ম পত্র';
            const groupLabel = s.group_name || '—';

            // Marks
            const marksParts = [];
            if (s.has_cq) marksParts.push(`<span>CQ ${s.cq_marks}</span>`);
            if (s.has_mcq) marksParts.push(`<span>MCQ ${s.mcq_marks}</span>`);
            if (s.has_practical) marksParts.push(`<span>P ${s.practical_marks}</span>`);
            const marksHTML = marksParts.length > 0
                ? `<div class="marks-info">${marksParts.join('')}</div>`
                : '<div class="marks-info">—</div>';

            const statusBadge = s.is_active
                ? '<span style="color:#059669;font-weight:700;font-size:11px;">✓ Active</span>'
                : '<span style="color:#dc2626;font-weight:700;font-size:11px;">✗ Inactive</span>';

            const codeHtml = s.subject_code
                ? `<span class="subject-code">${escapeHtml(s.subject_code)}</span>`
                : '';

            html += `<tr data-id="${s.id}">
                <td>${sl}</td>
                <td>
                    <div class="subject-name-cell">
                        ${codeHtml}${escapeHtml(s.subject_name)}
                    </div>
                </td>
                <td><span class="branch-tag ${branchShort}">${branchShort}</span></td>
                <td>${escapeHtml(s.class_name)}</td>
                <td style="font-size:12px;">${escapeHtml(groupLabel)}</td>
                <td><span class="type-tag ${typeClass}">${escapeHtml(typeLabel)}</span></td>
                <td style="font-size:12px;">${paperLabel}</td>
                <td>${marksHTML}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" data-action="edit" data-id="${s.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn toggle ${s.is_active ? '' : 'off'}" data-action="toggle" data-id="${s.id}" title="${s.is_active ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${s.is_active ? 'eye-slash' : 'eye'}"></i>
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
            `Showing ${start + 1}–${end} of ${filteredSubjects.length}`;

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
    // ADD SUBJECT
    // =========================================================
    function openAddSubjectModal() {
        editingSubjectId = null;

        $('editSubjectId').value = '';
        $('subjectModalTitle').textContent = 'Add New Subject';
        $('subjectModalSub').textContent = 'বিষয়ের তথ্য পূরণ করুন';
        $('subjectModalIcon').className = 'fas fa-book';
        $('saveSubjectBtn').innerHTML = '<i class="fas fa-save"></i> Save Subject';

        // Reset form
        $('subjectName').value = '';
        $('subjectCode').value = '';
        $('subjectBranch').value = '';
        $('subjectClass').value = '';
        $('subjectPaper').value = '1';
        $('subjectGroup').value = '';
        $('subjectType').value = '';
        $('subjectCQ').value = '0';
        $('subjectMCQ').value = '0';
        $('subjectPractical').value = '0';
        $('subjectHasCQ').checked = true;
        $('subjectHasMCQ').checked = true;
        $('subjectHasPractical').checked = false;
        $('subjectIsGroup').checked = false;
        $('subjectIsOptional').checked = false;
        $('subjectIsOnlyOptional').checked = false;
        $('subjectIsActive').checked = true;

        openModal('subjectModal');
    }

    // =========================================================
    // EDIT SUBJECT
    // =========================================================
    function openEditSubjectModal(id) {
        const s = allSubjects.find(x => x.id === id);
        if (!s) return;

        editingSubjectId = id;

        $('editSubjectId').value = id;
        $('subjectModalTitle').textContent = 'Edit Subject';
        $('subjectModalSub').textContent = s.subject_name;
        $('subjectModalIcon').className = 'fas fa-edit';
        $('saveSubjectBtn').innerHTML = '<i class="fas fa-save"></i> Update Subject';

        $('subjectName').value = s.subject_name || '';
        $('subjectCode').value = s.subject_code || '';
        $('subjectBranch').value = s.branch || '';
        $('subjectClass').value = s.class_name || '';
        $('subjectPaper').value = String(s.paper_number || 1);
        $('subjectGroup').value = s.group_name || '';
        $('subjectType').value = s.subject_type || '';
        $('subjectCQ').value = s.cq_marks || 0;
        $('subjectMCQ').value = s.mcq_marks || 0;
        $('subjectPractical').value = s.practical_marks || 0;
        $('subjectHasCQ').checked = !!s.has_cq;
        $('subjectHasMCQ').checked = !!s.has_mcq;
        $('subjectHasPractical').checked = !!s.has_practical;
        $('subjectIsGroup').checked = !!s.is_group;
        $('subjectIsOptional').checked = !!s.is_optional;
        $('subjectIsOnlyOptional').checked = !!s.is_only_optional;
        $('subjectIsActive').checked = !!s.is_active;

        openModal('subjectModal');
    }

    // =========================================================
    // SAVE SUBJECT
    // =========================================================
    async function saveSubject() {
        const name = $('subjectName').value.trim();
        const code = $('subjectCode').value.trim();
        const branch = $('subjectBranch').value;
        const className = $('subjectClass').value;
        const paperNumber = parseInt($('subjectPaper').value) || 1;
        const groupName = $('subjectGroup').value || null;
        const subjectType = $('subjectType').value;
        const cq = parseInt($('subjectCQ').value) || 0;
        const mcq = parseInt($('subjectMCQ').value) || 0;
        const practical = parseInt($('subjectPractical').value) || 0;
        const hasCQ = $('subjectHasCQ').checked;
        const hasMCQ = $('subjectHasMCQ').checked;
        const hasPractical = $('subjectHasPractical').checked;
        const isGroup = $('subjectIsGroup').checked;
        const isOptional = $('subjectIsOptional').checked;
        const isOnlyOptional = $('subjectIsOnlyOptional').checked;
        const isActive = $('subjectIsActive').checked;

        // Validation
        if (!name) return window.fdcWarning('Subject Name দিতে হবে।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!subjectType) return window.fdcWarning('Subject Type সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName && subjectType !== 'compulsory') {
            return window.fdcWarning('HSC-এর জন্য Group সিলেক্ট করুন (compulsory ছাড়া)।');
        }
        if (branch === 'BM' && !groupName) {
            return window.fdcWarning('BM-এর জন্য Group সিলেক্ট করুন।');
        }
        if (subjectType === 'compulsory' && groupName) {
            return window.fdcWarning('Compulsory subject-এর group_name খালি রাখুন।');
        }
        if (subjectType !== 'compulsory' && !groupName) {
            return window.fdcWarning('Group/optional subject-এর group_name দিতে হবে।');
        }

        const btn = $('saveSubjectBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const payload = {
                subject_name: name,
                subject_code: code || null,
                branch: branch,
                class_name: className,
                paper_number: paperNumber,
                group_name: subjectType === 'compulsory' ? null : groupName,
                subject_type: subjectType,
                cq_marks: cq,
                mcq_marks: mcq,
                practical_marks: practical,
                has_cq: hasCQ,
                has_mcq: hasMCQ,
                has_practical: hasPractical,
                is_group: isGroup,
                is_optional: isOptional,
                is_only_optional: isOnlyOptional,
                is_active: isActive
            };

            let result;
            if (editingSubjectId) {
                result = await window.FDC_SUPABASE
                    .from('subjects')
                    .update(payload)
                    .eq('id', editingSubjectId)
                    .select();
            } else {
                result = await window.FDC_SUPABASE
                    .from('subjects')
                    .insert([payload])
                    .select();
            }

            if (result.error) throw result.error;

            window.fdcSuccess(editingSubjectId ? 'Subject updated successfully!' : 'Subject created successfully!');
            closeModal('subjectModal');
            await loadAllSubjects();
        } catch (e) {
            console.error('Save subject error:', e);
            if (e.message && e.message.includes('duplicate')) {
                window.fdcError(
                    'এই Subject Name + Class + Branch + Paper + Group আগেই আছে।<br>' +
                    'সম্ভবত অন্য type-এ (group/optional) আছে।'
                );
            } else {
                window.fdcError('Save failed: ' + e.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // TOGGLE ACTIVE
    // =========================================================
    async function toggleSubject(id) {
        const s = allSubjects.find(x => x.id === id);
        if (!s) return;

        const newState = !s.is_active;
        const action = newState ? 'Activate' : 'Deactivate';

        window.fdcConfirm(
            `"${s.subject_name}" কে ${action} করতে চান?`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('subjects')
                        .update({ is_active: newState })
                        .eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess(`Subject ${action}d successfully!`);
                    await loadAllSubjects();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            },
            {
                title: action + ' Subject',
                confirmText: 'Yes, ' + action,
                confirmType: newState ? 'success' : 'danger'
            }
        );
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Add button
        $('btnAddSubject').addEventListener('click', openAddSubjectModal);

        // Modal close
        $('closeSubjectModal').addEventListener('click', () => closeModal('subjectModal'));
        $('cancelSubjectBtn').addEventListener('click', () => closeModal('subjectModal'));
        $('saveSubjectBtn').addEventListener('click', saveSubject);

        // Filters
        ['filterBranch', 'filterClass', 'filterGroup', 'filterType'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        // Table actions (delegated)
        $('subjectTableBody').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            if (action === 'edit') openEditSubjectModal(id);
            else if (action === 'toggle') toggleSubject(id);
        });

        // Pagination
        $('paginationBtns').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-page]');
            if (!btn || btn.disabled) return;
            currentPage = parseInt(btn.dataset.page);
            renderSubjects();
            window.scrollTo({ top: 200, behavior: 'smooth' });
        });

        // Modal backdrop click → close
        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });

        // Auto-fill group when branch changes
        $('subjectBranch').addEventListener('change', function () {
            const branch = this.value;
            if (branch === 'BM') {
                $('subjectGroup').value = 'BM-General';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Subjects initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllSubjects();

            console.log('✅ Admin Subjects ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();