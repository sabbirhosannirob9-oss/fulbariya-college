/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC CLASS ROUTINE
 * Location: js/class-routine.js
 * Version: v2.0 — Title Click + Hybrid Preview (Image/PDF) + Force Download
 * Depends: config.js, supabase.js
 * Table: class_routines_v2
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allRoutines = [];
    let filteredRoutines = [];

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

    function isPdfUrl(url) {
        return /\.pdf(\?|#|$)/i.test(url || '');
    }

    function buildFileName(r) {
        const parts = [
            r.branch,
            r.class_year,
            r.group_name || r.department,
            r.batch,
            r.title
        ].filter(Boolean);

        let name = parts.join('_').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        if (!name) name = 'routine';

        return isPdfUrl(r.image_url) ? name + '.pdf' : name + '.jpg';
    }

    // Cloudinary force-download URL
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
                .from('class_routines_v2')
                .select('*')
                .eq('is_published', true)
                .order('branch')
                .order('class_year')
                .order('group_name')
                .order('department')
                .order('batch')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allRoutines = data || [];
            console.log('✅ Loaded routines:', allRoutines.length);

            updateStats();
            buildFilterOptions();
            applyFilters();

        } catch (e) {
            console.error('Load routines error:', e);
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
        $('statHSC').textContent = allRoutines.filter(r => r.branch === 'HSC').length;
        $('statBM').textContent = allRoutines.filter(r => r.branch === 'BM').length;
        $('statHonours').textContent = allRoutines.filter(r => r.branch === 'Honours').length;
        $('statDegree').textContent = allRoutines.filter(r => r.branch === 'Degree').length;
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
        const fBranch = $('filterBranch').value;
        const fGroup = $('filterGroup').value;

        filteredRoutines = allRoutines.filter(r => {
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
                <div class="icon-wrap"><i class="fas fa-calendar-times"></i></div>
                <h6>কোনো রুটিন পাওয়া যায়নি</h6>
                <p>Filter পরিবর্তন করে দেখুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredRoutines.forEach(r => {
            const branchClass = r.branch || 'HSC';
            const isPdfFile = isPdfUrl(r.image_url);

            // Meta tags
            const metaTags = [];
            if (r.class_year) metaTags.push(`<span><i class="fas fa-graduation-cap"></i> ${escapeHtml(r.class_year)}</span>`);
            if (r.group_name) metaTags.push(`<span><i class="fas fa-users"></i> ${escapeHtml(r.group_name)}</span>`);
            if (r.department) metaTags.push(`<span><i class="fas fa-book"></i> ${escapeHtml(r.department)}</span>`);
            if (r.batch) metaTags.push(`<span><i class="fas fa-layer-group"></i> Batch ${escapeHtml(r.batch)}</span>`);
            if (r.session) metaTags.push(`<span><i class="fas fa-calendar"></i> ${escapeHtml(r.session)}</span>`);

            const description = r.description ? `<p>${escapeHtml(r.description)}</p>` : '';

            // Thumbnail: PDF হলে icon, nahole image
            const thumbInner = isPdfFile
                ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fee2e2;color:#dc2626;font-size:38px;"><i class="fas fa-file-pdf"></i></div>`
                : `<img src="${escapeHtml(r.image_url || '')}" alt="${escapeHtml(r.title)}" loading="lazy">`;

            // Download URL (Cloudinary force-download)
            const dlName = buildFileName(r);
            const dlUrl = getDownloadUrl(r.image_url, dlName);

            html += `<div class="routine-card ${branchClass}" data-id="${r.id}">
                <div class="routine-thumb" data-action="preview" data-id="${r.id}">
                    ${thumbInner}
                    <div class="overlay"><i class="fas fa-expand"></i></div>
                </div>

                <div class="routine-body">
                    <h4>
                        <span class="routine-title" data-action="preview" data-id="${r.id}" style="cursor:pointer;">${escapeHtml(r.title)}</span>
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

        // Set download button
        if (dlBtn) {
            dlBtn.href = dlUrl;
            dlBtn.setAttribute('download', dlName);
        }
        if (openBtn) openBtn.href = url;

        if (isPdfUrl(url)) {
            // PDF MODE
            if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
            if (previewPdf) {
                previewPdf.style.display = 'block';
                previewPdf.src = url;
            } else {
                // iframe না থাকলে new tab
                window.open(url, '_blank', 'noopener');
                return;
            }
        } else {
            // IMAGE MODE
            if (previewPdf) { previewPdf.style.display = 'none'; previewPdf.src = ''; }
            if (previewImg) {
                previewImg.style.display = 'block';
                previewImg.src = url;
                previewImg.alt = r.title || 'Routine';
            }
        }

        $('previewOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closePreview() {
        $('previewOverlay').classList.remove('show');

        // Clear after animation to stop PDF/Image load
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
        ['filterBranch', 'filterGroup'].forEach(id => {
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
        console.log('🚀 Class Routine Board v2.0 initializing...');
        attachEvents();

        waitForSupabase(async function () {
            await loadRoutines();
            console.log('✅ Class Routine Board ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();