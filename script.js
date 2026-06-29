/**
 * TARA LMS - Core Stream Engine Controller (Updated for Fullscreen Exit)
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120,
        TICK_RATE_MS: 1000,
        MAINTENANCE: { START_HOUR: 23, END_HOUR: 0 }
    };

    let state = {
        lessonNumber: null, videoUrl: null, targetDuration: 0, elapsedSeconds: 0,
        countdownRemaining: CONFIG.QUIZ_COUNTDOWN_DURATION, durationTimerId: null, countdownTimerId: null, isUnlocked: false
    };

    const DOM = {
        loginContainer: document.getElementById('login-container'),
        portalContent: document.getElementById('portal-content'),
        loginForm: document.getElementById('login-form'),
        loginEmail: document.getElementById('login-email'),
        loginCode: document.getElementById('login-code'),
        loginBtn: document.getElementById('login-btn'),
        userDisplayBadge: document.getElementById('user-display-badge'),
        videoWrapper: document.getElementById('video-wrapper'),
        loadingSpinner: document.getElementById('loading-spinner'),
        lockStatusPill: document.getElementById('lock-status-pill'),
        instructionText: document.getElementById('instruction-text'),
        countdownWrapper: document.getElementById('countdown-wrapper'),
        timerDigits: document.getElementById('timer-digits'),
        quizBtn: document.getElementById('quiz-btn'),
        btnText: document.getElementById('btn-text')
    };

    function checkMaintenanceStatus() {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour === CONFIG.MAINTENANCE.START_HOUR) {
            injectMaintenanceUI();
            return true;
        }
        return false;
    }

    function injectMaintenanceUI() {
        document.body.innerHTML = `<div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #1e1e2f 0%, #111119 100%); color: #ffffff; font-family: 'Roboto', sans-serif; text-align: center; padding: 20px;">
            <div style="font-size: 80px; margin-bottom: 20px;">⚙️</div>
            <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 10px; color: #ffbc00;">Daily Data Sync & Maintenance</h1>
            <p style="font-size: 18px; max-width: 600px; color: #a0a0b8; line-height: 1.6;">Portal is temporarily offline. Back live at <b>12:00 AM</b>.</p></div>`;
    }

    function init() {
        if (checkMaintenanceStatus()) return;
        sessionStorage.removeItem('tara_quiz_access_granted');
        setInterval(checkMaintenanceStatus, 15000);
        const savedName = sessionStorage.getItem('tara_user_name');
        if (savedName) { launchPortalWorkspace(); } else { DOM.loginForm.addEventListener('submit', handleLoginValidation); }
    }

    async function handleLoginValidation(e) {
        e.preventDefault();
        if (checkMaintenanceStatus()) return;
        DOM.loginBtn.setAttribute('disabled', 'true');
        DOM.loginBtn.textContent = "Verifying Identity...";
        const email = DOM.loginEmail.value.trim();
        const code = DOM.loginCode.value.trim();
        try {
            const response = await fetch(`${CONFIG.API_ENDPOINT}?action=login&email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
            const data = await response.json();
            if (data.status === "success") {
                sessionStorage.setItem('tara_user_name', data.name);
                sessionStorage.setItem('tara_user_email', data.email);
                launchPortalWorkspace();
            } else {
                alert("Authentication Failed.");
                DOM.loginBtn.removeAttribute('disabled');
                DOM.loginBtn.textContent = "Authenticate Credentials";
            }
        } catch (err) { DOM.loginBtn.removeAttribute('disabled'); }
    }

    function launchPortalWorkspace() {
        DOM.loginContainer.style.display = 'none';
        DOM.portalContent.style.display = 'block';
        DOM.userDisplayBadge.textContent = `ID: ${sessionStorage.getItem('tara_user_name')}`;
        fetchLessonData();
        DOM.quizBtn.addEventListener('click', handleQuizRedirect);
    }

    async function fetchLessonData() {
        try {
            const response = await fetch(CONFIG.API_ENDPOINT);
            const data = await response.json();
            state.targetDuration = parseInt(data.duration, 10) || 60;
            renderVideoIframe(data.video);
            startStealthProgressTracking();
        } catch (error) {}
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.id = "tara-secure-stream-frame";
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen;');
        iframe.allowFullscreen = true;
        iframe.onload = () => { if (DOM.loadingSpinner) DOM.loadingSpinner.style.display = 'none'; };
        DOM.videoWrapper.appendChild(iframe);
    }

    function startStealthProgressTracking() {
        state.durationTimerId = setInterval(() => {
            state.elapsedSeconds++;
            if (state.elapsedSeconds >= state.targetDuration) {
                clearInterval(state.durationTimerId);
                triggerQuizUnlockSequence();
            }
        }, CONFIG.TICK_RATE_MS);
    }

    // --- UPDATED CORE ORIENTATION RESET INTERFACE ---
    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;
        
        // 1. Fullscreen Exit Module
        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFS) {
                exitFS.call(document).catch(err => console.log("Fullscreen exit ignored:", err));
            }
        }

        // 2. Device Orientation Unlock Interface (Portrait Reset)
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }

        sessionStorage.setItem('tara_quiz_access_granted', 'true');
        DOM.lockStatusPill.textContent = "Authorized";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.btnText.textContent = "Initialize Learning Evaluation Form";
        initiateExpirationCountdown();
    }

    function initiateExpirationCountdown() {
        DOM.countdownWrapper.style.display = 'block';
        state.countdownTimerId = setInterval(() => {
            state.countdownRemaining--;
            DOM.timerDigits.textContent = formatTime(state.countdownRemaining);
            if (state.countdownRemaining <= 0) { clearInterval(state.countdownTimerId); enforceRelockSequence(); }
        }, CONFIG.TICK_RATE_MS);
    }

    function enforceRelockSequence() {
        state.isUnlocked = false;
        sessionStorage.removeItem('tara_quiz_access_granted');
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.btnText.textContent = "Session Expired";
    }

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    }

    function handleQuizRedirect() { if (state.isUnlocked) window.location.href = 'quiz.html'; }

    document.addEventListener('DOMContentLoaded', init);
})();
