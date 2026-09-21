/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION STATUS CHECK
 * Location: js/admission-status.js
 * Version: v3.0 — Group_name Fixed
 * 
 * ✅ Changes in v3.0:
 *    - BM trade group_name থেকে read করে
 *    - admin_notes-এ আর trade string নেই
 * =========================================================
 */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    let currentData = null;

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
        } catch (e) {
            return dateStr;
        }
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
        } catch (e) {
            return dateStr;
        }
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

    function showError(msg) {
        $('errorText').innerHTML = msg;
        $('errorAlert').classList.add('show');
        $('resultCard').classList.remove('show');
    }

    function hideError() {
        $('errorAlert').classList.remove('show');
    }

    function showLoading() {
        $('loadingInline').classList.add('show');
        $('resultCard').classList.remove('show');
        hideError();
    }

    function hideLoading() {
        $('loadingInline').classList.remove('show');
    }

    async function searchApplication() {
        const appId = ($('inputAppId')?.value || '').trim().toUpperCase();
        const phone = ($('inputPhone')?.value || '').trim();

        if (!appId) return window.fdcWarning('Application ID দিন');
        if (!phone) return window.fdcWarning('Phone নম্বর দিন');
        if (!/^01[3-9]\d{8}$/.test(phone)) {
            return window.fdcWarning('সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)');
        }

        const btn = $('btnSearch');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> খোঁজা হচ্ছে...';

        hideError();
        showLoading();

        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .select('*')
                .eq('application_id', appId)
                .eq('phone', phone)
                .maybeSingle();

            if (error) throw error;

            hideLoading();

            if (!data) {
                showError(
                    '<strong>আবেদন পাওয়া যায়নি</strong><br>' +
                    'Application ID এবং Phone নম্বর সঠিক কিনা যাচাই করুন।<br>' +
                    'দুটোই সঠিক হলে কলেজ অফিসে যোগাযোগ করুন।'
                );
                return;
            }

            currentData = data;
            renderResult(data);

        } catch (err) {
            console.error('Search error:', err);
            hideLoading();
            showError('সমস্যা হয়েছে: ' + escapeHtml(err.message));
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function renderResult(data) {
        const status = (data.status || 'pending').toLowerCase();

        const statusMap = {
            pending: {
                class: 'pending',
                icon: 'fa-hourglass-half',
                label: 'PENDING',
                title: 'আপনার আবেদন যাচাই করা হচ্ছে'
            },
            verified: {
                class: 'verified',
                icon: 'fa-check-circle',
                label: 'VERIFIED',
                title: 'আপনার আবেদন যাচাই সম্পন্ন'
            },
            admitted: {
                class: 'admitted',
                icon: 'fa-trophy',
                label: 'ADMITTED',
                title: '🎉 অভিনন্দন! ভর্তি সম্পন্ন'
            },
            cancelled: {
                class: 'cancelled',
                icon: 'fa-ban',
                label: 'CANCELLED',
                title: 'আবেদন বাতিল'
            }
        };

        const sm = statusMap[status] || statusMap.pending;

        const header = $('resultHeader');
        header.className = 'result-header ' + sm.class;
        $('rhIcon').innerHTML = `<i class="fas ${sm.icon}"></i>`;
        $('rhStatus').textContent = sm.label;
        $('rhTitle').textContent = sm.title;
        $('rhAppId').textContent = data.application_id || '—';

        const statusMessage = getStatusMessage(data);

        let groupLabel = 'Group';
        let groupValue = data.group_name || '—';
        if (data.branch === 'BM') {
            groupLabel = 'Trade';
            groupValue = data.group_name || '—';
        } else if (data.branch === 'Honours') {
            groupLabel = 'Department';
            groupValue = data.department || '—';
        }

        const bodyHtml = `
            ${statusMessage}

            <div class="result-section">
                <h4><i class="fas fa-user"></i> শিক্ষার্থীর তথ্য</h4>
                <div class="result-grid">
                    <div class="result-field">
                        <div class="rf-label">নাম (English)</div>
                        <div class="rf-value">${escapeHtml(data.name_en || '—')}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">নাম (বাংলা)</div>
                        <div class="rf-value">${escapeHtml(data.name_bn || '—')}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">Phone</div>
                        <div class="rf-value">${escapeHtml(data.phone || '—')}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">Gender</div>
                        <div class="rf-value">${escapeHtml(data.gender || '—')}</div>
                    </div>
                </div>
            </div>

            <div class="result-section">
                <h4><i class="fas fa-graduation-cap"></i> ভর্তির তথ্য</h4>
                <div class="result-grid">
                    <div class="result-field">
                        <div class="rf-label">Class</div>
                        <div class="rf-value">${escapeHtml(data.class_name || '—')}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">${groupLabel}</div>
                        <div class="rf-value">${escapeHtml(groupValue)}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">Session</div>
                        <div class="rf-value">${escapeHtml(data.admission_session || '—')}</div>
                    </div>
                    <div class="result-field">
                        <div class="rf-label">Branch</div>
                        <div class="rf-value">${escapeHtml(data.branch || '—')}</div>
                    </div>
                    ${data.roll_number ? `
                        <div class="result-field">
                            <div class="rf-label">Roll Number</div>
                            <div class="rf-value" style="color:#10b981;font-size:16px;">${escapeHtml(data.roll_number)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="result-section">
                <h4><i class="fas fa-history"></i> আবেদনের অবস্থা</h4>
                <div class="timeline">
                    <div class="timeline-item done">
                        <div class="timeline-icon"><i class="fas fa-check"></i></div>
                        <div class="timeline-content">
                            <h5>আবেদন জমা</h5>
                            <p>${formatDateTime(data.submitted_at)}</p>
                        </div>
                    </div>
                    <div class="timeline-item ${status === 'verified' || status === 'admitted' ? 'done' : ''}">
                        <div class="timeline-icon"><i class="fas fa-search"></i></div>
                        <div class="timeline-content">
                            <h5>তথ্য যাচাই</h5>
                            <p>${status === 'pending' ? 'অপেক্ষমাণ...' : (data.reviewed_at ? formatDateTime(data.reviewed_at) : 'সম্পন্ন')}</p>
                        </div>
                    </div>
                    <div class="timeline-item ${status === 'admitted' ? 'done' : ''}">
                        <div class="timeline-icon"><i class="fas fa-trophy"></i></div>
                        <div class="timeline-content">
                            <h5>ভর্তি সম্পন্ন</h5>
                            <p>${status === 'admitted' ? (data.admitted_at ? formatDateTime(data.admitted_at) : 'সম্পন্ন') : 'অপেক্ষমাণ'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('resultBody').innerHTML = bodyHtml;

        const actionsHtml = `
            <button class="btn-download-pdf" id="btnDownloadPdf">
                <i class="fas fa-file-pdf"></i> PDF Download
            </button>
            <button class="btn-new-search" id="btnNewSearch">
                <i class="fas fa-redo"></i> নতুন খোঁজ
            </button>
            <a href="../../index.html" class="btn-home">
                <i class="fas fa-home"></i> Home
            </a>
        `;
        $('resultActions').innerHTML = actionsHtml;

        $('btnDownloadPdf').addEventListener('click', () => downloadPdf(data));
        $('btnNewSearch').addEventListener('click', resetSearch);

        $('resultCard').classList.add('show');
        setTimeout(() => {
            $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    function getStatusMessage(data) {
        const status = (data.status || 'pending').toLowerCase();

        if (status === 'pending') {
            return `
                <div class="status-message-box pending-box">
                    <div class="smb-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="smb-content">
                        <h3>⏳ আপনার আবেদন যাচাই করা হচ্ছে</h3>
                        <p>
                            আপনার আবেদন সফলভাবে জমা হয়েছে। কলেজ কর্তৃপক্ষ এখন 
                            আপনার তথ্য যাচাই করছে। সাধারণত ২-৩ কর্মদিবসের মধ্যে 
                            যাচাই সম্পন্ন হয়।
                        </p>
                        <p style="margin-top:10px;font-size:12.5px;opacity:0.85;">
                            <i class="fas fa-info-circle"></i> 
                            আবেদনের অবস্থা যেকোনো সময় এই পেজে চেক করতে পারবেন।
                        </p>
                    </div>
                </div>
            `;
        }

        if (status === 'verified') {
            return `
                <div class="status-message-box verified-box">
                    <div class="smb-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="smb-content">
                        <h3>✅ আপনার আবেদন যাচাই সম্পন্ন</h3>
                        <p>
                            অভিনন্দন! আপনার আবেদনের সব তথ্য যাচাই করা হয়েছে। 
                            এখন কলেজ অফিসে এসে ভর্তির আনুষ্ঠানিকতা সম্পন্ন করুন।
                        </p>
                        <div class="smb-checklist">
                            <strong>📋 যা যা নিয়ে আসবেন:</strong>
                            <ul>
                                <li>SSC-এর মূল মার্কশিট ও সার্টিফিকেট</li>
                                <li>জন্ম নিবন্ধন কার্ড (মূল কপি)</li>
                                <li>পাসপোর্ট সাইজের ছবি (৩ কপি)</li>
                                <li>ভর্তির ফি</li>
                            </ul>
                        </div>
                        <div class="smb-contact">
                            <div><i class="fas fa-phone"></i> ০৮৭২০৫০৫৬৮</div>
                            <div><i class="fas fa-clock"></i> রবি-বৃহস্পতি, ৯টা-৪টা</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (status === 'admitted') {
            return `
                <div class="status-message-box admitted-box">
                    <div class="smb-icon"><i class="fas fa-trophy"></i></div>
                    <div class="smb-content">
                        <h3>🎉 অভিনন্দন! আপনি ভর্তি হয়েছেন</h3>
                        <p>
                            আপনি সফলভাবে ফুলবাড়ীয়া কলেজে ভর্তি হয়েছেন। 
                            আপনার শিক্ষা জীবন শুভ হোক!
                        </p>
                        ${data.roll_number ? `
                            <div class="smb-highlight">
                                <div class="smbh-label">আপনার Roll Number</div>
                                <div class="smbh-value">${escapeHtml(data.roll_number)}</div>
                            </div>
                        ` : ''}
                        <div class="smb-contact">
                            <div><i class="fas fa-phone"></i> ০৮৭২০৫০৫৬৮</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (status === 'cancelled') {
            return `
                <div class="status-message-box cancelled-box">
                    <div class="smb-icon"><i class="fas fa-ban"></i></div>
                    <div class="smb-content">
                        <h3>আবেদন বাতিল</h3>
                        <p>
                            আপনার আবেদন বাতিল করা হয়েছে।
                            ${data.status_notes ? '<br><br><strong>কারণ:</strong> ' + escapeHtml(data.status_notes) : ''}
                        </p>
                        <div class="smb-contact">
                            <div><i class="fas fa-phone"></i> ০৮৭২০৫০৫৬৮</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    function downloadPdf(data) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            doc.setFillColor(10, 22, 85);
            doc.rect(0, 0, 210, 32, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Fulbariya College', 105, 12, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('Fulbariya, Mymensingh', 105, 19, { align: 'center' });

            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('APPLICATION STATUS', 105, 27, { align: 'center' });

            doc.setFillColor(239, 246, 255);
            doc.rect(15, 40, 180, 16, 'F');
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.5);
            doc.rect(15, 40, 180, 16);

            doc.setTextColor(10, 22, 85);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Application ID:', 20, 46);
            doc.setTextColor(220, 38, 38);
            doc.setFontSize(13);
            doc.text(data.application_id || '—', 20, 53);

            doc.setTextColor(107, 114, 128);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Printed: ' + new Date().toLocaleString('en-GB'), 195, 53, { align: 'right' });

            let y = 66;

            function addSection(title) {
                if (y > 265) { doc.addPage(); y = 20; }
                doc.setFillColor(6, 182, 212);
                doc.rect(15, y, 180, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 18, y + 5.5);
                y += 12;
            }

            function addField(label, value, xPos) {
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(label, xPos, y);

                doc.setTextColor(31, 41, 55);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                const val = value ? String(value) : '—';
                doc.text(val.substring(0, 40), xPos, y + 5);
            }

            function addRow(f1, v1, f2, v2) {
                if (y > 275) { doc.addPage(); y = 20; }
                addField(f1, v1, 18);
                if (f2) addField(f2, v2, 108);
                y += 11;
            }

            addSection('Student Information');
            addRow('Name (English)', data.name_en, 'Name (Bangla)', data.name_bn);
            addRow('Phone', data.phone, 'Gender', data.gender);
            addRow('Email', data.email, 'Birth Date', data.birth_date);
            y += 3;

            addSection('Admission Information');
            addRow('Class', data.class_name, 'Branch', data.branch);
            let gLabel = 'Group';
            let gValue = data.group_name;
            if (data.branch === 'BM') { gLabel = 'Trade'; gValue = data.group_name || '—'; }
            addRow(gLabel, gValue, 'Session', data.admission_session);
            if (data.roll_number) addRow('Roll Number', data.roll_number, '', '');
            y += 3;

            addSection('Application Status');
            addRow('Status', (data.status || 'pending').toUpperCase(), 'Submitted', formatDateTime(data.submitted_at));
            if (data.reviewed_at) addRow('Verified', formatDateTime(data.reviewed_at), '', '');
            if (data.admitted_at) addRow('Admitted', formatDateTime(data.admitted_at), '', '');

            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFillColor(31, 41, 55);
                doc.rect(0, 287, 210, 10, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `Fulbariya College | Application ID: ${data.application_id}`,
                    105, 293, { align: 'center' }
                );
            }

            doc.save(`Status_${data.application_id}.pdf`);
            console.log('✅ PDF downloaded');

        } catch (err) {
            console.error('PDF error:', err);
            window.fdcError('PDF তৈরি করা যায়নি: ' + err.message);
        }
    }

    function resetSearch() {
        $('inputAppId').value = '';
        $('inputPhone').value = '';
        $('resultCard').classList.remove('show');
        hideError();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => $('inputAppId').focus(), 400);
    }

    function init() {
        console.log('🚀 Admission Status v3.0 loading...');

        const yearEl = $('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        $('btnSearch')?.addEventListener('click', searchApplication);

        $('inputAppId')?.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                $('inputPhone').focus();
            }
        });
        $('inputPhone')?.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchApplication();
            }
        });

        $('inputAppId')?.addEventListener('input', function () {
            this.value = this.value.toUpperCase();
        });

        setTimeout(() => $('inputAppId')?.focus(), 300);

        console.log('✅ Admission Status v3.0 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();