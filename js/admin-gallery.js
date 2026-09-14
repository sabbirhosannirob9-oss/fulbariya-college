/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN GALLERY
 * Location: js/admin-gallery.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 *
 * Features:
 *   - Load all gallery images from Supabase
 *   - Upload to Cloudinary
 *   - Add / Edit / Delete
 *   - Toggle Featured (Homepage)
 *   - Filter by category
 *   - Premium Confirm Modals
 *   - Toast notifications
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allImages = [];
    let currentFilter = 'all';
    let editingId = null;
    let selectedImageFile = null;

    const CATEGORY_LABELS = {
        'campus': '🏛️ ক্যাম্পাস',
        'bncc': '🛡️ BNCC',
        'scouts': '⛺ Rover Scouts',
        'sports': '🏆 ক্রীড়া',
        'cultural': '🎭 সাংস্কৃতিক',
        'event': '📅 অনুষ্ঠান',
        'academic': '📚 একাডেমিক',
        'blood': '🩸 রক্তদান',
        'other': '📌 অন্যান্য'
    };

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
                clearInterval(i);
                cb();
            }
            if (++n > 20) {
                clearInterval(i);
                showToast('Connection timeout', 'error');
            }
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
                                    style="background:${confirmBtnColors[opts.confirmColor] || confirmBtnColors.primary};">
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
                    .fdc-confirm-overlay { position: fixed; inset: 0; background: rgba(6,29,54,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fdcFadeIn 0.2s ease; }
                    @keyframes fdcFadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fdcSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    .fdc-confirm-box { background: linear-gradient(145deg, #ffffff, #f8f9fa); border-radius: 20px; padding: 32px 28px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.3); animation: fdcSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(255,255,255,0.8); }
                    .fdc-confirm-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 18px; }
                    .fdc-confirm-title { margin: 0 0 10px; font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1a237e; }
                    .fdc-confirm-message { margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: #555; }
                    .fdc-confirm-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
                    .fdc-btn { min-width: 110px; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.25s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Hind Siliguri', sans-serif; }
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
    // LOAD ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result?.admin) {
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
    // LOAD ALL IMAGES
    // =========================================================
    async function loadAllImages() {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-spinner fa-spin"></i>
                <p>ছবি লোড হচ্ছে...</p>
            </div>
        `;

        try {
            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase
                .from('gallery')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            allImages = data || [];
            console.log('✅ Loaded images:', allImages.length);

            renderGallery();

        } catch (err) {
            console.error('❌ Load error:', err);
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>
                    <p>লোড করা যায়নি: ${err.message}</p>
                </div>
            `;
        }
    }

    // =========================================================
    // RENDER GALLERY
    // =========================================================
    function renderGallery() {
        const grid = document.getElementById('galleryGrid');
        let filtered = allImages;

        // Filter
        if (currentFilter === 'featured') {
            filtered = allImages.filter(img => img.is_featured);
        } else if (currentFilter !== 'all') {
            filtered = allImages.filter(img => img.category === currentFilter);
        }

        // Count badge
        document.getElementById('countBadge').textContent = filtered.length + ' / ' + allImages.length;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-inbox"></i>
                    <p>কোনো ছবি নেই</p>
                    <small>উপরের ফর্ম থেকে ছবি যোগ করুন</small>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(function (img) {
            const categoryLabel = CATEGORY_LABELS[img.category] || img.category;
            const imageUrl = img.image_url || '../assets/images/logo1.png';
            const featuredIcon = img.is_featured ? 'fa-star' : 'fa-star-o';

            html += `
                <div class="gallery-item">
                    ${img.is_featured ? '<div class="gallery-badge-featured"><i class="fas fa-star"></i></div>' : ''}
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(img.title)}"
                         class="gallery-thumb"
                         onerror="this.src='../assets/images/logo1.png'">
                    <div class="gallery-body">
                        <h6 class="gallery-title" title="${escapeHtml(img.title)}">
                            ${escapeHtml(img.title)}
                        </h6>
                        <span class="gallery-category">${categoryLabel}</span>

                        <div class="gallery-actions">
                            <button class="icon-btn featured ${img.is_featured ? 'active' : ''}"
                                    onclick="window.toggleFeatured('${img.id}')"
                                    title="${img.is_featured ? 'Featured থেকে সরান' : 'Featured করুন'}">
                                <i class="fas ${featuredIcon}"></i>
                            </button>
                            <button class="icon-btn edit" onclick="window.editImage('${img.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn delete" onclick="window.deleteImage('${img.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    // =========================================================
    // IMAGE UPLOAD PREVIEW
    // =========================================================
    function setupUploadZone() {
        const zone = document.getElementById('uploadZone');
        const input = document.getElementById('imageInput');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const removeBtn = document.getElementById('removeImage');

        zone.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            e.preventDefault();
            input.click();
        });

        input.addEventListener('change', function () {
            if (this.files && this.files[0]) handleImageSelect(this.files[0]);
        });

        zone.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = '#1a237e';
            this.style.background = '#f5f7ff';
        });

        zone.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
        });

        zone.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
            if (e.dataTransfer.files[0]) handleImageSelect(e.dataTransfer.files[0]);
        });

        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            selectedImageFile = null;
            input.value = '';
            preview.classList.remove('show');
            document.getElementById('imageUrl').value = '';
        });
    }

    function handleImageSelect(file) {
        if (!file) return;

        // Size check
        if (file.size > 2 * 1024 * 1024) {
            showToast('ছবি অনেক বড়! সর্বোচ্চ 2MB', 'error');
            document.getElementById('imageInput').value = '';
            return;
        }

        // Type check
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            showToast('শুধু JPG/PNG/GIF/WEBP', 'error');
            document.getElementById('imageInput').value = '';
            return;
        }

        selectedImageFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            const previewImg = document.getElementById('previewImg');
            previewImg.src = e.target.result;
            document.getElementById('imageName').textContent = file.name;
            document.getElementById('imageSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
            document.getElementById('imagePreview').classList.add('show');
        };
        reader.readAsDataURL(file);

        showToast('✅ ছবি সিলেক্ট হয়েছে!', 'success');
    }

    // =========================================================
    // FORM SUBMIT
    // =========================================================
    async function handleFormSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('galleryTitle').value.trim();
        const category = document.getElementById('galleryCategory').value;
        const description = document.getElementById('galleryDescription').value.trim();
        const displayOrder = parseInt(document.getElementById('galleryOrder').value) || 0;
        const isFeatured = document.getElementById('isFeatured').checked;
        let imageUrl = document.getElementById('imageUrl').value.trim();

        // Validation
        if (!title) { showToast('শিরোনাম দিন', 'error'); return; }
        if (!category) { showToast('Category সিলেক্ট করুন', 'error'); return; }

        if (!editingId && !selectedImageFile) {
            showToast('ছবি সিলেক্ট করুন', 'error');
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

            if (!imageUrl) throw new Error('No image URL');

            const supabase = window.FDC_SUPABASE;

            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('gallery')
                    .update({
                        title: title,
                        description: description || null,
                        image_url: imageUrl,
                        category: category,
                        display_order: displayOrder,
                        is_featured: isFeatured,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                showToast('✅ ছবি আপডেট হয়েছে!', 'success');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('gallery')
                    .insert([{
                        title: title,
                        description: description || null,
                        image_url: imageUrl,
                        category: category,
                        display_order: displayOrder,
                        is_featured: isFeatured,
                        is_active: true
                    }]);

                if (error) throw error;
                showToast('✅ নতুন ছবি যোগ হয়েছে!', 'success');
            }

            resetForm();
            await loadAllImages();

        } catch (err) {
            console.error('❌ Save error:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> <span id="saveBtnText">' + (editingId ? 'Update করুন' : 'ছবি যোগ করুন') + '</span>';
        }
    }

    // =========================================================
    // EDIT IMAGE
    // =========================================================
    window.editImage = function (id) {
        const img = allImages.find(i => i.id === id);
        if (!img) return;

        editingId = id;
        selectedImageFile = null;

        document.getElementById('editId').value = id;
        document.getElementById('galleryTitle').value = img.title || '';
        document.getElementById('galleryCategory').value = img.category || '';
        document.getElementById('galleryDescription').value = img.description || '';
        document.getElementById('galleryOrder').value = img.display_order || 0;
        document.getElementById('isFeatured').checked = img.is_featured || false;
        document.getElementById('imageUrl').value = img.image_url || '';

        // Show current image preview
        const previewImg = document.getElementById('previewImg');
        previewImg.src = img.image_url;
        document.getElementById('imageName').textContent = 'বর্তমান ছবি';
        document.getElementById('imageSize').textContent = 'নতুন সিলেক্ট না করলে এটাই থাকবে';
        document.getElementById('imagePreview').classList.add('show');

        document.getElementById('formTitle').textContent = 'ছবি এডিট করুন';
        document.getElementById('saveBtnText').textContent = 'Update করুন';
        document.getElementById('cancelBtn').style.display = 'inline-flex';

        // Scroll to form
        document.getElementById('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });

        showToast('এডিট মোডে আছেন', 'info');
    };

    // =========================================================
    // DELETE IMAGE
    // =========================================================
    window.deleteImage = async function (id) {
        const img = allImages.find(i => i.id === id);
        if (!img) return;

        const ok = await showConfirm({
            title: 'Delete Image',
            message: `"${img.title}" ছবিটি মুছে ফেলা হবে। এই অপারেশন undo করা যাবে না।`,
            icon: 'danger',
            confirmText: 'হ্যাঁ, মুছুন',
            cancelText: 'বাতিল',
            confirmColor: 'danger'
        });

        if (!ok) return;

        try {
            const supabase = window.FDC_SUPABASE;
            const { error } = await supabase
                .from('gallery')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('✅ ছবি মুছে ফেলা হয়েছে!', 'success');
            await loadAllImages();

        } catch (err) {
            console.error('❌ Delete error:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
        }
    };

    // =========================================================
    // TOGGLE FEATURED
    // =========================================================
    window.toggleFeatured = async function (id) {
        const img = allImages.find(i => i.id === id);
        if (!img) return;

        const newValue = !img.is_featured;

        try {
            const supabase = window.FDC_SUPABASE;
            const { error } = await supabase
                .from('gallery')
                .update({ is_featured: newValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            showToast(
                newValue ? '⭐ হোমপেজে Featured করা হয়েছে!' : 'Featured থেকে সরানো হয়েছে',
                'success'
            );

            await loadAllImages();

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

        document.getElementById('galleryForm').reset();
        document.getElementById('editId').value = '';
        document.getElementById('imageUrl').value = '';
        document.getElementById('imagePreview').classList.remove('show');
        document.getElementById('imageInput').value = '';

        document.getElementById('formTitle').textContent = 'নতুন ছবি যোগ করুন';
        document.getElementById('saveBtnText').textContent = 'ছবি যোগ করুন';
        document.getElementById('cancelBtn').style.display = 'none';
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
    // FILTER HANDLER
    // =========================================================
    function setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderGallery();
            });
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Gallery initialized');

        document.getElementById('galleryForm')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('cancelBtn')?.addEventListener('click', resetForm);
        document.getElementById('refreshBtn')?.addEventListener('click', loadAllImages);

        setupUploadZone();
        setupFilters();

        waitForSupabase(async function () {
            await loadAdminInfo();
            await loadAllImages();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();