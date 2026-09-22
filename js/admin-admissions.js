/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN ADMISSION MANAGEMENT
 * Location: js/admin-admissions.js
 * Version: v2.1
 * 
 * ✅ Features:
 *    - Load all applications
 *    - Main tabs: All / HSC-General / HSC-BM
 *    - Sub tabs: Dynamic group-wise
 *    - Status chips filter
 *    - Search
 *    - Stats cards
 *    - View / Verify / Admit / Cancel actions
 *    - Export CSV
 *    - Professional Admin PDF (single + bulk)
 *    - Bengali font embed
 *    - 🆕 PDF button only in Admitted/Cancelled cards
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // PDF CONFIG (Inline)
    // =========================================================
    const PDF_CFG = {
        college: {
            name_bn: 'ফুলবাড়ীয়া কলেজ',
            name_en: 'FULBARIYA COLLEGE',
            location_en: 'Fulbariya, Mymensingh',
            eiin: '111516',
            established: '1972',
            website: 'fulbariya-college.pages.dev'
        },
        logo: {
            url: 'https://fulbariya-college.pages.dev/assets/images/logo1.png'
        },
        status: {
            pending:  { label: 'PENDING',  color: [245, 158, 11], bg: [254, 243, 199], text: [146, 64, 14] },
            verified: { label: 'VERIFIED', color: [59, 130, 246], bg: [219, 234, 254], text: [30, 64, 175] },
            admitted: { label: 'ADMITTED', color: [16, 185, 129], bg: [209, 250, 229], text: [6, 95, 70] },
            cancelled:{ label: 'CANCELLED',color: [239, 68, 68],  bg: [254, 226, 226], text: [153, 27, 27] }
        }
    };

    const BENGALI_FONT_URL = '../assets/fonts/NotoSansBengali.ttf';
    const BENGALI_FONT_NAME = 'NotoSansBengali';

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

    let _bengaliFontLoaded = false;
    let _bengaliFontPromise = null;

    // =========================================================
    // DOM HELPER
    // =========================================================
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function hasBengali(text) {
        return /[\u0980-\u09FF]/.test(String(text || ''));
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

    // =========================================================
    // BENGALI FONT LOADER
    // =========================================================
    async function loadBengaliFont(doc) {
        if (_bengaliFontLoaded) return true;

        if (!_bengaliFontPromise) {
            _bengaliFontPromise = fetch(BENGALI_FONT_URL)
                .then(res => {
                    if (!res.ok) throw new Error('Font fetch failed: ' + res.status);
                    return res.arrayBuffer();
                })
                .then(buf => {
                    let binary = '';
                    const bytes = new Uint8Array(buf);
                    const chunkSize = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                    }
                    return btoa(binary);
                })
                .catch(err => {
                    console.warn('⚠️ Bengali font load failed:', err);
                    return null;
                });
        }

        const base64 = await _bengaliFontPromise;
        if (!base64) return false;

        try {
            doc.addFileToVFS('NotoSansBengali.ttf', base64);
            doc.addFont('NotoSansBengali.ttf', BENGALI_FONT_NAME, 'normal');
            doc.addFont('NotoSansBengali.ttf', BENGALI_FONT_NAME, 'bold');
            _bengaliFontLoaded = true;
            console.log('✅ Bengali font loaded');
            return true;
        } catch (e) {
            console.error('❌ Font registration failed:', e);
            return false;
        }
    }

    function setEnglishFont(doc, style) {
        doc.setFont('helvetica', style || 'normal');
    }

    function setBengaliFont(doc) {
        if (_bengaliFontLoaded) {
            doc.setFont(BENGALI_FONT_NAME, 'normal');
            return true;
        }
        return false;
    }

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
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
    // UPDATE STATS
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

    // =========================================================
    // UPDATE MAIN TABS
    // =========================================================
    function updateMainTabs() {
        const all = allApplications.length;
        const hsc = allApplications.filter(a => a.application_type === 'HSC-General').length;
        const bm = allApplications.filter(a => a.application_type === 'HSC-BM').length;

        $('countAll').textContent = all;
        $('countHSC').textContent = hsc;
        $('countBM').textContent = bm;
    }

    // =========================================================
    // UPDATE SUB TABS
    // =========================================================
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

    // =========================================================
    // UPDATE STATUS CHIPS
    // =========================================================
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

    // =========================================================
    // FILTER HELPERS
    // =========================================================
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
                else if (action === 'pdf') downloadSinglePDF(id);
            });
        });
    }

    // =========================================================
    // RENDER APP CARD
    // v2.1: PDF button only in Admitted/Cancelled
    // =========================================================
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

        // ============================================
        // Action Buttons (v2.1 logic)
        // ============================================
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
            // ✅ শুধু এই দুই status-এ PDF button
            actionButtons += `
                <button class="ac-btn pdf" data-action="pdf" data-id="${app.id}" title="Download PDF">
                    <i class="fas fa-file-pdf"></i> PDF
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

        // ============================================
        // Footer (View modal-এ PDF button সর্বদা থাকবে)
        // ============================================
        let footer = `
            <button class="btn-secondary" onclick="document.getElementById('viewModal').classList.remove('show'); document.body.style.overflow='';">
                <i class="fas fa-times"></i> Close
            </button>
            <button class="btn-primary-grad" id="viewPdfBtn">
                <i class="fas fa-file-pdf"></i> Download PDF
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

        $('viewPdfBtn')?.addEventListener('click', () => downloadSinglePDF(id));
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
    // PDF — SINGLE
    // =========================================================
    async function downloadSinglePDF(id) {
        const app = allApplications.find(a => String(a.id) === String(id));
        if (!app) return window.fdcError('Application পাওয়া যায়নি');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            await renderAdminPDF(doc, app, 1, 1);

            const filename = `FDC_Admin_${app.application_id || 'Application'}.pdf`;
            doc.save(filename);
            console.log('✅ Admin PDF downloaded:', filename);

            window.fdcSuccess('PDF Download হয়েছে');

        } catch (e) {
            console.error('PDF error:', e);
            window.fdcError('PDF তৈরি করা যায়নি: ' + e.message);
        }
    }

    // =========================================================
    // PDF — BULK
    // =========================================================
    async function downloadBulkPDF() {
        if (filteredApplications.length === 0) {
            return window.fdcWarning('Export করার জন্য কোনো application নেই');
        }

        if (filteredApplications.length > 50) {
            const ok = await new Promise(resolve => {
                window.fdcConfirm(
                    `${filteredApplications.length}টি PDF তৈরি হতে পারে — এতে সময় লাগবে। চালিয়ে যাবেন?`,
                    () => resolve(true),
                    () => resolve(false),
                    { title: 'Bulk PDF', confirmText: 'হ্যাঁ', cancelText: 'না' }
                );
            });
            if (!ok) return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            const total = filteredApplications.length;
            for (let i = 0; i < total; i++) {
                if (i > 0) doc.addPage();
                await renderAdminPDF(doc, filteredApplications[i], i + 1, total);
            }

            const filename = `FDC_Admin_Bulk_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            console.log('✅ Bulk PDF downloaded:', filename, 'Total:', total);

            window.fdcSuccess(`${total}টি application-এর PDF Download হয়েছে`);

        } catch (e) {
            console.error('Bulk PDF error:', e);
            window.fdcError('Bulk PDF তৈরি করা যায়নি: ' + e.message);
        }
    }

    // =========================================================
    // ADMIN PDF RENDERER
    // =========================================================
    async function renderAdminPDF(doc, app, pageNum, totalPages) {
        await loadBengaliFont(doc);

        const pageW = 210;
        const pageH = 297;
        const margin = 12;
        const contentW = pageW - (margin * 2);

        const status = (app.status || 'pending').toLowerCase();
        const st = PDF_CFG.status[status] || PDF_CFG.status.pending;

        // WATERMARK
        doc.setTextColor(245, 240, 235);
        doc.setFontSize(46);
        doc.setFont('helvetica', 'bold');
        doc.text('ADMIN', 105, 130, { align: 'center', angle: 45 });
        doc.text('COPY', 105, 165, { align: 'center', angle: 45 });
        doc.setFontSize(12);
        doc.text('OFFICE COPY', 105, 195, { align: 'center', angle: 45 });

        // OUTER BORDER (RED)
        doc.setDrawColor(180, 30, 30);
        doc.setLineWidth(0.9);
        doc.rect(6, 6, pageW - 12, pageH - 12);
        doc.setLineWidth(0.3);
        doc.rect(8, 8, pageW - 16, pageH - 16);

        // HEADER
        const headerY = 10;
        const headerH = 36;

        doc.setFillColor(140, 20, 20);
        doc.rect(margin, headerY, contentW, headerH, 'F');

        doc.setFillColor(245, 200, 80);
        doc.rect(margin, headerY + headerH, contentW, 1.2, 'F');

        doc.setFillColor(255, 255, 255);
        doc.rect(margin + 1, headerY + 1, 70, 6, 'F');
        doc.setTextColor(140, 20, 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ OFFICE COPY — NOT FOR STUDENT', margin + 3, headerY + 5.5);

        // Logo
        try {
            const logoImg = new Image();
            logoImg.crossOrigin = 'Anonymous';
            const logoPromise = new Promise((resolve) => {
                logoImg.onload = () => resolve(true);
                logoImg.onerror = () => resolve(false);
                logoImg.src = PDF_CFG.logo.url;
                setTimeout(() => resolve(false), 2000);
            });
            const logoOk = await logoPromise;
            if (logoOk) {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.width;
                canvas.height = logoImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                const logoData = canvas.toDataURL('image/png');
                doc.addImage(logoData, 'PNG', margin + 4, headerY + 8, 22, 22);
            }
        } catch (e) {
            console.warn('Logo load failed:', e);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.text(PDF_CFG.college.name_en, 105, headerY + 14, { align: 'center' });

        if (_bengaliFontLoaded) {
            doc.setFont(BENGALI_FONT_NAME, 'normal');
            doc.setFontSize(12);
            doc.text(PDF_CFG.college.name_bn, 105, headerY + 20, { align: 'center' });
            doc.setFont('helvetica', 'normal');
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(245, 200, 80);
        doc.text(
            PDF_CFG.college.location_en + ' · EIIN: ' + PDF_CFG.college.eiin + ' · Est. ' + PDF_CFG.college.established,
            105, headerY + 26, { align: 'center' }
        );

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ADMISSION APPLICATION — OFFICE COPY', 105, headerY + 33, { align: 'center' });

        // APP ID + PHOTO
        const rowY = headerY + headerH + 4;
        const rowH = 30;

        doc.setFillColor(254, 242, 242);
        doc.rect(margin, rowY, 138, rowH, 'F');
        doc.setDrawColor(180, 30, 30);
        doc.setLineWidth(0.4);
        doc.rect(margin, rowY, 138, rowH);

        doc.setTextColor(140, 20, 20);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('APPLICATION ID', margin + 4, rowY + 5);

        doc.setTextColor(180, 30, 30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(app.application_id || '—', margin + 4, rowY + 13);

        doc.setTextColor(107, 114, 128);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text('Submitted: ' + (app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-GB') : '—'), margin + 4, rowY + 18);

        doc.setFillColor(st.bg[0], st.bg[1], st.bg[2]);
        doc.rect(margin + 4, rowY + 21, 55, 6, 'F');
        doc.setDrawColor(st.color[0], st.color[1], st.color[2]);
        doc.setLineWidth(0.3);
        doc.rect(margin + 4, rowY + 21, 55, 6);
        doc.setTextColor(st.text[0], st.text[1], st.text[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('STATUS: ' + st.label, margin + 31.5, rowY + 25.3, { align: 'center' });

        if (app.photo_url) {
            try {
                const img = await fetch(app.photo_url);
                const blob = await img.blob();
                const reader = new FileReader();
                const base64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.setDrawColor(140, 20, 20);
                doc.setLineWidth(0.6);
                doc.rect(margin + 141, rowY, 44, rowH);
                doc.addImage(base64, 'JPEG', margin + 142, rowY + 1, 42, rowH - 2);
            } catch (e) {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.rect(margin + 141, rowY, 44, rowH);
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(8);
                doc.text('No Photo', margin + 163, rowY + 16, { align: 'center' });
            }
        } else {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.rect(margin + 141, rowY, 44, rowH);
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text('No Photo', margin + 163, rowY + 16, { align: 'center' });
        }

        // =====================================================
        // SECTION RENDERER
        // =====================================================
        let y = rowY + rowH + 4;
        let sectionNum = 1;

        function drawSectionHeader(title) {
            if (y > 255) {
                doc.addPage();
                y = 20;
            }
            const num = String(sectionNum).padStart(2, '0');
            sectionNum++;

            doc.setFillColor(140, 20, 20);
            doc.rect(margin, y, contentW, 7, 'F');
            doc.setFillColor(245, 200, 80);
            doc.rect(margin, y + 7, contentW, 0.6, 'F');

            doc.setFillColor(245, 200, 80);
            doc.circle(margin + 5, y + 3.5, 3.2, 'F');
            doc.setTextColor(140, 20, 20);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(num, margin + 5, y + 4.5, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin + 12, y + 4.5);

            y += 10;
        }

        function drawRow(label, value, x, width) {
            doc.setTextColor(107, 114, 128);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(String(label).toUpperCase(), x, y);

            const val = (value === null || value === undefined || value === '') ? '—' : String(value);
            doc.setTextColor(31, 41, 55);

            if (hasBengali(val)) {
                if (setBengaliFont(doc)) {
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize(val, width - 2);
                    doc.text(lines[0] || '—', x, y + 4.5);
                    setEnglishFont(doc, 'bold');
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text('[Bangla]', x, y + 4.5);
                }
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                const lines = doc.splitTextToSize(val, width - 2);
                doc.text(lines[0] || '—', x, y + 4.5);
            }
        }

        function drawRowFull(label, value) {
            drawRow(label, value, margin + 3, contentW - 6);
            y += 9;
        }

        function drawRowPair(l1, v1, l2, v2) {
            const halfW = contentW / 2;
            drawRow(l1, v1, margin + 3, halfW - 5);
            drawRow(l2, v2, margin + halfW + 3, halfW - 5);
            y += 9;
        }

        // SECTION 01
        drawSectionHeader('STUDENT INFORMATION');
        drawRowPair('Name (English)', app.name_en, 'নাম (বাংলা)', app.name_bn);
        drawRowPair('Gender', app.gender, 'Phone', app.phone);
        drawRowPair('Birth Date', app.birth_date, 'Religion', app.religion);
        drawRowPair('Blood Group', app.blood_group, 'UID', app.uid_number);
        y += 1;

        // SECTION 02
        drawSectionHeader('ADDRESS');
        drawRowPair('Village', app.village, 'Union', app.union_name);
        drawRowPair('Upazila', app.upazila, 'District', app.district);
        drawRowPair('Post Office', app.post_office, 'Post Code', app.post_code);
        y += 1;

        // SECTION 03
        drawSectionHeader('PARENT INFORMATION');
        drawRowPair('পিতার নাম', app.father_name_bn, 'মাতার নাম', app.mother_name_bn);
        drawRowPair("Father's Phone", app.father_phone, "Mother's Phone", app.mother_phone);
        if (app.guardian_name) {
            drawRowPair('Guardian', app.guardian_name, 'Guardian Phone', app.guardian_phone);
        }
        y += 1;

        // SECTION 04
        drawSectionHeader('ADMISSION DETAILS');
        const isBM = app.application_type === 'HSC-BM';
        drawRowPair('Class', app.class_name, 'Branch', isBM ? 'BM' : 'HSC');
        drawRowPair(isBM ? 'Trade' : 'Group', getGroupDisplay(app.group_name), '4th Subject', app.optional_subject);
        drawRowFull('Admission Date · Session',
            (app.admission_date || '—') + ' · ' + (app.admission_session || '—'));
        y += 1;

        // SECTION 05
        drawSectionHeader('SUBJECTS');
        if (app.compulsory_subjects && Array.isArray(app.compulsory_subjects) && app.compulsory_subjects.length) {
            const subjectsText = app.compulsory_subjects.join('  ·  ');
            doc.setTextColor(107, 114, 128);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text('SELECTED SUBJECTS', margin + 3, y);
            y += 4;

            doc.setTextColor(31, 41, 55);
            if (hasBengali(subjectsText) && setBengaliFont(doc)) {
                doc.setFontSize(9.5);
                const lines = doc.splitTextToSize(subjectsText, contentW - 6);
                doc.text(lines, margin + 3, y);
                y += lines.length * 4 + 2;
                setEnglishFont(doc, 'bold');
            } else {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                const lines = doc.splitTextToSize(subjectsText, contentW - 6);
                doc.text(lines, margin + 3, y);
                y += lines.length * 4 + 2;
            }
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('—', margin + 3, y);
            y += 6;
        }
        y += 2;

        // SECTION 06
        drawSectionHeader('PREVIOUS EXAM RESULT');
        drawRowPair('Exam Name', app.prev_exam_name, 'Roll No', app.prev_roll_no);
        drawRowPair('Result', app.prev_result, 'Passing Year', app.prev_passing_year);
        drawRowPair('Board', app.prev_board, 'School', app.prev_school_name);
        y += 2;

        // SECTION 07 — OFFICE VERIFICATION
        drawSectionHeader('OFFICE VERIFICATION');
        const checkboxes = [
            'Documents verified (SSC Certificate, NID)',
            'Photo verified — matches student',
            'Admission fee received',
            'Roll number assigned'
        ];
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        let cy = y;
        checkboxes.forEach((item) => {
            doc.setDrawColor(140, 20, 20);
            doc.setLineWidth(0.4);
            doc.rect(margin + 4, cy - 3, 4, 4);

            if (status === 'verified' || status === 'admitted') {
                doc.setDrawColor(16, 185, 129);
                doc.setLineWidth(0.6);
                doc.line(margin + 4.5, cy - 1.5, margin + 6, cy - 0.5);
                doc.line(margin + 6, cy - 0.5, margin + 8, cy - 2.5);
            }

            doc.setTextColor(31, 41, 55);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(item, margin + 11, cy);
            cy += 6;
        });

        y = cy + 2;

        doc.setTextColor(107, 114, 128);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTES:', margin + 3, y);
        y += 3;

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin + 3, y + 8, margin + contentW - 3, y + 8);
        doc.line(margin + 3, y + 14, margin + contentW - 3, y + 14);

        if (app.status_notes) {
            doc.setTextColor(31, 41, 55);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            if (hasBengali(app.status_notes) && _bengaliFontLoaded) {
                doc.setFont(BENGALI_FONT_NAME, 'normal');
                const lines = doc.splitTextToSize(app.status_notes, contentW - 8);
                doc.text(lines.slice(0, 2), margin + 4, y + 6);
                doc.setFont('helvetica', 'normal');
            } else {
                const lines = doc.splitTextToSize(app.status_notes, contentW - 8);
                doc.text(lines.slice(0, 2), margin + 4, y + 6);
            }
        }

        y += 18;

        // ROLL / FEE HIGHLIGHT
        if (status === 'admitted' && (app.roll_number || app.admission_fee)) {
            if (y > 250) { doc.addPage(); y = 20; }

            doc.setFillColor(209, 250, 229);
            doc.rect(margin, y, contentW, 14, 'F');
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.6);
            doc.rect(margin, y, contentW, 14);

            doc.setTextColor(6, 95, 70);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('ADMITTED', margin + 4, y + 5);

            doc.setFontSize(11);
            doc.text('Roll: ' + (app.roll_number || '—'), margin + 4, y + 11);
            doc.text('Fee: ৳ ' + (app.admission_fee || 0), margin + 100, y + 11);

            y += 18;
        }

        // SIGNATURE
        if (y > 255) { doc.addPage(); y = 20; }

        const sigY = y + 3;
        const sigW = 60;

        doc.setDrawColor(31, 41, 55);
        doc.setLineWidth(0.4);
        doc.line(margin + 5, sigY + 12, margin + 5 + sigW, sigY + 12);
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Applicant's Signature", margin + 5 + sigW / 2, sigY + 16, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Date: ____/____/______', margin + 5, sigY + 22);

        const sealX = margin + 105;
        doc.setDrawColor(31, 41, 55);
        doc.setLineWidth(0.4);
        doc.line(sealX, sigY + 12, sealX + sigW, sigY + 12);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text("Principal's Signature", sealX + sigW / 2, sigY + 16, { align: 'center' });

        doc.setDrawColor(180, 30, 30);
        doc.setLineWidth(0.5);
        doc.rect(sealX + 15, sigY + 18, 30, 20);
        doc.setTextColor(180, 30, 30);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('[ COLLEGE SEAL ]', sealX + 30, sigY + 29, { align: 'center' });

        // FOOTER
        const footY = pageH - 12;

        doc.setFillColor(140, 20, 20);
        doc.rect(margin, footY, contentW, 8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text((app.application_id || '—') + ' · ADMIN COPY', margin + 3, footY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(245, 200, 80);
        doc.text(PDF_CFG.college.website, pageW / 2, footY + 5, { align: 'center' });

        doc.setTextColor(255, 255, 255);
        doc.text('Page ' + pageNum + ' of ' + totalPages, pageW - margin - 3, footY + 5, { align: 'right' });
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
        $('btnBulkPdf')?.addEventListener('click', downloadBulkPDF);

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
        console.log('🚀 Admin Admissions v2.1 initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadApplications();

            console.log('✅ Admin Admissions v2.1 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();