/**
 * =========================================================
 * FULBARIYA COLLEGE — ADMISSION FORM LOGIC
 * Location: js/admission.js
 * Version: v8.0 — Print to PDF (jsPDF removed)
 * 
 * ✅ Features:
 *    - HSC-General + HSC-BM support
 *    - Multi-select checkbox for group subjects
 *    - Fixed + Choice subjects per group
 *    - 4th Subject with dynamic exclusion filter
 *    - Print to PDF via admission-print.html
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

    const PRINT_URL = 'admission-print.html';

    const FORM_TYPE = detectFormType();

    // =========================================================
    // STATE
    // =========================================================
    let photoUrl = null;
    let uploadedPhotoFile = null;
    let draftSaveTimer = null;
    let formTouched = false;

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
    // HELPERS
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

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
            const v = (el.value || '').trim();
            if (!v) {
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
            compulsory = (POOLS && POOLS.BM && POOLS.BM.compulsory)
                ? POOLS.BM.compulsory.map(s => s.name)
                : [
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
    // SUCCESS ACTIONS — Print to PDF
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

        // Print to PDF (replaces old downloadPdf)
        $('downloadPdfBtn')?.addEventListener('click', openPrintView);
    }

    // =========================================================
    // OPEN PRINT VIEW (v8.0)
    // =========================================================
    function openPrintView() {
        const submission = window._lastSubmission;
        if (!submission || !submission.applicationId) {
            window.fdcError('তথ্য পাওয়া যায়নি');
            return;
        }

        const appId = submission.applicationId;
        const url = `${PRINT_URL}?id=${encodeURIComponent(appId)}&auto=1`;

        console.log('🖨️ Opening print view:', url);

        const win = window.open(url, '_blank');

        if (!win || win.closed || typeof win.closed === 'undefined') {
            window.fdcWarning(
                'Print view খুলতে পারছি না। Pop-up blocker বন্ধ করুন অথবা এই লিংকে যান:<br><br>' +
                `<a href="${url}" target="_blank" style="color:#0a1655;font-weight:700;word-break:break-all;">Print view খুলুন</a>`
            );
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
        console.log('🚀 Admission Form v8.0 loading (Print to PDF)...');
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

        console.log('✅ Admission Form v8.0 ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();