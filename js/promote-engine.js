/**
 * =========================================================
 * FULBARIYA COLLEGE — PROMOTE ENGINE
 * Location: js/promote-engine.js
 * Purpose: Execute promotion with audit log
 * =========================================================
 */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // MAIN EXECUTE
    // =========================================================
    async function executePromote(options, onProgress) {
        const {
            sourceClass,
            sourceYear,
            targetClass,
            targetYear,
            sourceBranch,
            selectedStudents,  // classified students to promote
            deleteTarget = true,
            adminInfo
        } = options;

        const batchId = window.FDCPromoteUtils.generateBatchId();
        const session = window.FDCPromoteUtils.getSessionFromYear(targetYear);

        const result = {
            batchId,
            success: false,
            totalRequested: selectedStudents.length,
            promotedCount: 0,
            deletedTargetCount: 0,
            auditLogIds: [],
            errors: []
        };

        try {
            onProgress?.('📦 Batch তৈরি হচ্ছে...', 5);

            // =========================================================
            // STEP 1: Backup / Snapshot of target students (before delete)
            // =========================================================
            let targetStudentsSnapshot = [];

            if (deleteTarget) {
                onProgress?.('🗑️ Target-এর পুরোনো data load করছি...', 10);

                let tq = window.FDC_SUPABASE
                    .from('students')
                    .select('*')
                    .eq('class_name', targetClass)
                    .eq('year', targetYear)
                    .eq('is_active', true);

                if (sourceBranch && sourceBranch !== 'All') {
                    tq = tq.eq('branch', sourceBranch);
                }

                const { data: targets, error: tErr } = await tq;
                if (tErr) throw tErr;

                targetStudentsSnapshot = targets || [];
                console.log('🗑️ Target students to delete:', targetStudentsSnapshot.length);
            }

            // =========================================================
            // STEP 2: Delete target students (if deleteTarget)
            // =========================================================
            if (deleteTarget && targetStudentsSnapshot.length > 0) {
                onProgress?.('🗑️ Target-এর পুরোনো data delete করছি...', 20);

                const targetIds = targetStudentsSnapshot.map(s => s.id);

                // 2a. Delete student_subjects
                await window.FDC_SUPABASE
                    .from('student_subjects')
                    .delete()
                    .in('student_id', targetIds);

                // 2b. Load + Delete result_details
                const { data: targetResults } = await window.FDC_SUPABASE
                    .from('results')
                    .select('id')
                    .in('student_id', targetIds);

                if (targetResults && targetResults.length > 0) {
                    const targetResultIds = targetResults.map(r => r.id);

                    await window.FDC_SUPABASE
                        .from('result_details')
                        .delete()
                        .in('result_id', targetResultIds);

                    await window.FDC_SUPABASE
                        .from('results')
                        .delete()
                        .in('id', targetResultIds);
                }

                // 2c. Delete students
                const { error: delErr } = await window.FDC_SUPABASE
                    .from('students')
                    .delete()
                    .in('id', targetIds);

                if (delErr) throw delErr;

                result.deletedTargetCount = targetIds.length;
                console.log(`🗑️ Deleted ${targetIds.length} target students`);
            }

            // =========================================================
            // STEP 3: Prepare new students to insert
            // =========================================================
            onProgress?.('📝 নতুন student data তৈরি করছি...', 30);

            const studentsToPromote = selectedStudents.filter(c => c.status === 'pass' || c.userOverride);

            const newStudentRecords = studentsToPromote.map(c => ({
                name: c.student.name,
                roll: c.student.roll,
                class_name: targetClass,
                year: targetYear,
                session: session,
                branch: c.student.branch,
                group_name: c.student.group_name,
                is_active: true,
                promoted_in_batch: batchId,
                previous_batch: c.student.promoted_in_batch || null,
                promoted_at: new Date().toISOString()
            }));

            // =========================================================
            // STEP 4: Insert new students
            // =========================================================
            onProgress?.('✅ নতুন student insert করছি...', 40);

            const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                .from('students')
                .insert(newStudentRecords)
                .select();

            if (insErr) throw insErr;

            const insertedMap = new Map();
            (inserted || []).forEach((s, idx) => {
                // Match by roll
                const orig = studentsToPromote.find(c =>
                    c.student.roll === s.roll &&
                    c.student.branch === s.branch
                );
                if (orig) {
                    insertedMap.set(orig.student.id, s);
                }
            });

            // =========================================================
            // STEP 5: Copy subjects (branch-aware)
            // =========================================================
            onProgress?.('📚 Subjects copy করছি...', 55);

            let subjectCopyCount = 0;

            for (let i = 0; i < studentsToPromote.length; i++) {
                const orig = studentsToPromote[i];
                const newStu = insertedMap.get(orig.student.id);

                if (!newStu) {
                    console.warn('⚠️ No inserted student found for:', orig.student.name);
                    continue;
                }

                try {
                    const subjectRecords = await window.FDCPromoteUtils.preparePromotedSubjects(
                        orig.student,
                        newStu,
                        targetClass
                    );

                    if (subjectRecords.length > 0) {
                        const { error: subErr } = await window.FDC_SUPABASE
                            .from('student_subjects')
                            .insert(subjectRecords);

                        if (subErr) {
                            console.warn('Subject insert error for', orig.student.name, subErr);
                        } else {
                            subjectCopyCount += subjectRecords.length;
                        }
                    }

                    // Save audit
                    await saveAuditLog(batchId, orig, newStu, options);

                    result.promotedCount++;

                } catch (e) {
                    console.error('Subject copy error for', orig.student.name, e);
                    result.errors.push({
                        student: orig.student.name,
                        error: e.message
                    });
                }

                const pct = 55 + Math.floor((i / studentsToPromote.length) * 30);
                onProgress?.(`📚 Subjects copy... (${i + 1}/${studentsToPromote.length})`, pct);
            }

            // =========================================================
            // STEP 6: Delete source students
            // =========================================================
            onProgress?.('🗑️ Source থেকে old data delete করছি...', 88);

            const sourceIds = studentsToPromote.map(c => c.student.id);

            if (sourceIds.length > 0) {
                // Delete subjects
                await window.FDC_SUPABASE
                    .from('student_subjects')
                    .delete()
                    .in('student_id', sourceIds);

                // Delete results
                const { data: sourceResults } = await window.FDC_SUPABASE
                    .from('results')
                    .select('id')
                    .in('student_id', sourceIds);

                if (sourceResults && sourceResults.length > 0) {
                    const sourceResultIds = sourceResults.map(r => r.id);

                    await window.FDC_SUPABASE
                        .from('result_details')
                        .delete()
                        .in('result_id', sourceResultIds);

                    await window.FDC_SUPABASE
                        .from('results')
                        .delete()
                        .in('id', sourceResultIds);
                }

                // Delete students
                const { error: delSrcErr } = await window.FDC_SUPABASE
                    .from('students')
                    .delete()
                    .in('id', sourceIds);

                if (delSrcErr) throw delSrcErr;
            }

            // =========================================================
            // STEP 7: Save promotion log
            // =========================================================
            onProgress?.('📋 Log save করছি...', 95);

            const stats = {
                total_students: selectedStudents.length,
                promoted_count: result.promotedCount,
                failed_count: selectedStudents.filter(c => c.status === 'fail').length,
                absent_count: selectedStudents.filter(c => c.status === 'fail' && c.subjectStats?.absent > 0).length,
                no_result_count: selectedStudents.filter(c => c.status === 'no_result').length,
                target_deleted_count: result.deletedTargetCount
            };

            await savePromotionLog(batchId, {
                ...options,
                ...stats,
                adminInfo
            });

            onProgress?.('✅ সম্পূর্ণ!', 100);

            result.success = true;
            return result;

        } catch (e) {
            console.error('Execute promote error:', e);

            // Log failure
            try {
                await savePromotionLog(batchId, {
                    ...options,
                    adminInfo,
                    total_students: selectedStudents.length,
                    promoted_count: result.promotedCount,
                    failed_count: 0,
                    absent_count: 0,
                    no_result_count: 0,
                    target_deleted_count: result.deletedTargetCount,
                    status: 'failed',
                    error_message: e.message
                });
            } catch (logErr) {
                console.warn('Could not log failure:', logErr);
            }

            throw e;
        }
    }

    // =========================================================
    // SAVE AUDIT LOG
    // =========================================================
    async function saveAuditLog(batchId, classifiedStudent, newStudent, options) {
        try {
            const oldStu = classifiedStudent.student;

            // Load old subjects
            const { data: oldSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type')
                .eq('student_id', oldStu.id);

            // Load new subjects
            const { data: newSubs } = await window.FDC_SUPABASE
                .from('student_subjects')
                .select('subject_id, subject_type')
                .eq('student_id', newStudent.id);

            await window.FDC_SUPABASE
                .from('promotion_audit')
                .insert({
                    batch_id: batchId,
                    student_id: oldStu.id,
                    student_name: oldStu.name,
                    student_roll: oldStu.roll,
                    old_student_data: oldStu,
                    old_subjects: oldSubs || [],
                    old_result_data: classifiedStudent.result || null,
                    new_student_id: newStudent.id,
                    new_student_data: newStudent,
                    new_subjects: newSubs || [],
                    result_status: classifiedStudent.status,
                    total_gpa: classifiedStudent.gpa,
                    total_marks: classifiedStudent.result?.total_marks || 0,
                    action_type: 'promoted'
                });
        } catch (e) {
            console.warn('Audit log error:', e);
        }
    }

    // =========================================================
    // SAVE PROMOTION LOG
    // =========================================================
    async function savePromotionLog(batchId, options) {
        try {
            const logData = {
                batch_id: batchId,
                performed_by: options.adminInfo?.id || null,
                performed_by_name: options.adminInfo?.name || 'Admin',
                source_class: options.sourceClass,
                source_year: options.sourceYear,
                source_branch: options.sourceBranch,
                target_class: options.targetClass,
                target_year: options.targetYear,
                target_session: window.FDCPromoteUtils.getSessionFromYear(options.targetYear),
                target_branch: options.sourceBranch,
                total_students: options.total_students || 0,
                promoted_count: options.promoted_count || 0,
                failed_count: options.failed_count || 0,
                absent_count: options.absent_count || 0,
                no_result_count: options.no_result_count || 0,
                target_deleted_count: options.target_deleted_count || 0,
                status: options.status || 'completed',
                error_message: options.error_message || null
            };

            const { error } = await window.FDC_SUPABASE
                .from('promotion_log')
                .insert(logData);

            if (error) throw error;
        } catch (e) {
            console.warn('Promotion log error:', e);
            throw e;
        }
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCPromoteEngine = {
        executePromote,
        saveAuditLog,
        savePromotionLog
    };

    console.log('✅ Promote Engine loaded');

})();