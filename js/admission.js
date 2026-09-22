/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION FORM LOGIC
 * Location: js/admission.js
 * Version: v7.1 — Subject Pools + Bengali PDF + Professional Design
 * 
 * ✅ Features:
 *    - HSC-General + HSC-BM support
 *    - Multi-select checkbox for group subjects
 *    - Fixed + Choice subjects per group
 *    - 4th Subject with dynamic exclusion filter
 *    - Bengali font embed for PDF
 *    - Professional PDF design (logo, watermark, border, sections)
 *    - Inline PDF config (no external dependency)
 *    - Division → District → Upazila cascade
 *    - Auto Session
 *    - Image Compression + Cloudinary
 *    - Draft auto-save
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // CONFIG
    // =========================================================
    const CLOUDINARY_CLOUD_NAME = 'awxusvtg';
    const CLOUDINARY_UPLOAD_PRESET = 'college_unsigned';
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const IMG_MAX_DIMENSION = 600;
    const IMG_QUALITY = 0.75;

    const DRAFT_KEY_PREFIX = 'fdc_admission_draft_';
    const DRAFT_AUTO_SAVE_MS = 3000;

    const BENGALI_FONT_URL = '../../assets/fonts/NotoSansBengali.ttf';
    const BENGALI_FONT_NAME = 'NotoSansBengali';

    const FORM_TYPE = detectFormType();

    // =========================================================
    // PDF CONFIG (Inline — no external file)
    // =========================================================
    const PDF_CFG = {
        college: {
            name_bn: 'ফুলবাড়ীয়া কলেজ',
            name_en: 'FULBARIYA COLLEGE',
            location_bn: 'ফুলবাড়ীয়া, ময়মনসিংহ',
            location_en: 'Fulbariya, Mymensingh',
            eiin: '111516',
            established: '1972',
            website: 'fulbariya-college.pages.dev',
            help_phone: '0872050568'
        },
        logo: {
            url: 'https://fulbariya-college.pages.dev/assets/images/logo1.png'
        },
        status: {
            pending:  { label: 'PENDING',  color: [245, 158, 11], bg: [254, 243, 199], text: [146, 64, 14] },
            verified: { label: 'VERIFIED', color: [59, 130, 246], bg: [219, 234, 254], text: [30, 64, 175] },
            admitted: { label: 'ADMITTED', color: [16, 185, 129], bg: [209, 250, 229], text: [6, 95, 70] },
            cancelled:{ label: 'CANCELLED',color: [239, 68, 68],  bg: [254, 226, 226], text: [153, 27, 27] }
        },
        instructions: [
            'এই Application ID সংরক্ষণ করুন — ভর্তির সময় প্রয়োজন হবে',
            'এই কপি প্রিন্ট করে সাথে আনুন',
            'মূল কাগজপত্র (SSC সার্টিফিকেট, NID, মার্কশিট) আনুন',
            'Status চেক করুন: fulbariya-college.pages.dev'
        ]
    };

    // =========================================================
    // STATE
    // =========================================================
    let photoUrl = null;
    let uploadedPhotoFile = null;
    let draftSaveTimer = null;
    let formTouched = false;

    let _bengaliFontLoaded = false;
    let _bengaliFontPromise = null;

    const $ = (id) => document.getElementById(id);

    // =========================================================
    // FORM TYPE DETECTION
    // =========================================================
    function detectFormType() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('admission-hsc')) return 'HSC-General';
        if (path.includes('admission-bm')) return 'HSC-BM';
        if (path.includes('admission-degree')) return 'Degree';
        if (path.includes('admission-honours')) return 'Honours';
        return 'HSC-General';
    }

    // =========================================================
    // ESCAPE HTML
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // =========================================================
    // ERROR HELPERS
    // =========================================================
    function showError(fieldId) {
        const errEl = $('err_' + fieldId);
        const fieldEl = $(fieldId);
        if (errEl) errEl.classList.add('show');
        if (fieldEl) fieldEl.classList.add('error');
    }

    function hideError(fieldId) {
        const errEl = $('err_' + fieldId);
        const fieldEl = $(fieldId);
        if (errEl) errEl.classList.remove('show');
        if (fieldEl) fieldEl.classList.remove('error');
    }

    function hideAllErrors() {
        document.querySelectorAll('.error-msg.show').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    }

    // =========================================================
    // BENGALI FONT LOADER
    // =========================================================
    async function loadBengaliFont(doc) {
        if (_bengaliFontLoaded) return true;

        if (!_bengaliFontPromise) {
            _bengaliFontPromise = fetch(BENGALI_FONT_URL)
                .then(res => {
                    if (!res.ok) throw new Error('Font fetch failed: ' + res.status);
                    return res.arrayBuffer();
                })
                .then(buf => {
                    let binary = '';
                    const bytes = new Uint8Array(buf);
                    const chunkSize = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunkSize) {
                        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
                    }
                    return btoa(binary);
                })
                .catch(err => {
                    console.warn('⚠️ Bengali font load failed:', err);
                    return null;
                });
        }

        const base64 = await _bengaliFontPromise;
        if (!base64) {
            console.warn('⚠️ Bengali text will not render properly (font missing)');
            return false;
        }

        try {
            doc.addFileToVFS('NotoSansBengali.ttf', base64);
            doc.addFont('NotoSansBengali.ttf', BENGALI_FONT_NAME, 'normal');
            doc.addFont('NotoSansBengali.ttf', BENGALI_FONT_NAME, 'bold');
            _bengaliFontLoaded = true;
            console.log('✅ Bengali font loaded:', BENGALI_FONT_NAME);
            return true;
        } catch (e) {
            console.error('❌ Font registration failed:', e);
            return false;
        }
    }

    function hasBengali(text) {
        return /[\u0980-\u09FF]/.test(String(text || ''));
    }

    function setEnglishFont(doc, style) {
        doc.setFont('helvetica', style || 'normal');
    }

    function setBengaliFont(doc) {
        if (_bengaliFontLoaded) {
            doc.setFont(BENGALI_FONT_NAME, 'normal');
            return true;
        }
        return false;
    }

    // =========================================================
    // LOCATION DROPDOWNS
    // =========================================================
    function setupLocationDropdowns() {
        const divSel = $('division');
        const distSel = $('district');
        const upzSel = $('upazila');

        if (!divSel || !distSel || !upzSel) return;

        const LOCATIONS = window.FDC_BD_LOCATIONS || {};
        const divisions = Object.keys(LOCATIONS).sort();

        divSel.innerHTML = '<option value="">Select Division</option>' +
            divisions.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

        divSel.addEventListener('change', function () {
            const division = this.value;
            distSel.innerHTML = '<option value="">Select District</option>';
            upzSel.innerHTML = '<option value="">Select Upazila</option>';

            if (!division || !LOCATIONS[division]) return;

            const districts = Object.keys(LOCATIONS[division]).sort();
            distSel.innerHTML = '<option value="">Select District</option>' +
                districts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

            hideError('division');
            hideError('district');
        });

        distSel.addEventListener('change', function () {
            const division = divSel.value;
            const district = this.value;

            upzSel.innerHTML = '<option value="">Select Upazila</option>';

            if (!division || !district || !LOCATIONS[division] || !LOCATIONS[division][district]) return;

            const upazilas = LOCATIONS[division][district].sort();
            upzSel.innerHTML = '<option value="">Select Upazila</option>' +
                upazilas.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');

            hideError('district');
        });

        upzSel.addEventListener('change', function () {
            if (this.value) hideError('upazila');
        });
    }

    // =========================================================
    // SESSION AUTO-DERIVE
    // =========================================================
    function getSessionFromDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            let admissionYear = (month >= 1 && month <= 6) ? year : (year + 1);
            return `${admissionYear}-${admissionYear + 1}`;
        } catch (e) {
            return '';
        }
    }

    function populateSessions() {
        const sel = $('admission_session');
        if (!sel) return;
        const now = new Date();
        const currentYear = now.getFullYear();
        const sessions = [];
        for (let i = 0; i < 4; i++) {
            const year = currentYear - i;
            sessions.push(`${year}-${year + 1}`);
        }
        sel.innerHTML = '<option value="">Select Session</option>' +
            sessions.map(s => `<option value="${s}">${s}</option>`).join('');
        const currentSession = `${currentYear}-${currentYear + 1}`;
        if (sessions.includes(currentSession)) sel.value = currentSession;
    }

    function setupSessionAutoUpdate() {
        const dateInput = $('admission_date');
        const sessionSel = $('admission_session');
        const hint = $('sessionAutoHint');
        if (!dateInput || !sessionSel) return;

        dateInput.addEventListener('change', function () {
            const dateVal = this.value;
            if (!dateVal) return;
            const autoSession = getSessionFromDate(dateVal);
            if (!autoSession) return;
            const hasOption = Array.from(sessionSel.options).some(o => o.value === autoSession);
            if (!hasOption) {
                const opt = document.createElement('option');
                opt.value = autoSession;
                opt.textContent = autoSession;
                sessionSel.appendChild(opt);
            }
            sessionSel.value = autoSession;
            if (hint) {
                hint.innerHTML = `<i class="fas fa-magic"></i> Auto-selected: <strong>${autoSession}</strong>`;
                hint.style.display = 'block';
                hint.style.opacity = '1';
                setTimeout(() => { if (hint) hint.style.opacity = '0.7'; }, 3000);
            }
        });

        sessionSel.addEventListener('change', function () {
            if (hint && this.value) {
                hint.innerHTML = `<i class="fas fa-check-circle"></i> Selected: <strong>${this.value}</strong>`;
            }
        });
    }

    // =========================================================
    // IMAGE COMPRESSION
    // =========================================================
    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    let width = img.width;
                    let height = img.height;
                    if (width > IMG_MAX_DIMENSION || height > IMG_MAX_DIMENSION) {
                        if (width > height) {
                            height = Math.round((height * IMG_MAX_DIMENSION) / width);
                            width = IMG_MAX_DIMENSION;
                        } else {
                            width = Math.round((width * IMG_MAX_DIMENSION) / height);
                            height = IMG_MAX_DIMENSION;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        function (blob) {
                            if (!blob) { reject(new Error('Image compression failed')); return; }
                            const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                            resolve(newFile);
                        },
                        'image/jpeg',
                        IMG_QUALITY
                    );
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    }

    // =========================================================
    // CLOUDINARY UPLOAD
    // =========================================================
    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'admission_photos');
        const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'Cloudinary upload failed');
        }
        const data = await response.json();
        return data.secure_url;
    }

    // =========================================================
    // PHOTO INPUT
    // =========================================================
    function setupPhotoInput() {
        const input = $('photo_input');
        if (!input) return;

        input.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                window.fdcError('শুধু image file দিন (JPG/PNG/WebP)');
                input.value = '';
                return;
            }
            if (file.size > 20 * 1024 * 1024) {
                window.fdcError('ছবি ২০ MB-এর চেয়ে বড় হতে পারবে না');
                input.value = '';
                return;
            }
            $('photoFileName').textContent = `${file.name} (${Math.round(file.size/1024)} KB)`;
            hideError('photo');
            $('photoPreview').innerHTML = `<div style="padding:20px;color:var(--grey);font-size:13px;"><i class="fas fa-spinner fa-spin"></i> Compressing...</div>`;
            try {
                const compressed = await compressImage(file);
                uploadedPhotoFile = compressed;
                const url = URL.createObjectURL(compressed);
                $('photoFileName').textContent = `${compressed.name} (${Math.round(compressed.size/1024)} KB)`;
                $('photoPreview').innerHTML = `<img src="${url}" alt="Preview">`;
                triggerDraftSave();
            } catch (err) {
                window.fdcError('ছবি compress করা যায়নি: ' + err.message);
                $('photoPreview').innerHTML = '';
                input.value = '';
                uploadedPhotoFile = null;
            }
        });
    }

    // =========================================================
    // GROUP SUBJECTS — Multi-select Checkbox
    // =========================================================
    function setupGroupChange() {
        const groupSel = $('group_name') || $('department');
        if (!groupSel) return;

        groupSel.addEventListener('change', function () {
            renderGroupSubjects(this.value);
        });
    }

    function renderGroupSubjects(groupName) {
        const POOLS = window.FDC_SUBJECT_POOLS;
        if (!POOLS) {
            console.warn('Subject pools not loaded');
            return;
        }

        const wrap = $('mainSubjectsWrap');
        const fourthWrap = $('fourthSubjectWrap');
        const fixedList = $('fixedSubjectsList');
        const choiceList = $('choiceSubjectsList');

        if (fixedList) fixedList.innerHTML = '';
        if (choiceList) choiceList.innerHTML = '';

        if (!groupName) {
            if (wrap) wrap.style.display = 'none';
            if (fourthWrap) fourthWrap.style.display = 'none';
            return;
        }

        const groupData = POOLS.getGroupData(groupName);
        if (!groupData) {
            if (wrap) wrap.style.display = 'none';
            if (fourthWrap) fourthWrap.style.display = 'none';
            return;
        }

        if (fixedList && groupData.fixed.length > 0) {
            fixedList.innerHTML = groupData.fixed.map(s =>
                `<div class="fixed-subject-tag">
                    <i class="fas fa-lock"></i> ${escapeHtml(s.name)}
                </div>`
            ).join('');
        }

        if (choiceList && groupData.choice.length > 0) {
            choiceList.innerHTML = groupData.choice.map(s => `
                <label class="subject-checkbox" data-code="${escapeHtml(s.code)}">
                    <input type="checkbox" 
                           name="main_subject" 
                           value="${escapeHtml(s.code)}"
                           data-name="${escapeHtml(s.name)}">
                    <div class="subject-info">
                        <span class="subject-name">${escapeHtml(s.name)}</span>
                        <span class="subject-code">Code: ${escapeHtml(s.code)}</span>
                    </div>
                </label>
            `).join('');

            choiceList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', handleMainSubjectChange);
            });
        }

        if (wrap) wrap.style.display = 'block';
        if (fourthWrap) fourthWrap.style.display = 'block';

        updateMainSubjectCounter();
        updateFourthSubjectPool();
    }

    function handleMainSubjectChange(e) {
        const POOLS = window.FDC_SUBJECT_POOLS;
        if (!POOLS) return;

        const groupName = ($('group_name')?.value || $('department')?.value || '');
        const groupData = POOLS.getGroupData(groupName);
        if (!groupData) return;

        const checkboxes = document.querySelectorAll('input[name="main_subject"]');
        const checked = Array.from(checkboxes).filter(cb => cb.checked);

        if (checked.length > groupData.choiceCount) {
            e.target.checked = false;
            window.fdcWarning(`শুধু ${groupData.choiceCount}টি choice subject select করতে পারবেন`);
            return;
        }

        checkboxes.forEach(cb => {
            const label = cb.closest('.subject-checkbox');
            if (cb.checked) {
                label?.classList.add('checked');
            } else {
                label?.classList.remove('checked');
            }
        });

        updateMainSubjectCounter();
        updateFourthSubjectPool();
    }

    function updateMainSubjectCounter() {
        const POOLS = window.FDC_SUBJECT_POOLS;
        if (!POOLS) return;

        const groupName = ($('group_name')?.value || $('department')?.value || '');
        const groupData = POOLS.getGroupData(groupName);
        if (!groupData) return;

        const checkboxes = document.querySelectorAll('input[name="main_subject"]');
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        const totalSelected = (groupData.fixedCount || 0) + checked.length;

        const counter = $('mainSubjectCounter');
        if (counter) {
            counter.textContent = `${totalSelected} / ${groupData.mainCount} selected`;
            if (totalSelected === groupData.mainCount) {
                counter.classList.add('complete');
            } else {
                counter.classList.remove('complete');
            }
        }

        if (totalSelected === groupData.mainCount) {
            hideError('main_subjects');
        }
    }

    function updateFourthSubjectPool() {
        const POOLS = window.FDC_SUBJECT_POOLS;
        if (!POOLS) return;

        const groupName = ($('group_name')?.value || $('department')?.value || '');
        if (!groupName) return;

        const checkboxes = document.querySelectorAll('input[name="main_subject"]:checked');
        const selectedCodes = Array.from(checkboxes).map(cb => cb.value);

        const groupData = POOLS.getGroupData(groupName);
        if (groupData && groupData.fixed) {
            groupData.fixed.forEach(f => {
                if (!selectedCodes.includes(f.code)) {
                    selectedCodes.push(f.code);
                }
            });
        }

        const filtered = POOLS.getFilteredFourthPool(groupName, selectedCodes);

        const sel = $('optional_subject');
        if (!sel) return;

        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Select 4th Subject</option>' +
            filtered.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');

        if (currentVal && filtered.some(s => s.name === currentVal)) {
            sel.value = currentVal;
        }
    }

    // =========================================================
    // VALIDATION
    // =========================================================
    function validateForm() {
        hideAllErrors();
        const errors = [];

        const required = [
            { id: 'name_en', label: 'Name (English)' },
            { id: 'name_bn', label: 'Name (Bangla)' },
            { id: 'gender', label: 'Gender' },
            { id: 'phone', label: 'Phone' },
            { id: 'birth_date', label: 'Birth Date' },
            { id: 'religion', label: 'Religion' },
            { id: 'blood_group', label: 'Blood Group' },
            { id: 'village', label: 'Village' },
            { id: 'union_name', label: 'Union' },
            { id: 'post_office', label: 'Post Office' },
            { id: 'division', label: 'Division' },
            { id: 'district', label: 'District' },
            { id: 'upazila', label: 'Upazila' },
            { id: 'father_name_en', label: "Father's Name (EN)" },
            { id: 'father_name_bn', label: "Father's Name (BN)" },
            { id: 'mother_name_en', label: "Mother's Name (EN)" },
            { id: 'mother_name_bn', label: "Mother's Name (BN)" },
            { id: 'father_phone', label: "Father's Phone" },
            { id: 'mother_phone', label: "Mother's Phone" },
            { id: 'admission_date', label: 'Admission Date' },
            { id: 'admission_session', label: 'Admission Session' },
            { id: 'prev_exam_name', label: 'Previous Exam Name' },
            { id: 'prev_school_name', label: 'Previous School Name' },
            { id: 'prev_result', label: 'Previous Result' },
            { id: 'prev_board', label: 'Board' },
            { id: 'prev_roll_no', label: 'Roll No' }
        ];

        const groupFieldId = $('group_name') ? 'group_name' : ($('department') ? 'department' : null);
        if (groupFieldId) required.push({ id: groupFieldId, label: 'Group/Trade/Department' });

        required.forEach(item => {
            const el = $(item.id);
            if (!el) return;
            const val = (el.value || '').trim();
            if (!val) {
                showError(item.id);
                errors.push(item.label);
            }
        });

        if (!uploadedPhotoFile && !photoUrl) {
            showError('photo');
            errors.push('Photo');
        }

        const phone = ($('phone')?.value || '').trim();
        if (phone && !/^01[3-9]\d{8}$/.test(phone)) {
            showError('phone');
            errors.push('Phone (সঠিক নয়)');
        }

        const fPhone = ($('father_phone')?.value || '').trim();
        if (fPhone && !/^01[3-9]\d{8}$/.test(fPhone)) {
            showError('father_phone');
            errors.push("Father's Phone (সঠিক নয়)");
        }

        const mPhone = ($('mother_phone')?.value || '').trim();
        if (mPhone && !/^01[3-9]\d{8}$/.test(mPhone)) {
            showError('mother_phone');
            errors.push("Mother's Phone (সঠিক নয়)");
        }

        const postCode = ($('post_code')?.value || '').trim();
        if (postCode && !/^\d{4}$/.test(postCode)) {
            showError('post_code');
            errors.push('Post Code (৪ ডিজিট)');
        }

        const email = ($('email')?.value || '').trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('email');
            errors.push('Email (সঠিক নয়)');
        }

        const passingYear = ($('prev_passing_year')?.value || '').trim();
        if (passingYear && !/^\d{4}$/.test(passingYear)) {
            showError('prev_passing_year');
            errors.push('Passing Year (৪ ডিজিট)');
        }

        if (FORM_TYPE !== 'HSC-BM') {
            const POOLS = window.FDC_SUBJECT_POOLS;
            const groupName = ($('group_name')?.value || '').trim();
            
            if (POOLS && groupName) {
                const groupData = POOLS.getGroupData(groupName);
                if (groupData) {
                    const checkboxes = document.querySelectorAll('input[name="main_subject"]:checked');
                    const totalSelected = (groupData.fixedCount || 0) + checkboxes.length;
                    
                    if (totalSelected !== groupData.mainCount) {
                        showError('main_subjects');
                        errors.push(`Main Subject (${totalSelected}/${groupData.mainCount})`);
                    }
                    
                    if (!$('optional_subject')?.value) {
                        showError('optional_subject');
                        errors.push('4th Subject');
                    }
                }
            }
        }

        if (errors.length > 0) {
            window.fdcWarning(
                `অনুগ্রহ করে ${errors.length}টি field পূরণ করুন:<br>• ${errors.slice(0, 5).map(e => escapeHtml(e)).join('<br>• ')}${errors.length > 5 ? '<br>• ...' : ''}`
            );
            const firstErr = document.querySelector('.error-msg.show');
            if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        return true;
    }

    // =========================================================
    // COLLECT FORM DATA
    // =========================================================
    function collectFormData() {
        const session = ($('admission_session')?.value || '').trim();
        const groupName = ($('group_name')?.value || $('department')?.value || '').trim();
        const optionalSub = ($('optional_subject')?.value || '').trim();
        const POOLS = window.FDC_SUBJECT_POOLS;

        let compulsory = [];

        if (FORM_TYPE === 'HSC-BM') {
            compulsory = POOLS?.BM?.compulsory?.map(s => s.name) || [
                'বাংলা', 'English', 'ICT', 'Mathematics',
                'Accounting', 'Business Organization & Management',
                'Finance, Banking & Insurance', 'Production Management & Marketing'
            ];
            if (groupName) compulsory.push(groupName);
        } else {
            compulsory = ['Bangla', 'English', 'ICT'];

            if (POOLS && groupName) {
                const groupData = POOLS.getGroupData(groupName);
                if (groupData) {
                    groupData.fixed.forEach(f => compulsory.push(f.name));

                    const checkboxes = document.querySelectorAll('input[name="main_subject"]:checked');
                    checkboxes.forEach(cb => {
                        const name = cb.getAttribute('data-name');
                        if (name) compulsory.push(name);
                    });

                    if (optionalSub) {
                        compulsory.push('৪র্থ বিষয়: ' + optionalSub);
                    }
                }
            }
        }

        let branch = 'HSC';
        if (FORM_TYPE === 'HSC-BM') branch = 'BM';
        else if (FORM_TYPE === 'Degree') branch = 'Degree';
        else if (FORM_TYPE === 'Honours') branch = 'Honours';

        return {
            application_type: FORM_TYPE,
            name_en: ($('name_en')?.value || '').trim(),
            name_bn: ($('name_bn')?.value || '').trim(),
            gender: ($('gender')?.value || '').trim(),
            phone: ($('phone')?.value || '').trim(),
            email: ($('email')?.value || '').trim() || null,
            birth_date: ($('birth_date')?.value || '') || null,
            religion: ($('religion')?.value || '').trim(),
            blood_group: ($('blood_group')?.value || '').trim(),
            uid_number: ($('uid_number')?.value || '').trim() || null,
            nid_number: ($('nid_number')?.value || '').trim() || null,
            village: ($('village')?.value || '').trim(),
            union_name: ($('union_name')?.value || '').trim(),
            post_office: ($('post_office')?.value || '').trim(),
            post_code: ($('post_code')?.value || '').trim() || null,
            division: ($('division')?.value || '').trim(),
            district: ($('district')?.value || '').trim(),
            upazila: ($('upazila')?.value || '').trim(),
            father_name_en: ($('father_name_en')?.value || '').trim() || null,
            father_name_bn: ($('father_name_bn')?.value || '').trim() || null,
            mother_name_en: ($('mother_name_en')?.value || '').trim() || null,
            mother_name_bn: ($('mother_name_bn')?.value || '').trim() || null,
            father_phone: ($('father_phone')?.value || '').trim() || null,
            mother_phone: ($('mother_phone')?.value || '').trim() || null,
            father_occupation: ($('father_occupation')?.value || '').trim() || null,
            mother_occupation: ($('mother_occupation')?.value || '').trim() || null,
            father_nid: ($('father_nid')?.value || '').trim() || null,
            mother_nid: ($('mother_nid')?.value || '').trim() || null,
            guardian_name: ($('guardian_name')?.value || '').trim() || null,
            guardian_relation: ($('guardian_relation')?.value || '').trim() || null,
            guardian_phone: ($('guardian_phone')?.value || '').trim() || null,
            admission_date: ($('admission_date')?.value || '') || null,
            admission_session: session,
            admission_form_no: null,
            class_name: ($('class_name')?.value || 'HSC').trim(),
            branch: branch,
            group_name: groupName || null,
            department: FORM_TYPE === 'Honours' ? (groupName || null) : null,
            compulsory_subjects: compulsory,
            optional_subject: optionalSub || null,
            admin_notes: null,
            prev_exam_name: ($('prev_exam_name')?.value || '').trim(),
            prev_school_name: ($('prev_school_name')?.value || '').trim(),
            prev_result: ($('prev_result')?.value || '').trim(),
            prev_passing_year: ($('prev_passing_year')?.value || '').trim() || null,
            prev_board: ($('prev_board')?.value || '').trim(),
            prev_roll_no: ($('prev_roll_no')?.value || '').trim()
        };
    }

    // =========================================================
    // APPLICATION ID
    // =========================================================
    async function generateAppId() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .rpc('generate_application_id', { app_type: FORM_TYPE });
            if (error) throw error;
            return data || generateFallbackId();
        } catch (e) {
            return generateFallbackId();
        }
    }

    function generateFallbackId() {
        const year = new Date().getFullYear();
        const rand = Math.floor(Math.random() * 9999) + 1;
        const prefix = FORM_TYPE === 'HSC-General' ? 'HSC'
                     : FORM_TYPE === 'HSC-BM' ? 'BM'
                     : FORM_TYPE === 'Degree' ? 'DEG' : 'HON';
        return `FDC-${year}-${prefix}-${String(rand).padStart(4, '0')}`;
    }

    // =========================================================
    // SUBMIT → PREVIEW
    // =========================================================
    function submitForm(e) {
        e.preventDefault();
        if (!validateForm()) return;
        showPreview();
    }

    // =========================================================
    // SHOW PREVIEW
    // =========================================================
    function showPreview() {
        const data = collectFormData();
        const photoSrc = uploadedPhotoFile ? URL.createObjectURL(uploadedPhotoFile) : null;

        let subjectTagHtml = data.compulsory_subjects.map(s =>
            `<span class="preview-subject-tag">${escapeHtml(s)}</span>`
        ).join('');

        let groupLabel = 'Group';
        let groupValue = data.group_name;
        if (FORM_TYPE === 'HSC-BM') { groupLabel = 'Trade'; groupValue = data.group_name || '—'; }

        const html = `
            <div class="preview-section">
                <div class="preview-section-title"><i class="fas fa-user"></i> Student Information</div>
                <div class="preview-section-content">
                    <div class="preview-field"><div class="pf-label">Name (English)</div><div class="pf-value">${escapeHtml(data.name_en)}</div></div>
                    <div class="preview-field"><div class="pf-label">Name (Bangla)</div><div class="pf-value">${escapeHtml(data.name_bn)}</div></div>
                    <div class="preview-field"><div class="pf-label">Gender</div><div class="pf-value">${escapeHtml(data.gender)}</div></div>
                    <div class="preview-field"><div class="pf-label">Phone</div><div class="pf-value">${escapeHtml(data.phone)}</div></div>
                    <div class="preview-field"><div class="pf-label">Email</div><div class="pf-value">${escapeHtml(data.email || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Birth Date</div><div class="pf-value">${escapeHtml(data.birth_date || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Religion</div><div class="pf-value">${escapeHtml(data.religion)}</div></div>
                    <div class="preview-field"><div class="pf-label">Blood Group</div><div class="pf-value">${escapeHtml(data.blood_group)}</div></div>
                    <div class="preview-field"><div class="pf-label">UID</div><div class="pf-value">${escapeHtml(data.uid_number || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">NID</div><div class="pf-value">${escapeHtml(data.nid_number || '—')}</div></div>
                    ${photoSrc ? `<div class="preview-photo"><div class="pf-label" style="margin-bottom:8px;">Photo</div><img src="${photoSrc}" alt="Photo"></div>` : ''}
                </div>
            </div>

            <div class="preview-section">
                <div class="preview-section-title"><i class="fas fa-home"></i> Address</div>
                <div class="preview-section-content">
                    <div class="preview-field"><div class="pf-label">Village</div><div class="pf-value">${escapeHtml(data.village)}</div></div>
                    <div class="preview-field"><div class="pf-label">Union</div><div class="pf-value">${escapeHtml(data.union_name)}</div></div>
                    <div class="preview-field"><div class="pf-label">Post Office</div><div class="pf-value">${escapeHtml(data.post_office)}</div></div>
                    <div class="preview-field"><div class="pf-label">Post Code</div><div class="pf-value">${escapeHtml(data.post_code || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Division</div><div class="pf-value">${escapeHtml(data.division)}</div></div>
                    <div class="preview-field"><div class="pf-label">District</div><div class="pf-value">${escapeHtml(data.district)}</div></div>
                    <div class="preview-field"><div class="pf-label">Upazila</div><div class="pf-value">${escapeHtml(data.upazila)}</div></div>
                </div>
            </div>

            <div class="preview-section">
                <div class="preview-section-title"><i class="fas fa-users"></i> Parent Information</div>
                <div class="preview-section-content">
                    <div class="preview-field"><div class="pf-label">Father's Name (EN)</div><div class="pf-value">${escapeHtml(data.father_name_en || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Father's Name (BN)</div><div class="pf-value">${escapeHtml(data.father_name_bn || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Mother's Name (EN)</div><div class="pf-value">${escapeHtml(data.mother_name_en || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Mother's Name (BN)</div><div class="pf-value">${escapeHtml(data.mother_name_bn || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Father's Phone</div><div class="pf-value">${escapeHtml(data.father_phone || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Mother's Phone</div><div class="pf-value">${escapeHtml(data.mother_phone || '—')}</div></div>
                    ${data.guardian_name ? `<div class="preview-field"><div class="pf-label">Guardian</div><div class="pf-value">${escapeHtml(data.guardian_name)}</div></div>` : ''}
                    ${data.guardian_phone ? `<div class="preview-field"><div class="pf-label">Guardian Phone</div><div class="pf-value">${escapeHtml(data.guardian_phone)}</div></div>` : ''}
                </div>
            </div>

            <div class="preview-section">
                <div class="preview-section-title"><i class="fas fa-graduation-cap"></i> Admission Information</div>
                <div class="preview-section-content">
                    <div class="preview-field"><div class="pf-label">Admission Date</div><div class="pf-value">${escapeHtml(data.admission_date || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Session</div><div class="pf-value">${escapeHtml(data.admission_session)}</div></div>
                    <div class="preview-field"><div class="pf-label">Class</div><div class="pf-value">${escapeHtml(data.class_name)}</div></div>
                    <div class="preview-field"><div class="pf-label">Branch</div><div class="pf-value">${escapeHtml(data.branch)}</div></div>
                    <div class="preview-field"><div class="pf-label">${groupLabel}</div><div class="pf-value">${escapeHtml(groupValue || '—')}</div></div>
                    <div class="preview-subjects">
                        <div class="pf-label" style="width:100%;margin-bottom:5px;">Subjects</div>
                        ${subjectTagHtml}
                    </div>
                </div>
            </div>

            <div class="preview-section">
                <div class="preview-section-title"><i class="fas fa-book"></i> Previous Exam Result</div>
                <div class="preview-section-content">
                    <div class="preview-field"><div class="pf-label">Exam Name</div><div class="pf-value">${escapeHtml(data.prev_exam_name)}</div></div>
                    <div class="preview-field"><div class="pf-label">School Name</div><div class="pf-value">${escapeHtml(data.prev_school_name)}</div></div>
                    <div class="preview-field"><div class="pf-label">Result</div><div class="pf-value">${escapeHtml(data.prev_result)}</div></div>
                    <div class="preview-field"><div class="pf-label">Passing Year</div><div class="pf-value">${escapeHtml(data.prev_passing_year || '—')}</div></div>
                    <div class="preview-field"><div class="pf-label">Board</div><div class="pf-value">${escapeHtml(data.prev_board)}</div></div>
                    <div class="preview-field"><div class="pf-label">Roll No</div><div class="pf-value">${escapeHtml(data.prev_roll_no)}</div></div>
                </div>
            </div>
        `;

        $('previewBody').innerHTML = html;
        $('previewModal').classList.add('show');
        document.body.style.overflow = 'hidden';
        $('previewBody').scrollTop = 0;
    }

    function backToEdit() {
        $('previewModal').classList.remove('show');
        document.body.style.overflow = '';
        document.querySelector('.submit-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // =========================================================
    // CONFIRM & SUBMIT
    // =========================================================
    async function confirmAndSubmit() {
        $('previewModal').classList.remove('show');

        const submitBtn = $('submitBtn');
        const overlay = $('loadingOverlay');
        const loadingTitle = $('loadingTitle');
        const loadingSub = $('loadingSub');

        if (submitBtn) submitBtn.disabled = true;

        try {
            overlay.classList.add('show');

            loadingTitle.textContent = 'ছবি আপলোড হচ্ছে...';
            loadingSub.textContent = 'Cloudinary-তে upload হচ্ছে';
            photoUrl = await uploadToCloudinary(uploadedPhotoFile);

            loadingTitle.textContent = 'Application ID তৈরি হচ্ছে...';
            loadingSub.textContent = 'অনুগ্রহ করে অপেক্ষা করুন';
            const applicationId = await generateAppId();

            loadingTitle.textContent = 'Database-এ সেভ হচ্ছে...';
            loadingSub.textContent = 'শেষ ধাপ';

            const formData = collectFormData();
            formData.application_id = applicationId;
            formData.photo_url = photoUrl;
            formData.admission_form_no = applicationId;

            const { data, error } = await window.FDC_SUPABASE
                .from('admission_applications')
                .insert([formData])
                .select()
                .single();

            if (error) throw error;

            clearDraft();
            overlay.classList.remove('show');
            document.body.style.overflow = '';

            $('finalAppId').textContent = applicationId;
            $('successModal').classList.add('show');

            window._lastSubmission = { formData, applicationId };

        } catch (err) {
            console.error('Submit error:', err);
            overlay.classList.remove('show');
            document.body.style.overflow = '';
            window.fdcError('জমা দেওয়া যায়নি: ' + err.message);
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    // =========================================================
    // SUCCESS ACTIONS
    // =========================================================
    function setupSuccessActions() {
        $('copyAppIdBtn')?.addEventListener('click', function () {
            const id = $('finalAppId').textContent;
            navigator.clipboard.writeText(id).then(() => {
                const orig = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { this.innerHTML = orig; }, 2000);
            }).catch(() => {
                window.fdcWarning('Copy করা যায়নি');
            });
        });
        $('downloadPdfBtn')?.addEventListener('click', downloadPdf);
    }

    // =========================================================
    // PDF GENERATION v7.1 — Professional Design
    // =========================================================
    async function downloadPdf() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            const submission = window._lastSubmission;
            if (!submission) {
                window.fdcError('তথ্য পাওয়া যায়নি');
                return;
            }

            const { formData, applicationId } = submission;

            await loadBengaliFont(doc);

            // =====================================================
            // PAGE SETUP
            // =====================================================
            const pageW = 210;
            const pageH = 297;
            const margin = 12;
            const contentW = pageW - (margin * 2);

            // =====================================================
            // WATERMARK
            // =====================================================
            doc.setTextColor(240, 242, 247);
            doc.setFontSize(48);
            doc.setFont('helvetica', 'bold');
            doc.text('FULBARIYA', 105, 130, { align: 'center', angle: 45 });
            doc.text('COLLEGE', 105, 175, { align: 'center', angle: 45 });
            doc.setFontSize(14);
            doc.text('ADMISSION 2026', 105, 210, { align: 'center', angle: 45 });

            // =====================================================
            // OUTER BORDER
            // =====================================================
            doc.setDrawColor(10, 22, 85);
            doc.setLineWidth(0.8);
            doc.rect(6, 6, pageW - 12, pageH - 12);
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.3);
            doc.rect(8, 8, pageW - 16, pageH - 16);

            // =====================================================
            // HEADER BANNER
            // =====================================================
            const headerY = 10;
            const headerH = 34;

            doc.setFillColor(10, 22, 85);
            doc.rect(margin, headerY, contentW, headerH, 'F');

            doc.setFillColor(212, 175, 55);
            doc.rect(margin, headerY + headerH, contentW, 1.2, 'F');

            // Logo
            try {
                const logoImg = new Image();
                logoImg.crossOrigin = 'Anonymous';
                const logoPromise = new Promise((resolve) => {
                    logoImg.onload = () => resolve(true);
                    logoImg.onerror = () => resolve(false);
                    logoImg.src = PDF_CFG.logo.url;
                    setTimeout(() => resolve(false), 2000);
                });
                const logoOk = await logoPromise;
                if (logoOk) {
                    const canvas = document.createElement('canvas');
                    canvas.width = logoImg.width;
                    canvas.height = logoImg.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(logoImg, 0, 0);
                    const logoData = canvas.toDataURL('image/png');
                    doc.addImage(logoData, 'PNG', margin + 4, headerY + 5, 22, 22);
                }
            } catch (e) {
                console.warn('Logo load failed:', e);
            }

            // Header text
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(17);
            doc.text(PDF_CFG.college.name_en, 105, headerY + 11, { align: 'center' });

            if (_bengaliFontLoaded) {
                doc.setFont(BENGALI_FONT_NAME, 'normal');
                doc.setFontSize(12);
                doc.text(PDF_CFG.college.name_bn, 105, headerY + 17, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            }

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(242, 210, 123);
            doc.text(
                PDF_CFG.college.location_en + ' · EIIN: ' + PDF_CFG.college.eiin + ' · Est. ' + PDF_CFG.college.established,
                105, headerY + 23, { align: 'center' }
            );

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('ONLINE ADMISSION APPLICATION', 105, headerY + 30, { align: 'center' });

            // =====================================================
            // APP ID + PHOTO ROW
            // =====================================================
            const rowY = headerY + headerH + 4;
            const rowH = 28;

            doc.setFillColor(239, 246, 255);
            doc.rect(margin, rowY, 138, rowH, 'F');
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.4);
            doc.rect(margin, rowY, 138, rowH);

            doc.setTextColor(30, 64, 175);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('APPLICATION ID', margin + 4, rowY + 5);

            doc.setTextColor(220, 38, 38);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(applicationId, margin + 4, rowY + 13);

            doc.setTextColor(107, 114, 128);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.text('Submitted: ' + new Date().toLocaleString('en-GB'), margin + 4, rowY + 18);

            // Status badge
            const st = PDF_CFG.status.pending;
            doc.setFillColor(st.bg[0], st.bg[1], st.bg[2]);
            doc.rect(margin + 4, rowY + 20, 40, 6, 'F');
            doc.setDrawColor(st.color[0], st.color[1], st.color[2]);
            doc.setLineWidth(0.3);
            doc.rect(margin + 4, rowY + 20, 40, 6);
            doc.setTextColor(st.text[0], st.text[1], st.text[2]);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('STATUS: ' + st.label, margin + 24, rowY + 24, { align: 'center' });

            // Photo
            if (formData.photo_url) {
                try {
                    const img = await fetch(formData.photo_url);
                    const blob = await img.blob();
                    const reader = new FileReader();
                    const base64 = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    doc.setDrawColor(10, 22, 85);
                    doc.setLineWidth(0.6);
                    doc.rect(margin + 141, rowY, 44, rowH);
                    doc.addImage(base64, 'JPEG', margin + 142, rowY + 1, 42, rowH - 2);
                } catch (e) {
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.3);
                    doc.rect(margin + 141, rowY, 44, rowH);
                    doc.setTextColor(150, 150, 150);
                    doc.setFontSize(8);
                    doc.text('No Photo', margin + 163, rowY + 15, { align: 'center' });
                }
            } else {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.rect(margin + 141, rowY, 44, rowH);
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(8);
                doc.text('No Photo', margin + 163, rowY + 15, { align: 'center' });
            }

            // =====================================================
            // SECTION RENDERER
            // =====================================================
            let y = rowY + rowH + 4;
            let sectionNum = 1;

            function drawSectionHeader(title) {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }
                const num = String(sectionNum).padStart(2, '0');
                sectionNum++;

                doc.setFillColor(10, 22, 85);
                doc.rect(margin, y, contentW, 7, 'F');

                doc.setFillColor(212, 175, 55);
                doc.rect(margin, y + 7, contentW, 0.6, 'F');

                doc.setFillColor(212, 175, 55);
                doc.circle(margin + 5, y + 3.5, 3.2, 'F');
                doc.setTextColor(10, 22, 85);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text(num, margin + 5, y + 4.5, { align: 'center' });

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(title, margin + 12, y + 4.5);

                y += 10;
            }

            function drawRow(label, value, x, width) {
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'bold');
                doc.text(String(label).toUpperCase(), x, y);

                const val = (value === null || value === undefined || value === '') ? '—' : String(value);
                doc.setTextColor(31, 41, 55);

                if (hasBengali(val)) {
                    if (setBengaliFont(doc)) {
                        doc.setFontSize(10);
                        const lines = doc.splitTextToSize(val, width - 2);
                        doc.text(lines[0] || '—', x, y + 4.5);
                        setEnglishFont(doc, 'bold');
                    } else {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.text('[Bangla]', x, y + 4.5);
                    }
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9.5);
                    const lines = doc.splitTextToSize(val, width - 2);
                    doc.text(lines[0] || '—', x, y + 4.5);
                }
            }

            function drawRowFull(label, value) {
                drawRow(label, value, margin + 3, contentW - 6);
                y += 9;
            }

            function drawRowPair(l1, v1, l2, v2) {
                const halfW = contentW / 2;
                drawRow(l1, v1, margin + 3, halfW - 5);
                drawRow(l2, v2, margin + halfW + 3, halfW - 5);
                y += 9;
            }

            // SECTION 01
            drawSectionHeader('STUDENT INFORMATION');
            drawRowPair('Name (English)', formData.name_en, 'নাম (বাংলা)', formData.name_bn);
            drawRowPair('Gender', formData.gender, 'Phone', formData.phone);
            drawRowPair('Birth Date', formData.birth_date, 'Religion', formData.religion);
            drawRowPair('Blood Group', formData.blood_group, 'UID', formData.uid_number);
            y += 1;

            // SECTION 02
            drawSectionHeader('ADDRESS');
            drawRowPair('Village', formData.village, 'Union', formData.union_name);
            drawRowPair('Upazila', formData.upazila, 'District', formData.district);
            drawRowPair('Post Office', formData.post_office, 'Post Code', formData.post_code);
            y += 1;

            // SECTION 03
            drawSectionHeader('PARENT INFORMATION');
            drawRowPair('পিতার নাম', formData.father_name_bn, 'মাতার নাম', formData.mother_name_bn);
            drawRowPair("Father's Phone", formData.father_phone, "Mother's Phone", formData.mother_phone);
            if (formData.guardian_name) {
                drawRowPair('Guardian', formData.guardian_name, 'Guardian Phone', formData.guardian_phone);
            }
            y += 1;

            // SECTION 04
            drawSectionHeader('ADMISSION DETAILS');
            drawRowPair('Class', formData.class_name, 'Branch', formData.branch);

            let gLabel = 'Group';
            let gValue = formData.group_name;
            if (formData.branch === 'BM') gLabel = 'Trade';
            drawRowPair(gLabel, gValue, '4th Subject', formData.optional_subject);

            drawRowFull('Admission Date · Session', 
                (formData.admission_date || '—') + ' · ' + (formData.admission_session || '—'));
            y += 1;

            // SECTION 05
            drawSectionHeader('SUBJECTS');

            if (formData.compulsory_subjects && formData.compulsory_subjects.length > 0) {
                const subjectsText = formData.compulsory_subjects.join('  ·  ');
                
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'bold');
                doc.text('SELECTED SUBJECTS', margin + 3, y);
                y += 4;

                doc.setTextColor(31, 41, 55);

                if (hasBengali(subjectsText)) {
                    if (setBengaliFont(doc)) {
                        doc.setFontSize(9.5);
                        const lines = doc.splitTextToSize(subjectsText, contentW - 6);
                        doc.text(lines, margin + 3, y);
                        y += lines.length * 4 + 2;
                        setEnglishFont(doc, 'bold');
                    } else {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.text('[Bangla subjects]', margin + 3, y);
                        y += 5;
                    }
                } else {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9.5);
                    const lines = doc.splitTextToSize(subjectsText, contentW - 6);
                    doc.text(lines, margin + 3, y);
                    y += lines.length * 4 + 2;
                }
            }
            y += 2;

            // SECTION 06
            drawSectionHeader('PREVIOUS EXAM RESULT');
            drawRowPair('Exam Name', formData.prev_exam_name, 'Roll No', formData.prev_roll_no);
            drawRowPair('Result', formData.prev_result, 'Passing Year', formData.prev_passing_year);
            drawRowPair('Board', formData.prev_board, 'School', formData.prev_school_name);
            y += 2;

            // INSTRUCTIONS BOX
            if (y > 235) {
                doc.addPage();
                y = 20;
            }

            const instrH = 30;
            doc.setFillColor(254, 252, 232);
            doc.rect(margin, y, contentW, instrH, 'F');
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentW, instrH);

            doc.setFillColor(245, 158, 11);
            doc.rect(margin, y, 2, instrH, 'F');

            doc.setTextColor(146, 64, 14);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('IMPORTANT INSTRUCTIONS', margin + 6, y + 6);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 53, 15);

            const instrs = PDF_CFG.instructions;
            let iy = y + 11;
            instrs.forEach((instr, i) => {
                doc.text((i + 1) + '.', margin + 6, iy);
                if (hasBengali(instr) && _bengaliFontLoaded) {
                    doc.setFont(BENGALI_FONT_NAME, 'normal');
                    doc.setFontSize(8);
                    const lines = doc.splitTextToSize(instr, contentW - 15);
                    doc.text(lines[0], margin + 10, iy);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                } else {
                    doc.text(instr, margin + 10, iy);
                }
                iy += 4;
            });

            y += instrH + 4;

            // SIGNATURE SECTION
            if (y > 255) {
                doc.addPage();
                y = 20;
            }

            const sigY = y + 5;
            const sigW = 65;

            doc.setDrawColor(31, 41, 55);
            doc.setLineWidth(0.4);
            doc.line(margin + 5, sigY + 12, margin + 5 + sigW, sigY + 12);

            doc.setTextColor(31, 41, 55);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text("Applicant's Signature", margin + 5 + sigW / 2, sigY + 16, { align: 'center' });

            doc.line(margin + 105, sigY + 12, margin + 105 + sigW, sigY + 12);
            doc.text('For Office Use', margin + 105 + sigW / 2, sigY + 16, { align: 'center' });

            // FOOTER
            const footY = pageH - 12;

            doc.setFillColor(31, 41, 55);
            doc.rect(margin, footY, contentW, 8, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(applicationId, margin + 3, footY + 5);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(242, 210, 123);
            doc.text(PDF_CFG.college.website, pageW / 2, footY + 5, { align: 'center' });

            doc.setTextColor(255, 255, 255);
            doc.text('Page 1 of 1', pageW - margin - 3, footY + 5, { align: 'right' });

            doc.save(`FDC_Admission_${applicationId}.pdf`);
            console.log('✅ Professional PDF downloaded');

        } catch (err) {
            console.error('PDF error:', err);
            window.fdcError('PDF তৈরি করা যায়নি: ' + err.message);
        }
    }

    // =========================================================
    // DRAFT AUTO-SAVE
    // =========================================================
    function getDraftKey() { return DRAFT_KEY_PREFIX + FORM_TYPE; }

    function saveDraft() {
        try {
            const data = collectFormData();
            const checkboxes = document.querySelectorAll('input[name="main_subject"]:checked');
            const selectedCodes = Array.from(checkboxes).map(cb => cb.value);
            data._selected_main_codes = selectedCodes;
            data._savedAt = Date.now();
            localStorage.setItem(getDraftKey(), JSON.stringify(data));
        } catch (e) {
            console.warn('Draft save failed:', e);
        }
    }

    function loadDraft() {
        try {
            const raw = localStorage.getItem(getDraftKey());
            if (!raw) return false;
            const draft = JSON.parse(raw);
            if (!draft || !draft._savedAt) return false;
            const age = Date.now() - draft._savedAt;
            if (age > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(getDraftKey());
                return false;
            }
            Object.keys(draft).forEach(key => {
                if (key.startsWith('_')) return;
                const el = $(key);
                if (el && draft[key] !== null && draft[key] !== undefined) {
                    el.value = draft[key];
                }
            });
            const groupSel = $('group_name') || $('department');
            if (groupSel && groupSel.value) {
                groupSel.dispatchEvent(new Event('change'));
                
                setTimeout(() => {
                    const selectedCodes = draft._selected_main_codes || [];
                    document.querySelectorAll('input[name="main_subject"]').forEach(cb => {
                        if (selectedCodes.includes(cb.value)) {
                            cb.checked = true;
                            cb.closest('.subject-checkbox')?.classList.add('checked');
                        }
                    });
                    updateMainSubjectCounter();
                    updateFourthSubjectPool();
                    
                    if (draft.optional_subject && $('optional_subject')) {
                        $('optional_subject').value = draft.optional_subject;
                    }
                }, 100);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    function clearDraft() {
        try { localStorage.removeItem(getDraftKey()); } catch (e) {}
    }

    function triggerDraftSave() {
        if (draftSaveTimer) clearTimeout(draftSaveTimer);
        draftSaveTimer = setTimeout(saveDraft, DRAFT_AUTO_SAVE_MS);
    }

    function setupDraftAutoSave() {
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', triggerDraftSave);
            el.addEventListener('change', triggerDraftSave);
        });
        const raw = localStorage.getItem(getDraftKey());
        if (raw) {
            try {
                const draft = JSON.parse(raw);
                const age = Date.now() - (draft._savedAt || 0);
                if (age < 24 * 60 * 60 * 1000) {
                    setTimeout(() => {
                        window.fdcConfirm(
                            'আপনার একটি অসম্পূর্ণ আবেদন পাওয়া গেছে।<br>আগের তথ্য লোড করবেন?',
                            () => {
                                loadDraft();
                                window.fdcSuccess('আগের তথ্য লোড হয়েছে');
                            },
                            { title: 'Draft পাওয়া গেছে', confirmText: 'হ্যাঁ, লোড করুন', cancelText: 'না, নতুন শুরু', confirmType: 'primary' }
                        );
                    }, 800);
                } else {
                    localStorage.removeItem(getDraftKey());
                }
            } catch (e) {}
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Admission Form v7.1 loading...');
        console.log('📋 Form Type:', FORM_TYPE);

        const yearEl = $('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        setupPhotoInput();
        setupGroupChange();
        setupSuccessActions();
        setupDraftAutoSave();
        populateSessions();
        setupSessionAutoUpdate();
        setupLocationDropdowns();

        const form = $('admissionForm');
        if (form) form.addEventListener('submit', submitForm);

        $('btnBackToEdit')?.addEventListener('click', backToEdit);
        $('btnConfirmSubmit')?.addEventListener('click', confirmAndSubmit);

        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', function () {
                if (this.id) hideError(this.id);
                formTouched = true;
            });
            el.addEventListener('change', function () {
                if (this.id) hideError(this.id);
                formTouched = true;
            });
        });

        window.addEventListener('beforeunload', function (e) {
            if (formTouched && !$('successModal')?.classList.contains('show')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        console.log('✅ Admission Form v7.1 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();