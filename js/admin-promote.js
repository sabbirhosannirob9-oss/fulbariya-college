/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN PROMOTE
 * Location: js/admin-promote.js
 * Version: v2.1 — Dynamic Years (Session Helper)
 * Depends: config.js, supabase.js, auth.js, admin-popup.js,
 *          promote-utils.js, promote-engine.js, session-helper.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allExams = [];
    let finalExam = null;
    let classifiedStudents = [];
    let selectedStudentIds = new Set();
    let adminInfo = null;
    let isProcessing = false;

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
    // SESSION HELPERS
    // =========================================================
    function getSessionFromYear(year) {
        if (!year) return '';
        const y = parseInt(year);
        if (isNaN(y)) return '';
        return y + '-' + (y + 1);
    }

    function getStudentSession(student) {
        if (!student) return '';
        if (student.session && String(student.session).trim() !== '') {
            return String(student.session).trim();
        }
        if (student.year) return getSessionFromYear(student.year);
        return '';
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
                adminInfo = result.admin;

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
            { title: 'Logout Confirmation', confirmText: 'Yes, Logout', cancelText: 'Cancel', confirmType: 'danger' }
        );
    };

    // =========================================================
    // ✅ LOAD YEAR OPTIONS — via Session Helper (Dynamic)
    // =========================================================
    async function loadYearOptions() {
        await window.FDCSession.fillYearDropdown('sourceYear', {
            autoSelectCurrent: false
        });
        await window.FDCSession.fillYearDropdown('targetYear', {
            autoSelectCurrent: false
        });

        console.log('✅ Year options loaded (dynamic)');
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

            finalExam = allExams.find(e =>
                (e.exam_name || '').toLowerCase() === 'final'
            ) || allExams[allExams.length - 1];

            if (finalExam) {
                $('examDisplay').value = finalExam.display_name || 'Final পরীক্ষা';
            }

            console.log('✅ Final exam:', finalExam);
        } catch (e) {
            console.error('Load exams error:', e);
            window.fdcError('Exam load failed: ' + e.message);
        }
    }

    // =========================================================
    // LOAD STUDENTS
    // =========================================================
    async function loadStudents() {
        if (isProcessing) return;

        const sourceClass = $('sourceClass').value;
        const sourceYear = $('sourceYear').value;
        const sourceBranch = $('sourceBranch').value;

        if (!sourceClass) return window.fdcWarning('Class সিলেক্ট করুন।');
        if (!sourceYear) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!sourceBranch) return window.fdcWarning('Branch সিলেক্ট করুন।');
        if (!finalExam) return window.fdcError('Final Exam খুঁজে পাওয়া যায়নি।');

        const btn = $('btnLoadStudents');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        $('loadStatus').innerHTML = '<div class="fdc-alert info"><i class="fas fa-spinner fa-spin"></i> Result analysis চলছে...</div>';
        $('studentsSection').style.display = 'none';
        $('emptyStudents').style.display = 'none';

        try {
            classifiedStudents = await window.FDCPromoteUtils.detectPassFail({
                sourceClass: sourceClass,
                sourceYear: sourceYear,
                branch: sourceBranch,
                examId: finalExam.id
            });

            console.log('✅ Classified students:', classifiedStudents.length);

            if (classifiedStudents.length === 0) {
                $('loadStatus').innerHTML = '';
                $('emptyStudents').style.display = 'block';
                $('stepStudents').classList.remove('disabled');
                return;
            }

            selectedStudentIds.clear();
            classifiedStudents.forEach(c => {
                if (c.status === 'pass') selectedStudentIds.add(c.student.id);
            });

            renderSummary();
            renderStudentList();

            $('loadStatus').innerHTML = '';
            $('studentsSection').style.display = 'block';
            $('stepStudents').classList.remove('disabled');
            $('stepTarget').classList.remove('disabled');

            updateConfirmText();

        } catch (e) {
            console.error('Load error:', e);
            $('loadStatus').innerHTML = `<div class="fdc-alert danger"><i class="fas fa-exclamation-triangle"></i> ${escapeHtml(e.message)}</div>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // =========================================================
    // RENDER SUMMARY
    // =========================================================
    function renderSummary() {
        const total = classifiedStudents.length;
        let passCount = 0, failCount = 0, noResultCount = 0;

        classifiedStudents.forEach(c => {
            if (c.status === 'pass') passCount++;
            else if (c.status === 'fail') failCount++;
            else noResultCount++;
        });

        $('statTotal').textContent = total;
        $('statPass').textContent = passCount;
        $('statFail').textContent = failCount;
        $('statNoResult').textContent = noResultCount;
    }

    // =========================================================
    // RENDER STUDENT LIST
    // =========================================================
    function renderStudentList() {
        const list = $('studentList');
        let html = '';

        classifiedStudents.forEach(c => {
            const stu = c.student;
            const isChecked = selectedStudentIds.has(stu.id);
            const statusClass = c.status === 'pass' ? 'pass' :
                               c.status === 'fail' ? 'fail' : 'no-result';
            const statusLabel = c.status === 'pass' ? '✅ Pass' :
                               c.status === 'fail' ? '❌ Fail' : '⚠️ No Result';
            const gpaText = c.gpa !== null && c.gpa !== undefined ? c.gpa.toFixed(2) : '—';

            const studentSession = getStudentSession(stu);

            html += `
                <div class="student-item ${isChecked ? 'checked' : ''} ${c.status}" data-id="${stu.id}">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} data-id="${stu.id}">
                    <span class="si-roll">${escapeHtml(stu.roll)}</span>
                    <span class="si-name">
                        ${escapeHtml(stu.name)}
                        <small>${escapeHtml(stu.branch)} · ${escapeHtml(stu.group_name || '—')} · <strong style="color:var(--navy);">Session: ${escapeHtml(studentSession || '—')}</strong></small>
                    </span>
                    <span class="si-gpa">${gpaText}</span>
                    <span class="si-status ${statusClass}">${statusLabel}</span>
                </div>
            `;
        });

        list.innerHTML = html;
        updateSelectedCount();
    }

    // =========================================================
    // UPDATE SELECTED COUNT
    // =========================================================
    function updateSelectedCount() {
        $('selectedCount').textContent = selectedStudentIds.size;

        const total = classifiedStudents.length;
        const allChecked = total > 0 && selectedStudentIds.size === total;
        $('selectAll').checked = allChecked;
    }

    // =========================================================
    // TARGET CHANGE
    // =========================================================
    async function onTargetChange() {
        const targetClass = $('targetClass').value;
        const targetYear = $('targetYear').value;
        const sourceBranch = $('sourceBranch').value;

        if (!targetClass || !targetYear) {
            $('targetInfo').innerHTML = '';
            $('stepConfirm').classList.add('disabled');
            return;
        }

        const sourceSession = classifiedStudents.length > 0
            ? getStudentSession(classifiedStudents[0].student)
            : getSessionFromYear($('sourceYear').value);

        $('targetSession').value = sourceSession;

        try {
            let query = window.FDC_SUPABASE
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('class_name', targetClass)
                .eq('year', targetYear)
                .eq('is_active', true);

            if (sourceBranch && sourceBranch !== 'All') {
                query = query.eq('branch', sourceBranch);
            }

            const { count } = await query;
            const targetCount = count || 0;

            $('targetInfo').innerHTML = `
                <div class="fdc-alert ${targetCount > 0 ? 'warn' : 'info'}">
                    <i class="fas fa-${targetCount > 0 ? 'exclamation-triangle' : 'info-circle'}"></i>
                    <div>
                        Class ${targetClass} / Year ${targetYear}-এ বর্তমানে <strong>${targetCount} জন</strong> student আছে।
                        ${targetCount > 0 ? '<br><strong>⚠️ Promote চালু করলে এরা delete হবে।</strong>' : ''}
                        <br><strong style="color:var(--navy);">🎓 Session থাকবে: ${escapeHtml(sourceSession)}</strong>
                    </div>
                </div>
            `;

            $('stepConfirm').classList.remove('disabled');
            updateFinalSummary();
            updateConfirmText();

        } catch (e) {
            console.error('Target check error:', e);
        }
    }

    // =========================================================
    // UPDATE FINAL SUMMARY
    // =========================================================
    function updateFinalSummary() {
        const sourceClass = $('sourceClass').value;
        const sourceYear = $('sourceYear').value;
        const sourceBranch = $('sourceBranch').value;
        const targetClass = $('targetClass').value;
        const targetYear = $('targetYear').value;

        if (!targetClass || !targetYear) {
            $('finalSummary').innerHTML = '';
            return;
        }

        const selectedCount = selectedStudentIds.size;
        const totalCount = classifiedStudents.length;
        const stayCount = totalCount - selectedCount;

        const sourceSession = classifiedStudents.length > 0
            ? getStudentSession(classifiedStudents[0].student)
            : getSessionFromYear(sourceYear);

        $('finalSummary').innerHTML = `
            <div class="summary-box">
                <div style="font-size:12.5px;color:var(--dark);line-height:2;">
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:baseline;">
                        <strong style="color:var(--navy);">📤 Source:</strong>
                        <span>Class ${sourceClass} / Year ${sourceYear} / ${sourceBranch}</span>
                        
                        <strong style="color:var(--navy);">📥 Target:</strong>
                        <span>Class ${targetClass} / Year ${targetYear}</span>
                        
                        <strong style="color:var(--navy);">🎓 Session:</strong>
                        <span><strong>${escapeHtml(sourceSession)}</strong> <small style="color:var(--grey);">(source থেকে copy)</small></span>
                        
                        <strong style="color:var(--success);">✅ Promote হবে:</strong>
                        <span><strong>${selectedCount} জন</strong> student</span>
                        
                        <strong style="color:var(--warning);">⏭️ Class ${sourceClass}-এ থাকবে:</strong>
                        <span><strong>${stayCount} জন</strong> student</span>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================
    // UPDATE CONFIRM TEXT
    // =========================================================
    function updateConfirmText() {
        const targetYear = $('targetYear').value;
        if (!targetYear) return;

        const code = 'DELETE ' + targetYear;
        $('confirmCode').textContent = code;
        $('confirmInput').value = '';
        $('confirmInput').placeholder = 'টাইপ করুন: ' + code;

        checkConfirmInput();
    }

    // =========================================================
    // CHECK CONFIRM INPUT
    // =========================================================
    function checkConfirmInput() {
        const expected = $('confirmCode').textContent.trim().toUpperCase();
        const input = $('confirmInput');
        const value = input.value.trim().toUpperCase();

        const btn = $('btnExecute');
        const targetClass = $('targetClass').value;
        const targetYear = $('targetYear').value;
        const hasStudents = selectedStudentIds.size > 0;

        if (value === expected && targetClass && targetYear && hasStudents) {
            btn.disabled = false;
            input.classList.add('valid');
        } else {
            btn.disabled = true;
            input.classList.remove('valid');
        }
    }

    // =========================================================
    // EXECUTE PROMOTE
    // =========================================================
    async function executePromote() {
        if (isProcessing) return;

        const sourceClass = $('sourceClass').value;
        const sourceYear = $('sourceYear').value;
        const sourceBranch = $('sourceBranch').value;
        const targetClass = $('targetClass').value;
        const targetYear = $('targetYear').value;

        const selected = classifiedStudents.filter(c =>
            selectedStudentIds.has(c.student.id)
        );

        if (selected.length === 0) {
            return window.fdcWarning('কোনো student select করা হয়নি।');
        }

        const sourceSession = selected.length > 0
            ? getStudentSession(selected[0].student)
            : '';

        const confirmed = await new Promise(resolve => {
            window.fdcConfirm(
                `⚠️ চূড়ান্ত নিশ্চিতকরণ\n\n` +
                `• ${selected.length} জন student Class ${targetClass}-এ যাবে\n` +
                `• Session থাকবে: ${sourceSession} (অপরিবর্তিত)\n` +
                `• Class ${targetClass} / Year ${targetYear}-এর পুরোনো সব delete হবে\n` +
                `• Class ${sourceClass}-এ ${classifiedStudents.length - selected.length} জন থাকবে\n\n` +
                `এটি undo করা যাবে না (তবে Restore করা যাবে)।`,
                function () { resolve(true); },
                {
                    title: '🎓 Execute Promote',
                    confirmText: 'Yes, Execute',
                    cancelText: 'Cancel',
                    confirmType: 'danger'
                }
            );
        });

        if (!confirmed) return;

        isProcessing = true;
        showProgress();

        try {
            const result = await window.FDCPromoteEngine.executePromote(
                {
                    sourceClass,
                    sourceYear,
                    targetClass,
                    targetYear,
                    sourceBranch,
                    selectedStudents: selected,
                    deleteTarget: true,
                    adminInfo
                },
                (message, percent) => {
                    updateProgress(message, percent);
                }
            );

            hideProgress();

            window.fdcSuccess(
                `✅ ${result.promotedCount} জন student সফলভাবে Promote হয়েছে!\n\n` +
                `• Session: ${sourceSession} (অপরিবর্তিত)\n` +
                `• Target delete: ${result.deletedTargetCount} জন\n` +
                `• Batch ID: ${result.batchId.substring(0, 8)}...`
            );

            setTimeout(() => {
                window.location.reload();
            }, 2500);

        } catch (e) {
            console.error('Execute error:', e);
            hideProgress();
            window.fdcError('Promote failed: ' + e.message);
        } finally {
            isProcessing = false;
        }
    }

    // =========================================================
    // PROGRESS
    // =========================================================
    function showProgress() {
        $('progressOverlay').classList.add('show');
        updateProgress('প্রস্তুতি নেওয়া হচ্ছে...', 0);
    }

    function hideProgress() {
        $('progressOverlay').classList.remove('show');
    }

    function updateProgress(message, percent) {
        $('progressText').textContent = message || 'Processing...';
        $('progressFill').style.width = percent + '%';
        $('progressPercent').textContent = percent + '%';
    }

    // =========================================================
    // ATTACH EVENTS
    // =========================================================
    function attachEvents() {
        $('btnLoadStudents').addEventListener('click', loadStudents);

        ['sourceClass', 'sourceYear', 'sourceBranch'].forEach(id => {
            $(id).addEventListener('change', function () {
                if (classifiedStudents.length > 0) {
                    classifiedStudents = [];
                    selectedStudentIds.clear();
                    $('studentsSection').style.display = 'none';
                    $('stepTarget').classList.add('disabled');
                    $('stepConfirm').classList.add('disabled');
                    $('targetInfo').innerHTML = '';
                }
            });
        });

        ['targetClass', 'targetYear'].forEach(id => {
            $(id).addEventListener('change', onTargetChange);
        });

        $('selectAll').addEventListener('change', function () {
            if (this.checked) {
                classifiedStudents.forEach(c => selectedStudentIds.add(c.student.id));
            } else {
                selectedStudentIds.clear();
            }

            document.querySelectorAll('.student-item').forEach(item => {
                const id = parseInt(item.dataset.id);
                const cb = item.querySelector('input[type="checkbox"]');
                const isChecked = selectedStudentIds.has(id);

                cb.checked = isChecked;
                item.classList.toggle('checked', isChecked);
            });

            updateSelectedCount();
            updateFinalSummary();
            checkConfirmInput();
        });

        $('studentList').addEventListener('change', function (e) {
            const cb = e.target.closest('input[type="checkbox"]');
            if (!cb) return;

            const studentId = parseInt(cb.dataset.id);
            const item = cb.closest('.student-item');

            if (cb.checked) {
                selectedStudentIds.add(studentId);
                item.classList.add('checked');
            } else {
                selectedStudentIds.delete(studentId);
                item.classList.remove('checked');
            }

            updateSelectedCount();
            updateFinalSummary();
            checkConfirmInput();
        });

        $('studentList').addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            const item = e.target.closest('.student-item');
            if (!item) return;

            const cb = item.querySelector('input[type="checkbox"]');
            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        $('confirmInput').addEventListener('input', checkConfirmInput);
        $('confirmInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !$('btnExecute').disabled) {
                executePromote();
            }
        });

        $('btnExecute').addEventListener('click', executePromote);
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Promote v2.1 initializing...');

        if (!window.FDCSession) {
            console.warn('⚠️ Session helper not loaded, retrying...');
            setTimeout(init, 300);
            return;
        }

        await loadYearOptions();
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadExams();

            console.log('✅ Admin Promote v2.1 ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();