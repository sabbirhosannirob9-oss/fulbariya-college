/**
 * =========================================================
 * FULBARIYA COLLEGE — PROMOTE RESTORE
 * Location: js/promote-restore.js
 * Purpose: Rollback a promotion batch
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // LOAD BATCH HISTORY
    // =========================================================
    async function loadBatchHistory(limit = 50) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('promotion_log')
                .select('*')
                .order('performed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Load batch history error:', e);
            return [];
        }
    }

    // =========================================================
    // LOAD BATCH DETAILS
    // =========================================================
    async function loadBatchDetails(batchId) {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('promotion_audit')
                .select('*')
                .eq('batch_id', batchId)
                .order('student_roll');

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Load batch details error:', e);
            return [];
        }
    }

    // =========================================================
    // RESTORE BATCH (Rollback)
    // =========================================================
    async function restoreBatch(batchId, onProgress) {
        const result = {
            success: false,
            restoredCount: 0,
            errors: []
        };

        try {
            onProgress?.('📋 Batch data load করছি...', 10);

            // 1. Load batch info
            const { data: batchInfo, error: bErr } = await window.FDC_SUPABASE
                .from('promotion_log')
                .select('*')
                .eq('batch_id', batchId)
                .single();

            if (bErr) throw bErr;

            if (batchInfo.status === 'rolled_back') {
                throw new Error('এই batch আগেই restore করা হয়েছে।');
            }

            // 2. Load audit details
            const { data: audits, error: aErr } = await window.FDC_SUPABASE
                .from('promotion_audit')
                .select('*')
                .eq('batch_id', batchId);

            if (aErr) throw aErr;

            if (!audits || audits.length === 0) {
                throw new Error('এই batch-এর কোনো data পাওয়া যায়নি।');
            }

            onProgress?.('🗑️ নতুন students delete করছি...', 30);

            // 3. Delete all NEW students (inserted during promote)
            const newStudentIds = audits
                .map(a => a.new_student_id)
                .filter(id => id);

            if (newStudentIds.length > 0) {
                // Delete subjects
                await window.FDC_SUPABASE
                    .from('student_subjects')
                    .delete()
                    .in('student_id', newStudentIds);

                // Delete students
                await window.FDC_SUPABASE
                    .from('students')
                    .delete()
                    .in('id', newStudentIds);
            }

            onProgress?.('✅ পুরোনো data restore করছি...', 60);

            // 4. Restore OLD students
            for (let i = 0; i < audits.length; i++) {
                const audit = audits[i];

                if (!audit.old_student_data) continue;

                const oldData = audit.old_student_data;

                // Remove id + batch fields for fresh insert
                const restoreData = { ...oldData };
                delete restoreData.id;
                delete restoreData.promoted_in_batch;
                delete restoreData.previous_batch;
                delete restoreData.promoted_at;
                delete restoreData.created_at;
                delete restoreData.updated_at;

                try {
                    const { data: inserted, error: insErr } = await window.FDC_SUPABASE
                        .from('students')
                        .insert([restoreData])
                        .select()
                        .single();

                    if (insErr) throw insErr;

                    // Restore subjects
                    if (audit.old_subjects && audit.old_subjects.length > 0) {
                        const subRecords = audit.old_subjects.map(s => ({
                            student_id: inserted.id,
                            subject_id: s.subject_id,
                            subject_type: s.subject_type,
                            is_active: true
                        }));

                        await window.FDC_SUPABASE
                            .from('student_subjects')
                            .insert(subRecords);
                    }

                    result.restoredCount++;

                } catch (e) {
                    console.error('Restore error for', audit.student_name, e);
                    result.errors.push({
                        student: audit.student_name,
                        error: e.message
                    });
                }

                const pct = 60 + Math.floor((i / audits.length) * 30);
                onProgress?.(`✅ Restore (${i + 1}/${audits.length})...`, pct);
            }

            onProgress?.('📋 Batch log update করছি...', 95);

            // 5. Update batch log status
            await window.FDC_SUPABASE
                .from('promotion_log')
                .update({
                    status: 'rolled_back',
                    notes: `Restored at ${new Date().toISOString()} — ${result.restoredCount} students restored`
                })
                .eq('batch_id', batchId);

            onProgress?.('✅ সম্পূর্ণ!', 100);

            result.success = true;
            return result;

        } catch (e) {
            console.error('Restore batch error:', e);
            throw e;
        }
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCPromoteRestore = {
        loadBatchHistory,
        loadBatchDetails,
        restoreBatch
    };

    console.log('✅ Promote Restore loaded');

})();