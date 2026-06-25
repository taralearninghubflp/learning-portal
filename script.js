/**
 * TARA LMS - Core Stream Engine Controller (YouTube-Style Mobile Fullscreen Auto-Rotate Edition)
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
        
        window.addEventListener('keydown', handleGlobalKeyGuard, true);

        // ==========================================
        // 📱 MOBILE FULLSCREEN ROTATION LISTENERS
        // ==========================================
        // Android/Chrome standard
        document.addEventListener('fullscreenchange', handleOrientationPipeline);
        // iOS/Safari standard
        document.addEventListener('webkitfullscreenchange', handleOrientationPipeline);
        // Direct video node rotation hooks
        document.addEventListener('mozfullscreenchange', handleOrientationPipeline);
        document.addEventListener('MSFullscreenChange', handleOrientationPipeline);

        const savedName = sessionStorage.getItem('tara_user_name');
        if (savedName) {
            launchPortalWorkspace();
        } else {
            DOM.loginForm.addEventListener('submit', handleLoginValidation);
        }
    }

    /**
     * YouTube Dynamic Orientation Optimizer
     * Automatically locks device into horizontal landscape whenever full screen executes
     */
    function handleOrientationPipeline() {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (isFullscreen) {
            // Target specific mobile viewport parameters
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function(error) {
                    console.log("Device rotation handled natively or context skipped on desktop:", error);
                });
            } else if (screen.lockOrientation) {
                screen.lockOrientation('landscape');
            } else if (screen.webkitLockOrientation) {
                screen.webkitLockOrientation('landscape');
            }
        } else {
            // Release the orientation parameters back to normal portrait view upon exit
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            } else if (screen.webkitUnlockOrientation) {
                screen.webkitUnlockOrientation();
            }
        }
    }

    function handleGlobalKeyGuard(e) {
        const blocked = ['ArrowRight', 'ArrowLeft', 'Space', ' '];
        if (blocked.includes(e.key)) {
            e.preventDefault();
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
                alert("Authentication Failed: Invalid credentials.");
                DOM.loginBtn.removeAttribute('disabled');
                DOM.loginBtn.textContent = "Authenticate Credentials";
            }
        } catch (err) {
            console.error(err);
            DOM.loginBtn.removeAttribute('disabled');
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
        const separator = url.includes('?') ? '&' : '?';
        iframe.src = `${url}${separator}autoplay=1`;
        
        iframe.id = "tara-secure-stream-frame";
        
        // CRITICAL PERMISSIONS LAYER: Direct strict declaration forcing mobile browsers to yield screen control tokens
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; orientation-lock;');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.setAttribute('mozallowfullscreen', 'true');
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
