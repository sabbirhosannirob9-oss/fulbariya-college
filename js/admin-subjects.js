/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN SUBJECT MANAGEMENT
 * Location: js/admin-subjects.js
 * Version: v4.0 — Section-Based UI + Pass Marks + Pair Links
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * 
 * ✅ Features:
 *    - Section-based layout (HSC / BM Class 11 / BM Class 12)
 *    - Type groups (Compulsory / Group / Optional / Trade)
 *    - Pass marks display (33.33% of full marks)
 *    - Pair links for BM subjects
 *    - Expandable book/type
 *    - Book CRUD (Add/Edit/Delete/Toggle)
 *    - Filter: Branch, Type, Status, Search
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allSubjects = [];
    let bookGroups = [];
    let filteredBooks = [];
    let expandedBooks = new Set();
    let expandedTypeGroups = new Set();
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

    function calcPassMark(full) {
        const f = parseFloat(full) || 0;
        if (f === 0) return 0;
        return Math.ceil(f * 0.3333);
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
            {
                title: 'লগআউট নিশ্চিত করুন',
                confirmText: 'হ্যাঁ, লগআউট',
                cancelText: 'বাতিল',
                confirmType: 'danger'
            }
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
                .order('subject_type')
                .order('subject_name')
                .order('paper_number');

            if (error) throw error;

            allSubjects = data || [];
            console.log('✅ Loaded subjects:', allSubjects.length);

            groupBooks();
            updateStats();
            renderAll();

        } catch (e) {
            console.error('Load subjects error:', e);
            $('subjectsContainer').innerHTML = `
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-exclamation-triangle"></i></div>
                    <h6>লোড করা যায়নি</h6>
                    <p>${escapeHtml(e.message)}</p>
                </div>
            `;
        }
    }

    // =========================================================
    // GROUP BY BOOK
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
                    isActive: false
                });
            }

            const book = map.get(key);
            book.papers.push(s);
            if (s.is_active) book.isActive = true;
        });

        bookGroups = Array.from(map.values());

        bookGroups.forEach(book => {
            book.papers.sort((a, b) => (a.paper_number || 1) - (b.paper_number || 1));
        });
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        const el = (id) => $(id);
        if (el('statBooks')) el('statBooks').textContent = bookGroups.length;
        if (el('statPapers')) el('statPapers').textContent = allSubjects.length;
        if (el('statHSC')) el('statHSC').textContent = allSubjects.filter(s => s.branch === 'HSC').length;
        if (el('statBM')) el('statBM').textContent = allSubjects.filter(s => s.branch === 'BM').length;
        if (el('statActive')) el('statActive').textContent = allSubjects.filter(s => s.is_active).length;
    }

    // =========================================================
    // APPLY FILTERS
    // =========================================================
    function getFilteredBooks() {
        const branch = $('filterBranch')?.value || '';
        const type = $('filterType')?.value || '';
        const status = $('filterStatus')?.value || 'all';
        const search = ($('searchInput')?.value || '').toLowerCase().trim();

        return bookGroups.filter(book => {
            if (branch && book.branch !== branch) return false;
            if (type && book.subject_type !== type) return false;
            if (status === 'active' && !book.isActive) return false;
            if (status === 'inactive' && book.isActive) return false;
            if (search) {
                const text = (book.subject_name + ' ' + book.papers.map(p => p.subject_code).filter(Boolean).join(' ')).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });
    }

    // =========================================================
    // RENDER ALL
    // =========================================================
    function renderAll() {
        filteredBooks = getFilteredBooks();
        const container = $('subjectsContainer');

        if (filteredBooks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon-wrap"><i class="fas fa-book"></i></div>
                    <h6>কোনো book পাওয়া যায়নি</h6>
                    <p>Filter পরিবর্তন করুন বা নতুন book যোগ করুন</p>
                </div>
            `;
            return;
        }

        // Group into sections
        const sections = groupIntoSections(filteredBooks);

        let html = '';

        // HSC section
        if (sections.hsc.length > 0) {
            html += renderSection({
                title: 'HSC',
                subtitle: 'Science / Humanities / Business',
                icon: 'fa-graduation-cap',
                class: 'blue',
                books: sections.hsc
            });
        }

        // BM Class 11
        if (sections.bm11.length > 0) {
            html += renderSection({
                title: 'BM — Class 11',
                subtitle: 'First Year (BMT)',
                icon: 'fa-briefcase',
                class: 'purple',
                books: sections.bm11
            });
        }

        // BM Class 12
        if (sections.bm12.length > 0) {
            html += renderSection({
                title: 'BM — Class 12',
                subtitle: 'Second Year (BMT)',
                icon: 'fa-briefcase',
                class: 'purple',
                books: sections.bm12
            });
        }

        container.innerHTML = html;
    }

    // =========================================================
    // GROUP INTO SECTIONS
    // =========================================================
    function groupIntoSections(books) {
        const sections = {
            hsc: [],
            bm11: [],
            bm12: []
        };

        books.forEach(book => {
            if (book.branch === 'HSC') {
                sections.hsc.push(book);
            } else if (book.branch === 'BM') {
                if (book.class_name === '11') sections.bm11.push(book);
                else if (book.class_name === '12') sections.bm12.push(book);
            }
        });

        return sections;
    }

    // =========================================================
    // RENDER SECTION
    // =========================================================
    function renderSection({ title, subtitle, icon, class: cls, books }) {
        // Group books by type
        const byType = {
            compulsory: books.filter(b => b.subject_type === 'compulsory'),
            group: books.filter(b => b.subject_type === 'group'),
            optional: books.filter(b => b.subject_type === 'optional')
        };

        const totalPapers = books.reduce((sum, b) => sum + b.papers.length, 0);

        let html = `
            <div class="section-header ${cls}">
                <div class="sh-icon"><i class="fas ${icon}"></i></div>
                <div class="sh-title">
                    ${escapeHtml(title)}
                    <small style="display:block;font-size:11px;opacity:0.85;font-weight:400;">${escapeHtml(subtitle)}</small>
                </div>
                <div class="sh-count">${books.length} Books · ${totalPapers} Papers</div>
            </div>
            <div class="section-body">
        `;

        // Compulsory
        if (byType.compulsory.length > 0) {
            html += renderTypeGroup('compulsory', 'Compulsory', 'fa-lock', byType.compulsory);
        }

        // Group
        if (byType.group.length > 0) {
            html += renderTypeGroup('group', 'Group / Trade', 'fa-layer-group', byType.group);
        }

        // Optional
        if (byType.optional.length > 0) {
            html += renderTypeGroup('optional', 'Optional (4th Subject)', 'fa-star', byType.optional);
        }

        html += `</div>`;

        return html;
    }

    // =========================================================
    // RENDER TYPE GROUP
    // =========================================================
    function renderTypeGroup(type, label, icon, books) {
        const typeKey = type;
        const isExpanded = expandedTypeGroups.has(typeKey);

        let html = `
            <div class="type-group ${isExpanded ? 'expanded' : ''}" data-type-group="${typeKey}">
                <div class="type-header" data-action="toggle-type">
                    <div class="th-icon ${type}"><i class="fas ${icon}"></i></div>
                    <div class="th-title">${label}</div>
                    <div class="th-count">${books.length}</div>
                    <i class="fas fa-chevron-right th-arrow"></i>
                </div>
                <div class="type-body">
        `;

        books.forEach(book => {
            html += renderBookCard(book);
        });

        html += `</div></div>`;

        return html;
    }

    // =========================================================
    // RENDER BOOK CARD
    // =========================================================
    function renderBookCard(book) {
        const isExpanded = expandedBooks.has(book.key);
        const paperCount = book.papers.length;

        const subtitleParts = [];

        if (book.branch === 'HSC') {
            subtitleParts.push(`<span><i class="fas fa-graduation-cap"></i> Class ${book.class_name}</span>`);
            if (book.group_name) {
                subtitleParts.push(`<span><i class="fas fa-users"></i> ${escapeHtml(book.group_name)}</span>`);
            }
        } else {
            subtitleParts.push(`<span><i class="fas fa-briefcase"></i> BMT</span>`);
        }

        subtitleParts.push(`<span><i class="fas fa-file-alt"></i> ${paperCount} Paper${paperCount > 1 ? 's' : ''}</span>`);

        // Pair info for BM
        let pairHtml = '';
        if (book.branch === 'BM') {
            const pairedPaper = book.papers.find(p => p.paired_with_id);
            if (pairedPaper) {
                const pairedBook = bookGroups.find(b =>
                    b.papers.some(p => p.id === pairedPaper.paired_with_id)
                );
                if (pairedBook) {
                    pairHtml = `<div class="pair-link"><i class="fas fa-link"></i> Paired with: ${escapeHtml(pairedBook.subject_name)} (${escapeHtml(pairedBook.class_name === '11' ? 'Class 11' : 'Class 12')})</div>`;
                }
            }
        }

        let html = `
            <div class="book-card ${isExpanded ? 'expanded' : ''} ${book.isActive ? '' : 'inactive'}" data-book-key="${escapeHtml(book.key)}">
                <div class="book-header" data-action="toggle-book">
                    <div class="bh-expand"><i class="fas fa-chevron-right"></i></div>
                    <div class="bh-icon"><i class="fas fa-book"></i></div>
                    <div class="bh-info">
                        <div class="bh-title">
                            ${escapeHtml(book.subject_name)}
                            ${book.isActive ? '<span class="tag active-badge">✓ Active</span>' : '<span class="tag inactive-badge">Inactive</span>'}
                        </div>
                        <div class="bh-subtitle">
                            ${subtitleParts.join('')}
                        </div>
                        ${pairHtml}
                    </div>
                    <div class="bh-actions">
                        <button class="action-btn edit" data-action="edit" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn toggle ${book.isActive ? '' : 'off'}" data-action="toggle-active" title="${book.isActive ? 'Deactivate' : 'Activate'}">
                            <i class="fas fa-${book.isActive ? 'eye-slash' : 'eye'}"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="book-body">
        `;

        book.papers.forEach(paper => {
            html += renderPaperCard(book, paper);
        });

        html += `</div></div>`;

        return html;
    }

    // =========================================================
    // RENDER PAPER CARD
    // =========================================================
    function renderPaperCard(book, paper) {
        const paperLabel = book.papers.length > 1
            ? `${paper.paper_number === 1 ? '১ম' : '২য়'} পত্র`
            : 'Single Paper';

        const model = book.assessment_model || 'cq_mcq_practical';

        let marksHtml = '';

        if (model === 'board_continuous') {
            // BM style
            const boardFull = parseFloat(paper.cq_marks) || 0;
            const contFull = parseFloat(paper.practical_marks) || 0;

            marksHtml = `
                <div class="mark-box ${boardFull > 0 ? 'active' : 'muted'}">
                    <div class="mb-label">Board</div>
                    <div class="mb-full">${boardFull}</div>
                    ${boardFull > 0 ? `<div class="mb-pass"><i class="fas fa-check"></i> Pass ${calcPassMark(boardFull)}</div>` : ''}
                </div>
                <div class="mark-box ${contFull > 0 ? 'active' : 'muted'}">
                    <div class="mb-label">Continuous</div>
                    <div class="mb-full">${contFull}</div>
                    ${contFull > 0 ? `<div class="mb-pass"><i class="fas fa-check"></i> Pass ${calcPassMark(contFull)}</div>` : ''}
                </div>
            `;
        } else {
            // HSC style
            const cqFull = parseFloat(paper.cq_marks) || 0;
            const mcqFull = parseFloat(paper.mcq_marks) || 0;
            const pracFull = parseFloat(paper.practical_marks) || 0;

            if (paper.has_cq) {
                marksHtml += `
                    <div class="mark-box active">
                        <div class="mb-label">CQ</div>
                        <div class="mb-full">${cqFull}</div>
                        <div class="mb-pass"><i class="fas fa-check"></i> Pass ${calcPassMark(cqFull)}</div>
                    </div>
                `;
            }
            if (paper.has_mcq) {
                marksHtml += `
                    <div class="mark-box active">
                        <div class="mb-label">MCQ</div>
                        <div class="mb-full">${mcqFull}</div>
                        <div class="mb-pass"><i class="fas fa-check"></i> Pass ${calcPassMark(mcqFull)}</div>
                    </div>
                `;
            }
            if (paper.has_practical) {
                marksHtml += `
                    <div class="mark-box active">
                        <div class="mb-label">Practical</div>
                        <div class="mb-full">${pracFull}</div>
                        <div class="mb-pass"><i class="fas fa-check"></i> Pass ${calcPassMark(pracFull)}</div>
                    </div>
                `;
            }
        }

        const totalFull = model === 'board_continuous'
            ? (parseFloat(paper.cq_marks) || 0) + (parseFloat(paper.practical_marks) || 0)
            : (paper.has_cq ? (parseFloat(paper.cq_marks) || 0) : 0)
            + (paper.has_mcq ? (parseFloat(paper.mcq_marks) || 0) : 0)
            + (paper.has_practical ? (parseFloat(paper.practical_marks) || 0) : 0);

        return `
            <div class="paper-card ${paper.is_active ? '' : 'inactive'}">
                <div class="paper-header">
                    <div class="ph-left">
                        <div class="ph-name">
                            <i class="fas fa-file-alt"></i>
                            ${paperLabel}
                        </div>
                        ${paper.subject_code ? `<span class="ph-code">${escapeHtml(paper.subject_code)}</span>` : ''}
                        ${paper.is_active ? '' : '<span class="tag inactive-badge">Inactive</span>'}
                    </div>
                    <div class="ph-actions">
                        <button class="action-btn edit" data-action="edit" data-book-key="${escapeHtml(book.key)}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="marks-grid">
                    ${marksHtml}
                </div>
                <div class="paper-total">
                    Total: <strong>${totalFull}</strong> marks
                </div>
            </div>
        `;
    }

    // =========================================================
    // MODAL: OPEN/CLOSE
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
    // ADD BOOK
    // =========================================================
    function openAddBookModal() {
        editingBookKey = null;
        $('editBookKey').value = '';
        $('editPaperIds').value = '';
        $('bookModalTitle').textContent = 'Add New Book';
        $('bookModalSub').textContent = 'নতুন বই যোগ করুন';
        $('bookModalIcon').className = 'fas fa-book';
        $('saveBookBtn').innerHTML = '<i class="fas fa-save"></i> Save Book';

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
        updatePassHints();

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
    // EDIT BOOK
    // =========================================================
    function openEditBookModal(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        editingBookKey = bookKey;
        $('editBookKey').value = bookKey;
        $('editPaperIds').value = book.papers.map(p => p.id).join(',');
        $('bookModalTitle').textContent = 'Edit Book';
        $('bookModalSub').textContent = book.subject_name;
        $('bookModalIcon').className = 'fas fa-edit';
        $('saveBookBtn').innerHTML = '<i class="fas fa-save"></i> Update Book';

        $('bookName').value = book.subject_name || '';
        $('bookBranch').value = book.branch || '';
        $('bookClass').value = book.class_name || '';
        $('bookGroup').value = book.group_name || '';
        $('bookType').value = book.subject_type || '';
        $('bookModel').value = book.assessment_model || 'cq_mcq_practical';
        $('bookPaperCount').value = String(book.papers.length);
        $('bookIsActive').checked = book.isActive;

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
        updatePassHints();

        openModal('bookModal');
    }

    // =========================================================
    // UPDATE PASS HINTS
    // =========================================================
    function updatePassHints() {
        [1, 2].forEach(num => {
            const cq = parseFloat($(`p${num}CQ`)?.value) || 0;
            const mcq = parseFloat($(`p${num}MCQ`)?.value) || 0;
            const prac = parseFloat($(`p${num}Practical`)?.value) || 0;

            const hints = [];
            if (cq > 0) hints.push(`CQ: ${calcPassMark(cq)}`);
            if (mcq > 0) hints.push(`MCQ: ${calcPassMark(mcq)}`);
            if (prac > 0) hints.push(`Prac: ${calcPassMark(prac)}`);

            const el = $(`p${num}PassHint`);
            if (el) {
                el.textContent = hints.length ? `Pass Marks → ${hints.join(' · ')}` : '';
            }
        });
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

        if (!name) return window.fdcWarning('Book Name দিতে হবে।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!subjectType) return window.fdcWarning('Subject Type সিলেক্ট করুন।');
        if (subjectType !== 'compulsory' && !groupName) {
            return window.fdcWarning('Group সিলেক্ট করুন।');
        }

        const papers = [];
        for (let num = 1; num <= paperCount; num++) {
            papers.push({
                paper_number: num,
                subject_code: $(`p${num}Code`).value.trim() || null,
                cq_marks: parseInt($(`p${num}CQ`).value) || 0,
                mcq_marks: parseInt($(`p${num}MCQ`).value) || 0,
                practical_marks: parseInt($(`p${num}Practical`).value) || 0,
                has_cq: $(`p${num}HasCQ`).checked,
                has_mcq: $(`p${num}HasMCQ`).checked,
                has_practical: $(`p${num}HasPractical`).checked
            });
        }

        const btn = $('saveBookBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            if (editingBookKey) {
                await updateExistingBook(editingBookKey, papers, isActive, {
                    name, branch, className, groupName, subjectType, model
                });
            } else {
                await insertNewBook({
                    name, branch, className, groupName,
                    subjectType, model, papers, isActive
                });
            }

            closeModal('bookModal');
            window.fdcSuccess(editingBookKey ? 'Book update হয়েছে!' : 'Book যোগ হয়েছে!');
            await loadAllSubjects();

        } catch (e) {
            console.error('Save book error:', e);
            window.fdcError('Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function insertNewBook(data) {
        const records = data.papers.map(p => ({
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
        }));

        const { error } = await window.FDC_SUPABASE.from('subjects').insert(records);
        if (error) throw error;
    }

    async function updateExistingBook(bookKey, papers, isActive, meta) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) throw new Error('Book not found');

        const groupValue = meta.subjectType === 'compulsory' ? null : meta.groupName;

        for (const p of papers) {
            const existing = book.papers.find(ep => ep.paper_number === p.paper_number);

            const payload = {
                subject_name: meta.name,
                subject_code: p.subject_code,
                branch: meta.branch,
                class_name: meta.className,
                group_name: groupValue,
                subject_type: meta.subjectType,
                cq_marks: p.cq_marks,
                mcq_marks: p.mcq_marks,
                practical_marks: p.practical_marks,
                has_cq: p.has_cq,
                has_mcq: p.has_mcq,
                has_practical: p.has_practical,
                assessment_model: meta.model,
                is_active: isActive
            };

            if (existing) {
                const { error } = await window.FDC_SUPABASE.from('subjects').update(payload).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await window.FDC_SUPABASE.from('subjects').insert({ ...payload, paper_number: p.paper_number });
                if (error) throw error;
            }
        }

        // Delete removed papers
        const newNums = papers.map(p => p.paper_number);
        for (const ep of book.papers) {
            if (!newNums.includes(ep.paper_number)) {
                await window.FDC_SUPABASE.from('subjects').delete().eq('id', ep.id);
            }
        }
    }

    // =========================================================
    // TOGGLE ACTIVE
    // =========================================================
    function toggleBookActive(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        const newState = !book.isActive;
        const action = newState ? 'Activate' : 'Deactivate';

        window.fdcConfirm(
            `"${escapeHtml(book.subject_name)}" (${book.papers.length} paper)-কে ${action} করতে চান?`,
            async function () {
                try {
                    const ids = book.papers.map(p => p.id);
                    const { error } = await window.FDC_SUPABASE.from('subjects').update({ is_active: newState }).in('id', ids);
                    if (error) throw error;
                    window.fdcSuccess(`Book ${action}d হয়েছে!`);
                    await loadAllSubjects();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            },
            {
                title: `${action} Book`,
                confirmText: 'হ্যাঁ, ' + action,
                cancelText: 'বাতিল',
                confirmType: newState ? 'success' : 'danger'
            }
        );
    }

    // =========================================================
    // DELETE BOOK
    // =========================================================
    function deleteBook(bookKey) {
        const book = bookGroups.find(b => b.key === bookKey);
        if (!book) return;

        window.fdcPromptInput({
            title: '⚠️ Delete Book',
            subtitle: `${escapeHtml(book.subject_name)} (${book.papers.length} paper)`,
            message: `
                এই book এবং সব related data <strong>চিরতরে</strong> মুছে যাবে।
                <p style="margin-top:12px;color:#7f1d1d;font-weight:700;">এটি undo করা যাবে না!</p>
            `,
            expectedValue: 'DELETE',
            placeholder: 'টাইপ করুন: DELETE',
            confirmText: 'হ্যাঁ, Delete করুন',
            cancelText: 'বাতিল',
            confirmType: 'danger',
            onConfirm: async function () {
                try {
                    const ids = book.papers.map(p => p.id);
                    const { error } = await window.FDC_SUPABASE.from('subjects').delete().in('id', ids);
                    if (error) throw error;
                    window.fdcSuccess('Book delete হয়েছে!');
                    await loadAllSubjects();
                } catch (e) {
                    window.fdcError('Failed: ' + e.message);
                }
            }
        });
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
        renderAll();
    }

    function toggleTypeGroup(typeKey) {
        if (expandedTypeGroups.has(typeKey)) {
            expandedTypeGroups.delete(typeKey);
        } else {
            expandedTypeGroups.add(typeKey);
        }
        renderAll();
    }

    // =========================================================
    // EVENTS
    // =========================================================
    function attachEvents() {
        // Add book
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

        // Pass hint live update
        ['p1CQ', 'p1MCQ', 'p1Practical', 'p2CQ', 'p2MCQ', 'p2Practical'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('input', updatePassHints);
        });

        // Filters
        ['filterBranch', 'filterType', 'filterStatus'].forEach(id => {
            const el = $(id);
            if (el) el.addEventListener('change', renderAll);
        });
        $('searchInput').addEventListener('input', renderAll);

        // Expand / Collapse all
        $('btnExpandAll').addEventListener('click', () => {
            filteredBooks = getFilteredBooks();
            filteredBooks.forEach(b => expandedBooks.add(b.key));
            ['compulsory', 'group', 'optional'].forEach(t => expandedTypeGroups.add(t));
            renderAll();
        });

        $('btnCollapseAll').addEventListener('click', () => {
            expandedBooks.clear();
            expandedTypeGroups.clear();
            renderAll();
        });

        // Container delegation
        $('subjectsContainer').addEventListener('click', function (e) {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.dataset.action;

            if (action === 'toggle-type') {
                const typeGroup = actionEl.closest('[data-type-group]');
                if (typeGroup) toggleTypeGroup(typeGroup.dataset.typeGroup);
                return;
            }

            const bookCard = actionEl.closest('[data-book-key]');
            const bookKey = bookCard ? bookCard.dataset.bookKey : (actionEl.dataset.bookKey || null);

            if (!bookKey) return;

            if (action === 'toggle-book') {
                if (e.target.closest('.bh-actions')) return;
                toggleBookExpand(bookKey);
            } else if (action === 'edit') {
                openEditBookModal(bookKey);
            } else if (action === 'toggle-active') {
                toggleBookActive(bookKey);
            } else if (action === 'delete') {
                deleteBook(bookKey);
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

        // ESC
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
                document.body.style.overflow = '';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Subjects v4.0 initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadAllSubjects();

            console.log('✅ Admin Subjects v4.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();