/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN DEPARTMENT HEADS
 * Location: js/admin-department-heads.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allHeads = [];
    let editingId = null;
    let selectedImageFile = null;

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        document.addEventListener('fdc:supabase-ready', cb);

        let n = 0;
        const i = setInterval(function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) { clearInterval(i); showToast('Connection timeout', 'error'); }
        }, 500);
    }

    // =========================================================
    // PREMIUM CONFIRM MODAL
    // =========================================================
    function showConfirm(options) {
        return new Promise(function (resolve) {
            const opts = Object.assign({
                title: 'নিশ্চিত করুন',
                message: '',
                icon: 'question',
                confirmText: 'হ্যাঁ',
                cancelText: 'না',
                confirmColor: 'primary'
            }, options);

            document.querySelectorAll('.fdc-confirm-overlay').forEach(m => m.remove());

            const iconConfig = {
                question: { icon: 'fa-question-circle', color: '#3b82f6' },
                warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b' },
                danger: { icon: 'fa-exclamation-circle', color: '#ef4444' },
                info: { icon: 'fa-info-circle', color: '#3b82f6' },
                success: { icon: 'fa-check-circle', color: '#10b981' }
            };
            const cfg = iconConfig[opts.icon] || iconConfig.question;

            const confirmBtnColors = {
                primary: 'linear-gradient(135deg, #1a237e, #0d47a1)',
                danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
                warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
                success: 'linear-gradient(135deg, #10b981, #059669)'
            };

            const overlayHtml = `
                <div class="fdc-confirm-overlay">
                    <div class="fdc-confirm-box">
                        <div class="fdc-confirm-icon" style="background:${cfg.color}15;color:${cfg.color};">
                            <i class="fas ${cfg.icon}"></i>
                        </div>
                        <h3 class="fdc-confirm-title">${opts.title}</h3>
                        <p class="fdc-confirm-message">${opts.message}</p>
                        <div class="fdc-confirm-actions">
                            <button class="fdc-btn fdc-btn-cancel" data-action="cancel">
                                <i class="fas fa-times"></i> ${opts.cancelText}
                            </button>
                            <button class="fdc-btn fdc-btn-confirm" data-action="confirm"
                                    style="background:${confirmBtnColors[opts.confirmColor]};">
                                <i class="fas fa-check"></i> ${opts.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            if (!document.getElementById('fdc-confirm-styles')) {
                const style = document.createElement('style');
                style.id = 'fdc-confirm-styles';
                style.textContent = `
                    .fdc-confirm-overlay { position: fixed; inset: 0; background: rgba(6,29,54,0.65); backdrop-filter: blur(8px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fdcFadeIn 0.2s ease; }
                    @keyframes fdcFadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fdcSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    .fdc-confirm-box { background: linear-gradient(145deg, #ffffff, #f8f9fa); border-radius: 20px; padding: 32px 28px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.3); animation: fdcSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(255,255,255,0.8); }
                    .fdc-confirm-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 18px; }
                    .fdc-confirm-title { margin: 0 0 10px; font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1a237e; }
                    .fdc-confirm-message { margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: #555; }
                    .fdc-confirm-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
                    .fdc-btn { min-width: 110px; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.25s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
                    .fdc-btn:hover { transform: translateY(-2px); }
                    .fdc-btn-cancel { background: #f0f2f5; color: #555; }
                    .fdc-btn-cancel:hover { background: #e0e3eb; }
                    .fdc-btn-confirm { color: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
                `;
                document.head.appendChild(style);
            }

            document.body.insertAdjacentHTML('beforeend', overlayHtml);
            const overlay = document.querySelector('.fdc-confirm-overlay');
            overlay.querySelector('.fdc-btn-confirm').focus();

            function close(result) {
                overlay.style.animation = 'fdcFadeIn 0.2s ease reverse';
                setTimeout(function () { overlay.remove(); }, 180);
                resolve(result);
            }

            overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { close(false); });
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () { close(true); });
            overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); close(false); }
                if (e.key === 'Enter') { document.removeEventListener('keydown', escHandler); close(true); }
            });
        });
    }

    // =========================================================
    // TOAST
    // =========================================================
    function showToast(msg, type = 'success') {
        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        t.className = 'toast-msg toast-' + type;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(function () {
            t.style.animation = 'slideOut 0.35s ease';
            setTimeout(function () { t.remove(); }, 350);
        }, 3500);
    }

    // =========================================================
    // ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const admin = result.admin;
                document.getElementById('adminName').textContent = admin.name || 'Administrator';
                document.getElementById('adminRole').textContent = 'Role: ' + (admin.role === 'super_admin' ? 'Super Admin' : 'Admin');
                document.getElementById('adminAvatar').textContent = (admin.name || 'A').charAt(0).toUpperCase();
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = async function () {
        const ok = await showConfirm({
            title: 'Logout',
            message: 'আপনি কি লগআউট করতে চান?',
            icon: 'question',
            confirmText: 'লগআউট',
            cancelText: 'বাতিল',
            confirmColor: 'danger'
        });
        if (!ok) return;

        try {
            await window.FDCAuth.logout();
            window.location.replace('admin-login.html');
        } catch (e) { console.error(e); }
    };

    // =========================================================
    // LOAD ALL HEADS
    // =========================================================
    async function loadAllHeads() {
        const tbody = document.getElementById('headsTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4" style="color:#999;">
                    <i class="fas fa-spinner fa-spin"></i> Loading...
                </td>
            </tr>
        `;

        try {
            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase
                .from('department_heads')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            allHeads = data || [];
            console.log('✅ Loaded heads:', allHeads.length);

            document.getElementById('countBadge').textContent = allHeads.length;

            if (allHeads.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state">
                                <i class="fas fa-user-tie"></i>
                                <p>কোনো বিভাগীয় প্রধান নেই</p>
                                <small>উপরের ফর্ম থেকে যোগ করুন</small>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            let html = '';
            allHeads.forEach(function (head) {
                const imageUrl = head.image_url || '../assets/images/logo1.png';
                const statusBadge = head.is_active
                    ? '<span class="status-badge-active">✅ Active</span>'
                    : '<span class="status-badge-inactive">❌ Inactive</span>';

                html += `
                    <tr>
                        <td>
                            <img src="${escapeHtml(imageUrl)}"
                                 alt="${escapeHtml(head.name)}"
                                 class="head-photo"
                                 onerror="this.src='../assets/images/logo1.png'">
                        </td>
                        <td>
                            <div class="head-name">${escapeHtml(head.name || '-')}</div>
                        </td>
                        <td>
                            <div class="head-designation">${escapeHtml(head.designation || '-')}</div>
                        </td>
                        <td>
                            <span class="head-department">${escapeHtml(head.department || '-')}</span>
                        </td>
                        <td style="text-align:center; font-weight:700; color:#1a237e;">
                            ${head.display_order || 0}
                        </td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn-icon btn-toggle"
                                    onclick="window.toggleHeadActive('${head.id}')"
                                    title="${head.is_active ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${head.is_active ? 'eye-slash' : 'eye'}"></i>
                            </button>
                            <button class="btn-icon btn-edit"
                                    onclick="window.editHead('${head.id}')"
                                    title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete"
                                    onclick="window.deleteHead('${head.id}')"
                                    title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

        } catch (err) {
            console.error('❌ Load error:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4" style="color:#ef4444;">
                        <i class="fas fa-exclamation-circle"></i> লোড করা যায়নি: ${escapeHtml(err.message)}
                    </td>
                </tr>
            `;
        }
    }

    // =========================================================
    // IMAGE UPLOAD SETUP
    // =========================================================
    function setupUpload() {
        const drop = document.getElementById('headImageDrop');
        const input = document.getElementById('headImageInput');
        const preview = document.getElementById('headImagePreview');
        const remove = document.getElementById('removeHeadImage');

        if (!drop || !input) return;

        drop.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            e.preventDefault();
            input.click();
        });

        input.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                handleImageSelect(this.files[0]);
            }
        });

        drop.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = '#1a237e';
            this.style.background = '#f5f7ff';
        });

        drop.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
        });

        drop.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
            if (e.dataTransfer.files[0]) {
                handleImageSelect(e.dataTransfer.files[0]);
            }
        });

        if (remove) {
            remove.addEventListener('click', function (e) {
                e.stopPropagation();
                selectedImageFile = null;
                input.value = '';
                preview.classList.remove('show');
            });
        }
    }

    function handleImageSelect(file) {
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('ছবি 2MB-এর বেশি!', 'error');
            document.getElementById('headImageInput').value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('শুধু ছবি সিলেক্ট করুন', 'error');
            document.getElementById('headImageInput').value = '';
            return;
        }

        selectedImageFile = file;

        const previewImg = document.getElementById('previewImg');
        const previewIcon = document.getElementById('previewIcon');

        const reader = new FileReader();
        reader.onload = function (e) {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                previewImg.style.width = '60px';
                previewImg.style.height = '60px';
                previewImg.style.borderRadius = '50%';
                previewImg.style.objectFit = 'cover';
                previewImg.style.border = '2px solid #1a237e';
            }
            if (previewIcon) previewIcon.style.display = 'none';
        };
        reader.readAsDataURL(file);

        document.getElementById('headImageName').textContent = file.name;
        document.getElementById('headImageSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        document.getElementById('headImagePreview').classList.add('show');
        document.getElementById('existingHeadImage').classList.remove('show');

        showToast('✅ ছবি সিলেক্ট হয়েছে!', 'success');
    }

    // =========================================================
    // FORM SUBMIT
    // =========================================================
    async function handleFormSubmit(e) {
        e.preventDefault();

        const name = (document.getElementById('headName') || {}).value.trim();
        const designation = (document.getElementById('headDesignation') || {}).value.trim();
        const department = (document.getElementById('headDepartment') || {}).value.trim();
        const displayOrder = parseInt((document.getElementById('headOrder') || {}).value) || 0;
        const isActive = (document.getElementById('headActive') || {}).checked;
        let imageUrl = (document.getElementById('headImageUrl') || {}).value || '';

        if (!name || !designation || !department) {
            showToast('নাম, পদবি ও বিভাগ পূরণ করুন', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveBtn');
        const saveBtnText = document.getElementById('saveBtnText');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            // Upload image if selected
            if (selectedImageFile) {
                if (typeof window.FDCUploadImage !== 'function') {
                    throw new Error('Cloudinary upload unavailable');
                }
                saveBtnText.textContent = 'Uploading...';
                const uploaded = await window.FDCUploadImage(selectedImageFile);
                imageUrl = uploaded.url;
                console.log('✅ Image uploaded:', imageUrl);
            }

            const supabase = window.FDC_SUPABASE;

            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('department_heads')
                    .update({
                        name: name,
                        designation: designation,
                        department: department,
                        image_url: imageUrl,
                        display_order: displayOrder,
                        is_active: isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                showToast('✅ বিভাগীয় প্রধান আপডেট হয়েছে!', 'success');

            } else {
                // INSERT
                const { error } = await supabase
                    .from('department_heads')
                    .insert([{
                        name: name,
                        designation: designation,
                        department: department,
                        image_url: imageUrl,
                        display_order: displayOrder,
                        is_active: isActive
                    }]);

                if (error) throw error;
                showToast('✅ নতুন বিভাগীয় প্রধান যোগ হয়েছে!', 'success');
            }

            resetForm();
            await loadAllHeads();

        } catch (err) {
            console.error('❌ Save error:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveBtnText">' + (editingId ? 'Update করুন' : 'যোগ করুন') + '</span>';
        }
    }

    // =========================================================
    // EDIT HEAD
    // =========================================================
    window.editHead = function (id) {
        const head = allHeads.find(h => h.id === id);
        if (!head) return;

        editingId = id;
        selectedImageFile = null;

        document.getElementById('editId').value = id;
        document.getElementById('headName').value = head.name || '';
        document.getElementById('headDesignation').value = head.designation || '';
        document.getElementById('headDepartment').value = head.department || '';
        document.getElementById('headOrder').value = head.display_order || 0;
        document.getElementById('headActive').checked = head.is_active !== false;
        document.getElementById('headImageUrl').value = head.image_url || '';

        // Preview current image
        if (head.image_url) {
            const previewImg = document.getElementById('previewImg');
            const previewIcon = document.getElementById('previewIcon');
            if (previewImg) {
                previewImg.src = head.image_url;
                previewImg.style.display = 'block';
                previewImg.style.width = '60px';
                previewImg.style.height = '60px';
                previewImg.style.borderRadius = '50%';
                previewImg.style.objectFit = 'cover';
                previewImg.style.border = '2px solid #1a237e';
            }
            if (previewIcon) previewIcon.style.display = 'none';

            document.getElementById('headImageName').textContent = 'বর্তমান ছবি';
            document.getElementById('headImageSize').textContent = 'নতুন সিলেক্ট না করলে এটাই থাকবে';
            document.getElementById('headImagePreview').classList.add('show');
        }

        document.getElementById('formTitle').textContent = 'বিভাগীয় প্রধান এডিট করুন';
        document.getElementById('saveBtnText').textContent = 'Update করুন';
        document.getElementById('cancelBtn').style.display = 'inline-flex';

        // Scroll to form
        document.getElementById('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });

        showToast('এডিট মোডে আছেন', 'info');
    };

    // =========================================================
    // DELETE HEAD
    // =========================================================
    window.deleteHead = async function (id) {
        const head = allHeads.find(h => h.id === id);
        if (!head) return;

        const ok = await showConfirm({
            title: 'Delete Department Head',
            message: `"${head.name}" কে মুছে ফেলা হবে। এই অপারেশন undo করা যাবে না।`,
            icon: 'danger',
            confirmText: 'হ্যাঁ, মুছুন',
            cancelText: 'বাতিল',
            confirmColor: 'danger'
        });

        if (!ok) return;

        try {
            const supabase = window.FDC_SUPABASE;
            const { error } = await supabase
                .from('department_heads')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('✅ মুছে ফেলা হয়েছে!', 'success');
            await loadAllHeads();

        } catch (err) {
            console.error('❌ Delete error:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
        }
    };

    // =========================================================
    // TOGGLE ACTIVE
    // =========================================================
    window.toggleHeadActive = async function (id) {
        const head = allHeads.find(h => h.id === id);
        if (!head) return;

        const newValue = !head.is_active;

        try {
            const supabase = window.FDC_SUPABASE;
            const { error } = await supabase
                .from('department_heads')
                .update({ is_active: newValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            showToast(
                newValue ? '✅ Active করা হয়েছে!' : '⚠️ Deactivate করা হয়েছে',
                'success'
            );

            await loadAllHeads();

        } catch (err) {
            console.error('❌ Toggle error:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
        }
    };

    // =========================================================
    // RESET FORM
    // =========================================================
    function resetForm() {
        editingId = null;
        selectedImageFile = null;

        document.getElementById('headForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('headImageUrl').value = '';
        document.getElementById('headImagePreview').classList.remove('show');
        document.getElementById('existingHeadImage').classList.remove('show');
        document.getElementById('headImageInput').value = '';

        document.getElementById('formTitle').textContent = 'নতুন বিভাগীয় প্রধান যোগ করুন';
        document.getElementById('saveBtnText').textContent = 'যোগ করুন';
        document.getElementById('cancelBtn').style.display = 'none';

        // Reset active checkbox
        document.getElementById('headActive').checked = true;
    }

    // =========================================================
    // ESCAPE HTML
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Department Heads initialized');

        document.getElementById('headForm')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('cancelBtn')?.addEventListener('click', resetForm);
        document.getElementById('refreshBtn')?.addEventListener('click', loadAllHeads);

        setupUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllHeads();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ admin-department-heads.js loaded');

})();