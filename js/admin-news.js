/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN NEWS MANAGEMENT
 * Location: js/admin-news.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allNews = [];
    let editingId = null;
    let selectedImageFile = null;
    let currentFilter = 'all';
    let searchQuery = '';

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
    // SMART CONFIRM MODAL
    // =========================================================
    let modalResolver = null;
    function showConfirm(options) {
        return new Promise(function (resolve) {
            modalResolver = resolve;
            const title = document.getElementById('smartModalTitle');
            const text = document.getElementById('smartModalText');
            if (title) title.textContent = options.title || 'Are you sure?';
            if (text) text.textContent = options.message || '';
            document.getElementById('smartModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }
    function closeConfirm(result) {
        document.getElementById('smartModal').classList.remove('show');
        document.body.style.overflow = '';
        if (modalResolver) { modalResolver(result); modalResolver = null; }
    }
    document.getElementById('smartModalConfirm')?.addEventListener('click', () => closeConfirm(true));
    document.getElementById('smartModalCancel')?.addEventListener('click', () => closeConfirm(false));
    document.getElementById('smartModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'smartModal') closeConfirm(false);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.getElementById('smartModal')?.classList.contains('show')) {
            closeConfirm(false);
        }
    });

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
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        const t = document.createElement('div');
        t.className = 'toast-msg toast-' + type;
        t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> <span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(function () {
            t.style.animation = 'slideOut 0.35s ease';
            setTimeout(function () { t.remove(); }, 350);
        }, 3500);
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
    // ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const admin = result.admin;
                const avatar = document.querySelector('[data-admin-avatar]');
                if (avatar) {
                    if (admin.image_url) {
                        avatar.innerHTML = `<img src="${admin.image_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                    } else {
                        avatar.textContent = (admin.name || 'A').charAt(0).toUpperCase();
                    }
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = async function () {
        const ok = await showConfirm({
            title: 'Logout',
            message: 'আপনি কি লগআউট করতে চান?'
        });
        if (!ok) return;
        try {
            await window.FDCAuth.logout();
            window.location.replace('admin-login.html');
        } catch (e) { console.error(e); }
    };

    // =========================================================
    // IMAGE UPLOAD SETUP
    // =========================================================
    function setupImageUpload() {
        const dropArea = document.getElementById('imageDropArea');
        const fileInput = document.getElementById('imageInput');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const removeBtn = document.getElementById('removeImage');

        if (!dropArea || !fileInput) return;

        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                handleImageSelect(this.files[0]);
            }
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
            removeBtn.addEventListener('click', function () {
                selectedImageFile = null;
                fileInput.value = '';
                preview.classList.remove('show');
                document.getElementById('existingImageUrl').value = '';
                showToast('Image removed', 'info');
            });
        }
    }

    function handleImageSelect(file) {
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            showToast('Image too large! Max 3MB', 'error');
            document.getElementById('imageInput').value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            showToast('Only images allowed', 'error');
            return;
        }
        selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('imagePreview').classList.add('show');
        };
        reader.readAsDataURL(file);
        showToast(`Image selected`, 'success');
    }

    // =========================================================
    // LOAD ALL NEWS
    // =========================================================
    async function loadAllNews() {
        const tbody = document.getElementById('newsTableBody');
        try {
            if (!window.FDC_SUPABASE_READY) {
                await new Promise(r => {
                    if (window.FDC_SUPABASE_READY) return r();
                    document.addEventListener('fdc:supabase-ready', r, { once: true });
                    setTimeout(r, 10000);
                });
            }

            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .order('display_order', { ascending: true })
                .order('news_date', { ascending: false });

            if (error) throw error;

            allNews = data || [];
            updateStats();
            renderNews();

        } catch (err) {
            console.error('❌ Load error:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-circle me-2"></i> ${escapeHtml(err.message)}
            </td></tr>`;
        }
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        document.getElementById('totalNews').textContent = allNews.length;
        animateNumber('statTotal', allNews.length);
        animateNumber('statPublished', allNews.filter(n => n.is_published).length);
        animateNumber('statDraft', allNews.filter(n => !n.is_published).length);
        animateNumber('statFeatured', allNews.filter(n => n.is_featured).length);
    }

    function animateNumber(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = target;
    }

    // =========================================================
    // RENDER NEWS
    // =========================================================
    function renderNews() {
        const tbody = document.getElementById('newsTableBody');

        let filtered = allNews.filter(n => {
            if (currentFilter === 'published' && !n.is_published) return false;
            if (currentFilter === 'draft' && n.is_published) return false;
            if (currentFilter === 'featured' && !n.is_featured) return false;

            if (searchQuery) {
                const text = (n.title + ' ' + (n.description || '') + ' ' + (n.category || '')).toLowerCase();
                if (!text.includes(searchQuery)) return false;
            }
            return true;
        });

        document.getElementById('filteredCount').textContent = filtered.length;

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-newspaper"></i></div>
                    <h6>No news found</h6>
                    <p>Click "Add New" to create one</p>
                </div>
            </td></tr>`;
            return;
        }

        let html = '';
        filtered.forEach((n, i) => {
            const date = n.news_date ? new Date(n.news_date).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            }) : '—';

            const imgHtml = n.image_url
                ? `<img src="${escapeHtml(n.image_url)}" class="news-thumb" onerror="this.style.display='none'">`
                : `<div class="news-thumb-placeholder"><i class="fas fa-image"></i></div>`;

            const statusHtml = n.is_published
                ? `<span class="badge-status badge-published"><i class="fas fa-check-circle"></i> Published</span>`
                : `<span class="badge-status badge-draft"><i class="fas fa-pencil"></i> Draft</span>`;

            const featuredHtml = n.is_featured
                ? `<span class="badge-status badge-featured ms-1"><i class="fas fa-star"></i> Featured</span>` : '';

            const catHtml = n.category
                ? `<span class="badge-cat ms-1">${escapeHtml(n.category)}</span>` : '';

            const starClass = n.is_featured ? 'btn-star active' : 'btn-star';

            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${imgHtml}</td>
                    <td>
                        <div class="news-title">${escapeHtml(n.title || 'Untitled')}</div>
                        <div class="news-desc">${escapeHtml((n.description || '').substring(0, 60))}${(n.description || '').length > 60 ? '...' : ''}</div>
                        <div class="mt-1">${catHtml}${featuredHtml}</div>
                    </td>
                    <td>${date}</td>
                    <td>${statusHtml}</td>
                    <td>
                        <button class="btn-action ${starClass}" onclick="window.toggleFeatured('${n.id}')" title="Toggle Featured">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="window.editNews('${n.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="window.deleteNews('${n.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // =========================================================
    // SHOW ADD FORM
    // =========================================================
    window.showAddForm = function () {
        editingId = null;
        selectedImageFile = null;
        document.getElementById('newsId').value = '';
        document.getElementById('formTitle').textContent = 'Add New News';
        document.getElementById('submitBtnText').textContent = 'Save News';
        document.getElementById('newsForm').reset();
        document.getElementById('existingImageUrl').value = '';
        document.getElementById('imagePreview').classList.remove('show');
        document.getElementById('imageInput').value = '';
        document.getElementById('isPublished').checked = true;
        document.getElementById('isFeatured').checked = false;
        document.getElementById('displayOrder').value = 0;

        const card = document.getElementById('newsFormCard');
        card.classList.add('show');
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    // =========================================================
    // EDIT NEWS
    // =========================================================
    window.editNews = async function (id) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('news').select('*').eq('id', id).single();
            if (error) throw error;

            editingId = id;
            selectedImageFile = null;

            document.getElementById('newsId').value = data.id;
            document.getElementById('title').value = data.title || '';
            document.getElementById('description').value = data.description || '';
            document.getElementById('newsDate').value = data.news_date || '';
            document.getElementById('category').value = data.category || 'news';
            document.getElementById('externalLink').value = data.external_link || '';
            document.getElementById('displayOrder').value = data.display_order || 0;
            document.getElementById('isPublished').checked = !!data.is_published;
            document.getElementById('isFeatured').checked = !!data.is_featured;
            document.getElementById('existingImageUrl').value = data.image_url || '';

            if (data.image_url) {
                document.getElementById('previewImg').src = data.image_url;
                document.getElementById('imagePreview').classList.add('show');
            } else {
                document.getElementById('imagePreview').classList.remove('show');
            }

            document.getElementById('imageInput').value = '';
            document.getElementById('formTitle').textContent = 'Edit News';
            document.getElementById('submitBtnText').textContent = 'Update News';

            const card = document.getElementById('newsFormCard');
            card.classList.add('show');
            setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

        } catch (e) {
            console.error('Edit error:', e);
            showToast('Failed to load: ' + e.message, 'error');
        }
    };

    // =========================================================
    // DELETE NEWS
    // =========================================================
    window.deleteNews = async function (id) {
        const item = allNews.find(n => n.id === id);
        if (!item) return;

        const ok = await showConfirm({
            title: 'Delete News?',
            message: `"${item.title}" স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি undo করা যাবে না।`
        });
        if (!ok) return;

        try {
            const { error } = await window.FDC_SUPABASE.from('news').delete().eq('id', id);
            if (error) throw error;
            showToast('News deleted!', 'success');
            await loadAllNews();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        }
    };

    // =========================================================
    // TOGGLE FEATURED
    // =========================================================
    window.toggleFeatured = async function (id) {
        const item = allNews.find(n => n.id === id);
        if (!item) return;
        const newState = !item.is_featured;
        try {
            const { error } = await window.FDC_SUPABASE
                .from('news').update({ is_featured: newState }).eq('id', id);
            if (error) throw error;
            item.is_featured = newState;
            showToast(newState ? '⭐ Marked as Featured' : 'Removed from Featured', 'success');
            updateStats();
            renderNews();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        }
    };

    // =========================================================
    // FORM SUBMIT
    // =========================================================
    document.getElementById('newsForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const id = document.getElementById('newsId').value;
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const news_date = document.getElementById('newsDate').value;
        const category = document.getElementById('category').value;
        const external_link = document.getElementById('externalLink').value.trim();
        const display_order = parseInt(document.getElementById('displayOrder').value) || 0;
        const is_published = document.getElementById('isPublished').checked;
        const is_featured = document.getElementById('isFeatured').checked;
        const existingImageUrl = document.getElementById('existingImageUrl').value;

        if (!title) {
            showToast('Title required', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const submitBtnText = document.getElementById('submitBtnText');
        const originalText = submitBtnText.textContent;
        submitBtn.disabled = true;
        submitBtnText.textContent = 'Saving...';

        try {
            let image_url = existingImageUrl;

            if (selectedImageFile) {
                if (typeof window.FDCUploadImage !== 'function') {
                    throw new Error('Upload function not available');
                }
                submitBtnText.textContent = 'Uploading...';
                const result = await window.FDCUploadImage(selectedImageFile);
                image_url = result.url || result.secure_url;
                showToast('Image uploaded', 'success');
            }

            const newsData = {
                title,
                description: description || null,
                image_url: image_url || null,
                category: category || 'news',
                news_date: news_date || new Date().toISOString().split('T')[0],
                external_link: external_link || null,
                display_order,
                is_published,
                is_featured,
                updated_at: new Date().toISOString()
            };

            let result;
            if (id) {
                result = await window.FDC_SUPABASE.from('news').update(newsData).eq('id', id).select();
                showToast('News updated!', 'success');
            } else {
                result = await window.FDC_SUPABASE.from('news').insert([newsData]).select();
                showToast('News created!', 'success');
            }

            if (result.error) throw result.error;

            document.getElementById('newsFormCard').classList.remove('show');
            document.getElementById('newsForm').reset();
            document.getElementById('imagePreview').classList.remove('show');
            selectedImageFile = null;
            await loadAllNews();

        } catch (err) {
            console.error('Save error:', err);
            showToast('Failed: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtnText.textContent = originalText;
        }
    });

    // =========================================================
    // CANCEL FORM
    // =========================================================
    document.getElementById('cancelForm')?.addEventListener('click', function () {
        document.getElementById('newsFormCard').classList.remove('show');
        document.getElementById('newsForm').reset();
        document.getElementById('imagePreview').classList.remove('show');
        selectedImageFile = null;
    });

    document.getElementById('showAddForm')?.addEventListener('click', window.showAddForm);

    // =========================================================
    // FILTER + SEARCH
    // =========================================================
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderNews();
        });
    });

    document.getElementById('searchInput')?.addEventListener('input', function () {
        searchQuery = this.value.toLowerCase().trim();
        renderNews();
    });

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin News initialized');

        setupImageUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllNews();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ admin-news.js loaded');

})();