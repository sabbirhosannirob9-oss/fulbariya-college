/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN RESULT ENTRY
 * Location: js/admin-results.js
 * Version: v3.0 — Document-based Pass Marks + Live Validation
 * Depends: config.js, supabase.js, auth.js, admin-popup.js, gpa-calculator.js v2
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allExams = [];
    let loadedStudents = [];
    let loadedSubjects = [];
    let bookGroups = [];
    let currentExam = null;
    let currentClass = '';
    let currentYear = '';
    let currentBranch = '';
    let currentGroup = '';
    let resultStatus = 'draft';
    let hasUnsavedChanges = false;
    let activeTab = 0;

    let marksData = {};

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

    function getSessionFromYear(year) {
        if (!year) return '';
        const y = parseInt(year);
        if (isNaN(y)) return '';
        return y + '-' + (y + 1);
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
    // LOAD EXAMS
    // =========================================================
    async function loadExams() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('exams')
                .select('*')
                .eq('is_active', true)
                .order('exam_order');

            if (error) throw error;

            allExams = data || [];
            const select = $('filterExam');
            select.innerHTML = '<option value="">Select Exam</option>';
            allExams.forEach(e => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${e.id}">${escapeHtml(e.display_name)}</option>`);
            });
        } catch (e) {
            console.error('Load exams error:', e);
            window.fdcError('Exam load failed: ' + e.message);
        }
    }

    // =========================================================
    // LOAD YEAR OPTIONS (dynamic)
    // =========================================================
    async function loadYearOptions() {
        if (window.FDCSession) {
            await window.FDCSession.fillYearDropdown('filterYear', { autoSelectCurrent: false });
            const cy = window.FDCSession.getCurrentYear();
            if ($('filterYear')) $('filterYear').value = cy;
        } else {
            // Fallback
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let i = -2; i <= 2; i++) years.push(currentYear + i);
            const select = $('filterYear');
            select.innerHTML = '<option value="">Select Year</option>';
            years.forEach(y => {
                select.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
            });
            select.value = currentYear;
        }
        console.log('✅ Year options loaded');
    }

    // =========================================================
    // LOAD GROUPS
    // =========================================================
    async function loadGroupsByBranch(branch) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('groups')
                .select('*')
                .eq('branch', branch)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            const select = $('filterGroup');
            select.innerHTML = '<option value="">Select Group</option>';
            (data || []).forEach(g => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${g.group_name}">${escapeHtml(g.display_name)}</option>`);
            });
        } catch (e) {
            console.error('Load groups error:', e);
        }
    }

    // =========================================================
    // LOAD STUDENTS + SUBJECTS + BOOKS
    // =========================================================
    async function loadStudents() {
        const examId = $('filterExam').value;
        const className = $('filterClass').value;
        const year = $('filterYear').value;
        const branch = $('filterBranch').value;
        const groupName = $('filterGroup').value;

        if (!examId) return window.fdcWarning('Exam সিলেক্ট করুন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!year) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!branch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (branch === 'HSC' && !groupName) return window.fdcWarning('Group সিলেক্ট করুন।');

        currentExam = allExams.find(e => String(e.id) === String(examId));
        currentClass = className;
        currentYear = year;
        currentBranch = branch;
        currentGroup = branch === 'HSC' ? groupName : 'BM-General';

        const btn = $('btnLoadStudents');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        try {
            let stuQuery = window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('class_name', className)
                .eq('year', year)
                .eq('branch', branch)
                .eq('is_active', true)
                .order('roll');

            if (branch === 'HSC') stuQuery = stuQuery.eq('group_name', groupName);

            const { data: students, error: stuErr } = await stuQuery;
            if (stuErr) throw stuErr;

            loadedStudents = students || [];

            if (loadedStudents.length === 0) {
                $('emptyState').style.display = 'block';
                $('resultArea').style.display = 'none';
                return;
            }

            const { data: subjects, error: subErr } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('class_name', className)
                .eq('branch', branch)
                .eq('is_active', true)
                .order('subject_type')
                .order('sort_order')
                .order('subject_name')
                .order('paper_number');

            if (subErr) throw subErr;

            let filteredSubjects = (subjects || []).filter(s => {
                if (s.subject_type === 'compulsory' && !s.group_name) return true;
                if (s.group_name === currentGroup) return true;
                return false;
            });

            const studentSubjectIds = await getStudentSubjectIds();

            loadedSubjects = filteredSubjects.filter(s => {
                if (s.subject_type === 'compulsory') return true;
                return studentSubjectIds.has(s.id) || studentSubjectIds.size === 0;
            });

            buildBookGroups();
            await loadExistingMarks();

            renderTabs();
            renderBookSections();
            updateProgress();

            $('emptyState').style.display = 'none';
            $('resultArea').style.display = 'block';

        } catch (e) {
            console.error('Load students error:', e);
            window.fdcError('Load failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // GET STUDENT SUBJECT IDS
    // =========================================================
    async function getStudentSubjectIds() {
        try {
            const studentIds = loadedStudents.map(s => s.id);
            const { data } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id')
                .in('student_id', studentIds)
                .eq('is_active', true);

            return new Set((data || []).map(d => d.subject_id));
        } catch (e) {
            console.warn('Get student subjects error:', e);
            return new Set();
        }
    }

    // =========================================================
    // BUILD BOOK GROUPS
    // =========================================================
    function buildBookGroups() {
        const map = new Map();

        loadedSubjects.forEach(s => {
            const key = s.subject_name + '|' + (s.group_name || '') + '|' + s.subject_type;
            if (!map.has(key)) {
                map.set(key, {
                    subject_name: s.subject_name,
                    subject_code: s.subject_code,
                    subject_type: s.subject_type,
                    group_name: s.group_name,
                    assessment_model: s.assessment_model || 'cq_mcq_practical',
                    papers: []
                });
            }
            map.get(key).papers.push(s);
        });

        map.forEach(b => {
            b.papers.sort((a, c) => (a.paper_number || 1) - (c.paper_number || 1));
        });

        const typeOrder = { compulsory: 0, group: 1, optional: 2 };
        bookGroups = Array.from(map.values()).sort((a, b) => {
            const ta = typeOrder[a.subject_type] ?? 99;
            const tb = typeOrder[b.subject_type] ?? 99;
            if (ta !== tb) return ta - tb;
            return (a.subject_name || '').localeCompare(b.subject_name || '', 'bn');
        });
    }

    // =========================================================
    // LOAD EXISTING MARKS
    // =========================================================
    async function loadExistingMarks() {
        marksData = {};

        try {
            const studentIds = loadedStudents.map(s => s.id);

            const { data: results } = await window.FDC_SUPABASE
                .from('results')
                .select('id, student_id, status')
                .in('student_id', studentIds)
                .eq('exam_id', currentExam.id)
                .eq('year', currentYear);

            if (!results || results.length === 0) return;

            const publishedCount = results.filter(r => r.status === 'published').length;
            if (publishedCount > 0) resultStatus = 'published';

            const resultIds = results.map(r => r.id);
            const { data: details } = await window.FDC_SUPABASE
                .from('result_details')
                .select('*')
                .in('result_id', resultIds);

            (details || []).forEach(d => {
                const key = d.student_id + '_' + d.subject_id;
                marksData[key] = {
                    cq: d.cq_marks || '',
                    mcq: d.mcq_marks || '',
                    practical: d.practical_marks || '',
                    board: d.board_marks || '',
                    continuous: d.continuous_marks || ''
                };
            });

            const badge = $('statusBadge');
            if (badge) {
                if (resultStatus === 'published') {
                    badge.className = 'status-badge published';
                    badge.innerHTML = '<i class="fas fa-check-circle"></i> Published';
                } else {
                    badge.className = 'status-badge draft';
                    badge.innerHTML = '<i class="fas fa-pen"></i> Draft';
                }
            }
        } catch (e) {
            console.warn('Load existing marks error:', e);
        }
    }

    // =========================================================
    // RENDER TABS
    // =========================================================
    function renderTabs() {
        const wrap = $('subjectTabs');
        let html = '';

        bookGroups.forEach((book, idx) => {
            const status = getBookFillStatus(book);
            const statusClass = status.complete ? 'done' : '';
            const statusIcon = status.complete ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-hourglass-half"></i>';
            const statusText = status.complete ? `সম্পূর্ণ` : `${status.filled}/${status.total}`;

            html += `<div class="subject-tab ${idx === activeTab ? 'active' : ''}" data-idx="${idx}">
                <div class="st-name">${escapeHtml(book.subject_name)}</div>
                <div class="st-status ${statusClass}">${statusIcon} ${statusText}</div>
            </div>`;
        });

        wrap.innerHTML = html;

        wrap.querySelectorAll('.subject-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                activeTab = parseInt(this.dataset.idx);
                renderTabs();
                renderBookSections();
            });
        });
    }

    // =========================================================
    // BOOK FILL STATUS
    // =========================================================
    function getBookFillStatus(book) {
        let total = 0;
        let filled = 0;

        loadedStudents.forEach(stu => {
            book.papers.forEach(p => {
                const key = stu.id + '_' + p.id;
                const m = marksData[key] || {};

                if (book.assessment_model === 'board_continuous') {
                    total++;
                    if (m.board !== '' && m.board !== undefined && m.continuous !== '' && m.continuous !== undefined) {
                        filled++;
                    }
                } else {
                    if (p.has_cq) {
                        total++;
                        if (m.cq !== '' && m.cq !== undefined) filled++;
                    }
                    if (p.has_mcq) {
                        total++;
                        if (m.mcq !== '' && m.mcq !== undefined) filled++;
                    }
                    if (p.has_practical) {
                        total++;
                        if (m.practical !== '' && m.practical !== undefined) filled++;
                    }
                }
            });
        });

        return { total, filled, complete: total > 0 && total === filled };
    }

    // =========================================================
    // RENDER BOOK SECTIONS
    // =========================================================
    function renderBookSections() {
        const container = $('bookSections');
        let html = '';

        bookGroups.forEach((book, bookIdx) => {
            const isActive = bookIdx === activeTab;
            if (!isActive) return;

            const status = getBookFillStatus(book);

            html += `<div class="book-section" data-book-idx="${bookIdx}">
                <div class="book-header">
                    <div class="bh-title">
                        <i class="fas fa-book"></i>
                        ${escapeHtml(book.subject_name)}
                        ${book.subject_code ? `<span style="font-size:11px;opacity:0.7;font-weight:600;">(${escapeHtml(book.subject_code)})</span>` : ''}
                    </div>
                    <div class="bh-status ${status.complete ? 'done' : ''}">
                        ${status.complete ? '✅ সম্পূর্ণ' : `${status.filled}/${status.total} filled`}
                    </div>
                </div>`;

            book.papers.forEach((paper, paperIdx) => {
                const paperLabel = book.papers.length > 1
                    ? `${paper.paper_number === 1 ? '১ম' : '২য়'} পত্র`
                    : 'Single Paper';

                const paperStatus = getPaperFillStatus(book, paper);

                html += `<div class="paper-block">
                    <div class="paper-header">
                        <div class="ph-name">
                            <i class="fas fa-file-alt"></i>
                            ${paperLabel}
                        </div>
                        <div class="ph-marks">
                            ${book.assessment_model === 'board_continuous'
                                ? `Board /${paper.cq_marks || 60} | Continuous /${paper.practical_marks || 40}`
                                : `${paper.has_cq ? `CQ /${paper.cq_marks}` : ''} ${paper.has_mcq ? `MCQ /${paper.mcq_marks}` : ''} ${paper.has_practical ? `Practical /${paper.practical_marks}` : ''}`}
                        </div>
                        <div class="ph-count ${paperStatus.complete ? 'complete' : ''}">
                            ${paperStatus.filled}/${paperStatus.total}
                        </div>
                    </div>
                    <div class="marks-scroll">
                        <table class="marks-table">
                            <thead>
                                <tr>
                                    <th>Roll</th>
                                    <th class="col-name">Name</th>
                                    ${renderPaperHeaders(book, paper)}
                                    <th>Total</th>
                                    <th>%</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderPaperRows(book, paper)}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
        attachInputEvents();
    }

    // =========================================================
    // ✅ RENDER PAPER HEADERS (with pass marks)
    // =========================================================
    function renderPaperHeaders(book, paper) {
        const calcPass = (full) => window.FDCGPA.calcPassMark(full);

        if (book.assessment_model === 'board_continuous') {
            const boardFull = paper.cq_marks || 60;
            const contFull = paper.practical_marks || 40;
            return `
                <th>Board /${boardFull} <small style="color:#16a34a;font-weight:700;">(Pass ${calcPass(boardFull)})</small></th>
                <th>Continuous /${contFull} <small style="color:#16a34a;font-weight:700;">(Pass ${calcPass(contFull)})</small></th>
            `;
        }
        let html = '';
        if (paper.has_cq) {
            const full = paper.cq_marks || 0;
            html += `<th>CQ /${full} <small style="color:#16a34a;font-weight:700;">(${calcPass(full)})</small></th>`;
        }
        if (paper.has_mcq) {
            const full = paper.mcq_marks || 0;
            html += `<th>MCQ /${full} <small style="color:#16a34a;font-weight:700;">(${calcPass(full)})</small></th>`;
        }
        if (paper.has_practical) {
            const full = paper.practical_marks || 0;
            html += `<th>Practical /${full} <small style="color:#16a34a;font-weight:700;">(${calcPass(full)})</small></th>`;
        }
        return html;
    }

    // =========================================================
    // RENDER PAPER ROWS
    // =========================================================
    function renderPaperRows(book, paper) {
        let html = '';

        loadedStudents.forEach(stu => {
            const key = stu.id + '_' + paper.id;
            const m = marksData[key] || {};

            let inputsHtml = '';
            if (book.assessment_model === 'board_continuous') {
                inputsHtml += renderInput(stu.id, paper.id, 'board', m.board, paper.cq_marks || 60, 'board');
                inputsHtml += renderInput(stu.id, paper.id, 'continuous', m.continuous, paper.practical_marks || 40, 'continuous');
            } else {
                if (paper.has_cq) inputsHtml += renderInput(stu.id, paper.id, 'cq', m.cq, paper.cq_marks, 'cq');
                if (paper.has_mcq) inputsHtml += renderInput(stu.id, paper.id, 'mcq', m.mcq, paper.mcq_marks, 'mcq');
                if (paper.has_practical) inputsHtml += renderInput(stu.id, paper.id, 'practical', m.practical, paper.practical_marks, 'practical');
            }

            const result = calculatePaperFromData(book, paper, m);
            const rowClass = result.status === 'fail' ? 'fail' : (result.status === 'pass' ? 'pass' : '');

            html += `<tr data-student-id="${stu.id}" class="${rowClass}">
                <td>${escapeHtml(stu.roll)}</td>
                <td class="col-name">${escapeHtml(stu.name)}</td>
                ${inputsHtml}
                <td class="total-cell" data-total="${stu.id}_${paper.id}">
                    ${result.total !== null ? result.total : '—'}
                </td>
                <td class="percent-cell" data-percent="${stu.id}_${paper.id}">
                    ${result.percent !== null ? result.percent + '%' : '—'}
                </td>
                <td data-grade="${stu.id}_${paper.id}">
                    ${result.grade !== null
                        ? `<span class="grade-cell-mini ${window.FDCGPA.getGradeClass(result.grade)}">${result.grade}</span>`
                        : '—'}
                </td>
            </tr>`;
        });

        return html;
    }

    // =========================================================
    // ✅ RENDER INPUT (with pass hint + fail border)
    // =========================================================
    function renderInput(studentId, subjectId, field, value, max, fieldType) {
        const key = studentId + '_' + subjectId;
        const inputId = `input_${key}_${field}`;
        const val = (value !== '' && value !== null && value !== undefined) ? value : '';
        const filled = val !== '' ? 'filled' : '';
        const passMark = window.FDCGPA.calcPassMark(max);
        const isFail = (val !== '' && parseFloat(val) < passMark);

        return `<td>
            <div class="marks-input-wrap">
                <input type="number"
                       class="marks-input ${filled} ${isFail ? 'fail-border' : ''}"
                       id="${inputId}"
                       data-student-id="${studentId}"
                       data-subject-id="${subjectId}"
                       data-field="${field}"
                       data-max="${max}"
                       data-pass="${passMark}"
                       data-field-type="${fieldType}"
                       value="${val}"
                       min="0"
                       max="${max}"
                       placeholder="0">
                <span class="max-hint">/${max}</span>
                <span class="pass-hint-mini">✓ ${passMark}</span>
            </div>
        </td>`;
    }

    // =========================================================
    // CALCULATE PAPER FROM DATA
    // =========================================================
    function calculatePaperFromData(book, paper, m) {
        const hasAnyData = (book.assessment_model === 'board_continuous')
            ? (m.board !== '' && m.board !== undefined) || (m.continuous !== '' && m.continuous !== undefined)
            : (m.cq !== '' && m.cq !== undefined) || (m.mcq !== '' && m.mcq !== undefined) || (m.practical !== '' && m.practical !== undefined);

        if (!hasAnyData) {
            return { total: null, percent: null, grade: null, status: 'pending' };
        }

        if (book.assessment_model === 'board_continuous') {
            const result = window.FDCGPA.calculateBMTPaperGPA(
                m.board || 0, m.continuous || 0,
                paper.cq_marks || 60, paper.practical_marks || 40
            );
            return {
                total: result.total,
                percent: result.percent,
                grade: result.grade,
                status: result.failed ? 'fail' : 'pass'
            };
        }

        const result = window.FDCGPA.calculatePaperGPA(
            { cq: m.cq || 0, mcq: m.mcq || 0, practical: m.practical || 0 },
            {
                cq: paper.cq_marks || 0,
                mcq: paper.mcq_marks || 0,
                practical: paper.practical_marks || 0,
                hasCq: paper.has_cq,
                hasMcq: paper.has_mcq,
                hasPractical: paper.has_practical
            }
        );

        return {
            total: result.total,
            percent: result.percent,
            grade: result.grade,
            status: result.failed ? 'fail' : 'pass'
        };
    }

    // =========================================================
    // ATTACH INPUT EVENTS
    // =========================================================
    function attachInputEvents() {
        const container = $('bookSections');

        container.querySelectorAll('.marks-input').forEach(input => {
            if (input.dataset.eventsAttached === 'true') return;
            input.dataset.eventsAttached = 'true';

            input.addEventListener('input', handleInputChange);
            input.addEventListener('keydown', handleInputKeydown);
        });
    }

    // =========================================================
    // ✅ HANDLE INPUT CHANGE (with live fail validation)
    // =========================================================
    function handleInputChange(e) {
        const input = e.target;
        const studentId = input.dataset.studentId;
        const subjectId = input.dataset.subjectId;
        const field = input.dataset.field;
        const max = parseInt(input.dataset.max) || 0;
        const passMark = parseInt(input.dataset.pass) || 0;

        let value = input.value.trim();
        if (value !== '') {
            let num = parseFloat(value);
            if (isNaN(num)) {
                input.value = '';
                value = '';
            } else if (num > max) {
                input.value = max;
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
                value = max;
            } else if (num < 0) {
                input.value = 0;
                value = 0;
            }
        }

        const key = studentId + '_' + subjectId;
        if (!marksData[key]) marksData[key] = {};
        marksData[key][field] = input.value;

        input.classList.toggle('filled', input.value !== '');

        // ✅ Live fail validation
        const isFail = (input.value !== '' && parseFloat(input.value) < passMark);
        input.classList.toggle('fail-border', isFail);

        updatePaperCell(studentId, subjectId);
        updateRowStatus(studentId);
        updateProgress();
        markUnsaved();
    }

    // =========================================================
    // HANDLE INPUT KEYDOWN
    // =========================================================
    function handleInputKeydown(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const input = e.target;
        const allInputs = Array.from(document.querySelectorAll('.marks-input'));
        const idx = allInputs.indexOf(input);
        if (idx > -1 && idx < allInputs.length - 1) {
            allInputs[idx + 1].focus();
            allInputs[idx + 1].select();
        }
    }

    // =========================================================
    // UPDATE PAPER CELL
    // =========================================================
    function updatePaperCell(studentId, subjectId) {
        const book = bookGroups.find(b => b.papers.some(p => p.id === subjectId));
        if (!book) return;
        const paper = book.papers.find(p => p.id === subjectId);
        if (!paper) return;

        const key = studentId + '_' + subjectId;
        const m = marksData[key] || {};
        const result = calculatePaperFromData(book, paper, m);

        const totalCell = document.querySelector(`[data-total="${key}"]`);
        const percentCell = document.querySelector(`[data-percent="${key}"]`);
        const gradeCell = document.querySelector(`[data-grade="${key}"]`);

        if (totalCell) totalCell.textContent = result.total !== null ? result.total : '—';
        if (percentCell) percentCell.textContent = result.percent !== null ? result.percent + '%' : '—';
        if (gradeCell) {
            if (result.grade) {
                gradeCell.innerHTML = `<span class="grade-cell-mini ${window.FDCGPA.getGradeClass(result.grade)}">${result.grade}</span>`;
            } else {
                gradeCell.textContent = '—';
            }
        }
    }

    // =========================================================
    // UPDATE ROW STATUS
    // =========================================================
    function updateRowStatus(studentId) {
        const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
        if (!row) return;

        const studentStatus = calculateStudentOverallStatus(studentId);
        row.classList.remove('pass', 'fail');
        if (studentStatus === 'pass') row.classList.add('pass');
        else if (studentStatus === 'fail') row.classList.add('fail');
    }

    // =========================================================
    // CALCULATE STUDENT OVERALL STATUS
    // =========================================================
    function calculateStudentOverallStatus(studentId) {
        const subjects = [];

        bookGroups.forEach(book => {
            const paperResults = [];
            let hasAnyData = false;

            book.papers.forEach(paper => {
                const key = studentId + '_' + paper.id;
                const m = marksData[key] || {};
                const result = calculatePaperFromData(book, paper, m);
                if (result.total !== null) hasAnyData = true;
                paperResults.push({
                    gp: result.grade ? window.FDCGPA.percentToGrade(result.percent).gp : 0,
                    failed: result.status === 'fail'
                });
            });

            if (hasAnyData) {
                const subjectResult = window.FDCGPA.calculateSubjectGPA(paperResults);
                subjects.push({
                    name: book.subject_name,
                    type: book.subject_type,
                    gp: subjectResult.gp,
                    failed: subjectResult.failed
                });
            }
        });

        if (subjects.length === 0) return 'pending';

        const overall = window.FDCGPA.calculateOverallGPA(subjects);
        return overall.status;
    }

    // =========================================================
    // UPDATE PROGRESS
    // =========================================================
    function updateProgress() {
        let total = 0;
        let filled = 0;
        let passCount = 0;
        let failCount = 0;

        loadedStudents.forEach(stu => {
            bookGroups.forEach(book => {
                book.papers.forEach(p => {
                    const key = stu.id + '_' + p.id;
                    const m = marksData[key] || {};

                    if (book.assessment_model === 'board_continuous') {
                        if (m.board !== '' && m.board !== undefined) filled++;
                        if (m.continuous !== '' && m.continuous !== undefined) filled++;
                        total += 2;
                    } else {
                        if (p.has_cq) { total++; if (m.cq !== '' && m.cq !== undefined) filled++; }
                        if (p.has_mcq) { total++; if (m.mcq !== '' && m.mcq !== undefined) filled++; }
                        if (p.has_practical) { total++; if (m.practical !== '' && m.practical !== undefined) filled++; }
                    }
                });
            });

            const status = calculateStudentOverallStatus(stu.id);
            if (status === 'pass') passCount++;
            else if (status === 'fail') failCount++;
        });

        const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

        $('progressPercent').textContent = percent + '%';
        $('progressFill').style.width = percent + '%';

        const fill = $('progressFill');
        fill.classList.remove('warn', 'low');
        if (percent < 30) fill.classList.add('low');
        else if (percent < 70) fill.classList.add('warn');

        $('statStudents').textContent = loadedStudents.length;
        $('statBooks').textContent = bookGroups.length;
        $('statPapers').textContent = bookGroups.reduce((s, b) => s + b.papers.length, 0);
        $('statFilled').textContent = filled + '/' + total;
        $('statPass').textContent = passCount;
        $('statFail').textContent = failCount;

        renderTabs();

        bookGroups.forEach((book, idx) => {
            if (idx !== activeTab) return;
            const status = getBookFillStatus(book);
            const header = document.querySelector(`.book-section[data-book-idx="${idx}"] .bh-status`);
            if (header) {
                header.textContent = status.complete ? '✅ সম্পূর্ণ' : `${status.filled}/${status.total} filled`;
                header.classList.toggle('done', status.complete);
            }
        });

        const publishBtn = $('btnPublish');
        publishBtn.disabled = (percent !== 100);
    }

    // =========================================================
    // GET PAPER FILL STATUS
    // =========================================================
    function getPaperFillStatus(book, paper) {
        let total = 0;
        let filled = 0;

        loadedStudents.forEach(stu => {
            const key = stu.id + '_' + paper.id;
            const m = marksData[key] || {};

            if (book.assessment_model === 'board_continuous') {
                total += 2;
                if (m.board !== '' && m.board !== undefined) filled++;
                if (m.continuous !== '' && m.continuous !== undefined) filled++;
            } else {
                if (paper.has_cq) { total++; if (m.cq !== '' && m.cq !== undefined) filled++; }
                if (paper.has_mcq) { total++; if (m.mcq !== '' && m.mcq !== undefined) filled++; }
                if (paper.has_practical) { total++; if (m.practical !== '' && m.practical !== undefined) filled++; }
            }
        });

        return { total, filled, complete: total > 0 && total === filled };
    }

    // =========================================================
    // MARK UNSAVED
    // =========================================================
    function markUnsaved() {
        hasUnsavedChanges = true;
        const badge = $('statusBadge');
        if (badge && resultStatus !== 'published') {
            badge.className = 'status-badge unsaved';
            badge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unsaved';
        }
    }

    // =========================================================
    // FILL ALL PRACTICAL = 25
    // =========================================================
    function fillAllPractical() {
        let count = 0;
        document.querySelectorAll('.marks-input[data-field="practical"]').forEach(input => {
            const max = parseInt(input.dataset.max) || 25;
            const val = Math.min(25, max);
            input.value = val;
            input.classList.add('filled');
            const key = input.dataset.studentId + '_' + input.dataset.subjectId;
            if (!marksData[key]) marksData[key] = {};
            marksData[key].practical = val;
            count++;
        });

        if (count === 0) return window.fdcWarning('এই exam-এ practical নেই।');
        window.fdcSuccess(`${count}টি practical field-এ 25 বসানো হয়েছে।`);
        refreshAll();
    }

    // =========================================================
    // FILL ALL MCQ = 25
    // =========================================================
    function fillAllMCQ() {
        let count = 0;
        document.querySelectorAll('.marks-input[data-field="mcq"]').forEach(input => {
            const max = parseInt(input.dataset.max) || 25;
            const val = Math.min(25, max);
            input.value = val;
            input.classList.add('filled');
            const key = input.dataset.studentId + '_' + input.dataset.subjectId;
            if (!marksData[key]) marksData[key] = {};
            marksData[key].mcq = val;
            count++;
        });

        if (count === 0) return window.fdcWarning('এই exam-এ MCQ নেই।');
        window.fdcSuccess(`${count}টি MCQ field-এ 25 বসানো হয়েছে।`);
        refreshAll();
    }

    // =========================================================
    // CLEAR ALL
    // =========================================================
    function clearAll() {
        window.fdcConfirm(
            'সব marks মুছে ফেলা হবে। নিশ্চিত?',
            function () {
                marksData = {};
                document.querySelectorAll('.marks-input').forEach(input => {
                    input.value = '';
                    input.classList.remove('filled', 'fail', 'error', 'fail-border');
                });
                refreshAll();
                window.fdcSuccess('সব marks clear করা হয়েছে।');
            },
            { title: 'Clear All', confirmText: 'Yes, Clear', confirmType: 'danger' }
        );
    }

    // =========================================================
    // REFRESH ALL
    // =========================================================
    function refreshAll() {
        renderBookSections();
        updateProgress();
        markUnsaved();
    }

    // =========================================================
    // SAVE / PUBLISH
    // =========================================================
    async function saveResults(publish = false) {
        if (loadedStudents.length === 0) {
            return window.fdcWarning('আগে student load করুন।');
        }

        const actionLabel = publish ? 'Publish' : 'Save Draft';

        window.fdcConfirm(
            `${actionLabel} করা হবে। নিশ্চিত?`,
            async function () {
                const btn = publish ? $('btnPublish') : $('btnSaveDraft');
                const original = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                try {
                    const session = getSessionFromYear(currentYear);
                    const status = publish ? 'published' : 'draft';

                    for (const stu of loadedStudents) {
                        const { data: existingResult } = await window.FDC_SUPABASE
                            .from('results')
                            .select('id')
                            .eq('student_id', stu.id)
                            .eq('exam_id', currentExam.id)
                            .eq('year', currentYear)
                            .maybeSingle();

                        let resultId;
                        const gpaData = calculateStudentGPAForSave(stu.id);

                        const resultData = {
                            student_id: stu.id,
                            exam_id: currentExam.id,
                            year: currentYear,
                            session: session,
                            branch: currentBranch,
                            status: status,
                            is_published: publish,
                            published_at: publish ? new Date().toISOString() : null,
                            gpa: gpaData.gpa,
                            grade: gpaData.grade,
                            total_marks: gpaData.totalMarks
                        };

                        if (existingResult) {
                            resultId = existingResult.id;
                            await window.FDC_SUPABASE.from('results').update(resultData).eq('id', resultId);
                        } else {
                            const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                                .from('results').insert([resultData]).select().single();
                            if (insErr) throw insErr;
                            resultId = inserted.id;
                        }

                        await window.FDC_SUPABASE.from('result_details').delete().eq('result_id', resultId);

                        const detailsRecords = [];

                        bookGroups.forEach(book => {
                            book.papers.forEach(paper => {
                                const key = stu.id + '_' + paper.id;
                                const m = marksData[key] || {};

                                if (book.assessment_model === 'board_continuous') {
                                    const board = parseFloat(m.board) || 0;
                                    const cont = parseFloat(m.continuous) || 0;
                                    const total = board + cont;
                                    const maxTotal = (paper.cq_marks || 60) + (paper.practical_marks || 40);
                                    const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                                    const { grade, gp } = window.FDCGPA.percentToGrade(percent);
                                    const failed = window.FDCGPA.calculateBMTPaperGPA(
                                        board, cont, paper.cq_marks || 60, paper.practical_marks || 40
                                    ).failed;

                                    detailsRecords.push({
                                        result_id: resultId,
                                        student_id: stu.id,
                                        subject_id: paper.id,
                                        exam_id: currentExam.id,
                                        subject_type: book.subject_type,
                                        paper_number: paper.paper_number || 1,
                                        board_marks: board,
                                        continuous_marks: cont,
                                        cq_marks: 0, mcq_marks: 0, practical_marks: 0,
                                        total_marks: total,
                                        grade: failed ? 'F' : grade,
                                        grade_point: failed ? 0 : gp,
                                        status: failed ? 'fail' : 'pass'
                                    });
                                } else {
                                    const cq = parseFloat(m.cq) || 0;
                                    const mcq = parseFloat(m.mcq) || 0;
                                    const pr = parseFloat(m.practical) || 0;
                                    const total = cq + mcq + pr;

                                    const paperResult = window.FDCGPA.calculatePaperGPA(
                                        { cq, mcq, practical: pr },
                                        {
                                            cq: paper.cq_marks || 0,
                                            mcq: paper.mcq_marks || 0,
                                            practical: paper.practical_marks || 0,
                                            hasCq: paper.has_cq,
                                            hasMcq: paper.has_mcq,
                                            hasPractical: paper.has_practical
                                        }
                                    );

                                    detailsRecords.push({
                                        result_id: resultId,
                                        student_id: stu.id,
                                        subject_id: paper.id,
                                        exam_id: currentExam.id,
                                        subject_type: book.subject_type,
                                        paper_number: paper.paper_number || 1,
                                        cq_marks: cq, mcq_marks: mcq, practical_marks: pr,
                                        total_marks: total,
                                        grade: paperResult.grade,
                                        grade_point: paperResult.gp,
                                        status: paperResult.failed ? 'fail' : 'pass'
                                    });
                                }
                            });
                        });

                        if (detailsRecords.length > 0) {
                            const { error: detErr } = await window.FDC_SUPABASE
                                .from('result_details').insert(detailsRecords);
                            if (detErr) throw detErr;
                        }
                    }

                    hasUnsavedChanges = false;
                    resultStatus = status;

                    const badge = $('statusBadge');
                    badge.className = 'status-badge ' + (publish ? 'published' : 'draft');
                    badge.innerHTML = publish
                        ? '<i class="fas fa-check-circle"></i> Published'
                        : '<i class="fas fa-pen"></i> Draft Saved';

                    window.fdcSuccess(
                        publish
                            ? `${loadedStudents.length} জন student-এর result publish হয়েছে।`
                            : `${loadedStudents.length} জন student-এর marks save হয়েছে।`
                    );

                } catch (e) {
                    console.error('Save error:', e);
                    window.fdcError('Save failed: ' + e.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
            },
            {
                title: actionLabel,
                confirmText: publish ? 'Yes, Publish' : 'Yes, Save',
                confirmType: publish ? 'success' : 'primary'
            }
        );
    }

    // =========================================================
    // CALCULATE STUDENT GPA FOR SAVE
    // =========================================================
    function calculateStudentGPAForSave(studentId) {
        const subjects = [];
        let totalMarks = 0;

        bookGroups.forEach(book => {
            const paperResults = [];
            let hasAnyData = false;

            book.papers.forEach(paper => {
                const key = studentId + '_' + paper.id;
                const m = marksData[key] || {};
                const result = calculatePaperFromData(book, paper, m);

                if (result.total !== null) {
                    hasAnyData = true;
                    totalMarks += result.total;
                }

                const pg = result.percent !== null ? window.FDCGPA.percentToGrade(result.percent) : { gp: 0 };
                paperResults.push({
                    gp: pg.gp,
                    failed: result.status === 'fail'
                });
            });

            if (hasAnyData) {
                const subjectResult = window.FDCGPA.calculateSubjectGPA(paperResults);
                subjects.push({
                    name: book.subject_name,
                    type: book.subject_type,
                    gp: subjectResult.gp,
                    failed: subjectResult.failed
                });
            }
        });

        const overall = window.FDCGPA.calculateOverallGPA(subjects);
        return {
            gpa: overall.gpa,
            grade: overall.grade,
            totalMarks: totalMarks,
            status: overall.status,
            failReason: overall.failReason
        };
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('filterBranch').addEventListener('change', async function () {
            const branch = this.value;
            if (branch === 'HSC') {
                $('groupFieldWrap').style.display = 'block';
                await loadGroupsByBranch('HSC');
            } else if (branch === 'BM') {
                $('groupFieldWrap').style.display = 'none';
                $('filterGroup').innerHTML = '<option value="BM-General">BM-General</option>';
            } else {
                $('groupFieldWrap').style.display = 'none';
            }
        });

        $('btnLoadStudents').addEventListener('click', loadStudents);
        $('btnFillPractical').addEventListener('click', fillAllPractical);
        $('btnFillMCQ').addEventListener('click', fillAllMCQ);
        $('btnClearAll').addEventListener('click', clearAll);
        $('btnSaveDraft').addEventListener('click', () => saveResults(false));
        $('btnPublish').addEventListener('click', () => saveResults(true));

        window.addEventListener('beforeunload', function (e) {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Results v3.0 initializing...');

        if (!window.FDCSession) {
            console.warn('⚠️ Session helper not loaded, retrying...');
            setTimeout(init, 300);
            return;
        }

        if (!window.FDCGPA || typeof window.FDCGPA.calcPassMark !== 'function') {
            console.error('❌ GPA Calculator v2.0 not loaded!');
            window.fdcError('GPA Calculator আপডেট করা হয়নি।');
            return;
        }

        await loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadExams();

            console.log('✅ Admin Results v3.0 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();