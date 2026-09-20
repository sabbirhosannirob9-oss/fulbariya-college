/**
 * =========================================================
 * FULBARIYA COLLEGE — PROMOTE UTILITIES
 * Location: js/promote-utils.js
 * Version: v4.0 — Session Fix + Individual Component Pass Rule
 * 
 * ⚠️ SESSION POLICY (Bangladesh HSC):
 *    Session = ভর্তির বছর (Admission Year), কখনো বদলায় না।
 *    Class 11 (2024-25) → Class 12 (2024-25) — SAME session।
 * 
 * ✅ PASS RULE (Individual Component — Document অনুযায়ী):
 *    CQ, MCQ, Practical — প্রতিটা component আলাদা pass করতে হবে।
 *    - 100 Pure Written: CQ ≥ 33
 *    - 70 CQ / 30 MCQ: CQ ≥ 23, MCQ ≥ 10
 *    - 50 CQ / 25 MCQ / 25 Prac: CQ ≥ 17, MCQ ≥ 8, Prac ≥ 8
 *    - BMT 60 Board / 40 Cont: Board ≥ 20, Cont ≥ 16
 *    - BMT 100 Lab: Cont ≥ 40
 *    - BMT 40 Board / 60 Cont: Board ≥ 14, Cont ≥ 24
 *    ❌ Aggregate pass valid নয়।
 * 
 * ✅ 4th SUBJECT GRACE:
 *    4th fail → overall PASS, F propagates না।
 * 
 * ✅ GPA BONUS:
 *    Bonus = Max(0, 4th GP - 2.00)
 *    Final GPA = (6 main GPs + Bonus) / 6
 * =========================================================
 */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // BASIC HELPERS
    // =========================================================
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

    function getStudentSession(student) {
        if (!student) return '';
        if (student.session && String(student.session).trim() !== '') {
            return String(student.session).trim();
        }
        if (student.year) return getSessionFromYear(student.year);
        return '';
    }

    function isSameSession(stuA, stuB) {
        const sA = getStudentSession(stuA);
        const sB = getStudentSession(stuB);
        return sA !== '' && sA === sB;
    }

    function generateBatchId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // =========================================================
    // LOAD PROMOTION RULES
    // =========================================================
    async function loadPromotionRules() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('promotion_rules')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            const rules = {};
            (data || []).forEach(r => { rules[r.rule_key] = r.rule_value; });
            return rules;
        } catch (e) {
            console.warn('Load rules error:', e);
            return {
                min_gpa: '2.00',
                no_fail_subjects: 'true',
                absent_is_fail: 'true',
                no_result_action: 'skip',
                optional_bonus: 'true'
            };
        }
    }

  // =========================================================
// 🎯 PASS MARK CALCULATOR (Document-Based)
// =========================================================
function calcPassMark(fullMarks) {
    const f = parseFloat(fullMarks) || 0;
    if (f === 0) return 0;

    const PASS_MAP = {
        100: 33,
        70: 23,
        60: 20,
        50: 17,
        40: 13,
        30: 10,
        25: 8,
        20: 7,
        15: 5,
        10: 4
    };

    if (PASS_MAP[f] !== undefined) return PASS_MAP[f];
    return Math.ceil(f * 0.3333);
}
    // =========================================================
    // 🎯 INDIVIDUAL COMPONENT PASS CHECK
    // 
    // paperResults = [{
    //   cq, mcq, practical,
    //   cq_marks, mcq_marks, practical_marks,
    //   has_cq, has_mcq, has_practical,
    //   board_marks, continuous_marks,
    //   assessment_model (cq_mcq_practical | board_continuous)
    // }]
    // =========================================================
    function checkSubjectPass(paperResults) {
        if (!paperResults || paperResults.length === 0) {
            return { passed: false, reason: 'No data' };
        }

        const failures = [];

        for (const p of paperResults) {
            const model = p.assessment_model || 'cq_mcq_practical';

            if (model === 'board_continuous') {
                // =============================================
                // BM (BMT): Board + Continuous
                // =============================================
                const boardFull = parseFloat(p.cq_marks) || 0;
                const contFull = parseFloat(p.practical_marks) || 0;
                const boardMarks = parseFloat(p.board_marks) || 0;
                const contMarks = parseFloat(p.continuous_marks) || 0;

                const boardPass = calcPassMark(boardFull);
                const contPass = calcPassMark(contFull);

                if (boardFull > 0 && boardMarks < boardPass) {
                    failures.push(`Board ${boardMarks}/${boardFull} < ${boardPass}`);
                }
                if (contFull > 0 && contMarks < contPass) {
                    failures.push(`Continuous ${contMarks}/${contFull} < ${contPass}`);
                }
            } else {
                // =============================================
                // HSC: CQ + MCQ + Practical
                // =============================================
                const cqFull = parseFloat(p.cq_marks) || 0;
                const mcqFull = parseFloat(p.mcq_marks) || 0;
                const pracFull = parseFloat(p.practical_marks) || 0;

                const cqMarks = parseFloat(p.cq) || 0;
                const mcqMarks = parseFloat(p.mcq) || 0;
                const pracMarks = parseFloat(p.practical) || 0;

                if (p.has_cq && cqFull > 0) {
                    const pass = calcPassMark(cqFull);
                    if (cqMarks < pass) {
                        failures.push(`CQ ${cqMarks}/${cqFull} < ${pass}`);
                    }
                }
                if (p.has_mcq && mcqFull > 0) {
                    const pass = calcPassMark(mcqFull);
                    if (mcqMarks < pass) {
                        failures.push(`MCQ ${mcqMarks}/${mcqFull} < ${pass}`);
                    }
                }
                if (p.has_practical && pracFull > 0) {
                    const pass = calcPassMark(pracFull);
                    if (pracMarks < pass) {
                        failures.push(`Practical ${pracMarks}/${pracFull} < ${pass}`);
                    }
                }
            }
        }

        const passed = failures.length === 0;

        return {
            passed,
            reason: passed ? 'All components passed' : failures.join('; '),
            failures
        };
    }

    // =========================================================
    // DETECT PASS/FAIL FOR STUDENTS
    // =========================================================
    async function detectPassFail(options) {
        const { sourceClass, sourceYear, branch, examId } = options;

        try {
            // 1. Load students
            let stuQuery = window.FDC_SUPABASE
                .from('students')
                .select('*')
                .eq('class_name', sourceClass)
                .eq('year', sourceYear)
                .eq('is_active', true)
                .order('roll');

            if (branch && branch !== 'All') {
                stuQuery = stuQuery.eq('branch', branch);
            }

            const { data: students, error: stuErr } = await stuQuery;
            if (stuErr) throw stuErr;
            if (!students || students.length === 0) return [];

            // 2. Load rules
            const rules = await loadPromotionRules();
            const minGPA = parseFloat(rules.min_gpa) || 2.00;
            const noFailSubjects = rules.no_fail_subjects === 'true';
            const absentIsFail = rules.absent_is_fail === 'true';
            const optionalBonus = rules.optional_bonus === 'true';

            // 3. Load results
            const studentIds = students.map(s => s.id);

            const { data: results, error: resErr } = await window.FDC_SUPABASE
                .from('results')
                .select('*')
                .in('student_id', studentIds)
                .eq('exam_id', examId)
                .eq('year', sourceYear)
                .eq('is_published', true);

            if (resErr) throw resErr;

            const resultMap = new Map();
            (results || []).forEach(r => resultMap.set(r.student_id, r));

            // 4. Load result_details (with marks)
            const resultIds = (results || []).map(r => r.id);
            let detailsMap = new Map();

            if (resultIds.length > 0) {
                const { data: details, error: detErr } = await window.FDC_SUPABASE
                    .from('result_details')
                    .select('*')
                    .in('result_id', resultIds);

                if (detErr) throw detErr;

                (details || []).forEach(d => {
                    if (!detailsMap.has(d.student_id)) {
                        detailsMap.set(d.student_id, []);
                    }
                    detailsMap.get(d.student_id).push(d);
                });
            }

            // 5. Determine pass/fail — INDIVIDUAL COMPONENT
            const classified = students.map(student => {
                const result = resultMap.get(student.id);

                if (!result) {
                    return {
                        student,
                        result: null,
                        status: 'no_result',
                        statusLabel: 'No Result',
                        gpa: null,
                        subjectStats: { total: 0, passed: 0, failed: 0, absent: 0 }
                    };
                }

                const details = detailsMap.get(student.id) || [];

                // Subject-wise grouping: compulsory + group are main, optional separate
                const subjectGroups = new Map();
                details.forEach(d => {
                    const key = d.subject_id;
                    if (!subjectGroups.has(key)) {
                        subjectGroups.set(key, []);
                    }
                    subjectGroups.get(key).push(d);
                });

                let mainFailCount = 0;
                let optionalFailCount = 0;
                let absentCount = 0;
                let passedCount = 0;

                subjectGroups.forEach((papers, subjectId) => {
                    const subjectType = papers[0].subject_type || 'compulsory';

                    // Check absent
                    const hasAbsent = papers.some(p => p.status === 'absent');
                    if (hasAbsent) {
                        absentCount++;
                        return;
                    }

                    // Check individual component pass
                    const passResult = checkSubjectPass(papers);

                    if (!passResult.passed) {
                        if (subjectType === 'optional') {
                            optionalFailCount++;
                        } else {
                            mainFailCount++;
                        }
                    } else {
                        passedCount++;
                    }
                });

                // Determine final status
                let finalStatus = 'pass';
                const reasons = [];

                // ✅ Main subjects fail → student fails
                if (noFailSubjects && mainFailCount > 0) {
                    finalStatus = 'fail';
                    reasons.push(`${mainFailCount}টি main subject fail`);
                }

                // ✅ Absent in any subject → fail
                if (absentIsFail && absentCount > 0) {
                    finalStatus = 'fail';
                    reasons.push(`${absentCount}টি subject absent`);
                }

                // ✅ GPA check
                if (result.gpa !== null && result.gpa < minGPA) {
                    finalStatus = 'fail';
                    reasons.push(`GPA ${result.gpa} < ${minGPA}`);
                }

                // ✅ 4th subject fail — NOT propagating (grace rule)

                return {
                    student,
                    result,
                    status: finalStatus,
                    statusLabel: finalStatus === 'pass' ? 'Pass' : 'Fail',
                    gpa: result.gpa,
                    reasons: reasons.join(', '),
                    subjectStats: {
                        total: subjectGroups.size,
                        passed: passedCount,
                        failed: mainFailCount,
                        optionalFailed: optionalFailCount,
                        absent: absentCount
                    }
                };
            });

            return classified;

        } catch (e) {
            console.error('detectPassFail error:', e);
            throw e;
        }
    }

    // =========================================================
    // PAIRED SUBJECTS (BM)
    // =========================================================
    async function getPairedSubjectId(subjectId) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('paired_with_id')
                .eq('id', subjectId)
                .single();

            if (error) return null;
            return data?.paired_with_id || null;
        } catch (e) {
            console.warn('Get paired subject error:', e);
            return null;
        }
    }

    async function getPairedSubjectsBatch(subjectIds) {
        try {
            if (!subjectIds || subjectIds.length === 0) return {};

            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('id, paired_with_id')
                .in('id', subjectIds);

            if (error) throw error;

            const map = {};
            (data || []).forEach(s => { map[s.id] = s.paired_with_id; });
            return map;
        } catch (e) {
            console.warn('Batch paired subjects error:', e);
            return {};
        }
    }

    // =========================================================
    // PREPARE PROMOTED SUBJECTS
    // =========================================================
    async function preparePromotedSubjects(oldStudent, newStudent, targetClass) {
        try {
            const { data: oldSubs, error } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type, is_active')
                .eq('student_id', oldStudent.id)
                .eq('is_active', true);

            if (error) throw error;
            if (!oldSubs || oldSubs.length === 0) return [];

            const isHSC = (oldStudent.branch === 'HSC');
            const isBM = (oldStudent.branch === 'BM');
            const isClassChange = (String(oldStudent.class_name) !== String(targetClass));

            const records = [];

            if (isHSC) {
                console.log(`📋 HSC as-is copy: ${oldStudent.name}`);
                for (const os of oldSubs) {
                    records.push({
                        student_id: newStudent.id,
                        subject_id: os.subject_id,
                        subject_type: os.subject_type,
                        is_active: true
                    });
                }
            } else if (isBM && isClassChange) {
                console.log(`🔄 BM swap: ${oldStudent.name}`);
                const oldSubjectIds = oldSubs.map(s => s.subject_id);
                const pairedMap = await getPairedSubjectsBatch(oldSubjectIds);

                for (const os of oldSubs) {
                    const pairedId = pairedMap[os.subject_id] || os.subject_id;
                    records.push({
                        student_id: newStudent.id,
                        subject_id: pairedId,
                        subject_type: os.subject_type,
                        is_active: true
                    });
                }
            } else {
                for (const os of oldSubs) {
                    records.push({
                        student_id: newStudent.id,
                        subject_id: os.subject_id,
                        subject_type: os.subject_type,
                        is_active: true
                    });
                }
            }

            return records;
        } catch (e) {
            console.error('preparePromotedSubjects error:', e);
            throw e;
        }
    }

    // =========================================================
    // FORMAT STATS
    // =========================================================
    function formatStats(classified) {
        const stats = { total: classified.length, passed: 0, failed: 0, absent: 0, noResult: 0 };
        classified.forEach(c => {
            if (c.status === 'pass') stats.passed++;
            else if (c.status === 'fail') {
                if (c.subjectStats.absent > 0 && c.subjectStats.failed === 0) stats.absent++;
                else stats.failed++;
            } else if (c.status === 'no_result') stats.noResult++;
        });
        return stats;
    }

    // =========================================================
    // BUILD PROMOTED STUDENT RECORD
    // =========================================================
    function buildPromotedStudentRecord(sourceStudent, targetClass, targetYear, batchId) {
        if (!sourceStudent) {
            throw new Error('Source student is required');
        }

        const session = getStudentSession(sourceStudent);

        console.log(`📋 Build record: ${sourceStudent.name}`);
        console.log(`   Source: Class ${sourceStudent.class_name} / Year ${sourceStudent.year} / Session ${session}`);
        console.log(`   Target: Class ${targetClass} / Year ${targetYear} / Session ${session} (copied)`);

        return {
            name: sourceStudent.name,
            roll: sourceStudent.roll,
            class_name: targetClass,
            year: targetYear,
            session: session,
            branch: sourceStudent.branch,
            group_name: sourceStudent.group_name,
            is_active: true,
            promoted_in_batch: batchId || null,
            previous_batch: sourceStudent.promoted_in_batch || null,
            promoted_at: new Date().toISOString()
        };
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCPromoteUtils = {
        generateBatchId,
        getSessionFromYear,
        getStudentSession,
        isSameSession,
        escapeHtml,
        loadPromotionRules,
        calcPassMark,
        checkSubjectPass,
        detectPassFail,
        formatStats,
        getPairedSubjectId,
        getPairedSubjectsBatch,
        preparePromotedSubjects,
        buildPromotedStudentRecord
    };

    console.log('✅ Promote Utils v4.0 loaded — Individual Component Pass Rule');

})();