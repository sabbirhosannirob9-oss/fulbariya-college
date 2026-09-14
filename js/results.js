/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC RESULT SEARCH
 * Location: js/results.js
 * Depends: config.js, supabase.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let currentBranch = 'HSC';
    let allExams = [];

    // =========================================================
    // DOM HELPERS
    // =========================================================
    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, "&#39;");
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
            if (++n > 30) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // GRADE HELPERS
    // =========================================================
    function getGrade(marks, fullMarks) {
        if (!fullMarks || fullMarks === 0) return 'F';
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

    function getGPAClass(gpa) {
        if (gpa >= 4.50) return 'gpa-high';
        if (gpa >= 3.00) return 'gpa-mid';
        return 'gpa-low';
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
            const select = $('inputExam');
            select.innerHTML = '<option value="">Select Exam</option>';
            allExams.forEach(e => {
                select.insertAdjacentHTML('beforeend',
                    `<option value="${e.id}">${escapeHtml(e.display_name)}</option>`);
            });
        } catch (e) {
            console.error('Load exams error:', e);
        }
    }

    // =========================================================
    // LOAD YEAR OPTIONS
    // =========================================================
    function loadYearOptions() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = -3; i <= 1; i++) years.push(currentYear + i);

        const select = $('inputYear');
        select.innerHTML = '<option value="">Select Year</option>';
        years.forEach(y => {
            select.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
        });
    }

    // =========================================================
    // LOAD GROUPS
    // =========================================================
    async function loadGroups(branch) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('groups')
                .select('*')
                .eq('branch', branch)
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            const select = $('inputGroup');
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
    // BRANCH TOGGLE
    // =========================================================
    function attachBranchToggle() {
        document.querySelectorAll('.branch-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.branch-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentBranch = this.dataset.branch;

                if (currentBranch === 'HSC') {
                    $('groupFieldWrap').style.display = 'block';
                    loadGroups('HSC');
                } else {
                    $('groupFieldWrap').style.display = 'none';
                    $('inputGroup').innerHTML = '<option value="">Select Group</option>';
                }
            });
        });
    }

    // =========================================================
    // SEARCH RESULT
    // =========================================================
    async function searchResult() {
        const roll = $('inputRoll').value.trim();
        const className = $('inputClass').value;
        const year = $('inputYear').value;
        const examId = $('inputExam').value;
        const groupName = $('inputGroup').value;

        // Validation
        if (!roll) return window.fdcWarning('Roll number দিন।');
        if (!className) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!year) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!examId) return window.fdcWarning('Exam সিলেক্ট করুন।');
        if (currentBranch === 'HSC' && !groupName) {
            return window.fdcWarning('Group সিলেক্ট করুন।');
        }

        const btn = $('btnSearch');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> খোঁজা হচ্ছে...';

        // Hide existing
        $('searchCard').style.display = 'none';
        $('resultArea').classList.remove('show');
        $('emptyState').style.display = 'none';
        $('loadingArea').classList.add('show');

        try {
            // 1. Find student
            let stuQuery = window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('roll', roll)
                .eq('class_name', className)
                .eq('year', year)
                .eq('branch', currentBranch)
                .eq('is_active', true);

            if (currentBranch === 'HSC') {
                stuQuery = stuQuery.eq('group_name', groupName);
            }

            const { data: students, error: stuErr } = await stuQuery;

            if (stuErr) throw stuErr;

            if (!students || students.length === 0) {
                $('loadingArea').classList.remove('show');
                $('searchCard').style.display = 'block';
                return window.fdcError(
                    'এই তথ্য অনুযায়ী কোনো student পাওয়া যায়নি।<br>' +
                    'Roll, Class, Year, Branch, Group সঠিকভাবে দিন।'
                );
            }

            const student = students[0];

            // 2. Find result
            const { data: results, error: resErr } = await window.FDC_SUPABASE
                .from('results')
                .select('*')
                .eq('student_id', student.id)
                .eq('exam_id', examId)
                .eq('year', year)
                .eq('is_published', true)
                .maybeSingle();

            if (resErr) throw resErr;

            if (!results) {
                $('loadingArea').classList.remove('show');
                $('searchCard').style.display = 'block';
                return window.fdcError(
                    'এই exam-এ আপনার result এখনো publish করা হয়নি।<br>' +
                    'পরে আবার চেষ্টা করুন বা কলেজে যোগাযোগ করুন।'
                );
            }

            // 3. Load result_details with subject info
            const { data: details, error: detErr } = await window.FDC_SUPABASE
                .from('result_details')
                .select('*, subjects(subject_name, subject_code, paper_number, subject_type, has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks)')
                .eq('result_id', results.id)
                .order('subject_id');

            if (detErr) throw detErr;

            // 4. Also load student_subjects for structure
            const { data: studentSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type, subjects(*)')
                .eq('student_id', student.id)
                .eq('is_active', true);

            // 5. Render marksheet
            renderMarksheet(student, results, details || [], studentSubs || [], examId);

            // Show result
            $('loadingArea').classList.remove('show');
            $('resultArea').classList.add('show');
            $('resultArea').scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (e) {
            console.error('Search error:', e);
            $('loadingArea').classList.remove('show');
            $('searchCard').style.display = 'block';
            window.fdcError('সমস্যা হয়েছে: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // RENDER MARKSHEET
    // =========================================================
    function renderMarksheet(student, result, details, studentSubs, examId) {
        const exam = allExams.find(e => String(e.id) === String(examId));
        const examName = exam ? exam.display_name : 'Exam';

        // Group details by subject_type and subject_name
        const subjectsMap = new Map();

        details.forEach(d => {
            const s = d.subjects;
            if (!s) return;

            const key = s.subject_name + '|' + d.subject_type;
            if (!subjectsMap.has(key)) {
                subjectsMap.set(key, {
                    subject_name: s.subject_name,
                    subject_code: s.subject_code,
                    subject_type: d.subject_type,
                    has_cq: s.has_cq,
                    has_mcq: s.has_mcq,
                    has_practical: s.has_practical,
                    papers: []
                });
            }
            subjectsMap.get(key).papers.push({
                paper_number: d.paper_number || s.paper_number,
                cq_marks: d.cq_marks || 0,
                mcq_marks: d.mcq_marks || 0,
                practical_marks: d.practical_marks || 0,
                total_marks: d.total_marks || 0,
                grade: d.grade || '—',
                status: d.status || 'pass',
                max_cq: s.cq_marks || 0,
                max_mcq: s.mcq_marks || 0,
                max_practical: s.practical_marks || 0
            });
        });

        // Sort papers
        subjectsMap.forEach(v => v.papers.sort((a, b) => (a.paper_number || 1) - (b.paper_number || 1)));

        // Group by type
        const grouped = {
            compulsory: [],
            group: [],
            optional: []
        };
        subjectsMap.forEach((v, k) => {
            if (grouped[v.subject_type]) grouped[v.subject_type].push(v);
        });

        // Sort by subject_name
        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => a.subject_name.localeCompare(b.subject_name, 'bn'));
        });

        // Section labels
        const sectionLabels = {
            compulsory: { icon: 'fa-lock', label: '📌 আবশ্যিক বিষয়' },
            group: { icon: 'fa-layer-group', label: '📚 গ্রুপের বিষয়' },
            optional: { icon: 'fa-star', label: '🎯 ঐচ্ছিক বিষয়' }
        };

        // Build sections HTML
        let sectionsHTML = '';

        ['compulsory', 'group', 'optional'].forEach(type => {
            if (grouped[type].length === 0) return;

            sectionsHTML += `
                <div class="ms-section">
                    <div class="ms-section-header">
                        <i class="fas ${sectionLabels[type].icon}"></i>
                        ${sectionLabels[type].label}
                    </div>
                    <table class="ms-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>CQ</th>
                                <th>MCQ</th>
                                <th>Practical</th>
                                <th>Total</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grouped[type].map(subj => renderSubjectRows(subj)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        // GPA color
        const gpaClass = getGPAClass(result.gpa || 0);

        // Build marksheet
        const html = `
            <div class="marksheet">
                <div class="ms-header">
                    <div class="ms-logo"><i class="fas fa-graduation-cap"></i></div>
                    <h2>Fulbariya Degree College</h2>
                    <p class="ms-subtitle">Academic Transcript</p>
                    <span class="ms-exam-badge">${escapeHtml(examName)} - ${escapeHtml(result.year)}</span>
                </div>

                <div class="ms-student-info">
                    <div class="ms-info-item">
                        <span class="label">Student Name</span>
                        <span class="value">${escapeHtml(student.name)}</span>
                    </div>
                    <div class="ms-info-item">
                        <span class="label">Roll Number</span>
                        <span class="value">${escapeHtml(student.roll)}</span>
                    </div>
                    <div class="ms-info-item">
                        <span class="label">Class</span>
                        <span class="value">${escapeHtml(student.class_name)}</span>
                    </div>
                    <div class="ms-info-item">
                        <span class="label">Branch</span>
                        <span class="value">${escapeHtml(student.branch)}</span>
                    </div>
                    <div class="ms-info-item">
                        <span class="label">Group</span>
                        <span class="value">${escapeHtml(student.group_name || '—')}</span>
                    </div>
                    <div class="ms-info-item">
                        <span class="label">Session</span>
                        <span class="value">${escapeHtml(student.session || '—')}</span>
                    </div>
                </div>

                <div class="ms-body">
                    ${sectionsHTML}
                </div>

                <div class="ms-summary">
                    <div class="ms-summary-item">
                        <div class="s-label">Total Marks</div>
                        <div class="s-value">${escapeHtml(String(result.total_marks || 0))}</div>
                    </div>
                    <div class="ms-summary-item">
                        <div class="s-label">GPA</div>
                        <div class="s-value ${gpaClass}">${(result.gpa || 0).toFixed(2)}</div>
                    </div>
                    <div class="ms-summary-item">
                        <div class="s-label">Grade</div>
                        <div class="s-value">${escapeHtml(result.grade || '—')}</div>
                    </div>
                </div>

                <div class="ms-footer">
                    <div class="ms-note">
                        <i class="fas fa-info-circle"></i>
                        <span>এই রেজাল্ট অনলাইনে যাচাই করা হয়েছে</span>
                    </div>
                    <div class="ms-note">
                        <i class="fas fa-calendar-alt"></i>
                        <span>প্রকাশিত: ${result.published_at ? new Date(result.published_at).toLocaleDateString('bn-BD') : '—'}</span>
                    </div>
                </div>
            </div>

            <div class="print-btn-wrap">
                <button class="btn-print" onclick="window.print()">
                    <i class="fas fa-print"></i> Print / Download
                </button>
            </div>

            <div class="search-another">
                <button class="btn-another" onclick="resetSearch()">
                    <i class="fas fa-search"></i> আরেকটি রেজাল্ট খুঁজুন
                </button>
            </div>
        `;

        $('resultArea').innerHTML = html;
    }

    // =========================================================
    // RENDER SUBJECT ROWS (প্রতি paper আলাদা row)
    // =========================================================
    function renderSubjectRows(subj) {
        let html = '';

        subj.papers.forEach((p, idx) => {
            const isFirst = idx === 0;
            const paperLabel = subj.papers.length > 1
                ? `${subj.subject_name} (${p.paper_number}য় পত্র)`
                : subj.subject_name;

            const codeLabel = subj.subject_code
                ? `<span class="code-cell">${escapeHtml(subj.subject_code)}</span>`
                : '';

            const gradeClass = getGradeClass(p.grade);
            const statusIcon = p.status === 'pass'
                ? ''
                : ' <i class="fas fa-times-circle status-fail"></i>';

            html += `
                <tr>
                    <td>
                        ${escapeHtml(paperLabel)}
                        ${codeLabel}
                    </td>
                    <td>${subj.has_cq ? (p.cq_marks || 0) : '—'}</td>
                    <td>${subj.has_mcq ? (p.mcq_marks || 0) : '—'}</td>
                    <td>${subj.has_practical ? (p.practical_marks || 0) : '—'}</td>
                    <td class="total-cell">${p.total_marks || 0}</td>
                    <td>
                        <span class="grade-mini ${gradeClass}">${escapeHtml(p.grade || '—')}</span>
                        ${statusIcon}
                    </td>
                </tr>
            `;
        });

        return html;
    }

    // =========================================================
    // RESET SEARCH
    // =========================================================
    window.resetSearch = function () {
        $('resultArea').classList.remove('show');
        $('resultArea').innerHTML = '';
        $('searchCard').style.display = 'block';
        $('emptyState').style.display = 'block';
        $('inputRoll').value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('btnSearch').addEventListener('click', searchResult);

        // Enter key on Roll input → search
        $('inputRoll').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') searchResult();
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Public Results initializing...');

        attachBranchToggle();
        attachEvents();
        loadYearOptions();

        waitForSupabase(async function () {
            await loadExams();
            await loadGroups('HSC');
            console.log('✅ Public Results ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();