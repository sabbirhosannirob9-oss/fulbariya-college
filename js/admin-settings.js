/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMIN SETTINGS
 * Location: js/admin-settings.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 * Version: 3.1 (Full — 13 Tabs, 8 Quick Cards)
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let settings = {};
    let principalImageFile = null;
    let aboutImageFile = null;
    let heroImageFiles = {};
    let campusImageFiles = {};
    let counterBgFile = null;

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        document.addEventListener('fdc:supabase-ready', cb);

        let n = 0;
        const i = setInterval(function () {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) { clearInterval(i); }
        }, 500);
    }

    // =========================================================
    // TOAST NOTIFICATION
    // =========================================================
    function showToast(msg, type) {
        type = type || 'success';

        let c = document.getElementById('toastContainer');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toastContainer';
            document.body.appendChild(c);
        }

        const t = document.createElement('div');
        t.className = 'toast-msg toast-' + type;
        t.textContent = msg;
        c.appendChild(t);

        setTimeout(function () {
            t.style.animation = 'slideOut 0.35s ease';
            setTimeout(function () { t.remove(); }, 350);
        }, 3500);
    }

    // =========================================================
    // PREMIUM CONFIRM MODAL
    // =========================================================
    function showConfirm(options) {
        return new Promise(function (resolve) {
            const opts = Object.assign({
                title: 'নিশ্চিত করুন',
                message: '',
                icon: 'question',
                confirmText: 'হ্যাঁ',
                cancelText: 'না',
                confirmColor: 'primary'
            }, options);

            document.querySelectorAll('.fdc-confirm-overlay').forEach(m => m.remove());

            const iconConfig = {
                question: { icon: 'fa-question-circle', color: '#3b82f6' },
                warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b' },
                danger: { icon: 'fa-exclamation-circle', color: '#ef4444' },
                info: { icon: 'fa-info-circle', color: '#3b82f6' },
                success: { icon: 'fa-check-circle', color: '#10b981' }
            };
            const cfg = iconConfig[opts.icon] || iconConfig.question;

            const confirmBtnColors = {
                primary: 'linear-gradient(135deg, #1a237e, #0d47a1)',
                danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
                warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
                success: 'linear-gradient(135deg, #10b981, #059669)'
            };

            const overlayHtml = `
                <div class="fdc-confirm-overlay">
                    <div class="fdc-confirm-box">
                        <div class="fdc-confirm-icon" style="background:${cfg.color}15;color:${cfg.color};">
                            <i class="fas ${cfg.icon}"></i>
                        </div>
                        <h3 class="fdc-confirm-title">${opts.title}</h3>
                        <p class="fdc-confirm-message">${opts.message}</p>
                        <div class="fdc-confirm-actions">
                            <button class="fdc-btn fdc-btn-cancel" data-action="cancel">
                                <i class="fas fa-times"></i> ${opts.cancelText}
                            </button>
                            <button class="fdc-btn fdc-btn-confirm" data-action="confirm"
                                    style="background:${confirmBtnColors[opts.confirmColor]};">
                                <i class="fas fa-check"></i> ${opts.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            if (!document.getElementById('fdc-confirm-styles')) {
                const style = document.createElement('style');
                style.id = 'fdc-confirm-styles';
                style.textContent = `
                    .fdc-confirm-overlay { position: fixed; inset: 0; background: rgba(6,29,54,0.65); backdrop-filter: blur(8px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fdcFadeIn 0.2s ease; }
                    @keyframes fdcFadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fdcSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    .fdc-confirm-box { background: linear-gradient(145deg, #ffffff, #f8f9fa); border-radius: 20px; padding: 32px 28px 24px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.3); animation: fdcSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); border: 1px solid rgba(255,255,255,0.8); }
                    .fdc-confirm-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 18px; }
                    .fdc-confirm-title { margin: 0 0 10px; font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1a237e; }
                    .fdc-confirm-message { margin: 0 0 24px; font-size: 14px; line-height: 1.7; color: #555; }
                    .fdc-confirm-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
                    .fdc-btn { min-width: 110px; padding: 12px 20px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.25s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
                    .fdc-btn:hover { transform: translateY(-2px); }
                    .fdc-btn-cancel { background: #f0f2f5; color: #555; }
                    .fdc-btn-cancel:hover { background: #e0e3eb; }
                    .fdc-btn-confirm { color: #fff; box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
                `;
                document.head.appendChild(style);
            }

            document.body.insertAdjacentHTML('beforeend', overlayHtml);
            const overlay = document.querySelector('.fdc-confirm-overlay');
            overlay.querySelector('.fdc-btn-confirm').focus();

            function close(result) {
                overlay.style.animation = 'fdcFadeIn 0.2s ease reverse';
                setTimeout(function () { overlay.remove(); }, 180);
                resolve(result);
            }

            overlay.querySelector('[data-action="cancel"]').addEventListener('click', function () { close(false); });
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () { close(true); });
            overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); close(false); }
                if (e.key === 'Enter') { document.removeEventListener('keydown', escHandler); close(true); }
            });
        });
    }

    // =========================================================
    // ADMIN INFO
    // =========================================================
    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const admin = result.admin;
                document.getElementById('adminName').textContent = admin.name || 'Administrator';
                document.getElementById('adminRole').textContent = 'Role: ' + (admin.role === 'super_admin' ? 'Super Admin' : 'Admin');
                document.getElementById('adminAvatar').textContent = (admin.name || 'A').charAt(0).toUpperCase();
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = async function () {
        const ok = await showConfirm({
            title: 'Logout',
            message: 'আপনি কি লগআউট করতে চান?',
            icon: 'question',
            confirmText: 'লগআউট',
            cancelText: 'বাতিল',
            confirmColor: 'danger'
        });
        if (!ok) return;

        try {
            await window.FDCAuth.logout();
            window.location.replace('admin-login.html');
        } catch (e) { console.error(e); }
    };

    // =========================================================
    // TABS
    // =========================================================
    function setupTabs() {
        const tabs = document.querySelectorAll('.settings-tab');
        const panels = document.querySelectorAll('.tab-panel');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const target = this.dataset.tab;

                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                this.classList.add('active');
                const panel = document.getElementById('tab-' + target);
                if (panel) panel.classList.add('active');

                try { localStorage.setItem('admin_settings_active_tab', target); } catch (e) {}
            });
        });

        // Restore
        try {
            const saved = localStorage.getItem('admin_settings_active_tab');
            if (saved) {
                const tab = document.querySelector(`.settings-tab[data-tab="${saved}"]`);
                if (tab) tab.click();
            }
        } catch (e) {}
    }

    // =========================================================
    // LOAD ALL SETTINGS FROM DB
    // =========================================================
    async function loadSettings() {
        try {
            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase.from('site_settings').select('*');
            if (error) throw error;

            settings = {};
            (data || []).forEach(s => { settings[s.key] = s.value; });

            console.log('✅ Settings loaded:', Object.keys(settings).length);

            loadHeroSettings();
            loadQuickSettings();
            loadAboutSettings();
            loadExploreSettings();
            loadCampusSettings();
            loadCtaSettings();
            loadCounterSettings();
            loadWelcomeSettings();
            loadTickerSettings();
            loadHeadingsSettings();
            loadPrincipalSettings();
            loadCollegeSettings();
            loadSocialSettings();

        } catch (err) {
            console.error('❌ Load error:', err);
            showToast('সেটিংস লোড করা যায়নি: ' + err.message, 'error');
        }
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    // =========================================================
    // HERO
    // =========================================================
    function loadHeroSettings() {
        for (let i = 1; i <= 3; i++) {
            setVal(`heroKicker${i}`, settings[`hero_slide_${i}_kicker`]);
            setVal(`heroTitle${i}`, settings[`hero_slide_${i}_title`]);
            setVal(`heroSubtitle${i}`, settings[`hero_slide_${i}_subtitle`]);
            setVal(`heroBtnText${i}`, settings[`hero_slide_${i}_btn_text`]);
            setVal(`heroBtnLink${i}`, settings[`hero_slide_${i}_btn_link`]);

            const imgUrl = settings[`hero_slide_${i}_image`];
            if (imgUrl) {
                setVal(`heroImageUrl${i}`, imgUrl);
                const imgEl = document.getElementById(`heroCurrentImg${i}`);
                const urlEl = document.getElementById(`heroCurrentUrl${i}`);
                const box = document.getElementById(`heroCurrent${i}`);
                if (imgEl) imgEl.src = imgUrl;
                if (urlEl) urlEl.textContent = imgUrl.substring(0, 50) + '...';
                if (box) box.classList.add('show');
            }
        }
    }

    // =========================================================
    // QUICK (8 cards)
    // =========================================================
    function loadQuickSettings() {
        for (let i = 1; i <= 8; i++) {
            setVal(`quickIcon${i}`, settings[`quick_card_${i}_icon`]);
            setVal(`quickTitle${i}`, settings[`quick_card_${i}_title`]);
            setVal(`quickDesc${i}`, settings[`quick_card_${i}_desc`]);
            setVal(`quickLink${i}`, settings[`quick_card_${i}_link`]);
            updateQuickPreview(i);
        }
    }

    function updateQuickPreview(n) {
        const iconEl = document.getElementById(`quickIcon${n}`);
        const titleEl = document.getElementById(`quickTitle${n}`);
        const previewIcon = document.getElementById(`quickPreviewIcon${n}`);
        const previewTitle = document.getElementById(`quickPreviewTitle${n}`);

        if (previewIcon && iconEl) previewIcon.className = iconEl.value || 'fas fa-star';
        if (previewTitle && titleEl) previewTitle.textContent = titleEl.value || 'Title';
    }

    // =========================================================
    // ABOUT
    // =========================================================
    function loadAboutSettings() {
        setVal('aboutTitle', settings.about_title);
        setVal('aboutDesc1', settings.about_description);
        setVal('aboutDesc2', settings.about_description_2);
        setVal('aboutBadgeNum', settings.about_badge_number);
        setVal('aboutBadgeText', settings.about_badge_text);
        setVal('aboutFact1Label', settings.about_fact_1_label);
        setVal('aboutFact1Value', settings.about_fact_1_value);
        setVal('aboutFact2Label', settings.about_fact_2_label);
        setVal('aboutFact2Value', settings.about_fact_2_value);
        setVal('aboutFact3Label', settings.about_fact_3_label);
        setVal('aboutFact3Value', settings.about_fact_3_value);
        setVal('aboutFact4Label', settings.about_fact_4_label);
        setVal('aboutFact4Value', settings.about_fact_4_value);

        const img = settings.about_image;
        if (img) {
            setVal('aboutImageUrl', img);
            const imgEl = document.getElementById('aboutCurrentImg');
            const urlEl = document.getElementById('aboutCurrentUrl');
            const box = document.getElementById('aboutCurrentImage');
            if (imgEl) imgEl.src = img;
            if (urlEl) urlEl.textContent = img.substring(0, 50) + '...';
            if (box) box.classList.add('show');
        }
    }

    // =========================================================
    // EXPLORE (Dynamic generation)
    // =========================================================
    function loadExploreSettings() {
        const container = document.getElementById('exploreContainer');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= 8; i++) {
            html += `
                <div class="hero-slider-item">
                    <div class="slider-header">
                        <span class="slider-number">🧭 Explore Card ${i}</span>
                        <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;cursor:pointer;">
                            <input type="checkbox" class="form-check-input" id="exploreFeatured${i}">
                            <span>Featured</span>
                        </label>
                    </div>
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label">Icon</label>
                            <input type="text" class="form-control" id="exploreIcon${i}" placeholder="fas fa-star">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-control" id="exploreTitle${i}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Description</label>
                            <input type="text" class="form-control" id="exploreDesc${i}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Link</label>
                            <input type="text" class="form-control" id="exploreLink${i}">
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        for (let i = 1; i <= 8; i++) {
            setVal(`exploreIcon${i}`, settings[`explore_${i}_icon`]);
            setVal(`exploreTitle${i}`, settings[`explore_${i}_title`]);
            setVal(`exploreDesc${i}`, settings[`explore_${i}_desc`]);
            setVal(`exploreLink${i}`, settings[`explore_${i}_link`]);

            const featured = document.getElementById(`exploreFeatured${i}`);
            if (featured) featured.checked = settings[`explore_${i}_featured`] === 'true';
        }
    }

    // =========================================================
    // CAMPUS
    // =========================================================
    function loadCampusSettings() {
        for (let i = 1; i <= 3; i++) {
            setVal(`campusTitle${i}`, settings[`campus_feature_${i}_title`]);
            setVal(`campusDesc${i}`, settings[`campus_feature_${i}_desc`]);
            setVal(`campusLink${i}`, settings[`campus_feature_${i}_link`]);

            const img = settings[`campus_feature_${i}_image`];
            if (img) {
                setVal(`campusImageUrl${i}`, img);
                const imgEl = document.getElementById(`campusCurrentImg${i}`);
                const urlEl = document.getElementById(`campusCurrentUrl${i}`);
                const box = document.getElementById(`campusCurrent${i}`);
                if (imgEl) imgEl.src = img;
                if (urlEl) urlEl.textContent = img.substring(0, 50) + '...';
                if (box) box.classList.add('show');
            }
        }
    }

    // =========================================================
    // CTA
    // =========================================================
    function loadCtaSettings() {
        setVal('ctaTitle', settings.cta_title);
        setVal('ctaDesc', settings.cta_desc);
        setVal('ctaBtn1Text', settings.cta_btn_1_text);
        setVal('ctaBtn1Link', settings.cta_btn_1_link);
        setVal('ctaBtn2Text', settings.cta_btn_2_text);
        setVal('ctaBtn2Link', settings.cta_btn_2_link);
    }

    // =========================================================
    // COUNTER SLIDER
    // =========================================================
    function loadCounterSettings() {
        const bg = settings.counter_bg_image;
        if (bg) {
            setVal('counterBgUrl', bg);
            const imgEl = document.getElementById('counterBgCurrentImg');
            const urlEl = document.getElementById('counterBgCurrentUrl');
            const box = document.getElementById('counterBgCurrent');
            if (imgEl) imgEl.src = bg;
            if (urlEl) urlEl.textContent = bg.substring(0, 50) + '...';
            if (box) box.classList.add('show');
        }

        for (let i = 1; i <= 4; i++) {
            setVal(`counterIcon${i}`, settings[`counter_${i}_icon`]);
            setVal(`counterLabel${i}`, settings[`counter_${i}_label`]);
            setVal(`counterValue${i}`, settings[`counter_${i}_value`]);
            updateCounterPreview(i);
        }

        setVal('counterSpeed', settings.counter_slide_speed || '4000');
    }

    function updateCounterPreview(n) {
        const iconEl = document.getElementById(`counterIcon${n}`);
        const labelEl = document.getElementById(`counterLabel${n}`);
        const valueEl = document.getElementById(`counterValue${n}`);

        const previewIcon = document.getElementById(`counterPreviewIcon${n}`);
        const previewLabel = document.getElementById(`counterPreviewLabel${n}`);
        const previewValue = document.getElementById(`counterPreviewValue${n}`);

        if (previewIcon && iconEl) previewIcon.className = iconEl.value || 'fas fa-star';
        if (previewLabel && labelEl) previewLabel.textContent = labelEl.value || 'LABEL';
        if (previewValue && valueEl) previewValue.textContent = valueEl.value || '0';
    }

    // =========================================================
    // WELCOME
    // =========================================================
    function loadWelcomeSettings() {
        setVal('welcomeTitle', settings.welcome_title);
        setVal('welcomeShortText', settings.welcome_short_text);
        setVal('welcomeFullDesc', settings.welcome_description);
        setVal('welcomeLink', settings.welcome_read_more_link);
    }

    // =========================================================
    // NOTICE TICKER
    // =========================================================
    function loadTickerSettings() {
        setVal('tickerLabel', settings.notice_ticker_label);
        setVal('tickerSpeed', settings.notice_ticker_speed || '5000');
        setVal('tickerLimit', settings.notice_ticker_limit || '10');

        const enabled = document.getElementById('tickerEnabled');
        if (enabled) enabled.checked = settings.notice_ticker_enabled !== 'false';
    }

    // =========================================================
    // HEADINGS
    // =========================================================
    function loadHeadingsSettings() {
        setVal('noticeBoardTitle', settings.notice_board_title);
        setVal('noticeBoardViewAll', settings.notice_board_view_all_text);
        setVal('recentNoticeTitle', settings.recent_notice_title);
        setVal('newsSectionTitle', settings.news_section_title);
        setVal('newsViewAll', settings.news_section_view_all_text);
    }

    // =========================================================
    // PRINCIPAL
    // =========================================================
    function loadPrincipalSettings() {
        setVal('principalName', settings.principal_name);
        setVal('principalDesignation', settings.principal_designation);
        setVal('principalShortMsg', settings.principal_short_message);
        setVal('principalFullMsg', settings.principal_full_message);
        setVal('principalPhone', settings.principal_phone);

        const img = settings.principal_image;
        if (img) {
            setVal('principalImageUrl', img);
            const imgEl = document.getElementById('currentPrincipalImg');
            const urlEl = document.getElementById('currentPrincipalUrl');
            const box = document.getElementById('currentPrincipalImage');
            if (imgEl) imgEl.src = img;
            if (urlEl) urlEl.textContent = img.substring(0, 50) + '...';
            if (box) box.classList.add('show');
        }
    }

    // =========================================================
    // COLLEGE
    // =========================================================
    function loadCollegeSettings() {
        setVal('collegeName', settings.college_name);
        setVal('collegeAddress', settings.college_address);
        setVal('collegePhone', settings.college_phone);
        setVal('collegeEmail', settings.college_email);
    }

    // =========================================================
    // SOCIAL
    // =========================================================
    function loadSocialSettings() {
        setVal('socialFacebook', settings.social_facebook);
        setVal('socialYoutube', settings.social_youtube);
        setVal('socialWebsite', settings.social_website);
        setVal('socialMap', settings.social_map);
    }

    // =========================================================
    // SAVE HELPERS
    // =========================================================
    async function saveSetting(key, value) {
        const supabase = window.FDC_SUPABASE;
        const { data } = await supabase.from('site_settings').select('id').eq('key', key).maybeSingle();

        if (data) {
            const { error } = await supabase
                .from('site_settings')
                .update({ value: value, updated_at: new Date().toISOString() })
                .eq('key', key);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('site_settings')
                .insert([{ key: key, value: value, category: 'quick_cards' }]);
            if (error) throw error;
        }
    }

    async function saveMany(obj, alertId, successMsg) {
        const alertBox = document.getElementById(alertId);
        if (alertBox) alertBox.classList.remove('show');

        try {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                await saveSetting(keys[i], obj[keys[i]]);
            }

            if (alertBox) {
                alertBox.className = 'alert-box show success';
                alertBox.textContent = '✅ ' + successMsg;
                setTimeout(function () { alertBox.classList.remove('show'); }, 4000);
            }
            showToast('✅ ' + successMsg, 'success');
            return true;

        } catch (err) {
            console.error('Save error:', err);
            if (alertBox) {
                alertBox.className = 'alert-box show error';
                alertBox.textContent = '❌ Failed: ' + err.message;
            }
            showToast('❌ ' + err.message, 'error');
            return false;
        }
    }

    // =========================================================
    // IMAGE UPLOAD HELPERS
    // =========================================================
    function attachPreviewThumb(previewBox, file) {
        const oldImg = previewBox.querySelector('.preview-thumb');
        if (oldImg) oldImg.remove();

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.className = 'preview-thumb';
            img.src = e.target.result;
            previewBox.insertBefore(img, previewBox.firstChild);
        };
        reader.readAsDataURL(file);
    }

    function validateImage(file) {
        if (file.size > 2 * 1024 * 1024) {
            showToast('ছবি 2MB-এর বেশি!', 'error');
            return false;
        }
        if (!file.type.startsWith('image/')) {
            showToast('শুধু ছবি সিলেক্ট করুন', 'error');
            return false;
        }
        return true;
    }

    // =========================================================
    // HERO UPLOADS
    // =========================================================
    function setupHeroUploads() {
        document.querySelectorAll('.hero-image-upload').forEach(function (area) {
            const slideNum = area.dataset.slide;
            const input = area.querySelector('.hero-image-input');
            const removeBtn = document.querySelector(`.hero-image-remove[data-slide="${slideNum}"]`);

            if (!input) return;

            area.addEventListener('click', function (e) {
                if (e.target.tagName === 'INPUT') return;
                e.preventDefault();
                input.click();
            });

            input.addEventListener('change', function () {
                if (this.files && this.files[0]) handleHeroImage(this.files[0], slideNum);
            });

            area.addEventListener('dragover', function (e) {
                e.preventDefault();
                this.style.borderColor = '#1a237e';
                this.style.background = '#f5f7ff';
            });
            area.addEventListener('dragleave', function (e) {
                e.preventDefault();
                this.style.borderColor = '#c8cdda';
                this.style.background = '#fafbff';
            });
            area.addEventListener('drop', function (e) {
                e.preventDefault();
                this.style.borderColor = '#c8cdda';
                this.style.background = '#fafbff';
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleHeroImage(e.dataTransfer.files[0], slideNum);
                }
            });

            if (removeBtn) {
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    heroImageFiles[slideNum] = null;
                    input.value = '';
                    const previewBox = document.getElementById(`heroPreview${slideNum}`);
                    if (previewBox) previewBox.classList.remove('show');
                    const currentBox = document.getElementById(`heroCurrent${slideNum}`);
                    if (currentBox) currentBox.classList.remove('show');
                });
            }
        });
    }

    function handleHeroImage(file, num) {
        if (!validateImage(file)) return;

        heroImageFiles[num] = file;

        const previewBox = document.getElementById(`heroPreview${num}`);
        const fileNameEl = document.getElementById(`heroFileName${num}`);
        const fileSizeEl = document.getElementById(`heroFileSize${num}`);

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';

        if (previewBox) {
            attachPreviewThumb(previewBox, file);
            previewBox.classList.add('show');
        }

        const currentBox = document.getElementById(`heroCurrent${num}`);
        if (currentBox) currentBox.classList.remove('show');

        showToast('✅ Slide ' + num + ' ছবি সিলেক্ট হয়েছে!', 'success');
    }

    // =========================================================
    // CAMPUS UPLOADS
    // =========================================================
    function setupCampusUploads() {
        document.querySelectorAll('.campus-image-input').forEach(function (input) {
            const num = input.dataset.feature;
            const drop = document.getElementById(`campusDrop${num}`);
            const removeBtn = document.querySelector(`.campus-image-remove[data-feature="${num}"]`);

            if (drop) {
                drop.addEventListener('click', function (e) {
                    if (e.target.tagName === 'INPUT') return;
                    e.preventDefault();
                    input.click();
                });
            }

            input.addEventListener('change', function () {
                if (this.files && this.files[0]) handleCampusImage(this.files[0], num);
            });

            if (removeBtn) {
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    campusImageFiles[num] = null;
                    input.value = '';
                    const previewBox = document.getElementById(`campusPreview${num}`);
                    if (previewBox) previewBox.classList.remove('show');
                });
            }
        });
    }

    function handleCampusImage(file, num) {
        if (!validateImage(file)) return;

        campusImageFiles[num] = file;

        const previewBox = document.getElementById(`campusPreview${num}`);
        const fileNameEl = document.getElementById(`campusFileName${num}`);
        const fileSizeEl = document.getElementById(`campusFileSize${num}`);

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';

        if (previewBox) {
            attachPreviewThumb(previewBox, file);
            previewBox.classList.add('show');
        }

        const currentBox = document.getElementById(`campusCurrent${num}`);
        if (currentBox) currentBox.classList.remove('show');

        showToast('✅ Feature ' + num + ' ছবি সিলেক্ট হয়েছে!', 'success');
    }

    // =========================================================
    // SINGLE UPLOADS (About, Principal, Counter BG)
    // =========================================================
    function setupSingleUpload(dropId, inputId, previewId, nameId, sizeId, removeId, type) {
        const drop = document.getElementById(dropId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        const remove = document.getElementById(removeId);

        if (!drop || !input) return;

        drop.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            e.preventDefault();
            input.click();
        });

        input.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                if (!validateImage(file)) { input.value = ''; return; }

                if (type === 'about') aboutImageFile = file;
                if (type === 'principal') principalImageFile = file;
                if (type === 'counterBg') counterBgFile = file;

                const nameEl = document.getElementById(nameId);
                const sizeEl = document.getElementById(sizeId);

                if (nameEl) nameEl.textContent = file.name;
                if (sizeEl) sizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';

                if (preview) {
                    attachPreviewThumb(preview, file);
                    preview.classList.add('show');
                }

                const currentBox = preview && preview.parentElement && preview.parentElement.querySelector('.current-image-preview');
                if (currentBox) currentBox.classList.remove('show');

                showToast('✅ ছবি সিলেক্ট হয়েছে!', 'success');
            }
        });

        if (remove) {
            remove.addEventListener('click', function (e) {
                e.stopPropagation();
                if (type === 'about') aboutImageFile = null;
                if (type === 'principal') principalImageFile = null;
                if (type === 'counterBg') counterBgFile = null;
                input.value = '';
                if (preview) preview.classList.remove('show');
            });
        }
    }

    // =========================================================
    // SETUP ALL FORMS
    // =========================================================
    function setupForms() {

        // ========== HERO ==========
        const heroForm = document.getElementById('heroForm');
        if (heroForm) {
            heroForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const btn = document.getElementById('heroSaveBtn');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

                try {
                    const data = {};
                    for (let i = 1; i <= 3; i++) {
                        let imgUrl = (document.getElementById(`heroImageUrl${i}`) || {}).value || '';
                        if (heroImageFiles[i]) {
                            showToast('ছবি আপলোড হচ্ছে... Slide ' + i, 'info');
                            const result = await window.FDCUploadImage(heroImageFiles[i]);
                            imgUrl = result.url;
                        }
                        data[`hero_slide_${i}_kicker`] = (document.getElementById(`heroKicker${i}`) || {}).value || '';
                        data[`hero_slide_${i}_title`] = (document.getElementById(`heroTitle${i}`) || {}).value || '';
                        data[`hero_slide_${i}_subtitle`] = (document.getElementById(`heroSubtitle${i}`) || {}).value || '';
                        data[`hero_slide_${i}_image`] = imgUrl;
                        data[`hero_slide_${i}_btn_text`] = (document.getElementById(`heroBtnText${i}`) || {}).value || '';
                        data[`hero_slide_${i}_btn_link`] = (document.getElementById(`heroBtnLink${i}`) || {}).value || '';
                    }
                    await saveMany(data, 'heroAlert', 'Hero slider updated!');
                    heroImageFiles = {};
                    await loadSettings();
                } catch (err) {
                    showToast('❌ ' + err.message, 'error');
                }

                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Update Hero Slider';
            });
        }

        // ========== QUICK (8 cards) ==========
        const quickForm = document.getElementById('quickForm');
        if (quickForm) {
            quickForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const btn = document.getElementById('quickSaveBtn');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                }

                try {
                    const data = {};
                    for (let i = 1; i <= 8; i++) {
                        data[`quick_card_${i}_icon`] = (document.getElementById(`quickIcon${i}`) || {}).value || '';
                        data[`quick_card_${i}_title`] = (document.getElementById(`quickTitle${i}`) || {}).value || '';
                        data[`quick_card_${i}_desc`] = (document.getElementById(`quickDesc${i}`) || {}).value || '';
                        data[`quick_card_${i}_link`] = (document.getElementById(`quickLink${i}`) || {}).value || '';
                    }
                    await saveMany(data, 'quickAlert', 'Quick cards updated!');
                } catch (err) {
                    showToast('❌ ' + err.message, 'error');
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-save"></i> Update Quick Cards';
                    }
                }
            });
        }

        // ========== ABOUT ==========
        const aboutForm = document.getElementById('aboutForm');
        if (aboutForm) {
            aboutForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                try {
                    let imgUrl = (document.getElementById('aboutImageUrl') || {}).value || '';
                    if (aboutImageFile) {
                        showToast('ছবি আপলোড হচ্ছে...', 'info');
                        const result = await window.FDCUploadImage(aboutImageFile);
                        imgUrl = result.url;
                        aboutImageFile = null;
                    }

                    const data = {
                        about_title: (document.getElementById('aboutTitle') || {}).value || '',
                        about_description: (document.getElementById('aboutDesc1') || {}).value || '',
                        about_description_2: (document.getElementById('aboutDesc2') || {}).value || '',
                        about_image: imgUrl,
                        about_badge_number: (document.getElementById('aboutBadgeNum') || {}).value || '',
                        about_badge_text: (document.getElementById('aboutBadgeText') || {}).value || '',
                        about_fact_1_label: (document.getElementById('aboutFact1Label') || {}).value || '',
                        about_fact_1_value: (document.getElementById('aboutFact1Value') || {}).value || '',
                        about_fact_2_label: (document.getElementById('aboutFact2Label') || {}).value || '',
                        about_fact_2_value: (document.getElementById('aboutFact2Value') || {}).value || '',
                        about_fact_3_label: (document.getElementById('aboutFact3Label') || {}).value || '',
                        about_fact_3_value: (document.getElementById('aboutFact3Value') || {}).value || '',
                        about_fact_4_label: (document.getElementById('aboutFact4Label') || {}).value || '',
                        about_fact_4_value: (document.getElementById('aboutFact4Value') || {}).value || ''
                    };
                    await saveMany(data, 'aboutAlert', 'About section updated!');
                    await loadSettings();
                } catch (err) { showToast('❌ ' + err.message, 'error'); }
            });
        }

        // ========== EXPLORE ==========
        const exploreForm = document.getElementById('exploreForm');
        if (exploreForm) {
            exploreForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {};
                for (let i = 1; i <= 8; i++) {
                    data[`explore_${i}_icon`] = (document.getElementById(`exploreIcon${i}`) || {}).value || '';
                    data[`explore_${i}_title`] = (document.getElementById(`exploreTitle${i}`) || {}).value || '';
                    data[`explore_${i}_desc`] = (document.getElementById(`exploreDesc${i}`) || {}).value || '';
                    data[`explore_${i}_link`] = (document.getElementById(`exploreLink${i}`) || {}).value || '';
                    data[`explore_${i}_featured`] = document.getElementById(`exploreFeatured${i}`) && document.getElementById(`exploreFeatured${i}`).checked ? 'true' : 'false';
                }
                await saveMany(data, 'exploreAlert', 'Explore cards updated!');
            });
        }

        // ========== CAMPUS ==========
        const campusForm = document.getElementById('campusForm');
        if (campusForm) {
            campusForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                try {
                    const data = {};
                    for (let i = 1; i <= 3; i++) {
                        let imgUrl = (document.getElementById(`campusImageUrl${i}`) || {}).value || '';
                        if (campusImageFiles[i]) {
                            showToast('ছবি আপলোড হচ্ছে... Feature ' + i, 'info');
                            const result = await window.FDCUploadImage(campusImageFiles[i]);
                            imgUrl = result.url;
                        }
                        data[`campus_feature_${i}_title`] = (document.getElementById(`campusTitle${i}`) || {}).value || '';
                        data[`campus_feature_${i}_desc`] = (document.getElementById(`campusDesc${i}`) || {}).value || '';
                        data[`campus_feature_${i}_image`] = imgUrl;
                        data[`campus_feature_${i}_link`] = (document.getElementById(`campusLink${i}`) || {}).value || '';
                    }
                    await saveMany(data, 'campusAlert', 'Campus features updated!');
                    campusImageFiles = {};
                    await loadSettings();
                } catch (err) { showToast('❌ ' + err.message, 'error'); }
            });
        }

        // ========== CTA ==========
        const ctaForm = document.getElementById('ctaForm');
        if (ctaForm) {
            ctaForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    cta_title: (document.getElementById('ctaTitle') || {}).value || '',
                    cta_desc: (document.getElementById('ctaDesc') || {}).value || '',
                    cta_btn_1_text: (document.getElementById('ctaBtn1Text') || {}).value || '',
                    cta_btn_1_link: (document.getElementById('ctaBtn1Link') || {}).value || '',
                    cta_btn_2_text: (document.getElementById('ctaBtn2Text') || {}).value || '',
                    cta_btn_2_link: (document.getElementById('ctaBtn2Link') || {}).value || ''
                };
                await saveMany(data, 'ctaAlert', 'CTA section updated!');
            });
        }

        // ========== COUNTER ==========
        const counterForm = document.getElementById('counterForm');
        if (counterForm) {
            counterForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                try {
                    let bgUrl = (document.getElementById('counterBgUrl') || {}).value || '';
                    if (counterBgFile) {
                        showToast('Background আপলোড হচ্ছে...', 'info');
                        const result = await window.FDCUploadImage(counterBgFile);
                        bgUrl = result.url;
                        counterBgFile = null;
                    }

                    const data = {
                        counter_bg_image: bgUrl,
                        counter_1_icon: (document.getElementById('counterIcon1') || {}).value || '',
                        counter_1_label: (document.getElementById('counterLabel1') || {}).value || '',
                        counter_1_value: (document.getElementById('counterValue1') || {}).value || '',
                        counter_2_icon: (document.getElementById('counterIcon2') || {}).value || '',
                        counter_2_label: (document.getElementById('counterLabel2') || {}).value || '',
                        counter_2_value: (document.getElementById('counterValue2') || {}).value || '',
                        counter_3_icon: (document.getElementById('counterIcon3') || {}).value || '',
                        counter_3_label: (document.getElementById('counterLabel3') || {}).value || '',
                        counter_3_value: (document.getElementById('counterValue3') || {}).value || '',
                        counter_4_icon: (document.getElementById('counterIcon4') || {}).value || '',
                        counter_4_label: (document.getElementById('counterLabel4') || {}).value || '',
                        counter_4_value: (document.getElementById('counterValue4') || {}).value || '',
                        counter_slide_speed: (document.getElementById('counterSpeed') || {}).value || '4000'
                    };
                    await saveMany(data, 'counterAlert', 'Counter slider updated!');
                    await loadSettings();
                } catch (err) { showToast('❌ ' + err.message, 'error'); }
            });
        }

        // ========== WELCOME ==========
        const welcomeForm = document.getElementById('welcomeForm');
        if (welcomeForm) {
            welcomeForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    welcome_title: (document.getElementById('welcomeTitle') || {}).value || '',
                    welcome_short_text: (document.getElementById('welcomeShortText') || {}).value || '',
                    welcome_description: (document.getElementById('welcomeFullDesc') || {}).value || '',
                    welcome_read_more_link: (document.getElementById('welcomeLink') || {}).value || ''
                };
                await saveMany(data, 'welcomeAlert', 'Welcome section updated!');
            });
        }

        // ========== TICKER ==========
        const tickerForm = document.getElementById('tickerForm');
        if (tickerForm) {
            tickerForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    notice_ticker_label: (document.getElementById('tickerLabel') || {}).value || 'জরুরি',
                    notice_ticker_speed: (document.getElementById('tickerSpeed') || {}).value || '5000',
                    notice_ticker_limit: (document.getElementById('tickerLimit') || {}).value || '10',
                    notice_ticker_enabled: (document.getElementById('tickerEnabled') || {}).checked ? 'true' : 'false'
                };
                await saveMany(data, 'tickerAlert', 'Notice ticker updated!');
            });
        }

        // ========== HEADINGS ==========
        const headingsForm = document.getElementById('headingsForm');
        if (headingsForm) {
            headingsForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    notice_board_title: (document.getElementById('noticeBoardTitle') || {}).value || '',
                    notice_board_view_all_text: (document.getElementById('noticeBoardViewAll') || {}).value || '',
                    recent_notice_title: (document.getElementById('recentNoticeTitle') || {}).value || '',
                    news_section_title: (document.getElementById('newsSectionTitle') || {}).value || '',
                    news_section_view_all_text: (document.getElementById('newsViewAll') || {}).value || ''
                };
                await saveMany(data, 'headingsAlert', 'Headings updated!');
            });
        }

        // ========== PRINCIPAL ==========
        const principalForm = document.getElementById('principalForm');
        if (principalForm) {
            principalForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                try {
                    let imgUrl = (document.getElementById('principalImageUrl') || {}).value || '';
                    if (principalImageFile) {
                        showToast('ছবি আপলোড হচ্ছে...', 'info');
                        const result = await window.FDCUploadImage(principalImageFile);
                        imgUrl = result.url;
                        principalImageFile = null;
                    }

                    const data = {
                        principal_name: (document.getElementById('principalName') || {}).value || '',
                        principal_designation: (document.getElementById('principalDesignation') || {}).value || '',
                        principal_short_message: (document.getElementById('principalShortMsg') || {}).value || '',
                        principal_full_message: (document.getElementById('principalFullMsg') || {}).value || '',
                        principal_image: imgUrl,
                        principal_phone: (document.getElementById('principalPhone') || {}).value || ''
                    };
                    await saveMany(data, 'principalAlert', 'Principal info updated!');
                    await loadSettings();
                } catch (err) { showToast('❌ ' + err.message, 'error'); }
            });
        }

        // ========== COLLEGE ==========
        const collegeForm = document.getElementById('collegeForm');
        if (collegeForm) {
            collegeForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    college_name: (document.getElementById('collegeName') || {}).value || '',
                    college_address: (document.getElementById('collegeAddress') || {}).value || '',
                    college_phone: (document.getElementById('collegePhone') || {}).value || '',
                    college_email: (document.getElementById('collegeEmail') || {}).value || ''
                };
                await saveMany(data, 'collegeAlert', 'College info updated!');
            });
        }

        // ========== SOCIAL ==========
        const socialForm = document.getElementById('socialForm');
        if (socialForm) {
            socialForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    social_facebook: (document.getElementById('socialFacebook') || {}).value || '',
                    social_youtube: (document.getElementById('socialYoutube') || {}).value || '',
                    social_website: (document.getElementById('socialWebsite') || {}).value || '',
                    social_map: (document.getElementById('socialMap') || {}).value || ''
                };
                await saveMany(data, 'socialAlert', 'Social links updated!');
            });
        }

        // ========== Live Previews ==========
        document.querySelectorAll('.quick-icon-input').forEach(function (input) {
            input.addEventListener('input', function () {
                const n = this.id.replace('quickIcon', '');
                updateQuickPreview(n);
            });
        });

        document.querySelectorAll('.quick-title-input').forEach(function (input) {
            input.addEventListener('input', function () {
                const n = this.id.replace('quickTitle', '');
                updateQuickPreview(n);
            });
        });

        document.querySelectorAll('.counter-icon-input, .counter-label-input, .counter-value-input').forEach(function (input) {
            input.addEventListener('input', function () {
                const n = this.dataset.preview;
                updateCounterPreview(n);
            });
        });
    }

    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        console.log('🚀 Admin Settings v3.1 initialized');

        setupTabs();
        setupHeroUploads();
        setupCampusUploads();

        setupSingleUpload('aboutImageDrop', 'aboutImageInput', 'aboutImagePreview', 'aboutImageName', 'aboutImageSize', 'aboutImageRemove', 'about');
        setupSingleUpload('principalImageDrop', 'principalImageInput', 'principalImagePreview', 'principalImageName', 'principalImageSize', 'principalImageRemove', 'principal');
        setupSingleUpload('counterBgDrop', 'counterBgInput', 'counterBgPreview', 'counterBgName', 'counterBgSize', 'counterBgRemove', 'counterBg');

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadSettings();
            setupForms();
            console.log('✅ Forms attached');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();