/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN BNCC MANAGEMENT
 * Location: js/admin-bncc.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allMembers = [];
    let editingId = null;
    let selectedImageFile = null;
    let currentFilter = 'all';
    let searchQuery = '';

    // DOM
    let grid = null;
    let memberForm = null;
    let memberFormCard = null;

    // =========================================================
    // HELPERS
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function showToast(msg, type) {
        type = type || 'success';
        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            document.body.appendChild(c);
        }
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const t = document.createElement('div');
        t.className = 'toast-msg toast-' + type;
        t.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i> <span>' + msg + '</span>';
        c.appendChild(t);
        setTimeout(function () {
            t.style.animation = 'slideOut 0.35s ease';
            setTimeout(function () { t.remove(); }, 350);
        }, 3500);
    }

    // =========================================================
    // SMART MODAL
    // =========================================================
    let modalResolver = null;
    function showConfirm(title, message) {
        return new Promise(function (resolve) {
            modalResolver = resolve;
            const t = document.getElementById('smartModalTitle');
            const m = document.getElementById('smartModalText');
            if (t) t.textContent = title;
            if (m) m.textContent = message;
            const modal = document.getElementById('smartModal');
            if (modal) modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }
    function closeConfirm(result) {
        const modal = document.getElementById('smartModal');
        if (modal) modal.classList.remove('show');
        document.body.style.overflow = '';
        if (modalResolver) { modalResolver(result); modalResolver = null; }
    }

    function bindModalEvents() {
        const confirmBtn = document.getElementById('smartModalConfirm');
        const cancelBtn = document.getElementById('smartModalCancel');
        const modal = document.getElementById('smartModal');

        if (confirmBtn) confirmBtn.addEventListener('click', function () { closeConfirm(true); });
        if (cancelBtn) cancelBtn.addEventListener('click', function () { closeConfirm(false); });
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target.id === 'smartModal') closeConfirm(false);
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
                closeConfirm(false);
            }
        });
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
                    avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = async function () {
        const ok = await showConfirm('Logout', 'আপনি কি লগআউট করতে চান?');
        if (!ok) return;
        try {
            await window.FDCAuth.logout();
            window.location.replace('admin-login.html');
        } catch (e) { console.error(e); }
    };

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) { clearInterval(i); showToast('Connection timeout', 'error'); }
        }, 500);
    }

    // =========================================================
    // IMAGE UPLOAD
    // =========================================================
    function setupImageUpload() {
        const dropArea = document.getElementById('imageDropArea');
        const fileInput = document.getElementById('imageInput');
        const preview = document.getElementById('imagePreview');
        const removeBtn = document.getElementById('removeImage');

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
        reader.onload = function (e) {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('imagePreview').classList.add('show');
        };
        reader.readAsDataURL(file);
        showToast('Image selected', 'success');
    }

    // =========================================================
    // LOAD ALL MEMBERS
    // =========================================================
    async function loadAllMembers() {
        try {
            if (!window.FDC_SUPABASE_READY) {
                await new Promise(function (r) {
                    if (window.FDC_SUPABASE_READY) return r();
                    document.addEventListener('fdc:supabase-ready', r, { once: true });
                    setTimeout(r, 10000);
                });
            }

            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase
                .from('bncc_members')
                .select('*')
                .order('member_type', { ascending: true })
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;

            allMembers = data || [];
            console.log('✅ Loaded members:', allMembers.length);

            updateStats();
            renderPiOfficer();
            renderMembers();

        } catch (err) {
            console.error('❌ Load error:', err);
            if (grid) {
                grid.innerHTML = '<div class="empty-state"><div class="icon-wrap"><i class="fas fa-exclamation-circle"></i></div><h6>Failed to load</h6><p>' + escapeHtml(err.message) + '</p></div>';
            }
        }
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        const total = allMembers.length;
        const officer = allMembers.filter(function (m) { return m.member_type === 'officer'; }).length;
        const members = allMembers.filter(function (m) { return m.member_type !== 'officer'; }).length;
        const active = allMembers.filter(function (m) { return m.is_active; }).length;

        const totalEl = document.getElementById('totalMembers');
        const totalStatEl = document.getElementById('statTotal');
        const officerEl = document.getElementById('statOfficer');
        const membersEl = document.getElementById('statMembers');
        const activeEl = document.getElementById('statActive');

        if (totalEl) totalEl.textContent = total;
        if (totalStatEl) totalStatEl.textContent = total;
        if (officerEl) officerEl.textContent = officer;
        if (membersEl) membersEl.textContent = members;
        if (activeEl) activeEl.textContent = active;
    }

    // =========================================================
    // RENDER PI OFFICER
    // =========================================================
    function renderPiOfficer() {
        const card = document.getElementById('piOfficerCard');
        if (!card) return;

        const officer = allMembers.find(function (m) { return m.member_type === 'officer'; });

        if (!officer) {
            card.innerHTML = '<div class="pi-empty">' +
                '<i class="fas fa-user-tie"></i>' +
                '<p>PI Officer যোগ করা হয়নি</p>' +
                '<button class="btn-pi-add" onclick="window.showAddOfficer()">' +
                    '<i class="fas fa-plus"></i> Add PI Officer' +
                '</button>' +
            '</div>';
            return;
        }

        const img = officer.image_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f8f9fc%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%230a1655%22 font-size=%2240%22 text-anchor=%22middle%22 dy=%22.35em%22%3E%F0%9F%91%A4%3C/text%3E%3C/svg%3E';

        let contact = '';
        if (officer.phone) {
            contact += '<span><i class="fas fa-phone"></i> ' + escapeHtml(officer.phone) + '</span>';
        }

        card.innerHTML =
            '<span class="pi-badge">⭐ PI Officer</span>' +
            '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(officer.name) + '" class="pi-img" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f8f9fc%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E\'">' +
            '<div class="pi-info">' +
                '<span class="pi-designation">' + escapeHtml(officer.designation || 'PI Officer') + '</span>' +
                '<h3>' + escapeHtml(officer.name) + '</h3>' +
                (officer.name_en ? '<div class="pi-name-en">' + escapeHtml(officer.name_en) + '</div>' : '') +
                (contact ? '<div class="pi-contact">' + contact + '</div>' : '') +
            '</div>' +
            '<div class="pi-actions">' +
                '<button class="pi-btn" onclick="window.editMember(\'' + officer.id + '\')" title="Edit">' +
                    '<i class="fas fa-edit"></i>' +
                '</button>' +
                '<button class="pi-btn" onclick="window.deleteMember(\'' + officer.id + '\')" title="Delete">' +
                    '<i class="fas fa-trash"></i>' +
                '</button>' +
            '</div>';
    }

    // =========================================================
    // RENDER MEMBERS GRID
    // =========================================================
    function renderMembers() {
        if (!grid) return;

        let filtered = allMembers.filter(function (m) {
            if (currentFilter === 'officer' && m.member_type !== 'officer') return false;
            if (currentFilter === 'member' && m.member_type === 'officer') return false;
            if (currentFilter === 'inactive' && m.is_active) return false;

            if (searchQuery) {
                const text = (m.name + ' ' + (m.name_en || '') + ' ' + (m.designation || '')).toLowerCase();
                if (!text.includes(searchQuery)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="empty-state">' +
                '<div class="icon-wrap"><i class="fas fa-users"></i></div>' +
                '<h6>কোনো সদস্য নেই</h6>' +
                '<p>Click "Add New Member" to create one</p>' +
            '</div>';
            return;
        }

        let html = '';
        filtered.forEach(function (m) {
            const img = m.image_url
                ? '<img src="' + escapeHtml(m.image_url) + '" alt="' + escapeHtml(m.name) + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">'
                : '';
            const placeholder = '<div class="mc-placeholder" style="display:' + (m.image_url ? 'none' : 'flex') + ';"><i class="fas fa-user"></i></div>';

            const statusBadge = m.is_active
                ? '<span class="mc-status active">Active</span>'
                : '<span class="mc-status inactive">Inactive</span>';

            const officerBadge = m.member_type === 'officer'
                ? '<span class="mc-badge-officer">Officer</span>'
                : '';

            const phoneHtml = m.phone
                ? '<div class="mc-phone"><i class="fas fa-phone"></i> ' + escapeHtml(m.phone) + '</div>'
                : '';

            html += '<div class="member-card">' +
                officerBadge +
                statusBadge +
                '<div class="mc-img-wrap">' +
                    img + placeholder +
                '</div>' +
                '<div class="mc-body">' +
                    '<h4>' + escapeHtml(m.name) + '</h4>' +
                    '<div class="mc-designation">' + escapeHtml(m.designation || 'Member') + '</div>' +
                    phoneHtml +
                '</div>' +
                '<div class="mc-actions">' +
                    '<button class="btn-action btn-toggle" onclick="window.toggleActive(\'' + m.id + '\')" title="Toggle Status">' +
                        '<i class="fas fa-' + (m.is_active ? 'eye-slash' : 'eye') + '"></i>' +
                    '</button>' +
                    '<button class="btn-action btn-edit" onclick="window.editMember(\'' + m.id + '\')" title="Edit">' +
                        '<i class="fas fa-edit"></i>' +
                    '</button>' +
                    '<button class="btn-action btn-delete" onclick="window.deleteMember(\'' + m.id + '\')" title="Delete">' +
                        '<i class="fas fa-trash"></i>' +
                    '</button>' +
                '</div>' +
            '</div>';
        });
        grid.innerHTML = html;
    }

    // =========================================================
    // SHOW ADD FORM
    // =========================================================
    function showAddForm(presetType) {
        editingId = null;
        selectedImageFile = null;

        document.getElementById('memberId').value = '';
        document.getElementById('formTitle').textContent = 'Add New Member';
        document.getElementById('submitBtnText').textContent = 'Save Member';
        document.getElementById('memberForm').reset();
        document.getElementById('existingImageUrl').value = '';
        document.getElementById('imagePreview').classList.remove('show');
        document.getElementById('imageInput').value = '';
        document.getElementById('isActive').checked = true;
        document.getElementById('displayOrder').value = 0;

        if (presetType === 'officer') {
            document.getElementById('memberType').value = 'officer';
            document.getElementById('designation').value = 'PI Officer';
        } else {
            document.getElementById('memberType').value = 'member';
        }

        if (memberFormCard) {
            memberFormCard.classList.add('show');
            setTimeout(function () {
                memberFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    window.showAddOfficer = function () {
        const existing = allMembers.find(function (m) { return m.member_type === 'officer'; });
        if (existing) {
            showToast('PI Officer already exists. Edit the existing one.', 'error');
            return;
        }
        showAddForm('officer');
    };

    // =========================================================
    // EDIT MEMBER
    // =========================================================
    window.editMember = async function (id) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('bncc_members').select('*').eq('id', id).single();
            if (error) throw error;

            editingId = id;
            selectedImageFile = null;

            document.getElementById('memberId').value = data.id;
            document.getElementById('name').value = data.name || '';
            document.getElementById('nameEn').value = data.name_en || '';
            document.getElementById('designation').value = data.designation || '';
            document.getElementById('memberType').value = data.member_type || 'member';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('bio').value = data.bio || '';
            document.getElementById('displayOrder').value = data.display_order || 0;
            document.getElementById('isActive').checked = !!data.is_active;
            document.getElementById('existingImageUrl').value = data.image_url || '';

            if (data.image_url) {
                document.getElementById('previewImg').src = data.image_url;
                document.getElementById('imagePreview').classList.add('show');
            } else {
                document.getElementById('imagePreview').classList.remove('show');
            }

            document.getElementById('imageInput').value = '';
            document.getElementById('formTitle').textContent = 'Edit Member';
            document.getElementById('submitBtnText').textContent = 'Update Member';

            if (memberFormCard) {
                memberFormCard.classList.add('show');
                setTimeout(function () {
                    memberFormCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

        } catch (e) {
            console.error('Edit error:', e);
            showToast('Failed to load: ' + e.message, 'error');
        }
    };

    // =========================================================
    // DELETE MEMBER
    // =========================================================
    window.deleteMember = async function (id) {
        const item = allMembers.find(function (m) { return m.id === id; });
        if (!item) return;

        const ok = await showConfirm('Delete Member?', '"' + item.name + '" কে স্থায়ীভাবে মুছে ফেলা হবে।');
        if (!ok) return;

        try {
            const { error } = await window.FDC_SUPABASE.from('bncc_members').delete().eq('id', id);
            if (error) throw error;
            showToast('Member deleted!', 'success');
            await loadAllMembers();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        }
    };

    // =========================================================
    // TOGGLE ACTIVE
    // =========================================================
    window.toggleActive = async function (id) {
        const item = allMembers.find(function (m) { return m.id === id; });
        if (!item) return;

        const newState = !item.is_active;
        try {
            const { error } = await window.FDC_SUPABASE
                .from('bncc_members')
                .update({ is_active: newState, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            item.is_active = newState;
            showToast(newState ? '✅ Active করা হয়েছে' : '⚠️ Deactivate করা হয়েছে', 'success');
            updateStats();
            renderMembers();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        }
    };

    // =========================================================
    // FORM SUBMIT
    // =========================================================
    function bindFormSubmit() {
        if (!memberForm) return;

        memberForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const id = document.getElementById('memberId').value;
            const name = document.getElementById('name').value.trim();
            const name_en = document.getElementById('nameEn').value.trim();
            const designation = document.getElementById('designation').value.trim();
            const member_type = document.getElementById('memberType').value;
            const phone = document.getElementById('phone').value.trim();
            const bio = document.getElementById('bio').value.trim();
            const display_order = parseInt(document.getElementById('displayOrder').value) || 0;
            const is_active = document.getElementById('isActive').checked;
            const existingImageUrl = document.getElementById('existingImageUrl').value;

            if (!name) { showToast('Name required', 'error'); return; }
            if (!designation) { showToast('Designation required', 'error'); return; }

            if (member_type === 'officer') {
                const existingOfficer = allMembers.find(function (m) {
                    return m.member_type === 'officer' && m.id !== id;
                });
                if (existingOfficer) {
                    showToast('PI Officer already exists. Only one allowed.', 'error');
                    return;
                }
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

                const memberData = {
                    name: name,
                    name_en: name_en || null,
                    designation: designation,
                    image_url: image_url || null,
                    member_type: member_type,
                    phone: phone || null,
                    bio: bio || null,
                    display_order: display_order,
                    is_active: is_active,
                    updated_at: new Date().toISOString()
                };

                let result;
                if (id) {
                    result = await window.FDC_SUPABASE.from('bncc_members').update(memberData).eq('id', id).select();
                    showToast('Member updated!', 'success');
                } else {
                    result = await window.FDC_SUPABASE.from('bncc_members').insert([memberData]).select();
                    showToast('Member created!', 'success');
                }

                if (result.error) throw result.error;

                document.getElementById('memberFormCard').classList.remove('show');
                document.getElementById('memberForm').reset();
                document.getElementById('imagePreview').classList.remove('show');
                selectedImageFile = null;
                await loadAllMembers();

            } catch (err) {
                console.error('Save error:', err);
                showToast('Failed: ' + err.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtnText.textContent = originalText;
            }
        });
    }

    // =========================================================
    // BIND EVENTS
    // =========================================================
    function bindEvents() {
        // Cancel form
        const cancelBtn = document.getElementById('cancelForm');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                document.getElementById('memberFormCard').classList.remove('show');
                document.getElementById('memberForm').reset();
                document.getElementById('imagePreview').classList.remove('show');
                selectedImageFile = null;
            });
        }

        // Show add form
        const showAddBtn = document.getElementById('showAddForm');
        if (showAddBtn) {
            showAddBtn.addEventListener('click', function () {
                showAddForm();
            });
        }

        // Filter chips
        document.querySelectorAll('.filter-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                document.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('active'); });
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderMembers();
            });
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                searchQuery = this.value.toLowerCase().trim();
                renderMembers();
            });
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function cacheDom() {
        grid = document.getElementById('membersGrid');
        memberForm = document.getElementById('memberForm');
        memberFormCard = document.getElementById('memberFormCard');
    }

    function init() {
        console.log('🚀 Admin BNCC initialized');

        cacheDom();
        bindModalEvents();
        bindFormSubmit();
        bindEvents();
        setupImageUpload();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;
            await loadAdminInfo();
            await loadAllMembers();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ admin-bncc.js loaded');

})();