/**
 * =========================================================
 * FULBARIYA COLLEGE — PROMOTE RULES MANAGER
 * Location: js/promote-rules.js
 * Purpose: Manage promotion rules (CRUD)
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

    // =========================================================
    // LOAD ALL RULES
    // =========================================================
    async function loadAllRules() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('promotion_rules')
                .select('*')
                .order('id');

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Load rules error:', e);
            return [];
        }
    }

    // =========================================================
    // UPDATE RULE
    // =========================================================
    async function updateRule(ruleId, ruleValue) {
        try {
            const { error } = await window.FDC_SUPABASE
                .from('promotion_rules')
                .update({ rule_value: ruleValue })
                .eq('id', ruleId);

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Update rule error:', e);
            return false;
        }
    }

    // =========================================================
    // TOGGLE RULE ACTIVE
    // =========================================================
    async function toggleRuleActive(ruleId, isActive) {
        try {
            const { error } = await window.FDC_SUPABASE
                .from('promotion_rules')
                .update({ is_active: isActive })
                .eq('id', ruleId);

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Toggle rule error:', e);
            return false;
        }
    }

    // =========================================================
    // EXPORT
    // =========================================================
    window.FDCPromoteRules = {
        loadAllRules,
        updateRule,
        toggleRuleActive
    };

    console.log('✅ Promote Rules loaded');

})();