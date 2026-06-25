/**
 * TARA LMS - Core Stream Engine Controller (Exact Duration Match + Keyboard Skip Guard)
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120,
        TICK_RATE_MS: 1000
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

    function init() {
        sessionStorage.removeItem('tara_quiz_access_granted');
        
        // Anti-Skip Event Listener - Keyboard Controls Block Guard
        // Yeh line laptop ke keyboard arrows aur space key ko bypass karne se rokti hai
        window.addEventListener('keydown', handleKeyboardBypassGuard, true);

        const savedName = sessionStorage.getItem('tara_user_name');
        if (savedName) {
            launchPortalWorkspace();
        } else {
            DOM.loginForm.addEventListener('submit', handleLoginValidation);
        }
    }

    /**
     * 🚨 KEYBOARD BYPASS GUARD ENGINE
     * Blocks Left/Right Arrow keys and Spacebar to prevent fast-forwarding or skipping
     */
    function handleKeyboardBypassGuard(e) {
        // ArrowRight (Forward Skip), ArrowLeft (Rewind), Space (Pause/Play Bypass)
        const blockedKeys = ['ArrowRight', 'ArrowLeft', 'Space', ' '];
        
        if (blockedKeys.includes(e.key) || blockedKeys.includes(e.code)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }

    async function handleLoginValidation(e) {
        e.preventDefault();
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
                alert("Authentication Failed: Invalid email coordinates or security passcode.");
                DOM.loginBtn.removeAttribute('disabled');
                DOM.loginBtn.textContent = "Authenticate Credentials";
            }
        } catch (err) {
            console.error(err);
            alert("Network timeout exception during credential handshake execution.");
            DOM.loginBtn.removeAttribute('disabled');
            DOM.loginBtn.textContent = "Authenticate Credentials";
        }
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
            state.lessonNumber = data.no || 1;
            state.videoUrl = data.video;
            state.targetDuration = parseInt(data.duration, 10) || 60;
            renderVideoIframe(state.videoUrl);
            startStealthProgressTracking();
        } catch (error) {
            console.error(error);
        }
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
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

    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;
        sessionStorage.setItem('tara_quiz_access_granted', 'true');
        DOM.lockStatusPill.textContent = "Authorized";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
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
        DOM.lockStatusPill.textContent = "Revoked";
        DOM.lockStatusPill.classList.add('locked');
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Protocol Expired";
    }

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    }

    function handleQuizRedirect() { if (state.isUnlocked) window.location.href = 'quiz.html'; }

    document.addEventListener('DOMContentLoaded', init);
})();
