/**
 * =========================================================
 * FULBARIYA COLLEGE — STUDENT DASHBOARD
 * Location: js/student-dashboard.js
 * Depends: config.js, supabase.js, auth.js, cloudinary.js
 *
 * Subject Selection Logic:
 *   - Compulsory (আবশ্যিক): auto-checked + disabled
 *   - Group (গ্রুপ): ৩টি বই বাছাই
 *   - Optional (ঐচ্ছিক): গ্রুপে বাছাই করা বই বাদ দিয়ে বাকি থেকে ১টি
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let studentData = null;
    let selectedImageFile = null;
    let allSubjects = [];
    let subjectsByType = { compulsory: [], group: [], optional: [] };
    let selectedGroupBooks = new Set();     // গ্রুপে বাছাই করা book names
    let selectedOptionalBook = null;         // ঐচ্ছিকে বাছাই করা book name

    const GROUP_BOOK_LIMIT = 3;
    const OPTIONAL_BOOK_LIMIT = 1;

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
    // TOAST
    // =========================================================
    function showToast(msg, type = 'success') {
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
    // TABS
    // =========================================================
    window.switchTab = function (tab) {
        document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
        const target = document.getElementById('tab-' + tab);
        if (target) target.classList.add('active');

        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
        if (btn) btn.classList.add('active');

        if (tab === 'complaints') loadComplaints();
    };

    // =========================================================
    // LOGOUT
    // =========================================================
    window.handleLogout = function () {
        if (confirm('আপনি কি লগআউট করতে চান?')) {
            sessionStorage.clear();
            window.location.replace('student-login.html');
        }
    };

    // =========================================================
    // COMPLAINT FORM
    // =========================================================
    window.showComplaintForm = function () {
        const el = document.getElementById('complaintFormContainer');
        if (el) {
            el.style.display = 'block';
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };
    window.hideComplaintForm = function () {
        const el = document.getElementById('complaintFormContainer');
        if (el) el.style.display = 'none';
        const f = document.getElementById('complaintForm');
        if (f) f.reset();
    };

    // =========================================================
    // LOAD STUDENT
    // =========================================================
    async function loadStudentData() {
        try {
            const id = sessionStorage.getItem('student_id');
            if (!id) {
                window.location.href = 'student-login.html';
                return;
            }

            const supabase = window.FDC_SUPABASE;
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                showToast('প্রোফাইল লোড করা যায়নি', 'error');
                return;
            }

            studentData = data;
            console.log('✅ Student loaded:', data.name, '| Group:', data.group_name);

            // Header
            document.getElementById('studentName').textContent = data.name || 'Student';
            document.getElementById('studentRoll').textContent = 'Roll: ' + (data.roll || '-');
            document.getElementById('studentAvatar').textContent = (data.name || 'S').charAt(0).toUpperCase();
            document.getElementById('welcomeAvatar').textContent = (data.name || 'S').charAt(0).toUpperCase();

            // Welcome
            document.getElementById('welcomeName').textContent = data.name || 'Student';
            document.getElementById('welcomeClass').innerHTML = '<i class="fas fa-graduation-cap"></i> ' + (data.class || '-');
            document.getElementById('welcomeYear').innerHTML = '<i class="fas fa-calendar-alt"></i> ' + (data.year || '-');
            document.getElementById('welcomeGroup').innerHTML = '<i class="fas fa-users"></i> ' + (data.group_name || '-');

            // Badges
            updateStatusBadges(data);

            // Info fields
            const map = {
                displayName: data.name,
                displayRoll: data.roll,
                displayClass: data.class,
                displayYear: data.year,
                displayGroup: data.group_name,
                displaySession: data.session,
                displayBirthDate: data.birth_date
            };
            Object.keys(map).forEach(k => {
                const el = document.getElementById(k);
                if (el) el.textContent = map[k] || '-';
            });

            // Form values
            const fields = {
                fatherName: data.father_name,
                motherName: data.mother_name,
                presentAddress: data.present_address,
                permanentAddress: data.permanent_address,
                phone: data.phone,
                bloodGroup: data.blood_group
            };
            Object.keys(fields).forEach(k => {
                const el = document.getElementById(k);
                if (el && fields[k]) el.value = fields[k];
            });

            // Existing image
            if (data.image_url) {
                const img = document.getElementById('existingImageImg');
                const url = document.getElementById('existingImageUrl');
                if (img) img.src = data.image_url;
                if (url) url.textContent = data.image_url.substring(0, 40) + '...';
                document.getElementById('existingImage')?.classList.add('show');
            }

            await loadSubjects();

            if (data.subjects && Array.isArray(data.subjects)) {
                restoreSelections(data.subjects);
            }

            if (data.profile_status === 'approved' || data.profile_status === 'rejected') {
                disableForm(data.profile_status);
            }

        } catch (err) {
            console.error('❌ loadStudentData:', err);
            showToast('Error: ' + err.message, 'error');
        }
    }

    // =========================================================
    // STATUS BADGES
    // =========================================================
    function updateStatusBadges(data) {
        const pb = document.getElementById('profileStatusBadge');
        if (pb) {
            pb.className = 'badge-status ' + (data.is_profile_complete ? 'badge-complete' : 'badge-pending');
            pb.innerHTML = data.is_profile_complete ? '✅ Complete' : '⏳ Incomplete';
        }

        const ab = document.getElementById('approvalStatusBadge');
        if (ab) {
            if (data.profile_status === 'approved') {
                ab.className = 'badge-status badge-approved';
                ab.innerHTML = '✅ Approved';
            } else if (data.profile_status === 'rejected') {
                ab.className = 'badge-status badge-rejected';
                ab.innerHTML = '❌ Rejected';
            } else {
                ab.className = 'badge-status badge-pending';
                ab.innerHTML = '⏳ Pending';
            }
        }
    }

    // =========================================================
    // DISABLE FORM
    // =========================================================
    function disableForm(status) {
        const form = document.getElementById('profileForm');
        if (!form) return;
        form.querySelectorAll('input, select, textarea, button[type="submit"]')
            .forEach(el => el.disabled = true);
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = status === 'approved'
                ? '<i class="fas fa-check-circle me-2"></i> ✅ Approved'
                : '<i class="fas fa-times-circle me-2"></i> ❌ Rejected';
        }
    }

    // =========================================================
    // LOAD SUBJECTS FROM DB
    // =========================================================
    async function loadSubjects() {
        const container = document.getElementById('subjectsContainer');
        if (!container) return;

        try {
            const cls = (studentData.class || '').trim();
            const yr  = (studentData.year || '').trim();
            const grp = (studentData.group_name || '').trim();

            let groupList;
            if (grp === 'BMT') groupList = ['BMT'];
            else groupList = [grp, 'Common'];

            const { data, error } = await window.FDC_SUPABASE
                .from('subjects')
                .select('*')
                .eq('class', cls)
                .eq('year', yr)
                .eq('is_active', true)
                .in('group_name', groupList)
                .order('subject_type', { ascending: true })
                .order('display_order', { ascending: true });

            if (error) throw error;

            allSubjects = data || [];
            console.log('✅ Subjects fetched:', allSubjects.length);

            if (allSubjects.length === 0) {
                container.innerHTML = '<div class="text-danger">No subjects available.</div>';
                return;
            }

            // Group by subject_type
            subjectsByType = { compulsory: [], group: [], optional: [] };

            allSubjects.forEach(s => {
                const type = s.subject_type || 'group';
                if (subjectsByType[type]) {
                    subjectsByType[type].push(s);
                }
            });

            // ★ IMPORTANT: Optional ও Group একই বই থাকলে
            // গ্রুপ থেকে বই বাছাই করলে সেটা optional থেকে সরিয়ে দিতে হবে
            // এটা renderSubjects()-এ করা হবে

            renderSubjects();

        } catch (err) {
            console.error('❌ loadSubjects:', err);
            container.innerHTML = '<div class="text-danger">লোড করা যায়নি</div>';
        }
    }

    // =========================================================
    // RENDER SUBJECTS
    // =========================================================
    function renderSubjects() {
        const container = document.getElementById('subjectsContainer');

        // ★ Group subjects কে "books" এ রূপান্তর করুন (১ম+২য় পত্র একসাথে)
        const compulsoryBooks = groupByBook(subjectsByType.compulsory);
        const groupBooks = groupByBook(subjectsByType.group);
        const optionalBooks = groupByBook(subjectsByType.optional);

        let html = '';

        // Instruction
        html += `
            <div class="instruction-box">
                <strong><i class="fas fa-info-circle"></i> বিষয় নির্বাচনের নিয়ম</strong>
                <ul>
                    <li>📌 <b>আবশ্যিক বিষয়</b> স্বয়ংক্রিয়ভাবে যুক্ত হয়েছে</li>
                    <li>📚 <b>গ্রুপ থেকে ${GROUP_BOOK_LIMIT}টি বই</b> (৬ পত্র) বেছে নিন</li>
                    <li>📖 <b>ঐচ্ছিক থেকে ${OPTIONAL_BOOK_LIMIT}টি বই</b> (২ পত্র) বেছে নিন</li>
                    <li>⚠️ গ্রুপে যে বই বেছে নেবেন, সেটি ঐচ্ছিক থেকে সরে যাবে</li>
                </ul>
            </div>
        `;

        // =========================================================
        // COMPULSORY
        // =========================================================
        html += `<div class="subject-section-title">
            📌 আবশ্যিক বিষয়
            <span class="badge-count">${compulsoryBooks.length} বই</span>
        </div>`;
        html += `<div class="subject-list">`;

        compulsoryBooks.forEach(function (book) {
            html += `
                <div class="subject-book compulsory" data-book="${escapeAttr(book.name)}" data-type="compulsory">
                    <div class="book-header">
                        <input type="checkbox" checked disabled id="cb_comp_${safeId(book.name)}">
                        <label for="cb_comp_${safeId(book.name)}">
                            ${escapeHtml(book.name)}
                            <small>১ম + ২য় পত্র</small>
                        </label>
                    </div>
                    <div class="book-check"><i class="fas fa-lock"></i></div>
                </div>
            `;
        });
        html += `</div>`;

        // =========================================================
        // GROUP
        // =========================================================
        html += `<div class="subject-section-title">
            📚 গ্রুপের বিষয় (${GROUP_BOOK_LIMIT}টি বই বাছাই করুন)
            <span class="badge-count" id="groupCounter">0/${GROUP_BOOK_LIMIT}</span>
        </div>`;
        html += `<div class="subject-list" id="groupList">`;

        groupBooks.forEach(function (book) {
            html += `
                <div class="subject-book group-book" data-book="${escapeAttr(book.name)}" data-type="group">
                    <div class="book-header">
                        <input type="checkbox"
                               class="group-checkbox"
                               data-book="${escapeAttr(book.name)}"
                               id="cb_group_${safeId(book.name)}">
                        <label for="cb_group_${safeId(book.name)}">
                            ${escapeHtml(book.name)}
                            <small>১ম + ২য় পত্র</small>
                        </label>
                    </div>
                    <div class="book-check"><i class="fas fa-plus"></i></div>
                </div>
            `;
        });
        html += `</div>`;

        // =========================================================
        // OPTIONAL
        // =========================================================
        html += `<div class="subject-section-title">
            📖 ঐচ্ছিক বিষয় (${OPTIONAL_BOOK_LIMIT}টি বই বাছাই করুন)
            <span class="badge-count" id="optionalCounter">0/${OPTIONAL_BOOK_LIMIT}</span>
        </div>`;
        html += `<div class="subject-list" id="optionalList">`;

        optionalBooks.forEach(function (book) {
            html += `
                <div class="subject-book optional-book" data-book="${escapeAttr(book.name)}" data-type="optional">
                    <div class="book-header">
                        <input type="checkbox"
                               class="optional-checkbox"
                               data-book="${escapeAttr(book.name)}"
                               id="cb_opt_${safeId(book.name)}">
                        <label for="cb_opt_${safeId(book.name)}">
                            ${escapeHtml(book.name)}
                            <small>১ম + ২য় পত্র</small>
                        </label>
                    </div>
                    <div class="book-check"><i class="fas fa-plus"></i></div>
                </div>
            `;
        });
        html += `</div>`;

        container.innerHTML = html;

        attachGroupListeners();
        attachOptionalListeners();
        updateCounters();
    }

    // =========================================================
    // GROUP BY BOOK (১ম+২য় পত্র একসাথে)
    // =========================================================
    function groupByBook(subjects) {
        const books = {};

        subjects.forEach(function (s) {
            // "পদার্থবিজ্ঞান ১ম পত্র" → "পদার্থবিজ্ঞান"
            const name = s.subject_name
                .replace(/\s*(১ম|২য়)\s*পত্র\s*$/, '')
                .replace(/\s*(1st|2nd)\s*Paper\s*$/, '')
                .trim();

            if (!books[name]) {
                books[name] = { name: name, papers: [] };
            }
            books[name].papers.push({
                id: s.id,
                subject_name: s.subject_name,
                paper: s.paper,
                has_mcq: s.has_mcq,
                has_cq: s.has_cq,
                has_practical: s.has_practical,
                mcq_marks: s.mcq_marks,
                cq_marks: s.cq_marks,
                practical_marks: s.practical_marks
            });
        });

        return Object.values(books);
    }

    // =========================================================
    // GROUP CHECKBOX LISTENERS
    // =========================================================
    function attachGroupListeners() {
        document.querySelectorAll('.group-checkbox').forEach(function (cb) {
            cb.addEventListener('change', function (e) {
                e.preventDefault();
                const book = this.dataset.book;

                if (this.checked) {
                    // লিমিট চেক
                    if (selectedGroupBooks.size >= GROUP_BOOK_LIMIT) {
                        this.checked = false;
                        showToast('⚠️ গ্রুপ থেকে সর্বোচ্চ ' + GROUP_BOOK_LIMIT + 'টি বই বাছাই করা যাবে!', 'error');
                        return;
                    }
                    selectedGroupBooks.add(book);
                    markBookSelected(this.closest('.subject-book'), true);
                    hideFromOptional(book);
                } else {
                    selectedGroupBooks.delete(book);
                    markBookSelected(this.closest('.subject-book'), false);
                    showInOptional(book);
                }

                updateCounters();
            });
        });
    }

    // =========================================================
    // OPTIONAL CHECKBOX LISTENERS
    // =========================================================
    function attachOptionalListeners() {
        document.querySelectorAll('.optional-checkbox').forEach(function (cb) {
            cb.addEventListener('change', function (e) {
                e.preventDefault();
                const book = this.dataset.book;

                if (this.checked) {
                    // আগের সব uncheck
                    document.querySelectorAll('.optional-checkbox').forEach(function (other) {
                        if (other !== cb) {
                            other.checked = false;
                            markBookSelected(other.closest('.subject-book'), false);
                        }
                    });

                    selectedOptionalBook = book;
                    markBookSelected(this.closest('.subject-book'), true);
                } else {
                    selectedOptionalBook = null;
                    markBookSelected(this.closest('.subject-book'), false);
                }

                updateCounters();
            });
        });
    }

    // =========================================================
    // MARK BOOK SELECTED
    // =========================================================
    function markBookSelected(el, selected) {
        if (!el) return;
        if (selected) {
            el.classList.add('selected');
            const check = el.querySelector('.book-check');
            if (check) check.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            el.classList.remove('selected');
            const check = el.querySelector('.book-check');
            if (check) check.innerHTML = '<i class="fas fa-plus"></i>';
        }
    }

    // =========================================================
    // HIDE / SHOW OPTIONAL BOOK
    // =========================================================
    function hideFromOptional(bookName) {
        const list = document.getElementById('optionalList');
        if (!list) return;
        const el = list.querySelector('[data-book="' + cssEscape(bookName) + '"]');
        if (el) {
            const cb = el.querySelector('.optional-checkbox');
            if (cb && cb.checked) {
                cb.checked = false;
                markBookSelected(el, false);
                selectedOptionalBook = null;
            }
            el.classList.add('locked');
            el.classList.add('disabled');
        }
    }

    function showInOptional(bookName) {
        const list = document.getElementById('optionalList');
        if (!list) return;
        const el = list.querySelector('[data-book="' + cssEscape(bookName) + '"]');
        if (el) {
            el.classList.remove('locked');
            el.classList.remove('disabled');
        }
    }

    // =========================================================
    // UPDATE COUNTERS
    // =========================================================
    function updateCounters() {
        const gc = document.getElementById('groupCounter');
        if (gc) {
            gc.textContent = selectedGroupBooks.size + '/' + GROUP_BOOK_LIMIT;
            if (selectedGroupBooks.size === GROUP_BOOK_LIMIT) {
                gc.classList.add('locked');
            } else {
                gc.classList.remove('locked');
            }
        }

        const oc = document.getElementById('optionalCounter');
        if (oc) {
            oc.textContent = (selectedOptionalBook ? 1 : 0) + '/' + OPTIONAL_BOOK_LIMIT;
            if (selectedOptionalBook) {
                oc.classList.add('locked');
            } else {
                oc.classList.remove('locked');
            }
        }
    }

    // =========================================================
    // RESTORE SELECTIONS
    // =========================================================
    function restoreSelections(savedSubjectNames) {
        // savedSubjectNames হলো সাবজেক্টের নামের array
        // যেমন: ["বাংলা ১ম পত্র", "বাংলা ২য় পত্র", "পদার্থবিজ্ঞান ১ম পত্র", ...]

        const selectedBookNames = new Set();

        savedSubjectNames.forEach(function (name) {
            const bookName = name
                .replace(/\s*(১ম|২য়)\s*পত্র\s*$/, '')
                .replace(/\s*(1st|2nd)\s*Paper\s*$/, '')
                .trim();
            selectedBookNames.add(bookName);
        });

        // প্রতি book-এর জন্য চেক করুন এটা group না optional
        selectedBookNames.forEach(function (bookName) {
            // Group-এ আছে কিনা চেক
            const groupEl = document.querySelector('#groupList [data-book="' + cssEscape(bookName) + '"]');
            const optionalEl = document.querySelector('#optionalList [data-book="' + cssEscape(bookName) + '"]');

            if (groupEl) {
                // Group-এর বই হিসেবে restore
                const cb = groupEl.querySelector('.group-checkbox');
                if (cb && !cb.checked) {
                    if (selectedGroupBooks.size < GROUP_BOOK_LIMIT) {
                        cb.checked = true;
                        selectedGroupBooks.add(bookName);
                        markBookSelected(groupEl, true);
                        hideFromOptional(bookName);
                    }
                }
            } else if (optionalEl) {
                // Optional-এর বই হিসেবে restore
                const cb = optionalEl.querySelector('.optional-checkbox');
                if (cb && !cb.checked) {
                    if (!selectedOptionalBook) {
                        cb.checked = true;
                        selectedOptionalBook = bookName;
                        markBookSelected(optionalEl, true);
                    }
                }
            }
        });

        updateCounters();
    }

    // =========================================================
    // IMAGE UPLOAD
    // =========================================================
    function setupImageUpload() {
        const dropArea = document.getElementById('imageDropArea');
        const input = document.getElementById('imageInput');
        const preview = document.getElementById('imagePreview');
        const rm = document.getElementById('removeImage');

        if (!dropArea || !input) return;

        dropArea.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            e.preventDefault();
            input.click();
        });

        input.addEventListener('change', function () {
            if (this.files && this.files[0]) handleImageSelect(this.files[0]);
        });

        dropArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            this.style.borderColor = '#1a237e';
            this.style.background = '#f5f7ff';
        });
        dropArea.addEventListener('dragleave', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
        });
        dropArea.addEventListener('drop', function (e) {
            e.preventDefault();
            this.style.borderColor = '#c8cdda';
            this.style.background = '#fafbff';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageSelect(e.dataTransfer.files[0]);
            }
        });

        if (rm) {
            rm.addEventListener('click', function (e) {
                e.stopPropagation();
                selectedImageFile = null;
                input.value = '';
                if (preview) preview.classList.remove('show');
                document.getElementById('existingImage')?.classList.remove('show');
                showToast('ছবি সরানো হয়েছে', 'info');
            });
        }
    }

    function handleImageSelect(file) {
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('ছবি অনেক বড়! সর্বোচ্চ 2MB।', 'error');
            document.getElementById('imageInput').value = '';
            return;
        }

        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            showToast('শুধু JPG/PNG/GIF/WEBP।', 'error');
            document.getElementById('imageInput').value = '';
            return;
        }

        selectedImageFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('previewImg');
            const icon = document.getElementById('previewIcon');
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
                img.style.width = '54px';
                img.style.height = '54px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                img.style.border = '2px solid #1a237e';
            }
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(file);

        document.getElementById('imageName').textContent = file.name;
        document.getElementById('imageSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
        document.getElementById('imagePreview').classList.add('show');
        document.getElementById('existingImage')?.classList.remove('show');
        showToast('✅ ছবি সিলেক্ট হয়েছে!', 'success');
    }

    // =========================================================
    // SAVE PROFILE
    // =========================================================
    async function saveProfile(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('saveBtn');
        if (!saveBtn || saveBtn.disabled) return;

        // Validation
        if (selectedGroupBooks.size !== GROUP_BOOK_LIMIT) {
            showToast('⚠️ গ্রুপ থেকে ঠিক ' + GROUP_BOOK_LIMIT + 'টি বই বাছাই করুন! (বর্তমানে ' + selectedGroupBooks.size + 'টি)', 'error');
            return;
        }
        if (!selectedOptionalBook) {
            showToast('⚠️ ঐচ্ছিক থেকে ' + OPTIONAL_BOOK_LIMIT + 'টি বই বাছাই করুন!', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

        try {
            // Selected subjects collect (পূর্ণ নাম সহ)
            const selectedSubjects = [];

            // Compulsory (সব)
            subjectsByType.compulsory.forEach(s => selectedSubjects.push(s.subject_name));

            // Group books (প্রতিটির ১ম+২য়)
            selectedGroupBooks.forEach(function (bookName) {
                subjectsByType.group
                    .filter(function (s) {
                        const sBook = s.subject_name
                            .replace(/\s*(১ম|২য়)\s*পত্র\s*$/, '')
                            .replace(/\s*(1st|2nd)\s*Paper\s*$/, '')
                            .trim();
                        return sBook === bookName;
                    })
                    .forEach(s => selectedSubjects.push(s.subject_name));
            });

            // Optional book (১ম+২য়)
            subjectsByType.optional
                .filter(function (s) {
                    const sBook = s.subject_name
                        .replace(/\s*(১ম|২য়)\s*পত্র\s*$/, '')
                        .replace(/\s*(1st|2nd)\s*Paper\s*$/, '')
                        .trim();
                    return sBook === selectedOptionalBook;
                })
                .forEach(s => selectedSubjects.push(s.subject_name));

            console.log('📋 Selected subjects:', selectedSubjects);

            // Image upload
            let imageUrl = (studentData && studentData.image_url) || '';
            if (selectedImageFile) {
                if (typeof window.FDCUploadImage !== 'function') {
                    throw new Error('Cloudinary upload function not available');
                }
                showToast('ছবি আপলোড হচ্ছে...', 'info');
                const uploaded = await window.FDCUploadImage(selectedImageFile);
                imageUrl = uploaded.url;
            }

            const updateData = {
                father_name: document.getElementById('fatherName').value || null,
                mother_name: document.getElementById('motherName').value || null,
                present_address: document.getElementById('presentAddress').value || null,
                permanent_address: document.getElementById('permanentAddress').value || null,
                phone: document.getElementById('phone').value || null,
                blood_group: document.getElementById('bloodGroup').value || null,
                subjects: selectedSubjects,
                image_url: imageUrl,
                is_profile_complete: true,
                profile_status: 'pending',
                updated_at: new Date().toISOString()
            };

            const { error } = await window.FDC_SUPABASE
                .from('students')
                .update(updateData)
                .eq('id', studentData.id);

            if (error) throw error;

            showToast('✅ প্রোফাইল জমা হয়েছে! অ্যাডমিন approve করলে দেখা যাবে।', 'success');
            sessionStorage.setItem('is_profile_complete', 'true');

            setTimeout(function () { location.reload(); }, 1800);

        } catch (err) {
            console.error('❌ saveProfile:', err);
            showToast('ব্যর্থ: ' + err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i> Save Profile';
        }
    }

    // =========================================================
    // COMPLAINTS
    // =========================================================
    async function loadComplaints() {
        const box = document.getElementById('complaintsList');
        if (!box) return;

        try {
            const sid = sessionStorage.getItem('student_id');
            if (!sid) return;

            const { data, error } = await window.FDC_SUPABASE
                .from('complaints')
                .select('*')
                .eq('student_id', sid)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                box.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>কোনো অভিযোগ নেই</p></div>';
                return;
            }

            box.innerHTML = data.map(function (c) {
                const st = c.status || 'pending';
                const cls = st === 'pending' ? 'c-pending' : (st === 'resolved' ? 'c-resolved' : 'c-rejected');
                const lbl = st === 'pending' ? 'Pending' : (st === 'resolved' ? '✅ Resolved' : '❌ Rejected');
                const dt = new Date(c.created_at).toLocaleDateString('bn-BD', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });

                return '<div class="complaint-item">' +
                    '<div class="d-flex justify-content-between align-items-start gap-2">' +
                        '<span class="c-subject">' + escapeHtml(c.subject) + '</span>' +
                        '<span class="c-status ' + cls + '">' + lbl + '</span>' +
                    '</div>' +
                    '<div class="c-desc">' + escapeHtml(c.description || '') + '</div>' +
                    '<div class="c-date mt-1"><i class="far fa-clock me-1"></i> ' + dt + '</div>' +
                    (c.reply ? '<div class="mt-2 p-2 bg-light rounded"><strong>Reply:</strong> ' + escapeHtml(c.reply) + '</div>' : '') +
                '</div>';
            }).join('');

        } catch (err) {
            console.error('❌ loadComplaints:', err);
            box.innerHTML = '<div class="text-danger text-center py-3">লোড করা যায়নি</div>';
        }
    }

    document.getElementById('complaintForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const subj = document.getElementById('complaintSubject').value.trim();
        const desc = document.getElementById('complaintDescription').value.trim();
        if (!subj || !desc) { showToast('সব ফিল্ড পূরণ করুন', 'error'); return; }

        const btn = this.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            const sid = sessionStorage.getItem('student_id');
            const { error } = await window.FDC_SUPABASE.from('complaints').insert([{
                student_id: sid, subject: subj, description: desc, status: 'pending'
            }]);
            if (error) throw error;

            showToast('✅ অভিযোগ জমা হয়েছে!', 'success');
            this.reset();
            window.hideComplaintForm();
            await loadComplaints();
        } catch (err) {
            showToast('ব্যর্থ: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> জমা দিন';
        }
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(str) {
        return escapeHtml(str);
    }

    function safeId(str) {
        return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function cssEscape(str) {
        return String(str).replace(/(["\\])/g, '\\$1');
    }

    // =========================================================
    // INIT
    // =========================================================
    function init() {
        console.log('🚀 Student Dashboard init');

        const id = sessionStorage.getItem('student_id');
        if (!id) {
            window.location.href = 'student-login.html';
            return;
        }

        waitForSupabase(function () {
            loadStudentData();
            setupImageUpload();
            const form = document.getElementById('profileForm');
            if (form) form.addEventListener('submit', saveProfile);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ student-dashboard.js loaded');

})();