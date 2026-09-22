/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION PRINT VIEW
 * Location: js/admission-print.js
 * Version: v1.1 — Single + Bulk support
 * Purpose: Print-friendly HTML (replaces jsPDF)
 * 
 * Usage:
 *   Single: admission-print.html?id=FDC-2026-HSC-0001&mode=admin
 *   Bulk:   admission-print.html?ids=FDC-...0001,FDC-...0002&mode=admin
 * =========================================================
 */

(function () {
    "use strict";

    const COLLEGE = {
        name_bn: 'ফুলবাড়ীয়া কলেজ',
        name_en: 'FULBARIYA COLLEGE',
        location_en: 'Fulbariya, Mymensingh',
        eiin: '111516',
        established: '1972',
        website: 'fulbariya-college.pages.dev',
        logo: 'https://fulbariya-college.pages.dev/assets/images/logo1.png'
    };

    const INSTRUCTIONS = [
        'এই Application ID সংরক্ষণ করুন — ভর্তির সময় প্রয়োজন হবে',
        'এই কপি প্রিন্ট করে সাথে আনুন',
        'মূল কাগজপত্র (SSC সার্টিফিকেট, NID, মার্কশিট) আনুন',
        'Status চেক করুন: fulbariya-college.pages.dev'
    ];

    const ADMIN_CHECKLIST = [
        'Documents verified (SSC Certificate, NID)',
        'Photo verified — matches student',
        'Admission fee received',
        'Roll number assigned'
    ];

    const STATUS_LABELS = {
        pending: 'PENDING',
        verified: 'VERIFIED',
        admitted: 'ADMITTED',
        cancelled: 'CANCELLED'
    };

    const MAX_BULK = 100;

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return dateStr; }
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateStr; }
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

    function val(v, fallback) {
        if (fallback === undefined) fallback = '—';
        if (v === null || v === undefined || v === '') return fallback;
        return escapeHtml(v);
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

    async function fetchApplication(appId) {
        const supabase = window.FDC_SUPABASE;
        if (!supabase) throw new Error('Supabase not ready');

        const { data, error } = await supabase
            .from('admission_applications')
            .select('*')
            .eq('application_id', appId)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Application not found: ' + appId);
        return data;
    }

    async function fetchBulkApplications(appIds) {
        const supabase = window.FDC_SUPABASE;
        if (!supabase) throw new Error('Supabase not ready');

        const { data, error } = await supabase
            .from('admission_applications')
            .select('*')
            .in('application_id', appIds);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('No applications found');

        const map = {};
        data.forEach(a => { map[a.application_id] = a; });
        return appIds.map(id => map[id]).filter(Boolean);
    }

    function buildPrintPage(app, mode, pageInfo) {
        const isAdmin = mode === 'admin';
        const status = (app.status || 'pending').toLowerCase();
        const statusLabel = STATUS_LABELS[status] || 'PENDING';

        const levelLabel = app.application_type === 'HSC-BM' ? 'HSC-BM (BMT)' : 'HSC-General';
        const groupLabel = app.application_type === 'HSC-BM' ? 'Trade' : 'Group';

        const photoHtml = app.photo_url
            ? `<img src="${escapeHtml(app.photo_url)}" alt="Photo" onerror="this.parentElement.innerHTML='<div class=\\'no-photo\\'>No Photo</div>'">`
            : `<div class="no-photo">No Photo</div>`;

        let subjectTags = '';
        if (Array.isArray(app.compulsory_subjects) && app.compulsory_subjects.length) {
            subjectTags = app.compulsory_subjects.map(s =>
                `<span class="subj-tag">${escapeHtml(s)}</span>`
            ).join('');
        }
        if (app.optional_subject) {
            subjectTags += `<span class="subj-tag fourth">৪র্থ: ${escapeHtml(app.optional_subject)}</span>`;
        }
        if (!subjectTags) subjectTags = '<span class="field value muted">—</span>';

        const instructionsHtml = INSTRUCTIONS.map((instr) =>
            `<li>${escapeHtml(instr)}</li>`
        ).join('');

        const checklistHtml = ADMIN_CHECKLIST.map(item => {
            const checked = (status === 'verified' || status === 'admitted') ? '✓' : '';
            return `<div class="check-item"><span class="checkbox">${checked}</span><span>${escapeHtml(item)}</span></div>`;
        }).join('');

        const rollFeeHtml = (status === 'admitted' && (app.roll_number || app.admission_fee))
            ? `<div class="roll-fee-box">
                <div><div class="rb-label">ROLL NUMBER</div><div class="rb-value">${val(app.roll_number)}</div></div>
                <div style="text-align:right;"><div class="rb-label">ADMISSION FEE</div><div class="rb-value">৳ ${val(app.admission_fee, '0')}</div></div>
            </div>`
            : '';

        const signatureHtml = `
            <div class="signature-row">
                <div class="sig-item">
                    <div class="sig-line"></div>
                    <div class="sig-label">Applicant's Signature</div>
                    <div class="sig-date">Date: ____/____/______</div>
                </div>
                <div class="sig-item">
                    <div class="sig-line"></div>
                    <div class="sig-label">Principal's Signature</div>
                    <div class="seal-box">[ COLLEGE SEAL ]</div>
                </div>
            </div>
        `;

        const adminRibbon = isAdmin
            ? '<div class="admin-copy-ribbon">⚠ OFFICE COPY — NOT FOR STUDENT</div>'
            : '';

        const pageNum = pageInfo ? pageInfo.current : 1;
        const totalPages = pageInfo ? pageInfo.total : 1;

        return `
        <div class="a4-page ${isAdmin ? 'admin-mode' : ''}">
            <div class="watermark">
                ${isAdmin ? 'ADMIN<br>COPY' : escapeHtml(COLLEGE.name_en)}
            </div>

            <div class="page-inner">
                ${adminRibbon}

                <div class="print-header">
                    <div class="logo-wrap">
                        <img src="${COLLEGE.logo}" alt="Logo" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-graduation-cap\\' style=\\'font-size:24pt;color:#0a1655;\\'></i>'">
                    </div>
                    <div class="header-info">
                        <h1>${escapeHtml(COLLEGE.name_en)}</h1>
                        <div class="name-bn">${escapeHtml(COLLEGE.name_bn)}</div>
                        <div class="meta">
                            ${escapeHtml(COLLEGE.location_en)} · EIIN: ${COLLEGE.eiin} · Est. ${COLLEGE.established}
                        </div>
                        <div class="title-badge">
                            ${isAdmin ? 'ADMISSION APPLICATION — OFFICE COPY' : 'ONLINE ADMISSION APPLICATION'}
                        </div>
                    </div>
                </div>

                <div class="info-row">
                    <div class="app-id-box">
                        <div class="label">APPLICATION ID</div>
                        <div class="value">${val(app.application_id)}</div>
                        <div class="date">Submitted: ${formatDateTime(app.submitted_at)}</div>
                        <span class="status-badge ${status}">STATUS: ${statusLabel}</span>
                    </div>
                    <div class="photo-box">${photoHtml}</div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">01</span>
                        <span class="section-title">STUDENT INFORMATION</span>
                    </div>
                    <div class="section-body">
                        <div class="field-row">
                            <div class="field"><div class="label">Name (English)</div><div class="value">${val(app.name_en)}</div></div>
                            <div class="field"><div class="label">নাম (বাংলা)</div><div class="value">${val(app.name_bn)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Gender</div><div class="value">${val(app.gender)}</div></div>
                            <div class="field"><div class="label">Phone</div><div class="value">${val(app.phone)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Birth Date</div><div class="value">${formatDate(app.birth_date)}</div></div>
                            <div class="field"><div class="label">Religion</div><div class="value">${val(app.religion)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Blood Group</div><div class="value">${val(app.blood_group)}</div></div>
                            <div class="field"><div class="label">UID</div><div class="value">${val(app.uid_number)}</div></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">02</span>
                        <span class="section-title">ADDRESS</span>
                    </div>
                    <div class="section-body">
                        <div class="field-row">
                            <div class="field"><div class="label">Village</div><div class="value">${val(app.village)}</div></div>
                            <div class="field"><div class="label">Union</div><div class="value">${val(app.union_name)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Upazila</div><div class="value">${val(app.upazila)}</div></div>
                            <div class="field"><div class="label">District</div><div class="value">${val(app.district)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Post Office</div><div class="value">${val(app.post_office)}</div></div>
                            <div class="field"><div class="label">Post Code</div><div class="value">${val(app.post_code)}</div></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">03</span>
                        <span class="section-title">PARENT INFORMATION</span>
                    </div>
                    <div class="section-body">
                        <div class="field-row">
                            <div class="field"><div class="label">পিতার নাম</div><div class="value">${val(app.father_name_bn)}</div></div>
                            <div class="field"><div class="label">মাতার নাম</div><div class="value">${val(app.mother_name_bn)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Father's Phone</div><div class="value">${val(app.father_phone)}</div></div>
                            <div class="field"><div class="label">Mother's Phone</div><div class="value">${val(app.mother_phone)}</div></div>
                        </div>
                        ${app.guardian_name ? `
                        <div class="field-row">
                            <div class="field"><div class="label">Guardian</div><div class="value">${val(app.guardian_name)}</div></div>
                            <div class="field"><div class="label">Guardian Phone</div><div class="value">${val(app.guardian_phone)}</div></div>
                        </div>` : ''}
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">04</span>
                        <span class="section-title">ADMISSION DETAILS</span>
                    </div>
                    <div class="section-body">
                        <div class="field-row">
                            <div class="field"><div class="label">Class</div><div class="value">${val(app.class_name)}</div></div>
                            <div class="field"><div class="label">Level</div><div class="value">${escapeHtml(levelLabel)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">${escapeHtml(groupLabel)}</div><div class="value">${escapeHtml(getGroupDisplay(app.group_name))}</div></div>
                            <div class="field"><div class="label">4th Subject</div><div class="value">${val(app.optional_subject)}</div></div>
                        </div>
                        <div class="field-row full">
                            <div class="field"><div class="label">Admission Date · Session</div><div class="value">${formatDate(app.admission_date)} · ${val(app.admission_session)}</div></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">05</span>
                        <span class="section-title">SUBJECTS</span>
                    </div>
                    <div class="section-body">
                        <div class="field">
                            <div class="label">Selected Subjects</div>
                            <div class="subjects-wrap">${subjectTags}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">
                        <span class="section-num">06</span>
                        <span class="section-title">PREVIOUS EXAM RESULT</span>
                    </div>
                    <div class="section-body">
                        <div class="field-row">
                            <div class="field"><div class="label">Exam Name</div><div class="value">${val(app.prev_exam_name)}</div></div>
                            <div class="field"><div class="label">Roll No</div><div class="value">${val(app.prev_roll_no)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Result</div><div class="value">${val(app.prev_result)}</div></div>
                            <div class="field"><div class="label">Passing Year</div><div class="value">${val(app.prev_passing_year)}</div></div>
                        </div>
                        <div class="field-row">
                            <div class="field"><div class="label">Board</div><div class="value">${val(app.prev_board)}</div></div>
                            <div class="field"><div class="label">School</div><div class="value">${val(app.prev_school_name)}</div></div>
                        </div>
                    </div>
                </div>

                ${rollFeeHtml}

                ${isAdmin ? `
                <div class="admin-checklist">
                    <h3>OFFICE VERIFICATION</h3>
                    ${checklistHtml}
                    ${app.status_notes ? `<div style="margin-top:3mm;padding-top:3mm;border-top:1px dashed #fca5a5;"><div class="label" style="font-size:7pt;color:#92400e;font-weight:700;">NOTES:</div><div style="font-size:8.5pt;color:#78350f;margin-top:1mm;">${escapeHtml(app.status_notes)}</div></div>` : ''}
                </div>
                ` : `
                <div class="instructions-box">
                    <h3>⚠ IMPORTANT INSTRUCTIONS</h3>
                    <ol>${instructionsHtml}</ol>
                </div>
                `}

                ${signatureHtml}

                <div class="print-footer">
                    <span>${val(app.application_id)}${isAdmin ? ' · ADMIN COPY' : ''}</span>
                    <span class="website">${escapeHtml(COLLEGE.website)}</span>
                    <span>Page ${pageNum} of ${totalPages}</span>
                </div>
            </div>
        </div>
        `;
    }

    function renderSingle(app, mode) {
        const html = buildPrintPage(app, mode, { current: 1, total: 1 });
        document.getElementById('printRoot').innerHTML = html;
        document.getElementById('printRoot').style.display = 'block';
    }

    function renderBulk(apps, mode) {
        const total = apps.length;
        let html = '';
        apps.forEach((app, i) => {
            html += buildPrintPage(app, mode, { current: i + 1, total: total });
        });
        document.getElementById('printRoot').innerHTML = html;
        document.getElementById('printRoot').style.display = 'block';
        document.title = `${total} Applications | Print - Fulbariya College`;
    }

    function showError(msg) {
        document.getElementById('loadingOverlay').classList.add('hide');
        document.getElementById('errorBox').style.display = 'block';
        if (msg) document.getElementById('errorMsg').textContent = msg;
    }

    function showToolbar() {
        document.getElementById('toolbar').style.display = 'flex';
    }

    function hideLoader() {
        document.getElementById('loadingOverlay').classList.add('hide');
    }

    function setupAutoPrint() {
        const autoPrint = getParam('auto');
        if (autoPrint === '1') {
            setTimeout(() => window.print(), 1000);
        }
    }

    function setupPrintButton() {
        const btn = document.getElementById('printBtn');
        if (btn) {
            btn.addEventListener('click', () => window.print());
        }
    }

    async function init() {
        console.log('🚀 Admission Print View v1.1 loading...');

        const singleId = getParam('id');
        const bulkIds = getParam('ids');
        const mode = getParam('mode') || 'student';

        if (!singleId && !bulkIds) {
            showError('Application ID missing. Use ?id=... or ?ids=...');
            return;
        }

        const isBulk = !!bulkIds;

        try {
            await new Promise(resolve => waitForSupabase(resolve));

            if (isBulk) {
                const ids = bulkIds.split(',').map(s => s.trim()).filter(Boolean);

                if (ids.length === 0) {
                    showError('No valid application IDs found in ?ids=');
                    return;
                }

                if (ids.length > MAX_BULK) {
                    showError(`Too many applications. Maximum ${MAX_BULK} allowed per bulk print.`);
                    return;
                }

                console.log('📋 Bulk mode:', ids.length, 'applications | Mode:', mode);

                const apps = await fetchBulkApplications(ids);
                console.log('✅ Loaded:', apps.length, 'applications');

                if (apps.length === 0) {
                    showError('কোনো application পাওয়া যায়নি।');
                    return;
                }

                renderBulk(apps, mode);
                hideLoader();
                showToolbar();
                setupPrintButton();
                setupAutoPrint();

            } else {
                console.log('📋 Single mode:', singleId, '| Mode:', mode);

                const app = await fetchApplication(singleId);
                console.log('✅ Application loaded:', app.application_id);

                renderSingle(app, mode);
                hideLoader();
                showToolbar();
                setupPrintButton();
                setupAutoPrint();

                document.title = `${app.application_id} | Print - Fulbariya College`;
            }

        } catch (err) {
            console.error('❌ Error:', err);
            showError(err.message || 'Application load করা যায়নি।');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Admission Print View v1.1 loaded');
})();