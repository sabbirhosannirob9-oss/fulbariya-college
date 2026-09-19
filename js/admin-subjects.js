/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN SUBJECT MANAGEMENT
 * Location: js/admin-subjects.js
 * Version: v2 — Book-wise Accordion UI
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allSubjects = [];
    let bookGroups = [];       // Grouped by book
    let filteredBooks = [];
    let expandedBooks = new Set();
    let editingBookKey = null;

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
    // ADMIN INFO
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
    // LOGOUT
    // =========================================================
    window.handleLogout = function () {
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try {
                    if (window.FDCAuth) await window.FDCAuth.logout();
                } catch (e) { console.warn(e); }
                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            { title: 'Logout', confirmText: 'Yes, Logout', cancelText: 'Cancel', confirmType: 'danger' }
        );
    };

    // =========================================================
    // LOAD ALL SUBJECTS
    // =========================================================
    async function loadAllSubjects() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .order('branch')
                .order('class_name')
                .order('group_name')
                .order('subject_name')
                .order('paper_number');

            if (error) throw error;

            allSubjects = data || [];
            console.log('✅ Loaded subjects:', allSubjects.length);

            groupBooks();
            updateStats();
            applyFilters();
        } catch (e) {
            console.error('Load subjects error:', e);
            window.fdcError('Subject load failed: ' + e.message);
        }
    }

    // =========================================================
    // GROUP SUBJECTS BY BOOK
    // =========================================================
    function groupBooks() {
        const map = new Map();

        allSubjects.forEach(s => {
            const key = [
                s.branch,
                s.class_name,
                s.group_name || 'NO-GROUP',
                s.subject_type,
                s.subject_name
            ].join('|');

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    subject_name: s.subject_name,
                    branch: s.branch,
                    class_name: s.class_name,
                    group_name: s.group_name,
                    subject_type: s.subject_type,
                    assessment_model: s.assessment_model || 'cq_mcq_practical',
                    papers: [],
                    isActive: true
                });
            }

            const book = map.get(key);
            book.papers.push(s);

            // Book inactive if all papers inactive
            if (s.is_active) book.isActive = true;
        });

        // Sort papers within each book
        map.forEach(book => {
            book.papers.sort((a, b) => (a.paper_number || 1) - (b.paper_number || 1));

            // If any paper is inactive, book is still active (at least one active)
            book.isActive = book.papers.some(p => p.is_active);
        });

        // Convert to array with type ordering
        const typeOrder = { compulsory: 0, group: 1, optional: 2 };
        bookGroups = Array.from(map.values()).sort((a, b) => {
            // Branch order
            if (a.branch !== b.branch) return a.branch === 'HSC' ? -1 : 1;
            // Class order
            if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
            // Type order
            const ta = typeOrder[a.subject_type] ?? 99;
            const tb = typeOrder[b.subject_type] ?? 99;
            if (ta !== tb) return ta - tb;
            // Name order
            return (a.subject_name || '').localeCompare(b.subject_name || '', 'bn');
        });
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        $('statBooks').textContent = bookGroups.length;
        $('statPapers').textContent = allSubjects.length;
        $('statHSC').textContent = allSubjects.filter(s => s.branch === 'HSC').length;
        $('statBM').textContent = allSubjects.filter(s => s.branch === 'BM').length;
        $('statActive').textContent = allSubjects.filter(s => s.is_active).length;
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function applyFilters() {
        const branch = $('filterBranch').value;
        const className = $('filterClass').value;
        const group = $('filterGroup').value;
        const type = $('filterType').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredBooks = bookGroups.filter(book => {
            if (branch && book.branch !== branch) return false;
            if (className && book.class_name !== className) return false;
            if (group && book.group_name !== group) return false;
            if (type && book.subject_type !== type) return false;
            if (search) {
                const text = (book.subject_name + ' ' + (book.papers.map(p => p.subject_code).filter(Boolean).join(' '))).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        renderBooks();
    }

    // =========================================================
    // RENDER BOOKS
    // =========================================================
    function renderBooks() {
        const container = $('booksContainer');

        if (filteredBooks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-book"></i></div>
                    <h6>কোনো book পাওয়া যায়নি</h6>
                    <p>Filter পরিবর্তন করুন বা নতুন book যোগ করুন</p>
                </div>`;
            return;
        }

        let html = '';

        filteredBooks.forEach(book => {
            const isExpanded = expandedBooks.has(book.key);
            const totalMarks = calculateBookTotal(book);
            const paperCount = book.papers.length;

            // Branch tag
            const branchClass = book.branch === 'HSC' ? 'branch-HSC' : 'branch-BM';
            const typeClass = 'type-' + book.subject_type;
            const modelClass = book.assessment_model === 'board_continuous' ? 'model-bmt' : 'model-hsc';

            const typeLabel = {
                'compulsory': 'Compulsory',
                'group': 'Group',
                'optional': 'Optional'
            }[book.subject_type] || book.subject_type;

            const modelLabel = book.assessment_model === 'board_continuous' ? 'BMT' : 'HSC';

            html += `
                <div class="book-card ${isExpanded ? 'expanded' : ''} ${book.isActive ? '' : 'inactive'}" data-book-key="${escapeHtml(book.key)}">
                    <div class="book-header" data-action="toggle">
                        <div class="bh-expand">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <div class="bh-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="bh-info">
                            <div class="bh-title">
                                ${escapeHtml(book.subject_name)}
                                <span class="tag ${branchClass}">${book.branch}</span>
                                <span class="tag ${typeClass}">${typeLabel}</span>
                                <span class="tag ${modelClass}">${modelLabel}</span>
                            </div>
                            <div class="bh-subtitle">
                                <span><i class="fas fa-graduation-cap"></i> Class ${book.class_name}</span>
                                <span><i class="fas fa-users"></i> ${escapeHtml(book.group_name || '—')}</span>
                                <span><i class="fas fa-file-alt"></i> ${paperCount} paper${paperCount > 1 ? 's' : ''}</span>
                                <span><i class="fas fa-star"></i> Total ${totalMarks} marks</span>
                            </div>
                        </div>
                        <div class="bh-actions">
                            <button class="action-btn edit" data-action="edit" title="Edit Book">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn toggle ${book.isActive ? 'on' : 'off'}" data-action="toggle-active" title="${book.isActive ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${book.isActive ? 'eye-slash' : 'eye'}"></i>
                            </button>
                            <button class="action-btn delete" data-action="delete" title="Delete Book">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="book-body">
                        ${renderPaperCards(book)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // =========================================================
    // RENDER PAPER CARDS
    // =========================================================
    function renderPaperCards(book) {
        let html = '';

        book.papers.forEach((paper, idx) => {
            const paperLabel = book.papers.length > 1
                ? `${paper.paper_number === 1 ? '১ম' : '২য়'} পত্র`
                : 'Single Paper';

            let marksHtml = '';
            if (book.assessment_model === 'board_continuous') {
                marksHtml = `
                    <div class="mark-box ${paper.cq_marks > 0 ? '' : 'muted'}">
                        <div class="mb-label">Board</div>
                        <div class="mb-value">${paper.cq_marks || 0}</div>
                    </div>
                    <div class="mark-box ${paper.practical_marks > 0 ? '' : 'muted'}">
                        <div class="mb-label">Continuous</div>
                        <div class="mb-value">${paper.practical_marks || 0}</div>
                    </div>
                `;
            } else {
                marksHtml = `
                    <div class="mark-box ${paper.has_cq ? '' : 'muted'}">
                        <div class="mb-label">CQ</div>
                        <div class="mb-value">${paper.has_cq ? (paper.cq_marks || 0) : '—'}</div>
                    </div>
                    <div class="mark-box ${paper.has_mcq ? '' : 'muted'}">
                        <div class="mb-label">MCQ</div>
                        <div class="mb-value">${paper.has_mcq ? (paper.mcq_marks || 0) : '—'}</div>
                    </div>
                    <div class="mark-box ${paper.has_practical ? '' : 'muted'}">
                        <div class="mb-label">Practical</div>
                        <div class="mb-value">${paper.has_practical ? (paper.practical_marks || 0) : '—'}</div>
                    </div>
                `;
            }

            const paperTotal = (book.assessment_model === 'board_continuous')
                ? (paper.cq_marks || 0) + (paper.practical_marks || 0)
                : (paper.has_cq ? (paper.cq_marks || 0) : 0)
                + (paper.has_mcq ? (paper.mcq_marks || 0) : 0)
                + (paper.has_practical ? (paper.practical_marks || 0) : 0);

            html += `
                <div class="paper-card ${paper.is_active ? '' : 'inactive'}">
                    <div class="paper-header">
                        <div class="ph-left">
                            <div class="ph-name">
                                <i class="fas fa-file-alt"></i>
                                ${paperLabel}
                            </div>
                            ${paper.subject_code ? `<span class="ph-code">${escapeHtml(paper.subject_code)}</span>` : ''}
                            ${paper.is_active ? '' : '<span class="tag" style="background:#fee2e2;color:#991b1b;">Inactive</span>'}
                        </div>
                        <div class="ph-actions">
                            <button class="action-btn edit" data-action="edit-paper" data-paper-id="${paper.id}" title="Edit Paper">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                    <div class="paper-marks">
                        ${marksHtml}
                    </div>
                    <div class="paper-info">
                        <span><i class="fas fa-star"></i> Total: <strong>${paperTotal}</strong> marks</span>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // =========================================================
    // CALCULATE BOOK TOTAL
    // =========================================================
    function calculateBookTotal(book) {
        let total = 0;
        book.papers.forEach(p => {
            if (book.assessment_model === 'board_continuous') {
                total += (p.cq_marks || 0) + (p.practical_marks || 0);
            } else {
                if (p.has_cq) total += (p.cq_marks || 0);
                if (p.has_mcq) total += (p.mcq_marks || 0);
                if (p.has_practical) total += (p.practical_marks || 0);
            }
        });
        return total;
    }

    // =========================================================
    // TOGGLE BOOK EXPAND
    // =========================================================
    function toggleBookExpand(bookKey) {
        if (expandedBooks.has(bookKey)) {
            expandedBooks.delete(bookKey);
        } else {
            expandedBooks.add(bookKey);
        }
        renderBooks();
    }

    // =========================================================
    // MODAL: OPEN ADD
    // =========================================================
    function openAddBookModal() {
        editingBookKey = null;

        $('editBookId').value = '';
        $('editPaperIds').value = '';
        $('bookModalTitle').textContent = 'Add New Book';
        $('bookModalSub').textContent = 'নতুন বই যোগ করুন';
        $('bookModalIcon').className = 'fas fa-book';
        $('saveBookBtn').innerHTML = '<i class="fas fa-save"></i> Save Book';

        // Reset form
        $('bookName').value = '';
        $('bookBranch').value = '';
        $('bookClass').value = '';
        $('bookGroup').value = '';
        $('bookType').value = '';
        $('bookModel').value = 'cq_mcq_practical';
        $('bookPaperCount').value = '2';
        $('bookIsActive').checked = true;

        resetPaperInputs(1);
        resetPaperInputs(2);

        $('paper2Block').style.display = 'block';

        $('bookAlert').style.display = 'none';

        openModal('bookModal');
    }

    function resetPaperInputs(num) {
        $(`p${num}Code`).value = '';
        $(`p${num}CQ`).value = '';
        $(`p${num}MCQ`).value = '';
        $(`p${num}Practical`).value = '';
        $(`p${num}HasCQ`).checked = true;
        $(`p${num}HasMCQ`).checked = true;
        $(`p${num}HasPractical`).checked = false;
    }

    // =========================================================
    // MODAL: OPEN EDIT
    // =========================================================
    function openEditBookModal(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        editingBookKey = bookKey;

        $('editBookId').value = bookKey;
        $('editPaperIds').value = book.papers.map(p => p.id).join(',');
        $('bookModalTitle').textContent = 'Edit Book';
        $('bookModalSub').textContent = book.subject_name;
        $('bookModalIcon').className = 'fas fa-edit';
        $('saveBookBtn').innerHTML = '<i class="fas fa-save"></i> Update Book';

        // Fill form
        $('bookName').value = book.subject_name || '';
        $('bookBranch').value = book.branch || '';
        $('bookClass').value = book.class_name || '';
        $('bookGroup').value = book.group_name || '';
        $('bookType').value = book.subject_type || '';
        $('bookModel').value = book.assessment_model || 'cq_mcq_practical';
        $('bookPaperCount').value = String(book.papers.length);
        $('bookIsActive').checked = book.isActive;

        // Fill papers
        book.papers.forEach((p, idx) => {
            const num = idx + 1;
            if (num > 2) return;

            $(`p${num}Code`).value = p.subject_code || '';
            $(`p${num}CQ`).value = p.cq_marks || '';
            $(`p${num}MCQ`).value = p.mcq_marks || '';
            $(`p${num}Practical`).value = p.practical_marks || '';
            $(`p${num}HasCQ`).checked = !!p.has_cq;
            $(`p${num}HasMCQ`).checked = !!p.has_mcq;
            $(`p${num}HasPractical`).checked = !!p.has_practical;
        });

        $('paper2Block').style.display = book.papers.length > 1 ? 'block' : 'none';

        $('bookAlert').style.display = 'none';

        openModal('bookModal');
    }

    // =========================================================
    // SAVE BOOK
    // =========================================================
    async function saveBook() {
        const name = $('bookName').value.trim();
        const branch = $('bookBranch').value;
        const className = $('bookClass').value;
        const groupName = $('bookGroup').value;
        const subjectType = $('bookType').value;
        const model = $('bookModel').value;
        const paperCount = parseInt($('bookPaperCount').value) || 1;
        const isActive = $('bookIsActive').checked;

        // Validation
        if (!name) return window.fdcWarning('Book Name দিতে হবে।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!subjectType) return window.fdcWarning('Subject Type সিলেক্ট করুন।');
        if (subjectType !== 'compulsory' && !groupName) {
            return window.fdcWarning('Group সিলেক্ট করুন।');
        }

        // Gather papers
        const papers = [];
        for (let num = 1; num <= paperCount; num++) {
            const code = $(`p${num}Code`).value.trim();
            const cq = parseInt($(`p${num}CQ`).value) || 0;
            const mcq = parseInt($(`p${num}MCQ`).value) || 0;
            const practical = parseInt($(`p${num}Practical`).value) || 0;
            const hasCQ = $(`p${num}HasCQ`).checked;
            const hasMCQ = $(`p${num}HasMCQ`).checked;
            const hasPractical = $(`p${num}HasPractical`).checked;

            papers.push({
                paper_number: num,
                subject_code: code || null,
                cq_marks: cq,
                mcq_marks: mcq,
                practical_marks: practical,
                has_cq: hasCQ,
                has_mcq: hasMCQ,
                has_practical: hasPractical
            });
        }

        const btn = $('saveBookBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            if (editingBookKey) {
                // UPDATE existing
                await updateExistingBook(editingBookKey, papers, isActive);
            } else {
                // INSERT new
                await insertNewBook({
                    name, branch, className, groupName,
                    subjectType, model, papers, isActive
                });
            }

            window.fdcSuccess(editingBookKey ? '✅ Book updated!' : '✅ Book created!');
            closeModal('bookModal');
            await loadAllSubjects();
        } catch (e) {
            console.error('Save book error:', e);
            if (e.message && e.message.includes('duplicate')) {
                window.fdcError('এই book আগেই আছে (same name + class + group + type)।');
            } else {
                window.fdcError('Save failed: ' + e.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // INSERT NEW BOOK
    // =========================================================
    async function insertNewBook(data) {
        const records = [];

        data.papers.forEach(p => {
            records.push({
                subject_name: data.name,
                subject_code: p.subject_code,
                branch: data.branch,
                class_name: data.className,
                group_name: data.subjectType === 'compulsory' ? null : data.groupName,
                subject_type: data.subjectType,
                paper_number: p.paper_number,
                cq_marks: p.cq_marks,
                mcq_marks: p.mcq_marks,
                practical_marks: p.practical_marks,
                has_cq: p.has_cq,
                has_mcq: p.has_mcq,
                has_practical: p.has_practical,
                assessment_model: data.model,
                is_active: data.isActive
            });
        });

        const { error } = await window.FDC_SUPABASE
            .from('subjects')
            .insert(records);

        if (error) throw error;
    }

    // =========================================================
    // UPDATE EXISTING BOOK
    // =========================================================
    async function updateExistingBook(bookKey, papers, isActive) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) throw new Error('Book not found');

        const name = $('bookName').value.trim();
        const branch = $('bookBranch').value;
        const className = $('bookClass').value;
        const groupName = $('bookGroup').value;
        const subjectType = $('bookType').value;
        const model = $('bookModel').value;

        const groupValue = subjectType === 'compulsory' ? null : groupName;

        // Update each paper
        for (const p of papers) {
            // Find existing paper with this paper_number
            const existingPaper = book.papers.find(ep => ep.paper_number === p.paper_number);

            if (existingPaper) {
                const { error } = await window.FDC_SUPABASE
                    .from('subjects')
                    .update({
                        subject_name: name,
                        subject_code: p.subject_code,
                        branch: branch,
                        class_name: className,
                        group_name: groupValue,
                        subject_type: subjectType,
                        cq_marks: p.cq_marks,
                        mcq_marks: p.mcq_marks,
                        practical_marks: p.practical_marks,
                        has_cq: p.has_cq,
                        has_mcq: p.has_mcq,
                        has_practical: p.has_practical,
                        assessment_model: model,
                        is_active: isActive
                    })
                    .eq('id', existingPaper.id);
                if (error) throw error;
            } else {
                // Insert new paper
                const { error } = await window.FDC_SUPABASE
                    .from('subjects')
                    .insert({
                        subject_name: name,
                        subject_code: p.subject_code,
                        branch: branch,
                        class_name: className,
                        group_name: groupValue,
                        subject_type: subjectType,
                        paper_number: p.paper_number,
                        cq_marks: p.cq_marks,
                        mcq_marks: p.mcq_marks,
                        practical_marks: p.practical_marks,
                        has_cq: p.has_cq,
                        has_mcq: p.has_mcq,
                        has_practical: p.has_practical,
                        assessment_model: model,
                        is_active: isActive
                    });
                if (error) throw error;
            }
        }

        // If papers were reduced (e.g., 2 → 1), delete removed paper
        const newPaperNumbers = papers.map(p => p.paper_number);
        for (const ep of book.papers) {
            if (!newPaperNumbers.includes(ep.paper_number)) {
                await window.FDC_SUPABASE.from('subjects').delete().eq('id', ep.id);
            }
        }
    }

    // =========================================================
    // TOGGLE BOOK ACTIVE
    // =========================================================
    async function toggleBookActive(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        const newState = !book.isActive;
        const action = newState ? 'Activate' : 'Deactivate';

        window.fdcConfirm(
            `"${book.subject_name}" (${book.papers.length} paper)-কে ${action} করতে চান?`,
            async function () {
                try {
                    const ids = book.papers.map(p => p.id);
                    const { error } = await window.FDC_SUPABASE
                        .from('subjects')
                        .update({ is_active: newState })
                        .in('id', ids);
                    if (error) throw error;
                    window.fdcSuccess(`✅ Book ${action}d!`);
                    await loadAllSubjects();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            },
            {
                title: action + ' Book',
                confirmText: 'Yes, ' + action,
                confirmType: newState ? 'success' : 'danger'
            }
        );
    }

    // =========================================================
    // DELETE BOOK
    // =========================================================
    async function deleteBook(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        window.fdcConfirm(
            `"${book.subject_name}" (${book.papers.length} paper) চিরতরে delete হবে।\n\n` +
            `⚠️ সতর্কতা: যদি কোনো student এই book-এ enrolled থাকে, তাদের data-ও প্রভাবিত হবে।\n\n` +
            `আপনি কি নিশ্চিত?`,
            async function () {
                const typed = prompt('নিশ্চিত করতে "DELETE" টাইপ করুন:');
                if (!typed || typed.trim().toUpperCase() !== 'DELETE') {
                    return window.fdcWarning('Delete বাতিল।');
                }

                try {
                    const ids = book.papers.map(p => p.id);
                    const { error } = await window.FDC_SUPABASE
                        .from('subjects')
                        .delete()
                        .in('id', ids);
                    if (error) throw error;
                    window.fdcSuccess('✅ Book deleted!');
                    await loadAllSubjects();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            },
            {
                title: '⚠️ Delete Book',
                confirmText: 'Yes, Delete',
                confirmType: 'danger'
            }
        );
    }

    // =========================================================
    // EDIT SINGLE PAPER
    // =========================================================
    function editSinglePaper(paperId) {
        // Find book containing this paper
        const book = bookGroups.find(b => b.papers.some(p => p.id === paperId));
        if (!book) return;

        // Open full book editor but focus on this paper
        openEditBookModal(book.key);
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

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        // Add button
        $('btnAddBook').addEventListener('click', openAddBookModal);

        // Modal
        $('closeBookModal').addEventListener('click', () => closeModal('bookModal'));
        $('cancelBookBtn').addEventListener('click', () => closeModal('bookModal'));
        $('saveBookBtn').addEventListener('click', saveBook);

        // Paper count change
        $('bookPaperCount').addEventListener('change', function () {
            const count = parseInt(this.value);
            $('paper2Block').style.display = count > 1 ? 'block' : 'none';
        });

        // Filters
        ['filterBranch', 'filterClass', 'filterGroup', 'filterType'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        // Expand/Collapse all
        $('btnExpandAll').addEventListener('click', () => {
            filteredBooks.forEach(b => expandedBooks.add(b.key));
            renderBooks();
        });
        $('btnCollapseAll').addEventListener('click', () => {
            expandedBooks.clear();
            renderBooks();
        });

        // Delegated events on books container
        $('booksContainer').addEventListener('click', function (e) {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;

            const action = actionBtn.dataset.action;
            const bookCard = actionBtn.closest('[data-book-key]');
            const bookKey = bookCard ? bookCard.dataset.bookKey : null;

            if (action === 'toggle') {
                // Only toggle if click on header (not on action buttons)
                if (e.target.closest('.bh-actions')) return;
                if (bookKey) toggleBookExpand(bookKey);
            } else if (action === 'edit') {
                if (bookKey) openEditBookModal(bookKey);
            } else if (action === 'toggle-active') {
                if (bookKey) toggleBookActive(bookKey);
            } else if (action === 'delete') {
                if (bookKey) deleteBook(bookKey);
            } else if (action === 'edit-paper') {
                const paperId = parseInt(actionBtn.dataset.paperId);
                if (paperId) editSinglePaper(paperId);
            }
        });

        // Modal backdrop
        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Subjects v2 initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllSubjects();

            console.log('✅ Admin Subjects v2 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();