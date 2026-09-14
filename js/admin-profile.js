/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN PROFILE
 * Location: js/admin-profile.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js, admin-popup.js
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let currentAdmin = null;
    let selectedAvatarFile = null;
    let avatarChanged = false;

    const $ = (id) => document.getElementById(id);

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
    // SHOW ALERT
    // =========================================================
    function showAlert(targetId, message, type = 'error') {
        const el = $(targetId);
        if (!el) return;

        const icons = {
            error: 'fa-exclamation-circle',
            success: 'fa-check-circle',
            info: 'fa-info-circle'
        };

        el.className = 'alert-admin ' + type + ' show';
        el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;

        // Auto hide success/info after 5s
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                el.classList.remove('show');
            }, 5000);
        }
    }

    // =========================================================
    // HIDE LOADER
    // =========================================================
    function hideLoader() {
        const loader = $('pageLoader');
        if (loader) {
            loader.classList.add('hide');
            setTimeout(() => loader.remove(), 300);
        }
    }

    // =========================================================
    // FORMAT DATE
    // =========================================================
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('bn-BD', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return '—';
        }
    }

    function formatTime(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('bn-BD', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '—';
        }
    }

    // =========================================================
    // LOAD ADMIN PROFILE
    // =========================================================
    async function loadAdminProfile() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();

            if (!result || !result.admin) {
                window.fdcError('Session নেই। Login করুন।');
                setTimeout(() => {
                    window.location.replace('admin-login.html');
                }, 1500);
                return;
            }

            currentAdmin = result.admin;
            console.log('✅ Admin loaded:', currentAdmin.name);

            renderProfile(currentAdmin);

        } catch (err) {
            console.error('Load profile error:', err);
            window.fdcError('Profile load failed: ' + err.message);
        }
    }

    // =========================================================
    // RENDER PROFILE
    // =========================================================
    function renderProfile(admin) {
        // Hero section
        const heroAvatar = $('heroAvatar');
        if (admin.image_url) {
            heroAvatar.innerHTML = `<img src="${admin.image_url}" alt="${admin.name}">`;
        } else {
            heroAvatar.textContent = (admin.name || 'A').charAt(0).toUpperCase();
        }

        $('heroName').textContent = admin.name || 'Administrator';
        $('heroRole').textContent = admin.role === 'super_admin' ? 'Super Admin' : 'Admin';
        $('heroEmail').innerHTML = `<i class="fas fa-envelope"></i> ${admin.email || '—'}`;

        // Meta
        $('metaPhone').textContent = admin.phone || '—';
        $('metaAddress').textContent = admin.address || '—';
        $('metaLastLogin').textContent = admin.last_login_at ? formatTime(admin.last_login_at) : 'এইমাত্র';

        // Profile form
        $('profileName').value = admin.name || '';
        $('profileEmail').value = admin.email || '';
        $('profilePhone').value = admin.phone || '';
        $('profileAddress').value = admin.address || '';

        // Account info
        const roleBadge = $('infoRole');
        roleBadge.textContent = admin.role === 'super_admin' ? 'Super Admin' : 'Admin';
        roleBadge.className = admin.role === 'super_admin' ? 'role-badge super' : 'role-badge';

        $('infoCreated').textContent = formatDate(admin.created_at);
        $('infoLastLogin').textContent = admin.last_login_at ? formatTime(admin.last_login_at) : 'এইমাত্র';
    }

    // =========================================================
    // RESET PROFILE FORM
    // =========================================================
    window.resetProfileForm = function () {
        if (!currentAdmin) return;

        $('profileName').value = currentAdmin.name || '';
        $('profilePhone').value = currentAdmin.phone || '';
        $('profileAddress').value = currentAdmin.address || '';

        $('profileAlert').classList.remove('show');

        // Reset avatar if changed
        if (avatarChanged) {
            selectedAvatarFile = null;
            avatarChanged = false;
            const heroAvatar = $('heroAvatar');
            if (currentAdmin.image_url) {
                heroAvatar.innerHTML = `<img src="${currentAdmin.image_url}" alt="${currentAdmin.name}">`;
            } else {
                heroAvatar.textContent = (currentAdmin.name || 'A').charAt(0).toUpperCase();
            }
        }

        window.fdcAlert('Form reset হয়েছে', 'Information', 'info');
    };

    // =========================================================
    // SAVE PROFILE
    // =========================================================
    async function saveProfile(e) {
        if (e) e.preventDefault();

        if (!currentAdmin) return;

        const name = $('profileName').value.trim();
        const phone = $('profilePhone').value.trim();
        const address = $('profileAddress').value.trim();

        // Validation
        if (!name) {
            showAlert('profileAlert', 'নাম দিতে হবে', 'error');
            $('profileName').focus();
            return;
        }

        const btn = $('saveProfileBtn');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            let imageUrl = currentAdmin.image_url || null;

            // Upload new avatar if changed
            if (avatarChanged && selectedAvatarFile) {
                if (typeof window.FDCUploadImage !== 'function') {
                    throw new Error('Image upload service নেই');
                }

                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading photo...';
                const uploadResult = await window.FDCUploadImage(selectedAvatarFile);
                imageUrl = uploadResult.url || uploadResult.secure_url;
            }

            // Update admins table
            const { error } = await window.FDC_SUPABASE
                .from('admins')
                .update({
                    name: name,
                    phone: phone || null,
                    address: address || null,
                    image_url: imageUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentAdmin.id);

            if (error) throw error;

            // Update local state
            currentAdmin.name = name;
            currentAdmin.phone = phone;
            currentAdmin.address = address;
            currentAdmin.image_url = imageUrl;
            avatarChanged = false;
            selectedAvatarFile = null;

            // Update sessionStorage
            sessionStorage.setItem('admin_name', name);
            sessionStorage.setItem('admin_image', imageUrl || '');

            // Re-render
            renderProfile(currentAdmin);

            // Success
            window.fdcSuccess('Profile সফলভাবে আপডেট হয়েছে!');

        } catch (err) {
            console.error('Save profile error:', err);
            showAlert('profileAlert', 'Save failed: ' + err.message, 'error');
            window.fdcError('Save failed: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    // =========================================================
    // AVATAR UPLOAD
    // =========================================================
    window.triggerAvatarUpload = function () {
        const input = $('avatarInput');
        if (input) input.click();
    };

    function setupAvatarUpload() {
        const input = $('avatarInput');
        if (!input) return;

        input.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Validate
            if (!file.type.startsWith('image/')) {
                window.fdcError('শুধু image file upload করা যাবে');
                input.value = '';
                return;
            }

            if (file.size > 3 * 1024 * 1024) {
                window.fdcError('Image 3 MB-এর কম হতে হবে');
                input.value = '';
                return;
            }

            selectedAvatarFile = file;
            avatarChanged = true;

            // Preview
            const reader = new FileReader();
            reader.onload = function (ev) {
                const heroAvatar = $('heroAvatar');
                heroAvatar.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);

            window.fdcAlert('ছবি সিলেক্ট হয়েছে। এখন "Save Changes" চাপুন।', 'Photo Selected', 'info');
        });
    }

    // =========================================================
    // PASSWORD TOGGLE
    // =========================================================
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle-admin').forEach(btn => {
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
        const segs = [$('segA1'), $('segA2'), $('segA3'), $('segA4')];

        if (!wrap || !text || segs.some(s => !s)) return;

        if (!password) {
            wrap.classList.remove('show');
            return;
        }

        wrap.classList.add('show');

        const score = calculateStrength(password);

        segs.forEach(s => s.className = 'strength-seg-admin');

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

        text.textContent = 'Password: ' + label;
        text.style.color = level === 1 ? '#ef4444' : level === 2 ? '#f59e0b' : '#059669';
    }

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
            if (item) item.classList.toggle('met', met);
        });

        return Object.values(checks).every(v => v);
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================
    async function changePassword(e) {
        if (e) e.preventDefault();

        const currentPass = $('currentPassword').value;
        const newPass = $('newPassword').value;
        const confirmPass = $('confirmPassword').value;
        const btn = $('changePasswordBtn');
        const alertEl = $('passwordAlert');

        // Reset alert
        alertEl.classList.remove('show');

        // Validation
        if (!currentPass) {
            showAlert('passwordAlert', 'বর্তমান পাসওয়ার্ড দিন', 'error');
            $('currentPassword').focus();
            return;
        }

        if (!newPass) {
            showAlert('passwordAlert', 'নতুন পাসওয়ার্ড দিন', 'error');
            $('newPassword').focus();
            return;
        }

        if (newPass.length < 8) {
            showAlert('passwordAlert', 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'error');
            return;
        }

        if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
            showAlert('passwordAlert', 'বড় হাত, ছোট হাত ও সংখ্যা থাকতে হবে', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            showAlert('passwordAlert', 'নতুন পাসওয়ার্ড দুটি মিলছে না', 'error');
            $('confirmPassword').focus();
            return;
        }

        if (newPass === currentPass) {
            showAlert('passwordAlert', 'নতুন পাসওয়ার্ড আগেরটার মতো হতে পারবে না', 'error');
            return;
        }

        // Disable button
        btn.disabled = true;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        try {
            if (!window.FDC_SUPABASE) {
                throw new Error('Supabase connection নেই');
            }

            // Step 1: Verify current password
            // Sign in again with current password to verify
            const { data: sessionData } = await window.FDC_SUPABASE.auth.getSession();
            const email = sessionData?.session?.user?.email;

            if (!email) {
                throw new Error('Session নেই। আবার login করুন।');
            }

            // Try to sign in with current password (verification)
            const { error: verifyError } = await window.FDC_SUPABASE.auth.signInWithPassword({
                email: email,
                password: currentPass
            });

            if (verifyError) {
                throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়');
            }

            // Step 2: Update password
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const { error: updateError } = await window.FDC_SUPABASE.auth.updateUser({
                password: newPass
            });

            if (updateError) throw updateError;

            // Success
            window.fdcSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! পরবর্তী লগইনে নতুন পাসওয়ার্ড ব্যবহার করুন।');

            // Reset form
            $('passwordForm').reset();
            $('strengthWrap').classList.remove('show');
            $('reqBox').classList.remove('show');

        } catch (err) {
            console.error('Change password error:', err);
            showAlert('passwordAlert', err.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি', 'error');
            window.fdcError(err.message || 'Password change failed');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    // =========================================================
    // LOGOUT
    // =========================================================
    window.handleLogout = function () {
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try {
                    if (window.FDCAuth) {
                        await window.FDCAuth.logout();
                    } else if (window.FDC_SUPABASE) {
                        await window.FDC_SUPABASE.auth.signOut();
                    }
                } catch (e) {
                    console.warn('SignOut error:', e);
                }

                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            {
                title: 'Logout Confirmation',
                confirmText: 'Yes, Logout',
                cancelText: 'Cancel',
                confirmType: 'danger'
            }
        );
    };

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admin Profile initializing...');

        setupPasswordToggles();
        setupAvatarUpload();

        // Profile form submit
        const profileForm = $('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', saveProfile);
        }

        // Password form submit
        const passwordForm = $('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', changePassword);
        }

        // Password strength + requirements
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

        // Load admin profile
        waitForSupabase(async function () {
            await loadAdminProfile();
            hideLoader();
            console.log('✅ Admin Profile ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();