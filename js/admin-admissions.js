/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN ADMISSION MANAGEMENT
 * Location: js/admin-admissions.js
 * Version: v3.1 — Bulk Print added
 * 
 * ✅ Features:
 *    - Load all applications
 *    - Main tabs / Sub tabs / Status chips / Search / Stats
 *    - View / Verify / Admit / Cancel actions
 *    - Export CSV
 *    - Single Print + Bulk Print (Print to PDF)
 *    - Print button only in Admitted/Cancelled cards
 * =========================================================
 */

(function () {
    "use strict";

    const PRINT_URL = 'admission-print.html';

    // =========================================================
    // STATE
    // =========================================================
    let allApplications = [];
    let filteredApplications = [];

    let currentLevel = 'all';
    let currentGroup = 'all';
    let currentStatus = 'all';
    let currentSearch = '';

    let actionApplicationId = null;

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // HELPERS
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                           'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch (e) { return dateStr; }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                           'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
        } catch (e) { return dateStr; }
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb, { once: true });
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 40) clearInterval(i);
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
                    if (result.admin.image_url) avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    else avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
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
                try { if (window.FDCAuth) await window.FDCAuth.logout(); } catch (e) {}
                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            { title: 'লগআউট নিশ্চিত করুন', confirmText: 'হ্যাঁ, লগআউট', cancelText: 'বাতিল', confirmType: 'danger' }
        );
    };

    // =========================================================
    // LOAD APPLICATIONS
    // =========================================================
    async function loadApplications() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (error) throw error;

            allApplications = data || [];
            console.log('✅ Loaded applications:', allApplications.length);

            updateStats();
            updateMainTabs();
            updateSubTabs();
            updateStatusChips();
            applyFiltersAndRender();

        } catch (e) {
            console.error('Load error:', e);
            $('appsContainer').innerHTML = `
                <div class="empty-state">
                    <div class="es-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <h5>লোড করা যায়নি</h5>
                    <p>${escapeHtml(e.message)}</p>
                </div>
            `;
        }
    }

    // =========================================================
    // STATS
    // =========================================================
    function updateStats() {
        const total = allApplications.length;
        const pending = allApplications.filter(a => a.status === 'pending').length;
        const verified = allApplications.filter(a => a.status === 'verified').length;
        const admitted = allApplications.filter(a => a.status === 'admitted').length;
        const cancelled = allApplications.filter(a => a.status === 'cancelled').length;

        $('statTotal').textContent = total;
        $('statPending').textContent = pending;
        $('statVerified').textContent = verified;
        $('statAdmitted').textContent = admitted;
        $('statCancelled').textContent = cancelled;
    }

    function updateMainTabs() {
        const all = allApplications.length;
        const hsc = allApplications.filter(a => a.application_type === 'HSC-General').length;
        const bm = allApplications.filter(a => a.application_type === 'HSC-BM').length;

        $('countAll').textContent = all;
        $('countHSC').textContent = hsc;
        $('countBM').textContent = bm;
    }

    function updateSubTabs() {
        const container = $('subTabs');
        let groups = [];

        if (currentLevel === 'all') {
            groups = [
                { key: 'Science', label: 'Science', icon: 'fa-flask' },
                { key: 'Business', label: 'Business', icon: 'fa-briefcase' },
                { key: 'Humanities', label: 'Humanities', icon: 'fa-book' },
                { key: 'Computerized Accounting System', label: 'CAS', icon: 'fa-calculator' },
                { key: 'Digital Technology in Business', label: 'DTB', icon: 'fa-laptop-code' },
                { key: 'Human Resource Development', label: 'HRD', icon: 'fa-users' }
            ];
        } else if (currentLevel === 'HSC-General') {
            groups = [
                { key: 'Science', label: 'Science', icon: 'fa-flask' },
                { key: 'Business', label: 'Business', icon: 'fa-briefcase' },
                { key: 'Humanities', label: 'Humanities', icon: 'fa-book' }
            ];
        } else if (currentLevel === 'HSC-BM') {
            groups = [
                { key: 'Computerized Accounting System', label: 'CAS', icon: 'fa-calculator' },
                { key: 'Digital Technology in Business', label: 'DTB', icon: 'fa-laptop-code' },
                { key: 'Human Resource Development', label: 'HRD', icon: 'fa-users' }
            ];
        }

        const levelApps = currentLevel === 'all'
            ? allApplications
            : allApplications.filter(a => a.application_type === currentLevel);

        const totalCount = levelApps.length;

        let html = `
            <button class="sub-tab ${currentGroup === 'all' ? 'active' : ''}" data-group="all">
                <i class="fas fa-layer-group"></i> All Groups
                <span class="tab-count">${totalCount}</span>
            </button>
        `;

        groups.forEach(g => {
            const count = levelApps.filter(a => a.group_name === g.key).length;
            html += `
                <button class="sub-tab ${currentGroup === g.key ? 'active' : ''}" data-group="${escapeHtml(g.key)}">
                    <i class="fas ${g.icon}"></i> ${escapeHtml(g.label)}
                    <span class="tab-count">${count}</span>
                </button>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                currentGroup = this.dataset.group;
                updateSubTabs();
                applyFiltersAndRender();
            });
        });
    }

    function updateStatusChips() {
        const levelApps = getFilteredByLevelAndGroup();

        const total = levelApps.length;
        const pending = levelApps.filter(a => a.status === 'pending').length;
        const verified = levelApps.filter(a => a.status === 'verified').length;
        const admitted = levelApps.filter(a => a.status === 'admitted').length;
        const cancelled = levelApps.filter(a => a.status === 'cancelled').length;

        $('chipAll').textContent = total;
        $('chipPending').textContent = pending;
        $('chipVerified').textContent = verified;
        $('chipAdmitted').textContent = admitted;
        $('chipCancelled').textContent = cancelled;
    }

    function getFilteredByLevelAndGroup() {
        return allApplications.filter(a => {
            if (currentLevel !== 'all' && a.application_type !== currentLevel) return false;
            if (currentGroup !== 'all' && a.group_name !== currentGroup) return false;
            return true;
        });
    }

    function applyFiltersAndRender() {
        filteredApplications = getFilteredByLevelAndGroup().filter(a => {
            if (currentStatus !== 'all' && a.status !== currentStatus) return false;

            if (currentSearch) {
                const q = currentSearch.toLowerCase();
                const hay = [
                    a.name_en, a.name_bn, a.phone, a.application_id,
                    a.roll_number, a.prev_roll_no
                ].filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }

            return true;
        });

        updateStatusChips();
        renderApplications();
    }

    // =========================================================
    // RENDER APPLICATIONS
    // =========================================================
    function renderApplications() {
        const container = $('appsContainer');

        if (filteredApplications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="es-icon"><i class="fas fa-inbox"></i></div>
                    <h5>কোনো application নেই</h5>
                    <p>Filter পরিবর্তন করুন অথবা অন্য Tab-এ যান</p>
                </div>
            `;
            return;
        }

        let html = '';
        filteredApplications.forEach(app => {
            html += renderAppCard(app);
        });

        container.innerHTML = html;

        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const action = this.dataset.action;
                const id = this.dataset.id;
                if (action === 'view') openViewModal(id);
                else if (action === 'verify') openVerifyModal(id);
                else if (action === 'admit') openAdmitModal(id);
                else if (action === 'cancel') openCancelModal(id);
                else if (action === 'print') openPrintView(id, 'admin');
            });
        });
    }

    function renderAppCard(app) {
        const status = (app.status || 'pending').toLowerCase();
        const statusLabels = {
            pending: 'Pending',
            verified: 'Verified',
            admitted: 'Admitted',
            cancelled: 'Cancelled'
        };
        const statusIcons = {
            pending: 'fa-hourglass-half',
            verified: 'fa-check-circle',
            admitted: 'fa-trophy',
            cancelled: 'fa-ban'
        };

        const photoSrc = app.photo_url || '';
        const photoHtml = photoSrc
            ? `<img src="${escapeHtml(photoSrc)}" alt="${escapeHtml(app.name_en || '')}" loading="lazy" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>';">`
            : '<i class="fas fa-user"></i>';

        const levelLabel = app.application_type === 'HSC-BM' ? 'BM' : 'HSC';
        const groupDisplay = getGroupDisplay(app.group_name);

        let actionButtons = `
            <button class="ac-btn view" data-action="view" data-id="${app.id}">
                <i class="fas fa-eye"></i> View
            </button>
        `;

        if (status === 'pending') {
            actionButtons += `
                <button class="ac-btn verify" data-action="verify" data-id="${app.id}">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button class="ac-btn cancel" data-action="cancel" data-id="${app.id}">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `;
        } else if (status === 'verified') {
            actionButtons += `
                <button class="ac-btn admit" data-action="admit" data-id="${app.id}">
                    <i class="fas fa-trophy"></i> Admit
                </button>
                <button class="ac-btn cancel" data-action="cancel" data-id="${app.id}">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `;
        } else if (status === 'admitted' || status === 'cancelled') {
            actionButtons += `
                <button class="ac-btn pdf" data-action="print" data-id="${app.id}" title="Print / Save as PDF">
                    <i class="fas fa-print"></i> Print
                </button>
            `;
        }

        return `
            <div class="app-card status-${status}" data-app-id="${app.id}">
                <div class="ac-top">
                    <div class="ac-photo">${photoHtml}</div>
                    <div class="ac-info">
                        <div class="ac-name">${escapeHtml(app.name_en || app.name_bn || '—')}</div>
                        <div class="ac-appid">${escapeHtml(app.application_id || '—')}</div>
                        <div class="ac-meta">
                            <span><i class="fas fa-layer-group"></i> ${escapeHtml(levelLabel)} · ${escapeHtml(groupDisplay)}</span>
                            <span><i class="fas fa-phone"></i> ${escapeHtml(app.phone || '—')}</span>
                        </div>
                    </div>
                    <div class="ac-status ${status}">
                        <i class="fas ${statusIcons[status]}"></i> ${statusLabels[status]}
                    </div>
                </div>
                <div class="ac-body">
                    <div class="ac-details">
                        <div class="acd-item">
                            <div class="acd-label">Session</div>
                            <div class="acd-value">${escapeHtml(app.admission_session || '—')}</div>
                        </div>
                        <div class="acd-item">
                            <div class="acd-label">Class</div>
                            <div class="acd-value">${escapeHtml(app.class_name || '—')}</div>
                        </div>
                        <div class="acd-item">
                            <div class="acd-label">SSC Roll</div>
                            <div class="acd-value">${escapeHtml(app.prev_roll_no || '—')}</div>
                        </div>
                        <div class="acd-item">
                            <div class="acd-label">District</div>
                            <div class="acd-value">${escapeHtml(app.district || '—')}</div>
                        </div>
                        ${app.roll_number ? `
                            <div class="acd-item">
                                <div class="acd-label">Roll No</div>
                                <div class="acd-value" style="color:#10b981;">${escapeHtml(app.roll_number)}</div>
                            </div>
                        ` : ''}
                        <div class="acd-item">
                            <div class="acd-label">Applied</div>
                            <div class="acd-value">${formatDate(app.submitted_at)}</div>
                        </div>
                    </div>
                </div>
                <div class="ac-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    function getGroupDisplay(groupName) {
        if (!groupName) return '—';
        const map = {
            'Computerized Accounting System': 'CAS',
            'Digital Technology in Business': 'DTB',
            'Human Resource Development': 'HRD'
        };
        return map[groupName] || groupName;
    }

    // =========================================================
    // SINGLE PRINT VIEW
    // =========================================================
    function openPrintView(id, mode) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        const appId = app.application_id;
        const url = `${PRINT_URL}?id=${encodeURIComponent(appId)}&mode=${mode || 'admin'}&auto=1`;

        console.log('🖨️ Opening print view:', url);

        const win = window.open(url, '_blank');

        if (!win || win.closed || typeof win.closed === 'undefined') {
            window.fdcWarning(
                'Print view খুলতে পারছি না। Pop-up blocker বন্ধ করুন অথবা এই লিংকে যান:<br><br>' +
                `<a href="${url}" target="_blank" style="color:#0a1655;font-weight:700;word-break:break-all;">Print view খুলুন</a>`
            );
        }
    }

    // =========================================================
    // BULK PRINT VIEW (v3.1)
    // =========================================================
    function handleBulkPrint() {
        if (filteredApplications.length === 0) {
            return window.fdcWarning('Bulk print করার জন্য কোনো application নেই');
        }

        const total = filteredApplications.length;

        if (total > 50) {
            window.fdcConfirm(
                `${total}টি application এক PDF-এ print হতে পারে — এটা কিছুটা সময় নেবে। চালিয়ে যাবেন?`,
                () => doBulkPrint(),
                null,
                { title: 'Bulk Print', confirmText: 'হ্যাঁ, চালিয়ে যান', cancelText: 'বাতিল', confirmType: 'primary' }
            );
        } else {
            window.fdcConfirm(
                `${total}টি application-এর Print View খুলবে। চালিয়ে যাবেন?`,
                () => doBulkPrint(),
                null,
                { title: 'Bulk Print', confirmText: 'হ্যাঁ', cancelText: 'বাতিল', confirmType: 'primary' }
            );
        }
    }

    function doBulkPrint() {
        const ids = filteredApplications
            .map(a => a.application_id)
            .filter(Boolean);

        if (ids.length === 0) {
            return window.fdcWarning('Application ID খুঁজে পাওয়া যায়নি');
        }

        const idsStr = ids.join(',');
        const url = `${PRINT_URL}?ids=${encodeURIComponent(idsStr)}&mode=admin&auto=1`;

        console.log('🖨️ Bulk print:', ids.length, 'applications');

        const win = window.open(url, '_blank');

        if (!win || win.closed || typeof win.closed === 'undefined') {
            window.fdcWarning(
                `Print view খুলতে পারছি না (${ids.length}টি application)। Pop-up blocker বন্ধ করুন।<br><br>` +
                `<a href="${url}" target="_blank" style="color:#0a1655;font-weight:700;word-break:break-all;">Print view খুলুন (${ids.length}টি)</a>`
            );
        }
    }

    // =========================================================
    // VIEW MODAL
    // =========================================================
    function openViewModal(id) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        actionApplicationId = id;

        const status = (app.status || 'pending').toLowerCase();
        const levelLabel = app.application_type === 'HSC-BM' ? 'HSC-BM (BMT)' : 'HSC-General';
        const groupLabel = app.application_type === 'HSC-BM' ? 'Trade' : 'Group';

        const photoSrc = app.photo_url || '';
        const photoHtml = photoSrc
            ? `<div class="view-photo"><img src="${escapeHtml(photoSrc)}" alt="${escapeHtml(app.name_en || '')}"></div>`
            : '';

        let body = `
            ${photoHtml}

            <div class="view-section">
                <h6><i class="fas fa-user"></i> Student Information</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Name (English)</div><div class="vf-value">${escapeHtml(app.name_en || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Name (Bangla)</div><div class="vf-value">${escapeHtml(app.name_bn || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Gender</div><div class="vf-value">${escapeHtml(app.gender || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Phone</div><div class="vf-value">${escapeHtml(app.phone || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Email</div><div class="vf-value">${escapeHtml(app.email || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Birth Date</div><div class="vf-value">${escapeHtml(app.birth_date || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Religion</div><div class="vf-value">${escapeHtml(app.religion || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Blood Group</div><div class="vf-value">${escapeHtml(app.blood_group || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">UID</div><div class="vf-value">${escapeHtml(app.uid_number || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">NID</div><div class="vf-value">${escapeHtml(app.nid_number || '—')}</div></div>
                </div>
            </div>

            <div class="view-section">
                <h6><i class="fas fa-home"></i> Address</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Village</div><div class="vf-value">${escapeHtml(app.village || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Union</div><div class="vf-value">${escapeHtml(app.union_name || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Post Office</div><div class="vf-value">${escapeHtml(app.post_office || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Post Code</div><div class="vf-value">${escapeHtml(app.post_code || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Division</div><div class="vf-value">${escapeHtml(app.division || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">District</div><div class="vf-value">${escapeHtml(app.district || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Upazila</div><div class="vf-value">${escapeHtml(app.upazila || '—')}</div></div>
                </div>
            </div>

            <div class="view-section">
                <h6><i class="fas fa-users"></i> Parent Information</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Father (EN)</div><div class="vf-value">${escapeHtml(app.father_name_en || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Father (BN)</div><div class="vf-value">${escapeHtml(app.father_name_bn || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Mother (EN)</div><div class="vf-value">${escapeHtml(app.mother_name_en || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Mother (BN)</div><div class="vf-value">${escapeHtml(app.mother_name_bn || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Father Phone</div><div class="vf-value">${escapeHtml(app.father_phone || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Mother Phone</div><div class="vf-value">${escapeHtml(app.mother_phone || '—')}</div></div>
                    ${app.guardian_name ? `<div class="view-field"><div class="vf-label">Guardian</div><div class="vf-value">${escapeHtml(app.guardian_name)}</div></div>` : ''}
                    ${app.guardian_phone ? `<div class="view-field"><div class="vf-label">Guardian Phone</div><div class="vf-value">${escapeHtml(app.guardian_phone)}</div></div>` : ''}
                </div>
            </div>

            <div class="view-section">
                <h6><i class="fas fa-graduation-cap"></i> Admission Information</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Application ID</div><div class="vf-value" style="color:#b8941f;">${escapeHtml(app.application_id || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Level</div><div class="vf-value">${escapeHtml(levelLabel)}</div></div>
                    <div class="view-field"><div class="vf-label">${groupLabel}</div><div class="vf-value">${escapeHtml(getGroupDisplay(app.group_name))}</div></div>
                    <div class="view-field"><div class="vf-label">Class</div><div class="vf-value">${escapeHtml(app.class_name || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Session</div><div class="vf-value">${escapeHtml(app.admission_session || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Admission Date</div><div class="vf-value">${escapeHtml(app.admission_date || '—')}</div></div>
                    ${app.roll_number ? `<div class="view-field"><div class="vf-label">Roll Number</div><div class="vf-value" style="color:#10b981;">${escapeHtml(app.roll_number)}</div></div>` : ''}
                    ${app.admission_fee ? `<div class="view-field"><div class="vf-label">Admission Fee</div><div class="vf-value">৳ ${escapeHtml(app.admission_fee)}</div></div>` : ''}
                </div>
                ${app.compulsory_subjects && Array.isArray(app.compulsory_subjects) && app.compulsory_subjects.length ? `
                    <div style="margin-top:12px;">
                        <div class="vf-label">Subjects</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                            ${app.compulsory_subjects.map(s => `<span style="background:#f0fdf4;color:#166534;border:1px solid #86efac;padding:3px 9px;border-radius:50px;font-size:11.5px;font-weight:600;">${escapeHtml(s)}</span>`).join('')}
                            ${app.optional_subject ? `<span style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:3px 9px;border-radius:50px;font-size:11.5px;font-weight:600;">৪র্থ: ${escapeHtml(app.optional_subject)}</span>` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="view-section">
                <h6><i class="fas fa-book"></i> Previous Exam Result</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Exam Name</div><div class="vf-value">${escapeHtml(app.prev_exam_name || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">School</div><div class="vf-value">${escapeHtml(app.prev_school_name || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Result</div><div class="vf-value">${escapeHtml(app.prev_result || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Passing Year</div><div class="vf-value">${escapeHtml(app.prev_passing_year || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Board</div><div class="vf-value">${escapeHtml(app.prev_board || '—')}</div></div>
                    <div class="view-field"><div class="vf-label">Roll No</div><div class="vf-value">${escapeHtml(app.prev_roll_no || '—')}</div></div>
                </div>
            </div>

            <div class="view-section">
                <h6><i class="fas fa-history"></i> Status Timeline</h6>
                <div class="view-grid">
                    <div class="view-field"><div class="vf-label">Current Status</div><div class="vf-value" style="text-transform:uppercase;">${escapeHtml(status)}</div></div>
                    <div class="view-field"><div class="vf-label">Submitted</div><div class="vf-value">${formatDateTime(app.submitted_at)}</div></div>
                    ${app.reviewed_at ? `<div class="view-field"><div class="vf-label">Verified</div><div class="vf-value">${formatDateTime(app.reviewed_at)}</div></div>` : ''}
                    ${app.admitted_at ? `<div class="view-field"><div class="vf-label">Admitted</div><div class="vf-value">${formatDateTime(app.admitted_at)}</div></div>` : ''}
                </div>
                ${app.status_notes ? `<div style="margin-top:12px;"><div class="vf-label">Notes</div><div class="vf-value" style="font-weight:500;">${escapeHtml(app.status_notes)}</div></div>` : ''}
            </div>
        `;

        $('viewModalTitle').textContent = app.name_en || app.name_bn || 'Application';
        $('viewModalSub').textContent = app.application_id || '';
        $('viewModalBody').innerHTML = body;

        let footer = `
            <button class="btn-secondary" onclick="document.getElementById('viewModal').classList.remove('show'); document.body.style.overflow='';">
                <i class="fas fa-times"></i> Close
            </button>
            <button class="btn-primary-grad" id="viewPrintBtn">
                <i class="fas fa-print"></i> Print / Save as PDF
            </button>
        `;

        if (status === 'pending') {
            footer += `
                <button class="btn-success" id="viewVerifyBtn">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button class="btn-danger" id="viewCancelBtn">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `;
        } else if (status === 'verified') {
            footer += `
                <button class="btn-success" id="viewAdmitBtn">
                    <i class="fas fa-trophy"></i> Admit
                </button>
                <button class="btn-danger" id="viewCancelBtn">
                    <i class="fas fa-ban"></i> Cancel
                </button>
            `;
        }

        $('viewModalFooter').innerHTML = footer;

        $('viewPrintBtn')?.addEventListener('click', () => openPrintView(id, 'admin'));
        $('viewVerifyBtn')?.addEventListener('click', () => {
            closeAllModals();
            openVerifyModal(id);
        });
        $('viewAdmitBtn')?.addEventListener('click', () => {
            closeAllModals();
            openAdmitModal(id);
        });
        $('viewCancelBtn')?.addEventListener('click', () => {
            closeAllModals();
            openCancelModal(id);
        });

        openModal('viewModal');
    }

    // =========================================================
    // VERIFY MODAL
    // =========================================================
    function openVerifyModal(id) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        actionApplicationId = id;
        $('verifyModalSub').textContent = `${app.name_en || app.name_bn} · ${app.application_id}`;
        $('verifyNotes').value = '';

        openModal('verifyModal');
    }

    async function confirmVerify() {
        if (!actionApplicationId) return;

        const btn = $('confirmVerifyBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const notes = ($('verifyNotes')?.value || '').trim();
            const adminInfo = await window.FDCAuth.getCurrentAdmin();
            const adminName = adminInfo?.admin?.name || adminInfo?.admin?.email || 'Admin';

            const { error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .update({
                    status: 'verified',
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: adminName,
                    status_notes: notes || null
                })
                .eq('id', actionApplicationId);

            if (error) throw error;

            closeAllModals();
            window.fdcSuccess('Application Verify হয়েছে!');
            await loadApplications();

        } catch (e) {
            console.error('Verify error:', e);
            window.fdcError('Verify failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // ADMIT MODAL
    // =========================================================
    function openAdmitModal(id) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        actionApplicationId = id;
        $('admitModalSub').textContent = `${app.name_en || app.name_bn} · ${app.application_id}`;
        $('admitRollNumber').value = app.roll_number || '';
        $('admitFee').value = app.admission_fee || '';
        $('admitNotes').value = '';

        openModal('admitModal');
    }

    async function confirmAdmit() {
        if (!actionApplicationId) return;

        const rollNumber = ($('admitRollNumber')?.value || '').trim();
        const fee = parseFloat($('admitFee')?.value) || 0;
        const notes = ($('admitNotes')?.value || '').trim();

        if (!rollNumber) {
            return window.fdcWarning('Roll Number দিন');
        }

        const btn = $('confirmAdmitBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const adminInfo = await window.FDCAuth.getCurrentAdmin();
            const adminName = adminInfo?.admin?.name || adminInfo?.admin?.email || 'Admin';

            const { error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .update({
                    status: 'admitted',
                    roll_number: rollNumber,
                    admission_fee: fee,
                    admitted_at: new Date().toISOString(),
                    reviewed_by: adminName,
                    status_notes: notes || null
                })
                .eq('id', actionApplicationId);

            if (error) throw error;

            closeAllModals();
            window.fdcSuccess(`🎉 Admitted! Roll: ${rollNumber}`);
            await loadApplications();

        } catch (e) {
            console.error('Admit error:', e);
            window.fdcError('Admit failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // CANCEL MODAL
    // =========================================================
    function openCancelModal(id) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        actionApplicationId = id;
        $('cancelModalSub').textContent = `${app.name_en || app.name_bn} · ${app.application_id}`;
        $('cancelReason').value = '';

        openModal('cancelModal');
    }

    async function confirmCancel() {
        if (!actionApplicationId) return;

        const reason = ($('cancelReason')?.value || '').trim();
        if (!reason) {
            return window.fdcWarning('Cancel করার কারণ লিখুন');
        }

        const btn = $('confirmCancelBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const adminInfo = await window.FDCAuth.getCurrentAdmin();
            const adminName = adminInfo?.admin?.name || adminInfo?.admin?.email || 'Admin';

            const { error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .update({
                    status: 'cancelled',
                    status_notes: reason,
                    reviewed_at: new Date().toISOString(),
                    reviewed_by: adminName
                })
                .eq('id', actionApplicationId);

            if (error) throw error;

            closeAllModals();
            window.fdcWarning('Application Cancel হয়েছে');
            await loadApplications();

        } catch (e) {
            console.error('Cancel error:', e);
            window.fdcError('Cancel failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
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

    function closeAllModals() {
        document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
        document.body.style.overflow = '';
    }

    // =========================================================
    // EXPORT CSV
    // =========================================================
    function exportCSV() {
        if (filteredApplications.length === 0) {
            return window.fdcWarning('Export করার জন্য কোনো application নেই');
        }

        const headers = [
            'Application ID', 'Name (English)', 'Name (Bangla)', 'Gender', 'Phone', 'Email',
            'Father Name', 'Mother Name', 'Level', 'Group/Trade', 'Class', 'Session',
            'SSC Roll', 'SSC Result', 'District', 'Upazila',
            'Status', 'Roll Number', 'Fee', 'Submitted'
        ];

        let csv = headers.join(',') + '\n';

        filteredApplications.forEach(a => {
            const row = [
                a.application_id || '',
                a.name_en || '',
                a.name_bn || '',
                a.gender || '',
                a.phone || '',
                a.email || '',
                a.father_name_en || '',
                a.mother_name_en || '',
                a.application_type || '',
                a.group_name || '',
                a.class_name || '',
                a.admission_session || '',
                a.prev_roll_no || '',
                a.prev_result || '',
                a.district || '',
                a.upazila || '',
                a.status || '',
                a.roll_number || '',
                a.admission_fee || '',
                formatDate(a.submitted_at)
            ];
            csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admission_applications_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        window.fdcSuccess(`${filteredApplications.length}টি application export হয়েছে`);
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('mainTabs')?.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                $('mainTabs').querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentLevel = this.dataset.level;
                currentGroup = 'all';
                updateSubTabs();
                applyFiltersAndRender();
            });
        });

        $('statusChips')?.querySelectorAll('.status-chip').forEach(chip => {
            chip.addEventListener('click', function () {
                $('statusChips').querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentStatus = this.dataset.status;
                applyFiltersAndRender();
            });
        });

        $('statsRow')?.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', function () {
                $('statsRow').querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const f = this.dataset.filter;

                $('statusChips').querySelectorAll('.status-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.status === f);
                });
                currentStatus = f;
                applyFiltersAndRender();
            });
        });

        $('searchInput')?.addEventListener('input', function () {
            currentSearch = this.value.trim();
            applyFiltersAndRender();
        });

        $('btnExport')?.addEventListener('click', exportCSV);
        $('btnBulkPdf')?.addEventListener('click', handleBulkPrint);

        $('closeViewModal')?.addEventListener('click', () => closeModal('viewModal'));
        $('closeVerifyModal')?.addEventListener('click', () => closeModal('verifyModal'));
        $('closeAdmitModal')?.addEventListener('click', () => closeModal('admitModal'));
        $('closeCancelModal')?.addEventListener('click', () => closeModal('cancelModal'));
        $('closeCancelModal2')?.addEventListener('click', () => closeModal('cancelModal'));

        $('cancelVerifyBtn')?.addEventListener('click', () => closeModal('verifyModal'));
        $('cancelAdmitBtn')?.addEventListener('click', () => closeModal('admitModal'));

        $('confirmVerifyBtn')?.addEventListener('click', confirmVerify);
        $('confirmAdmitBtn')?.addEventListener('click', confirmAdmit);
        $('confirmCancelBtn')?.addEventListener('click', confirmCancel);

        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) closeAllModals();
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllModals();
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Admissions v3.1 initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadApplications();

            console.log('✅ Admin Admissions v3.1 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();