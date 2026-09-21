/**
 * =========================================================
 * FULBARIYA COLLEGE — CONTENT REACTIONS
 * Location: js/reactions.js
 * Version: v1.0 — Facebook-style reactions for News & Gallery
 * 
 * Features:
 *   - 3 reaction types: love, care, sad
 *   - Anonymous (browser-based fingerprint)
 *   - Toggle on/off
 *   - Change between reactions
 *   - Real-time count update
 *   - Hover picker (desktop)
 *   - Long-press picker (mobile)
 * =========================================================
 */

(function () {
    "use strict";

    // =========================================================
    // CONFIG
    // =========================================================
    const REACTIONS = {
        love: { icon: '❤️', label: 'Love', color: '#ef4444' },
        care: { icon: '🥰', label: 'Care', color: '#f59e0b' },
        sad:  { icon: '😢', label: 'Sad',  color: '#f59e0b' }
    };

    const VISITOR_KEY = 'fdc_visitor_fingerprint';

    // =========================================================
    // VISITOR FINGERPRINT (Anonymous)
    // =========================================================
    function getVisitorFingerprint() {
        try {
            let fp = localStorage.getItem(VISITOR_KEY);
            if (!fp) {
                // Generate random UUID
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    fp = crypto.randomUUID();
                } else {
                    fp = 'fdc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
                }
                localStorage.setItem(VISITOR_KEY, fp);
            }
            return fp;
        } catch (e) {
            // Fallback: session-only
            if (!window._fdc_fp) {
                window._fdc_fp = 'fdc_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            }
            return window._fdc_fp;
        }
    }

    // =========================================================
    // SUPABASE WAIT
    // =========================================================
    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb, { once: true });
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 40) clearInterval(i);
        }, 500);
    }

    // =========================================================
    // FETCH REACTION COUNTS
    // =========================================================
    async function fetchCounts(contentType, contentIds) {
        if (!contentIds || contentIds.length === 0) return {};

        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('content_reactions')
                .select('content_id, reaction_type')
                .eq('content_type', contentType)
                .in('content_id', contentIds);

            if (error) throw error;

            const counts = {};
            contentIds.forEach(id => {
                counts[id] = { love: 0, care: 0, sad: 0, total: 0 };
            });

            (data || []).forEach(row => {
                const c = counts[row.content_id];
                if (c && REACTIONS[row.reaction_type]) {
                    c[row.reaction_type]++;
                    c.total++;
                }
            });

            return counts;
        } catch (e) {
            console.error('Fetch counts error:', e);
            return {};
        }
    }

    // =========================================================
    // FETCH USER'S REACTIONS
    // =========================================================
    async function fetchMyReactions(contentType, contentIds) {
        if (!contentIds || contentIds.length === 0) return {};

        try {
            const fp = getVisitorFingerprint();
            const { data, error } = await window.FDC_SUPABASE
                .from('content_reactions')
                .select('content_id, reaction_type')
                .eq('content_type', contentType)
                .eq('visitor_fingerprint', fp)
                .in('content_id', contentIds);

            if (error) throw error;

            const my = {};
            (data || []).forEach(row => {
                my[row.content_id] = row.reaction_type;
            });
            return my;
        } catch (e) {
            console.error('Fetch my reactions error:', e);
            return {};
        }
    }

    // =========================================================
    // TOGGLE / SET REACTION
    // =========================================================
    async function setReaction(contentType, contentId, reactionType) {
        const fp = getVisitorFingerprint();

        try {
            // Check existing
            const { data: existing } = await window.FDC_SUPABASE
                .from('content_reactions')
                .select('id, reaction_type')
                .eq('content_type', contentType)
                .eq('content_id', contentId)
                .eq('visitor_fingerprint', fp)
                .maybeSingle();

            if (existing) {
                // Same reaction → toggle off (delete)
                if (existing.reaction_type === reactionType) {
                    const { error } = await window.FDC_SUPABASE
                        .from('content_reactions')
                        .delete()
                        .eq('id', existing.id);

                    if (error) throw error;
                    return { action: 'removed', reaction: null };
                }

                // Different reaction → update
                const { error } = await window.FDC_SUPABASE
                    .from('content_reactions')
                    .update({ reaction_type: reactionType, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);

                if (error) throw error;
                return { action: 'changed', reaction: reactionType };
            }

            // No existing → insert
            const { error } = await window.FDC_SUPABASE
                .from('content_reactions')
                .insert({
                    content_type: contentType,
                    content_id: contentId,
                    reaction_type: reactionType,
                    visitor_fingerprint: fp
                });

            if (error) throw error;
            return { action: 'added', reaction: reactionType };
        } catch (e) {
            console.error('Set reaction error:', e);
            throw e;
        }
    }

    // =========================================================
    // BUILD REACTION UI (for News/Gallery card)
    // =========================================================
    function buildReactionUI(contentType, contentId, counts, myReaction) {
        const c = counts || { love: 0, care: 0, sad: 0, total: 0 };
        const my = myReaction || null;

        // Build counts display
        let countHTML = '';
        let hasAny = false;

        if (c.love > 0) {
            countHTML += `<span class="rc-count-item" data-type="love">
                <span class="rc-count-icon">❤️</span>
                <span class="rc-count-num">${c.love}</span>
            </span>`;
            hasAny = true;
        }
        if (c.care > 0) {
            countHTML += `<span class="rc-count-item" data-type="care">
                <span class="rc-count-icon">🥰</span>
                <span class="rc-count-num">${c.care}</span>
            </span>`;
            hasAny = true;
        }
        if (c.sad > 0) {
            countHTML += `<span class="rc-count-item" data-type="sad">
                <span class="rc-count-icon">😢</span>
                <span class="rc-count-num">${c.sad}</span>
            </span>`;
            hasAny = true;
        }

        if (!hasAny) {
            countHTML = '<span class="rc-count-empty">প্রথম reaction দিন</span>';
        }

        // Build button state
        const activeReaction = my ? REACTIONS[my] : null;
        const btnIcon = activeReaction ? activeReaction.icon : '👍';
        const btnLabel = activeReaction ? activeReaction.label : 'React';
        const btnActiveClass = activeReaction ? 'rc-btn-active rc-btn-' + my : '';

        // Build picker
        const pickerHTML = Object.keys(REACTIONS).map(key => {
            const r = REACTIONS[key];
            const isActive = my === key;
            return `<button 
                type="button"
                class="rc-picker-btn ${isActive ? 'active' : ''}"
                data-reaction="${key}"
                aria-label="${r.label}"
                title="${r.label}">
                <span class="rc-picker-icon">${r.icon}</span>
                <span class="rc-picker-label">${r.label}</span>
            </button>`;
        }).join('');

        return `
            <div class="reactions-bar" 
                 data-content-type="${contentType}" 
                 data-content-id="${contentId}"
                 data-my-reaction="${my || ''}">
                <div class="rc-counts">${countHTML}</div>
                <div class="rc-button-wrap">
                    <div class="rc-picker" role="menu">
                        ${pickerHTML}
                    </div>
                    <button type="button" class="rc-trigger ${btnActiveClass}" aria-label="React">
                        <span class="rc-trigger-icon">${btnIcon}</span>
                        <span class="rc-trigger-label">${btnLabel}</span>
                    </button>
                </div>
            </div>
        `;
    }

    // =========================================================
    // UPDATE UI AFTER REACTION
    // =========================================================
    function updateUI(barEl, counts, myReaction) {
        const c = counts || { love: 0, care: 0, sad: 0, total: 0 };
        const my = myReaction || null;

        // Update counts
        const countsEl = barEl.querySelector('.rc-counts');
        let countHTML = '';
        let hasAny = false;

        if (c.love > 0) {
            countHTML += `<span class="rc-count-item" data-type="love">
                <span class="rc-count-icon">❤️</span>
                <span class="rc-count-num">${c.love}</span>
            </span>`;
            hasAny = true;
        }
        if (c.care > 0) {
            countHTML += `<span class="rc-count-item" data-type="care">
                <span class="rc-count-icon">🥰</span>
                <span class="rc-count-num">${c.care}</span>
            </span>`;
            hasAny = true;
        }
        if (c.sad > 0) {
            countHTML += `<span class="rc-count-item" data-type="sad">
                <span class="rc-count-icon">😢</span>
                <span class="rc-count-num">${c.sad}</span>
            </span>`;
            hasAny = true;
        }

        if (!hasAny) {
            countHTML = '<span class="rc-count-empty">প্রথম reaction দিন</span>';
        }
        countsEl.innerHTML = countHTML;

        // Update trigger button
        const trigger = barEl.querySelector('.rc-trigger');
        const activeReaction = my ? REACTIONS[my] : null;
        trigger.querySelector('.rc-trigger-icon').textContent = activeReaction ? activeReaction.icon : '👍';
        trigger.querySelector('.rc-trigger-label').textContent = activeReaction ? activeReaction.label : 'React';
        trigger.className = 'rc-trigger' + (activeReaction ? ' rc-btn-active rc-btn-' + my : '');

        // Update picker active state
        barEl.querySelectorAll('.rc-picker-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.reaction === my);
        });

        barEl.dataset.myReaction = my || '';
    }

    // =========================================================
    // ATTACH EVENTS TO A REACTION BAR
    // =========================================================
    function attachBarEvents(barEl) {
        const contentType = barEl.dataset.contentType;
        const contentId = parseInt(barEl.dataset.contentId);
        const trigger = barEl.querySelector('.rc-trigger');
        const picker = barEl.querySelector('.rc-picker');

        // Prevent parent link click
        barEl.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });

        // Desktop: hover shows picker
        let hoverTimer = null;
        trigger.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            picker.classList.add('show');
        });

        // Mobile: long-press shows picker
        let longPressTimer = null;
        let didLongPress = false;

        trigger.addEventListener('touchstart', () => {
            didLongPress = false;
            longPressTimer = setTimeout(() => {
                didLongPress = true;
                picker.classList.add('show');
                if (navigator.vibrate) navigator.vibrate(10);
            }, 400);
        }, { passive: true });

        trigger.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
            if (didLongPress) {
                e.preventDefault();
            } else {
                // Short tap: if user already reacted → toggle off; else → default love? No, show picker.
                if (barEl.dataset.myReaction) {
                    handleReactionClick(barEl, barEl.dataset.myReaction);
                } else {
                    // First tap → show picker
                    picker.classList.add('show');
                }
            }
        });

        trigger.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
        });

        // Handle picker button clicks
        picker.querySelectorAll('.rc-picker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const reaction = btn.dataset.reaction;
                picker.classList.remove('show');
                handleReactionClick(barEl, reaction);
            });
        });

        // Close picker on outside click
        document.addEventListener('click', (e) => {
            if (!barEl.contains(e.target)) {
                picker.classList.remove('show');
            }
        });

        // Close on scroll (mobile)
        window.addEventListener('scroll', () => {
            picker.classList.remove('show');
        }, { passive: true });
    }

    // =========================================================
    // HANDLE REACTION CLICK
    // =========================================================
    async function handleReactionClick(barEl, reactionType) {
        const contentType = barEl.dataset.contentType;
        const contentId = parseInt(barEl.dataset.contentId);

        // Optimistic UI: pulse animation
        barEl.classList.add('rc-loading');

        try {
            const result = await setReaction(contentType, contentId, reactionType);
            console.log('Reaction result:', result);

            // Fetch fresh counts
            const counts = await fetchCounts(contentType, [contentId]);
            const my = await fetchMyReactions(contentType, [contentId]);

            updateUI(barEl, counts[contentId], my[contentId]);

            // Success pulse
            barEl.classList.add('rc-success');
            setTimeout(() => barEl.classList.remove('rc-success'), 500);

        } catch (e) {
            console.error('Reaction failed:', e);
            barEl.classList.add('rc-error');
            setTimeout(() => barEl.classList.remove('rc-error'), 800);
        } finally {
            barEl.classList.remove('rc-loading');
        }
    }

    // =========================================================
    // MOUNT REACTIONS ON CARDS
    // =========================================================
    async function mountReactions(containerSelector, contentType) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        const cards = container.querySelectorAll('[data-react-id]');
        if (cards.length === 0) return;

        const contentIds = Array.from(cards).map(c => parseInt(c.dataset.reactId));
        const uniqueIds = [...new Set(contentIds)];

        // Fetch counts + my reactions in parallel
        const [counts, myReactions] = await Promise.all([
            fetchCounts(contentType, uniqueIds),
            fetchMyReactions(contentType, uniqueIds)
        ]);

        // Mount UI on each card
        cards.forEach(card => {
            const id = parseInt(card.dataset.reactId);
            const mountTarget = card.querySelector('[data-reactions-mount]');
            if (!mountTarget) return;

            const html = buildReactionUI(contentType, id, counts[id], myReactions[id]);
            mountTarget.innerHTML = html;

            const barEl = mountTarget.querySelector('.reactions-bar');
            attachBarEvents(barEl);
        });

        console.log(`✅ Reactions mounted: ${cards.length} (${contentType})`);
    }

    // =========================================================
    // PUBLIC API
    // =========================================================
    window.FDCReactions = {
        mount: mountReactions,
        fetchCounts,
        fetchMyReactions,
        setReaction,
        getVisitorFingerprint,
        REACTIONS
    };

    console.log('✅ Reactions module loaded');

})();