/**
 * =========================================================
 * FULBARIYA COLLEGE — RESULT DETAILS (Public Student View)
 * Location: js/result-details.js
 * Version: v4 — Simplified Combined Marksheet
 * Depends: config.js, supabase.js, admin-popup.js
 * 
 * ✅ v4 Changes:
 *   - Simplified marksheet (subject + grade only)
 *   - No subject code
 *   - No CQ/MCQ/Practical columns
 *   - No paper-wise breakdown
 *   - Combined grade for multi-paper subjects
 *   - ৪র্থ subject tagged
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
    let details = [];
    let bookGroups = [];

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
            const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                             'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
            return `${d.getDate()} ${bnMonths[d.getMonth()]} ${d.getFullYear()}`;
        } catch (e) {
            return dateStr;
        }
    }

    function getGradeClass(grade) {
        const map = {
            'A+': 'Aplus', 'A': 'A', 'A-': 'Aminus',
            'B': 'B', 'C': 'C', 'D': 'D', 'F': 'F'
        };
        return map[grade] || 'F';
    }

    function gpToGrade(gp) {
        if (gp >= 5.00) return 'A+';
        if (gp >= 4.00) return 'A';
        if (gp >= 3.50) return 'A-';
        if (gp >= 3.00) return 'B';
        if (gp >= 2.00) return 'C';
        if (gp >= 1.00) return 'D';
        return 'F';
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
    // GET URL PARAMS
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
        $('resultArea').classList.remove('show');

        try {
            const { data: stuData, error: stuErr } = await window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('id', studentId)
                .maybeSingle();

            if (stuErr) throw stuErr;
            if (!stuData) {
                showError('Student পাওয়া যায়নি।');
                return;
            }
            student = stuData;

            const { data: resData, error: resErr } = await window.FDC_SUPABASE
                .from('results')
                .select('*')
                .eq('id', resultId)
                .eq('is_published', true)
                .maybeSingle();

            if (resErr) throw resErr;
            if (!resData) {
                showError('Result পাওয়া যায়নি বা এখনো publish করা হয়নি।');
                return;
            }
            result = resData;

            const { data: detData, error: detErr } = await window.FDC_SUPABASE
                .from('result_details')
                .select('*, subjects(*)')
                .eq('result_id', resultId)
                .order('subject_id');

            if (detErr) throw detErr;
            details = detData || [];

            if (details.length === 0) {
                showError('Result-এর কোনো details পাওয়া যায়নি।');
                return;
            }

            buildBookGroups();
            renderSheet();

            $('loadingArea').classList.remove('show');
            $('resultArea').classList.add('show');

        } catch (e) {
            console.error('Load details error:', e);
            showError('সমস্যা হয়েছে: ' + e.message);
        }
    }

    function showError(msg) {
        $('loadingArea').classList.remove('show');
        $('emptyState').style.display = 'block';
        $('emptyState').querySelector('h6').textContent = msg;
        $('emptyState').querySelector('p').textContent = 'Back to search করুন অথবা কলেজে যোগাযোগ করুন।';
    }

    // =========================================================
    // BUILD BOOK GROUPS (Combined per subject)
    // =========================================================
    function buildBookGroups() {
        const map = new Map();

        details.forEach(d => {
            const subj = d.subjects;
            if (!subj) return;

            const key = [
                subj.subject_name,
                subj.subject_type,
                subj.group_name || ''
            ].join('|');

            if (!map.has(key)) {
                map.set(key, {
                    key,
                    subject_name: subj.subject_name,
                    subject_type: subj.subject_type,
                    group_name: subj.group_name,
                    papers: [],
                    failed: false
                });
            }

            const book = map.get(key);
            book.papers.push({
                grade: d.grade || 'F',
                gp: d.grade_point || 0,
                status: d.status || 'pass'
            });

            if (d.status === 'fail') book.failed = true;
        });

        map.forEach(book => {
            if (book.failed) {
                book.combinedGP = 0;
                book.combinedGrade = 'F';
            } else if (book.papers.length > 0) {
                const sum = book.papers.reduce((s, p) => s + (p.gp || 0), 0);
                const avg = sum / book.papers.length;
                book.combinedGP = Math.round(avg * 100) / 100;
                book.combinedGrade = gpToGrade(book.combinedGP);
            } else {
                book.combinedGP = 0;
                book.combinedGrade = 'F';
            }
        });

        // Sort: compulsory → group → optional
        const typeOrder = { compulsory: 0, group: 1, optional: 2 };
        bookGroups = Array.from(map.values()).sort((a, b) => {
            const ta = typeOrder[a.subject_type] ?? 99;
            const tb = typeOrder[b.subject_type] ?? 99;
            if (ta !== tb) return ta - tb;
            return (a.subject_name || '').localeCompare(b.subject_name || '', 'bn');
        });
    }

    // =========================================================
    // RENDER SHEET
    // =========================================================
    function renderSheet() {
        const exam = allExams.find(e => String(e.id) === String(result.exam_id));
        const examName = exam ? exam.display_name : 'Exam';

        const sections = {
            compulsory: bookGroups.filter(b => b.subject_type === 'compulsory'),
            group: bookGroups.filter(b => b.subject_type === 'group'),
            optional: bookGroups.filter(b => b.subject_type === 'optional')
        };

        const gpaData = calculateOverallGPA();

        let html = `
            <div class="sheet-wrapper" id="sheetWrapper">
                <div class="sheet-header">
                    <div class="sh-logo">
                        <img src="../assets/images/logo1.png" alt="Fulbariya College"
                             onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fas fa-graduation-cap\\' style=\\'font-size:32px;color:var(--navy);\\'></i>';">
                    </div>
                    <div class="sh-info">
                        <div class="sh-college">Fulbariya College</div>
                        <div class="sh-address">Fulbariya, Mymensingh, Bangladesh</div>
                        <div class="sh-title">Academic Transcript</div>
                        <div class="sh-exam">${escapeHtml(examName)} — ${escapeHtml(result.year)}</div>
                    </div>
                </div>

                <div class="student-info">
                    <div class="si-item">
                        <div class="si-label">Student Name</div>
                        <div class="si-value">${escapeHtml(student.name)}</div>
                    </div>
                    <div class="si-item">
                        <div class="si-label">Roll Number</div>
                        <div class="si-value">${escapeHtml(student.roll)}</div>
                    </div>
                    <div class="si-item">
                        <div class="si-label">Class</div>
                        <div class="si-value">${escapeHtml(student.class_name)}</div>
                    </div>
                    <div class="si-item">
                        <div class="si-label">Branch</div>
                        <div class="si-value">${escapeHtml(student.branch)}</div>
                    </div>
                    <div class="si-item">
                        <div class="si-label">Group</div>
                        <div class="si-value">${escapeHtml(student.group_name || '—')}</div>
                    </div>
                    <div class="si-item">
                        <div class="si-label">Session</div>
                        <div class="si-value">${escapeHtml(student.session || '—')}</div>
                    </div>
                </div>
        `;

        if (sections.compulsory.length > 0) {
            html += renderSection('📌 আবশ্যিক বিষয় (Compulsory)', sections.compulsory);
        }
        if (sections.group.length > 0) {
            html += renderSection('📚 গ্রুপের বিষয় (Group)', sections.group);
        }
        if (sections.optional.length > 0) {
            html += renderSection('🎯 ৪র্থ বিষয় (Optional)', sections.optional);
        }

        html += renderSummary(gpaData);

        html += `
                <div class="sheet-footer">
                    <div class="footer-note">
                        <strong>নোট:</strong><br>
                        এই transcript অনলাইনে যাচাই করা হয়েছে। যেকোনো discrepancy
                        থাকলে দ্রুত কলেজে যোগাযোগ করুন।<br><br>
                        <strong>প্রকাশিত:</strong> ${formatDate(result.published_at)}
                    </div>
                    <div class="signature">
                        <div class="sig-line">Controller of Examinations</div>
                        <div class="sig-sub">Fulbariya College</div>
                    </div>
                </div>
            </div>
        `;

        $('sheetContent').innerHTML = html;
    }

    // =========================================================
    // RENDER SECTION (Simplified — Combined Grade Only)
    // =========================================================
    function renderSection(title, books) {
        let html = `
            <div class="section">
                <div class="section-title">
                    <i class="fas fa-book"></i>
                    ${escapeHtml(title)}
                </div>
                <table class="marks-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        books.forEach(book => {
            const grade = book.failed ? 'F' : (book.combinedGrade || 'F');
            const isOptional = book.subject_type === 'optional';

            html += `
                <tr>
                    <td class="subject-name-cell">
                        ${escapeHtml(book.subject_name)}
                        ${isOptional ? '<span class="fourth-tag">৪র্থ</span>' : ''}
                    </td>
                    <td>
                        <span class="grade-badge ${getGradeClass(grade)}">${grade}</span>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        return html;
    }

    // =========================================================
    // RENDER SUMMARY (Simplified)
    // =========================================================
    function renderSummary(gpaData) {
        const statusClass = gpaData.status === 'fail' ? 'fail' : '';

        return `
            <div class="result-summary">
                <div class="final-box">
                    <div class="fb-item gpa">
                        <div class="fb-label">GPA</div>
                        <div class="fb-value">${gpaData.gpa.toFixed(2)}</div>
                    </div>
                    <div class="fb-item grade">
                        <div class="fb-label">Grade</div>
                        <div class="fb-value">${gpaData.grade}</div>
                    </div>
                    <div class="fb-item status ${statusClass}">
                        <div class="fb-label">Status</div>
                        <div class="fb-value">${gpaData.status === 'pass' ? 'PASS' : 'FAIL'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // CALCULATE OVERALL GPA
    // =========================================================
    function calculateOverallGPA() {
        const mainSubjects = bookGroups.filter(b => b.subject_type !== 'optional');
        const optional = bookGroups.find(b => b.subject_type === 'optional');

        // Compulsory fail check
        const compulsoryFail = bookGroups.find(b => b.subject_type === 'compulsory' && b.failed);
        if (compulsoryFail) {
            return {
                gpa: 0, grade: 'F', status: 'fail',
                failReason: `${compulsoryFail.subject_name} fail`
            };
        }

        // Main subject fail check
        const mainFail = mainSubjects.find(b => b.failed);
        if (mainFail) {
            return {
                gpa: 0, grade: 'F', status: 'fail',
                failReason: `${mainFail.subject_name} fail`
            };
        }

        const mainSum = mainSubjects.reduce((s, b) => s + (b.combinedGP || 0), 0);
        const mainCount = mainSubjects.length;

        if (mainCount === 0) {
            return { gpa: 0, grade: 'F', status: 'fail' };
        }

        // 4th subject bonus
        let bonus = 0;
        if (optional && !optional.failed && optional.combinedGP > 2.00) {
            bonus = optional.combinedGP - 2.00;
        }

        let gpa = (mainSum + bonus) / mainCount;
        if (gpa > 5.00) gpa = 5.00;
        gpa = Math.round(gpa * 100) / 100;

        return {
            gpa,
            grade: gpToGrade(gpa),
            status: 'pass'
        };
    }

    // =========================================================
    // PRINT / DOWNLOAD PDF
    // =========================================================
    function downloadPDF() {
        const originalTitle = document.title;
        const pdfFilename = `Result_${student.roll}_${student.name.replace(/\s+/g, '_')}_${result.year}`;
        document.title = pdfFilename;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    }

    function printSheet() {
        window.print();
    }

    // =========================================================
    // SHARE
    // =========================================================
    async function shareSheet() {
        const shareData = {
            title: 'Fulbariya College Result',
            text: `${student.name} (Roll: ${student.roll}) — GPA: ${result.gpa} (${result.grade})`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                window.fdcSuccess('✅ Link copied to clipboard!');
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('Share error:', e);
            }
        }
    }

    // =========================================================
    // ATTACH EVENTS
    // =========================================================
    function attachEvents() {
        const btnPrint = $('btnPrint');
        const btnPrintNative = $('btnPrintNative');
        const btnShare = $('btnShare');

        if (btnPrint) btnPrint.addEventListener('click', downloadPDF);
        if (btnPrintNative) btnPrintNative.addEventListener('click', printSheet);
        if (btnShare) btnShare.addEventListener('click', shareSheet);
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Result Details v4 initializing...');

        attachEvents();

        waitForSupabase(async function () {
            await loadExams();
            await loadDetails();
            console.log('✅ Result Details v4 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();