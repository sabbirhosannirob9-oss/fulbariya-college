/**
 * =========================================================
 * FULBARIYA COLLEGE — RESULT DETAILS
 * Location: js/result-details.js
 * Depends: config.js, supabase.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allExams = [];
    let student = null;
    let result = null;

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
            if (++n > 30) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // GRADE HELPERS
    // =========================================================
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
    // PARSE URL PARAMS
    // =========================================================
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            studentId: params.get('student_id'),
            resultId: params.get('result_id'),
            examId: params.get('exam_id')
        };
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
        } catch (e) {
            console.error('Load exams error:', e);
        }
    }

    // =========================================================
    // LOAD DETAILS
    // =========================================================
    async function loadDetails() {
        const { studentId, resultId, examId } = getUrlParams();

        if (!studentId || !resultId || !examId) {
            $('loadingArea').classList.remove('show');
            $('emptyState').style.display = 'block';
            return;
        }

        $('loadingArea').classList.add('show');
        $('emptyState').style.display = 'none';
        $('resultArea').innerHTML = '';

        try {
            // Load student
            const { data: stuData, error: stuErr } = await window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('id', studentId)
                .maybeSingle();

            if (stuErr) throw stuErr;
            if (!stuData) {
                $('loadingArea').classList.remove('show');
                $('emptyState').style.display = 'block';
                window.fdcError('Student পাওয়া যায়নি।');
                return;
            }

            student = stuData;

            // Load result
            const { data: resData, error: resErr } = await window.FDC_SUPABASE
                .from('results')
                .select('*')
                .eq('id', resultId)
                .eq('is_published', true)
                .maybeSingle();

            if (resErr) throw resErr;
            if (!resData) {
                $('loadingArea').classList.remove('show');
                $('emptyState').style.display = 'block';
                window.fdcError('Result পাওয়া যায়নি বা এখনো publish করা হয়নি।');
                return;
            }

            result = resData;

            // Load result_details with subjects
            const { data: details, error: detErr } = await window.FDC_SUPABASE
                .from('result_details')
                .select('*, subjects(subject_name, subject_code, paper_number, subject_type, has_cq, has_mcq, has_practical, cq_marks, mcq_marks, practical_marks)')
                .eq('result_id', resultId)
                .order('subject_id');

            if (detErr) throw detErr;

            renderMarksheet(details || []);

            $('loadingArea').classList.remove('show');
            $('resultArea').innerHTML = $('resultArea').innerHTML; // dummy
            $('actionBar').style.display = 'flex';
            $('resultArea').classList.add('show');

        } catch (e) {
            console.error('Load details error:', e);
            $('loadingArea').classList.remove('show');
            $('emptyState').style.display = 'block';
            window.fdcError('সমস্যা হয়েছে: ' + e.message);
        }
    }

    // =========================================================
    // RENDER MARKSHEET
    // =========================================================
    function renderMarksheet(details) {
        const exam = allExams.find(e => String(e.id) === String(result.exam_id));
        const examName = exam ? exam.display_name : 'Exam';

        // Group by subject_type + subject_name
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
                status: d.status || 'pass'
            });
        });

        subjectsMap.forEach(v => v.papers.sort((a, b) => (a.paper_number || 1) - (b.paper_number || 1)));

        const grouped = { compulsory: [], group: [], optional: [] };
        subjectsMap.forEach(v => {
            if (grouped[v.subject_type]) grouped[v.subject_type].push(v);
        });

        Object.keys(grouped).forEach(k => {
            grouped[k].sort((a, b) => a.subject_name.localeCompare(b.subject_name, 'bn'));
        });

        const sectionLabels = {
            compulsory: { icon: 'fa-lock', label: '📌 আবশ্যিক বিষয়' },
            group: { icon: 'fa-layer-group', label: '📚 গ্রুপের বিষয়' },
            optional: { icon: 'fa-star', label: '🎯 ঐচ্ছিক বিষয়' }
        };

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

        const gpaClass = getGPAClass(result.gpa || 0);

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
        `;

        $('resultArea').innerHTML = html;
        $('detailInfoLabel').textContent = student.name + ' — ' + examName;
    }

    // =========================================================
    // RENDER SUBJECT ROWS
    // =========================================================
    function renderSubjectRows(subj) {
        let html = '';

        subj.papers.forEach(p => {
            const paperLabel = subj.papers.length > 1
                ? `${subj.subject_name} (${p.paper_number}য় পত্র)`
                : subj.subject_name;

            const codeLabel = subj.subject_code
                ? `<span class="code-cell">${escapeHtml(subj.subject_code)}</span>`
                : '';

            const gradeClass = getGradeClass(p.grade);
            const statusIcon = p.status === 'pass'
                ? ''
                : ' <i class="fas fa-times-circle" style="color:#dc2626;"></i>';

            html += `
                <tr>
                    <td>${escapeHtml(paperLabel)} ${codeLabel}</td>
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
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Result Details initializing...');
        waitForSupabase(async function () {
            await loadExams();
            await loadDetails();
            console.log('✅ Result Details ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();