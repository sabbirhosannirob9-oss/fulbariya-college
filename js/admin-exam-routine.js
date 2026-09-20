/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN EXAM ROUTINE MANAGEMENT
 * Location: js/admin-exam-routine.js
 * Version: v1.0 — Database-driven Departments/Courses/Batches
 * Depends: config.js, supabase.js, auth.js, cloudinary.js, admin-popup.js
 * Table: exam_routines
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // MASTER DATA CACHE
    // =========================================================
    let MASTER = {
        departments: [],
        courses: [],
        batches: []
    };

    const HSC_GROUPS = ['Science', 'Humanity', 'Commerce'];
    const HSC_YEARS = ['1st Year', '2nd Year'];
    const BM_YEARS = ['1st Year', '2nd Year'];

    const EXAM_OPTIONS = [
        { key: '1st Terminal', label: '১ম সাময়িক' },
        { key: '2nd Terminal', label: '২য় সাময়িক' },
        { key: 'Test', label: 'টেস্ট পরীক্ষা' },
        { key: 'Final', label: 'ফাইনাল পরীক্ষা' }
    ];

    // =========================================================
    // STATE
    // =========================================================
    let allRoutines = [];
    let filteredRoutines = [];
    let editingId = null;
    let selectedImageFile = null;

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

    function getCurrentSession() {
        const y = new Date().getFullYear();
        return y + '-' + (y + 1);
    }

    function getExamLabel(key) {
        const e = EXAM_OPTIONS.find(x => x.key === key);
        return e ? e.label : key;
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
                title: 'লগআউট নিশ্চিত করুন',
                confirmText: 'হ্যাঁ, লগআউট',
                cancelText: 'বাতিল',
                confirmType: 'danger'
            }
        );
    };

    // =========================================================
    // LOAD MASTER DATA
    // =========================================================
    async function loadMasterData() {
        try {
            const [depRes, courseRes, batchRes] = await Promise.all([
                window.FDC_SUPABASE
                    .from('departments')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order'),
                window.FDC_SUPABASE
                    .from('courses')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order'),
                window.FDC_SUPABASE
                    .from('batches')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order')
            ]);

            MASTER.departments = depRes.data || [];
            MASTER.courses = courseRes.data || [];
            MASTER.batches = batchRes.data || [];

            console.log('✅ Master data loaded');
        } catch (e) {
            console.error('Master data error:', e);
        }
    }

    // =========================================================
    // LOAD ALL ROUTINES
    // =========================================================
    async function loadAllRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_routines')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allRoutines = data || [];
            console.log('✅ Loaded exam routines:', allRoutines.length);

            $('totalRoutines').textContent = allRoutines.length;

            // Populate exam filter
            buildExamFilter();
            applyFilters();

        } catch (e) {
            console.error('Load routines error:', e);
            window.fdcError('Routine load failed: ' + e.message);
        }
    }

    // =========================================================
    // BUILD EXAM FILTER DROPDOWN
    // =========================================================
    function buildExamFilter() {
        const select = $('filterExam');
        const currentVal = select.value;

        select.innerHTML = '<option value="">All Exams</option>';
        EXAM_OPTIONS.forEach(e => {
            select.insertAdjacentHTML('beforeend',
                `<option value="${escapeHtml(e.key)}">${escapeHtml(e.label)}</option>`);
        });

        if (currentVal) select.value = currentVal;
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function applyFilters() {
        const fExam = $('filterExam').value;
        const fBranch = $('filterBranch').value;
        const fStatus = $('filterStatus').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredRoutines = allRoutines.filter(r => {
            if (fExam && r.exam_name !== fExam) return false;
            if (fBranch && r.branch !== fBranch) return false;

            if (fStatus === 'published' && !r.is_published) return false;
            if (fStatus === 'unpublished' && r.is_published) return false;

            if (search) {
                const text = (
                    (r.title || '') + ' ' +
                    (r.group_name || '') + ' ' +
                    (r.department || '') + ' ' +
                    (r.class_year || '') + ' ' +
                    (r.batch || '') + ' ' +
                    (r.exam_name || '')
                ).toLowerCase();
                if (!text.includes(search)) return false;
            }

            return true;
        });

        renderRoutines();
    }

    // =========================================================
    // RENDER ROUTINES
    // =========================================================
    function renderRoutines() {
        const list = $('routinesList');

        if (filteredRoutines.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-file-alt"></i></div>
                <h6>কোনো exam routine পাওয়া যায়নি</h6>
                <p>"Add New Exam Routine" ক্লিক করে নতুন যোগ করুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchClass = r.branch || 'HSC';
            const examLabel = getExamLabel(r.exam_name);

            const statusBadge = r.is_published
                ? '<span class="status-badge published">✓ Published</span>'
                : '<span class="status-badge draft">✗ Draft</span>';

            const metaTags = [];

            if (r.class_year) {
                metaTags.push(`<span><i class="fas fa-graduation-cap"></i> ${escapeHtml(r.class_year)}</span>`);
            }
            if (r.group_name) {
                metaTags.push(`<span><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`);
            }
            if (r.department) {
                metaTags.push(`<span><i class="fas fa-book"></i> ${escapeHtml(r.department)}</span>`);
            }
            if (r.batch) {
                metaTags.push(`<span><i class="fas fa-layer-group"></i> Batch ${escapeHtml(r.batch)}</span>`);
            }
            if (r.session) {
                metaTags.push(`<span><i class="fas fa-calendar"></i> ${escapeHtml(r.session)}</span>`);
            }

            const description = r.description
                ? `<p>${escapeHtml(r.description)}</p>`
                : '';

            const imageUrl = r.image_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23fef2f2%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23dc2626%22 font-size=%2235%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📝%3C/text%3E%3C/svg%3E';

            html += `<div class="routine-item ${r.is_published ? '' : 'unpublished'}">
                <div class="routine-thumb" data-action="preview" data-id="${r.id}">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(r.title)}">
                    <div class="overlay"><i class="fas fa-expand"></i></div>
                </div>

                <div class="routine-body">
                    <h4>
                        ${escapeHtml(r.title)}
                        <span class="exam-badge">${escapeHtml(examLabel)}</span>
                        <span class="branch-badge ${branchClass}">${branchClass}</span>
                        ${statusBadge}
                    </h4>
                    ${description}
                    <div class="routine-meta">
                        ${metaTags.join('')}
                    </div>
                </div>

                <div class="routine-actions">
                    <button class="action-btn edit" data-action="edit" data-id="${r.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn toggle ${r.is_published ? '' : 'off'}" data-action="toggle" data-id="${r.id}" title="${r.is_published ? 'Unpublish' : 'Publish'}">
                        <i class="fas fa-${r.is_published ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="action-btn delete" data-action="delete" data-id="${r.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        });

        list.innerHTML = html;
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
    // DYNAMIC FIELDS
    // =========================================================
    function updateDynamicFields(branch) {
        const wrap1 = $('dynamicField1Wrap');
        const wrap2 = $('dynamicField2Wrap');
        const label1 = $('dynamicField1Label');
        const label2 = $('dynamicField2Label');
        const field1 = $('dynamicField1');
        const field2 = $('dynamicField2');

        wrap1.style.display = 'none';
        wrap2.style.display = 'none';
        field1.innerHTML = '<option value="">Select</option>';
        field2.innerHTML = '<option value="">Select</option>';
        field1.value = '';
        field2.value = '';

        if (!branch) return;

        if (branch === 'HSC') {
            wrap1.style.display = 'block';
            wrap2.style.display = 'block';
            label1.textContent = 'Group';
            label2.textContent = 'Year';

            HSC_GROUPS.forEach(g => {
                field1.insertAdjacentHTML('beforeend', `<option value="${g}">${g}</option>`);
            });
            HSC_YEARS.forEach(y => {
                field2.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
        } else if (branch === 'BM') {
            wrap2.style.display = 'block';
            label2.textContent = 'Year';

            BM_YEARS.forEach(y => {
                field2.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
        } else if (branch === 'Honours') {
            wrap1.style.display = 'block';
            wrap2.style.display = 'block';
            label1.textContent = 'Department';
            label2.textContent = 'Batch';

            MASTER.departments.forEach(d => {
                const displayName = d.display_name || d.name_bn || d.name_en;
                field1.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(displayName)}">${escapeHtml(displayName)}</option>`);
            });
            MASTER.batches.forEach(b => {
                const displayName = b.display_name || ('Batch ' + b.batch_year);
                field2.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(b.batch_year)}">${escapeHtml(displayName)}</option>`);
            });
        } else if (branch === 'Degree') {
            wrap1.style.display = 'block';
            wrap2.style.display = 'block';
            label1.textContent = 'Course';
            label2.textContent = 'Batch';

            MASTER.courses.forEach(c => {
                const displayName = c.display_name || c.name_bn || c.name_en;
                field1.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(displayName)}">${escapeHtml(displayName)}</option>`);
            });
            MASTER.batches.forEach(b => {
                const displayName = b.display_name || ('Batch ' + b.batch_year);
                field2.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(b.batch_year)}">${escapeHtml(displayName)}</option>`);
            });
        }

        autoSuggestTitle();
    }

    // =========================================================
    // AUTO-SUGGEST TITLE
    // =========================================================
    function autoSuggestTitle() {
        const exam = $('routineExam').value;
        const branch = $('routineBranch').value;
        const field1 = $('dynamicField1').value;
        const field2 = $('dynamicField2').value;
        const titleEl = $('routineTitle');

        if (titleEl.dataset.userEdited === 'true') return;

        let parts = [];

        if (exam) parts.push(getExamLabel(exam));

        if (branch === 'HSC') {
            parts.push('HSC');
            if (field1) parts.push(field1);
            if (field2) parts.push(field2);
        } else if (branch === 'BM') {
            parts.push('BM (BMT)');
            if (field2) parts.push(field2);
        } else if (branch === 'Honours') {
            parts.push('Honours');
            if (field1) parts.push(field1);
            if (field2) parts.push('Batch ' + field2);
        } else if (branch === 'Degree') {
            parts.push('Degree');
            if (field1) parts.push(field1);
            if (field2) parts.push('Batch ' + field2);
        }

        if (parts.length > 0) {
            titleEl.value = parts.join(' ') + ' Exam Routine';
        }
    }

    // =========================================================
    // IMAGE UPLOAD
    // =========================================================
    function setupImageUpload() {
        const dropArea = $('imageDropArea');
        const fileInput = $('imageInput');
        const preview = $('imagePreview');
        const removeBtn = $('removeImage');

        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) handleImageSelect(this.files[0]);
        });

        dropArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = '#1a237e';
            this.style.background = '#f5f7ff';
        });

        dropArea.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
        });

        dropArea.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';

            if (e.dataTransfer.files.length > 0) {
                handleImageSelect(e.dataTransfer.files[0]);
                const dt = new DataTransfer();
                dt.items.add(e.dataTransfer.files[0]);
                fileInput.files = dt.files;
            }
        });

        removeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            selectedImageFile = null;
            fileInput.value = '';
            preview.classList.remove('show');
            $('existingImageUrl').value = '';
            $('existingCloudinaryId').value = '';
            window.fdcAlert('Image removed', 'তথ্য', 'info');
        });
    }

    function handleImageSelect(file) {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            window.fdcWarning('Image too large! Max 5MB');
            $('imageInput').value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            window.fdcWarning('Only images allowed (JPG/PNG)');
            return;
        }

        selectedImageFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            $('previewImg').src = e.target.result;
            $('imagePreview').classList.add('show');
        };
        reader.readAsDataURL(file);
    }

    // =========================================================
    // ADD ROUTINE
    // =========================================================
    function openAddRoutineModal() {
        editingId = null;
        selectedImageFile = null;

        $('editId').value = '';
        $('existingImageUrl').value = '';
        $('existingCloudinaryId').value = '';

        $('modalTitle').textContent = 'Add New Exam Routine';
        $('modalSub').textContent = 'পরীক্ষার রুটিনের তথ্য পূরণ করুন';
        $('modalIcon').className = 'fas fa-calendar-plus';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Routine';

        $('routineExam').value = '';
        $('routineBranch').value = '';
        $('routineSession').value = getCurrentSession();
        $('routineTitle').value = '';
        $('routineDescription').value = '';
        $('routinePublished').checked = true;

        updateDynamicFields('');

        $('imagePreview').classList.remove('show');
        $('imageInput').value = '';
        $('routineTitle').dataset.userEdited = 'false';

        openModal('routineModal');
    }

    // =========================================================
    // EDIT ROUTINE
    // =========================================================
    function openEditRoutineModal(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        editingId = id;
        selectedImageFile = null;

        $('editId').value = id;
        $('existingImageUrl').value = r.image_url || '';
        $('existingCloudinaryId').value = r.cloudinary_id || '';

        $('modalTitle').textContent = 'Edit Exam Routine';
        $('modalSub').textContent = r.title || '';
        $('modalIcon').className = 'fas fa-edit';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Routine';

        $('routineExam').value = r.exam_name || '';
        $('routineBranch').value = r.branch || '';

        updateDynamicFields(r.branch || '');

        if (r.branch === 'HSC') {
            $('dynamicField1').value = r.group_name || '';
            $('dynamicField2').value = r.class_year || '';
        } else if (r.branch === 'BM') {
            $('dynamicField2').value = r.class_year || '';
        } else if (r.branch === 'Honours' || r.branch === 'Degree') {
            $('dynamicField1').value = r.department || '';
            $('dynamicField2').value = r.batch || '';
        }

        $('routineSession').value = r.session || '';
        $('routineTitle').value = r.title || '';
        $('routineDescription').value = r.description || '';
        $('routinePublished').checked = !!r.is_published;

        $('routineTitle').dataset.userEdited = 'true';

        if (r.image_url) {
            $('previewImg').src = r.image_url;
            $('imagePreview').classList.add('show');
        } else {
            $('imagePreview').classList.remove('show');
        }
        $('imageInput').value = '';

        openModal('routineModal');
    }

    // =========================================================
    // SAVE ROUTINE
    // =========================================================
    async function saveRoutine() {
        const exam = $('routineExam').value;
        const branch = $('routineBranch').value;
        const field1 = $('dynamicField1').value;
        const field2 = $('dynamicField2').value;
        const session = $('routineSession').value.trim();
        const title = $('routineTitle').value.trim();
        const description = $('routineDescription').value.trim();
        const isPublished = $('routinePublished').checked;
        const existingUrl = $('existingImageUrl').value;

        // Validation
        if (!exam) return window.fdcWarning('Exam সিলেক্ট করুন।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');

        if (branch === 'HSC') {
            if (!field1) return window.fdcWarning('Group সিলেক্ট করুন।');
            if (!field2) return window.fdcWarning('Year সিলেক্ট করুন।');
        }
        if (branch === 'BM') {
            if (!field2) return window.fdcWarning('Year সিলেক্ট করুন।');
        }
        if (branch === 'Honours' || branch === 'Degree') {
            if (!field1) return window.fdcWarning('Department/Course সিলেক্ট করুন।');
            if (!field2) return window.fdcWarning('Batch সিলেক্ট করুন।');
        }

        if (!title) return window.fdcWarning('Title দিতে হবে।');
        if (!selectedImageFile && !existingUrl) {
            return window.fdcWarning('Exam routine image upload করুন।');
        }

        const btn = $('saveBtn');
        btn.disabled = true;
        const original = btn.innerHTML;

        try {
            let imageUrl = existingUrl;
            let cloudinaryId = $('existingCloudinaryId').value || null;

            if (selectedImageFile) {
                if (typeof window.FDCUploadImage !== 'function') {
                    throw new Error('Upload function not available');
                }

                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

                const result = await window.FDCUploadImage(selectedImageFile);
                imageUrl = result.url || result.secure_url;
                cloudinaryId = result.public_id || null;
            }

            const payload = {
                exam_id: null,
                exam_name: exam,
                branch: branch,
                class_year: null,
                group_name: null,
                department: null,
                batch: null,
                session: session || null,
                title: title,
                description: description || null,
                image_url: imageUrl,
                cloudinary_id: cloudinaryId,
                is_published: isPublished
            };

            if (branch === 'HSC') {
                payload.group_name = field1;
                payload.class_year = field2;
            } else if (branch === 'BM') {
                payload.group_name = 'BM-General';
                payload.class_year = field2;
            } else if (branch === 'Honours') {
                payload.department = field1;
                payload.batch = field2;
            } else if (branch === 'Degree') {
                payload.department = field1;
                payload.batch = field2;
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            let result;
            if (editingId) {
                result = await window.FDC_SUPABASE
                    .from('exam_routines')
                    .update(payload)
                    .eq('id', editingId)
                    .select();
            } else {
                result = await window.FDC_SUPABASE
                    .from('exam_routines')
                    .insert([payload])
                    .select();
            }

            if (result.error) throw result.error;

            closeModal('routineModal');
            window.fdcSuccess(editingId ? 'Exam routine update হয়েছে!' : 'Exam routine তৈরি হয়েছে!');
            await loadAllRoutines();

        } catch (e) {
            console.error('Save error:', e);
            window.fdcError('Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // DELETE ROUTINE
    // =========================================================
    function deleteRoutine(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        window.fdcPromptInput({
            title: '⚠️ Delete Exam Routine',
            subtitle: r.title,
            message: `
                এই exam routine <strong>চিরতরে</strong> delete হবে।
                <p style="margin-top:12px;color:#7f1d1d;font-weight:700;">এটি undo করা যাবে না!</p>
            `,
            expectedValue: 'DELETE',
            placeholder: 'টাইপ করুন: DELETE',
            confirmText: 'হ্যাঁ, Delete করুন',
            cancelText: 'বাতিল',
            confirmType: 'danger',
            onConfirm: async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('exam_routines')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Exam routine delete হয়েছে!');
                    await loadAllRoutines();
                } catch (e) {
                    window.fdcError('Delete failed: ' + e.message);
                }
            }
        });
    }

    // =========================================================
    // TOGGLE PUBLISH
    // =========================================================
    async function togglePublish(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        const newState = !r.is_published;
        const action = newState ? 'Publish' : 'Unpublish';

        try {
            const { error } = await window.FDC_SUPABASE
                .from('exam_routines')
                .update({ is_published: newState })
                .eq('id', id);

            if (error) throw error;
            window.fdcSuccess(`Routine ${action} হয়েছে!`);
            await loadAllRoutines();
        } catch (e) {
            window.fdcError('Failed: ' + e.message);
        }
    }

    // =========================================================
    // PREVIEW
    // =========================================================
    function openPreview(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r || !r.image_url) return;

        $('previewModalImg').src = r.image_url;
        $('previewOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('previewOverlay').classList.remove('show');
        document.body.style.overflow = '';
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('btnAddRoutine').addEventListener('click', openAddRoutineModal);

        $('closeModal').addEventListener('click', () => closeModal('routineModal'));
        $('cancelBtn').addEventListener('click', () => closeModal('routineModal'));
        $('saveBtn').addEventListener('click', saveRoutine);

        $('routineExam').addEventListener('change', autoSuggestTitle);

        $('routineBranch').addEventListener('change', function () {
            updateDynamicFields(this.value);
            $('routineTitle').dataset.userEdited = 'false';
        });

        $('dynamicField1').addEventListener('change', autoSuggestTitle);
        $('dynamicField2').addEventListener('change', autoSuggestTitle);

        $('routineTitle').addEventListener('input', function () {
            this.dataset.userEdited = 'true';
        });

        ['filterExam', 'filterBranch', 'filterStatus'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        $('routinesList').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            if (action === 'edit') openEditRoutineModal(id);
            else if (action === 'delete') deleteRoutine(id);
            else if (action === 'toggle') togglePublish(id);
            else if (action === 'preview') openPreview(id);
        });

        $('previewClose').addEventListener('click', closePreview);
        $('previewOverlay').addEventListener('click', function (e) {
            if (e.target === this) closePreview();
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
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => {
                    m.classList.remove('show');
                });
                if ($('previewOverlay').classList.contains('show')) closePreview();
                document.body.style.overflow = '';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Exam Routine initializing...');

        attachEvents();
        setupImageUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadMasterData();
            await loadAllRoutines();

            console.log('✅ Admin Exam Routine ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();