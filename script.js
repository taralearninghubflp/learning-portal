/**
 * TARA LMS - Core Controller v2
 * Fix: watch progress + unlock state persist per user/day (reload/back = no re-watch).
 */
(function () {
    'use strict';
    const CFG = {
        API: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        WINDOW_SEC: 120, SAVE_EVERY: 5, MAINT_HOUR: 23
    };
    const S = { lesson: null, target: 0, elapsed: 0, watched: false, remaining: CFG.WINDOW_SEC,
                watchTimer: null, winTimer: null, windowOpen: false, leaving: false, done: false };
    const $ = id => document.getElementById(id);
    const D = { login: $('login-container'), portal: $('portal-content'), form: $('login-form'),
        email: $('login-email'), code: $('login-code'), btn: $('login-btn'), badge: $('user-display-badge'),
        wrap: $('video-wrapper'), spin: $('loading-spinner'), pill: $('lock-status-pill'),
        info: $('instruction-text'), cdWrap: $('countdown-wrapper'), cd: $('timer-digits'),
        pCd: $('popup-timer-digits'), pAct: $('popup-action-btn'), pDis: $('popup-dismiss-btn'),
        pBox: $('popup-ticker-box'), pSub: $('popup-ticker-sub'), quiz: $('quiz-btn'), qText: $('btn-text'),
        five: $('five-min-alert'), modal: $('form-popup-modal'), themeBtn: $('theme-toggle-btn'),
        themeIcon: $('theme-toggle-icon') };

    /* ---------- storage helpers (per user + per day) ---------- */
    const today = () => new Date().toLocaleDateString('en-CA');
    const uid = () => (sessionStorage.getItem('tara_user_email') || 'guest').toLowerCase();
    const kProg = () => `tara_prog_${uid()}_${today()}`;
    const kDone = () => `tara_done_${uid()}_${today()}`;
    const load = () => { try { return JSON.parse(localStorage.getItem(kProg())) || null; } catch (e) { return null; } };
    const save = () => { try { localStorage.setItem(kProg(), JSON.stringify({ lesson: S.lesson, elapsed: S.elapsed, watched: S.watched })); } catch (e) {} };
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    /* ---------- maintenance ---------- */
    function maintenance() {
        if (new Date().getHours() !== CFG.MAINT_HOUR) return false;
        document.body.innerHTML = `<div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#070a13;color:#fff;font-family:'Segoe UI',sans-serif;text-align:center;padding:20px">
        <div style="font-size:72px">⚙️</div><h1 style="color:#3b82f6;margin:12px 0">Daily Data Sync</h1>
        <p style="max-width:480px;color:#cbd5e1;line-height:1.6">Portal 11:00 PM – 12:00 AM tak band hai. Aapka progress safe hai, midnight ke baad wapas aayein.</p></div>`;
        return true;
    }

    /* ---------- theme ---------- */
    function theme() {
        const apply = t => { t === 'light' ? document.documentElement.setAttribute('data-theme', 'light') : document.documentElement.removeAttribute('data-theme');
            if (D.themeIcon) D.themeIcon.textContent = t === 'light' ? '☀️' : '🌙'; };
        apply(localStorage.getItem('tara_lms_theme') || 'dark');
        D.themeBtn && D.themeBtn.addEventListener('click', () => {
            const n = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            localStorage.setItem('tara_lms_theme', n); apply(n); });
    }

    /* ---------- leave guard (only while video still in progress) ---------- */
    function guards() {
        window.addEventListener('beforeunload', e => {
            if (S.leaving || S.done || !sessionStorage.getItem('tara_user_name')) return;
            save(); e.preventDefault(); e.returnValue = '';
        });
        document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
        window.addEventListener('pagehide', save);
        window.addEventListener('keydown', e => { if (['ArrowRight', 'ArrowLeft', ' '].includes(e.key)) e.preventDefault(); }, true);
        const fs = () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
            try { on ? screen.orientation.lock('landscape').catch(() => {}) : screen.orientation.unlock(); } catch (e) {} };
        document.addEventListener('fullscreenchange', fs); document.addEventListener('webkitfullscreenchange', fs);
    }

    /* ---------- login ---------- */
    async function login(e) {
        e.preventDefault(); if (maintenance()) return;
        D.btn.disabled = true; D.btn.textContent = 'Checking...';
        try {
            const r = await fetch(`${CFG.API}?action=login&email=${encodeURIComponent(D.email.value.trim())}&code=${encodeURIComponent(D.code.value.trim())}`);
            const d = await r.json();
            if (d.status === 'success') {
                sessionStorage.setItem('tara_user_name', d.name); sessionStorage.setItem('tara_user_email', d.email);
                launch(); return;
            }
            alert('Email ya passcode galat hai. Dobara try karein.');
        } catch (err) { alert('Network issue. Internet check karke dobara try karein.'); }
        D.btn.disabled = false; D.btn.textContent = 'Authenticate Credentials';
    }

    function launch() {
        D.login.style.display = 'none'; D.portal.style.display = 'block';
        D.badge.style.display = 'block'; D.badge.textContent = sessionStorage.getItem('tara_user_name');
        if (localStorage.getItem(kDone())) return showDone();
        loadLesson();
    }

    function showDone() {
        S.done = true;
        D.wrap.innerHTML = '<div class="spinner-container"><div style="font-size:56px">🎉</div><p class="spinner-text" style="margin-top:10px;font-weight:700">Aaj ki learning complete ho chuki hai. Kal milte hain!</p></div>';
        D.pill.textContent = 'Completed Today'; D.pill.className = 'pill status-pill unlocked';
        D.info.textContent = 'Aapka attendance record ho chuka hai.';
        D.quiz.disabled = true; D.quiz.className = 'action-btn locked';
        D.quiz.querySelector('.btn-icon').textContent = '✔'; D.qText.textContent = "Today's Learning Completed";
    }

    async function loadLesson() {
        try {
            const d = await (await fetch(CFG.API)).json();
            S.lesson = d.no || 1; S.target = parseInt(d.duration, 10) || 60;
            const p = load();
            if (p && p.lesson === S.lesson) { S.elapsed = Math.min(p.elapsed || 0, S.target); S.watched = !!p.watched; }
            renderVideo(d.video);
            if (S.watched || S.elapsed >= S.target) { S.watched = true; save(); unlock(); }
            else { if (S.elapsed > 0) D.info.textContent = `Welcome back! Aapka ${fmt(S.elapsed)} ka progress save hai, wahin se continue hoga. Video ko aage se dekhein.`; track(); }
        } catch (e) {
            D.spin.querySelector('.spinner-text').textContent = 'Lesson load nahi hua. Page refresh karein.';
        }
    }

    function renderVideo(url) {
        const f = document.createElement('iframe');
        f.src = url + (url.includes('?') ? '&' : '?') + 'autoplay=1';
        f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); f.allowFullscreen = true;
        f.onload = () => { D.spin.style.display = 'none'; };
        D.wrap.appendChild(f);
    }

    /* ---------- watch tracking ---------- */
    function track() {
        S.watchTimer = setInterval(() => {
            if (document.hidden || S.watched) return;
            S.elapsed++;
            const left = S.target - S.elapsed;
            D.five.style.display = (left > 0 && left <= 300) ? 'flex' : 'none';
            if (S.elapsed % CFG.SAVE_EVERY === 0) save();
            if (left <= 0) { clearInterval(S.watchTimer); S.watched = true; save(); D.five.style.display = 'none'; unlock(); }
        }, 1000);
    }

    /* ---------- unlock window (can be re-opened without re-watching) ---------- */
    function unlock() {
        try { screen.orientation.unlock(); if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
        sessionStorage.setItem('tara_quiz_access_granted', 'true');
        S.windowOpen = true; S.remaining = CFG.WINDOW_SEC;
        D.pill.textContent = 'Ready to Submit'; D.pill.className = 'pill status-pill unlocked';
        D.quiz.disabled = false; D.quiz.className = 'action-btn unlocked';
        D.quiz.querySelector('.btn-icon').textContent = '🚀'; D.qText.textContent = 'Open Evaluation Form & Complete Module';
        D.pAct.disabled = false; D.pAct.textContent = '🚀 Open Evaluation Form & Submit';
        D.pBox.style.background = ''; D.pBox.style.borderColor = ''; D.pCd.style.color = ''; D.cd.style.color = '';
        D.pSub.textContent = 'Complete this step before timer hits 00:00'; D.pSub.style.color = '';
        D.cdWrap.style.display = 'block'; D.modal.style.display = 'flex';
        clearInterval(S.winTimer);
        S.winTimer = setInterval(() => {
            S.remaining--; D.cd.textContent = D.pCd.textContent = fmt(Math.max(S.remaining, 0));
            if (S.remaining <= 0) { clearInterval(S.winTimer); expire(); }
        }, 1000);
    }

    function expire() {
        S.windowOpen = false; sessionStorage.removeItem('tara_quiz_access_granted');
        D.pill.textContent = 'Window Closed'; D.pill.className = 'pill status-pill locked';
        D.pAct.textContent = '🔄 Get New Access (no re-watch)'; D.pAct.disabled = false;
        D.pBox.style.borderColor = 'rgba(239,68,68,.3)'; D.pCd.style.color = D.cd.style.color = 'var(--accent-danger)';
        D.pSub.textContent = 'Time khatam. Video dobara nahi dekhna hai, naya access le lein.'; D.pSub.style.color = 'var(--accent-danger)';
        D.quiz.className = 'action-btn unlocked'; D.quiz.disabled = false;
        D.quiz.querySelector('.btn-icon').textContent = '🔄'; D.qText.textContent = 'Get New Access (no re-watch)';
    }

    function go() {
        if (!S.windowOpen) return unlock();   // expired -> fresh window, progress kept
        S.leaving = true; location.href = 'quiz.html';
    }

    function init() {
        if (maintenance()) return;
        theme(); guards(); setInterval(maintenance, 15000);
        sessionStorage.removeItem('tara_quiz_access_granted');
        D.quiz.addEventListener('click', go); D.pAct.addEventListener('click', go);
        D.pDis.addEventListener('click', () => { D.modal.style.display = 'none'; });
        if (sessionStorage.getItem('tara_user_name')) launch(); else D.form.addEventListener('submit', login);
    }
    document.addEventListener('DOMContentLoaded', init);
})();
