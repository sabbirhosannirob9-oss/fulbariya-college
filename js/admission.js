/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION FORM LOGIC
 * Location: js/admission.js
 * Version: v6.0 — Location Dropdowns + Auto Session + Compact PDF
 * 
 * ✅ Features:
 *    - HSC-General + HSC-BM support
 *    - Division → District → Upazila cascade dropdowns
 *    - Auto Session (with override)
 *    - Auto Image Compression (600px, 75%)
 *    - Cloudinary Upload
 *    - Preview before submit
 *    - Auto Application ID
 *    - PDF Download (single-page, photo top-right)
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

    const FORM_TYPE = detectFormType();

    // =========================================================
    // STATE
    // =========================================================
    let photoUrl = null;
    let uploadedPhotoFile = null;
    let draftSaveTimer = null;
    let formTouched = false;

    // =========================================================
    // DOM HELPER
    // =========================================================
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
            let admissionYear;
            if (month >= 1 && month <= 6) {
                admissionYear = year;
            } else {
                admissionYear = year + 1;
            }
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
                hint.innerHTML = `<i class="fas fa-magic"></i> Auto-selected: <strong>${autoSession}</strong> (তারিখ থেকে)`;
                hint.style.display = 'block';
                hint.style.opacity = '1';
                setTimeout(() => { if (hint) hint.style.opacity = '0.7'; }, 3000);
            }
        });

        sessionSel.addEventListener('change', function () {
            if (hint && this.value) {
                hint.innerHTML = `<i class="fas fa-check-circle"></i> Manually selected: <strong>${this.value}</strong>`;
            }
        });
    }

    // =========================================================
    // IMAGE COMPRESSION
    // =========================================================
    async function compressImage(file) {
        return new Promise((resolve, reject) => {
            const originalKB = Math.round(file.size / 1024);
            console.log(`📷 Original: ${originalKB} KB`);
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
                            const newKB = Math.round(blob.size / 1024);
                            const savings = Math.round((1 - blob.size / file.size) * 100);
                            console.log(`✅ Compressed: ${newKB} KB (${savings}% saved) — ${width}x${height}`);
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
        console.log('☁️ Cloudinary URL:', data.secure_url);
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
            const originalKB = Math.round(file.size / 1024);
            $('photoFileName').textContent = `${file.name} (${originalKB} KB)`;
            hideError('photo');
            $('photoPreview').innerHTML = `<div style="padding:20px;color:var(--grey);font-size:13px;"><i class="fas fa-spinner fa-spin"></i> Compressing...</div>`;
            try {
                const compressed = await compressImage(file);
                uploadedPhotoFile = compressed;
                const url = URL.createObjectURL(compressed);
                const newKB = Math.round(compressed.size / 1024);
                $('photoFileName').textContent = `${compressed.name} (${newKB} KB)`;
                $('photoPreview').innerHTML = `<img src="${url}" alt="Preview">`;
                triggerDraftSave();
            } catch (err) {
                console.error('Compress error:', err);
                window.fdcError('ছবি compress করা যায়নি: ' + err.message);
                $('photoPreview').innerHTML = '';
                input.value = '';
                uploadedPhotoFile = null;
            }
        });
    }

    // =========================================================
    // GROUP SUBJECTS
    // =========================================================
    function getGroupSubjects(group) {
        if (!group) return [];
        const bmTrades = {
            'Computerized Accounting System': ['Computerized Accounting System'],
            'Digital Technology in Business': ['Digital Technology in Business'],
            'Human Resource Development': ['Human Resource Development']
        };
        if (bmTrades[group]) return bmTrades[group];
        const generalMap = {
            'Science': ['পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান বা উচ্চতর গণিত'],
            'Business': ['হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'উৎপাদন ব্যবস্থাপনা ও বিপণন'],
            'Humanities': ['পৌরনীতি ও সুশাসন', 'অর্থনীতি', 'ইসলামের ইতিহাস ও সংস্কৃতি']
        };
        return generalMap[group] || [];
    }

    function getFourthSubjectPool(group) {
        if (!group) return [];
        const bmTrades = ['Computerized Accounting System', 'Digital Technology in Business', 'Human Resource Development'];
        if (bmTrades.includes(group)) return [];
        const map = {
            'Science': ['জীববিজ্ঞান', 'উচ্চতর গণিত', 'কৃষিশিক্ষা', 'পরিসংখ্যান', 'প্রকৌশল অঙ্কন ও ওয়ার্কশপ প্র্যাকটিস', 'ভূগোল', 'মনোবিজ্ঞান'],
            'Business': ['হিসাববিজ্ঞান', 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা', 'উৎপাদন ব্যবস্থাপনা ও বিপণন', 'অর্থনীতি', 'ফিন্যান্স, ব্যাংকিং ও বিমা', 'পরিসংখ্যান', 'কৃষিশিক্ষা', 'ভূগোল'],
            'Humanities': ['পৌরনীতি ও সুশাসন', 'অর্থনীতি', 'যুক্তিবিদ্যা', 'ইসলামের ইতিহাস ও সংস্কৃতি', 'ইসলাম শিক্ষা', 'ইতিহাস', 'সমাজবিজ্ঞান', 'সমাজকর্ম', 'কৃষিশিক্ষা', 'পরিসংখ্যান', 'ভূগোল']
        };
        return map[group] || [];
    }

    function setupGroupChange() {
        const groupSel = $('group_name') || $('department');
        if (!groupSel) return;
        groupSel.addEventListener('change', function () {
            const group = this.value;
            if (!group) {
                if ($('groupSubjectsWrap')) $('groupSubjectsWrap').style.display = 'none';
                if ($('fourthSubjectWrap')) $('fourthSubjectWrap').style.display = 'none';
                return;
            }
            const subjects = getGroupSubjects(group);
            if ($('groupSubjectsList')) {
                $('groupSubjectsList').innerHTML = subjects.map(s =>
                    `<div class="subject-locked"><i class="fas fa-lock"></i> ${escapeHtml(s)}</div>`
                ).join('');
                $('groupSubjectsWrap').style.display = 'block';
            }
            const fourthPool = getFourthSubjectPool(group);
            if ($('optional_subject') && $('fourthSubjectWrap')) {
                if (fourthPool.length > 0) {
                    const sel = $('optional_subject');
                    const currentVal = sel.value;
                    sel.innerHTML = '<option value="">Select 4th Subject</option>' +
                        fourthPool.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
                    if (currentVal && fourthPool.includes(currentVal)) sel.value = currentVal;
                    $('fourthSubjectWrap').style.display = 'block';
                } else {
                    $('fourthSubjectWrap').style.display = 'none';
                }
            }
        });
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

        let compulsory;
        if (FORM_TYPE === 'HSC-BM') {
            compulsory = ['বাংলা', 'English', 'ICT', 'Mathematics', 'Accounting', 'Business Organization & Management', 'Finance, Banking & Insurance', 'Production Management & Marketing'];
        } else {
            compulsory = ['Bangla', 'English', 'ICT'];
        }

        const groupName = ($('group_name')?.value || $('department')?.value || '');
        const optionalSub = ($('optional_subject')?.value || '');

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
            console.warn('RPC failed, using fallback:', e);
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
    // SUBMIT → SHOW PREVIEW
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
        if (data.optional_subject) {
            subjectTagHtml += `<span class="preview-subject-tag" style="background:#fef3c7;color:#92400e;border-color:#fde68a;">৪র্থ: ${escapeHtml(data.optional_subject)}</span>`;
        }

        let groupLabel = 'Group';
        let groupValue = data.group_name;
        if (FORM_TYPE === 'HSC-BM') { groupLabel = 'Trade'; groupValue = data.group_name || '—'; }
        else if (FORM_TYPE === 'Honours') { groupLabel = 'Department'; groupValue = data.department; }

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

    // =========================================================
    // BACK TO EDIT
    // =========================================================
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

            console.log('✅ Application saved:', data);

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
                window.fdcWarning('Copy করা যায়নি — manually লিখে নিন');
            });
        });
        $('downloadPdfBtn')?.addEventListener('click', downloadPdf);
    }

    // =========================================================
    // PDF GENERATION (COMPACT — Single Page)
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

            // ============ HEADER (0-26mm) ============
            doc.setFillColor(10, 22, 85);
            doc.rect(0, 0, 210, 26, 'F');

            doc.setFillColor(212, 175, 55);
            doc.rect(0, 26, 210, 1.2, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('FULBARIYA COLLEGE', 105, 10, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Fulbariya, Mymensingh', 105, 16, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('ADMISSION APPLICATION', 105, 23, { align: 'center' });

            // ============ APPLICATION ID + PHOTO (28-51mm) ============
            doc.setFillColor(239, 246, 255);
            doc.rect(15, 29, 135, 22, 'F');
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(0.4);
            doc.rect(15, 29, 135, 22);

            doc.setTextColor(10, 22, 85);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('Application ID:', 18, 35);
            doc.setTextColor(220, 38, 38);
            doc.setFontSize(13);
            doc.text(applicationId, 18, 43);

            doc.setTextColor(107, 114, 128);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('Submitted: ' + new Date().toLocaleString('en-GB'), 18, 49);

            // PHOTO (top-right corner)
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
                    doc.setLineWidth(0.5);
                    doc.rect(155, 29, 40, 32);
                    doc.addImage(base64, 'JPEG', 155.5, 29.5, 39, 31);
                } catch (e) {
                    console.warn('Photo embed failed:', e);
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.3);
                    doc.rect(155, 29, 40, 32);
                    doc.setTextColor(150, 150, 150);
                    doc.setFontSize(8);
                    doc.text('No Photo', 175, 46, { align: 'center' });
                }
            } else {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.rect(155, 29, 40, 32);
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(8);
                doc.text('No Photo', 175, 46, { align: 'center' });
            }

            // ============ HELPERS ============
            let y = 55;

            function addSection(title) {
                doc.setFillColor(6, 182, 212);
                doc.rect(15, y, 180, 6, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(title, 18, y + 4.2);
                y += 8;
            }

            function addField(label, value, xPos) {
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(label, xPos, y);
                doc.setTextColor(31, 41, 55);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const val = value ? String(value) : '—';
                doc.text(val.substring(0, 38), xPos, y + 4);
            }

            function addRow(field1, val1, field2, val2) {
                addField(field1, val1, 18);
                if (field2) addField(field2, val2, 108);
                y += 8.5;
            }

            // STUDENT INFORMATION
            addSection('STUDENT INFORMATION');
            addRow('Name (English)', formData.name_en, 'Name (Bangla)', formData.name_bn);
            addRow('Gender', formData.gender, 'Phone', formData.phone);
            addRow('Email', formData.email, 'Birth Date', formData.birth_date);
            addRow('Religion', formData.religion, 'Blood Group', formData.blood_group);
            addRow('UID', formData.uid_number, 'NID', formData.nid_number);
            y += 1;

            // ADDRESS
            addSection('ADDRESS');
            addRow('Village', formData.village, 'Union', formData.union_name);
            addRow('Post Office', formData.post_office, 'Post Code', formData.post_code);
            addRow('Division', formData.division, 'District', formData.district);
            addRow('Upazila', formData.upazila, '', '');
            y += 1;

            // PARENT INFORMATION
            addSection('PARENT INFORMATION');
            addRow("Father's Name (EN)", formData.father_name_en, "Father's Name (BN)", formData.father_name_bn);
            addRow("Mother's Name (EN)", formData.mother_name_en, "Mother's Name (BN)", formData.mother_name_bn);
            addRow("Father's Phone", formData.father_phone, "Mother's Phone", formData.mother_phone);
            if (formData.guardian_name) {
                addRow('Guardian', formData.guardian_name, 'Guardian Phone', formData.guardian_phone);
            }
            y += 1;

            // ADMISSION INFORMATION
            addSection('ADMISSION INFORMATION');
            addRow('Admission Date', formData.admission_date, 'Session', formData.admission_session);
            addRow('Class', formData.class_name, 'Branch', formData.branch);

            let gLabel = 'Group';
            let gValue = formData.group_name;
            if (formData.branch === 'BM') { gLabel = 'Trade'; gValue = formData.group_name || '—'; }
            addRow(gLabel, gValue, '4th Subject', formData.optional_subject);

            if (formData.compulsory_subjects && formData.compulsory_subjects.length > 0) {
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text('Subjects:', 18, y);
                y += 4;

                const subjectsText = formData.compulsory_subjects.join(' · ');
                doc.setTextColor(31, 41, 55);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                const lines = doc.splitTextToSize(subjectsText, 175);
                doc.text(lines, 18, y);
                y += lines.length * 3.5 + 1;
            }
            y += 1;

            // PREVIOUS EXAM RESULT
            addSection('PREVIOUS EXAM RESULT');
            addRow('Exam Name', formData.prev_exam_name, 'School', formData.prev_school_name);
            addRow('Result', formData.prev_result, 'Passing Year', formData.prev_passing_year);
            addRow('Board', formData.prev_board, 'Roll No', formData.prev_roll_no);
            y += 3;

            // STATUS BOX
            doc.setFillColor(254, 243, 199);
            doc.rect(70, y, 70, 12, 'F');
            doc.setDrawColor(217, 119, 6);
            doc.setLineWidth(0.5);
            doc.rect(70, y, 70, 12);

            doc.setTextColor(146, 64, 14);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('STATUS', 105, y + 4.5, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PENDING', 105, y + 10, { align: 'center' });

            // FOOTER
            doc.setFillColor(31, 41, 55);
            doc.rect(0, 287, 210, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Fulbariya College | Application ID: ${applicationId}`,
                105, 293, { align: 'center' }
            );

            doc.save(`Admission_${applicationId}.pdf`);
            console.log('✅ PDF downloaded');

        } catch (err) {
            console.error('PDF error:', err);
            window.fdcError('PDF তৈরি করা যায়নি: ' + err.message);
        }
    }

    // =========================================================
    // DRAFT AUTO-SAVE
    // =========================================================
    function getDraftKey() {
        return DRAFT_KEY_PREFIX + FORM_TYPE;
    }

    function saveDraft() {
        try {
            const data = collectFormData();
            const draft = { ...data, _savedAt: Date.now() };
            localStorage.setItem(getDraftKey(), JSON.stringify(draft));
            console.log('💾 Draft saved');
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
                if ($('optional_subject') && draft.optional_subject) {
                    $('optional_subject').value = draft.optional_subject;
                }
            }
            console.log('📂 Draft loaded');
            return true;
        } catch (e) {
            console.warn('Draft load failed:', e);
            return false;
        }
    }

    function clearDraft() {
        try {
            localStorage.removeItem(getDraftKey());
            console.log('🗑️ Draft cleared');
        } catch (e) {}
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
        console.log('🚀 Admission Form v6.0 loading...');
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

        console.log('✅ Admission Form v6.0 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();