/**
 * =========================================================
 * FULBARIYA COLLEGE — AUTHENTICATION MANAGER
 * Location: js/auth.js
 * Depends on: config.js, supabase.js
 * =========================================================
 */

(function () {
    "use strict";

    console.log("🔐 Auth.js loading...");

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(callback) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
            callback();
            return;
        }
        window.addEventListener('fdc:supabase-ready', callback);
        let tries = 0;
        const interval = setInterval(function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(interval);
                callback();
            }
            if (++tries > 40) clearInterval(interval);
        }, 500);
    }

    // =========================================================
    // FDCAuth OBJECT
    // =========================================================
    const FDCAuth = {

        // =====================================================
        // ADMIN — Get Current
        // =====================================================
        getCurrentAdmin: async function () {
            try {
                const supabase = window.FDC_SUPABASE;
                if (!supabase) return null;

                // ১. sessionStorage থেকে
                const adminId = sessionStorage.getItem('admin_id');
                if (adminId) {
                    const { data: admin } = await supabase
                        .from('admins')
                        .select('id, name, email, role, is_active, auth_user_id, image_url, phone, address')
                        .eq('id', adminId)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (admin) return { admin: admin };
                    this.logout();
                    return null;
                }

                // ২. Supabase session থেকে
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return null;

                const { data: admin } = await supabase
                    .from('admins')
                    .select('id, name, email, role, is_active, auth_user_id, image_url, phone, address')
                    .eq('auth_user_id', session.user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (!admin) return null;

                this._saveAdminSession(admin, session.user.id);
                return { admin: admin };

            } catch (err) {
                console.error('❌ getCurrentAdmin:', err);
                return null;
            }
        },

        // =====================================================
        // ADMIN — Status
        // =====================================================
        isAdminLoggedIn: function () {
            return !!sessionStorage.getItem('admin_id');
        },

        getAdminRole: function () {
            return sessionStorage.getItem('admin_role');
        },

        hasAdminRole: function (roles) {
            const current = this.getAdminRole();
            if (!current) return false;
            if (Array.isArray(roles)) return roles.includes(current);
            return current === roles;
        },

        // =====================================================
        // STUDENT — Get Current
        // =====================================================
        getCurrentStudent: async function () {
            try {
                const supabase = window.FDC_SUPABASE;
                if (!supabase) return null;

                const studentId = sessionStorage.getItem('student_id');
                if (!studentId) return null;

                const { data: student } = await supabase
                    .from('students')
                    .select('id, name, roll, class, year, group_name, session, profile_status, is_profile_complete, image_url, subjects')
                    .eq('id', studentId)
                    .eq('is_active', true)
                    .maybeSingle();

                if (!student) {
                    this.logout();
                    return null;
                }

                return { student: student };

            } catch (err) {
                console.error('❌ getCurrentStudent:', err);
                return null;
            }
        },

        isStudentLoggedIn: function () {
            return !!sessionStorage.getItem('student_id');
        },

        // =====================================================
        // LOGOUT
        // =====================================================
        logout: async function () {
            try {
                const supabase = window.FDC_SUPABASE;
                if (supabase) {
                    await supabase.auth.signOut();
                }
            } catch (err) {
                console.warn('⚠️ signOut error:', err);
            }
            sessionStorage.clear();
            localStorage.removeItem('student_id');
            console.log('✅ Logged out');
        },

        // =====================================================
        // ROUTE PROTECTION
        // =====================================================
        requireAdmin: async function () {
            const result = await this.getCurrentAdmin();
            if (!result) {
                console.warn('🚫 Not authorized, redirecting to login...');
                window.location.replace('admin-login.html');
                return null;
            }
            return result.admin;
        },

        requireStudent: async function () {
            const result = await this.getCurrentStudent();
            if (!result) {
                console.warn('🚫 Not authorized, redirecting to login...');
                window.location.replace('student-login.html');
                return null;
            }
            return result.student;
        },

        // =====================================================
        // AUTH STATE
        // =====================================================
        onAuthStateChange: function (callback) {
            const supabase = window.FDC_SUPABASE;
            if (!supabase) return;

            supabase.auth.onAuthStateChange(function (event, session) {
                console.log('🔔 Auth state:', event);
                if (typeof callback === 'function') callback(event, session);
                if (event === 'SIGNED_OUT') sessionStorage.clear();
            });
        },

        // =====================================================
        // INTERNAL
        // =====================================================
        _saveAdminSession: function (admin, authUserId) {
            sessionStorage.setItem('admin_id', admin.id);
            sessionStorage.setItem('admin_auth_id', authUserId);
            sessionStorage.setItem('admin_name', admin.name || 'Admin');
            sessionStorage.setItem('admin_email', admin.email || '');
            sessionStorage.setItem('admin_role', admin.role || 'admin');
            sessionStorage.setItem('admin_image', admin.image_url || '');
            sessionStorage.setItem('admin_login_time', new Date().toISOString());
        }
    };

    // =========================================================
    // EXPOSE
    // =========================================================
    window.FDCAuth = FDCAuth;

    waitForSupabase(function () {
        console.log('✅ FDCAuth ready');

        // Auto-listen auth state
        FDCAuth.onAuthStateChange(function (event) {
            if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out');
            }
        });
    });

})();