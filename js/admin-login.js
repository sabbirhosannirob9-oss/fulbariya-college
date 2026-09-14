/**
 * =========================================================
 * FULBARIYA COLLEGE - ADMIN LOGIN
 * Supabase Auth + Role Verification
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // DOM ELEMENTS
    // =========================================================
    const form = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('adminLoginBtn');
    const btnText = document.getElementById('btnText');
    const alertBox = document.getElementById('adminAlert');
    const passwordToggle = document.getElementById('passwordToggle');
    const toggleIcon = document.getElementById('toggleIcon');
    const rememberCheck = document.getElementById('rememberEmail');
    const forgotLink = document.getElementById('forgotLink');
    const sessionBanner = document.getElementById('sessionBanner');

    // =========================================================
    // ALERT HELPERS
    // =========================================================
    function showAlert(msg, type = 'error') {
        const icons = {
            error: 'fa-exclamation-circle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        };
        alertBox.className = 'alert-box show ' + type;
        alertBox.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="margin-top:2px;"></i> <span>${msg}</span>`;
    }

    function hideAlert() {
        alertBox.className = 'alert-box';
        alertBox.innerHTML = '';
    }

    // =========================================================
    // PASSWORD TOGGLE
    // =========================================================
    let passwordVisible = false;

    passwordToggle.addEventListener('click', function () {
        passwordVisible = !passwordVisible;
        if (passwordVisible) {
            passwordInput.type = 'text';
            toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
            passwordToggle.setAttribute('aria-label', 'Hide password');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
            passwordToggle.setAttribute('aria-label', 'Show password');
        }
    });

    // =========================================================
    // REMEMBER EMAIL
    // =========================================================
    function loadSavedEmail() {
        const saved = localStorage.getItem('admin_remembered_email');
        if (saved) {
            emailInput.value = saved;
            rememberCheck.checked = true;
            passwordInput.focus();
        } else {
            emailInput.focus();
        }
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================
    forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        showAlert(
            'পাসওয়ার্ড রিসেট করতে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।',
            'info'
        );
    });

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
    // Already ready?
    if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
        cb();
        return;
    }

    // Listen on both window and document
    const handler = function () {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
            cb();
        }
    };
    window.addEventListener('fdc:supabase-ready', handler);
    document.addEventListener('fdc:supabase-ready', handler);

    // Fallback polling
    let n = 0;
    const i = setInterval(function () {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
            clearInterval(i);
            cb();
        }
        if (++n > 20) {
            clearInterval(i);
            console.error('❌ Supabase not ready after 10 seconds');
        }
    }, 500);
}
    // =========================================================
    // SESSION CHECK — আগে লগইন থাকলে সরাসরি Dashboard
    // =========================================================
    async function checkExistingSession() {
        try {
            // 1. sessionStorage চেক
            const adminId = sessionStorage.getItem('admin_id');
            if (adminId) {
                console.log('✅ Admin session found in sessionStorage');
                sessionBanner.classList.add('show');
                return;
            }

            // 2. Supabase session চেক
            const supabase = window.FDC_SUPABASE;
            if (!supabase) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log('✅ Supabase session found, verifying admin...');

                const { data: admin } = await supabase
                    .from('admins')
                    .select('id, name, role, is_active')
                    .eq('auth_user_id', session.user.id)
                    .maybeSingle();

                if (admin && admin.is_active) {
                    // সেশন সেভ করে Dashboard-এ পাঠান
                    sessionStorage.setItem('admin_id', admin.id);
                    sessionStorage.setItem('admin_auth_id', session.user.id);
                    sessionStorage.setItem('admin_name', admin.name || 'Admin');
                    sessionStorage.setItem('admin_role', admin.role || 'admin');

                    showAlert('✅ লগইন সেশন সক্রিয়। Dashboard-এ যাচ্ছে...', 'success');
                    setTimeout(() => {
                        window.location.replace('admin-dashboard.html');
                    }, 1000);
                }
            }
        } catch (e) {
            console.warn('Session check error:', e);
        }
    }

    // =========================================================
    // HANDLE LOGIN
    // =========================================================
    async function handleLogin(e) {
        e.preventDefault();
        hideAlert();

        if (loginBtn.disabled) return;

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const rememberMe = rememberCheck.checked;

        // -------- Validation --------
        if (!email) {
            showAlert('Email দিন', 'error');
            emailInput.focus();
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert('সঠিক Email ফরম্যাট দিন', 'error');
            emailInput.focus();
            return;
        }
        if (!password) {
            showAlert('পাসওয়ার্ড দিন', 'error');
            passwordInput.focus();
            return;
        }
        if (password.length < 6) {
            showAlert('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে', 'error');
            passwordInput.focus();
            return;
        }

        // -------- Remember Email --------
        if (rememberMe) {
            localStorage.setItem('admin_remembered_email', email);
        } else {
            localStorage.removeItem('admin_remembered_email');
        }

        // -------- Loading State --------
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>যাচাই করা হচ্ছে...</span>';
        emailInput.disabled = true;
        passwordInput.disabled = true;

        try {
            const supabase = window.FDC_SUPABASE;
            if (!supabase) throw new Error('Database connection not ready');

            // ✅ STEP 1: Supabase Auth লগইন
            console.log('🔐 Admin login attempt:', email);

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                console.error('Auth error:', authError);
                let msg = authError.message;

                if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
                    msg = 'Email বা Password ভুল';
                } else if (msg.includes('Email not confirmed')) {
                    msg = 'Email যাচাই হয়নি। Supabase Dashboard → Auth → Users থেকে Confirm করুন।';
                } else if (msg.includes('Too many')) {
                    msg = 'অনেকবার চেষ্টা করেছেন। কিছুক্ষণ অপেক্ষা করুন।';
                }
                throw new Error(msg);
            }

            if (!authData?.user) {
                throw new Error('লগইন ব্যর্থ হয়েছে');
            }

            const userId = authData.user.id;
            console.log('✅ Auth success:', authData.user.email);

            // ✅ STEP 2: admins টেবিল থেকে চেক
            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .select('id, name, email, role, is_active, auth_user_id, image_url')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (adminError) {
                console.error('Admin query error:', adminError);
                await supabase.auth.signOut();
                throw new Error('অ্যাডমিন তথ্য লোড করতে সমস্যা');
            }

            if (!admin) {
                await supabase.auth.signOut();
                throw new Error('আপনি অ্যাডমিন নন। এই অ্যাকাউন্টের অ্যাডমিন অ্যাক্সেস নেই।');
            }

            if (!admin.is_active) {
                await supabase.auth.signOut();
                throw new Error('আপনার অ্যাডমিন অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে।');
            }

            const validRoles = ['super_admin', 'admin', 'moderator'];
            if (!validRoles.includes(admin.role)) {
                await supabase.auth.signOut();
                throw new Error('আপনার অ্যাডমিন রোল সঠিক নয়।');
            }

            // ✅ STEP 3: Session সেভ
            sessionStorage.setItem('admin_id', admin.id);
            sessionStorage.setItem('admin_auth_id', userId);
            sessionStorage.setItem('admin_name', admin.name || 'Admin');
            sessionStorage.setItem('admin_email', admin.email || email);
            sessionStorage.setItem('admin_role', admin.role);
            sessionStorage.setItem('admin_image', admin.image_url || '');
            sessionStorage.setItem('admin_login_time', new Date().toISOString());

            // ✅ STEP 4: last_login_at আপডেট
            try {
                await supabase.from('admins').update({
                    last_login_at: new Date().toISOString()
                }).eq('id', admin.id);
            } catch (e) {
                console.warn('Last login update failed:', e);
            }

            // ✅ SUCCESS
            showAlert(
                `✅ স্বাগতম, <strong>${admin.name || 'Admin'}</strong>!<br>Dashboard-এ নেওয়া হচ্ছে...`,
                'success'
            );

            setTimeout(() => {
                window.location.replace('admin-dashboard.html');
            }, 1200);

        } catch (err) {
            console.error('❌ Login error:', err);
            showAlert(err.message || 'লগইন ব্যর্থ হয়েছে', 'error');

            // Reset
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> <span>Login to Admin Panel</span>';
            emailInput.disabled = false;
            passwordInput.disabled = false;

            // Password clear (নিরাপত্তার জন্য)
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Login page initialized');

        form.addEventListener('submit', handleLogin);

        loadSavedEmail();

        waitForSupabase(() => {
            console.log('✅ Supabase ready for admin login');
            checkExistingSession();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();