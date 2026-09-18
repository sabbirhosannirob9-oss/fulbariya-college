/**
 * =========================================================
 * FULBARIYA COLLEGE — NOTIFICATION UI
 * Location: js/notification-ui.js
 * Purpose: Auto-inject notification button + modal
 * =========================================================
 */

(function () {
    "use strict";

    // Wait for DOM ready
    function init() {
        console.log('🔔 Notification UI initializing...');

        // Check if FDC_NOTIFY exists
        if (typeof window.FDC_NOTIFY !== 'function') {
            console.warn('⚠️ FDC_NOTIFY not loaded — include notification-helper.js first');
            setTimeout(init, 500);
            return;
        }

        injectStyles();
        injectButton();
        injectModal();
        bindEvents();

        console.log('✅ Notification UI ready');
    }

    // =========================================================
    // INJECT STYLES
    // =========================================================
    function injectStyles() {
        if (document.getElementById('fdcNotifStyles')) return;

        var style = document.createElement('style');
        style.id = 'fdcNotifStyles';
        style.textContent = `
            #fdcNotifSender {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0a1655, #1a237e);
                color: #f2d27b;
                border: none;
                box-shadow: 0 8px 24px rgba(10,22,85,0.4);
                cursor: pointer;
                font-size: 22px;
                z-index: 9998;
                transition: all 0.3s ease;
                display: none;
                align-items: center;
                justify-content: center;
                animation: fdcBellPulse 2s ease-in-out infinite;
            }
            #fdcNotifSender:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 32px rgba(10,22,85,0.6);
            }
            @keyframes fdcBellPulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(10,22,85,0.4); }
                50% { box-shadow: 0 8px 24px rgba(10,22,85,0.4), 0 0 0 12px rgba(242,210,123,0.15); }
            }
            #fdcNotifModal {
                position: fixed;
                inset: 0;
                background: rgba(6, 10, 40, 0.7);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                z-index: 99998;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                font-family: 'Hind Siliguri', sans-serif;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            #fdcNotifModal.show {
                display: flex;
                opacity: 1;
            }
            #fdcNotifModal .fdc-notif-card {
                background: #fff;
                border-radius: 20px;
                max-width: 480px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 30px 80px rgba(0,0,0,0.4);
                position: relative;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            #fdcNotifModal.show .fdc-notif-card {
                transform: scale(1);
            }
            #fdcNotifModal .fdc-notif-head {
                background: linear-gradient(135deg, #0a1655, #1a237e);
                color: #fff;
                padding: 20px 24px;
                position: relative;
                border-radius: 20px 20px 0 0;
            }
            #fdcNotifModal .fdc-notif-head h3 {
                margin: 0 0 4px;
                font-size: 18px;
                font-weight: 700;
                color: #fff;
            }
            #fdcNotifModal .fdc-notif-head p {
                margin: 0;
                font-size: 12.5px;
                opacity: 0.85;
            }
            #fdcNotifModal .fdc-notif-head::after {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 4px;
                background: linear-gradient(90deg, #f2d27b, #d4af37, #f2d27b);
                background-size: 200% 100%;
                animation: fdcGoldShine 3s linear infinite;
            }
            @keyframes fdcGoldShine {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            #fdcNotifModalClose {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255,255,255,0.15);
                border: none;
                color: #fff;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: 0.25s;
            }
            #fdcNotifModalClose:hover {
                background: rgba(255,255,255,0.3);
                transform: rotate(90deg);
            }
            #fdcNotifModal .fdc-notif-body {
                padding: 24px;
            }
            #fdcNotifModal label {
                display: block;
                font-size: 12px;
                font-weight: 700;
                color: #4b5563;
                margin-bottom: 6px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            #fdcNotifModal input,
            #fdcNotifModal textarea {
                width: 100%;
                padding: 11px 14px;
                border: 1.5px solid #e5e7eb;
                border-radius: 10px;
                font-size: 14px;
                font-family: inherit;
                margin-bottom: 16px;
                box-sizing: border-box;
                outline: none;
                transition: 0.25s;
                background: #fafbff;
            }
            #fdcNotifModal input:focus,
            #fdcNotifModal textarea:focus {
                border-color: #0a1655;
                background: #fff;
                box-shadow: 0 0 0 4px rgba(10,22,85,0.08);
            }
            #fdcNotifModal textarea {
                resize: vertical;
                min-height: 100px;
            }
            #fdcNotifModal .fdc-notif-actions {
                display: flex;
                gap: 10px;
                margin-top: 8px;
            }
            #fdcNotifSendBtn,
            #fdcNotifCancelBtn {
                padding: 13px 20px;
                border-radius: 12px;
                border: none;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
                transition: 0.25s;
            }
            #fdcNotifSendBtn {
                flex: 1;
                background: linear-gradient(135deg, #0a1655, #1a237e);
                color: #fff;
                box-shadow: 0 6px 20px rgba(10,22,85,0.3);
            }
            #fdcNotifSendBtn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 10px 28px rgba(10,22,85,0.5);
            }
            #fdcNotifSendBtn:disabled {
                opacity: 0.7;
                cursor: wait;
            }
            #fdcNotifCancelBtn {
                background: #f3f4f6;
                color: #6b7280;
            }
            #fdcNotifCancelBtn:hover {
                background: #e5e7eb;
            }
            #fdcNotifStatus {
                margin-top: 14px;
                padding: 12px;
                border-radius: 10px;
                font-size: 13px;
                display: none;
                text-align: center;
                font-weight: 600;
            }
            @media (max-width: 560px) {
                #fdcNotifSender {
                    bottom: 20px;
                    right: 20px;
                    width: 54px;
                    height: 54px;
                    font-size: 20px;
                }
                #fdcNotifModal .fdc-notif-body {
                    padding: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================
    // INJECT BUTTON
    // =========================================================
    function injectButton() {
        if (document.getElementById('fdcNotifSender')) return;

        var btn = document.createElement('button');
        btn.id = 'fdcNotifSender';
        btn.type = 'button';
        btn.title = 'Send Notification';
        btn.innerHTML = '🔔';
        document.body.appendChild(btn);

        setTimeout(function () {
            btn.style.display = 'flex';
        }, 2000);
    }

    // =========================================================
    // INJECT MODAL
    // =========================================================
    function injectModal() {
        if (document.getElementById('fdcNotifModal')) return;

        var modal = document.createElement('div');
        modal.id = 'fdcNotifModal';

        modal.innerHTML = `
            <div class="fdc-notif-card">
                <div class="fdc-notif-head">
                    <h3>🔔 Send Notification</h3>
                    <p>সব subscriber-দের কাছে পাঠানো হবে</p>
                    <button id="fdcNotifModalClose" type="button">✕</button>
                </div>
                <div class="fdc-notif-body">
                    <label>Title *</label>
                    <input type="text" id="fdcNotifTitle" placeholder="যেমন: নতুন নোটিশ প্রকাশিত">

                    <label>Message *</label>
                    <textarea id="fdcNotifBody" rows="4" placeholder="বিস্তারিত লিখুন..."></textarea>

                    <label>Link (optional)</label>
                    <input type="text" id="fdcNotifUrl" placeholder="/public-pages/notices.html">

                    <div class="fdc-notif-actions">
                        <button id="fdcNotifSendBtn" type="button">📤 Send</button>
                        <button id="fdcNotifCancelBtn" type="button">Cancel</button>
                    </div>

                    <div id="fdcNotifStatus"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // =========================================================
    // BIND EVENTS
    // =========================================================
    function bindEvents() {
        var btn = document.getElementById('fdcNotifSender');
        var modal = document.getElementById('fdcNotifModal');
        var closeBtn = document.getElementById('fdcNotifModalClose');
        var cancelBtn = document.getElementById('fdcNotifCancelBtn');
        var sendBtn = document.getElementById('fdcNotifSendBtn');

        if (!btn || !modal || !sendBtn) return;

        // Open modal
        btn.addEventListener('click', function () {
            modal.classList.add('show');
        });

        // Close modal
        function closeModal() {
            modal.classList.remove('show');
            document.getElementById('fdcNotifStatus').style.display = 'none';
            document.getElementById('fdcNotifTitle').value = '';
            document.getElementById('fdcNotifBody').value = '';
            document.getElementById('fdcNotifUrl').value = '';
        }

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });

        // Send notification
        sendBtn.addEventListener('click', async function () {
            var title = document.getElementById('fdcNotifTitle').value.trim();
            var body = document.getElementById('fdcNotifBody').value.trim();
            var url = document.getElementById('fdcNotifUrl').value.trim() || '/';
            var status = document.getElementById('fdcNotifStatus');

            if (!title || !body) {
                status.style.display = 'block';
                status.style.background = '#fef2f2';
                status.style.color = '#dc2626';
                status.textContent = '⚠️ Title ও Message দুটোই দিতে হবে';
                return;
            }

            sendBtn.disabled = true;
            sendBtn.textContent = '⏳ পাঠানো হচ্ছে...';
            status.style.display = 'none';

            try {
                var result = await window.FDC_NOTIFY({ title: title, body: body, url: url });

                if (result.success) {
                    status.style.display = 'block';
                    status.style.background = '#d1fae5';
                    status.style.color = '#059669';
                    status.innerHTML = '✅ পাঠানো হয়েছে!<br>Sent: ' + (result.sent || 0) + ' | Failed: ' + (result.failed || 0);
                    setTimeout(closeModal, 2500);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (e) {
                status.style.display = 'block';
                status.style.background = '#fef2f2';
                status.style.color = '#dc2626';
                status.textContent = '❌ ' + e.message;
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = '📤 Send';
            }
        });

        // Auto-fill with page context (optional)
        autoFillContext();
    }

    // =========================================================
    // AUTO-FILL CONTEXT (Optional)
    // =========================================================
    function autoFillContext() {
        var path = window.location.pathname;

        if (path.indexOf('notice') > -1) {
            document.getElementById('fdcNotifUrl').value = '/public-pages/notices.html';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন নোটিশ';
        } else if (path.indexOf('news') > -1) {
            document.getElementById('fdcNotifUrl').value = '/public-pages/news.html';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন সংবাদ';
        } else if (path.indexOf('greeting') > -1) {
            document.getElementById('fdcNotifUrl').value = '/';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন greeting card';
        } else if (path.indexOf('result') > -1) {
            document.getElementById('fdcNotifUrl').value = '/public-pages/results.html';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন ফলাফল';
        } else if (path.indexOf('gallery') > -1) {
            document.getElementById('fdcNotifUrl').value = '/public-pages/gallery.html';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন ছবি';
        } else if (path.indexOf('calendar') > -1 || path.indexOf('exam') > -1) {
            document.getElementById('fdcNotifUrl').value = '/public-pages/academic-hub.html';
            document.getElementById('fdcNotifTitle').placeholder = 'নতুন ইভেন্ট';
        }
    }

    // =========================================================
    // START
    // =========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();