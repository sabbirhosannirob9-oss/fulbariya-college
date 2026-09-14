/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN RESET PASSWORD
 * Location: js/admin-reset-password.js
 * Depends: config.js, supabase.js
 * =========================================================
 */

(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // PASSWORD STRENGTH
    // =========================================================
    function calculateStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }

    function updateStrengthUI(password) {
        const wrap = $('strengthWrap');
        const text = $('strengthText');
        const segs = [$('seg1'), $('seg2'), $('seg3'), $('seg4')];

        if (!wrap || !text || segs.some(s => !s)) return;

        if (!password) {
            wrap.classList.remove('show');
            return;
        }

        wrap.classList.add('show');

        const score = calculateStrength(password);

        // Reset
        segs.forEach(s => {
            s.className = 'strength-segment';
        });

        let level, label, cls;

        if (score <= 2) {
            level = 1; label = 'দুর্বল'; cls = 'weak';
        } else if (score === 3) {
            level = 2; label = 'মাঝারি'; cls = 'fair';
        } else if (score === 4) {
            level = 3; label = 'ভালো'; cls = 'good';
        } else {
            level = 4; label = 'শক্তিশালী'; cls = 'strong';
        }

        for (let i = 0; i < level; i++) {
            segs[i].classList.add(cls);
        }

        text.textContent = 'পাসওয়ার্ড: ' + label;
        text.style.color = level === 1 ? '#ff9b9b' : level === 2 ? '#fcd34d' : '#6ee7b7';
    }

    // =========================================================
    // REQUIREMENTS CHECK
    // =========================================================
    function updateRequirements(password) {
        const box = $('reqBox');
        if (!box) return;

        box.classList.add('show');

        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password)
        };

        Object.entries(checks).forEach(([key, met]) => {
            const item = box.querySelector(`[data-req="${key}"]`);
            if (item) {
                item.classList.toggle('met', met);
            }
        });

        return Object.values(checks).every(v => v);
    }

    // =========================================================
    // SHOW ALERT
    // =========================================================
    function showAlert(message, type = 'error') {
        const alert = $('resetAlert');
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
    // PASSWORD TOGGLE
    // =========================================================
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function () {
                const targetId = this.dataset.target;
                const input = $(targetId);
                const icon = this.querySelector('i');

                if (!input || !icon) return;

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    // =========================================================
    // SUBMIT — UPDATE PASSWORD
    // =========================================================
    async function handleReset(e) {
        if (e) e.preventDefault();

        const newPass = $('newPassword').value;
        const confirmPass = $('confirmPassword').value;
        const btn = $('resetBtn');
        const btnText = $('resetBtnText');

        // Validation
        if (!newPass) {
            showAlert('নতুন পাসওয়ার্ড দিন', 'error');
            $('newPassword').focus();
            return;
        }

        if (newPass.length < 8) {
            showAlert('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'error');
            return;
        }

        if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
            showAlert('পাসওয়ার্ডে বড় হাত, ছোট হাত ও সংখ্যা থাকতে হবে', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            showAlert('দুটি পাসওয়ার্ড মিলছে না', 'error');
            $('confirmPassword').focus();
            return;
        }

        // Disable
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>আপডেট হচ্ছে...</span>';

        try {
            if (!window.FDC_SUPABASE) {
                throw new Error('Supabase connection নেই');
            }

            // Update password via Supabase Auth
            const { data, error } = await window.FDC_SUPABASE.auth.updateUser({
                password: newPass
            });

            if (error) throw error;

            console.log('✅ Password updated successfully');

            // Show success state
            $('formState').style.display = 'none';
            $('successState').classList.add('show');

        } catch (err) {
            console.error('Reset password error:', err);

            let errorMsg = 'পাসওয়ার্ড আপডেট করা যায়নি';
            const msg = (err.message || '').toLowerCase();

            if (msg.includes('same password')) {
                errorMsg = 'এই পাসওয়ার্ড আগে ব্যবহার করা হয়েছে। নতুন পাসওয়ার্ড দিন।';
            } else if (msg.includes('weak')) {
                errorMsg = 'পাসওয়ার্ড আরও শক্তিশালী করুন।';
            } else if (msg.includes('session') || msg.includes('expired')) {
                errorMsg = 'রিসেট লিংক মেয়াদোত্তীর্ণ। আবার Forgot Password করুন।';
            } else if (err.message) {
                errorMsg = err.message;
            }

            showAlert(errorMsg, 'error');
            btn.disabled = false;
            btn.innerHTML = originalHtml;

        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🔒 Reset Password page initializing...');

        setupPasswordToggles();

        // Password strength
        const newPassInput = $('newPassword');
        if (newPassInput) {
            newPassInput.addEventListener('input', function () {
                updateStrengthUI(this.value);
                updateRequirements(this.value);
            });
            newPassInput.addEventListener('focus', function () {
                updateRequirements(this.value);
            });
        }

        // Form submit
        const form = $('resetForm');
        if (form) {
            form.addEventListener('submit', handleReset);
        }

        // Check if user has valid session from reset link
        setTimeout(async () => {
            try {
                if (!window.FDC_SUPABASE) return;

                const { data: { session } } = await window.FDC_SUPABASE.auth.getSession();

                if (!session) {
                    showAlert(
                        'এই রিসেট লিংকটি মেয়াদোত্তীর্ণ বা ভুল। Login page থেকে আবার "Forgot Password" করুন।',
                        'error'
                    );
                }
            } catch (e) {
                console.warn('Session check failed:', e);
            }
        }, 800);

        console.log('✅ Reset Password ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();