/**
 * FULBARIYA COLLEGE — ADMIN CALENDAR MANAGEMENT
 * Location: js/admin-calendar.js
 * Version: v2.0 — Dynamic Years (Session Helper)
 */

(function () {
    "use strict";

    let allEvents = [];
    let filteredEvents = [];
    let editingId = null;

    const EVENT_TYPES = {
        exam: { label: 'পরীক্ষা', icon: 'fa-file-alt' },
        holiday: { label: 'ছুটি', icon: 'fa-umbrella-beach' },
        event: { label: 'ইভেন্ট', icon: 'fa-glass-cheers' },
        result: { label: 'ফলাফল', icon: 'fa-trophy' },
        admission: { label: 'ভর্তি', icon: 'fa-user-plus' },
        general: { label: 'সাধারণ', icon: 'fa-info-circle' }
    };

    const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function waitForSupabase(cb) {
        if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) return cb();
        window.addEventListener('fdc:supabase-ready', cb);
        let n = 0;
        const i = setInterval(() => {
            if (window.FDC_SUPABASE_READY && window.FDC_SUPABASE) {
                clearInterval(i); cb();
            }
            if (++n > 20) clearInterval(i);
        }, 500);
    }

    async function loadAdminInfo() {
        try {
            const result = await window.FDCAuth.getCurrentAdmin();
            if (result && result.admin) {
                const avatar = document.querySelector('[data-admin-avatar]');
                if (avatar) {
                    if (result.admin.image_url) {
                        avatar.innerHTML = `<img src="${result.admin.image_url}" alt="A">`;
                    } else {
                        avatar.textContent = (result.admin.name || 'A').charAt(0).toUpperCase();
                    }
                }
            }
        } catch (e) { console.warn('Admin info error:', e); }
    }

    window.handleLogout = function () {
        window.fdcConfirm(
            'আপনি কি লগআউট করতে চান?',
            async function () {
                try {
                    if (window.FDCAuth) await window.FDCAuth.logout();
                } catch (e) { console.warn(e); }
                sessionStorage.clear();
                window.location.replace('admin-login.html');
            },
            {
                title: 'Logout Confirmation',
                confirmText: 'Yes, Logout',
                cancelText: 'Cancel',
                confirmType: 'danger'
            }
        );
    };

    // ✅ Year options via helper
    async function loadYearOptions() {
        await window.FDCSession.fillYearDropdown('filterYear', {
            includeAll: true,
            allLabel: 'All Years'
        });

        await window.FDCSession.fillYearDropdown('eventYear', {
            autoSelectCurrent: true
        });

        console.log('✅ Year options loaded');
    }

    async function loadAllEvents() {
        try {
            const { data, error } = await window.FDC_SUPABASE
                .from('calendar_events')
                .select('*')
                .order('start_date', { ascending: true });

            if (error) throw error;

            allEvents = data || [];
            console.log('✅ Loaded events:', allEvents.length);

            $('totalEvents').textContent = allEvents.length;

            // Refresh years
            window.FDCSession.clearCache();
            await loadYearOptions();

            applyFilters();
        } catch (e) {
            console.error('Load events error:', e);
            window.fdcError('Event load failed: ' + e.message);
        }
    }

    function applyFilters() {
        const fYear = $('filterYear').value;
        const fType = $('filterType').value;
        const fStatus = $('filterStatus').value;
        const search = $('searchInput').value.toLowerCase().trim();

        filteredEvents = allEvents.filter(ev => {
            if (fYear && String(ev.year) !== String(fYear)) return false;
            if (fType && ev.event_type !== fType) return false;
            if (fStatus === 'published' && !ev.is_published) return false;
            if (fStatus === 'unpublished' && ev.is_published) return false;
            if (search) {
                const text = (ev.title + ' ' + (ev.description || '')).toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });

        renderEvents();
    }

    function renderEvents() {
        const list = $('eventsList');

        if (filteredEvents.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon-wrap"><i class="fas fa-calendar-times"></i></div>
                <h6>কোনো event পাওয়া যায়নি</h6>
                <p>"Add New Event" ক্লিক করে নতুন ইভেন্ট যোগ করুন</p>
            </div>`;
            return;
        }

        let html = '';
        filteredEvents.forEach(ev => {
            const d = new Date(ev.start_date);
            const day = d.getDate();
            const month = MONTHS_BN[d.getMonth()];
            const typeInfo = EVENT_TYPES[ev.event_type] || EVENT_TYPES.general;

            const statusBadge = ev.is_published
                ? '<span style="color:#059669;font-size:10.5px;font-weight:700;">✓ Published</span>'
                : '<span style="color:#dc2626;font-size:10.5px;font-weight:700;">✗ Draft</span>';

            const dateRange = ev.end_date && ev.end_date !== ev.start_date
                ? `${formatDate(ev.start_date)} — ${formatDate(ev.end_date)}`
                : formatDate(ev.start_date);

            const description = ev.description
                ? `<p>${escapeHtml(ev.description)}</p>`
                : '';

            html += `<div class="event-card ${ev.event_type}">
                <div class="event-date-box">
                    <div class="day">${day}</div>
                    <div class="month">${month}</div>
                </div>
                <div class="event-body">
                    <h4>
                        ${escapeHtml(ev.title)}
                        <span class="event-type-badge ${ev.event_type}">
                            <i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}
                        </span>
                        ${statusBadge}
                    </h4>
                    ${description}
                    <div class="event-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${dateRange}</span>
                        <span><i class="fas fa-calendar-check"></i> ${ev.year}</span>
                    </div>
                </div>
                <div class="event-actions">
                    <button class="action-btn edit" data-action="edit" data-id="${ev.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn toggle ${ev.is_published ? '' : 'off'}" data-action="toggle" data-id="${ev.id}">
                        <i class="fas fa-${ev.is_published ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="action-btn delete" data-action="delete" data-id="${ev.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    }

    function openModal(id) {
        const el = $(id);
        if (el) el.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        const el = $(id);
        if (el) el.classList.remove('show');
        document.body.style.overflow = '';
    }

    function openAddEventModal() {
        editingId = null;
        $('editId').value = '';
        $('modalTitle').textContent = 'Add New Event';
        $('modalSub').textContent = 'ইভেন্টের তথ্য পূরণ করুন';
        $('modalIcon').className = 'fas fa-calendar-plus';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Save Event';

        $('eventTitle').value = '';
        $('eventType').value = '';
        $('eventYear').value = window.FDCSession.getCurrentYear();
        $('eventStart').value = '';
        $('eventEnd').value = '';
        $('eventDescription').value = '';
        $('eventPublished').checked = true;

        openModal('eventModal');
    }

    function openEditEventModal(id) {
        const ev = allEvents.find(e => e.id === id);
        if (!ev) return;

        editingId = id;
        $('editId').value = id;
        $('modalTitle').textContent = 'Edit Event';
        $('modalSub').textContent = ev.title;
        $('modalIcon').className = 'fas fa-edit';
        $('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update Event';

        $('eventTitle').value = ev.title || '';
        $('eventType').value = ev.event_type || '';
        $('eventYear').value = ev.year || window.FDCSession.getCurrentYear();
        $('eventStart').value = ev.start_date || '';
        $('eventEnd').value = ev.end_date || '';
        $('eventDescription').value = ev.description || '';
        $('eventPublished').checked = !!ev.is_published;

        openModal('eventModal');
    }

    async function saveEvent() {
        const title = $('eventTitle').value.trim();
        const eventType = $('eventType').value;
        const year = $('eventYear').value;
        const start = $('eventStart').value;
        const end = $('eventEnd').value;
        const description = $('eventDescription').value.trim();
        const isPublished = $('eventPublished').checked;

        if (!title) return window.fdcWarning('Event title দিতে হবে।');
        if (!eventType) return window.fdcWarning('Event type সিলেক্ট করুন।');
        if (!year) return window.fdcWarning('Year সিলেক্ট করুন।');
        if (!start) return window.fdcWarning('Start date দিতে হবে।');
        if (end && end < start) return window.fdcWarning('End date, Start date-এর আগে হতে পারে না।');

        const btn = $('saveBtn');
        btn.disabled = true;
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        try {
            const payload = {
                title: title,
                description: description || null,
                event_type: eventType,
                start_date: start,
                end_date: end || null,
                year: year,
                is_published: isPublished
            };

            let result;
            if (editingId) {
                result = await window.FDC_SUPABASE
                    .from('calendar_events').update(payload).eq('id', editingId).select();
            } else {
                result = await window.FDC_SUPABASE
                    .from('calendar_events').insert([payload]).select();
            }

            if (result.error) throw result.error;

            window.FDCSession.clearCache();

            window.fdcSuccess(editingId ? 'Event updated!' : 'Event created!');
            closeModal('eventModal');
            await loadAllEvents();

        } catch (e) {
            console.error('Save error:', e);
            window.fdcError('Save failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function deleteEvent(id) {
        const ev = allEvents.find(e => e.id === id);
        if (!ev) return;

        window.fdcConfirm(
            `"${ev.title}" কে delete করা হবে?`,
            async function () {
                try {
                    const { error } = await window.FDC_SUPABASE
                        .from('calendar_events').delete().eq('id', id);
                    if (error) throw error;
                    window.fdcSuccess('Event deleted!');
                    await loadAllEvents();
                } catch (e) {
                    window.fdcError('Delete failed: ' + e.message);
                }
            },
            { title: 'Delete Event', confirmText: 'Yes, Delete', confirmType: 'danger' }
        );
    }

    async function togglePublish(id) {
        const ev = allEvents.find(e => e.id === id);
        if (!ev) return;

        const newState = !ev.is_published;
        try {
            const { error } = await window.FDC_SUPABASE
                .from('calendar_events').update({ is_published: newState }).eq('id', id);
            if (error) throw error;
            window.fdcSuccess(`Event ${newState ? 'published' : 'unpublished'}!`);
            await loadAllEvents();
        } catch (e) {
            window.fdcError('Failed: ' + e.message);
        }
    }

    function attachEvents() {
        $('btnAddEvent').addEventListener('click', openAddEventModal);
        $('closeModal').addEventListener('click', () => closeModal('eventModal'));
        $('cancelBtn').addEventListener('click', () => closeModal('eventModal'));
        $('saveBtn').addEventListener('click', saveEvent);

        ['filterYear', 'filterType', 'filterStatus'].forEach(id => {
            $(id).addEventListener('change', applyFilters);
        });
        $('searchInput').addEventListener('input', applyFilters);

        $('eventsList').addEventListener('click', function (e) {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const id = parseInt(btn.dataset.id);

            if (action === 'edit') openEditEventModal(id);
            else if (action === 'delete') deleteEvent(id);
            else if (action === 'toggle') togglePublish(id);
        });

        document.querySelectorAll('.fdc-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function (e) {
                if (e.target === this) {
                    this.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.fdc-modal-overlay.show').forEach(m => m.classList.remove('show'));
                document.body.style.overflow = '';
            }
        });
    }

    async function init() {
        console.log('🚀 Admin Calendar v2.0 initializing...');
        attachEvents();

        waitForSupabase(async function () {
            const admin = await window.FDCAuth.requireAdmin();
            if (!admin) return;

            await loadAdminInfo();
            await loadYearOptions();
            await loadAllEvents();

            console.log('✅ Admin Calendar ready');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();