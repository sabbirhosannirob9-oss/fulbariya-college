/**
 * =========================================================
 * FULBARIYA DEGREE COLLEGE
 * PREMIUM NOTICE BOARD - SCROLLABLE VERSION
 * =========================================================
 */

(function() {
    "use strict";

    // =========================================================
    // STATE
    // =========================================================
    let allNotices = [];
    let currentNoticeId = null;

    // =========================================================
    // WAIT FOR SUPABASE
    // =========================================================
    function waitForSupabase(callback) {
        if (window.FDC_SUPABASE_READY) {
            callback();
            return;
        }

        document.addEventListener('fdc:supabase-ready', function() {
            callback();
        });

        let attempts = 0;
        const interval = setInterval(function() {
            attempts++;
            if (window.FDC_SUPABASE_READY) {
                clearInterval(interval);
                callback();
            }
            if (attempts > 20) {
                clearInterval(interval);
                console.warn('⚠️ Supabase not ready after 10 seconds');
                showError('সংযোগ স্থাপন করা যায়নি। পেজ রিফ্রেশ করুন।');
            }
        }, 500);
    }

    // =========================================================
    // SHOW ERROR IN CONTAINER
    // =========================================================
    function showError(message) {
        const container = document.getElementById('noticeListContainer');
        if (container) {
            container.innerHTML = `
                <div class="notice-error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()">রিফ্রেশ করুন</button>
                </div>
            `;
        }
    }

    // =========================================================
    // LOAD NOTICES FROM SUPABASE
    // =========================================================
    async function loadNotices() {
        const container = document.getElementById('noticeListContainer');
        if (!container) {
            console.warn('⚠️ #noticeListContainer not found in HTML');
            return;
        }

        try {
            const supabase = window.FDC_SUPABASE;
            if (!supabase) {
                throw new Error('Supabase client not available');
            }

            // Fetch published notices
            const { data, error } = await supabase
                .from('notices')
                .select('*')
                .eq('is_published', true)
                .order('date', { ascending: false });

            if (error) throw error;

            allNotices = data || [];
            console.log('✅ Notices loaded:', allNotices.length);

            // Update count badge
            const countBadge = document.getElementById('noticeCount');
            if (countBadge) {
                countBadge.textContent = allNotices.length + ' টি';
            }

            // Show empty state
            if (allNotices.length === 0) {
                container.innerHTML = `
                    <div class="notice-empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>কোনো নোটিশ নেই</p>
                    </div>
                `;
                return;
            }

            // Render notices
            renderNoticeList(container);

        } catch (error) {
            console.error('❌ Error loading notices:', error);
            container.innerHTML = `
                <div class="notice-error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>নোটিশ লোড করা যায়নি</p>
                    <button onclick="location.reload()">রিফ্রেশ করুন</button>
                </div>
            `;
        }
    }

    // =========================================================
    // RENDER NOTICE LIST (Compact Cards)
    // =========================================================
    function renderNoticeList(container) {
        let html = `
            <div class="notice-scroll-wrapper">
                <div class="notice-list-grid">
        `;

        allNotices.forEach(function(notice) {
            // Format date
            const date = notice.date ? new Date(notice.date) : new Date();
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('bn-BD', { month: 'short' });

            // Important badge
            const isImportant = notice.is_important ? 'important' : '';
            const importantBadge = notice.is_important ?
                `<span class="notice-badge-important">⚠️</span>` :
                '';

            // File icon
            let fileIcon = '';
            if (notice.file_url) {
                const isPdf = notice.file_url.toLowerCase().includes('.pdf');
                fileIcon = isPdf ?
                    `<i class="fas fa-file-pdf notice-file-icon"></i>` :
                    `<i class="fas fa-file-image notice-file-icon"></i>`;
            }

            // Preview text
            const previewText = notice.description ?
                notice.description.substring(0, 60) + (notice.description.length > 60 ? '...' : '') :
                '';

            html += `
                <div class="notice-card ${isImportant}" data-id="${notice.id}" onclick="window.openNoticeDetail('${notice.id}')">
                    <div class="notice-card-date">
                        <span class="notice-day">${day}</span>
                        <span class="notice-month">${month}</span>
                    </div>
                    <div class="notice-card-body">
                        <div class="notice-card-title">
                            ${notice.title}
                            ${importantBadge}
                        </div>
                        <div class="notice-card-preview">${previewText}</div>
                    </div>
                    <div class="notice-read-more">
                        ${fileIcon}
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Store notices globally for modal
        window._allNotices = allNotices;
    }

    // =========================================================
    // OPEN NOTICE DETAIL (Modal)
    // =========================================================
    window.openNoticeDetail = function(noticeId) {
        const allNotices = window._allNotices || [];
        const notice = allNotices.find(function(n) { return n.id === noticeId; });

        if (!notice) {
            console.warn('⚠️ Notice not found:', noticeId);
            return;
        }

        currentNoticeId = noticeId;

        const modal = document.getElementById('noticeDetailModal');
        if (!modal) {
            console.warn('⚠️ #noticeDetailModal not found');
            return;
        }

        // Format date
        const date = notice.date ? new Date(notice.date) : new Date();
        const formattedDate = date.toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Set title and date
        document.getElementById('modalNoticeTitle').textContent = notice.title;
        document.getElementById('modalNoticeDate').textContent = formattedDate;

        // Set description
        const desc = notice.description || 'কোনো বিস্তারিত বিবরণ নেই।';
        document.getElementById('modalNoticeDescription').innerHTML = desc.replace(/\n/g, '<br>');

        // File section
        const fileSection = document.getElementById('modalFileSection');
        if (notice.file_url) {
            const isPdf = notice.file_url.toLowerCase().includes('.pdf');
            const fileIcon = isPdf ? 'fa-file-pdf' : 'fa-file-image';
            const fileColor = isPdf ? '#dc3545' : '#f57c00';

            fileSection.innerHTML = `
                <div class="modal-file-box">
                    <i class="fas ${fileIcon}" style="color:${fileColor}; font-size:24px;"></i>
                    <div class="modal-file-info">
                        <span class="modal-file-name">${isPdf ? 'PDF ডকুমেন্ট' : 'ইমেজ ফাইল'}</span>
                        <span class="modal-file-size">ডাউনলোড করুন</span>
                    </div>
                    <a href="${notice.file_url}" target="_blank" class="modal-download-btn" download>
                        <i class="fas fa-download"></i> ডাউনলোড
                    </a>
                </div>
            `;
            fileSection.style.display = 'block';
        } else {
            fileSection.innerHTML = '';
            fileSection.style.display = 'none';
        }

        // Show modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Reset and trigger animation
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.animation = 'none';
            setTimeout(function() {
                content.style.animation = 'modalSlideUp 0.35s ease';
            }, 10);
        }
    };

    // =========================================================
    // CLOSE NOTICE DETAIL
    // =========================================================
    window.closeNoticeDetail = function() {
        const modal = document.getElementById('noticeDetailModal');
        if (!modal) return;

        modal.classList.remove('show');
        document.body.style.overflow = '';
    };

    // =========================================================
    // NAVIGATE NOTICE (Previous/Next)
    // =========================================================
    window.navigateNotice = function(direction) {
        const allNotices = window._allNotices || [];
        if (allNotices.length === 0) return;

        const currentIndex = allNotices.findIndex(function(n) {
            return n.id === currentNoticeId;
        });

        if (currentIndex === -1) {
            // If current not found, open first
            window.openNoticeDetail(allNotices[0].id);
            return;
        }

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = allNotices.length - 1;
        if (newIndex >= allNotices.length) newIndex = 0;

        const nextNotice = allNotices[newIndex];
        if (nextNotice) {
            window.openNoticeDetail(nextNotice.id);
        }
    };

    // =========================================================
    // KEYBOARD SUPPORT
    // =========================================================
    document.addEventListener('keydown', function(e) {
        // ESC to close
        if (e.key === 'Escape') {
            window.closeNoticeDetail();
        }

        // Arrow Left = Previous
        if (e.key === 'ArrowLeft') {
            const modal = document.getElementById('noticeDetailModal');
            if (modal && modal.classList.contains('show')) {
                e.preventDefault();
                window.navigateNotice(-1);
            }
        }

        // Arrow Right = Next
        if (e.key === 'ArrowRight') {
            const modal = document.getElementById('noticeDetailModal');
            if (modal && modal.classList.contains('show')) {
                e.preventDefault();
                window.navigateNotice(1);
            }
        }
    });

    // =========================================================
    // CLOSE ON OUTSIDE CLICK
    // =========================================================
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('noticeDetailModal');
        if (!modal) return;

        if (e.target === modal) {
            window.closeNoticeDetail();
        }
    });

    // =========================================================
    // AUTO-INIT ON DOM READY
    // =========================================================
    document.addEventListener('DOMContentLoaded', function() {
        waitForSupabase(function() {
            console.log('🚀 Loading Premium Notice Board...');
            loadNotices();
        });
    });

})();