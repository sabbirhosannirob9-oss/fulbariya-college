/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC EXAM ROUTINE
 * Location: js/exam-routine.js
 * Version: v2.0 — Title Click + Hybrid Preview (Image/PDF) + Force Download
 * Depends: config.js, supabase.js
 * Table: exam_routines
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allRoutines = [];
    let filteredRoutines = [];

    const EXAM_LABELS = {
        '1st Terminal': '১ম সাময়িক',
        '2nd Terminal': '২য় সাময়িক',
        'Test': 'টেস্ট পরীক্ষা',
        'Final': 'ফাইনাল পরীক্ষা'
    };

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

    function getExamLabel(key) {
        return EXAM_LABELS[key] || key;
    }

    function isPdfUrl(url) {
        return /\.pdf(\?|#|$)/i.test(url || '');
    }

    function buildFileName(r) {
        const parts = [
            r.exam_name || r.exam_id,
            r.branch,
            r.class_year,
            r.group_name || r.department,
            r.batch,
            r.title
        ].filter(Boolean);

        let name = parts.join('_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        if (!name) name = 'exam-routine';

        return isPdfUrl(r.image_url) ? name + '.pdf' : name + '.jpg';
    }

    function getDownloadUrl(url, filename) {
        if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) {
            return url;
        }
        const safeName = (filename || 'file').replace(/[^a-z0-9._-]/gi, '_');
        return url.replace('/upload/', `/upload/fl_attachment:${safeName}/`);
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
            if (++n > 30) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // LOAD ROUTINES
    // =========================================================
    async function loadRoutines() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exam_routines')
                .select('*')
                .eq('is_published', true)
                .order('exam_name')
                .order('branch')
                .order('class_year')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allRoutines = data || [];
            console.log('✅ Loaded exam routines:', allRoutines.length);

            updateStats();
            buildFilterOptions();
            applyFilters();

        } catch (e) {
            console.error('Load error:', e);
            $('routinesList').innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-exclamation-circle"></i></div>
                <h6>রুটিন লোড করা যায়নি</h6>
                <p>${escapeHtml(e.message)}</p>
            </div>`;
        }
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        $('statTotal').textContent = allRoutines.length;

        const examTypes = new Set();
        allRoutines.forEach(r => { if (r.exam_name) examTypes.add(r.exam_name); });

        const branches = new Set();
        allRoutines.forEach(r => { if (r.branch) branches.add(r.branch); });

        $('statExams').textContent = examTypes.size;
        $('statBranches').textContent = branches.size;
    }

    // =========================================================
    // BUILD FILTER OPTIONS
    // =========================================================
    function buildFilterOptions() {
        const groupSelect = $('filterGroup');
        const groups = new Set();

        allRoutines.forEach(r => {
            if (r.group_name) groups.add(r.group_name);
            if (r.department) groups.add(r.department);
        });

        const sortedGroups = Array.from(groups).sort((a, b) => a.localeCompare(b, 'bn'));

        groupSelect.innerHTML = '<option value="">All Groups</option>';
        sortedGroups.forEach(g => {
            groupSelect.insertAdjacentHTML('beforeend',
                `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`);
        });
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function applyFilters() {
        const fExam = $('filterExam').value;
        const fBranch = $('filterBranch').value;
        const fGroup = $('filterGroup').value;

        filteredRoutines = allRoutines.filter(r => {
            if (fExam && r.exam_name !== fExam) return false;
            if (fBranch && r.branch !== fBranch) return false;
            if (fGroup) {
                const matchGroup = (r.group_name === fGroup) || (r.department === fGroup);
                if (!matchGroup) return false;
            }
            return true;
        });

        renderRoutines();
    }

    // =========================================================
    // RENDER ROUTINES
    // =========================================================
    function renderRoutines() {
        const list = $('routinesList');

        if (filteredRoutines.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-file-alt"></i></div>
                <h6>কোনো পরীক্ষার রুটিন পাওয়া যায়নি</h6>
                <p>Filter পরিবর্তন করে দেখুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchClass = r.branch || 'HSC';
            const examLabel = getExamLabel(r.exam_name);
            const isPdfFile = isPdfUrl(r.image_url);

            const metaTags = [];
            if (r.class_year) metaTags.push(`<span><i class="fas fa-graduation-cap"></i> ${escapeHtml(r.class_year)}</span>`);
            if (r.group_name) metaTags.push(`<span><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`);
            if (r.department) metaTags.push(`<span><i class="fas fa-book"></i> ${escapeHtml(r.department)}</span>`);
            if (r.batch) metaTags.push(`<span><i class="fas fa-layer-group"></i> Batch ${escapeHtml(r.batch)}</span>`);
            if (r.session) metaTags.push(`<span><i class="fas fa-calendar"></i> ${escapeHtml(r.session)}</span>`);

            const description = r.description ? `<p>${escapeHtml(r.description)}</p>` : '';

            const thumbInner = isPdfFile
                ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fee2e2;color:#dc2626;font-size:38px;"><i class="fas fa-file-pdf"></i></div>`
                : `<img src="${escapeHtml(r.image_url || '')}" alt="${escapeHtml(r.title)}" loading="lazy">`;

            const dlName = buildFileName(r);
            const dlUrl = getDownloadUrl(r.image_url, dlName);

            html += `<div class="routine-card" data-id="${r.id}">
                <div class="routine-thumb" data-action="preview" data-id="${r.id}">
                    ${thumbInner}
                    <div class="overlay"><i class="fas fa-expand"></i></div>
                </div>

                <div class="routine-body">
                    <h4>
                        <span class="routine-title" data-action="preview" data-id="${r.id}" style="cursor:pointer;">${escapeHtml(r.title)}</span>
                        <span class="exam-badge">${escapeHtml(examLabel)}</span>
                        <span class="branch-badge ${branchClass}">${branchClass}</span>
                    </h4>
                    ${description}
                    <div class="routine-meta">
                        ${metaTags.join('')}
                    </div>

                    <div class="routine-actions">
                        <button class="btn-action primary" data-action="preview" data-id="${r.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <a href="${escapeHtml(dlUrl)}" target="_blank" rel="noopener" download="${escapeHtml(dlName)}" class="btn-action gold">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    }

    // =========================================================
    // PREVIEW MODAL — Hybrid (Image + PDF)
    // =========================================================
    function openPreview(id) {
        const r = allRoutines.find(x => String(x.id) === String(id));
        if (!r || !r.image_url) return;

        const url = r.image_url;
        const previewImg = $('previewImg');
        const previewPdf = $('previewPdf');
        const dlBtn = $('previewDownload');
        const openBtn = $('previewOpenNew');

        const dlName = buildFileName(r);
        const dlUrl = getDownloadUrl(url, dlName);

        if (dlBtn) {
            dlBtn.href = dlUrl;
            dlBtn.setAttribute('download', dlName);
        }
        if (openBtn) openBtn.href = url;

        if (isPdfUrl(url)) {
            if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
            if (previewPdf) {
                previewPdf.style.display = 'block';
                previewPdf.src = url;
            } else {
                window.open(url, '_blank', 'noopener');
                return;
            }
        } else {
            if (previewPdf) { previewPdf.style.display = 'none'; previewPdf.src = ''; }
            if (previewImg) {
                previewImg.style.display = 'block';
                previewImg.src = url;
                previewImg.alt = r.title || 'Exam Routine';
            }
        }

        $('previewOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('previewOverlay').classList.remove('show');

        setTimeout(() => {
            const previewImg = $('previewImg');
            const previewPdf = $('previewPdf');
            if (previewImg) previewImg.src = '';
            if (previewPdf) previewPdf.src = '';
        }, 250);

        document.body.style.overflow = '';
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        ['filterExam', 'filterBranch', 'filterGroup'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('change', applyFilters);
        });

        $('routinesList').addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="preview"]');
            if (!target) return;
            e.preventDefault();
            openPreview(target.dataset.id);
        });

        $('previewClose').addEventListener('click', closePreview);
        $('previewOverlay').addEventListener('click', function (e) {
            if (e.target === this) closePreview();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && $('previewOverlay').classList.contains('show')) {
                closePreview();
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Exam Routine Board v2.0 initializing...');
        attachEvents();

        waitForSupabase(async function () {
            await loadRoutines();
            console.log('✅ Exam Routine Board ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();