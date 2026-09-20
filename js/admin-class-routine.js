/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN CLASS ROUTINE MANAGEMENT
 * Location: js/admin-class-routine.js
 * Version: v4.0 — Session Helper + Image/PDF Support
 * Depends: config.js, supabase.js, auth.js, cloudinary.js, admin-popup.js, session-helper.js
 * Table: class_routines_v2 + departments + courses + batches
 * =========================================================
 */

(function () {
    "use strict";

    let MASTER = {
        departments: [],
        courses: [],
        batches: []
    };

    const HSC_GROUPS = ['Science', 'Humanity', 'Commerce'];
    const HSC_YEARS = ['1st Year', '2nd Year'];
    const BM_YEARS = ['1st Year', '2nd Year'];

    let allRoutines = [];
    let filteredRoutines = [];
    let editingId = null;
    let selectedImageFile = null;

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

    function yearToSession(batchYear) {
        const yr = parseInt(batchYear);
        if (!yr) return batchYear || '';
        return yr + '-' + (yr + 1);
    }

    function isPdfUrl(url) {
        return /\.pdf(\?|#|$)/i.test(url || '');
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
                    if (result.admin.image_url) {
                        avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    } else {
                        avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                    }
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

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

    async function loadMasterData() {
        try {
            const [depRes, courseRes, batchRes] = await Promise.all([
                window.FDC_SUPABASE.from('departments').select('*').eq('is_active', true).order('sort_order'),
                window.FDC_SUPABASE.from('courses').select('*').eq('is_active', true).order('sort_order'),
                window.FDC_SUPABASE.from('batches').select('*').eq('is_active', true).order('batch_year')
            ]);

            if (depRes.error) throw depRes.error;
            if (courseRes.error) throw courseRes.error;
            if (batchRes.error) throw batchRes.error;

            MASTER.departments = depRes.data || [];
            MASTER.courses = courseRes.data || [];
            MASTER.batches = batchRes.data || [];

            console.log('✅ Master data:', MASTER.departments.length, MASTER.courses.length, MASTER.batches.length);
        } catch (e) {
            console.error('Master data error:', e);
            window.fdcError('Master data load failed: ' + e.message);
        }
    }

    async function loadAllRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('class_routines_v2')
                .select('*')
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

    function applyFilters() {
        const fBranch = $('filterBranch').value;
        const fStatus = $('filterStatus').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredRoutines = allRoutines.filter(r => {
            if (fBranch && r.branch !== fBranch) return false;
            if (fStatus === 'published' && !r.is_published) return false;
            if (fStatus === 'unpublished' && r.is_published) return false;

            if (search) {
                const text = ((r.title || '') + ' ' + (r.group_name || '') + ' ' +
                    (r.department || '') + ' ' + (r.class_year || '') + ' ' + (r.batch || '')).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        renderRoutines();
    }

    function renderRoutines() {
        const list = $('routinesList');

        if (filteredRoutines.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-calendar-times"></i></div>
                <h6>কোনো routine পাওয়া যায়নি</h6>
                <p>"Add New Routine" ক্লিক করে নতুন যোগ করুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchClass = r.branch || 'HSC';
            const statusBadge = r.is_published
                ? '<span class="status-badge published">✓ Published</span>'
                : '<span class="status-badge draft">✗ Draft</span>';

            const metaTags = [];
            if (r.class_year) metaTags.push(`<span><i class="fas fa-graduation-cap"></i> ${escapeHtml(r.class_year)}</span>`);
            if (r.group_name) metaTags.push(`<span><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`);
            if (r.department) metaTags.push(`<span><i class="fas fa-book"></i> ${escapeHtml(r.department)}</span>`);
            if (r.batch) {
                const batchLabel = (r.branch === 'Honours' || r.branch === 'Degree')
                    ? 'Session ' + r.batch : 'Batch ' + r.batch;
                metaTags.push(`<span><i class="fas fa-layer-group"></i> ${escapeHtml(batchLabel)}</span>`);
            }
            if (r.session) metaTags.push(`<span><i class="fas fa-calendar"></i> ${escapeHtml(r.session)}</span>`);

            const description = r.description ? `<p>${escapeHtml(r.description)}</p>` : '';

            // ✅ Thumb: PDF icon or Image
            const isPdfFile = isPdfUrl(r.image_url);
            const thumbInner = isPdfFile
                ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fef2f2;color:#dc2626;font-size:38px;"><i class="fas fa-file-pdf"></i></div>`
                : `<img src="${escapeHtml(r.image_url || '')}" alt="${escapeHtml(r.title)}" onerror="this.style.display='none'">`;

            html += `<div class="routine-item ${r.is_published ? '' : 'unpublished'}">
                <div class="routine-thumb" data-action="preview" data-id="${r.id}">
                    ${thumbInner}
                    <div class="overlay"><i class="fas fa-expand"></i></div>
                </div>
                <div class="routine-body">
                    <h4>
                        ${escapeHtml(r.title)}
                        <span class="branch-badge ${branchClass}">${branchClass}</span>
                        ${statusBadge}
                    </h4>
                    ${description}
                    <div class="routine-meta">${metaTags.join('')}</div>
                </div>
                <div class="routine-actions">
                    <button class="action-btn edit" data-action="edit" data-id="${r.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn toggle ${r.is_published ? '' : 'off'}" data-action="toggle" data-id="${r.id}">
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

    async function renderSessionOptions(selectEl, keepValue) {
        const current = keepValue || selectEl.value;

        try {
            const sessions = await window.FDCSession.getSessions();
            MASTER.batches = sessions;
        } catch (e) { /* ignore */ }

        let html = '<option value="">Select</option>';
        MASTER.batches.forEach(b => {
            const label = b.session_label || yearToSession(b.batch_year);
            html += `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
        });

        selectEl.innerHTML = html;

        if (current) {
            const opts = Array.from(selectEl.options).map(o => o.value);
            if (opts.includes(current)) selectEl.value = current;
        }
    }

    function updateDynamicFields(branch) {
        const wrap1 = $('dynamicField1Wrap');
        const wrap2 = $('dynamicField2Wrap');
        const label1 = $('dynamicField1Label');
        const label2 = $('dynamicField2Label');
        const field1 = $('dynamicField1');
        const field2 = $('dynamicField2');
        const btnAddSession = $('btnAddSession');
        const sessionPanel = $('sessionAddPanel');

        wrap1.style.display = 'none';
        wrap2.style.display = 'none';
        field1.innerHTML = '<option value="">Select</option>';
        field2.innerHTML = '<option value="">Select</option>';
        field1.value = '';
        field2.value = '';

        if (btnAddSession) btnAddSession.style.display = 'none';
        if (sessionPanel) sessionPanel.style.display = 'none';

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
        }
        else if (branch === 'BM') {
            wrap2.style.display = 'block';
            label2.textContent = 'Year';

            BM_YEARS.forEach(y => {
                field2.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
        }
        else if (branch === 'Honours') {
            wrap1.style.display = 'block';
            wrap2.style.display = 'block';
            label1.textContent = 'Department';
            label2.textContent = 'Session';

            MASTER.departments.forEach(d => {
                const displayName = d.display_name || d.name_bn || d.name_en;
                field1.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(displayName)}">${escapeHtml(displayName)}</option>`);
            });

            renderSessionOptions(field2);

            if (btnAddSession) btnAddSession.style.display = 'inline-flex';
        }
        else if (branch === 'Degree') {
            wrap1.style.display = 'block';
            wrap2.style.display = 'block';
            label1.textContent = 'Course';
            label2.textContent = 'Session';

            MASTER.courses.forEach(c => {
                const displayName = c.display_name || c.name_bn || c.name_en;
                field1.insertAdjacentHTML('beforeend',
                    `<option value="${escapeHtml(displayName)}">${escapeHtml(displayName)}</option>`);
            });

            renderSessionOptions(field2);

            if (btnAddSession) btnAddSession.style.display = 'inline-flex';
        }

        autoSuggestTitle();
    }

    async function addNewSession() {
        const input = $('newSessionInput');
        const raw = (input.value || '').trim();

        if (!raw) return window.fdcWarning('Session লিখুন (যেমন: 2028-2029)');

        const btn = $('btnSaveSession');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const data = await window.FDCSession.addSession(raw);

            const sessions = await window.FDCSession.getSessions();
            MASTER.batches = sessions;

            const field2 = $('dynamicField2');
            const sessionLabel = data.session_label || yearToSession(data.batch_year);
            await renderSessionOptions(field2, sessionLabel);
            field2.value = sessionLabel;

            $('sessionAddPanel').style.display = 'none';
            input.value = '';

            window.fdcSuccess(`Session "${sessionLabel}" যোগ হয়েছে!`);
            autoSuggestTitle();
        } catch (e) {
            console.error('Add session error:', e);
            window.fdcError(e.message || 'যোগ করা যায়নি');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function autoSuggestTitle() {
        const branch = $('routineBranch').value;
        const field1 = $('dynamicField1').value;
        const field2 = $('dynamicField2').value;
        const titleEl = $('routineTitle');

        if (titleEl.dataset.userEdited === 'true') return;

        let title = '';
        if (branch === 'HSC') {
            title = `HSC ${field1 || ''} ${field2 || ''} Class Routine`.trim();
        } else if (branch === 'BM') {
            title = `BM (BMT) ${field2 || ''} Class Routine`.trim();
        } else if (branch === 'Honours') {
            title = `Honours ${field1 || ''} ${field2 ? 'Session ' + field2 : ''} Class Routine`.trim();
        } else if (branch === 'Degree') {
            title = `Degree ${field1 || ''} ${field2 ? 'Session ' + field2 : ''} Class Routine`.trim();
        }

        if (title) titleEl.value = title;
    }

    // =========================================================
    // ✅ IMAGE/PDF UPLOAD
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

            const previewImg = $('previewImg');
            const previewPdf = $('previewPdf');
            if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
            if (previewPdf) { previewPdf.style.display = 'none'; }

            $('existingImageUrl').value = '';
            $('existingCloudinaryId').value = '';
            window.fdcAlert('File removed', 'তথ্য', 'info');
        });
    }

    function handleImageSelect(file) {
        if (!file) return;

        const okTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf'
        ];

        if (!okTypes.includes(file.type)) {
            window.fdcWarning('শুধু JPG, PNG, WEBP বা PDF allowed');
            $('imageInput').value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            window.fdcWarning('File too large! Max 10MB');
            $('imageInput').value = '';
            return;
        }

        selectedImageFile = file;

        const isPdfFile = file.type === 'application/pdf';
        const previewImg = $('previewImg');
        const previewPdf = $('previewPdf');
        const previewPdfName = $('previewPdfName');

        if (isPdfFile) {
            previewImg.style.display = 'none';
            previewImg.src = '';
            previewPdf.style.display = 'block';
            if (previewPdfName) previewPdfName.textContent = file.name;
        } else {
            previewPdf.style.display = 'none';
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        $('imagePreview').classList.add('show');
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

        $('modalTitle').textContent = 'Add New Routine';
        $('modalSub').textContent = 'রুটিনের তথ্য পূরণ করুন';
        $('modalIcon').className = 'fas fa-calendar-plus';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Routine';

        $('routineBranch').value = '';
        $('routineSession').value = getCurrentSession();
        $('routineTitle').value = '';
        $('routineDescription').value = '';
        $('routinePublished').checked = true;

        updateDynamicFields('');

        // Reset preview
        $('imagePreview').classList.remove('show');
        $('imageInput').value = '';
        const previewImg = $('previewImg');
        const previewPdf = $('previewPdf');
        if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
        if (previewPdf) previewPdf.style.display = 'none';

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

        $('modalTitle').textContent = 'Edit Routine';
        $('modalSub').textContent = r.title || '';
        $('modalIcon').className = 'fas fa-edit';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Routine';

        $('routineBranch').value = r.branch || '';
        updateDynamicFields(r.branch || '');

        if (r.branch === 'HSC') {
            $('dynamicField1').value = r.group_name || '';
            $('dynamicField2').value = r.class_year || '';
        } else if (r.branch === 'BM') {
            $('dynamicField2').value = r.class_year || '';
        } else if (r.branch === 'Honours' || r.branch === 'Degree') {
            $('dynamicField1').value = r.department || '';
            let batchVal = r.batch || '';
            if (batchVal && /^\d{4}$/.test(batchVal)) batchVal = yearToSession(batchVal);
            $('dynamicField2').value = batchVal;
        }

        $('routineSession').value = r.session || '';
        $('routineTitle').value = r.title || '';
        $('routineDescription').value = r.description || '';
        $('routinePublished').checked = !!r.is_published;
        $('routineTitle').dataset.userEdited = 'true';

        // ✅ Show preview — Image or PDF
        const previewImg = $('previewImg');
        const previewPdf = $('previewPdf');
        const previewPdfName = $('previewPdfName');

        if (r.image_url) {
            if (isPdfUrl(r.image_url)) {
                previewImg.style.display = 'none';
                previewImg.src = '';
                previewPdf.style.display = 'block';
                if (previewPdfName) {
                    const parts = r.image_url.split('/');
                    previewPdfName.textContent = parts[parts.length - 1].split('?')[0];
                }
            } else {
                previewPdf.style.display = 'none';
                previewImg.src = r.image_url;
                previewImg.style.display = 'block';
            }
            $('imagePreview').classList.add('show');
        } else {
            $('imagePreview').classList.remove('show');
            previewImg.style.display = 'none';
            previewPdf.style.display = 'none';
        }
        $('imageInput').value = '';

        openModal('routineModal');
    }

    // =========================================================
    // SAVE ROUTINE
    // =========================================================
    async function saveRoutine() {
        const branch = $('routineBranch').value;
        const field1 = $('dynamicField1').value;
        const field2 = $('dynamicField2').value;
        const session = $('routineSession').value.trim();
        const title = $('routineTitle').value.trim();
        const description = $('routineDescription').value.trim();
        const isPublished = $('routinePublished').checked;
        const existingUrl = $('existingImageUrl').value;

        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (branch === 'HSC') {
            if (!field1) return window.fdcWarning('Group সিলেক্ট করুন।');
            if (!field2) return window.fdcWarning('Year সিলেক্ট করুন।');
        }
        if (branch === 'BM' && !field2) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (branch === 'Honours' || branch === 'Degree') {
            if (!field1) return window.fdcWarning('Department/Course সিলেক্ট করুন।');
            if (!field2) return window.fdcWarning('Session সিলেক্ট করুন।');
        }
        if (!title) return window.fdcWarning('Title দিতে হবে।');
        if (!selectedImageFile && !existingUrl) return window.fdcWarning('File upload করুন (Image/PDF)।');

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
                result = await window.FDC_SUPABASE.from('class_routines_v2').update(payload).eq('id', editingId).select();
            } else {
                result = await window.FDC_SUPABASE.from('class_routines_v2').insert([payload]).select();
            }

            if (result.error) throw result.error;

            closeModal('routineModal');
            window.fdcSuccess(editingId ? 'Routine সফলভাবে update হয়েছে!' : 'Routine সফলভাবে তৈরি হয়েছে!');
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
    // DELETE
    // =========================================================
    function deleteRoutine(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r) return;

        window.fdcPromptInput({
            title: '⚠️ Delete Routine',
            subtitle: r.title,
            message: `এই routine <strong>চিরতরে</strong> delete হবে।<p style="margin-top:12px;color:#7f1d1d;font-weight:700;">এটি undo করা যাবে না!</p>`,
            expectedValue: 'DELETE',
            placeholder: 'টাইপ করুন: DELETE',
            confirmText: 'হ্যাঁ, Delete করুন',
            cancelText: 'বাতিল',
            confirmType: 'danger',
            onConfirm: async function () {
                try {
                    const { error } = await window.FDC_SUPABASE.from('class_routines_v2').delete().eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Routine সফলভাবে delete হয়েছে!');
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
        try {
            const { error } = await window.FDC_SUPABASE.from('class_routines_v2').update({ is_published: newState }).eq('id', id);
            if (error) throw error;
            window.fdcSuccess(`Routine সফলভাবে ${newState ? 'Publish' : 'Unpublish'} হয়েছে!`);
            await loadAllRoutines();
        } catch (e) {
            window.fdcError('Failed: ' + e.message);
        }
    }

    // =========================================================
    // PREVIEW (Image/PDF)
    // =========================================================
    function openPreview(id) {
        const r = allRoutines.find(x => x.id === id);
        if (!r || !r.image_url) return;

        if (isPdfUrl(r.image_url)) {
            window.open(r.image_url, '_blank', 'noopener');
            return;
        }

        $('previewModalImg').src = r.image_url;
        $('previewOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('previewOverlay').classList.remove('show');
        document.body.style.overflow = '';
    }

    // =========================================================
    // EVENTS
    // =========================================================
    function attachEvents() {
        $('btnAddRoutine').addEventListener('click', openAddRoutineModal);
        $('closeModal').addEventListener('click', () => closeModal('routineModal'));
        $('cancelBtn').addEventListener('click', () => closeModal('routineModal'));
        $('saveBtn').addEventListener('click', saveRoutine);

        $('routineBranch').addEventListener('change', function () {
            updateDynamicFields(this.value);
            $('routineTitle').dataset.userEdited = 'false';
        });

        $('dynamicField1').addEventListener('change', autoSuggestTitle);
        $('dynamicField2').addEventListener('change', autoSuggestTitle);

        $('routineTitle').addEventListener('input', function () {
            this.dataset.userEdited = 'true';
        });

        // Session Add
        const btnAddSession = $('btnAddSession');
        if (btnAddSession) {
            btnAddSession.addEventListener('click', function () {
                const panel = $('sessionAddPanel');
                const input = $('newSessionInput');
                if (panel.style.display === 'none' || !panel.style.display) {
                    panel.style.display = 'block';
                    input.value = '';
                    input.focus();
                } else {
                    panel.style.display = 'none';
                }
            });
        }

        const btnSaveSession = $('btnSaveSession');
        if (btnSaveSession) btnSaveSession.addEventListener('click', addNewSession);

        const btnCancelSession = $('btnCancelSession');
        if (btnCancelSession) {
            btnCancelSession.addEventListener('click', function () {
                $('sessionAddPanel').style.display = 'none';
                $('newSessionInput').value = '';
            });
        }

        const newSessionInput = $('newSessionInput');
        if (newSessionInput) {
            newSessionInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); addNewSession(); }
            });
        }

        ['filterBranch', 'filterStatus'].forEach(id => {
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
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
                if ($('previewOverlay').classList.contains('show')) closePreview();
                document.body.style.overflow = '';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Class Routine v4.0 initializing...');

        attachEvents();
        setupImageUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadMasterData();
            await loadAllRoutines();

            console.log('✅ Admin Class Routine v4.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();