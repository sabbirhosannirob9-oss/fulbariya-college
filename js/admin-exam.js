/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN EXAM MANAGEMENT
 * Location: js/admin-exam.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js, admin-popup.js
 * Features: Countdown + Routine + Notice (Tabbed)
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let countdownList = [];
    let routineList = [];
    let noticeList = [];
    let editingCountdownId = null;
    let editingRoutineId = null;
    let editingNoticeId = null;
    let selectedRoutineFile = null;
    let selectedNoticeFile = null;

    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 40) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // TABS
    // =========================================================
    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                $('tab-' + tab).classList.add('active');
                window.history.replaceState(null, '', '#' + tab);
            });
        });

        const hash = window.location.hash.substring(1);
        if (['countdown', 'routine', 'notice'].includes(hash)) {
            const btn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
            if (btn) btn.click();
        }
    }

    // =========================================================
    // MODAL HELPERS
    // =========================================================
    window.openModal = function (id) {
        const el = $(id);
        if (el) el.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function (id) {
        const el = $(id);
        if (el) el.classList.remove('show');
        document.body.style.overflow = '';
    };

    // Backdrop click
    document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });

    // =========================================================
    // ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const r = await window.FDCAuth.getCurrentAdmin();
            if (r && r.admin) {
                const av = document.querySelector('[data-admin-avatar]');
                if (av) {
                    if (r.admin.image_url) av.innerHTML = `<img src="${r.admin.image_url}" alt="A">`;
                    else av.textContent = (r.admin.name || 'A').charAt(0).toUpperCase();
                }
            }
        } catch (e) { console.warn(e); }
    }

    window.handleLogout = function () {
        window.fdcConfirm('লগআউট করবেন?', async function () {
            try { if (window.FDCAuth) await window.FDCAuth.logout(); } catch (e) {}
            sessionStorage.clear();
            window.location.replace('admin-login.html');
        }, { title: 'Logout', confirmText: 'Yes', confirmType: 'danger' });
    };

    // =========================================================
    // COUNTDOWN
    // =========================================================
    async function loadCountdowns() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_countdown')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            countdownList = data || [];
            renderCountdowns();
        } catch (e) {
            console.error(e);
            $('countdownList').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h6>লোড হয়নি</h6><p>${escapeHtml(e.message)}</p></div>`;
        }
    }

    function renderCountdowns() {
        const list = $('countdownList');
        if (countdownList.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="icon-wrap"><i class="fas fa-hourglass-half"></i></div><h6>কোনো কাউন্টডাউন নেই</h6><p>নতুন যোগ করুন</p></div>`;
            return;
        }
        list.innerHTML = countdownList.map(c => {
            const cls = c.exam_name === 'HSC' ? 'exam-hsc' : c.exam_name === 'Honours' ? 'exam-honours' : 'exam-degree';
            const icon = c.exam_name === 'HSC' ? 'fa-graduation-cap' : c.exam_name === 'Honours' ? 'fa-award' : 'fa-user-graduate';
            return `<div class="list-card ${cls}">
                <div class="lc-icon ${cls}"><i class="fas ${icon}"></i></div>
                <div class="lc-info">
                    <div class="lc-title">
                        ${escapeHtml(c.exam_title)}
                        <span class="lc-badge ${c.exam_name.toLowerCase()}">${escapeHtml(c.exam_name)}</span>
                        <span class="lc-badge ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="lc-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(c.exam_date)}</span>
                        <span><i class="fas fa-sort"></i> Order: ${c.display_order}</span>
                    </div>
                </div>
                <div class="lc-actions">
                    <button class="lc-btn edit" onclick="editCountdown('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="lc-btn delete" onclick="deleteCountdown('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    $('btnAddCountdown').addEventListener('click', function () {
        editingCountdownId = null;
        $('cdModalTitle').textContent = 'নতুন কাউন্টডাউন';
        $('cdModalSub').textContent = 'পরীক্ষার তথ্য দিন';
        $('cdEditId').value = '';
        $('cdExamName').value = '';
        $('cdTitle').value = '';
        $('cdDate').value = '';
        $('cdOrder').value = 0;
        $('cdActive').checked = true;
        window.openModal('countdownModal');
    });

    window.editCountdown = function (id) {
        const c = countdownList.find(x => x.id === id);
        if (!c) return;
        editingCountdownId = id;
        $('cdModalTitle').textContent = 'এডিট করুন';
        $('cdModalSub').textContent = c.exam_title;
        $('cdEditId').value = id;
        $('cdExamName').value = c.exam_name;
        $('cdTitle').value = c.exam_title;
        $('cdDate').value = c.exam_date;
        $('cdOrder').value = c.display_order;
        $('cdActive').checked = c.is_active;
        window.openModal('countdownModal');
    };

    $('cdSaveBtn').addEventListener('click', async function () {
        const exam_name = $('cdExamName').value;
        const exam_title = $('cdTitle').value.trim();
        const exam_date = $('cdDate').value;
        if (!exam_name || !exam_title || !exam_date) {
            return window.fdcWarning('সব তথ্য দিন');
        }
        const payload = {
            exam_name, exam_title, exam_date,
            display_order: parseInt($('cdOrder').value) || 0,
            is_active: $('cdActive').checked
        };
        this.disabled = true;
        const orig = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            let res;
            if (editingCountdownId) {
                res = await window.FDC_SUPABASE.from('exam_countdown').update(payload).eq('id', editingCountdownId);
            } else {
                res = await window.FDC_SUPABASE.from('exam_countdown').insert([payload]);
            }
            if (res.error) throw res.error;
            window.fdcSuccess(editingCountdownId ? 'আপডেট হয়েছে' : 'যোগ হয়েছে');
            window.closeModal('countdownModal');
            await loadCountdowns();
        } catch (e) {
            window.fdcError('সমস্যা: ' + e.message);
        } finally {
            this.disabled = false;
            this.innerHTML = orig;
        }
    });

    window.deleteCountdown = function (id) {
        const c = countdownList.find(x => x.id === id);
        if (!c) return;
        window.fdcConfirm(`"${c.exam_title}" মুছবেন?`, async function () {
            try {
                const { error } = await window.FDC_SUPABASE.from('exam_countdown').delete().eq('id', id);
                if (error) throw error;
                window.fdcSuccess('মুছে ফেলা হয়েছে');
                await loadCountdowns();
            } catch (e) { window.fdcError('সমস্যা: ' + e.message); }
        }, { confirmText: 'Yes, Delete', confirmType: 'danger' });
    };

    // =========================================================
    // ROUTINE
    // =========================================================
    async function loadRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_routine')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            routineList = data || [];
            applyRoutineFilter();
        } catch (e) {
            console.error(e);
            $('routineList').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h6>লোড হয়নি</h6><p>${escapeHtml(e.message)}</p></div>`;
        }
    }

    function applyRoutineFilter() {
        const f = $('rtFilterExam').value;
        const filtered = f ? routineList.filter(r => r.exam_name === f) : routineList;
        renderRoutines(filtered);
    }

    function renderRoutines(items) {
        const list = $('routineList');
        if (items.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="icon-wrap"><i class="fas fa-calendar-alt"></i></div><h6>কোনো রুটিন নেই</h6><p>নতুন রুটিন যোগ করুন</p></div>`;
            return;
        }
        list.innerHTML = items.map(r => {
            const cls = r.exam_name.startsWith('HSC') ? 'exam-hsc' : r.exam_name.startsWith('Honours') ? 'exam-honours' : 'exam-degree';
            return `<div class="list-card ${cls}">
                <div class="lc-icon ${cls}"><i class="fas fa-calendar-alt"></i></div>
                <div class="lc-info">
                    <div class="lc-title">
                        ${escapeHtml(r.exam_name)}
                        <span class="lc-badge ${r.is_active ? 'active' : 'inactive'}">${r.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="lc-meta">
                        ${r.description ? `<span><i class="fas fa-info-circle"></i> ${escapeHtml(r.description)}</span>` : ''}
                    </div>
                </div>
                <div class="lc-actions">
                    <button class="lc-btn view" onclick="window.open('${escapeHtml(r.routine_image)}','_blank')"><i class="fas fa-eye"></i></button>
                    <button class="lc-btn edit" onclick="editRoutine('${r.id}')"><i class="fas fa-edit"></i></button>
                    <button class="lc-btn delete" onclick="deleteRoutine('${r.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    $('rtFilterExam').addEventListener('change', applyRoutineFilter);

    $('btnAddRoutine').addEventListener('click', function () {
        editingRoutineId = null;
        selectedRoutineFile = null;
        $('rtModalTitle').textContent = 'নতুন রুটিন';
        $('rtModalSub').textContent = 'রুটিনের ছবি আপলোড করুন';
        $('rtEditId').value = '';
        $('rtExistingImage').value = '';
        $('rtExamName').value = '';
        $('rtDescription').value = '';
        $('rtOrder').value = 0;
        $('rtActive').checked = true;
        $('rtImagePreview').classList.remove('show');
        $('rtImageInput').value = '';
        window.openModal('routineModal');
    });

    window.editRoutine = function (id) {
        const r = routineList.find(x => x.id === id);
        if (!r) return;
        editingRoutineId = id;
        selectedRoutineFile = null;
        $('rtModalTitle').textContent = 'এডিট করুন';
        $('rtModalSub').textContent = r.exam_name;
        $('rtEditId').value = id;
        $('rtExistingImage').value = r.routine_image;
        $('rtExamName').value = r.exam_name;
        $('rtDescription').value = r.description || '';
        $('rtOrder').value = r.display_order;
        $('rtActive').checked = r.is_active;
        $('rtPreviewImg').src = r.routine_image;
        $('rtImagePreview').classList.add('show');
        window.openModal('routineModal');
    };

    $('rtImageInput').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const f = this.files[0];
            if (f.size > 5 * 1024 * 1024) return window.fdcWarning('Max 5MB');
            if (!f.type.startsWith('image/')) return window.fdcWarning('Only images');
            selectedRoutineFile = f;
            const reader = new FileReader();
            reader.onload = e => {
                $('rtPreviewImg').src = e.target.result;
                $('rtImagePreview').classList.add('show');
            };
            reader.readAsDataURL(f);
        }
    });

    $('rtRemoveImage').addEventListener('click', function () {
        selectedRoutineFile = null;
        $('rtImageInput').value = '';
        $('rtImagePreview').classList.remove('show');
        $('rtExistingImage').value = '';
    });

    $('rtSaveBtn').addEventListener('click', async function () {
        const exam_name = $('rtExamName').value;
        const existing = $('rtExistingImage').value;
        if (!exam_name) return window.fdcWarning('পরীক্ষা সিলেক্ট করুন');
        if (!selectedRoutineFile && !existing) return window.fdcWarning('ছবি আপলোড করুন');
        this.disabled = true;
        const orig = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            let imageUrl = existing;
            if (selectedRoutineFile) {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                const up = await window.FDCUploadImage(selectedRoutineFile);
                imageUrl = up.url || up.secure_url;
            }
            const payload = {
                exam_name,
                routine_image: imageUrl,
                description: $('rtDescription').value.trim() || null,
                display_order: parseInt($('rtOrder').value) || 0,
                is_active: $('rtActive').checked
            };
            let res;
            if (editingRoutineId) {
                res = await window.FDC_SUPABASE.from('exam_routine').update(payload).eq('id', editingRoutineId);
            } else {
                res = await window.FDC_SUPABASE.from('exam_routine').insert([payload]);
            }
            if (res.error) throw res.error;
            window.fdcSuccess(editingRoutineId ? 'আপডেট হয়েছে' : 'যোগ হয়েছে');
            window.closeModal('routineModal');
            await loadRoutines();
        } catch (e) {
            window.fdcError('সমস্যা: ' + e.message);
        } finally {
            this.disabled = false;
            this.innerHTML = orig;
        }
    });

    window.deleteRoutine = function (id) {
        const r = routineList.find(x => x.id === id);
        if (!r) return;
        window.fdcConfirm(`"${r.exam_name}" রুটিন মুছবেন?`, async function () {
            try {
                const { error } = await window.FDC_SUPABASE.from('exam_routine').delete().eq('id', id);
                if (error) throw error;
                window.fdcSuccess('মুছে ফেলা হয়েছে');
                await loadRoutines();
            } catch (e) { window.fdcError('সমস্যা: ' + e.message); }
        }, { confirmText: 'Yes, Delete', confirmType: 'danger' });
    };

    // =========================================================
    // NOTICE
    // =========================================================
    async function loadNotices() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_notice')
                .select('*')
                .order('notice_date', { ascending: false })
                .order('display_order', { ascending: true });
            if (error) throw error;
            noticeList = data || [];
            applyNoticeFilter();
        } catch (e) {
            console.error(e);
            $('noticeList').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h6>লোড হয়নি</h6><p>${escapeHtml(e.message)}</p></div>`;
        }
    }

    function applyNoticeFilter() {
        const cat = $('ntFilterCategory').value;
        const st = $('ntFilterStatus').value;
        let items = noticeList;
        if (cat) items = items.filter(n => n.exam_category === cat);
        if (st === 'published') items = items.filter(n => n.is_published);
        if (st === 'draft') items = items.filter(n => !n.is_published);
        renderNotices(items);
    }

    function renderNotices(items) {
        const list = $('noticeList');
        if (items.length === 0) {
            list.innerHTML = `<div class="empty-state"><div class="icon-wrap"><i class="fas fa-bullhorn"></i></div><h6>কোনো নোটিশ নেই</h6><p>নতুন নোটিশ যোগ করুন</p></div>`;
            return;
        }
        list.innerHTML = items.map(n => {
            const cls = n.exam_category === 'HSC' ? 'exam-hsc' : n.exam_category === 'Honours' ? 'exam-honours' : 'exam-degree';
            return `<div class="list-card ${cls}">
                <div class="lc-icon ${cls}"><i class="fas fa-bullhorn"></i></div>
                <div class="lc-info">
                    <div class="lc-title">
                        ${escapeHtml(n.title)}
                        <span class="lc-badge ${n.exam_category.toLowerCase()}">${escapeHtml(n.exam_category)}</span>
                        <span class="lc-badge ${n.is_published ? 'published' : 'draft'}">${n.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                    <div class="lc-meta">
                        <span><i class="fas fa-calendar"></i> ${formatDate(n.notice_date)}</span>
                        ${n.file_url ? '<span><i class="fas fa-file"></i> File attached</span>' : ''}
                    </div>
                </div>
                <div class="lc-actions">
                    ${n.file_url ? `<button class="lc-btn view" onclick="window.open('${escapeHtml(n.file_url)}','_blank')"><i class="fas fa-eye"></i></button>` : ''}
                    <button class="lc-btn edit" onclick="editNotice('${n.id}')"><i class="fas fa-edit"></i></button>
                    <button class="lc-btn delete" onclick="deleteNotice('${n.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    $('ntFilterCategory').addEventListener('change', applyNoticeFilter);
    $('ntFilterStatus').addEventListener('change', applyNoticeFilter);

    $('btnAddNotice').addEventListener('click', function () {
        editingNoticeId = null;
        selectedNoticeFile = null;
        $('ntModalTitle').textContent = 'নতুন নোটিশ';
        $('ntModalSub').textContent = 'নোটিশের তথ্য দিন';
        $('ntEditId').value = '';
        $('ntTitle').value = '';
        $('ntCategory').value = '';
        $('ntDate').value = '';
        $('ntDescription').value = '';
        $('ntOrder').value = 0;
        $('ntPublished').checked = true;
        $('ntFilePreview').classList.remove('show');
        $('ntFileInput').value = '';
        window.openModal('noticeModal');
    });

    window.editNotice = function (id) {
        const n = noticeList.find(x => x.id === id);
        if (!n) return;
        editingNoticeId = id;
        selectedNoticeFile = null;
        $('ntModalTitle').textContent = 'এডিট করুন';
        $('ntModalSub').textContent = n.title;
        $('ntEditId').value = id;
        $('ntTitle').value = n.title;
        $('ntCategory').value = n.exam_category;
        $('ntDate').value = n.notice_date;
        $('ntDescription').value = n.description || '';
        $('ntOrder').value = n.display_order;
        $('ntPublished').checked = n.is_published;
        if (n.file_url) {
            $('ntFileName').textContent = '📎 ফাইল আছে';
            $('ntFilePreview').classList.add('show');
        } else {
            $('ntFilePreview').classList.remove('show');
        }
        window.openModal('noticeModal');
    };

    $('ntFileInput').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const f = this.files[0];
            if (f.size > 5 * 1024 * 1024) return window.fdcWarning('Max 5MB');
            selectedNoticeFile = f;
            $('ntFileName').textContent = '📎 ' + f.name;
            $('ntFilePreview').classList.add('show');
        }
    });

    $('ntRemoveFile').addEventListener('click', function () {
        selectedNoticeFile = null;
        $('ntFileInput').value = '';
        $('ntFilePreview').classList.remove('show');
    });

    $('ntSaveBtn').addEventListener('click', async function () {
        const title = $('ntTitle').value.trim();
        const cat = $('ntCategory').value;
        const date = $('ntDate').value;
        if (!title || !cat || !date) return window.fdcWarning('সব তথ্য দিন');
        this.disabled = true;
        const orig = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        try {
            let fileUrl = null;
            if (selectedNoticeFile) {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
                const up = await window.FDCUploadImage(selectedNoticeFile);
                fileUrl = up.url || up.secure_url;
            }
            const payload = {
                title,
                description: $('ntDescription').value.trim() || null,
                exam_category: cat,
                notice_date: date,
                file_url: fileUrl,
                is_published: $('ntPublished').checked,
                display_order: parseInt($('ntOrder').value) || 0
            };
            let res;
            if (editingNoticeId) {
                if (!fileUrl) delete payload.file_url;
                res = await window.FDC_SUPABASE.from('exam_notice').update(payload).eq('id', editingNoticeId);
            } else {
                res = await window.FDC_SUPABASE.from('exam_notice').insert([payload]);
            }
            if (res.error) throw res.error;
            window.fdcSuccess(editingNoticeId ? 'আপডেট হয়েছে' : 'যোগ হয়েছে');
            window.closeModal('noticeModal');
            await loadNotices();
        } catch (e) {
            window.fdcError('সমস্যা: ' + e.message);
        } finally {
            this.disabled = false;
            this.innerHTML = orig;
        }
    });

    window.deleteNotice = function (id) {
        const n = noticeList.find(x => x.id === id);
        if (!n) return;
        window.fdcConfirm(`"${n.title}" মুছবেন?`, async function () {
            try {
                const { error } = await window.FDC_SUPABASE.from('exam_notice').delete().eq('id', id);
                if (error) throw error;
                window.fdcSuccess('মুছে ফেলা হয়েছে');
                await loadNotices();
            } catch (e) { window.fdcError('সমস্যা: ' + e.message); }
        }, { confirmText: 'Yes, Delete', confirmType: 'danger' });
    };

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Exam Management initializing...');
        initTabs();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;
            await loadAdminInfo();
            await Promise.all([loadCountdowns(), loadRoutines(), loadNotices()]);
            console.log('✅ Admin Exam ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();