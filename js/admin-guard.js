/**
 * =========================================================
 * FULBARIYA COLLEGE - ADMIN SESSION GUARD
 * সব অ্যাডমিন পেজে লোড করলেই Smart Session Check হবে
 * =========================================================
 */

(function () {
    "use strict";

    const LOGIN_PAGE = 'admin-login.html';

    function redirectToLogin(reason = '') {
        console.log('→ Redirecting to login. Reason:', reason);
        sessionStorage.clear();
        window.location.replace(LOGIN_PAGE);
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        document.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i);
                cb();
            }
            if (++n > 20) clearInterval(i);
        }, 500);
    }

    async function checkSession() {
        try {
            // 1. sessionStorage চেক
            const adminId = sessionStorage.getItem('admin_id');
            if (adminId) {
                console.log('✅ Admin session (sessionStorage)');
                return true;
            }

            // 2. Supabase session চেক
            console.log('⏳ Checking Supabase session...');
            const supabase = window.FDC_SUPABASE;
            if (!supabase) {
                redirectToLogin('Supabase not ready');
                return false;
            }

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                redirectToLogin('No Supabase session');
                return false;
            }

            console.log('✅ Supabase session found:', session.user.email);

            // 3. admins টেবিল verify
            const { data: admin, error: adminError } = await supabase
                .from('admins')
                .select('id, name, role, is_active, image_url, email')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            if (adminError || !admin) {
                await supabase.auth.signOut();
                redirectToLogin('Admin record not found');
                return false;
            }

            if (!admin.is_active) {
                await supabase.auth.signOut();
                redirectToLogin('Admin inactive');
                return false;
            }

            // 4. sessionStorage সেভ
            sessionStorage.setItem('admin_id', admin.id);
            sessionStorage.setItem('admin_auth_id', session.user.id);
            sessionStorage.setItem('admin_name', admin.name || 'Admin');
            sessionStorage.setItem('admin_email', admin.email || session.user.email);
            sessionStorage.setItem('admin_role', admin.role || 'admin');
            sessionStorage.setItem('admin_image', admin.image_url || '');

            console.log('✅ Admin session restored:', admin.name);
            return true;

        } catch (err) {
            console.error('❌ Session check error:', err);
            redirectToLogin(err.message);
            return false;
        }
    }

    function renderAdminInfo() {
        const name = sessionStorage.getItem('admin_name') || 'Admin';
        const role = sessionStorage.getItem('admin_role') || 'admin';
        const image = sessionStorage.getItem('admin_image');

        document.querySelectorAll('[data-admin-name]').forEach(el => {
            el.textContent = name;
        });

        document.querySelectorAll('[data-admin-role]').forEach(el => {
            el.textContent = 'Role: ' + (role === 'super_admin' ? 'Super Admin' : 'Admin');
        });

        document.querySelectorAll('[data-admin-avatar]').forEach(el => {
            if (image) {
                el.innerHTML = `<img src="${image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
                el.textContent = name.charAt(0).toUpperCase();
            }
        });
    }

    // Global logout
    window.adminLogout = async function () {
    window.fdcConfirm(
        'আপনি কি লগআউট করতে চান?',
        async function() {
            try {
                if (window.FDC_SUPABASE) {
                    await window.FDC_SUPABASE.auth.signOut();
                }
            } catch (e) {
                console.warn('SignOut error:', e);
            }
            sessionStorage.clear();
            window.location.replace(LOGIN_PAGE);
        },
        {
            title: 'লগআউট নিশ্চিত করুন',
            confirmText: 'হ্যাঁ, লগআউট',
            cancelText: 'বাতিল',
            confirmType: 'danger'
        }
    );
};

    async function init() {
        console.log('🛡️ Admin Guard initialized');

        waitForSupabase(async () => {
            const ok = await checkSession();
            if (ok) {
                renderAdminInfo();
                document.dispatchEvent(new CustomEvent('admin:session-ready'));
                console.log('✅ admin:session-ready event dispatched');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();