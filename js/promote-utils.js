/**
 * =========================================================
 * FULBARIYA COLLEGE — PROMOTE UTILITIES
 * Location: js/promote-utils.js
 * Purpose: Pass/Fail detection, Pairing lookup, Rule check
 * =========================================================
 */

(function () {
    "use strict";

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

    function generateBatchId() {
        // UUID v4
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
            (data || []).forEach(r => {
                rules[r.rule_key] = r.rule_value;
            });

            return rules;
        } catch (e) {
            console.warn('Load rules error:', e);
            // Default rules
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

            if (!students || students.length === 0) {
                return [];
            }

            // 2. Load rules
            const rules = await loadPromotionRules();
            const minGPA = parseFloat(rules.min_gpa) || 2.00;
            const noFailSubjects = rules.no_fail_subjects === 'true';
            const absentIsFail = rules.absent_is_fail === 'true';

            // 3. Load results for these students
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

            // 4. Load result_details for these results
            const resultIds = (results || []).map(r => r.id);
            let detailsMap = new Map();

            if (resultIds.length > 0) {
                const { data: details, error: detErr } = await window.FDC_SUPABASE
                    .from('result_details')
                    .select('result_id, student_id, status, subject_type')
                    .in('result_id', resultIds);

                if (detErr) throw detErr;

                (details || []).forEach(d => {
                    if (!detailsMap.has(d.student_id)) {
                        detailsMap.set(d.student_id, []);
                    }
                    detailsMap.get(d.student_id).push(d);
                });
            }

            // 5. Determine pass/fail for each student
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
                const failedCount = details.filter(d => d.status === 'fail').length;
                const absentCount = details.filter(d => d.status === 'absent').length;
                const passedCount = details.filter(d => d.status === 'pass').length;

                let finalStatus = 'pass';
                const reasons = [];

                // Check fail subjects
                if (noFailSubjects && failedCount > 0) {
                    finalStatus = 'fail';
                    reasons.push(`${failedCount}টি subject fail`);
                }

                // Check absent
                if (absentIsFail && absentCount > 0) {
                    finalStatus = 'fail';
                    reasons.push(`${absentCount}টি subject absent`);
                }

                // Check GPA
                if (result.gpa !== null && result.gpa < minGPA) {
                    finalStatus = 'fail';
                    reasons.push(`GPA ${result.gpa} < ${minGPA}`);
                }

                return {
                    student,
                    result,
                    status: finalStatus,
                    statusLabel: finalStatus === 'pass' ? 'Pass' : 'Fail',
                    gpa: result.gpa,
                    reasons: reasons.join(', '),
                    subjectStats: {
                        total: details.length,
                        passed: passedCount,
                        failed: failedCount,
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
    // GET PAIRED SUBJECT ID
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

    // =========================================================
    // BATCH GET PAIRED SUBJECTS (for performance)
    // =========================================================
    async function getPairedSubjectsBatch(subjectIds) {
        try {
            if (!subjectIds || subjectIds.length === 0) return {};

            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('id, paired_with_id')
                .in('id', subjectIds);

            if (error) throw error;

            const map = {};
            (data || []).forEach(s => {
                map[s.id] = s.paired_with_id;
            });
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
            // 1. Load old subjects
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

            if (isHSC || !isClassChange) {
                // HSC OR same class → as-is copy
                console.log(`📋 As-is copy: ${oldStudent.name} (${oldStudent.branch})`);

                for (const os of oldSubs) {
                    records.push({
                        student_id: newStudent.id,
                        subject_id: os.subject_id,
                        subject_type: os.subject_type,
                        is_active: true
                    });
                }
            } else if (isBM && isClassChange) {
                // BM + class change → pairing-based swap
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
        const stats = {
            total: classified.length,
            passed: 0,
            failed: 0,
            absent: 0,
            noResult: 0
        };

        classified.forEach(c => {
            if (c.status === 'pass') stats.passed++;
            else if (c.status === 'fail') {
                if (c.subjectStats.absent > 0 && c.subjectStats.failed === 0) {
                    stats.absent++;
                } else {
                    stats.failed++;
                }
            } else if (c.status === 'no_result') {
                stats.noResult++;
            }
        });

        return stats;
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCPromoteUtils = {
        generateBatchId,
        getSessionFromYear,
        escapeHtml,
        loadPromotionRules,
        detectPassFail,
        getPairedSubjectId,
        getPairedSubjectsBatch,
        preparePromotedSubjects,
        formatStats
    };

    console.log('✅ Promote Utils loaded');

})();