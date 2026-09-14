/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN RESULT ENTRY
 * Location: js/admin-results.js
 * Depends: config.js, supabase.js, auth.js, admin-popup.js
 * Version: Final — Subject names in table headers
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
    let subjectSections = [];
    let currentExamId = null;
    let currentExamName = '';
    let currentClass = '';
    let currentYear = '';
    let currentBranch = '';
    let currentGroup = '';
    let resultStatus = 'draft';
    let hasUnsavedChanges = false;

    // marks data: { studentId_subjectId: { cq, mcq, practical } }
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

    // =========================================================
    // SESSION
    // =========================================================
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
                title: 'Logout Confirmation',
                confirmText: 'Yes, Logout',
                cancelText: 'Cancel',
                confirmType: 'danger'
            }
        );
    };

    // =========================================================
    // GRADE / GPA CALCULATION
    // =========================================================
    function getGradePoint(marks, fullMarks) {
        if (fullMarks === 0) return 0;
        const pct = (marks / fullMarks) * 100;
        if (pct >= 80) return 5.00;
        if (pct >= 70) return 4.00;
        if (pct >= 60) return 3.50;
        if (pct >= 50) return 3.00;
        if (pct >= 40) return 2.00;
        if (pct >= 33) return 1.00;
        return 0.00;
    }

    function getGrade(marks, fullMarks) {
        if (fullMarks === 0) return 'F';
        const pct = (marks / fullMarks) * 100;
        if (pct >= 80) return 'A+';
        if (pct >= 70) return 'A';
        if (pct >= 60) return 'A-';
        if (pct >= 50) return 'B';
        if (pct >= 40) return 'C';
        if (pct >= 33) return 'D';
        return 'F';
    }

    function getGradeClass(grade) {
        const map = {
            'A+': 'Aplus', 'A': 'A', 'A-': 'Aminus',
            'B': 'B', 'C': 'C', 'D': 'D', 'F': 'F'
        };
        return map[grade] || 'F';
    }

    // =========================================================
    // CALCULATE STUDENT GPA (BOARD RULES)
    // =========================================================
    function calculateStudentGPA(studentId) {
        // Subject-কে group করি by name + type
        const subjectMap = new Map();

        subjectSections.forEach(sec => {
            sec.subjects.forEach(subj => {
                const key = subj.subject_name + '|' + subj.subject_type;
                if (!subjectMap.has(key)) {
                    subjectMap.set(key, {
                        name: subj.subject_name,
                        type: subj.subject_type,
                        papers: []
                    });
                }
                subjectMap.get(key).papers.push(...subj.papers);
            });
        });

        let totalGradePoints = 0;
        let totalSubjects = 0;
        let optionalBonus = 0;
        let hasFail = false;
        let totalMarksSum = 0;

        subjectMap.forEach((subj) => {
            let subjTotal = 0;
            let subjFull = 0;
            let subjCQPass = true;
            let subjMCQPass = true;
            let subjPracticalPass = true;

            subj.papers.forEach(p => {
                const m = marksData[studentId + '_' + p.id] || { cq: 0, mcq: 0, practical: 0 };
                const cq = parseFloat(m.cq) || 0;
                const mcq = parseFloat(m.mcq) || 0;
                const pr = parseFloat(m.practical) || 0;

                subjTotal += cq + mcq + pr;
                subjFull += (p.cq_marks || 0) + (p.mcq_marks || 0) + (p.practical_marks || 0);

                if (p.has_cq && cq < Math.ceil((p.cq_marks || 0) * 0.33)) subjCQPass = false;
                if (p.has_mcq && mcq < Math.ceil((p.mcq_marks || 0) * 0.33)) subjMCQPass = false;
                if (p.has_practical && pr < Math.ceil((p.practical_marks || 0) * 0.33)) subjPracticalPass = false;
            });

            totalMarksSum += subjTotal;

            const passTotal = subjFull > 0 ? Math.ceil(subjFull * 0.33) : 0;
            const isPassed = subjTotal >= passTotal && subjCQPass && subjMCQPass && subjPracticalPass;

            if (subj.type === 'optional') {
                if (isPassed) {
                    const gp = getGradePoint(subjTotal, subjFull);
                    optionalBonus = Math.max(0, gp - 2.00);
                }
                // Optional fail → no effect
            } else {
                totalSubjects++;
                if (!isPassed) {
                    hasFail = true;
                } else {
                    totalGradePoints += getGradePoint(subjTotal, subjFull);
                }
            }
        });

        if (hasFail) {
            return { gpa: 0.00, grade: 'F', totalMarks: totalMarksSum, status: 'fail' };
        }

        if (totalSubjects === 0) {
            return { gpa: 0.00, grade: 'F', totalMarks: 0, status: 'fail' };
        }

        let gpa = (totalGradePoints + optionalBonus) / totalSubjects;
        if (gpa > 5.00) gpa = 5.00;
        gpa = Math.round(gpa * 100) / 100;

        const grade = gpaToGrade(gpa);

        return { gpa, grade, totalMarks: totalMarksSum, status: 'pass' };
    }

    function gpaToGrade(gpa) {
        if (gpa >= 5.00) return 'A+';
        if (gpa >= 4.00) return 'A';
        if (gpa >= 3.50) return 'A-';
        if (gpa >= 3.00) return 'B';
        if (gpa >= 2.00) return 'C';
        if (gpa >= 1.00) return 'D';
        return 'F';
    }

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
    // LOAD YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -2; i <= 2; i++) years.push(currentYear + i);

        const select = $('filterYear');
        select.innerHTML = '<option value="">Select Year</option>';
        years.forEach(y => {
            select.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
        });
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
    // LOAD STUDENTS + SUBJECTS
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

        const exam = allExams.find(e => String(e.id) === String(examId));
        currentExamId = examId;
        currentExamName = exam ? exam.display_name : '';
        currentClass = className;
        currentYear = year;
        currentBranch = branch;
        currentGroup = branch === 'HSC' ? groupName : 'BM-General';

        const btn = $('btnLoadStudents');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        try {
            // Load students
            let stuQuery = window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('class_name', className)
                .eq('year', year)
                .eq('branch', branch)
                .eq('is_active', true)
                .order('roll');

            if (branch === 'HSC') {
                stuQuery = stuQuery.eq('group_name', groupName);
            }

            const { data: students, error: stuErr } = await stuQuery;
            if (stuErr) throw stuErr;

            loadedStudents = students || [];

            if (loadedStudents.length === 0) {
                $('marksTable').style.display = 'none';
                $('emptyState').style.display = 'block';
                $('emptyState').querySelector('h6').textContent = 'কোনো student পাওয়া যায়নি';
                $('emptyState').querySelector('p').textContent =
                    'এই Class + Year + Branch + Group-এ কোনো student যোগ করা হয়নি।';
                $('actionBar').style.display = 'none';
                updateStats();
                return;
            }

            // Load subjects
            const studentIds = loadedStudents.map(s => s.id);
            const { data: studentSubs, error: subErr } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('student_id, subject_id, subject_type')
                .in('student_id', studentIds)
                .eq('is_active', true);

            if (subErr) throw subErr;

            if (!studentSubs || studentSubs.length === 0) {
                $('marksTable').style.display = 'none';
                $('emptyState').style.display = 'block';
                $('emptyState').querySelector('h6').textContent = 'Student-দের subject assign করা হয়নি';
                $('emptyState').querySelector('p').textContent =
                    'Student Management-এ গিয়ে subject assign করুন।';
                $('actionBar').style.display = 'none';
                updateStats();
                return;
            }

            const subjectIds = [...new Set(studentSubs.map(s => s.subject_id))];

            const { data: subjects, error: subjErr } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .in('id', subjectIds)
                .order('sort_order');

            if (subjErr) throw subjErr;

            loadedSubjects = subjects || [];

            buildSubjectSections();
            await loadExistingResults();
            renderMarksTable();
            updateStats();

            $('marksTable').style.display = 'table';
            $('emptyState').style.display = 'none';
            $('actionBar').style.display = 'flex';

        } catch (e) {
            console.error('Load students error:', e);
            window.fdcError('Load failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // BUILD SUBJECT SECTIONS
    // =========================================================
    function buildSubjectSections() {
        const compSubs = loadedSubjects.filter(s => s.subject_type === 'compulsory');
        const grpSubs = loadedSubjects.filter(s => s.subject_type === 'group');
        const optSubs = loadedSubjects.filter(s => s.subject_type === 'optional');

        function groupByName(subs) {
            const map = new Map();
            subs.forEach(s => {
                if (!map.has(s.subject_name)) {
                    map.set(s.subject_name, {
                        subject_name: s.subject_name,
                        subject_code: s.subject_code,
                        subject_type: s.subject_type,
                        has_cq: s.has_cq,
                        has_mcq: s.has_mcq,
                        has_practical: s.has_practical,
                        papers: []
                    });
                }
                map.get(s.subject_name).papers.push(s);
            });
            map.forEach(v => v.papers.sort((a, b) => a.paper_number - b.paper_number));
            return Array.from(map.values());
        }

        subjectSections = [];

        if (compSubs.length > 0) {
            subjectSections.push({
                label: '📌 আবশ্যিক বিষয়',
                type: 'compulsory',
                subjects: groupByName(compSubs)
            });
        }
        if (grpSubs.length > 0) {
            subjectSections.push({
                label: '📚 গ্রুপের বিষয়',
                type: 'group',
                subjects: groupByName(grpSubs)
            });
        }
        if (optSubs.length > 0) {
            subjectSections.push({
                label: '🎯 ঐচ্ছিক বিষয়',
                type: 'optional',
                subjects: groupByName(optSubs)
            });
        }
    }

    // =========================================================
    // LOAD EXISTING RESULTS
    // =========================================================
    async function loadExistingResults() {
        marksData = {};
        resultStatus = 'draft';

        try {
            const studentIds = loadedStudents.map(s => s.id);

            const { data: results, error: resErr } = await window.FDC_SUPABASE
                .from('results')
                .select('id, student_id, status')
                .in('student_id', studentIds)
                .eq('exam_id', currentExamId)
                .eq('year', currentYear);

            if (resErr) throw resErr;

            if (!results || results.length === 0) return;

            const publishedCount = results.filter(r => r.status === 'published').length;
            if (publishedCount > 0) resultStatus = 'published';

            const resultIds = results.map(r => r.id);
            const { data: details, error: detErr } = await window.FDC_SUPABASE
                .from('result_details')
                .select('*')
                .in('result_id', resultIds);

            if (detErr) throw detErr;

            (details || []).forEach(d => {
                const key = d.student_id + '_' + d.subject_id;
                marksData[key] = {
                    cq: d.cq_marks || 0,
                    mcq: d.mcq_marks || 0,
                    practical: d.practical_marks || 0
                };
            });

            // Update status badge
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
            console.warn('Load existing results error:', e);
        }
    }

    // =========================================================
    // RENDER MARKS TABLE
    // =========================================================
    function renderMarksTable() {
        renderTableHead();
        renderTableBody();
    }

    // =========================================================
    // RENDER TABLE HEAD — Subject name + Paper + Field
    // =========================================================
    function renderTableHead() {
        const thead = $('tableHead');
        let html = '';

        // ============ Row 1: Section headers ============
        html += '<tr>';
        html += `<th class="col-roll" rowspan="3">Roll</th>`;
        html += `<th class="col-name" rowspan="3" style="text-align:left;padding-left:12px;">Name</th>`;

        subjectSections.forEach(sec => {
            let totalCols = 0;
            sec.subjects.forEach(subj => {
                subj.papers.forEach(p => {
                    if (p.has_cq) totalCols++;
                    if (p.has_mcq) totalCols++;
                    if (p.has_practical) totalCols++;
                });
            });
            html += `<th class="section-header" colspan="${totalCols}">${sec.label}</th>`;
        });

        html += `<th class="col-gpa" rowspan="3">GPA</th>`;
        html += `<th class="col-grade" rowspan="3">Grade</th>`;
        html += `<th class="col-status" rowspan="3">Status</th>`;
        html += '</tr>';

        // ============ Row 2: Subject names ============
        html += '<tr>';
        subjectSections.forEach(sec => {
            sec.subjects.forEach(subj => {
                let subjCols = 0;
                subj.papers.forEach(p => {
                    if (p.has_cq) subjCols++;
                    if (p.has_mcq) subjCols++;
                    if (p.has_practical) subjCols++;
                });

                const codeLabel = subj.subject_code
                    ? `<span style="font-size:9px;opacity:0.85;font-weight:600;display:block;color:var(--gold);letter-spacing:0.5px;margin-top:1px;">${escapeHtml(subj.subject_code)}</span>`
                    : '';

                html += `<th class="subject-header" colspan="${subjCols}" title="${escapeHtml(subj.subject_name)}">
                    <span style="font-size:11.5px;font-weight:700;letter-spacing:0.2px;display:block;color:#fff;">${escapeHtml(subj.subject_name)}</span>
                    ${codeLabel}
                </th>`;
            });
        });
        html += '</tr>';

        // ============ Row 3: Paper + Field type ============
        html += '<tr>';
        subjectSections.forEach(sec => {
            sec.subjects.forEach(subj => {
                subj.papers.forEach(p => {
                    const paperLabel = subj.papers.length > 1
                        ? `${p.paper_number}য়`
                        : '';

                    if (p.has_cq) {
                        html += `<th class="subject-header col-sub" title="${escapeHtml(subj.subject_name)} ${paperLabel} CQ">
                            ${paperLabel ? `<span style="font-size:8.5px;display:block;color:var(--gold);font-weight:600;">${paperLabel}</span>` : ''}
                            CQ
                        </th>`;
                    }
                    if (p.has_mcq) {
                        html += `<th class="subject-header col-sub" title="${escapeHtml(subj.subject_name)} ${paperLabel} MCQ">
                            ${paperLabel ? `<span style="font-size:8.5px;display:block;color:var(--gold);font-weight:600;">${paperLabel}</span>` : ''}
                            MCQ
                        </th>`;
                    }
                    if (p.has_practical) {
                        html += `<th class="subject-header col-sub" title="${escapeHtml(subj.subject_name)} ${paperLabel} PR">
                            ${paperLabel ? `<span style="font-size:8.5px;display:block;color:var(--gold);font-weight:600;">${paperLabel}</span>` : ''}
                            PR
                        </th>`;
                    }
                });
            });
        });
        html += '</tr>';

        thead.innerHTML = html;
    }

    // =========================================================
    // RENDER TABLE BODY
    // =========================================================
    function renderTableBody() {
        const tbody = $('tableBody');
        let html = '';

        loadedStudents.forEach(stu => {
            html += `<tr data-student-id="${stu.id}">`;
            html += `<td class="cell-roll">${escapeHtml(stu.roll)}</td>`;
            html += `<td class="cell-name">${escapeHtml(stu.name)}</td>`;

            subjectSections.forEach(sec => {
                sec.subjects.forEach(subj => {
                    subj.papers.forEach(p => {
                        const key = stu.id + '_' + p.id;
                        const m = marksData[key] || { cq: '', mcq: '', practical: '' };

                        if (p.has_cq) {
                            html += `<td>${renderInput(stu.id, p.id, 'cq', m.cq, p.cq_marks)}</td>`;
                        }
                        if (p.has_mcq) {
                            html += `<td>${renderInput(stu.id, p.id, 'mcq', m.mcq, p.mcq_marks)}</td>`;
                        }
                        if (p.has_practical) {
                            html += `<td>${renderInput(stu.id, p.id, 'practical', m.practical, p.practical_marks)}</td>`;
                        }
                    });
                });
            });

            html += `<td class="gpa-cell" data-gpa="${stu.id}">—</td>`;
            html += `<td data-grade="${stu.id}">—</td>`;
            html += `<td data-status="${stu.id}">—</td>`;
            html += '</tr>';
        });

        tbody.innerHTML = html;

        loadedStudents.forEach(stu => {
            updateStudentResult(stu.id);
        });

        attachInputEvents();
    }

    function renderInput(studentId, subjectId, field, value, maxMarks) {
        const key = studentId + '_' + subjectId;
        const inputId = `input_${key}_${field}`;
        const val = (value !== '' && value !== null && value !== undefined) ? value : '';
        const filled = val !== '' ? 'filled' : '';

        return `<div class="marks-input-wrap">
            <input type="number"
                   class="marks-input ${filled}"
                   id="${inputId}"
                   data-student-id="${studentId}"
                   data-subject-id="${subjectId}"
                   data-field="${field}"
                   data-max="${maxMarks}"
                   value="${val}"
                   min="0"
                   max="${maxMarks}"
                   placeholder="0">
            <span class="max-hint">/${maxMarks}</span>
        </div>`;
    }

    // =========================================================
    // INPUT EVENTS (attached once)
    // =========================================================
    let inputEventsAttached = false;

    function attachInputEvents() {
        if (inputEventsAttached) return;
        inputEventsAttached = true;

        const table = $('tableBody');

        // Input change
        table.addEventListener('input', function (e) {
            const input = e.target.closest('.marks-input');
            if (!input) return;

            const studentId = input.dataset.studentId;
            const subjectId = input.dataset.subjectId;
            const field = input.dataset.field;
            const maxMarks = parseInt(input.dataset.max) || 0;
            let value = parseInt(input.value) || 0;

            if (input.value !== '' && value > maxMarks) {
                value = maxMarks;
                input.value = maxMarks;
                window.fdcWarning(`সর্বোচ্চ ${maxMarks} নম্বর দেওয়া যাবে।`);
            }
            if (value < 0) {
                value = 0;
                input.value = 0;
            }

            const key = studentId + '_' + subjectId;
            if (!marksData[key]) marksData[key] = { cq: '', mcq: '', practical: '' };
            marksData[key][field] = input.value === '' ? '' : value;

            if (input.value !== '') input.classList.add('filled');
            else input.classList.remove('filled');

            updateStudentResult(studentId);
            updateStats();
            markUnsaved();
        });

        // Auto-tab after 2 digits
        table.addEventListener('input', function (e) {
            const input = e.target.closest('.marks-input');
            if (!input) return;

            if (input.value.length >= 2) {
                const allInputs = Array.from(table.querySelectorAll('.marks-input'));
                const idx = allInputs.indexOf(input);
                if (idx > -1 && idx < allInputs.length - 1) {
                    allInputs[idx + 1].focus();
                    allInputs[idx + 1].select();
                }
            }
        });

        // Enter → next field
        table.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            const input = e.target.closest('.marks-input');
            if (!input) return;

            e.preventDefault();
            const allInputs = Array.from(table.querySelectorAll('.marks-input'));
            const idx = allInputs.indexOf(input);
            if (idx > -1 && idx < allInputs.length - 1) {
                allInputs[idx + 1].focus();
                allInputs[idx + 1].select();
            }
        });
    }

    // =========================================================
    // UPDATE STUDENT RESULT
    // =========================================================
    function updateStudentResult(studentId) {
        const result = calculateStudentGPA(studentId);

        const gpaCell = document.querySelector(`[data-gpa="${studentId}"]`);
        if (gpaCell) {
            gpaCell.textContent = result.gpa.toFixed(2);
            gpaCell.classList.remove('high', 'mid', 'low');
            if (result.gpa >= 4.50) gpaCell.classList.add('high');
            else if (result.gpa >= 3.00) gpaCell.classList.add('mid');
            else gpaCell.classList.add('low');
        }

        const gradeCell = document.querySelector(`[data-grade="${studentId}"]`);
        if (gradeCell) {
            const gradeClass = getGradeClass(result.grade);
            gradeCell.innerHTML = `<span class="grade-cell ${gradeClass}">${result.grade}</span>`;
        }

        const statusCell = document.querySelector(`[data-status="${studentId}"]`);
        if (statusCell) {
            if (result.status === 'pass') {
                statusCell.innerHTML = '<span style="color:#059669;font-weight:700;font-size:11px;">✓ PASS</span>';
            } else {
                statusCell.innerHTML = '<span style="color:#dc2626;font-weight:700;font-size:11px;">✗ FAIL</span>';
            }
        }
    }

    // =========================================================
    // UPDATE STATS
    // =========================================================
    function updateStats() {
        const total = loadedStudents.length;
        let filled = 0;
        let passed = 0;
        let failed = 0;

        loadedStudents.forEach(stu => {
            const result = calculateStudentGPA(stu.id);
            if (result.totalMarks > 0) filled++;
            if (result.status === 'pass') passed++;
            else failed++;
        });

        $('totalStudents').textContent = total;
        $('statTotal').textContent = total;
        $('statFilled').textContent = filled;
        $('statPassed').textContent = passed;
        $('statFailed').textContent = failed;
    }

    // =========================================================
    // FILL ALL PRACTICAL = 25
    // =========================================================
    function fillAllPractical() {
        const inputs = document.querySelectorAll('.marks-input[data-field="practical"]');
        if (inputs.length === 0) {
            return window.fdcWarning('এই exam-এ কোনো practical subject নেই।');
        }

        window.fdcConfirm(
            `সব practical field-এ 25 বসানো হবে। নিশ্চিত?`,
            function () {
                inputs.forEach(input => {
                    const max = parseInt(input.dataset.max) || 25;
                    const value = Math.min(25, max);
                    input.value = value;
                    input.classList.add('filled');

                    const studentId = input.dataset.studentId;
                    const subjectId = input.dataset.subjectId;
                    const key = studentId + '_' + subjectId;
                    if (!marksData[key]) marksData[key] = { cq: '', mcq: '', practical: '' };
                    marksData[key].practical = value;
                });

                loadedStudents.forEach(stu => updateStudentResult(stu.id));
                updateStats();
                markUnsaved();

                window.fdcSuccess(`${inputs.length}টি practical field-এ 25 বসানো হয়েছে।`);
            },
            { title: 'Fill Practical', confirmText: 'Yes, Fill' }
        );
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
                    input.classList.remove('filled', 'error');
                });
                loadedStudents.forEach(stu => updateStudentResult(stu.id));
                updateStats();
                markUnsaved();
                window.fdcSuccess('সব marks clear করা হয়েছে।');
            },
            { title: 'Clear All Marks', confirmText: 'Yes, Clear', confirmType: 'danger' }
        );
    }

    // =========================================================
    // MARK UNSAVED
    // =========================================================
    function markUnsaved() {
        hasUnsavedChanges = true;
        const badge = $('statusBadge');
        if (badge) {
            badge.className = 'status-badge unsaved';
            badge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unsaved';
        }
    }

    // =========================================================
    // SAVE / PUBLISH
    // =========================================================
    async function saveDraft(publish = false) {
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
                        const resultData = {
                            student_id: stu.id,
                            exam_id: currentExamId,
                            year: currentYear,
                            session: session,
                            branch: currentBranch,
                            status: status,
                            is_published: publish,
                            published_at: publish ? new Date().toISOString() : null
                        };

                        const { data: existingResult } = await window.FDC_SUPABASE
                            .from('results')
                            .select('id')
                            .eq('student_id', stu.id)
                            .eq('exam_id', currentExamId)
                            .eq('year', currentYear)
                            .maybeSingle();

                        let resultId;
                        if (existingResult) {
                            resultId = existingResult.id;
                            await window.FDC_SUPABASE
                                .from('results')
                                .update(resultData)
                                .eq('id', resultId);
                        } else {
                            const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                                .from('results')
                                .insert([resultData])
                                .select()
                                .single();
                            if (insErr) throw insErr;
                            resultId = inserted.id;
                        }

                        // Delete old details
                        await window.FDC_SUPABASE
                            .from('result_details')
                            .delete()
                            .eq('result_id', resultId);

                        // Insert new details
                        const detailsRecords = [];

                        subjectSections.forEach(sec => {
                            sec.subjects.forEach(subj => {
                                subj.papers.forEach(p => {
                                    const key = stu.id + '_' + p.id;
                                    const m = marksData[key] || { cq: 0, mcq: 0, practical: 0 };

                                    const cq = parseFloat(m.cq) || 0;
                                    const mcq = parseFloat(m.mcq) || 0;
                                    const pr = parseFloat(m.practical) || 0;
                                    const total = cq + mcq + pr;

                                    const full = (p.cq_marks || 0) + (p.mcq_marks || 0) + (p.practical_marks || 0);
                                    const grade = getGrade(total, full);
                                    const gp = getGradePoint(total, full);

                                    let pStatus = 'pass';
                                    if (total < Math.ceil(full * 0.33)) pStatus = 'fail';
                                    if (p.has_cq && cq < Math.ceil((p.cq_marks || 0) * 0.33)) pStatus = 'fail';
                                    if (p.has_mcq && mcq < Math.ceil((p.mcq_marks || 0) * 0.33)) pStatus = 'fail';
                                    if (p.has_practical && pr < Math.ceil((p.practical_marks || 0) * 0.33)) pStatus = 'fail';

                                    detailsRecords.push({
                                        result_id: resultId,
                                        student_id: stu.id,
                                        subject_id: p.id,
                                        exam_id: currentExamId,
                                        subject_type: sec.type,
                                        paper_number: p.paper_number,
                                        cq_marks: cq,
                                        mcq_marks: mcq,
                                        practical_marks: pr,
                                        total_marks: total,
                                        grade: grade,
                                        grade_point: gp,
                                        status: pStatus
                                    });
                                });
                            });
                        });

                        if (detailsRecords.length > 0) {
                            const { error: detErr } = await window.FDC_SUPABASE
                                .from('result_details')
                                .insert(detailsRecords);
                            if (detErr) throw detErr;
                        }

                        // Update GPA / Grade in results
                        const stuResult = calculateStudentGPA(stu.id);
                        await window.FDC_SUPABASE
                            .from('results')
                            .update({
                                gpa: stuResult.gpa,
                                grade: stuResult.grade,
                                total_marks: stuResult.totalMarks
                            })
                            .eq('id', resultId);
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
                title: actionLabel + ' Confirmation',
                confirmText: publish ? 'Yes, Publish' : 'Yes, Save',
                confirmType: publish ? 'success' : 'primary'
            }
        );
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('filterBranch').addEventListener('change', async function () {
            const branch = this.value;
            if (branch === 'HSC') {
                $('groupFieldWrap').style.display = 'block';
                await loadGroupsByBranch(branch);
            } else if (branch === 'BM') {
                $('groupFieldWrap').style.display = 'none';
            } else {
                $('groupFieldWrap').style.display = 'block';
                $('filterGroup').innerHTML = '<option value="">Select Group</option>';
            }
        });

        $('btnLoadStudents').addEventListener('click', loadStudents);
        $('btnFillPractical').addEventListener('click', fillAllPractical);
        $('btnClearAll').addEventListener('click', clearAll);
        $('btnSaveDraft').addEventListener('click', () => saveDraft(false));
        $('btnPublish').addEventListener('click', () => saveDraft(true));

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
        console.log('🚀 Admin Results initializing...');

        loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadExams();

            console.log('✅ Admin Results ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();