/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN PROMOTE HISTORY
 * Location: js/admin-promote-history.js
 * Depends: config.js, supabase.js, auth.js, admin-popup.js,
 *          promote-utils.js, promote-restore.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allBatches = [];
    let filteredBatches = [];
    let currentBatch = null;
    let isProcessing = false;

    // =========================================================
    // DOM HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

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
            const day = d.getDate();
            const months = ['জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                            'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];
            const month = months[d.getMonth()];
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${month} ${year}, ${hours}:${minutes}`;
        } catch (e) {
            return dateStr;
        }
    }

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // LOAD ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const avatar = document.querySelector('[data-admin-avatar]');
                if (avatar) {
                    if (result.admin.image_url) {
                        avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    } else {
                        avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                    }
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    // =========================================================
    // LOAD YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -3; i <= 3; i++) years.push(currentYear + i);

        const el = $('filterSourceYear');
        if (!el) return;
        el.innerHTML = '<option value="">All Years</option>';
        years.forEach(y => {
            el.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
        });
    }

    // =========================================================
    // LOAD ALL BATCHES
    // =========================================================
    async function loadBatches() {
        const listWrap = $('batchList');
        const emptyState = $('emptyState');
        const batchListWrap = $('batchListWrap');

        listWrap.innerHTML = `
            <div style="padding:30px;text-align:center;color:var(--grey);">
                <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                <div style="margin-top:10px;font-size:13px;">History লোড হচ্ছে...</div>
            </div>
        `;

        try {
            const batches = await window.FDCPromoteRestore.loadBatchHistory(100);

            allBatches = batches || [];

            if (allBatches.length === 0) {
                batchListWrap.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            batchListWrap.style.display = 'block';
            emptyState.style.display = 'none';

            applyFilters();

        } catch (e) {
            console.error('Load batches error:', e);
            listWrap.innerHTML = `
                <div style="padding:30px;text-align:center;color:var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size:24px;"></i>
                    <div style="margin-top:10px;font-size:13px;">লোড করা যায়নি: ${escapeHtml(e.message)}</div>
                </div>
            `;
        }
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function applyFilters() {
        const fSourceClass = $('filterSourceClass').value;
        const fSourceYear = $('filterSourceYear').value;
        const fBranch = $('filterBranch').value;
        const fStatus = $('filterStatus').value;

        filteredBatches = allBatches.filter(b => {
            if (fSourceClass && b.source_class !== fSourceClass) return false;
            if (fSourceYear && b.source_year !== fSourceYear) return false;
            if (fBranch && b.source_branch !== fBranch) return false;
            if (fStatus && b.status !== fStatus) return false;
            return true;
        });

        renderBatchList();
    }

    // =========================================================
    // RENDER BATCH LIST
    // =========================================================
    function renderBatchList() {
        const list = $('batchList');

        if (filteredBatches.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding:40px 20px;">
                    <div class="icon-wrap"><i class="fas fa-search"></i></div>
                    <h6>ফিল্টার অনুযায়ী কিছু পাওয়া যায়নি</h6>
                    <p>ফিল্টার পরিবর্তন করুন</p>
                </div>
            `;
            return;
        }

        let html = '';
        filteredBatches.forEach((b, i) => {
            const statusClass = b.status === 'completed' ? 'completed' :
                               b.status === 'rolled_back' ? 'rolled_back' : 'failed';
            const statusLabel = b.status === 'completed' ? '✓ Completed' :
                               b.status === 'rolled_back' ? '↺ Rolled Back' : '✗ Failed';
            const canRestore = b.status === 'completed';

            html += `
                <div class="batch-item" data-batch="${b.batch_id}">
                    <span class="bi-num">${i + 1}</span>

                    <div class="bi-source">
                        <strong>Class ${escapeHtml(b.source_class)}</strong>
                        <small>Year ${escapeHtml(b.source_year)} · ${escapeHtml(b.source_branch || 'All')}</small>
                    </div>

                    <div class="bi-target">
                        <strong>Class ${escapeHtml(b.target_class)}</strong>
                        <small>Year ${escapeHtml(b.target_year)}</small>
                    </div>

                    <div class="bi-date">
                        <strong>${formatDate(b.performed_at)}</strong>
                        <small>by ${escapeHtml(b.performed_by_name || 'Admin')}</small>
                    </div>

                    <div class="bi-count">
                        <div class="num">${b.promoted_count || 0}</div>
                        <div class="lbl">Promoted</div>
                    </div>

                    <div class="bi-count fail">
                        <div class="num fail">${b.failed_count || 0}</div>
                        <div class="lbl">Failed</div>
                    </div>

                    <div class="bi-actions">
                        <button class="action-btn view" data-action="view" data-batch="${b.batch_id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn restore" data-action="restore" data-batch="${b.batch_id}" title="Restore / Rollback" ${canRestore ? '' : 'disabled'}>
                            <i class="fas fa-undo"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    }

    // =========================================================
    // VIEW DETAILS
    // =========================================================
    async function viewBatchDetails(batchId) {
        try {
            const batch = allBatches.find(b => b.batch_id === batchId);
            if (!batch) {
                window.fdcWarning('Batch পাওয়া যায়নি।');
                return;
            }

            currentBatch = batch;

            $('detailModalSub').textContent = `Class ${batch.source_class} → Class ${batch.target_class} · ${formatDate(batch.performed_at)}`;
            $('detailModalBody').innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:30px;color:var(--navy);"></i>
                    <div style="margin-top:12px;color:var(--grey);font-size:13px;">Details লোড হচ্ছে...</div>
                </div>
            `;

            $('detailModal').classList.add('show');
            document.body.style.overflow = 'hidden';

            const details = await window.FDCPromoteRestore.loadBatchDetails(batchId);

            renderDetailsModal(batch, details);

        } catch (e) {
            console.error('View details error:', e);
            $('detailModalBody').innerHTML = `
                <div style="text-align:center;padding:30px;color:var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size:30px;"></i>
                    <p style="margin-top:12px;">লোড করা যায়নি: ${escapeHtml(e.message)}</p>
                </div>
            `;
        }
    }

    // =========================================================
    // RENDER DETAILS MODAL
    // =========================================================
    function renderDetailsModal(batch, details) {
        const statusClass = batch.status === 'completed' ? 'completed' :
                           batch.status === 'rolled_back' ? 'rolled_back' : 'failed';
        const statusLabel = batch.status === 'completed' ? '✓ Completed' :
                           batch.status === 'rolled_back' ? '↺ Rolled Back' : '✗ Failed';

        let studentsHtml = '';
        if (!details || details.length === 0) {
            studentsHtml = '<div style="text-align:center;padding:30px;color:var(--grey);">কোনো student details নেই</div>';
        } else {
            studentsHtml = `
                <table class="student-details-table">
                    <thead>
                        <tr>
                            <th>Roll</th>
                            <th>Name</th>
                            <th>GPA</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details.map(d => {
                            const statusBadge = d.result_status === 'pass' ? 'pass' :
                                              d.result_status === 'fail' ? 'fail' : 'no_result';
                            const statusLabel = d.result_status === 'pass' ? '✅ Pass' :
                                              d.result_status === 'fail' ? '❌ Fail' : '⚠️ No Result';
                            const gpaText = d.total_gpa !== null && d.total_gpa !== undefined
                                ? Number(d.total_gpa).toFixed(2) : '—';

                            return `
                                <tr>
                                    <td class="roll">${escapeHtml(d.student_roll || '—')}</td>
                                    <td class="name">${escapeHtml(d.student_name || '—')}</td>
                                    <td class="gpa">${gpaText}</td>
                                    <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        const html = `
            <div class="detail-stats">
                <div class="detail-stat">
                    <div class="num">${batch.total_students || 0}</div>
                    <div class="lbl">Total</div>
                </div>
                <div class="detail-stat pass">
                    <div class="num">${batch.promoted_count || 0}</div>
                    <div class="lbl">Promoted</div>
                </div>
                <div class="detail-stat fail">
                    <div class="num">${batch.failed_count || 0}</div>
                    <div class="lbl">Failed</div>
                </div>
                <div class="detail-stat warn">
                    <div class="num">${batch.no_result_count || 0}</div>
                    <div class="lbl">No Result</div>
                </div>
                <div class="detail-stat warn">
                    <div class="num">${batch.target_deleted_count || 0}</div>
                    <div class="lbl">Target Deleted</div>
                </div>
            </div>

            <div style="background:#fafbff;border-radius:12px;padding:16px;margin-bottom:20px;border:1px solid var(--border-light);">
                <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:12.5px;">
                    <strong style="color:var(--navy);">Batch ID:</strong>
                    <span style="font-family:'Courier New',monospace;font-size:11.5px;word-break:break-all;">${escapeHtml(batch.batch_id)}</span>

                    <strong style="color:var(--navy);">Source:</strong>
                    <span>Class ${escapeHtml(batch.source_class)} / Year ${escapeHtml(batch.source_year)} / ${escapeHtml(batch.source_branch || 'All')}</span>

                    <strong style="color:var(--navy);">Target:</strong>
                    <span>Class ${escapeHtml(batch.target_class)} / Year ${escapeHtml(batch.target_year)} / Session ${escapeHtml(batch.target_session || '—')}</span>

                    <strong style="color:var(--navy);">Performed by:</strong>
                    <span>${escapeHtml(batch.performed_by_name || 'Admin')}</span>

                    <strong style="color:var(--navy);">Date:</strong>
                    <span>${formatDate(batch.performed_at)}</span>

                    <strong style="color:var(--navy);">Status:</strong>
                    <span><span class="badge-status ${statusClass}">${statusLabel}</span></span>
                </div>
            </div>

            <div style="margin-top:20px;">
                <h6 style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:12px;">
                    <i class="fas fa-users" style="color:var(--gold-dark);"></i> Student Details (${details.length})
                </h6>
                ${studentsHtml}
            </div>

            ${batch.status === 'completed' ? `
                <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border-light);">
                    <button class="btn-secondary" style="width:100%;justify-content:center;background:#fef3c7;border-color:#d97706;color:#92400e;" onclick="restoreBatchFromModal('${batch.batch_id}')">
                        <i class="fas fa-undo"></i> এই Batch Restore করুন
                    </button>
                </div>
            ` : ''}
        `;

        $('detailModalBody').innerHTML = html;
    }

    // =========================================================
    // RESTORE BATCH
    // =========================================================
    async function restoreBatch(batchId) {
        if (isProcessing) return;

        const batch = allBatches.find(b => b.batch_id === batchId);
        if (!batch) return;

        if (batch.status === 'rolled_back') {
            return window.fdcWarning('এই batch আগেই restore করা হয়েছে।');
        }

        // Confirm
        window.fdcConfirm(
            `⚠️ এই batch restore করতে চান?\n\n` +
            `• Batch: Class ${batch.source_class} → ${batch.target_class}\n` +
            `• Promoted: ${batch.promoted_count} জন\n` +
            `• Date: ${formatDate(batch.performed_at)}\n\n` +
            `Restore করলে:\n` +
            `• নতুন student-রা delete হবে\n` +
            `• পুরোনো student-রা ফিরে আসবে\n\n` +
            `নিশ্চিত?`,
            async function () {
                isProcessing = true;
                closeDetailModal();
                showProgress();

                try {
                    const result = await window.FDCPromoteRestore.restoreBatch(
                        batchId,
                        (message, percent) => {
                            updateProgress(message, percent);
                        }
                    );

                    hideProgress();

                    window.fdcSuccess(
                        `✅ Restore সফল!\n\n` +
                        `${result.restoredCount} জন student ফিরে এসেছে।`
                    );

                    // Reload
                    setTimeout(() => {
                        loadBatches();
                    }, 2000);

                } catch (e) {
                    console.error('Restore error:', e);
                    hideProgress();
                    window.fdcError('Restore failed: ' + e.message);
                } finally {
                    isProcessing = false;
                }
            },
            {
                title: '↺ Confirm Restore',
                confirmText: 'Yes, Restore',
                cancelText: 'Cancel',
                confirmType: 'danger'
            }
        );
    }

    // Expose for modal button
    window.restoreBatchFromModal = function (batchId) {
        closeDetailModal();
        setTimeout(() => restoreBatch(batchId), 300);
    };

    // =========================================================
    // PROGRESS
    // =========================================================
    function showProgress() {
        $('progressOverlay').classList.add('show');
        updateProgress('প্রস্তুতি নেওয়া হচ্ছে...', 0);
    }

    function hideProgress() {
        $('progressOverlay').classList.remove('show');
    }

    function updateProgress(message, percent) {
        $('progressText').textContent = message || 'Processing...';
        $('progressFill').style.width = percent + '%';
        $('progressPercent').textContent = percent + '%';
    }

    // =========================================================
    // MODAL HELPERS
    // =========================================================
    function openModal(id) {
        const el = $(id);
        if (el) el.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeDetailModal() {
        $('detailModal').classList.remove('show');
        document.body.style.overflow = '';
        currentBatch = null;
    }

    // =========================================================
    // ATTACH EVENTS
    // =========================================================
    function attachEvents() {
        // Filter
        $('btnApplyFilter').addEventListener('click', applyFilters);

        // Auto-apply on filter change
        ['filterSourceClass', 'filterSourceYear', 'filterBranch', 'filterStatus'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });

        // Batch list actions (delegated)
        $('batchList').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn || btn.disabled) return;

            const action = btn.dataset.action;
            const batchId = btn.dataset.batch;

            if (action === 'view') {
                viewBatchDetails(batchId);
            } else if (action === 'restore') {
                restoreBatch(batchId);
            }
        });

        // Modal close
        $('closeDetailModal').addEventListener('click', closeDetailModal);
        $('detailModal').addEventListener('click', function (e) {
            if (e.target === this) closeDetailModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && $('detailModal').classList.contains('show')) {
                closeDetailModal();
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Promote History initializing...');

        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadBatches();

            console.log('✅ Admin Promote History ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();