/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN CLASS ROUTINE MANAGEMENT
 * Location: js/admin-routine.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allRoutines = [];
    let filteredRoutines = [];
    let editingId = null;
    let selectedImageFile = null;
    let existingImageUrl = '';

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
    // LOAD ALL ROUTINES
    // =========================================================
    async function loadAllRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('class_routines')
                .select('*')
                .order('branch', { ascending: true })
                .order('class_name', { ascending: true })
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            allRoutines = data || [];
            console.log('✅ Loaded routines:', allRoutines.length);

            $('totalRoutines').textContent = allRoutines.length;
            applyFilters();

        } catch (e) {
            console.error('Load routines error:', e);
            window.fdcError('Routine load failed: ' + e.message);
        }
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function applyFilters() {
        const fBranch = $('filterBranch').value;
        const fClass = $('filterClass').value;
        const fGroup = $('filterGroup').value;
        const fSession = $('filterSession').value.trim().toLowerCase();

        filteredRoutines = allRoutines.filter(r => {
            if (fBranch && r.branch !== fBranch) return false;
            if (fClass && r.class_name !== fClass) return false;
            if (fGroup && r.group_name !== fGroup) return false;
            if (fSession && !((r.session || '').toLowerCase().includes(fSession))) return false;
            return true;
        });

        renderRoutines();
    }

    // =========================================================
    // RENDER ROUTINE GRID
    // =========================================================
    function renderRoutines() {
        const grid = $('routineGrid');

        if (filteredRoutines.length === 0) {
            grid.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-calendar-week"></i></div>
                <h6>কোনো routine পাওয়া যায়নি</h6>
                <p>"Add Routine" ক্লিক করে নতুন রুটিন যোগ করুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchShort = r.branch || 'HSC';
            const statusClass = r.is_published ? 'published' : 'draft';
            const statusLabel = r.is_published ? 'Published' : 'Draft';

            const groupTag = r.group_name
                ? `<span class="rc-tag group"><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`
                : '';

            const titleText = r.title || 'Routine';
            const imgUrl = r.image_url || '';

            html += `<div class="routine-card">
                <div class="rc-img-wrap" data-action="preview" data-id="${r.id}">
                    <span class="rc-branch">${escapeHtml(branchShort)}</span>
                    <span class="rc-status ${statusClass}">${statusLabel}</span>
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(titleText)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22220%22%3E%3Crect fill=%22%23f0f4ff%22 width=%22300%22 height=%22220%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%230a1655%22 font-size=%2240%22 text-anchor=%22middle%22 dy=%22.3em%22%3E📋%3C/text%3E%3C/svg%3E'">
                </div>

                <div class="rc-body">
                    <div class="rc-title">${escapeHtml(titleText)}</div>
                    <div class="rc-meta">
                        <span class="rc-tag class"><i class="fas fa-graduation-cap"></i> Class ${escapeHtml(r.class_name)}</span>
                        ${groupTag}
                        <span class="rc-tag session"><i class="fas fa-calendar"></i> ${escapeHtml(r.session || '—')}</span>
                    </div>

                    <div class="rc-actions">
                        <button class="btn-edit" data-action="edit" data-id="${r.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-toggle" data-action="toggle" data-id="${r.id}">
                            <i class="fas fa-${r.is_published ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="btn-delete" data-action="delete" data-id="${r.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        });

        grid.innerHTML = html;
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
    // IMAGE HANDLING
    // =========================================================
    function setupImageUpload() {
        const dropArea = $('imageDropArea');
        const fileInput = $('imageInput');
        const preview = $('imagePreview');
        const previewImg = $('previewImg');
        const removeBtn = $('removeImage');

        if (!dropArea || !fileInput) return;

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

        if (removeBtn) {
            removeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                selectedImageFile = null;
                fileInput.value = '';
                preview.classList.remove('show');
                $('existingImageUrl').value = '';
                $('existingCloudinaryId').value = '';
                window.fdcAlert('Image removed', 'Information', 'info');
            });
        }
    }

    function handleImageSelect(file) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            window.fdcWarning('Image too large! Max 5MB');
            $('imageInput').value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            window.fdcWarning('Only images allowed');
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
        existingImageUrl = '';

        $('editRoutineId').value = '';
        $('existingImageUrl').value = '';
        $('existingCloudinaryId').value = '';

        $('routineModalTitle').textContent = 'Add New Routine';
        $('routineModalSub').textContent = 'রুটিনের তথ্য পূরণ করুন';
        $('routineModalIcon').className = 'fas fa-calendar-plus';
        $('saveRoutineBtn').innerHTML = '<i class="fas fa-save"></i> Save Routine';

        $('routineTitle').value = '';
        $('routineSession').value = getCurrentSession();
        $('routineBranch').value = '';
        $('routineClass').value = '';
        $('routineGroup').value = '';
        $('routineDescription').value = '';
        $('routinePublished').checked = true;
        $('imagePreview').classList.remove('show');
        $('imageInput').value = '';

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
        existingImageUrl = r.image_url || '';

        $('editRoutineId').value = id;
        $('existingImageUrl').value = r.image_url || '';
        $('existingCloudinaryId').value = r.cloudinary_id || '';

        $('routineModalTitle').textContent = 'Edit Routine';
        $('routineModalSub').textContent = r.title || '';
        $('routineModalIcon').className = 'fas fa-edit';
        $('saveRoutineBtn').innerHTML = '<i class="fas fa-save"></i> Update Routine';

        $('routineTitle').value = r.title || '';
        $('routineSession').value = r.session || '';
        $('routineBranch').value = r.branch || '';
        $('routineClass').value = r.class_name || '';
        $('routineGroup').value = r.group_name || '';
        $('routineDescription').value = r.description || '';
        $('routinePublished').checked = !!r.is_published;

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
        const title = $('routineTitle').value.trim();
        const session = $('routineSession').value.trim();
        const branch = $('routineBranch').value;
        const className = $('routineClass').value;
        const groupName = $('routineGroup').value || null;
        const description = $('routineDescription').value.trim();
        const isPublished = $('routinePublished').checked;
        const existing = $('existingImageUrl').value;

        // Validation
        if (!title) return window.fdcWarning('Title দিতে হবে।');
        if (!session) return window.fdcWarning('Session দিতে হবে।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName) {
            return window.fdcWarning('HSC-এর জন্য Group সিলেক্ট করুন।');
        }
        if (!selectedImageFile && !existing) {
            return window.fdcWarning('Routine image upload করুন।');
        }

        const btn = $('saveRoutineBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            let imageUrl = existing;
            let cloudinaryId = $('existingCloudinaryId').value || null;

            // Upload new image to Cloudinary
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
                title: title,
                class_name: className,
                branch: branch,
                group_name: branch === 'BM' ? 'BM-General' : groupName,
                session: session,
                image_url: imageUrl,
                cloudinary_id: cloudinaryId,
                description: description || null,
                is_published: isPublished
            };

            let result;
            if (editingId) {
                result = await window.FDC_SUPABASE
                    .from('class_routines')
                    .update(payload)
                    .eq('id', editingId)
                    .select();
            } else {
                result = await window.FDC_SUPABASE
                    .from('class_routines')
                    .insert([payload])
                    .select();
            }

            if (result.error) throw result.error;

            window.fdcSuccess(editingId ? 'Routine updated successfully!' : 'Routine created successfully!');
            closeModal('routineModal');
            await loadAllRoutines();

        } catch (e) {
            console.error('Save routine error:', e);
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

        window.fdcConfirm(
            `"${r.title}" কে delete করা হবে? এটা ফিরিয়ে আনা যাবে না।`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('class_routines')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Routine deleted successfully!');
                    await loadAllRoutines();
                } catch (e) {
                    window.fdcError('Delete failed: ' + e.message);
                }
            },
            {
                title: 'Delete Routine',
                confirmText: 'Yes, Delete',
                confirmType: 'danger'
            }
        );
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
                .from('class_routines')
                .update({ is_published: newState })
                .eq('id', id);
            if (error) throw error;
            window.fdcSuccess(`Routine ${action}ed successfully!`);
            await loadAllRoutines();
        } catch (e) {
            window.fdcError('Failed: ' + e.message);
        }
    }

    // =========================================================
    // PREVIEW MODAL
    // =========================================================
    function openPreviewModal(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        $('previewTitle').textContent = r.title || 'Routine Preview';
        $('previewSub').textContent = `Class ${r.class_name} | ${r.branch} | ${r.session}`;
        $('previewModalImg').src = r.image_url;
        openModal('previewModal');
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Add button
        $('btnAddRoutine').addEventListener('click', openAddRoutineModal);

        // Modal
        $('closeRoutineModal').addEventListener('click', () => closeModal('routineModal'));
        $('cancelRoutineBtn').addEventListener('click', () => closeModal('routineModal'));
        $('saveRoutineBtn').addEventListener('click', saveRoutine);

        // Preview modal
        $('closePreviewModal').addEventListener('click', () => closeModal('previewModal'));

        // Filters
        ['filterBranch', 'filterClass', 'filterGroup'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('filterSession').addEventListener('input', applyFilters);

        // Branch change → auto set group
        $('routineBranch').addEventListener('change', function () {
            if (this.value === 'BM') {
                $('routineGroup').value = 'BM-General';
            }
        });

        // Card actions (delegated)
        $('routineGrid').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            if (action === 'edit') openEditRoutineModal(id);
            else if (action === 'delete') deleteRoutine(id);
            else if (action === 'toggle') togglePublish(id);
            else if (action === 'preview') openPreviewModal(id);
        });

        // Modal backdrop click
        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });

        // ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => {
                    m.classList.remove('show');
                });
                document.body.style.overflow = '';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Routine initializing...');

        attachEvents();
        setupImageUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllRoutines();

            console.log('✅ Admin Routine ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();