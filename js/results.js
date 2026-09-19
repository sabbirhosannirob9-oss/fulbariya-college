/**
 * =========================================================
 * FULBARIYA COLLEGE — PUBLIC RESULT SEARCH
 * Location: js/results.js
 * Version: v2 — Preview + Redirect to Result Sheet
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
    let foundStudent = null;
    let foundResult = null;

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
                $('inputBranch').value = currentBranch;

                if (currentBranch === 'HSC') {
                    $('groupFieldWrap').style.display = 'block';
                    loadGroups('HSC');
                } else {
                    $('groupFieldWrap').style.display = 'none';
                    $('inputGroup').innerHTML = '<option value="">Select Group</option>';
                }

                hideError();
                hidePreview();
            });
        });
    }

    // =========================================================
    // SHOW / HIDE HELPERS
    // =========================================================
    function showError(msg) {
        $('errorText').innerHTML = msg;
        $('errorAlert').classList.add('show');
        $('resultPreview').classList.remove('show');
    }

    function hideError() {
        $('errorAlert').classList.remove('show');
    }

    function showLoading() {
        $('loadingArea').classList.add('show');
        $('resultPreview').classList.remove('show');
        hideError();
    }

    function hideLoading() {
        $('loadingArea').classList.remove('show');
    }

    function hidePreview() {
        $('resultPreview').classList.remove('show');
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

        hideError();
        showLoading();

        try {
            // Find student
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
                hideLoading();
                showError('এই তথ্য অনুযায়ী কোনো student পাওয়া যায়নি।<br>Roll, Class, Year, Branch, Group সঠিকভাবে দিন।');
                return;
            }

            const student = students[0];
            foundStudent = student;

            // Find result
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
                hideLoading();
                showError('এই exam-এ result এখনো publish করা হয়নি।<br>পরে আবার চেষ্টা করুন বা কলেজে যোগাযোগ করুন।');
                return;
            }

            foundResult = results;

            hideLoading();
            showPreview(student, results);

        } catch (e) {
            console.error('Search error:', e);
            hideLoading();
            showError('সমস্যা হয়েছে: ' + escapeHtml(e.message));
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // SHOW PREVIEW
    // =========================================================
    function showPreview(student, result) {
        $('pvName').textContent = student.name || '—';
        $('pvRoll').textContent = student.roll || '—';
        $('pvClass').textContent = student.class_name || '—';
        $('pvBranch').textContent = student.branch || '—';
        $('pvGroup').textContent = student.group_name || '—';
        $('pvSession').textContent = student.session || '—';

        $('pvGPA').textContent = (result.gpa || 0).toFixed(2);
        $('pvGrade').textContent = result.grade || '—';
        $('pvMarks').textContent = result.total_marks || '—';

        // Update sub
        const exam = allExams.find(e => String(e.id) === String(result.exam_id));
        const examName = exam ? exam.display_name : 'Exam';
        $('previewSub').textContent = `${examName} — ${result.year} | বিস্তারিত দেখতে "View Full Result" চাপুন`;

        // Update view button link
        const viewBtn = $('btnViewResult');
        viewBtn.href = `result-details.html?student_id=${student.id}&result_id=${result.id}&exam_id=${result.exam_id}`;

        // Show preview
        $('resultPreview').classList.add('show');

        // Scroll to preview
        setTimeout(() => {
            $('resultPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // =========================================================
    // NEW SEARCH
    // =========================================================
    function newSearch() {
        $('inputRoll').value = '';
        $('inputClass').value = '';
        $('inputYear').value = '';
        $('inputExam').value = '';
        $('inputGroup').value = '';

        hidePreview();
        hideError();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function attachEvents() {
        $('btnSearch').addEventListener('click', searchResult);
        $('btnNewSearch').addEventListener('click', newSearch);

        // Enter key on Roll input
        $('inputRoll').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchResult();
            }
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Public Results v2 initializing...');

        attachBranchToggle();
        attachEvents();
        loadYearOptions();

        waitForSupabase(async function () {
            await loadExams();
            await loadGroups('HSC');
            console.log('✅ Public Results v2 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();