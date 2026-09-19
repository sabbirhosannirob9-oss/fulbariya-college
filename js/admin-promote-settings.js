/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN PROMOTE SETTINGS
 * Location: js/admin-promote-settings.js
 * Depends: config.js, supabase.js, auth.js, admin-popup.js,
 *          promote-utils.js, promote-rules.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let currentRules = {};      // rule_key → rule_value
    let savedRules = {};        // original saved values
    let allRulesData = [];      // full rows from DB

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
    // LOAD RULES
    // =========================================================
    async function loadRules() {
        try {
            const rules = await window.FDCPromoteRules.loadAllRules();

            if (!rules || rules.length === 0) {
                window.fdcWarning('কোনো rules পাওয়া যায়নি। Default rules apply হবে।');
                applyDefaultRules();
                return;
            }

            allRulesData = rules;
            currentRules = {};
            rules.forEach(r => {
                currentRules[r.rule_key] = r.rule_value;
            });

            savedRules = { ...currentRules };

            populateUI(currentRules);
            renderRulesSummary(currentRules);

            $('loadingWrap').style.display = 'none';
            $('settingsWrap').style.display = 'block';
            $('saveBar').style.display = 'flex';

        } catch (e) {
            console.error('Load rules error:', e);
            window.fdcError('Rules load failed: ' + e.message);
        }
    }

    // =========================================================
    // APPLY DEFAULT RULES (if none in DB)
    // =========================================================
    function applyDefaultRules() {
        const defaults = {
            min_gpa: '2.00',
            no_fail_subjects: 'true',
            absent_is_fail: 'true',
            no_result_action: 'skip'
        };

        currentRules = { ...defaults };
        savedRules = { ...defaults };
        populateUI(defaults);
        renderRulesSummary(defaults);

        $('loadingWrap').style.display = 'none';
        $('settingsWrap').style.display = 'block';
        $('saveBar').style.display = 'flex';
    }

    // =========================================================
    // POPULATE UI FROM RULES
    // =========================================================
    function populateUI(rules) {
        if (rules.min_gpa !== undefined) {
            $('ruleMinGPA').value = rules.min_gpa;
        }
        if (rules.no_fail_subjects !== undefined) {
            $('ruleNoFailSubjects').checked = rules.no_fail_subjects === 'true';
        }
        if (rules.absent_is_fail !== undefined) {
            $('ruleAbsentIsFail').checked = rules.absent_is_fail === 'true';
        }
        if (rules.no_result_action !== undefined) {
            $('ruleNoResultAction').value = rules.no_result_action;
        }
    }

    // =========================================================
    // COLLECT UI VALUES
    // =========================================================
    function collectUIValues() {
        return {
            min_gpa: String(parseFloat($('ruleMinGPA').value) || 2.00).replace(/\.?0+$/, '') || '2.00',
            no_fail_subjects: $('ruleNoFailSubjects').checked ? 'true' : 'false',
            absent_is_fail: $('ruleAbsentIsFail').checked ? 'true' : 'false',
            no_result_action: $('ruleNoResultAction').value || 'skip'
        };
    }

    // =========================================================
    // VALIDATE INPUT
    // =========================================================
    function validateInput(values) {
        const gpa = parseFloat(values.min_gpa);
        if (isNaN(gpa) || gpa < 0 || gpa > 5) {
            window.fdcWarning('সর্বনিম্ন GPA 0 থেকে 5-এর মধ্যে হতে হবে।');
            return false;
        }
        return true;
    }

    // =========================================================
    // RENDER RULES SUMMARY
    // =========================================================
    function renderRulesSummary(rules) {
        const summary = $('rulesSummary');
        if (!summary) return;

        const minGPA = parseFloat(rules.min_gpa) || 2.00;
        const noFail = rules.no_fail_subjects === 'true';
        const absentFail = rules.absent_is_fail === 'true';
        const noResultAction = rules.no_result_action || 'skip';

        const noResultLabels = {
            'skip': '⏭️ Skip — Promote হবে না',
            'manual': '👤 Manual — Admin Decide করবে',
            'promote': '✅ Promote — সবাই Promote হবে'
        };

        summary.innerHTML = `
            <div style="background:#fafbff;border-radius:10px;padding:16px;border:1px solid var(--border-light);">
                <div style="display:grid;grid-template-columns:auto 1fr;gap:10px 16px;font-size:12.5px;">
                    <strong style="color:var(--navy);">📊 Min GPA:</strong>
                    <span>${escapeHtml(String(minGPA))} এর কম হলে Fail</span>

                    <strong style="color:var(--navy);">❌ Subject Fail:</strong>
                    <span>${noFail ? 'কোনো subject-এ fail থাকলে ছাত্র Fail' : 'Subject fail-এ কোনো প্রভাব নেই'}</span>

                    <strong style="color:var(--navy);">⚠️ Absent:</strong>
                    <span>${absentFail ? 'কোনো subject-এ absent থাকলে ছাত্র Fail' : 'Absent-এ কোনো প্রভাব নেই'}</span>

                    <strong style="color:var(--navy);">📄 No Result:</strong>
                    <span>${noResultLabels[noResultAction] || noResultAction}</span>
                </div>
            </div>

            <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border-left:3px solid #10b981;border-radius:8px;font-size:12.5px;color:#166534;">
                <strong>✅ Example:</strong> A student has GPA 2.50 with all subjects pass → <strong>Pass</strong><br>
                A student has GPA 3.00 but 1 subject fail → <strong>${noFail ? 'Fail' : 'Pass'}</strong><br>
                A student has no result entry → <strong>${noResultLabels[noResultAction] || noResultAction}</strong>
            </div>
        `;
    }

    // =========================================================
    // CHECK FOR CHANGES
    // =========================================================
    function hasChanges(newValues) {
        const keys = ['min_gpa', 'no_fail_subjects', 'absent_is_fail', 'no_result_action'];
        for (const key of keys) {
            const newVal = String(newValues[key]);
            const oldVal = String(savedRules[key]);
            if (newVal !== oldVal) return true;
        }
        return false;
    }

    // =========================================================
    // SAVE RULES
    // =========================================================
    async function saveRules() {
        const values = collectUIValues();

        if (!validateInput(values)) return;

        if (!hasChanges(values)) {
            return window.fdcInfo('কোনো পরিবর্তন হয়নি।');
        }

        // Confirm
        window.fdcConfirm(
            `Promotion rules update করা হবে।\n\nপরবর্তী Promote-এ নতুন rules apply হবে।\n\nনিশ্চিত?`,
            async function () {
                const btn = $('btnSave');
                const original = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                try {
                    // Save each rule
                    let successCount = 0;
                    let errorCount = 0;

                    for (const rule of allRulesData) {
                        const key = rule.rule_key;
                        if (values[key] === undefined) continue;

                        if (String(values[key]) !== String(rule.rule_value)) {
                            const ok = await window.FDCPromoteRules.updateRule(rule.id, values[key]);
                            if (ok) successCount++;
                            else errorCount++;
                        }
                    }

                    if (errorCount > 0) {
                        window.fdcWarning(`কিছু rule save হয়নি (${errorCount}টি)।`);
                    }

                    if (successCount > 0) {
                        window.fdcSuccess(`✅ ${successCount}টি rule update হয়েছে।`);
                    } else {
                        window.fdcInfo('কোনো পরিবর্তন হয়নি।');
                    }

                    // Update saved
                    savedRules = { ...values };
                    renderRulesSummary(values);

                } catch (e) {
                    console.error('Save error:', e);
                    window.fdcError('Save failed: ' + e.message);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }
            },
            {
                title: '💾 Save Rules',
                confirmText: 'Yes, Save',
                cancelText: 'Cancel',
                confirmType: 'primary'
            }
        );
    }

    // =========================================================
    // RESET TO SAVED
    // =========================================================
    function resetToSaved() {
        const values = collectUIValues();
        if (!hasChanges(values)) {
            return window.fdcInfo('আগে থেকে যেই মান আছে, সেটাই আছে।');
        }

        window.fdcConfirm(
            'সব পরিবর্তন বাতিল করে আগের মান ফিরিয়ে আনা হবে। নিশ্চিত?',
            function () {
                populateUI(savedRules);
                renderRulesSummary(savedRules);
                window.fdcSuccess('আগের মান ফিরিয়ে আনা হয়েছে।');
            },
            {
                title: '↺ Reset Changes',
                confirmText: 'Yes, Reset',
                cancelText: 'Cancel',
                confirmType: 'warning'
            }
        );
    }

    // =========================================================
    // LIVE UPDATE SUMMARY ON INPUT CHANGE
    // =========================================================
    function attachLivePreview() {
        const inputs = ['ruleMinGPA', 'ruleNoFailSubjects', 'ruleAbsentIsFail', 'ruleNoResultAction'];
        inputs.forEach(id => {
            const el = $(id);
            if (!el) return;
            el.addEventListener('input', function () {
                renderRulesSummary(collectUIValues());
            });
            el.addEventListener('change', function () {
                renderRulesSummary(collectUIValues());
            });
        });
    }

    // =========================================================
    // ATTACH EVENTS
    // =========================================================
    function attachEvents() {
        $('btnSave').addEventListener('click', saveRules);
        $('btnReset').addEventListener('click', resetToSaved);

        attachLivePreview();
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Promote Settings initializing...');

        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadRules();

            console.log('✅ Admin Promote Settings ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();