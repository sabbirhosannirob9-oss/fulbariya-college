/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION STATUS CHECK
 * Location: js/admission-status.js
 * Version: v3.0 — Print to PDF (jsPDF removed)
 * 
 * Usage:
 *   Print view: admission-print.html?id=FDC-...&mode=student&auto=1
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // CONFIG
    // =========================================================
    const PRINT_URL = 'admission-print.html';

    const STATUS_MESSAGES = {
        pending: {
            title: 'আবেদন যাচাই করা হচ্ছে',
            message: 'আপনার আবেদন পেয়েছি। যাচাই চলছে — অনুগ্রহ করে অপেক্ষা করুন।',
            icon: 'fa-hourglass-half',
            headerClass: 'pending'
        },
        verified: {
            title: 'যাচাই সম্পন্ন',
            message: 'আপনার আবেদনের কাগজপত্র যাচাই হয়েছে। এখন কলেজে আসুন ভর্তি সম্পন্ন করতে।',
            icon: 'fa-check-circle',
            headerClass: 'verified'
        },
        admitted: {
            title: '🎉 ভর্তি সম্পন্ন',
            message: 'অভিনন্দন! আপনি সফলভাবে ভর্তি হয়েছেন। নিচে আপনার Roll Number ও অন্যান্য তথ্য দেখুন।',
            icon: 'fa-trophy',
            headerClass: 'admitted'
        },
        cancelled: {
            title: 'আবেদন বাতিল',
            message: 'আপনার আবেদন বাতিল করা হয়েছে। বিস্তারিত জানতে কলেজ অফিসে যোগাযোগ করুন।',
            icon: 'fa-ban',
            headerClass: 'cancelled'
        }
    };

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
            const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                           'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
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
    // SEARCH APPLICATION
    // =========================================================
    async function searchApplication(appId, phone) {
        const supabase = window.FDC_SUPABASE;
        if (!supabase) throw new Error('Supabase not ready');

        // Normalize inputs
        const cleanAppId = String(appId).trim().toUpperCase();
        const cleanPhone = String(phone).trim();

        const { data, error } = await supabase
            .from('admission_applications')
            .select('*')
            .eq('application_id', cleanAppId)
            .eq('phone', cleanPhone)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            throw new Error('এই Application ID এবং Phone দিয়ে কোনো আবেদন পাওয়া যায়নি। তথ্য সঠিকভাবে দিন।');
        }
        return data;
    }

    // =========================================================
    // SHOW ERROR
    // =========================================================
    function showError(msg) {
        const errorAlert = $('errorAlert');
        const errorText = $('errorText');
        if (errorAlert && errorText) {
            errorText.textContent = msg;
            errorAlert.classList.add('show');
        }
        $('resultCard').classList.remove('show');
    }

    function hideError() {
        $('errorAlert').classList.remove('show');
    }

    function showLoading(show) {
        $('loadingInline').classList.toggle('show', show);
    }

    // =========================================================
    // RENDER RESULT
    // =========================================================
    function renderResult(app) {
        const status = (app.status || 'pending').toLowerCase();
        const statusConfig = STATUS_MESSAGES[status] || STATUS_MESSAGES.pending;

        // Header
        $('resultHeader').className = 'result-header ' + statusConfig.headerClass;
        $('rhIcon').innerHTML = `<i class="fas ${statusConfig.icon}"></i>`;
        $('rhStatus').textContent = status.toUpperCase();
        $('rhTitle').textContent = statusConfig.title;
        $('rhAppId').textContent = app.application_id || '—';

        // Body content
        const levelLabel = app.application_type === 'HSC-BM' ? 'HSC-BM (BMT)' : 'HSC-General';
        const groupLabel = app.application_type === 'HSC-BM' ? 'Trade' : 'Group';

        // Status message box
        let statusBox = `
            <div class="status-message-box ${status}-box">
                <div class="smb-icon"><i class="fas ${statusConfig.icon}"></i></div>
                <div class="smb-content">
                    <h3>${escapeHtml(statusConfig.title)}</h3>
                    <p>${escapeHtml(statusConfig.message)}</p>
        `;

        // Extra info based on status
        if (status === 'pending') {
            statusBox += `
                <div class="smb-checklist">
                    <strong>পরবর্তী ধাপ:</strong>
                    <ul>
                        <li>আবেদনের তথ্য ও ছবি যাচাই করা হচ্ছে</li>
                        <li>যাচাই শেষ হলে Status: "Verified" হবে</li>
                        <li>তারপর কলেজে এসে মূল কাগজপত্র দেখাতে হবে</li>
                    </ul>
                </div>
            `;
        } else if (status === 'verified') {
            statusBox += `
                <div class="smb-checklist">
                    <strong>এখন যা করবেন:</strong>
                    <ul>
                        <li>SSC সার্টিফিকেট ও মার্কশিট (মূল কপি)</li>
                        <li>জন্ম নিবন্ধন / NID কার্ড</li>
                        <li>পাসপোর্ট সাইজ ছবি (২ কপি)</li>
                        <li>অভিভাবকের সাথে কলেজ অফিসে আসুন</li>
                    </ul>
                </div>
            `;
        } else if (status === 'admitted') {
            statusBox += `
                <div class="smb-highlight">
                    <div class="smbh-label">ROLL NUMBER</div>
                    <div class="smbh-value">${escapeHtml(app.roll_number || '—')}</div>
                </div>
            `;
            if (app.admission_fee) {
                statusBox += `
                    <div class="smb-checklist">
                        <strong>ভর্তি তথ্য:</strong>
                        <ul>
                            <li>Admission Fee: ৳ ${escapeHtml(app.admission_fee)}</li>
                            <li>Class: ${escapeHtml(app.class_name || '—')}</li>
                            <li>Session: ${escapeHtml(app.admission_session || '—')}</li>
                        </ul>
                    </div>
                `;
            }
        } else if (status === 'cancelled') {
            statusBox += `
                <div class="smb-contact">
                    <div><i class="fas fa-phone"></i> ০৮৭২০৫০৫৬৮</div>
                    <div><i class="fas fa-envelope"></i> contact@fulbariyacollege.edu.bd</div>
                </div>
            `;
        }

        statusBox += `
                </div>
            </div>
        `;

        // Details sections
        const detailsHtml = `
            <div class="result-section">
                <h4><i class="fas fa-user"></i> Student Information</h4>
                <div class="result-grid">
                    <div class="result-field"><div class="rf-label">Name (English)</div><div class="rf-value">${escapeHtml(app.name_en || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Name (Bangla)</div><div class="rf-value">${escapeHtml(app.name_bn || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Gender</div><div class="rf-value">${escapeHtml(app.gender || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Phone</div><div class="rf-value">${escapeHtml(app.phone || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Email</div><div class="rf-value">${escapeHtml(app.email || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Birth Date</div><div class="rf-value">${escapeHtml(app.birth_date || '—')}</div></div>
                </div>
            </div>

            <div class="result-section">
                <h4><i class="fas fa-graduation-cap"></i> Admission Information</h4>
                <div class="result-grid">
                    <div class="result-field"><div class="rf-label">Level</div><div class="rf-value">${escapeHtml(levelLabel)}</div></div>
                    <div class="result-field"><div class="rf-label">${escapeHtml(groupLabel)}</div><div class="rf-value">${escapeHtml(getGroupDisplay(app.group_name))}</div></div>
                    <div class="result-field"><div class="rf-label">Class</div><div class="rf-value">${escapeHtml(app.class_name || '—')}</div></div>
                    <div class="result-field"><div class="rf-label">Session</div><div class="rf-value">${escapeHtml(app.admission_session || '—')}</div></div>
                    ${app.roll_number ? `<div class="result-field"><div class="rf-label">Roll Number</div><div class="rf-value" style="color:#10b981;">${escapeHtml(app.roll_number)}</div></div>` : ''}
                    ${app.admission_fee ? `<div class="result-field"><div class="rf-label">Admission Fee</div><div class="rf-value">৳ ${escapeHtml(app.admission_fee)}</div></div>` : ''}
                </div>
            </div>

            <div class="result-section">
                <h4><i class="fas fa-history"></i> Timeline</h4>
                <div class="timeline">
                    <div class="timeline-item done">
                        <div class="timeline-icon"><i class="fas fa-check"></i></div>
                        <div class="timeline-content">
                            <h5>Application Submitted</h5>
                            <p>${formatDateTime(app.submitted_at)}</p>
                        </div>
                    </div>
                    ${app.reviewed_at ? `
                        <div class="timeline-item done">
                            <div class="timeline-icon"><i class="fas fa-check"></i></div>
                            <div class="timeline-content">
                                <h5>Verified</h5>
                                <p>${formatDateTime(app.reviewed_at)}</p>
                            </div>
                        </div>
                    ` : ''}
                    ${app.admitted_at ? `
                        <div class="timeline-item done">
                            <div class="timeline-icon"><i class="fas fa-check"></i></div>
                            <div class="timeline-content">
                                <h5>Admitted</h5>
                                <p>${formatDateTime(app.admitted_at)}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        $('resultBody').innerHTML = statusBox + detailsHtml;

        // Actions — Print button
        $('resultActions').innerHTML = `
            <button class="btn-download-pdf" id="btnDownloadPdf">
                <i class="fas fa-print"></i> Print / Save as PDF
            </button>
            <button class="btn-new-search" id="btnNewSearch">
                <i class="fas fa-redo"></i> নতুন খোঁজ
            </button>
            <a href="../../index.html" class="btn-home">
                <i class="fas fa-home"></i> Home
            </a>
        `;

        // Store current app
        window._currentApp = app;

        // Attach actions
        $('btnDownloadPdf')?.addEventListener('click', openPrintView);
        $('btnNewSearch')?.addEventListener('click', resetSearch);
    }

    // =========================================================
    // OPEN PRINT VIEW (v3.0)
    // =========================================================
    function openPrintView() {
        const app = window._currentApp;
        if (!app || !app.application_id) {
            window.fdcError && window.fdcError('তথ্য পাওয়া যায়নি');
            return;
        }

        const url = `${PRINT_URL}?id=${encodeURIComponent(app.application_id)}&mode=student&auto=1`;

        console.log('🖨️ Opening print view:', url);

        const win = window.open(url, '_blank');

        if (!win || win.closed || typeof win.closed === 'undefined') {
            if (window.fdcWarning) {
                window.fdcWarning(
                    'Print view খুলতে পারছি না। Pop-up blocker বন্ধ করুন:<br><br>' +
                    `<a href="${url}" target="_blank" style="color:#0a1655;font-weight:700;word-break:break-all;">Print view খুলুন</a>`
                );
            } else {
                alert('Print view খুলতে পারছি না। Pop-up blocker বন্ধ করুন।');
            }
        }
    }

    // =========================================================
    // RESET SEARCH
    // =========================================================
    function resetSearch() {
        $('inputAppId').value = '';
        $('inputPhone').value = '';
        $('resultCard').classList.remove('show');
        hideError();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => $('inputAppId').focus(), 500);
    }

    // =========================================================
    // SEARCH HANDLER
    // =========================================================
    async function handleSearch() {
        const appId = ($('inputAppId')?.value || '').trim();
        const phone = ($('inputPhone')?.value || '').trim();

        hideError();

        if (!appId) {
            showError('Application ID দিন');
            return;
        }

        if (!phone) {
            showError('Phone Number দিন');
            return;
        }

        if (!/^01[3-9]\d{8}$/.test(phone)) {
            showError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন');
            return;
        }

        const btn = $('btnSearch');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> খোঁজা হচ্ছে...';
        showLoading(true);
        $('resultCard').classList.remove('show');

        try {
            const app = await searchApplication(appId, phone);
            renderResult(app);
            $('resultCard').classList.add('show');
            setTimeout(() => {
                $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        } catch (err) {
            console.error('Search error:', err);
            showError(err.message || 'খোঁজা যায়নি। আবার চেষ্টা করুন।');
        } finally {
            showLoading(false);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admission Status v3.0 (Print to PDF) loading...');

        const yearEl = $('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        // Search button
        $('btnSearch')?.addEventListener('click', handleSearch);

        // Enter key on inputs
        $('inputAppId')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        $('inputPhone')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSearch();
        });

        // Auto-uppercase App ID
        $('inputAppId')?.addEventListener('input', function () {
            const pos = this.selectionStart;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(pos, pos);
        });

        // Numeric only for phone
        $('inputPhone')?.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 11);
        });

        // Auto-search if URL has params (?id=...&phone=...)
        const params = new URLSearchParams(window.location.search);
        const autoId = params.get('id');
        const autoPhone = params.get('phone');
        if (autoId && autoPhone) {
            $('inputAppId').value = autoId;
            $('inputPhone').value = autoPhone;
            setTimeout(handleSearch, 800);
        }

        console.log('✅ Admission Status v3.0 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Admission Status v3.0 loaded');
})();