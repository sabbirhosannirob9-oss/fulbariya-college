/**
 * =========================================================
 * FULBARIYA COLLEGE - UNIVERSAL ADMIN POPUP SYSTEM
 * একটি ফাইল — সব অ্যাডমিন পেজে ব্যবহারযোগ্য
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // POPUP HTML TEMPLATE
    // =========================================================
    const POPUP_HTML = `
    <div class="fdc-popup-overlay" id="fdcPopupOverlay">
        <div class="fdc-popup-box" id="fdcPopupBox">
            <button class="fdc-popup-close" id="fdcPopupClose">
                <i class="fas fa-times"></i>
            </button>

            <div class="fdc-popup-header" id="fdcPopupHeader">
                <div class="fdc-popup-icon" id="fdcPopupIcon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="fdc-popup-header-text">
                    <h3 class="fdc-popup-title" id="fdcPopupTitle">Message</h3>
                    <p class="fdc-popup-subtitle" id="fdcPopupSubtitle"></p>
                </div>
            </div>

            <div class="fdc-popup-body" id="fdcPopupBody"></div>

            <div class="fdc-popup-footer" id="fdcPopupFooter"></div>
        </div>
    </div>
    `;

    // =========================================================
    // POPUP CSS (Injected dynamically)
    // =========================================================
    const POPUP_CSS = `
    .fdc-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(6, 29, 54, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fdcFadeIn 0.25s ease;
        font-family: 'Hind Siliguri', sans-serif;
    }

    .fdc-popup-overlay.show { display: flex; }

    @keyframes fdcFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .fdc-popup-box {
        background: #fff;
        border-radius: 20px;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
        position: relative;
        animation: fdcSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fdcSlideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .fdc-popup-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #fff;
        font-size: 14px;
        cursor: pointer;
        transition: 0.25s;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    }

    .fdc-popup-close:hover {
        background: rgba(239, 68, 68, 0.9);
        transform: rotate(90deg);
    }

    /* ===== HEADER ===== */
    .fdc-popup-header {
        background: linear-gradient(135deg, #1a237e, #0d47a1);
        padding: 24px 24px 20px;
        border-radius: 20px 20px 0 0;
        display: flex;
        align-items: center;
        gap: 16px;
        color: #fff;
        position: relative;
        overflow: hidden;
    }

    .fdc-popup-header::before {
        content: '';
        position: absolute;
        top: -50%; right: -10%;
        width: 280px; height: 280px;
        background: radial-gradient(circle, rgba(242, 210, 123, 0.15), transparent 70%);
        border-radius: 50%;
    }

    .fdc-popup-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.18);
        border: 2px solid rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
    }

    .fdc-popup-header-text {
        position: relative;
        z-index: 1;
        flex: 1;
        min-width: 0;
    }

    .fdc-popup-title {
        margin: 0 0 3px;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
    }

    .fdc-popup-subtitle {
        margin: 0;
        font-size: 12px;
        opacity: 0.85;
        color: #fff;
    }

    /* ===== HEADER VARIANTS ===== */
    .fdc-popup-box.success .fdc-popup-header {
        background: linear-gradient(135deg, #059669, #10b981);
    }
    .fdc-popup-box.error .fdc-popup-header {
        background: linear-gradient(135deg, #dc2626, #ef4444);
    }
    .fdc-popup-box.warning .fdc-popup-header {
        background: linear-gradient(135deg, #d97706, #f59e0b);
    }
    .fdc-popup-box.info .fdc-popup-header {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
    }
    .fdc-popup-box.confirm .fdc-popup-header {
        background: linear-gradient(135deg, #7c3aed, #8b5cf6);
    }

    /* ===== BODY ===== */
    .fdc-popup-body {
        padding: 24px;
        color: #374151;
        font-size: 14px;
        line-height: 1.7;
    }

    .fdc-popup-body p { margin: 0 0 10px; }
    .fdc-popup-body p:last-child { margin-bottom: 0; }

    .fdc-popup-body strong { color: #1f2937; font-weight: 700; }

    /* Info Grid (for teacher details) */
    .fdc-popup-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .fdc-popup-info-item {
        background: #f8f9fc;
        border-radius: 10px;
        padding: 10px 14px;
        border: 1px solid rgba(0, 0, 0, 0.04);
    }

    .fdc-popup-info-item.full {
        grid-column: 1 / -1;
    }

    .fdc-popup-info-label {
        font-size: 10px;
        color: #6b7280;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 3px;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .fdc-popup-info-label i { color: #1a237e; font-size: 10px; }

    .fdc-popup-info-value {
        font-size: 14px;
        color: #1f2937;
        font-weight: 600;
        word-break: break-word;
    }

    /* ===== FOOTER ===== */
    .fdc-popup-footer {
        padding: 0 24px 24px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
    }

    .fdc-popup-btn {
        padding: 11px 24px;
        border-radius: 10px;
        border: none;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: 0.25s;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: inherit;
    }

    .fdc-popup-btn-primary {
        background: linear-gradient(135deg, #1a237e, #0d47a1);
        color: #fff;
        box-shadow: 0 4px 16px rgba(26, 35, 126, 0.25);
    }

    .fdc-popup-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(26, 35, 126, 0.35);
    }

    .fdc-popup-btn-success {
        background: linear-gradient(135deg, #059669, #10b981);
        color: #fff;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
    }

    .fdc-popup-btn-success:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
    }

    .fdc-popup-btn-danger {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        color: #fff;
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.25);
    }

    .fdc-popup-btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
    }

    .fdc-popup-btn-secondary {
        background: #f3f4f6;
        color: #374151;
        border: 1.5px solid rgba(0, 0, 0, 0.06);
    }

    .fdc-popup-btn-secondary:hover { background: #e5e7eb; }

    /* ===== MOBILE ===== */
    @media (max-width: 520px) {
        .fdc-popup-box { border-radius: 16px; max-height: 95vh; }
        .fdc-popup-header {
            padding: 20px 18px 16px;
            border-radius: 16px 16px 0 0;
        }
        .fdc-popup-icon { width: 48px; height: 48px; font-size: 20px; }
        .fdc-popup-title { font-size: 16px; }
        .fdc-popup-body { padding: 18px; font-size: 13px; }
        .fdc-popup-grid { grid-template-columns: 1fr; gap: 8px; }
        .fdc-popup-footer { padding: 0 18px 18px; }
        .fdc-popup-btn { flex: 1; justify-content: center; }
    }
    `;

    // =========================================================
    // INITIALIZE POPUP DOM (একবার)
    // =========================================================
    function injectPopupDOM() {
        if (document.getElementById('fdcPopupOverlay')) return;

        // CSS inject
        const style = document.createElement('style');
        style.id = 'fdcPopupStyles';
        style.textContent = POPUP_CSS;
        document.head.appendChild(style);

        // HTML inject
        const container = document.createElement('div');
        container.innerHTML = POPUP_HTML;
        document.body.appendChild(container.firstElementChild);

        // Event Listeners
        const overlay = document.getElementById('fdcPopupOverlay');
        const closeBtn = document.getElementById('fdcPopupClose');

        // Backdrop click → close
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                closePopup();
            }
        });

        // Close button
        closeBtn.addEventListener('click', closePopup);

        // ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('show')) {
                closePopup();
            }
        });
    }

    // =========================================================
    // STATE
    // =========================================================
    let _onConfirm = null;
    let _onCancel = null;

    // =========================================================
    // CLOSE POPUP
    // =========================================================
    function closePopup() {
        const overlay = document.getElementById('fdcPopupOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
        _onConfirm = null;
        _onCancel = null;
    }

    // =========================================================
    // CORE SHOW FUNCTION
    // =========================================================
    function showPopup(options = {}) {
        injectPopupDOM();

        const {
            type = 'info',          // info | success | error | warning | confirm
            title = 'Message',
            subtitle = '',
            body = '',
            icon = null,
            buttons = null,
            onConfirm = null,
            onCancel = null,
            showClose = true
        } = options;

        const overlay = document.getElementById('fdcPopupOverlay');
        const box = document.getElementById('fdcPopupBox');
        const header = document.getElementById('fdcPopupHeader');
        const iconEl = document.getElementById('fdcPopupIcon');
        const titleEl = document.getElementById('fdcPopupTitle');
        const subtitleEl = document.getElementById('fdcPopupSubtitle');
        const bodyEl = document.getElementById('fdcPopupBody');
        const footerEl = document.getElementById('fdcPopupFooter');
        const closeBtn = document.getElementById('fdcPopupClose');

        // Type class
        box.className = 'fdc-popup-box ' + type;

        // Icon
        const iconMap = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            confirm: 'fa-question-circle'
        };
        iconEl.innerHTML = `<i class="fas ${icon || iconMap[type] || 'fa-info-circle'}"></i>`;

        // Title & Subtitle
        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
        subtitleEl.style.display = subtitle ? 'block' : 'none';

        // Body (support HTML)
        if (typeof body === 'string') {
            bodyEl.innerHTML = body;
        } else if (body instanceof HTMLElement) {
            bodyEl.innerHTML = '';
            bodyEl.appendChild(body);
        }

        // Close button
        closeBtn.style.display = showClose ? 'flex' : 'none';

        // Buttons
        _onConfirm = onConfirm;
        _onCancel = onCancel;

        let btnHTML = '';
        if (buttons && buttons.length > 0) {
            buttons.forEach((btn, i) => {
                btnHTML += `<button class="fdc-popup-btn fdc-popup-btn-${btn.type || 'primary'}" data-action="${btn.action || 'close'}" data-index="${i}">
                    ${btn.icon ? `<i class="fas ${btn.icon}"></i>` : ''} ${btn.text || 'OK'}
                </button>`;
            });
        } else {
            // Default: single close button
            btnHTML = `<button class="fdc-popup-btn fdc-popup-btn-primary" data-action="close">
                <i class="fas fa-check"></i> ঠিক আছে
            </button>`;
        }
        footerEl.innerHTML = btnHTML;

        // Button click handlers
        footerEl.querySelectorAll('.fdc-popup-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                const idx = parseInt(this.dataset.index);

                if (buttons && buttons[idx] && typeof buttons[idx].onClick === 'function') {
                    buttons[idx].onClick();
                } else if (action === 'confirm' && _onConfirm) {
                    _onConfirm();
                } else if (action === 'cancel' && _onCancel) {
                    _onCancel();
                }

                if (action !== 'none') {
                    closePopup();
                }
            });
        });

        // Show
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // =========================================================
    // PUBLIC API
    // =========================================================

    /**
     * সাধারণ তথ্য দেখানো
     */
    window.fdcAlert = function (message, title = 'তথ্য', type = 'info') {
        showPopup({
            type,
            title,
            body: typeof message === 'string' ? `<p>${message}</p>` : message,
            buttons: [{
                text: 'ঠিক আছে',
                type: 'primary',
                icon: 'fa-check',
                action: 'close'
            }]
        });
    };

    /**
     * সফল মেসেজ
     */
    window.fdcSuccess = function (message, title = 'সফল হয়েছে!') {
        window.fdcAlert(message, title, 'success');
    };

    /**
     * ত্রুটি মেসেজ
     */
    window.fdcError = function (message, title = 'সমস্যা হয়েছে!') {
        window.fdcAlert(message, title, 'error');
    };

    /**
     * সতর্কতা
     */
    window.fdcWarning = function (message, title = 'সতর্কতা!') {
        window.fdcAlert(message, title, 'warning');
    };

    /**
     * নিশ্চিতকরণ (হ্যাঁ/না)
     */
    window.fdcConfirm = function (message, onConfirm, options = {}) {
        showPopup({
            type: 'confirm',
            title: options.title || 'আপনি কি নিশ্চিত?',
            subtitle: options.subtitle || '',
            body: typeof message === 'string' ? `<p>${message}</p>` : message,
            buttons: [
                {
                    text: options.cancelText || 'বাতিল',
                    type: 'secondary',
                    icon: 'fa-times',
                    action: 'cancel',
                    onClick: options.onCancel
                },
                {
                    text: options.confirmText || 'হ্যাঁ, নিশ্চিত',
                    type: options.confirmType || 'danger',
                    icon: 'fa-check',
                    action: 'confirm',
                    onClick: onConfirm
                }
            ]
        });
    };

    /**
     * ডিটেইলস দেখানো (গ্রিড আকারে)
     * @param {string} title - Modal title
     * @param {Array} items - [{ icon, label, value, full }]
     * @param {object} options - { subtitle, type, buttons }
     */
    window.fdcDetails = function (title, items = [], options = {}) {
        let gridHTML = '<div class="fdc-popup-grid">';

        items.forEach(item => {
            const full = item.full ? ' full' : '';
            gridHTML += `
                <div class="fdc-popup-info-item${full}">
                    <div class="fdc-popup-info-label">
                        ${item.icon ? `<i class="fas ${item.icon}"></i>` : ''}
                        ${item.label || ''}
                    </div>
                    <div class="fdc-popup-info-value">${item.value || '-'}</div>
                </div>
            `;
        });

        gridHTML += '</div>';

        showPopup({
            type: options.type || 'info',
            title,
            subtitle: options.subtitle || '',
            body: gridHTML,
            buttons: options.buttons || [{
                text: 'বন্ধ করুন',
                type: 'primary',
                icon: 'fa-times',
                action: 'close'
            }]
        });
    };

    /**
     * কাস্টম popup (সম্পূর্ণ কন্ট্রোল)
     */
    window.fdcPopup = function (options) {
        showPopup(options);
    };

    /**
     * Popup বন্ধ করা (প্রোগ্রাম্যাটিক)
     */
    window.fdcClosePopup = closePopup;

    // =========================================================
    // AUTO-INJECT ON LOAD
    // =========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPopupDOM);
    } else {
        injectPopupDOM();
    }

    console.log('🎨 FDC Popup System loaded');

})();