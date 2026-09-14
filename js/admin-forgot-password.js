/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN FORGOT PASSWORD
 * Location: js/admin-forgot-password.js
 * Depends: config.js, supabase.js
 * =========================================================
 */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // OPEN MODAL
    // =========================================================
    window.openForgotModal = function () {
        const modal = $('forgotModal');
        if (!modal) return;

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Auto-focus email input
        setTimeout(() => {
            const emailInput = $('forgotEmail');
            if (emailInput) emailInput.focus();
        }, 300);

        // Prefill email if remembered
        const rememberedEmail = localStorage.getItem('fdc_admin_email');
        const emailInput = $('forgotEmail');
        if (rememberedEmail && emailInput && !emailInput.value) {
            emailInput.value = rememberedEmail;
        }
    };

    // =========================================================
    // CLOSE MODAL
    // =========================================================
    window.closeForgotModal = function () {
        const modal = $('forgotModal');
        if (!modal) return;

        modal.classList.remove('show');
        document.body.style.overflow = '';

        const form = $('forgotForm');
        if (form) form.reset();

        const alert = $('forgotAlert');
        if (alert) {
            alert.classList.remove('show');
            alert.textContent = '';
        }
    };

    // =========================================================
    // SHOW ALERT
    // =========================================================
    function showAlert(message, type = 'error') {
        const alert = $('forgotAlert');
        if (!alert) return;

        const icons = {
            error: 'fa-exclamation-circle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        };

        alert.className = 'alert-box ' + type + ' show';
        alert.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    }

    // =========================================================
    // VALIDATE EMAIL
    // =========================================================
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // =========================================================
    // SEND RESET LINK
    // =========================================================
    async function sendResetLink(e) {
        if (e) e.preventDefault();

        const emailInput = $('forgotEmail');
        const btn = $('forgotBtn');
        const btnText = $('forgotBtnText');

        if (!emailInput || !btn || !btnText) return;

        const email = emailInput.value.trim().toLowerCase();

        // Validation
        if (!email) {
            showAlert('Email দিন', 'error');
            emailInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showAlert('সঠিক email address দিন', 'error');
            emailInput.focus();
            return;
        }

        // Disable button
        btn.disabled = true;
        const originalText = btnText.textContent;
        btnText.textContent = 'পাঠানো হচ্ছে...';
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span id="forgotBtnText">পাঠানো হচ্ছে...</span>';

        try {
            // Ensure Supabase is ready
            if (!window.FDC_SUPABASE) {
                throw new Error('Supabase connection নেই। Page reload করুন।');
            }

            // Check if email exists in admins table
            const { data: admin, error: checkError } = await window.FDC_SUPABASE
                .from('admins')
                .select('id, email, is_active')
                .eq('email', email)
                .maybeSingle();

            if (checkError) {
                console.warn('Admin check error:', checkError);
                // Continue anyway (security: don't reveal if exists)
            }

            if (admin && !admin.is_active) {
                showAlert('এই account নিষ্ক্রিয় করা হয়েছে। অধ্যক্ষের সাথে যোগাযোগ করুন।', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i><span id="forgotBtnText">রিসেট লিংক পাঠান</span>';
                return;
            }

            // Build redirect URL
            const currentPath = window.location.pathname;
            const redirectUrl = window.location.origin + 
                currentPath.replace('admin-login.html', 'admin-reset-password.html');

            // Send reset email
            const { error: resetError } = await window.FDC_SUPABASE.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });

            if (resetError) {
                console.error('Reset error:', resetError);
                throw new Error(resetError.message || 'Email পাঠানো যায়নি');
            }

            // Success
            showAlert(
                '✅ রিসেট লিংক পাঠানো হয়েছে! Email check করুন (Inbox + Spam folder)।',
                'success'
            );

            // Save email for convenience
            try {
                localStorage.setItem('fdc_admin_email', email);
            } catch (e) { /* ignore */ }

            // Auto close after 5 seconds
            setTimeout(() => {
                closeForgotModal();
            }, 5000);

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i><span id="forgotBtnText">পাঠানো হয়েছে ✓</span>';

            // Reset after 5 sec
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-paper-plane"></i><span id="forgotBtnText">রিসেট লিংক পাঠান</span>';
            }, 5000);

        } catch (err) {
            console.error('Forgot password error:', err);

            let errorMsg = 'সমস্যা হয়েছে। আবার চেষ্টা করুন।';
            const msg = (err.message || '').toLowerCase();

            if (msg.includes('rate limit') || msg.includes('too many')) {
                errorMsg = 'অনেকবার চেষ্টা করা হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন।';
            } else if (msg.includes('invalid email')) {
                errorMsg = 'Email address সঠিক নয়।';
            } else if (msg.includes('network') || msg.includes('fetch')) {
                errorMsg = 'Internet connection check করুন।';
            } else if (err.message) {
                errorMsg = err.message;
            }

            showAlert(errorMsg, 'error');

            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i><span id="forgotBtnText">রিসেট লিংক পাঠান</span>';
        }
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================
    function init() {
        const form = $('forgotForm');
        if (form) {
            form.addEventListener('submit', sendResetLink);
        }

        const overlay = $('forgotModal');
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    closeForgotModal();
                }
            });
        }

        const forgotLink = $('forgotLink');
        if (forgotLink) {
            forgotLink.addEventListener('click', function (e) {
                e.preventDefault();
                openForgotModal();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
                closeForgotModal();
            }
        });

        console.log('🔑 Forgot Password system ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();