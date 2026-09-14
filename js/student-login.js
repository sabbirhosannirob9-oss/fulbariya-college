/**
 * =========================================================
 * FULBARIYA COLLEGE — STUDENT LOGIN
 * Location: js/student-login.js
 * Depends: config.js, supabase.js
 * =========================================================
 */

(function () {
    "use strict";

    console.log("🔵 Student login script loaded");

    // ---------- DOM ELEMENTS ----------
    const loginForm  = document.getElementById('loginForm');
    const loginBtn   = document.getElementById('loginBtn');
    const loginAlert = document.getElementById('loginAlert');

    if (!loginForm) {
        console.warn("⚠️ loginForm not found");
        return;
    }

    // =========================================================
    // WAIT FOR SUPABASE (supports window + document)
    // =========================================================
    function waitForSupabase(callback) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
            callback();
            return;
        }

        const handler = function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) callback();
        };
        window.addEventListener('fdc:supabase-ready', handler);
        document.addEventListener('fdc:supabase-ready', handler);

        let tries = 0;
        const interval = setInterval(function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(interval);
                callback();
            }
            if (++tries > 40) {
                clearInterval(interval);
                showAlert('error', 'ডাটাবেস কানেকশন পাওয়া যায়নি। পেজ রিফ্রেশ করুন।');
            }
        }, 250);
    }

    // =========================================================
    // ALERT
    // =========================================================
    function showAlert(type, message) {
        if (!loginAlert) return;
        loginAlert.className = 'alert-box show ' + type;
        loginAlert.innerHTML = '<i class="fas fa-' +
            (type === 'error'   ? 'exclamation-circle' :
             type === 'success' ? 'check-circle' : 'info-circle') +
            '"></i> ' + message;
    }

    function hideAlert() {
        if (!loginAlert) return;
        loginAlert.className = 'alert-box';
        loginAlert.innerHTML = '';
    }

    // =========================================================
    // LOADING
    // =========================================================
    function setLoading(loading) {
        if (!loginBtn) return;
        loginBtn.disabled = loading;
        loginBtn.innerHTML = loading
            ? '<i class="fas fa-spinner fa-spin"></i><span> যাচাই করা হচ্ছে...</span>'
            : '<i class="fas fa-sign-in-alt"></i><span> লগইন করুন</span>';
    }

    // =========================================================
    // ⚠️ REMOVED: Auto-redirect if already logged in
    // (এই ফিচারটি Back button-কে trap করে — তাই বাদ দেওয়া হলো)
    // =========================================================

    // =========================================================
    // SUBMIT
    // =========================================================
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert();

        const classVal = document.getElementById('loginClass').value.trim();
        const yearVal  = document.getElementById('loginYear').value.trim();
        const groupVal = document.getElementById('loginGroup').value.trim();
        const rollVal  = document.getElementById('loginRoll').value.trim();
        const dobVal   = document.getElementById('loginBirthDate').value.trim();

        if (!classVal || !yearVal || !groupVal || !rollVal || !dobVal) {
            showAlert('error', 'সব তথ্য পূরণ করুন।');
            return;
        }

        setLoading(true);

        try {
            const supabase = window.FDC_SUPABASE;
            if (!supabase) throw new Error('Database connection not ready');

            console.log('🔍 Login attempt:', { classVal, yearVal, groupVal, rollVal, dobVal });

            const { data, error } = await supabase
                .from('students')
                .select('id, name, roll, class, year, group_name, session, birth_date, profile_status, is_active, is_profile_complete, subjects, image_url')
                .eq('class', classVal)
                .eq('year', yearVal)
                .eq('group_name', groupVal)
                .eq('roll', rollVal)
                .eq('birth_date', dobVal)
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                showAlert('error', 'তথ্য মেলেনি। Class, Year, Group, Roll ও জন্ম তারিখ সঠিকভাবে দিন।');
                setLoading(false);
                return;
            }

            console.log('✅ Login successful:', data.name, '| Roll:', data.roll);

            sessionStorage.setItem('student_id', data.id);
            sessionStorage.setItem('student_roll', data.roll);
            sessionStorage.setItem('student_name', data.name || '');
            sessionStorage.setItem('student_class', data.class || '');
            sessionStorage.setItem('student_year', data.year || '');
            sessionStorage.setItem('student_group', data.group_name || '');
            sessionStorage.setItem('student_session', data.session || '');
            sessionStorage.setItem('is_profile_complete', data.is_profile_complete ? 'true' : 'false');
            sessionStorage.setItem('profile_status', data.profile_status || 'pending');

            showAlert('success', 'সফলভাবে লগইন হয়েছে! ড্যাশবোর্ডে যাচ্ছে...');

            setTimeout(function () {
                // ⚠️ replace() — History-তে Login entry রাখবে না
                window.location.replace('student-dashboard.html');
            }, 900);

        } catch (err) {
            console.error('❌ Login error:', err);
            showAlert('error', 'লগইন ব্যর্থ: ' + (err.message || 'অজানা ত্রুটি'));
            setLoading(false);
        }
    });

    waitForSupabase(function () {
        console.log('✅ Student login ready');
    });

})();