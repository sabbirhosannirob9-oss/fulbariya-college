/**
 * =========================================================
 * FULBARIYA DEGREE COLLEGE
 * MAIN APPLICATION
 * =========================================================
 */

(function() {
    "use strict";

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
                console.warn('Supabase not ready after 10 seconds');
            }
        }, 500);
    }

    // =========================================================
    // LOAD NOTICES (Direct from app.js)
    // =========================================================
    async function loadNotices() {
        const container = document.getElementById('noticeList');

        if (!container) {
            console.warn('⚠️ #noticeList not found');
            return;
        }

        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-2">Loading notices...</p>
            </div>
        `;

        try {
            const supabase = window.FDC_SUPABASE;

            if (!supabase) {
                throw new Error('Supabase not available');
            }

            const { data, error } = await supabase
                .from('notices')
                .select('*')
                .eq('is_published', true)
                .order('date', { ascending: false })
                .limit(5);

            if (error) throw error;

            console.log('✅ Notices loaded:', data?.length || 0);

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <p class="text-muted">No notices available</p>
                    </div>
                `;
                return;
            }

            let html = '';
            data.forEach((notice) => {
                const date = notice.date ? new Date(notice.date).toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }) : '';

                const importantClass = notice.is_important ? 'border-start border-danger border-4' : '';
                const importantBadge = notice.is_important ?
                    `<span class="badge bg-danger ms-2"><i class="fas fa-exclamation-triangle"></i> Important</span>` :
                    '';

                let fileIcon = '';
                if (notice.file_url) {
                    const isPdf = notice.file_url.toLowerCase().includes('.pdf');
                    const icon = isPdf ? 'fa-file-pdf' : 'fa-file-image';
                    const color = isPdf ? 'text-danger' : 'text-warning';
                    fileIcon = `
                        <a href="${notice.file_url}" target="_blank" class="${color} ms-2" title="View attachment">
                            <i class="fas ${icon}"></i>
                        </a>
                    `;
                }

                html += `
                    <div class="notice-item p-3 mb-2 bg-white rounded shadow-sm ${importantClass}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="notice-date text-muted small">${date}</div>
                        </div>
                        <div class="notice-content">
                            <h6 class="mb-1">
                                ${notice.title}
                                ${importantBadge}
                                ${fileIcon}
                            </h6>
                            ${notice.description ? `<p class="text-muted small mb-0">${notice.description.substring(0, 120)}${notice.description.length > 120 ? '...' : ''}</p>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `
                <div class="text-center mt-3">
                    <a href="public-pages/notices.html" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-eye me-2"></i> View All Notices
                    </a>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('❌ Error loading notices:', error);
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load notices. Please refresh.
                </div>
            `;
        }
    }

    // =========================================================
    // INIT
    // =========================================================
    document.addEventListener('DOMContentLoaded', function() {
        waitForSupabase(function() {
            console.log('🚀 FDC App initialized');
            loadNotices();
        });
    });

})();